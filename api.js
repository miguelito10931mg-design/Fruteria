import { GUEST_KEY, ORDERS_KEY } from "./config.js";

export const DEFAULT_SETTINGS = {
  brand: { name: "Mi Frutería", slogan: "Frescura del campo a tu mesa", logoUrl: "", colors: { primary: "#1E7A46", accent: "#FF8A3D" } },
  contact: { whatsapp: "5215512345678", phone: "555-000-000", email: "" },
  address: { street: "Av. Siempre Viva 123", city: "Ciudad de México" },
  hours: { open: "09:00", close: "20:00" }, closedDays: [0], timezone: "America/Mexico_City", folioPrefix: "MF",
  delivery: { enabled: true, pickupEnabled: true, minOrder: 150, prepTimeMin: 45 },
  deliverySlots: [{ id:"s1", label:"09:00 – 12:00", active:true }, { id:"s2", label:"12:00 – 15:00", active:true }, { id:"s3", label:"15:00 – 18:00", active:true }],
  payments: { efectivo: true },
  banner: { active: true, title: "Frutas y verduras frescas todos los días", subtitle: "Haz tu pedido por la tienda.", cta: "Ver catálogo" },
  messages: { deliveryInfo: "Entrega a domicilio dentro de las zonas de cobertura.", waFooter: "¡Gracias por tu compra! 🍎🥦", footer: "" }
};

// ─────────── Storage helpers ───────────
const LS = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
};

const SETTINGS_KEY = "mf_settings_v1";
const CATS_KEY = "mf_cats_v1";
const PRODS_KEY = "mf_products_v1";
const ZONES_KEY = "mf_zones_v1";
const PROMOS_KEY = "mf_promos_v1";

// Semillas iniciales (solo se usan si el localStorage está vacío)
const SEED_CATEGORIES = [
  { id:"cat1", name:"Frutas", emoji:"🍎", order:1, active:true },
  { id:"cat2", name:"Verduras", emoji:"🥦", order:2, active:true },
  { id:"cat3", name:"Combos", emoji:"🧺", order:3, active:true }
];
const SEED_ZONES = [{ id:"z1", name:"Zona Centro", fee:35, minOrder:150, active:true }];
const SEED_PROMOS = [];
const SEED_PRODUCTS = [
  { id:"p1", name:"Manzana Roja", description:"Manzanas frescas de importación.", emoji:"🍎", imageUrl:"", categoryId:"cat1", sellBy:"peso", price:52, offerPrice:0, isOffer:false, fractions:[1,0.5,0.25], unit:"kg", unitLabel:"kg", stock:40, lowStockAlert:5, minQty:1, maxQty:10, active:true, isFeatured:true, isBestSeller:false, isSeasonal:false, selectionNote:"¿Las quiere rojas o verdes?", order:1 },
  { id:"p2", name:"Plátano Tabasco", description:"Plátano maduro.", emoji:"🍌", imageUrl:"", categoryId:"cat1", sellBy:"peso", price:28, offerPrice:24, isOffer:true, fractions:[1,0.5], unit:"kg", unitLabel:"kg", stock:60, lowStockAlert:5, minQty:1, maxQty:10, active:true, isFeatured:false, isBestSeller:true, isSeasonal:false, selectionNote:"", order:2 },
  { id:"p3", name:"Cilantro", description:"Manojo fresco.", emoji:"🌿", imageUrl:"", categoryId:"cat2", sellBy:"unidad", price:12, offerPrice:0, isOffer:false, fractions:[1], unit:"manojo", unitLabel:"manojo", stock:30, lowStockAlert:5, minQty:1, maxQty:10, active:true, isFeatured:false, isBestSeller:false, isSeasonal:false, selectionNote:"", order:3 },
  { id:"p4", name:"Combo Ensalada", description:"Jitomate, cebolla y cilantro.", emoji:"🥗", imageUrl:"", categoryId:"cat3", sellBy:"unidad", price:60, offerPrice:0, isOffer:false, fractions:[1], unit:"paquete", unitLabel:"paquete", stock:0, lowStockAlert:2, minQty:1, maxQty:5, active:true, isFeatured:true, isBestSeller:false, isSeasonal:false, selectionNote:"", order:4 }
];

