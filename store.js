// ══════════════════════════════════════════════════════════
// STORE — catalog + cart + checkout + whatsapp + orders
// ══════════════════════════════════════════════════════════
import { store, money, validateOrder, idempotency, todayISO, escapeHtml, debounce } from './core.js';
import { dataProvider } from './data.js';
import { toast, confirmModal } from './ui.js';

// ══════════ CART ══════════
const CART_KEY = 'mf:cart';
function persistCart() { localStorage.setItem(CART_KEY, JSON.stringify(store.get().cart)); }
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const list = raw ? JSON.parse(raw) : [];
    store.set({ cart: Array.isArray(list) ? list : [] });
  } catch { store.set({ cart: [] }); }
}
loadCart();

export function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (!badge) return;
  const n = store.get().cart.reduce((s, l) => s + Number(l.quantity), 0);
  if (n > 0) { badge.hidden = false; badge.textContent = String(n); }
  else badge.hidden = true;
}

export function addToCart(productId, quantity = 1, unitSnapshot = 'default') {
  const prod = dataProvider.getProductById(productId);
  if (!prod) { toast('Producto no encontrado', { type: 'error' }); return; }
  if (prod.stock <= 0) { toast(`${prod.name} está agotado`, { type: 'error' }); return; }
  const unit = prod.allowedUnits.find(u => u.unit === unitSnapshot) || prod.allowedUnits[0];
  const cart = store.get().cart.slice();
  const ex = cart.find(l => l.productId === productId && l.unitSnapshot === unit.unit);
  if (ex) ex.quantity = Number(ex.quantity) + Number(quantity);
  else cart.push({ productId, quantity: Number(quantity), unitSnapshot: unit.unit });
  store.set({ cart });
  persistCart();
  updateCartBadge();
  toast(`${prod.name} agregado`, { type: 'success', duration: 1800 });
}

export function changeQuantity(productId, unitSnapshot, newQty) {
  const cart = store.get().cart.slice();
  const line = cart.find(l => l.productId === productId && l.unitSnapshot === unitSnapshot);
  if (!line) return;
  line.quantity = Math.max(0, Number(newQty));
  store.set({ cart: cart.filter(l => l.quantity > 0) });
  persistCart();
  updateCartBadge();
}

export function removeLine(productId, unitSnapshot) {
  store.set({ cart: store.get().cart.filter(l => !(l.productId === productId && l.unitSnapshot === unitSnapshot)) });
  persistCart();
  updateCartBadge();
}

export function clearCartSilent() {
  store.set({ cart: [] });
  persistCart();
  updateCartBadge();
}

export async function clearCartWithConfirm() {
  const ok = await confirmModal({
    title: 'Vaciar carrito',
    message: '¿Deseas eliminar todos los productos?',
    confirmText: 'Sí, vaciar'
  });
  if (!ok) return false;
  clearCartSilent();
  toast('Carrito vacío', { type: 'success' });
  return true;
}

export function computeCartTotals() {
  const settings = store.get().config;
  const lines = store.get().cart.map(l => {
    const p = dataProvider.getProductById(l.productId);
    if (!p) return null;
    const unit = p.allowedUnits.find(u => u.unit === l.unitSnapshot) || p.allowedUnits[0];
    const eff = p.isOnSale && p.salePriceCents != null ? p.salePriceCents : p.priceCents;
    const unitPriceCents = money.multiplyByFactor(eff, unit.factor);
    return { ...l, product: p, unit, unitPriceCents, subtotalCents: unitPriceCents * Number(l.quantity) };
  }).filter(Boolean);
  const subtotalCents = lines.reduce((s, l) => s + l.subtotalCents, 0);
  const deliveryFeeCents = settings?.delivery?.defaultFeeCents ?? 0;
  return { lines, subtotalCents, deliveryFeeCents, totalCents: subtotalCents + deliveryFeeCents };
}

// ══════════ CATALOG ══════════
let cFilters = { q: '', categoryId: '', sort: 'default', onlyOffers: false };
let cProducts = [];
let cCategories = [];

