document.querySelector("main").innerHTML =
  `<section class="container section"><p class="eyebrow">OLMAX / KAMPINOS</p><div class="section-heading"><h1 data-t="catalog"></h1><span id="count" class="small" role="status"></span></div><div class="catalog-filters"><label><span data-t="search"></span><input id="search" type="search" data-ph="searchPlaceholder"></label><label><span data-t="maxPrice"></span><input id="max-price" type="number" min="0" inputmode="decimal"></label><label><span data-t="sort"></span><select id="sort"><option value="newest" data-t="newest"></option><option value="priceAsc" data-t="priceAsc"></option><option value="priceDesc" data-t="priceDesc"></option></select></label><button class="button secondary" id="reset-filters" data-t="resetFilters"></button></div><div id="catalog-container" class="car-grid"><p data-t="loading"></p></div></section>`;
let catalogCars = [];
function drawCatalog() {
  const query = document
    .getElementById("search")
    .value.trim()
    .toLocaleLowerCase();
  const price = document.getElementById("max-price").value;
  const sort = document.getElementById("sort").value;
  let cars = catalogCars.filter(
    (c) =>
      (c.title + " " + c.description).toLocaleLowerCase().includes(query) &&
      (!price || Number(c.price) <= Number(price)),
  );
  if (sort !== "newest")
    cars.sort(
      (a, b) =>
        (Number(a.price) - Number(b.price)) * (sort === "priceAsc" ? 1 : -1),
    );
  document.getElementById("count").textContent =
    t("offerCount") + ": " + cars.length;
  document.getElementById("catalog-container").innerHTML = cars.length
    ? cars.map(carCard).join("")
    : `<p class="empty-state">${t(catalogCars.length ? "noResults" : "noCars")}</p>`;
  installImageFallback();
}
async function loadCatalog() {
  try {
    catalogCars = await api("/cars");
    drawCatalog();
  } catch {
    errorState(document.getElementById("catalog-container"), loadCatalog);
  }
}
for (const id of ["search", "max-price", "sort"])
  document.getElementById(id).addEventListener("input", drawCatalog);
document.getElementById("reset-filters").onclick = () => {
  document.getElementById("search").value = "";
  document.getElementById("max-price").value = "";
  document.getElementById("sort").value = "newest";
  drawCatalog();
};
document.addEventListener("languagechange", drawCatalog);
translate();
loadCatalog();
