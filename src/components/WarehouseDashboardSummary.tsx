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
  ArrowUpRight
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
        occupiedPallets++;
        const b = slot.pallet?.quantityBox || 15;
        totalBoxes += b;
      }
    });
  });

  const emptyPallets = Math.max(0, totalPallets - occupiedPallets - blockedPallets);

  // Rumus Konversi Permintaan User:
  // Pallet dikonversi dikali 15 QTY Box
  // Pallet dikonversi dikali 30 Kg (in kg)
  const emptyBoxConversion = emptyPallets * 15;
  const emptyKgConversion = emptyPallets * 30;

  const totalBoxCapacity = totalPallets * 15;
  const totalKgCapacity = totalPallets * 30;

  const occupiedBoxConversion = occupiedPallets * 15;
  const occupiedKgConversion = occupiedPallets * 30;

  const overallOccupancyPct = totalPallets > 0 ? Math.round((occupiedPallets / totalPallets) * 100) : 0;
  const overallAvailablePct = totalPallets > 0 ? Math.round((emptyPallets / totalPallets) * 100) : 0;

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
        <p className="text-[11px] text-slate-500">
          Standar Gudang: 1 Pallet = 15 Box = 30 Kg
        </p>
      </div>

      {/* 2 KARTU UTAMA: TOTAL BOX (IN BOX & IN KG) + KETERSEDIAAN PALLET RAK GUDANG */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
        
        {/* Card 1: TOTAL BOX SEMUA BARANG JADI */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border-2 border-blue-200 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Total Box Semua Barang Jadi
            </span>
            <span className="text-[10px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full font-mono">
              {occupiedPallets} Pallet Terisi
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tracking-tight">
                  {(totalBoxes > 0 ? totalBoxes : occupiedBoxConversion).toLocaleString('id-ID')}
                </span>
                <span className="text-xs sm:text-sm font-black text-blue-700">BOX</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-blue-950 mt-0.5">
                <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="text-slate-500 text-[11px]">Total Kuantitas:</span>
                <span className="font-mono font-black text-blue-900 text-xs sm:text-sm">
                  {occupiedKgConversion.toLocaleString('id-ID')} Kg
                </span>
              </div>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-blue-100 text-[11px]">
            <div className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-200/60">
              <span className="block text-[10px] text-slate-500 font-semibold">Pallet Terisi:</span>
              <span className="font-mono font-black text-blue-900 text-xs">
                {occupiedPallets.toLocaleString('id-ID')} Pallet
              </span>
            </div>
            <div className="bg-blue-50/70 p-1.5 rounded-lg border border-blue-200/60">
              <span className="block text-[10px] text-slate-500 font-semibold">Utilisasi Rak:</span>
              <span className="font-mono font-black text-blue-900 text-xs">
                {overallOccupancyPct}% Kapasitas
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: KETERSEDIAAN PALLET RAK GUDANG (DIUBAH KE PALLET + KONVERSI x15 BOX & x30 KG) */}
        <div className="bg-white rounded-2xl p-3 sm:p-3.5 border-2 border-emerald-300 shadow-xs flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Ketersediaan Pallet Rak Gudang
            </span>
            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full font-mono">
              {overallAvailablePct}% Kosong
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono tracking-tight">
                  {emptyPallets.toLocaleString('id-ID')}
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-700">Pallet Available</span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold">
                Slot rak kosong siap ditempati barang jadi
              </p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <PackageOpen className="w-5 h-5" />
            </div>
          </div>

          {/* Konversi Sesuai Permintaan User: dikali 15 QTY Box & dikali 30 Kg (in kg) */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-emerald-100">
            <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200/60">
              <span className="block text-[10px] font-bold text-slate-500">Konversi QTY Box (x15):</span>
              <span className="font-mono font-black text-emerald-900 text-xs sm:text-sm">
                {emptyBoxConversion.toLocaleString('id-ID')} Box
              </span>
            </div>
            <div className="bg-emerald-50/80 p-1.5 rounded-lg border border-emerald-200/60">
              <span className="block text-[10px] font-bold text-slate-500">Konversi in Kg (x30):</span>
              <span className="font-mono font-black text-emerald-900 text-xs sm:text-sm">
                {emptyKgConversion.toLocaleString('id-ID')} Kg
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
            <span>Kapasitas: <strong className="text-slate-800 font-mono">{totalPallets} Pallet</strong> ({totalBoxCapacity.toLocaleString('id-ID')} Box)</span>
            <span>&bull;</span>
            <span>Terisi: <strong className="text-blue-700 font-mono">{occupiedPallets} Pallet</strong></span>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* BAGIAN BAWAH: STATUS PER RAK FISIK (BISA DI-KLIK UNTUK DETAIL DENAH VISUAL) */}
      {/* ========================================================================= */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1 border-b border-slate-200">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span>Status Kapasitas & Denah Visual Per Rak</span>
            </h3>
            <p className="text-[10px] text-slate-500">
              Klik kartu rak untuk membuka denah visual 2D dan cek posisi pallet di bawah.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
            {/* Legend Penanda Status IC */}
            <div className="flex items-center gap-1.5 text-[10px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
              <span className="text-slate-400 font-bold">IC:</span>
              <span className="inline-flex items-center gap-1 font-bold text-rose-700">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                <span>BO</span>
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="inline-flex items-center gap-1 font-bold text-blue-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                <span>HOLD</span>
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px]">
              <span>Aktif:</span>
              <span className="font-mono font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                Rak {activeRackId}
              </span>
            </div>
          </div>
        </div>

        {/* Grid Kartu Per Rak (Rak A, B, C, dll.) - 2 Kolom pada Android / Mobile agar Rapi dan Tidak Menumpuk */}
        <div className={`grid gap-2 ${isAndroid ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 sm:gap-2.5'}`}>
          {Object.values(racks).map((rack: RackData) => {
            const isSelected = rack.id === activeRackId;
            const palletsPerLoc = rack.palletsPerSlot || 4;
            const locationCount = rack.slotsList?.length || Object.keys(rack.slots).length;
            const rackPalletCapacity = rack.slotCount && rack.slotCount > locationCount 
              ? rack.slotCount 
              : locationCount * palletsPerLoc;

            let rackOccupied = 0;
            let rackBoxes = 0;
            let rackBlockedLocations = 0;
            let hasBo = false;
            let hasHold = false;

            Object.values(rack.slots).forEach((s: RackSlot) => {
              if (s.isBlocked || s.status === 'maintenance') {
                rackBlockedLocations++;
              } else if (s.status === 'occupied' && s.pallet) {
                rackOccupied++;
                rackBoxes += s.pallet?.quantityBox || 15;
                if (s.pallet.icStatus === 'BO') hasBo = true;
                if (s.pallet.icStatus === 'HOLD') hasHold = true;
              }
            });

            const rackBlockedPallets = rackBlockedLocations * palletsPerLoc;
            const rackEmpty = Math.max(0, rackPalletCapacity - rackOccupied - rackBlockedPallets);
            const rackPct = rackPalletCapacity > 0 ? Math.round((rackOccupied / rackPalletCapacity) * 100) : 0;

            return (
              <div
                key={rack.id}
                onClick={() => {
                  onSelectRackId(rack.id);
                  setDetailRack(rack);
                }}
                className={`p-2.5 sm:p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-1.5 select-none ${
                  isSelected
                    ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 shadow-2xs'
                }`}
              >
                {/* Header Kartu: Label Rak & Status IC */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center font-mono ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-white'
                    }`}>
                      {rack.id}
                    </span>
                    <span className="font-black text-slate-900 text-xs sm:text-sm">
                      Rak {rack.id}
                    </span>
                  </div>
                  
                  {/* Status IC Indicators */}
                  <div className="flex items-center gap-1">
                    {hasBo && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[9px] font-black animate-pulse">
                        BO
                      </span>
                    )}
                    {hasHold && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-black">
                        HOLD
                      </span>
                    )}
                    {isSelected && !hasBo && !hasHold && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>
                    )}
                  </div>
                </div>

                {/* Point Penting Sesuai Permintaan User: */}
                <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-semibold text-[11px]">Slot Terisi:</span>
                    <span className="font-mono font-black text-blue-700 text-xs">
                      {rackOccupied} Pallet
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-semibold text-[11px]">Slot Available:</span>
                    <span className="font-mono font-black text-emerald-700 text-xs">
                      {rackEmpty} Pallet
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                    <span>Kapasitas:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {rackPalletCapacity} Pallet
                    </span>
                  </div>
                </div>

                {/* Progress bar % */}
                <div className="space-y-1 pt-0.5">
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${rackPct > 80 ? 'bg-rose-500' : rackPct > 50 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${rackPct}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-bold">{rackPct}% Terisi</span>
                    <span className={`font-bold flex items-center gap-0.5 ${isSelected ? 'text-blue-700 font-black' : 'text-slate-400'}`}>
                      <span>{isSelected ? 'Terpilih' : 'Pilih'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DENAH VISUAL 2D DETAIL RAK TERPILIH LANGSUNG DI DASHBOARD */}
        <div className="pt-4">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-t-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
              <h4 className="font-black text-sm sm:text-base tracking-wide">
                Denah Visual 2D Slot Rak {activeRackId} ({currentRack?.primaryProduct || 'Barang Jadi'})
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDetailRack(currentRack)}
                className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="Buka tabel lengkap seluruh slot dan pallet di rak ini"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Buka Detail Lengkap Rak {activeRackId}</span>
              </button>
              <span className="text-xs font-mono text-cyan-300 hidden md:inline">
                &bull; {Object.keys(currentRack?.slots || {}).length} Slot
              </span>
            </div>
          </div>

          <div className="bg-white rounded-b-3xl border-x-2 border-b-2 border-slate-200 p-4 sm:p-6 shadow-sm">
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
        </div>

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
