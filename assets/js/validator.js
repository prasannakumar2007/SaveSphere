/**
 * MoneyMint — Form Validator
 * Reusable validation engine for all forms across the platform.
 * Designed to be backend-agnostic and easily extended.
 */

'use strict';

import { addClass, removeClass, qs } from './utils.js';

/* ── Validation Rules ──────────────────────────────────────── */
export const Rules = {
  required: (value) => {
    return value.trim().length > 0 || 'This field is required.';
  },

  email: (value) => {
    const pattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!value.trim()) return 'Email address is required.';
    return pattern.test(value.trim()) || 'Please enter a valid email address.';
  },

  /**
   * Accepts email OR a User ID (e.g. MM-123456 or 10-digit number).
   */
  emailOrUserId: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Email or User ID is required.';
    const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const userIdPattern = /^(MM-?\d{5,10}|\d{8,12})$/i;
    if (emailPattern.test(trimmed) || userIdPattern.test(trimmed)) return true;
    return 'Enter a valid Email address or User ID.';
  },

  password: (value) => {
    if (!value) return 'Password is required.';
    if (value.length < 6) return 'Password must be at least 6 characters.';
    return true;
  },

  minLength: (min) => (value) => {
    return value.trim().length >= min || `Must be at least ${min} characters.`;
  },

  maxLength: (max) => (value) => {
    return value.trim().length <= max || `Must be no more than ${max} characters.`;
  },

  phone: (value) => {
    const pattern = /^[6-9]\d{9}$/;
    if (!value.trim()) return 'Mobile number is required.';
    return pattern.test(value.replace(/\s+/g, '')) || 'Enter a valid 10-digit mobile number.';
  },
};

/* ── Field Validator ────────────────────────────────────────── */

const ERROR_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

/**
 * Validate a single input field and update its UI state.
 * @param {HTMLInputElement} input - The input to validate.
 * @param {Function[]} rules       - Array of rule functions from Rules.
 * @returns {boolean}              - true if all rules pass.
 */
export function validateField(input, rules = []) {
  const value = input.value;
  let errorMessage = null;

  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) {
      errorMessage = result;
      break;
    }
  }

  setFieldState(input, errorMessage);
  return errorMessage === null;
}

/**
 * Set visual state on a field (error / success / neutral).
 */
export function setFieldState(input, errorMessage = null) {
  const wrapper  = input.closest('.form-group') || input.parentElement;
  const errorEl  = wrapper?.querySelector('.field-error');

  if (errorMessage) {
    addClass(input, 'is-error');
    removeClass(input, 'is-success');
    if (errorEl) {
      errorEl.innerHTML = `${ERROR_ICON}<span>${errorMessage}</span>`;
      errorEl.style.display = 'flex';
    }
  } else {
    removeClass(input, 'is-error');
    if (input.value.trim()) addClass(input, 'is-success');
    if (errorEl) {
      errorEl.innerHTML = '';
      errorEl.style.display = 'none';
    }
  }
}

/**
 * Clear validation state from a field.
 */
export function clearFieldState(input) {
  removeClass(input, 'is-error', 'is-success');
  const wrapper = input.closest('.form-group') || input.parentElement;
  const errorEl = wrapper?.querySelector('.field-error');
  if (errorEl) {
    errorEl.innerHTML = '';
    errorEl.style.display = 'none';
  }
}

/**
 * Validate an entire form using a field-to-rules map.
 * @param {Object} fieldRules - { fieldId: [rule, rule, ...] }
 * @returns {boolean}           true if the entire form is valid.
 */
export function validateForm(fieldRules) {
  let isValid = true;
  for (const [fieldId, rules] of Object.entries(fieldRules)) {
    const input = document.getElementById(fieldId);
    if (!input) continue;
    const fieldValid = validateField(input, rules);
    if (!fieldValid) isValid = false;
  }
  return isValid;
}

/**
 * Attach real-time (on-input) validation to a field.
 * @param {HTMLInputElement} input
 * @param {Function[]} rules
 * @param {number} debounceMs
 */
export function attachRealtimeValidation(input, rules, debounceMs = 600) {
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    // Clear immediately on typing to remove red state
    if (input.value === '') {
      clearFieldState(input);
      return;
    }
    timer = setTimeout(() => validateField(input, rules), debounceMs);
  });

  input.addEventListener('blur', () => {
    clearTimeout(timer);
    validateField(input, rules);
  });
}
