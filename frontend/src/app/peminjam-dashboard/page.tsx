"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import PeminjamLayout from '@/components/PeminjamLayout';
import apiClient from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import { toast } from 'sonner';

type Notification = {
  id: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  createdAt: string;
  loanId?: string;
};

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
  isLate?: boolean;
  barang?: { namaBarang: string; kodeBarang: string };
  admin?: { nama: string };
};

type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  sender?: { id: string; nama: string; role: string };
  receiver?: { id: string; nama: string; role: string };
  loan?: { id: string; barang?: { namaBarang: string } };
  isRead: boolean;
  createdAt: string;
};

type Barang = {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kondisi: string;
  stok: number;
};

type Tab = 'ajuan' | 'riwayat' | 'notifikasi' | 'chat' | 'terlambat';

export default function PeminjamDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('ajuan');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [lateLoans, setLateLoans] = useState<Loan[]>([]);
  const [barang, setBarang] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const lastMessagesFetch = useRef<number>(0); // Cache timestamp for messages
  
  // Domain state
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  
  // Form state
  const [selectedBarangId, setSelectedBarangId] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    fetchData();
    if (activeTab === 'chat') {
      fetchMessages();
    }
  }, [activeTab]);

  const fetchMessages = async (force: boolean = false) => {
    const now = Date.now();
    // Cache for 30 seconds - only fetch if forced or cache is stale
    if (!force && now - lastMessagesFetch.current < 30000 && messages.length > 0) {
      return;
    }
    
    try {
      // First get all messages to find admin's ID
      const allRes = await apiClient.get('/message');
      const allMessages: Message[] = allRes.data?.messages || [];
      
      // Find admin in the messages
      const adminMessage = allMessages.find(msg => 
        (msg.senderId !== user?.id && msg.sender?.role === 'ADMIN') ||
        (msg.receiverId !== user?.id && msg.receiver?.role === 'ADMIN')
      );
      
      const adminId = adminMessage 
        ? (adminMessage.sender?.role === 'ADMIN' ? adminMessage.senderId : adminMessage.receiverId)
        : null;
      
      if (adminId) {
        // Fetch conversation with admin
        const convRes = await apiClient.get(`/message/conversation/${adminId}`);
        setMessages(convRes.data?.messages || []);
      } else {
        // No admin found, show all messages involving admin
        const filtered = allMessages.filter(msg => 
          msg.sender?.role === 'ADMIN' || msg.receiver?.role === 'ADMIN'
        );
        setMessages(filtered);
      }
      
      setUnreadMessages(allRes.data?.unreadCount || 0);
      lastMessagesFetch.current = now;
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      await apiClient.post('/message', { content: newMessage });
      setNewMessage('');
      fetchMessages(true); // Force refresh after sending
      toast.success('Pesan terkirim ke admin');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pesan');
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchData = async () => {
    try {
      const [loansRes, barangRes] = await Promise.all([
        apiClient.get('/loan/me'),
        apiClient.get('/barang'),
      ]);
      
      const loansData = loansRes.data;
      setHasActiveLoan(loansData?.hasActiveLoan || false);
      
      setLoans(loansData?.loans || []);
      
      // Filter late loans (isLate === true)
      const late = (loansData?.loans || []).filter((l: Loan) => l.isLate === true);
      setLateLoans(late);
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
        } else if (loan.status === 'PENGEMBALIAN') {
          newNotifications.push({
            id: `notif-${loan.id}-return-requested`,
            message: `Pengembalian ${loan.barang?.namaBarang} telah diajukan. Menunggu konfirmasi admin.`,
            type: 'INFO',
            createdAt: loan.updatedAt,
            loanId: loan.id,
          });
        } else if (loan.status === 'DIKEMBALIKAN') {
          // Basic return notification
          let returnMessage = `Barang ${loan.barang?.namaBarang} telah dikembalikan.`;
          let returnType: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO' = 'INFO';
          
          // Check for punishment conditions
          if (loan.returnCondition === 'RUSAK') {
            returnMessage = `⚠️ PERINGATAN: Barang ${loan.barang?.namaBarang} dikembalikan dalam kondisi RUSAK. Harap kembalikan barang dalam kondisi layak.`;
            returnType = 'WARNING';
          } else if (loan.returnCondition === 'HILANG') {
            returnMessage = `❌ PERINGATAN: Barang ${loan.barang?.namaBarang} tidak dikembalikan (HILANG). Harap tanggung jawab atas kehilangan ini.`;
            returnType = 'ERROR';
          } else if (loan.isLate) {
            returnMessage = `🕐 PERINGATAN: Barang ${loan.barang?.namaBarang} dikembalikan TERLAMBAT. Harap kembalikan barang tepat waktu.`;
            returnType = 'WARNING';
          } else {
            returnMessage = `✅ Barang ${loan.barang?.namaBarang} telah dikembalikan dalam kondisi ${loan.returnCondition || 'BAIK'}. Terima kasih!`;
            returnType = 'SUCCESS';
          }
          
          newNotifications.push({
            id: `notif-${loan.id}-returned`,
            message: returnMessage,
            type: returnType,
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
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAjuan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarangId) return;
    
    setSubmitting(true);
    
    try {
      await apiClient.post('/loan', { barangId: selectedBarangId });
      setFormSubmitted(true);
      setSelectedBarangId('');
      toast.success('Pengajuan peminjaman berhasil dikirim! Menunggu persetujuan admin.');
      fetchData();
    } catch (err: any) {
      const errorCode = err.response?.data?.code;
      const errorMsg = err.response?.data?.message;
      
      if (errorCode === 'ACTIVE_LOAN_EXISTS') {
        toast.error('Anda sudah memiliki peminjaman aktif. Tidak bisa mengajukan pinjaman baru.');
      } else if (err.response?.status === 401) {
        toast.error('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        toast.error(errorMsg || 'Gagal mengajukan peminjaman.');
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
        <LoadingSpinner message="Memuat data..." />
      </PeminjamLayout>
    );
  }

  return (
    <PeminjamLayout>
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Peminjam</h1>
          <p className="text-gray-500 mt-1">Ajukan dan kelola peminjaman Anda</p>
        </div>

        {/* Status Card */}
        {hasActiveLoan && activeLoan && (
          <div className={`rounded-xl border p-5 mb-6 ${
            activeLoan.status === 'PENDING'
              ? 'bg-yellow-50 border-yellow-200'
              : activeLoan.status === 'DISETUJUI'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  activeLoan.status === 'PENDING'
                    ? 'bg-yellow-100'
                    : activeLoan.status === 'DISETUJUI'
                      ? 'bg-blue-100'
                      : 'bg-green-100'
                }`}>
                  {activeLoan.status === 'PENDING' ? (
                    <svg className="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : activeLoan.status === 'DISETUJUI' ? (
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {activeLoan.status === 'PENDING'
                      ? 'Menunggu Persetujuan'
                      : activeLoan.status === 'DISETUJUI'
                        ? 'Siap Diambil'
                        : 'Sedang Dipinjam'}
                  </h3>
                  <p className="text-gray-700 font-medium">{activeLoan.barang?.namaBarang}</p>
                  <p className="text-sm text-gray-500">{activeLoan.barang?.kodeBarang}</p>
                  {activeLoan.tanggalJatuhTempo && activeLoan.status === 'DIPINJAM' && (
                    <p className="text-sm text-gray-700 mt-1">
                      Jatuh tempo: <strong>{formatDate(activeLoan.tanggalJatuhTempo)}</strong>
                    </p>
                  )}
                  {activeLoan.status === 'DISETUJUI' && (
                    <p className="text-sm text-blue-600 mt-1">
                      Silakan ambil barang di ruang admin
                    </p>
                  )}
                </div>
              </div>
              <div>
                {getStatusBadge(activeLoan.status)}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            {[
              { id: 'ajuan', label: 'Ajukan Pinjaman', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )},
              { id: 'riwayat', label: 'Riwayat', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              )},
              { id: 'chat', label: 'Chat Admin', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              )},
              { id: 'notifikasi', label: 'Notifikasi', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              )},
              { id: 'terlambat', label: 'Terlambat', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )},
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'notifikasi' && notifications.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 rounded-full text-xs">
                    {notifications.length}
                  </span>
                )}
                {tab.id === 'chat' && unreadMessages > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs">
                    {unreadMessages}
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
              <h2 className="text-lg font-semibold text-gray-900">Formulir Pengajuan Peminjaman</h2>
            </div>
            
            <div className="p-6">
              {formSubmitted ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pengajuan Berhasil!</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Pengajuan Anda telah dikirim dan menunggu persetujuan admin. 
                    Anda akan menerima notifikasi ketika pengajuan diproses.
                  </p>
                  <button
                    onClick={() => { setFormSubmitted(false); fetchData(); }}
                    className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    Kembali ke Form
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitAjuan} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pilih Barang <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedBarangId}
                      onChange={(e) => setSelectedBarangId(e.target.value)}
                      required
                      disabled={hasActiveLoan}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed text-black"
                    >
                      <option className="text-black" value="">-- Pilih Barang --</option>
                      {availableBarang.map((item) => (
                        <option key={item.id} value={item.id} className="text-black">
                          {item.kodeBarang} | {item.namaBarang} | Stok: {item.stok}
                        </option>
                      ))}
                    </select>
                    {availableBarang.length === 0 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Tidak ada barang tersedia saat ini.
                      </p>
                    )}
                    {hasActiveLoan && (
                      <p className="text-sm text-gray-600 mt-2">
                        Anda sudah memiliki peminjaman aktif.
                      </p>
                    )}
                  </div>

                  {/* Selected Item Preview */}
                  {selectedBarangId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      {barang.filter(b => b.id === selectedBarangId).map((item) => (
                        <div key={item.id} className="flex items-center space-x-4">
                          <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-lg">{item.namaBarang}</p>
                            <p className="text-sm text-gray-500">Kode: {item.kodeBarang} | Stok: {item.stok}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Info Box */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-800 mb-2">Informasi Penting:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>Durasi peminjaman: 24 jam</li>
                      <li>Setiap peminjam hanya boleh memiliki 1 peminjaman aktif</li>
                      <li>Keterlambatan akan dicatat dan mempengaruhi pengajuan berikutnya</li>
                      <li>Pengajuan akan diverifikasi oleh admin terlebih dahulu</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={!selectedBarangId || submitting || hasActiveLoan}
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

        {/* Riwayat Tab */}
        {activeTab === 'riwayat' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Riwayat Peminjaman</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {loans.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p>Belum ada riwayat peminjaman</p>
                </div>
              ) : (
                loans.map((loan) => (
                  <div key={loan.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        loan.status === 'DIKEMBALIKAN' ? 'bg-gray-100' :
                        loan.status === 'DITOLAK' ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {loan.status === 'DIKEMBALIKAN' ? (
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : loan.status === 'DITOLAK' ? (
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{loan.barang?.namaBarang}</p>
                        <p className="text-sm text-gray-500">
                          {loan.status === 'DIKEMBALIKAN' ? formatDate(loan.tanggalDikembalikan) : 
                           loan.status === 'DITOLAK' ? formatDate(loan.updatedAt) :
                           formatDate(loan.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {loan.returnCondition && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          loan.returnCondition === 'NORMAL' ? 'bg-green-100 text-green-700' :
                          loan.returnCondition === 'RUSAK' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {loan.returnCondition === 'NORMAL' ? '🟢 Normal' :
                           loan.returnCondition === 'RUSAK' ? '🟠 Rusak' :
                           '🔴 Hilang'}
                        </span>
                      )}
                      {loan.isLate && loan.status === 'DIKEMBALIKAN' && (
                        <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                          🕐 Terlambat
                        </span>
                      )}
                      {getStatusBadge(loan.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Notifikasi Tab */}
        {activeTab === 'notifikasi' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Notifikasi</h2>
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    setNotifications([]);
                    toast.success('Notifikasi dihapus');
                  }}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  Hapus Semua
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p>Tidak ada notifikasi</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`p-4 flex items-start space-x-3 ${
                    notif.type === 'SUCCESS' ? 'bg-green-50' :
                    notif.type === 'ERROR' ? 'bg-red-50' :
                    notif.type === 'WARNING' ? 'bg-yellow-50' : 'bg-blue-50'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notif.type === 'SUCCESS' ? 'bg-green-100' :
                      notif.type === 'ERROR' ? 'bg-red-100' :
                      notif.type === 'WARNING' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      {notif.type === 'SUCCESS' ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : notif.type === 'ERROR' ? (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : notif.type === 'WARNING' ? (
                        <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(notif.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Chat dengan Admin</h2>
              <p className="text-sm text-gray-500 mt-1">Kirim pesan kepada admin untuk pertanyaan atau kendala</p>
            </div>
            
            {/* Message List */}
            <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-10">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p>Belum ada percakapan. Kirim pesan pertama!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isMine ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-100">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {sendingMessage ? 'Mengirim...' : 'Kirim'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Terlambat Tab */}
        {activeTab === 'terlambat' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Peminjaman Terlambat</h2>
              <p className="text-sm text-gray-500 mt-1">Daftar peminjaman yang terlambat dikembalikan</p>
            </div>
            <div className="divide-y divide-gray-100">
              {lateLoans.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Tidak ada peminjaman terlambat</p>
                </div>
              ) : (
                lateLoans.map((loan) => (
                  <div key={loan.id} className="p-4 flex items-center justify-between bg-red-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-red-100">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{loan.barang?.namaBarang}</p>
                        <p className="text-sm text-gray-500">
                          Jatuh tempo: {formatDate(loan.tanggalJatuhTempo)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                        Terlambat
                      </span>
                      {getStatusBadge(loan.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </PeminjamLayout>
  );
}
