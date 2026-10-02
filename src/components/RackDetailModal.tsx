/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Box, 
  Boxes, 
  PackageOpen, 
  Scale, 
  Search, 
  Filter, 
  QrCode, 
  ArrowUpRight, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Calendar, 
  ExternalLink,
  ChevronRight,
  Eye,
  LayoutGrid,
  List
} from 'lucide-react';
import { RackData, RackSlot, UserRole } from '../types';

interface RackDetailModalProps {
  rack: RackData | null;
  isOpen: boolean;
  onClose: () => void;
  onSlotClick: (slot: RackSlot) => void;
  onOpenScannerForSlot: (slotCode: string) => void;
  onOpenPrintRackQr?: (rackId: string) => void;
  userRole?: UserRole;
}

export const RackDetailModal: React.FC<RackDetailModalProps> = ({
  rack,
  isOpen,
  onClose,
  onSlotClick,
  onOpenScannerForSlot,
  onOpenPrintRackQr,
  userRole = 'operator'
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'visual'>('table');
  const [filterStatus, setFilterStatus] = useState<'all' | 'occupied' | 'empty'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBay, setSelectedBay] = useState<string>('all');

  if (!isOpen || !rack) return null;

  const allSlots = Object.values(rack.slots || {}).sort((a, b) => {
    // Sort by Bay then Level descending
    if (a.bay !== b.bay) {
      return a.bay.localeCompare(b.bay);
    }
    return b.level - a.level;
  });

  const palletsPerLoc = rack.palletsPerSlot || 4;
  const locationCount = rack.slotsList?.length || allSlots.length;
  const totalPalletCapacity = rack.slotCount && rack.slotCount > locationCount ? rack.slotCount : locationCount * palletsPerLoc;

  const occupiedSlots = allSlots.filter(s => s.status === 'occupied' && s.pallet);
  const blockedSlots = allSlots.filter(s => s.isBlocked || s.status === 'maintenance');
  const emptySlots = allSlots.filter(s => s.status === 'empty' && !s.isBlocked);
  const blockedPallets = blockedSlots.length * palletsPerLoc;
  const emptyPalletSlots = Math.max(0, totalPalletCapacity - occupiedSlots.length - blockedPallets);

  const totalBoxes = occupiedSlots.reduce((sum, s) => sum + (s.pallet?.quantityBox || 0), 0);
  const totalWeightKg = totalBoxes * 30;
  const occupancyPct = totalPalletCapacity > 0 ? Math.round((occupiedSlots.length / totalPalletCapacity) * 100) : 0;

  // List unique bays
  const availableBays = Array.from(new Set(allSlots.map(s => s.bay).filter(Boolean))).sort();

  // Filtered slots
  const filteredSlots = allSlots.filter(slot => {
    if (selectedBay !== 'all' && slot.bay?.toLowerCase() !== selectedBay.toLowerCase()) {
      return false;
    }
    const isOccupied = slot.status === 'occupied' && slot.pallet;
    if (filterStatus === 'occupied' && !isOccupied) return false;
    if (filterStatus === 'empty' && isOccupied) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const codeMatch = slot.slotCode.toLowerCase().includes(q);
      const prodMatch = (slot.pallet?.itemName || '').toLowerCase().includes(q);
      const skuMatch = (slot.pallet?.itemCode || '').toLowerCase().includes(q);
      const batchMatch = (slot.pallet?.batchNo || '').toLowerCase().includes(q);
      const cartonMatch = (slot.pallet?.cartonRangeText || '').toLowerCase().includes(q);
      return codeMatch || prodMatch || skuMatch || batchMatch || cartonMatch;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-6xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ===================================================================== */}
        {/* HEADER MODAL DETAIL RAK                                              */}
        {/* ===================================================================== */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-2xl font-mono flex items-center justify-center shadow-md">
              {rack.id}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-lg sm:text-xl text-white tracking-tight">
                  Detail Isi Dalam Rak {rack.id}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-cyan-300 border border-cyan-400/30">
                  {rack.primaryProduct || 'Finished Goods Warehouse'}
                </span>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                  occupancyPct > 80 ? 'bg-rose-500 text-white' : occupancyPct > 40 ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {occupancyPct}% Terisi
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Kapasitas {allSlots.length} Slot Pallet &bull; Tingkat 4 Level (Dasar ke Atas) &bull; Lokasi Bay {availableBays[0]?.toUpperCase()} s/d {availableBays[availableBays.length - 1]?.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Tutup Detail"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* KPI SUMMARY CARDS DALAM RAK (KOMPAK)                                 */}
        {/* ===================================================================== */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Kapasitas Pallet</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-base font-black text-slate-900 font-mono">{totalPalletCapacity}</strong>
                <span className="text-[11px] text-slate-500">Pallet ({locationCount} Alamat × {palletsPerLoc})</span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-700 uppercase block">Slot Terisi</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-base font-black text-emerald-800 font-mono">{occupiedSlots.length}</strong>
                <span className="text-[11px] text-emerald-700">Pallet ({occupancyPct}%)</span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-cyan-200 shadow-2xs">
              <span className="text-[10px] font-bold text-cyan-700 uppercase block">Slot Kosong Ready</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-base font-black text-cyan-800 font-mono">{emptyPalletSlots}</strong>
                <span className="text-[11px] text-cyan-700">Pallet Ready</span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">Total Box di Rak</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-base font-black text-blue-800 font-mono">{totalBoxes.toLocaleString('id-ID')}</strong>
                <span className="text-[11px] text-blue-700">BOX (Maks {totalPalletCapacity * 15})</span>
              </div>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-purple-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-purple-700 uppercase block">Total Berat Netto</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <strong className="text-base font-black text-purple-800 font-mono">{totalWeightKg.toLocaleString('id-ID')}</strong>
                <span className="text-[11px] text-purple-700">Kg (Maks {totalPalletCapacity * 15 * 30} Kg)</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TOOLBAR FILTER & SEARCH DALAM RAK                                    */}
        {/* ===================================================================== */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 bg-white">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari slot (cth: A-01-01), batch, barang..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Filter Status */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  filterStatus === 'all' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({allSlots.length})
              </button>
              <button
                onClick={() => setFilterStatus('occupied')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  filterStatus === 'occupied' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Terisi ({occupiedSlots.length})
              </button>
              <button
                onClick={() => setFilterStatus('empty')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  filterStatus === 'empty' ? 'bg-slate-700 text-white shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Kosong ({emptySlots.length})
              </button>
            </div>

            {/* View Mode Toggle: Table vs 2D Elevation Grid */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold ml-1">
              <button
                onClick={() => setActiveTab('table')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'table' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
              <button
                onClick={() => setActiveTab('visual')}
                className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'visual' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid 2D</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Bay Pills */}
        <div className="px-4 sm:px-6 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">Lokasi Bay:</span>
          <button
            onClick={() => setSelectedBay('all')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold shrink-0 transition ${
              selectedBay === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            Semua Bay ({availableBays.length})
          </button>
          {availableBays.map(bay => (
            <button
              key={bay}
              onClick={() => setSelectedBay(bay)}
              className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold shrink-0 transition ${
                selectedBay.toLowerCase() === bay.toLowerCase()
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              Bay {bay.toUpperCase()}
            </button>
          ))}
        </div>

        {/* ===================================================================== */}
        {/* MAIN CONTENT: DAFTAR SLOT & BARANG DI DALAM RAK                     */}
        {/* ===================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {filteredSlots.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada slot yang cocok dengan filter atau kata kunci</p>
              <p className="text-xs text-slate-400 mt-1">Coba ganti kata kunci pencarian atau ubah pilihan filter di atas.</p>
            </div>
          ) : activeTab === 'table' ? (
            /* =============================================================== */
            /* TABEL DETAIL SEMUA SLOT DI DALAM RAK (FIT TANPA SCROLL HORIZONTAL) */
            /* =============================================================== */
            <div className="rounded-2xl border border-slate-200 shadow-2xs overflow-hidden bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-extrabold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-2 text-center w-10">No</th>
                    <th className="py-3 px-3 w-28">Kode Slot</th>
                    <th className="py-3 px-2 text-center w-24">Status</th>
                    <th className="py-3 px-3">Nama Barang Jadi</th>
                    <th className="py-3 px-3 w-36">Batch & Range</th>
                    <th className="py-3 px-3 text-right w-32">Jumlah Box & Berat</th>
                    <th className="py-3 px-3 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-medium text-slate-800">
                  {filteredSlots.map((slot, index) => {
                    const isOccupied = slot.status === 'occupied' && slot.pallet;
                    const p = slot.pallet;

                    return (
                      <tr 
                        key={slot.slotCode}
                        className={`hover:bg-blue-50/60 transition ${
                          isOccupied ? 'bg-white' : 'bg-slate-50/40 text-slate-500'
                        }`}
                      >
                        <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => onSlotClick(slot)}
                            className="font-mono font-black text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer text-xs"
                            title="Klik untuk lihat detail slot ini"
                          >
                            <span>{slot.slotCode}</span>
                            <ArrowUpRight className="w-3 h-3 opacity-60" />
                          </button>
                          <span className="text-[10px] font-semibold text-slate-500 block">
                            Level {slot.level} &bull; Bay {slot.bay?.toUpperCase() || '-'}
                          </span>
                        </td>

                        <td className="py-2.5 px-2 text-center">
                          {slot.isBlocked || slot.status === 'maintenance' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              KENDALA
                            </span>
                          ) : isOccupied ? (
                            slot.pallet?.icStatus === 'BO' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                                </span>
                                BO
                              </span>
                            ) : slot.pallet?.icStatus === 'HOLD' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                </span>
                                HOLD
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                OK
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              KOSONG
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {slot.isBlocked || slot.status === 'maintenance' ? (
                            <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                              <strong className="block text-xs font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>Terkendala Lapangan</span>
                              </strong>
                              <span className="text-[10px] text-amber-800 block">
                                {slot.blockReason || 'Tiang rusak / terhalang fisik di lapangan'}
                              </span>
                            </div>
                          ) : isOccupied && p ? (
                            <div>
                              <strong className="text-slate-900 block font-bold text-xs" title={p.itemName}>
                                {p.itemName}
                              </strong>
                              <span className="text-[10px] text-slate-500 font-mono">{p.itemCode}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Siap Racking (Kosong) -</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 font-mono">
                          {isOccupied && p ? (
                            <div>
                              <span className="font-bold text-slate-800 text-xs block" title={p.batchNo || '-'}>
                                {p.batchNo || '-'}
                              </span>
                              <span className="text-[10px] text-slate-500 block" title={p.cartonRangeText || '-'}>
                                {p.cartonRangeText || '-'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono">
                          {isOccupied && p ? (
                            <div>
                              <span className="text-emerald-700 text-xs font-black block">
                                {p.quantityBox} BOX
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold block">
                                {(p.quantityBox * 30).toLocaleString('id-ID')} Kg
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {isOccupied ? (
                            <button
                              type="button"
                              onClick={() => onSlotClick(slot)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 w-full shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Detail Slot</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenScannerForSlot(slot.slotCode)}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1 w-full shadow-2xs"
                            >
                              <QrCode className="w-3.5 h-3.5 text-cyan-700" />
                              <span>Isi Putaway</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* =============================================================== */
            /* TAB GRID VISUALISASI ELEVASI 2D PER BAY                         */
            /* =============================================================== */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSlots.map(slot => {
                const isOccupied = slot.status === 'occupied' && slot.pallet;
                const p = slot.pallet;

                return (
                  <div
                    key={slot.slotCode}
                    onClick={() => onSlotClick(slot)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2.5 shadow-2xs hover:shadow-md ${
                      isOccupied
                        ? p?.icStatus === 'BO'
                          ? 'bg-rose-50/40 border-rose-300 hover:border-rose-500'
                          : p?.icStatus === 'HOLD'
                          ? 'bg-blue-50/40 border-blue-300 hover:border-blue-500'
                          : 'bg-emerald-50/30 border-emerald-300 hover:border-emerald-500'
                        : 'bg-white border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-mono font-black text-xs ${
                          isOccupied 
                            ? p?.icStatus === 'BO'
                              ? 'bg-rose-600 text-white'
                              : p?.icStatus === 'HOLD'
                              ? 'bg-blue-600 text-white'
                              : 'bg-emerald-600 text-white' 
                            : 'bg-slate-800 text-cyan-300'
                        }`}>
                          {slot.slotCode}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Level {slot.level} &bull; Bay {slot.bay?.toUpperCase()}
                        </span>
                      </div>
                      
                      {isOccupied && p ? (
                        p.icStatus === 'BO' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                            </span>
                            BO
                          </span>
                        ) : p.icStatus === 'HOLD' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                            </span>
                            HOLD
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            TERISI (OK)
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          KOSONG
                        </span>
                      )}
                    </div>

                    {isOccupied && p ? (
                      <div className="space-y-1.5 text-xs">
                        <strong className="text-slate-900 block font-bold line-clamp-1">{p.itemName}</strong>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Batch:</span>
                          <span className="font-mono font-bold text-slate-800">{p.batchNo || '-'}</span>
                        </div>
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>Rentang:</span>
                          <span className="font-mono font-bold text-slate-800">{p.cartonRangeText || '-'}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                          <span className="text-[11px] text-slate-500">Muatan:</span>
                          <strong className="font-mono text-emerald-800 font-black text-sm">{p.quantityBox} BOX</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center space-y-1">
                        <PackageOpen className="w-8 h-8 text-slate-300 mx-auto" />
                        <span className="text-xs font-bold text-slate-600 block">Slot Tersedia (Ready)</span>
                        <span className="text-[10px] text-slate-400 block">Maksimal 1 Pallet / 15 Box</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400 font-semibold">Klik untuk rincian</span>
                      <span className="text-blue-700 font-bold text-xs flex items-center gap-0.5">
                        <span>Detail</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* ===================================================================== */}
        {/* FOOTER MODAL                                                         */}
        {/* ===================================================================== */}
        <div className="bg-slate-50 p-3 sm:p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Menampilkan <strong className="text-slate-900 font-mono">{filteredSlots.length}</strong> dari <strong className="text-slate-900 font-mono">{allSlots.length}</strong> slot di Rak {rack.id}.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
