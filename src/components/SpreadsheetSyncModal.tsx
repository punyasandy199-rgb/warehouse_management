/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  X, 
  Link, 
  Table, 
  Database, 
  Layers, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardCheck, 
  HelpCircle,
  Code,
  ShieldCheck,
  UserCheck,
  LogOut,
  Sparkles,
  Info,
  CheckSquare,
  KeyRound
} from 'lucide-react';
import { User } from 'firebase/auth';
import { RackData, ProductItem, ActivityLog, EmployeePIC, StagingAreaInfo } from '../types';
import { 
  initAuth, 
  googleSignIn, 
  getAccessToken, 
  logoutGoogle 
} from '../firebase';
import {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_URL,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  syncAllWarehouseDataToGoogleSpreadsheet,
  SheetMetadata
} from '../utils/googleSheetsService';

const SPREADSHEET_PRESETS = [
  {
    name: 'Spreadsheet Pengguna (1Vh_1wn...)',
    url: 'https://docs.google.com/spreadsheets/d/1Vh_1wn-Df_P6Ucriwi0Y0ZusaXBN1NrwX32PCZtkPa0/edit'
  },
  {
    name: 'Spreadsheet Pengguna (1QrGp...)',
    url: 'https://docs.google.com/spreadsheets/d/1QrGpW5apY27UFbViXVK3GI13lAwbqPO4rGstoas-WtM/edit?usp=sharing'
  }
];

interface SpreadsheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: Record<string, RackData>;
  products: ProductItem[];
  employees: EmployeePIC[];
  logs: ActivityLog[];
  stagingAreas?: StagingAreaInfo[];
  currentUserName: string;
}

