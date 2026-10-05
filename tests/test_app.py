import base64
import hashlib
import io
import sqlite3

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import main


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DATA', tmp_path)
    monkeypatch.setattr(main, 'DB', tmp_path/'cars.db')
    monkeypatch.setattr(main, 'MEDIA', tmp_path/'media')
    media_app = next(route.app for route in main.app.routes if route.name == 'media')
    monkeypatch.setattr(media_app, 'directory', str(main.MEDIA))
    monkeypatch.setattr(media_app, 'all_directories', [str(main.MEDIA)])
    # Tests deliberately start from the legacy data to cover migration.
    monkeypatch.setattr(main, 'COOKIE_SECURE', False)
    monkeypatch.setattr(main, 'PUBLIC_ORIGIN', '')
    encoded = hashlib.pbkdf2_hmac('sha256', b'test-password-only', bytes.fromhex('abcd'), 600000).hex()
    monkeypatch.setenv('ADMIN_PASSWORD_HASH', 'pbkdf2_sha256$600000$abcd$'+encoded)
    monkeypatch.setenv('ADMIN_USERNAME', 'admin')
    with TestClient(main.app) as client:
        yield client


def authenticate(client):
    response = client.post('/api/admin/login', json={'username': 'admin', 'password': 'test-password-only'})
    assert response.status_code == 200
    assert 'HttpOnly' in response.headers['set-cookie']
    assert 'SameSite=strict' in response.headers['set-cookie']
    return {'X-CSRF-Token': response.json()['csrf']}


def image_data():
    out = io.BytesIO()
    Image.new('RGB', (100, 80), 'red').save(out, 'PNG')
    return 'data:image/png;base64,'+base64.b64encode(out.getvalue()).decode()


def test_public_site_and_migration(client):
    for path in ['/', '/katalog.html', '/product.html', '/kontakt.html', '/privacy.html', '/admin.html', '/css/style.css', '/js/admin.js', '/assets/favicon.svg', '/healthz']:
        response = client.get(path)
        assert response.status_code == 200, path
        assert 'Content-Security-Policy' in response.headers
    cars = client.get('/api/cars').json()
    assert len(cars) == 3
    assert all(c['title'] != 'test' for c in cars)
    assert all(len(c['images']) <= 1 for c in cars)
    assert client.get('/api/cars/14').status_code == 404
    assert len(client.get('/api/cars/15').json()['images']) == 5
    assert client.get('/api/cars/15').json()['description'] == ''
    with main.connection() as conn:
        conn.execute("UPDATE cars SET description='Owner updated description' WHERE id=15")
    main.init_db()
    assert client.get('/api/cars/15').json()['description'] == 'Owner updated description'
    for path in ['/cars.db', '/.env', '/main.py', '/runtime/cars.db', '/applications', '/api/admin/cars', '/api/admin/applications', '/api/admin/stats']:
        assert client.get(path).status_code in {401, 404}, path


def test_auth_csrf_and_logout(client):
    assert client.post('/api/admin/login', json={'username': 'admin', 'password': 'wrong'}).status_code == 401
    assert client.post('/api/admin/login', json={'username': 'власник', 'password': 'test-password-only'}).status_code == 401
    headers = authenticate(client)
    assert client.get('/api/admin/session').json()['csrf'] == headers['X-CSRF-Token']
    assert client.get('/api/admin/cars').headers['cache-control'] == 'no-store'
    assert client.post('/api/admin/logout').status_code == 403
    assert client.post('/api/admin/logout', headers={**headers, 'Origin': 'https://evil.example'}).status_code == 403
    assert client.post('/api/admin/logout', headers=headers).status_code == 200
    assert client.get('/api/admin/session').status_code == 401


def test_car_lifecycle_and_image_validation(client):
    headers = authenticate(client)
    data = {'title': '<img src=x onerror=alert(1)>', 'price': '12345.67', 'description': 'Description', 'year': 2020, 'mileage': '25000', 'status': 'draft', 'images': [image_data()]}
    response = client.post('/api/admin/cars', json=data, headers=headers)
    assert response.status_code == 201, response.text
    car_id = response.json()['id']
    assert client.get(f'/api/cars/{car_id}').status_code == 404
    with main.connection() as conn:
        row = conn.execute('SELECT image FROM cars WHERE id=?', (car_id,)).fetchone()
    assert '/media/' in row['image'] and 'base64' not in row['image']
    stored = next(c for c in client.get('/api/admin/cars').json() if c['id'] == car_id)
    assert (main.MEDIA/stored['images'][0].split('/')[-1]).exists()
    photo = client.get(stored['images'][0])
    assert photo.status_code == 200 and photo.headers['content-type'] == 'image/jpeg'
    data['images'] = stored['images']
    data['status'] = 'published'
    assert client.put(f'/api/admin/cars/{car_id}', json=data, headers=headers).status_code == 200
    assert client.get(f'/api/cars/{car_id}').json()['price'] == '12345.67'
    for images in [['javascript:alert(1)'], ['data:image/png;base64,AAAA'], ['/media/../cars.db'], ['https://[invalid']]:
        assert client.put(f'/api/admin/cars/{car_id}', json={**data, 'images': images}, headers=headers).status_code == 422
    for update in [{'price': '-5'}, {'title': '  '}, {'images': []}, {'status': 'bad'}, {'mileage': 'abc'}]:
        assert client.put(f'/api/admin/cars/{car_id}', json={**data, **update}, headers=headers).status_code == 422
    data['status'] = 'sold'
    assert client.put(f'/api/admin/cars/{car_id}', json=data, headers=headers).status_code == 200
    assert client.get(f'/api/cars/{car_id}').status_code == 404


