const translations = {
    pl: {
        // Навігація
        navHome: "Główna",
        navCatalog: "Katalog",
        navContact: "Kontakt",
        // Головна сторінка (Hero)
        heroTitle: "Sprzedaż samochodów i przyczep",
        heroSub: "Profesjonalny komis samochodowy w Polsce",
        btnHeroCatalog: "Przejdź do katalogu",
        // Переваги (Features)
        feat1: "✅ Sprawdzone pojazdy",
        feat1Sub: "Zero ryzyka. Każde auto przechodzi dokładną kontrolę techniczną i weryfikację historii. Kupujesz pewniaka, nie problem.",
        feat2: "🛡️ Gwarancja",
        feat2Sub: "Kupujesz i śpisz spokojnie. Nasza gwarancja naprawdę działa — bez kruczków i ukrytych zapisów.",
        feat3: "📝 Rejestracja",
        feat3Sub: "Nie tracisz czasu na urzędy. Wszystko załatwiamy za Ciebie od A do Z — Ty odbierasz gotowy samochód.",
        // Секція новинок
        latestTitle: "Ostatnio dodane pojazdy",
        // Каталог
        catalogTitle: "Nasz Katalog",
        noCars: "Brak samochodów w katalogu.",
        // Картка авто
        price: "Cena",
        year: "Rok",
        mileage: "Przebieg",
        btnMore: "Więcej",
        // Сторінка контактів
        txtContactH2: "Skontaktuj się z nami",
        txtContactSub: "Masz pytania dotyczące naszych samochodów? Chcesz umówić się na jazdę próbną? Zadzwoń lub napisz!",
        txtAddrTitle: "📍 Adres",
        txtPhoneTitle: "📞 Telefon",
        txtHoursTitle: "🕒 Godziny otwarcia",
        txtHoursWeek: "Poniedziałek - Piątek: 09:00 - 18:00",
        txtHoursSat: "Sobota: 10:00 - 14:00",
        txtHoursSun: "Niedziela: Zamknięte",
        orderTitle: "Napisz do nas",
        placeholderName: "Twoje imię",
        placeholderPhone: "Twój numer telefonu",
        placeholderMsg: "Wiadomość",
        btnSend: "Wyślij wiadomość",
        // Сторінка товару (додатково)
        btnBack: "Powrót do katalogu",
        // Адмінка
        placeholderModel: "Marka i model",
        placeholderPrice: "Cena",
        btnDelete: "Usuń",
        btnReject: "Odrzuć",
        confirmDelete: "Czy na pewno usunąć?",
        confirmDeleteApp: "Czy na pewno odrzucić zgłoszenie?",
        alertSuccess: "Dodano pomyślnie!"
    },
    ua: {
        // Навігація
        navHome: "Головна",
        navCatalog: "Каталог",
        navContact: "Контакти",
        // Головна сторінка (Hero)
        heroTitle: "Продаж автомобілів та причепів",
        heroSub: "Професійний автокоміс у Польщі",
        btnHeroCatalog: "Перейти до каталогу",
        // Переваги (Features)
        feat1: "✅ Перевірені авто",
        feat1Sub: "Жодного ризику. Кожне авто проходить повну перевірку — технічну та по історії. Ти купуєш рішення, а не проблему.",
        feat2: "🛡️ Гарантія",
        feat2Sub: "Купив — і спокійний. Наша гарантія реально працює, без підводних каменів і 'дрібного шрифту'.",
        feat3: "📝 Реєстрація",
        feat3Sub: "Не витрачай час на бюрократію. Ми оформлюємо все під ключ — ти просто забираєш авто.",
        // Секція новинок
        latestTitle: "Останні додані автомобілі",
        // Каталог
        catalogTitle: "Наш Каталог",
        noCars: "В каталозі поки немає авто.",
        // Картка авто
        price: "Ціна",
        year: "Рік",
        mileage: "Пробіг",
        btnMore: "Детальніше",
        // Сторінка контактів
        txtContactH2: "Зв'яжіться з нами",
        txtContactSub: "Маєте питання щодо наших авто? Хочете домовитись про тест-драйв? Дзвоніть або пишіть!",
        txtAddrTitle: "📍 Адреса",
        txtPhoneTitle: "📞 Телефон",
        txtHoursTitle: "🕒 Графік роботи",
        txtHoursWeek: "Понеділок - П'ятниця: 09:00 - 18:00",
        txtHoursSat: "Субота: 10:00 - 14:00",
        txtHoursSun: "Неділя: Вихідний",
        orderTitle: "Напишіть нам",
        placeholderName: "Ваше ім'я",
        placeholderPhone: "Ваш номер телефону",
        placeholderMsg: "Повідомлення",
        btnSend: "Надіслати повідомлення",
        // Сторінка товару (додатково)
        btnBack: "Назад до каталогу",
        // Адмінка
        placeholderModel: "Марка та модель",
        placeholderPrice: "Ціна",
        btnDelete: "Видалити",
        btnReject: "Відхилити",
        confirmDelete: "Видалити це авто?",
        confirmDeleteApp: "Ви дійсно хочете видалити цю заявку?",
        alertSuccess: "Успішно додано!"
    }
};

