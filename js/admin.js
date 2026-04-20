const API_URL = 'https://devoted-trust-production.up.railway.app';

const headers = {
    'Content-Type': 'application/json'
};

function getTranslations() {
    const currentLang = localStorage.getItem('selectedLang') || 'pl';
    return translations[currentLang] || { confirmDelete: "Ви впевнені?", alertSuccess: "Успішно!" };
}

function getMainImage(imageString) {
    try {
        const parsed = JSON.parse(imageString);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {}
    return imageString || "https://via.placeholder.com/300";
}

function initAdmin() {
    loadStats();
    loadCars();
}

function loadStats() {
    fetch(`${API_URL}/stats`).then(r => r.json()).then(res => {
        document.getElementById('stat-cars').innerText = res.cars_count || 0;
        document.getElementById('stat-apps').innerText = res.apps_count || 0;
    });
}

function loadCars() {
    fetch(`${API_URL}/cars`).then(r => r.json()).then(cars => {
        const tbody = document.getElementById('adminTableBody');
        if (!tbody) return;
        tbody.innerHTML = cars.map(car => `
            <tr>
                <td>${car.id}</td>
                <td style="display: flex; align-items: center; gap: 10px;">
                    <img src="${getMainImage(car.image)}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">
                    ${car.title || '---'}
                </td>
                <td>${car.price} PLN</td>
                <td>
                    <button onclick="deleteCar(${car.id})" style="background:#e63946; color:white; border:none; padding:8px 12px; border-radius:5px; cursor:pointer;">Видалити</button>
                </td>
            </tr>
        `).join('');
    });
}

async function addCar(event) {
    if (event) event.preventDefault();
    const t = getTranslations();

    const fileInput = document.getElementById('carImages');
    let imagesArray = [];

    if (fileInput.files.length > 0) {
        imagesArray = await Promise.all(Array.from(fileInput.files).map(file => {
            return new Promise(resolve => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }));
    }

    const carData = {
        title: document.getElementById('carTitle').value,
        price: document.getElementById('carPrice').value,
        image: JSON.stringify(imagesArray),
        description: document.getElementById('carDesc').value,
        year: parseInt(document.getElementById('carYear').value) || 0,
        mileage: document.getElementById('carMileage').value,
        transmission: document.getElementById('carTransmission').value,
        engine_volume: document.getElementById('carEngine').value
    };

    fetch(`${API_URL}/cars`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(carData)
    }).then(() => {
        alert(t.alertSuccess || "Додано!");
        location.reload();
    });
}

function deleteCar(id) {
    if (!confirm(getTranslations().confirmDelete)) return;
    fetch(`${API_URL}/cars/${id}`, { method: 'DELETE' }).then(() => loadCars());
}

function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + name).style.display = 'block';
    document.getElementById('btn-' + name).classList.add('active');
    if (name === 'leads') loadApplications();
}

function loadApplications() {
    fetch(`${API_URL}/applications`).then(r => r.json()).then(data => {
        const list = document.getElementById('leads-list');
        list.innerHTML = data.map(app => `
            <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #e63946;">
                <p><strong>👤 ${app.name}</strong> (${app.phone})</p>
                <p>💬 ${app.message}</p>
            </div>
        `).join('');
    });
}

window.onload = initAdmin;