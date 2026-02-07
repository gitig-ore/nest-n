"use client";

import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import AdminLayout from '@/components/AdminLayout';
import apiClient from '@/lib/api';
import Input from '@/components/shadcn/Input';
import Button from '@/components/shadcn/Button';
import Card from '@/components/shadcn/Card';

type Barang = {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kondisi?: string;
  stok: number;
};

type BarangFormData = {
  kodeBarang: string;
  namaBarang: string;
  kondisi: string;
  stok: number;
};

export default function BarangPage() {
  const { user } = useAuth();
  const [barang, setBarang] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormData: BarangFormData = {
    kodeBarang: '',
    namaBarang: '',
    kondisi: 'Baik',
    stok: 1,
  };
  
  const [formData, setFormData] = useState<BarangFormData>(initialFormData);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/barang');
      setBarang(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal memuat barang');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        // Update existing barang
        await apiClient.put(`/barang/${editingId}`, formData);
      } else {
        // Create new barang
        await apiClient.post('/barang', formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchList();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menyimpan barang');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Barang) => {
    setEditingId(item.id);
    setFormData({
      kodeBarang: item.kodeBarang,
      namaBarang: item.namaBarang,
      kondisi: item.kondisi || 'Baik',
      stok: item.stok,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus barang ini?')) return;
    try {
      await apiClient.delete(`/barang/${id}`);
      fetchList();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal menghapus barang');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormData);
  };

  const getConditionBadge = (kondisi: string) => {
    const colors: Record<string, string> = {
      Baik: 'bg-green-100 text-green-600',
      Rusak: 'bg-red-100 text-red-600',
      'Perlu Perbaikan': 'bg-yellow-100 text-yellow-600',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[kondisi] || 'bg-gray-100 text-gray-600'}`}>
        {kondisi}
      </span>
    );
  };

  return (
    <ProtectedRoute>
      <AdminLayout>
        {/* Page Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Master</h1>
            <p className="text-gray-500 mt-1">Kelola barang yang tersedia untuk dipinjam</p>
          </div>
            {isAdmin && (
            <Button 
              onClick={() => setShowModal(true)}
              className="bg-white stroke-gray-500  hover:bg-gray-300 text-black px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2 text-l"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Barang
            </Button>
            )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Barang Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Daftar Barang</h2>
            <button
              onClick={fetchList}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Refresh
            </button>
          </div>
          {loading && !showModal ? (
            <div className="p-8 text-center">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-500">Memuat data...</p>
            </div>
          ) : barang.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>Tidak ada data barang</p>
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
                      Kode
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Nama Barang
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Kondisi
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Stok
                    </th>
                    {isAdmin && (
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {barang.map((b, index) => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900 font-mono">{b.kodeBarang}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">{b.namaBarang}</span>
                      </td>
                      <td className="px-6 py-4">{getConditionBadge(b.kondisi || 'Baik')}</td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${b.stok > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {b.stok}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEdit(b)}
                            className="px-3 py-1 text-blue-500 hover:text-blue-600 text-sm font-medium transition-colors mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="px-3 py-1 text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 text-sm text-gray-500 text-center">
          Total Barang: {barang.length}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingId ? 'Edit Barang' : 'Tambah Barang'}
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
                  <label className="block text-sm text-gray-600 mb-1">Kode Barang</label>
                  <Input
                  value={formData.kodeBarang}
                  onChange={(e: any) => setFormData({ ...formData, kodeBarang: e.target.value })}
                  placeholder="BRG-001"
                  className="placeholder:text-gray-900"
                  required
                  disabled={!!editingId}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nama Barang</label>
                  <Input
                    value={formData.namaBarang}
                    onChange={(e: any) => setFormData({ ...formData, namaBarang: e.target.value })}
                    placeholder="Laptop Dell"
                    className="placeholder:text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Kondisi</label>
                  <select
                    value={formData.kondisi}
                    onChange={(e) => setFormData({ ...formData, kondisi: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    
                  
                  >
                    <option className="text-gray-900" value="Baik">Baik</option>
                    <option className="text-gray-900" value="Rusak">Rusak</option>
                    <option className="text-gray-900" value="Perlu Perbaikan">Perlu Perbaikan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Stok</label>
                  <Input
                    type="number"
                    value={formData.stok}
                    onChange={(e: any) => setFormData({ ...formData, stok: Number(e.target.value) })}
                    className="w-32"
                    required
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={handleCloseModal}
                    className="bg-gray-500"
                  >
                    Batal
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
