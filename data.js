// ══════════════════════════════════════════════════════════
// DATA — seedData + localAdapter (IndexedDB) + dataProvider
// ══════════════════════════════════════════════════════════
import { DEFAULT_CONFIG } from './core.js';

export const seedCategories = [
  { id: 'cat_frutas',    name: 'Frutas',             slug: 'frutas',    sortOrder: 1, isActive: true },
  { id: 'cat_verduras',  name: 'Verduras',           slug: 'verduras',  sortOrder: 2, isActive: true },
  { id: 'cat_citricos',  name: 'Cítricos',           slug: 'citricos',  sortOrder: 3, isActive: true },
  { id: 'cat_aguacates', name: 'Aguacates',          slug: 'aguacates', sortOrder: 4, isActive: true },
  { id: 'cat_tuberculos',name: 'Tubérculos',         slug: 'tuberculos',sortOrder: 5, isActive: true },
  { id: 'cat_hierbas',   name: 'Hierbas y especias', slug: 'hierbas',   sortOrder: 6, isActive: true },
  { id: 'cat_combos',    name: 'Combos y paquetes',  slug: 'combos',    sortOrder: 7, isActive: true },
  { id: 'cat_ofertas',   name: 'Ofertas',            slug: 'ofertas',   sortOrder: 8, isActive: true }
];

const KG = [
  { unit: 'kg',   factor: 1,    label: '1 kg' },
  { unit: '500g', factor: 0.5,  label: '500 g' },
  { unit: '250g', factor: 0.25, label: '250 g' }
];
const PZA = [{ unit: 'pza', factor: 1, label: '1 pieza' }];
const MAN = [{ unit: 'manojo', factor: 1, label: '1 manojo' }];