export async function renderCatalog(root, { preselectCategory = '' } = {}) {
  if (preselectCategory) cFilters.categoryId = preselectCategory;
  cProducts = await dataProvider.getProducts({ activeOnly: true });
  cCategories = await dataProvider.getCategories();

  root.innerHTML = `
    <div class="fade-in">
      <div class="chips-row" role="tablist">
        <button class="chip ${!cFilters.categoryId ? 'chip--active' : ''}" data-cat="">Todas</button>
        ${cCategories.map(c => `
          <button class="chip ${cFilters.categoryId === c.id ? 'chip--active' : ''}"
                  data-cat="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
      </div>
      <div class="chips-row" style="margin-top:8px">
        <select id="sort-select" class="chip" aria-label="Ordenar">
          <option value="default">Relevancia</option>
          <option value="price-asc">Precio ↑</option>
          <option value="price-desc">Precio ↓</option>
        </select>
        <button class="chip ${cFilters.onlyOffers ? 'chip--active' : ''}" id="only-offers">🏷️ Solo ofertas</button>
      </div>
      <div id="catalog-grid" style="margin-top:16px" aria-live="polite"></div>
    </div>`;

  paintGrid(root);

  root.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    cFilters.categoryId = b.dataset.cat;
    root.querySelectorAll('[data-cat]').forEach(x => x.classList.toggle('chip--active', x === b));
    paintGrid(root);
  }));
  root.querySelector('#sort-select').addEventListener('change', e => { cFilters.sort = e.target.value; paintGrid(root); });
  root.querySelector('#only-offers').addEventListener('click', e => {
    cFilters.onlyOffers = !cFilters.onlyOffers;
    e.target.classList.toggle('chip--active', cFilters.onlyOffers);
    paintGrid(root);
  });

  const si = document.getElementById('search-input');
  if (si) {
    si.value = cFilters.q;
    const onSearch = debounce(v => { cFilters.q = v.toLowerCase().trim(); paintGrid(root); }, 200);
    si.addEventListener('input', e => onSearch(e.target.value));
  }
}

function effectivePrice(p) {
  return p.isOnSale && p.salePriceCents != null ? p.salePriceCents : p.priceCents;
}

function paintGrid(root) {
  const grid = root.querySelector('#catalog-grid');
  let list = cProducts.slice();
  if (cFilters.categoryId) list = list.filter(p => p.categoryId === cFilters.categoryId);
  if (cFilters.q) list = list.filter(p =>
    p.name.toLowerCase().includes(cFilters.q) ||
    (p.description || '').toLowerCase().includes(cFilters.q));
  if (cFilters.onlyOffers) list = list.filter(p => p.isOnSale && p.salePriceCents != null);
  if (cFilters.sort === 'price-asc') list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  if (cFilters.sort === 'price-desc') list.sort((a, b) => effectivePrice(b) - effectivePrice(a));

  if (!list.length) {
    grid.innerHTML = `<div class="empty"><div class="empty__icon">🔍</div><p>Sin resultados.</p></div>`;
    return;
  }
  grid.innerHTML = `<div class="product-grid">${list.map(productCard).join('')}</div>`;
  grid.querySelectorAll('[data-open-product]').forEach(c => c.addEventListener('click', e => {
    if (e.target.closest('[data-add]')) return;
    location.hash = `#/product/${c.dataset.openProduct}`;
  }));
  grid.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    addToCart(b.dataset.add, 1, 'default');
  }));
}

export function productCard(p) {
  const eff = effectivePrice(p);
  const hasSale = p.isOnSale && p.salePriceCents != null;
  const oos = p.stock <= 0;
  return `
    <article class="card product-card" data-open-product="${p.id}" role="button" tabindex="0">
      <div class="product-card__img-wrap">
        ${hasSale ? `<span class="badge badge--sale product-card__badge">Oferta</span>` : ''}
        ${oos ? `<span class="badge product-card__badge">Agotado</span>` : ''}
        <img class="product-card__img" src="${escapeHtml(p.imageUrl || '')}"
             alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.opacity=0.15">
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
        <div class="product-card__price">
          ${money.format(eff)}
          ${hasSale ? `<del>${money.format(p.priceCents)}</del>` : ''}
        </div>
        <div class="product-card__unit">por ${escapeHtml(p.baseUnit)}</div>
      </div>
      <div class="product-card__actions">
        <button class="btn btn--block btn--sm" data-add="${p.id}" ${oos ? 'disabled' : ''}>
          ${oos ? 'Agotado' : 'Agregar'}
        </button>
      </div>
    </article>`;
}

