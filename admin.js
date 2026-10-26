import {
  fetchSettings, saveSettings, fetchCategories, saveCategory, removeCategory,
  fetchAllProducts, saveProduct, removeProduct,
  fetchZones, saveZone, removeZone,
  fetchAllPromos, savePromo, removePromo,
  fetchOrders, updateOrderStatus
} from "./api.js";
import { fmtMoney, fmtDateTime, escapeHtml } from "./utils.js";
import { ADMIN_USER, ADMIN_PASS, ADMIN_KEY } from "./config.js";

const main = document.getElementById("admin-main");
const tabs = document.getElementById("admin-tabs");
const who = document.getElementById("admin-who");

const toast = (msg, type="") => {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById("toasts").appendChild(el);
  setTimeout(() => el.remove(), 3200);
};

const state = { tab: "dash", settings:null, cats:[], prods:[], zones:[], promos:[], orders:[] };

function isLogged() { return localStorage.getItem(ADMIN_KEY) === "1"; }
function logout() { localStorage.removeItem(ADMIN_KEY); render(); }

async function loadAll() {
  state.settings = await fetchSettings();
  state.cats = await fetchCategories();
  state.prods = await fetchAllProducts();
  state.zones = await fetchZones();
  state.promos = await fetchAllPromos();
  state.orders = await fetchOrders();
}

function renderLogin() {
  tabs.hidden = true;
  who.textContent = "";
  main.innerHTML = `
    <div class="card admin-login center">
      <div style="font-size:48px">🔐</div>
      <h2>Panel Administrativo</h2>
      <p class="muted">Inicia sesión para administrar la tienda.</p>
      <div class="field" style="text-align:left;margin-top:16px">
        <label>Usuario</label>
        <input id="l-user" autocomplete="username" value="">
      </div>
      <div class="field" style="text-align:left">
        <label>Contraseña</label>
        <input id="l-pass" type="password" autocomplete="current-password" value="">
      </div>
      <button class="btn btn-block" id="l-go">Entrar</button>
      <p class="muted" style="font-size:12px;margin-top:12px">Demo local — usuario <b>${ADMIN_USER}</b> / contraseña <b>${ADMIN_PASS}</b></p>
    </div>`;
  document.getElementById("l-go").onclick = () => {
    const u = document.getElementById("l-user").value.trim();
    const p = document.getElementById("l-pass").value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      localStorage.setItem(ADMIN_KEY, "1");
      render();
    } else {
      toast("Credenciales incorrectas", "err");
    }
  };
  document.getElementById("l-pass").addEventListener("keydown", e => {
    if (e.key === "Enter") document.getElementById("l-go").click();
  });
}

function renderTabs() {
  tabs.hidden = false;
  tabs.querySelectorAll("button").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === state.tab);
    b.onclick = () => { state.tab = b.dataset.tab; render(); };
  });
}

function render() {
  if (!isLogged()) return renderLogin();
  who.innerHTML = `👤 admin · <a href="#" id="lo" style="color:#fff;text-decoration:underline">Salir</a>`;
  document.getElementById("lo").onclick = e => { e.preventDefault(); logout(); };
  renderTabs();
  if (state.tab === "dash") viewDash();
  else if (state.tab === "orders") viewOrders();
  else if (state.tab === "products") viewProducts();
  else if (state.tab === "cats") viewCats();
  else if (state.tab === "zones") viewZones();
  else if (state.tab === "promos") viewPromos();
  else if (state.tab === "settings") viewSettings();
}

