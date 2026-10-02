/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Box, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Printer, 
  Maximize2, 
  Sparkles,
  QrCode,
  ArrowUpRight,
  ArrowDownUp,
  Weight,
  Clock,
  Tag
} from 'lucide-react';
import { RackData, RackSlot, UserRole } from '../types';
import { CartoonWarehouseLogo } from './CartoonWarehouseLogo';

interface RackVisualizerProps {
  racks: Record<string, RackData>;
  activeRackId: string;
  onSelectRackId: (rackId: string) => void;
  onSlotClick: (slot: RackSlot) => void;
  onOpenScannerForSlot: (slotCode: string) => void;
  onOpenPrintRackQr?: (rackId: string) => void;
  userRole: UserRole;
}

export const RackVisualizer: React.FC<RackVisualizerProps> = ({
  racks,
  activeRackId,
  onSelectRackId,
  onSlotClick,
  onOpenScannerForSlot,
  onOpenPrintRackQr,
  userRole
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'empty'>('all');
  const [searchSlot, setSearchSlot] = useState('');
  const [selectedBayFilter, setSelectedBayFilter] = useState<string>('a');

  const currentRack = racks[activeRackId] || Object.values(racks)[0];
  if (!currentRack) return null;

  // Available bays in current rack (e.g. 'a' through 'm')
  const availableBays = useMemo(() => {
    if (currentRack.baysList && currentRack.baysList.length > 0) {
      const nonP = currentRack.baysList.filter(b => !b.toLowerCase().startsWith('p'));
      if (nonP.length > 0) return nonP.map(b => b.toLowerCase());
    }
    const baySet = new Set<string>();
    Object.values(currentRack.slots || {}).forEach(s => {
      if (s.bay && !s.bay.toLowerCase().startsWith('p')) {
        baySet.add(s.bay.toLowerCase());
      }
    });
    const list = Array.from(baySet).sort();
    return list.length > 0 ? list : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'];
  }, [currentRack]);

  const allSlots = Object.values(currentRack.slots).sort((a, b) => b.level - a.level);
  const palletsPerLoc = currentRack.palletsPerSlot || 4;
  const locationCount = currentRack.slotsList?.length || allSlots.length;
  const totalPalletCapacity = currentRack.slotCount && currentRack.slotCount > locationCount 
    ? currentRack.slotCount 
    : locationCount * palletsPerLoc;

  const occupiedSlots = allSlots.filter(s => s.status === 'occupied');
  const blockedSlots = allSlots.filter(s => s.isBlocked || s.status === 'maintenance');
  const emptySlots = allSlots.filter(s => s.status === 'empty' && !s.isBlocked);
  const totalBoxInRack = occupiedSlots.reduce((acc, curr) => acc + (curr.pallet?.quantityBox || 0), 0);
  const verifiedCount = occupiedSlots.filter(s => s.pallet?.isVerifiedAudit).length;
  const accuracyRate = occupiedSlots.length > 0 ? Math.round((verifiedCount / occupiedSlots.length) * 100) : 100;

  // Filter slots
  const filteredSlots = allSlots.filter(slot => {
    if (selectedBayFilter !== 'all' && slot.bay && slot.bay.toLowerCase() !== selectedBayFilter.toLowerCase()) {
      return false;
    }
    const isOccupied = slot.status === 'occupied' && slot.pallet;
    const isBlocked = slot.isBlocked || slot.status === 'maintenance';
    if (filterStatus === 'occupied' && !isOccupied) return false;
    if (filterStatus === 'empty' && (isOccupied || isBlocked)) return false;

    if (searchSlot) {
      const q = searchSlot.toLowerCase();
      const matchCode = slot.slotCode.toLowerCase().includes(q);
      const matchProd = (slot.pallet?.itemName || '').toLowerCase().includes(q);
      const matchBatch = (slot.pallet?.batchNo || '').toLowerCase().includes(q);
      const matchRange = (slot.pallet?.cartonRangeText || '').toLowerCase().includes(q);
      const matchReason = (slot.blockReason || '').toLowerCase().includes(q);
      return matchCode || matchProd || matchBatch || matchRange || matchReason;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Rack Selector Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <CartoonWarehouseLogo size={44} variant="compact" />
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Visualisasi Elevasi Rak & Pallet Real-Time
                </h2>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm mt-0.5">
                Kapasitas 1 Kolom Rak: 4 Pallet (60 Box, Maks 15 Box / Pallet) &bull; Sinkronisasi Barcode & QR Real-Time.
              </p>
            </div>
          </div>

          {/* Quick Actions & Rack Selector Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenPrintRackQr && (
              <button
                type="button"
                onClick={() => onOpenPrintRackQr(activeRackId)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition cursor-pointer"
                title="Cetak sticker QR code pengganti untuk rak ini jika rusak"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>Cetak QR Rak {activeRackId}</span>
              </button>
            )}

            {/* Quick Rack Buttons (A to I) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
              {Object.keys(racks).sort().map(rackKey => {
                const r = racks[rackKey];
                const occ = Object.values(r.slots).filter(s => s.status === 'occupied').length;
                const hasRackBo = Object.values(r.slots).some(s => s.status === 'occupied' && s.pallet?.icStatus === 'BO');
                const hasRackHold = Object.values(r.slots).some(s => s.status === 'occupied' && s.pallet?.icStatus === 'HOLD');
                const isSelected = rackKey === activeRackId;

                return (
                  <button
                    key={rackKey}
                    onClick={() => onSelectRackId(rackKey)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/25 ring-2 ring-cyan-600 ring-offset-2 ring-offset-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>Rak {rackKey}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isSelected ? 'bg-cyan-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {occ}/{r.slotCount}
                    </span>

                    {/* Blinking IC status indicators on rack button */}
                    {hasRackBo && (
                      <span className="relative flex h-2 w-2" title="Ada produk berstatus BO (Rework) di rak ini">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                    {hasRackHold && (
                      <span className="relative flex h-2 w-2" title="Ada produk berstatus HOLD (QC) di rak ini">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rack Meta Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-gradient-to-br from-cyan-50 to-sky-50/50 rounded-xl border border-cyan-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 block">ID RAK AKTIF</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-cyan-900 font-mono">Rak {currentRack.id}</span>
              <span className="text-xs font-semibold text-cyan-700">({currentRack.primaryProduct})</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">KAPASITAS RAK</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-900 font-mono">{currentRack.slotCount}</span>
              <span className="text-xs text-slate-600">Pallet Slot ({availableBays.length} Lokasi x 4 Level)</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">SLOT TERISI</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-700 font-mono">{occupiedSlots.length}</span>
              <span className="text-xs font-semibold text-emerald-600">
                ({Math.round((occupiedSlots.length / currentRack.slotCount) * 100)}%)
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">TOTAL BARANG JADI</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-900 font-mono">{totalBoxInRack}</span>
              <span className="text-xs text-amber-700">BOX ({totalBoxInRack * 30} Kg)</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">KEAKURASIAN AUDIT</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-emerald-800 font-mono">{accuracyRate}%</span>
              <span className="text-xs text-emerald-700">Akurat Fisik</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchSlot}
              onChange={e => setSearchSlot(e.target.value)}
              placeholder="Cari slot, produk, batch, karton..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua ({allSlots.length})
            </button>
            <button
              onClick={() => setFilterStatus('occupied')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'occupied'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Terisi ({occupiedSlots.length})
            </button>
            <button
              onClick={() => setFilterStatus('empty')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'empty'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              Kosong ({emptySlots.length})
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600"></div>
            <span>Pallet Terisi (Maks 15 Box)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300"></div>
            <span>Slot Kosong (Ready)</span>
          </div>
        </div>
      </div>

      {/* Lokasi (Bay) Selector Bar for elevation view */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-700 mr-1">Pilih Lokasi Rak:</span>
          {availableBays.map(bayKey => (
            <button
              key={bayKey}
              onClick={() => setSelectedBayFilter(bayKey)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                selectedBayFilter === bayKey
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Lokasi {bayKey}
            </button>
          ))}
          <button
            onClick={() => setSelectedBayFilter('all')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
              selectedBayFilter === 'all'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua Lokasi ({availableBays[0]} s/d {availableBays[availableBays.length - 1]})
          </button>
        </div>
        <div className="text-xs text-slate-500 font-semibold">
          {selectedBayFilter !== 'all'
            ? `Menampilkan 4 Level Pallet Lokasi ${selectedBayFilter} (Kapasitas: 4 Pallet / 60 Box)`
            : `Menampilkan semua slot rak (${allSlots.length} posisi)`}
        </div>
      </div>

      {/* RACK ELEVATION FRAME (1 RAK = 4 PALLET SLOTS: P4 -> P3 -> P2 -> P1) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Rack Header Beam */}
        <div className="bg-slate-900 text-white px-6 py-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs border-b-4 border-cyan-500">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-cyan-500 text-slate-950 font-black rounded text-xs uppercase tracking-wider">
              ELEVASI RAK 4 PALLET
            </span>
            <span className="font-extrabold text-lg text-white">
              FRAME RAK {currentRack.id} {selectedBayFilter !== 'all' ? `• LOKASI ${selectedBayFilter.toUpperCase()}` : ''} &bull; WMS FGW
            </span>
          </div>
          <div className="text-xs text-slate-300 font-mono">
            Kapasitas: 4 Pallet (60 Box) &bull; Level 4 (Atas) &bull; Level 3 &bull; Level 2 &bull; Level 1 (Dasar)
          </div>
        </div>

        {/* 4 Pallet Vertical Slots Stack */}
        <div className="space-y-3.5">
          {filteredSlots.map((slot) => {
            const isOccupied = slot.status === 'occupied' && slot.pallet;
            const isBlocked = !!slot.isBlocked || slot.status === 'maintenance';
            const palletLevel = slot.level;
            const levelLabel = palletLevel === 4
              ? 'LEVEL 4 (PALLET POSISI 4 - TINGKAT ATAS)'
              : palletLevel === 3
              ? 'LEVEL 3 (PALLET POSISI 3 - TENGAH ATAS)'
              : palletLevel === 2
              ? 'LEVEL 2 (PALLET POSISI 2 - TENGAH BAWAH)'
              : 'LEVEL 1 (PALLET POSISI 1 - LANTAI DASAR)';

            return (
              <div
                key={slot.slotCode}
                className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-xs ${
                  isBlocked
                    ? 'border-amber-400 bg-amber-50/40 hover:border-amber-500 hover:shadow-md'
                    : isOccupied
                    ? slot.pallet?.icStatus === 'BO'
                      ? 'border-rose-400 bg-gradient-to-r from-rose-50/50 via-white to-rose-50/20 hover:border-rose-500 hover:shadow-md'
                      : slot.pallet?.icStatus === 'HOLD'
                      ? 'border-blue-400 bg-gradient-to-r from-blue-50/50 via-white to-blue-50/20 hover:border-blue-500 hover:shadow-md'
                      : 'border-emerald-300 bg-gradient-to-r from-emerald-50/40 via-white to-emerald-50/20 hover:border-emerald-500 hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/60 hover:border-cyan-400 hover:bg-white hover:shadow-md'
                }`}
              >
                {/* Slot Top Beam Bar */}
                <div className={`px-4 py-2 flex items-center justify-between text-xs font-bold border-b ${
                  isBlocked
                    ? 'bg-amber-600 text-slate-950 border-amber-700'
                    : isOccupied
                    ? slot.pallet?.icStatus === 'BO'
                      ? 'bg-rose-700 text-white border-rose-800'
                      : slot.pallet?.icStatus === 'HOLD'
                      ? 'bg-blue-700 text-white border-blue-800'
                      : 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-slate-800 text-cyan-300 border-slate-900'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-black px-2 py-0.5 rounded bg-black/20 text-white">
                      {slot.slotCode}
                    </span>
                    <span className="text-[11px] tracking-wide uppercase font-extrabold text-white/90">
                      {levelLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOccupied && slot.pallet && (
                      <>
                        {slot.pallet.icStatus === 'BO' ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-100 border border-rose-400 shadow-xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            <span>STATUS IC: BO (REWORK)</span>
                          </span>
                        ) : slot.pallet.icStatus === 'HOLD' ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-100 border border-blue-400 shadow-xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                            </span>
                            <span>STATUS IC: HOLD (QC)</span>
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 border border-emerald-500/50">
                            STATUS IC: OK (NORMAL)
                          </span>
                        )}
                      </>
                    )}
                    <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                      isBlocked
                        ? 'bg-amber-900 text-amber-200'
                        : isOccupied 
                        ? 'bg-black/30 text-white' 
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {isBlocked ? 'TERKENDALA LAPANGAN (DIBLOKIR)' : isOccupied ? 'TERISI 1 PALLET' : 'SLOT KOSONG (READY)'}
                    </span>
                  </div>
                </div>

                {/* Slot Content Body */}
                <div className="p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {isBlocked ? (
                    /* Blocked / Obstacle Slot View */
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center font-black shrink-0">
                          <AlertCircle className="w-6 h-6 text-amber-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-extrabold text-amber-950">
                              Slot Terkendala di Lapangan
                            </h4>
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-full">
                              Tidak Dapat Diisi Pallet IC
                            </span>
                          </div>
                          <p className="text-xs text-amber-900 font-semibold mt-0.5">
                            Kendala: {slot.blockReason || 'Tiang rusak / terhalang fisik di lapangan'}
                          </p>
                          <span className="text-[10px] text-slate-500 block">
                            Lokasi ini diblokir dari rekomendasi dan scanner putaway hingga diperbaiki.
                          </span>
                        </div>
                      </div>

                      <div className="px-3.5 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shrink-0">
                        <AlertCircle className="w-4 h-4 text-amber-700" />
                        <span>Blokir Fisik Aktif</span>
                      </div>
                    </div>
                  ) : isOccupied && slot.pallet ? (
                    /* Occupied Slot View */
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded">
                          {slot.pallet.itemCode}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-950">
                          {slot.pallet.itemName}
                        </h3>
                        {slot.pallet.packingLine && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            Line: {slot.pallet.packingLine === 'PB' ? 'Packing 2 (PB)' : 'Packing 1 (PA)'}
                          </span>
                        )}

                        {/* Status IC Tag with Blinking Dot */}
                        {slot.pallet.icStatus === 'BO' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                            </span>
                            <span>Status IC: BO (Rework ke Packing)</span>
                          </span>
                        ) : slot.pallet.icStatus === 'HOLD' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-black bg-blue-100 text-blue-900 border border-blue-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                            <span>Status IC: HOLD (Ditahan QC)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <span>Status IC: OK (Normal)</span>
                          </span>
                        )}
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">JUMLAH MUATAN</span>
                          <span className="text-base font-black font-mono text-emerald-700">
                            {slot.pallet.quantityBox} BOX
                          </span>
                          <span className="text-[10px] text-slate-500 block">Maks 15 Box / Pallet</span>
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">RENTANG KARTON</span>
                          <span className="font-mono font-bold text-slate-900">
                            {slot.pallet.cartonRangeText || `D072 - D086 (15 Box)`}
                          </span>
                          <span className="text-[10px] text-slate-500 block">Range Box Fisik</span>
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">BATCH & WAKTU</span>
                          <span className="font-mono font-bold text-slate-800">
                            {slot.pallet.batchNo}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {slot.pallet.productionTime || '14:35 WIB'}
                          </span>
                        </div>

                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <span className="text-slate-400 block text-[10px] font-bold uppercase">TOTAL BERAT NETTO</span>
                          <span className="font-bold text-slate-800">
                            {slot.pallet.quantityBox * 30} Kg Netto
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Gross: {slot.pallet.quantityBox * 32.05} Kg
                          </span>
                        </div>
                      </div>

                      {/* Graphical Representation of 15 Box Stacked on Pallet */}
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                          Susunan Karton:
                        </span>
                        {Array.from({ length: Math.min(15, slot.pallet.quantityBox) }, (_, i) => {
                          const start = slot.pallet?.cartonStart || 72;
                          const cNum = start + i;
                          return (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-900 font-mono text-[9px] font-bold rounded shadow-2xs"
                              title={`Karton Box #D${String(cNum).padStart(3, '0')}`}
                            >
                              D{String(cNum).padStart(3, '0')}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Empty Slot View */
                    <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-500 shrink-0">
                          <Box className="w-6 h-6 stroke-[1.5]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">
                            Posisi Pallet Siap Ditempati
                          </h4>
                          <p className="text-xs text-slate-500">
                            Kapasitas: 1 Pallet kayu standar (maksimal 15 box barang jadi).
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenScannerForSlot(slot.slotCode)}
                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Isi Slot / Scan Putaway</span>
                      </button>
                    </div>
                  )}

                  {/* Actions Column */}
                  <div className="flex items-center lg:flex-col gap-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-4">
                    <button
                      type="button"
                      onClick={() => onSlotClick(slot)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 w-full justify-center"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Rincian Slot</span>
                    </button>

                    {!isBlocked && (
                      <button
                        type="button"
                        onClick={() => onOpenScannerForSlot(slot.slotCode)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 w-full justify-center"
                        title="Buka scanner untuk slot ini"
                      >
                        <QrCode className="w-3.5 h-3.5 text-slate-600" />
                        <span>Scan Barcode</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