export function renderProductDetail(id) {
  const view = document.getElementById('view');
  const p = dataProvider.getProductById(id);
  if (!p) {
    view.innerHTML = `<div class="empty"><p>Producto no encontrado.</p>
      <a href="#/catalog" class="btn">Volver</a></div>`;
    return;
  }
  const eff = effectivePrice(p);
  view.innerHTML = `
    <div class="product-detail fade-in">
      <a href="#/catalog" class="text-sm">← Volver</a>
      <img class="product-detail__img" src="${escapeHtml(p.imageUrl || '')}"
           alt="${escapeHtml(p.name)}" onerror="this.style.opacity=0.15">
      <h1 style="font-size:1.5rem">${escapeHtml(p.name)}</h1>
      <p class="muted">${escapeHtml(p.description || '')}</p>
      <div class="product-detail__price">
        ${money.format(eff)}
        ${p.isOnSale ? `<del style="font-size:1rem">${money.format(p.priceCents)}</del>` : ''}
        <span class="text-sm muted" style="font-weight:400">/ ${escapeHtml(p.baseUnit)}</span>
      </div>
      <label class="label">Unidad de venta</label>
      <div class="unit-options">
        ${p.allowedUnits.map((u, i) => `
          <label class="chip ${i === 0 ? 'chip--active' : ''}">
            <input type="radio" name="unit" value="${u.unit}" ${i === 0 ? 'checked' : ''} style="display:none">
            ${escapeHtml(u.label)} — ${money.format(Math.round(eff * u.factor))}
          </label>`).join('')}
      </div>
      <label class="label">Cantidad</label>
      <div class="qty" style="display:inline-flex">
        <button id="qty-dec" aria-label="Menos">−</button>
        <input id="qty-input" type="number" value="1" min="1" step="1" aria-label="Cantidad">
        <button id="qty-inc" aria-label="Más">+</button>
      </div>
      <div style="margin-top:24px">
        <button class="btn btn--block" id="add-to-cart">
          Agregar al carrito · <span id="line-total">${money.format(eff)}</span>
        </button>
      </div>
    </div>`;

  let selUnit = p.allowedUnits[0];
  const qi = view.querySelector('#qty-input');
  const lt = view.querySelector('#line-total');
  const updateTotal = () => {
    const q = Math.max(1, Number(qi.value) || 1);
    lt.textContent = money.format(Math.round(eff * selUnit.factor) * q);
  };
  view.querySelector('#qty-dec').addEventListener('click', () => { qi.value = Math.max(1, Number(qi.value) - 1); updateTotal(); });
  view.querySelector('#qty-inc').addEventListener('click', () => { qi.value = Number(qi.value) + 1; updateTotal(); });
  qi.addEventListener('input', updateTotal);
  view.querySelectorAll('input[name="unit"]').forEach(r => r.addEventListener('change', () => {
    selUnit = p.allowedUnits.find(u => u.unit === r.value);
    view.querySelectorAll('.unit-options .chip').forEach(c => c.classList.toggle('chip--active', c.querySelector('input').checked));
    updateTotal();
  }));
  view.querySelector('#add-to-cart').addEventListener('click', () => {
    addToCart(p.id, Number(qi.value), selUnit.unit);
    location.hash = '#/cart';
  });
}