// ─────────── Settings ───────────
export async function fetchSettings() {
  return { ...DEFAULT_SETTINGS, ...LS.get(SETTINGS_KEY, {}) };
}
export async function saveSettings(patch) {
  const cur = await fetchSettings();
  LS.set(SETTINGS_KEY, { ...cur, ...patch });
  return { ok:true };
}

// ─────────── Categories ───────────
export async function fetchCategories() {
  const list = LS.get(CATS_KEY);
  if (!list) { LS.set(CATS_KEY, SEED_CATEGORIES); return SEED_CATEGORIES; }
  return list.filter(c => c.active !== false).sort((a,b) => (a.order||0)-(b.order||0));
}
export async function fetchAllCategories() {
  const list = LS.get(CATS_KEY);
  if (!list) { LS.set(CATS_KEY, SEED_CATEGORIES); return SEED_CATEGORIES; }
  return list.slice();
}
export async function saveCategory(cat) {
  const list = await fetchAllCategories();
  const i = list.findIndex(c => c.id === cat.id);
  if (i >= 0) list[i] = { ...list[i], ...cat };
  else list.push({ ...cat, id: cat.id || ("cat" + Date.now()) });
  LS.set(CATS_KEY, list);
  return { ok:true };
}
export async function removeCategory(id) {
  const list = (await fetchAllCategories()).filter(c => c.id !== id);
  LS.set(CATS_KEY, list);
  return { ok:true };
}

// ─────────── Zones ───────────
export async function fetchZones() {
  const list = LS.get(ZONES_KEY);
  if (!list) { LS.set(ZONES_KEY, SEED_ZONES); return SEED_ZONES; }
  return list.filter(z => z.active !== false);
}
export async function fetchAllZones() {
  const list = LS.get(ZONES_KEY);
  if (!list) { LS.set(ZONES_KEY, SEED_ZONES); return SEED_ZONES; }
  return list.slice();
}
export async function saveZone(zone) {
  const list = await fetchAllZones();
  const i = list.findIndex(z => z.id === zone.id);
  if (i >= 0) list[i] = { ...list[i], ...zone };
  else list.push({ ...zone, id: zone.id || ("z" + Date.now()) });
  LS.set(ZONES_KEY, list);
  return { ok:true };
}
export async function removeZone(id) {
  LS.set(ZONES_KEY, (await fetchAllZones()).filter(z => z.id !== id));
  return { ok:true };
}

// ─────────── Promos ───────────
export async function fetchActivePromos() {
  const list = LS.get(PROMOS_KEY, SEED_PROMOS);
  return list.filter(p => p.active !== false);
}
export async function fetchAllPromos() {
  return LS.get(PROMOS_KEY, SEED_PROMOS).slice();
}
export async function savePromo(promo) {
  const list = await fetchAllPromos();
  const i = list.findIndex(p => p.id === promo.id);
  if (i >= 0) list[i] = { ...list[i], ...promo };
  else list.push({ ...promo, id: promo.id || ("pr" + Date.now()) });
  LS.set(PROMOS_KEY, list);
  return { ok:true };
}
export async function removePromo(id) {
  LS.set(PROMOS_KEY, (await fetchAllPromos()).filter(p => p.id !== id));
  return { ok:true };
}

// ─────────── Products ───────────
export async function fetchAllActiveProducts() {
  const list = LS.get(PRODS_KEY);
  if (!list) { LS.set(PRODS_KEY, SEED_PRODUCTS); return SEED_PRODUCTS.filter(p => p.active !== false); }
  return list.filter(p => p.active !== false);
}
export async function fetchAllProducts() {
  const list = LS.get(PRODS_KEY);
  if (!list) { LS.set(PRODS_KEY, SEED_PRODUCTS); return SEED_PRODUCTS.slice(); }
  return list.slice();
}
export async function saveProduct(prod) {
  const list = await fetchAllProducts();
  const i = list.findIndex(p => p.id === prod.id);
  if (i >= 0) list[i] = { ...list[i], ...prod };
  else list.push({ ...prod, id: prod.id || ("p" + Date.now()) });
  LS.set(PRODS_KEY, list);
  return { ok:true };
}
export async function removeProduct(id) {
  LS.set(PRODS_KEY, (await fetchAllProducts()).filter(p => p.id !== id));
  return { ok:true };
}
export async function fetchProductsPage({ categoryId=null, sort="order", cursor=null, size=24 }={}) {
  let items = await fetchAllActiveProducts();
  if (categoryId) items = items.filter(p => p.categoryId === categoryId);
  if (sort === "priceAsc") items.sort((a,b) => a.price - b.price);
  if (sort === "priceDesc") items.sort((a,b) => b.price - a.price);
  if (sort === "name") items.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === "order") items.sort((a,b) => (a.order||0)-(b.order||0));
  return { items, last: null };
}

