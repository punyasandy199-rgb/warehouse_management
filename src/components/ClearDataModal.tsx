/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  RotateCcw, 
  Trash2, 
  Boxes, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Database,
  RefreshCw,
  X,
  Layers,
  Inbox
} from 'lucide-react';
import { RackData } from '../types';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: Record<string, RackData>;
  onClearForSimulation: (targetRackId?: string) => void;
  onLoadDemoData: () => void;
  onFactoryReset: () => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  racks,
  onClearForSimulation,
  onLoadDemoData,
  onFactoryReset
}) => {
  const [selectedMode, setSelectedMode] = useState<'simulation' | 'demo' | 'factory'>('simulation');
  const [targetRackToClear, setTargetRackToClear] = useState<string>('ALL');
  const [isConfirming, setIsConfirming] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate current warehouse stats
  let totalSlots = 0;
  let occupiedSlots = 0;
  let totalBoxInRacks = 0;

  Object.values(racks).forEach(rack => {
    Object.values(rack.slots).forEach(slot => {
      totalSlots++;
      if (slot.status === 'occupied') {
        occupiedSlots++;
        if (slot.pallet) {
          totalBoxInRacks += slot.pallet.quantityBox || 0;
        }
      }
    });
  });

  const emptySlots = totalSlots - occupiedSlots;

  const handleExecute = () => {
    if (selectedMode === 'simulation') {
      onClearForSimulation(targetRackToClear);
      const targetLabel = targetRackToClear === 'ALL' ? 'semua rak' : `Rak ${targetRackToClear}`;
      setActionSuccessNotice(`Stok IC pada ${targetLabel} berhasil dikosongkan (0 Box). Master data rak tetap utuh 100%!`);
    } else if (selectedMode === 'demo') {
      onLoadDemoData();
      setActionSuccessNotice('Data demo contoh pallet berhasil dimuat kembali ke rak.');
    } else if (selectedMode === 'factory') {
      onFactoryReset();
    }

    setTimeout(() => {
      setActionSuccessNotice(null);
      setIsConfirming(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <RotateCcw className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-md border border-blue-400/30">
                Pusat Simulasi SIKUTANG WMS
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Reset & Kosongkan Data Gudang
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Siapkan sistem untuk pengujian dan simulasi alur operasional: Penerimaan (Proses In), Penempatan Rak, Stock Opname, dan Pengeluaran FEFO.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {actionSuccessNotice ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-500 text-center space-y-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-black text-emerald-950">Berhasil Dijalankan!</h4>
              <p className="text-xs text-emerald-800 font-semibold leading-relaxed">
                {actionSuccessNotice}
              </p>
            </div>
          ) : (
            <>
              {/* Current Status Overview */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-2">
                  Kondisi Stok Rak Gudang Saat Ini:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block">Total Slot Rak</span>
                    <span className="text-base font-black text-slate-900 font-mono">{totalSlots}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block">Slot Terisi (Occupied)</span>
                    <span className="text-base font-black text-blue-600 font-mono">{occupiedSlots}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block">Total Box di Rak</span>
                    <span className="text-base font-black text-emerald-600 font-mono">{totalBoxInRacks} BOX</span>
                  </div>
                </div>
              </div>

              {/* Options Selection */}
              <div className="space-y-3">
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Pilih Tindakan Reset:
                </span>

                {/* Option 1: Clean Warehouse for Simulation (RECOMMENDED) */}
                <div
                  onClick={() => setSelectedMode('simulation')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col gap-3 ${
                    selectedMode === 'simulation'
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2 rounded-xl mt-0.5 ${
                      selectedMode === 'simulation' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">
                          Kosongkan Stok IC Rak (Master Data Rak Tetap Utuh)
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          Rekomendasi
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Hanya mengosongkan stok pallet IC (menjadi 0 Box). <strong>Master data rak yang sudah dibuat (layout, jumlah slot, dan tingkat level) TIDAK AKAN HILANG.</strong>
                      </p>
                      <div className="pt-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Master Data Rak, Master Produk, Akun & Staging Area 100% AMAN.</span>
                      </div>
                    </div>
                  </div>

                  {/* Pilihan Rak yang Mau Dikosongkan */}
                  {selectedMode === 'simulation' && (
                    <div className="mt-1 pt-3 border-t border-blue-200/60 space-y-2 bg-white/70 p-3 rounded-xl border border-blue-200">
                      <label className="block text-xs font-black text-slate-800 flex items-center justify-between">
                        <span>Pilih Target Rak yang Dikosongkan:</span>
                        <span className="text-[10px] text-blue-700 font-mono font-bold">
                          {targetRackToClear === 'ALL' ? 'Semua Rak Fisik' : `Hanya Rak ${targetRackToClear}`}
                        </span>
                      </label>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTargetRackToClear('ALL');
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                            targetRackToClear === 'ALL'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          Semua Rak (Semua Stok IC)
                        </button>

                        {Object.keys(racks).map(rackId => {
                          const occCount = Object.values(racks[rackId].slots).filter(s => s.status === 'occupied').length;
                          return (
                            <button
                              key={rackId}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTargetRackToClear(rackId);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                targetRackToClear === rackId
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <span>Rak {rackId}</span>
                              <span className={`text-[9px] px-1 rounded ${targetRackToClear === rackId ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {occCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Option 2: Restore Sample Demo Pallets */}
                <div
                  onClick={() => setSelectedMode('demo')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex items-start gap-3.5 ${
                    selectedMode === 'demo'
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    selectedMode === 'demo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-black text-slate-900">
                      Muat Contoh Data Demo (Sample Pallets)
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Mengisi kembali beberapa slot di Rak A dan B dengan contoh Finished Goods untuk demonstrasi Outbound atau Stock Opname.
                    </p>
                  </div>
                </div>

                {/* Option 3: Factory Reset */}
                <div
                  onClick={() => setSelectedMode('factory')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative flex items-start gap-3.5 ${
                    selectedMode === 'factory'
                      ? 'border-rose-600 bg-rose-50/70 shadow-sm ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${
                    selectedMode === 'factory' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-black text-slate-900">
                      Factory Reset Total
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Mereset seluruh localStorage browser kembali ke setelan default awal pabrik.
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirmation Alert */}
              {isConfirming && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 animate-in fade-in duration-150">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs text-amber-950">
                    <span className="font-extrabold block">Konfirmasi Tindakan:</span>
                    <p>
                      {selectedMode === 'simulation' && 'Seluruh slot rak akan dikosongkan (0 Box). Anda siap mencoba proses Inbound mulai dari scan QR karton ke rak.'}
                      {selectedMode === 'demo' && 'Contoh pallet Finished Goods akan dimuat kembali ke beberapa slot rak.'}
                      {selectedMode === 'factory' && 'Semua data akan di-reset penuh ke kondisi awal bawaan.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  Batal
                </button>

                {!isConfirming ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirming(true)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black transition cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <span>Lanjutkan Reset</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecute}
                    className={`px-5 py-2.5 rounded-xl text-white text-xs sm:text-sm font-black transition cursor-pointer shadow-md flex items-center gap-2 ${
                      selectedMode === 'factory'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya, Jalankan Sekarang!</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
