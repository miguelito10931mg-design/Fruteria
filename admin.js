// ══════════════════════════════════════════════════════════
// ADMIN — dashboard, productos, pedidos, settings
// ══════════════════════════════════════════════════════════import { escapeHtml, money, store } from './core.js';
import { dataProvider } from './data.js';
import { toast, confirmModal } from './ui.js';

// PIN local — SOLO DEV. En producción reemplazar por Firebase Auth + custom claims.
const ADMIN_PIN = '1234'; // ⚠️ Cambiar en producción
const ADMIN_SESSION_KEY = 'mf:admin-session';

function isAdminAuthed() {
  try {
    const s = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || 'null');
    return s && Date.now() - s.at < 8 * 60 * 60 * 1000;
  } catch { return false; }
}
function setAdminAuthed() {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ at: Date.now() }));
}
function logoutAdmin() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function renderAdminLogin(root) {
  root.innerHTML = `
    <div class="login-box">
      <h2 style="margin-top:0">Panel Admin</h2>
      <p class="muted text-sm">Acceso restringido.</p>
      <label class="label">PIN</label>
      <input class="input" type="password" id="admin-pin" inputmode="numeric" autocomplete="off">
      <button class="btn btn--block" id="admin-login" style="margin-top:16px">Entrar</button>
      <a href="#/" class="btn btn--ghost btn--block" style="margin-top:8px">Volver a tienda</a>
    </div>`;
  root.querySelector('#admin-login').addEventListener('click', () => {
    if (root.querySelector('#admin-pin').value === ADMIN_PIN) {
      setAdminAuthed();
      location.hash = '#/admin';
    } else {
      toast('PIN incorrecto', { type: 'error' });
    }
  });
  root.querySelector('#admin-pin').addEventListener('keydown', e => {
    if (e.key === 'Enter') root.querySelector('#admin-login').click();
  });
}

export async function renderDashboard(root) {
  if (!isAdminAuthed()) { renderAdminLogin(root); return; }
  const orders = await dataProvider.listOrders();
  const products = await dataProvider.getProducts({ activeOnly: false });

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const pending = orders.filter(o => ['CREATED','WHATSAPP_OPENED','SENT'].includes(o.status));
  const confirmed = orders.filter(o => o.status === 'CONFIRMED');
  const preparing = orders.filter(o => o.status === 'PREPARING');
  const delivered = orders.filter(o => o.status === 'DELIVERED');
  const lowStock = products.filter(p => p.isActive && p.stock > 0 && p.stock <= 5);
  const outOfStock = products.filter(p => p.isActive && p.stock <= 0);
  const todaySales = todayOrders.filter(o => o.status !== 'CANCELLED').reduce((s, o) => s + o.totalCents, 0);

  root.innerHTML = `
    <h2>Dashboard</h2>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi__label">Pedidos hoy</div><div class="kpi__value">${todayOrders.length}</div></div>
      <div class="kpi"><div class="kpi__label">Pendientes</div><div class="kpi__value">${pending.length}</div></div>
      <div class="kpi"><div class="kpi__label">Confirmados</div><div class="kpi__value">${confirmed.length}</div></div>
      <div class="kpi"><div class="kpi__label">En prep.</div><div class="kpi__value">${preparing.length}</div></div>
      <div class="kpi"><div class="kpi__label">Entregados</div><div class="kpi__value">${delivered.length}</div></div>
      <div class="kpi"><div class="kpi__label">Ventas hoy</div><div class="kpi__value">${money.format(todaySales)}</div></div>
      <div class="kpi"><div class="kpi__label">Stock bajo</div><div class="kpi__value" style="color:var(--color-warning)">${lowStock.length}</div></div>
      <div class="kpi"><div class="kpi__label">Agotados</div><div class="kpi__value" style="color:var(--color-danger)">${outOfStock.length}</div></div>
    </div>

    <div class="section__head"><h3>Últimos pedidos</h3>
      <a href="#/admin/orders" class="section__link">Ver todos</a></div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Folio</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>
          ${orders.slice(0, 10).map(o => `
            <tr>
              <td>${escapeHtml(o.folio)}</td>
              <td>${escapeHtml(o.customer.name)}</td>
              <td>${money.format(o.totalCents)}</td>
              <td><span class="status-pill status-${o.status}">${o.status}</span></td>
            </tr>`).join('') || '<tr><td colspan="4" class="muted">Sin pedidos</td></tr>'}
        </tbody>
      </table>
    </div>

    <button class="btn btn--ghost" style="margin-top:16px" id="admin-logout">Cerrar sesión</button>`;

  root.querySelector('#admin-logout').addEventListener('click', () => {
    logoutAdmin(); location.hash = '#/'; toast('Sesión cerrada');
  });
}

