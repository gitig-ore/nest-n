"use client";

import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import apiClient from '@/lib/api';
import Input from '@/components/shadcn/Input';
import Button from '@/components/shadcn/Button';
import Card from '@/components/shadcn/Card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/shadcn/Table';

type Barang = {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  kondisi?: string;
  stok: number;
};

export default function BarangPage() {
  const { user, refreshUser } = useAuth();
  const [barang, setBarang] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(false);
  const [kodeBarang, setKodeBarang] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [kondisi, setKondisi] = useState('Baik');
  const [stock, setStock] = useState(1);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    refreshUser();
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/barang');
      setBarang(res.data || []);
    } catch (err) {
      console.error(err);
      setBarang([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/barang', {
        kodeBarang,
        namaBarang,
        kondisi,
        stok: stock,
      });
      setKodeBarang('');
      setNamaBarang('');
      setKondisi('Baik');
      setStock(1);
      fetchList();
    } catch (err) {
      console.error(err);
      alert('Gagal menambah barang');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus barang ini?')) return;
    try {
      await apiClient.delete(`/barang/${id}`);
      fetchList();
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus barang');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Daftar Barang</h1>
            <div className="text-sm text-gray-600">Role: {user?.role}</div>
          </div>

          <Card className="mb-6">
            <h2 className="font-semibold mb-3">Barang</h2>
            {loading ? (
              <p>Memuat...</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Kode</TH>
                    <TH>Nama</TH>
                    <TH>Kondisi</TH>
                    <TH>Stok</TH>
                    {isAdmin && <TH>Aksi</TH>}
                  </TR>
                </THead>
                <TBody>
                  {barang.map((b) => (
                    <TR key={b.id}>
                      <TD>{b.kodeBarang}</TD>
                      <TD>{b.namaBarang}</TD>
                      <TD>{b.kondisi ?? '-'}</TD>
                      <TD>{b.stok ?? '-'}</TD>
                      {isAdmin && (
                        <TD>
                          <Button onClick={() => handleDelete(b.id)} className="bg-red-600">Hapus</Button>
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>

          {isAdmin && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3">Tambah Barang</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Kode Barang</label>
                  <Input value={kodeBarang} onChange={(e: any) => setKodeBarang(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nama Barang</label>
                  <Input value={namaBarang} onChange={(e: any) => setNamaBarang(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Kondisi</label>
                  <Input value={kondisi} onChange={(e: any) => setKondisi(e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">Stok</label>
                  <Input
                    type="number"
                    value={stock}
                    min={0}
                    onChange={(e: any) => setStock(Number(e.target.value))}
                    className="w-32"
                  />
                </div>

                <div>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded">Tambah</button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
