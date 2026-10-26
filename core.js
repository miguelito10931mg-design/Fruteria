// ══════════════════════════════════════════════════════════
// CORE — money, utils, state, router, idempotency, validator, config
// ══════════════════════════════════════════════════════════

export const money = {
  toCents(p) { return Math.round(Number(p) * 100); },
  toPesos(c) { return Math.round(c) / 100; },
  format(c, { currency = 'MXN', locale = 'es-MX' } = {}) {
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency,
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(this.toPesos(c));
  },
  multiplyByFactor(c, f) { return Math.round(c * f); },
  sum(l) { return l.reduce((a, b) => a + b, 0); }
};

// ---- utils ----
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
export function todayISO() { return new Date().toISOString().slice(0, 10); }
export function isBusinessOpen(settings, date = new Date()) {
  const day = date.getDay();
  if (settings.business.restDays.includes(day)) return false;
  const h = settings.business.hours.find(x => x.day === day);
  if (!h) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const [oh, om] = h.open.split(':').map(Number);
  const [ch, cm] = h.close.split(':').map(Number);
  return now >= oh * 60 + om && now <= ch * 60 + cm;
}

// ---- state ----
const listeners = new Set();
let _state = { cart: [], config: null, customer: null, cartOpen: false };

export const store = {
  get() { return _state; },
  set(patch) {
    _state = { ..._state, ...patch };
    listeners.forEach(fn => fn(_state));
  },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
};

// ---- idempotency ----
const KEY = 'mf:idempotency-key';
const TTL = 10 * 60 * 1000;
export const idempotency = {
  generate() {
    const key = uuid();
    localStorage.setItem(KEY, JSON.stringify({ key, at: Date.now() }));
    return key;
  },
  get() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (Date.now() - p.at > TTL) { localStorage.removeItem(KEY); return null; }
      return p.key;
    } catch { return null; }
  },
  consume() { localStorage.removeItem(KEY); }
};

