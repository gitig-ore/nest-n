"use client";

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import AdminLayout from '@/components/AdminLayout';
import apiClient from '@/lib/api';
import Button from '@/components/shadcn/Button';
import Select from '@/components/shadcn/Select';
import Card from '@/components/shadcn/Card';

type Loan = {
  id: string;
  status: 'PENDING' | 'DIPINJAM' | 'DIKEMBALIKAN' | 'TERLAMBAT';
  tanggalPinjam?: string;
  createdAt: string;
  barang?: {
    id: string;
    kodeBarang: string;
    namaBarang: string;
  };
  peminjam?: {
    id: string;
    nama: string;
    email: string;
    nip?: string;
    nisn?: string;
  };
};

type Barang = {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  stok: number;
};

type Tab = 'all' | 'pending' | 'active' | 'overdue';

export default function LoanPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [barangId, setBarangId] = useState('');
  const [availableBarang, setAvailableBarang] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isPeminjam = user?.role === 'PEMINJAM';

  useEffect(() => {
    fetchLoans();
    if (isPeminjam) {
      fetchBarang();
    }
  }, [activeTab]);

  const fetchBarang = async () => {
    try {
      const res = await apiClient.get('/barang');
      setAvailableBarang((res.data || []).filter((b: Barang) => b.stok > 0));
    } catch (err) {
      console.error('Failed to load barang', err);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '/loan';
      if (activeTab === 'pending') endpoint = '/loan/pending';
      else if (activeTab === 'active') endpoint = '/loan/active';
      else if (activeTab === 'overdue') endpoint = '/loan/overdue';

      const res = await apiClient.get(endpoint);
      setLoans(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handlePinjam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangId) return;
    setLoading(true);
    try {
      await apiClient.post('/loan', { barangId });
      setBarangId('');
      fetchLoans();
      alert('Permintaan pinjaman berhasil dikirim. Tunggu verifikasi admin.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal meminjam barang');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (loanId: string) => {
    if (!confirm('Verifikasi pengajuan ini?')) return;
    try {
      await apiClient.post(`/loan/verify/${loanId}`);
      fetchLoans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal verifikasi');
    }
  };

  const handleReject = async (loanId: string) => {
    if (!confirm('Tolak pengajuan ini?')) return;
    try {
      await apiClient.post(`/loan/reject/${loanId}`);
      fetchLoans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menolak');
    }
  };

  const handleReturn = async (loanId: string) => {
    if (!confirm('Tandai sebagai dikembalikan?')) return;
    try {
      await apiClient.post('/loan/return', { loanId });
      fetchLoans();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengembalikan');
    }
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

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Semua', count: loans.length },
    { id: 'pending', label: 'Menunggu', count: loans.filter((l) => l.status === 'PENDING').length },
    { id: 'active', label: 'Aktif', count: loans.filter((l) => l.status === 'DIPINJAM').length },
    { id: 'overdue', label: 'Terlambat', count: loans.filter((l) => l.status === 'TERLAMBAT').length },
  ];

  return (
    <ProtectedRoute>
      <AdminLayout>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Transaksi</h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Kelola pengajuan dan peminjaman' : 'Ajukan dan lihat peminjaman Anda'}
          </p>
        </div>

        {/* Form Pinjam (Peminjam only) */}
        {isPeminjam && (
          <Card className="mb-6">
            <h2 className="font-semibold mb-3">Ajukan Peminjaman</h2>
            <form onSubmit={handlePinjam} className="flex gap-3 items-center">
              <Select
                value={barangId}
                onChange={(e: any) => setBarangId(e.target.value)}
                required
                className="flex-1"
              >
                <option value="">Pilih barang...</option>
                {availableBarang.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.kodeBarang} - {b.namaBarang} (stok: {b.stok})
                  </option>
                ))}
              </Select>
              <Button disabled={loading}>{loading ? 'Mengirim...' : 'Ajukan'}</Button>
            </form>
          </Card>
        )}

        {/* Alert for Overdue */}
        {loans.some((l) => l.status === 'TERLAMBAT') && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-600">Peringatan!</h3>
                <p className="text-red-700 text-sm">
                  Ada {loans.filter((l) => l.status === 'TERLAMBAT').length} peminjaman melewati batas waktu 24 jam.
                  Segera kembalikan barang.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    tab.id === 'overdue' ? 'bg-red-100 text-red-600' :
                    tab.id === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Loan Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {error && (
            <div className="bg-red-50 border-b border-red-100 px-6 py-3 text-red-600 text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-500">Memuat data...</p>
            </div>
          ) : loans.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Tidak ada data peminjaman</p>
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
                    {isAdmin && (
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Peminjam
                      </th>
                    )}
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loans.map((l, index) => (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {l.barang?.kodeBarang} - {l.barang?.namaBarang}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{l.peminjam?.nama}</p>
                            <p className="text-xs text-gray-500">{l.peminjam?.email || l.peminjam?.nisn || l.peminjam?.nip}</p>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">{getStatusBadge(l.status)}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(l.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isAdmin ? (
                          <div className="flex justify-end gap-2">
                            {l.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleVerify(l.id)}
                                  className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors"
                                >
                                  Verifikasi
                                </button>
                                <button
                                  onClick={() => handleReject(l.id)}
                                  className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs font-medium transition-colors"
                                >
                                  Tolak
                                </button>
                              </>
                            )}
                            {l.status === 'DIPINJAM' && (
                              <button
                                onClick={() => handleReturn(l.id)}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs font-medium transition-colors"
                              >
                                Kembalikan
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminLayout>
    </ProtectedRoute>
  );
}
