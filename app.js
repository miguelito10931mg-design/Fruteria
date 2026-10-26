import { fetchSettings, fetchCategories, fetchZones, fetchActivePromos, fetchProductsPage, fetchAllActiveProducts, callCreateOrder, callMarkFlag, fetchOrders } from "./api.js";
import * as Cart from "./cart.js";
import { fmtMoney, fmtDateTime, escapeHtml, unitPriceOf, lineTotalOf, fractionLabel, pctOff, maxUnitsFor, debounce, waLink, phoneDigits, WD_NAMES, uid as genId } from "./utils.js";
import { GUEST_KEY } from "./config.js";

const S = { settings:null, categories:[], products:new Map(), user:null, profile:null, zones:[], promos:[] };
const $view = document.getElementById("view");
const toast = (msg, type="") => { const el=document.createElement("div"); el.className=`toast ${type}`; el.textContent=msg; document.getElementById("toasts").appendChild(el); setTimeout(()=>el.remove(),3800); };
function modal(html, {onOpen}={}) {
  const root=document.getElementById("modal-root"); root.innerHTML=`<div class="modal-back" id="mb"><div class="modal">${html}</div></div>`;
  const close=()=>{root.innerHTML="";document.removeEventListener("keydown",esc)}; const esc=e=>e.key==="Escape"&&close();
  document.addEventListener("keydown",esc); document.getElementById("mb").addEventListener("click",e=>{if(e.target.id==="mb")close()});
  root.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",close)); if(onOpen)onOpen(close); return close;
}

async function boot() {
  S.settings = await fetchSettings(); applyBrand();
  try { S.categories = await fetchCategories(); } catch(e){}
  Cart.subscribe(updateCartBadge);
  window.addEventListener("online", ()=>document.getElementById("offline-bar").hidden=true);
  window.addEventListener("offline", ()=>document.getElementById("offline-bar").hidden=false);
  if(!navigator.onLine) document.getElementById("offline-bar").hidden=false;
  document.getElementById("search-form").addEventListener("submit", e=>{ e.preventDefault(); location.hash=`#/catalogo?q=${encodeURIComponent(document.getElementById("search-input").value.trim())}`; });
  registerSW(); route(); window.addEventListener("hashchange", route);
}
function applyBrand() {
  const s=S.settings, r=document.documentElement.style;
  r.setProperty("--brand", s.brand?.colors?.primary||"#1E7A46"); r.setProperty("--accent", s.brand?.colors?.accent||"#FF8A3D");
  document.getElementById("brand-name").textContent=s.brand?.name||"Mi Frutería"; document.title=`${s.brand?.name||"Mi Frutería"} — ${s.brand?.slogan||""}`;
  document.querySelector('meta[name="theme-color"]').content=s.brand?.colors?.primary||"#1E7A46";
  const lg=document.getElementById("brand-logo"); if(lg) lg.innerHTML=s.brand?.logoUrl?`<img src="${escapeHtml(s.brand.logoUrl)}" alt="">`:`<img src="icon.svg" alt="">`;
  const wa=document.getElementById("wa-float"); if(phoneDigits(s.contact?.whatsapp)){wa.hidden=false;wa.href=waLink(s.contact.whatsapp,`Hola ${s.brand?.name||""}, tengo una consulta 🍎`);}
}
function updateCartBadge() { const n=Cart.count(), el=document.getElementById("cart-count"); el.hidden=n===0; el.textContent=n; }
function registerSW() { if(!("serviceWorker" in navigator))return; navigator.serviceWorker.register("sw.js").catch(()=>{}); }

