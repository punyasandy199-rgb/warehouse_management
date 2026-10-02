/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserAccount } from '../types';
import { CartoonWarehouseLogo } from './CartoonWarehouseLogo';
import { 
  LogIn, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  HelpCircle, 
  X, 
  Lock, 
  User, 
  KeyRound,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface CompactTopLoginProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  cloudSyncStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  onForceSyncCloud?: () => Promise<boolean>;
  onPullFromCloud?: () => Promise<boolean>;
  autoLogoutNotice?: string | null;
  onDismissNotice?: () => void;
}

export const CompactTopLogin: React.FC<CompactTopLoginProps> = ({
  users,
  onLoginSuccess,
  cloudSyncStatus = 'connected',
  onForceSyncCloud,
  onPullFromCloud,
  autoLogoutNotice,
  onDismissNotice
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncActionLoading, setSyncActionLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('Masukkan username akun.');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('Masukkan password / PIN.');
      return;
    }

    const foundUser = users.find(
      u => u.username.toLowerCase() === cleanUsername || 
           u.id.toLowerCase() === cleanUsername ||
           u.name.toLowerCase() === cleanUsername
    );

    if (!foundUser) {
      setErrorMsg(`Username "${username}" tidak terdaftar.`);
      return;
    }

    if (foundUser.pin !== cleanPassword) {
      setErrorMsg('Password / PIN salah! Silakan periksa kembali atau hubungi Supervisor (SPV).');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(foundUser);
    }, 200);
  };

  const handlePullData = async () => {
    if (!onPullFromCloud) return;
    setSyncActionLoading(true);
    setSyncFeedback(null);
    try {
      const ok = await onPullFromCloud();
      setSyncFeedback(ok ? '✅ Berhasil memuat data aktual terbaru dari Cloud Firestore!' : '⚠️ Gagal memuat data dari Cloud.');
    } catch {
      setSyncFeedback('❌ Terjadi kesalahan saat menarik data dari Cloud.');
    } finally {
      setSyncActionLoading(false);
    }
  };

  const handlePushData = async () => {
    if (!onForceSyncCloud) return;
    setSyncActionLoading(true);
    setSyncFeedback(null);
    try {
      const ok = await onForceSyncCloud();
      setSyncFeedback(ok ? '✅ Seluruh data berhasil dikirim ke Cloud Firestore! HP & PC kini sinkron.' : '⚠️ Gagal mengirim data.');
    } catch {
      setSyncFeedback('❌ Terjadi kesalahan saat sinkronisasi ke Cloud.');
    } finally {
      setSyncActionLoading(false);
    }
  };

  return (
    <div className="bg-white border-b-2 border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          
          {/* Left: Branding & Database Status Badge */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CartoonWarehouseLogo size={38} variant="compact" />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    SIKUTANG
                  </h1>
                  <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    WMS FGW
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Sistem Keakuratan Monitoring Barang Jadi
                </p>
              </div>
            </div>

            {/* Tombol Status Database Cloud & Bantuan Sinkronisasi Antar Perangkat */}
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 active:bg-emerald-200 shrink-0"
              title="Klik untuk panduan dan status sinkronisasi database HP & Komputer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden xs:inline">Status DB:</span>
              <span>{cloudSyncStatus === 'connected' ? 'Cloud Aktif' : 'Sinkronisasi'}</span>
            </button>
          </div>

          {/* Right: Small Compact Login Menu (Menu Login Kecil Bagian Depan Atas) */}
          <form 
            onSubmit={handleLogin}
            className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs w-full lg:w-auto"
          >
            {/* Username Input - Bersih / Kosong saat awal */}
            <div className="relative flex-1 min-w-[120px] sm:min-w-[140px]">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={username}
                autoComplete="off"
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Username"
                className="w-full pl-8 pr-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            {/* Password Input - Bersih / Kosong saat awal */}
            <div className="relative flex-1 min-w-[110px] sm:min-w-[130px]">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                autoComplete="new-password"
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Password"
                className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Masuk...' : 'Login'}</span>
            </button>

            {/* Lupa Password Link */}
            <button
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline px-1 py-1 cursor-pointer shrink-0"
            >
              Lupa password?
            </button>
          </form>

        </div>

        {/* Auto Logout Notification if inactive 5 minutes */}
        {autoLogoutNotice && (
          <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{autoLogoutNotice}</span>
            </div>
            {onDismissNotice && (
              <button 
                type="button" 
                onClick={onDismissNotice}
                className="p-1 rounded-md text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition cursor-pointer shrink-0"
                title="Tutup pemberitahuan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Error notification if any */}
        {errorMsg && (
          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

      </div>

      {/* MODAL 1: BANTUAN LUPA PASSWORD (RESPONSIF HP, MUDAH DITUTUP, PASSWORD TIDAK DITAMPILKAN) */}
      {isForgotModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsForgotModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white border-2 border-slate-900 rounded-2xl w-[94vw] max-w-md shadow-2xl flex flex-col max-h-[85dvh] overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header Sticky dengan Tombol TUTUP Besar & Jelas di HP */}
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                    Bantuan Akun & Lupa Password
                  </h3>
                  <span className="text-[10px] text-slate-300 font-medium">
                    Sistem WMS SIKUTANG
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Tutup Jendela Bantuan"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>TUTUP</span>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-3.5 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Petunjuk SOP & Larangan Tampil Sandi */}
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs space-y-1.5">
                <div className="font-bold text-amber-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Kata Sandi Dirahasiakan (Keamanan Sistem):</span>
                </div>
                <p className="text-amber-900 text-[11px] leading-relaxed">
                  Sesuai standar operasional gudang, <strong>kata sandi akun tidak ditampilkan di layar</strong>. 
                  Jika Anda lupa kata sandi Anda, silakan <strong>hubungi Supervisor (SPV) atau Super Admin yang ada</strong> di area gudang untuk mereset kata sandi Anda.
                </p>
              </div>

              {/* Daftar Username Terdaftar (Hanya Username & Nama, Tanpa Password) */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Daftar Username Pengguna Terdaftar:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {users.map(u => (
                    <div 
                      key={u.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/70 transition flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${u.avatarColor} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs`}>
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block truncate">
                            {u.name}
                          </span>
                          <span className="font-mono text-[11px] text-blue-700 font-bold block truncate">
                            @{u.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          u.role === 'superadmin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'supervisor'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'admin'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}>
                          {u.role === 'superadmin' ? 'Super Admin' : u.role === 'supervisor' ? 'SPV' : u.role === 'admin' ? 'Admin' : 'Operator'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUsername(u.username);
                            setPassword(''); // Sandi TETAP KOSONG
                            setIsForgotModalOpen(false);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-[11px] font-bold shadow-2xs transition cursor-pointer"
                        >
                          Pilih Akun
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Bottom Close Button - Mudah Diklik di Layar HP */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Tutup Jendela & Kembali ke Form Login</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: PANDUAN & STATUS SINKRONISASI DATABASE ANTAR PERANGKAT (HP & KOMPUTER) */}
      {isSyncModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSyncModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white border-2 border-slate-900 rounded-2xl w-[94vw] max-w-lg shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header Sticky */}
            <div className="p-3.5 sm:p-4 bg-emerald-900 text-white flex items-center justify-between shrink-0 border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                    Sinkronisasi Database HP & Komputer
                  </h3>
                  <span className="text-[10px] text-emerald-200 font-medium">
                    Cloud Firestore Real-Time Database SIKUTANG
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>TUTUP</span>
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs text-slate-700">
              
              {/* Status Box */}
              <div className="p-3.5 rounded-xl border bg-emerald-50 border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-950">Status Cloud Firestore:</span>
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                    TERHUBUNG & AKTIF
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Database aktual menggunakan Google Cloud Firestore. Setiap perubahan slot, putaway, picking, dan audit disinkronkan secara real-time antar browser.
                </p>
              </div>

              {/* Solusi Masalah HP tidak sinkron dengan PC */}
              <div className="p-3.5 rounded-xl border bg-blue-50 border-blue-200 space-y-2">
                <h4 className="font-black text-blue-950 text-xs">
                  ❓ Mengapa Perubahan di HP Tidak Terjadi pada Komputer?
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-blue-900 leading-relaxed pl-1">
                  <li>
                    <strong>Membuka File Unduhan Langsung di HP (file:///):</strong> Jika HP membuka file <code className="bg-white px-1 rounded font-bold">.html</code> unduhan langsung dari memori HP, browser Android memblokir koneksi internet Cloud Database karena aturan keamanan internal browser.
                  </li>
                  <li>
                    <strong>Solusi Terbaik:</strong> Buka aplikasi web di HP melalui <strong>alamat web browser</strong> (alamat URL server atau IP jaringan lokal yang sama, misal <code className="bg-white px-1 rounded font-bold">http://[IP-Komputer]:3000</code>).
                  </li>
                  <li>
                    <strong>Sinkronisasi 2 Arah:</strong> Gunakan tombol di bawah ini untuk saling menarik (pull) atau mengirim (push) data aktual.
                  </li>
                </ol>
              </div>

              {/* Action Buttons: Pull & Push */}
              <div className="space-y-2 pt-1">
                <span className="block font-bold text-slate-900 text-xs">Aksi Sinkronisasi Manual:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePullData}
                    disabled={syncActionLoading || !onPullFromCloud}
                    className="p-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <span>📥 Tarik Data dari Cloud</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePushData}
                    disabled={syncActionLoading || !onForceSyncCloud}
                    className="p-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <span>📤 Kirim Data ke Cloud</span>
                  </button>
                </div>
              </div>

              {syncFeedback && (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 font-bold text-slate-900 text-xs text-center animate-in fade-in">
                  {syncFeedback}
                </div>
              )}

            </div>

            {/* Sticky Bottom Close */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Tutup Jendela Panduan</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
