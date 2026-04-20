const API_URL = 'https://devoted-trust-production.up.railway.app';

const headers = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
};

// Функція для отримання перекладів (запобігає помилці ReferenceError)
function getTranslations() {
    const currentLang = localStorage.getItem('selectedLang') || 'pl';
    if (typeof lang !== 'undefined' && lang[currentLang]) {
        return lang[currentLang];
    }
    // Запасні тексти, якщо lang.js не завантажився
    return {
        confirmDelete: "Ви впевнені?",
        alertSuccess: "Успішно додано!"
    };
}

function getMainImage(imageString) {
    try {
        const parsed = JSON.parse(imageString);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {}
    return imageString || "https://via.placeholder.com/300";
}

function initAdmin() {
    console.log("Admin initialized");
    loadStats();
    loadCars();
}

function loadStats() {
    fetch(`${API_URL}/stats`, { headers: headers })
        .then(r => r.json())
        .then(res => {
            document.getElementById('stat-cars').innerText = res.cars_count || 0;
            document.getElementById('stat-apps').innerText = res.apps_count || 0;
        })
        .catch(err => console.error("Stats error:", err));
}

function loadCars() {
    fetch(`${API_URL}/cars`, { headers: headers })
        .then(r => r.json())
        .then(cars => {
            const tbody = document.getElementById('adminTableBody');
            if (!tbody) return;
            if (!cars || cars.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">База порожня</td></tr>';
                return;
            }
            tbody.innerHTML = cars.reverse().map(car => `
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

    const title = document.getElementById('carTitle').value;
    const price = document.getElementById('carPrice').value;
    const fileInput = document.getElementById('carImages'); // Виправлено ID
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
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const files = Array.from(fileInput.files).slice(0, 10);
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

    const carData = {
        title: title,
        price: price,
        image: JSON.stringify(imagesArray),
        description: desc || "",
        year: year ? parseInt(year) : 0,
        mileage: mileage || "",
        transmission: transmission,
        engine_volume: engine
    };

    fetch(`${API_URL}/cars`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(carData)
    })
    .then(r => r.json())
    .then(() => {
        alert(t.alertSuccess || "Авто додано!");
        location.reload();
    })
    .catch(err => console.error("Error adding car:", err));
}

function deleteCar(id) {
    const t = getTranslations();
    if (!confirm(t.confirmDelete)) return;
    
    fetch(`${API_URL}/cars/${id}`, { method: 'DELETE', headers: headers })
        .then(() => initAdmin());
}

function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + name).style.display = 'block';
    document.getElementById('btn-' + name).classList.add('active');
    if (name === 'leads') loadApplications();
}

function loadApplications() {
    fetch(`${API_URL}/applications`, { headers: headers })
        .then(r => r.json())
        .then(data => {
            const list = document.getElementById('leads-list');
            if (!list) return;
            if (!data || data.length === 0) {
                list.innerHTML = '<p style="text-align:center;">Заявок немає</p>';
                return;
            }
            list.innerHTML = data.reverse().map(app => `
                <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin-bottom:10px; border-left:4px solid #e63946;">
                    <p><strong>👤 ${app.name}</strong> (${app.phone})</p>
                    <p>💬 ${app.message}</p>
                </div>
            `).join('');
        });
}

// Запуск при завантаженні
window.onload = initAdmin;