const routes = [[/^#\/inicio\/?$/,viewHome],[/^#\/catalogo\/?/,viewCatalog],[/^#\/producto\/(.+)$/,viewProduct],[/^#\/carrito\/?$/,viewCart],[/^#\/checkout\/?$/,viewCheckout],[/^#\/exito\/?$/,viewSuccess],[/^#\/cuenta\/?$/,viewAccount],[/^#\/pedidos\/?$/,viewOrders]];
function route() {
  const h=location.hash||"#/inicio"; document.querySelectorAll("[data-nav]").forEach(a=>a.classList.toggle("active",h.startsWith(a.getAttribute("href"))));
  const match=routes.find(([re])=>re.test(h)); (match?match[1]:viewHome)(h); $view.focus({preventScroll:true}); window.scrollTo(0,0);
}
async function ensureProducts() { if(S.products.size)return[...S.products.values()]; const all=await fetchAllActiveProducts(); S.products=new Map(all.map(p=>[p.id,p])); Cart.revalidate(S.products); return all; }

function productImg(p,cls="ph"){ return p.imageUrl?`<div class="${cls}"><img loading="lazy" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.name)}"></div>`:`<div class="${cls}" role="img" aria-label="${escapeHtml(p.name)}">${p.emoji||"🥬"}</div>`; }
function priceLine(p){ const off=pctOff(p), per=p.sellBy==="peso"?"/kg":`/${p.unitLabel||p.unit||"pieza"}`; if(off>0)return`<div class="pr">${fmtMoney(p.offerPrice)} <small>${per}</small></div><div class="old">${fmtMoney(p.price)}</div>`; return`<div class="pr">${fmtMoney(p.price)} <small>${per}</small></div>`; }
function cardHTML(p){
  const out=Number(p.stock)<=0, off=pctOff(p), quick=p.sellBy==="unidad";
  return`<article class="pcard" data-pid="${p.id}">${off>0?`<span class="badge">-${off}%</span>`:""}${p.isSeasonal?`<span class="badge season">Temporada</span>`:""}${out?`<div class="out-stock">Agotado</div>`:""}<a href="#/producto/${p.id}">${productImg(p)}</a><div class="bd"><a href="#/producto/${p.id}"><div class="nm">${escapeHtml(p.name)}</div></a>${priceLine(p)}${out?"":quick?`<button class="btn btn-sm add" data-add="${p.id}">Agregar +</button>`:`<a class="btn btn-sm btn-outline add" href="#/producto/${p.id}">Elegir peso</a>`}</div></article>`;
}
function bindCards(scope){ scope.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>{ const p=S.products.get(b.dataset.add); if(!p)return; const res=Cart.addItem(p,1,p.minQty||1); toast(res.ok?`${p.name} agregado 🛒`:res.msg,res.ok?"ok":"err"); })); }
const rail=(title,items,linkHash)=>items.length?`<section class="block"><div class="block-h"><h2>${title}</h2>${linkHash?`<a href="${linkHash}">Ver todo</a>`:""}</div><div class="rail">${items.map(cardHTML).join("")}</div></section>`:"";

async function viewHome(){
  $view.innerHTML=`<div class="spinner"></div>`; const prods=await ensureProducts(), s=S.settings;
  const byCat=(slug)=>{const cat=S.categories.find(c=>c.name.toLowerCase().includes(slug));return cat?prods.filter(p=>p.categoryId===cat.id).slice(0,10):[];};
  $view.innerHTML=`${s.banner?.active?`<section class="hero"><h1>${escapeHtml(s.banner.title||"")}</h1><p>${escapeHtml(s.banner.subtitle||"")}</p><a class="btn btn-accent" href="#/catalogo">${escapeHtml(s.banner.cta||"Ver catálogo")}</a></section>`:""}
  <section class="block"><div class="block-h"><h2>Categorías</h2></div><div class="rail">${S.categories.map(c=>`<a class="cat-tile" href="#/catalogo?cat=${c.id}"><div class="e">${c.emoji||"🥬"}</div><div class="n">${escapeHtml(c.name)}</div></a>`).join("")}</div></section>
  ${rail("⭐ Destacados",prods.filter(p=>p.isFeatured).slice(0,10),"#/catalogo")}${rail("🏷️ Ofertas",prods.filter(p=>pctOff(p)>0).slice(0,10),"#/catalogo?ofertas=1")}${rail("🔥 Más vendidos",prods.filter(p=>p.isBestSeller).slice(0,10))}${rail("🍂 De temporada",prods.filter(p=>p.isSeasonal).slice(0,10))}${rail("🧺 Combos",byCat("combo"))}
  <section class="block"><div class="row" style="align-items:stretch"><div class="card" style="flex:1"><h3 style="margin-top:0">🚚 Entregas</h3><p class="muted" style="font-size:14px">${escapeHtml(s.messages?.deliveryInfo||"")}</p>${Number(s.delivery?.minOrder)>0?`<p class="muted" style="font-size:14px">Pedido mínimo: <b>${fmtMoney(s.delivery.minOrder)}</b></p>`:""}</div><div class="card" style="flex:1"><h3 style="margin-top:0">🕘 Horario</h3><p class="muted" style="font-size:14px">${escapeHtml(s.hours?.open||"")} – ${escapeHtml(s.hours?.close||"")}</p><p class="muted" style="font-size:14px">${(s.closedDays||[]).length?"Descansamos: "+s.closedDays.map(d=>WD_NAMES[d]).join(", "):"Abierto toda la semana"}</p></div></div></section>
  <div class="center block"><a class="btn btn-block" href="#/catalogo">Explorar catálogo completo 🥦</a></div>
  <footer class="site"><b>${escapeHtml(s.brand?.name||"")}</b> · ${escapeHtml(s.brand?.slogan||"")}<br>${escapeHtml(s.address?.street||"")} ${escapeHtml(s.address?.city||"")}<br>${s.contact?.phone?`📞 ${escapeHtml(s.contact.phone)} · `:""}${s.contact?.email?`✉️ ${escapeHtml(s.contact.email)}`:""}<br><span>Pedidos sujetos a disponibilidad. El total por peso es estimado.</span></footer>`;
  bindCards($view);
}