// ══════════ PRODUCTOS ══════════
export async function renderAdminProducts(root) {
  if (!isAdminAuthed()) { renderAdminLogin(root); return; }
  const products = await dataProvider.getProducts({ activeOnly: false });
  const categories = await dataProvider.getCategories();
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  root.innerHTML = `
    <div class="section__head">
      <h2>Productos</h2>
      <button class="btn btn--sm" id="new-product">+ Nuevo</button>
    </div>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Producto</th><th>Cat.</th><th>Precio</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          ${products.map(p => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px">
                  ${p.imageUrl ? `<img src="${escapeHtml(p.imageUrl)}" alt="">` : ''}
                  <div>
                    <div style="font-weight:600">${escapeHtml(p.name)}</div>
                    <div class="text-xs muted">${escapeHtml(p.baseUnit)}</div>
                  </div>
                </div>
              </td>
              <td>${escapeHtml(catMap[p.categoryId] || '—')}</td>
              <td>${money.format(p.isOnSale && p.salePriceCents != null ? p.salePriceCents : p.priceCents)}</td>
              <td>${p.stock}</td>
              <td>${p.isActive
                ? '<span class="badge badge--ok">Activo</span>'
                : '<span class="badge">Inactivo</span>'}</td>
              <td style="white-space:nowrap">
                <button class="btn btn--sm btn--ghost" data-edit="${p.id}">Editar</button>
                <button class="btn btn--sm btn--ghost" data-toggle="${p.id}">${p.isActive ? 'Off' : 'On'}</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div id="product-form-wrap" style="margin-top:24px"></div>`;

  root.querySelector('#new-product').addEventListener('click', () => openProductForm(root, null));
  root.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', async () => {
    const prod = await dataProvider.getProductById(b.dataset.edit);
    openProductForm(root, prod);
  }));
  root.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', async () => {
    const prod = await dataProvider.getProductById(b.dataset.toggle);
    await dataProvider.upsertProduct({ ...prod, isActive: !prod.isActive });
    toast(prod.isActive ? 'Producto desactivado' : 'Producto activado', { type: 'success' });
    renderAdminProducts(root);
  }));
}