// ─────────── Dashboard ───────────
function viewDash() {
  const orders = state.orders;
  const today = new Date().toDateString();
  const todays = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const revenue = orders.filter(o => o.status !== "cancelado").reduce((a,o) => a + Number(o.total||0), 0);
  const pending = orders.filter(o => ["creado","confirmado","preparando"].includes(o.status)).length;
  const lowStock = state.prods.filter(p => Number(p.stock) <= Number(p.lowStockAlert||0));
  main.innerHTML = `
    <h2>📊 Dashboard</h2>
    <div class="stat-grid">
      <div class="stat"><div class="n">${orders.length}</div><div class="l">Pedidos totales</div></div>
      <div class="stat"><div class="n">${todays.length}</div><div class="l">Pedidos hoy</div></div>
      <div class="stat"><div class="n">${fmtMoney(revenue)}</div><div class="l">Ingresos totales</div></div>
      <div class="stat"><div class="n">${pending}</div><div class="l">Pedidos pendientes</div></div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3 style="margin-top:0">⚠️ Bajo stock (${lowStock.length})</h3>
      ${lowStock.length ? `<table class="table"><thead><tr><th>Producto</th><th>Stock</th><th>Alerta</th></tr></thead><tbody>${lowStock.map(p => `<tr><td>${escapeHtml(p.emoji||"")} ${escapeHtml(p.name)}</td><td>${p.stock}</td><td>${p.lowStockAlert||0}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Todo en orden 🎉</p>`}
    </div>
    <div class="card" style="margin-top:14px">
      <h3 style="margin-top:0">🕒 Últimos pedidos</h3>
      ${orders.slice(0,5).map(o => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px"><span><b>${escapeHtml(o.folio)}</b> · ${escapeHtml(o.customer?.name||"")}</span><span>${fmtMoney(o.total)} <span class="status ${o.status}">${o.status}</span></span></div>`).join("") || `<p class="muted">Sin pedidos aún.</p>`}
    </div>`;
}

// ─────────── Orders ───────────
function viewOrders() {
  const statuses = ["creado","confirmado","preparando","en_entrega","listo_recoger","entregado","cancelado"];
  main.innerHTML = `<h2>📦 Pedidos (${state.orders.length})</h2>
    ${state.orders.length ? state.orders.map(o => `
      <div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px">
          <b>${escapeHtml(o.folio)}</b>
          <span class="muted" style="font-size:12px">${fmtDateTime(o.createdAt)}</span>
        </div>
        <div class="muted" style="font-size:13px;margin:4px 0">${escapeHtml(o.customer?.name||"")} · ${escapeHtml(o.customer?.phone||"")}</div>
        <div class="muted" style="font-size:13px">${o.delivery?.method==="domicilio" ? `🚚 ${escapeHtml(o.delivery?.address||"")}` : "🏪 Recoger"}</div>
        <div style="margin:8px 0;font-size:14px">${(o.items||[]).map(it => `· ${it.units} × ${escapeHtml(it.name)} — ${fmtMoney(it.lineTotal)}`).join("<br>")}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <b style="color:var(--brand-dark);font-size:16px">${fmtMoney(o.total)}</b>
          <select data-oid="${o.id}" class="ord-status" style="padding:8px;border-radius:10px;border:1.5px solid var(--line)">
            ${statuses.map(s => `<option value="${s}" ${o.status===s?"selected":""}>${s}</option>`).join("")}
          </select>
        </div>
      </div>`).join("") : `<p class="muted">Sin pedidos aún.</p>`}`;
  main.querySelectorAll(".ord-status").forEach(sel => {
    sel.onchange = async () => {
      await updateOrderStatus(sel.dataset.oid, sel.value);
      await loadAll();
      toast("Estado actualizado", "ok");
      viewOrders();
    };
  });
}

// ─────────── Products ───────────
function viewProducts() {
  main.innerHTML = `
    <div class="block-h"><h2>🥕 Productos (${state.prods.length})</h2><button class="btn btn-sm" id="np">+ Nuevo</button></div>
    <table class="table"><thead><tr><th></th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Activo</th><th></th></tr></thead><tbody>
      ${state.prods.map(p => {
        const cat = state.cats.find(c => c.id === p.categoryId);
        return `<tr>
          <td>${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}">` : `<span style="font-size:28px">${p.emoji||"🥬"}</span>`}</td>
          <td><b>${escapeHtml(p.name)}</b><br><small class="muted">${escapeHtml(p.unitLabel||p.unit||"")}</small></td>
          <td>${cat ? `${cat.emoji||""} ${escapeHtml(cat.name)}` : "—"}</td>
          <td>${fmtMoney(p.price)}${p.isOffer && p.offerPrice>0 ? `<br><small class="tag off">Oferta ${fmtMoney(p.offerPrice)}</small>`:""}</td>
          <td>${p.stock}${Number(p.stock)<=Number(p.lowStockAlert||0) ? ` <span class="tag off">bajo</span>`:""}</td>
          <td>${p.active!==false ? "✅" : "❌"}</td>
          <td><button class="btn btn-sm btn-ghost" data-edit="${p.id}">Editar</button> <button class="btn btn-sm" style="background:var(--danger)" data-del="${p.id}">✕</button></td>
        </tr>`;
      }).join("") || `<tr><td colspan="7" class="muted">Sin productos.</td></tr>`}
    </tbody></table>`;
  document.getElementById("np").onclick = () => editProduct(null);
  main.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editProduct(state.prods.find(x => x.id === b.dataset.edit)));
  main.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("¿Eliminar producto?")) return;
    await removeProduct(b.dataset.del);
    await loadAll(); render();
  });
}

function editProduct(p) {
  const isNew = !p;
  p = p || { name:"", description:"", emoji:"🥬", imageUrl:"", categoryId:(state.cats[0]||{}).id||"", sellBy:"unidad", price:0, offerPrice:0, isOffer:false, fractions:[1], unit:"pieza", unitLabel:"pieza", stock:0, lowStockAlert:5, minQty:1, maxQty:10, active:true, isFeatured:false, isBestSeller:false, isSeasonal:false, selectionNote:"", order:state.prods.length+1 };
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back" id="mb"><div class="modal">
      <h3>${isNew ? "Nuevo producto" : "Editar producto"}</h3>
      <div class="field"><label>Nombre *</label><input id="f-name" value="${escapeHtml(p.name)}"></div>
      <div class="field"><label>Descripción</label><textarea id="f-desc" rows="2">${escapeHtml(p.description||"")}</textarea></div>
      <div class="row">
        <div class="field"><label>Emoji</label><input id="f-emoji" value="${escapeHtml(p.emoji||"")}"></div>
        <div class="field"><label>Imagen URL</label><input id="f-img" value="${escapeHtml(p.imageUrl||"")}"></div>
      </div>
      <div class="field"><label>Categoría</label><select id="f-cat">${state.cats.map(c => `<option value="${c.id}" ${p.categoryId===c.id?"selected":""}>${c.emoji||""} ${escapeHtml(c.name)}</option>`).join("")}</select></div>
      <div class="row">
        <div class="field"><label>Venta por</label><select id="f-sellby"><option value="unidad" ${p.sellBy==="unidad"?"selected":""}>Unidad</option><option value="peso" ${p.sellBy==="peso"?"selected":""}>Peso</option></select></div>
        <div class="field"><label>Unidad (kg, manojo…)</label><input id="f-unit" value="${escapeHtml(p.unitLabel||p.unit||"pieza")}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Precio *</label><input id="f-price" type="number" step="0.01" value="${p.price||0}"></div>
        <div class="field"><label>Oferta (0 = sin oferta)</label><input id="f-offer" type="number" step="0.01" value="${p.offerPrice||0}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Stock</label><input id="f-stock" type="number" step="0.01" value="${p.stock||0}"></div>
        <div class="field"><label>Alerta stock bajo</label><input id="f-low" type="number" value="${p.lowStockAlert||0}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Mín. compra</label><input id="f-minq" type="number" value="${p.minQty||1}"></div>
        <div class="field"><label>Máx. compra</label><input id="f-maxq" type="number" value="${p.maxQty||99}"></div>
      </div>
      <div class="field"><label>Nota de selección</label><input id="f-note" value="${escapeHtml(p.selectionNote||"")}"></div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;font-size:14px;margin:10px 0">
        <label><input type="checkbox" id="f-active" ${p.active!==false?"checked":""}> Activo</label>
        <label><input type="checkbox" id="f-feat" ${p.isFeatured?"checked":""}> Destacado</label>
        <label><input type="checkbox" id="f-best" ${p.isBestSeller?"checked":""}> Más vendido</label>
        <label><input type="checkbox" id="f-season" ${p.isSeasonal?"checked":""}> Temporada</label>
      </div>
      <div class="row">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-accent" id="f-save">Guardar</button>
      </div>
    </div></div>`;
  const close = () => document.getElementById("modal-root").innerHTML = "";
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = close);
  document.getElementById("mb").onclick = e => { if (e.target.id === "mb") close(); };
  document.getElementById("f-save").onclick = async () => {
    const data = {
      ...p,
      name: document.getElementById("f-name").value.trim(),
      description: document.getElementById("f-desc").value.trim(),
      emoji: document.getElementById("f-emoji").value.trim(),
      imageUrl: document.getElementById("f-img").value.trim(),
      categoryId: document.getElementById("f-cat").value,
      sellBy: document.getElementById("f-sellby").value,
      unit: document.getElementById("f-unit").value.trim(),
      unitLabel: document.getElementById("f-unit").value.trim(),
      price: Number(document.getElementById("f-price").value),
      offerPrice: Number(document.getElementById("f-offer").value),
      isOffer: Number(document.getElementById("f-offer").value) > 0 && Number(document.getElementById("f-offer").value) < Number(document.getElementById("f-price").value),
      stock: Number(document.getElementById("f-stock").value),
      lowStockAlert: Number(document.getElementById("f-low").value),
      minQty: Number(document.getElementById("f-minq").value),
      maxQty: Number(document.getElementById("f-maxq").value),
      selectionNote: document.getElementById("f-note").value.trim(),
      active: document.getElementById("f-active").checked,
      isFeatured: document.getElementById("f-feat").checked,
      isBestSeller: document.getElementById("f-best").checked,
      isSeasonal: document.getElementById("f-season").checked
    };
    if (!data.name || !data.price) return toast("Nombre y precio son obligatorios", "err");
    if (data.sellBy === "peso" && (!data.fractions || !data.fractions.length)) data.fractions = [1, 0.5, 0.25];
    if (data.sellBy === "unidad") data.fractions = [1];
    await saveProduct(data);
    close(); await loadAll(); render(); toast("Guardado", "ok");
  };
}

// ─────────── Categories ───────────
function viewCats() {
  main.innerHTML = `
    <div class="block-h"><h2>🗂️ Categorías (${state.cats.length})</h2><button class="btn btn-sm" id="nc">+ Nueva</button></div>
    <table class="table"><thead><tr><th>Emoji</th><th>Nombre</th><th>Orden</th><th>Activa</th><th></th></tr></thead><tbody>
      ${state.cats.map(c => `<tr>
        <td style="font-size:22px">${c.emoji||""}</td>
        <td><b>${escapeHtml(c.name)}</b></td>
        <td>${c.order||0}</td>
        <td>${c.active!==false ? "✅" : "❌"}</td>
        <td><button class="btn btn-sm btn-ghost" data-edit="${c.id}">Editar</button> <button class="btn btn-sm" style="background:var(--danger)" data-del="${c.id}">✕</button></td>
      </tr>`).join("")}
    </tbody></table>`;
  document.getElementById("nc").onclick = () => editCategory(null);
  main.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editCategory(state.cats.find(x => x.id === b.dataset.edit)));
  main.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("¿Eliminar categoría?")) return;
    await removeCategory(b.dataset.del);
    await loadAll(); render();
  });
}
function editCategory(c) {
  const isNew = !c;
  c = c || { name:"", emoji:"🥬", order: state.cats.length+1, active:true };
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back" id="mb"><div class="modal">
      <h3>${isNew ? "Nueva categoría" : "Editar categoría"}</h3>
      <div class="field"><label>Nombre *</label><input id="c-name" value="${escapeHtml(c.name)}"></div>
      <div class="row">
        <div class="field"><label>Emoji</label><input id="c-emoji" value="${escapeHtml(c.emoji||"")}"></div>
        <div class="field"><label>Orden</label><input id="c-order" type="number" value="${c.order||0}"></div>
      </div>
      <label style="display:flex;gap:8px;margin:10px 0"><input type="checkbox" id="c-active" ${c.active!==false?"checked":""}> Activa</label>
      <div class="row">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-accent" id="c-save">Guardar</button>
      </div>
    </div></div>`;
  const close = () => document.getElementById("modal-root").innerHTML = "";
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = close);
  document.getElementById("mb").onclick = e => { if (e.target.id === "mb") close(); };
  document.getElementById("c-save").onclick = async () => {
    const data = {
      ...c,
      name: document.getElementById("c-name").value.trim(),
      emoji: document.getElementById("c-emoji").value.trim(),
      order: Number(document.getElementById("c-order").value),
      active: document.getElementById("c-active").checked
    };
    if (!data.name) return toast("Nombre obligatorio", "err");
    await saveCategory(data);
    close(); await loadAll(); render(); toast("Guardado", "ok");
  };
}

