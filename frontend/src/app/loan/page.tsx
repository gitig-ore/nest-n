"use client";

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import AdminLayout from '@/components/AdminLayout';
import apiClient from '@/lib/api';
import Button from '@/components/shadcn/Button';
import Select from '@/components/shadcn/Select';
import Card from '@/components/shadcn/Card';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

type LoanStatus = 'PENDING' | 'DISETUJUI' | 'DIPINJAM' | 'DIKEMBALIKAN' | 'DITOLAK';
type ReturnCondition = 'NORMAL' | 'RUSAK' | 'HILANG';

type Loan = {
  id: string;
  status: LoanStatus;
  tanggalPinjam?: string;
  tanggalJatuhTempo?: string;
  tanggalDikembalikan?: string;
  returnReason?: string;
  returnCondition?: ReturnCondition;
  createdAt: string;
  updatedAt: string;
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
  admin?: {
    id: string;
    nama: string;
  };
  isLate?: boolean;
};

type Barang = {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  stok: number;
};

type Tab = 'all' | 'pending' | 'active' | 'overdue' | 'returned';

export default function LoanPage() {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [barangId, setBarangId] = useState('');
  const [availableBarang, setAvailableBarang] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasLateLoan, setHasLateLoan] = useState(false);
  
  // Modal state for return confirmation
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState<ReturnCondition>('NORMAL');

  const isAdmin = user?.role === 'ADMIN';
  const isPeminjam = user?.role === 'PEMINJAM';

  useEffect(() => {
    fetchLoans();
    if (isPeminjam) {
      fetchBarang();
    }
  }, [activeTab, isPeminjam]);

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
      let data;
      
      if (isPeminjam) {
        const res = await apiClient.get('/loan/me');
        data = res.data?.loans || [];
        setHasLateLoan(res.data?.hasLateLoan || false);
      } else {
        if (activeTab === 'pending') endpoint = '/loan/pending';
        else if (activeTab === 'active') endpoint = '/loan/active';
        else if (activeTab === 'overdue') endpoint = '/loan/overdue';
        else if (activeTab === 'returned') endpoint = '/loan?status=DIKEMBALIKAN';
        
        const res = await apiClient.get(endpoint);
        data = res.data || [];
        
        // Also fetch late loans count separately for admin
        if (isAdmin) {
          try {
            const overdueRes = await apiClient.get('/loan/overdue');
            setHasLateLoan(overdueRes.data && overdueRes.data.length > 0);
          } catch (e) {
            setHasLateLoan(false);
          }
        }
      }
      
      setLoans(data);
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
      toast.success('Permintaan pinjaman berhasil dikirim. Tunggu verifikasi admin.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal meminjam barang');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (loanId: string) => {
    if (!confirm('Verifikasi dan setujui pengajuan ini?')) return;
    setLoading(true);
    try {
      await apiClient.post(`/loan/verify/${loanId}`);
      fetchLoans();
      toast.success('Pengajuan berhasil diverifikasi. Barang siap diambil.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal verifikasi');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsBorrowed = async (loanId: string) => {
    if (!confirm('Konfirmasi barang sudah diambil oleh peminjam?')) return;
    setLoading(true);
    try {
      await apiClient.post(`/loan/borrow/${loanId}`);
      fetchLoans();
      toast.success('Status diperbarui: Barang sedang dipinjam');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui status');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (loanId: string) => {
    if (!confirm('Tolak pengajuan ini?')) return;
    setLoading(true);
    try {
      await apiClient.post(`/loan/reject/${loanId}`);
      fetchLoans();
      toast.success('Pengajuan ditolak');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menolak');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    const loan = loans.find(l => l.id === loanId);
    setSelectedLoan(loan || null);
    setReturnReason('');
    setReturnCondition('NORMAL');
    setShowReturnModal(true);
  };

  const confirmReturn = async () => {
    if (!selectedLoan) return;
    setLoading(true);
    try {
      await apiClient.post('/loan/return', { 
        loanId: selectedLoan.id,
        condition: returnCondition,
        reason: returnReason 
      });
      setShowReturnModal(false);
      setSelectedLoan(null);
      setReturnReason('');
      setReturnCondition('NORMAL');
      fetchLoans();
      fetchBarang();
      toast.success('Pengembalian berhasil dicatat. Stok diperbarui.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengembalikan');
    } finally {
      setLoading(false);
    }
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setSelectedLoan(null);
    setReturnReason('');
    setReturnCondition('NORMAL');
  };

  const getStatusBadge = (status: string, isLate?: boolean) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'Menunggu', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )},
      DISETUJUI: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Siap Diambil', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )},
      DIPINJAM: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Dipinjam', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )},
      DIKEMBALIKAN: { bg: 'bg-green-100', text: 'text-green-600', label: 'Dikembalikan', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )},
      DITOLAK: { bg: 'bg-red-100', text: 'text-red-600', label: 'Ditolak', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )},
    };
    
    // Override for late loans
    if (isLate && status === 'DIPINJAM') {
      statusConfig['DIPINJAM'] = { bg: 'bg-red-100', text: 'text-red-600', label: 'Terlambat', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )};
    }
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status, icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )};
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        <span>{config.label}</span>
      </span>
    );
  };

  const getTimeRemaining = (tanggalJatuhTempo?: string, tanggalDikembalikan?: string) => {
    if (!tanggalJatuhTempo || tanggalDikembalikan) return null;
    
    const now = new Date();
    const jatuhTempo = new Date(tanggalJatuhTempo);
    const diff = jatuhTempo.getTime() - now.getTime();
    
    if (diff < 0) {
      const hoursLate = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
      return { text: `Terlambat ${hoursLate} jam`, isLate: true };
    }
    
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    if (hoursLeft > 24) {
      const days = Math.floor(hoursLeft / 24);
      return { text: `${days} hari`, isLate: false };
    }
    return { text: `${hoursLeft} jam`, isLate: false };
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Semua', count: loans.length },
    { id: 'pending', label: 'Menunggu', count: loans.filter((l) => l.status === 'PENDING').length },
    { id: 'active', label: 'Aktif', count: loans.filter((l) => l.status === 'DIPINJAM' && !l.isLate).length },
    { id: 'overdue', label: 'Terlambat', count: hasLateLoan ? 1 : 0 },
    { id: 'returned', label: 'Selesai', count: loans.filter((l) => l.status === 'DIKEMBALIKAN').length },
  ];

  const filteredLoans = loans.filter(l => {
    const query = searchQuery.toLowerCase();
    return (
      (l.barang?.kodeBarang || '').toLowerCase().includes(query) ||
      (l.barang?.namaBarang || '').toLowerCase().includes(query) ||
      (l.peminjam?.nama || '').toLowerCase().includes(query) ||
      (l.status || '').toLowerCase().includes(query)
    );
  });

  return (
    <ProtectedRoute>
      <AdminLayout>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Transaksi Peminjaman</h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Kelola pengajuan, peminjaman, dan pengembalian barang' : 'Ajukan dan lihat peminjaman Anda'}
          </p>
        </div>

        {/* Form Pinjam (Peminjam only) */}
        {isPeminjam && (
          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Ajukan Peminjaman</h2>
                <p className="text-sm text-gray-500 mt-1">Pilih barang yang ingin dipinjam</p>
              </div>
              <form onSubmit={handlePinjam} className="flex gap-3 items-center">
                <Select
                  value={barangId}
                  onChange={(e: any) => setBarangId(e.target.value)}
                  required
                  className="w-80"
                >
                  <option value="">Pilih barang...</option>
                  {availableBarang.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kodeBarang} - {b.namaBarang} (stok: {b.stok})
                    </option>
                  ))}
                </Select>
                <Button type="submit" disabled={loading || !barangId}>
                  {loading ? 'Mengirim...' : 'Ajukan Pinjaman'}
                </Button>
              </form>
            </div>
          </Card>
        )}

        {/* Alert for Overdue */}
        {hasLateLoan && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-600">Peringatan Terlambat!</h3>
                <p className="text-red-700 text-sm">
                  Ada peminjaman melewati batas waktu. Silakan cek tab "Terlambat" untuk detail.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari transaksi (barang, peminjam, status)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                    tab.id === 'active' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
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
          {loading && loans.length === 0 ? (
            <LoadingSpinner message="Memuat data peminjaman..." />
          ) : filteredLoans.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p>Tidak ada data peminjaman</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Barang</th>
                    {isAdmin && (
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Peminjam</th>
                    )}
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLoans.map((l, index) => {
                    const timeRemaining = getTimeRemaining(l.tanggalJatuhTempo, l.tanggalDikembalikan);
                    return (
                      <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{index + 1}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {l.barang?.kodeBarang} - {l.barang?.namaBarang}
                            </span>
                          </div>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{l.peminjam?.nama}</p>
                              <p className="text-xs text-gray-500">{l.peminjam?.nisn || l.peminjam?.nip || l.peminjam?.email}</p>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(l.status, l.isLate)}
                            {timeRemaining && (
                              <span className={`text-xs ${timeRemaining.isLate ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                {timeRemaining.isLate ? (
                                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {timeRemaining.text} tersisa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            <p>Diajukan: {new Date(l.createdAt).toLocaleDateString('id-ID')}</p>
                            {l.tanggalPinjam && (
                              <p className="text-xs text-gray-500">
                                Pinjam: {new Date(l.tanggalPinjam).toLocaleDateString('id-ID')}
                              </p>
                            )}
                            {l.tanggalJatuhTempo && (
                              <p className="text-xs text-gray-500">
                                Jatuh Tempo: {new Date(l.tanggalJatuhTempo).toLocaleString('id-ID')}
                              </p>
                            )}
                            {l.tanggalDikembalikan && (
                              <p className="text-xs text-green-600">
                                Dikembalikan: {new Date(l.tanggalDikembalikan).toLocaleString('id-ID')}
                              </p>
                            )}
                            {l.returnCondition && l.status === 'DIKEMBALIKAN' && (
                              <p className={`text-xs ${
                                l.returnCondition === 'NORMAL' ? 'text-green-600' :
                                l.returnCondition === 'RUSAK' ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                Kondisi: {l.returnCondition}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isAdmin ? (
                            <div className="flex justify-end gap-2 flex-wrap">
                              {l.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => handleVerify(l.id)}
                                    disabled={loading}
                                    className="px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    ✓ Verifikasi
                                  </button>
                                  <button
                                    onClick={() => handleReject(l.id)}
                                    disabled={loading}
                                    className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs font-medium transition-colors disabled:opacity-50"
                                  >
                                    ✕ Tolak
                                  </button>
                                </>
                              )}
                              {l.status === 'DISETUJUI' && (
                                <button
                                  onClick={() => handleMarkAsBorrowed(l.id)}
                                  disabled={loading}
                                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  📦 Ambil Barang
                                </button>
                              )}
                              {l.status === 'DIPINJAM' && (
                                <button
                                  onClick={() => handleReturn(l.id)}
                                  disabled={loading}
                                  className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-xs font-medium transition-colors disabled:opacity-50"
                                >
                                  🔄 Kembalikan
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Return Confirmation Modal */}
        {showReturnModal && selectedLoan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Konfirmasi Pengembalian</h3>
              </div>
              
              <div className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedLoan.barang?.namaBarang}</p>
                      <p className="text-sm text-gray-500">{selectedLoan.barang?.kodeBarang}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-yellow-700">
                    <strong>Peminjam:</strong> {selectedLoan.peminjam?.nama}
                  </p>
                </div>

                {/* Condition Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kondisi Barang <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={returnCondition}
                    onChange={(e: any) => setReturnCondition(e.target.value)}
                    required
                    className="w-full"
                  >
                    <option value="NORMAL">🟢 Normal - Barang kembali dan layak pakai</option>
                    <option value="RUSAK">🟠 Rusak - Barang kembali tapi tidak layak</option>
                    <option value="HILANG">🔴 Hilang - Barang tidak dikembalikan</option>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {returnCondition === 'NORMAL' && '✅ Stok barang akan bertambah (+1)'}
                    {returnCondition === 'RUSAK' && '⚠️ Stok tidak bertambah. Catat kerusakan untuk penanganan.'}
                    {returnCondition === 'HILANG' && '❌ Stok tidak bertambah. Tandai sebagai kehilangan.'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catatan Pengembalian (opsional)
                  </label>
                  <textarea
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Contoh: Barang dalam kondisi baik, tidak ada kerusakan..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={closeReturnModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  onClick={confirmReturn}
                  disabled={loading}
                  className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 ${
                    returnCondition === 'NORMAL' ? 'bg-green-500 hover:bg-green-600' :
                    returnCondition === 'RUSAK' ? 'bg-yellow-500 hover:bg-yellow-600' :
                    'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {loading ? 'Memproses...' : 'Konfirmasi Pengembalian'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