// ─────────── Orders ───────────
export async function callCreateOrder(payload) {
  // Simula latencia de red
  await new Promise(r => setTimeout(r, 600));

  const products = await fetchAllProducts();
  const map = new Map(products.map(p => [p.id, p]));
  let subtotal = 0;
  const items = [];

  for (const it of payload.items) {
    const p = map.get(it.productId);
    if (!p) throw new Error(`Producto no disponible: ${it.productId}`);
    const base = (p.isOffer && Number(p.offerPrice) > 0) ? Number(p.offerPrice) : Number(p.price);
    const unitPrice = p.sellBy === "peso" ? base * it.fraction : base;
    const lineTotal = Math.round(unitPrice * it.units * 100) / 100;
    subtotal += lineTotal;
    items.push({
      productId: p.id, name: p.name, emoji: p.emoji||"",
      sellBy: p.sellBy, fraction: it.fraction, units: it.units,
      unitPrice, lineTotal, note: it.note || ""
    });
    // Descuenta stock
    p.stock = Math.max(0, Number(p.stock||0) - (p.sellBy === "peso" ? it.fraction * it.units : it.units));
  }

  // Descuento por promo
  const promos = await fetchActivePromos();
  let discount = 0, promoLabel = "";
  for (const pr of promos) {
    if (Number(pr.minSubtotal||0) > subtotal) continue;
    const d = pr.type === "percent" ? subtotal * Number(pr.value||0) / 100 : Number(pr.value||0);
    if (d > discount) { discount = d; promoLabel = pr.name; }
  }
  discount = Math.min(discount, subtotal);

  // Envío
  const zones = await fetchZones();
  const zone = zones.find(z => z.id === payload.delivery.zoneId);
  const fee = payload.delivery.method === "domicilio" ? Number(zone?.fee || 0) : 0;
  const total = Math.round((subtotal - discount + fee) * 100) / 100;

  const settings = await fetchSettings();
  const folio = (settings.folioPrefix || "MF") + "-" + Date.now().toString().slice(-6);

  const order = {
    id: "o" + Date.now(),
    folio,
    createdAt: new Date().toISOString(),
    status: "creado",
    customer: payload.customer,
    delivery: payload.delivery,
    payment: payload.payment,
    notes: payload.notes || "",
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    promoLabel,
    fee,
    total,
    history: [{ at: new Date().toISOString(), status: "creado" }]
  };

  const list = LS.get(ORDERS_KEY, []);
  list.unshift(order);
  LS.set(ORDERS_KEY, list);
  LS.set(PRODS_KEY, products); // persiste el stock descontado

  return { ok:true, folio, orderId: order.id, total };
}

export async function fetchOrders({ phone=null } = {}) {
  const list = LS.get(ORDERS_KEY, []);
  if (phone) return list.filter(o => o.customer?.phone === phone);
  return list.slice();
}
export async function fetchOrderById(id) {
  return (LS.get(ORDERS_KEY, [])).find(o => o.id === id) || null;
}
export async function updateOrderStatus(id, status) {
  const list = LS.get(ORDERS_KEY, []);
  const o = list.find(x => x.id === id);
  if (!o) return { ok:false };
  o.status = status;
  o.history = o.history || [];
  o.history.push({ at: new Date().toISOString(), status });
  LS.set(ORDERS_KEY, list);
  return { ok:true };
}

export const callMarkFlag = async () => ({ ok:true });
export const uploadImage = async () => ""; // No hay backend de imágenes en modo local