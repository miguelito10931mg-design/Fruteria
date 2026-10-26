/* ============ TOKENS ============ */
:root {
  --color-primary: #2E7D32;
  --color-primary-dark: #1B5E20;
  --color-accent: #F9A825;
  --color-accent-soft: #FFF3C4;
  --color-bg: #F8FAF7;
  --color-surface: #FFFFFF;
  --color-text: #1C1C1E;
  --color-text-muted: #6E6E73;
  --color-border: #E5E7EB;
  --color-success: #2E7D32;
  --color-danger: #C62828;
  --color-warning: #EF6C00;
  --radius-sm: 8px; --radius-md: 14px; --radius-lg: 22px; --radius-pill: 999px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,.05);
  --shadow-md: 0 4px 16px rgba(0,0,0,.08);
  --shadow-lg: 0 12px 32px rgba(0,0,0,.12);
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --fs-xs: .75rem; --fs-sm: .875rem; --fs-md: 1rem;
  --fs-lg: 1.25rem; --fs-xl: 1.5rem; --fs-2xl: 2rem;
  --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --header-h: 56px; --nav-h: 64px;
  --safe-b: env(safe-area-inset-bottom, 0px);
}

/* ============ BASE ============ */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; }
body {
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  color: var(--color-text);
  background: var(--color-bg);
  line-height: 1.5;
  min-height: 100vh;
  padding-bottom: calc(var(--nav-h) + var(--safe-b));
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; height: auto; display: block; }
a { color: var(--color-primary); text-decoration: none; }
button { font-family: inherit; cursor: pointer; }
input, select, textarea { font-family: inherit; font-size: inherit; }

.skip-link {
  position: absolute; left: -999px; top: 8px;
  background: var(--color-primary); color: #fff;
  padding: 8px 12px; border-radius: var(--radius-sm); z-index: 1000;
}
.skip-link:focus { left: 8px; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

h1, h2, h3, h4 { line-height: 1.2; margin: 0 0 var(--space-3); font-weight: 700; }
h1 { font-size: var(--fs-2xl); }
h2 { font-size: var(--fs-xl); }
h3 { font-size: var(--fs-lg); }
p { margin: 0 0 var(--space-3); }

.muted { color: var(--color-text-muted); }
.text-sm { font-size: var(--fs-sm); }
.text-xs { font-size: var(--fs-xs); }
.hidden { display: none !important; }
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

/* ============ COMPONENTS ============ */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2); min-height: 48px; padding: 0 var(--space-5);
  border: none; border-radius: var(--radius-md);
  font-weight: 600; font-size: var(--fs-md);
  background: var(--color-primary); color: #fff;
  transition: transform .12s, background .12s, box-shadow .12s;
  box-shadow: var(--shadow-sm);
}
.btn:hover { background: var(--color-primary-dark); }
.btn:active { transform: scale(.98); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn--block { width: 100%; }
.btn--ghost { background: transparent; color: var(--color-primary); border: 1.5px solid var(--color-primary); }
.btn--ghost:hover { background: rgba(46,125,50,.06); }
.btn--accent { background: var(--color-accent); color: #1C1C1E; }
.btn--danger { background: var(--color-danger); }
.btn--sm { min-height: 36px; padding: 0 var(--space-3); font-size: var(--fs-sm); }

.card {
  background: var(--color-surface); border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm); overflow: hidden;
  transition: transform .15s, box-shadow .15s;
}
.card:hover { box-shadow: var(--shadow-md); }

.input, .select, .textarea {
  width: 100%; min-height: 48px; padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-surface); color: var(--color-text);
  font-size: var(--fs-md); transition: border-color .12s, box-shadow .12s;
}
.input:focus, .select:focus, .textarea:focus {
  outline: none; border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(46,125,50,.15);
}
.textarea { min-height: 96px; resize: vertical; }
.label { display: block; margin-bottom: var(--space-1); font-size: var(--fs-sm); font-weight: 600; }

