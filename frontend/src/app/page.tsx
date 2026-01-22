'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="flex flex-col items-center justify-center gap-8 text-center px-4">
        <div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">E-Commerce</h1>
          <p className="text-xl text-gray-600">Platform belanja online terpercaya</p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
          >
            Login
          </Link>
          <Link
            href="/auth/register"
            className="bg-white hover:bg-gray-100 text-blue-600 font-semibold py-3 px-8 rounded-lg border-2 border-blue-600 transition duration-200"
          >
            Daftar
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Fitur Utama</h2>
          <ul className="text-left space-y-3 text-gray-600">
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>Autentikasi dan otorisasi yang aman</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>Manajemen profil pengguna lengkap</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>Token refresh otomatis untuk keamanan maksimal</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 font-bold mr-3">✓</span>
              <span>Integrasi database PostgreSQL yang robust</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