const catState={items:[],cursor:null,loading:false,done:false,q:"",cat:"",sort:"order",ofertas:false,soloStock:false,pMin:"",pMax:""};
async function viewCatalog(hash){
  const params=new URLSearchParams(hash.split("?")[1]||""); catState.q=params.get("q")||catState.q; catState.cat=params.get("cat")||""; catState.ofertas=params.get("ofertas")==="1"; document.getElementById("search-input").value=catState.q;
  $view.innerHTML=`<section class="block" style="margin-top:4px"><div class="chips" id="cat-chips"><button class="chip ${!catState.cat?"active":""}" data-cat="">Todo</button>${S.categories.map(c=>`<button class="chip ${catState.cat===c.id?"active":""}" data-cat="${c.id}">${c.emoji||""} ${escapeHtml(c.name)}</button>`).join("")}</div>
  <div class="row" style="margin-top:10px"><select id="f-sort"><option value="order">Relevancia</option><option value="priceAsc">Precio ↑</option><option value="priceDesc">Precio ↓</option><option value="name">Nombre A-Z</option></select></div>
  <div class="row" style="margin-top:8px"><label class="chip" style="cursor:pointer"><input type="checkbox" id="f-stock" ${catState.soloStock?"checked":""}> Solo disponibles</label><input id="f-min" type="number" placeholder="$ mín"><input id="f-max" type="number" placeholder="$ máx"></div></section><div id="cat-grid" class="grid"></div><div id="cat-more" class="center" style="margin-top:14px"></div>`;
  document.getElementById("cat-chips").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;catState.cat=b.dataset.cat;viewCatalog(hash)});
  document.getElementById("f-sort").onchange=e=>{catState.sort=e.target.value;resetCat()};
  document.getElementById("f-stock").onchange=e=>{catState.soloStock=e.target.checked;renderCat()};
  const refilter=debounce(()=>{catState.pMin=document.getElementById("f-min").value;catState.pMax=document.getElementById("f-max").value;renderCat()},300);
  document.getElementById("f-min").oninput=refilter; document.getElementById("f-max").oninput=refilter; resetCat();
}
function resetCat(){catState.items=[];catState.cursor=null;catState.done=false;loadCatPage()}
async function loadCatPage(){
  if(catState.loading||catState.done)return; catState.loading=true; document.getElementById("cat-more").innerHTML=`<div class="spinner"></div>`;
  try{const page=await fetchProductsPage({categoryId:catState.cat||null,sort:catState.sort,cursor:catState.cursor});catState.items.push(...page.items);catState.cursor=page.last;if(!page.last||page.items.length<24)catState.done=true;renderCat();}catch(e){document.getElementById("cat-more").innerHTML=`<p class="muted">Error de conexión.</p>`;}catState.loading=false;
}
function renderCat(){
  const q=catState.q.toLowerCase(); let list=catState.items.filter(p=>{if(q&&!p.name.toLowerCase().includes(q)&&!(p.description||"").toLowerCase().includes(q))return false;if(catState.ofertas&&pctOff(p)===0)return false;if(catState.soloStock&&Number(p.stock)<=0)return false;const price=(p.isOffer&&p.offerPrice>0)?p.offerPrice:p.price;if(catState.pMin&&price<Number(catState.pMin))return false;if(catState.pMax&&price>Number(catState.pMax))return false;return true;});
  const grid=document.getElementById("cat-grid"); grid.innerHTML=list.length?list.map(cardHTML).join(""):`<div class="empty" style="grid-column:1/-1"><div class="e">🔍</div><p>Sin resultados con esos criterios.</p></div>`; bindCards(grid);
  document.getElementById("cat-more").innerHTML=catState.done?"":`<button class="btn btn-ghost" id="more-btn">Cargar más</button>`; const mb=document.getElementById("more-btn"); if(mb)mb.onclick=loadCatPage;
}

