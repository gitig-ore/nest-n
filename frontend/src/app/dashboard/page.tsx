'use client';

import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/lib/protected-route';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
            >
              Logout
            </button>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Welcome Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Selamat Datang</h2>
              <p className="text-gray-600 mb-4">
                Halo, <span className="font-semibold">{user?.nama || user?.email}</span>!
              </p>
              <p className="text-gray-600">
                Anda berhasil login ke sistem manajemen peminjaman barang kami.
              </p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi Profil</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-gray-900 font-medium">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nama</p>
                  <p className="text-gray-900 font-medium">
                    {user?.nama}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="text-gray-900 font-medium capitalize">
                    {user?.role === 'ADMIN' ? 'Administrator' : 'Pengguna'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Barang</h3>
              <p className="text-gray-600 text-sm mb-3">Lihat dan kelola daftar barang</p>
              <a href="/barang" className="text-blue-600">Buka halaman Barang →</a>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Peminjaman</h3>
              <p className="text-gray-600 text-sm mb-3">Pinjam atau kelola peminjaman</p>
              <a href="/loan" className="text-blue-600">Buka halaman Loan →</a>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pengaturan</h3>
              <p className="text-gray-600 text-sm mb-3">Kelola akun dan preferensi Anda</p>
              {user?.role === 'ADMIN' ? (
                <a href="/users" className="text-blue-600">Manajemen Users →</a>
              ) : (
                <span className="text-sm text-gray-500">Akses terbatas</span>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
