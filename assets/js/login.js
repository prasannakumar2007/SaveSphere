/**
 * MoneyMint — Login Page Controller
 * Orchestrates all interactions on the login page:
 * form validation, submit, loading state, password toggle,
 * forgot-password modal, and post-auth redirect.
 */

'use strict';

import {
  qs, addClass, removeClass, toggleClass, on, showToast, Router
} from './utils.js';
import { Rules, validateForm, attachRealtimeValidation } from './validator.js';
import { AuthService } from './auth.js';

/* ── DOM references ────────────────────────────────────────── */
const DOM = {};

function cacheDOM() {
  // Login form
  DOM.loginForm         = qs('#login-form');
  DOM.emailInput        = qs('#login-email');
  DOM.passwordInput     = qs('#login-password');
  DOM.rememberCheckbox  = qs('#remember-me');
  DOM.submitBtn         = qs('#login-submit-btn');
  DOM.submitSpinner     = qs('#login-spinner');
  DOM.submitBtnText     = qs('#login-btn-text');
  DOM.alertBanner       = qs('#login-alert-banner');
  DOM.pwdToggleBtn      = qs('#password-toggle');
  DOM.forgotLink        = qs('#forgot-password-link');
  DOM.signupLink        = qs('#signup-link');

  // Forgot password modal
  DOM.fpModal           = qs('#forgot-password-modal');
  DOM.fpModalClose      = qs('#fp-modal-close');
  DOM.fpForm            = qs('#fp-form');
  DOM.fpEmailInput      = qs('#fp-email');
  DOM.fpSubmitBtn       = qs('#fp-submit-btn');
  DOM.fpSubmitText      = qs('#fp-btn-text');
  DOM.fpSubmitSpinner   = qs('#fp-spinner');
  DOM.fpSuccessState    = qs('#fp-success-state');
  DOM.fpSuccessEmail    = qs('#fp-success-email');
}

/* ── Password Toggle ───────────────────────────────────────── */
function initPasswordToggle() {
  const btn   = DOM.pwdToggleBtn;
  const input = DOM.passwordInput;
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    toggleClass(btn, 'is-visible', !isVisible);
    btn.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    input.focus();
  });
}

/* ── Alert Banner ─────────────────────────────────────────── */
const ALERT_ICONS = {
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
};

function showAlert(message, type = 'error') {
  const el = DOM.alertBanner;
  if (!el) return;
  el.innerHTML = `${ALERT_ICONS[type] || ''}<span>${message}</span>`;
  el.className = `alert-banner alert-banner--${type}`;
  el.style.display = 'flex';
}

function hideAlert() {
  const el = DOM.alertBanner;
  if (!el) return;
  el.style.display = 'none';
  el.innerHTML = '';
}

/* ── Submit Button States ────────────────────────────────────── */
function setLoading(isLoading) {
  const btn = DOM.submitBtn;
  const txt = DOM.submitBtnText;
  if (!btn) return;
  if (isLoading) {
    addClass(btn, 'is-loading');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    if (txt) txt.textContent = 'Signing in...';
  } else {
    removeClass(btn, 'is-loading');
    btn.disabled = false;
    btn.setAttribute('aria-busy', 'false');
    if (txt) txt.textContent = 'Sign In';
  }
}

function setSuccess() {
  const btn = DOM.submitBtn;
  const txt = DOM.submitBtnText;
  if (!btn) return;
  removeClass(btn, 'is-loading');
  addClass(btn, 'is-success');
  if (txt) txt.textContent = '\u2713  Signed In Successfully';
}

/* ── Login Form Submit ──────────────────────────────────────── */
async function handleLoginSubmit(e) {
  e.preventDefault();
  hideAlert();

  // Validate
  const isValid = validateForm({
    'login-email':    [Rules.emailOrUserId],
    'login-password': [Rules.password],
  });

  if (!isValid) {
    // Shake the form card for extra feedback
    const card = qs('.login-card');
    addClass(card, 'animate-shake');
    card.addEventListener('animationend', () => removeClass(card, 'animate-shake'), { once: true });
    return;
  }

  const emailOrId  = DOM.emailInput.value.trim();
  const password   = DOM.passwordInput.value;
  const rememberMe = DOM.rememberCheckbox?.checked ?? false;

  setLoading(true);

  try {
    const result = await AuthService.login(emailOrId, password, rememberMe);

    if (result.success) {
      setSuccess();
      showToast(`Welcome back, ${result.user.name}!`, 'success', 3000);
      // Redirect to dashboard after brief success animation
      Router.navigate('./pages/dashboard.html', 1400);
    } else {
      setLoading(false);
      showAlert(result.error);
      // Shake password field for wrong credentials
      const pwdGroup = DOM.passwordInput?.closest('.form-group');
      if (pwdGroup) {
        addClass(pwdGroup, 'animate-shake');
        pwdGroup.addEventListener('animationend', () => removeClass(pwdGroup, 'animate-shake'), { once: true });
      }
    }
  } catch (err) {
    setLoading(false);
    showAlert('A network error occurred. Please check your connection and try again.');
    console.error('[MoneyMint] Login error:', err);
  }
}

