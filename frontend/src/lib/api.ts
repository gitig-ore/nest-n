'use client';

import axios from 'axios';

// Use Vercel backend URL in production, fallback to localhost
const PRODUCTION_API_URL = 'https://nest-62fbj1ktg-alif-anwars-projects-8475ac4f.vercel.app';

const getApiUrl = () => {
  // Check for environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // In production on Vercel, use the production backend URL
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
    return PRODUCTION_API_URL;
  }
  return 'http://localhost:3001';
};

const API_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Add request interceptor to include access token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        // If there's no refresh token, bail out and broadcast logout
        if (!refreshToken) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.dispatchEvent(new Event('auth:logout'));
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (err) {
        console.error('Token refresh failed', err);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Broadcast a custom event so the AuthProvider can handle navigation
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