// ---- router ----
const routes = [];
let currentCleanup = null;
export const router = {
  add(pattern, handler) {
    const keys = [];
    const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, m => {
      keys.push(m.slice(1)); return '([^/]+)';
    }) + '$');
    routes.push({ regex, keys, handler });
  },
  async go(hash = location.hash) {
    const path = (hash || '#/').replace(/^#/, '') || '/';
    for (const r of routes) {
      const m = path.match(r.regex);
      if (m) {
        if (typeof currentCleanup === 'function') currentCleanup();
        const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
        currentCleanup = (await r.handler(params)) || null;
        this._updateNav(path);
        return;
      }
    }
    location.hash = '#/';
  },
  _updateNav(path) {
    const section = path === '/' ? 'home'
      : path.startsWith('/catalog') ? 'catalog'
      : path.startsWith('/cart') ? 'cart'
      : path.startsWith('/account') ? 'account'
      : path.startsWith('/admin/products') ? 'admin-prod'
      : path.startsWith('/admin/orders') ? 'admin-orders'
      : path.startsWith('/admin/settings') ? 'admin-settings'
      : path.startsWith('/admin') ? 'admin-dash' : '';
    document.querySelectorAll('[data-nav]').forEach(el => {
      if (el.dataset.nav === section) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  },
  start() {
    window.addEventListener('hashchange', () => this.go());
    this.go();
  }
};

// ---- orderValidator (isomorfo) ----
export function validateOrder({ items, delivery, schedule, settings, catalog }) {
  const errors = [];
  const validated = [];
  if (!items || items.length === 0) {
    return { ok: false, errors: [{ code: 'EMPTY_CART', message: 'El carrito está vacío.' }], totalCents: 0 };
  }
  for (const line of items) {
    const product = catalog.getProductById(line.productId);
    if (!product || !product.isActive) {
      errors.push({ code: 'PRODUCT_UNAVAILABLE', productId: line.productId,
        message: `"${line.nameSnapshot || line.productId}" ya no está disponible.` });
      continue;
    }
    const unit = product.allowedUnits.find(u => u.unit === line.unitSnapshot);
    if (!unit) {
      errors.push({ code: 'INVALID_UNIT', productId: product.id, message: `Unidad no válida.` });
      continue;
    }
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push({ code: 'INVALID_QTY', productId: product.id, message: `Cantidad inválida.` });
      continue;
    }
    const baseQty = qty * unit.factor;
    if (baseQty < (product.minQty ?? 0) || baseQty > (product.maxQty ?? Infinity)) {
      errors.push({ code: 'QTY_OUT_OF_RANGE', productId: product.id, message: `Cantidad fuera de rango.` });
      continue;
    }
    if (baseQty > product.stock) {
      errors.push({ code: 'INSUFFICIENT_STOCK', productId: product.id,
        message: `Solo quedan ${product.stock} ${product.baseUnit}.` });
      continue;
    }
    const eff = product.isOnSale && product.salePriceCents != null ? product.salePriceCents : product.priceCents;
    const unitPriceCents = money.multiplyByFactor(eff, unit.factor);
    validated.push({
      productId: product.id, nameSnapshot: product.name,
      unitSnapshot: unit.unit, unitFactor: unit.factor,
      quantity: qty, unitPriceCents, subtotalCents: unitPriceCents * qty
    });
  }
  if (errors.length) return { ok: false, errors, totalCents: 0 };
  const subtotalCents = validated.reduce((s, l) => s + l.subtotalCents, 0);
  let deliveryFeeCents = 0;
  if (delivery.method === 'delivery') {
    if (!settings.delivery.enabled) errors.push({ code: 'DELIVERY_DISABLED', message: 'No disponible.' });
    const zone = settings.delivery.zones.find(z => z.id === delivery.zoneId);
    if (!zone) errors.push({ code: 'OUT_OF_COVERAGE', message: 'Fuera de cobertura.' });
    else deliveryFeeCents = zone.feeCents;
    if (subtotalCents < settings.delivery.minOrderCents)
      errors.push({ code: 'MIN_ORDER', message: `Pedido mínimo: ${money.format(settings.delivery.minOrderCents)}.` });
  } else if (delivery.method === 'pickup') {
    if (!settings.delivery.pickupEnabled) errors.push({ code: 'PICKUP_DISABLED', message: 'No disponible.' });
  } else {
    errors.push({ code: 'INVALID_METHOD', message: 'Método inválido.' });
  }
  if (!schedule?.slotId || !settings.delivery.slots.some(s => s.id === schedule.slotId))
    errors.push({ code: 'INVALID_SLOT', message: 'Horario no disponible.' });
  const totalCents = subtotalCents + deliveryFeeCents;
  return { ok: errors.length === 0, errors, validatedItems: validated, subtotalCents, deliveryFeeCents, totalCents };
}

// ---- config por defecto ----
export const DEFAULT_CONFIG = {
  business: {
    name: 'Mi Frutería',
    slogan: 'Frescura directa del campo a tu mesa',
    logoUrl: '/assets/img/logo.svg',
    whatsapp: '',
    phone: '',
    address: '',
    hours: [
      { day: 1, open: '08:00', close: '20:00' },
      { day: 2, open: '08:00', close: '20:00' },
      { day: 3, open: '08:00', close: '20:00' },
      { day: 4, open: '08:00', close: '20:00' },
      { day: 5, open: '08:00', close: '20:00' },
      { day: 6, open: '08:00', close: '18:00' }
    ],
    restDays: [0]
  },
  branding: { colorPrimary: '#2E7D32', colorAccent: '#F9A825', colorBg: '#F8FAF7' },
  delivery: {
    enabled: true, pickupEnabled: true,
    minOrderCents: 15000, defaultFeeCents: 3000,
    zones: [
      { id: 'zone_centro', name: 'Centro', feeCents: 2500 },
      { id: 'zone_norte',  name: 'Norte',  feeCents: 4000 }
    ],
    slots: [
      { id: 'slot_08_10', label: '08:00 - 10:00', capacity: 10 },
      { id: 'slot_10_12', label: '10:00 - 12:00', capacity: 10 },
      { id: 'slot_12_14', label: '12:00 - 14:00', capacity: 10 },
      { id: 'slot_16_18', label: '16:00 - 18:00', capacity: 10 },
      { id: 'slot_18_20', label: '18:00 - 20:00', capacity: 10 }
    ]
  },
  payments: { cash: true, card: false },
  ui: {
    heroBanner: '',
    commercialMessages: ['Envío gratis en compras mayores a $300.']
  }
};