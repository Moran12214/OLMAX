const API_URL = 'https://devoted-trust-production.up.railway.app';

const ngrokHeaders = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
};

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
    fetch(`${API_URL}/stats`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => r.json())
        .then(data => {
            // Виправлено: тепер назви збігаються з main.py
            document.getElementById('stat-cars').innerText = data.cars_count || 0;
            document.getElementById('stat-apps').innerText = data.apps_count || 0;
        })
        .catch(error => console.error("Error loading stats:", error));
}

function loadCars() {
    const lang = localStorage.getItem('selectedLang') || 'pl';
    const t = translations[lang] || {};

    fetch(`${API_URL}/cars`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('adminTableBody');
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Baza jest pusta</td></tr>`;
                return;
            }

            tbody.innerHTML = data.reverse().map(car => `
                <tr>
                    <td>${car.id}</td>
                    <td style="display: flex; align-items: center; gap: 10px;">
                        <img src="${getMainImage(car.image)}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px;">
                        ${car.title}
                    </td>
                    <td>${car.price} PLN</td>
                    <td>
                        <button onclick="deleteCar(${car.id})" style="background:#e63946; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">
                            Удалить
                        </button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => console.error("Error loading cars:", error));
}

async function addCar(event) {
    if (event) event.preventDefault();
    const lang = localStorage.getItem('selectedLang') || 'pl';
    
    const title = document.getElementById('carTitle').value;
    const price = document.getElementById('carPrice').value;
    const fileInput = document.getElementById('carImages');
    const desc = document.getElementById('carDesc').value;
    const year = document.getElementById('carYear').value;
    const mileage = document.getElementById('carMileage').value;
    const transmission = document.getElementById('carTransmission').value;
    const engine = document.getElementById('carEngine').value;

    if (!title || !price) {
        alert("Заповніть назву та ціну!");
        return;
    }

    let imagesArray = [];
    if (fileInput.files.length > 0) {
        const files = Array.from(fileInput.files).slice(0, 10); // макс 10 фото
        imagesArray = await Promise.all(files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }));
    } else {
        imagesArray = ["https://via.placeholder.com/300"];
    }

    const newCar = {
        title: title,
        price: price,
        image: JSON.stringify(imagesArray),
        description: desc || "Brak opisu",
        year: year ? parseInt(year) : 0,
        mileage: mileage || "0",
        transmission: transmission,
        engine_volume: engine
    };

    fetch(`${API_URL}/cars`, {
        method: 'POST',
        headers: ngrokHeaders,
        body: JSON.stringify(newCar)
    })
    .then(() => {
        alert("Sukces!");
        location.reload(); // Перезавантаження для оновлення списку
    })
    .catch(err => console.error(err));
}

function deleteCar(id) {
    if (confirm("Видалити?")) {
        fetch(`${API_URL}/cars/${id}`, { 
            method: 'DELETE', 
            headers: { 'ngrok-skip-browser-warning': 'true' } 
        }).then(() => initAdmin());
    }
}

function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + name).style.display = 'block';
    document.getElementById('btn-' + name).classList.add('active');
    if (name === 'leads') loadApplications();
}

function loadApplications() {
    fetch(`${API_URL}/applications`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => r.json())
        .then(data => {
            const container = document.getElementById('leads-list');
            if (!data || data.length === 0) {
                container.innerHTML = `<p style="text-align:center;">Заявок немає</p>`;
                return;
            }
            container.innerHTML = data.reverse().map(app => `
                <div class="lead-card">
                    <p><strong>👤 Ім'я:</strong> ${app.name}</p>
                    <p><strong>📞 Тел:</strong> ${app.phone}</p>
                    <p><strong>💬 Повідомлення:</strong> ${app.message}</p>
                </div>
            `).join('');
        });
}

document.addEventListener('DOMContentLoaded', initAdmin);