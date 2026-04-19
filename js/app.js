const API_URL = 'https://devoted-trust-production.up.railway.app/cars/cars';

// 🔥 ДОПОМІЖНА ФУНКЦІЯ: Дістає перше фото з масиву галереї
function getMainImage(imageString) {
    try {
        const parsed = JSON.parse(imageString);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {} // Якщо це старе авто (просто лінк), помилка ігнорується
    return imageString || "https://via.placeholder.com/300";
}

function loadCatalog() {
    // 1. Визначаємо поточну мову та беремо відповідні переклади
    const lang = localStorage.getItem('selectedLang') || 'pl';
    const t = translations[lang];

    fetch(`${API_URL}/cars`, {
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    })
        .then(response => response.json())
        .then(carsArray => {
            const container = document.getElementById('catalog-container') || document.getElementById('cars');
            if (!container) return;

            container.innerHTML = '';

            // 2. Використовуємо переклад для повідомлення про порожній каталог
            if (!carsArray || carsArray.length === 0) {
                container.innerHTML = `<p style="text-align:center; width:100%; padding: 40px; font-size: 18px; color: #666;">${t.noCars}</p>`;
                return;
            }

            // Налаштування сітки контейнера
            container.style.display = 'grid';
            container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
            container.style.gap = '30px';
            container.style.maxWidth = '1200px';
            container.style.margin = '40px auto';
            container.style.padding = '0 20px';

            // Додали .reverse(), щоб нові авто були першими
            carsArray.reverse().forEach(car => {
                const div = document.createElement('div');

                // Стилі картки
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                div.style.background = '#fff';
                div.style.borderRadius = '12px';
                div.style.padding = '15px';
                div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                div.style.cursor = 'pointer';
                div.style.transition = 'transform 0.3s, box-shadow 0.3s';
                div.style.overflow = 'hidden';

                div.onclick = () => location.href = `product.html?id=${car.id}`;

                div.onmouseover = () => {
                    div.style.transform = 'translateY(-8px)';
                    div.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                };
                div.onmouseout = () => {
                    div.style.transform = 'translateY(0)';
                    div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                };

                // 3. Змінили src картинки на getMainImage(car.image)
                div.innerHTML = `
                    <img src="${getMainImage(car.image)}" alt="${car.title}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;" onerror="this.src='https://via.placeholder.com/300x200?text=Brak+zdjęcia'">
                    
                    <h3 style="margin: 0 0 8px 0; font-size: 20px; color: #111; font-family: Arial, sans-serif;">${car.title}</h3>
                    
                    <p style="font-size: 22px; font-weight: bold; color: #e63946; margin: 0 0 12px 0;">${car.price} PLN</p>
                    
                    <div style="color: #555; font-size: 14px; margin-bottom: 20px; line-height: 1.6; border-top: 1px solid #eee; padding-top: 10px; margin-top: auto;">
                        <span style="display:block;">📅 <strong>${t.year}:</strong> ${car.year || '—'}</span>
                        <span style="display:block;">🚀 <strong>${t.mileage}:</strong> ${car.mileage || '—'}</span>
                    </div>
                    
                    <button style="width: 100%; background: #111; color: #fff; padding: 12px; border: none; border-radius: 8px; font-weight: bold; font-size: 15px; cursor: pointer; transition: 0.3s;">${t.btnMore}</button>
                `;

                container.appendChild(div);
            });
        })
        .catch(error => {
            console.error("Помилка завантаження каталогу:", error);
            const container = document.getElementById('catalog-container') || document.getElementById('cars');
            if (container) {
                container.innerHTML = '<p style="text-align:center; color: red; padding: 20px;">Помилка підключення до сервера.</p>';
            }
        });
}

document.addEventListener('DOMContentLoaded', loadCatalog);