// ══════════ CART RENDER ══════════
export function renderCart(root) {
  const { lines, subtotalCents, deliveryFeeCents, totalCents } = computeCartTotals();
  if (!lines.length) {
    root.innerHTML = `
      <div class="empty fade-in">
        <div class="empty__icon">🛒</div>
        <h2>Tu carrito está vacío</h2>
        <p class="muted">Agrega frutas y verduras para comenzar.</p>
        <a href="#/catalog" class="btn" style="margin-top:16px">Ver catálogo</a>
      </div>`;
    return;
  }
  root.innerHTML = `
    <div class="fade-in">
      <div class="section__head"><h2>Tu carrito</h2>
        <button class="section__link" id="clear-cart">Vaciar</button></div>
      <div class="cart-list">${lines.map(cartItemHtml).join('')}</div>
      <div class="cart-summary">
        <div class="cart-summary__row"><span>Subtotal</span><span>${money.format(subtotalCents)}</span></div>
        <div class="cart-summary__row"><span>Envío estimado</span><span>${money.format(deliveryFeeCents)}</span></div>
        <div class="cart-summary__row cart-summary__row--total"><span>Total</span><span>${money.format(totalCents)}</span></div>
        <a href="#/checkout" class="btn btn--block" style="margin-top:12px">Continuar al pedido</a>
        <a href="#/catalog" class="btn btn--block btn--ghost" style="margin-top:8px">Seguir comprando</a>
      </div>
    </div>`;
  root.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => {
    const [pid, unit] = b.dataset.inc.split('|');
    const line = lines.find(l => l.productId === pid && l.unitSnapshot === unit);
    changeQuantity(pid, unit, Number(line.quantity) + 1); renderCart(root);
  }));
  root.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => {
    const [pid, unit] = b.dataset.dec.split('|');
    const line = lines.find(l => l.productId === pid && l.unitSnapshot === unit);
    changeQuantity(pid, unit, Number(line.quantity) - 1); renderCart(root);
  }));
  root.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => {
    const [pid, unit] = b.dataset.remove.split('|');
    removeLine(pid, unit); renderCart(root);
  }));
  root.querySelector('#clear-cart').addEventListener('click', async () => {
    if (await clearCartWithConfirm()) renderCart(root);
  });
}

function cartItemHtml(line) {
  const p = line.product;
  return `
    <div class="cart-item">
      <img class="cart-item__img" src="${escapeHtml(p.imageUrl || '')}" alt="">
      <div class="cart-item__info">
        <div class="cart-item__name">${escapeHtml(p.name)}</div>
        <div class="cart-item__meta">${escapeHtml(line.unit.label)}</div>
        <div class="cart-item__price">${money.format(line.subtotalCents)}</div>
      </div>
      <div class="cart-item__controls">
        <button class="cart-item__remove" data-remove="${p.id}|${line.unit.unit}">Quitar</button>
        <div class="qty">
          <button data-dec="${p.id}|${line.unit.unit}" aria-label="Menos">−</button>
          <input value="${line.quantity}" readonly aria-label="Cantidad">
          <button data-inc="${p.id}|${line.unit.unit}" aria-label="Más">+</button>
        </div>
      </div>
    </div>`;
}

// ══════════ WHATSAPP ══════════
export function buildWhatsAppMessage(order, settings) {
  const L = [];
  L.push(`*NUEVO PEDIDO — ${settings.business.name}*`);
  L.push(`Folio: *${order.folio}*`);
  L.push(`Fecha: ${new Date(order.createdAt).toLocaleString('es-MX')}`);
  L.push('', `*Cliente:* ${order.customer.name}`, `*Teléfono:* ${order.customer.phone}`, '', '*PRODUCTOS*');
  for (const it of order.items) {
    L.push(`• ${it.quantity} × ${it.unitSnapshot} ${it.nameSnapshot}`);
    L.push(`   ${money.format(it.unitPriceCents)} c/u = ${money.format(it.subtotalCents)}`);
  }
  L.push('', `Subtotal: ${money.format(order.subtotalCents)}`);
  if (order.discountCents) L.push(`Descuento: -${money.format(order.discountCents)}`);
  L.push(`Envío: ${money.format(order.deliveryFeeCents)}`);
  L.push(`*TOTAL: ${money.format(order.totalCents)}*`, '');
  L.push(`*Entrega:* ${order.delivery.method === 'delivery' ? 'A domicilio' : 'Recoger en tienda'}`);
  if (order.delivery.method === 'delivery') {
    L.push(`Dirección: ${order.delivery.address}`);
    if (order.delivery.references) L.push(`Referencias: ${order.delivery.references}`);
  }
  L.push(`Horario: ${order.schedule.window} (${order.schedule.date})`);
  L.push(`Pago: ${order.payment.method === 'cash' ? 'Efectivo' : 'Tarjeta'}`);
  if (order.notes) L.push('', `Notas: ${order.notes}`);
  return L.join('\n');
}

export function openWhatsApp(message, phone) {
  if (!phone) return { opened: false, url: '', error: 'WhatsApp no configurado.' };
  const clean = String(phone).replace(/\D/g, '');
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
  const win = window.open(url, '_blank', 'noopener');
  return { opened: !!win, url };
}