def test_lead_workflow_and_spam(client):
    data = {'name': 'Test person', 'phone': '+48 123 456 789', 'message': '<script>example</script>', 'car_id': 15}
    assert client.post('/api/applications', json={**data, 'phone': 'abcd'}).status_code == 422
    assert client.post('/api/applications', json={**data, 'name': '  '}).status_code == 422
    assert client.post('/api/applications', json={**data, 'car_id': 14}).status_code == 404
    assert client.post('/api/applications', json={**data, 'website': 'spam'}).status_code == 201
    response = client.post('/api/applications', json=data)
    assert response.status_code == 201
    lead_id = response.json()['id']
    headers = authenticate(client)
    leads = client.get('/api/admin/applications').json()
    assert len(leads) == 1
    assert 'Volvo FH16' in leads[0]['message']
    assert client.patch(f'/api/admin/applications/{lead_id}', json={'status': 'contacted'}, headers=headers).status_code == 200
    assert client.get('/api/admin/applications').json()[0]['status'] == 'contacted'
    assert client.delete(f'/api/admin/applications/{lead_id}', headers=headers).status_code == 200
    assert client.get('/api/admin/applications').json() == []
    for _ in range(2):
        assert client.post('/api/applications', json=data).status_code == 201
    assert client.post('/api/applications', json=data).status_code == 429


def test_request_body_limit(client, monkeypatch):
    monkeypatch.setattr(main, 'MAX_BODY', 32)
    assert client.post('/api/applications', content='x'*33).status_code == 413


def test_sessions_expire(client):
    authenticate(client)
    with main.connection() as conn:
        conn.execute('UPDATE sessions SET expires=0')
    assert client.get('/api/admin/session').status_code == 401


def test_vehicle_categories_preserve_existing_records(client):
    headers = authenticate(client)
    assert all(c['category'] == 'other' for c in client.get('/api/cars').json())
    data = {'title': 'Category test', 'price': '1000', 'category': 'truck'}
    response = client.post('/api/admin/cars', json=data, headers=headers)
    assert response.status_code == 201
    car_id = response.json()['id']
    main.init_db()
    saved = next(c for c in client.get('/api/admin/cars').json() if c['id'] == car_id)
    assert saved['category'] == 'truck'
    assert client.put(f'/api/admin/cars/{car_id}', json={**data, 'category': 'trailer'}, headers=headers).status_code == 200
    assert client.post('/api/admin/cars', json={**data, 'category': 'invalid'}, headers=headers).status_code == 422
    assert next(c for c in client.get('/api/admin/cars').json() if c['id'] == car_id)['category'] == 'trailer'


def test_vehicle_specs_and_fifty_photos(client):
    headers = authenticate(client)
    data = {'title': 'New specifications', 'price': '25000', 'year': 2020,
            'description': 'Complete description', 'status': 'published',
            'transmission': 'automatic', 'fuel_type': 'diesel',
            'consumption_city': '9,5', 'consumption_highway': '6.25',
            'images': [f'https://example.com/{i}.jpg' for i in range(50)]}
    response = client.post('/api/admin/cars', json=data, headers=headers)
    assert response.status_code == 201, response.text
    car_id = response.json()['id']
    saved = client.get(f'/api/cars/{car_id}').json()
    assert len(saved['images']) == 50
    assert saved['transmission'] == 'automatic' and saved['fuel_type'] == 'diesel'
    assert saved['consumption_city'] == '9.5' and saved['consumption_highway'] == '6.25'
    main.init_db()
    assert client.get(f'/api/cars/{car_id}').json() == saved
    for patch in [{'images': data['images'] + ['https://example.com/extra.jpg']},
                  {'fuel_type': 'invalid'}, {'transmission': 'invalid'},
                  {'consumption_city': '-1'}, {'consumption_highway': 'NaN'}]:
        assert client.put(f'/api/admin/cars/{car_id}', json={**data, **patch}, headers=headers).status_code == 422
    cleared = {**data, 'transmission': '', 'fuel_type': '', 'consumption_city': '', 'consumption_highway': ''}
    assert client.put(f'/api/admin/cars/{car_id}', json=cleared, headers=headers).status_code == 200
    assert client.get(f'/api/cars/{car_id}').json()['consumption_city'] == ''


def test_separate_image_upload_is_protected_and_reusable(client):
    payload = {'image': image_data()}
    assert client.post('/api/admin/images', json=payload).status_code == 401
    headers = authenticate(client)
    assert client.post('/api/admin/images', json=payload).status_code == 403
    result = client.post('/api/admin/images', json=payload, headers=headers)
    assert result.status_code == 201
    url = result.json()['url']
    assert client.get(url).status_code == 200
    response = client.post('/api/admin/cars', json={'title': '50 uploaded photos', 'price': '1000', 'images': [url]*50}, headers=headers)
    assert response.status_code == 201
    car = next(c for c in client.get('/api/admin/cars').json() if c['id'] == response.json()['id'])
    assert len(car['images']) == 50
