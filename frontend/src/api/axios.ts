import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Base URL points to Express backend (configurable via environment variable)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer Token to outgoing requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors and 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<{ error?: string }>) => {
    if (error.response?.status === 401) {
      // Clear expired credentials
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Only redirect if not already on authentication pages
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/sign-in') && !currentPath.includes('/sign-up')) {
        window.dispatchEvent(new Event('auth-unauthorized'));
      }
    }

    const message =
      error.response?.data?.error || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