function setLanguage(lang) {
    localStorage.setItem('selectedLang', lang);
    const t = translations[lang];

    // Мапа ID елементів та відповідних перекладів
    const allMap = {
        // Навігація
        'nav-home': t.navHome,
        'nav-catalog': t.navCatalog,
        'nav-contact': t.navContact,
        // Головна (Hero + Features)
        'txt-hero-title': t.heroTitle,
        'txt-hero-sub': t.heroSub,
        'btn-hero-catalog': t.btnHeroCatalog,
        'txt-feat-1': t.feat1,
        'txt-feat-1-sub': t.feat1Sub,
        'txt-feat-2': t.feat2,
        'txt-feat-2-sub': t.feat2Sub,
        'txt-feat-3': t.feat3,
        'txt-feat-3-sub': t.feat3Sub,
        'latest-h2': t.latestTitle,
        // Каталог
        'catalog-h1': t.catalogTitle,
        // Контакти
        'txt-contact-h2': t.txtContactH2,
        'txt-contact-sub': t.txtContactSub,
        'txt-addr-title': t.txtAddrTitle,
        'txt-phone-title': t.txtPhoneTitle,
        'txt-hours-title': t.txtHoursTitle,
        'txt-hours-week': t.txtHoursWeek,
        'txt-hours-sat': t.txtHoursSat,
        'txt-hours-sun': t.txtHoursSun,
        'order-h3': t.orderTitle,
        'btn-send-app': t.btnSend,
        // Товар (якщо є кнопка назад)
        'product-back': t.btnBack,
        // Адмінка (статичні заголовки)
        'btn-add-submit': t.btnSubmit || t.btnAdd // на випадок різних назв
    };

    // Застосовуємо переклад текстів
    for (let id in allMap) {
        const el = document.getElementById(id);
        if (el) el.innerText = allMap[id];
    }

    // Перекладаємо плейсхолдери
    const inputs = {
        'contactName': t.placeholderName,
        'contactPhone': t.placeholderPhone,
        'contactMessage': t.placeholderMsg,
        'carTitle': t.placeholderModel,
        'carPrice': t.placeholderPrice
    };

    for (let id in inputs) {
        const el = document.getElementById(id);
        if (el) el.placeholder = inputs[id];
    }

    const langButtons = document.querySelectorAll('.lang-switcher button');
    langButtons.forEach(button => {
        const buttonLang = button.dataset.lang || (button.getAttribute('onclick') || '').match(/setLanguage\('(.+?)'\)/)?.[1];
        if (buttonLang === lang) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });

    updateActiveNavLink();

    // Перезапуск функцій завантаження контенту на різних сторінках
    if (typeof loadCatalog === 'function') loadCatalog();
    if (typeof loadLatestCars === 'function') loadLatestCars();
    if (typeof loadProductDetails === 'function') loadProductDetails();
    if (typeof initAdmin === 'function') initAdmin();
}

function updateActiveNavLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (linkPage === 'index.html' && currentPage === '')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem('selectedLang') || 'pl';
    setLanguage(savedLang);
});