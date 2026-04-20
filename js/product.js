const API_URL = 'https://devoted-trust-production.up.railway.app';
let currentCarTitle = ""; 

window.changeMainImg = function(src, thumbnailElement) {
    const mainImg = document.getElementById('mainProductImage');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.gallery-thumb').forEach(img => img.style.borderColor = 'transparent');
    if (thumbnailElement) thumbnailElement.style.borderColor = '#e63946';
};

function loadProductDetails() {
    const lang = localStorage.getItem('selectedLang') || 'pl';
    const t = translations[lang];

    const urlParams = new URLSearchParams(window.location.search);
    const carId = urlParams.get('id');

    if (!carId) {
        window.location.href = 'katalog.html';
        return;
    }

    fetch(`${API_URL}/cars`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
        .then(r => r.json())
        .then(cars => {
            if (!Array.isArray(cars)) return;

            const car = cars.find(c => String(c.id) === String(carId));
            const container = document.getElementById('product-content');

            if (!car) {
                container.innerHTML = `<h2 style="text-align:center; width:100%; padding:50px;">${lang === 'ua' ? 'Авто не знайдено' : 'Pojazd nie znaleziony'}</h2>`;
                return;
            }

            currentCarTitle = car.title;

            // ✅ ВИПРАВЛЕНО: Гнучкий парсинг фото
            let images = [];
            try {
                images = JSON.parse(car.image);
                if (!Array.isArray(images)) images = [car.image];
            } catch(e) {
                images = car.image ? [car.image] : ["https://via.placeholder.com/800x500?text=Brak+zdjęcia"];
            }

            let galleryHTML = '';
            if (images.length > 1) {
                galleryHTML = `
                    <div style="display: flex; gap: 10px; margin-top: 15px; overflow-x: auto; padding-bottom: 10px;">
                        ${images.map((img, index) => `
                            <img src="${img}" class="gallery-thumb" onclick="changeMainImg(this.src, this)" 
                                 style="width: 80px; height: 60px; object-fit: cover; cursor: pointer; border-radius: 6px; border: 2px solid ${index === 0 ? '#e63946' : 'transparent'}; transition: 0.2s;">
                        `).join('')}
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="product-image-col">
                    <img id="mainProductImage" src="${images[0]}" alt="${car.title}" onerror="this.src='https://via.placeholder.com/800x500?text=Brak+zdjęcia'">
                    ${galleryHTML}
                    <div class="product-desc">
                        <h3 style="margin-top:0; font-size:22px; margin-bottom:15px;">${lang === 'ua' ? 'Опис автомобіля' : 'Opis pojazdu'}</h3>
                        <p>${car.description || (lang === 'ua' ? 'Немає опису' : 'Brak opisu')}</p>
                    </div>
                </div>
                <div class="product-info-col">
                    <h1 style="margin-top:0; font-size:28px; color:#111;">${car.title}</h1>
                    <div class="product-price">${car.price} PLN</div>
                    <ul class="product-specs">
                        <li>📅 <strong>${t.year}:</strong> ${car.year || '—'}</li>
                        <li>🚀 <strong>${t.mileage}:</strong> ${car.mileage || '—'}</li>
                        <li>⚙️ <strong>${t.transmissionLabel || 'Skrzynia'}:</strong> ${car.transmission || '—'}</li>
                        <li>🧪 <strong>${t.engineLabel || 'Silnik'}:</strong> ${car.engine_volume || '—'}</li>
                    </ul>
                    <div style="margin-top:40px;">
                        <h3 id="order-h3" style="margin-bottom:20px;">${t.orderTitle}</h3>
                        <form id="productForm" class="order-form">
                            <input type="text" id="pName" placeholder="${t.placeholderName}" required>
                            <input type="tel" id="pPhone" placeholder="${t.placeholderPhone}" required>
                            <textarea id="pMessage" placeholder="${t.placeholderMsg}" rows="4" required></textarea>
                            <button type="submit" class="btn-primary" style="width: 100%; border: none;">${t.btnSend}</button>
                        </form>
                        <p id="pStatus" style="margin-top: 15px; text-align: center; font-weight: bold;"></p>
                    </div>
                </div>
            `;
        })
        .catch(err => console.error("Помилка завантаження авто:", err));
}

document.addEventListener('submit', function(event) {
    if (event.target && event.target.id === 'productForm') {
        event.preventDefault();
        const lang = localStorage.getItem('selectedLang') || 'pl';
        const msgs = {
            ua: { success: "Заявку відправлено!", err: "Помилка відправки." },
            pl: { success: "Zgłoszenie wysłane!", err: "Błąd wysyłania." }
        };

        const data = {
            name: document.getElementById('pName').value,
            phone: document.getElementById('pPhone').value,
            message: `[Zapytanie o: ${currentCarTitle}]\n${document.getElementById('pMessage').value}`
        };

        fetch(`${API_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(r => {
            if (!r.ok) throw new Error();
            document.getElementById('pStatus').innerText = msgs[lang].success;
            document.getElementById('pStatus').style.color = "#28a745";
            event.target.reset();
        })
        .catch(() => {
            document.getElementById('pStatus').innerText = msgs[lang].err;
            document.getElementById('pStatus').style.color = "#e63946";
        });
    }
});

document.addEventListener('DOMContentLoaded', loadProductDetails);