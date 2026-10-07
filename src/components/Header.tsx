/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  ChevronDown, 
  Radio, 
  Boxes, 
  Wifi, 
  Lock,
  Layers,
  Sparkles,
  KeyRound,
  LogOut,
  UserCheck,
  Home,
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  Settings,
  ClipboardCheck,
  BookOpen,
  GitFork,
  Workflow,
  RotateCcw,
  Monitor,
  Smartphone,
  FileCode,
  Cloud,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  X,
  HelpCircle,
  RefreshCw,
  Bell,
  Camera,
  Scan,
  FileSpreadsheet
} from 'lucide-react';
import { UserAccount, UserRole, InboundNotification } from '../types';
import { CartoonWarehouseLogo } from './CartoonWarehouseLogo';

export type MainModule = 'main-hub' | 'dashboard' | 'in-warehouse' | 'out-warehouse' | 'stock-opname' | 'data-master' | 'configuration-system' | 'sop-flowchart';

interface HeaderProps {
  currentUser: UserAccount;
  users: UserAccount[];
  onSwitchUser: (user: UserAccount) => void;
  onOpenScanner?: () => void;
  onOpenRackQrPrint?: () => void;
  onOpenLoginModal?: () => void;
  onOpenChangePasswordModal?: () => void;
  onOpenClearDataModal?: () => void;
  onLogout: () => void;
  activeMainModule: MainModule;
  onSelectMainModule: (module: MainModule) => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  deviceViewMode?: 'web' | 'android';
  onToggleDeviceViewMode?: (mode: 'web' | 'android') => void;
  cloudSyncStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  onForceSyncCloud?: () => Promise<boolean>;
  onPullFromCloud?: () => Promise<boolean>;
  inboundNotifications?: InboundNotification[];
  unreadInboundCount?: number;
  onOpenInboundSummary?: (notif: InboundNotification) => void;
  onMarkAllInboundAsRead?: () => void;
  isCameraScannerEnabled?: boolean;
  onToggleCameraScanner?: (enabled: boolean) => void;
  onOpenSpreadsheetModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  users,
  onSwitchUser,
  onOpenScanner,
  onOpenRackQrPrint,
  onOpenLoginModal,
  onOpenChangePasswordModal,
  onOpenClearDataModal,
  onLogout,
  activeMainModule,
  onSelectMainModule,
  activeTab,
  onSelectTab,
  deviceViewMode = 'web',
  onToggleDeviceViewMode,
  cloudSyncStatus = 'connected',
  onForceSyncCloud,
  onPullFromCloud,
  inboundNotifications = [],
  unreadInboundCount = 0,
  onOpenInboundSummary,
  onMarkAllInboundAsRead,
  isCameraScannerEnabled = true,
  onToggleCameraScanner,
  onOpenSpreadsheetModal
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [syncActionLoading, setSyncActionLoading] = useState(false);
  const [isDownloadingHtml, setIsDownloadingHtml] = useState(false);

