const adminRoot = document.querySelector("main");
let csrf = "",
  adminCars = [],
  adminLeads = [],
  activeTab = "cars",
  editingId = null,
  editImages = [];
const authApi = (path, options = {}) =>
  api("/admin" + path, {
    ...options,
    headers: { "X-CSRF-Token": csrf, ...options.headers },
  });
function showLogin(message = "") {
  csrf = "";
  adminRoot.innerHTML = `<section class="container section"><div class="panel login-panel"><p class="eyebrow">OLMAX</p><h1 data-t="admin"></h1><p data-t="loginIntro"></p><form class="login-form"><label><span data-t="username"></span><input name="username" autocomplete="username" value="admin" required maxlength="100"></label><label><span data-t="password"></span><input name="password" type="password" autocomplete="current-password" required maxlength="500"></label><button class="button primary" data-t="login"></button><p class="form-status error" role="status">${escapeHTML(message)}</p></form></div></section>`;
  translate();
  adminRoot.querySelector("form").onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = form.querySelector("button"),
      status = form.querySelector("[role=status]");
    button.disabled = true;
    try {
      const result = await api("/admin/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      csrf = result.csrf;
      await dashboard();
    } catch (error) {
      status.textContent = t(
        error.status === 503
          ? "setupNeeded"
          : error.status === 429
            ? "rateError"
            : error.status === 401
              ? "loginError"
              : "loadError",
      );
    } finally {
      button.disabled = false;
    }
  };
}
function handleError(error, status) {
  if (error.status === 401) {
    showLogin(t("sessionExpired"));
    return;
  }
  status.textContent = t(error.status === 429 ? "rateError" : "error");
  status.className = "form-status error";
}
async function dashboard() {
  adminRoot.innerHTML = `<section class="container section"><div class="admin-heading"><h1 data-t="admin"></h1><button id="logout" class="button secondary" data-t="logout"></button></div><div id="stats" class="stats"></div><div class="admin-tabs"><button class="button secondary" data-tab="cars" data-t="cars"></button><button class="button secondary" data-tab="leads" data-t="leads"></button><button id="add-car" class="button primary" data-t="add"></button></div><p id="admin-notice" class="form-status admin-notice" role="status"></p><div id="editor"></div><div id="admin-content"><p data-t="loading"></p></div></section>`;
  translate();
  document.getElementById("logout").onclick = async () => {
    try {
      await authApi("/logout", { method: "POST" });
      showLogin();
    } catch (error) {
      handleError(error, document.getElementById("admin-notice"));
    }
  };
  document.querySelectorAll("[data-tab]").forEach(
    (button) =>
      (button.onclick = () => {
        if (
          document.querySelector("#editor form") &&
          !confirm(
            language === "ua"
              ? "Закрити форму без збереження?"
              : "Zamknąć formularz bez zapisywania?",
          )
        )
          return;
        document.getElementById("editor").innerHTML = "";
        activeTab = button.dataset.tab;
        drawAdmin();
      }),
  );
  document.getElementById("add-car").onclick = () => openEditor();
  await refreshAdmin();
}
async function refreshAdmin() {
  try {
    [adminCars, adminLeads] = await Promise.all([
      authApi("/cars"),
      authApi("/applications"),
    ]);
    drawAdmin();
  } catch (error) {
    if (error.status === 401) showLogin(t("sessionExpired"));
    else errorState(document.getElementById("admin-content"), refreshAdmin);
  }
}
function drawAdmin() {
  const container = document.getElementById("admin-content");
  if (!container) return;
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.tab === activeTab)),
    );
  document.getElementById("stats").innerHTML =
    `<span>${t("cars")}: <strong>${adminCars.length}</strong></span><span>${t("published")}: <strong>${adminCars.filter((c) => c.status === "published").length}</strong></span><span>${t("new")}: <strong>${adminLeads.filter((l) => l.status === "new").length}</strong></span>`;
  if (activeTab === "cars") {
    container.innerHTML = `<div class="admin-list">${adminCars.length ? adminCars.map((car) => `<article class="admin-car"><img src="${escapeHTML(mainImage(car))}" alt="${escapeHTML(car.title)}"><div class="car-info"><h2>${escapeHTML(car.title)}</h2><p>${escapeHTML(money(car.price))} · ${escapeHTML(car.year || "—")}</p><span class="badge ${escapeHTML(car.status)}">${t(car.status)}</span></div><button class="button secondary" data-edit="${car.id}">${t("edit")}</button></article>`).join("") : `<p class="empty-state">${t("emptyAdmin")}</p>`}</div>`;
    container
      .querySelectorAll("[data-edit]")
      .forEach(
        (b) =>
          (b.onclick = () =>
            openEditor(adminCars.find((c) => c.id === Number(b.dataset.edit)))),
      );
    installImageFallback(container);
  } else {
    container.innerHTML = `<div class="admin-list">${adminLeads.length ? adminLeads.map((lead) => `<article class="lead-card"><div class="lead-top"><div><h2>${escapeHTML(lead.name)}</h2><a href="tel:${escapeHTML(lead.phone.replace(/[^+\d]/g, ""))}">${escapeHTML(lead.phone)}</a></div><span class="small">${escapeHTML(lead.date)} UTC</span></div><p class="lead-message">${escapeHTML(lead.message)}</p><div class="lead-actions"><label>${t("status")}<select data-lead="${lead.id}">${["new", "contacted", "closed"].map((s) => `<option value="${s}" ${lead.status === s ? "selected" : ""}>${t(s)}</option>`).join("")}</select></label><button class="button secondary danger" data-delete="${lead.id}">${t("deleteLead")}</button></div><p class="form-status" role="status"></p></article>`).join("") : `<p class="empty-state">${t("emptyLeads")}</p>`}</div>`;
    container.querySelectorAll("[data-lead]").forEach(
      (select) =>
        (select.onchange = async () => {
          select.disabled = true;
          try {
            await authApi("/applications/" + select.dataset.lead, {
              method: "PATCH",
              body: JSON.stringify({ status: select.value }),
            });
            await refreshAdmin();
          } catch (error) {
            handleError(
              error,
              select.closest("article").querySelector("[role=status]"),
            );
            select.value = adminLeads.find(
              (l) => l.id === Number(select.dataset.lead),
            ).status;
          } finally {
            select.disabled = false;
          }
        }),
    );
    container.querySelectorAll("[data-delete]").forEach(
      (button) =>
        (button.onclick = async () => {
          if (!confirm(t("confirmDelete"))) return;
          button.disabled = true;
          try {
            await authApi("/applications/" + button.dataset.delete, {
              method: "DELETE",
            });
            await refreshAdmin();
          } catch (error) {
            handleError(
              error,
              button.closest("article").querySelector("[role=status]"),
            );
            button.disabled = false;
          }
        }),
    );
  }
}
function openEditor(car) {
  if (
    document.querySelector("#editor form") &&
    !confirm(
      language === "ua"
        ? "Закрити форму без збереження?"
        : "Zamknąć formularz bez zapisywania?",
    )
  )
    return;
  editingId = car?.id ?? null;
  editImages = [...(car?.images || [])];
  document.getElementById("editor").innerHTML =
    `<form class="panel editor"><h2 data-t="${car ? "editCar" : "add"}"></h2><div class="form-grid"><label class="span-all"><span data-t="title"></span> *<input name="title" minlength="2" maxlength="140" required></label><label><span data-t="price"></span> (PLN) *<input name="price" type="number" min="0.01" max="999999999.99" step="0.01" required></label><label><span data-t="year"></span><input name="year" type="number" min="1900" max="${new Date().getFullYear() + 2}"></label><label><span data-t="mileage"></span> (km)<input name="mileage" type="number" min="0" max="999999999" step="1"></label><label><span data-t="status"></span><select name="status">${["draft", "published", "sold"].map((s) => `<option value="${s}" data-t="${s}"></option>`).join("")}</select></label><label class="span-all"><span data-t="description"></span><textarea name="description" rows="6" maxlength="10000"></textarea></label><div class="span-all"><label><span data-t="photos"></span><input id="photos" type="file" multiple accept="image/jpeg,image/png,image/webp"></label><p class="small" data-t="photosHint"></p><div id="upload-grid" class="upload-grid"></div><div class="url-row"><label><span data-t="photoURL"></span><input id="photo-url" type="url" placeholder="https://"></label><button id="add-url" class="button secondary" type="button" data-t="addURL"></button></div></div></div><p class="small" data-t="publishHint"></p><p class="form-status" role="status"></p><div class="actions"><button class="button primary" type="submit" data-t="save"></button><button class="button secondary" id="cancel-edit" type="button" data-t="cancel"></button></div></form>`;
  const form = document.querySelector("#editor form");
  for (const field of [
    "title",
    "price",
    "year",
    "mileage",
    "description",
    "status",
  ])
    form.elements[field].value =
      car?.[field] ?? (field === "status" ? "draft" : "");
  document.getElementById("cancel-edit").onclick = () => {
    document.getElementById("editor").innerHTML = "";
  };
  document.getElementById("photos").onchange = async (e) => {
    const files = [...e.target.files],
      status = form.querySelector("[role=status]");
    if (
      editImages.length + files.length > 8 ||
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 5 * 1024 * 1024,
      )
    ) {
      status.textContent = t("invalidImages");
      status.className = "form-status error";
      e.target.value = "";
      return;
    }
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    e.target.disabled = true;
    try {
      const images = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            }),
        ),
      );
      editImages.push(...images);
      drawUploads();
      status.textContent = "";
    } catch {
      status.textContent = t("invalidImages");
    } finally {
      submit.disabled = false;
      e.target.disabled = false;
      e.target.value = "";
    }
  };
  document.getElementById("add-url").onclick = () => {
    const input = document.getElementById("photo-url");
    try {
      const url = new URL(input.value);
      if (url.protocol !== "https:" || editImages.length >= 8) throw Error();
      editImages.push(url.href);
      input.value = "";
      drawUploads();
    } catch {
      form.querySelector("[role=status]").textContent = t("invalidImages");
    }
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    delete data[""];
    data.year = data.year ? Number(data.year) : null;
    data.images = editImages;
    const status = form.querySelector("[role=status]"),
      button = form.querySelector("[type=submit]");
    if (
      data.status === "published" &&
      (!data.images.length || !data.year || !data.description.trim())
    ) {
      status.textContent = t("publishHint");
      status.className = "form-status error";
      return;
    }
    button.disabled = true;
    button.textContent = t("saving");
    try {
      await authApi("/cars" + (editingId ? "/" + editingId : ""), {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(data),
      });
      document.getElementById("editor").innerHTML = "";
      document.getElementById("admin-notice").textContent = t("saved");
      await refreshAdmin();
    } catch (error) {
      handleError(error, status);
    } finally {
      button.disabled = false;
      button.textContent = t("save");
    }
  };
  drawUploads();
  translate();
  form.elements.title.focus();
}
function drawUploads() {
  const root = document.getElementById("upload-grid");
  if (!root) return;
  root.innerHTML = editImages
    .map(
      (src, i) =>
        `<div class="upload-item"><img src="${escapeHTML(src)}" alt="${t("photos")} ${i + 1}"><button type="button" data-cover="${i}" ${i === 0 ? "disabled" : ""}>${t("makeCover")}</button><button type="button" data-remove="${i}">${t("remove")}</button></div>`,
    )
    .join("");
  root.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        editImages.splice(Number(b.dataset.remove), 1);
        drawUploads();
      }),
  );
  root.querySelectorAll("[data-cover]").forEach(
    (b) =>
      (b.onclick = () => {
        editImages.unshift(...editImages.splice(Number(b.dataset.cover), 1));
        drawUploads();
      }),
  );
  installImageFallback(root);
}
document.addEventListener("languagechange", () => {
  drawAdmin();
  drawUploads();
});
window.addEventListener("beforeunload", (e) => {
  if (document.querySelector("#editor form")) {
    e.preventDefault();
    e.returnValue = "";
  }
});
authApi("/session")
  .then((result) => {
    csrf = result.csrf;
    dashboard();
  })
  .catch((error) => showLogin(error.status === 401 ? "" : t("loadError")));
