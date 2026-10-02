/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye, 
  Printer, 
  ShieldAlert, 
  Sparkles, 
  X, 
  Check, 
  Grid3X3, 
  AlertTriangle, 
  ShieldCheck, 
  Wrench, 
  Boxes, 
  Scale, 
  Search,
  Filter,
  CheckCircle2,
  Ban,
  RefreshCw,
  Layers,
  Columns
} from 'lucide-react';
import { RackData, RackSlot, UserRole } from '../types';
import { 
  generateSlotsFromLevelAndBays, 
  parseSlotsString, 
  bayCountToChar, 
  charToBayCount, 
  SlotAddressFormat 
} from '../utils/barcode';

interface MasterRakViewProps {
  racks: Record<string, RackData>;
  userRole: UserRole;
  onSaveRack: (rack: RackData) => void;
  onDeleteRack: (rackId: string) => void;
  onSelectRackForVisual: (rackId: string) => void;
  onPrintRackBarcodes: (rackId: string) => void;
}

const COMMON_OBSTACLE_REASONS = [
  'Tiang bengkok akibat benturan forklift',
  'Pipa hydrant / sprinkler bocor di atas rak',
  'Balok penopang (beam) melengkung / retak',
  'Terhalang instalasi blower pendingin / jalur kabel',
  'Kerusakan lantai / dudukan tiang amblas',
  'Slot tertutup tumpukan palet transit sementara',
  'Lainnya (Ketik manual)'
];