async function viewProduct(hash){
  const id=hash.match(/^#\/producto\/(.+)$/)[1]; $view.innerHTML=`<div class="spinner"></div>`; await ensureProducts(); const p=S.products.get(id);
  if(!p){$view.innerHTML=`<div class="empty"><div class="e">😕</div>Producto no encontrado.</div>`;return;}
  const frs=p.sellBy==="peso"?(p.fractions||[1]):[1];
  $view.innerHTML=`<nav style="font-size:13px" class="muted"><a href="#/catalogo">← Catálogo</a></nav><div class="card" style="margin-top:10px">${productImg(p,"ph")}<style>.card>.ph{height:220px;border-radius:16px;font-size:96px;display:grid;place-items:center;background:linear-gradient(140deg,#EAF6EC,#FDF6E9);overflow:hidden}.card>.ph img{width:100%;height:100%;object-fit:cover}</style><h1 style="font-size:22px;margin:14px 0 4px">${escapeHtml(p.name)}</h1><div style="font-size:20px;font-weight:800;color:var(--brand-dark)">${fmtMoney((p.isOffer&&p.offerPrice>0)?p.offerPrice:p.price)} <small class="muted" style="font-weight:600">${p.sellBy==="peso"?"por kilogramo":"por "+(p.unitLabel||p.unit||"pieza")}</small></div>${pctOff(p)>0?`<div class="old" style="font-size:14px">Antes ${fmtMoney(p.price)}</div>`:""}<p class="muted">${escapeHtml(p.description||"")}</p>${p.selectionNote?`<p class="muted" style="font-size:13px">📝 ${escapeHtml(p.selectionNote)}</p>`:""}<p class="muted" style="font-size:13px">${Number(p.stock)>0?"✔ "+(p.sellBy==="peso"?`${p.stock} kg en existencia`:`${Math.floor(p.stock)} en existencia`):"❌ Agotado"}</p>
  ${Number(p.stock)>0?`${p.sellBy==="peso"?`<div class="field"><label>Presentación</label><div class="chips" id="fr-chips">${frs.map((f,i)=>`<button class="chip ${i===0?"active":""}" data-fr="${f}">${fractionLabel(p,f)} · ${fmtMoney(unitPriceOf(p,f))}</button>`).join("")}</div></div>`:""}<div class="field"><label>Cantidad</label><div class="qty"><button id="q-minus">−</button><span id="q-val">${p.minQty||1}</span><button id="q-plus">+</button></div><span class="muted" style="font-size:12px;margin-left:10px">máx. ${maxUnitsFor(p,frs[0])}</span></div><div class="field"><label>Indicaciones (opcional)</label><input id="p-note" maxlength="120" placeholder="Ej. aguacate para hoy…"></div><div class="summary" style="position:static"><div class="r total"><span>Total</span><span id="p-total">${fmtMoney(unitPriceOf(p,frs[0])*(p.minQty||1))}</span></div>${p.sellBy==="peso"?`<div class="note-est">* Importe estimado: el peso real puede variar ligeramente.</div>`:""}</div><button class="btn btn-block btn-accent" id="add-btn" style="margin-top:12px">Agregar al carrito 🛒</button>`:""}</div>`;
  if(Number(p.stock)<=0)return; let fraction=frs[0],units=p.minQty||1; const max=()=>maxUnitsFor(p,fraction);
  const paint=()=>{document.getElementById("q-val").textContent=units;document.getElementById("p-total").textContent=fmtMoney(lineTotalOf(p,fraction,units))};
  if(p.sellBy==="peso")document.getElementById("fr-chips").addEventListener("click",e=>{const b=e.target.closest("[data-fr]");if(!b)return;document.querySelectorAll("#fr-chips .chip").forEach(c=>c.classList.remove("active"));b.classList.add("active");fraction=Number(b.dataset.fr);units=Math.min(units,Math.max(p.minQty||1,max()));paint()});
  document.getElementById("q-minus").onclick=()=>{units=Math.max(p.minQty||1,units-1);paint()};
  document.getElementById("q-plus").onclick=()=>{if(units>=max())return toast(`Límite: ${max()}`,"err");units++;paint()};
  document.getElementById("add-btn").onclick=()=>{const note=document.getElementById("p-note").value.trim();const res=Cart.addItem(p,fraction,units,note);toast(res.ok?"Agregado 🛒":res.msg,res.ok?"ok":"err");if(res.ok)setTimeout(()=>location.hash="#/carrito",450)}; paint();
}

function viewCart(){
  const items=Cart.snapshot(); if(!items.length){$view.innerHTML=`<div class="empty"><div class="e">🛒</div><h2>Tu carrito está vacío</h2><a class="btn" href="#/catalogo">Ir al catálogo</a></div>`;return;}
  const {subtotal}=Cart.totals(S.products), hasWeight=items.some(i=>(S.products.get(i.productId)||i).sellBy==="peso");
  $view.innerHTML=`<div class="block-h"><h2>🛒 Tu carrito</h2><button class="btn btn-sm btn-ghost" id="empty-cart" style="color:var(--danger)">Vaciar</button></div><div id="cart-items"></div><div class="summary"><div class="r"><span>Subtotal</span><b>${fmtMoney(subtotal)}</b></div><div class="r"><span>Envío</span><span class="muted">Se calcula después</span></div>${hasWeight?`<div class="note-est">Incluye productos por peso: total estimado.</div>`:""}<div class="r total"><span>Total estimado</span><span>${fmtMoney(subtotal)}</span></div><a class="btn btn-block btn-accent" href="#/checkout" style="margin-top:10px">Continuar →</a><a class="btn btn-block btn-ghost" href="#/catalogo" style="margin-top:8px">Seguir comprando</a></div>`;
  const renderItems=()=>{const list=Cart.snapshot();document.getElementById("cart-items").innerHTML=list.map(it=>{const p=S.products.get(it.productId)||it;const up=unitPriceOf(p,it.fraction);return`<div class="citem" data-key="${it.key}">${productImg(p)}<div class="info"><div class="nm">${escapeHtml(it.name)}</div><div class="meta">${fractionLabel(p,it.fraction)} · ${fmtMoney(up)} c/u${it.note?` · 📝 ${escapeHtml(it.note)}`:""}</div><div class="line"><div class="qty"><button data-act="minus">−</button><span>${it.units}</span><button data-act="plus">+</button></div><span class="lt">${fmtMoney(lineTotalOf(p,it.fraction,it.units))}</span></div><button class="rm" data-act="rm">Eliminar</button></div></div>`;}).join("");
  document.querySelectorAll("#cart-items .citem").forEach(el=>{const key=el.dataset.key;el.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("click",()=>{const it=Cart.snapshot().find(i=>i.key===key);const p=S.products.get(it.productId)||it;if(b.dataset.act==="plus"){const mx=maxUnitsFor(p,it.fraction);if(it.units>=mx)return toast(`Máximo: ${mx}`,"err");Cart.setUnits(key,it.units+1)}else if(b.dataset.act==="minus")Cart.setUnits(key,it.units-1);else Cart.removeItem(key);viewCart()}))})};
  renderItems(); document.getElementById("empty-cart").onclick=()=>modal(`<h3>¿Vaciar carrito?</h3><button class="btn btn-danger btn-block" id="confirm-empty">Sí, vaciar</button><button class="btn btn-ghost btn-block" data-close style="margin-top:8px">Cancelar</button>`,{onOpen:c=>document.getElementById("confirm-empty").onclick=()=>{Cart.clearCart();c();viewCart()}});
}

