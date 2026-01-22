"use client";

import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import apiClient from '@/lib/api';
import Select from '@/components/shadcn/Select';
import Button from '@/components/shadcn/Button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/shadcn/Table';
import Card from '@/components/shadcn/Card';

type Loan = {
  id: string;
  barangId?: string;
  peminjamId?: string;
  status?: string;
  createdAt?: string;
};

type Barang = {
  id: string;
  kodeBarang?: string;
  namaBarang?: string;
  stok?: number;
};

export default function LoanPage() {
  const { user, refreshUser } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [barangId, setBarangId] = useState('');
  const [availableBarang, setAvailableBarang] = useState<Barang[]>([]);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isPeminjam = user?.role === 'PEMINJAM';

  useEffect(() => {
    refreshUser();
    fetchLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // load barang list for selection
    const loadBarang = async () => {
      try {
        const res = await apiClient.get('/barang');
        setAvailableBarang(res.data || []);
      } catch (err) {
        console.error('failed load barang', err);
        setAvailableBarang([]);
      }
    };

    loadBarang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(isAdmin ? '/loan' : '/loan/me');
      setLoans(res.data || []);
    } catch (err) {
      console.error(err);
      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePinjam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangId) return;
    try {
      await apiClient.post('/loan', { barangId });
      setBarangId('');
      fetchLoans();
      alert('Permintaan pinjaman dikirim');
    } catch (err) {
      console.error(err);
      alert('Gagal meminjam barang');
    }
  };

  const handleReturn = async (loanId: string) => {
    if (!confirm('Tandai sebagai dikembalikan?')) return;
    try {
      await apiClient.post('/loan/return', { loanId });
      fetchLoans();
    } catch (err) {
      console.error(err);
      alert('Gagal mengembalikan');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Peminjaman</h1>
            <div className="text-sm text-gray-600">Role: {user?.role}</div>
          </div>

          {isPeminjam && (
            <Card className="mb-6">
              <h2 className="font-semibold mb-3">Form Pinjam Barang</h2>
              <form onSubmit={handlePinjam} className="flex gap-3 items-center">
                <Select value={barangId} onChange={(e: any) => setBarangId(e.target.value)} required>
                  <option value="">Pilih barang...</option>
                  {availableBarang.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.kodeBarang ?? b.namaBarang} {b.stok ? ` (stok: ${b.stok})` : ''}
                    </option>
                  ))}
                </Select>
                <Button>Pinjam</Button>
              </form>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold mb-3">Daftar Peminjaman</h2>
            {loading ? (
              <p>Memuat...</p>
            ) : loans.length === 0 ? (
              <p className="text-gray-600">Belum ada record</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>ID</TH>
                    <TH>Barang</TH>
                    <TH>Peminjam</TH>
                    <TH>Status</TH>
                    <TH>Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {loans.map((l) => (
                    <TR key={l.id}>
                      <TD>{l.id}</TD>
                      <TD>{l.barangId}</TD>
                      <TD>{l.peminjamId ?? '-'}</TD>
                      <TD>{l.status ?? '-'}</TD>
                      <TD>
                        {isAdmin ? (
                          <Button onClick={() => handleReturn(l.id)} className="bg-green-600">Kembalikan</Button>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </main>
      </div>
    </ProtectedRoute>
  );
}
