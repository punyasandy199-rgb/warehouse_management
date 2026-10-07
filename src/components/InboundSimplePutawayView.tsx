/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  QrCode, 
  Camera, 
  Tag, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Check, 
  Package, 
  Layers, 
  Plus, 
  Minus,
  Trash2,
  RotateCcw,
  Info,
  Sparkles
} from 'lucide-react';
import { ICStatus } from '../types';
import { ParsedFinishedGoodsQr } from '../utils/productQrParser';

interface BoxCapacityInfo {
  status: 'MAX_15' | 'UNDER_15' | 'OVER_15' | 'BELOW_MIN_2' | string;
  color: string;
  badgeBg: string;
  cardBg: string;
  indicatorColor: string;
  label: string;
  hint: string;
  canSubmit: boolean;
}

export interface ScannedCartonItem {
  cartonNumber: number;
  cartonFormatted: string;
  productName: string;
  batchNo: string;
  rawCode: string;
  scannedAt: string;
}

interface InboundSimplePutawayViewProps {
  putawayOption?: 'OPTION_1_RANGE' | 'OPTION_2_SCAN_ALL';
  onChangePutawayOption?: (opt: 'OPTION_1_RANGE' | 'OPTION_2_SCAN_ALL') => void;
  parsedFgQr: ParsedFinishedGoodsQr | null;
  palletNumber: string;
  targetSlot: string;
  operatorNote: string;
  icStatus: ICStatus;
  effectiveBoxCount: number;
  boxCapacityInfo: BoxCapacityInfo;
  cartonStart: number;
  cartonEnd: number;
  scannedCartons?: ScannedCartonItem[];
  onRemoveScannedCarton?: (index: number) => void;
  onClearScannedCartons?: () => void;
  onSimulateScanNextBox?: () => void;
  onSimulateFill15Boxes?: () => void;
  isCameraEnabled: boolean;
  cameraActive: boolean;
  scanTargetField: 'product' | 'pallet' | 'rack' | null;
  isTargetSlotBlocked: boolean;
  targetSlotBlockedReason: string;
  onStartCameraForField: (field: 'product' | 'pallet' | 'rack') => void;
  onStopCamera: () => void;
  onChangePalletNumber: (val: string) => void;
  onChangeTargetSlot: (val: string) => void;
  onChangeOperatorNote: (val: string) => void;
  onChangeIcStatus: (status: ICStatus) => void;
  onChangeBoxCount: (count: number) => void;
  onSetCartonRange: (start: number, end: number) => void;
  onUseSampleQr: () => void;
  onSubmit: () => void;
}

