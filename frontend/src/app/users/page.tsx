"use client";

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import AdminLayout from '@/components/AdminLayout';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';

type User = {
  id: string;
  nama: string;
  email: string;
  role: 'ADMIN' | 'PEMINJAM';
  nip?: string;
  nisn?: string;
  createdAt: string;
};

type UserFormData = {
  nama: string;
  password: string;
  role: 'ADMIN' | 'PEMINJAM';
  nip: string;
  nisn: string;
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormData: UserFormData = {
    nama: '',
    password: '',
    role: 'PEMINJAM',
    nip: '',
    nisn: '',
  };
  
  const [formData, setFormData] = useState<UserFormData>(initialFormData);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;
    try {
      await apiClient.delete(`/users/${id}`);
      fetchUsers();
      toast.success('User berhasil dihapus');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menghapus user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        // Update existing user
        await apiClient.patch(`/users/${editingId}`, {
          nama: formData.nama,
          role: formData.role,
          nip: formData.nip || null,
          nisn: formData.nisn || null,
          ...(formData.password ? { password: formData.password } : {}),
        });
      } else {
        // Create new user
        await apiClient.post('/users', formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchUsers();
      toast.success(editingId ? 'User berhasil diperbarui' : 'User berhasil ditambahkan');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan user');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (u: User) => {
    setEditingId(u.id);
    setFormData({
      nama: u.nama,
      password: '',
      role: u.role,
      nip: u.nip || '',
      nisn: u.nisn || '',
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-600',
      PEMINJAM: 'bg-blue-100 text-blue-600',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors]}`}>
        {role === 'ADMIN' ? 'Administrator' : 'Peminjam'}
      </span>
    );
  };

  const getInitials = (nama: string) => {
    return nama
      .split(' ')
      .map((n) => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        {/* Page Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Users</h1>
            <p className="text-gray-500 mt-1">Kelola akun pengguna sistem</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Tambah User
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
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
              placeholder="Cari user (nama, email, role)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Daftar Users</h2>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
          </div>
          {loading ? (
            <LoadingSpinner message="Memuat data users..." />
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-black">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p>Tidak ada data users</p>
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
                      User
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Email/NISN/NIP
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Terdaftar
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.filter(u => {
                    const query = searchQuery.toLowerCase();
                    return (
                      (u.nama || '').toLowerCase().includes(query) ||
                      (u.email || '').toLowerCase().includes(query) ||
                      (u.role || '').toLowerCase().includes(query)
                    );
                  }).map((u, index) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">
                              {getInitials(u.nama)}
                            </span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{u.nama}</p>
                            <p className="text-xs text-black font-mono">{u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{u.email || '-'}</span>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(u.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(u)}
                          className="px-3 py-1 text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors mr-2"
                        >
                          Edit
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="px-3 py-1 text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                          >
                            Hapus
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500 text-center">
          Total Users: {users.filter(u => {
            const query = searchQuery.toLowerCase();
            return (
              (u.nama || '').toLowerCase().includes(query) ||
              (u.email || '').toLowerCase().includes(query) ||
              (u.role || '').toLowerCase().includes(query)
            );
          }).length} dari {users.length}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit User' : 'Tambah User'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-black mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-black mb-1">
                    {formData.role === 'ADMIN' ? 'NIP' : 'NISN'}
                  </label>
                  <input
                    type="text"
                    value={formData.role === 'ADMIN' ? formData.nip : formData.nisn}
                    onChange={(e) => setFormData({
                      ...formData,
                      [formData.role === 'ADMIN' ? 'nip' : 'nisn']: e.target.value
                    })}
                    placeholder={formData.role === 'ADMIN' ? '12345678' : '1234567890'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required={!editingId}
                  />
                </div>
                <div>
                  <label className="block text-sm text-black mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' | 'PEMINJAM' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option className="text-black" value="ADMIN">Administrator</option>
                    <option className="text-black" value="PEMINJAM">Peminjam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-black mb-1">
                    {editingId ? 'Password (kosongkan jika tidak diubah)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="******"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                    required={!editingId}
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
