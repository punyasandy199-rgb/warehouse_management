/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Box, 
  Layers, 
  Calendar, 
  User, 
  QrCode, 
  Barcode,
  Printer, 
  ArrowRightLeft, 
  CheckCircle2, 
  AlertTriangle,
  Trash2,
  Check,
  Copy,
  Scan
} from 'lucide-react';
import { RackSlot, UserRole, ProductItem, ICStatus } from '../types';
import { BarcodeRenderer, QrCodeRenderer } from './BarcodeRenderer';
import { formatDateDDMMYYYY } from '../utils/dateFormat';

interface SlotDetailModalProps {
  slot: RackSlot | null;
  onClose: () => void;
  userRole: UserRole;
  onStartPutaway: (slotCode: string) => void;
  onStartPicking: (slotCode: string) => void;
  onStartRelocate: (sourceSlotCode: string, targetSlotCode: string, note?: string, newIcStatus?: ICStatus) => void;
  onVerifyAudit: (slotCode: string) => void;
  onPrintLabel: (slotCode: string, pallet?: any) => void;
  availableEmptySlots: string[];
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  slot,
  onClose,
  userRole,
  onStartPutaway,
  onStartPicking,
  onStartRelocate,
  onVerifyAudit,
  onPrintLabel,
  availableEmptySlots
}) => {
  const [isRelocating, setIsRelocating] = useState(false);
  const [targetRelocateSlot, setTargetRelocateSlot] = useState(availableEmptySlots[0] || '');
  const [relocateOption, setRelocateOption] = useState<'STAY' | 'MOVE'>('STAY');
  const [modalIcStatus, setModalIcStatus] = useState<ICStatus>(slot?.pallet?.icStatus || 'OK');
  // Default to QR Code as requested by user ("barcode label pallet fisik bisa dibantu rubah ke QR Code")
  const [codeType, setCodeType] = useState<'qr' | 'barcode'>('qr');
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync modalIcStatus when slot changes
  React.useEffect(() => {
    if (slot?.pallet?.icStatus) {
      setModalIcStatus(slot.pallet.icStatus);
    } else {
      setModalIcStatus('OK');
    }
  }, [slot]);

  if (!slot) return null;

  const isBlocked = !!slot.isBlocked || slot.status === 'maintenance';
  const isOccupied = slot.status === 'occupied' && slot.pallet;
  const canOperate = userRole === 'admin' || userRole === 'operator';
  const canAudit = userRole === 'admin' || userRole === 'supervisor' || userRole === 'superadmin';

  const handleRelocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dest = relocateOption === 'STAY' ? slot.slotCode : targetRelocateSlot;
    if (!dest) return;
    onStartRelocate(slot.slotCode, dest, undefined, modalIcStatus);
    setIsRelocating(false);
    onClose();
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl w-[96vw] max-w-lg shadow-2xl border border-slate-200 flex flex-col max-h-[88dvh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 font-black text-base sm:text-xl font-mono flex items-center justify-center shadow-md shrink-0">
              {slot.slotCode}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-lg text-white truncate">Detail Lokasi Rak Pallet</h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    isBlocked
                      ? 'bg-amber-400 text-slate-950'
                      : isOccupied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {isBlocked ? 'TERKENDALA' : isOccupied ? 'TERISI' : 'KOSONG'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                Level {slot.level} &bull; Bay {slot.bay.toUpperCase()} &bull; Kapasitas: 4 Pallet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Tutup Jendela"
          >
            <X className="w-4 h-4 stroke-[3]" />
            <span>TUTUP</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          {isOccupied && slot.pallet ? (
            <div className="space-y-4">
              {/* Product Card */}
              <div className="p-4 bg-gradient-to-br from-cyan-50/70 to-sky-50/50 rounded-2xl border border-cyan-200/80 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider bg-cyan-100 px-2 py-0.5 rounded">
                    {slot.pallet.itemCode}
                  </span>

                  {/* Penanda Status IC dengan titik kedip */}
                  {slot.pallet.icStatus === 'BO' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-black shadow-2xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                      </span>
                      <span>STATUS IC: BO (REWORK KE PACKING)</span>
                    </span>
                  ) : slot.pallet.icStatus === 'HOLD' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 border border-blue-300 text-blue-800 text-xs font-black shadow-2xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                      </span>
                      <span>STATUS IC: HOLD (QC INSPECTION)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold">
                      <Check className="w-3.5 h-3.5" />
                      <span>STATUS IC: OK (NORMAL)</span>
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-slate-900 mt-1">{slot.pallet.itemName}</h4>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-cyan-200/60">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Jumlah Muatan</span>
                    <span className="text-xl font-black font-mono text-emerald-700">
                      {slot.pallet.quantityBox} BOX
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Nomor Batch FG</span>
                    <span className="text-sm font-bold font-mono text-slate-800">
                      {slot.pallet.batchNo}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detail Metrics with DD-MM-YYYY Date Format */}
              <div className="grid grid-cols-2 gap-3 text-xs font-medium text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold tracking-wider">TGL PRODUKSI (DD-MM-YYYY)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatDateDDMMYYYY(slot.pallet.productionDate)}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold tracking-wider">TGL KADALUARSA (DD-MM-YYYY)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatDateDDMMYYYY(slot.pallet.expiryDate)}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold tracking-wider">WAKTU MASUK (INBOUND)</span>
                  <span className="font-mono font-semibold text-slate-800 text-xs">
                    {formatDateDDMMYYYY(slot.pallet.inboundDate)}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                  <span className="text-slate-400 block text-[10px] font-bold tracking-wider">OPERATOR INBOUND</span>
                  <span className="font-semibold text-slate-800 text-xs">
                    {slot.pallet.inboundBy || '-'}
                  </span>
                </div>
              </div>

              {/* QR Code / Barcode Label Pallet Fisik (Diubah ke QR Code & 100% Bisa Di-scan) */}
              <div className="p-4 bg-white rounded-2xl border-2 border-slate-200 text-center space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 text-left">
                    <QrCode className="w-4 h-4 text-cyan-600" />
                    <div>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                        QR Code Label Pallet Fisik
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Standar ISO 18004 (Siap Di-scan Kamera & Gun)
                      </span>
                    </div>
                  </div>

                  {/* Toggle QR vs Barcode 1D */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCodeType('qr')}
                      className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        codeType === 'qr'
                          ? 'bg-cyan-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Code</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeType('barcode')}
                      className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                        codeType === 'barcode'
                          ? 'bg-cyan-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Barcode className="w-3.5 h-3.5" />
                      <span>Barcode 1D</span>
                    </button>
                  </div>
                </div>

                {/* Render Code */}
                {codeType === 'qr' ? (
                  <div className="flex flex-col items-center justify-center py-1">
                    <div className="p-2.5 bg-white border-2 border-slate-900 rounded-2xl shadow-sm">
                      <QrCodeRenderer 
                        value={slot.pallet.palletId} 
                        size={140} 
                        level="M" 
                        includeMargin={true}
                        noBorder={true}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="font-mono font-black text-base text-slate-900 tracking-wider bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        {slot.pallet.palletId}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(slot.pallet?.palletId || '')}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                        title="Salin Kode Pallet"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <BarcodeRenderer value={slot.pallet.palletId} width={280} height={55} showText={true} />
                  </div>
                )}

                <div className="bg-cyan-50/70 p-2 rounded-xl border border-cyan-100 text-[11px] text-cyan-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Scan className="w-3.5 h-3.5 text-cyan-600" />
                    Format Kode: <strong>{slot.pallet.palletId}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onPrintLabel(slot.slotCode, slot.pallet)}
                    className="text-cyan-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    Cetak Ukuran Thermal
                  </button>
                </div>
              </div>

              {/* Audit Status */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  {slot.pallet.isVerifiedAudit ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <span className="font-semibold text-slate-700">
                    Status Audit: {slot.pallet.isVerifiedAudit ? 'Sudah Diverifikasi 100%' : 'Menunggu Verifikasi'}
                  </span>
                </div>
                {canAudit && !slot.pallet.isVerifiedAudit && (
                  <button
                    onClick={() => {
                      onVerifyAudit(slot.slotCode);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                  >
                    Verifikasi Sekarang
                  </button>
                )}
              </div>

              {/* Relocate / Update Status IC Form */}
              {isRelocating ? (
                <form onSubmit={handleRelocateSubmit} className="p-4 bg-amber-50 rounded-2xl border border-amber-300 space-y-3.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                      <span>Pemindahan Rak & Perubahan Status IC</span>
                    </h5>
                    <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded">
                      Slot Asal: {slot.slotCode}
                    </span>
                  </div>

                  {/* Pilihan Status IC Baru */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Status IC (Kualitas Pallet):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setModalIcStatus('OK')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                          modalIcStatus === 'OK'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>OK (Normal)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalIcStatus('HOLD')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                          modalIcStatus === 'HOLD'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                        </span>
                        <span>HOLD</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalIcStatus('BO')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                          modalIcStatus === 'BO'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        <span>BO</span>
                      </button>
                    </div>
                  </div>

                  {/* Pilihan Aksi: Rak Tetap vs Pindah Slot */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      Tindakan Fisik Rak:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRelocateOption('STAY')}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          relocateOption === 'STAY'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Rak Tetap ({slot.slotCode})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRelocateOption('MOVE')}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          relocateOption === 'MOVE'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Pindah ke Slot Lain
                      </button>
                    </div>
                  </div>

                  {relocateOption === 'MOVE' && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 block">Pilih Slot Tujuan:</label>
                      <select
                        value={targetRelocateSlot}
                        onChange={(e) => setTargetRelocateSlot(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800"
                      >
                        {availableEmptySlots.map(s => (
                          <option key={s} value={s}>Slot Kosong {s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRelocating(false)}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 cursor-pointer shadow-xs"
                    >
                      {relocateOption === 'STAY' ? 'Simpan Status (Rak Tetap)' : 'Pindahkan Pallet'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          ) : isBlocked ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="text-base font-black text-slate-900">Slot Terkendala di Lapangan</h4>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-left max-w-sm mx-auto space-y-1 text-xs">
                <span className="font-bold text-amber-950 block">Keterangan Kendala Fisik:</span>
                <p className="text-amber-900 font-semibold">{slot.blockReason || 'Tiang rusak / terhalang fisik di lapangan'}</p>
                {slot.blockedAt && (
                  <span className="text-[10px] text-slate-500 block">
                    Dilaporkan pada: {formatDateDDMMYYYY(slot.blockedAt)} {slot.blockedBy ? `oleh ${slot.blockedBy}` : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-rose-700 font-bold max-w-xs mx-auto">
                Slot ini DIBLOKIR dari penyimpanan pallet IC. Hubungi SPV / Admin untuk memeriksa fisik dan mengaktifkan kembali di Data Master Rak.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto">
                <Box className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Slot Ini Masih Kosong</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Slot rak {slot.slotCode} siap ditempati oleh pallet produk barang jadi baru melalui proses Putaway scanner. Kapasitas: 4 pallet.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex flex-wrap gap-2 justify-end border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-500" />
              <span>Tutup</span>
            </button>

            <button
              type="button"
              onClick={() => onPrintLabel(slot.slotCode, slot.pallet)}
              className="px-4 py-2 rounded-xl bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 font-bold text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs"
              title="Hubungkan ke Printer & Cetak Label Thermal / Barcode"
            >
              <Printer className="w-4 h-4 text-cyan-600" />
              <span>Cetak Label & Sambung Printer</span>
            </button>

            {isOccupied ? (
              canOperate && (
                <>
                  <button
                    onClick={() => setIsRelocating(true)}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Pindah Slot
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Picking (keluarkan) pallet dari slot ${slot.slotCode}?`)) {
                        onStartPicking(slot.slotCode);
                        onClose();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Picking (Ambil Pallet)
                  </button>
                </>
              )
            ) : isBlocked ? (
              <div className="px-4 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Pengisian Pallet Diblokir</span>
              </div>
            ) : (
              canOperate && (
                <button
                  onClick={() => {
                    onStartPutaway(slot.slotCode);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Box className="w-4 h-4" />
                  Simpan Barang (Putaway)
                </button>
              )
            )}
          </div>
        </div>

        {/* Sticky Footer with Easy Close Button for Mobile Screens */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 shrink-0 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 font-mono font-bold">Slot {slot.slotCode}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup Jendela</span>
          </button>
        </div>
      </div>
    </div>
  );
};
