'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from './api';

interface JWTPayload {
  sub: string;
  identifier: string;
  role: 'ADMIN' | 'PEMINJAM';
  exp?: number;
}

// Helper to decode JWT token without verification (for client-side caching)
function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export interface User {
  id: string;
  nama: string;
  email: string;
  role: 'PEMINJAM' | 'ADMIN';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();

  // Load cached user data from localStorage/JWT on mount for faster initial render
  useEffect(() => {
    const cachedUserStr = localStorage.getItem('cachedUser');
    const token = localStorage.getItem('accessToken');

    if (cachedUserStr && token) {
      try {
        // Use cached user data immediately
        const cachedUser = JSON.parse(cachedUserStr);
        setUser(cachedUser);
      } catch {
        // Invalid cached data, try JWT decode
        const payload = decodeJWT(token);
        if (payload) {
          setUser({
            id: payload.sub,
            nama: 'User',
            email: payload.identifier,
            role: payload.role,
          });
        }
      }
    } else if (token) {
      // Try JWT decode as fallback
      const payload = decodeJWT(token);
      if (payload) {
        setUser({
          id: payload.sub,
          nama: 'User',
          email: payload.identifier,
          role: payload.role,
        });
      }
    }
  }, []);

  // Check auth status on mount (background refresh)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const response = await apiClient.get('/auth/me');
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('cachedUser', JSON.stringify(userData));
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('cachedUser');
          setUser(null);
        }
      } else {
        localStorage.removeItem('cachedUser');
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Listen for logout broadcast (from API interceptor) and navigate client-side
  useEffect(() => {
    const onAuthLogout = () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      router.push('/auth/login');
    };

    window.addEventListener('auth:logout', onAuthLogout);
    return () => window.removeEventListener('auth:logout', onAuthLogout);
  }, [router]);

  const login = async (identifier: string, password: string) => {
    try {
      const response = await apiClient.post('/auth/login', { identifier, password });
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      const userData = response.data.user;
      setUser(userData);
      localStorage.setItem('cachedUser', JSON.stringify(userData));

      // Redirect based on role
      if (userData.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/peminjam-dashboard');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login gagal');
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue with logout even if request fails
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('cachedUser');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
