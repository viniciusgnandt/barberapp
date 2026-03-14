// utils/api.js — Centralizador de requisições HTTP

const API_BASE = 'http://localhost:3000/api';

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
      localStorage.clear();
      window.location.href = '/';
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
  login:         (email, password)                                            => request('/auth/login',          { method: 'POST', body: { email, password } }),
  register:      (name, email, password, role, barbershopName, barbershopId) => request('/auth/register',       { method: 'POST', body: { name, email, password, role, barbershopName, barbershopId } }),
  selectProfile: (email, password, profileId)                                => request('/auth/select-profile', { method: 'POST', body: { email, password, profileId } }),
  switchProfile: (profileId)                                                 => request('/auth/switch-profile', { method: 'POST', body: { profileId } }),
  getProfiles:   ()                                                           => request('/auth/profiles'),
  me:            ()                                                           => request('/auth/me'),
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
  getMe:    ()      => request('/users/me'),
  updateMe: (data)  => request('/users/me', { method: 'PUT', body: data }),
};

// ── Barbershops ────────────────────────────────────────────────────────────────
export const Barbershops = {
  getAll:         ()           => request('/barbershops'),
  getMine:        ()           => request('/barbershops/mine'),
  get:            (id)         => request(`/barbershops/${id}`),
  create:         (data)       => request('/barbershops',                         { method: 'POST',   body: data }),
  update:         (id, data)   => request(`/barbershops/${id}`,                   { method: 'PUT',    body: data }),
  delete:         (id)         => request(`/barbershops/${id}`,                   { method: 'DELETE' }),
  getEmployees:   (id)         => request(`/barbershops/${id}/employees`),
  removeEmployee: (id, userId) => request(`/barbershops/${id}/employees/${userId}`,{ method: 'DELETE' }),
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

// ── Reports ────────────────────────────────────────────────────────────────────
export const Reports = {
  get: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/reports${qs ? '?' + qs : ''}`);
  },
};

// ── Billing ────────────────────────────────────────────────────────────────────
export const Billing = {
  get:          ()       => request('/billing'),
  pay:          (data)   => request('/billing/pay',          { method: 'POST', body: data }),
  applyCoupon:  (code)   => request('/billing/apply-coupon', { method: 'POST', body: { code } }),
  cancel:       ()       => request('/billing/cancel',       { method: 'POST' }),
};

const API = { Auth, Users, Services, Appointments, Barbershops, Upload, Reports, Billing };
export default API;
