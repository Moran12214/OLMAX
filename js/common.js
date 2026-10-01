const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (value) =>
  new Intl.NumberFormat(language === "ua" ? "uk-UA" : "pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(Number(String(value).replace(",", ".")) || 0);
const distance = (value) =>
  value
    ? new Intl.NumberFormat(language === "ua" ? "uk-UA" : "pl-PL").format(
        Number(value),
      ) + " km"
    : "—";
let siteConfig = {
  phone: "+48694219020",
  phoneDisplay: "+48 694 219 020",
  city: "Kampinos",
  contact: "Roman",
};
async function api(path, options = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  if (!response.ok) {
    const error = new Error(
      typeof data.detail === "string" ? data.detail : "Request failed",
    );
    error.status = response.status;
    error.detail = data.detail;
    throw error;
  }
  return data;
}
function mainImage(car) {
  return Array.isArray(car.images) && car.images[0]
    ? car.images[0]
    : "/assets/no-photo.svg";
}
function installImageFallback(root = document) {
  root.querySelectorAll("img").forEach((img) =>
    img.addEventListener(
      "error",
      () => {
        img.src = "/assets/no-photo.svg";
      },
      { once: true },
    ),
  );
}
function header() {
  document.querySelector("header").innerHTML =
    `<div class="header-inner"><a class="brand" href="/" aria-label="OLMAX">OLMAX<span></span></a><nav aria-label="Menu"><a href="/" data-t="home"></a><a href="/katalog.html" data-t="catalog"></a><a href="/kontakt.html" data-t="contact"></a></nav><div class="header-actions"><div class="languages" aria-label="Language"><button data-language="pl" aria-label="Polski">PL</button><button data-language="ua" aria-label="Українська">UA</button></div><a class="phone-link" href="tel:${escapeHTML(siteConfig.phone)}">${escapeHTML(siteConfig.phoneDisplay)}</a></div></div>`;
  document
    .querySelectorAll("[data-language]")
    .forEach((el) => (el.onclick = () => setLanguage(el.dataset.language)));
  const current = location.pathname;
  document.querySelectorAll("nav a").forEach((el) => {
    if (
      el.getAttribute("href") === current ||
      (current === "/index.html" && el.getAttribute("href") === "/")
    )
      el.setAttribute("aria-current", "page");
  });
  document.querySelector("footer").innerHTML =
    `<div class="footer-inner"><div><a class="brand" href="/">OLMAX<span></span></a><p data-t="footer"></p></div><div class="footer-links"><a href="tel:${escapeHTML(siteConfig.phone)}">${escapeHTML(siteConfig.contact)} · ${escapeHTML(siteConfig.phoneDisplay)}</a><a href="/privacy.html" data-t="privacy"></a><a href="/admin.html" data-t="admin"></a></div></div>`;
  translate();
}
function carCard(car) {
  return `<article class="car-card"><a class="card-image" href="/product.html?id=${car.id}"><img src="${escapeHTML(mainImage(car))}" alt="${escapeHTML(car.title)}" loading="lazy"></a><div class="card-body"><div class="car-meta">${escapeHTML(car.year || "—")}<span>·</span>${escapeHTML(distance(car.mileage))}</div><h3><a href="/product.html?id=${car.id}">${escapeHTML(car.title)}</a></h3><div class="card-bottom"><strong>${escapeHTML(money(car.price))}</strong><a href="/product.html?id=${car.id}" aria-label="${escapeHTML(t("view") + " " + car.title)}">${t("view")} <span aria-hidden="true">↗</span></a></div></div></article>`;
}
function errorState(container, retry) {
  container.innerHTML = `<div class="empty-state"><p>${t("loadError")}</p><button class="button secondary">${t("retry")}</button></div>`;
  container.querySelector("button").onclick = retry;
}
function requestForm(id) {
  return `<form id="${id}" class="request-form"><label><span data-t="name"></span> *<input name="name" autocomplete="name" required minlength="2" maxlength="100"></label><label><span data-t="phone"></span> *<input name="phone" type="tel" autocomplete="tel" required minlength="6" maxlength="32"></label><label><span data-t="message"></span> *<textarea name="message" rows="5" required minlength="3" maxlength="3000"></textarea></label><div class="honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><p class="small"><span data-t="privacyNote"></span> <a href="/privacy.html" data-t="privacy"></a>.</p><button class="button primary" type="submit" data-t="send"></button><p class="form-status" role="status" aria-live="polite"></p></form>`;
}
function bindRequestForm(id, carId) {
  const form = document.getElementById(id);
  form.onsubmit = async (event) => {
    event.preventDefault();
    const phone = form.elements.phone;
    phone.setCustomValidity("");
    if (
      !/^[+\d ()-]+$/.test(phone.value) ||
      phone.value.replace(/\D/g, "").length < 6 ||
      phone.value.replace(/\D/g, "").length > 15
    ) {
      phone.setCustomValidity(t("phoneInvalid"));
      phone.reportValidity();
      return;
    }
    const button = form.querySelector("button[type=submit]"),
      status = form.querySelector(".form-status");
    button.disabled = true;
    button.textContent = t("sending");
    status.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    if (carId) data.car_id = carId;
    try {
      await api("/applications", {
        method: "POST",
        body: JSON.stringify(data),
      });
      form.reset();
      status.textContent = t("sent");
      status.className = "form-status success";
    } catch (error) {
      status.textContent = t(error.status === 429 ? "rateError" : "sendError");
      status.className = "form-status error";
    } finally {
      button.disabled = false;
      button.textContent = t("send");
    }
  };
  form.elements.phone.oninput = () => form.elements.phone.setCustomValidity("");
  translate();
}
header();
api("/config")
  .then((config) => {
    siteConfig = config;
    header();
  })
  .catch(() => {});
