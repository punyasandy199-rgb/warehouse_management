/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ArrowDownToLine, 
  Scan, 
  Layers, 
  Hash, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { RackData, ProductItem, UserRole } from '../types';

interface InWarehouseViewProps {
  racks: Record<string, RackData>;
  products: ProductItem[];
  userRole: UserRole;
  onOpenScannerPutaway: (prefillSlot?: string, defaultOption?: 'OPTION_1_RANGE' | 'OPTION_2_SCAN_ALL') => void;
  onBackToMenuHub: () => void;
  onOpenSOP?: () => void;
}

export const InWarehouseView: React.FC<InWarehouseViewProps> = ({
  racks: _racks,
  products: _products,
  userRole: _userRole,
  onOpenScannerPutaway,
  onBackToMenuHub: _onBackToMenuHub,
  onOpenSOP
}) => {
  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-4xl mx-auto py-1">
      {/* Top Banner: In-Warehouse (Warna Hijau) - Tampilan Ringkas / Kompak */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-emerald-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider border border-white/30">
              Modul Hijau &bull; Inbound Gudang
            </span>
            <span className="text-[11px] text-emerald-200 font-medium">SOP Maks 15 Box/Pallet</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-1 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            <span>Proses In Warehouse (Barang Masuk)</span>
          </h2>
          <p className="text-xs text-emerald-100 mt-0.5">
            Penerimaan barang jadi dari Line Produksi & racking ke slot rak gudang.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => onOpenScannerPutaway(undefined, 'OPTION_1_RANGE')}
            className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 font-extrabold text-xs sm:text-sm rounded-xl shadow-sm transition cursor-pointer flex items-center gap-2"
          >
            <Scan className="w-4 h-4 text-emerald-700" />
            <span>Buka Scanner Inbound</span>
          </button>
        </div>
      </div>

      {/* 2 Pilihan Metode Racking: Ringkas & Tidak Terlalu Lebar / Panjang */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card Opsi 1 */}
        <div className="bg-white rounded-2xl border-2 border-emerald-300 hover:border-emerald-500 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-700" />
                Opsi 1 (scan-range)
              </span>
              <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                Maks 15 Box
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              Scan 1 QR Box FG & Input Range Karton
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Scan salah satu QR box produk, lalu tentukan rentang karton awal s/d akhir (contoh: D072 s/d D086).
            </p>
          </div>

          <button
            onClick={() => onOpenScannerPutaway(undefined, 'OPTION_1_RANGE')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4" />
            <span>Gunakan Opsi 1 (scan-range)</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Card Opsi 2 */}
        <div className="bg-white rounded-2xl border-2 border-teal-300 hover:border-teal-500 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 transition">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-900 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-700" />
                Opsi 2 (scan allbox)
              </span>
              <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                Min 2, Maks 15 Box
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              Scan Semua QR Box Produk dalam Pallet
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Scan seluruh barcode QR box produk secara fisik satu per satu dengan counter dan list verifikasi real-time.
            </p>
          </div>

          <button
            onClick={() => onOpenScannerPutaway(undefined, 'OPTION_2_SCAN_ALL')}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-extrabold text-sm rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4" />
            <span>Gunakan Opsi 2 (scan allbox)</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Tulisan SOP & Alur Proses kecil sebelah kanan bawah saja */}
      {onOpenSOP && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onOpenSOP}
            className="text-xs font-semibold text-slate-500 hover:text-emerald-700 flex items-center gap-1.5 transition cursor-pointer hover:underline py-1 px-2 rounded-lg hover:bg-slate-100"
            title="Buka SOP & Alur Proses Inbound"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>SOP & Alur Proses</span>
          </button>
        </div>
      )}
    </div>
  );
};
