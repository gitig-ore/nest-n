"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import PeminjamLayout from '@/components/PeminjamLayout';
import apiClient from '@/lib/api';

type Notification = {
  id: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  createdAt: string;
  loanId?: string;
};

type Loan = {
  id: string;
  status: string;
  tanggalPinjam?: string | null;
  tanggalJatuhTempo?: string | null;
  tanggalDikembalikan?: string | null;
  createdAt: string;
  updatedAt: string;
  isLate?: boolean;
  barang?: { namaBarang: string; kodeBarang: string };
  admin?: { nama: string };
};

type Barang = {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kondisi: string;
  stok: number;
};

type LateLoanDetails = {
  loanId: string;
  barangNama: string;
  tanggalJatuhTempo: string;
  terlambatJam: number;
};

type Tab = 'ajuan' | 'riwayat' | 'notifikasi';

export default function PeminjamDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('ajuan');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Domain state
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [hasLateLoan, setHasLateLoan] = useState(false);
  const [lateLoanDetails, setLateLoanDetails] = useState<LateLoanDetails | null>(null);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  
  // Form state
  const [selectedBarangId, setSelectedBarangId] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [loansRes, barangRes] = await Promise.all([
        apiClient.get('/loan/me'),
        apiClient.get('/barang'),
      ]);
      
      const loansData = loansRes.data;
      setHasActiveLoan(loansData?.hasActiveLoan || false);
      setHasLateLoan(loansData?.hasLateLoan || false);
      setLateLoanDetails(loansData?.lateLoanDetails || null);
      
      setLoans(loansData?.loans || []);
      setBarang(barangRes.data || []);
      
      // Get active loan details
      const active = loansData?.loans?.find((l: Loan) => 
        ['PENDING', 'DISETUJUI', 'DIPINJAM'].includes(l.status)
      );
      setActiveLoan(active || null);
      
      // Process notifications
      const newNotifications: Notification[] = [];
      loansData?.loans?.forEach((loan: Loan) => {
        if (loan.status === 'DIPINJAM') {
          newNotifications.push({
            id: `notif-${loan.id}-approved`,
            message: `Pengajuan peminjaman ${loan.barang?.namaBarang} telah DISETUJUI. Silakan ambil barang.`,
            type: 'SUCCESS',
            createdAt: loan.updatedAt,
            loanId: loan.id,
          });
        } else if (loan.status === 'DITOLAK') {
          newNotifications.push({
            id: `notif-${loan.id}-rejected`,
            message: `Pengajuan peminjaman ${loan.barang?.namaBarang} telah DITOLAK oleh admin.`,
            type: 'ERROR',
            createdAt: loan.updatedAt,
            loanId: loan.id,
          });
        } else if (loan.status === 'DIKEMBALIKAN' && loan.admin) {
          newNotifications.push({
            id: `notif-${loan.id}-returned`,
            message: `Barang ${loan.barang?.namaBarang} telah dikembalikan. Terima kasih!`,
            type: 'INFO',
            createdAt: loan.updatedAt,
            loanId: loan.id,
          });
        } else if (loan.status === 'PENDING') {
          newNotifications.push({
            id: `notif-${loan.id}-pending`,
            message: `Pengajuan peminjaman ${loan.barang?.namaBarang} sedang menunggu persetujuan admin.`,
            type: 'WARNING',
            createdAt: loan.createdAt,
            loanId: loan.id,
          });
        }
      });
      setNotifications(newNotifications);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      if (err.response?.status === 401) {
        setErrorMessage('Sesi Anda telah berakhir. Silakan login kembali.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAjuan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangId) return;
    
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      await apiClient.post('/loan', { barangId: selectedBarangId });
      setFormSubmitted(true);
      setSelectedBarangId('');
      setSuccessMessage('Pengajuan peminjaman berhasil dikirim! Menunggu persetujuan admin.');
      fetchData();
    } catch (err: any) {
      const errorCode = err.response?.data?.code;
      const errorMsg = err.response?.data?.message;
      
      if (errorCode === 'ACTIVE_LOAN_EXISTS') {
        setErrorMessage('Anda sudah memiliki peminjaman aktif. Tidak bisa mengajukan pinjaman baru.');
      } else if (errorCode === 'LOAN_IS_LATE') {
        setErrorMessage('Anda memiliki peminjaman yang terlambat. Silakan kembalikan barang terlebih dahulu.');
      } else if (err.response?.status === 401) {
        setErrorMessage('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setErrorMessage(errorMsg || 'Gagal mengajukan peminjaman. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, isLate?: boolean) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-600', label: 'Menunggu' },
      DISETUJUI: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Disetujui' },
      DIPINJAM: { bg: 'bg-green-100', text: 'text-green-600', label: 'Dipinjam' },
      DIKEMBALIKAN: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Dikembalikan' },
      DITOLAK: { bg: 'bg-red-100', text: 'text-red-600', label: 'Ditolak' },
    };
    
    if (isLate) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
          Terlambat
        </span>
      );
    }
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-600', label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
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

  const getRemainingTime = (jatuhTempo?: string | null) => {
    if (!jatuhTempo) return null;
    const now = new Date();
    const deadline = new Date(jatuhTempo);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) {
      return { isLate: true, text: `Terlambat ${diffHours}j ${diffMinutes}m` };
    }
    return { isLate: false, text: `${diffHours}j ${diffMinutes}m` };
  };

  const availableBarang = barang.filter(b => b.stok > 0);

  if (loading) {
    return (
      <PeminjamLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500">Memuat data...</p>
          </div>
        </div>
      </PeminjamLayout>
    );
  }

  return (
    <PeminjamLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Peminjam</h1>
          <p className="text-gray-500 mt-1">Ajukan dan lihat peminjaman Anda</p>
        </div>

        {/* Status Card */}
        {hasActiveLoan && activeLoan && (
          <div className={`rounded-xl border p-5 mb-6 ${
            hasLateLoan 
              ? 'bg-red-50 border-red-200' 
              : activeLoan.status === 'PENDING'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  hasLateLoan 
                    ? 'bg-red-100' 
                    : activeLoan.status === 'PENDING'
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                }`}>
                  {hasLateLoan ? (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : activeLoan.status === 'PENDING' ? (
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {hasLateLoan 
                      ? 'Peringatan: Terlambat'
                      : activeLoan.status === 'PENDING'
                        ? 'Menunggu Persetujuan'
                        : 'Peminjaman Aktif'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {activeLoan.barang?.namaBarang} ({activeLoan.barang?.kodeBarang})
                  </p>
                  {activeLoan.tanggalJatuhTempo && activeLoan.status === 'DIPINJAM' && (
                    <p className="text-sm text-blue-600 mt-1">
                      {hasLateLoan ? (
                        <span className="font-medium">Jatuh tempo: {formatDate(activeLoan.tanggalJatuhTempo)}</span>
                      ) : (
                        <span>Sisa waktu: <strong>{getRemainingTime(activeLoan.tanggalJatuhTempo)?.text}</strong></span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div>
                {getStatusBadge(activeLoan.status, activeLoan.isLate)}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            {[
              { id: 'ajuan', label: 'Ajukan Pinjaman' },
              { id: 'riwayat', label: 'Riwayat' },
              { id: 'notifikasi', label: 'Notifikasi' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.id === 'notifikasi' && notifications.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                    {notifications.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'ajuan' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Formulir Pengajuan</h2>
            </div>
            
            <div className="p-6">
              {/* Alerts */}
              {errorMessage && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{errorMessage}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
              )}

              {formSubmitted ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pengajuan Berhasil!</h3>
                  <p className="text-gray-600 mb-4">Pengajuan Anda telah dikirim dan menunggu persetujuan admin.</p>
                  <button
                    onClick={() => { setFormSubmitted(false); fetchData(); }}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    Kembali ke Form
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitAjuan} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih Barang <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedBarangId}
                      onChange={(e) => setSelectedBarangId(e.target.value)}
                      required
                      disabled={hasActiveLoan}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Pilih Barang --</option>
                      {availableBarang.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.kodeBarang} | {item.namaBarang} | Stok: {item.stok}
                        </option>
                      ))}
                    </select>
                    {availableBarang.length === 0 && (
                      <p className="text-sm text-red-600 mt-2">
                        Tidak ada barang tersedia saat ini.
                      </p>
                    )}
                  </div>

                  {/* Selected Item Preview */}
                  {selectedBarangId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      {barang.filter(b => b.id === selectedBarangId).map((item) => (
                        <div key={item.id} className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.namaBarang}</p>
                            <p className="text-sm text-gray-500">{item.kodeBarang}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Informasi Penting:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Durasi peminjaman: 24 jam</li>
                      <li>• Setiap peminjam hanya boleh memiliki 1 peminjaman aktif</li>
                      <li>• Keterlambatan akan dicatat dan mempengaruhi pengajuan berikutnya</li>
                      <li>• Pengajuan akan diverifikasi oleh admin terlebih dahulu</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedBarangId || submitting || hasActiveLoan || hasLateLoan}
                    className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                        Mengirim...
                      </>
                    ) : hasLateLoan ? (
                      'Tidak Bisa Ajukan (Terlambat)'
                    ) : hasActiveLoan ? (
                      'Tidak Bisa Ajukan (Pinjaman Aktif)'
                    ) : (
                      'Ajukan Peminjaman'
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {activeTab === 'riwayat' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Riwayat Peminjaman</h2>
            </div>
            
            {loans.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p>Belum ada riwayat peminjaman</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Barang</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal Ajuan</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loans.map((loan, index) => (
                      <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{index + 1}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">
                            {loan.barang?.kodeBarang} - {loan.barang?.namaBarang}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(loan.status, loan.isLate)}</td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{formatDate(loan.createdAt)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{formatDate(loan.tanggalJatuhTempo)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifikasi' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Notifikasi</h2>
            </div>
            
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p>Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        notif.type === 'SUCCESS' ? 'bg-green-100' :
                        notif.type === 'ERROR' ? 'bg-red-100' :
                        notif.type === 'WARNING' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {notif.type === 'SUCCESS' && (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {notif.type === 'ERROR' && (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {notif.type === 'WARNING' && (
                          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        )}
                        {notif.type === 'INFO' && (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{notif.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(notif.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PeminjamLayout>
  );
}
