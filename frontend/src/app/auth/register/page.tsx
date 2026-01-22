"use client";

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/shadcn/Input';
import Select from '@/components/shadcn/Select';
import Button from '@/components/shadcn/Button';

export default function RegisterPage() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'PEMINJAM' | 'ADMIN'>('PEMINJAM');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();

  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(nama, email, password, role);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registrasi gagal. Silahkan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12">
      <div className="w-full max-w-md rounded-lg bg-white shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Daftar</h1>
        <p className="text-gray-600 mb-6">Buat akun baru untuk mengelola peminjaman barang</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <Input id="nama" type="text" value={nama} onChange={(e: any) => setNama(e.target.value)} required placeholder="Nama lengkap" autoComplete="name" />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input id="email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} required placeholder="nama@contoh.com" autoComplete="email" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input id="password" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} required minLength={6} placeholder="Minimal 6 karakter" autoComplete="new-password" />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Peran
            </label>
            <Select id="role" value={role} onChange={(e: any) => setRole(e.target.value as 'PEMINJAM' | 'ADMIN')}>
              <option value="PEMINJAM">Peminjam</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Sedang mendaftar...' : 'Daftar'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Sudah punya akun?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Login sekarang
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