const CO={step:1,name:"",phone:"",method:"domicilio",zoneId:"",address:"",refs:"",when:"hoy",slotId:"",notes:"",idem:null,busy:false};
async function viewCheckout(){
  const items=Cart.snapshot(); if(!items.length){location.hash="#/carrito";return;} await ensureProducts(); Cart.revalidate(S.products); if(!Cart.snapshot().length){location.hash="#/carrito";return;}
  S.zones=await fetchZones(); S.promos=await fetchActivePromos(); const s=S.settings;
  let guest={};try{guest=JSON.parse(localStorage.getItem(GUEST_KEY))||{}}catch(e){}
  CO.name=S.profile?.name||guest.name||"";CO.phone=S.profile?.phone||guest.phone||"";CO.address=S.profile?.addresses?.[0]?.text||guest.address||"";CO.refs=guest.refs||"";CO.step=1;CO.idem=null;
  $view.innerHTML=`<h2 style="margin-top:4px">Finalizar pedido</h2><div class="stepper"><i id="st1" class="on"></i><i id="st2"></i><i id="st3"></i><i id="st4"></i></div><div id="co-body"></div>`; renderCO();
}
function coSummaryNumbers(){const{subtotal}=Cart.totals(S.products);const zone=S.zones.find(z=>z.id===CO.zoneId);const fee=CO.method==="domicilio"?Number(zone?.fee||0):0;let discount=0,label="";for(const pr of S.promos){if(Number(pr.minSubtotal||0)>subtotal)continue;const d=pr.type==="percent"?subtotal*Number(pr.value||0)/100:Number(pr.value||0);if(d>discount){discount=d;label=pr.name}}discount=Math.min(discount,subtotal);return{subtotal,fee,discount,label,total:subtotal-discount+fee}}
function renderCO(){
  const s=S.settings,body=document.getElementById("co-body"); for(let i=1;i<=4;i++)document.getElementById("st"+i).classList.toggle("on",i<=CO.step); const slots=(s.deliverySlots||[]).filter(x=>x.active!==false);
  if(CO.step===1)body.innerHTML=`<div class="card"><h3>1 · Tus datos</h3><p class="muted">Compra como invitado (modo local).</p><div class="field"><label>Nombre *</label><input id="co-name" value="${escapeHtml(CO.name)}"></div><div class="field"><label>Teléfono *</label><input id="co-phone" type="tel" value="${escapeHtml(CO.phone)}"></div><button class="btn btn-block" id="co-next">Continuar →</button></div>`;
  if(CO.step===2)body.innerHTML=`<div class="card"><h3>2 · Entrega</h3><div class="row">${s.delivery?.enabled?`<button class="btn ${CO.method==="domicilio"?"":"btn-ghost"}" id="m-dom" style="flex:1">🚚 Domicilio</button>`:""}${s.delivery?.pickupEnabled?`<button class="btn ${CO.method==="recoger"?"":"btn-ghost"}" id="m-pick" style="flex:1">🏪 Recoger</button>`:""}</div><div id="dom-fields" ${CO.method==="recoger"?"hidden":""}><div class="field"><label>Zona *</label><select id="co-zone"><option value="">Selecciona…</option>${S.zones.map(z=>`<option value="${z.id}" ${CO.zoneId===z.id?"selected":""}>${escapeHtml(z.name)} — ${fmtMoney(z.fee)}</option>`).join("")}</select></div><div class="field"><label>Dirección *</label><textarea id="co-addr" rows="2">${escapeHtml(CO.address)}</textarea></div><div class="field"><label>Referencias</label><input id="co-refs" value="${escapeHtml(CO.refs)}"></div></div><div id="pick-fields" ${CO.method==="domicilio"?"hidden":""}><p>📍 Recoge en: <b>${escapeHtml(s.address?.street||"")}</b></p></div><div class="row"><button class="btn btn-ghost" id="co-back">← Atrás</button><button class="btn" id="co-next">Continuar →</button></div></div>`;
  if(CO.step===3)body.innerHTML=`<div class="card"><h3>3 · Horario y pago</h3><div class="field"><label>¿Cuándo?</label><div class="chips"><button class="chip ${CO.when==="hoy"?"active":""}" data-when="hoy">Hoy</button><button class="chip ${CO.when==="manana"?"active":""}" data-when="manana">Mañana</button></div></div><div class="field"><label>Horario *</label><div class="chips">${slots.map(sl=>`<button class="chip ${CO.slotId===sl.id?"active":""}" data-slot="${sl.id}">⏰ ${escapeHtml(sl.label)}</button>`).join("")}</div></div><div class="field"><label>Pago</label><label class="chip" style="cursor:pointer;width:100%"><input type="radio" checked> 💵 Efectivo</label></div><div class="field"><label>Notas</label><textarea id="co-notes" rows="2">${escapeHtml(CO.notes)}</textarea></div><div class="row"><button class="btn btn-ghost" id="co-back">← Atrás</button><button class="btn" id="co-next">Revisar →</button></div></div>`;
  if(CO.step===4){
    const t=coSummaryNumbers(),items=Cart.snapshot();
    body.innerHTML=`<div class="card"><h3>4 · Revisión</h3>${items.map(it=>{const p=S.products.get(it.productId)||it;return`<div class="r" style="display:flex;justify-content:space-between;font-size:14px;margin:6px 0"><span>${it.units} × ${escapeHtml(it.name)} (${fractionLabel(p,it.fraction)})</span><b>${fmtMoney(lineTotalOf(p,it.fraction,it.units))}</b></div>`;}).join("")}<div class="divider"></div><div class="kv"><b>Cliente</b><span>${escapeHtml(CO.name)} · ${escapeHtml(CO.phone)}</span><b>Entrega</b><span>${CO.method==="domicilio"?`🚚 ${escapeHtml((S.zones.find(z=>z.id===CO.zoneId)||{}).name||"")} — ${escapeHtml(CO.address)}`:"🏪 Recoger"}</span><b>Horario</b><span>${CO.when} · ${escapeHtml(((s.deliverySlots||[]).find(x=>x.id===CO.slotId)||{}).label||"")}</span></div><div class="divider"></div><div class="r" style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${fmtMoney(t.subtotal)}</span></div>${t.discount>0?`<div class="r" style="display:flex;justify-content:space-between;color:var(--ok)"><span>Descuento (${escapeHtml(t.label)})</span><span>-${fmtMoney(t.discount)}</span></div>`:""}<div class="r" style="display:flex;justify-content:space-between"><span>Envío</span><span>${t.fee?fmtMoney(t.fee):"Sin costo"}</span></div><div class="r total" style="display:flex;justify-content:space-between;font-size:19px;font-weight:800;color:var(--brand-dark)"><span>Total estimado</span><span>${fmtMoney(t.total)}</span></div><div class="row" style="margin-top:14px"><button class="btn btn-ghost" id="co-back">← Editar</button><button class="btn btn-accent" id="co-confirm" style="flex:2">Confirmar ✅</button></div></div>`;
  }
  const back=document.getElementById("co-back");if(back)back.onclick=()=>{CO.step--;renderCO()};
  const next=document.getElementById("co-next");if(next)next.onclick=()=>{if(CO.step===1){CO.name=document.getElementById("co-name").value.trim();CO.phone=document.getElementById("co-phone").value.trim();if(CO.name.length<3||CO.phone.length<7)return toast("Datos incompletos","err")}if(CO.step===2){if(CO.method==="domicilio"){CO.zoneId=document.getElementById("co-zone").value;CO.address=document.getElementById("co-addr").value.trim();CO.refs=document.getElementById("co-refs").value.trim();if(!CO.zoneId||!CO.address)return toast("Faltan datos de entrega","err")}}if(CO.step===3){if(!CO.slotId)return toast("Selecciona horario","err");CO.notes=document.getElementById("co-notes").value.trim()}CO.step++;renderCO()};
  const md=document.getElementById("m-dom"),mp=document.getElementById("m-pick");if(md)md.onclick=()=>{CO.method="domicilio";renderCO()};if(mp)mp.onclick=()=>{CO.method="recoger";renderCO()};
  document.querySelectorAll("[data-when]").forEach(b=>b.onclick=()=>{CO.when=b.dataset.when;renderCO()});
  document.querySelectorAll("[data-slot]").forEach(b=>b.onclick=()=>{CO.slotId=b.dataset.slot;document.querySelectorAll("[data-slot]").forEach(x=>x.classList.toggle("active",x===b))});
  const confirmBtn=document.getElementById("co-confirm");if(confirmBtn)confirmBtn.onclick=submitOrder;
}
async function submitOrder(){
  if(CO.busy)return;CO.busy=true;const btn=document.getElementById("co-confirm");btn.disabled=true;btn.textContent="Procesando…";CO.idem=CO.idem||genId();const localTotal=coSummaryNumbers().total;
  try{
    const res=await callCreateOrder({idempotencyKey:CO.idem,customer:{name:CO.name,phone:CO.phone},delivery:{method:CO.method,when:CO.when,slotId:CO.slotId,zoneId:CO.zoneId,address:CO.address,references:CO.refs},payment:{method:"efectivo"},notes:CO.notes,items:Cart.snapshot().map(i=>({productId:i.productId,fraction:i.fraction,units:i.units,note:i.note}))});
    localStorage.setItem(GUEST_KEY, JSON.stringify({ name: CO.name, phone: CO.phone, address: CO.address }));
    Cart.clearCart();CO.idem=null;sessionStorage.setItem("mf_last_order",JSON.stringify({...res,localTotal}));location.hash="#/exito";
  }catch(e){
    toast(e?.message||"Error procesando pedido.","err");btn.disabled=false;btn.textContent="Confirmar ✅";CO.busy=false;
  }
}

