const API_URL = 'https://devoted-trust-production.up.railway.app/katalog.html';

// 🔥 ДОПОМІЖНА ФУНКЦІЯ: Дістає перше фото з масиву галереї
function getMainImage(imageString) {
    try {
        const parsed = JSON.parse(imageString);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch (e) {} // Якщо це старе авто (просто лінк), помилка ігнорується
    return imageString || "https://via.placeholder.com/300";
}

function loadLatestCars() {
    // 1. Отримуємо поточну мову та об'єкт перекладів
    const lang = localStorage.getItem('selectedLang') || 'pl';
    const t = translations[lang];

    fetch(`${API_URL}/cars`, {
        headers: {
            'ngrok-skip-browser-warning': 'true'
        }
    })
        .then(r => r.json())
        .then(data => {
            const container = document.getElementById('latest-cars');
            if (!container) return;

            container.innerHTML = '';

            // Беремо останні 3 додані машини
            const latestCars = data.reverse().slice(0, 3);

            if (latestCars.length === 0) {
                // Використовуємо переклад t.noCars
                container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">${t.noCars}</p>`;
                return;
            }

            latestCars.forEach(car => {
                const div = document.createElement('div');
                div.className = "card";

                // Перехід на сторінку конкретного авто
                div.onclick = () => location.href = `product.html?id=${car.id}`;

                // 2. Змінили src картинки на getMainImage(car.image)
                div.innerHTML = `
                    <img src="${getMainImage(car.image)}" alt="${car.title}" onerror="this.src='https://via.placeholder.com/300x200'" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
                    <h3 style="margin: 10px 0;">${car.title}</h3>
                    <p style="font-size: 20px; font-weight: bold; color: #e63946; margin-bottom: 15px;">${car.price} PLN</p>
                    <button style="width: 100%; background: #000; color: #fff; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.3s;">
                        ${t.btnMore}
                    </button>
                `;
                container.appendChild(div);
            });
        })
        .catch(error => console.error("Помилка завантаження авто на головній:", error));
}

// Завантажуємо при старті
document.addEventListener('DOMContentLoaded', loadLatestCars);