function openProductForm(root, product) {
  const wrap = root.querySelector('#product-form-wrap');
  const p = product || {
    id: `p_${Date.now()}`, name: '', description: '', categoryId: 'cat_frutas',
    priceCents: 0, baseUnit: 'kg', stock: 0,
    allowedUnits: [{ unit: 'kg', factor: 1, label: '1 kg' }],
    minQty: 0.25, maxQty: 10, isActive: true, isFeatured: false,
    isOnSale: false, salePriceCents: null, sortOrder: 0, imageUrl: ''
  };
  const pricePesos = (p.priceCents / 100).toFixed(2);
  const salePesos = p.salePriceCents != null ? (p.salePriceCents / 100).toFixed(2) : '';
  wrap.innerHTML = `
    <div class="card" style="padding:20px">
      <h3>${product ? 'Editar producto' : 'Nuevo producto'}</h3>
      <div class="form-grid">
        <div class="form-row form-row--full">
          <label class="label">Nombre *</label>
          <input class="input" name="name" value="${escapeHtml(p.name)}">
        </div>
        <div class="form-row form-row--full">
          <label class="label">Descripción</label>
          <textarea class="textarea" name="description">${escapeHtml(p.description || '')}</textarea>
        </div>
        <div class="form-row">
          <label class="label">Categoría</label>
          <select class="select" name="categoryId">
            ${seedCategoryOptions(p.categoryId)}
          </select>
        </div>
        <div class="form-row">
          <label class="label">Unidad base</label>
          <select class="select" name="baseUnit">
            ${['kg','pza','manojo','bolsa','caja'].map(u => `<option ${u === p.baseUnit ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <label class="label">Precio *</label>
          <input class="input" name="price" type="number" step="0.01" value="${pricePesos}">
        </div>
        <div class="form-row">
          <label class="label">Stock</label>
          <input class="input" name="stock" type="number" step="0.1" value="${p.stock}">
        </div>
        <div class="form-row">
          <label class="label">En oferta</label>
          <select class="select" name="isOnSale">
            <option value="0" ${!p.isOnSale ? 'selected' : ''}>No</option>
            <option value="1" ${p.isOnSale ? 'selected' : ''}>Sí</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label">Precio oferta</label>
          <input class="input" name="salePrice" type="number" step="0.01" value="${salePesos}">
        </div>
        <div class="form-row form-row--full">
          <label class="label">URL imagen (opcional)</label>
          <input class="input" name="imageUrl" value="${escapeHtml(p.imageUrl || '')}" placeholder="/assets/img/products/foto.jpg">
        </div>
        <div class="form-row">
          <label class="label">Destacado</label>
          <select class="select" name="isFeatured">
            <option value="0" ${!p.isFeatured ? 'selected' : ''}>No</option>
            <option value="1" ${p.isFeatured ? 'selected' : ''}>Sí</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label">Activo</label>
          <select class="select" name="isActive">
            <option value="1" ${p.isActive ? 'selected' : ''}>Sí</option>
            <option value="0" ${!p.isActive ? 'selected' : ''}>No</option>
          </select>
        </div>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px">
        <button class="btn btn--ghost" id="cancel-product">Cancelar</button>
        <button class="btn" id="save-product" style="flex:1">Guardar</button>
        ${product ? `<button class="btn btn--danger" id="delete-product">Eliminar</button>` : ''}
      </div>
    </div>`;

  wrap.querySelector('#cancel-product').addEventListener('click', () => { wrap.innerHTML = ''; });
  wrap.querySelector('#save-product').addEventListener('click', async () => {
    const name = wrap.querySelector('[name="name"]').value.trim();
    if (!name) { toast('Falta el nombre', { type: 'error' }); return; }
    const price = parseFloat(wrap.querySelector('[name="price"]').value);
    if (!(price > 0)) { toast('Precio inválido', { type: 'error' }); return; }
    const saleStr = wrap.querySelector('[name="salePrice"]').value;
    const salePrice = saleStr ? parseFloat(saleStr) : null;
    const isOnSale = wrap.querySelector('[name="isOnSale"]').value === '1' && salePrice > 0;

    const updated = {
      ...p,
      name,
      description: wrap.querySelector('[name="description"]').value.trim(),
      categoryId: wrap.querySelector('[name="categoryId"]').value,
      baseUnit: wrap.querySelector('[name="baseUnit"]').value,
      priceCents: Math.round(price * 100),
      stock: parseFloat(wrap.querySelector('[name="stock"]').value) || 0,
      isOnSale,
      salePriceCents: isOnSale ? Math.round(salePrice * 100) : null,
      imageUrl: wrap.querySelector('[name="imageUrl"]').value.trim(),
      isFeatured: wrap.querySelector('[name="isFeatured"]').value === '1',
      isActive: wrap.querySelector('[name="isActive"]').value === '1'
    };
    await dataProvider.upsertProduct(updated);
    toast('Guardado', { type: 'success' });
    renderAdminProducts(root);
  });
  if (product) {
    wrap.querySelector('#delete-product').addEventListener('click', async () => {
      const ok = await confirmModal({ title: 'Eliminar', message: `¿Eliminar "${product.name}"?`, confirmText: 'Eliminar' });
      if (!ok) return;
      await dataProvider.deleteProduct(product.id);
      toast('Producto eliminado', { type: 'success' });
      renderAdminProducts(root);
    });
  }
}

function seedCategoryOptions(selectedId) {
  const cats = [
    { id: 'cat_frutas', name: 'Frutas' },
    { id: 'cat_verduras', name: 'Verduras' },
    { id: 'cat_citricos', name: 'Cítricos' },
    { id: 'cat_aguacates', name: 'Aguacates' },
    { id: 'cat_tuberculos', name: 'Tubérculos' },
    { id: 'cat_hierbas', name: 'Hierbas y especias' },
    { id: 'cat_combos', name: 'Combos y paquetes' },
    { id: 'cat_ofertas', name: 'Ofertas' }
  ];
  return cats.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
}

// ══════════ PEDIDOS ══════════
export async function renderAdminOrders(root) {
  if (!isAdminAuthed()) { renderAdminLogin(root); return; }
  const orders = await dataProvider.listOrders();

  root.innerHTML = `
    <h2>Pedidos</h2>
    <div class="table-wrap">
      <table class="data-table">
        <thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>${escapeHtml(o.folio)}</td>
              <td>${new Date(o.createdAt).toLocaleString('es-MX')}</td>
              <td>${escapeHtml(o.customer.name)}<br><span class="text-xs muted">${escapeHtml(o.customer.phone)}</span></td>
              <td>${money.format(o.totalCents)}</td>
              <td><span class="status-pill status-${o.status}">${o.status}</span></td>
              <td>
                <button class="btn btn--sm btn--ghost" data-view="${o.id}">Ver</button>
              </td>
            </tr>`).join('') || '<tr><td colspan="6" class="muted">Sin pedidos</td></tr>'}
        </tbody>
      </table>
    </div>
    <div id="order-detail" style="margin-top:24px"></div>`;

  root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', async () => {
    const order = orders.find(o => o.id === b.dataset.view);
    showOrderDetail(root, order);
  }));
}

