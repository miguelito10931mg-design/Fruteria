// ══════════════════════════════════════════════════════════
// MAIN — bootstrap tienda + admin
// ══════════════════════════════════════════════════════════
import { router, store, money, escapeHtml } from './core.js';
import { dataProvider } from './data.js';
import {
  renderCatalog, renderProductDetail, renderCart, renderCheckout,
  updateCartBadge, computeCartTotals
} from './store.js';
import {
  renderAdminLogin, renderDashboard, renderAdminProducts,
  renderAdminOrders, renderAdminSettings
} from './admin.js';

async function boot() {
  await dataProvider.init();
  const config = await dataProvider.getSettings();
  store.set({ config });
  applyBranding(config);
  updateCartBadge();
  store.subscribe(() => updateCartBadge());

  // ─── TIENDA ───
  router.add('/', async () => {
    switchViews('store');
    await renderHome();
  });
  router.add('/catalog', async () => {
    switchViews('store');
    await renderCatalog(document.getElementById('view'));
  });
  router.add('/product/:id', async ({ id }) => {
    switchViews('store');
    renderProductDetail(id);
  });
  router.add('/cart', async () => {
    switchViews('store');
    renderCart(document.getElementById('view'));
  });
  router.add('/checkout', async () => {
    switchViews('store');
    await renderCheckout(document.getElementById('view'));
  });
  router.add('/account', async () => {
    switchViews('store');
    renderAccount();
  });

  // ─── ADMIN ───
  router.add('/admin', async () => {
    switchViews('admin');
    await renderDashboard(document.getElementById('admin-view'));
  });
  router.add('/admin/products', async () => {
    switchViews('admin');
    await renderAdminProducts(document.getElementById('admin-view'));
  });
  router.add('/admin/orders', async () => {
    switchViews('admin');
    await renderAdminOrders(document.getElementById('admin-view'));
  });
  router.add('/admin/settings', async () => {
    switchViews('admin');
    await renderAdminSettings(document.getElementById('admin-view'));
  });

  document.getElementById('btn-cart').addEventListener('click', () => { location.hash = '#/cart'; });
  document.getElementById('search-input').addEventListener('focus', () => {
    if (!location.hash.includes('/catalog')) location.hash = '#/catalog';
  });
  document.getElementById('btn-exit-admin').addEventListener('click', () => { location.hash = '#/'; });

  router.start();
}

function switchViews(view) {
  document.getElementById('app-store').classList.toggle('hidden', view !== 'store');
  document.getElementById('app-admin').classList.toggle('hidden', view !== 'admin');
  window.scrollTo(0, 0);
}

function applyBranding(config) {
  document.documentElement.style.setProperty('--color-primary', config.branding.colorPrimary);
  document.documentElement.style.setProperty('--color-accent', config.branding.colorAccent);
  document.documentElement.style.setProperty('--color-bg', config.branding.colorBg);
  document.querySelectorAll('[data-bind="business.name"]').forEach(el => { el.textContent = config.business.name; });
  document.querySelector('meta[name="theme-color"]').content = config.branding.colorPrimary;
}

async function renderHome() {
  const view = document.getElementById('view');
  const products = await dataProvider.getProducts({ activeOnly: true });
  const config = store.get().config;
  const featured = products.filter(p => p.isFeatured).slice(0, 6);
  const onSale = products.filter(p => p.isOnSale && p.salePriceCents != null).slice(0, 6);

  view.innerHTML = `
    <div class="fade-in">
      <div class="hero">
        <div>
          <h1 class="hero__title">${escapeHtml(config.business.slogan || 'Frescura a tu mesa')}</h1>
          <p class="hero__sub">Envío a domicilio · Pedido mínimo ${money.format(config.delivery.minOrderCents)}</p>
          <a href="#/catalog" class="btn btn--accent" style="margin-top:16px">Ver catálogo</a>
        </div>
      </div>
      ${featured.length ? `
        <section class="section">
          <div class="section__head"><h2>Destacados</h2><a href="#/catalog" class="section__link">Ver todo</a></div>
          <div class="product-grid">${featured.map(miniCard).join('')}</div>
        </section>` : ''}
      ${onSale.length ? `
        <section class="section">
          <div class="section__head"><h2>Ofertas</h2><a href="#/catalog" class="section__link">Ver todo</a></div>
          <div class="product-grid">${onSale.map(miniCard).join('')}</div>
        </section>` : ''}
      <section class="section">
        <div class="section__head"><h2>Información</h2></div>
        <div class="card" style="padding:16px">
          <p class="text-sm" style="margin:0 0 8px">
            <strong>Horarios:</strong> ${formatHours(config.business)}
          </p>
          <p class="text-sm" style="margin:0 0 8px">
            <strong>Zonas:</strong> ${config.delivery.zones.map(z => `${escapeHtml(z.name)} (${money.format(z.feeCents)})`).join(' · ')}
          </p>
          ${config.business.address ? `<p class="text-sm muted" style="margin:0">${escapeHtml(config.business.address)}</p>` : ''}
        </div>
      </section>
    </div>`;

  view.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const { addToCart } = await import('./store.js');
    addToCart(b.dataset.add, 1, 'default');
  }));
  view.querySelectorAll('[data-open-product]').forEach(c => c.addEventListener('click', e => {
    if (e.target.closest('[data-add]')) return;
    location.hash = `#/product/${c.dataset.openProduct}`;
  }));
}

function formatHours(b) {
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return b.hours.map(h => `${days[h.day]} ${h.open}-${h.close}`).join(' · ')
    + (b.restDays.length ? ` · Cerrado: ${b.restDays.map(d => days[d]).join(',')}` : '');
}

function miniCard(p) {
  const eff = p.isOnSale && p.salePriceCents != null ? p.salePriceCents : p.priceCents;
  return `
    <article class="card product-card" data-open-product="${p.id}" role="button" tabindex="0">
      <div class="product-card__img-wrap">
        ${p.isOnSale ? `<span class="badge badge--sale product-card__badge">Oferta</span>` : ''}
        <img class="product-card__img" src="${escapeHtml(p.imageUrl || '')}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.style.opacity=0.15">
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
        <div class="product-card__price">
          ${money.format(eff)}
          ${p.isOnSale ? `<del>${money.format(p.priceCents)}</del>` : ''}
        </div>
        <div class="product-card__unit">por ${escapeHtml(p.baseUnit)}</div>
      </div>
      <div class="product-card__actions">
        <button class="btn btn--block btn--sm" data-add="${p.id}">Agregar</button>
      </div>
    </article>`;
}

function renderAccount() {
  const view = document.getElementById('view');
  view.innerHTML = `
    <div class="fade-in">
      <h2>Mi cuenta</h2>
      <div class="card" style="padding:20px">
        <p class="text-sm muted" style="margin:0">
          Compra como invitado sin necesidad de registrarte.
          El registro con Firebase Authentication se integrará en la siguiente etapa.
        </p>
      </div>
      <a href="#/catalog" class="btn btn--block" style="margin-top:16px">Seguir comprando</a>
    </div>`;
}

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => console.warn('SW:', err));
  });
}

boot().catch(err => {
  console.error('[Boot]', err);
  document.getElementById('view').innerHTML =
    `<div class="empty"><p>Error al iniciar la aplicación.</p><pre class="text-xs">${escapeHtml(String(err))}</pre></div>`;
});