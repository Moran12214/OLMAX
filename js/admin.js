const API_URL = 'https://devoted-trust-production.up.railway.app';

// Об'єкт із заголовками для Ngrok
const ngrokHeaders = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json'
};

// 🔥 ДОПОМІЖНА ФУНКЦІЯ: Дістає перше фото з масиву (або повертає старий лінк)
function getMainImage(imageString) {
    try {
        const parsed = JSON.parse(imageString);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {} // Якщо це старе авто (просто лінк), помилка ігнорується
    return imageString || "https://via.placeholder.com/300";
}

function initAdmin() {
    loadStats();
    loadCars();
    // Якщо відкрита секція з заявками, оновлюємо і їх
    if (document.getElementById('section-leads').style.display !== 'none') {
        loadApplications();
    }
}

function loadStats() {
    const lang = localStorage.getItem('selectedLang') || 'pl';
    fetch(`${API_URL}/stats`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => r.json())
        .then(data => {
            document.getElementById('stat-cars').innerText = data.total_cars;
            document.getElementById('stat-apps').innerText = data.total_applications;
        })
        .catch(error => console.error("Error loading stats:", error));
}

function loadCars() {
    const lang = localStorage.getItem('selectedLang') || 'pl';
    const t = translations[lang]; // Беремо переклади з lang.js

    fetch(`${API_URL}/cars`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => r.json())
        .then(data => {
            const tbody = document.getElementById('adminTableBody');

            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">${lang === 'ua' ? 'База порожня' : 'Baza jest pusta'}</td></tr>`;
                return;
            }

            // Додали відображення мініатюри в колонку з назвою авто
            tbody.innerHTML = data.reverse().map(car => `
                <tr>
                    <td>${car.id}</td>
                    <td style="display: flex; align-items: center; gap: 10px;">
                        <img src="${getMainImage(car.image)}" style="width: 50px; height: 35px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;">
                        ${car.title}
                    </td>
                    <td>${car.price}</td>
                    <td>
                        <button onclick="deleteCar(${car.id})" style="background:#e63946; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">
                            ${t.btnDelete}
                        </button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => console.error("Error loading cars:", error));
}

// 🔥 ОНОВЛЕНА ФУНКЦІЯ: Читає кілька файлів і зберігає їх як масив
async function addCar(event) {
    if (event) event.preventDefault();
    const lang = localStorage.getItem('selectedLang') || 'pl';
    const t = translations[lang];

    const titleInput = document.getElementById('carTitle');
    const priceInput = document.getElementById('carPrice');
    const fileInput = document.getElementById('carImage');
    const descInput = document.getElementById('carDesc');
    const yearInput = document.getElementById('carYear');
    const mileageInput = document.getElementById('carMileage');

    if (!titleInput.value || !priceInput.value) {
        alert(lang === 'ua' ? "Заповніть марку та ціну!" : "Wypełnij markę i cenę!");
        return;
    }

    let imagesArray = ["https://via.placeholder.com/300"]; // Заглушка

    // МАГІЯ ГАЛЕРЕЇ: Читаємо всі вибрані файли
    if (fileInput.files && fileInput.files.length > 0) {
        const files = Array.from(fileInput.files);

        // Обмеження: щоб не "вбити" базу даних, дозволяємо макс 5 фото
        if (files.length > 5) {
            alert(lang === 'ua' ? "Максимум 5 фото!" : "Maksymalnie 5 zdjęć!");
            return;
        }

        // Чекаємо, поки всі файли перетворяться на Base64
        imagesArray = await Promise.all(files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }));
    }

    const newCar = {
        title: titleInput.value,
        price: priceInput.value,
        image: JSON.stringify(imagesArray), // Зберігаємо масив як текст
        description: descInput ? descInput.value : "Brak opisu",
        year: yearInput && yearInput.value ? parseInt(yearInput.value) : null,
        mileage: mileageInput && mileageInput.value ? mileageInput.value : "Nie podano"
    };

    fetch(`${API_URL}/cars`, {
        method: 'POST',
        headers: ngrokHeaders,
        body: JSON.stringify(newCar)
    })
        .then(response => response.json())
        .then(() => {
            alert(t.alertSuccess);
            titleInput.value = '';
            priceInput.value = '';
            fileInput.value = '';
            if (descInput) descInput.value = '';
            if (yearInput) yearInput.value = '';
            if (mileageInput) mileageInput.value = '';
            initAdmin();
        })
        .catch(error => console.error("Error adding car:", error));
}

function deleteCar(id) {
    const lang = localStorage.getItem('selectedLang') || 'pl';
    if (confirm(translations[lang].confirmDelete)) {
        fetch(`${API_URL}/cars/${id}`, {
            method: 'DELETE',
            headers: { 'ngrok-skip-browser-warning': 'true' }
        })
            .then(() => initAdmin());
    }
}

function loadApplications() {
    const lang = localStorage.getItem('selectedLang') || 'pl';
    const t = translations[lang];

    fetch(`${API_URL}/applications`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => r.json())
        .then(data => {
            const container = document.getElementById('leads-list');
            if (data.length === 0) {
                container.innerHTML = `<p style='text-align:center; padding: 20px;'>${t.noApps}</p>`;
                return;
            }
            container.innerHTML = data.reverse().map(app => `
                <div class="lead-card" style="background:white; padding:20px; border-radius:10px; margin-bottom:15px; box-shadow:0 2px 10px rgba(0,0,0,0.05);">
                    <p style="margin: 0 0 10px 0;"><strong>👤 ${t.clientName || 'Клієнт'}:</strong> ${app.name}</p>
                    <p style="margin: 0 0 10px 0;"><strong>📞 ${t.clientPhone || 'Телефон'}:</strong> ${app.phone}</p>
                    <p style="margin: 0 0 15px 0;"><strong>💬 ${t.clientMsg || 'Повідомлення'}:</strong> ${app.message}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <small style="color:#666;">📅 ${new Date(app.date).toLocaleString()}</small>
                        <button class="delete-lead-btn" onclick="rejectApplication(${app.id})" style="background:#111; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">
                            ${t.btnReject}
                        </button>
                    </div>
                </div>
            `).join('');
        })
        .catch(error => console.error("Error loading apps:", error));
}

function rejectApplication(id) {
    const lang = localStorage.getItem('selectedLang') || 'pl';
    if (confirm(translations[lang].confirmDeleteApp)) {
        fetch(`${API_URL}/applications/${id}`, {
            method: 'DELETE',
            headers: { 'ngrok-skip-browser-warning': 'true' }
        })
            .then(() => {
                loadApplications();
                loadStats();
            });
    }
}

function showSection(name) {
    document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById('section-' + name).style.display = 'block';
    document.getElementById('btn-' + name).classList.add('active');

    if (name === 'leads') loadApplications();
    loadStats();
}

// Початковий запуск
initAdmin();