export const seedProducts = [
  { id: 'p_manzana',   name: 'Manzana Roja',      categoryId: 'cat_frutas',    priceCents: 4500, baseUnit: 'kg', stock: 30, allowedUnits: KG, minQty: 0.25, maxQty: 5, isActive: true, isFeatured: true,  isOnSale: false, salePriceCents: null, sortOrder: 1, description: 'Manzana roja crujiente.' },
  { id: 'p_platano',   name: 'Plátano Tabasco',   categoryId: 'cat_frutas',    priceCents: 2200, baseUnit: 'kg', stock: 40, allowedUnits: KG, minQty: 0.5,  maxQty: 5, isActive: true, isFeatured: true,  isOnSale: false, salePriceCents: null, sortOrder: 2, description: 'Plátano maduro.' },
  { id: 'p_naranja',   name: 'Naranja Valencia',  categoryId: 'cat_citricos',  priceCents: 2800, baseUnit: 'kg', stock: 35, allowedUnits: KG, minQty: 0.5,  maxQty: 5, isActive: true, isFeatured: false, isOnSale: true,  salePriceCents: 2400, sortOrder: 1, description: 'Naranja dulce.' },
  { id: 'p_limon',     name: 'Limón Persa',       categoryId: 'cat_citricos',  priceCents: 3200, baseUnit: 'kg', stock: 20, allowedUnits: KG, minQty: 0.25, maxQty: 3, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 2, description: 'Sin semilla.' },
  { id: 'p_aguacate',  name: 'Aguacate Hass',     categoryId: 'cat_aguacates', priceCents: 8000, baseUnit: 'kg', stock: 15, allowedUnits: KG, minQty: 0.25, maxQty: 3, isActive: true, isFeatured: true,  isOnSale: false, salePriceCents: null, sortOrder: 1, description: 'Maduro.' },
  { id: 'p_jitomate',  name: 'Jitomate Saladet',  categoryId: 'cat_verduras',  priceCents: 2900, baseUnit: 'kg', stock: 25, allowedUnits: KG, minQty: 0.25, maxQty: 5, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 1, description: 'Fresco.' },
  { id: 'p_cebolla',   name: 'Cebolla Blanca',    categoryId: 'cat_verduras',  priceCents: 2400, baseUnit: 'kg', stock: 30, allowedUnits: KG, minQty: 0.25, maxQty: 5, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 2, description: 'Fresca.' },
  { id: 'p_zanahoria', name: 'Zanahoria',         categoryId: 'cat_tuberculos',priceCents: 1800, baseUnit: 'kg', stock: 28, allowedUnits: KG, minQty: 0.25, maxQty: 5, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 1, description: 'Dulce.' },
  { id: 'p_papa',      name: 'Papa Blanca',       categoryId: 'cat_tuberculos',priceCents: 2600, baseUnit: 'kg', stock: 40, allowedUnits: KG, minQty: 0.5,  maxQty: 10, isActive: true, isFeatured: true, isOnSale: false, salePriceCents: null, sortOrder: 2, description: 'Para guisos.' },
  { id: 'p_cilantro',  name: 'Cilantro',          categoryId: 'cat_hierbas',   priceCents: 800,  baseUnit: 'manojo', stock: 20, allowedUnits: MAN, minQty: 1, maxQty: 5, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 1, description: 'Manojo fresco.' },
  { id: 'p_perejil',   name: 'Perejil',           categoryId: 'cat_hierbas',   priceCents: 900,  baseUnit: 'manojo', stock: 15, allowedUnits: MAN, minQty: 1, maxQty: 5, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 2, description: 'Manojo fresco.' },
  { id: 'p_combo_verde', name: 'Combo Verde',     categoryId: 'cat_combos',    priceCents: 12000, baseUnit: 'pza', stock: 10, allowedUnits: PZA, minQty: 1, maxQty: 3, isActive: true, isFeatured: true, isOnSale: false, salePriceCents: null, sortOrder: 1, description: 'Jitomate, cebolla, zanahoria, cilantro.' },
  { id: 'p_combo_frutas', name: 'Combo Frutal',   categoryId: 'cat_combos',    priceCents: 15000, baseUnit: 'pza', stock: 8, allowedUnits: PZA, minQty: 1, maxQty: 3, isActive: true, isFeatured: false, isOnSale: true, salePriceCents: 13000, sortOrder: 2, description: 'Manzana, plátano y naranja.' },
  { id: 'p_tomate_verde', name: 'Tomate Verde',   categoryId: 'cat_verduras',  priceCents: 2600, baseUnit: 'kg', stock: 18, allowedUnits: KG, minQty: 0.25, maxQty: 3, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 3, description: 'Para salsa.' },
  { id: 'p_pepino',    name: 'Pepino',            categoryId: 'cat_verduras',  priceCents: 1900, baseUnit: 'kg', stock: 0,  allowedUnits: KG, minQty: 0.25, maxQty: 3, isActive: true, isFeatured: false, isOnSale: false, salePriceCents: null, sortOrder: 4, description: 'Agotado temporalmente.' }
];

// ---- IndexedDB ----
const DB_NAME = 'mi_fruteria';
const DB_VERSION = 1;
let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('products')) {
        const s = db.createObjectStore('products', { keyPath: 'id' });
        s.createIndex('categoryId', 'categoryId');
        s.createIndex('isActive', 'isActive');
      }
      if (!db.objectStoreNames.contains('categories')) db.createObjectStore('categories', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('orders')) {
        const s = db.createObjectStore('orders', { keyPath: 'id' });
        s.createIndex('idempotencyKey', 'idempotencyKey');
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('counters')) db.createObjectStore('counters', { keyPath: 'name' });
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbPromise;
}
const tx = (n, m = 'readonly') => openDB().then(db => db.transaction(n, m).objectStore(n));
const p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

async function seedIfEmpty() {
  const st = await tx('products', 'readwrite');
  if (await p(st.count()) > 0) return;
  const cs = await tx('categories', 'readwrite');
  seedCategories.forEach(c => cs.put(c));
  seedProducts.forEach(pr => {
    const now = Date.now();
    st.put({ ...pr, imageUrl: pr.imageUrl || '', createdAt: now, updatedAt: now });
  });
  (await tx('settings', 'readwrite')).put({ key: 'business', value: DEFAULT_CONFIG });
}

