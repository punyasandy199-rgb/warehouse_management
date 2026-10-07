/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Boxes, 
  PackageOpen, 
  Scale,
  Layers,
  ChevronRight,
  Sparkles,
  BarChart3,
  LayoutGrid,
  Eye,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
  Database,
  FileSpreadsheet
} from 'lucide-react';
import { RackData, RackSlot, UserRole } from '../types';
import { RackVisualizer } from './RackVisualizer';
import { RackDetailModal } from './RackDetailModal';

interface WarehouseDashboardSummaryProps {
  racks: Record<string, RackData>;
  activeRackId: string;
  onSelectRackId: (rackId: string) => void;
  onSlotClick?: (slot: RackSlot) => void;
  onOpenScannerForSlot?: (slotCode: string) => void;
  onOpenPrintRackQr?: (rackId: string) => void;
  onNavigateToModule?: (module: 'in-warehouse' | 'out-warehouse' | 'stock-opname' | 'data-master' | 'configuration-system' | 'sop-flowchart') => void;
  onOpenSpreadsheet?: () => void;
  userRole?: UserRole;
  isAndroid?: boolean;
}

export const WarehouseDashboardSummary: React.FC<WarehouseDashboardSummaryProps> = ({
  racks,
  activeRackId,
  onSelectRackId,
  onSlotClick,
  onOpenScannerForSlot,
  onOpenPrintRackQr,
  onNavigateToModule,
  onOpenSpreadsheet,
  userRole = 'operator',
  isAndroid = false
}) => {
  const [detailRack, setDetailRack] = useState<RackData | null>(null);

  // Aggregate KPIs across all racks (diukur dalam Pallet)
  let totalPallets = 0;
  let occupiedPallets = 0;
  let blockedPallets = 0;
  let totalBoxes = 0;

  Object.values(racks).forEach((rack: RackData) => {
    const palletsPerLoc = rack.palletsPerSlot || 4;
    const locationCount = rack.slotsList?.length || Object.keys(rack.slots).length;
    const rackCap = rack.slotCount && rack.slotCount > locationCount ? rack.slotCount : locationCount * palletsPerLoc;
    totalPallets += rackCap;

    Object.values(rack.slots).forEach((slot: RackSlot) => {
      const isBlocked = slot.isBlocked || slot.status === 'maintenance';
      if (isBlocked) {
        blockedPallets += palletsPerLoc;
      } else if (slot.status === 'occupied') {
        const pCount = (slot.pallets && slot.pallets.length > 0) ? slot.pallets.length : (slot.pallet ? 1 : 1);
        occupiedPallets += pCount;
        if (slot.pallets && slot.pallets.length > 0) {
          totalBoxes += slot.pallets.reduce((acc, p) => acc + (p.quantityBox || 15), 0);
        } else if (slot.pallet) {
          totalBoxes += slot.pallet.quantityBox || 15;
        } else {
          totalBoxes += 15;
        }
      }
    });
  });

  const emptyPallets = Math.max(0, totalPallets - occupiedPallets - blockedPallets);

  // Helper untuk menampilkan persentase akurat tanpa pembulatan liar
  const rawOccupancyPct = totalPallets > 0 ? (occupiedPallets / totalPallets) * 100 : 0;
  const rawAvailablePct = totalPallets > 0 ? (emptyPallets / totalPallets) * 100 : 0;

  const formatPercentage = (val: number, isOccupied: boolean, occCount: number): string => {
    if (occCount === 0) return isOccupied ? '0%' : '100%';
    if (isOccupied) {
      if (val < 0.1 && val > 0) return `${val.toFixed(2)}%`;
      if (val < 10) return `${val.toFixed(2)}%`;
      return `${val.toFixed(1)}%`;
    } else {
      if (occCount > 0 && val >= 99) {
        return `${val.toFixed(2)}%`; // e.g. 99.79%
      }
      return `${val.toFixed(1)}%`;
    }
  };

  const occupancyPctText = formatPercentage(rawOccupancyPct, true, occupiedPallets); // e.g. "0.21%"
  const availablePctText = formatPercentage(rawAvailablePct, false, occupiedPallets); // e.g. "99.79%" atau "100%" saat kosong

  // Standar Warehouse SIKUTANG (SIC Finished Goods):
  // 1 Pallet = 15 Box (15 x 30 Kg = 450 Kg per pallet)
  // 1 Box = 30 Kg
  const finalOccupiedBoxes = totalBoxes > 0 ? totalBoxes : occupiedPallets * 15;
  const finalOccupiedKg = finalOccupiedBoxes * 30; // 60 Box x 30 Kg = 1.800 Kg

  const emptyBoxConversion = emptyPallets * 15; // 1.884 Pallet x 15 = 28.260 Box
  const emptyKgConversion = emptyBoxConversion * 30; // 28.260 Box x 30 Kg = 847.800 Kg

  const totalBoxCapacity = totalPallets * 15; // 1.888 Pallet x 15 = 28.320 Box
  const totalKgCapacity = totalBoxCapacity * 30; // 28.320 Box x 30 Kg = 849.600 Kg

  const currentRack = racks[activeRackId] || Object.values(racks)[0];

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      
      {/* Header Section Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0070C0] shrink-0"></span>
          <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            Dashboard Kapasitas Gudang & Kuantitas Barang Jadi
          </h2>
        </div>
        <p className="text-[11px] text-slate-500 font-semibold">
          Standar Gudang: 1 Pallet = 15 Box (450 Kg) &bull; 1 Box = 30 Kg
        </p>
      </div>

      {/* QUICK PROCESS LAUNCHER: ZOOM-SLIDE TRANSITION TO PROCESSES */}
      {onNavigateToModule && (
        <div className="bg-slate-900 text-white rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="text-xs font-bold text-slate-200">
              Pintas Operasional (Transisi Zoom & Slide):
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => onNavigateToModule('in-warehouse')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Buka Proses Inbound dengan efek Zoom & Slide"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Proses In (Inbound)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToModule('out-warehouse')}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Buka Proses Outbound dengan efek Zoom & Slide"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Proses Out (Outbound)</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToModule('stock-opname')}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Buka Stock Opname dengan efek Zoom & Slide"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Stock Opname</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToModule('data-master')}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
              title="Buka Data Master dengan efek Zoom & Slide"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data Master</span>
            </button>
            {onOpenSpreadsheet && (
              <button
                type="button"
                onClick={onOpenSpreadsheet}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                title="Buka Integrasi Google Spreadsheet & Segarkan Data"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Spreadsheet</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 KARTU KPI ELEGAN & RINGKAS (CLEAN ENTERPRISE DESIGN, ZERO PILL OVERLOAD) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: TOTAL BOX BARANG JADI */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Muatan Barang Jadi
            </span>
            <span className="text-xs font-mono font-semibold text-blue-600">
              {occupiedPallets} Pallet
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {finalOccupiedBoxes.toLocaleString('id-ID')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-blue-600">BOX</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <span className="font-mono font-medium text-slate-700">
                {finalOccupiedKg.toLocaleString('id-ID')} Kg
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-medium text-blue-700">{occupancyPctText} Terisi</span>
            </div>
          </div>
        </div>

        {/* Card 2: KETERSEDIAAN PALLET RAK */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Ketersediaan Rak
            </span>
            <span className="text-xs font-mono font-semibold text-emerald-600">
              {availablePctText} Kosong
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {emptyPallets.toLocaleString('id-ID')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-emerald-600">PALLET</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
              <span className="font-mono font-medium text-slate-700">
                {emptyBoxConversion.toLocaleString('id-ID')} Box
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{(emptyKgConversion / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ton</span>
            </div>
          </div>
        </div>

        {/* Card 3: TOTAL KAPASITAS GUDANG */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Kapasitas Rak
            </span>
            <span className="text-xs font-mono font-semibold text-slate-500">
              10 Rak (A - J)
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {totalPallets.toLocaleString('id-ID')}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500">PALLET</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 truncate">
              <span className="font-mono font-medium text-slate-700">
                {totalBoxCapacity.toLocaleString('id-ID')} Box
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{(totalKgCapacity / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Ton</span>
            </div>
          </div>
        </div>

        {/* Card 4: KONDISI OPERASIONAL */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Kondisi Lapangan
            </span>
            <span className={`text-xs font-mono font-semibold ${
              blockedPallets === 0 ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {blockedPallets === 0 ? '100% Siap' : `${blockedPallets} Terkendala`}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {blockedPallets === 0 ? 'Normal' : `${blockedPallets} Slot`}
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-500">
                {blockedPallets === 0 ? '100%' : 'Diblokir'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {blockedPallets === 0 ? 'Semua tiang rak siap digunakan' : 'Ada tiang terhalang di lapangan'}
            </p>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* RACK SELECTOR STRIP: MINIMALIS, 1 BARIS, ERGONOMIS & ELEGAN */}
      {/* ========================================================================= */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider mr-1 shrink-0">
            Pilih Rak:
          </span>
          {Object.values(racks).map((rack: RackData) => {
            const isSelected = rack.id === activeRackId;
            const occ = Object.values(rack.slots).filter(s => s.status === 'occupied').length;
            const hasBo = Object.values(rack.slots).some(s => s.status === 'occupied' && s.pallet?.icStatus === 'BO');
            const hasHold = Object.values(rack.slots).some(s => s.status === 'occupied' && s.pallet?.icStatus === 'HOLD');

            return (
              <button
                key={rack.id}
                type="button"
                onClick={() => onSelectRackId(rack.id)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                <span>Rak {rack.id}</span>
                <span className={`text-[11px] font-mono px-1 py-0.2 rounded ${
                  isSelected ? 'bg-white/20 text-white' : 'text-slate-500'
                }`}>
                  {occ}
                </span>

                {/* IC status dots */}
                {hasBo && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Ada produk BO" />
                )}
                {hasHold && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Ada produk HOLD" />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setDetailRack(currentRack)}
          className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0 self-end sm:self-center"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Tabel Rincian Rak {activeRackId}</span>
        </button>
      </div>

      {/* ELEVASI VISUAL RAK LANGSUNG (BERSIH & TERINTEGRASI) */}
      <div className="pt-1">
        <RackVisualizer
          racks={racks}
          activeRackId={activeRackId}
          onSelectRackId={onSelectRackId}
          onSlotClick={(slot) => {
            if (onSlotClick) onSlotClick(slot);
          }}
          onOpenScannerForSlot={(slotCode) => {
            if (onOpenScannerForSlot) onOpenScannerForSlot(slotCode);
          }}
          onOpenPrintRackQr={(rackId) => {
            if (onOpenPrintRackQr) onOpenPrintRackQr(rackId);
          }}
          userRole={userRole}
        />
      </div>

      {/* MODAL DETAIL ISI DALAM RAK (TABEL SLOT & ISI BARANG PALLET) */}
      {detailRack && (
        <RackDetailModal
          rack={detailRack}
          isOpen={Boolean(detailRack)}
          onClose={() => setDetailRack(null)}
          onSlotClick={(slot) => {
            if (onSlotClick) onSlotClick(slot);
          }}
          onOpenScannerForSlot={(slotCode) => {
            if (onOpenScannerForSlot) onOpenScannerForSlot(slotCode);
          }}
          onOpenPrintRackQr={(rId) => {
            if (onOpenPrintRackQr) onOpenPrintRackQr(rId);
          }}
          userRole={userRole}
        />
      )}

    </div>
  );
};
