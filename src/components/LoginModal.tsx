/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lock, LogIn, AlertCircle, ShieldCheck, X, Eye, EyeOff, UserCheck } from 'lucide-react';
import { UserAccount } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  users: UserAccount[];
  currentUser: UserAccount;
  onLoginSuccess: (user: UserAccount) => void;
  canCancel?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onLoginSuccess,
  canCancel = true
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id || users[0]?.id || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedUser = users.find(u => u.id === selectedUserId) || users[0];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedUser) {
      setErrorMsg('Pilih akun pengguna terlebih dahulu.');
      return;
    }

    if (!password.trim()) {
      setErrorMsg('Masukkan kata sandi / PIN akun.');
      return;
    }

    if (password.trim() !== selectedUser.pin) {
      setErrorMsg('Kata sandi / PIN salah! Jika lupa sandi, hubungi Supervisor atau Super Admin untuk reset.');
      return;
    }

    // Success
    setPassword('');
    setErrorMsg(null);
    onLoginSuccess(selectedUser);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget && canCancel && onClose) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl w-[94vw] max-w-md shadow-2xl border border-slate-200 flex flex-col max-h-[90dvh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
                Login Petugas Gudang
              </h3>
              <p className="text-[11px] text-indigo-200">
                Otorisasi Akses Sistem SIKUTANG
              </p>
            </div>
          </div>
          {canCancel && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs shadow-sm transition cursor-pointer flex items-center gap-1 shrink-0"
              title="Tutup Login"
            >
              <X className="w-4 h-4 stroke-[3]" />
              <span>TUTUP</span>
            </button>
          )}
        </div>

        {/* Body Form */}
        <form onSubmit={handleLogin} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Kata sandi dirahasiakan demi keamanan operasional. Jika lupa kata sandi, hubungi <strong>Supervisor (SPV) atau Super Admin</strong> untuk reset.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Account Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Akun Petugas:
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
              {users.map(u => {
                const isSelected = u.id === selectedUserId;
                const isSpv = u.role === 'superadmin' || u.role === 'supervisor';
                const isAdmin = u.role === 'admin';
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setErrorMsg(null);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${u.avatarColor} text-white font-black text-xs flex items-center justify-center`}>
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 block leading-tight">
                          {u.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          @{u.username}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        u.role === 'superadmin'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : u.role === 'supervisor'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isAdmin
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          : 'bg-teal-100 text-teal-800 border border-teal-200'
                      }`}>
                        {u.role === 'superadmin' ? 'Super Admin' : u.role === 'supervisor' ? 'Supervisor (SPV)' : isAdmin ? 'Admin' : 'Operator'}
                      </span>
                      {isSelected && <UserCheck className="w-4 h-4 text-indigo-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Kata Sandi / PIN Akun:
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi / PIN akun..."
                autoFocus
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Verifikasi & Masuk Sesi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
