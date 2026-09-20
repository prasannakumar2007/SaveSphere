/**
 * MoneyMint — Utility Helpers
 * Reusable helper functions for DOM, events, debounce, and UI feedback.
 * No framework dependencies — pure vanilla JS.
 */

'use strict';

/* ── DOM Helpers ───────────────────────────────────────── */
export const qs  = (sel, ctx = document) => ctx.querySelector(sel);
export const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

export function addClass(el, ...cls)    { el && el.classList.add(...cls); }
export function removeClass(el, ...cls) { el && el.classList.remove(...cls); }
export function toggleClass(el, cls, force) {
  if (el) el.classList.toggle(cls, force);
}
export function hasClass(el, cls)       { return el && el.classList.contains(cls); }

export function setAttr(el, attr, val) {
  if (el) el.setAttribute(attr, val);
}
export function removeAttr(el, attr) {
  if (el) el.removeAttribute(attr);
}

export function on(el, event, handler, opts = false) {
  if (el) el.addEventListener(event, handler, opts);
}

export function off(el, event, handler, opts = false) {
  if (el) el.removeEventListener(event, handler, opts);
}

/* ── Debounce ───────────────────────────────────────────── */
export function debounce(fn, delay = 250) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ── Async Sleep ───────────────────────────────────────── */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/* ── Toast Notification System ────────────────────────────── */
const TOAST_ICONS = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
};

let _toastContainer = null;

function getToastContainer() {
  if (!_toastContainer) {
    _toastContainer = document.createElement('div');
    _toastContainer.className = 'toast-container';
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

/**
 * Show a toast notification.
 * @param {string} message  - The message text.
 * @param {'success'|'error'|'info'} type - Toast type.
 * @param {number} duration  - Milliseconds before auto-dismiss (0 = sticky).
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  const colorMap = { success: '#1E7A4A', error: '#C0392B', info: '#2E6B5E' };

  toast.innerHTML = `
    <span class="toast__icon" style="color:${colorMap[type]}">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast__text">${escapeHtml(message)}</span>
    <button class="toast__close" aria-label="Dismiss">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  `;

  container.appendChild(toast);

  // Close button
  toast.querySelector('.toast__close').addEventListener('click', () => dismissToast(toast));

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }

  return toast;
}

function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('toast--hiding');
  setTimeout(() => toast.parentNode?.removeChild(toast), 300);
}

/* ── Security helpers ──────────────────────────────────────── */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Local Storage Helpers ────────────────────────────────── */
export const Storage = {
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  },
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : fallback;
    } catch (e) { return fallback; }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  },
  clear() {
    try { localStorage.clear(); } catch (e) { /* ignore */ }
  },
};

/* ── Session Storage Helpers ──────────────────────────────── */
export const Session = {
  set(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  },
  get(key, fallback = null) {
    try {
      const item = sessionStorage.getItem(key);
      return item !== null ? JSON.parse(item) : fallback;
    } catch (e) { return fallback; }
  },
  remove(key) {
    try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
  },
};

/* ── Simple Router Helper ─────────────────────────────────── */
export const Router = {
  /**
   * Navigate to a URL.
   * Designed to be replaced with a real router (React Router, etc.) later.
   * @param {string} url - Destination path.
   * @param {number} delay - Optional delay in ms (for showing animations before redirect).
   */
  navigate(url, delay = 0) {
    if (delay > 0) {
      setTimeout(() => { window.location.href = url; }, delay);
    } else {
      window.location.href = url;
    }
  },
};
