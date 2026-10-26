// ══════════════════════════════════════════════════════════
// UI — toast, modal, confirm
// ══════════════════════════════════════════════════════════
import { escapeHtml } from './core.js';

export function toast(message, { type = 'info', duration = 3000 } = {}) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .2s';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

let activeModal = null;
export function closeModal() {
  if (!activeModal) return;
  activeModal._prevFocus?.focus?.();
  activeModal.remove();
  activeModal = null;
}

export function confirmModal({ title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = true }) {
  return new Promise((resolve) => {
    if (activeModal) closeModal();
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = `
      <div class="modal">
        <h3>${escapeHtml(title)}</h3>
        <p class="muted">${escapeHtml(message)}</p>
        <div class="modal__actions">
          <button class="btn btn--ghost" data-act="cancel">${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? 'btn--danger' : ''}" data-act="ok">${escapeHtml(confirmText)}</button>
        </div>
      </div>`;
    root.appendChild(wrap);
    activeModal = wrap;
    const prevFocus = document.activeElement;
    wrap.querySelector('[data-act="ok"]').focus();
    wrap.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act && e.target === wrap) return;
      if (act === 'ok') { closeModal(); resolve(true); }
      if (act === 'cancel') { closeModal(); resolve(false); }
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); resolve(false); }
      if (e.key === 'Enter') { closeModal(); resolve(true); }
    });
    activeModal._prevFocus = prevFocus;
  });
}