// utils/api.js — Centralizador de requisições HTTP

const API_BASE = window.__APP_CONFIG__?.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ── Public config (fetched once from backend) ──────────────────────────────
let _config = null;
export async function getPublicConfig() {
  if (_config) return _config;
  try {
    const res = await fetch(`${API_BASE}/config`);
    _config = await res.json();
  } catch (_) {
    _config = {};
  }
  return _config;
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
    config.headers['Content-Type'] = 'application/json';
  }

  if (config.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const res  = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (res.status === 401) {
      // Only redirect on expired token, not on login attempts
      const isLoginEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
      if (!isLoginEndpoint) {
        localStorage.clear();
        window.location.href = '/';
      }
      return { ok: false, status: 401, data };
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('Erro na requisição:', err);
    return { ok: false, status: 0, data: { message: 'Erro de conexão com o servidor.' } };
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────────
export const Auth = {
  login:               (email, password)                                            => request('/auth/login',              { method: 'POST', body: { email, password } }),
  register:            (name, email, password, role, barbershopName, barbershopId, extra) => request('/auth/register', { method: 'POST', body: { name, email, password, role, barbershopName, barbershopId, ...extra } }),
  verifyEmail:         (token)                                                      => request(`/auth/verify-email/${token}`),
  resendVerification:  (email)                                                      => request('/auth/resend-verification', { method: 'POST', body: { email } }),
  forgotPassword:      (email)                                                      => request('/auth/forgot-password',    { method: 'POST', body: { email } }),
  resetPassword:       (token, password)                                            => request(`/auth/reset-password/${token}`, { method: 'POST', body: { password } }),
  selectProfile:       (email, password, profileId)                                => request('/auth/select-profile',    { method: 'POST', body: { email, password, profileId } }),
  switchProfile:       (profileId)                                                 => request('/auth/switch-profile',    { method: 'POST', body: { profileId } }),
  getProfiles:         ()                                                           => request('/auth/profiles'),
  me:                  ()                                                           => request('/auth/me'),
};

// ── Services ───────────────────────────────────────────────────────────────────
export const Services = {
  getAll: ()          => request('/services'),
  create: (data)      => request('/services',        { method: 'POST',   body: data }),
  update: (id, data)  => request(`/services/${id}`,  { method: 'PUT',    body: data }),
  delete: (id)        => request(`/services/${id}`,  { method: 'DELETE' }),
};

// ── Appointments ───────────────────────────────────────────────────────────────
export const Appointments = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/appointments${qs ? '?' + qs : ''}`);
  },
  create: (data)     => request('/appointments',        { method: 'POST',   body: data }),
  update: (id, data) => request(`/appointments/${id}`,  { method: 'PUT',    body: data }),
  delete: (id)       => request(`/appointments/${id}`,  { method: 'DELETE' }),
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const Users = {
  getMe:           ()      => request('/users/me'),
  updateMe:        (data)  => request('/users/me',             { method: 'PUT', body: data }),
  savePreferences: (data)  => request('/users/me/preferences', { method: 'PUT', body: data }),
};

// ── Barbershops ────────────────────────────────────────────────────────────────
export const Barbershops = {
  getAll:         ()           => request('/barbershops'),
  getMine:        ()           => request('/barbershops/mine'),
  get:            (id)         => request(`/barbershops/${id}`),
  create:         (data)       => request('/barbershops',                         { method: 'POST',   body: data }),
  update:         (id, data)   => request(`/barbershops/${id}`,                   { method: 'PUT',    body: data }),
  delete:         (id)         => request(`/barbershops/${id}`,                   { method: 'DELETE' }),
  getEmployees:         (id)              => request(`/barbershops/${id}/employees`),
  createEmployee:       (id, data)        => request(`/barbershops/${id}/employees`,                         { method: 'POST',   body: data }),
  resetEmployeePassword:(id, uid, pwd)    => request(`/barbershops/${id}/employees/${uid}/reset-password`,   { method: 'PUT',    body: { password: pwd } }),
  updateEmployeeRole:   (id, uid, data)   => request(`/barbershops/${id}/employees/${uid}/role`,             { method: 'PUT',    body: data }),
  removeEmployee:       (id, userId)      => request(`/barbershops/${id}/employees/${userId}`,               { method: 'DELETE' }),
};

// ── Roles (Funções personalizadas) ─────────────────────────────────────────────
export const Roles = {
  getAll:  ()          => request('/roles'),
  create:  (data)      => request('/roles',        { method: 'POST',   body: data }),
  update:  (id, data)  => request(`/roles/${id}`,  { method: 'PUT',    body: data }),
  delete:  (id)        => request(`/roles/${id}`,  { method: 'DELETE' }),
};

// ── Upload ─────────────────────────────────────────────────────────────────────
export const Upload = {
  file: (file, type) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return request('/upload', { method: 'POST', body: form });
  },
};

// ── Clients ────────────────────────────────────────────────────────────────────
export const Clients = {
  getAll:  (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/clients${qs ? '?' + qs : ''}`); },
  get:     (id)          => request(`/clients/${id}`),
  create:  (data)        => request('/clients',        { method: 'POST',   body: data }),
  update:  (id, data)    => request(`/clients/${id}`,  { method: 'PUT',    body: data }),
  delete:  (id)          => request(`/clients/${id}`,  { method: 'DELETE' }),
};

