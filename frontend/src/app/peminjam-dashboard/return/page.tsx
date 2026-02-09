"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import PeminjamLayout from '@/components/PeminjamLayout';
import apiClient from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';

type LoanStatus = 'PENDING' | 'DISETUJUI' | 'DIPINJAM' | 'PENGEMBALIAN' | 'DIKEMBALIKAN' | 'DITOLAK';
type ReturnCondition = 'NORMAL' | 'RUSAK' | 'HILANG';

type Loan = {
  id: string;
  status: LoanStatus;
  tanggalPinjam?: string | null;
  tanggalJatuhTempo?: string | null;
  tanggalDikembalikan?: string | null;
  returnReason?: string;
  returnCondition?: ReturnCondition;
  createdAt: string;
  updatedAt: string;
  barang?: { namaBarang: string; kodeBarang: string };
  admin?: { nama: string };
};

export default function ReturnPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const loansRes = await apiClient.get('/loan/me');
      const loansData = loansRes.data;

      setLoans(loansData?.loans || []);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      if (err.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRequestReturn = async (loanId: string) => {
    if (!confirm('Apakah Anda yakin ingin mengajukan pengembalian barang ini?')) return;
    
    setSubmitting(true);
    
    try {
      await apiClient.post('/loan/request-return', { loanId });
      toast.success('Pengembalian berhasil diajukan! Menunggu konfirmasi admin.');
      fetchData();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message;
      if (err.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        toast.error(errorMsg || 'Gagal mengajukan pengembalian.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
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
      DIPINJAM: { bg: 'bg-green-100', text: 'text-green-600', label: 'Dipinjam', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      )},
      PENGEMBALIAN: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Diproses', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )},
      DIKEMBALIKAN: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Selesai', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )},
      DITOLAK: { bg: 'bg-red-100', text: 'text-red-600', label: 'Ditolak', icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )},
    };

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

  // Get loans that can be returned (DIPINJAM status)
  const borrowedLoans = loans.filter(l => 
    l.status === 'DIPINJAM'
  );

  // Get loans that are in return process
  const returningLoans = loans.filter(l =>
    l.status === 'PENGEMBALIAN'
  );

  // Get completed returns
  const completedLoans = loans.filter(l => 
    ['DIKEMBALIKAN', 'DITOLAK'].includes(l.status)
  );

  if (loading) {
    return (
      <PeminjamLayout>
        <LoadingSpinner message="Memuat data..." />
      </PeminjamLayout>
    );
  }

  return (
    <PeminjamLayout>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Pengembalian Barang</h1>
          <p className="text-gray-500 mt-1">Ajukan dan lacak pengembalian barang yang dipinjam</p>
        </div>

        {/* Borrowed Items - Can Request Return */}
        {borrowedLoans.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-100 bg-green-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Barang yang Dipinjam
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {borrowedLoans.map((loan) => (
                <div key={loan.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-green-100">
                        <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{loan.barang?.namaBarang}</h3>
                        <p className="text-sm text-gray-500">{loan.barang?.kodeBarang}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(loan.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Tanggal Pinjam</p>
                      <p className="font-medium text-gray-900">{formatDate(loan.tanggalPinjam)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Jatuh Tempo</p>
                      <p className="font-medium text-gray-900">{formatDate(loan.tanggalJatuhTempo)}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => handleRequestReturn(loan.id)}
                      disabled={submitting}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      Ajukan Pengembalian
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Return Process */}
        {returningLoans.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-100 bg-purple-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Pengembalian Diproses
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {returningLoans.map((loan) => (
                <div key={loan.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center bg-purple-100">
                      <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{loan.barang?.namaBarang}</h3>
                      <p className="text-sm text-gray-500">{loan.barang?.kodeBarang}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {getStatusBadge(loan.status)}
                      </div>
                      {loan.returnReason && (
                        <p className="text-sm text-gray-600 mt-2">
                          Catatan: {loan.returnReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm text-purple-700">
                      Menunggu konfirmasi dari admin. Anda akan menerima notifikasi ketika pengembalian dikonfirmasi.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Returns */}
        {completedLoans.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Riwayat Pengembalian
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {completedLoans.slice(0, 10).map((loan) => (
                <div key={loan.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{loan.barang?.namaBarang}</p>
                      <p className="text-sm text-gray-500">{formatDate(loan.tanggalDikembalikan)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {loan.returnCondition && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {loan.returnCondition}
                      </span>
                    )}
                    {getStatusBadge(loan.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Loans */}
        {borrowedLoans.length === 0 && returningLoans.length === 0 && completedLoans.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak Ada Riwayat Peminjaman</h3>
              <p className="text-gray-600 mb-6">
                Anda belum pernah meminjam barang.
              </p>
              <a
                href="/peminjam-dashboard"
                className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Ajukan Peminjaman
              </a>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-800 mb-2">Informasi Pengembalian</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>Klik tombol "Ajukan Pengembalian" pada barang yang ingin dikembalikan</li>
            <li>Admin akan menerima notifikasi dan memeriksa kondisi barang</li>
            <li>Anda akan menerima notifikasi ketika pengembalian dikonfirmasi</li>
            <li>Jika barang dalam kondisi normal, stok akan bertambah setelah pengembalian dikonfirmasi</li>
            <li>Jika barang rusak atau hilang, stok tidak akan bertambah</li>
          </ul>
        </div>
      </div>
    </PeminjamLayout>
  );
}
