"use client";

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import apiClient from '@/lib/api';
import Link from 'next/link';

type Stats = {
  totalBarang: number;
  activeLoans: number;
  pendingLoans: number;
  overdueLoans: number;
  returnedLoans: number;
};

type RecentLoan = {
  id: string;
  status: string;
  tanggalPinjam?: string;
  createdAt: string;
  barang?: { namaBarang: string; kodeBarang: string };
};

export default function PeminjamDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalBarang: 0,
    activeLoans: 0,
    pendingLoans: 0,
    overdueLoans: 0,
    returnedLoans: 0,
  });
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch loans
      const loanRes = await apiClient.get('/loan/me');
      const loans = loanRes.data || [];

      const activeLoans = loans.filter((l: any) => l.status === 'DIPINJAM');
      const pendingLoans = loans.filter((l: any) => l.status === 'PENDING');
      const overdueLoans = loans.filter((l: any) => l.status === 'TERLAMBAT');
      const returnedLoans = loans.filter((l: any) => l.status === 'DIKEMBALIKAN');

      // Fetch barang
      const barangRes = await apiClient.get('/barang');

      setStats({
        totalBarang: barangRes.data?.length || 0,
        activeLoans: activeLoans.length,
        pendingLoans: pendingLoans.length,
        overdueLoans: overdueLoans.length,
        returnedLoans: returnedLoans.length,
      });

      setRecentLoans(loans.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (tanggalPinjam?: string) => {
    if (!tanggalPinjam) return null;
    const borrowed = new Date(tanggalPinjam);
    const deadline = new Date(borrowed.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();

    if (diff <= 0) return { text: 'Terlambat!', color: 'text-red-600' };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return { text: `${hours}j ${minutes}m`, color: 'text-green-600' };
    }
    return { text: `${minutes} menit`, color: 'text-yellow-600' };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'Menunggu' },
      DIPINJAM: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Dipinjam' },
      DIKEMBALIKAN: { bg: 'bg-green-100', text: 'text-green-600', label: 'Dikembalikan' },
      TERLAMBAT: { bg: 'bg-red-100', text: 'text-red-600', label: 'Terlambat' },
    };
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const StatCard = ({
    title,
    value,
    icon,
    color,
    bgColor,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
  }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900">Dashboard Peminjam</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Halo, {user?.nama}</span>
              <Link
                href="/loan"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Pinjam Barang
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">Selamat datang di sistem peminjaman</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Items"
              value={stats.totalBarang}
              color="text-blue-600"
              bgColor="bg-blue-100"
              icon={
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              }
            />
            <StatCard
              title="Sedang Dipinjam"
              value={stats.activeLoans}
              color="text-green-600"
              bgColor="bg-green-100"
              icon={
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <StatCard
              title="Menunggu"
              value={stats.pendingLoans}
              color="text-yellow-600"
              bgColor="bg-yellow-100"
              icon={
                <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Dikembalikan"
              value={stats.returnedLoans}
              color="text-purple-600"
              bgColor="bg-purple-100"
              icon={
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
            />
          </div>

          {/* Alert for Overdue */}
          {stats.overdueLoans > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">Peringatan!</h3>
                    <p className="text-red-700">
                      Anda memiliki {stats.overdueLoans} peminjaman yang melewati batas waktu 24 jam.
                      Segera kembalikan barang Anda.
                    </p>
                  </div>
                </div>
                <Link
                  href="/loan"
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Lihat Detail
                </Link>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profil Saya</h2>
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {user?.nama?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="ml-4">
                  <p className="text-lg font-medium text-gray-900">{user?.nama}</p>
                  <p className="text-sm text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    stats.overdueLoans > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {stats.overdueLoans > 0 ? 'Peringatan!' : 'Aktif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Cepat</h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/barang"
                  className="flex flex-col items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Lihat Barang</span>
                </Link>
                <Link
                  href="/loan"
                  className="flex flex-col items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Peminjaman Saya</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Aktivitas Terbaru</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-500">Memuat data...</p>
              </div>
            ) : recentLoans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>Belum ada aktivitas</p>
                <Link href="/loan" className="text-blue-600 hover:underline mt-2 inline-block">
                  Ajukan peminjaman pertama
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        No
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Barang
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Waktu Tersisa
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Tanggal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentLoans.map((loan, index) => {
                      const timeRemaining = getTimeRemaining(loan.tanggalPinjam);
                      return (
                        <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">{index + 1}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-gray-900">
                              {loan.barang?.namaBarang || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(loan.status)}</td>
                          <td className="px-6 py-4">
                            {loan.status === 'DIPINJAM' && timeRemaining ? (
                              <span className={`text-sm font-medium ${timeRemaining.color}`}>
                                {timeRemaining.text}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">-</span>
                            )}
                            {loan.status === 'TERLAMBAT' && (
                              <span className="text-sm font-medium text-red-600">Terlambat!</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-600">
                              {new Date(loan.createdAt).toLocaleDateString('id-ID')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
