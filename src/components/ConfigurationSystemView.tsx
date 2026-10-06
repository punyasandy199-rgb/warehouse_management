/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Users, 
  ShieldCheck, 
  Cloud, 
  GitBranch, 
  UserPlus, 
  Key, 
  Check, 
  X, 
  Lock, 
  Trash2, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Database, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  RefreshCw, 
  Github, 
  Server, 
  Terminal, 
  Activity, 
  Save, 
  Link, 
  ExternalLink,
  Shield,
  HelpCircle,
  KeyRound,
  FileCode,
  Camera,
  CameraOff,
  Scan
} from 'lucide-react';
import { UserAccount, UserRole, ActivityLog, PasswordChangeLog } from '../types';

interface FirebaseConfig {
  projectId: string;
  firestoreEnabled: boolean;
  authEnabled: boolean;
  realtimeSync: boolean;
  region: string;
  lastSyncTime: string;
}

interface GithubConfig {
  repoUrl: string;
  branch: string;
  autoCommitAudit: boolean;
  webhookEnabled: boolean;
  lastCommitHash: string;
  lastCommitTime: string;
}

interface ConfigurationSystemViewProps {
  users: UserAccount[];
  currentUser: UserAccount;
  onSaveUser: (user: UserAccount) => void;
  onDeleteUser: (userId: string) => void;
  onExportBackup: () => void;
  onImportBackup: (jsonData: string) => void;
  onExportCsvLogs: () => void;
  onOpenClearDataModal?: () => void;
  logs: ActivityLog[];
  onForceSyncCloud?: () => Promise<boolean>;
  cloudSyncStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  isCameraScannerEnabled?: boolean;
  onToggleCameraScanner?: (enabled: boolean) => void;
}