// ── Reports ────────────────────────────────────────────────────────────────────
export const Reports = {
  get: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports${qs ? '?' + qs : ''}`);
  },
};

// ── Products / Stock ───────────────────────────────────────────────────────────
export const Products = {
  getAll:       (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/products${qs ? '?' + qs : ''}`); },
  create:       (data)        => request('/products',                    { method: 'POST',   body: data }),
  update:       (id, data)    => request(`/products/${id}`,              { method: 'PUT',    body: data }),
  delete:       (id)          => request(`/products/${id}`,              { method: 'DELETE' }),
  addMovement:  (id, data)    => request(`/products/${id}/movement`,     { method: 'POST',   body: data }),
  getMovements: (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/products/movements${qs ? '?' + qs : ''}`); },
  getReport:    (params = {}) => { const qs = new URLSearchParams(params).toString(); return request(`/products/report${qs ? '?' + qs : ''}`); },
};

// ── Service Categories ─────────────────────────────────────────────────────────
export const ServiceCategories = {
  getAll:  ()           => request('/service-categories'),
  create:  (data)       => request('/service-categories',        { method: 'POST',   body: data }),
  update:  (id, data)   => request(`/service-categories/${id}`,  { method: 'PUT',    body: data }),
  remove:  (id)         => request(`/service-categories/${id}`,  { method: 'DELETE' }),
};

// ── Reception IA ───────────────────────────────────────────────────────────────
export const Reception = {
  getStatus:       ()    => request('/reception/status'),
  connect:         ()    => request('/reception/connect',    { method: 'POST' }),
  disconnect:      ()    => request('/reception/disconnect', { method: 'POST' }),
  getConversations:()    => request('/reception/conversations'),
  getConversation: (id)  => request(`/reception/conversations/${id}`),
  getUsage: (params) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/reception/usage${qs}`);
  },
  // Returns the SSE URL (caller creates EventSource with token in query)
  qrUrl: () => {
    const token = localStorage.getItem('token');
    const base  = window.__APP_CONFIG__?.apiUrl || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    return `${base}/reception/qr?token=${encodeURIComponent(token)}`;
  },
};

// ── Billing ────────────────────────────────────────────────────────────────────
export const Billing = {
  get:                    ()                                        => request('/billing'),
  subscribe:              (planKey, paymentMethodId)                => request('/billing/subscribe',       { method: 'POST', body: { planKey, paymentMethodId } }),
  buyPackage:             (messages, quantity, paymentMethodId)     => request('/billing/buy-package',     { method: 'POST', body: { messages, quantity, paymentMethodId } }),
  confirmPackage:         (paymentIntentId)                        => request('/billing/confirm-package',  { method: 'POST', body: { paymentIntentId } }),
  applyCoupon:            (code)                                   => request('/billing/apply-coupon',     { method: 'POST', body: { code } }),
  cancel:                 ()                                       => request('/billing/cancel',           { method: 'POST' }),
  // Card management (in-app, NO Checkout)
  getCards:               ()                                       => request('/billing/cards'),
  createSetupIntent:      ()                                       => request('/billing/cards/setup-intent', { method: 'POST' }),
  attachPaymentMethod:    (paymentMethodId)                        => request('/billing/cards/attach',     { method: 'POST', body: { paymentMethodId } }),
  deleteCard:             (pmId)                                   => request(`/billing/cards/${pmId}`,    { method: 'DELETE' }),
  setDefaultCard:         (pmId)                                   => request(`/billing/cards/${pmId}/set-default`, { method: 'POST' }),
};