// ══════════ ORDERS ══════════
export async function createOrder({ cart, customer, delivery, schedule, payment, notes }) {
  const settings = await dataProvider.getSettings();
  const key = idempotency.get() || idempotency.generate();
  const existing = await dataProvider.getOrderByKey(key);
  if (existing) return { ok: true, order: existing, deduplicated: true };

  const v = validateOrder({ items: cart, delivery, schedule, settings, catalog: dataProvider });
  if (!v.ok) return { ok: false, errors: v.errors };

  const folio = await dataProvider.nextOrderFolio();
  const now = Date.now();
  const order = {
    id: `ord_${now}_${Math.random().toString(36).slice(2, 8)}`,
    folio, idempotencyKey: key, status: 'CREATED', whatsappState: 'PENDING',
    customer: {
      userId: customer.userId || null,
      name: String(customer.name).trim(),
      phone: String(customer.phone).trim(),
      email: customer.email || null
    },
    delivery: {
      method: delivery.method,
      address: delivery.address || '',
      references: delivery.references || '',
      zoneId: delivery.zoneId || null,
      feeCents: v.deliveryFeeCents
    },
    schedule: {
      slotId: schedule.slotId,
      date: schedule.date,
      window: (settings.delivery.slots.find(s => s.id === schedule.slotId) || {}).label || ''
    },
    payment: { method: payment.method, status: 'pending' },
    items: v.validatedItems,
    subtotalCents: v.subtotalCents,
    discountCents: 0,
    deliveryFeeCents: v.deliveryFeeCents,
    totalCents: v.totalCents,
    notes: notes || '',
    createdAt: now, updatedAt: now,
    statusHistory: [{ status: 'CREATED', at: now }]
  };
  await dataProvider.createOrder(order);
  idempotency.consume();
  return { ok: true, order };
}

export async function markWhatsAppOpened(id) {
  return dataProvider.updateOrderStatus(id, 'WHATSAPP_OPENED', { whatsappState: 'OPENED' });
}
export async function markWhatsAppSent(id) {
  return dataProvider.updateOrderStatus(id, 'SENT', { whatsappState: 'SENT_MANUAL' });
}

export async function detectPriceDrift(cart) {
  const settings = await dataProvider.getSettings();
  const v = validateOrder({
    items: cart,
    delivery: { method: 'pickup' },
    schedule: { slotId: settings.delivery.slots[0]?.id },
    settings, catalog: dataProvider
  });
  if (!v.ok) return { changed: true, errors: v.errors };
  const clientTotal = cart.reduce((s, l) => {
    const p = dataProvider.getProductById(l.productId);
    if (!p) return s;
    const u = p.allowedUnits.find(x => x.unit === l.unitSnapshot);
    if (!u) return s;
    const eff = p.isOnSale && p.salePriceCents != null ? p.salePriceCents : p.priceCents;
    return s + money.multiplyByFactor(eff, u.factor) * l.quantity;
  }, 0);
  if (clientTotal !== v.subtotalCents) {
    return { changed: true, diffCents: v.subtotalCents - clientTotal };
  }
  return { changed: false };
}

// ══════════ CHECKOUT ══════════
let co = null;

export async function renderCheckout(root) {
  const settings = await dataProvider.getSettings();
  const cartTotals = computeCartTotals();
  if (!cartTotals.lines.length) {
    root.innerHTML = `<div class="empty"><div class="empty__icon">🛒</div>
      <h2>Tu carrito está vacío</h2>
      <a href="#/catalog" class="btn" style="margin-top:16px">Ver catálogo</a></div>`;
    return;
  }
  if (!idempotency.get()) idempotency.generate();
  co = {
    settings, step: 1, cartTotals,
    customer: { name: '', phone: '', email: '' },
    delivery: { method: 'delivery', address: '', references: '', zoneId: settings.delivery.zones[0]?.id || '' },
    schedule: { slotId: settings.delivery.slots[0]?.id || '', date: todayISO() },
    payment: { method: 'cash' }, notes: ''
  };
  root.innerHTML = `<div class="fade-in" id="checkout-wrap"></div>`;
  paintCheckout(root);
}