export const InboundSimplePutawayView: React.FC<InboundSimplePutawayViewProps> = ({
  putawayOption = 'OPTION_1_RANGE',
  onChangePutawayOption,
  parsedFgQr,
  palletNumber,
  targetSlot,
  operatorNote,
  icStatus,
  effectiveBoxCount,
  boxCapacityInfo,
  cartonStart,
  cartonEnd,
  scannedCartons = [],
  onRemoveScannedCarton,
  onClearScannedCartons,
  onSimulateScanNextBox,
  onSimulateFill15Boxes,
  isCameraEnabled,
  cameraActive,
  scanTargetField,
  isTargetSlotBlocked,
  targetSlotBlockedReason,
  onStartCameraForField,
  onStopCamera,
  onChangePalletNumber,
  onChangeTargetSlot,
  onChangeOperatorNote,
  onChangeIcStatus,
  onChangeBoxCount,
  onSetCartonRange,
  onUseSampleQr,
  onSubmit,
}) => {
  const isOption2 = putawayOption === 'OPTION_2_SCAN_ALL';

  const canSubmit = Boolean(
    (isOption2 ? scannedCartons.length >= 2 && scannedCartons.length <= 15 : parsedFgQr) &&
    palletNumber.trim().length > 0 &&
    targetSlot.trim().length > 0 &&
    !isTargetSlotBlocked &&
    boxCapacityInfo.canSubmit
  );

  return (
    <div className="space-y-3.5 max-w-3xl mx-auto">
      {/* TAB PILIHAN METODE INBOUND: OPSI 1 (RENTANG BOX) vs OPSI 2 (SCAN ALLBOX) */}
      {onChangePutawayOption && (
        <div className="bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChangePutawayOption('OPTION_1_RANGE')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              !isOption2
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>Opsi 1: Rentang Box (Range Scan)</span>
          </button>
          <button
            type="button"
            onClick={() => onChangePutawayOption('OPTION_2_SCAN_ALL')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
              isOption2
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="flex items-center gap-1.5">
              <span>Opsi 2: Scan Per Box (1 s/d 15 Box)</span>
              {scannedCartons.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  scannedCartons.length === 15 ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
                }`}>
                  {scannedCartons.length}
                </span>
              )}
            </span>
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. INPUT PRODUK IC (OPSI 1 vs OPSI 2) */}
      {/* ============================================================== */}
      {!isOption2 ? (
        /* --- TAMPILAN OPSI 1: SCAN 1 QR & RENTANG KARTON --- */
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Input Produk IC (Scan QR / Kamera)
                </h3>
                <p className="text-xs text-slate-500">
                  Scan 1 QR box produk & tentukan rentang jumlah box (SOP Maks 15 Box)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onUseSampleQr}
                className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                <span>Contoh QR IC</span>
              </button>
              {isCameraEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    if (cameraActive && scanTargetField === 'product') {
                      onStopCamera();
                    } else {
                      onStartCameraForField('product');
                    }
                  }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    cameraActive && scanTargetField === 'product'
                      ? 'bg-rose-600 border-rose-600 text-white'
                      : 'bg-slate-900 border-slate-900 text-white hover:bg-black'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraActive && scanTargetField === 'product' ? 'Tutup Kamera' : 'Buka Kamera'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Informasi Produk Terbaca atau Placeholder */}
          {!parsedFgQr ? (
            <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-1">
              <QrCode className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                Belum ada produk IC yang di-scan
              </p>
              <p className="text-[11px] text-slate-500">
                Tembakkan scanner gun ke QR label produk, klik tombol Kamera di atas, atau klik "Contoh QR IC".
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 rounded-xl border border-emerald-200 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                    Produk IC Terverifikasi:
                  </span>
                  <h4 className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                    {parsedFgQr.productName}
                  </h4>
                </div>
                <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-300 text-emerald-900 shrink-0">
                  PIN #{parsedFgQr.productPin || '122'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Line & Batch</span>
                  <span className="font-bold text-slate-900">
                    {parsedFgQr.packingLineName} &bull; {parsedFgQr.batchNo}
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tgl Produksi</span>
                  <span className="font-semibold text-slate-800">
                    {parsedFgQr.productionDateFormatted || '-'}
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Best Before</span>
                  <span className="font-semibold text-slate-800">
                    {parsedFgQr.bestBeforeFormatted || '-'}
                  </span>
                </div>
                <div className="bg-white/90 p-2 rounded-lg border border-emerald-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">No. Karton QR</span>
                  <span className="font-mono font-bold text-emerald-900">
                    {parsedFgQr.cartonNumberFormatted || '-'}
                  </span>
                </div>
              </div>

              {/* Kontrol Jumlah Box & Rentang Karton */}
              <div className="pt-2 border-t border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black uppercase text-slate-800">
                    Jumlah Box per Pallet (Min 2, Maks 15 Box):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onChangeBoxCount(15);
                        if (parsedFgQr.cartonNumber) {
                          onSetCartonRange(Math.max(1, parsedFgQr.cartonNumber - 14), parsedFgQr.cartonNumber);
                        }
                      }}
                      className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700"
                    >
                      15 Box (Maks)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChangeBoxCount(10);
                        if (parsedFgQr.cartonNumber) {
                          onSetCartonRange(Math.max(1, parsedFgQr.cartonNumber - 9), parsedFgQr.cartonNumber);
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      10 Box
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChangeBoxCount(5);
                        if (parsedFgQr.cartonNumber) {
                          onSetCartonRange(Math.max(1, parsedFgQr.cartonNumber - 4), parsedFgQr.cartonNumber);
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      5 Box
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChangeBoxCount(2);
                        if (parsedFgQr.cartonNumber) {
                          onSetCartonRange(Math.max(1, parsedFgQr.cartonNumber - 1), parsedFgQr.cartonNumber);
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 cursor-pointer hover:bg-slate-100"
                    >
                      2 Box (Min)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-300 bg-white rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onChangeBoxCount(Math.max(1, effectiveBoxCount - 1))}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                      title="Kurangi Box"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={effectiveBoxCount || ''}
                      onChange={(e) => onChangeBoxCount(parseInt(e.target.value, 10) || 0)}
                      className="w-16 text-center font-mono font-black text-base py-1.5 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => onChangeBoxCount(effectiveBoxCount + 1)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                      title="Tambah Box"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-600 flex-1">
                    {cartonStart > 0 && cartonEnd > 0 ? (
                      <span>
                        Rentang Karton: <strong className="font-mono text-slate-900">D{String(cartonStart).padStart(3, '0')} - D{String(cartonEnd).padStart(3, '0')}</strong>
                      </span>
                    ) : (
                      <span>Jumlah muatan aktif: <strong className="text-slate-900 font-bold">{effectiveBoxCount} Box</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pilihan Status IC */}
              <div className="pt-1.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-bold text-slate-700">Status IC Produk:</span>
                <div className="flex items-center gap-1.5">
                  {(['OK', 'HOLD', 'BO'] as ICStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => onChangeIcStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition cursor-pointer border ${
                        icStatus === st
                          ? st === 'OK'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : st === 'HOLD'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st === 'OK' ? 'OK (Normal)' : st === 'HOLD' ? 'HOLD (QC)' : 'BO (Rework)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* --- TAMPILAN OPSI 2: SCAN SEMUA BOX (1 s/d MAKS 15 BOX SECARA BERTAHAP) --- */
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
                1
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Scan QR Box Satu per Satu
                  </h3>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    scannedCartons.length === 15
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : scannedCartons.length >= 2 && scannedCartons.length < 15
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : scannedCartons.length > 15
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {scannedCartons.length} / 15 Box
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan 1 data masuk, scan 2 data masuk dst sampai dengan maks 15 box. Review list box di bawah sebelum input No Pallet & No Rak.
                </p>
              </div>
            </div>

            {isCameraEnabled && (
              <button
                type="button"
                onClick={() => {
                  if (cameraActive) {
                    onStopCamera();
                  } else {
                    onStartCameraForField('product');
                  }
                }}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                  cameraActive
                    ? 'bg-rose-600 border-rose-600 text-white'
                    : 'bg-slate-900 border-slate-900 text-white hover:bg-black'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraActive ? 'Stop Kamera' : 'Buka Kamera'}</span>
              </button>
            )}
          </div>

          {/* Banner Status Box Real-Time */}
          <div className={`p-3 rounded-lg border flex items-center justify-between flex-wrap gap-2 text-xs transition ${
            scannedCartons.length === 15
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : scannedCartons.length >= 2 && scannedCartons.length < 15
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : scannedCartons.length > 15
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                scannedCartons.length === 15
                  ? 'bg-emerald-500'
                  : scannedCartons.length >= 2
                  ? 'bg-amber-500'
                  : scannedCartons.length === 1
                  ? 'bg-blue-500'
                  : 'bg-slate-400'
              }`}></span>
              <span className="font-semibold">
                {scannedCartons.length === 0
                  ? 'Siap Scan: Arahkan scanner / kamera ke QR Code Box ke-1'
                  : scannedCartons.length === 15
                  ? 'Maksimal 15 Box Terpenuhi (Pallet Penuh Sesuai SOP). Kamera otomatis menutup. Silakan review list box di bawah, lalu input Nomor Pallet & Nomor Rak.'
                  : scannedCartons.length >= 2
                  ? `Tersimpan ${scannedCartons.length} Box (Min 2 terpenuhi). Kamera tetap aktif, silakan lanjut scan box berikutnya s/d box ke-15.`
                  : `Baru 1 Box tersimpan. Kamera tetap aktif, silakan lanjut scan box ke-2 s/d box ke-15.`}
              </span>
            </div>
            {scannedCartons.length > 0 && onClearScannedCartons && (
              <button
                type="button"
                onClick={onClearScannedCartons}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset List Box</span>
              </button>
            )}
          </div>

          {/* LIST BOX DIBAGIAN BAWAH: OTOMATIS TAMPIL SAAT SCAN QR BOX 1 */}
          {scannedCartons.length > 0 ? (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-500" />
                  Daftar Review Box Fisik ({scannedCartons.length} / 15 Box):
                </span>
                <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                  scannedCartons.length === 15 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {15 - scannedCartons.length > 0 ? `Sisa slot: ${15 - scannedCartons.length} box` : 'Pallet Penuh (Maks 15 Box)'}
                </span>
              </div>

              {/* Panduan Review & Ganti Box */}
              <div className="p-2 bg-blue-50/70 border border-blue-200/80 rounded-lg flex items-center justify-between gap-2 text-xs text-blue-900">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    <strong>Review Box:</strong> Jika ada box yang tidak sesuai atau salah tembak, klik <strong>Hapus</strong> pada baris terkait lalu scan kembali box pengganti yang benar.
                  </span>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                {scannedCartons.map((item, idx) => (
                  <div
                    key={`${item.rawCode}-${idx}`}
                    className="p-2 sm:px-3 flex items-center justify-between gap-2 hover:bg-slate-50/80 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {item.cartonFormatted || `D${String(item.cartonNumber).padStart(3, '0')}`}
                        </span>
                        <span className="text-slate-400 ml-2 hidden sm:inline text-[11px]">
                          Batch {item.batchNo} · {item.scannedAt}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        ✓ Terinput
                      </span>
                      {onRemoveScannedCarton && (
                        <button
                          type="button"
                          onClick={() => onRemoveScannedCarton(idx)}
                          className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 hover:border-rose-300 rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shadow-2xs"
                          title="Hapus box ini untuk scan kembali box pengganti yang benar"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center space-y-1">
              <QrCode className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-700">
                Belum ada data scan box
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Scan QR Code box 1 fisik, daftar box otomatis akan tertampil di sini. Operator cukup scan berturut-turut sampai maks 15 box.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. SCAN NO PALET */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
              2
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Scan Nomor Pallet
              </h3>
              <p className="text-xs text-slate-500">
                Standar nomor pallet bebas sesuai QR code fisik (contoh: FG-383, K-717, B-383, M-444, H-339, SM-123 dsb)
              </p>
            </div>
          </div>
        </div>

        {/* Status petunjuk progresif Opsi 2: Fokus scan box dulu sampai minimal 2 box */}
        {isOption2 && scannedCartons.length < 2 && (
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Langkah input nomor pallet ini akan aktif setelah Anda memindai minimal 2 s/d 15 box fisik di Langkah 1.
            </span>
          </div>
        )}

        {isOption2 && scannedCartons.length >= 2 && (
          <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {scannedCartons.length === 15
                ? '✓ Kuota 15 Box Terpenuhi (Pallet Penuh). Silakan scan atau masukkan Nomor Pallet di bawah.'
                : `✓ ${scannedCartons.length} Box telah terinput. Anda dapat lanjut scan box berikutnya s/d 15 box ATAU masukkan Nomor Pallet sekarang.`}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={palletNumber}
              onChange={(e) => onChangePalletNumber(e.target.value.toUpperCase())}
              placeholder="Scan QR pallet (contoh: FG-383, K-717, B-383)..."
              className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-base text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 uppercase placeholder:font-normal placeholder:text-slate-400"
            />
          </div>
          {isCameraEnabled && (
            <button
              type="button"
              onClick={() => {
                if (cameraActive && scanTargetField === 'pallet') {
                  onStopCamera();
                } else {
                  onStartCameraForField('pallet');
                }
              }}
              className={`h-11 px-3 rounded-lg border font-semibold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                cameraActive && scanTargetField === 'pallet'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-slate-900 border-slate-900 text-white hover:bg-black'
              }`}
              title="Buka kamera untuk scan barcode/QR nomor pallet"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{cameraActive && scanTargetField === 'pallet' ? 'Stop' : 'Scan Pallet'}</span>
            </button>
          )}
        </div>

        {/* Status Kualitas IC (OK / HOLD / BO) untuk Pallet Ini */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <span className="text-slate-600 font-semibold">Status Kualitas IC Pallet:</span>
          <div className="flex items-center gap-1.5">
            {(['OK', 'HOLD', 'BO'] as ICStatus[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => onChangeIcStatus(st)}
                className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer border transition ${
                  icStatus === st
                    ? st === 'OK' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Indikator Status Kapasitas Box Pallet (Hijau / Kuning / Merah) */}
        <div className={`p-3 rounded-lg border text-xs flex flex-col gap-2 transition ${boxCapacityInfo.cardBg}`}>
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0">
              {boxCapacityInfo.status === 'MAX_15' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              {boxCapacityInfo.status === 'UNDER_15' && (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              {boxCapacityInfo.status === 'OVER_15' && (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
              {boxCapacityInfo.status === 'BELOW_MIN_2' && (
                <AlertCircle className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${boxCapacityInfo.badgeBg}`}>
                  {boxCapacityInfo.label}
                </span>
                <span className="font-mono font-semibold text-slate-700">
                  {effectiveBoxCount} / 15 Box
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 font-medium">
                {boxCapacityInfo.hint}
              </p>
            </div>
          </div>

          {/* Mini Visual Progress Bar Kapasitas Pallet 0/15 */}
          <div className="space-y-1 pt-1 border-t border-slate-200/50">
            <div className="w-full h-2 bg-slate-200/70 rounded-full overflow-hidden flex">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  effectiveBoxCount === 15
                    ? 'bg-emerald-500'
                    : effectiveBoxCount >= 2 && effectiveBoxCount < 15
                    ? 'bg-amber-500'
                    : effectiveBoxCount > 15
                    ? 'bg-rose-500'
                    : 'bg-slate-400'
                }`}
                style={{ width: `${Math.min(100, (effectiveBoxCount / 15) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>0 Box</span>
              <span className="font-semibold text-amber-700">Min 2 Box</span>
              <span className="font-semibold text-emerald-700">Maks 15 Box</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SCAN NOMOR RAK */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-xs font-mono font-bold">
              3
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Scan Nomor Rak
              </h3>
              <p className="text-xs text-slate-500">
                Scan sticker QR tiang rak atau ketik kode slot (contoh: A1a, B2b, F3a)
              </p>
            </div>
          </div>
        </div>

        {/* Status petunjuk progresif Opsi 2 */}
        {isOption2 && scannedCartons.length < 2 && (
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Langkah input nomor rak ini akan aktif setelah Anda memindai minimal 2 s/d 15 box fisik di Langkah 1.
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={targetSlot}
              onChange={(e) => onChangeTargetSlot(e.target.value)}
              placeholder="Contoh: A1a, B2b, F3a..."
              className={`w-full h-11 px-3.5 bg-white border rounded-lg font-mono font-bold text-base uppercase placeholder:font-normal placeholder:text-slate-400 ${
                isTargetSlotBlocked
                  ? 'border-rose-400 text-rose-900 bg-rose-50/50'
                  : 'border-slate-300 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
              }`}
            />
          </div>
          {isCameraEnabled && (
            <button
              type="button"
              onClick={() => {
                if (cameraActive && scanTargetField === 'rack') {
                  onStopCamera();
                } else {
                  onStartCameraForField('rack');
                }
              }}
              className={`h-11 px-3 rounded-lg border font-semibold text-xs flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                cameraActive && scanTargetField === 'rack'
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-slate-900 border-slate-900 text-white hover:bg-black'
              }`}
              title="Buka kamera untuk scan QR slot rak"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{cameraActive && scanTargetField === 'rack' ? 'Stop' : 'Scan Rak'}</span>
            </button>
          )}
        </div>

        {/* Status Validasi Slot Rak */}
        {isTargetSlotBlocked && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase block">SLOT TERKENDALA (DIBLOKIR):</span>
              <span className="font-medium">
                Slot {targetSlot} mengalami kendala fisik: "{targetSlotBlockedReason}". Pallet IC tidak dapat disimpan ke slot ini!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4. CATATAN OPERATOR (OPSIONAL) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-2">
        <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
          Catatan / Note Operator (Opsional):
        </label>
        <input
          type="text"
          value={operatorNote}
          onChange={(e) => onChangeOperatorNote(e.target.value)}
          placeholder="Contoh: Kondisi karton baik, segel QC utuh..."
          className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-800 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* 5. SUMMARY DATA PRODUK, NOMOR PALLET, DAN NOMOR RAK */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 border border-slate-800 shadow-sm space-y-3">
        <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wider text-slate-200">
              Ringkasan Data Inbound Pallet
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {canSubmit ? '✓ Siap Simpan' : 'Menunggu Lengkap'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Summary Data Produk */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Data Produk IC
            </span>
            <div className="font-bold text-white text-sm truncate">
              {parsedFgQr ? parsedFgQr.productName : <span className="text-slate-500 font-normal italic">(Belum di-scan)</span>}
            </div>
            <div className="text-slate-400 text-xs">
              {parsedFgQr ? `Batch ${parsedFgQr.batchNo}` : '-'}
            </div>
            <div className="text-xs text-emerald-400 font-mono">
              Status IC: <strong>{icStatus}</strong>
            </div>
          </div>

          {/* Summary Nomor Pallet */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Nomor Pallet
            </span>
            <div className="font-mono font-bold text-white text-sm">
              {palletNumber || <span className="text-slate-500 font-normal italic font-sans">(Belum di-scan)</span>}
            </div>
            <div className="text-slate-300 text-xs">
              Muatan: {effectiveBoxCount} Box
            </div>
            <div className="pt-0.5">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                effectiveBoxCount === 15
                  ? 'bg-emerald-500 text-white'
                  : effectiveBoxCount >= 2 && effectiveBoxCount < 15
                  ? 'bg-amber-500 text-slate-950'
                  : effectiveBoxCount > 15
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {effectiveBoxCount === 15
                  ? 'Hijau (Maks 15 Box)'
                  : effectiveBoxCount >= 2 && effectiveBoxCount < 15
                  ? 'Kuning (Bisa Diinput)'
                  : effectiveBoxCount > 15
                  ? 'Merah (Melebihi Kapasitas)'
                  : 'Kurang Box'}
              </span>
            </div>
          </div>

          {/* Summary Nomor Rak */}
          <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Nomor Rak Tujuan
            </span>
            <div className="font-mono font-bold text-emerald-400 text-sm">
              {targetSlot || <span className="text-slate-500 font-normal italic font-sans">(Belum di-scan)</span>}
            </div>
            <div className="text-slate-300 text-xs">
              Kondisi: {targetSlot ? (isTargetSlotBlocked ? <span className="text-rose-400 font-bold">Diblokir</span> : <span className="text-emerald-400 font-bold">Siap Pakai</span>) : '-'}
            </div>
            {operatorNote && (
              <div className="text-[11px] text-slate-400 truncate italic">
                Note: {operatorNote}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. TOMBOL KONFIRMASI SIMPAN KE RAK */}
      <div>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition ${
            canSubmit
              ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer shadow-xs'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>
            {!parsedFgQr
              ? 'Scan Produk IC Terlebih Dahulu'
              : !palletNumber.trim()
              ? 'Scan Nomor Pallet Terlebih Dahulu'
              : !targetSlot.trim()
              ? 'Scan Nomor Rak Terlebih Dahulu'
              : effectiveBoxCount > 15
              ? 'Melebihi 15 Box (Tidak Dapat Masuk ke Rak)'
              : effectiveBoxCount < 2
              ? 'Minimal 2 Box per Pallet'
              : isTargetSlotBlocked
              ? 'Slot Terkendala (Pilih Slot Lain)'
              : `Konfirmasi Simpan ke Rak ${targetSlot} (Pallet ${palletNumber})`}
          </span>
        </button>
      </div>
    </div>
  );
};
