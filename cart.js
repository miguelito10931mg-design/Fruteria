import { CART_KEY } from "./config.js";
import { r2, unitPriceOf, fractionLabel, maxUnitsFor } from "./utils.js";

let items = [];
const listeners = new Set();
function persist() { try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch(e){} }
function emit() { persist(); listeners.forEach(fn => fn(snapshot())); }
function load() { try { items = JSON.parse(localStorage.getItem(CART_KEY)) || []; if(!Array.isArray(items)) items=[]; } catch(e){ items=[]; } }
load();

export function subscribe(fn) { listeners.add(fn); fn(snapshot()); return () => listeners.delete(fn); }
export function snapshot() { return items.map(i => ({...i})); }
export function count() { return items.reduce((a,i) => a+i.units, 0); }
export function totals(freshProducts = new Map()) {
  let subtotal = 0;
  for (const i of items) { const p = freshProducts.get(i.productId) || i; subtotal += unitPriceOf(p, i.fraction) * i.units; }
  return { subtotal: r2(subtotal) };
}
export function addItem(product, fraction=1, units=1, note="") {
  const max = maxUnitsFor(product, fraction);
  if (max <= 0) return { ok:false, msg:"Producto sin existencias." };
  const key = `${product.id}|${fraction}`;
  const found = items.find(i => i.key === key);
  const nextUnits = Math.min((found ? found.units : 0) + units, max);
  if (found) { if (nextUnits === found.units && units > 0) return { ok:false, msg:`Límite de existencias (${max}).` }; found.units = nextUnits; found.note = note || found.note; }
  else { items.push({ key, productId:product.id, name:product.name, emoji:product.emoji||"", imageUrl:product.imageUrl||"", sellBy:product.sellBy, fraction, units:Math.min(units,max), note, minQty:product.minQty||1, maxQty:product.maxQty||99 }); }
  emit(); return { ok:true };
}
export function setUnits(key, units) { const it = items.find(i=>i.key===key); if(!it) return; it.units = Math.max(it.minQty||1, Math.floor(units)); emit(); }
export function removeItem(key) { items = items.filter(i=>i.key!==key); emit(); }
export function clearCart() { items = []; emit(); }
export function revalidate(productsById) {
  const issues = [];
  items = items.filter(i => {
    const p = productsById.get(i.productId);
    if (!p || p.active===false) { issues.push(`"${i.name}" ya no disponible.`); return false; }
    const max = maxUnitsFor(p, i.fraction);
    if (max <= 0) { issues.push(`"${p.name}" agotado.`); return false; }
    if (i.units > max) { i.units = max; issues.push(`"${p.name}" ajustado a ${max}.`); }
    return true;
  });
  emit(); return issues;
}