.badge {
  display: inline-block; padding: 2px 8px; border-radius: var(--radius-pill);
  font-size: var(--fs-xs); font-weight: 700;
  background: var(--color-accent-soft); color: #6b4a00;
}
.badge--sale { background: var(--color-danger); color: #fff; }
.badge--low { background: #FFE0B2; color: #7a3e00; }
.badge--ok { background: #C8E6C9; color: #1B5E20; }
.badge--warn { background: #FFE0B2; color: #7a3e00; }

.chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: var(--radius-pill);
  background: var(--color-surface); border: 1.5px solid var(--color-border);
  font-size: var(--fs-sm); cursor: pointer; white-space: nowrap;
  transition: background .12s, border-color .12s;
}
.chip--active { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

.qty {
  display: inline-flex; align-items: center; gap: var(--space-2);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-pill); overflow: hidden;
}
.qty button { width: 40px; height: 40px; border: none; background: transparent; font-size: 1.25rem; font-weight: 600; color: var(--color-primary); }
.qty button:disabled { color: var(--color-border); }
.qty input { width: 48px; text-align: center; border: none; background: transparent; font-weight: 600; }

/* ============ LAYOUT ============ */
.app-header {
  position: sticky; top: 0; z-index: 50; height: var(--header-h);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 var(--space-4); background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: saturate(180%) blur(12px);
}
.app-header__brand { display: flex; align-items: center; gap: var(--space-2); font-weight: 700; font-size: var(--fs-lg); color: var(--color-primary); }
.app-header__logo { border-radius: 8px; }
.app-header__cart-btn {
  position: relative; width: 44px; height: 44px;
  border: none; border-radius: 50%;
  background: var(--color-bg); font-size: 1.25rem;
  display: grid; place-items: center;
}
.cart-badge {
  position: absolute; top: 2px; right: 2px;
  min-width: 20px; height: 20px; padding: 0 5px;
  background: var(--color-danger); color: #fff;
  border-radius: var(--radius-pill);
  font-size: var(--fs-xs); font-weight: 700;
  display: grid; place-items: center;
}

.search-bar {
  position: sticky; top: var(--header-h); z-index: 40;
  padding: var(--space-3) var(--space-4); background: var(--color-bg);
}
.search-bar input {
  width: 100%; min-height: 44px; padding: 0 var(--space-4);
  border: 1.5px solid var(--color-border); border-radius: var(--radius-pill);
  background: var(--color-surface); font-size: var(--fs-md);
}
.search-bar input:focus {
  outline: none; border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(46,125,50,.12);
}

.app-main {
  padding: var(--space-4);
  padding-bottom: calc(var(--space-6) + var(--nav-h) + var(--safe-b));
  max-width: 1200px; margin: 0 auto;
}

.bottom-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 60;
  height: calc(var(--nav-h) + var(--safe-b));
  padding-bottom: var(--safe-b);
  display: grid; grid-template-columns: repeat(4, 1fr);
  background: var(--color-surface); border-top: 1px solid var(--color-border);
  box-shadow: 0 -2px 12px rgba(0,0,0,.04);
}
.bottom-nav__item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; font-size: var(--fs-xs); font-weight: 600;
  color: var(--color-text-muted); transition: color .12s;
}
.bottom-nav__item span:first-child { font-size: 1.25rem; }
.bottom-nav__item[aria-current="page"] { color: var(--color-primary); }

@media (min-width: 768px) {
  .app-header { padding: 0 var(--space-6); }
  .app-main { padding: var(--space-6); padding-bottom: var(--space-6); }
  .bottom-nav { display: none; }
  body { padding-bottom: 0; }
}

/* ============ TIENDA ============ */
.hero {
  position: relative; border-radius: var(--radius-lg); overflow: hidden;
  min-height: 180px; display: flex; align-items: flex-end;
  padding: var(--space-5); color: #fff;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  margin-bottom: var(--space-5);
}
.hero__title { font-size: var(--fs-xl); margin: 0 0 var(--space-2); }
.hero__sub { font-size: var(--fs-sm); opacity: .9; margin: 0; }

.section { margin-bottom: var(--space-6); }
.section__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-3); }
.section__head h2 { margin: 0; font-size: var(--fs-lg); }
.section__link { font-size: var(--fs-sm); font-weight: 600; color: var(--color-primary); background: none; border: none; }

.chips-row {
  display: flex; gap: var(--space-2); overflow-x: auto;
  padding-bottom: var(--space-2); scrollbar-width: none;
}
.chips-row::-webkit-scrollbar { display: none; }

.product-grid {
  display: grid; gap: var(--space-3);
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}
.product-card { display: flex; flex-direction: column; }
.product-card__img-wrap { aspect-ratio: 1; background: var(--color-bg); overflow: hidden; position: relative; }
.product-card__img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.product-card:hover .product-card__img { transform: scale(1.04); }
.product-card__badge { position: absolute; top: 8px; left: 8px; z-index: 1; }
.product-card__body { padding: var(--space-3); display: flex; flex-direction: column; gap: var(--space-1); }
.product-card__name {
  font-size: var(--fs-sm); font-weight: 600; color: var(--color-text);
  margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.product-card__price { font-size: var(--fs-md); font-weight: 700; color: var(--color-primary); }
.product-card__price del { font-size: var(--fs-sm); color: var(--color-text-muted); font-weight: 400; margin-left: 4px; }
.product-card__unit { font-size: var(--fs-xs); color: var(--color-text-muted); }
.product-card__actions { padding: 0 var(--space-3) var(--space-3); }

.product-detail { max-width: 640px; margin: 0 auto; }
.product-detail__img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: var(--space-4); }
.product-detail__price { font-size: var(--fs-2xl); font-weight: 800; color: var(--color-primary); margin: var(--space-3) 0; }
.unit-options { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-3) 0; }

.cart-list { display: flex; flex-direction: column; gap: var(--space-3); }
.cart-item {
  display: grid; grid-template-columns: 72px 1fr auto;
  gap: var(--space-3); padding: var(--space-3);
  background: var(--color-surface); border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}
