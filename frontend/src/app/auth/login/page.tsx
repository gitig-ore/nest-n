"use client";

import React, { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Input from '@/components/shadcn/Input';
import Button from '@/components/shadcn/Button';

export default function LoginPage() {
  // Role selection: 'siswa' | 'guru' | 'lainnya'
  const [loginAs, setLoginAs] = useState<'siswa' | 'guru' | 'lainnya' | null>(null);
  const [nisn, setNisn] = useState('');
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  // Redirect to dashboard when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Require role selection
    if (!loginAs) {
      setError('Silakan pilih login sebagai Siswa, Guru, atau Lainnya');
      return;
    }

    // For admin login with NIP
    if (loginAs === 'guru' && nip === '1234567890' && nama === 'Admin IGPP') {
      setIsLoading(true);
      try {
        await login(nip, password);
        router.push('/dashboard');
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Login gagal');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Validate fields
    if (loginAs === 'siswa' && !nisn) {
      setError('Silakan masukkan NISN');
      return;
    }

    if (loginAs === 'guru' && !nip) {
      setError('Silakan masukkan NIP');
      return;
    }

    if (!nama) {
      setError('Silakan masukkan Nama Lengkap');
      return;
    }

    if (!password) {
      setError('Silakan masukkan Password');
      return;
    }

    setIsLoading(true);

    // Determine identifier based on selected role
    const identifier = loginAs === 'siswa' ? nisn : loginAs === 'guru' ? nip : nama;

    try {
      await login(identifier, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login gagal. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b2140] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-8">

        <div className="flex gap-2 mb-3">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
          <span className="w-3 h-3 rounded-full bg-green-400 inline-block" />
        </div>

        <div className="w-16 h-16 bg-[#0b2140] rounded-md mx-auto mb-4 flex items-center justify-center overflow-hidden">
          <img src="/igpp.png" alt="Logo" className="w-15 h-15 object-contain" />
        </div>

        <h1 className="text-2xl font-bold text-[#0b2140] text-center mb-6">MASUK</h1>

        <p className="text-gray-600 mb-4 text-center">Login sebagai?</p>

        <div className="flex gap-3 justify-center mb-6">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${loginAs === 'siswa' ? 'bg-[#0b2140] text-white' : 'bg-gray-100 text-gray-700 '}`}
            onClick={() => { setLoginAs('siswa'); setNisn(''); setNip(''); setNama(''); setPassword(''); }}
            type="button"
          >
            Siswa
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${loginAs === 'guru' ? 'bg-[#0b2140] text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => { setLoginAs('guru'); setNisn(''); setNip(''); setNama(''); setPassword(''); }}
            type="button"
          >
            Guru
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium ${loginAs === 'lainnya' ? 'bg-[#0b2140] text-white' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => { setLoginAs('lainnya'); setNisn(''); setNip(''); setNama(''); setPassword(''); }}
            type="button"
          >
            Lainnya
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!loginAs ? (
          <div className="mb-6 text-center text-sm text-gray-600">
            <div>Silakan pilih login sebagai Siswa, Guru, atau Lainnya terlebih dahulu</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {loginAs === 'siswa' && (
              <div>
                <label htmlFor="nisn" className="block text-sm font-medium text-black mb-1">NISN</label>
                <Input
                  id="nisn"
                  type="text"
                  value={nisn}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNisn(e.target.value)}
                  required
                  placeholder="Masukkan NISN"
                  className="py-3 rounded-xl bg-gray-50 text-black"
                  autoComplete="off"
                />
              </div>
            )}

            {loginAs === 'guru' && (
              <div>
                <label htmlFor="nip" className="block text-sm font-medium text-black mb-1">NIP</label>
                <Input
                  id="nip"
                  type="text"
                  value={nip}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNip(e.target.value)}
                  required
                  placeholder="Masukkan NIP"
                  className="py-3 rounded-xl bg-gray-50 text-black"
                  autoComplete="off"
                />
              </div>
            )}

            <div>
              <label htmlFor="nama" className="block text-sm font-medium text-black mb-1">Nama Lengkap</label>
              <Input
                id="nama"
                type="text"
                value={nama}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNama(e.target.value)}
                required
                placeholder="Masukkan Nama Lengkap"
                className="py-3 rounded-xl bg-gray-50 text-black"
                autoComplete="off"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black mb-1">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                placeholder="Masukkan Password"
                className="py-3 rounded-xl bg-gray-50 text-black"
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0b2140] text-white font-semibold py-3 rounded-2xl shadow-lg hover:bg-[#0a1d38] transition-colors"
            >
              {isLoading ? 'Sedang masuk...' : 'Masuk'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
