import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public auth endpoints must never carry an Authorization header. A stale/expired token
// left in localStorage would otherwise be rejected by the server before login/refresh
// runs ("Given token not valid for any token type") — blocking the very call meant to
// replace it. (The backend also ignores it now; this keeps the client honest too.)
const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/token/refresh'];

const isPublicAuthUrl = (url?: string) =>
  !!url && PUBLIC_AUTH_PATHS.some((p) => url.includes(p));

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && !isPublicAuthUrl(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/api/v1/auth/token/refresh/`, {
          refresh: refreshToken,
        });

        // The refresh endpoint returns { tokens: { access, refresh } }; tolerate a flat
        // shape too. Persist BOTH tokens: with ROTATE_REFRESH_TOKENS + BLACKLIST the old
        // refresh token is blacklisted on use, so keeping it would break the next refresh
        // and force a needless re-login (which is what made this recur every restart).
        const tokens = response.data?.tokens ?? response.data;
        const newAccess = tokens?.access;
        const newRefresh = tokens?.refresh;
        if (!newAccess) {
          throw new Error('No access token in refresh response');
        }
        localStorage.setItem('access_token', newAccess);
        if (newRefresh) {
          localStorage.setItem('refresh_token', newRefresh);
        }

        // Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
