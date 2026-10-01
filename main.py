"""OLMAX website and API. No development tunnel or external frontend origin required."""
from __future__ import annotations
import base64
from contextlib import asynccontextmanager, contextmanager
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
import time
from urllib.parse import urlsplit

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, field_validator
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parent
# Optional local configuration; deployment environment variables take precedence.
if (ROOT / '.env').exists():
    for line in (ROOT / '.env').read_text().splitlines():
        if line.strip() and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
                value = value[1:-1]
            os.environ.setdefault(key.strip(), value)
DATA = Path(os.getenv('DATA_DIR', str(ROOT / 'runtime')))
DATA = (DATA if DATA.is_absolute() else ROOT/DATA).resolve()
DB = DATA / 'cars.db'
MEDIA = DATA / 'media'
COOKIE_SECURE = os.getenv('COOKIE_SECURE', 'false').lower() == 'true'
PUBLIC_ORIGIN = os.getenv('PUBLIC_ORIGIN', '').rstrip('/')
MAX_BODY = 56 * 1024 * 1024  # eight 5 MB photos, base64 overhead and form fields
Image.MAX_IMAGE_PIXELS = 24_000_000


@contextmanager
def connection():
    conn = sqlite3.connect(DB, timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db():
    DATA.mkdir(parents=True, exist_ok=True)
    MEDIA.mkdir(parents=True, exist_ok=True)
    legacy = ROOT / 'cars.db'
    if not DB.exists() and legacy.exists() and legacy.resolve() != DB:
        with sqlite3.connect(f'file:{legacy}?mode=ro', uri=True) as source, sqlite3.connect(DB) as target:
            source.backup(target)
    with connection() as conn:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('CREATE TABLE IF NOT EXISTS cars (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, price TEXT, image TEXT, description TEXT, year INTEGER, mileage TEXT)')
        conn.execute('CREATE TABLE IF NOT EXISTS applications (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, message TEXT, date TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
        for table, column, definition in [('cars', 'status', "TEXT NOT NULL DEFAULT 'published'"), ('applications', 'status', "TEXT NOT NULL DEFAULT 'new'"), ('applications', 'car_id', 'INTEGER')]:
            if column not in {r['name'] for r in conn.execute(f'PRAGMA table_info({table})')}:
                conn.execute(f'ALTER TABLE {table} ADD COLUMN {column} {definition}')
                if table == 'cars':
                    conn.execute("UPDATE cars SET status='draft' WHERE lower(trim(title)) IN ('test','тест','demo')")
        conn.execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires REAL NOT NULL)')
        conn.execute('CREATE TABLE IF NOT EXISTS rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires REAL NOT NULL)')
        conn.execute('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)')
        if not conn.execute('SELECT 1 FROM schema_migrations WHERE version=1').fetchone():
            # Remove only the known placeholder descriptions from the prototype.
            # The original cars.db remains an unchanged recovery copy.
            for car_id, placeholder in [(11, 'Krute auto'), (12, 'smfsfbmbfgmns'), (15, 'nahuy psam')]:
                conn.execute("UPDATE cars SET description='' WHERE id=? AND description=?", (car_id, placeholder))
            conn.execute('INSERT INTO schema_migrations VALUES (1)')


@asynccontextmanager
async def lifespan(app):
    init_db()
    yield


app = FastAPI(title='OLMAX', lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


class BodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or scope['method'] not in {'POST', 'PUT', 'PATCH'}:
            return await self.app(scope, receive, send)
        body = bytearray()
        while True:
            message = await receive()
            if message['type'] == 'http.disconnect':
                return
            body.extend(message.get('body', b''))
            if len(body) > MAX_BODY:
                return await JSONResponse({'detail': 'Request too large'}, status_code=413)(scope, receive, send)
            if not message.get('more_body'):
                break
        consumed = False

        async def replay():
            nonlocal consumed
            if not consumed:
                consumed = True
                return {'type': 'http.request', 'body': bytes(body), 'more_body': False}
            return await receive()
        await self.app(scope, replay, send)


app.add_middleware(BodyLimit)


@app.middleware('http')
async def security_headers(request, call_next):
    if request.method not in {'GET', 'HEAD', 'OPTIONS'}:
        origin = request.headers.get('origin')
        allowed = PUBLIC_ORIGIN or str(request.base_url).rstrip('/')
        if origin and origin != allowed:
            return JSONResponse({'detail': 'Origin not allowed'}, status_code=403)
    response = await call_next(request)
    response.headers.update({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https: data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    })
    if request.url.path.startswith('/api/admin') or request.url.path == '/admin.html':
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Robots-Tag'] = 'noindex, nofollow'
    if COOKIE_SECURE:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    return response


def limit(request: Request, kind: str, count: int, seconds: int):
    host = request.client.host if request.client else 'unknown'
    bucket = hashlib.sha256(f'{kind}:{host}'.encode()).hexdigest()
    now = time.time()
    with connection() as conn:
        conn.execute('DELETE FROM rate_limits WHERE expires < ?', (now,))
        conn.execute('INSERT INTO rate_limits VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET count=count+1', (bucket, now+seconds))
        row = conn.execute('SELECT count FROM rate_limits WHERE bucket=?', (bucket,)).fetchone()
    if row['count'] > count:
        raise HTTPException(429, 'Too many attempts. Please try again later.', headers={'Retry-After': str(seconds)})


def admin(request: Request):
    token = request.cookies.get('olmax_session', '')
    if not token:
        raise HTTPException(401, 'Login required')
    with connection() as conn:
        row = conn.execute('SELECT * FROM sessions WHERE token_hash=? AND expires>?', (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()
    if not row:
        raise HTTPException(401, 'Session expired')
    if request.method not in {'GET', 'HEAD'} and not secrets.compare_digest(request.headers.get('x-csrf-token', '').encode(), row['csrf'].encode()):
        raise HTTPException(403, 'Invalid request token')
    return row


class Login(BaseModel):
    username: str = Field(max_length=100)
    password: str = Field(max_length=500)


def password_valid(password):
    encoded = os.getenv('ADMIN_PASSWORD_HASH', '')
    try:
        algorithm, iterations, salt, expected = encoded.split('$')
        if algorithm != 'pbkdf2_sha256':
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(iterations)).hex()
        return secrets.compare_digest(expected, actual)
    except (ValueError, TypeError):
        return False


@app.post('/api/admin/login')
def login(data: Login, request: Request, response: Response):
    limit(request, 'login', 10, 900)
    if not os.getenv('ADMIN_PASSWORD_HASH'):
        raise HTTPException(503, 'Admin access has not been configured')
    if not password_valid(data.password) or not secrets.compare_digest(data.username.encode(), os.getenv('ADMIN_USERNAME', 'admin').encode()):
        raise HTTPException(401, 'Incorrect username or password')
    token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    with connection() as conn:
        conn.execute('DELETE FROM sessions WHERE expires < ?', (time.time(),))
        conn.execute('INSERT INTO sessions VALUES (?, ?, ?)', (hashlib.sha256(token.encode()).hexdigest(), csrf, time.time()+28800))
    response.set_cookie('olmax_session', token, max_age=28800, httponly=True, secure=COOKIE_SECURE, samesite='strict', path='/')
    return {'csrf': csrf}


@app.get('/api/admin/session')
def session(auth=Depends(admin)):
    return {'csrf': auth['csrf']}


@app.post('/api/admin/logout')
def logout(request: Request, response: Response, auth=Depends(admin)):
    with connection() as conn:
        conn.execute('DELETE FROM sessions WHERE token_hash=?', (auth['token_hash'],))
    response.delete_cookie('olmax_session', path='/')
    return {'ok': True}


def image_list(value):
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, list) else [str(parsed)]
    except (ValueError, TypeError):
        return [value] if value else []


def safe_image(value):
    if not isinstance(value, str):
        return False
    if value.startswith(('/media/', 'data:image/jpeg;base64,', 'data:image/png;base64,', 'data:image/webp;base64,')):
        return True
    try:
        parsed = urlsplit(value)
        return parsed.scheme == 'https' and bool(parsed.netloc)
    except ValueError:
        return False


def public_car(row, full=False):
    car = dict(row)
    images = [x for x in image_list(car.pop('image', '')) if safe_image(x)]
    car['images'] = images if full else images[:1]
    return car


@app.get('/api/cars')
def cars():
    with connection() as conn:
        return [public_car(row) for row in conn.execute("SELECT * FROM cars WHERE status='published' ORDER BY id DESC")]


@app.get('/api/cars/{car_id}')
def car_detail(car_id: int):
    with connection() as conn:
        row = conn.execute("SELECT * FROM cars WHERE id=? AND status='published'", (car_id,)).fetchone()
    if not row:
        raise HTTPException(404, 'Car not found')
    return public_car(row, full=True)


@app.get('/api/admin/cars')
def admin_cars(auth=Depends(admin)):
    with connection() as conn:
        return [public_car(row, full=True) for row in conn.execute('SELECT * FROM cars ORDER BY id DESC')]


class Car(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=2, max_length=140)
    price: str = Field(min_length=1, max_length=20)
    description: str = Field(default='', max_length=10000)
    year: int | None = Field(default=None, ge=1900, le=datetime.now().year+2)
    mileage: str = Field(default='', max_length=20)
    images: list[str] = Field(default_factory=list, max_length=8)
    status: str = 'draft'

    @field_validator('title', 'description', 'mileage', 'price')
    @classmethod
    def strip(cls, value):
        return value.strip()

    @field_validator('price')
    @classmethod
    def price_numeric(cls, value):
        if not re.fullmatch(r'\d{1,9}(?:[.,]\d{1,2})?', value) or float(value.replace(',', '.')) <= 0:
            raise ValueError('Enter a positive price in PLN')
        return value.replace(',', '.')

    @field_validator('mileage')
    @classmethod
    def mileage_numeric(cls, value):
        if value and not re.fullmatch(r'\d{1,9}', value):
            raise ValueError('Mileage must be a number')
        return value

    @field_validator('status')
    @classmethod
    def valid_status(cls, value):
        if value not in {'draft', 'published', 'sold'}:
            raise ValueError('Invalid status')
        return value


def store_image(value):
    if not safe_image(value):
        raise HTTPException(422, 'Invalid image')
    if not value.startswith('data:'):
        if len(value) > 2048:
            raise HTTPException(422, 'Image URL too long')
        if value.startswith('/media/') and (not re.fullmatch(r'/media/[a-f0-9]{64}\.jpg', value) or not (MEDIA/value.split('/')[-1]).is_file()):
            raise HTTPException(422, 'Image does not exist')
        return value
    try:
        raw = base64.b64decode(value.split(',', 1)[1], validate=True)
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(422, 'Each image must be under 5 MB')
        with Image.open(io.BytesIO(raw)) as source:
            if source.width*source.height > 24_000_000:
                raise HTTPException(422, 'Image resolution too large')
            img = ImageOps.exif_transpose(source).convert('RGB')
            img.thumbnail((1920, 1440))
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=88, optimize=True)
        encoded = output.getvalue()
        name = hashlib.sha256(encoded).hexdigest()+'.jpg'
        destination = MEDIA/name
        if not destination.exists():
            temp = MEDIA/(secrets.token_hex(16)+'.tmp')
            temp.write_bytes(encoded)
            temp.replace(destination)
        return '/media/'+name
    except (ValueError, UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(422, 'Cannot read image')


def save_car(data, car_id=None):
    images = [store_image(x) for x in data.images]
    if data.status == 'published' and (not images or not data.description.strip() or data.year is None):
        raise HTTPException(422, 'Add a photo, year and description before publishing')
    values = (data.title, data.price, json.dumps(images), data.description, data.year, data.mileage, data.status)
    with connection() as conn:
        if car_id is None:
            cursor = conn.execute('INSERT INTO cars (title,price,image,description,year,mileage,status) VALUES (?,?,?,?,?,?,?)', values)
            car_id = cursor.lastrowid
        else:
            cursor = conn.execute('UPDATE cars SET title=?,price=?,image=?,description=?,year=?,mileage=?,status=? WHERE id=?', (*values, car_id))
            if not cursor.rowcount:
                raise HTTPException(404, 'Car not found')
    return {'id': car_id, 'status': data.status}


@app.post('/api/admin/cars', status_code=201)
def add_car(data: Car, auth=Depends(admin)):
    return save_car(data)


@app.put('/api/admin/cars/{car_id}')
def update_car(car_id: int, data: Car, auth=Depends(admin)):
    return save_car(data, car_id)


@app.delete('/api/admin/cars/{car_id}')
def delete_car(car_id: int, auth=Depends(admin)):
    # Archive instead of destroying listings and their photographs.
    with connection() as conn:
        cursor = conn.execute("UPDATE cars SET status='draft' WHERE id=?", (car_id,))
        if not cursor.rowcount:
            raise HTTPException(404, 'Car not found')
    return {'ok': True}


class Application(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=6, max_length=32)
    message: str = Field(min_length=3, max_length=3000)
    car_id: int | None = None
    website: str = Field(default='', max_length=200)  # honeypot

    @field_validator('name', 'phone', 'message')
    @classmethod
    def clean(cls, value):
        return value.strip()

    @field_validator('phone')
    @classmethod
    def valid_phone(cls, value):
        if not re.fullmatch(r'[+\d ()-]+', value) or not 6 <= len(re.sub(r'\D', '', value)) <= 15:
            raise ValueError('Invalid phone number')
        return value


@app.post('/api/applications', status_code=201)
def apply(data: Application, request: Request):
    limit(request, 'application', 5, 600)
    if data.website:
        return {'ok': True}
    with connection() as conn:
        if data.car_id:
            row = conn.execute("SELECT title FROM cars WHERE id=? AND status='published'", (data.car_id,)).fetchone()
            if not row:
                raise HTTPException(404, 'Car not found')
            message = f"[{row['title']}]\n{data.message}"
        else:
            message = data.message
        cursor = conn.execute('INSERT INTO applications (name,phone,message,car_id) VALUES (?,?,?,?)', (data.name, data.phone, message, data.car_id))
    return {'ok': True, 'id': cursor.lastrowid}


@app.get('/api/admin/applications')
def applications(auth=Depends(admin)):
    with connection() as conn:
        return [dict(row) for row in conn.execute('SELECT * FROM applications ORDER BY id DESC LIMIT 500')]


class LeadStatus(BaseModel):
    status: str

    @field_validator('status')
    @classmethod
    def valid(cls, value):
        if value not in {'new', 'contacted', 'closed'}:
            raise ValueError('Invalid status')
        return value


@app.patch('/api/admin/applications/{lead_id}')
def lead_status(lead_id: int, data: LeadStatus, auth=Depends(admin)):
    with connection() as conn:
        if not conn.execute('UPDATE applications SET status=? WHERE id=?', (data.status, lead_id)).rowcount:
            raise HTTPException(404, 'Application not found')
    return {'ok': True}


@app.delete('/api/admin/applications/{lead_id}')
def erase_application(lead_id: int, auth=Depends(admin)):
    with connection() as conn:
        if not conn.execute('DELETE FROM applications WHERE id=?', (lead_id,)).rowcount:
            raise HTTPException(404, 'Application not found')
    return {'ok': True}


@app.get('/api/admin/stats')
def stats(auth=Depends(admin)):
    with connection() as conn:
        return {'cars': conn.execute('SELECT count(*) FROM cars').fetchone()[0], 'published': conn.execute("SELECT count(*) FROM cars WHERE status='published'").fetchone()[0], 'new': conn.execute("SELECT count(*) FROM applications WHERE status='new'").fetchone()[0]}


@app.get('/api/config')
def config():
    return {name: os.getenv(key, default) for name, key, default in [('phone','SITE_PHONE','+48694219020'),('phoneDisplay','SITE_PHONE_DISPLAY','+48 694 219 020'),('city','SITE_CITY','Kampinos'),('contact','SITE_CONTACT','Roman')]}


@app.get('/healthz')
def health():
    with connection() as conn:
        conn.execute('SELECT 1').fetchone()
    return {'status': 'ok'}


PAGES = {'index.html', 'katalog.html', 'kontakt.html', 'product.html', 'admin.html', 'privacy.html'}
@app.get('/')
def homepage():
    return FileResponse(ROOT/'index.html')


@app.get('/robots.txt')
def robots():
    return Response('User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/admin/\n', media_type='text/plain')


@app.get('/{page}')
def html_page(page: str):
    if page not in PAGES:
        raise HTTPException(404, 'Page not found')
    return FileResponse(ROOT/page)


for directory in ['css', 'js', 'assets']:
    app.mount('/'+directory, StaticFiles(directory=ROOT/directory), name=directory)
app.mount('/media', StaticFiles(directory=MEDIA, check_dir=False), name='media')