function paintCheckout(root) {
  const wrap = root.querySelector('#checkout-wrap');
  wrap.innerHTML = `
    <div class="section__head">
      <h2>Finalizar pedido</h2>
      <span class="text-sm muted">Paso ${co.step} de 5</span>
    </div>
    <div class="checkout-progress">${[1,2,3,4,5].map(n => `<div class="checkout-dot ${n <= co.step ? 'active' : ''}"></div>`).join('')}</div>
    <div style="margin-top:16px">${stepHtml()}</div>
    <div style="margin-top:16px;display:flex;gap:8px">
      ${co.step > 1 ? `<button class="btn btn--ghost" data-prev>← Atrás</button>` : ''}
      <button class="btn" data-next style="flex:1">
        ${co.step < 5 ? 'Continuar →' : 'Confirmar pedido'}
      </button>
    </div>`;
  wrap.querySelector('[data-prev]')?.addEventListener('click', () => { co.step--; paintCheckout(root); });
  wrap.querySelector('[data-next]').addEventListener('click', async () => {
    if (co.step === 5) return submitOrder(root);
    if (!validateStep()) return;
    co.step++; paintCheckout(root);
  });
  bindInputs(wrap, root);
}

function stepHtml() {
  if (co.step === 1) return `
    <h3>Datos de contacto</h3>
    <p class="muted text-sm">Compra como invitado.</p>
    <label class="label">Nombre completo *</label>
    <input class="input" name="name" value="${escapeHtml(co.customer.name)}" autocomplete="name">
    <label class="label" style="margin-top:12px">Teléfono *</label>
    <input class="input" name="phone" type="tel" value="${escapeHtml(co.customer.phone)}" autocomplete="tel" placeholder="10 dígitos">
    <label class="label" style="margin-top:12px">Email (opcional)</label>
    <input class="input" name="email" type="email" value="${escapeHtml(co.customer.email)}" autocomplete="email">`;
  if (co.step === 2) return `
    <h3>Método de entrega</h3>
    <div class="radio-group">
      ${co.settings.delivery.enabled ? `
        <label class="radio-option ${co.delivery.method === 'delivery' ? 'active' : ''}">
          <input type="radio" name="delivery-method" value="delivery" ${co.delivery.method === 'delivery' ? 'checked' : ''}>
          <strong>Entrega a domicilio</strong>
        </label>` : ''}
      ${co.settings.delivery.pickupEnabled ? `
        <label class="radio-option ${co.delivery.method === 'pickup' ? 'active' : ''}">
          <input type="radio" name="delivery-method" value="pickup" ${co.delivery.method === 'pickup' ? 'checked' : ''}>
          <strong>Recoger en tienda</strong>
        </label>` : ''}
    </div>
    ${co.delivery.method === 'delivery' ? `
      <div style="margin-top:16px">
        <label class="label">Dirección *</label>
        <textarea class="textarea" name="address">${escapeHtml(co.delivery.address)}</textarea>
        <label class="label" style="margin-top:12px">Referencias</label>
        <input class="input" name="references" value="${escapeHtml(co.delivery.references)}" placeholder="Color de portón…">
        <label class="label" style="margin-top:12px">Zona *</label>
        <select class="select" name="zoneId">
          ${co.settings.delivery.zones.map(z => `
            <option value="${z.id}" ${z.id === co.delivery.zoneId ? 'selected' : ''}>
              ${escapeHtml(z.name)} — ${money.format(z.feeCents)}
            </option>`).join('')}
        </select>
      </div>` : `
      <div style="margin-top:16px" class="info-box">
        <strong>Recoger en tienda</strong>
        <p class="text-sm muted" style="margin:4px 0 0">${escapeHtml(co.settings.business.address || 'Dirección pendiente')}</p>
      </div>`}`;
  if (co.step === 3) return `
    <h3>Horario</h3>
    <label class="label">Fecha *</label>
    <input class="input" type="date" name="date" value="${co.schedule.date}" min="${todayISO()}">
    <label class="label" style="margin-top:12px">Horario disponible *</label>
    <div class="slot-list">
      ${co.settings.delivery.slots.map(s => `
        <label class="radio-option ${s.id === co.schedule.slotId ? 'active' : ''}">
          <input type="radio" name="slotId" value="${s.id}" ${s.id === co.schedule.slotId ? 'checked' : ''}>
          <strong>${escapeHtml(s.label)}</strong>
        </label>`).join('')}
    </div>`;
  if (co.step === 4) return `
    <h3>Método de pago</h3>
    ${co.settings.payments.cash ? `
      <label class="radio-option ${co.payment.method === 'cash' ? 'active' : ''}">
        <input type="radio" name="payment-method" value="cash" ${co.payment.method === 'cash' ? 'checked' : ''}>
        <strong>Efectivo ${co.delivery.method === 'pickup' ? 'al recoger' : 'al recibir'}</strong>
      </label>` : ''}
    ${co.settings.payments.card ? `
      <label class="radio-option"><input type="radio" name="payment-method" value="card"><strong>Tarjeta</strong></label>` : `
      <div class="info-box text-sm muted" style="margin-top:8px">💳 Tarjeta próximamente.</div>`}
    <label class="label" style="margin-top:16px">Instrucciones adicionales</label>
    <textarea class="textarea" name="notes" placeholder="Ej. aguacates maduros">${escapeHtml(co.notes)}</textarea>`;
  if (co.step === 5) {
    const { lines, subtotalCents } = co.cartTotals;
    const fee = computeFee();
    const total = subtotalCents + fee;
    return `
      <h3>Revisa tu pedido</h3>
      <div class="review-box"><h4>Productos</h4>
        ${lines.map(l => `<div class="review-line"><span>${l.quantity} × ${escapeHtml(l.unit.label)} ${escapeHtml(l.product.name)}</span><span>${money.format(l.subtotalCents)}</span></div>`).join('')}
      </div>
      <div class="review-box"><h4>Cliente</h4>
        <div class="review-line"><span>Nombre</span><span>${escapeHtml(co.customer.name)}</span></div>
        <div class="review-line"><span>Teléfono</span><span>${escapeHtml(co.customer.phone)}</span></div>
      </div>
      <div class="review-box"><h4>${co.delivery.method === 'delivery' ? 'Entrega' : 'Recolección'}</h4>
        ${co.delivery.method === 'delivery' ? `
          <div class="review-line"><span>Dirección</span><span>${escapeHtml(co.delivery.address)}</span></div>
          <div class="review-line"><span>Zona</span><span>${escapeHtml(zoneName())}</span></div>` : ''}
        <div class="review-line"><span>Fecha</span><span>${escapeHtml(co.schedule.date)}</span></div>
        <div class="review-line"><span>Horario</span><span>${escapeHtml(slotLabel())}</span></div>
      </div>
      <div class="review-box"><h4>Totales</h4>
        <div class="review-line"><span>Subtotal</span><span>${money.format(subtotalCents)}</span></div>
        <div class="review-line"><span>Envío</span><span>${money.format(fee)}</span></div>
        <div class="review-line" style="font-weight:700;font-size:1.1rem;color:var(--color-primary)"><span>Total</span><span>${money.format(total)}</span></div>
      </div>
      <p class="text-sm muted">Al confirmar se generará un folio y se abrirá WhatsApp. El pedido se considera <strong>enviado</strong> solo cuando pulses "Enviar" dentro de WhatsApp.</p>`;
  }
  return '';
}

