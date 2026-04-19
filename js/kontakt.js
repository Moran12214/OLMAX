const API_URL = 'https://devoted-trust-production.up.railway.app/cars/cars';

document.getElementById('contactForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Визначаємо мову для сповіщень
    const lang = localStorage.getItem('selectedLang') || 'pl';

    // Тексти сповіщень (можна також винести в lang.js)
    const messages = {
        ua: {
            success: "Дякуємо! Ваша заявка успішно відправлена.",
            error: "Помилка відправки. Перевір підключення до сервера."
        },
        pl: {
            success: "Dziękujemy! Twoje zgłoszenie zostało wysłane.",
            error: "Błąd wysyłania. Sprawdź połączenie z serwerem."
        }
    };

    const applicationData = {
        name: document.getElementById('contactName').value,
        phone: document.getElementById('contactPhone').value,
        message: document.getElementById('contactMessage').value
    };

    fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' // Обов'язково для Ngrok
        },
        body: JSON.stringify(applicationData)
    })
        .then(response => {
            if (!response.ok) throw new Error('Server error');
            return response.json();
        })
        .then(data => {
            const statusText = document.getElementById('formStatus');
            statusText.innerText = messages[lang].success;
            statusText.style.color = "#28a745";

            document.getElementById('contactForm').reset();
        })
        .catch(error => {
            const statusText = document.getElementById('formStatus');
            statusText.innerText = messages[lang].error;
            statusText.style.color = "#e63946";
            console.error("Помилка:", error);
        });
});