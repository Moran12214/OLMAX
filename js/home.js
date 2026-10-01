document.querySelector("main").innerHTML =
  `<section class="hero container"><div class="hero-copy"><p class="eyebrow">OLMAX / KAMPINOS</p><h1 data-t="hero"></h1><p class="hero-sub" data-t="heroSub"></p><div class="actions"><a class="button primary" href="/katalog.html" data-t="browse"></a><a class="text-link" href="/kontakt.html" data-t="contact"></a></div></div><div class="hero-photo" id="hero-photo"><div class="hero-empty">OLMAX</div></div></section><section class="section container"><div class="section-heading"><div><p class="eyebrow">OLMAX</p><h2 data-t="latest"></h2></div><a class="text-link" href="/katalog.html" data-t="all"></a></div><div class="car-grid" id="latest-cars"><p data-t="loading"></p></div></section><section class="benefits container"><article><span>01</span><h3 data-t="details"></h3><p data-t="detailsText"></p></article><article><span>02</span><h3 data-t="direct"></h3><p data-t="directText"></p></article><article><span>03</span><h3 data-t="visit"></h3><p data-t="visitText"></p></article></section>`;
let homeCars = [];
function drawHome() {
  const el = document.getElementById("latest-cars");
  el.innerHTML = homeCars.length
    ? homeCars.slice(0, 3).map(carCard).join("")
    : `<p class="empty-state">${t("noCars")}</p>`;
  const car = homeCars[0];
  if (car)
    document.getElementById("hero-photo").innerHTML =
      `<a href="/product.html?id=${car.id}"><img src="${escapeHTML(mainImage(car))}" alt="${escapeHTML(car.title)}" fetchpriority="high"><div class="hero-caption"><span>${escapeHTML(car.title)}</span><strong>${escapeHTML(money(car.price))}</strong></div></a>`;
  installImageFallback();
  translate();
}
async function loadHome() {
  try {
    homeCars = await api("/cars");
    drawHome();
  } catch {
    errorState(document.getElementById("latest-cars"), loadHome);
  }
}
document.addEventListener("languagechange", drawHome);
translate();
loadHome();