export const MasterRakView: React.FC<MasterRakViewProps> = ({
  racks,
  userRole,
  onSaveRack,
  onDeleteRack,
  onSelectRackForVisual,
  onPrintRackBarcodes
}) => {
  // Modal Add / Edit Rack State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRackId, setEditingRackId] = useState<string | null>(null);

  // Form State
  const [idRak, setIdRak] = useState('');
  const [produkUtama, setProdukUtama] = useState('INSTANT COFFEE SIC 25 BR');
  const [daftarSlot, setDaftarSlot] = useState('');
  const [palletsPerSlot, setPalletsPerSlot] = useState<number>(4);

  // Generator & Sync State (Tingkat, Bay Akhir, Jumlah Baris, Format & Auto-Sync)
  const [genLevels, setGenLevels] = useState<number>(4);
  const [genMaxBay, setGenMaxBay] = useState<string>('m');
  const [genBayCount, setGenBayCount] = useState<number>(13);
  const [slotFormat, setSlotFormat] = useState<SlotAddressFormat>('with_prefix');
  const [autoSyncAddress, setAutoSyncAddress] = useState<boolean>(true);

  // Modal Kelola Kendala Lapangan State
  const [obstacleRackId, setObstacleRackId] = useState<string | null>(null);
  const [obstacleSearch, setObstacleSearch] = useState('');
  const [obstacleFilter, setObstacleFilter] = useState<'all' | 'blocked' | 'normal'>('all');
  const [selectedSlotForEdit, setSelectedSlotForEdit] = useState<string | null>(null);
  const [tempReasonChoice, setTempReasonChoice] = useState(COMMON_OBSTACLE_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState('');

  // Modal Konfirmasi Hapus Rak State
  const [rackToDelete, setRackToDelete] = useState<RackData | null>(null);

  // Hak akses edit terbuka penuh untuk Superadmin, Supervisor (SPV), dan Admin
  const canEdit = userRole === 'superadmin' || userRole === 'supervisor' || userRole === 'admin';

  // Helper untuk sinkronisasi otomatis daftar alamat
  const syncSlotsString = (
    levels: number,
    maxBay: string,
    prefix: string,
    format: SlotAddressFormat,
    pallets: number
  ) => {
    const generated = generateSlotsFromLevelAndBays(levels, maxBay, prefix, format, pallets, true);
    setDaftarSlot(generated.join(', '));
  };

  const handleOpenAdd = () => {
    setEditingRackId(null);
    setIdRak('');
    setProdukUtama('INSTANT COFFEE SIC 25 BR');
    setPalletsPerSlot(4);
    setGenLevels(4);
    setGenMaxBay('m');
    setGenBayCount(13);
    setSlotFormat('with_prefix');
    setAutoSyncAddress(true);
    // Default 52 alamat lokasi: 4 tingkat x 13 baris (Bay a s/d m)
    syncSlotsString(4, 'm', '', 'with_prefix', 4);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rack: RackData) => {
    setEditingRackId(rack.id);
    setIdRak(rack.id);
    setProdukUtama(rack.primaryProduct);
    const pPerSlot = rack.palletsPerSlot || 4;
    setPalletsPerSlot(pPerSlot);

    // Deteksi tingkat maksimal yang ada pada rak
    let detectedLevels = rack.maxLevels || 4;
    if (rack.slotsList && rack.slotsList.length > 0) {
      rack.slotsList.forEach(s => {
        const m = s.match(/(\d+)/);
        if (m) {
          const l = parseInt(m[1], 10);
          if (l > detectedLevels) detectedLevels = l;
        }
      });
    }

    // Deteksi bay/kolom baris terakhir pada rak (misal 'n' untuk 14 baris pada Rak D)
    let lastBay = 'm';
    if (rack.baysList && rack.baysList.length > 0) {
      lastBay = rack.baysList[rack.baysList.length - 1];
    } else if (rack.slotsList && rack.slotsList.length > 0) {
      rack.slotsList.forEach(s => {
        const m = s.match(/([a-zA-Z]+)$/);
        if (m) {
          const b = m[1].toLowerCase();
          if (b > lastBay) lastBay = b;
        }
      });
    }

    const bayCount = charToBayCount(lastBay);
    setGenLevels(detectedLevels);
    setGenMaxBay(lastBay);
    setGenBayCount(bayCount);
    setSlotFormat('with_prefix');
    setAutoSyncAddress(true);

    // Isi daftar slot awal dari data rak
    if (rack.slotsList && rack.slotsList.length > 0) {
      const formatted = rack.slotsList.map(s => {
        const clean = s.trim();
        return clean.toUpperCase().startsWith(rack.id.toUpperCase()) ? clean : `${rack.id}${clean}`;
      });
      setDaftarSlot(formatted.join(', '));
    } else {
      syncSlotsString(detectedLevels, lastBay, rack.id, 'with_prefix', pPerSlot);
    }

    setIsModalOpen(true);
  };

  // Handler perubahan Tingkat / Level (Otomatis perbarui daftar alamat & qty jika autoSync aktif)
  const handleLevelsChange = (newLevels: number) => {
    const safeVal = Math.max(1, Math.min(20, newLevels || 1));
    setGenLevels(safeVal);
    if (autoSyncAddress) {
      syncSlotsString(safeVal, genMaxBay, idRak, slotFormat, palletsPerSlot);
    }
  };

  // Handler perubahan Jumlah Baris / Bay (Otomatis perbarui daftar alamat & qty jika autoSync aktif)
  const handleBayCountChange = (newCount: number) => {
    const safeCount = Math.max(1, Math.min(26, newCount || 1));
    const newChar = bayCountToChar(safeCount);
    setGenBayCount(safeCount);
    setGenMaxBay(newChar);
    if (autoSyncAddress) {
      syncSlotsString(genLevels, newChar, idRak, slotFormat, palletsPerSlot);
    }
  };

  const handleMaxBayLetterChange = (letter: string) => {
    const clean = (letter || 'a').toLowerCase().slice(-1);
    const safeCount = charToBayCount(clean);
    setGenMaxBay(clean);
    setGenBayCount(safeCount);
    if (autoSyncAddress) {
      syncSlotsString(genLevels, clean, idRak, slotFormat, palletsPerSlot);
    }
  };

  // Handler perubahan Qty Pallet per Alamat
  const handlePalletsPerSlotChange = (newPallets: number) => {
    const safePallets = Math.max(1, Math.min(20, newPallets || 4));
    setPalletsPerSlot(safePallets);
    if (autoSyncAddress) {
      syncSlotsString(genLevels, genMaxBay, idRak, slotFormat, safePallets);
    }
  };

  // Handler perubahan Format Alamat
  const handleSlotFormatChange = (newFormat: SlotAddressFormat) => {
    setSlotFormat(newFormat);
    syncSlotsString(genLevels, genMaxBay, idRak, newFormat, palletsPerSlot);
  };

  // Manual regenerate / refresh button
  const handleManualRegenerate = () => {
    syncSlotsString(genLevels, genMaxBay, idRak, slotFormat, palletsPerSlot);
  };

  // Alias handleAutoGenerate to prevent any ReferenceError
  const handleAutoGenerate = handleManualRegenerate;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = idRak.trim().toUpperCase();
    if (!cleanId) return;

    const parsedSlots = parseSlotsString(daftarSlot, cleanId);
    if (parsedSlots.length === 0) {
      alert('Daftar slot alamat tidak boleh kosong!');
      return;
    }

    const targetPalletsPerSlot = palletsPerSlot > 0 ? palletsPerSlot : 4;
    const existingSlots = editingRackId && racks[editingRackId] ? racks[editingRackId].slots : {};
    const slotsObj: RackData['slots'] = {};
    const baysSet = new Set<string>();
    let maxLevel = 1;

    parsedSlots.forEach(s => {
      // s is suffix like '1a', '2b', etc.
      const match = s.match(/^(\d+)([a-zA-Z]+)$/);
      if (match) {
        const lvl = parseInt(match[1], 10);
        const bay = match[2].toLowerCase();
        baysSet.add(bay);
        if (lvl > maxLevel) maxLevel = lvl;

        const fullCode = `${cleanId}${lvl}${bay}`;
        const existing = existingSlots[fullCode] || existingSlots[`${cleanId}${s}`] || existingSlots[s.toUpperCase()];
        slotsObj[fullCode] = existing ? {
          ...existing,
          level: lvl,
          bay,
          maxPalletCapacity: targetPalletsPerSlot
        } : {
          slotCode: fullCode,
          level: lvl,
          bay,
          status: 'empty',
          pallets: [],
          maxPalletCapacity: targetPalletsPerSlot,
          isBlocked: false
        };
      }
    });

    const locationCount = parsedSlots.length; // e.g. 56 alamat
    const totalPalletSlots = locationCount * targetPalletsPerSlot; // e.g. 56 x 4 = 224 Pallet Slots
    const baysList = Array.from(baysSet).sort();

    const newRack: RackData = {
      id: cleanId,
      primaryProduct: produkUtama.trim() || 'INSTANT COFFEE SIC 25 BR',
      slotsList: parsedSlots,
      slotCount: totalPalletSlots, // Total kapasitas pallet rak (dikali 4 atau targetPalletsPerSlot)
      locationCount,
      palletsPerSlot: targetPalletsPerSlot,
      slots: slotsObj,
      maxLevels: maxLevel,
      baysList,
      notes: `Rak Pallet ${cleanId} - ${baysList.length} Baris x ${maxLevel} Tingkat = ${locationCount} Alamat x ${targetPalletsPerSlot} Pallet = ${totalPalletSlots} Pallet (${totalPalletSlots * 15} Box / ${totalPalletSlots * 15 * 30} Kg Maks)`
    };

    onSaveRack(newRack);
    setIsModalOpen(false);
  };

  // Handlers for Slot Obstacles (Kendala Lapangan)
  const activeObstacleRack = obstacleRackId ? racks[obstacleRackId] : null;

  const handleToggleBlockSlot = (slotCode: string, currentBlocked: boolean) => {
    if (!activeObstacleRack || !canEdit) return;

    if (currentBlocked) {
      // Unblock (Restore to Ready/Empty)
      const currentSlot = activeObstacleRack.slots[slotCode];
      if (!currentSlot) return;

      const updatedSlots: Record<string, RackSlot> = {
        ...activeObstacleRack.slots,
        [slotCode]: {
          ...currentSlot,
          isBlocked: false,
          blockReason: undefined,
          blockedAt: undefined,
          blockedBy: undefined,
          status: currentSlot.pallet ? 'occupied' : 'empty'
        }
      };

      const updatedRack: RackData = {
        ...activeObstacleRack,
        slots: updatedSlots
      };

      onSaveRack(updatedRack);
      setSelectedSlotForEdit(null);
    } else {
      // Open reason picker for this slot
      setSelectedSlotForEdit(slotCode);
      setTempReasonChoice(COMMON_OBSTACLE_REASONS[0]);
      setCustomReasonText('');
    }
  };

  const handleSaveObstacleForSlot = (slotCode: string) => {
    if (!activeObstacleRack || !canEdit) return;
    const currentSlot = activeObstacleRack.slots[slotCode];
    if (!currentSlot) return;

    const finalReason = tempReasonChoice === 'Lainnya (Ketik manual)'
      ? (customReasonText.trim() || 'Terkendala fisik di lapangan')
      : tempReasonChoice;

    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const updatedSlots: Record<string, RackSlot> = {
      ...activeObstacleRack.slots,
      [slotCode]: {
        ...currentSlot,
        isBlocked: true,
        blockReason: finalReason,
        blockedAt: nowStr,
        blockedBy: userRole.toUpperCase(),
        status: 'maintenance'
      }
    };

    const updatedRack: RackData = {
      ...activeObstacleRack,
      slots: updatedSlots
    };

    onSaveRack(updatedRack);
    setSelectedSlotForEdit(null);
  };

  const rackList = Object.values(racks).sort((a, b) => a.id.localeCompare(b.id));

  // Perhitungan agregat total seluruh rak gudang (sinkron dengan Dashboard)
  let totalMasterLocations = 0;
  let totalMasterPalletCapacity = 0;
  let totalMasterOccupiedPallets = 0;
  let totalMasterOccupiedBoxes = 0;
  let totalMasterBlockedLocations = 0;

  rackList.forEach(rack => {
    const palletsPerLoc = rack.palletsPerSlot || 4;
    const locationCount = rack.slotsList?.length || Object.keys(rack.slots).length;
    const rackCap = rack.slotCount && rack.slotCount > locationCount ? rack.slotCount : locationCount * palletsPerLoc;
    
    totalMasterLocations += locationCount;
    totalMasterPalletCapacity += rackCap;

    Object.values(rack.slots).forEach(slot => {
      if (slot.isBlocked || slot.status === 'maintenance') {
        totalMasterBlockedLocations++;
      } else if (slot.status === 'occupied') {
        const pCount = (slot.pallets && slot.pallets.length > 0) ? slot.pallets.length : (slot.pallet ? 1 : 1);
        totalMasterOccupiedPallets += pCount;
        if (slot.pallets && slot.pallets.length > 0) {
          totalMasterOccupiedBoxes += slot.pallets.reduce((acc, p) => acc + (p.quantityBox || 15), 0);
        } else if (slot.pallet) {
          totalMasterOccupiedBoxes += slot.pallet.quantityBox || 15;
        } else {
          totalMasterOccupiedBoxes += 15;
        }
      }
    });
  });

  const totalMasterBlockedPallets = totalMasterBlockedLocations * 4;
  const totalMasterAvailablePallets = Math.max(0, totalMasterPalletCapacity - totalMasterOccupiedPallets - totalMasterBlockedPallets);
  const totalMasterOccupiedKg = totalMasterOccupiedBoxes * 30;
  const totalMasterAvailableBoxes = totalMasterAvailablePallets * 15;
  const totalMasterAvailableKg = totalMasterAvailableBoxes * 30;
  const totalMasterBoxCapacity = totalMasterPalletCapacity * 15;
  const totalMasterKgCapacity = totalMasterBoxCapacity * 30;

  const masterRawOccupancyPct = totalMasterPalletCapacity > 0 ? (totalMasterOccupiedPallets / totalMasterPalletCapacity) * 100 : 0;
  const masterRawAvailablePct = totalMasterPalletCapacity > 0 ? (totalMasterAvailablePallets / totalMasterPalletCapacity) * 100 : 0;

  const formatPct = (val: number, isOccupied: boolean, occCount: number): string => {
    if (occCount === 0) return isOccupied ? '0%' : '100%';
    if (isOccupied) {
      if (val < 0.1 && val > 0) return `${val.toFixed(2)}%`;
      if (val < 10) return `${val.toFixed(2)}%`;
      return `${val.toFixed(1)}%`;
    } else {
      if (occCount > 0 && val >= 99) {
        return `${val.toFixed(2)}%`;
      }
      return `${val.toFixed(1)}%`;
    }
  };

  const masterOccupancyPctStr = formatPct(masterRawOccupancyPct, true, totalMasterOccupiedPallets);
  const masterAvailablePctStr = formatPct(masterRawAvailablePct, false, totalMasterOccupiedPallets);

  // Live calculation helpers for modal
  const parsedPreviewSlots = parseSlotsString(daftarSlot);
  const previewLocations = parsedPreviewSlots.length;
  const previewPallets = previewLocations * (palletsPerSlot || 4);
  const previewBoxes = previewPallets * 15;
  const previewWeightKg = previewBoxes * 30;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-8 bg-cyan-500 rounded-full inline-block"></span>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">
              Master Rak Gudang (WMS Finished Goods)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-xs font-black uppercase">
              1 Slot = 4 Pallet
            </span>
          </div>
          <p className="text-slate-600 text-sm mt-1 max-w-3xl">
            Pusat konfigurasi master lokasi & kapasitas rak fisik. Standar gudang: <strong>1 Pallet = 15 Box (450 Kg) &bull; 1 Box = 30 Kg</strong>.
            Total gudang memiliki <strong>{totalMasterPalletCapacity.toLocaleString('id-ID')} Pallet Slots ({totalMasterBoxCapacity.toLocaleString('id-ID')} Box)</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onPrintRackBarcodes('A')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-cyan-300 font-bold text-sm shadow-sm transition cursor-pointer"
            title="Cetak stiker QR code rak dengan seling warna"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Cetak Stiker Rak</span>
          </button>

          {canEdit ? (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-bold text-sm shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rak Baru</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Mode Baca (Operator)
            </div>
          )}
        </div>
      </div>

      {/* SINKRONISASI TOTAL KPI MASTER RAK (SINKRON 100% DENGAN DASHBOARD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Kapasitas Total */}
        <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-1">
            Kapasitas Total Master Rak
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-slate-950">
              {totalMasterPalletCapacity.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-black text-slate-600">Pallet Slots</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-semibold flex items-center justify-between">
            <span>{rackList.length} Rak &bull; {totalMasterLocations} Alamat Fisik</span>
            <span className="text-cyan-700 font-mono font-bold">x4 Pallet</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
            Maks: {totalMasterBoxCapacity.toLocaleString('id-ID')} Box ({totalMasterKgCapacity.toLocaleString('id-ID')} Kg)
          </div>
        </div>

        {/* KPI 2: Pallet Terisi (Stok Aktual) */}
        <div className="bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
              Pallet Terisi (Stok Aktual)
            </span>
            <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">
              {masterOccupancyPctStr} Utilisasi
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-blue-950">
              {totalMasterOccupiedPallets}
            </span>
            <span className="text-xs font-black text-blue-700">Pallet Terisi</span>
          </div>
          <div className="text-[11px] text-blue-900 mt-1 font-bold flex items-center justify-between">
            <span>{totalMasterOccupiedBoxes} BOX Barang Jadi</span>
            <span className="font-mono text-slate-500 font-normal">{totalMasterOccupiedKg.toLocaleString('id-ID')} Kg</span>
          </div>
          <div className="mt-1 pt-1 border-t border-blue-100 text-[10px] text-blue-700 font-semibold">
            Sinkron dengan Total Box Dashboard
          </div>
        </div>

        {/* KPI 3: Pallet Tersedia (Available) */}
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">
              Ketersediaan Pallet Available
            </span>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
              {masterAvailablePctStr} Kosong
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-emerald-950">
              {totalMasterAvailablePallets.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-black text-emerald-700">Pallet Siap Pakai</span>
          </div>
          <div className="text-[11px] text-emerald-900 mt-1 font-bold flex items-center justify-between">
            <span>{totalMasterAvailableBoxes.toLocaleString('id-ID')} Box Potensial</span>
            <span className="font-mono text-slate-500 font-normal">{totalMasterAvailableKg.toLocaleString('id-ID')} Kg</span>
          </div>
          <div className="mt-1 pt-1 border-t border-emerald-100 text-[10px] text-emerald-700 font-semibold">
            Sinkron dengan Pallet Available Dashboard
          </div>
        </div>

        {/* KPI 4: Kendala Fisik Lapangan */}
        <div className="bg-white p-4 rounded-2xl border-2 border-amber-200 shadow-xs">
          <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider block mb-1">
            Status Fisik Lapangan
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-mono text-amber-950">
              {totalMasterBlockedLocations}
            </span>
            <span className="text-xs font-black text-amber-700">Alamat Terkendala</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 font-semibold flex items-center justify-between">
            <span>{totalMasterBlockedPallets} Pallet Diblokir</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
              {totalMasterBlockedLocations === 0 ? 'Normal 100%' : 'Maintenance'}
            </span>
          </div>
          <div className="mt-1 pt-1 border-t border-amber-100 text-[10px] text-slate-400">
            Dikelola via tombol Kendala di tabel
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-800 text-lg">Daftar Master Rak & Kapasitas</h3>
            <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {rackList.length} Rak Terdaftar
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              Kapasitas Baku: 4 Pallet/Alamat (60 Box / 1.800 Kg)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
              Standar Produk: 1 Box = 30 Kg
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-xs uppercase tracking-wider font-semibold border-b border-slate-800">
                <th className="py-4 px-6">ID RAK & STRUKTUR</th>
                <th className="py-4 px-6">PRODUK UTAMA</th>
                <th className="py-4 px-6 text-center">JUMLAH SLOT (KAPASITAS)</th>
                <th className="py-4 px-6 text-center">KENDALA LAPANGAN</th>
                <th className="py-4 px-6 text-center">UTILISASI STOK</th>
                <th className="py-4 px-6 text-right">AKSI SISTEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {rackList.map((rack) => {
                const palletsPerLoc = rack.palletsPerSlot || 4;
                const locationCount = rack.slotsList?.length || Object.keys(rack.slots).length;
                // Kapasitas dikali 4 pallet per slot (e.g. 52 x 4 = 208 Pallet Slots)
                const totalPalletCapacity = rack.slotCount && rack.slotCount > locationCount 
                  ? rack.slotCount 
                  : locationCount * palletsPerLoc;
                const maxBoxes = totalPalletCapacity * 15;
                const maxWeightKg = maxBoxes * 30;

                const allSlots = Object.values(rack.slots);
                const occupiedSlotsCount = allSlots.filter(s => s.status === 'occupied').length;
                const occupiedPalletsInRack = allSlots.reduce((acc, s) => {
                  if (s.status === 'occupied') {
                    const pCount = (s.pallets && s.pallets.length > 0) ? s.pallets.length : (s.pallet ? 1 : 1);
                    return acc + pCount;
                  }
                  return acc;
                }, 0);
                const actualBoxesInRack = allSlots.reduce((acc, s) => {
                  if (s.status === 'occupied') {
                    if (s.pallets && s.pallets.length > 0) {
                      return acc + s.pallets.reduce((pAcc, p) => pAcc + (p.quantityBox || 15), 0);
                    } else if (s.pallet) {
                      return acc + (s.pallet?.quantityBox || 15);
                    }
                    return acc + 15;
                  }
                  return acc;
                }, 0);
                const blockedSlots = allSlots.filter(s => s.isBlocked || s.status === 'maintenance');
                const rawOccupancy = totalPalletCapacity > 0 ? (occupiedPalletsInRack / totalPalletCapacity) * 100 : 0;
                const occupancyPercent = formatPct(rawOccupancy, true, occupiedPalletsInRack);
                const rawBarWidth = Math.max(occupiedPalletsInRack > 0 ? 3 : 0, Math.min(100, rawOccupancy));

                return (
                  <tr key={rack.id} className="hover:bg-cyan-50/40 transition-colors">
                    {/* ID RAK & STRUKTUR */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <span className="w-11 h-11 rounded-2xl bg-slate-900 text-cyan-400 font-black text-lg flex items-center justify-center shadow-xs border border-slate-800">
                          {rack.id}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900 text-base">Rak {rack.id}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {locationCount} Alamat
                            </span>
                          </div>
                          <span className="text-xs text-slate-500 block">
                            {rack.baysList?.length || 13} Baris (Bay a-{(rack.baysList?.[rack.baysList.length - 1] || 'm').toUpperCase()}) &bull; {rack.maxLevels || 4} Tingkat
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* PRODUK UTAMA */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {rack.primaryProduct}
                      </span>
                    </td>

                    {/* JUMLAH SLOT (KAPASITAS DIKALI 4) */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-block bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-black text-slate-950 text-lg font-mono">
                            {totalPalletCapacity}
                          </span>
                          <span className="text-xs font-bold text-cyan-700">Pallet Slots</span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-semibold block">
                          {locationCount} Alamat × {palletsPerLoc} Pallet/Slot
                        </span>
                        <div className="text-[10px] font-mono font-bold text-emerald-800 mt-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Maks: {maxBoxes.toLocaleString('id-ID')} Box ({maxWeightKg.toLocaleString('id-ID')} Kg)
                        </div>
                      </div>
                    </td>

                    {/* KENDALA LAPANGAN (STATUS & TOMBOL KELOLA) */}
                    <td className="py-4 px-6 text-center">
                      {blockedSlots.length > 0 ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                            {blockedSlots.length} Alamat Terkendala
                          </span>
                          <span className="text-[10px] text-rose-700 font-bold block">
                            (Diblokir dari isi Pallet IC)
                          </span>
                          <button
                            onClick={() => setObstacleRackId(rack.id)}
                            className="text-xs font-bold text-cyan-700 hover:text-cyan-900 underline cursor-pointer block mx-auto"
                          >
                            Kelola Kendala
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            100% Siap Pakai
                          </span>
                          <button
                            onClick={() => setObstacleRackId(rack.id)}
                            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer block mx-auto"
                          >
                            Set Kendala
                          </button>
                        </div>
                      )}
                    </td>

                    {/* UTILISASI STOK */}
                    <td className="py-4 px-6">
                      <div className="w-36 mx-auto">
                        <div className="flex justify-between text-xs mb-1 font-semibold">
                          <span className="text-cyan-800 font-mono font-bold">{occupiedPalletsInRack} Pallet Terisi</span>
                          <span className="text-slate-600 font-mono">{occupancyPercent}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              rawOccupancy > 80 ? 'bg-amber-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${rawBarWidth}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 block text-center mt-1 font-mono">
                          {actualBoxesInRack} Box ({actualBoxesInRack * 30} Kg)
                        </span>
                      </div>
                    </td>

                    {/* AKSI SISTEM */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => onSelectRackForVisual(rack.id)}
                          title="Lihat Visual Elevasi Rak 4 Pallet"
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition cursor-pointer font-bold text-xs flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visual</span>
                        </button>

                        <button
                          onClick={() => setObstacleRackId(rack.id)}
                          title="Atur Slot yang Rusak / Terkendala di Lapangan"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition cursor-pointer font-bold text-xs flex items-center gap-1"
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-700" />
                          <span>Kendala</span>
                        </button>

                        <button
                          onClick={() => onPrintRackBarcodes(rack.id)}
                          title={`Cetak Stiker QR Code untuk Rak ${rack.id}`}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-cyan-600" />
                        </button>

                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(rack)}
                              title="Edit Konfigurasi Rak"
                              className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRackToDelete(rack);
                              }}
                              title={`Hapus Rak ${rack.id}`}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* FOOTER TOTAL SINKRON DENGAN DASHBOARD */}
            <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 text-xs font-bold text-slate-900">
              <tr>
                <td className="py-3.5 px-6">
                  <div className="font-black text-slate-950">
                    TOTAL KESELURUHAN ({rackList.length} RAK)
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold">
                    {totalMasterLocations} Alamat Fisik × 4 Pallet/Slot
                  </div>
                </td>
                <td className="py-3.5 px-6">
                  <span className="text-[11px] text-slate-500">Semua Finished Goods</span>
                </td>
                <td className="py-3.5 px-6 text-center">
                  <div className="font-mono font-black text-sm text-slate-950">
                    {totalMasterPalletCapacity.toLocaleString('id-ID')} Pallet Slots
                  </div>
                  <div className="text-[10px] text-emerald-800 font-mono">
                    {totalMasterBoxCapacity.toLocaleString('id-ID')} Box ({totalMasterKgCapacity.toLocaleString('id-ID')} Kg)
                  </div>
                </td>
                <td className="py-3.5 px-6 text-center">
                  <div className="font-mono font-bold text-amber-800">
                    {totalMasterBlockedLocations} Alamat Fisik
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ({totalMasterBlockedPallets} Pallet)
                  </div>
                </td>
                <td className="py-3.5 px-6 text-center">
                  <div className="font-mono font-black text-sm text-blue-900">
                    {totalMasterOccupiedPallets} Terisi ({totalMasterOccupiedBoxes} Box)
                  </div>
                  <div className="text-[10px] font-bold text-blue-700">
                    Utilisasi: {masterOccupancyPctStr} Kapasitas
                  </div>
                </td>
                <td className="py-3.5 px-6 text-right">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Available: {totalMasterAvailablePallets.toLocaleString('id-ID')} Pallet
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT MASTER RAK (DENGAN FORMULA 4 PALLET PER SLOT)     */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-slate-900 text-white rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl border border-slate-800 flex flex-col max-h-[92vh] sm:max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header (Sticky & Always Visible on Mobile) */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-20 shrink-0">
              <div className="pr-2">
                <h3 className="text-base sm:text-lg font-black text-cyan-400 flex items-center gap-2">
                  {editingRackId ? `Edit Konfigurasi Rak ${editingRackId}` : 'Tambah Master Rak Baru'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Setiap slot alamat otomatis memiliki kapasitas 4 pallet (60 Box / 1.800 Kg)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                title="Tutup & Batalkan"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold">Tutup</span>
              </button>
            </div>

            {/* Modal Form (Scrollable Content on Mobile) */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
              <div className="grid grid-cols-2 gap-4">
                {/* ID RAK */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    ID RAK (HURUF)
                  </label>
                  <input
                    type="text"
                    value={idRak}
                    onChange={(e) => setIdRak(e.target.value.toUpperCase())}
                    placeholder="Contoh: A, B, C ..."
                    required
                    maxLength={5}
                    disabled={!!editingRackId}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-black text-lg focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* KAPASITAS PALLET PER ALAMAT (DEFAULT: 4) */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-cyan-400 mb-1.5 flex items-center justify-between">
                    <span>SLOT PALLET PER ALAMAT</span>
                    <span className="text-[10px] text-slate-400 font-normal">Baku: 4 Pallet</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={palletsPerSlot}
                      onChange={(e) => handlePalletsPerSlotChange(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-cyan-500/60 rounded-xl text-cyan-300 font-mono font-black text-lg focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-xs font-bold text-slate-400 shrink-0">Pallet</span>
                  </div>
                </div>
              </div>

              {/* PRODUK UTAMA */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  PRODUK UTAMA (FINISHED GOODS)
                </label>
                <input
                  type="text"
                  value={produkUtama}
                  onChange={(e) => setProdukUtama(e.target.value)}
                  placeholder="Contoh: INSTANT COFFEE SIC 25 BR"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Quick Generator Assistant with Live Level, Bay, and Qty sync */}
              <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-200 font-bold">Generator Cepat Struktur Rak:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleLevelsChange(4);
                        handleBayCountChange(13);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 font-mono transition"
                      title="4 Tingkat x 13 Baris (Bay a s/d m) = 52 Alamat"
                    >
                      Standar (13 Baris a-m)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLevelsChange(4);
                        handleBayCountChange(14);
                      }}
                      className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 hover:bg-cyan-900 text-[11px] text-cyan-200 font-mono font-bold transition"
                      title="Rak D: 4 Tingkat x 14 Baris (Bay a s/d n) = 56 Alamat"
                    >
                      Rak D (14 Baris a-n)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Tingkat / Level */}
                  <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <label className="text-slate-300 font-semibold text-xs">Tingkat / Level:</label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={genLevels}
                        onChange={(e) => handleLevelsChange(parseInt(e.target.value, 10) || 1)}
                        className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-center text-cyan-300 font-mono font-black"
                      />
                      <span className="text-[11px] text-slate-500">Lvl</span>
                    </div>
                  </div>

                  {/* Baris Memanjang (Bay) */}
                  <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Columns className="w-4 h-4 text-cyan-400" />
                      <label className="text-slate-300 font-semibold text-xs">Baris (Bay s/d):</label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={26}
                        value={genBayCount}
                        onChange={(e) => handleBayCountChange(parseInt(e.target.value, 10) || 1)}
                        className="w-14 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-center text-cyan-300 font-mono font-bold"
                        title="Jumlah baris / bay"
                      />
                      <span className="text-[11px] text-slate-500 font-mono">({genMaxBay.toUpperCase()})</span>
                    </div>
                  </div>
                </div>

                {/* Format Tampilan Alamat (Daftar Alamat dengan Qty) */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 text-[11px] font-semibold">Format Alamat di Kolom:</span>
                    <label className="flex items-center gap-1.5 text-[11px] text-cyan-300 font-medium cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSyncAddress}
                        onChange={(e) => setAutoSyncAddress(e.target.checked)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Auto-sync saat tingkat/baris/qty berubah</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSlotFormatChange('with_qty')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition text-left cursor-pointer ${
                        slotFormat === 'with_qty'
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Menampilkan jumlah pallet langsung pada teks alamat lokasi"
                    >
                      <div className="text-cyan-400 font-mono">{idRak || 'D'}1a [{palletsPerSlot}P]</div>
                      <div className="text-[10px] opacity-75 font-normal">Dengan Qty Pallet</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSlotFormatChange('with_prefix')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition text-left cursor-pointer ${
                        slotFormat === 'with_prefix'
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Format standar kode alamat lengkap"
                    >
                      <div className="text-cyan-400 font-mono">{idRak || 'D'}1a</div>
                      <div className="text-[10px] opacity-75 font-normal">Standar Lengkap</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSlotFormatChange('sub_pallets')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition text-left cursor-pointer ${
                        slotFormat === 'sub_pallets'
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Daftar rinci setiap posisi pallet"
                    >
                      <div className="text-cyan-400 font-mono">{idRak || 'D'}1a-P1..P{palletsPerSlot}</div>
                      <div className="text-[10px] opacity-75 font-normal">Posisi Sub-Pallet</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSlotFormatChange('standard')}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition text-left cursor-pointer ${
                        slotFormat === 'standard'
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-400 ring-1 ring-cyan-400/50'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                      title="Suffix alamat tanpa awalan rak"
                    >
                      <div className="text-cyan-400 font-mono">1a</div>
                      <div className="text-[10px] opacity-75 font-normal">Suffix Saja</div>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleManualRegenerate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white rounded-lg border border-cyan-500/50 transition cursor-pointer font-bold text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Perbarui Daftar Alamat Sekarang</span>
                  </button>
                </div>
              </div>

              {/* DAFTAR SLOT ALAMAT */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                    DAFTAR ALAMAT LOKASI (PISAHKAN KOMA)
                  </label>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    Total: {previewLocations} Alamat ({previewPallets} Pallet)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={daftarSlot}
                  onChange={(e) => setDaftarSlot(e.target.value)}
                  placeholder="D1a [4P], D2a [4P], ... atau D1a, D2a, ..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* LIVE FORMULA CALCULATION CARD (SESUAI DENGAN PERMINTAAN USER) */}
              <div className="p-3.5 bg-gradient-to-br from-cyan-950/60 to-blue-950/60 rounded-2xl border border-cyan-800/60 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 block">
                  Kalkulasi Kapasitas & Konversi Gudang (Real-Time)
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">TOTAL PALLET</span>
                    <strong className="text-base text-cyan-400 font-mono font-black">
                      {previewPallets} Pallet
                    </strong>
                    <span className="text-[10px] text-slate-500 block">({previewLocations} × {palletsPerSlot})</span>
                  </div>

                  <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">KONVERSI BOX</span>
                    <strong className="text-base text-amber-400 font-mono font-black">
                      {previewBoxes.toLocaleString('id-ID')} Box
                    </strong>
                    <span className="text-[10px] text-slate-500 block">(@ 15 Box/Pallet)</span>
                  </div>

                  <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">TOTAL BERAT</span>
                    <strong className="text-base text-emerald-400 font-mono font-black">
                      {previewWeightKg.toLocaleString('id-ID')} Kg
                    </strong>
                    <span className="text-[10px] text-slate-500 block">(@ 30 Kg/Box)</span>
                  </div>
                </div>
              </div>

              </div>

              {/* Action Buttons Footer (Sticky & Always Accessible on Mobile) */}
              <div className="shrink-0 p-3 sm:p-4 bg-slate-950/95 border-t border-slate-800 flex items-center gap-2 sticky bottom-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <X className="w-4 h-4 text-slate-400" />
                  <span>Batal / Tutup</span>
                </button>

                {editingRackId && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentRack = racks[editingRackId];
                      if (currentRack) {
                        setIsModalOpen(false);
                        setRackToDelete(currentRack);
                      }
                    }}
                    className="px-3.5 py-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider shrink-0"
                    title="Hapus rak ini dari sistem"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:opacity-90 text-white font-black text-xs sm:text-sm shadow-lg shadow-cyan-500/20 transition cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span>SIMPAN KONFIGURASI RAK</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: KELOLA KENDALA LAPANGAN (SLOT RUSAK / TIDAK DAPAT DIISI PALLET IC) */}
      {/* ========================================================================= */}
      {activeObstacleRack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Kelola Kendala di Lapangan &bull; Rak {activeObstacleRack.id}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-bold">
                      Kontrol Kerusakan & Halangan Fisik
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tandai slot yang ada secara lokasi namun berkendala fisik sehingga sistem memblokir pengisian pallet IC.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setObstacleRackId(null);
                  setSelectedSlotForEdit(null);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filter and Stats Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={obstacleSearch}
                    onChange={(e) => setObstacleSearch(e.target.value)}
                    placeholder="Cari kode slot (misal: A1a, 2b)..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setObstacleFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      obstacleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
                    }`}
                  >
                    Semua ({Object.keys(activeObstacleRack.slots).length})
                  </button>
                  <button
                    onClick={() => setObstacleFilter('blocked')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                      obstacleFilter === 'blocked' ? 'bg-amber-600 text-white' : 'bg-amber-50 border border-amber-200 text-amber-800'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Terkendala ({Object.values(activeObstacleRack.slots).filter(s => s.isBlocked || s.status === 'maintenance').length})
                  </button>
                  <button
                    onClick={() => setObstacleFilter('normal')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                      obstacleFilter === 'normal' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}
                  >
                    Normal ({Object.values(activeObstacleRack.slots).filter(s => !s.isBlocked && s.status !== 'maintenance').length})
                  </button>
                </div>
              </div>

              <div className="text-xs text-slate-600 font-bold flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                  Total Alamat: {Object.keys(activeObstacleRack.slots).length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                  Diblokir: {Object.values(activeObstacleRack.slots).filter(s => s.isBlocked || s.status === 'maintenance').length}
                </span>
              </div>
            </div>

            {/* Slots Grid List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(activeObstacleRack.slots)
                  .filter(slot => {
                    const isBlocked = !!slot.isBlocked || slot.status === 'maintenance';
                    if (obstacleFilter === 'blocked' && !isBlocked) return false;
                    if (obstacleFilter === 'normal' && isBlocked) return false;

                    if (obstacleSearch.trim()) {
                      const q = obstacleSearch.toLowerCase().trim();
                      const matchCode = slot.slotCode.toLowerCase().includes(q);
                      const matchReason = (slot.blockReason || '').toLowerCase().includes(q);
                      return matchCode || matchReason;
                    }
                    return true;
                  })
                  .map(slot => {
                    const isBlocked = !!slot.isBlocked || slot.status === 'maintenance';
                    const isEditing = selectedSlotForEdit === slot.slotCode;

                    return (
                      <div
                        key={slot.slotCode}
                        className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                          isBlocked
                            ? 'bg-amber-50/70 border-amber-300 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-base font-black text-slate-900">
                              {slot.slotCode}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isBlocked 
                                ? 'bg-amber-200 text-amber-900 border border-amber-400' 
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {isBlocked ? 'TERKENDALA (BLOCKED)' : 'SIAP PAKAI (NORMAL)'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1">
                            Level {slot.level} (Vertikal) &bull; Bay {slot.bay.toUpperCase()} &bull; Kapasitas 4 Pallet
                          </div>

                          {isBlocked && (
                            <div className="mt-2 p-2 bg-amber-100/70 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                              <div className="flex items-start gap-1.5 font-bold">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                                <span>{slot.blockReason || 'Kendala lapangan fisik'}</span>
                              </div>
                              {slot.blockedAt && (
                                <span className="text-[10px] text-slate-500 block">
                                  Dilaporkan: {slot.blockedAt} {slot.blockedBy ? `oleh ${slot.blockedBy}` : ''}
                                </span>
                              )}
                            </div>
                          )}

                          {slot.status === 'occupied' && slot.pallet && (
                            <div className="mt-1 text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded">
                              Saat ini terisi: {slot.pallet.itemName} ({slot.pallet.quantityBox} Box)
                            </div>
                          )}
                        </div>

                        {/* Edit Form or Toggle Action Button */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80">
                          {isEditing ? (
                            <div className="space-y-2 bg-white p-3 rounded-xl border border-amber-300 animate-in fade-in duration-100">
                              <span className="text-[11px] font-bold text-slate-800 block">
                                Pilih Alasan Kendala Lapangan:
                              </span>
                              <select
                                value={tempReasonChoice}
                                onChange={(e) => setTempReasonChoice(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                              >
                                {COMMON_OBSTACLE_REASONS.map(r => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </select>

                              {tempReasonChoice === 'Lainnya (Ketik manual)' && (
                                <input
                                  type="text"
                                  value={customReasonText}
                                  onChange={(e) => setCustomReasonText(e.target.value)}
                                  placeholder="Ketik detail kendala di lapangan..."
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800"
                                />
                              )}

                              <div className="flex gap-1.5 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSlotForEdit(null)}
                                  className="px-2.5 py-1 rounded text-xs font-bold text-slate-600 hover:bg-slate-100"
                                >
                                  Batal
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveObstacleForSlot(slot.slotCode)}
                                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold"
                                >
                                  Blokir Slot Ini
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              {isBlocked ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlockSlot(slot.slotCode, true)}
                                  className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Cabut Kendala (Aktifkan Kembali)</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBlockSlot(slot.slotCode, false)}
                                  className="w-full py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Ban className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Tandai Terkendala Lapangan</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-semibold">
                Perubahan langsung tersimpan ke sistem WMS dan memblokir penempatan putaway.
              </span>
              <button
                type="button"
                onClick={() => {
                  setObstacleRackId(null);
                  setSelectedSlotForEdit(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI HAPUS RAK (BEKERJA DI SEMUA BROWSER & SANDBOX IFRAME)   */}
      {/* ========================================================================= */}
      {rackToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Konfirmasi Hapus Rak</h3>
                <p className="text-xs text-slate-500">Tindakan ini menghapus rak dari master data</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-6">
              Apakah Anda yakin ingin menghapus <strong>Rak {rackToDelete.id}</strong>? Semua slot ({rackToDelete.slotCount} slot) beserta data posisi pallet di dalamnya akan dihapus dari sistem.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRackToDelete(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRack(rackToDelete.id);
                  setRackToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Rak {rackToDelete.id}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
