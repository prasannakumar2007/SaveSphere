/**
 * MoneyMint — Authentication Service
 *
 * Manages authentication state and API calls.
 * Currently uses simulated frontend-only auth for development.
 *
 * HOW TO CONNECT A REAL BACKEND:
 * 1. Replace the `_simulateLogin` call in `login()` with a real fetch() to your API.
 * 2. Store the returned JWT/session token via `Storage.set(AUTH_TOKEN_KEY, token)`.
 * 3. On every protected page, call `AuthService.requireAuth()` to guard access.
 * 4. Replace `_simulateForgotPassword` similarly.
 *
 * API Endpoints (to be implemented):
 *   POST /api/auth/login         { emailOrId, password }  -> { token, user }
 *   POST /api/auth/forgot-password { email }              -> { message }
 *   POST /api/auth/logout                                 -> {}
 *   GET  /api/auth/me                                     -> { user }
 */

'use strict';

import { Storage, Session, sleep } from './utils.js';

/* ── Constants ───────────────────────────────────────────── */
const AUTH_TOKEN_KEY     = 'mm_auth_token';
const AUTH_USER_KEY      = 'mm_auth_user';
const REMEMBER_ME_KEY    = 'mm_remember_me';

/* These demo credentials are for frontend testing ONLY.
   They will be removed once the real backend API is connected. */
const DEMO_CREDENTIALS = [
  { emailOrId: 'demo@moneymint.in',  password: 'demo1234',  name: 'Priya Sharma',   accountNo: 'MM-100001' },
  { emailOrId: 'MM-100001',          password: 'demo1234',  name: 'Priya Sharma',   accountNo: 'MM-100001' },
  { emailOrId: 'test@moneymint.in',  password: 'test1234',  name: 'Rahul Verma',    accountNo: 'MM-100002' },
];

/* ── Auth Service ───────────────────────────────────────────── */
export const AuthService = {

  /**
   * Attempt to log in with provided credentials.
   *
   * @param {string}  emailOrId  - Email address or User ID (e.g. MM-100001)
   * @param {string}  password   - Plain-text password (will be hashed server-side in prod)
   * @param {boolean} rememberMe - Whether to persist the session
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async login(emailOrId, password, rememberMe = false) {
    /* ——— REPLACE THIS BLOCK with a real fetch() call when backend is ready ———
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrId, password }),
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message || 'Login failed.' };
    this._persistSession(data.token, data.user, rememberMe);
    return { success: true, user: data.user };
    ————————————————————————————————————————————— */
    return this._simulateLogin(emailOrId, password, rememberMe);
  },

  /**
   * Simulated login (frontend-only, for development).
   * Remove this once the real backend is connected.
   */
  async _simulateLogin(emailOrId, password, rememberMe) {
    await sleep(1800); // simulate network latency

    const match = DEMO_CREDENTIALS.find(
      c => c.emailOrId.toLowerCase() === emailOrId.trim().toLowerCase()
           && c.password === password
    );

    if (match) {
      const fakeToken = `mm_dev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const user = { name: match.name, accountNo: match.accountNo, email: match.emailOrId };
      this._persistSession(fakeToken, user, rememberMe);
      return { success: true, user };
    }

    return {
      success: false,
      error: 'Incorrect email/User ID or password. Please check your credentials and try again.',
    };
  },

  /**
   * Send a password reset link/OTP to the provided email.
   * @param {string} email
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async forgotPassword(email) {
    /* ——— REPLACE with real API call ———
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) return { success: false, error: data.message };
    return { success: true, message: data.message };
    —————————————————————————————— */
    await sleep(1400); // simulate network
    const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email.trim())) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    return {
      success: true,
      message: `A password reset link has been sent to ${email}. Please check your inbox.`,
    };
  },

  /**
   * Log the current user out.
   */
  logout() {
    Storage.remove(AUTH_TOKEN_KEY);
    Storage.remove(AUTH_USER_KEY);
    Session.remove(AUTH_TOKEN_KEY);
    Session.remove(AUTH_USER_KEY);
    window.location.href = '/index.html';
  },

  /**
   * Check if a user is currently authenticated.
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!(Storage.get(AUTH_TOKEN_KEY) || Session.get(AUTH_TOKEN_KEY));
  },

  /**
   * Get the current logged-in user object.
   * @returns {object|null}
   */
  getCurrentUser() {
    return Storage.get(AUTH_USER_KEY) || Session.get(AUTH_USER_KEY);
  },

  /**
   * Get the stored authentication token.
   * @returns {string|null}
   */
  getToken() {
    return Storage.get(AUTH_TOKEN_KEY) || Session.get(AUTH_TOKEN_KEY);
  },

  /**
   * Guard a page: redirect to login if not authenticated.
   * Call this at the top of any protected page script.
   */
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = '/index.html';
    }
  },

  /**
   * Remember the email/userId for the "Remember Me" feature.
   */
  saveRememberedUser(emailOrId) {
    Storage.set(REMEMBER_ME_KEY, emailOrId);
  },

  getRememberedUser() {
    return Storage.get(REMEMBER_ME_KEY);
  },

  clearRememberedUser() {
    Storage.remove(REMEMBER_ME_KEY);
  },

  /* Internal: persist session */
  _persistSession(token, user, rememberMe) {
    if (rememberMe) {
      Storage.set(AUTH_TOKEN_KEY, token);
      Storage.set(AUTH_USER_KEY, user);
      this.saveRememberedUser(user.email || user.accountNo);
    } else {
      Session.set(AUTH_TOKEN_KEY, token);
      Session.set(AUTH_USER_KEY, user);
      this.clearRememberedUser();
    }
  },
};