function zoneName() {
  const z = co.settings.delivery.zones.find(x => x.id === co.delivery.zoneId);
  return z?.name || '—';
}
function slotLabel() {
  const s = co.settings.delivery.slots.find(x => x.id === co.schedule.slotId);
  return s?.label || '—';
}
function computeFee() {
  if (co.delivery.method !== 'delivery') return 0;
  const z = co.settings.delivery.zones.find(x => x.id === co.delivery.zoneId);
  return z?.feeCents || 0;
}

function validateStep() {
  if (co.step === 1) {
    if (!co.customer.name.trim()) { toast('Falta el nombre', { type: 'error' }); return false; }
    if (!/^\d{10}$/.test(co.customer.phone.replace(/\D/g, ''))) { toast('Teléfono 10 dígitos', { type: 'error' }); return false; }
  }
  if (co.step === 2 && co.delivery.method === 'delivery') {
    if (!co.delivery.address.trim()) { toast('Falta dirección', { type: 'error' }); return false; }
    if (!co.delivery.zoneId) { toast('Selecciona zona', { type: 'error' }); return false; }
  }
  if (co.step === 3) {
    if (!co.schedule.date) { toast('Falta fecha', { type: 'error' }); return false; }
    if (!co.schedule.slotId) { toast('Selecciona horario', { type: 'error' }); return false; }
  }
  return true;
}

