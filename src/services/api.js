/**
 * src/services/api.js
 *
 * Centralised Axios instance. Automatically attaches the JWT
 * Bearer token from AsyncStorage to every request.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let loggingOut = false;
export const setLoggingOut = (val) => {
  loggingOut = Boolean(val);
};
export const isLoggingOut = () => loggingOut;

// ─── Request interceptor — attach token ────────────────────────────────────
api.interceptors.request.use(async (config) => {
  if (loggingOut) {
    const controller = new AbortController();
    controller.abort();
    config.signal = controller.signal;
    return config;
  }

  try {
    const raw = await AsyncStorage.getItem('@falo_auth');
    if (raw) {
      const { token } = JSON.parse(raw);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) {}
  return config;
});

// ─── Response interceptor — normalise errors ─────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // If request was cancelled or user is logging out, fail silently
    if (axios.isCancel(err) || err.name === 'CanceledError' || loggingOut) {
      const silentErr = new Error('Request cancelled');
      silentErr.isSilent = true;
      silentErr.isAuthError = true;
      return Promise.reject(silentErr);
    }

    const status = err.response?.status;
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.[0]?.message ||
      err.message ||
      'Something went wrong. Please try again.';

    const customError = new Error(message);
    customError.status = status;
    customError.response = err.response;

    // If 401 Unauthorized occurs
    if (status === 401) {
      customError.isAuthError = true;
      const raw = await AsyncStorage.getItem('@falo_auth').catch(() => null);
      if (!raw || loggingOut) {
        customError.isSilent = true;
      }
    }

    return Promise.reject(customError);
  }
);

export default api;

// ════════════════════════════════════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════════════════════════════════════
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
};

export const societiesAPI = {
  getAll: ()       => api.get('/societies'),
  getOne: (id)     => api.get(`/societies/${id}`),
  create: (data)   => api.post('/societies', data),
  update: (id, d)  => api.patch(`/societies/${id}`, d),
  remove: (id)     => api.delete(`/societies/${id}`),
};

// ════════════════════════════════════════════════════════════════════════════
// RESIDENTS
// ════════════════════════════════════════════════════════════════════════════
export const residentsAPI = {
  getAll:     ()       => api.get('/residents'),
  getMe:      ()       => api.get('/residents/me'),
  add:        (data)   => api.post('/residents', data),
  update:     (id, d)  => api.patch(`/residents/${id}`, d),
  remove:     (id)     => api.delete(`/residents/${id}`),
};

// ════════════════════════════════════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════════════════════════════════════
export const eventsAPI = {
  getAll:     ()       => api.get('/events'),
  create:     (data)   => api.post('/events', data),
  dashboard:  (id)     => api.get(`/events/${id}/dashboard`),
  update:     (id, d)  => api.patch(`/events/${id}`, d),
  remove:     (id)     => api.delete(`/events/${id}`),
  exportExcel:(id)     => api.get(`/events/${id}/export/excel`, { responseType: 'blob' }),
};

// ════════════════════════════════════════════════════════════════════════════
// CONTRIBUTIONS
// ════════════════════════════════════════════════════════════════════════════
export const contributionsAPI = {
  record:     (data)   => api.post('/contributions', data),
  getAll:     (params) => api.get('/contributions', { params }),
  pdfReceipt: (id)     => api.get(`/contributions/${id}/pdf-receipt`, { responseType: 'blob' }),
  remove:     (id)     => api.delete(`/contributions/${id}`),
};

// ════════════════════════════════════════════════════════════════════════════
// EXPENSES
// ════════════════════════════════════════════════════════════════════════════
export const expensesAPI = {
  /**
   * log — multipart/form-data to support optional receipt image.
   * @param {FormData} formData
   */
  log:          (formData) =>
    api.post('/expenses', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update:       (id, formData) =>
    api.patch(`/expenses/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAll:       (params) => api.get('/expenses', { params }),
  updateStatus: (id, status, rejectionReason) => api.patch(`/expenses/${id}/status`, { status, rejectionReason }),
  remove:       (id)     => api.delete(`/expenses/${id}`),
};