export const SpreadsheetSyncModal: React.FC<SpreadsheetSyncModalProps> = ({
  isOpen,
  onClose,
  racks,
  products,
  employees,
  logs,
  stagingAreas = [],
  currentUserName
}) => {
  // Spreadsheet Target URL & ID
  const [spreadsheetInput, setSpreadsheetInput] = useState<string>(() => {
    try {
      return localStorage.getItem('sikutang_target_spreadsheet_url') || SPREADSHEET_PRESETS[0].url;
    } catch {
      return SPREADSHEET_PRESETS[0].url;
    }
  });

  // Google Auth State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [hasValidToken, setHasValidToken] = useState<boolean>(false);
  const [scopeErrorDetected, setScopeErrorDetected] = useState<boolean>(false);

  // Metadata Spreadsheet
  const [sheetMetadata, setSheetMetadata] = useState<SheetMetadata | null>(null);
  const [isCheckingSheet, setIsCheckingSheet] = useState<boolean>(false);

  // Sync State & Progress
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgress, setSyncProgress] = useState<{ step: string; percentage: number } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  // Status Notice
  const [syncStatusNotice, setSyncStatusNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Setting Auto-Sync & Webhook
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sikutang_spreadsheet_auto_sync');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    try {
      return localStorage.getItem('sikutang_spreadsheet_webhook_url') || '';
    } catch {
      return '';
    }
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('sikutang_spreadsheet_last_sync_time') || null;
    } catch {
      return null;
    }
  });

  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedHeaders, setCopiedHeaders] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'dictionary' | 'script'>('sync');

  // Inisialisasi Auth Listener
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setHasValidToken(!!token);
      },
      () => {
        setGoogleUser(null);
        setHasValidToken(false);
      }
    );

    // Cek apakah token in-memory sudah ada
    getAccessToken().then(token => {
      setHasValidToken(!!token);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen]);

  // Ekstrak Inbound Records dari Rak
  const getInboundRecords = () => {
    const records: any[] = [];
    Object.values(racks).forEach(rack => {
      Object.values(rack.slots).forEach(slot => {
        if (slot.status === 'occupied') {
          if (slot.pallets && slot.pallets.length > 0) {
            slot.pallets.forEach(p => {
              records.push({
                slotCode: slot.slotCode,
                palletNumber: p.palletNumber || p.palletId || '-',
                itemCode: p.itemCode,
                itemName: p.itemName,
                batchNo: p.batchNo || '-',
                quantityBox: p.quantityBox,
                icStatus: p.icStatus || 'OK',
                packingLine: p.packingLine || 'PA',
                bestBefore: p.expiryDate || '-',
                cartonRange: p.cartonRangeText || '-',
                storedAt: p.inboundDate || '-',
                operatorName: p.inboundBy || '-'
              });
            });
          } else if (slot.pallet) {
            records.push({
              slotCode: slot.slotCode,
              palletNumber: slot.pallet.palletNumber || slot.pallet.palletId || '-',
              itemCode: slot.pallet.itemCode,
              itemName: slot.pallet.itemName,
              batchNo: slot.pallet.batchNo || '-',
              quantityBox: slot.pallet.quantityBox,
              icStatus: slot.pallet.icStatus || 'OK',
              packingLine: slot.pallet.packingLine || 'PA',
              bestBefore: slot.pallet.expiryDate || '-',
              cartonRange: slot.pallet.cartonRangeText || '-',
              storedAt: slot.pallet.inboundDate || '-',
              operatorName: slot.pallet.inboundBy || '-'
            });
          }
        }
      });
    });
    return records;
  };

  const getOutboundRecords = () => {
    try {
      const planSaved = localStorage.getItem('fgw_outbound_plan_kirim_list');
      if (planSaved) return JSON.parse(planSaved);
    } catch {}
    return [];
  };

  const inboundList = getInboundRecords();
  const outboundList = getOutboundRecords();

  const currentSpreadsheetId = extractSpreadsheetId(spreadsheetInput);
  const currentSpreadsheetLink = spreadsheetInput.startsWith('http') 
    ? spreadsheetInput 
    : `https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}/edit`;

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    setSyncStatusNotice(null);
    setScopeErrorDetected(false);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setHasValidToken(true);
        setSyncStatusNotice({
          type: 'success',
          message: `Berhasil login ke Google: ${result.user.displayName || result.user.email}. Memeriksa izin spreadsheet...`
        });
        // Cek metadata otomatis
        checkSpreadsheetConnection(result.accessToken);
      }
    } catch (err: any) {
      console.error('[Google Auth] Sign in error:', err);
      const isScope = err.message?.toLowerCase().includes('insufficient') || err.message?.toLowerCase().includes('scope');
      if (isScope) setScopeErrorDetected(true);
      setSyncStatusNotice({
        type: 'error',
        message: err.message || 'Gagal login ke Google. Pastikan popup login tidak diblokir browser.'
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Re-autentikasi dengan paksa layar izin Google Sheets (Consent Screen)
  const handleReauthWithConsent = async () => {
    try {
      await logoutGoogle();
    } catch {}
    setGoogleUser(null);
    setHasValidToken(false);
    setScopeErrorDetected(false);
    setSyncStatusNotice(null);
    await handleGoogleSignIn();
  };

  // Handle Logout Google
  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setHasValidToken(false);
      setSheetMetadata(null);
      setScopeErrorDetected(false);
      setSyncStatusNotice({
        type: 'info',
        message: 'Koneksi akun Google telah diputus.'
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Cek Metadata & Tab Spreadsheet
  const checkSpreadsheetConnection = async (tokenOverride?: string) => {
    const token = tokenOverride || (await getAccessToken());
    if (!token) {
      setSyncStatusNotice({
        type: 'error',
        message: 'Harap masuk dengan Akun Google terlebih dahulu untuk memeriksa akses spreadsheet.'
      });
      return;
    }

    setIsCheckingSheet(true);
    setSyncStatusNotice(null);
    setScopeErrorDetected(false);
    try {
      const meta = await getSpreadsheetMetadata(currentSpreadsheetId, token);
      setSheetMetadata(meta);
      setSyncStatusNotice({
        type: 'success',
        message: `Terhubung sempurna ke Google Spreadsheet: "${meta.title}" (${meta.sheets.length} Tab sheet terdeteksi)!`
      });
    } catch (err: any) {
      console.error('[Spreadsheet Check] Error:', err);
      const isScopeErr = err.message?.toLowerCase().includes('insufficient') || 
                         err.message?.toLowerCase().includes('scope') || 
                         err.message?.includes('403');
      if (isScopeErr) {
        setScopeErrorDetected(true);
        setSyncStatusNotice({
          type: 'error',
          message: 'Izin Akses Spreadsheet Belum Diberikan: Akun Google Anda belum mencentang izin Google Sheets pada layar login. Silakan klik tombol perbarui izin di bawah.'
        });
      } else {
        setSyncStatusNotice({
          type: 'error',
          message: `Gagal mengakses spreadsheet: ${err.message}. Pastikan akun Google Anda memiliki hak akses Edit ke dokumen spreadsheet tersebut.`
        });
      }
    } finally {
      setIsCheckingSheet(false);
    }
  };

  // Simpan Target Spreadsheet URL & Setting
  const handleSaveSettings = () => {
    try {
      localStorage.setItem('sikutang_target_spreadsheet_url', spreadsheetInput.trim());
      localStorage.setItem('sikutang_spreadsheet_auto_sync', String(autoSyncEnabled));
      localStorage.setItem('sikutang_spreadsheet_webhook_url', webhookUrl.trim());
      setSyncStatusNotice({
        type: 'success',
        message: 'Pengaturan target Google Spreadsheet berhasil disimpan!'
      });
    } catch (e) {
      setSyncStatusNotice({
        type: 'error',
        message: 'Gagal menyimpan pengaturan.'
      });
    }
  };

  // Buka Dialog Konfirmasi Sinkronisasi
  const handlePromptSync = async () => {
    const token = await getAccessToken();
    if (!token) {
      setSyncStatusNotice({
        type: 'error',
        message: 'Harap login dengan Akun Google terlebih dahulu menggunakan tombol "Sign in with Google" di bawah.'
      });
      return;
    }
    // Tampilkan modal konfirmasi eksplisit (MANDATORY per skill)
    setShowConfirmModal(true);
  };

  // Eksekusi Sinkronisasi Langsung ke Google Sheets API
  const handleExecuteSyncToGoogleSheets = async () => {
    setShowConfirmModal(false);
    const token = await getAccessToken();
    if (!token) {
      setSyncStatusNotice({
        type: 'error',
        message: 'Sesi token kedaluwarsa. Silakan login ulang dengan Akun Google.'
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatusNotice(null);
    setScopeErrorDetected(false);
    setSyncProgress({ step: 'Mempersiapkan data...', percentage: 5 });

    try {
      const result = await syncAllWarehouseDataToGoogleSpreadsheet(
        currentSpreadsheetId,
        {
          racks,
          products,
          employees,
          logs,
          stagingAreas,
          operatorName: currentUserName
        },
        token,
        (step, percentage) => {
          setSyncProgress({ step, percentage });
        }
      );

      const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      setLastSyncTime(nowTime);
      try {
        localStorage.setItem('sikutang_spreadsheet_last_sync_time', nowTime);
      } catch {}

      setSyncStatusNotice({
        type: 'success',
        message: `✓ BERHASIL DISINKRONKAN! Seluruh data gudang telah diperbarui ke Google Spreadsheet pada ${nowTime}. (${inboundList.length} Inbound Pallet, ${outboundList.length} Outbound, ${products.length} Master Produk, ${Object.keys(racks).length} Rak, ${logs.length} Log).`
      });

      // Update metadata tab
      checkSpreadsheetConnection(token);
    } catch (err: any) {
      console.error('[Google Sheets Sync] Error:', err);
      const isScopeErr = err.message?.toLowerCase().includes('insufficient') || 
                         err.message?.toLowerCase().includes('scope') || 
                         err.message?.includes('403');
      if (isScopeErr) {
        setScopeErrorDetected(true);
        setSyncStatusNotice({
          type: 'error',
          message: 'Gagal memperbarui spreadsheet: Akun Google Anda belum mencentang izin Google Sheets. Klik tombol "Perbarui Izin Akses Google Sheets" di bawah untuk mencentang izin.'
        });
      } else {
        setSyncStatusNotice({
          type: 'error',
          message: `Gagal memperbarui spreadsheet: ${err.message}. Pastikan spreadsheet dapat diedit oleh akun Google Anda.`
        });
      }
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  // Unduh CSV Multi-Sheet
  const handleDownloadAllDataCsv = () => {
    let csvContent = '\uFEFF'; // UTF-8 BOM

    // 1. DATA INBOUND
    csvContent += '=== TABEL INBOUND TRANSAKSI GUDANG ===\r\n';
    csvContent += 'NO,KODE_SLOT,NO_PALLET,KODE_ITEM,NAMA_BARANG,BATCH,JUMLAH_BOX,STATUS_IC,PACKING_LINE,BEST_BEFORE,RENTANG_KARTON,WAKTU_SIMPAN,OPERATOR\r\n';
    inboundList.forEach((item, idx) => {
      csvContent += `${idx + 1},"${item.slotCode}","${item.palletNumber}","${item.itemCode}","${item.itemName}","${item.batchNo}",${item.quantityBox},"${item.icStatus}","${item.packingLine}","${item.bestBefore}","${item.cartonRange}","${item.storedAt}","${item.operatorName}"\r\n`;
    });
    csvContent += '\r\n';

    // 2. DATA OUTBOUND
    csvContent += '=== TABEL OUTBOUND PENGIRIMAN ===\r\n';
    csvContent += 'NO,NO_PLAN,TUJUAN,NOPOL_TRUK,KODE_ITEM,NAMA_BARANG,BATCH,JUMLAH_BOX,STATUS,STAGING_AREA,OPERATOR\r\n';
    outboundList.forEach((o: any, idx: number) => {
      csvContent += `${idx + 1},"${o.planNo || o.id || '-'}","${o.destination || '-'}","${o.truckPlate || '-'}","${o.itemCode || '-'}","${o.itemName || '-'}","${o.batchNo || '-'}",${o.quantityBox || 0},"${o.status || 'READY'}","${o.stagingCode || '-'}","${o.operatorName || '-'}"\r\n`;
    });
    csvContent += '\r\n';

    // 3. MASTER PRODUK
    csvContent += '=== TABEL MASTER PRODUK BARANG JADI ===\r\n';
    csvContent += 'NO,KODE_ITEM,NAMA_PRODUK,KATEGORI,BOX_PER_PALLET,BARCODE,STOK_SAAT_INI_BOX,SAFETY_STOCK_BOX,BERAT_PER_BOX_KG\r\n';
    products.forEach((p, idx) => {
      csvContent += `${idx + 1},"${p.itemCode}","${p.itemName}","${p.category || 'SIC'}",${p.boxPerPallet},"${p.barcode}",${p.currentStockBox || 0},${p.minStockBox || 15},${p.weightPerBoxKg || 30}\r\n`;
    });
    csvContent += '\r\n';

    // 4. MASTER RAK
    csvContent += '=== TABEL MASTER RAK & KAPASITAS ===\r\n';
    csvContent += 'NO,KODE_RAK,NAMA_RAK,ZONA,TINGKAT_LEVEL,JUMLAH_BAY,TOTAL_SLOT,SLOT_TERISI,KAPASITAS_KG\r\n';
    Object.values(racks).forEach((r, idx) => {
      const occ = Object.values(r.slots).filter(s => s.status === 'occupied').length;
      csvContent += `${idx + 1},"${r.id}","Rak ${r.id}","Zona FG",${r.maxLevels || 4},${r.baysList?.length || 13},${Object.keys(r.slots).length},${occ},25000\r\n`;
    });
    csvContent += '\r\n';

    // 5. AUDIT LOGS
    csvContent += '=== TABEL AUDIT LOG TRANSAKSI ===\r\n';
    csvContent += 'NO,WAKTU,OPERATOR,ROLE,AKSI,SLOT_KODE,DESKRIPSI\r\n';
    logs.slice(0, 150).forEach((l, idx) => {
      csvContent += `${idx + 1},"${l.timestamp}","${l.userName}","${l.userRole}","${l.action}","${l.slotCode || '-'}","${l.description.replace(/"/g, '""')}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SIKUTANG_DATABASE_SPREADSHEET_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Salin Semua Judul Kolom ke Clipboard
  const handleCopyAllHeaders = () => {
    const allHeadersText = `1. SHEET: INBOUND_PUTAWAY (Data Barang Masuk ke Rak)
TIMESTAMP | SLOT_RAK | NO_PALLET | KODE_ITEM | NAMA_BARANG | BATCH | JUMLAH_BOX | STATUS_IC | PACKING_LINE | BEST_BEFORE | RENTANG_KARTON | WAKTU_SIMPAN | OPERATOR

2. SHEET: OUTBOUND_DISPATCH (Pengeluaran Barang & Muat Truk)
NO_PLAN | TUJUAN_KIRIM | NOPOL_TRUK | KODE_ITEM | NAMA_BARANG | BATCH | QTY_BOX_KIRIM | STATUS | STAGING_AREA | OPERATOR | WAKTU_UPDATE

3. SHEET: MASTER_PRODUK (Data Master Produk & Standar Muat)
KODE_ITEM | NAMA_PRODUK | KATEGORI | BOX_PER_PALLET | BARCODE | STOK_SAAT_INI_BOX | SAFETY_STOCK_BOX | BERAT_PER_BOX_KG

4. SHEET: MASTER_RAK (Data Denah Rak Gudang)
KODE_RAK | NAMA_RAK | ZONA | TINGKAT_LEVEL | JUMLAH_BAY | TOTAL_SLOT | SLOT_TERISI | SLOT_KOSONG | PERSENTASE_TERISI

5. SHEET: STOCK_OPNAME (Hasil Audit Fisik vs Sistem)
WAKTU_AUDIT | KODE_SLOT | NO_PALLET | KODE_ITEM | NAMA_PRODUK | BATCH | QTY_SISTEM | QTY_FISIK | STATUS_AUDIT | NIK_PEMERIKSA

6. SHEET: LOG_AKTIVITAS (Audit Trail & Log Transaksi)
TIMESTAMP | OPERATOR | ROLE | AKSI | KODE_SLOT | DESKRIPSI`;

    navigator.clipboard.writeText(allHeadersText);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 3000);
  };

  const sampleAppsScriptCode = `/**
 * GOOGLE APPS SCRIPT: SIKUTANG WMS WEBHOOK CONNECTOR
 * Salin dan tempelkan kode ini di Google Sheets Anda:
 * 1. Buka Google Spreadsheet Anda
 * 2. Klik menu "Extensions" (Ekstensi) > "Apps Script"
 * 3. Hapus kode bawaan dan tempel kode di bawah ini
 * 4. Klik "Deploy" (Terapkan) > "New deployment" (Penerapan baru)
 * 5. Pilih Type: "Web App"
 * 6. Set "Execute as": "Me" dan "Who has access": "Anyone"
 * 7. Salin URL Web App yang dihasilkan ke dalam aplikasi SIKUTANG WMS
 */

function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. TULIS TAB INBOUND
    if (payload.data && payload.data.inbound && payload.data.inbound.length > 0) {
      var sheetIn = ss.getSheetByName("INBOUND_PUTAWAY") || ss.insertSheet("INBOUND_PUTAWAY");
      if (sheetIn.getLastRow() === 0) {
        sheetIn.appendRow(["TIMESTAMP", "SLOT_RAK", "NO_PALLET", "KODE_ITEM", "NAMA_BARANG", "BATCH", "JUMLAH_BOX", "STATUS_IC", "LINE", "OPERATOR"]);
        sheetIn.getRange(1, 1, 1, 10).setBackground("#0070C0").setFontColor("#FFFFFF").setFontWeight("bold");
      }
      payload.data.inbound.forEach(function(item) {
        sheetIn.appendRow([payload.timestamp, item.slotCode, item.palletNumber, item.itemCode, item.itemName, item.batchNo, item.quantityBox, item.icStatus, item.packingLine, item.operatorName]);
      });
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "SUCCESS", message: "Data SIKUTANG berhasil disinkronkan!" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "ERROR", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[92dvh] flex flex-col overflow-hidden relative">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900">
                  Pusat Integrasi Database Google Spreadsheet
                </h3>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Penyelarasan langsung antara sistem gudang SIKUTANG dan Google Sheets (Inbound, Outbound, Master, Opname, Log).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 border-b border-slate-200 pb-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Koneksi Google Sheets &amp; Segarkan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dictionary')}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'dictionary'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Judul &amp; Kamus Kolom (Review)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'script'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Apps Script / Webhook (Opsional)</span>
          </button>
        </div>

        {/* Status Alert Banner */}
        {syncStatusNotice && (
          <div className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 shrink-0 animate-in fade-in ${
            syncStatusNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
              : syncStatusNotice.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-300'
              : 'bg-blue-50 text-blue-900 border border-blue-300'
          }`}>
            <div className="flex items-center gap-2">
              {syncStatusNotice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : syncStatusNotice.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              )}
              <span>{syncStatusNotice.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncStatusNotice(null)}
              className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BANNER BANTUAN KHUSUS JIKA TERJADI "INSUFFICIENT AUTHENTICATION SCOPES"   */}
        {/* ========================================================================= */}
        {scopeErrorDetected && (
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-xs space-y-3 shrink-0 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-200 text-amber-900 rounded-xl shrink-0 mt-0.5">
                <KeyRound className="w-5 h-5 text-amber-800" />
              </div>
              <div className="space-y-1">
                <h5 className="font-black text-amber-950 text-sm flex items-center gap-2">
                  <span>Solusi: Berikan Centang Izin Akses Google Sheets</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">1-KLIK PERBAIKAN</span>
                </h5>
                <p className="text-amber-900 leading-relaxed text-[11px]">
                  Google mendeteksi bahwa akun Anda login tanpa mencentang izin Google Sheets pada layar persetujuan. Agar aplikasi dapat membaca dan mengisi spreadsheet otomatis, ikuti 3 langkah cepat ini:
                </p>
              </div>
            </div>

            <div className="bg-white/80 p-3 rounded-xl border border-amber-300 text-slate-800 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Panduan Centang Izin di Layar Google:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-700">
                <li>Klik tombol <strong>&quot;Perbarui Izin &amp; Login Ulang Google&quot;</strong> di bawah ini.</li>
                <li>Pada jendela Google yang muncul, cari opsi: <strong>&quot;Lihat, edit, buat, dan hapus spreadsheet Google Spreadsheet Anda&quot;</strong>.</li>
                <li><strong>Centang kotak tersebut ☑️</strong> lalu klik tombol <strong>Lanjutkan / Continue</strong>.</li>
              </ol>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleReauthWithConsent}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Perbarui Izin &amp; Login Ulang Google Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs">
          
          {/* TAB 1: KONEKSI GOOGLE SHEETS & SINKRONISASI MANUAL */}
          {activeTab === 'sync' && (
            <div className="space-y-4">

              {/* CARD 1: STATUS AUTENTIKASI GOOGLE WORKSPACE */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {googleUser ? (
                    googleUser.photoURL ? (
                      <img 
                        src={googleUser.photoURL} 
                        alt="Google Avatar" 
                        className="w-10 h-10 rounded-full border-2 border-emerald-500 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {googleUser.displayName?.charAt(0) || 'G'}
                      </div>
                    )
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                      <UserCheck className="w-5 h-5 text-slate-500" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {googleUser ? (googleUser.displayName || 'Akun Google') : 'Akun Google Belum Terhubung'}
                      </span>
                      {googleUser && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                          <Check className="w-3 h-3" /> OAuth Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {googleUser 
                        ? (googleUser.email || 'Terhubung dengan izin Google Sheets') 
                        : 'Hubungkan Akun Google untuk sinkronisasi langsung ke Google Spreadsheet.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  {googleUser ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReauthWithConsent}
                        className="px-3 py-2 rounded-xl text-amber-700 hover:text-amber-900 hover:bg-amber-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-amber-300 bg-amber-50"
                        title="Klik ini jika muncul error izin scopes"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Perbarui Izin</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="px-3 py-2 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-rose-200"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Putus Akun Google</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isAuthenticating}
                      className="gsi-material-button w-full sm:w-auto shadow-sm"
                    >
                      <div className="gsi-material-button-state"></div>
                      <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                          <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                          </svg>
                        </div>
                        <span className="gsi-material-button-contents">
                          {isAuthenticating ? 'Menghubungkan...' : 'Sign in with Google'}
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* CARD 2: TARGET GOOGLE SPREADSHEET YANG DITAUTKAN */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Target Google Spreadsheet Anda
                    </h4>
                  </div>
                  <a
                    href={currentSpreadsheetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 transition"
                  >
                    <span>Buka Spreadsheet di Tab Baru</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                    <span>Tautan Dokumen Spreadsheet:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-normal">Pilihan Cepat:</span>
                      {SPREADSHEET_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSpreadsheetInput(p.url)}
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                        >
                          Link {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={spreadsheetInput}
                      onChange={(e) => setSpreadsheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs text-slate-800 bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs transition cursor-pointer shrink-0"
                    >
                      Simpan
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-0.5">
                    <span className="truncate max-w-[280px] sm:max-w-md">ID Spreadsheet: <strong>{currentSpreadsheetId}</strong></span>
                    <button
                      type="button"
                      onClick={() => checkSpreadsheetConnection()}
                      disabled={isCheckingSheet}
                      className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <RefreshCw className={`w-3 h-3 ${isCheckingSheet ? 'animate-spin' : ''}`} />
                      <span>{isCheckingSheet ? 'Memeriksa...' : 'Periksa Status Tab'}</span>
                    </button>
                  </div>
                </div>

                {/* Info Tab Sheet yang Ditemukan */}
                {sheetMetadata && (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950">
                        Judul Dokumen: &quot;{sheetMetadata.title}&quot;
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold">
                        {sheetMetadata.sheets.length} Tab Terdaftar
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sheetMetadata.sheets.map(s => (
                        <span key={s.id} className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-900 font-mono text-[10px] font-semibold">
                          📄 {s.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: 6 JUDUL DATA YANG DITARIK LANGSUNG KE SPREADSHEET (MENJAWAB USER) */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Daftar 6 Judul Data Yang Ditarik Langsung ke Spreadsheet:
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAllHeaders}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs transition"
                  >
                    {copiedHeaders ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHeaders ? 'Headers Tersalin!' : 'Salin Semua Judul Kolom'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                  {/* Sheet 1 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-800 text-[11px] flex items-center gap-1">
                        <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                        INBOUND_PUTAWAY
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">13 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Data barang masuk ke slot rak, nomor pallet, item SKU, batch, jumlah box, status QC, line, dan PIC.
                    </p>
                  </div>

                  {/* Sheet 2 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-800 text-[11px] flex items-center gap-1">
                        <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" />
                        OUTBOUND_DISPATCH
                      </span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">11 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Surat Jalan / No Plan kirim, tujuan distributor, plat armada truk, batch, kuantitas box, dan staging.
                    </p>
                  </div>

                  {/* Sheet 3 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-800 text-[11px] flex items-center gap-1">
                        <Database className="w-3.5 h-3.5 text-blue-600" />
                        MASTER_PRODUK
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">8 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Master SKU produk jadi, standar isi box per pallet (15 box), barcode, stok terkini, dan safety stock.
                    </p>
                  </div>

                  {/* Sheet 4 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 text-[11px] flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-600" />
                        MASTER_RAK
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded font-bold">9 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Denah rak gudang, level tingkat (1-4), total slot, slot terisi vs kosong, dan persentase utilitas.
                    </p>
                  </div>

                  {/* Sheet 5 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-800 text-[11px] flex items-center gap-1">
                        <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
                        STOCK_OPNAME
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold">10 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Hasil audit hitung fisik slot vs catatan sistem, status MATCH / SELISIH, dan NIK auditor.
                    </p>
                  </div>

                  {/* Sheet 6 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-800 text-[11px] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                        LOG_AKTIVITAS
                      </span>
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-bold">6 Kolom</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Catatan forensik seluruh tindakan operator, putaway, dispatch, opname, dan perubahan sistem.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 4: TOMBOL SEGARKAN DATA MANUAL (HIGHLIGHTED) */}
              <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-5 rounded-2xl shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400">
                        PENYEGARAN DATA INSTAN (MANUAL SYNC)
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded border border-emerald-500/30">
                        REST API v4
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-white">
                      Segarkan Data ke Spreadsheet Sekarang
                    </h4>
                    <p className="text-xs text-slate-300 max-w-xl">
                      Klik tombol ini jika ada data transaksi baru yang belum terupdate otomatis atau setelah kembali online. Sistem akan memperbarui seluruh tab Inbound, Outbound, Master, dan Log.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handlePromptSync}
                      disabled={isSyncing}
                      className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Menyegarkan Spreadsheet...' : 'Segarkan Data Spreadsheet'}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleDownloadAllDataCsv}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition cursor-pointer"
                      title="Cadangkan seluruh data ke dalam file CSV Excel"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Unduh Backup CSV (.csv)</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar Jika Sedang Sinkronisasi */}
                {syncProgress && (
                  <div className="p-3 bg-white/10 rounded-xl space-y-1.5 border border-white/10 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                      <span>{syncProgress.step}</span>
                      <span>{syncProgress.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${syncProgress.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-300 font-mono">
                  <span>
                    Status Terakhir: <strong>{lastSyncTime ? `Tersinkron ${lastSyncTime}` : 'Belum pernah disinkronkan'}</strong>
                  </span>
                  <span>
                    Siap Ditulis: <strong>{inboundList.length} Inbound</strong> &bull; <strong>{outboundList.length} Outbound</strong> &bull; <strong>{products.length} Produk</strong> &bull; <strong>{logs.length} Log</strong>
                  </span>
                </div>
              </div>

              {/* CARD 5: JAMINAN KEUTUHAN DATABASE & FITUR AUTO-SYNC */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Keutuhan Database &amp; Pembaruan Otomatis
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                    PERSISTENT STORAGE
                  </span>
                </div>

                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Jaminan Data Tetap Terjaga Saat Update Program:</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Setiap transaksi Inbound (Putaway ke Rak), Outbound, dan Stock Opname disimpan secara permanen di <strong>Google Cloud Firestore</strong> dan <strong>Local Cache</strong>. Data tidak akan hilang saat aplikasi di-refresh, browser ditutup, ataupun saat program menerima pembaruan kode.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSyncEnabled}
                      onChange={(e) => {
                        setAutoSyncEnabled(e.target.checked);
                        try {
                          localStorage.setItem('sikutang_spreadsheet_auto_sync', String(e.target.checked));
                        } catch {}
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700 text-xs">
                      Aktifkan mode auto-sync (mendorong data ke spreadsheet saat selesai transaksi)
                    </span>
                  </label>

                  <a 
                    href={currentSpreadsheetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1"
                  >
                    <span>Lihat di Spreadsheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: KAMUS DATA & REKOMENDASI STRUKTUR KOLOM (UNTUK DIREVIEW USER) */}
          {activeTab === 'dictionary' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-600" />
                    Rekomendasi Struktur Kolom Database Spreadsheet SIKUTANG WMS
                  </h4>
                  <button
                    type="button"
                    onClick={handleCopyAllHeaders}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                  >
                    {copiedHeaders ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHeaders ? 'Headers Tersalin!' : 'Salin Semua Format Header'}</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Berikut adalah rekomendasi lengkap struktur tabel dan nama kolom dari developer. Silakan tinjau (*review*) apakah ada kolom yang perlu disesuaikan penamaannya atau ditambah sesuai SOP perusahaan Anda:
                </p>
              </div>

              {/* TABEL 1: INBOUND */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                  <span className="font-black text-emerald-950 text-xs flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                    Sheet 1: INBOUND_PUTAWAY (Data Barang Masuk ke Rak)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                    {inboundList.length} Record Aktif di Gudang
                  </span>
                </div>
                <div className="p-3 divide-y divide-slate-100 text-[11px]">
                  <div className="grid grid-cols-12 font-bold text-slate-500 pb-1">
                    <span className="col-span-3">Nama Kolom Rekomendasi</span>
                    <span className="col-span-2">Tipe Data</span>
                    <span className="col-span-4">Deskripsi / Kegunaan</span>
                    <span className="col-span-3">Contoh Nilai</span>
                  </div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">TIMESTAMP</span><span className="col-span-2 text-slate-500">Tanggal/Waktu</span><span className="col-span-4 text-slate-600 font-sans">Waktu barang selesai disimpan di rak</span><span className="col-span-3 text-emerald-700">2026-10-06 14:32:01</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">SLOT_RAK</span><span className="col-span-2 text-slate-500">Teks (Kode)</span><span className="col-span-4 text-slate-600 font-sans">Lokasi koordinat slot rak simpan</span><span className="col-span-3 text-blue-700">A-01-01</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">NO_PALLET</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Nomor barcode identitas pallet fisik</span><span className="col-span-3 text-slate-800">KP-001 / FG-383</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">KODE_ITEM</span><span className="col-span-2 text-slate-500">Teks SKU</span><span className="col-span-4 text-slate-600 font-sans">Kode unik produk barang jadi</span><span className="col-span-3 text-slate-800">41503383</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">NAMA_BARANG</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Nama resmi produk barang jadi</span><span className="col-span-3 text-slate-800">SIC 250ML C24</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">BATCH</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Nomor lot / batch produksi</span><span className="col-span-3 text-slate-800">26A01</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">JUMLAH_BOX</span><span className="col-span-2 text-slate-500">Angka</span><span className="col-span-4 text-slate-600 font-sans">Kuantitas box per pallet (Standar SOP: 15 Box)</span><span className="col-span-3 text-emerald-700 font-bold">15</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">STATUS_IC</span><span className="col-span-2 text-slate-500">Pilihan</span><span className="col-span-4 text-slate-600 font-sans">Status inspeksi QC: OK, HOLD, BO</span><span className="col-span-3 text-emerald-700 font-bold">OK</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">PACKING_LINE</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Line packing produksi</span><span className="col-span-3 text-slate-800">PA / PB</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">BEST_BEFORE</span><span className="col-span-2 text-slate-500">Tanggal</span><span className="col-span-4 text-slate-600 font-sans">Tanggal kadaluwarsa (Expired)</span><span className="col-span-3 text-slate-800">2027-10-01</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">RENTANG_KARTON</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Nomor seri box awal s/d akhir</span><span className="col-span-3 text-slate-800">0001 - 0015</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">OPERATOR</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Nama petugas PIC putaway</span><span className="col-span-3 text-slate-800">Dani Pratama</span></div>
                </div>
              </div>

              {/* TABEL 2: OUTBOUND */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
                  <span className="font-black text-rose-950 text-xs flex items-center gap-2">
                    <ArrowUpFromLine className="w-4 h-4 text-rose-600" />
                    Sheet 2: OUTBOUND_DISPATCH (Pengeluaran Barang & Muat Truk)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white text-rose-800 px-2 py-0.5 rounded border border-rose-300">
                    Modul Pengiriman
                  </span>
                </div>
                <div className="p-3 divide-y divide-slate-100 text-[11px]">
                  <div className="grid grid-cols-12 font-bold text-slate-500 pb-1">
                    <span className="col-span-3">Nama Kolom Rekomendasi</span>
                    <span className="col-span-2">Tipe Data</span>
                    <span className="col-span-4">Deskripsi / Kegunaan</span>
                    <span className="col-span-3">Contoh Nilai</span>
                  </div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">NO_PLAN / NO_SJ</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Nomor Surat Jalan / Delivery Order</span><span className="col-span-3 text-slate-800">SJ-202610-001</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">TUJUAN_KIRIM</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Nama distributor / cabang penerima</span><span className="col-span-3 text-slate-800">DC Surabaya Rungkut</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">NOPOL_TRUK</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Plat nomor truk ekspedisi</span><span className="col-span-3 text-slate-800">B 9876 XYZ</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">KODE_ITEM & NAMA</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Produk yang dikeluarkan dari rak</span><span className="col-span-3 text-slate-800">41503383 - SIC 250ML</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">QTY_BOX_KIRIM</span><span className="col-span-2 text-slate-500">Angka</span><span className="col-span-4 text-slate-600 font-sans">Total karton/box yang dimuat ke armada</span><span className="col-span-3 text-rose-700 font-bold">45 Box (3 Pallet)</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">STAGING_AREA</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Area staging tempat transit barang</span><span className="col-span-3 text-blue-700">STG-01 (Pintu 1)</span></div>
                </div>
              </div>

              {/* TABEL 3: STOCK OPNAME */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                  <span className="font-black text-amber-950 text-xs flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-amber-600" />
                    Sheet 3: STOCK_OPNAME (Hasil Audit Fisik vs Sistem)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                    Audit Keakurasian Stok
                  </span>
                </div>
                <div className="p-3 divide-y divide-slate-100 text-[11px]">
                  <div className="grid grid-cols-12 font-bold text-slate-500 pb-1">
                    <span className="col-span-3">Nama Kolom Rekomendasi</span>
                    <span className="col-span-2">Tipe Data</span>
                    <span className="col-span-4">Deskripsi / Kegunaan</span>
                    <span className="col-span-3">Contoh Nilai</span>
                  </div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">KODE_SLOT</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Slot rak yang diaudit</span><span className="col-span-3 text-blue-700">A-02-03</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">QTY_SISTEM</span><span className="col-span-2 text-slate-500">Angka</span><span className="col-span-4 text-slate-600 font-sans">Kuantitas box tercatat di sistem WMS</span><span className="col-span-3">15 Box</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">QTY_FISIK</span><span className="col-span-2 text-slate-500">Angka</span><span className="col-span-4 text-slate-600 font-sans">Hasil hitung fisik lapangan oleh PIC</span><span className="col-span-3">15 Box</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">STATUS_AUDIT</span><span className="col-span-2 text-slate-500">Pilihan</span><span className="col-span-4 text-slate-600 font-sans">Hasil rekonsiliasi: MATCH atau SELISIH</span><span className="col-span-3 text-emerald-700 font-bold">MATCH</span></div>
                  <div className="grid grid-cols-12 py-1.5 font-mono"><span className="col-span-3 font-bold text-slate-900">NIK_PEMERIKSA</span><span className="col-span-2 text-slate-500">Teks</span><span className="col-span-4 text-slate-600 font-sans">Identitas petugas pemeriksa fisik</span><span className="col-span-3">EMP-003 (Siti)</span></div>
                </div>
              </div>

              {/* TABEL 4: MASTER PRODUK & RAK */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                  <span className="font-black text-blue-950 text-xs flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-600" />
                    Sheet 4 & 5: MASTER_DATA (Master Produk &amp; Master Rak)
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-white text-blue-800 px-2 py-0.5 rounded border border-blue-300">
                    {products.length} SKU &bull; {Object.keys(racks).length} Rak
                  </span>
                </div>
                <div className="p-3 text-[11px] text-slate-600 space-y-1">
                  <p>
                    <strong>Master Produk:</strong> <code>KODE_ITEM</code>, <code>NAMA_PRODUK</code>, <code>KATEGORI</code>, <code>BOX_PER_PALLET</code>, <code>BARCODE</code>, <code>STOK_SAAT_INI_BOX</code>, <code>SAFETY_STOCK_BOX</code>, <code>BERAT_PER_BOX_KG</code>.
                  </p>
                  <p>
                    <strong>Master Rak:</strong> <code>KODE_RAK</code>, <code>NAMA_RAK</code>, <code>ZONA</code>, <code>TINGKAT_LEVEL</code>, <code>JUMLAH_BAY</code>, <code>TOTAL_SLOT</code>, <code>SLOT_TERISI</code>, <code>PERSENTASE_TERISI</code>.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: APPS SCRIPT / WEBHOOK ALTERNATIF */}
          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Alternatif: Google Apps Script Webhook Connector
                  </h4>
                  <p className="text-xs text-slate-500">
                    Jika Anda ingin menggunakan integrasi berbasis Webhook Web App (tanpa OAuth), Anda dapat menggunakan skrip Apps Script ini:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(sampleAppsScriptCode);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 3000);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-xs"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'Tersalin!' : 'Salin Kode Skrip'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                <pre>{sampleAppsScriptCode}</pre>
              </div>

              <div className="space-y-1 pt-1">
                <label className="block font-bold text-slate-700 text-xs">URL Webhook Web App Apps Script (Opsional):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Simpan Webhook
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAllDataCsv}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh Backup File (.CSV)</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition cursor-pointer text-xs"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePromptSync}
              disabled={isSyncing}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Menyegarkan...' : 'Segarkan Spreadsheet'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MANDATORY USER CONFIRMATION DIALOG SEBELUM MUTASI DATA GOOGLE SHEETS      */}
        {/* ========================================================================= */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">
                    Konfirmasi Pembaruan Data Spreadsheet
                  </h4>
                  <p className="text-xs text-slate-500">
                    Pemberitahuan sebelum data disinkronkan ke Google Sheets
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-700">
                <p>
                  Apakah Anda yakin ingin memperbarui data pada spreadsheet <strong>{sheetMetadata?.title || 'SIKUTANG WMS'}</strong>?
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Target Dokumen:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[200px]">{currentSpreadsheetId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sheet Inbound:</span>
                    <span className="font-bold text-emerald-700">{inboundList.length} Baris Pallet</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sheet Outbound:</span>
                    <span className="font-bold text-rose-700">{outboundList.length} Baris Pengiriman</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sheet Master Produk:</span>
                    <span className="font-bold text-blue-700">{products.length} SKU Barang Jadi</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sheet Master Rak:</span>
                    <span className="font-bold text-slate-800">{Object.keys(racks).length} Rak Gudang</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sheet Log Aktivitas:</span>
                    <span className="font-bold text-slate-800">{Math.min(logs.length, 200)} Catatan Audit</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic">
                  *Tindakan ini akan menimpa tab yang bersangkutan dengan data terbaru saat ini tanpa menghapus tab custom lainnya.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSyncToGoogleSheets}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer text-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Konfirmasi &amp; Perbarui Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
