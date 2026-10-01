const productId = Number(new URLSearchParams(location.search).get("id"));
document.querySelector("main").innerHTML =
  `<section class="container section"><a class="back-link" href="/katalog.html" data-t="back"></a><div id="product-content"><p data-t="loading"></p></div></section>`;
async function loadProduct() {
  const root = document.getElementById("product-content");
  if (!Number.isSafeInteger(productId) || productId < 1) {
    root.innerHTML = `<h1>${t("notFound")}</h1>`;
    return;
  }
  try {
    const car = await api("/cars/" + productId);
    document.title = car.title + " — OLMAX";
    const images = car.images.length ? car.images : ["/assets/no-photo.svg"];
    root.innerHTML = `<div class="product-layout"><div><div class="main-photo"><img id="main-photo" src="${escapeHTML(images[0])}" alt="${escapeHTML(car.title)}"></div><div class="gallery" role="group" aria-label="${t("gallery")}">${images.map((src, i) => `<button class="thumb" data-index="${i}" aria-label="${t("photos")} ${i + 1}" aria-pressed="${i === 0}"><img src="${escapeHTML(src)}" alt="${escapeHTML(car.title)} — ${i + 1}" loading="lazy"></button>`).join("")}</div><article class="description panel"><h2 data-t="description"></h2><p>${escapeHTML(car.description || t("noDescription"))}</p></article></div><div><div class="product-details panel"><p class="eyebrow">OLMAX / KAMPINOS</p><h1>${escapeHTML(car.title)}</h1><p class="product-price" id="product-price">${escapeHTML(money(car.price))}</p><dl class="specs"><div><dt data-t="year"></dt><dd>${escapeHTML(car.year || "—")}</dd></div><div><dt data-t="mileage"></dt><dd>${escapeHTML(distance(car.mileage))}</dd></div></dl><a class="button primary wide" href="tel:${escapeHTML(siteConfig.phone)}"><span data-t="call"></span> · ${escapeHTML(siteConfig.phoneDisplay)}</a></div><div class="panel inquiry"><h2 data-t="ask"></h2>${requestForm("product-form")}</div></div></div>`;
    root.querySelectorAll(".thumb").forEach(
      (button) =>
        (button.onclick = () => {
          document.getElementById("main-photo").src =
            images[Number(button.dataset.index)];
          root
            .querySelectorAll(".thumb")
            .forEach((x) =>
              x.setAttribute("aria-pressed", String(x === button)),
            );
        }),
    );
    bindRequestForm("product-form", car.id);
    installImageFallback(root);
    document.addEventListener("languagechange", () => {
      document.getElementById("product-price").textContent = money(car.price);
    });
    translate();
  } catch (error) {
    if (error.status === 404) root.innerHTML = `<h1>${t("notFound")}</h1>`;
    else errorState(root, loadProduct);
  }
}
translate();
loadProduct();
