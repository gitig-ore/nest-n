'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('ADMIN' | 'PEMINJAM')[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // If user doesn't have required role, redirect
      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Peminjam trying to access admin routes
        if (user.role === 'PEMINJAM') {
          router.push('/peminjam-dashboard');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // Specific route protection
      if (pathname.startsWith('/dashboard') && user?.role !== 'ADMIN') {
        router.push('/peminjam-dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, router, allowedRoles, redirectTo, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
