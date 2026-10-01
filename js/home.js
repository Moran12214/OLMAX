const homeIcon = (name) => {
  const paths = {
    phone: '<path d="M7 3H3v4c0 8 6 14 14 14h4v-4l-5-2-2 2a14 14 0 0 1-7-7l2-2Z"/>',
    chat: '<path d="M14 14a7 7 0 1 0-9 1l-2 4 5-2h2"/><path d="M21 12a6 6 0 0 1-1 7l1 3-4-1a6 6 0 0 1-7-7 6 6 0 0 1 11-2Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};
document.querySelector('main').innerHTML = `
  <section class="showcase container" aria-labelledby="hero-title">
    <img class="showcase-image" src="/assets/hero.jpg" width="1792" height="1024" alt="" fetchpriority="high">
    <div class="showcase-copy"><p class="eyebrow">OLMAX · KAMPINOS</p>
      <h1 id="hero-title" data-t="hero"></h1><p class="showcase-sub" data-t="heroSub"></p>
      <div class="actions"><a class="button primary" href="/katalog.html"><span data-t="browse"></span><span aria-hidden="true">→</span></a><a class="button ghost" href="/kontakt.html" data-t="contact"></a></div>
    </div>
  </section>
  <div class="service-strip container"><div>${homeIcon('phone')}<span data-t="direct"></span></div><div>${homeIcon('chat')}<span data-t="bilingual"></span></div><div>${homeIcon('pin')}<span data-t="city"></span></div></div>
  <section class="categories container" aria-labelledby="categories-title"><div class="section-heading"><h2 id="categories-title" data-t="categoriesTitle"></h2><span class="eyebrow">OLMAX / OFERTA</span></div>
    <div class="category-grid">${[['passenger','cars'],['truck','trucks'],['trailer','trailers']].map(([category, image]) => `<a class="category-card" href="/katalog.html?category=${category}"><div class="category-image"><img src="/assets/${image}.jpg" width="1536" height="1024" alt="" loading="lazy"></div><div class="category-label"><h3 data-t="${category}"></h3><span aria-hidden="true">→</span></div></a>`).join('')}</div>
    <p class="image-note" data-t="illustrationNote"></p>
  </section>
  <section class="home-offer container" aria-labelledby="offer-title"><div class="section-heading" id="offer-heading"><h2 id="offer-title" data-t="latest"></h2><a class="text-link" href="/katalog.html" data-t="all"></a></div><div class="car-grid" id="latest-cars" aria-live="polite"><p data-t="loading"></p></div></section>
  <section class="contact-banner" id="about"><div class="container contact-banner-inner"><div><p class="eyebrow">OLMAX · KAMPINOS</p><h2 data-t="contactBanner"></h2><p data-t="visitText"></p><a class="contact-banner-phone" id="home-phone" href="tel:+48694219020">${homeIcon('phone')}<span>Roman · +48 694 219 020</span></a><a class="button ghost" href="/kontakt.html" data-t="contact"></a></div><img class="contact-banner-logo" src="/assets/logo-light.svg" width="330" height="74" alt="OLMAX"></div></section>`;
let homeCars = [];
let homeLoadFailed = false;
function drawHome() {
  if (homeLoadFailed) return;
  document.getElementById('offer-heading').hidden = !homeCars.length;
  document.getElementById('latest-cars').innerHTML = homeCars.length
    ? homeCars.slice(0, 3).map(carCard).join('')
    : `<div class="offer-empty"><svg viewBox="0 0 180 65" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 50l8-18 24-5 18-17h55l26 22 19 6 6 16H12Z"/><path d="M54 27h74M87 12v15"/><circle cx="43" cy="51" r="10"/><circle cx="139" cy="51" r="10"/></svg><h2 id="empty-offer-title">${t('emptyOfferTitle')}</h2><p>${t('emptyOfferText')}</p><a class="button primary" href="/kontakt.html">${t('askVehicle')} <span aria-hidden="true">→</span></a></div>`;
  document.querySelector('.home-offer').setAttribute('aria-labelledby', homeCars.length ? 'offer-title' : 'empty-offer-title');
  installImageFallback(document.getElementById('latest-cars'));
  translate();
}
function homeContact() {
  const link = document.getElementById('home-phone');
  link.href = 'tel:' + siteConfig.phone;
  link.querySelector('span').textContent = siteConfig.contact + ' · ' + siteConfig.phoneDisplay;
}
async function loadHome() {
  try { homeCars = await api('/cars'); homeLoadFailed = false; drawHome(); }
  catch { homeLoadFailed = true; errorState(document.getElementById('latest-cars'), loadHome); }
}
document.addEventListener('languagechange', () => homeLoadFailed ? errorState(document.getElementById('latest-cars'), loadHome) : drawHome());
document.addEventListener('siteconfigchange', homeContact);
homeContact();
translate();
loadHome();
