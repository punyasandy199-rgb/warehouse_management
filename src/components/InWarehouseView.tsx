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
    <div className="space-y-3.5 animate-in fade-in duration-300 max-w-4xl mx-auto py-1">
      {/* Top Header Card: In-Warehouse - Clean & Elegant */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inbound Pergudangan · Standar Maks 15 Box / Pallet
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-slate-700" />
            <span>Proses In Warehouse (Barang Masuk)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Penerimaan barang jadi dari Line Produksi & racking pallet ke slot rak gudang.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => onOpenScannerPutaway(undefined, 'OPTION_2_SCAN_ALL')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition cursor-pointer flex items-center gap-2"
          >
            <Scan className="w-4 h-4 text-emerald-400" />
            <span>Buka Scanner Inbound</span>
          </button>
        </div>
      </div>

      {/* 2 Pilihan Metode Racking: Ringkas, Bersih & Elegan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card Opsi 1 */}
        <div className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Opsi 1 (Rentang Box)
              </span>
              <span className="text-xs font-mono text-slate-500">
                Min 1 · Maks 15 Box
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Scan 1 QR Box FG & Input Range Karton
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan salah satu QR box produk, lalu tentukan rentang nomor box awal s/d akhir (contoh: D072 s/d D086).
            </p>
          </div>

          <button
            onClick={() => onOpenScannerPutaway(undefined, 'OPTION_1_RANGE')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-xs sm:text-sm rounded-lg transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4 text-slate-600" />
            <span>Pilih Opsi 1 (Rentang Box)</span>
            <ArrowRight className="w-4 h-4 text-slate-400 ml-1" />
          </button>
        </div>

        {/* Card Opsi 2 */}
        <div className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Opsi 2 (Scan Per Box)
              </span>
              <span className="text-xs font-mono font-semibold text-emerald-700">
                Min 1 · Maks 15 Box
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 leading-snug">
              Scan Box Satu per Satu (Real-Time List)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Scan setiap QR box produk fisik berturut-turut. List tertampil otomatis saat box 1 di-scan, disusul nomor pallet & rak.
            </p>
          </div>

          <button
            onClick={() => onOpenScannerPutaway(undefined, 'OPTION_2_SCAN_ALL')}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Scan className="w-4 h-4" />
            <span>Pilih Opsi 2 (Scan Per Box)</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Tulisan SOP & Alur Proses kecil sebelah kanan bawah */}
      {onOpenSOP && (
        <div className="flex justify-end pt-0.5">
          <button
            onClick={onOpenSOP}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer py-1 px-2 rounded-lg hover:bg-slate-100"
            title="Buka SOP & Alur Proses Inbound"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>SOP & Alur Proses Inbound</span>
          </button>
        </div>
      )}
    </div>
  );
};