.cart-item__img { width: 72px; height: 72px; border-radius: var(--radius-sm); object-fit: cover; background: var(--color-bg); }
.cart-item__info { display: flex; flex-direction: column; gap: 4px; }
.cart-item__name { font-weight: 600; font-size: var(--fs-sm); }
.cart-item__meta { font-size: var(--fs-xs); color: var(--color-text-muted); }
.cart-item__price { font-weight: 700; color: var(--color-primary); font-size: var(--fs-sm); }
.cart-item__controls { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: var(--space-2); }
.cart-item__remove { background: none; border: none; color: var(--color-danger); font-size: var(--fs-xs); padding: 4px; }

.cart-summary {
  position: sticky; bottom: calc(var(--nav-h) + var(--safe-b) + var(--space-3));
  background: var(--color-surface); border-radius: var(--radius-lg);
  padding: var(--space-4); box-shadow: var(--shadow-md); margin-top: var(--space-4);
}
.cart-summary__row { display: flex; justify-content: space-between; font-size: var(--fs-sm); margin-bottom: var(--space-2); }
.cart-summary__row--total {
  font-size: var(--fs-lg); font-weight: 700;
  border-top: 1px solid var(--color-border); padding-top: var(--space-2); margin-top: var(--space-2);
  color: var(--color-primary);
}

.empty { text-align: center; padding: var(--space-6) var(--space-4); color: var(--color-text-muted); }
.empty__icon { font-size: 3rem; margin-bottom: var(--space-3); }

.skeleton {
  background: linear-gradient(90deg, #eef1ee 25%, #f7f9f7 50%, #eef1ee 75%);
  background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: var(--radius-sm);
}

/* ============ CHECKOUT ============ */
.checkout-progress { display: flex; gap: 6px; margin: var(--space-2) 0; }
.checkout-dot { flex: 1; height: 4px; border-radius: 2px; background: var(--color-border); transition: background .2s; }
.checkout-dot.active { background: var(--color-primary); }

.radio-group, .slot-list { display: flex; flex-direction: column; gap: var(--space-2); }
.radio-option {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
  background: var(--color-surface); cursor: pointer;
  transition: border-color .12s, background .12s;
}
.radio-option.active { border-color: var(--color-primary); background: rgba(46,125,50,.05); }
.radio-option input { margin: 0; }

.review-box {
  background: var(--color-surface); border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4); margin-bottom: var(--space-3);
  box-shadow: var(--shadow-sm);
}
.review-box h4 { margin: 0 0 var(--space-2); font-size: var(--fs-sm); text-transform: uppercase; letter-spacing: .04em; color: var(--color-text-muted); }
.review-line { display: flex; justify-content: space-between; gap: var(--space-3); padding: 4px 0; font-size: var(--fs-sm); }

.info-box {
  padding: var(--space-3) var(--space-4);
  background: rgba(46,125,50,.06); border-radius: var(--radius-md);
  border: 1px solid rgba(46,125,50,.15);
}

.message-preview {
  background: #1C1C1E; color: #f2f2f2; padding: var(--space-3); border-radius: var(--radius-sm);
  font-size: var(--fs-xs); white-space: pre-wrap; word-break: break-word;
  margin-top: var(--space-2); font-family: ui-monospace, "SF Mono", monospace;
}

.success-hero { text-align: center; padding: var(--space-5) 0; }
.success-icon {
  width: 72px; height: 72px; margin: 0 auto var(--space-3);
  border-radius: 50%; background: var(--color-success); color: #fff;
  display: grid; place-items: center; font-size: 2.5rem; font-weight: 700;
}

/* ============ ANIMACIONES ============ */
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.fade-in { animation: fadeIn .25s ease-out; }

.toast-region {
  position: fixed; bottom: calc(var(--nav-h) + var(--safe-b) + 12px);
  left: 50%; transform: translateX(-50%); z-index: 200;
  display: flex; flex-direction: column; gap: 8px; align-items: center;
  pointer-events: none; width: min(92vw, 420px);
}
.toast {
  pointer-events: auto; background: #1C1C1E; color: #fff;
  padding: 12px 16px; border-radius: var(--radius-md);
  font-size: var(--fs-sm); font-weight: 500; box-shadow: var(--shadow-lg);
  animation: slideIn .25s ease-out; width: 100%; text-align: center;
}
.toast--success { background: var(--color-success); }
.toast--error { background: var(--color-danger); }

.modal-backdrop {
  position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,.45);
  display: grid; place-items: center; padding: var(--space-4);
  animation: fadeIn .18s;
}
.modal {
  background: var(--color-surface); border-radius: var(--radius-lg);
  padding: var(--space-5); max-width: 440px; width: 100%;
  box-shadow: var(--shadow-lg); animation: fadeIn .2s;
}
.modal h3 { margin-top: 0; }
.modal__actions { display: flex; gap: var(--space-2); margin-top: var(--space-4); }
.modal__actions .btn { flex: 1; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    transition-duration: .01ms !important;
  }
}