function showOrderDetail(root, order) {
  const wrap = root.querySelector('#order-detail');
  const statuses = ['CONFIRMED','PREPARING','DELIVERING','DELIVERED','CANCELLED'];
  wrap.innerHTML = `
    <div class="card" style="padding:20px">
      <h3>Pedido ${escapeHtml(order.folio)}</h3>
      <p class="text-sm muted">${new Date(order.createdAt).toLocaleString('es-MX')} · Estado: <span class="status-pill status-${order.status}">${order.status}</span></p>

      <div class="review-box">
        <h4>Cliente</h4>
        <div class="review-line"><span>Nombre</span><span>${escapeHtml(order.customer.name)}</span></div>
        <div class="review-line"><span>Teléfono</span><span>${escapeHtml(order.customer.phone)}</span></div>
      </div>

      <div class="review-box">
        <h4>Productos</h4>
        ${order.items.map(it => `
          <div class="review-line">
            <span>${it.quantity} × ${escapeHtml(it.unitSnapshot)} ${escapeHtml(it.nameSnapshot)}</span>
            <span>${money.format(it.subtotalCents)}</span>
          </div>`).join('')}
      </div>

      <div class="review-box">
        <h4>${order.delivery.method === 'delivery' ? 'Entrega' : 'Recolección'}</h4>
        ${order.delivery.method === 'delivery' ? `
          <div class="review-line"><span>Dirección</span><span>${escapeHtml(order.delivery.address)}</span></div>
          ${order.delivery.references ? `<div class="review-line"><span>Referencias</span><span>${escapeHtml(order.delivery.references)}</span></div>` : ''}
        ` : ''}
        <div class="review-line"><span>Fecha</span><span>${escapeHtml(order.schedule.date)}</span></div>
        <div class="review-line"><span>Horario</span><span>${escapeHtml(order.schedule.window)}</span></div>
        <div class="review-line"><span>Pago</span><span>${order.payment.method === 'cash' ? 'Efectivo' : 'Tarjeta'}</span></div>
      </div>

      <div class="review-box">
        <h4>Totales</h4>
        <div class="review-line"><span>Subtotal</span><span>${money.format(order.subtotalCents)}</span></div>
        <div class="review-line"><span>Envío</span><span>${money.format(order.deliveryFeeCents)}</span></div>
        <div class="review-line" style="font-weight:700;color:var(--color-primary)">
          <span>Total</span><span>${money.format(order.totalCents)}</span>
        </div>
      </div>

      ${order.notes ? `<div class="info-box"><strong>Notas:</strong> ${escapeHtml(order.notes)}</div>` : ''}

      <h4 style="margin-top:20px">Cambiar estado</h4>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${statuses.map(s => `
          <button class="btn btn--sm btn--ghost" data-status="${s}" ${s === order.status ? 'disabled' : ''}>${s}</button>
        `).join('')}
      </div>
    </div>`;

  wrap.querySelectorAll('[data-status]').forEach(b => b.addEventListener('click', async () => {
    await dataProvider.updateOrderStatus(order.id, b.dataset.status);
    toast('Estado actualizado', { type: 'success' });
    renderAdminOrders(root);
  }));
}

