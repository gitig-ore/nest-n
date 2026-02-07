"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ProtectedRoute } from '@/lib/protected-route';
import AdminLayout from '@/components/AdminLayout';
import apiClient from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

type Stats = {
  totalUsers: number;
  totalBarang: number;
  activeLoans: number;
  pendingLoans: number;
  returnedLoans: number;
};

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBarang: 0,
    activeLoans: 0,
    pendingLoans: 0,
    returnedLoans: 0,
  });

  useEffect(() => {
    // Only redirect after auth is loaded and user exists
    if (!isLoading && user) {
      // For admins, show the dashboard content
      if (user.role !== 'ADMIN') {
        router.push('/peminjam-dashboard');
      } else {
        fetchStats();
      }
    }
  }, [user, router, isLoading]);

  const fetchStats = async () => {
    try {
      const [usersRes, barangRes, loansRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/barang'),
        apiClient.get('/loan'),
      ]);
      
      const loans = loansRes.data || [];
      setStats({
        totalUsers: (usersRes.data || []).length,
        totalBarang: (barangRes.data || []).length,
        activeLoans: loans.filter((l: any) => l.status === 'DIPINJAM').length,
        pendingLoans: loans.filter((l: any) => l.status === 'PENDING').length,
        returnedLoans: loans.filter((l: any) => l.status === 'DIKEMBALIKAN').length,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const StatCard = ({ title, value, color }: { title: string; value: number; color: string }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );

  // Show loading only during initial auth check
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner message="Memuat..." />
      </div>
    );
  }

  // If not logged in, ProtectedRoute will handle redirect
  return (
    <ProtectedRoute>
      <AdminLayout>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-500 mt-1">Ringkasan sistem peminjaman barang</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard title="Total Users" value={stats.totalUsers} color="text-blue-600" />
          <StatCard title="Total Barang" value={stats.totalBarang} color="text-green-600" />
          <StatCard title="Sedang Dipinjam" value={stats.activeLoans} color="text-yellow-600" />
          <StatCard title="Menunggu" value={stats.pendingLoans} color="text-purple-600" />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Peminjaman</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Aktif</span>
                <span className="font-semibold text-blue-600">{stats.activeLoans}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Menunggu Persetujuan</span>
                <span className="font-semibold text-yellow-600">{stats.pendingLoans}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Dikembalikan</span>
                <span className="font-semibold text-green-600">{stats.returnedLoans}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Informasi</h2>
            <p className="text-gray-600">Selamat datang di Dashboard Admin.</p>
            <p className="text-gray-600 mt-2">Gunakan menu di sidebar untuk mengelola:</p>
            <ul className="list-disc list-inside text-gray-600 mt-2 space-y-1">
              <li>Data Master (Barang)</li>
              <li>Transaksi Peminjaman</li>
              <li>Manajemen Users</li>
            </ul>
          </div>
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
