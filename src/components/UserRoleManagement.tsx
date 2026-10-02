/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Key, 
  Check, 
  X, 
  Lock, 
  Shield, 
  Download, 
  Upload, 
  Database,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  History,
  RotateCcw,
  LogOut,
  UserCog,
  KeyRound,
  Clock
} from 'lucide-react';
import { UserAccount, UserRole, ActivityLog, PasswordChangeLog } from '../types';

interface UserRoleManagementProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onSwitchUser: (user: UserAccount) => void;
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonData: string) => void;
  onExportCsvLogs: () => void;
  onOpenLoginModal?: () => void;
  onOpenChangePasswordModal?: () => void;
  logs: ActivityLog[];
}

export const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onExportBackup,
  onImportBackup,
  onExportCsvLogs,
  onOpenLoginModal,
  onOpenChangePasswordModal,
  logs
}) => {
  const isSuperAdminOrSpv = currentUser.role === 'superadmin' || currentUser.role === 'supervisor';
  const isAdmin = currentUser.role === 'admin';
  const canManageUsers = isSuperAdminOrSpv || isAdmin;

  // Add / Edit User Modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [pin, setPin] = useState('1234');
  const [phone, setPhone] = useState('');

  // Password Visibility Toggle Map (for SPV/Superadmin)
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Reset Password Modal (SPV / Superadmin only)
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [resetNewPin, setResetNewPin] = useState('1234');
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  // Password History Modal (SPV / Superadmin only)
  const [historyTargetUser, setHistoryTargetUser] = useState<UserAccount | null>(null);

  // Restore Backup Input
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  // Role Permissions Matrix State (ADMIN, OPERATOR, SPV)
  const [rolePermissions, setRolePermissions] = useState<{
    admin: Record<string, boolean>;
    operator: Record<string, boolean>;
    superadmin: Record<string, boolean>;
  }>(() => {
    try {
      const saved = localStorage.getItem('sikutang_role_permissions_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      admin: {
        visualMonitoring: true,
        putaway: true,
        picking: true,
        masterProduct: true,
        masterRak: true,
        auditOpname: true,
        userManagement: true,
        exportBackup: true
      },
      operator: {
        visualMonitoring: true,
        putaway: true,
        picking: true,
        masterProduct: false,
        masterRak: false,
        auditOpname: false,
        userManagement: false,
        exportBackup: false
      },
      superadmin: {
        visualMonitoring: true,
        putaway: true,
        picking: true,
        masterProduct: true,
        masterRak: true,
        auditOpname: true,
        userManagement: true,
        exportBackup: true
      }
    };
  });

  const toggleRolePermission = (targetRole: 'admin' | 'operator' | 'superadmin', featureKey: string) => {
    if (!isSuperAdminOrSpv) return;

    setRolePermissions(prev => {
      const currentVal = !!prev[targetRole][featureKey];
      const updated = {
        ...prev,
        [targetRole]: {
          ...prev[targetRole],
          [featureKey]: !currentVal
        }
      };
      try {
        localStorage.setItem('sikutang_role_permissions_v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setName('');
    setUsername(`user.${Date.now().toString().slice(-4)}`);
    setRole('operator');
    setPin('1234');
    setPhone('');
    setIsAddUserOpen(true);
  };

  const handleOpenEdit = (u: UserAccount) => {
    setEditingUserId(u.id);
    setName(u.name);
    setUsername(u.username);
    setRole(u.role);
    setPin(u.pin);
    setPhone(u.phone || '');
    setIsAddUserOpen(true);
  };

  const handleSubmitUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;

    const existingUser = users.find(u => u.id === editingUserId);

    let passwordHistory: PasswordChangeLog[] = existingUser?.passwordHistory || [];
    let passwordChangedAt = existingUser?.passwordChangedAt || new Date().toISOString().replace('T', ' ').slice(0, 16);

    // If PIN was modified during edit
    if (existingUser && existingUser.pin !== pin.trim()) {
      passwordChangedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      passwordHistory = [
        ...passwordHistory,
        {
          id: `pwd-${Date.now()}`,
          changedAt: passwordChangedAt,
          changedBy: `${currentUser.name} (${currentUser.role})`,
          type: 'admin_reset',
          note: `Kata sandi diubah melalui Edit Akun oleh ${currentUser.name}`
        }
      ];
    } else if (!existingUser) {
      // New user initial log
      passwordHistory = [
        {
          id: `pwd-${Date.now()}`,
          changedAt: passwordChangedAt,
          changedBy: `${currentUser.name} (${currentUser.role})`,
          type: 'admin_reset',
          note: `Pembuatan akun baru oleh ${currentUser.name}`
        }
      ];
    }

    const saved: UserAccount = {
      id: editingUserId || `USR-${Date.now().toString().slice(-3)}`,
      name: name.trim(),
      username: username.trim(),
      role,
      pin: pin.trim() || '1234',
      phone: phone.trim(),
      avatarColor:
        role === 'superadmin' || role === 'supervisor'
          ? 'bg-amber-600'
          : role === 'admin'
          ? 'bg-indigo-600'
          : 'bg-teal-600',
      status: 'active',
      lastActive: existingUser?.lastActive || 'Baru saja',
      passwordChangedAt,
      passwordHistory
    };

    onSaveUser(saved);
    setIsAddUserOpen(false);
  };

  const handleExecuteResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    if (!resetNewPin.trim()) return;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const updatedHistory: PasswordChangeLog[] = [
      ...(resetTargetUser.passwordHistory || []),
      {
        id: `pwd-${Date.now()}`,
        changedAt: nowStr,
        changedBy: `${currentUser.name} (${currentUser.role})`,
        type: 'admin_reset',
        note: `Reset kata sandi oleh ${currentUser.name} (Lupa Sandi)`
      }
    ];

    const updatedUser: UserAccount = {
      ...resetTargetUser,
      pin: resetNewPin.trim(),
      passwordChangedAt: nowStr,
      passwordHistory: updatedHistory
    };

    onSaveUser(updatedUser);
    setResetSuccessNotice(`Kata sandi akun ${resetTargetUser.name} berhasil di-reset menjadi "${resetNewPin.trim()}"!`);

    setTimeout(() => {
      setResetTargetUser(null);
      setResetSuccessNotice(null);
      setResetNewPin('1234');
    }, 1400);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportBackup(content);
        setIsRestoreOpen(false);
      }
    };
    reader.readAsText(file);
  };

  const featureRows = [
    { key: 'visualMonitoring', label: 'Visual Monitoring Rak Real-time' },
    { key: 'putaway', label: 'Pemindaian Barcode & Putaway (Barang Masuk)' },
    { key: 'picking', label: 'Picking / Pengeluaran Barang dari Rak' },
    { key: 'masterProduct', label: 'Manajemen Master Produk BOX' },
    { key: 'masterRak', label: 'Manajemen Master Rak & Konfigurasi' },
    { key: 'auditOpname', label: 'Audit Stock Opname & Penyesuaian' },
    { key: 'userManagement', label: 'Manajemen Akun & Otorisasi Pengguna' },
    { key: 'exportBackup', label: 'Backup, Restore & Ekspor CSV' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-3 h-8 bg-indigo-600 rounded-full inline-block"></span>
            Manajemen Pengguna & Hak Akses
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Konfigurasi otorisasi bertingkat untuk <strong>SPV / Superadmin</strong>, <strong>Admin Gudang</strong>, dan <strong>Operator</strong> dengan sistem keamanan data tinggi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canManageUsers && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Tambah Pengguna Baru</span>
            </button>
          )}

          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm border border-slate-300 transition cursor-pointer"
              title="Keluar dari sesi saat ini dan login ulang sebagai pengguna lain"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
              <span>Login Ulang / Ganti Akun</span>
            </button>
          )}
        </div>
      </div>

      {/* Role Permissions Matrix Card (Renamed to: Matriks Hak Akses Akun) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Matriks Hak Akses Akun</h3>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
            isSuperAdminOrSpv
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-slate-100 text-slate-700 border-slate-300'
          }`}>
            <Check className="w-3.5 h-3.5 text-amber-700" />
            {isSuperAdminOrSpv
              ? 'Akses SPV / Superadmin: Anda dapat mengubah izin Admin, Operator, & SPV'
              : 'Mode Terkunci: Izin role dikelola oleh Superadmin & SPV'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-xs uppercase font-semibold">
                <th className="py-3.5 px-6">Modul & Fitur Sistem</th>
                <th className="py-3.5 px-6 text-center text-indigo-300">
                  ADMIN GUDANG
                  {isSuperAdminOrSpv && (
                    <span className="block text-[10px] text-indigo-200 font-normal lowercase tracking-normal">
                      (klik untuk ubah izin)
                    </span>
                  )}
                </th>
                <th className="py-3.5 px-6 text-center text-teal-300">
                  OPERATOR SCANNER
                  {isSuperAdminOrSpv && (
                    <span className="block text-[10px] text-teal-200 font-normal lowercase tracking-normal">
                      (klik untuk ubah izin)
                    </span>
                  )}
                </th>
                <th className="py-3.5 px-6 text-center text-amber-300 bg-amber-950/40">
                  SPV / SUPERADMIN
                  {isSuperAdminOrSpv && (
                    <span className="block text-[10px] text-amber-200 font-normal lowercase tracking-normal">
                      (klik untuk ubah izin)
                    </span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {featureRows.map((row, idx) => {
                const isAdminActive = !!rolePermissions.admin[row.key];
                const isOpActive = !!rolePermissions.operator[row.key];
                const isSpvActive = !!rolePermissions.superadmin[row.key];

                return (
                  <tr key={row.key} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      {row.label}
                    </td>

                    {/* Admin Gudang Permission Cell */}
                    <td className="py-3 px-6 text-center">
                      {isSuperAdminOrSpv ? (
                        <button
                          type="button"
                          onClick={() => toggleRolePermission('admin', row.key)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            isAdminActive
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="Klik untuk mengubah akses Admin Gudang"
                        >
                          {isAdminActive ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                          <span>{isAdminActive ? 'Aktif' : 'Non-aktif'}</span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isAdminActive ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isAdminActive ? <Check className="w-3.5 h-3.5 text-indigo-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                          {isAdminActive ? 'Aktif' : 'Tutup'}
                        </span>
                      )}
                    </td>

                    {/* Operator Scanner Permission Cell */}
                    <td className="py-3 px-6 text-center">
                      {isSuperAdminOrSpv ? (
                        <button
                          type="button"
                          onClick={() => toggleRolePermission('operator', row.key)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            isOpActive
                              ? 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="Klik untuk mengubah akses Operator Scanner"
                        >
                          {isOpActive ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                          <span>{isOpActive ? 'Aktif' : 'Non-aktif'}</span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isOpActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isOpActive ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                          {isOpActive ? 'Aktif' : 'Tutup'}
                        </span>
                      )}
                    </td>

                    {/* SPV / Superadmin Permission Cell */}
                    <td className="py-3 px-6 text-center bg-amber-50/30">
                      {isSuperAdminOrSpv ? (
                        <button
                          type="button"
                          onClick={() => toggleRolePermission('superadmin', row.key)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            isSpvActive
                              ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                              : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="Klik untuk mengubah akses SPV / Superadmin"
                        >
                          {isSpvActive ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                          <span>{isSpvActive ? 'Aktif' : 'Non-aktif'}</span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isSpvActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isSpvActive ? <Check className="w-3.5 h-3.5 text-amber-600" /> : <X className="w-3.5 h-3.5 text-slate-400" />}
                          {isSpvActive ? 'Aktif' : 'Tutup'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Accounts List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">Daftar Akun Petugas Gudang</h3>
          </div>
          <span className="text-xs text-slate-500">
            Pergantian akun operator & admin wajib verifikasi kata sandi (login ulang).
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map(u => {
            const isSelf = u.id === currentUser.id;
            const isTargetSpv = u.role === 'superadmin' || u.role === 'supervisor';
            const isTargetAdmin = u.role === 'admin';
            const isPasswordVisible = !!showPasswordMap[u.id];

            return (
              <div key={u.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-2xl ${u.avatarColor} text-white font-black text-base flex items-center justify-center shadow-xs shrink-0`}>
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-base">{u.name}</span>
                      {isSelf && (
                        <span className="bg-cyan-100 text-cyan-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          SESI ANDA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono mt-0.5 flex-wrap">
                      <span>@{u.username}</span>
                      <span>&bull;</span>
                      
                      {/* Password/PIN Display with Eye toggle for SPV/Superadmin */}
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>PIN: {isPasswordVisible ? u.pin : '••••'}</span>
                        {isSuperAdminOrSpv && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-slate-400 hover:text-slate-700 transition"
                            title={isPasswordVisible ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
                          </button>
                        )}
                      </span>

                      {u.phone && (
                        <>
                          <span>&bull;</span>
                          <span>{u.phone}</span>
                        </>
                      )}

                      {u.passwordChangedAt && (
                        <>
                          <span>&bull;</span>
                          <span className="text-[11px] text-slate-400">
                            Sandi diubah: {u.passwordChangedAt}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
                  {/* Role Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    u.role === 'superadmin'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : u.role === 'supervisor'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : isTargetAdmin
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'bg-teal-100 text-teal-800 border border-teal-200'
                  }`}>
                    {u.role === 'superadmin' ? 'Super Admin' : u.role === 'supervisor' ? 'Supervisor (SPV)' : isTargetAdmin ? 'Admin' : 'Operator'}
                  </span>

                  {/* Change Own Password Button for logged in user */}
                  {isSelf && onOpenChangePasswordModal && (
                    <button
                      onClick={onOpenChangePasswordModal}
                      className="px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-bold border border-cyan-200 transition cursor-pointer flex items-center gap-1"
                      title="Ubah kata sandi akun Anda sendiri"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Ubah Sandi Saya</span>
                    </button>
                  )}

                  {/* SPV / Superadmin Tools: Password History & Reset Password */}
                  {isSuperAdminOrSpv && (
                    <>
                      {/* Password History Button */}
                      <button
                        onClick={() => setHistoryTargetUser(u)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1"
                        title="Lihat riwayat perubahan kata sandi akun ini"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Riwayat Sandi</span>
                      </button>

                      {/* Reset Password Button */}
                      <button
                        onClick={() => {
                          setResetTargetUser(u);
                          setResetNewPin('1234');
                          setResetSuccessNotice(null);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer flex items-center gap-1"
                        title="Reset kata sandi jika pengguna lupa kata sandi lamanya"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                        <span className="hidden md:inline">Reset Sandi</span>
                      </button>

                      {/* Edit User & Role Button */}
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                        title="Edit data & role akun"
                      >
                        <UserCog className="w-4 h-4 text-indigo-600" />
                      </button>
                    </>
                  )}

                  {/* Delete User (SPV / Superadmin only) */}
                  {isSuperAdminOrSpv && !isSelf && users.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Hapus akun petugas ${u.name}?`)) onDeleteUser(u.id);
                      }}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus Pengguna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Security & Backup Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Database className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-base">Sistem Keamanan Data & Cadangan Online</h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          SIKUTANG dilengkapi dengan sistem proteksi integritas data stok real-time, pencatatan log mutasi barang (audit trail), enkripsi data lokal, serta fungsi sinkronisasi dan backup penuh.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={onExportBackup}
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="font-bold text-slate-900 text-xs block">Cadangkan Data (JSON)</span>
              <span className="text-[11px] text-slate-500">Download snapshot master & stok</span>
            </div>
            <Download className="w-5 h-5 text-slate-600" />
          </button>

          <button
            onClick={onExportCsvLogs}
            className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="font-bold text-slate-900 text-xs block">Ekspor Audit Trail (CSV)</span>
              <span className="text-[11px] text-slate-500">{logs.length} catatan aktivitas sistem</span>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
          </button>

          <label className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition cursor-pointer flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-xs block">Pulihkan Data (Restore)</span>
              <span className="text-[11px] text-slate-500">Unggah file backup JSON</span>
            </div>
            <Upload className="w-5 h-5 text-indigo-600" />
            <input type="file" accept=".json" onChange={handleFileRestore} className="hidden" />
          </label>
        </div>
      </div>

      {/* Modal Add / Edit User (With roles: spv/superadmin, admin, operator) */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {editingUserId ? 'Edit Akun Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Lengkap (Nama Baru)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Sandy Pratama"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="user.sandy"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kata Sandi / PIN
                  </label>
                  <input
                    type="text"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="1234"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white text-center tracking-widest"
                  />
                </div>
              </div>

              {/* Pilihan Role: SPV/Superadmin, Admin, Operator */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Pilihan Hak Akses / Role Akun:
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                >
                  <option value="superadmin">Super Admin (Akses Penuh & Master Data)</option>
                  <option value="supervisor">Supervisor (SPV)</option>
                  <option value="admin">Admin (Gudang)</option>
                  <option value="operator">Operator (Scanner Lapangan)</option>
                </select>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Role menentukan otorisasi modul dan wewenang reset kata sandi.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  No. HP / Telepon (Opsional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow cursor-pointer"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reset Password (SPV / Superadmin only) */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <RotateCcw className="w-5 h-5" />
                <h3 className="font-extrabold text-base">Reset Kata Sandi Akun</h3>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Gunakan fitur ini apabila akun <strong>{resetTargetUser.name}</strong> lupa kata sandi lamanya. Sebagai SPV/Superadmin, Anda dapat menetapkan kata sandi baru secara langsung.
                </span>
              </div>

              {resetSuccessNotice && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessNotice}</span>
                </div>
              )}

              <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>Nama Akun: <strong>{resetTargetUser.name}</strong></div>
                <div>Username: <strong>@{resetTargetUser.username}</strong></div>
                <div>Role: <strong className="uppercase">{resetTargetUser.role}</strong></div>
                <div>Kata Sandi Saat Ini: <strong className="font-mono text-indigo-700">{resetTargetUser.pin}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kata Sandi / PIN Baru:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetNewPin}
                    onChange={(e) => setResetNewPin(e.target.value)}
                    placeholder="Contoh: 1234 atau sandi baru..."
                    required
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setResetNewPin('1234')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition"
                  >
                    Default (1234)
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Terapkan Reset Sandi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Password History (SPV / Superadmin only) */}
      {historyTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-extrabold text-base">Riwayat Perubahan Kata Sandi</h3>
                  <span className="text-xs text-slate-400">
                    Akun: {historyTargetUser.name} (@{historyTargetUser.username})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setHistoryTargetUser(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Kata Sandi Saat Ini</span>
                  <span className="font-mono font-black text-indigo-900 text-base">{historyTargetUser.pin}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Terakhir Diubah</span>
                  <span className="font-bold text-slate-800">{historyTargetUser.passwordChangedAt || 'Belum pernah diubah'}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Log Riwayat Perubahan Kata Sandi:</span>
                </h4>

                {(!historyTargetUser.passwordHistory || historyTargetUser.passwordHistory.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-200">
                    Belum ada catatan riwayat perubahan kata sandi untuk akun ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {historyTargetUser.passwordHistory.map((item, idx) => (
                      <div key={item.id || idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.type === 'admin_reset' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                          }`}>
                            {item.type === 'admin_reset' ? 'Reset oleh SPV / Admin' : 'Perubahan Mandiri User'}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{item.changedAt}</span>
                        </div>
                        <p className="text-slate-800 font-medium pt-0.5">
                          {item.note || 'Perubahan kata sandi akun'}
                        </p>
                        <span className="text-[11px] text-slate-500 block">
                          Dilakukan oleh: <strong>{item.changedBy}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setHistoryTargetUser(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl"
                >
                  Tutup Riwayat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
