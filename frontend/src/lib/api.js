import axios from 'axios';
import useAuthStore from '../store/authStore';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateTheme: (theme) => api.put('/auth/theme', { theme }),
};

// Project APIs
export const projectAPI = {
  getAll: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Message/Chat APIs
export const chatAPI = {
  getMessages: (projectId) => api.get(`/messages/${projectId}`),
  sendMessage: (data) => api.post('/chat', data),
};

// Payment APIs
export const paymentAPI = {
  getPlans: () => api.get('/subscription/plans'),
  createCheckout: (data) => api.post('/payments/checkout', data),
  getStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
};

// Plugin APIs
export const pluginAPI = {
  getStatus: () => api.get('/plugin/status'),
};

export default api;