  const handleHeaderPull = async () => {
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

  const handleHeaderPush = async () => {
    if (!onForceSyncCloud) return;
    setSyncActionLoading(true);
    setSyncFeedback(null);
    try {
      const ok = await onForceSyncCloud();
      setSyncFeedback(ok ? '✅ Seluruh data di layar ini berhasil dikirim ke Cloud Firestore! HP & PC kini 100% selaras.' : '⚠️ Gagal mengirim data.');
    } catch {
      setSyncFeedback('❌ Terjadi kesalahan saat sinkronisasi ke Cloud.');
    } finally {
      setSyncActionLoading(false);
    }
  };

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
      setIsUserMenuOpen(false);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunduh file HTML secara otomatis. Gunakan opsi Export ZIP di kanan atas.');
    } finally {
      setIsDownloadingHtml(false);
    }
  };

  const getModuleBadgeInfo = (module: MainModule) => {
    switch (module) {
      case 'dashboard':
        return {
          label: 'DASHBOARD',
          badgeClass: 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-500/50',
          dotColor: 'bg-blue-600',
          pingColor: 'bg-blue-400'
        };
      case 'in-warehouse':
        return {
          label: 'PROSES IN',
          badgeClass: 'bg-emerald-600 text-white shadow-xs ring-1 ring-emerald-500/50',
          dotColor: 'bg-emerald-600',
          pingColor: 'bg-emerald-400'
        };
      case 'out-warehouse':
        return {
          label: 'PROSES OUT',
          badgeClass: 'bg-rose-600 text-white shadow-xs ring-1 ring-rose-500/50',
          dotColor: 'bg-rose-600',
          pingColor: 'bg-rose-400'
        };
      case 'stock-opname':
        return {
          label: 'STOCK OPNAME',
          badgeClass: 'bg-amber-600 text-white shadow-xs ring-1 ring-amber-500/50',
          dotColor: 'bg-amber-600',
          pingColor: 'bg-amber-400'
        };
      case 'data-master':
        return {
          label: 'DATA MASTER',
          badgeClass: 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-500/50',
          dotColor: 'bg-indigo-600',
          pingColor: 'bg-indigo-400'
        };
      case 'configuration-system':
        return {
          label: 'CONFIGURATION',
          badgeClass: 'bg-slate-900 text-white shadow-xs ring-1 ring-slate-700/50',
          dotColor: 'bg-slate-900',
          pingColor: 'bg-slate-500'
        };
      case 'sop-flowchart':
        return {
          label: 'SOP & ALUR PROSES',
          badgeClass: 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-500/50',
          dotColor: 'bg-blue-600',
          pingColor: 'bg-blue-400'
        };
      case 'main-hub':
      default:
        return {
          label: 'WMS FGW',
          badgeClass: 'bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300/60',
          dotColor: 'bg-cyan-500',
          pingColor: 'bg-cyan-400'
        };
    }
  };

  const activeBadge = getModuleBadgeInfo(activeMainModule);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo & Name - Klik untuk Akses Dashboard Gudang */}
          <div 
            onClick={() => onSelectMainModule('dashboard')}
            className="flex items-center gap-3.5 cursor-pointer hover:opacity-95 transition group relative"
            title="SIKUTANG WMS - Klik logo ini untuk membuka Dashboard Monitoring Gudang"
          >
            <div className="relative">
              <CartoonWarehouseLogo size={52} variant="compact" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5" title={`Modul Aktif: ${activeBadge.label}`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeBadge.pingColor} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${activeBadge.dotColor} border-2 border-white`}></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 font-sans group-hover:text-blue-600 transition">
                  SIKUTANG
                </h1>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider transition-all duration-200 ${activeBadge.badgeClass}`}>
                  {activeBadge.label}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-600 hidden sm:flex items-center gap-1.5">
                <span>Sistem Keakuratan Monitoring Barang Jadi</span>
              </p>
            </div>
          </div>

          {/* Status & Current User Selector */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Real-time Status Badge */}
            <button 
              type="button"
              onClick={() => {
                setSyncFeedback(null);
                setIsSyncModalOpen(true);
              }}
              title="Klik untuk membuka Kontrol & Status Sinkronisasi Cloud Firestore"
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer hover:shadow-xs ${
                cloudSyncStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-blue-50 text-blue-800 border border-blue-200 animate-pulse'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                cloudSyncStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : cloudSyncStatus === 'syncing'
                  ? 'bg-blue-500 animate-spin'
                  : 'bg-amber-500'
              }`}></span>
              <span>
                {cloudSyncStatus === 'connected'
                  ? 'Cloud Real-Time Aktif'
                  : cloudSyncStatus === 'syncing'
                  ? 'Sinkronisasi Cloud...'
                  : 'Lokal / Offline (Klik Sinkron)'}
              </span>
              <span className="text-slate-400 hidden sm:inline">&bull;</span>
              <span className="font-mono text-[11px] hidden sm:inline">{timeStr}</span>
            </button>

            {/* Integrasi Google Spreadsheet & Tombol Segarkan */}
            {onOpenSpreadsheetModal && (
              <button
                type="button"
                onClick={onOpenSpreadsheetModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition cursor-pointer shadow-2xs"
                title="Buka Pusat Integrasi & Segarkan Data ke Google Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Spreadsheet</span>
              </button>
            )}

            {/* Platform View Selector: Web Desktop vs Android Handheld - Logo Saja (Simple Icon Only) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => onToggleDeviceViewMode?.('web')}
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                  deviceViewMode === 'web'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Web Desktop (Layar Penuh)"
                aria-label="Web Desktop"
              >
                <Monitor className="w-4 h-4 text-blue-600" />
              </button>
              <button
                type="button"
                onClick={() => onToggleDeviceViewMode?.('android')}
                className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                  deviceViewMode === 'android'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tampilan Android Smartphone / Handheld Scanner"
                aria-label="Android Smartphone"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action: Reset Data Simulasi (Hanya untuk Akun Superadmin) */}
            {onOpenClearDataModal && currentUser.role === 'superadmin' && (
              <button
                onClick={onOpenClearDataModal}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-black transition cursor-pointer shadow-xs"
                title="Kosongkan stok IC rak untuk simulasi baru (Master data rak tetap utuh)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden md:inline">Reset / Kosongkan Simulasi</span>
                <span className="md:hidden hidden sm:inline">Reset IC</span>
              </button>
            )}

            {/* Fitur Khusus Super Admin: ON / OFF Fitur Kamera Digunakan di Semua User */}
            {currentUser.role === 'superadmin' && onToggleCameraScanner && (
              <button
                type="button"
                onClick={() => onToggleCameraScanner(!isCameraScannerEnabled)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs border ${
                  isCameraScannerEnabled
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                }`}
                title={
                  isCameraScannerEnabled
                    ? 'Kamera ON untuk Semua User. Klik untuk beralih ke Mode Scanner Gun Fisik (Kamera OFF)'
                    : 'Kamera OFF (Mode Scanner Gun Aktif). Klik untuk mengaktifkan Kamera di semua user'
                }
              >
                {isCameraScannerEnabled ? (
                  <>
                    <Camera className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="hidden md:inline">Kamera: ON</span>
                    <span className="md:hidden hidden sm:inline">Kamera ON</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="hidden md:inline">Kamera: OFF (Scanner)</span>
                    <span className="md:hidden hidden sm:inline">Scanner Gun</span>
                  </>
                )}
              </button>
            )}

            {/* Notification Bell for Inbound 1 Pallet Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsNotifDropdownOpen(!isNotifDropdownOpen);
                  setIsUserMenuOpen(false);
                }}
                className={`p-2 rounded-xl transition cursor-pointer relative border flex items-center justify-center ${
                  unreadInboundCount > 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                title={`Notifikasi Inbound Pallet (${unreadInboundCount} belum dibaca)`}
                aria-label="Notifikasi Inbound"
              >
                <Bell className="w-4 h-4" />
                {unreadInboundCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white font-black text-[10px] rounded-full flex items-center justify-center px-1 shadow animate-pulse">
                    {unreadInboundCount > 99 ? '99+' : unreadInboundCount}
                  </span>
                )}
              </button>

              {/* Inbound Notifications Dropdown Panel */}
              {isNotifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-tight">
                          Notifikasi Inbound Pallet
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-700 block">
                          Real-Time Broadcast
                        </span>
                      </div>
                    </div>
                    {onMarkAllInboundAsRead && unreadInboundCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllInboundAsRead}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md"
                      >
                        Tandai Dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                    {inboundNotifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Belum ada notifikasi inbound pallet masuk.
                      </div>
                    ) : (
                      inboundNotifications.slice(0, 15).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            setIsNotifDropdownOpen(false);
                            onOpenInboundSummary?.(notif);
                          }}
                          className={`p-2.5 rounded-xl transition cursor-pointer text-xs space-y-1 border ${
                            !notif.read
                              ? 'bg-emerald-50/80 hover:bg-emerald-100/80 border-emerald-300'
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                              {notif.palletNumber}
                            </span>
                            <span className="font-mono font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">
                              Slot {notif.slotCode}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(notif.createdAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-0.5">
                            <span className="font-bold text-slate-800 truncate max-w-[180px]">
                              {notif.itemName}
                            </span>
                            <span className="font-mono font-black text-amber-900 bg-amber-100/70 px-1.5 py-0.2 rounded">
                              {notif.quantityBox} BOX
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-200/50 mt-1">
                            <span>PIC: <strong>{notif.operatorName}</strong></span>
                            <span className="text-cyan-700 font-bold hover:underline">
                              Lihat Summary &rarr;
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Role Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition cursor-pointer border border-slate-200"
              >
                <div className={`w-8 h-8 rounded-lg ${currentUser.avatarColor} text-white font-black text-xs flex items-center justify-center`}>
                  {currentUser.name.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <span className="block text-xs font-bold text-slate-900 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-cyan-700 font-mono">
                    {currentUser.role}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>

              {/* User Switch Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-xl mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl ${currentUser.avatarColor} text-white font-black text-sm flex items-center justify-center shrink-0`}>
                        {currentUser.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-xs font-bold text-slate-900 truncate">
                          {currentUser.name}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 block truncate">
                          @{currentUser.username}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                        {currentUser.role === 'superadmin'
                          ? 'Super Admin'
                          : currentUser.role === 'supervisor'
                          ? 'Supervisor (SPV)'
                          : currentUser.role === 'admin'
                          ? 'Admin Gudang'
                          : 'Operator Scanner'}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Aktif
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Keamanan Sesi:</span>
                      <span className="text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Auto-Logout 5m idle</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {/* Buka Dashboard Monitoring */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSelectMainModule('dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-blue-600" />
                      <span>Buka Dashboard Gudang</span>
                    </button>

                    {/* Reset Data Simulasi (Hanya Superadmin) */}
                    {onOpenClearDataModal && currentUser.role === 'superadmin' && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenClearDataModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        <span>Reset Data Simulasi (Superadmin)</span>
                      </button>
                    )}

                    {/* Ubah Kata Sandi Saya */}
                    {onOpenChangePasswordModal && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onOpenChangePasswordModal();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 transition cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-cyan-600" />
                        <span>Ubah Kata Sandi Saya</span>
                      </button>
                    )}

                    {/* Unduh Versi HTML Standalone */}
                    <button
                      type="button"
                      onClick={handleDownloadStandaloneHtml}
                      disabled={isDownloadingHtml}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-blue-700 hover:bg-blue-50 transition cursor-pointer disabled:opacity-50"
                      title="Unduh 1 file HTML mandiri (bisa dibuka langsung di browser PC atau HP tanpa internet)"
                    >
                      <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{isDownloadingHtml ? 'Menyiapkan File HTML...' : 'Unduh Versi HTML (Offline)'}</span>
                    </button>

                    {/* Keluar Sesi / Logout */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-slate-600" />
                      <span>Keluar Akun (Logout)</span>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 px-3 py-1.5 mt-1">
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Sesuai SOP keamanan, pergantian petugas gudang wajib melalui verifikasi kata sandi (login ulang).
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* PILIHAN MENU UTAMA: DASHBOARD, PROSES IN, PROSES OUT, DATA MASTER,   */}
        {/* CONFIGURATION SYSTEM                                                */}
        {/* ==================================================================== */}
        {/* PILIHAN MENU: PROSES IN, PROSES OUT, STOCK OPNAME, DATA MASTER,      */}
        {/* CONFIGURATION SYSTEM, DAN SOP & ALUR PROSES                          */}
        {/* ==================================================================== */}
        <div className={`border-t border-slate-100 py-2 ${
          deviceViewMode === 'android'
            ? 'grid grid-cols-3 gap-1.5 w-full'
            : 'flex flex-wrap items-center justify-between gap-1.5 sm:gap-2'
        }`}>
          <div className={`${deviceViewMode === 'android' ? 'contents' : 'flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80'}`}>
            {/* Pilihan 0: Dashboard */}
            <button
              onClick={() => onSelectMainModule('dashboard')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainModule === 'dashboard' || activeMainModule === 'main-hub'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Dashboard Monitoring Kapasitas & Status Rak"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="truncate">Dashboard</span>
            </button>

            {/* Pilihan 1: Proses In */}
            <button
              onClick={() => onSelectMainModule('in-warehouse')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainModule === 'in-warehouse'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Proses In (Inbound Putaway)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeMainModule === 'in-warehouse' ? 'bg-emerald-600' : 'bg-slate-400'}`} />
              <span className="truncate">{deviceViewMode === 'android' ? 'Inbound' : 'Proses In'}</span>
            </button>

            {/* Pilihan 2: Proses Out */}
            <button
              onClick={() => onSelectMainModule('out-warehouse')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainModule === 'out-warehouse'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Proses Out (Outbound Picking)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeMainModule === 'out-warehouse' ? 'bg-rose-600' : 'bg-slate-400'}`} />
              <span className="truncate">{deviceViewMode === 'android' ? 'Outbound' : 'Proses Out'}</span>
            </button>

            {/* Pilihan 3: Stock Opname */}
            <button
              onClick={() => onSelectMainModule('stock-opname')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainModule === 'stock-opname'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Stock Opname (Audit Fisik)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeMainModule === 'stock-opname' ? 'bg-amber-600' : 'bg-slate-400'}`} />
              <span className="truncate">{deviceViewMode === 'android' ? 'Opname' : 'Stock Opname'}</span>
            </button>

            {/* Pilihan 4: Data Master */}
            <button
              onClick={() => onSelectMainModule('data-master')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainModule === 'data-master'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Data Master (Rak, Produk, Karyawan)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeMainModule === 'data-master' ? 'bg-indigo-600' : 'bg-slate-400'}`} />
              <span className="truncate">{deviceViewMode === 'android' ? 'Master' : 'Data Master'}</span>
            </button>

            {/* Pilihan 5: Configuration System */}
            <button
              onClick={() => onSelectMainModule('configuration-system')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainModule === 'configuration-system'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Configuration System (Pengaturan & Simulasi)"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeMainModule === 'configuration-system' ? 'bg-slate-800' : 'bg-slate-400'}`} />
              <span className="truncate">{deviceViewMode === 'android' ? 'Config' : 'Configuration'}</span>
            </button>

            {/* Pilihan 6: SOP & Alur Proses */}
            <button
              onClick={() => onSelectMainModule('sop-flowchart')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMainModule === 'sop-flowchart'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="SOP & Alur Proses Pergudangan"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeMainModule === 'sop-flowchart' ? 'bg-blue-600' : 'bg-slate-400'}`} />
              <span className="truncate">{deviceViewMode === 'android' ? 'SOP' : 'SOP & Alur'}</span>
            </button>
          </div>

          {/* Modul Aktif Status Badge (Desktop Only) */}
          {deviceViewMode !== 'android' && (
            <div className="hidden xl:flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-500">
                Modul Aktif:
              </span>
              <span className="text-xs font-black uppercase font-mono px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                {activeMainModule === 'in-warehouse' ? 'Proses In (Inbound)' :
                 activeMainModule === 'out-warehouse' ? 'Proses Out (Outbound)' :
                 activeMainModule === 'stock-opname' ? 'Stock Opname (Audit)' :
                 activeMainModule === 'data-master' ? 'Data Master' :
                 activeMainModule === 'configuration-system' ? 'Configuration System' :
                 activeMainModule === 'sop-flowchart' ? 'SOP & Flowchart Alur' :
                 activeMainModule === 'dashboard' || activeMainModule === 'main-hub' ? 'Dashboard Monitoring' :
                 'Proses In (Inbound)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Modal Kontrol & Status Sinkronisasi Cloud Firestore */}
      {isSyncModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSyncModalOpen(false);
          }}
        >
          <div className="bg-white border-2 border-slate-900 rounded-2xl w-[94vw] max-w-lg shadow-2xl flex flex-col max-h-[88dvh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                    Kontrol Sinkronisasi Cloud Firestore
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Sinkronisasi data gudang aktual antar HP dan Komputer
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-sm transition cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>TUTUP</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              {/* Feedback Alert */}
              {syncFeedback && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${
                  syncFeedback.startsWith('✅') 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  {syncFeedback}
                </div>
              )}

              {/* Status Server Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Status Koneksi Server:</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                    cloudSyncStatus === 'connected'
                      ? 'bg-emerald-100 text-emerald-800'
                      : cloudSyncStatus === 'syncing'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    {cloudSyncStatus === 'connected' ? 'Cloud Firestore Terhubung' : cloudSyncStatus === 'syncing' ? 'Sedang Sinkron...' : 'Offline'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <p>Database ID: <span className="font-mono font-bold text-slate-800">ai-studio-sikutangsistemke-a796a46c-9584-4687-a6d9-022b61fdafb0</span></p>
                  <p>Penyimpanan Data: <span className="font-semibold text-slate-700">Google Cloud Platform (Asia East)</span></p>
                </div>
              </div>

              {/* Action Buttons: PUSH and PULL */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  Tindakan Penyelarasan Antar Perangkat:
                </label>
                
                {/* Tombol PUSH: Kirim data dari layar ini ke Cloud */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    <UploadCloud className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-blue-950">
                        1. Kirim Data dari Layar Ini ke Cloud (Push)
                      </h4>
                      <p className="text-[11px] text-blue-800 leading-relaxed mt-0.5">
                        Tekan tombol ini untuk <strong>mengunggah seluruh data yang sedang tampil di layar ini</strong> (rak, produk, stok, outbound) ke Cloud Firestore, agar perangkat HP atau link lain seketika melihat data yang sama persis.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={syncActionLoading || !onForceSyncCloud}
                    onClick={handleHeaderPush}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>{syncActionLoading ? 'Sedang Mengunggah...' : '📤 Kirim Seluruh Data Layar Ini ke Cloud'}</span>
                  </button>
                </div>

                {/* Tombol PULL: Tarik data dari Cloud ke layar ini */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2.5">
                    <DownloadCloud className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs text-emerald-950">
                        2. Tarik Data Terbaru dari Cloud (Pull)
                      </h4>
                      <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                        Tekan tombol ini jika perangkat lain baru saja menginput barang dan Anda ingin <strong>memuat data terbaru dari Cloud Firestore</strong> ke layar ini.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={syncActionLoading || !onPullFromCloud}
                    onClick={handleHeaderPull}
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>{syncActionLoading ? 'Sedang Mengambil...' : '📥 Tarik Data Terbaru dari Cloud'}</span>
                  </button>
                </div>
              </div>

              {/* Troubleshooting Note */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-950">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  Petunjuk Link Web Antar Perangkat:
                </span>
                <p className="text-[11px] leading-relaxed">
                  Pastikan HP dan Komputer sama-sama membuka tautan web server resmi (<span className="font-mono text-[10px] font-bold">ais-pre-hdta4ueneu5lppkndlikou-939789397042.asia-east1.run.app</span>). Keduanya akan otomatis saling memperbarui secara real-time.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Selesai & Tutup Jendela</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