// ══════════ SETTINGS ══════════
export async function renderAdminSettings(root) {
  if (!isAdminAuthed()) { renderAdminLogin(root); return; }
  const settings = await dataProvider.getSettings();

  root.innerHTML = `
    <h2>Configuración del negocio</h2>
    <div class="card" style="padding:20px">
      <div class="form-grid">
        <div class="form-row form-row--full">
          <label class="label">Nombre comercial</label>
          <input class="input" name="business-name" value="${escapeHtml(settings.business.name)}">
        </div>
        <div class="form-row form-row--full">
          <label class="label">Eslogan</label>
          <input class="input" name="business-slogan" value="${escapeHtml(settings.business.slogan || '')}">
        </div>
        <div class="form-row">
          <label class="label">WhatsApp (521XXXXXXXXXX)</label>
          <input class="input" name="business-whatsapp" value="${escapeHtml(settings.business.whatsapp || '')}">
        </div>
        <div class="form-row">
          <label class="label">Teléfono</label>
          <input class="input" name="business-phone" value="${escapeHtml(settings.business.phone || '')}">
        </div>
        <div class="form-row form-row--full">
          <label class="label">Dirección</label>
          <input class="input" name="business-address" value="${escapeHtml(settings.business.address || '')}">
        </div>
        <div class="form-row">
          <label class="label">Pedido mínimo (MXN)</label>
          <input class="input" name="delivery-min" type="number" step="0.01" value="${(settings.delivery.minOrderCents/100).toFixed(2)}">
        </div>
        <div class="form-row">
          <label class="label">Envío por defecto (MXN)</label>
          <input class="input" name="delivery-fee" type="number" step="0.01" value="${(settings.delivery.defaultFeeCents/100).toFixed(2)}">
        </div>
        <div class="form-row">
          <label class="label">Pago efectivo</label>
          <select class="select" name="payment-cash">
            <option value="1" ${settings.payments.cash ? 'selected' : ''}>Sí</option>
            <option value="0" ${!settings.payments.cash ? 'selected' : ''}>No</option>
          </select>
        </div>
        <div class="form-row">
          <label class="label">Color primario</label>
          <input class="input" name="brand-primary" type="color" value="${settings.branding.colorPrimary}">
        </div>
        <div class="form-row">
          <label class="label">Color acento</label>
          <input class="input" name="brand-accent" type="color" value="${settings.branding.colorAccent}">
        </div>
      </div>
      <button class="btn btn--block" style="margin-top:20px" id="save-settings">Guardar configuración</button>
      <button class="btn btn--ghost btn--block" style="margin-top:8px" id="export-data">Exportar backup JSON</button>
    </div>`;

  root.querySelector('#save-settings').addEventListener('click', async () => {
    const next = JSON.parse(JSON.stringify(settings));
    next.business.name = root.querySelector('[name="business-name"]').value;
    next.business.slogan = root.querySelector('[name="business-slogan"]').value;
    next.business.whatsapp = root.querySelector('[name="business-whatsapp"]').value.trim();
    next.business.phone = root.querySelector('[name="business-phone"]').value.trim();
    next.business.address = root.querySelector('[name="business-address"]').value;
    next.delivery.minOrderCents = Math.round(parseFloat(root.querySelector('[name="delivery-min"]').value) * 100);
    next.delivery.defaultFeeCents = Math.round(parseFloat(root.querySelector('[name="delivery-fee"]').value) * 100);
    next.payments.cash = root.querySelector('[name="payment-cash"]').value === '1';
    next.branding.colorPrimary = root.querySelector('[name="brand-primary"]').value;
    next.branding.colorAccent = root.querySelector('[name="brand-accent"]').value;
    await dataProvider.saveSettings(next);
    store.set({ config: next });
    applyBranding(next);
    toast('Configuración guardada', { type: 'success' });
  });

  root.querySelector('#export-data').addEventListener('click', async () => {
    const orders = await dataProvider.listOrders();
    const products = await dataProvider.getProducts({ activeOnly: false });
    const backup = { settings, products, orders, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mi-fruteria-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado', { type: 'success' });
  });
}

function applyBranding(config) {
  document.documentElement.style.setProperty('--color-primary', config.branding.colorPrimary);
  document.documentElement.style.setProperty('--color-accent', config.branding.colorAccent);
  document.querySelectorAll('[data-bind="business.name"]').forEach(el => { el.textContent = config.business.name; });
}