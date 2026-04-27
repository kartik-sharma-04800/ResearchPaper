import axios from 'axios';
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
export const authAPI = {
  register:   (data) => API.post('/auth/register', data),
  login:      (data) => API.post('/auth/login', data),
  verifyMfa:  (data) => API.post('/auth/verify-mfa', data),
  resendMfa:  (data) => API.post('/auth/resend-mfa', data),
  me:         ()     => API.get('/auth/me'),
};
export const anomalyAPI = {
  getStats:        ()       => API.get('/anomalies/stats'),
  getLoginHistory: (params) => API.get('/anomalies/login-history', { params }),
  getAlerts:       (params) => API.get('/anomalies/alerts', { params }),
  resolveAlert:    (id)     => API.patch(`/anomalies/alerts/${id}/resolve`),
  getProfile:      ()       => API.get('/anomalies/profile'),
  mlHealth:        ()       => API.get('/anomalies/ml-health'),
};
export const alertAPI = {
  getUnresolved: () => API.get('/alerts/unresolved'),
  resolve:       (id) => API.patch(`/alerts/${id}/resolve`),
  resolveAll:    ()   => API.post('/alerts/resolve-all'),
};
export const userAPI = {
  getProfile:     ()     => API.get('/users/profile'),
  updateProfile:  (data) => API.put('/users/profile', data),
  changePassword: (data) => API.put('/users/change-password', data),
  getAllUsers:     ()     => API.get('/users/admin/all'),
  toggleSuspend:  (id)   => API.patch(`/users/admin/${id}/suspend`),
};
export default API;