// ── Financial ─────────────────────────────────────────────────────────────────
export const Financial = {
  // Cash register
  getCash:          ()          => request('/financial/cash'),
  openCash:         (data)      => request('/financial/cash/open',     { method: 'POST', body: data }),
  closeCash:        (data)      => request('/financial/cash/close',    { method: 'POST', body: data }),
  getCashHistory:   (params)    => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/financial/cash/history${qs}`); },
  // Transactions
  getTransactions:  (params)    => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/financial/transactions${qs}`); },
  createTransaction:(data)      => request('/financial/transactions',  { method: 'POST', body: data }),
  deleteTransaction:(id)        => request(`/financial/transactions/${id}`, { method: 'DELETE' }),
  // Commissions
  getCommissions:   (params)    => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/financial/commissions${qs}`); },
  payCommissions:   (data)      => request('/financial/commissions/pay', { method: 'POST', body: data }),
  // Tabs
  getTabs:          (params)    => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return request(`/financial/tabs${qs}`); },
  createTab:        (data)      => request('/financial/tabs',           { method: 'POST', body: data }),
  getTab:           (id)        => request(`/financial/tabs/${id}`),
  addTabItem:       (id, data)  => request(`/financial/tabs/${id}/items`, { method: 'POST', body: data }),
  removeTabItem:    (id, itemId)=> request(`/financial/tabs/${id}/items/${itemId}`, { method: 'DELETE' }),
  closeTab:         (id, data)  => request(`/financial/tabs/${id}/close`, { method: 'POST', body: data }),
};

// ── Platform Admin ────────────────────────────────────────────────────────────
function requestAdmin(endpoint, options = {}) {
  const token = localStorage.getItem('adminToken');
  return request(endpoint, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export const PlatformAdmin = {
  login:           (email, password)     => request('/platform/auth/login',         { method: 'POST', body: { email, password } }),
  verify2FA:       (email, code)         => request('/platform/auth/verify-2fa',    { method: 'POST', body: { email, code } }),
  acceptInvite:    (token, password)     => request('/platform/auth/accept-invite', { method: 'POST', body: { token, password } }),
  forgotPassword:  (email)              => request('/platform/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword2:  (email, code, newPassword) => request('/platform/auth/reset-password', { method: 'POST', body: { email, code, newPassword } }),
  changePassword:  (currentPassword, newPassword) => requestAdmin('/platform/auth/change-password', { method: 'PUT', body: { currentPassword, newPassword } }),
  me:              ()                    => requestAdmin('/platform/auth/me'),
  getDashboard:    ()                    => requestAdmin('/platform/dashboard'),
  getClients:      (params)              => { const qs = params ? '?' + new URLSearchParams(params).toString() : ''; return requestAdmin(`/platform/clients${qs}`); },
  getAIStats:      ()                    => requestAdmin('/platform/ai-stats'),
  getAdmins:       ()                    => requestAdmin('/platform/admins'),
  inviteAdmin:     (data)                => requestAdmin('/platform/admins/invite', { method: 'POST', body: data }),
  resetPassword:   (id)                  => requestAdmin(`/platform/admins/${id}/reset-password`, { method: 'POST' }),
};

// ── Chat (Lia — assistente profissional) ──────────────────────────────────────
export const Chat = {
  sendMessage: (message, history = []) => request('/chat/message', { method: 'POST', body: { message, history } }),
};

// ── Portal (Client-facing) ────────────────────────────────────────────────────
function requestPortal(endpoint, options = {}) {
  const token = localStorage.getItem('clientToken');
  return request(endpoint, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export const Portal = {
  Auth: {
    register:       (name, phone, password) => requestPortal('/portal/auth/register',        { method: 'POST', body: { name, phone, password } }),
    login:          (phone, password)       => requestPortal('/portal/auth/login',           { method: 'POST', body: { phone, password } }),
    me:             ()                      => requestPortal('/portal/auth/me'),
    updateProfile:  (data)                  => requestPortal('/portal/auth/me',              { method: 'PUT',  body: data }),
    forgotPassword: (phone)                 => requestPortal('/portal/auth/forgot-password', { method: 'POST', body: { phone } }),
    resetPassword:  (phone, code, newPassword) => requestPortal('/portal/auth/reset-password', { method: 'POST', body: { phone, code, newPassword } }),
  },
  Barbershops: {
    search:   (params = {}) => { const qs = new URLSearchParams(params).toString(); return requestPortal(`/portal/barbershops${qs ? '?' + qs : ''}`); },
    get:      (id)          => requestPortal(`/portal/barbershops/${id}`),
    getSlots: (id, params)  => { const qs = new URLSearchParams(params).toString(); return requestPortal(`/portal/barbershops/${id}/slots?${qs}`); },
  },
  Appointments: {
    getAll: ()       => requestPortal('/portal/appointments'),
    create: (data)   => requestPortal('/portal/appointments', { method: 'POST', body: data }),
    cancel: (id)     => requestPortal(`/portal/appointments/${id}/cancel`, { method: 'PUT' }),
  },
};

const API = { Auth, Users, Services, Appointments, Clients, Barbershops, Upload, Reports, Billing, Products, ServiceCategories, Reception, Chat, Portal, Financial, PlatformAdmin };
export default API;
