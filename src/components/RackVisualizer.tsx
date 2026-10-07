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
  const [visualLayoutMode, setVisualLayoutMode] = useState<'elevation' | 'matrix'>('elevation');

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
    <div className="space-y-3">
      {/* Sleek, Minimalist Control & Filter Bar (Tanpa Duplikasi / Tanpa Visual Ramai) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Active Rack Title & Key Numbers */}
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
              {currentRack.id}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  Rak {currentRack.id} · {currentRack.primaryProduct || 'Barang Jadi'}
                </h3>
                <span className="text-xs font-mono text-slate-500 font-medium">
                  {occupiedSlots.length}/{currentRack.slotCount} Pallet ({Math.round((occupiedSlots.length / currentRack.slotCount) * 100)}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kapasitas: 4 Level per Kolom Lokasi · Total Terisi: {totalBoxInRack} Box ({totalBoxInRack * 30} Kg)
              </p>
            </div>
          </div>

          {/* Quick Actions, Search & Layout View Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setVisualLayoutMode('elevation')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  visualLayoutMode === 'elevation'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Elevasi Kolom Terpilih"
              >
                Elevasi Kolom
              </button>
              <button
                type="button"
                onClick={() => setVisualLayoutMode('matrix')}
                className={`px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                  visualLayoutMode === 'matrix'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilan Matriks 2D Semua Bay A-M (Cepat & Ringkas)"
              >
                Matriks Grid (A-M)
              </button>
            </div>

            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchSlot}
                onChange={e => setSearchSlot(e.target.value)}
                placeholder="Cari slot, batch..."
                className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-slate-400 focus:outline-none"
              />
            </div>

            {onOpenPrintRackQr && (
              <button
                type="button"
                onClick={() => onOpenPrintRackQr(activeRackId)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition cursor-pointer shrink-0"
                title="Cetak sticker QR code pengganti untuk tiang rak ini"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Cetak QR</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips & Lokasi (Bay) Selector Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({allSlots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('empty')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                filterStatus === 'empty'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Kosong ({emptySlots.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('occupied')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs flex items-center gap-1.5 ${
                filterStatus === 'occupied'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              <span>Terisi ({occupiedSlots.length})</span>
            </button>
            {blockedSlots.length > 0 && (
              <span className="text-xs text-amber-700 font-medium px-2 py-0.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{blockedSlots.length} Terkendala</span>
              </span>
            )}
          </div>

          {/* Bay Selector Row (Hanya jika mode elevasi) */}
          {visualLayoutMode === 'elevation' && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs scrollbar-none">
              <span className="text-xs text-slate-400 font-bold uppercase mr-1">Bay:</span>
              {availableBays.slice(0, 13).map(bayKey => (
                <button
                  key={bayKey}
                  type="button"
                  onClick={() => setSelectedBayFilter(bayKey)}
                  className={`px-2 py-0.5 rounded font-mono font-bold text-xs transition cursor-pointer ${
                    selectedBayFilter === bayKey
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {bayKey.toUpperCase()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedBayFilter('all')}
                className={`px-2 py-0.5 rounded font-semibold text-xs transition cursor-pointer ${
                  selectedBayFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAMPILAN MATRIKS GRID (A-M x L1-L4) - RINGKAS, ELEGAN, CEPAT & TIDAK RAMAI */}
      {visualLayoutMode === 'matrix' ? (
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800">
              Matriks Kapasitas Rak {currentRack.id} (Bay A s/d M × Level 4 s/d 1)
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Terisi IC OK</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> HOLD</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> BO</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-300"></span> Kosong</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span> Terkendala</span>
            </div>
          </div>

          <div className="overflow-x-auto pb-2">
            <div className="min-w-[640px] space-y-2">
              {[4, 3, 2, 1].map(lvl => (
                <div key={lvl} className="flex items-center gap-1.5">
                  <div className="w-10 text-xs font-mono font-bold text-slate-400 shrink-0 text-right pr-2">
                    L{lvl}
                  </div>
                  <div className="grid grid-cols-13 gap-1.5 flex-1">
                    {availableBays.slice(0, 13).map(bayKey => {
                      const slotKey = `${currentRack.id}${lvl}${bayKey.toLowerCase()}`;
                      const slot = currentRack.slots[slotKey] || Object.values(currentRack.slots).find(s => s.level === lvl && s.bay.toLowerCase() === bayKey.toLowerCase());
                      if (!slot) return <div key={bayKey} className="h-10 bg-slate-50 rounded border border-dashed border-slate-200" />;

                      const isOccupied = slot.status === 'occupied' && slot.pallet;
                      const isBlocked = !!slot.isBlocked || slot.status === 'maintenance';
                      const ic = slot.pallet?.icStatus;

                      return (
                        <div
                          key={bayKey}
                          onClick={() => onSlotClick(slot)}
                          className={`h-11 rounded-lg p-1 border flex flex-col justify-between transition cursor-pointer hover:scale-105 shadow-2xs ${
                            isBlocked
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : isOccupied
                              ? ic === 'BO'
                                ? 'bg-rose-50 border-rose-300 text-rose-900'
                                : ic === 'HOLD'
                                ? 'bg-blue-50 border-blue-300 text-blue-900'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                          title={`Slot ${slot.slotCode} (Bay ${bayKey.toUpperCase()}, Level ${lvl}): ${
                            isBlocked ? 'Terkendala' : isOccupied ? `${slot.pallet?.itemName} (${slot.pallet?.quantityBox} Box)` : 'Kosong'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                            <span className="font-bold">{slot.slotCode}</span>
                            {isOccupied && (
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                ic === 'BO' ? 'bg-rose-500' : ic === 'HOLD' ? 'bg-blue-500' : 'bg-emerald-500'
                              }`} />
                            )}
                          </div>
                          <div className="text-[9px] truncate leading-tight font-semibold">
                            {isBlocked ? 'BLOCKED' : isOccupied ? `${slot.pallet?.quantityBox} Box` : 'Kosong'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Bay Labels on bottom */}
              <div className="flex items-center gap-1.5 pt-1">
                <div className="w-10 shrink-0 text-right pr-2 text-[10px] text-slate-400 font-bold uppercase">Bay</div>
                <div className="grid grid-cols-13 gap-1.5 flex-1">
                  {availableBays.slice(0, 13).map(bayKey => (
                    <div key={bayKey} className="text-center font-mono font-bold text-xs text-slate-500">
                      {bayKey.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* RACK ELEVATION FRAME (ELEGANT, SLIM, NO PILL CLUTTER) */
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
            <span className="font-bold text-slate-800">
              Elevasi Kolom {selectedBayFilter === 'all' ? 'Semua Bay' : `Bay ${selectedBayFilter.toUpperCase()}`}
            </span>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Terisi</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Kosong</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Terkendala</span>
            </div>
          </div>

          {/* Slots Stack: Slim, High Contrast, Hairline Border */}
          <div className="space-y-2">
            {filteredSlots.map((slot) => {
              const isOccupied = slot.status === 'occupied' && slot.pallet;
              const isBlocked = !!slot.isBlocked || slot.status === 'maintenance';
              const palletLevel = slot.level;

              return (
                <div
                  key={slot.slotCode}
                  className={`p-3 rounded-lg border border-slate-200/90 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white hover:border-slate-300 ${
                    isBlocked
                      ? 'border-l-4 border-l-amber-500'
                      : isOccupied
                      ? slot.pallet?.icStatus === 'BO'
                        ? 'border-l-4 border-l-rose-500'
                        : slot.pallet?.icStatus === 'HOLD'
                        ? 'border-l-4 border-l-blue-500'
                        : 'border-l-4 border-l-emerald-500'
                      : 'border-l-4 border-l-slate-200'
                  }`}
                >
                  {/* Kolom 1: Slot Identity (Level & Slot Code) */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="w-7 h-7 rounded text-xs font-mono font-bold flex items-center justify-center bg-slate-100 text-slate-700">
                      L{palletLevel}
                    </span>
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900 block leading-tight">
                        {slot.slotCode}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Bay {slot.bay.toUpperCase()} · Level {palletLevel}
                      </span>
                    </div>
                  </div>

                  {/* Kolom 2: Slot Content Data (Produk, Pallet, Qty, Status) */}
                  <div className="flex-1 min-w-0">
                    {isBlocked ? (
                      <div className="flex items-center gap-2 text-xs text-amber-900">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">
                          <strong>Terkendala:</strong> {slot.blockReason || 'Tiang terhalang / diblokir di lapangan'}
                        </span>
                      </div>
                    ) : isOccupied && slot.pallet ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {slot.pallet.itemName}
                          </span>
                          <span className="font-mono text-xs text-slate-600">
                            {slot.pallet.palletNumber || slot.pallet.palletId}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-mono text-xs text-slate-500">
                            Batch {slot.pallet.batchNo}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className={`text-xs font-semibold flex items-center gap-1 ${
                            slot.pallet.icStatus === 'BO'
                              ? 'text-rose-600'
                              : slot.pallet.icStatus === 'HOLD'
                              ? 'text-blue-600'
                              : 'text-emerald-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              slot.pallet.icStatus === 'BO'
                                ? 'bg-rose-500'
                                : slot.pallet.icStatus === 'HOLD'
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                            }`} />
                            <span>{slot.pallet.icStatus === 'OK' ? 'IC OK' : slot.pallet.icStatus}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          <span className="font-semibold text-slate-700">
                            {slot.pallet.quantityBox} Box ({slot.pallet.quantityBox * 30} Kg)
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-emerald-700 font-semibold font-mono">
                            Jam: {slot.pallet.productionTime || '14:35 WIB'}
                          </span>
                          {slot.pallet.cartonRangeText && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="font-mono">{slot.pallet.cartonRangeText}</span>
                            </>
                          )}
                          {slot.pallet.inboundBy && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="text-slate-400">Opr: {slot.pallet.inboundBy}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Box className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Slot Kosong · Tersedia (Maks 15 Box / 450 Kg)</span>
                      </div>
                    )}
                  </div>

                  {/* Kolom 3: Compact Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 justify-end">
                    <button
                      type="button"
                      onClick={() => onSlotClick(slot)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                      title="Buka rincian lengkap slot"
                    >
                      Detail
                    </button>

                    {!isBlocked && (
                      <button
                        type="button"
                        onClick={() => onOpenScannerForSlot(slot.slotCode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          isOccupied
                            ? 'bg-slate-900 hover:bg-black text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isOccupied ? 'Scan' : 'Racking'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