// ─────────── Zones ───────────
function viewZones() {
  main.innerHTML = `
    <div class="block-h"><h2>🚚 Zonas (${state.zones.length})</h2><button class="btn btn-sm" id="nz">+ Nueva</button></div>
    <table class="table"><thead><tr><th>Nombre</th><th>Envío</th><th>Mínimo</th><th>Activa</th><th></th></tr></thead><tbody>
      ${state.zones.map(z => `<tr>
        <td><b>${escapeHtml(z.name)}</b></td>
        <td>${fmtMoney(z.fee)}</td>
        <td>${fmtMoney(z.minOrder)}</td>
        <td>${z.active!==false ? "✅" : "❌"}</td>
        <td><button class="btn btn-sm btn-ghost" data-edit="${z.id}">Editar</button> <button class="btn btn-sm" style="background:var(--danger)" data-del="${z.id}">✕</button></td>
      </tr>`).join("")}
    </tbody></table>`;
  document.getElementById("nz").onclick = () => editZone(null);
  main.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editZone(state.zones.find(x => x.id === b.dataset.edit)));
  main.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("¿Eliminar zona?")) return;
    await removeZone(b.dataset.del);
    await loadAll(); render();
  });
}
function editZone(z) {
  const isNew = !z;
  z = z || { name:"", fee:0, minOrder:0, active:true };
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back" id="mb"><div class="modal">
      <h3>${isNew ? "Nueva zona" : "Editar zona"}</h3>
      <div class="field"><label>Nombre *</label><input id="z-name" value="${escapeHtml(z.name)}"></div>
      <div class="row">
        <div class="field"><label>Costo de envío</label><input id="z-fee" type="number" step="0.01" value="${z.fee}"></div>
        <div class="field"><label>Pedido mínimo</label><input id="z-min" type="number" step="0.01" value="${z.minOrder}"></div>
      </div>
      <label style="display:flex;gap:8px;margin:10px 0"><input type="checkbox" id="z-active" ${z.active!==false?"checked":""}> Activa</label>
      <div class="row">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-accent" id="z-save">Guardar</button>
      </div>
    </div></div>`;
  const close = () => document.getElementById("modal-root").innerHTML = "";
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = close);
  document.getElementById("mb").onclick = e => { if (e.target.id === "mb") close(); };
  document.getElementById("z-save").onclick = async () => {
    const data = {
      ...z,
      name: document.getElementById("z-name").value.trim(),
      fee: Number(document.getElementById("z-fee").value),
      minOrder: Number(document.getElementById("z-min").value),
      active: document.getElementById("z-active").checked
    };
    if (!data.name) return toast("Nombre obligatorio", "err");
    await saveZone(data);
    close(); await loadAll(); render(); toast("Guardado", "ok");
  };
}

// ─────────── Promos ───────────
function viewPromos() {
  main.innerHTML = `
    <div class="block-h"><h2>🏷️ Promociones (${state.promos.length})</h2><button class="btn btn-sm" id="npr">+ Nueva</button></div>
    <table class="table"><thead><tr><th>Nombre</th><th>Tipo</th><th>Valor</th><th>Mín. subtotal</th><th>Activa</th><th></th></tr></thead><tbody>
      ${state.promos.map(p => `<tr>
        <td><b>${escapeHtml(p.name)}</b></td>
        <td>${p.type === "percent" ? "%" : "$"}</td>
        <td>${p.type === "percent" ? p.value + "%" : fmtMoney(p.value)}</td>
        <td>${fmtMoney(p.minSubtotal||0)}</td>
        <td>${p.active!==false ? "✅" : "❌"}</td>
        <td><button class="btn btn-sm btn-ghost" data-edit="${p.id}">Editar</button> <button class="btn btn-sm" style="background:var(--danger)" data-del="${p.id}">✕</button></td>
      </tr>`).join("") || `<tr><td colspan="6" class="muted">Sin promociones.</td></tr>`}
    </tbody></table>`;
  document.getElementById("npr").onclick = () => editPromo(null);
  main.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => editPromo(state.promos.find(x => x.id === b.dataset.edit)));
  main.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("¿Eliminar promoción?")) return;
    await removePromo(b.dataset.del);
    await loadAll(); render();
  });
}
function editPromo(pr) {
  const isNew = !pr;
  pr = pr || { name:"", type:"percent", value:0, minSubtotal:0, active:true };
  document.getElementById("modal-root").innerHTML = `
    <div class="modal-back" id="mb"><div class="modal">
      <h3>${isNew ? "Nueva promoción" : "Editar promoción"}</h3>
      <div class="field"><label>Nombre *</label><input id="pr-name" value="${escapeHtml(pr.name)}"></div>
      <div class="row">
        <div class="field"><label>Tipo</label><select id="pr-type"><option value="percent" ${pr.type==="percent"?"selected":""}>Porcentaje</option><option value="fixed" ${pr.type==="fixed"?"selected":""}>Monto fijo</option></select></div>
        <div class="field"><label>Valor</label><input id="pr-value" type="number" step="0.01" value="${pr.value}"></div>
      </div>
      <div class="field"><label>Subtotal mínimo</label><input id="pr-min" type="number" step="0.01" value="${pr.minSubtotal||0}"></div>
      <label style="display:flex;gap:8px;margin:10px 0"><input type="checkbox" id="pr-active" ${pr.active!==false?"checked":""}> Activa</label>
      <div class="row">
        <button class="btn btn-ghost" data-close>Cancelar</button>
        <button class="btn btn-accent" id="pr-save">Guardar</button>
      </div>
    </div></div>`;
  const close = () => document.getElementById("modal-root").innerHTML = "";
  document.querySelectorAll("[data-close]").forEach(b => b.onclick = close);
  document.getElementById("mb").onclick = e => { if (e.target.id === "mb") close(); };
  document.getElementById("pr-save").onclick = async () => {
    const data = {
      ...pr,
      name: document.getElementById("pr-name").value.trim(),
      type: document.getElementById("pr-type").value,
      value: Number(document.getElementById("pr-value").value),
      minSubtotal: Number(document.getElementById("pr-min").value),
      active: document.getElementById("pr-active").checked
    };
    if (!data.name || !data.value) return toast("Nombre y valor obligatorios", "err");
    await savePromo(data);
    close(); await loadAll(); render(); toast("Guardado", "ok");
  };
}

// ─────────── Settings ───────────
function viewSettings() {
  const s = state.settings;
  main.innerHTML = `
    <h2>⚙️ Ajustes</h2>
    <div class="card">
      <h3 style="margin-top:0">Marca</h3>
      <div class="row">
        <div class="field"><label>Nombre</label><input id="s-brand" value="${escapeHtml(s.brand?.name||"")}"></div>
        <div class="field"><label>Slogan</label><input id="s-slogan" value="${escapeHtml(s.brand?.slogan||"")}"></div>
      </div>
      <div class="field"><label>Logo URL</label><input id="s-logo" value="${escapeHtml(s.brand?.logoUrl||"")}"></div>
      <div class="row">
        <div class="field"><label>Color primario</label><input id="s-c1" type="color" value="${s.brand?.colors?.primary||"#1E7A46"}" style="height:44px;padding:4px"></div>
        <div class="field"><label>Color acento</label><input id="s-c2" type="color" value="${s.brand?.colors?.accent||"#FF8A3D"}" style="height:44px;padding:4px"></div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3 style="margin-top:0">Contacto</h3>
      <div class="field"><label>WhatsApp</label><input id="s-wa" value="${escapeHtml(s.contact?.whatsapp||"")}"></div>
      <div class="row">
        <div class="field"><label>Teléfono</label><input id="s-phone" value="${escapeHtml(s.contact?.phone||"")}"></div>
        <div class="field"><label>Email</label><input id="s-email" value="${escapeHtml(s.contact?.email||"")}"></div>
      </div>
      <div class="row">
        <div class="field"><label>Calle</label><input id="s-street" value="${escapeHtml(s.address?.street||"")}"></div>
        <div class="field"><label>Ciudad</label><input id="s-city" value="${escapeHtml(s.address?.city||"")}"></div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3 style="margin-top:0">Entregas</h3>
      <div class="row">
        <div class="field"><label>Pedido mínimo</label><input id="s-min" type="number" value="${s.delivery?.minOrder||0}"></div>
        <div class="field"><label>Tiempo prep. (min)</label><input id="s-prep" type="number" value="${s.delivery?.prepTimeMin||45}"></div>
      </div>
      <label style="display:flex;gap:8px;margin:6px 0"><input type="checkbox" id="s-del" ${s.delivery?.enabled?"checked":""}> Domicilio habilitado</label>
      <label style="display:flex;gap:8px;margin:6px 0"><input type="checkbox" id="s-pick" ${s.delivery?.pickupEnabled?"checked":""}> Recoger habilitado</label>
    </div>
    <div class="card" style="margin-top:12px">
      <h3 style="margin-top:0">Banner</h3>
      <div class="field"><label>Título</label><input id="s-bt" value="${escapeHtml(s.banner?.title||"")}"></div>
      <div class="field"><label>Subtítulo</label><input id="s-bs" value="${escapeHtml(s.banner?.subtitle||"")}"></div>
      <div class="field"><label>CTA</label><input id="s-bc" value="${escapeHtml(s.banner?.cta||"")}"></div>
      <label style="display:flex;gap:8px"><input type="checkbox" id="s-ba" ${s.banner?.active?"checked":""}> Banner activo</label>
    </div>
    <button class="btn btn-accent btn-block" id="s-save" style="margin-top:14px">Guardar ajustes</button>`;
  document.getElementById("s-save").onclick = async () => {
    const patch = {
      brand: {
        name: document.getElementById("s-brand").value.trim(),
        slogan: document.getElementById("s-slogan").value.trim(),
        logoUrl: document.getElementById("s-logo").value.trim(),
        colors: { primary: document.getElementById("s-c1").value, accent: document.getElementById("s-c2").value }
      },
      contact: {
        whatsapp: document.getElementById("s-wa").value.trim(),
        phone: document.getElementById("s-phone").value.trim(),
        email: document.getElementById("s-email").value.trim()
      },
      address: {
        street: document.getElementById("s-street").value.trim(),
        city: document.getElementById("s-city").value.trim()
      },
      delivery: {
        ...s.delivery,
        minOrder: Number(document.getElementById("s-min").value),
        prepTimeMin: Number(document.getElementById("s-prep").value),
        enabled: document.getElementById("s-del").checked,
        pickupEnabled: document.getElementById("s-pick").checked
      },
      banner: {
        title: document.getElementById("s-bt").value.trim(),
        subtitle: document.getElementById("s-bs").value.trim(),
        cta: document.getElementById("s-bc").value.trim(),
        active: document.getElementById("s-ba").checked
      }
    };
    await saveSettings(patch);
    await loadAll();
    toast("Ajustes guardados", "ok");
  };
}

// ─────────── Boot ───────────
(async () => {
  await loadAll();
  render();
})();