/* ── Forgot Password Modal ───────────────────────────────────── */
function openForgotModal(prefillEmail = '') {
  if (!DOM.fpModal) return;
  addClass(DOM.fpModal, 'is-open');
  document.body.style.overflow = 'hidden';

  // Pre-fill email if available
  if (DOM.fpEmailInput && prefillEmail) {
    DOM.fpEmailInput.value = prefillEmail;
  }

  // Reset modal to default state
  if (DOM.fpForm)         removeClass(DOM.fpForm, 'is-hidden');
  if (DOM.fpSuccessState) removeClass(DOM.fpSuccessState, 'is-visible');

  setTimeout(() => DOM.fpEmailInput?.focus(), 200);
}

function closeForgotModal() {
  if (!DOM.fpModal) return;
  removeClass(DOM.fpModal, 'is-open');
  document.body.style.overflow = '';

  // Reset modal after transition
  setTimeout(() => {
    if (DOM.fpEmailInput)    DOM.fpEmailInput.value = '';
    if (DOM.fpForm)          removeClass(DOM.fpForm, 'is-hidden');
    if (DOM.fpSuccessState)  removeClass(DOM.fpSuccessState, 'is-visible');
    if (DOM.fpSubmitBtn) {
      removeClass(DOM.fpSubmitBtn, 'is-loading', 'is-success');
      DOM.fpSubmitBtn.disabled = false;
      if (DOM.fpSubmitText) DOM.fpSubmitText.textContent = 'Send Reset Link';
    }
  }, 350);
}

async function handleForgotPasswordSubmit(e) {
  e.preventDefault();

  const email = DOM.fpEmailInput?.value?.trim();
  if (!email) {
    DOM.fpEmailInput?.focus();
    return;
  }

  // Loading
  if (DOM.fpSubmitBtn) {
    addClass(DOM.fpSubmitBtn, 'is-loading');
    DOM.fpSubmitBtn.disabled = true;
  }
  if (DOM.fpSubmitText) DOM.fpSubmitText.textContent = 'Sending...';

  try {
    const result = await AuthService.forgotPassword(email);

    if (result.success) {
      if (DOM.fpForm)         addClass(DOM.fpForm, 'is-hidden');
      if (DOM.fpSuccessState) addClass(DOM.fpSuccessState, 'is-visible');
      if (DOM.fpSuccessEmail) DOM.fpSuccessEmail.textContent = email;
    } else {
      if (DOM.fpSubmitBtn) {
        removeClass(DOM.fpSubmitBtn, 'is-loading');
        DOM.fpSubmitBtn.disabled = false;
      }
      if (DOM.fpSubmitText) DOM.fpSubmitText.textContent = 'Send Reset Link';
      showToast(result.error || 'Could not send reset link. Try again.', 'error');
    }
  } catch (err) {
    if (DOM.fpSubmitBtn) {
      removeClass(DOM.fpSubmitBtn, 'is-loading');
      DOM.fpSubmitBtn.disabled = false;
    }
    if (DOM.fpSubmitText) DOM.fpSubmitText.textContent = 'Send Reset Link';
    showToast('Network error. Please try again.', 'error');
  }
}

function initForgotPasswordModal() {
  // Open modal
  on(DOM.forgotLink, 'click', (e) => {
    e.preventDefault();
    const currentEmail = DOM.emailInput?.value?.trim();
    // Pre-fill if it looks like an email
    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    openForgotModal(emailPattern.test(currentEmail) ? currentEmail : '');
  });

  // Close via X button
  on(DOM.fpModalClose, 'click', closeForgotModal);

  // Close via overlay click
  on(DOM.fpModal, 'click', (e) => {
    if (e.target === DOM.fpModal) closeForgotModal();
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.fpModal?.classList.contains('is-open')) {
      closeForgotModal();
    }
  });

  // Form submit
  on(DOM.fpForm, 'submit', handleForgotPasswordSubmit);
}

/* ── Navigation Links ───────────────────────────────────────── */
function initNavLinks() {
  // Sign Up link
  on(DOM.signupLink, 'click', (e) => {
    e.preventDefault();
    Router.navigate('./pages/register.html');
  });
}

/* ── Remember Me pre-fill ──────────────────────────────────── */
function initRememberMe() {
  const saved = AuthService.getRememberedUser();
  if (saved && DOM.emailInput) {
    DOM.emailInput.value = saved;
    if (DOM.rememberCheckbox) DOM.rememberCheckbox.checked = true;
    // Focus password field directly since email is already filled
    DOM.passwordInput?.focus();
  }
}

/* ── Already authenticated redirect ────────────────────────────── */
function checkAlreadyLoggedIn() {
  if (AuthService.isAuthenticated()) {
    Router.navigate('./pages/dashboard.html');
  }
}

/* ── Real-time Validation ──────────────────────────────────── */
function initRealtimeValidation() {
  if (DOM.emailInput)    attachRealtimeValidation(DOM.emailInput,    [Rules.emailOrUserId]);
  if (DOM.passwordInput) attachRealtimeValidation(DOM.passwordInput, [Rules.password]);
}

/* ── Bootstrap ───────────────────────────────────────────────── */
function init() {
  cacheDOM();
  checkAlreadyLoggedIn();
  initPasswordToggle();
  initRememberMe();
  initRealtimeValidation();
  initForgotPasswordModal();
  initNavLinks();

  // Login form
  on(DOM.loginForm, 'submit', handleLoginSubmit);

  // Clear alert on any input
  on(DOM.emailInput,    'input', hideAlert);
  on(DOM.passwordInput, 'input', hideAlert);
}

// Run when DOM is ready
document.addEventListener('DOMContentLoaded', init);