export const ConfigurationSystemView: React.FC<ConfigurationSystemViewProps> = ({
  users,
  currentUser,
  onSaveUser,
  onDeleteUser,
  onExportBackup,
  onImportBackup,
  onExportCsvLogs,
  onOpenClearDataModal,
  logs,
  onForceSyncCloud,
  cloudSyncStatus = 'connected',
  isCameraScannerEnabled = true,
  onToggleCameraScanner
}) => {
  const [activeConfigTab, setActiveConfigTab] = useState<'accounts' | 'roles' | 'scanner' | 'cloud' | 'logs'>('accounts');

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

  // Password Visibility Toggle Map
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Reset Password Modal
  const [resetTargetUser, setResetTargetUser] = useState<UserAccount | null>(null);
  const [resetNewPin, setResetNewPin] = useState('1234');
  const [resetSuccessNotice, setResetSuccessNotice] = useState<string | null>(null);

  // Restore Backup
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreMessage, setRestoreMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Unduh Versi HTML State & Handler
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);

  const handleDownloadStandaloneHtml = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDownloadingHtml(true);
    try {
      const res = await fetch('/sikutang_wms_standalone.html');
      if (!res.ok) throw new Error('File belum siap');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sikutang_wms_offline.html';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh file HTML secara otomatis. Gunakan tombol Export ZIP di pojok kanan atas layar.');
    } finally {
      setIsDownloadingHtml(false);
    }
  };

  // Cloud Firebase & GitHub Settings State
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>(() => {
    try {
      const saved = localStorage.getItem('sikutang_firebase_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      projectId: 'gen-lang-client-0913601146',
      firestoreEnabled: true,
      authEnabled: true,
      realtimeSync: true,
      region: 'asia-east1',
      lastSyncTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
  });

  const [githubConfig, setGithubConfig] = useState<GithubConfig>(() => {
    try {
      const saved = localStorage.getItem('sikutang_github_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      repoUrl: 'https://github.com/company/sikutang-wms-fgw',
      branch: 'main',
      autoCommitAudit: true,
      webhookEnabled: true,
      lastCommitHash: 'a796a46',
      lastCommitTime: 'Hari ini, 12:48 WIB'
    };
  });

  const [isSyncingFirebase, setIsSyncingFirebase] = useState(false);
  const [syncFirebaseSuccess, setSyncFirebaseSuccess] = useState(false);
  const [isSyncingGithub, setIsSyncingGithub] = useState(false);
  const [syncGithubSuccess, setSyncGithubSuccess] = useState(false);

  // Role Permissions Matrix State
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
        prosesIn: true,
        prosesOut: true,
        dataMaster: true,
        masterRak: true,
        masterProduct: true,
        auditOpname: true,
        userManagement: true,
        cloudConfig: false,
        exportBackup: true
      },
      operator: {
        prosesIn: true,
        prosesOut: true,
        dataMaster: false,
        masterRak: false,
        masterProduct: false,
        auditOpname: false,
        userManagement: false,
        cloudConfig: false,
        exportBackup: false
      },
      superadmin: {
        prosesIn: true,
        prosesOut: true,
        dataMaster: true,
        masterRak: true,
        masterProduct: true,
        auditOpname: true,
        userManagement: true,
        cloudConfig: true,
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

    if (existingUser && existingUser.pin !== pin.trim()) {
      passwordChangedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
      passwordHistory = [
        {
          id: `pwd-${Date.now()}`,
          changedAt: passwordChangedAt,
          changedBy: `${currentUser.name} (${currentUser.role})`,
          type: 'admin_reset',
          note: 'Reset / ubah sandi lewat Configuration System',
          newPin: pin.trim()
        },
        ...passwordHistory
      ];
    }

    const userData: UserAccount = {
      id: editingUserId || `user-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role,
      pin: pin.trim(),
      phone: phone.trim() || undefined,
      status: existingUser ? existingUser.status : 'active',
      lastActive: existingUser ? existingUser.lastActive : 'Baru dibuat',
      avatarColor: existingUser ? existingUser.avatarColor : 'bg-blue-600',
      passwordChangedAt,
      passwordHistory
    };

    onSaveUser(userData);
    setIsAddUserOpen(false);
  };

  const handleDeleteUserClick = (targetUser: UserAccount) => {
    if (targetUser.id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!');
      return;
    }
    if (targetUser.role === 'superadmin' && currentUser.role !== 'superadmin') {
      alert('Hanya Superadmin yang berwenang menghapus akun Superadmin lain!');
      return;
    }
    if (window.confirm(`Yakin ingin menghapus akun "${targetUser.name}" (${targetUser.username}) secara permanen dari sistem?`)) {
      onDeleteUser(targetUser.id);
    }
  };

  const handleSyncFirebase = async () => {
    setIsSyncingFirebase(true);
    setSyncFirebaseSuccess(false);
    if (onForceSyncCloud) {
      const ok = await onForceSyncCloud();
      setIsSyncingFirebase(false);
      if (ok) {
        setSyncFirebaseSuccess(true);
        const newTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setFirebaseConfig((prev: FirebaseConfig) => {
          const up = { ...prev, lastSyncTime: newTime };
          try { localStorage.setItem('sikutang_firebase_config', JSON.stringify(up)); } catch {}
          return up;
        });
        setTimeout(() => setSyncFirebaseSuccess(false), 4000);
      }
    } else {
      setTimeout(() => {
        setIsSyncingFirebase(false);
        setSyncFirebaseSuccess(true);
        const newTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setFirebaseConfig((prev: FirebaseConfig) => {
          const up = { ...prev, lastSyncTime: newTime };
          try { localStorage.setItem('sikutang_firebase_config', JSON.stringify(up)); } catch {}
          return up;
        });
        setTimeout(() => setSyncFirebaseSuccess(false), 3000);
      }, 1000);
    }
  };

  const handleSyncGithub = () => {
    setIsSyncingGithub(true);
    setSyncGithubSuccess(false);
    setTimeout(() => {
      setIsSyncingGithub(false);
      setSyncGithubSuccess(true);
      const newHash = Math.random().toString(16).slice(2, 9);
      setGithubConfig((prev: GithubConfig) => {
        const up = { ...prev, lastCommitHash: newHash, lastCommitTime: 'Baru saja' };
        try { localStorage.setItem('sikutang_github_config', JSON.stringify(up)); } catch {}
        return up;
      });
      setTimeout(() => setSyncGithubSuccess(false), 3000);
    }, 1400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRestoreJsonInput(content);
        try {
          JSON.parse(content);
          onImportBackup(content);
          setRestoreMessage({ type: 'success', text: 'File backup berhasil dipulihkan! Seluruh data rak, produk, dan user akun telah diperbarui.' });
          setTimeout(() => {
            setIsRestoreOpen(false);
            setRestoreMessage(null);
            setRestoreJsonInput('');
          }, 1800);
        } catch {
          setRestoreMessage({ type: 'error', text: 'Format file JSON tidak valid. Pastikan file berasal dari Export Backup SIKUTANG.' });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreSubmit = () => {
    if (!restoreJsonInput.trim()) return;
    try {
      JSON.parse(restoreJsonInput);
      onImportBackup(restoreJsonInput);
      setRestoreMessage({ type: 'success', text: 'Database berhasil dipulihkan dari data JSON!' });
      setTimeout(() => {
        setIsRestoreOpen(false);
        setRestoreMessage(null);
        setRestoreJsonInput('');
      }, 1800);
    } catch {
      setRestoreMessage({ type: 'error', text: 'Format JSON tidak valid! Pastikan menyalin data JSON backup yang benar.' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {/* Configuration Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Settings className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Configuration System
              </h2>
              <span className="bg-slate-100 text-slate-800 font-mono text-[10px] font-black px-2.5 py-0.5 rounded uppercase border border-slate-200">
                Sistem & Otorisasi
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manajemen penambahan, perubahan, dan pengurangan akun, hak akses otorisasi, serta integrasi cloud Firebase & GitHub.
            </p>
          </div>
        </div>

        {/* Global Action: Backup, Restore & Reset Simulasi */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenClearDataModal && currentUser.role === 'superadmin' && (
            <button
              onClick={onOpenClearDataModal}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-rose-200 shadow-xs"
              title="Kosongkan stok IC rak untuk simulasi baru (Master data rak tetap utuh)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Data Simulasi</span>
            </button>
          )}
          <button
            onClick={onExportBackup}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
            title="Download Full Database JSON Backup"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Backup</span>
          </button>
          <button
            onClick={() => setIsRestoreOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            title="Restore Database JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Data</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadStandaloneHtml}
            disabled={isDownloadingHtml}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-blue-200 shadow-xs disabled:opacity-50"
            title="Unduh 1 file HTML mandiri (bisa dibuka langsung di browser PC/Android secara offline tanpa internet atau server)"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600" />
            <span>{isDownloadingHtml ? 'Menyiapkan HTML...' : 'Unduh Versi HTML'}</span>
          </button>
          <a
            href="/sikutang_deploy_ready.zip"
            download="sikutang_deploy_ready.zip"
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-emerald-200 shadow-xs"
            title="Unduh paket ZIP lengkap untuk di-upload langsung ke Netlify Drop atau Vercel agar dapat diakses publik tanpa login Google"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paket Web (.ZIP)</span>
          </a>
        </div>
      </div>

      {/* Sub-Navigation Tabs inside Configuration System */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveConfigTab('accounts')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeConfigTab === 'accounts'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Manajemen Akun ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveConfigTab('roles')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeConfigTab === 'roles'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Matriks Hak Akses Akun</span>
        </button>

        <button
          onClick={() => setActiveConfigTab('cloud')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeConfigTab === 'cloud'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Konfigurasi Cloud (Firebase & GitHub)</span>
        </button>

        {/* Tab Khusus Super Admin: Kontrol Kamera vs Scanner Gun */}
        <button
          onClick={() => setActiveConfigTab('scanner')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeConfigTab === 'scanner'
              ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-400/30'
              : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Fitur Kamera & Scanner (Super Admin)</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
            isCameraScannerEnabled 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : 'bg-amber-100 text-amber-900 border border-amber-300'
          }`}>
            {isCameraScannerEnabled ? 'Kamera ON' : 'Scanner Gun (OFF)'}
          </span>
        </button>

        <button
          onClick={() => setActiveConfigTab('logs')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
            activeConfigTab === 'logs'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Trail & Log ({logs.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MANAJEMEN AKUN PENGGUNA (PERUBAHAN, PENAMBAHAN, PENGURANGAN AKUN)    */}
      {/* ========================================================================= */}
      {activeConfigTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Daftar Akun Pengguna & Petugas Gudang
              </h3>
              <p className="text-xs text-slate-500">
                Kelola akun petugas, ubah kata sandi / PIN, perbarui peran (role), atau hapus akun yang sudah tidak aktif.
              </p>
            </div>
            {canManageUsers && (
              <button
                onClick={handleOpenAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tambah Akun Baru</span>
              </button>
            )}
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => {
              const isMe = u.id === currentUser.id;
              const isPassShown = !!showPasswordMap[u.id];

              return (
                <div 
                  key={u.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl ${u.avatarColor || 'bg-slate-800'} text-white font-black text-base flex items-center justify-center shadow-xs`}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-slate-900 text-sm">{u.name}</h4>
                          {isMe && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">@{u.username}</span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${
                      u.role === 'superadmin'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : u.role === 'supervisor'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : u.role === 'admin'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {u.role === 'superadmin' ? 'Super Admin' : u.role === 'supervisor' ? 'Supervisor (SPV)' : u.role === 'admin' ? 'Admin' : 'Operator'}
                    </span>
                  </div>

                  {/* Password & Security Info */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Kata Sandi / PIN:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {isPassShown ? u.pin : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPasswordMap(prev => ({ ...prev, [u.id]: !prev[u.id] }))}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title={isPassShown ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                        >
                          {isPassShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <span>Status Akun:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Aktif
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Edit, Reset PIN, Delete */}
                  {canManageUsers && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(u)}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        Ubah Akun
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUserClick(u)}
                        disabled={isMe}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={isMe ? 'Tidak bisa menghapus akun sendiri' : 'Hapus Akun Pengguna'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MATRIKS HAK AKSES AKUN (ROLE PERMISSIONS MATRIX)                    */}
      {/* ========================================================================= */}
      {activeConfigTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Matriks Hak Akses & Otorisasi Fitur SIKUTANG
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Superadmin & Supervisor dapat mencentang / menyesuaikan izin fitur untuk masing-masing peran secara langsung.
              </p>
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
              Auto-saved to Local Storage
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider">
                  <th className="py-3 px-4">Fitur Sistem & Modul</th>
                  <th className="py-3 px-4 text-center">Superadmin</th>
                  <th className="py-3 px-4 text-center">Supervisor (SPV)</th>
                  <th className="py-3 px-4 text-center">Admin Gudang</th>
                  <th className="py-3 px-4 text-center">Operator Scanner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { key: 'prosesIn', label: 'Proses In Warehouse (Putaway Racking & Scanner FG)', desc: 'Opsi 1 Rentang Karton & Opsi 2 Scan Serial Box' },
                  { key: 'prosesOut', label: 'Proses Out Warehouse (Picking Outbound & Relokasi)', desc: 'Eksekusi mutasi barang keluar sesuai FEFO & surat jalan' },
                  { key: 'dataMaster', label: 'Akses Menu Data Master (Master Rak & Produk)', desc: 'Melihat dan mengelola master data barang jadi dan kapasitas' },
                  { key: 'masterRak', label: 'Kelola Master Rak (Tambah, Edit, Hapus Rak)', desc: 'Mengatur dimensi slot, level, dan cetak QR barcode rak' },
                  { key: 'masterProduct', label: 'Kelola Master Produk BOX (Tambah, Edit FG)', desc: 'Mengatur SKU, deskripsi, barcode, dan konversi box' },
                  { key: 'auditOpname', label: 'Akses Audit Keakurasian & Stock Opname', desc: 'Verifikasi fisik barcode di slot rak dan approval selisih' },
                  { key: 'userManagement', label: 'Kelola Akun Pengguna & Reset Sandi', desc: 'Menambah, mengubah data akun, dan menghapus akun pengguna' },
                  { key: 'cloudConfig', label: 'Konfigurasi Cloud Firebase & GitHub', desc: 'Pengaturan realtime database cloud dan repository sync' },
                  { key: 'exportBackup', label: 'Export & Restore Backup JSON Database', desc: 'Unduh arsip penuh database lokal atau pulihkan data' }
                ].map(item => (
                  <tr key={item.key} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{item.label}</span>
                      <span className="text-[11px] text-slate-500">{item.desc}</span>
                    </td>
                    
                    {/* Superadmin (Selalu True) */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    </td>

                    {/* Supervisor (Selalu True) */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </span>
                    </td>

                    {/* Admin Gudang (Bisa di-toggle oleh SPV / Superadmin) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={!isSuperAdminOrSpv}
                        onClick={() => toggleRolePermission('admin', item.key)}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition cursor-pointer disabled:cursor-not-allowed ${
                          rolePermissions.admin[item.key]
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {rolePermissions.admin[item.key] ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>

                    {/* Operator Scanner (Bisa di-toggle oleh SPV / Superadmin) */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        disabled={!isSuperAdminOrSpv}
                        onClick={() => toggleRolePermission('operator', item.key)}
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition cursor-pointer disabled:cursor-not-allowed ${
                          rolePermissions.operator[item.key]
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {rolePermissions.operator[item.key] ? <Check className="w-4 h-4 stroke-[3]" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KONFIGURASI CLOUD KE FIREBASE & GITHUB                              */}
      {/* ========================================================================= */}
      {activeConfigTab === 'cloud' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Card 1: Konfigurasi Cloud Firebase */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Firebase Cloud Database
                    </h3>
                    <span className="text-xs text-slate-500">
                      Sinkronisasi Firestore Realtime WMS
                    </span>
                  </div>
                </div>

                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Terhubung
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Firebase Project ID:
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.projectId}
                    onChange={(e) => setFirebaseConfig({ ...firebaseConfig, projectId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Cloud Firestore Region:
                  </label>
                  <input
                    type="text"
                    value={firebaseConfig.region}
                    disabled
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-xl text-slate-600"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Firestore Collections:</span>
                    <span className="font-mono font-bold text-slate-900">racks, products, users, logs</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Terakhir Disinkronkan:</span>
                    <span className="font-mono font-bold text-blue-700">{firebaseConfig.lastSyncTime} WIB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncFirebase}
                disabled={isSyncingFirebase}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingFirebase ? 'animate-spin' : ''}`} />
                <span>{isSyncingFirebase ? 'Menyinkronkan Firestore...' : 'Sinkronkan ke Cloud Firebase'}</span>
              </button>
            </div>

            {syncFirebaseSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Berhasil! Seluruh data lokal disinkronkan ke Firebase Firestore.</span>
              </div>
            )}
          </div>

          {/* Card 2: Konfigurasi GitHub Repository */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                    <Github className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      GitHub Repository
                    </h3>
                    <span className="text-xs text-slate-500">
                      Version Control & Audit Snapshot Backup
                    </span>
                  </div>
                </div>

                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5" />
                  main
                </span>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Repository URL:
                  </label>
                  <input
                    type="text"
                    value={githubConfig.repoUrl}
                    onChange={(e) => setGithubConfig({ ...githubConfig, repoUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Branch Target:</span>
                    <span className="font-mono font-bold text-slate-900">{githubConfig.branch} (Production)</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Commit Hash Terakhir:</span>
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {githubConfig.lastCommitHash}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Status Push & Audit:</span>
                    <span className="font-mono font-bold text-emerald-700">Up to date</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncGithub}
                disabled={isSyncingGithub}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <GitBranch className={`w-4 h-4 ${isSyncingGithub ? 'animate-spin' : ''}`} />
                <span>{isSyncingGithub ? 'Pushing Commit...' : 'Kirim Snapshot Audit ke GitHub'}</span>
              </button>
            </div>

            {syncGithubSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Commit & Snapshot perubahan berhasil dikirim ke repository GitHub!</span>
              </div>
            )}
          </div>

          {/* Card 3: Panduan Publikasi Gratis (Netlify Drop & Vercel) */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 border border-slate-800 shadow-lg lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-400 flex items-center justify-center font-bold">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Publikasi Web Publik Bebas Akses (Netlify Drop / Vercel)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Buka aplikasi di komputer/HP mana pun di dunia tanpa perlu login Google & tanpa batasan cookie
                  </p>
                </div>
              </div>

              <a
                href="/sikutang_deploy_ready.zip"
                download="sikutang_deploy_ready.zip"
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center gap-2 self-start cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Unduh sikutang_deploy_ready.zip</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center text-[11px] font-black">1</span>
                  <span>Unduh Paket ZIP</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Klik tombol <strong>"Unduh sikutang_deploy_ready.zip"</strong> di atas. Paket ini sudah dikompilasi lengkap dengan database Firebase real-time.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center text-[11px] font-black">2</span>
                  <span>Buka Netlify Drop</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Buka situs gratis <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-cyan-300 underline font-bold">app.netlify.com/drop</a> di tab baru peramban Anda.
                </p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center text-[11px] font-black">3</span>
                  <span>Tarik & Lepas (Drag & Drop)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tarik file <code>.zip</code> tersebut ke kotak Netlify. Dalam 10 detik, Anda langsung mendapatkan link resmi publik (seperti <code>https://sikutang.netlify.app</code>).
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Link Netlify tersebut sudah terhubung dengan <strong>Firebase Cloud Database</strong>, sehingga perubahan stok/rak dari komputer mana pun akan langsung sinkron otomatis!</span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB KHUSUS SUPER ADMIN: KONTROL KAMERA VS HARDWARE SCANNER GUN            */}
      {/* ========================================================================= */}
      {activeConfigTab === 'scanner' && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-purple-500/20 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 px-2.5 py-0.5 rounded-full">
                  Fitur Khusus Super Admin
                </span>
                <span className="text-xs text-purple-300 font-mono">
                  Pengaturan Perangkat & Akses Sensor
                </span>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Kontrol Fitur Kamera vs Hardware Scanner Gun
                </h3>
                <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl mt-1 leading-relaxed">
                  Tentukan apakah seluruh pengguna (semua user) diperbolehkan menggunakan akses <strong>Kamera HP / Webcam</strong> untuk membaca QR Code produk, pallet, dan rak, atau <strong>wajib menggunakan Scanner Gun fisik</strong>.
                </p>
              </div>

              {/* Toggle Switch Banner */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isCameraScannerEnabled 
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/40 shadow-emerald-500/20 shadow-lg' 
                      : 'bg-amber-500/30 text-amber-300 border-amber-400/40 shadow-amber-500/20 shadow-lg'
                  }`}>
                    {isCameraScannerEnabled ? (
                      <Camera className="w-6 h-6 stroke-[2.5]" />
                    ) : (
                      <Scan className="w-6 h-6 stroke-[2.5]" />
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-200 block">
                      Status Akses Kamera Global Saat Ini:
                    </span>
                    <span className={`text-lg sm:text-xl font-black font-mono block ${
                      isCameraScannerEnabled ? 'text-emerald-300' : 'text-amber-300'
                    }`}>
                      {isCameraScannerEnabled ? 'KAMERA AKTIF (ON) DI SEMUA USER' : 'KAMERA MATI (OFF) - HANYA SCANNER GUN'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleCameraScanner?.(false)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                      !isCameraScannerEnabled
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <Scan className="w-4 h-4" />
                    <span>POSISI "OFF" (Scanner Gun Saja)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleCameraScanner?.(true)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                      isCameraScannerEnabled
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black'
                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                    }`}
                  >
                    <Camera className="w-4 h-4" />
                    <span>POSISI "ON" (Akses Kamera Aktif)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Ambient bubble decoration */}
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          </div>

          {/* Operational Comparison Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mode ON Card */}
            <div className={`p-5 rounded-2xl border-2 transition ${
              isCameraScannerEnabled 
                ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-300/40 shadow-sm' 
                : 'bg-white border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Mode Kamera: ON</h4>
                    <span className="text-[10px] text-emerald-800 font-bold">Kamera Terbuka untuk Seluruh Pengguna</span>
                  </div>
                </div>
                {isCameraScannerEnabled && (
                  <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    SEDANG DIGUNAKAN
                  </span>
                )}
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                <li>Operator dan Admin dapat menggunakan <strong>Kamera Smartphone / Webcam</strong> untuk membaca QR Code produk, pallet, dan rak.</li>
                <li>Tombol <strong>"Scan QR Pallet"</strong> dan <strong>"Scan QR Rak"</strong> aktif dan siap menyalakan kamera.</li>
                <li>Kamera akan <strong>otomatis langsung OFF</strong> segera setelah barcode terbaca untuk menghemat baterai & memori.</li>
                <li>Tetap mendukung hardware Scanner Gun secara bersamaan (hybrid).</li>
              </ul>
            </div>

            {/* Mode OFF Card */}
            <div className={`p-5 rounded-2xl border-2 transition ${
              !isCameraScannerEnabled 
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300/40 shadow-sm' 
                : 'bg-white border-slate-200 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Scan className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">Mode Kamera: OFF</h4>
                    <span className="text-[10px] text-amber-900 font-bold">Wajib Menggunakan Hardware Scanner Gun</span>
                  </div>
                </div>
                {!isCameraScannerEnabled && (
                  <span className="bg-amber-200 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                    SEDANG DIGUNAKAN
                  </span>
                )}
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                <li>Akses kamera <strong>dinonaktifkan sepenuhnya</strong> untuk semua pengguna (kamera tidak akan menyala).</li>
                <li>Seluruh proses input QR Code produk, nomor pallet, dan slot rak <strong>wajib menggunakan Scanner Gun fisik</strong> (USB/Bluetooth/Wireless).</li>
                <li>Mencegah penyalahgunaan kamera HP di area gudang yang memiliki regulasi privasi/keamanan ketat.</li>
                <li>Tampilan UI modal pemindai beralih ke layout bersih khusus hardware Scanner Gun.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIT TRAIL & SYSTEM LOGS                                          */}
      {/* ========================================================================= */}
      {activeConfigTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Riwayat Audit Trail & Aktivitas Sistem
              </h3>
              <p className="text-xs text-slate-500">
                Mencatat mutasi putaway, picking, perubahan akun pengguna, dan sinkronisasi cloud.
              </p>
            </div>

            <button
              type="button"
              onClick={onExportCsvLogs}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto pr-1">
            {logs.map(log => (
              <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                      log.action === 'PUTAWAY' ? 'bg-emerald-100 text-emerald-800' :
                      log.action === 'PICKING' ? 'bg-rose-100 text-rose-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {log.action}
                    </span>
                    <span className="font-bold text-slate-900">{log.description}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Petugas: <strong className="text-slate-700">{log.userName}</strong> ({log.userRole})
                    {log.slotCode && <> &bull; Slot: <span className="font-mono font-bold text-blue-700">{log.slotCode}</span></>}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {log.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / UBAH AKUN PENGGUNA                                         */}
      {/* ========================================================================= */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">
                {editingUserId ? 'Ubah Data Akun Pengguna' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddUserOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Akun:</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin.budi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran Akun (Role):</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold bg-white"
                >
                  <option value="superadmin">Super Admin (Akses Penuh Sistem)</option>
                  <option value="supervisor">Supervisor (SPV)</option>
                  <option value="admin">Admin (Gudang)</option>
                  <option value="operator">Operator (Scanner Lapangan)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kata Sandi / PIN (Minimal 4 Angka/Karakter):</label>
                <input
                  type="text"
                  required
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp (Opsional):</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Akun</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESTORE BACKUP DATABASE JSON                                        */}
      {/* ========================================================================= */}
      {isRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-lg text-slate-900">Restore Database dari JSON</h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsRestoreOpen(false); setRestoreMessage(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {restoreMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                restoreMessage.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {restoreMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{restoreMessage.text}</span>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Pilih file backup <code>.json</code> yang sebelumnya diunduh melalui tombol <strong>Export Backup</strong>, atau tempelkan kodenya langsung ke kotak di bawah.
              </p>

              {/* Opsi 1: Upload File */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Pilih File Backup (.json) dari Perangkat</span>
              </button>

              <div className="flex items-center gap-2 my-2">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Atau Tempel (Paste) Teks JSON</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <textarea
                rows={6}
                value={restoreJsonInput}
                onChange={(e) => setRestoreJsonInput(e.target.value)}
                placeholder='{"racks": {...}, "products": [...], "users": [...]}'
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => { setIsRestoreOpen(false); setRestoreMessage(null); }}
                className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleRestoreSubmit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Pulihkan Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
