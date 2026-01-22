"use client";

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function Nav() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="font-semibold text-gray-800">Dashboard</Link>
          <Link href="/barang" className="text-sm text-gray-600">Barang</Link>
          <Link href="/loan" className="text-sm text-gray-600">Loan</Link>
          {user?.role === 'ADMIN' && (
            <Link href="/users" className="text-sm text-gray-600">Users</Link>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">{user?.nama ?? user?.email ?? ''}</span>
          <button onClick={handleLogout} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Logout</button>
        </div>
      </div>
    </nav>
  );
}
