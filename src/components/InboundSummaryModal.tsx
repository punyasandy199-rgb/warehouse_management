/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  CheckCircle2, 
  X, 
  Package, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  Layers, 
  Printer, 
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { InboundNotification } from '../types';

interface InboundSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InboundNotification | null;
  onNextPallet?: () => void;
}

export const InboundSummaryModal: React.FC<InboundSummaryModalProps> = ({
  isOpen,
  onClose,
  data,
  onNextPallet
}) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 sm:p-6 text-white flex items-start justify-between relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
              <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/20 text-emerald-100">
                  Transaksi Inbound Berhasil
                </span>
                <span className="text-xs font-mono text-emerald-100/90">
                  {new Date(data.createdAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
                Summary Hasil Inbound 1 Pallet
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer relative z-10"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative ambient bubble */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Top Key Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Nomor Pallet */}
            <div className="p-3.5 bg-cyan-50/70 border-2 border-cyan-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-800 block mb-0.5">
                Nomor Pallet
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-slate-900 block truncate">
                {data.palletNumber}
              </span>
              <span className="text-[10px] font-bold text-cyan-700">
                Format Standar KP
              </span>
            </div>

            {/* Slot Rak Tujuan */}
            <div className="p-3.5 bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">
                Lokasi Slot Rak
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-emerald-950 block truncate">
                {data.slotCode}
              </span>
              <span className="text-[10px] font-bold text-emerald-700">
                Tersimpan di Gudang
              </span>
            </div>

            {/* Total Box */}
            <div className="p-3.5 bg-amber-50/70 border-2 border-amber-200 rounded-2xl col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-0.5">
                Muatan Pallet
              </span>
              <span className="text-xl sm:text-2xl font-mono font-black text-amber-950 block truncate">
                {data.quantityBox} BOX
              </span>
              <span className="text-[10px] font-bold text-amber-700">
                {data.cartonRangeText}
              </span>
            </div>
          </div>

          {/* Detailed Data Table / Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Detail Produk & Spesifikasi Manufaktur
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Nama Produk</span>
                <span className="text-slate-900 font-extrabold text-sm">{data.itemName}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Kode Item (SKU)</span>
                <span className="font-mono font-bold text-slate-800">{data.itemCode}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Nomor Batch</span>
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block font-mono">
                  Batch {data.batchNo}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Rentang Nomor Box Karton</span>
                <span className="font-mono font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block text-amber-950">
                  {data.cartonRangeText}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Tanggal & Waktu Produksi</span>
                <span className="font-bold text-slate-900 flex items-center gap-1.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {data.productionDate} • {data.productionTime || '14:35 WIB'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Best Before / Expire Date</span>
                <span className="font-mono font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300 inline-block">
                  {data.expiryDate}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Status IC (Inspection & Control)</span>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black ${
                    data.icStatus === 'BO'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : data.icStatus === 'HOLD'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {data.icStatus === 'BO' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                    {data.icStatus === 'HOLD' && <AlertCircle className="w-3 h-3 text-blue-600" />}
                    {data.icStatus === 'OK' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    {data.icStatus} {data.icStatus === 'BO' ? '(Rework)' : data.icStatus === 'HOLD' ? '(Hold QC)' : '(Normal)'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] font-semibold">Operator Penerima (PIC)</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {data.operatorName || 'Operator WMS'}
                </span>
              </div>

              {data.notes && (
                <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-200">
                  <span className="text-slate-400 block text-[11px] font-semibold">Catatan Operator</span>
                  <span className="italic text-slate-700">{data.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sync & Cloud Broadcast Info */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Notifikasi inbound ini otomatis disiarkan secara *real-time* ke seluruh dashboard Admin & Super Admin yang sedang online di komputer lain.
            </span>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 sm:p-5 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Bukti Inbound</span>
          </button>

          <div className="flex items-center gap-2">
            {onNextPallet && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNextPallet();
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <span>Input Pallet Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Tutup / Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
