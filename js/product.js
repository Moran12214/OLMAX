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
    root.innerHTML = `<div class="product-layout"><div><div class="main-photo photo-stage" tabindex="0" role="group" aria-label="${t('gallery')}"><button class="photo-open" type="button" aria-label="${t('openPhoto')}"><img id="main-photo" src="${escapeHTML(images[0])}" alt="${escapeHTML(car.title)}"><span class="photo-expand" aria-hidden="true">⛶</span></button><button class="photo-prev gallery-arrow" type="button" aria-label="${t('previousPhoto')}">‹</button><button class="photo-next gallery-arrow" type="button" aria-label="${t('nextPhoto')}">›</button><span class="photo-count" aria-live="polite"></span></div><div class="gallery" role="group" aria-label="${t("gallery")}">${images.map((src, i) => `<button class="thumb" data-index="${i}" aria-label="${t("photos")} ${i + 1}" aria-pressed="${i === 0}"><img src="${escapeHTML(src)}" alt="${escapeHTML(car.title)} — ${i + 1}" loading="lazy"></button>`).join("")}</div><article class="description panel"><h2 data-t="description"></h2><p>${escapeHTML(car.description || t("noDescription"))}</p></article></div><div><div class="product-details panel"><p class="eyebrow">OLMAX / KAMPINOS</p><h1>${escapeHTML(car.title)}</h1><p class="product-price" id="product-price">${escapeHTML(money(car.price))}</p><dl class="specs"><div><dt data-t="year"></dt><dd>${escapeHTML(car.year || "—")}</dd></div><div><dt data-t="mileage"></dt><dd>${escapeHTML(distance(car.mileage))}</dd></div>${['transmission','fuel_type','consumption_city','consumption_highway'].map(key=>`<div><dt data-t="${key}"></dt><dd data-spec="${key}"></dd></div>`).join('')}</dl><a class="button primary wide" href="tel:${escapeHTML(siteConfig.phone)}"><span data-t="call"></span> · ${escapeHTML(siteConfig.phoneDisplay)}</a></div><div class="panel inquiry"><h2 data-t="ask"></h2>${requestForm("product-form")}</div></div></div>`;
    setupGallery(root, images, car.title);
    const drawSpecs = () => {
      root.querySelectorAll('[data-spec]').forEach(el => {
        const key = el.dataset.spec, value = car[key];
        el.textContent = value === '' || value == null ? '—' : key.startsWith('consumption_') ? `${value} ${car.fuel_type === 'electric' ? 'kWh' : 'l'} / 100 km` : t(value);
      });
    };
    drawSpecs();
    document.addEventListener('languagechange', drawSpecs);
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

function setupGallery(root, images, title) {
  let index = 0, previousFocus = null, enteredFullscreen = false, suppressOpenUntil = 0;
  const stage = root.querySelector('.photo-stage');
  const strip = root.querySelector('.gallery');
  const dialog = document.createElement('dialog');
  dialog.className = 'photo-lightbox';
  dialog.setAttribute('aria-label', t('gallery'));
  dialog.innerHTML = `<button type="button" class="lightbox-close" autofocus>×</button><button type="button" class="photo-prev gallery-arrow">‹</button><img class="lightbox-image" alt=""><button type="button" class="photo-next gallery-arrow">›</button><span class="photo-count" aria-live="polite"></span>`;
  root.append(dialog);
  const fullImage = dialog.querySelector('img');
  const counters = root.querySelectorAll('.photo-count');
  const thumbs = [...root.querySelectorAll('.thumb')];
  function render() {
    const src = images[index];
    document.getElementById('main-photo').src = src;
    document.getElementById('main-photo').alt = `${title} — ${index + 1} / ${images.length}`;
    fullImage.src = src;
    fullImage.alt = `${title} — ${index + 1} / ${images.length}`;
    counters.forEach(el => el.textContent = `${index + 1} / ${images.length}`);
    thumbs.forEach((el,i)=>el.setAttribute('aria-pressed',String(i===index)));
    const selected = thumbs[index];
    if (selected) strip.scrollTo({left: selected.offsetLeft - strip.clientWidth / 2 + selected.clientWidth / 2});
  }
  function move(delta) { index = (index + delta + images.length) % images.length; render(); }
  for (const container of [stage, dialog]) {
    container.querySelector('.photo-prev').onclick = () => move(-1);
    container.querySelector('.photo-next').onclick = () => move(1);
    container.querySelectorAll('.gallery-arrow').forEach(el => el.hidden = images.length < 2);
    let start = null;
    container.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') start = {x:e.clientX,y:e.clientY}; });
    container.addEventListener('pointerup', e => {
      if (!start) return;
      const dx=e.clientX-start.x,dy=e.clientY-start.y; start=null;
      if (Math.abs(dx)>50 && Math.abs(dx)>Math.abs(dy)*1.5) { suppressOpenUntil = Date.now() + 400; move(dx<0?1:-1); }
    });
    container.addEventListener('pointercancel',()=>start=null);
  }
  thumbs.forEach((button,i)=>button.onclick=()=>{index=i;render();});
  stage.querySelector('.photo-open').onclick = () => {
    if (Date.now() < suppressOpenUntil) return;
    previousFocus = document.activeElement;
    dialog.showModal(); document.body.classList.add('gallery-open');
    if (dialog.requestFullscreen) dialog.requestFullscreen().then(()=>{enteredFullscreen=true;}).catch(()=>{});
  };
  dialog.querySelector('.lightbox-close').onclick = () => dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('gallery-open');
    enteredFullscreen=false;
    if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});
    previousFocus?.focus({preventScroll:true});
  });
  document.addEventListener('fullscreenchange',()=>{
    if(enteredFullscreen && !document.fullscreenElement && dialog.open)dialog.close();
  });
  document.addEventListener('keydown', e => {
    if (!(dialog.open || stage.contains(document.activeElement) || strip.contains(document.activeElement))) return;
    if (e.key==='ArrowLeft' || e.key==='ArrowRight') {e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}
    if (e.key==='Escape' && dialog.open) {e.preventDefault();dialog.close();}
  });
  function labels() {
    stage.querySelector('.photo-open').setAttribute('aria-label',t('openPhoto'));
    root.querySelectorAll('.photo-prev').forEach(el=>el.setAttribute('aria-label',t('previousPhoto')));
    root.querySelectorAll('.photo-next').forEach(el=>el.setAttribute('aria-label',t('nextPhoto')));
    dialog.querySelector('.lightbox-close').setAttribute('aria-label',t('closeGallery'));
    dialog.setAttribute('aria-label',t('gallery'));
  }
  document.addEventListener('languagechange',labels);
  labels(); render();
}
