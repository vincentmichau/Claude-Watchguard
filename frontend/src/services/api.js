import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getCurrentUser: () => api.get('/auth/me'),
};

// Reports API
export const reportsAPI = {
  getAll: (params) => api.get('/reports', { params }),
  getById: (id) => api.get(`/reports/${id}`),
  create: (data) => api.post('/reports', data),
  update: (id, data) => api.put(`/reports/${id}`, data),
  delete: (id) => api.delete(`/reports/${id}`),
  validate: (id) => api.post(`/reports/${id}/validate`),
};

// Events API
export const eventsAPI = {
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  getByReport: (reportId) => api.get(`/events/report/${reportId}`),
};

// Shifts API
export const shiftsAPI = {
  getAll: (params) => api.get('/shifts', { params }),
  create: (data) => api.post('/shifts', data),
  update: (id, data) => api.put(`/shifts/${id}`, data),
  delete: (id) => api.delete(`/shifts/${id}`),
  syncCombo: () => api.post('/shifts/sync-combo'),
  exportIcal: (params) => api.get('/shifts/export/ical', { params, responseType: 'blob' }),
};

// Admin API
export const adminAPI = {
  // Users
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Clients
  getClients: () => api.get('/admin/clients'),
  createClient: (data) => api.post('/admin/clients', data),
  updateClient: (id, data) => api.put(`/admin/clients/${id}`, data),
  
  // Sites
  getSites: () => api.get('/admin/sites'),
  createSite: (data) => api.post('/admin/sites', data),
  updateSite: (id, data) => api.put(`/admin/sites/${id}`, data),
  
  // Recipients
  getRecipients: (params) => api.get('/admin/recipients', { params }),
  addRecipient: (data) => api.post('/admin/recipients', data),
};

// Photos API
export const photosAPI = {
  upload: (formData) => api.post('/photos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (id) => `${API_URL}/photos/${id}`,
  delete: (id) => api.delete(`/photos/${id}`),
};

// PDF API
export const pdfAPI = {
  generate: (reportId) => api.get(`/pdf/generate/${reportId}`, { responseType: 'blob' }),
  send: (reportId) => api.post(`/pdf/send/${reportId}`),
};

export default api;