const localAdapter = {
  async init() { await seedIfEmpty(); },
  async listProducts({ activeOnly = true } = {}) {
    const all = await p((await tx('products')).getAll());
    return activeOnly ? all.filter(x => x.isActive) : all;
  },
  async getProductById(id) { return p((await tx('products')).get(id)); },
  async upsertProduct(product) {
    const s = await tx('products', 'readwrite');
    const now = Date.now();
    const ex = await p(s.get(product.id));
    const rec = { ...ex, ...product, createdAt: ex?.createdAt || now, updatedAt: now };
    await p(s.put(rec));
    return rec;
  },
  async deleteProduct(id) { return p((await tx('products', 'readwrite')).delete(id)); },
  async listCategories() { return p((await tx('categories')).getAll()); },
  async getSettings() {
    const r = await p((await tx('settings')).get('business'));
    return r?.value || DEFAULT_CONFIG;
  },
  async saveSettings(v) {
    await p((await tx('settings', 'readwrite')).put({ key: 'business', value: v }));
    return v;
  },
  async getOrderByKey(k) { return p((await tx('orders')).index('idempotencyKey').get(k)); },
  async createOrder(o) { await p((await tx('orders', 'readwrite')).put(o)); return o; },
  async listOrders({ limit = 200 } = {}) {
    const all = await p((await tx('orders')).getAll());
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },
  async updateOrderStatus(id, status, extra = {}) {
    const s = await tx('orders', 'readwrite');
    const o = await p(s.get(id));
    if (!o) throw new Error('Pedido no encontrado');
    o.status = status; o.updatedAt = Date.now();
    o.statusHistory = o.statusHistory || [];
    o.statusHistory.push({ status, at: Date.now(), ...extra });
    await p(s.put(o));
    return o;
  },
  async nextOrderFolio() {
    const s = await tx('counters', 'readwrite');
    const year = new Date().getFullYear();
    const k = `order_${year}`;
    const cur = await p(s.get(k));
    const seq = (cur?.value || 0) + 1;
    await p(s.put({ name: k, value: seq }));
    return `MF-${year}-${String(seq).padStart(4, '0')}`;
  }
};

// ---- dataProvider ----
let productsCache = null;
export const dataProvider = {
  async init() {
    await localAdapter.init();
    productsCache = await localAdapter.listProducts({ activeOnly: false });
  },
  async getProducts({ activeOnly = true } = {}) {
    if (!productsCache) productsCache = await localAdapter.listProducts({ activeOnly: false });
    return activeOnly ? productsCache.filter(x => x.isActive) : [...productsCache];
  },
  getProductById(id) { return productsCache?.find(x => x.id === id) || null; },
  async refreshProducts() {
    productsCache = await localAdapter.listProducts({ activeOnly: false });
    return productsCache;
  },
  async upsertProduct(prod) {
    const saved = await localAdapter.upsertProduct(prod);
    await this.refreshProducts();
    return saved;
  },
  async deleteProduct(id) { await localAdapter.deleteProduct(id); await this.refreshProducts(); },
  getCategories: () => localAdapter.listCategories(),
  getSettings: () => localAdapter.getSettings(),
  saveSettings: (v) => localAdapter.saveSettings(v),
  getOrderByKey: (k) => localAdapter.getOrderByKey(k),
  createOrder: (o) => localAdapter.createOrder(o),
  listOrders: (opts) => localAdapter.listOrders(opts),
  updateOrderStatus: (id, s, e) => localAdapter.updateOrderStatus(id, s, e),
  nextOrderFolio: () => localAdapter.nextOrderFolio()
};

// ---- firebaseAdapter (stub) ----
export const firebaseAdapter = {
  async init() { throw new Error('firebaseAdapter no implementado todavía.'); }
};