function bindInputs(wrap, root) {
  wrap.querySelectorAll('input[name="name"],input[name="phone"],input[name="email"]').forEach(el => {
    el.addEventListener('input', () => { co.customer[el.name] = el.value; });
  });
  wrap.querySelectorAll('input[name="delivery-method"]').forEach(el => {
    el.addEventListener('change', () => { co.delivery.method = el.value; paintCheckout(root); });
  });
  wrap.querySelector('textarea[name="address"]')?.addEventListener('input', e => { co.delivery.address = e.target.value; });
  wrap.querySelector('input[name="references"]')?.addEventListener('input', e => { co.delivery.references = e.target.value; });
  wrap.querySelector('select[name="zoneId"]')?.addEventListener('change', e => { co.delivery.zoneId = e.target.value; });
  wrap.querySelector('input[name="date"]')?.addEventListener('change', e => { co.schedule.date = e.target.value; });
  wrap.querySelectorAll('input[name="slotId"]').forEach(el => el.addEventListener('change', () => {
    co.schedule.slotId = el.value;
    wrap.querySelectorAll('.slot-list .radio-option').forEach(o => o.classList.toggle('active', o.querySelector('input').checked));
  }));
  wrap.querySelectorAll('input[name="payment-method"]').forEach(el => el.addEventListener('change', () => {
    co.payment.method = el.value;
    wrap.querySelectorAll('.radio-option').forEach(o => {
      const inp = o.querySelector('input[name="payment-method"]');
      if (inp) o.classList.toggle('active', inp.checked);
    });
  }));
  wrap.querySelector('textarea[name="notes"]')?.addEventListener('input', e => { co.notes = e.target.value; });
}

async function submitOrder(root) {
  const btn = root.querySelector('[data-next]');
  btn.disabled = true; btn.textContent = 'Procesando…';

  const drift = await detectPriceDrift(store.get().cart);
  if (drift.changed) {
    toast('Precios actualizados. Revisa tu total.', { type: 'error', duration: 4000 });
    btn.disabled = false; btn.textContent = 'Confirmar pedido';
    return;
  }

  const result = await createOrder({
    cart: store.get().cart, customer: co.customer,
    delivery: co.delivery, schedule: co.schedule,
    payment: co.payment, notes: co.notes
  });

  if (!result.ok) {
    toast(result.errors?.[0]?.message || 'Error al crear pedido', { type: 'error' });
    btn.disabled = false; btn.textContent = 'Confirmar pedido';
    return;
  }
  clearCartSilent();

  const message = buildWhatsAppMessage(result.order, co.settings);
  const { opened } = openWhatsApp(message, co.settings.business.whatsapp);
  if (opened) await markWhatsAppOpened(result.order.id);

  root.innerHTML = `
    <div class="fade-in" style="max-width:640px;margin:0 auto">
      <div class="success-hero">
        <div class="success-icon">✓</div>
        <h2>Pedido creado</h2>
        <p class="muted">Folio: <strong>${escapeHtml(result.order.folio)}</strong></p>
      </div>
      ${opened ? `
        <div class="info-box" style="margin-top:16px">
          <strong>WhatsApp abierto con tu pedido.</strong>
          <p class="text-sm muted" style="margin:8px 0 0">Pulsa <strong>Enviar</strong> dentro de WhatsApp. El pedido quedará <em>pendiente de confirmación</em> hasta que te respondan.</p>
        </div>` : `
        <div class="info-box" style="margin-top:16px;background:#FFF3C4">
          <strong>WhatsApp no se abrió.</strong>
          <p class="text-sm" style="margin:8px 0 0">Copia el mensaje y envíalo manualmente.</p>
        </div>
        <button class="btn btn--ghost btn--block" style="margin-top:8px" id="copy-msg">Copiar mensaje</button>`}
      <details style="margin-top:16px">
        <summary style="cursor:pointer;font-weight:600">Ver mensaje</summary>
        <pre class="message-preview">${escapeHtml(message)}</pre>
      </details>
      <a href="#/" class="btn btn--block" style="margin-top:16px">Volver al inicio</a>
    </div>`;
  root.querySelector('#copy-msg')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(message); toast('Copiado', { type: 'success' }); }
    catch { toast('No se pudo copiar', { type: 'error' }); }
  });
}