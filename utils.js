export const fmtMoney = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n) || 0);
export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const FRACTION_LABELS = { 1: "1 kg", 0.5: "500 g", 0.25: "250 g", 0.1: "100 g" };
export const fractionLabel = (p, f) => p.sellBy === "peso" ? (FRACTION_LABELS[f] || `${f} kg`) : (p.unitLabel || p.unit || "pieza");
export function unitPriceOf(p, fraction = 1) {
  const base = (p.isOffer && Number(p.offerPrice) > 0) ? Number(p.offerPrice) : Number(p.price);
  return r2(base * (p.sellBy === "peso" ? fraction : 1));
}
export const lineTotalOf = (p, fraction, units) => r2(unitPriceOf(p, fraction) * units);
export const pctOff = (p) => (p.isOffer && p.offerPrice > 0 && p.price > p.offerPrice) ? Math.round((1 - p.offerPrice / p.price) * 100) : 0;
export const fmtDateTime = (ts) => { if (!ts) return "—"; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString("es-MX", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }); };
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
export const phoneDigits = (s) => String(s || "").replace(/\D/g, "");
export const waLink = (number, text) => `https://wa.me/${phoneDigits(number)}?text=${encodeURIComponent(text)}`;
export const WD_NAMES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
export function maxUnitsFor(p, fraction = 1) {
  const per = p.sellBy === "peso" ? fraction : 1;
  const byStock = per > 0 ? Math.floor(Number(p.stock || 0) / per) : 0;
  return Math.max(0, Math.min(byStock, p.maxQty || 99));
}
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : "xxxx-xxxx-xxxx".replace(/x/g, () => (Math.random()*16|0).toString(16));