function viewSuccess(){
  let o;try{o=JSON.parse(sessionStorage.getItem("mf_last_order"))}catch(e){}
  if(!o){$view.innerHTML=`<div class="empty"><div class="e">✅</div><h2>Pedido procesado</h2><p>No se encontró información del pedido.</p><a class="btn" href="#/inicio">Volver al inicio</a></div>`;return;}
  $view.innerHTML=`<div class="card center" style="margin-top:20px"><div style="font-size:64px">✅</div><h2>Pedido creado</h2><p>Folio: <b>${escapeHtml(o.folio)}</b></p><p class="muted">Total: ${fmtMoney(o.total ?? o.localTotal ?? 0)}</p><a class="btn btn-block" href="#/pedidos" style="margin-top:12px">Ver mis pedidos</a><a class="btn btn-block btn-ghost" href="#/inicio" style="margin-top:8px">Volver al inicio</a></div>`;
}

async function viewAccount() {
  const guest = JSON.parse(localStorage.getItem(GUEST_KEY) || "{}");
  const orders = await fetchOrders({ phone: guest.phone || undefined });
  $view.innerHTML = `
    <div class="card" style="margin-top:10px">
      <h2 style="margin-top:0">👤 Mi cuenta</h2>
      <p class="muted">Modo invitado. Tus datos se guardan en este dispositivo.</p>
      <div class="field"><label>Nombre</label><input id="g-name" value="${escapeHtml(guest.name||"")}"></div>
      <div class="field"><label>Teléfono</label><input id="g-phone" value="${escapeHtml(guest.phone||"")}" type="tel"></div>
      <div class="field"><label>Dirección</label><input id="g-addr" value="${escapeHtml(guest.address||"")}"></div>
      <button class="btn btn-block" id="g-save">Guardar datos</button>
      <a class="btn btn-block btn-ghost" href="#/pedidos" style="margin-top:8px">📦 Ver mis pedidos (${orders.length})</a>
    </div>`;
  document.getElementById("g-save").onclick = () => {
    const data = {
      name: document.getElementById("g-name").value.trim(),
      phone: document.getElementById("g-phone").value.trim(),
      address: document.getElementById("g-addr").value.trim()
    };
    localStorage.setItem(GUEST_KEY, JSON.stringify(data));
    toast("Datos guardados", "ok");
  };
}

