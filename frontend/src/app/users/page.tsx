"use client";

import React, { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/lib/protected-route';
import { useAuth } from '@/lib/auth-context';
import apiClient from '@/lib/api';
import { Table, THead, TBody, TR, TH, TD } from '@/components/shadcn/Table';
import Select from '@/components/shadcn/Select';
import Button from '@/components/shadcn/Button';
import Card from '@/components/shadcn/Card';

type User = {
  id: string;
  email: string;
  nama: string;
  role: 'ADMIN' | 'PEMINJAM';
};

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (id: string, role: User['role']) => {
    try {
      await apiClient.patch(`/users/${id}`, { role });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Gagal mengubah role');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow">Hanya admin yang dapat mengakses halaman ini.</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Manajemen Users</h1>
            <div className="text-sm text-gray-600">Role: {user?.role}</div>
          </div>

          <Card>
            <h2 className="font-semibold mb-3">Daftar Users</h2>
            {loading ? (
              <p>Memuat...</p>
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Email</TH>
                    <TH>Nama</TH>
                    <TH>Role</TH>
                    <TH>Aksi</TH>
                  </TR>
                </THead>
                <TBody>
                  {users.map((u) => (
                    <TR key={u.id}>
                      <TD>{u.email}</TD>
                      <TD>{u.nama}</TD>
                      <TD>{u.role}</TD>
                      <TD>
                        <Select
                          value={u.role}
                          onChange={(e: any) => handleRoleChange(u.id, e.target.value as User['role'])}
                          className="w-40 mr-2"
                        >
                          <option value="PEMINJAM">PEMINJAM</option>
                          <option value="ADMIN">ADMIN</option>
                        </Select>
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
