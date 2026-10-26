import { GUEST_KEY } from "./config.js";

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

export async function fetchSettings() { return DEFAULT_SETTINGS; }
export async function fetchCategories() { return [{ id:"cat1", name:"Frutas", emoji:"🍎", order:1, active:true }, { id:"cat2", name:"Verduras", emoji:"🥦", order:2, active:true }, { id:"cat3", name:"Combos", emoji:"🧺", order:3, active:true }]; }
export async function fetchZones() { return [{ id:"z1", name:"Zona Centro", fee:35, minOrder:150, active:true }]; }
export async function fetchActivePromos() { return []; }
export async function fetchAllActiveProducts() {
  return [
    { id:"p1", name:"Manzana Roja", description:"Manzanas frescas de importación.", emoji:"🍎", imageUrl:"", categoryId:"cat1", sellBy:"peso", price:52, offerPrice:0, isOffer:false, fractions:[1,0.5,0.25], unit:"kg", unitLabel:"kg", stock:40, lowStockAlert:5, minQty:1, maxQty:10, active:true, isFeatured:true, isBestSeller:false, isSeasonal:false, selectionNote:"¿Las quiere rojas o verdes?", order:1 },
    { id:"p2", name:"Plátano Tabasco", description:"Plátano maduro.", emoji:"🍌", imageUrl:"", categoryId:"cat1", sellBy:"peso", price:28, offerPrice:24, isOffer:true, fractions:[1,0.5], unit:"kg", unitLabel:"kg", stock:60, lowStockAlert:5, minQty:1, maxQty:10, active:true, isFeatured:false, isBestSeller:true, isSeasonal:false, selectionNote:"", order:2 },
    { id:"p3", name:"Cilantro", description:"Manojo fresco.", emoji:"🌿", imageUrl:"", categoryId:"cat2", sellBy:"unidad", price:12, offerPrice:0, isOffer:false, fractions:[1], unit:"manojo", unitLabel:"manojo", stock:30, lowStockAlert:5, minQty:1, maxQty:10, active:true, isFeatured:false, isBestSeller:false, isSeasonal:false, selectionNote:"", order:3 },
    { id:"p4", name:"Combo Ensalada", description:"Jitomate, cebolla y cilantro.", emoji:"🥗", imageUrl:"", categoryId:"cat3", sellBy:"unidad", price:60, offerPrice:0, isOffer:false, fractions:[1], unit:"paquete", unitLabel:"paquete", stock:0, lowStockAlert:2, minQty:1, maxQty:5, active:true, isFeatured:true, isBestSeller:false, isSeasonal:false, selectionNote:"", order:4 }
  ];
}
export async function fetchProductsPage({ categoryId=null, sort="order", cursor=null, size=24 }={}) {
  let items = await fetchAllActiveProducts();
  if (categoryId) items = items.filter(p => p.categoryId === categoryId);
  if (sort === "priceAsc") items.sort((a,b) => a.price - b.price);
  if (sort === "priceDesc") items.sort((a,b) => b.price - a.price);
  return { items, last: null };
}
export const callCreateOrder = async () => { throw new Error("Modo local: Backend no conectado aún."); };
export const callMarkFlag = async () => {};
export const saveDoc = async () => {};
export const addDoc = async () => {};
export const removeDoc = async () => {};
export const watchOrders = (cb) => cb([]);
export const uploadImage = async () => "";