async function viewOrders() {
  const guest = JSON.parse(localStorage.getItem(GUEST_KEY) || "{}");
  const phone = guest.phone;
  const orders = phone ? await fetchOrders({ phone }) : await fetchOrders();
  if (!orders.length) {
    $view.innerHTML = `<div class="empty"><div class="e">📦</div><h2>Sin pedidos</h2><p class="muted">Cuando hagas un pedido aparecerá aquí.</p><a class="btn" href="#/catalogo">Ir al catálogo</a></div>`;
    return;
  }
  const statusLabel = { creado:"Creado", confirmado:"Confirmado", preparando:"Preparando", en_entrega:"En camino", listo_recoger:"Listo", entregado:"Entregado", cancelado:"Cancelado" };
  $view.innerHTML = `<h2>📦 Mis pedidos</h2>` + orders.map(o => `
    <div class="order-card">
      <div class="h"><b>${escapeHtml(o.folio)}</b><span class="status ${o.status}">${statusLabel[o.status]||o.status}</span></div>
      <div class="muted" style="font-size:12px">${fmtDateTime(o.createdAt)} · ${o.delivery?.method==="domicilio"?"🚚 Domicilio":"🏪 Recoger"}</div>
      <div style="margin:8px 0;font-size:14px">${(o.items||[]).map(it=>`· ${it.units} × ${escapeHtml(it.name)} — ${fmtMoney(it.lineTotal)}`).join("<br>")}</div>
      <div style="display:flex;justify-content:space-between;font-weight:800;color:var(--brand-dark)"><span>Total</span><span>${fmtMoney(o.total)}</span></div>
    </div>`).join("");
}

boot();