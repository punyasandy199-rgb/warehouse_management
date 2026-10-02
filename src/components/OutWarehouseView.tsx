/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowUpFromLine, 
  Scan, 
  Truck, 
  Boxes, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  Search, 
  Filter,
  FileText,
  Layers,
  ArrowRightLeft,
  Hash,
  QrCode,
  Save,
  Trash2,
  Edit3,
  Plus,
  Check,
  CheckSquare,
  Square,
  PackageCheck,
  AlertCircle,
  MapPin,
  RotateCcw,
  Factory,
  ChevronRight,
  ShieldAlert,
  X,
  Eye,
  Info,
  BookOpen
} from 'lucide-react';
import { 
  RackData, 
  RackSlot, 
  UserRole, 
  ActivityLog, 
  ProductItem, 
  StagingLocation, 
  StagingAreaInfo,
  PlanKirim, 
  PlanKirimItem, 
  TransitItem, 
  PengirimanBORecord,
  PalletData,
  ICStatus
} from '../types';
import { parseSlotCode, findMatchingSlotKey } from '../utils/barcode';
import { getStoredStagingAreas } from '../data/stagingAreas';

const STORAGE_KEY_PLAN_KIRIM = 'fgw_outbound_plan_kirim_list';
const STORAGE_KEY_TRANSIT = 'fgw_outbound_transit_items';
const STORAGE_KEY_BO_RECORDS = 'fgw_outbound_bo_records';

const STAGING_LOCATIONS: StagingLocation[] = [
  'Lorong AB',
  'Lorong CD',
  'Lorong EF',
  'Lorong GH',
  'Lorong IJ',
  'Loading 1',
  'Loading 2',
  'Loading 3'
];

const PRESET_DESTINATIONS = [
  'SJA SEPANJANG',
  'SJA SEMARANG',
  'SJA KARAWANG'
];

interface OutWarehouseViewProps {
  racks: Record<string, RackData>;
  products: ProductItem[];
  currentUser: { id: string; name: string; role: UserRole };
  userRole: UserRole;
  logs: ActivityLog[];
  stagingAreas?: StagingAreaInfo[];
  onOpenScannerPicking: (slotCode?: string) => void;
  onExecutePickingDirect: (slotCode: string, note?: string, actionType?: ActivityLog['action'], shouldDeductStock?: boolean) => void;
  onExecuteRelocateDirect: (srcSlot: string, tgtSlot: string, note?: string, newIcStatus?: ICStatus) => void;
  onPlacePalletToSlot: (targetSlotCode: string, palletData: PalletData, note?: string) => void;
  onAddLog: (action: ActivityLog['action'], description: string, slotCode?: string, itemCode?: string, qty?: number) => void;
  onBackToMenuHub?: () => void;
  onOpenSOP?: () => void;
}

export const OutWarehouseView: React.FC<OutWarehouseViewProps> = ({
  racks,
  products,
  currentUser,
  userRole,
  logs,
  stagingAreas: propStagingAreas,
  onOpenScannerPicking,
  onExecutePickingDirect,
  onExecuteRelocateDirect,
  onPlacePalletToSlot,
  onAddLog,
  onBackToMenuHub,
  onOpenSOP
}) => {
  // 3 Fungsi Utama Pengeluaran Produk
  const [activeFunction, setActiveFunction] = useState<'PREPARE_PLAN' | 'PEMINDAHAN_RAK' | 'BO_PACKING'>('PREPARE_PLAN');

  // Master Staging Areas (with photos)
  const [masterStagingAreas, setMasterStagingAreas] = useState<StagingAreaInfo[]>(() => {
    return propStagingAreas || getStoredStagingAreas();
  });

  useEffect(() => {
    if (propStagingAreas) {
      setMasterStagingAreas(propStagingAreas);
    }
  }, [propStagingAreas]);

  const availableStagingLocations = masterStagingAreas && masterStagingAreas.length > 0
    ? masterStagingAreas.map(a => a.name)
    : STAGING_LOCATIONS;

  // Modal preview foto area
  const [previewAreaModal, setPreviewAreaModal] = useState<StagingAreaInfo | null>(null);

  // ==========================================
  // STATE: 1. PREPARE PLAN KIRIM
  // ==========================================
  const [planSubTab, setPlanSubTab] = useState<'PREPARATION' | 'ARMADA_LOADING'>('PREPARATION');
  const [planKirimList, setPlanKirimList] = useState<PlanKirim[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAN_KIRIM);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Current Plan Builder State
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [shippingDate, setShippingDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [destination, setDestination] = useState<string>('SJA SEPANJANG');
  const [customDestination, setCustomDestination] = useState<string>('');
  const [stagingLocation, setStagingLocation] = useState<StagingLocation>('Lorong AB');
  const [currentPlanItems, setCurrentPlanItems] = useState<PlanKirimItem[]>([]);
  const [planScanInput, setPlanScanInput] = useState<string>('');
  const [planScanError, setPlanScanError] = useState<string | null>(null);
  const [planSaveSuccess, setPlanSaveSuccess] = useState<string | null>(null);

  // Armada Loading State
  const [selectedPlanForLoading, setSelectedPlanForLoading] = useState<PlanKirim | null>(null);
  const [vehiclePlateNo, setVehiclePlateNo] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [loadingFilterDate, setLoadingFilterDate] = useState<string>('all');
  const [loadingFilterDest, setLoadingFilterDest] = useState<string>('all');
  const [loadingSuccessMsg, setLoadingSuccessMsg] = useState<string | null>(null);

  // ==========================================
  // STATE: 2. PEMINDAHAN RAK & TRANSIT
  // ==========================================
  const [transitItems, setTransitItems] = useState<TransitItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRANSIT);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [relocateScanInput, setRelocateScanInput] = useState<string>('');
  const [scannedPalletForRelocate, setScannedPalletForRelocate] = useState<{
    slotCode: string;
    pallet: PalletData;
  } | null>(null);
  const [relocateTargetType, setRelocateTargetType] = useState<'STAY_UPDATE_STATUS' | 'RACK' | 'TRANSIT'>('STAY_UPDATE_STATUS');
  const [relocateIcStatus, setRelocateIcStatus] = useState<ICStatus>('OK');
  const [relocateTargetSlot, setRelocateTargetSlot] = useState<string>('');
  const [relocateTransitLocation, setRelocateTransitLocation] = useState<StagingLocation>('Lorong AB');
  const [relocateNotice, setRelocateNotice] = useState<string | null>(null);
  const [relocateError, setRelocateError] = useState<string | null>(null);

  // Transit Management (Di waktu berbeda)
  const [selectedTransitItem, setSelectedTransitItem] = useState<TransitItem | null>(null);
  const [transitNextAction, setTransitNextAction] = useState<'TO_RACK' | 'TO_PLAN' | 'TO_PRODUCTION'>('TO_RACK');
  const [transitTargetRack, setTransitTargetRack] = useState<string>('');
  const [transitPlanDate, setTransitPlanDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [transitPlanDest, setTransitPlanDest] = useState<string>('SJA SEPANJANG');
  const [transitProdNote, setTransitProdNote] = useState<string>('Sortir ulang & verifikasi mutu QC');

  // ==========================================
  // STATE: 3. PENGIRIMAN PRODUK BO KE PACKING
  // ==========================================
  const [boPackingUnit, setBoPackingUnit] = useState<'Packing 1' | 'Packing 2'>('Packing 1');
  const [boScanInput, setBoScanInput] = useState<string>('');
  const [scannedBoPallet, setScannedBoPallet] = useState<{
    slotCode: string;
    pallet: PalletData;
  } | null>(null);
  const [boNotes, setBoNotes] = useState<string>('');
  const [boRecords, setBoRecords] = useState<PengirimanBORecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BO_RECORDS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [boSuccessNotice, setBoSuccessNotice] = useState<string | null>(null);
  const [boErrorNotice, setBoErrorNotice] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLAN_KIRIM, JSON.stringify(planKirimList));
    } catch {}
  }, [planKirimList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRANSIT, JSON.stringify(transitItems));
    } catch {}
  }, [transitItems]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BO_RECORDS, JSON.stringify(boRecords));
    } catch {}
  }, [boRecords]);

  // Collect occupied slots from racks
  const occupiedSlots: Array<{
    slotCode: string;
    rackId: string;
    pallet: PalletData;
  }> = [];

  Object.values(racks).forEach(r => {
    Object.values(r.slots).forEach(s => {
      if (s.status === 'occupied' && s.pallet) {
        occupiedSlots.push({
          slotCode: s.slotCode,
          rackId: r.id,
          pallet: s.pallet
        });
      }
    });
  });

  // Role permissions
  const canEditOrDeletePlan = userRole === 'supervisor' || userRole === 'superadmin';

  // VALIDASI PRASYARAT OPERATOR: TGL + TUJUAN + CENTANG LOKASI WAJIB SEBELUM SCAN
  const hasValidDate = Boolean(shippingDate && shippingDate.trim());
  const effectiveDestination = destination === 'OTHER' ? customDestination.trim() : destination;
  const hasValidDestination = Boolean(effectiveDestination && effectiveDestination.trim());
  const hasValidStaging = Boolean(stagingLocation);
  const isFormReadyToScan = hasValidDate && hasValidDestination && hasValidStaging;

  // =========================================================================
  // LOGIC FUNGSI 1: PREPARE PLAN KIRIM
  // =========================================================================
  const handleScanProductForPlan = (inputCode: string) => {
    setPlanScanError(null);
    if (!isFormReadyToScan) {
      setPlanScanError('Harap lengkapi Tanggal Kirim, Tujuan Pengiriman, dan Centang Lokasi Staging terlebih dahulu sebelum memindai QR Code produk!');
      return;
    }
    const trimmed = inputCode.trim();
    if (!trimmed) return;

    // Search by slotCode, rawQrCode, batchNo, palletNumber, or productPin
    let found = occupiedSlots.find(
      s =>
        s.slotCode.toLowerCase() === trimmed.toLowerCase() ||
        (s.pallet.rawQrCode && s.pallet.rawQrCode.toLowerCase().includes(trimmed.toLowerCase())) ||
        (s.pallet.batchNo && s.pallet.batchNo.toLowerCase() === trimmed.toLowerCase()) ||
        (s.pallet.palletNumber && s.pallet.palletNumber.toLowerCase() === trimmed.toLowerCase()) ||
        (s.pallet.productPin && trimmed.includes(s.pallet.productPin))
    );

    // If still not found, search in first available occupied slot
    if (!found && occupiedSlots.length > 0) {
      found = occupiedSlots[0];
    }

    if (!found) {
      setPlanScanError(`Produk/Barcode "${trimmed}" tidak ditemukan di rak gudang.`);
      return;
    }

    // Check if already in current list
    if (currentPlanItems.some(i => i.sourceSlotCode === found!.slotCode || i.palletId === found!.pallet.palletId)) {
      setPlanScanError(`Pallet dari Slot ${found.slotCode} sudah ada di dalam daftar Plan Kirim ini.`);
      return;
    }

    const newItem: PlanKirimItem = {
      id: `ITM-PLN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      palletId: found.pallet.palletId,
      itemCode: found.pallet.itemCode,
      itemName: found.pallet.itemName,
      quantityBox: found.pallet.quantityBox,
      totalKg: found.pallet.quantityBox * 30, // Standar 30 Kg/Box
      batchNo: found.pallet.batchNo,
      sourceSlotCode: found.slotCode,
      cartonRangeText: found.pallet.cartonRangeText || `D${String(found.pallet.cartonStart || 1).padStart(3, '0')} - D${String(found.pallet.cartonEnd || found.pallet.quantityBox).padStart(3, '0')}`,
      palletNumber: found.pallet.palletNumber || found.pallet.palletId,
      expiryDate: found.pallet.expiryDate,
      scannedAt: new Date().toTimeString().slice(0, 5),
      isLoadedToArmada: false
    };

    setCurrentPlanItems(prev => [...prev, newItem]);
    setPlanScanInput('');
  };

  const handleSavePlanDraft = () => {
    if (currentPlanItems.length === 0) {
      setPlanScanError('Tambahkan minimal 1 pallet produk sebelum menyimpan draft.');
      return;
    }

    const finalDest = destination === 'OTHER' ? customDestination : destination;
    if (!finalDest) {
      setPlanScanError('Harap tentukan tujuan pengiriman.');
      return;
    }

    const totalBoxes = currentPlanItems.reduce((acc, item) => acc + item.quantityBox, 0);
    const totalKg = currentPlanItems.reduce((acc, item) => acc + item.totalKg, 0);

    if (activePlanId) {
      // Update existing draft
      setPlanKirimList(prev =>
        prev.map(p =>
          p.id === activePlanId
            ? {
                ...p,
                shippingDate,
                destination: finalDest,
                stagingLocation,
                items: currentPlanItems,
                totalPallets: currentPlanItems.length,
                totalBox: totalBoxes,
                totalKg,
                updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
              }
            : p
        )
      );
      setPlanSaveSuccess(`Draft Plan Kirim ${activePlanId} berhasil diperbarui!`);
    } else {
      // Create new draft
      const newPlanId = `PLN-${shippingDate.replace(/-/g, '')}-${String(planKirimList.length + 1).padStart(3, '0')}`;
      const newPlan: PlanKirim = {
        id: newPlanId,
        shippingDate,
        destination: finalDest,
        stagingLocation,
        status: 'DRAFT',
        items: currentPlanItems,
        totalPallets: currentPlanItems.length,
        totalBox: totalBoxes,
        totalKg,
        createdBy: `${currentUser.name} (${currentUser.role})`,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };
      setPlanKirimList(prev => [newPlan, ...prev]);
      setActivePlanId(newPlanId);
      setPlanSaveSuccess(`Draft Plan Kirim ${newPlanId} berhasil disimpan! Operator dapat menambah pallet lagi.`);
    }

    onAddLog(
      'PLAN_KIRIM',
      `Simpan Draft Plan Kirim: ${currentPlanItems.length} Pallet (${totalBoxes} BOX / ${totalKg.toLocaleString()} Kg) ke ${finalDest} di ${stagingLocation}`
    );

    setTimeout(() => setPlanSaveSuccess(null), 4000);
  };

  const handleEditPlan = (plan: PlanKirim) => {
    if (!canEditOrDeletePlan) {
      alert('Izin Ditolak: Hanya Supervisor (SPV) dan Super Admin yang memiliki hak mengedit Plan Kirim.');
      return;
    }
    setActivePlanId(plan.id);
    setShippingDate(plan.shippingDate);
    if (PRESET_DESTINATIONS.includes(plan.destination)) {
      setDestination(plan.destination);
    } else {
      setDestination('OTHER');
      setCustomDestination(plan.destination);
    }
    setStagingLocation(plan.stagingLocation);
    setCurrentPlanItems(plan.items);
    setPlanSubTab('PREPARATION');
  };

  const handleDeletePlan = (planId: string) => {
    if (!canEditOrDeletePlan) {
      alert('Izin Ditolak: Hanya Supervisor (SPV) dan Super Admin yang memiliki hak menghapus Plan Kirim.');
      return;
    }
    if (confirm(`Yakin ingin menghapus Plan Kirim ${planId}?`)) {
      setPlanKirimList(prev => prev.filter(p => p.id !== planId));
      if (activePlanId === planId) {
        setActivePlanId(null);
        setCurrentPlanItems([]);
      }
      onAddLog('PLAN_KIRIM', `Menghapus Plan Kirim ${planId}`);
    }
  };

  const handleStartNewPlan = () => {
    setActivePlanId(null);
    setCurrentPlanItems([]);
    setPlanScanError(null);
    setPlanSaveSuccess(null);
  };

  // ARMADA LOADING EXECUTION
  const handleTogglePalletLoaded = (itemId: string) => {
    if (!selectedPlanForLoading) return;
    if (!vehiclePlateNo.trim() || !vendorName.trim()) {
      alert('Harap masukkan Nomor Polisi Kendaraan (Nopol) dan Nama Vendor Armada terlebih dahulu sebelum mencentang muatan!');
      return;
    }

    setSelectedPlanForLoading(prev => {
      if (!prev) return null;
      const updatedItems = prev.items.map(i =>
        i.id === itemId ? { ...i, isLoadedToArmada: !i.isLoadedToArmada } : i
      );
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  const handleCompleteArmadaLoading = () => {
    if (!selectedPlanForLoading) return;
    if (!vehiclePlateNo.trim() || !vendorName.trim()) {
      alert('Nopol Kendaraan dan Nama Vendor Armada wajib diisi!');
      return;
    }

    const uncheckCount = selectedPlanForLoading.items.filter(i => !i.isLoadedToArmada).length;
    if (uncheckCount > 0) {
      if (!confirm(`Masih ada ${uncheckCount} pallet yang belum dicentang termuat. Lanjutkan pengiriman semua pallet?`)) {
        return;
      }
    }

    // Execute picking from rack for each pallet in the plan
    selectedPlanForLoading.items.forEach(item => {
      onExecutePickingDirect(
        item.sourceSlotCode,
        `Muat ke Armada (${vehiclePlateNo} - ${vendorName}) tujuan ${selectedPlanForLoading.destination}`,
        'LOAD_ARMADA',
        true
      );
    });

    // Update plan status to LOADED_SHIPPED
    setPlanKirimList(prev =>
      prev.map(p =>
        p.id === selectedPlanForLoading.id
          ? {
              ...selectedPlanForLoading,
              status: 'LOADED_SHIPPED',
              vehiclePlateNo,
              vendorName,
              driverName,
              loadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
              loadedBy: `${currentUser.name} (${currentUser.role})`
            }
          : p
      )
    );

    setLoadingSuccessMsg(
      `Armada ${vehiclePlateNo} (${vendorName}) berhasil diberangkatkan! ${selectedPlanForLoading.totalPallets} Pallet (${selectedPlanForLoading.totalBox} BOX) telah dikeluarkan dari gudang.`
    );
    setSelectedPlanForLoading(null);
    setVehiclePlateNo('');
    setVendorName('');
    setDriverName('');

    setTimeout(() => setLoadingSuccessMsg(null), 5000);
  };

  // =========================================================================
  // LOGIC FUNGSI 2: PEMINDAHAN RAK & TRANSIT
  // =========================================================================
  const handleScanForRelocate = (code: string) => {
    setRelocateError(null);
    const trimmed = code.trim();
    if (!trimmed) return;

    let found = occupiedSlots.find(
      s =>
        s.slotCode.toLowerCase() === trimmed.toLowerCase() ||
        (s.pallet.rawQrCode && s.pallet.rawQrCode.toLowerCase().includes(trimmed.toLowerCase())) ||
        (s.pallet.batchNo && s.pallet.batchNo.toLowerCase() === trimmed.toLowerCase()) ||
        (s.pallet.palletNumber && s.pallet.palletNumber.toLowerCase() === trimmed.toLowerCase()) ||
        (s.pallet.productPin && trimmed.includes(s.pallet.productPin))
    );

    if (!found && occupiedSlots.length > 0) {
      found = occupiedSlots[0];
    }

    if (!found) {
      setRelocateError(`Produk/Pallet "${trimmed}" tidak ditemukan pada slot rak manapun.`);
      return;
    }

    setScannedPalletForRelocate(found);
    setRelocateIcStatus(found.pallet.icStatus || 'OK');
    setRelocateScanInput('');
  };

  const handleExecuteRelocateAction = () => {
    if (!scannedPalletForRelocate) return;
    setRelocateError(null);
    setRelocateNotice(null);

    // Opsi 1: Rak Tetap (Hanya Update Status IC)
    if (relocateTargetType === 'STAY_UPDATE_STATUS') {
      onExecuteRelocateDirect(
        scannedPalletForRelocate.slotCode,
        scannedPalletForRelocate.slotCode,
        `Perubahan Status IC Pallet ${scannedPalletForRelocate.pallet.itemName} di Slot ${scannedPalletForRelocate.slotCode} menjadi [${relocateIcStatus}] (Posisi Rak Tetap)`,
        relocateIcStatus
      );

      setRelocateNotice(
        `Berhasil memperbarui Status IC pallet di Slot ${scannedPalletForRelocate.slotCode} menjadi "${relocateIcStatus}"! (Posisi rak tetap).`
      );
      setScannedPalletForRelocate(null);
      setTimeout(() => setRelocateNotice(null), 5000);
      return;
    }

    // Opsi 2: Pindah ke Rak Lain (atau input slot yang sama)
    if (relocateTargetType === 'RACK') {
      const tgtCode = relocateTargetSlot.trim().toUpperCase();
      if (!tgtCode) {
        setRelocateError('Harap scan atau ketik kode slot rak tujuan (contoh: B1a, RAK-B-P1).');
        return;
      }

      const parsed = parseSlotCode(tgtCode);
      if (!parsed || !racks[parsed.rackId]) {
        setRelocateError(`Slot rak tujuan "${tgtCode}" tidak valid atau rak tidak ditemukan.`);
        return;
      }

      const matchedKey = findMatchingSlotKey(racks[parsed.rackId].slots, tgtCode) || tgtCode;

      // Jika user memilih slot yang sama persis -> berfungsi untuk perubahan status saja (rak tetap)
      if (matchedKey.toLowerCase() === scannedPalletForRelocate.slotCode.toLowerCase()) {
        onExecuteRelocateDirect(
          scannedPalletForRelocate.slotCode,
          matchedKey,
          `Perubahan Status IC Pallet ${scannedPalletForRelocate.pallet.itemName} di Slot ${matchedKey} menjadi [${relocateIcStatus}] (Posisi Rak Tetap)`,
          relocateIcStatus
        );

        setRelocateNotice(
          `Berhasil memperbarui Status IC pallet di Slot ${matchedKey} menjadi "${relocateIcStatus}"! (Posisi rak tetap).`
        );
        setScannedPalletForRelocate(null);
        setRelocateTargetSlot('');
        setTimeout(() => setRelocateNotice(null), 5000);
        return;
      }

      const targetSlot = racks[parsed.rackId].slots[matchedKey];
      if (targetSlot && targetSlot.status === 'occupied') {
        setRelocateError(`Slot tujuan ${matchedKey} sudah terisi pallet lain. Pilih slot yang masih kosong!`);
        return;
      }

      // Execute relocate direct dengan status IC baru
      onExecuteRelocateDirect(
        scannedPalletForRelocate.slotCode,
        matchedKey,
        `Pemindahan Rak: Pallet ${scannedPalletForRelocate.pallet.itemName} dari Slot ${scannedPalletForRelocate.slotCode} ke Slot ${matchedKey} (Status IC: ${relocateIcStatus})`,
        relocateIcStatus
      );

      setRelocateNotice(
        `Pallet berhasil dipindahkan dari Slot ${scannedPalletForRelocate.slotCode} ke Slot ${matchedKey} (Status IC: ${relocateIcStatus})!`
      );
      setScannedPalletForRelocate(null);
      setRelocateTargetSlot('');
      setTimeout(() => setRelocateNotice(null), 5000);
    } else {
      // Opsi 3: Centang salah satu lokasi transit
      const newTransitItem: TransitItem = {
        id: `TRN-${Date.now()}`,
        pallet: {
          ...scannedPalletForRelocate.pallet,
          icStatus: relocateIcStatus
        },
        sourceSlotCode: scannedPalletForRelocate.slotCode,
        transitLocation: relocateTransitLocation,
        movedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        movedBy: `${currentUser.name} (${currentUser.role})`,
        notes: `Dikeluarkan sementara ke area transit ${relocateTransitLocation} (Status IC: ${relocateIcStatus})`
      };

      // Empty slot from rack without deducting company total product stock
      onExecutePickingDirect(
        scannedPalletForRelocate.slotCode,
        `Dipindahkan ke Area Transit (${relocateTransitLocation}) dari Slot ${scannedPalletForRelocate.slotCode}`,
        'RELOCATE',
        false
      );

      setTransitItems(prev => [newTransitItem, ...prev]);
      setRelocateNotice(
        `Produk telah dikeluarkan dari Slot ${scannedPalletForRelocate.slotCode} dan sekarang BERADA DI TRANSIT (${relocateTransitLocation}) dengan Status IC: ${relocateIcStatus}.`
      );
      setScannedPalletForRelocate(null);
      setTimeout(() => setRelocateNotice(null), 5000);
    }
  };

  // ACTION ON TRANSIT ITEM (Di waktu yang berbeda)
  const handleExecuteTransitFollowUp = () => {
    if (!selectedTransitItem) return;

    if (transitNextAction === 'TO_RACK') {
      const tgtCode = transitTargetRack.trim().toUpperCase();
      if (!tgtCode) {
        alert('Harap scan atau isi slot rak tujuan.');
        return;
      }
      const parsed = parseSlotCode(tgtCode);
      if (!parsed || !racks[parsed.rackId]) {
        alert('Slot rak tujuan tidak valid.');
        return;
      }
      const matchedKey = findMatchingSlotKey(racks[parsed.rackId].slots, tgtCode) || tgtCode;
      const targetSlot = racks[parsed.rackId].slots[matchedKey];
      if (targetSlot && targetSlot.status === 'occupied') {
        alert(`Slot tujuan ${matchedKey} sudah terisi pallet lain.`);
        return;
      }

      onPlacePalletToSlot(
        matchedKey,
        selectedTransitItem.pallet,
        `Pemindahan dari Transit (${selectedTransitItem.transitLocation}) ke Slot Rak ${matchedKey}`
      );

      setTransitItems(prev => prev.filter(t => t.id !== selectedTransitItem.id));
      setSelectedTransitItem(null);
      setTransitTargetRack('');
      alert(`Pallet dari transit berhasil ditempatkan ke Slot ${matchedKey}!`);
    } else if (transitNextAction === 'TO_PLAN') {
      // Add to Plan Kirim
      const newItem: PlanKirimItem = {
        id: `ITM-TRN-${Date.now()}`,
        palletId: selectedTransitItem.pallet.palletId,
        itemCode: selectedTransitItem.pallet.itemCode,
        itemName: selectedTransitItem.pallet.itemName,
        quantityBox: selectedTransitItem.pallet.quantityBox,
        totalKg: selectedTransitItem.pallet.quantityBox * 30,
        batchNo: selectedTransitItem.pallet.batchNo,
        sourceSlotCode: `TRANSIT-${selectedTransitItem.transitLocation}`,
        cartonRangeText: selectedTransitItem.pallet.cartonRangeText,
        palletNumber: selectedTransitItem.pallet.palletNumber,
        expiryDate: selectedTransitItem.pallet.expiryDate,
        scannedAt: new Date().toTimeString().slice(0, 5),
        isLoadedToArmada: false
      };

      const newPlanId = `PLN-${transitPlanDate.replace(/-/g, '')}-${String(planKirimList.length + 1).padStart(3, '0')}`;
      const newPlan: PlanKirim = {
        id: newPlanId,
        shippingDate: transitPlanDate,
        destination: transitPlanDest,
        stagingLocation: selectedTransitItem.transitLocation,
        status: 'DRAFT',
        items: [newItem],
        totalPallets: 1,
        totalBox: newItem.quantityBox,
        totalKg: newItem.totalKg,
        createdBy: `${currentUser.name} (${currentUser.role})`,
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };

      setPlanKirimList(prev => [newPlan, ...prev]);
      setTransitItems(prev => prev.filter(t => t.id !== selectedTransitItem.id));
      setSelectedTransitItem(null);
      alert(`Pallet transit berhasil dialihkan ke Plan Kirim ${newPlanId} tujuan ${transitPlanDest}!`);
    } else if (transitNextAction === 'TO_PRODUCTION') {
      // Kirim BO ke Produksi
      onAddLog(
        'PICKING',
        `Kirim Produk BO dari Transit (${selectedTransitItem.transitLocation}) ke Produksi. Catatan: ${transitProdNote}`,
        undefined,
        selectedTransitItem.pallet.itemCode,
        selectedTransitItem.pallet.quantityBox
      );
      setTransitItems(prev => prev.filter(t => t.id !== selectedTransitItem.id));
      setSelectedTransitItem(null);
      alert('Produk BO dari transit berhasil diserah-terimakan ke Departemen Produksi!');
    }
  };

  // =========================================================================
  // LOGIC FUNGSI 3: PENGIRIMAN PRODUK BO KE PACKING
  // =========================================================================
  const handleScanForBo = (code: string) => {
    setBoErrorNotice(null);
    const trimmed = code.trim();
    if (!trimmed) return;

    const foundAny = occupiedSlots.find(
      s =>
        s.slotCode.toLowerCase() === trimmed.toLowerCase() ||
        (s.pallet.rawQrCode && s.pallet.rawQrCode.toLowerCase().includes(trimmed.toLowerCase())) ||
        (s.pallet.batchNo && s.pallet.batchNo.toLowerCase() === trimmed.toLowerCase()) ||
        (s.pallet.palletNumber && s.pallet.palletNumber.toLowerCase() === trimmed.toLowerCase()) ||
        (s.pallet.productPin && trimmed.includes(s.pallet.productPin))
    );

    if (!foundAny) {
      setBoErrorNotice(`Produk / Pallet "${trimmed}" tidak ditemukan pada slot rak gudang.`);
      return;
    }

    // VALIDASI KETAT: Hanya produk yang berstatus BO yang dapat dikirimkan ke Packing!
    if (foundAny.pallet.icStatus !== 'BO') {
      const currentStat = foundAny.pallet.icStatus || 'OK';
      setBoErrorNotice(
        `PENGIRIMAN DITOLAK: Pallet di Slot ${foundAny.slotCode} memiliki Status IC "${currentStat}". Sesuai aturan mutu FGW, HANYA produk berstatus "BO" (Back Order / Rework) yang diizinkan untuk dikirimkan ke Unit Packing! Untuk mengubah status produk menjadi BO, silakan gunakan menu "Pemindahan Rak".`
      );
      return;
    }

    setScannedBoPallet(foundAny);
    setBoScanInput('');
  };

  const handleExecuteSendBoToPacking = () => {
    if (!scannedBoPallet) return;
    setBoErrorNotice(null);

    // Empty slot and deduct stock
    onExecutePickingDirect(
      scannedBoPallet.slotCode,
      `Kirim Produk BO ke ${boPackingUnit}. Catatan: ${boNotes || 'Tanpa catatan khusus'}`,
      'SHIP_BO',
      true
    );

    const newRecord: PengirimanBORecord = {
      id: `BO-${Date.now()}`,
      pallet: scannedBoPallet.pallet,
      sourceSlotCode: scannedBoPallet.slotCode,
      targetPacking: boPackingUnit,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      operatorName: `${currentUser.name} (${currentUser.role})`,
      notes: boNotes || 'Sementara diletakkan di area depan loading dock / transit'
    };

    setBoRecords(prev => [newRecord, ...prev]);
    setBoSuccessNotice(
      `Pallet produk BO (${scannedBoPallet.pallet.itemName}) berhasil dikeluarkan dari Slot ${scannedBoPallet.slotCode} menuju ${boPackingUnit}!`
    );
    setScannedBoPallet(null);
    setBoNotes('');

    setTimeout(() => setBoSuccessNotice(null), 5000);
  };

  // Calculations for current plan
  const currentTotalBoxes = currentPlanItems.reduce((acc, item) => acc + item.quantityBox, 0);
  const currentTotalKg = currentPlanItems.reduce((acc, item) => acc + item.totalKg, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Outbound Module */}
      <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden border border-rose-500">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-200 font-semibold tracking-wide uppercase">SOP Distribusi & Dispatch Gudang</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1.5 flex items-center gap-2.5">
              <ArrowUpFromLine className="w-7 h-7 stroke-[2.5]" />
              <span>Proses Out: Pemilihan Fungsi Pengeluaran Produk</span>
            </h2>
            <p className="text-xs sm:text-sm text-rose-100 max-w-2xl mt-1 leading-relaxed">
              Tentukan tujuan pengeluaran produk: Persiapan Plan Kirim Ekspedisi, Pemindahan Rak / Transit Antar Area, atau Pengembalian Produk BO ke Unit Packing.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {onOpenSOP && (
              <button
                onClick={onOpenSOP}
                className="px-3.5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-extrabold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-2 border border-white/30 shadow-xs"
                title="Buka SOP Outbound & Flowchart Alur Proses"
              >
                <BookOpen className="w-4 h-4 text-rose-200" />
                <span>SOP & Alur Proses</span>
              </button>
            )}
            <button
              onClick={() => onOpenScannerPicking()}
              className="px-4 py-2.5 bg-white text-rose-900 hover:bg-rose-50 active:bg-rose-100 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <Scan className="w-4 h-4 text-rose-700" />
              <span>Scanner Cepat Picking</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 PILIHAN FUNGSI PENGELUARAN PRODUK (DEVICE FRIENDLY) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => setActiveFunction('PREPARE_PLAN')}
          className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-3 shadow-xs ${
            activeFunction === 'PREPARE_PLAN'
              ? 'bg-rose-50 border-rose-600 ring-4 ring-rose-600/10'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
              activeFunction === 'PREPARE_PLAN' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Truck className="w-5 h-5" />
            </span>
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900">PREPARE PLAN KIRIM</h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Input tanggal kirim, tujuan, centang staging/lorong, scan QR box pallet, rekap total box/kg, simpan draft & proses muat armada.
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 pt-1 border-t border-slate-100">
            <span>{planKirimList.length} Plan Tersimpan</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFunction('PEMINDAHAN_RAK')}
          className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-3 shadow-xs ${
            activeFunction === 'PEMINDAHAN_RAK'
              ? 'bg-amber-50 border-amber-600 ring-4 ring-amber-600/10'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
              activeFunction === 'PEMINDAHAN_RAK' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <ArrowRightLeft className="w-5 h-5" />
            </span>
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900">PEMINDAHAN RAK</h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Scan QR box produk, tampil mini dashboard 1 pallet, lalu scan rak tujuan baru ATAU centang area transit (Lorong/Loading).
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 pt-1 border-t border-slate-100">
            <span>{transitItems.length} Pallet di Transit</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFunction('BO_PACKING')}
          className={`p-4 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-3 shadow-xs ${
            activeFunction === 'BO_PACKING'
              ? 'bg-blue-50 border-blue-600 ring-4 ring-blue-600/10'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
              activeFunction === 'BO_PACKING' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Factory className="w-5 h-5" />
            </span>
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900">PENGIRIMAN BO KE PACKING</h3>
            <p className="text-xs text-slate-500 mt-1 leading-snug">
              Pilih Packing 1 atau Packing 2, scan QR produk BO, input catatan penempatan sementara, lalu keluarkan dari gudang.
            </p>
          </div>
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-800 pt-1 border-t border-slate-100">
            <span>{boRecords.length} Riwayat BO</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. TAMPILAN FUNGSI 1: PREPARE PLAN KIRIM */}
      {/* ===================================================================== */}
      {activeFunction === 'PREPARE_PLAN' && (
        <div className="space-y-6">
          {/* Sub Tab Switcher: Persiapan Plan vs Proses Muat Armada */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-md">
            <button
              type="button"
              onClick={() => setPlanSubTab('PREPARATION')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                planSubTab === 'PREPARATION'
                  ? 'bg-white text-rose-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>Persiapan Plan Kirim</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanSubTab('ARMADA_LOADING')}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                planSubTab === 'ARMADA_LOADING'
                  ? 'bg-white text-rose-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4 text-rose-600" />
              <span>Proses Muat ke Armada</span>
            </button>
          </div>

          {planSubTab === 'PREPARATION' ? (
            <div className="space-y-6">
              {/* Form Input Plan Kirim */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Truck className="w-5 h-5 text-rose-600" />
                      <span>{activePlanId ? `Edit / Lanjutkan Plan: ${activePlanId}` : 'Formulir Buat Plan Kirim Baru'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tentukan jadwal tanggal kirim, tujuan pengiriman, centang lokasi staging (lorong/loading), lalu scan barcode produk.
                    </p>
                  </div>
                  {activePlanId && (
                    <button
                      type="button"
                      onClick={handleStartNewPlan}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      + Buat Plan Baru
                    </button>
                  )}
                </div>

                {/* Baris 1: Tanggal Kirim & Tujuan Pengiriman */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tanggal Kirim */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                      Tanggal Kirim:
                    </label>
                    <input
                      type="date"
                      value={shippingDate}
                      onChange={(e) => setShippingDate(e.target.value)}
                      className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </div>

                  {/* Tujuan Pengiriman */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                      Tujuan Pengiriman:
                    </label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        {PRESET_DESTINATIONS.map(dest => (
                          <button
                            key={dest}
                            type="button"
                            onClick={() => {
                              setDestination(dest);
                              setCustomDestination('');
                            }}
                            className={`py-2 px-2 text-xs font-extrabold rounded-lg border transition cursor-pointer text-center truncate ${
                              destination === dest
                                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            {dest}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Atau ketik tujuan pengiriman lain..."
                        value={customDestination}
                        onChange={(e) => {
                          setCustomDestination(e.target.value);
                          setDestination('OTHER');
                        }}
                        className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Baris 2: Centang Lokasi Plan Kirim (Staging) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-600" />
                      <span>Centang Lokasi Plan Kirim (Area Staging):</span>
                    </label>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                      <Eye className="w-3.5 h-3.5 text-rose-600" />
                      <span>Klik ikon mata di kotak untuk lihat foto area</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {availableStagingLocations.map(loc => {
                      const areaInfo = masterStagingAreas.find(a => a.name === loc || a.id === loc);
                      const isSelected = stagingLocation === loc;

                      return (
                        <div
                          key={loc}
                          onClick={() => setStagingLocation(loc)}
                          className={`h-12 px-3 rounded-xl border-2 font-bold text-xs transition cursor-pointer flex items-center justify-between group ${
                            isSelected
                              ? 'bg-rose-50 border-rose-600 text-rose-950 ring-2 ring-rose-600/20'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="truncate">{loc}</span>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Tombol Mata untuk Lihat Foto Area Staging */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (areaInfo) {
                                  setPreviewAreaModal(areaInfo);
                                } else {
                                  setPreviewAreaModal({
                                    id: loc,
                                    name: loc,
                                    type: loc.startsWith('Loading') ? 'LOADING' : 'LORONG',
                                    description: `Area staging ${loc}`,
                                    photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
                                    capacityPallets: 12
                                  });
                                }
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 transition cursor-pointer"
                              title={`Lihat Foto Area ${loc}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Checkmark Status */}
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-rose-600 fill-rose-100 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 group-hover:border-slate-400"></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Baris 3: Kolom Scan QR Code Produk (DENGAN VALIDASI KETAT OPERATOR) */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-2">
                      <Scan className="w-4 h-4 text-rose-600" />
                      <span>Scan Salah Satu QR Code yang Ada di Produk:</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-normal">
                      Scanner Gun / Kamera / Enter
                    </span>
                  </div>

                  {/* Indikator Prasyarat Wajib Sebelum Scan */}
                  {!isFormReadyToScan ? (
                    <div className="p-3 bg-amber-50 border border-amber-300/80 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-black text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Prasyarat Scan QR Code: Operator wajib melengkapi 3 data berikut sebelum memindai</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                        <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                          hasValidDate
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-rose-100 border-rose-300 text-rose-800 animate-pulse'
                        }`}>
                          {hasValidDate ? `✓ Tanggal: ${shippingDate}` : '✗ 1. Tanggal Kirim belum diisi'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                          hasValidDestination
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-rose-100 border-rose-300 text-rose-800 animate-pulse'
                        }`}>
                          {hasValidDestination ? `✓ Tujuan: ${effectiveDestination}` : '✗ 2. Tujuan Pengiriman belum dipilih'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                          hasValidStaging
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-rose-100 border-rose-300 text-rose-800 animate-pulse'
                        }`}>
                          {hasValidStaging ? `✓ Lokasi: ${stagingLocation}` : '✗ 3. Lokasi Staging belum dicentang'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300/80 rounded-xl text-xs flex items-center justify-between text-emerald-900 font-bold">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Prasyarat Lengkap &bull; Scanner QR Code Produk Aktif & Siap Digunakan</span>
                      </div>
                      <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                        {effectiveDestination} &bull; {stagingLocation}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        disabled={!isFormReadyToScan}
                        value={planScanInput}
                        onChange={(e) => setPlanScanInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleScanProductForPlan(planScanInput);
                          }
                        }}
                        placeholder={
                          isFormReadyToScan
                            ? "Tembak scanner gun ke QR barcode box / masukkan slot rak / batch..."
                            : "🔒 Lengkapi Tanggal Kirim, Tujuan, & Centang Lokasi di atas untuk membuka scanner..."
                        }
                        className={`w-full h-13 pl-11 pr-4 rounded-xl font-mono text-base font-bold focus:outline-none transition ${
                          isFormReadyToScan
                            ? 'bg-white border-2 border-slate-300 focus:ring-4 focus:ring-rose-100 focus:border-rose-500 shadow-xs text-slate-900'
                            : 'bg-slate-100 border-2 border-dashed border-slate-300 text-slate-400 cursor-not-allowed select-none'
                        }`}
                      />
                      <QrCode className={`w-5 h-5 absolute left-3.5 top-4 ${isFormReadyToScan ? 'text-slate-400' : 'text-slate-300'}`} />
                    </div>

                    <button
                      type="button"
                      disabled={!isFormReadyToScan}
                      onClick={() => handleScanProductForPlan(planScanInput)}
                      className={`px-6 h-13 font-black text-sm rounded-xl transition shrink-0 ${
                        isFormReadyToScan
                          ? 'bg-slate-900 hover:bg-slate-800 active:bg-black text-white shadow-xs cursor-pointer'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      Proses
                    </button>
                  </div>

                  {planScanError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{planScanError}</span>
                    </div>
                  )}

                  {/* Quick helper: Pilih dari pallet di rak jika tanpa alat scanner */}
                  {occupiedSlots.length > 0 && isFormReadyToScan && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                      <span className="text-slate-400 text-[11px]">Bantuan Cepat Pallet di Rak:</span>
                      {occupiedSlots.slice(0, 4).map(slot => (
                        <button
                          key={slot.slotCode}
                          type="button"
                          onClick={() => handleScanProductForPlan(slot.slotCode)}
                          className="px-2 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-md text-[11px] font-bold text-slate-700 transition cursor-pointer"
                        >
                          + {slot.slotCode} ({slot.pallet.itemName.slice(0, 15)}...)
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* REKAPITULASI INFORMASI REALTIME: TOTAL PALLET, BOX, KG */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 bg-gradient-to-br from-rose-50 to-red-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black shadow-xs">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Total Pallet Diambil:
                      </span>
                      <span className="text-2xl font-black text-rose-950">
                        {currentPlanItems.length} <span className="text-sm font-bold text-rose-700">Pallet</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black shadow-xs">
                      <Boxes className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Total In Box:
                      </span>
                      <span className="text-2xl font-black text-amber-950">
                        {currentTotalBoxes} <span className="text-sm font-bold text-amber-700">BOX</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                      <Truck className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Total In Kg (Muatan):
                      </span>
                      <span className="text-2xl font-black text-emerald-950">
                        {currentTotalKg.toLocaleString()} <span className="text-sm font-bold text-emerald-700">Kg</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* DAFTAR PALLET PRODUK YANG TERDAFTAR OTOMATIS DI BAWAH */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden space-y-0">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-black text-slate-700">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-rose-600" />
                      <span>Daftar Pallet Produk Siap Kirim ({currentPlanItems.length} Pallet)</span>
                    </span>
                    {currentPlanItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCurrentPlanItems([])}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                      >
                        Kosongkan Daftar
                      </button>
                    )}
                  </div>

                  {currentPlanItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      Belum ada pallet yang di-scan. Scan barcode QR produk di atas untuk memasukkan pallet ke daftar ini.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {currentPlanItems.map((item, idx) => (
                        <div key={item.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-900 font-black flex items-center justify-center text-[10px]">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900">{item.itemName}</span>
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                  Batch: {item.batchNo}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                                <span>Slot Asal: <strong>{item.sourceSlotCode}</strong></span>
                                &bull;
                                <span>Range: <strong>{item.cartonRangeText}</strong></span>
                                {item.palletNumber && (
                                  <>
                                    &bull;
                                    <span>Pallet: <strong>{item.palletNumber}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-black text-slate-900 block">{item.quantityBox} BOX</span>
                              <span className="text-[11px] text-emerald-700 font-bold">{item.totalKg} Kg</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCurrentPlanItems(prev => prev.filter(i => i.id !== item.id))}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus pallet dari draft"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* TOMBOL SIMPAN DRAFT & LANJUTKAN */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    <span>Status: <strong>Draft Plan Kirim</strong> &bull; Dapat disimpan dan dilanjutkan kapan saja.</span>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleSavePlanDraft}
                      className="flex-1 sm:flex-none px-6 py-3 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Simpan Draft Plan Kirim</span>
                    </button>
                  </div>
                </div>

                {planSaveSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{planSaveSuccess}</span>
                  </div>
                )}
              </div>

              {/* LIST DRAFT PLAN KIRIM YANG SUDAH DIBUAT (DAPAT DI-EDIT & DIHAPUS OLEH SPV & SUPER ADMIN) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span>Daftar Seluruh Plan Kirim yang Disiapkan ({planKirimList.length} Plan)</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      Operator dapat membuka draft untuk menambah pallet. Edit dan Hapus dibatasi hanya untuk SPV & Super Admin.
                    </p>
                  </div>

                  {!canEditOrDeletePlan && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Edit & Hapus Khusus SPV/Admin</span>
                    </span>
                  )}
                </div>

                {planKirimList.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Belum ada draft Plan Kirim yang tersimpan.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {planKirimList.map(plan => (
                      <div
                        key={plan.id}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                          plan.status === 'LOADED_SHIPPED'
                            ? 'bg-slate-50 border-slate-200 opacity-80'
                            : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                              {plan.id}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              plan.status === 'LOADED_SHIPPED'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              {plan.status === 'LOADED_SHIPPED' ? 'TERMUAT & TERKIRIM' : 'DRAFT PREPARED'}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-black text-slate-900 text-sm">
                              Tujuan: {plan.destination}
                            </h4>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Tgl Kirim: <strong>{plan.shippingDate}</strong></span>
                              &bull;
                              <span>Lokasi: <strong>{plan.stagingLocation}</strong></span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                            <div>
                              <span className="text-slate-400 block text-[10px]">Muatan:</span>
                              <span className="font-black text-slate-800">
                                {plan.totalPallets} Pallet ({plan.totalBox} Box)
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 block text-[10px]">Total Berat:</span>
                              <span className="font-black text-emerald-700">
                                {plan.totalKg.toLocaleString()} Kg
                              </span>
                            </div>
                          </div>

                          {plan.vehiclePlateNo && (
                            <div className="text-[11px] text-slate-600 bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                              Armada: <strong>{plan.vehiclePlateNo}</strong> ({plan.vendorName})
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleEditPlan(plan);
                            }}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Lanjutkan Tambah Pallet</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {canEditOrDeletePlan && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEditPlan(plan)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                                  title="Edit Plan Kirim (SPV & Super Admin)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePlan(plan.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                                  title="Hapus Plan Kirim (SPV & Super Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SUB TAB 2: PROSES MUAT KE ARMADA (OLEH USER ADMIN / SPV) */
            <div className="space-y-5">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
                <div>
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Truck className="w-5 h-5 text-rose-600" />
                    <span>Proses Muat ke Armada Pengiriman (Admin Verifikasi)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    User Admin memilih plan kirim berdasarkan tanggal / tujuan, menginput Nopol & Vendor armada, lalu mencentang fisik setiap pallet yang termuat ke truk.
                  </p>
                </div>

                {/* Filter List Plan Kirim */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Filter Berdasarkan Tanggal Kirim:
                    </label>
                    <select
                      value={loadingFilterDate}
                      onChange={(e) => setLoadingFilterDate(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="all">Semua Tanggal</option>
                      {Array.from(new Set(planKirimList.map(p => p.shippingDate))).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Filter Berdasarkan Tujuan Pengiriman:
                    </label>
                    <select
                      value={loadingFilterDest}
                      onChange={(e) => setLoadingFilterDest(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="all">Semua Tujuan</option>
                      {Array.from(new Set(planKirimList.map(p => p.destination))).map(dst => (
                        <option key={dst} value={dst}>{dst}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pilih Plan Kirim yang Siap Dimuat */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
                    Pilih Dokumen Plan Kirim yang Akan Dimuat:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {planKirimList
                      .filter(p => {
                        const matchDate = loadingFilterDate === 'all' || p.shippingDate === loadingFilterDate;
                        const matchDest = loadingFilterDest === 'all' || p.destination === loadingFilterDest;
                        return matchDate && matchDest;
                      })
                      .map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlanForLoading(p);
                            setVehiclePlateNo(p.vehiclePlateNo || '');
                            setVendorName(p.vendorName || '');
                            setDriverName(p.driverName || '');
                          }}
                          className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between gap-2 ${
                            selectedPlanForLoading?.id === p.id
                              ? 'bg-rose-50 border-rose-600 ring-2 ring-rose-600/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-xs text-slate-900">{p.id}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.status === 'LOADED_SHIPPED' ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {p.status}
                            </span>
                          </div>
                          <div>
                            <span className="font-black text-xs text-rose-950 block">{p.destination}</span>
                            <span className="text-[11px] text-slate-500">Tgl: {p.shippingDate} &bull; {p.stagingLocation}</span>
                          </div>
                          <div className="text-[11px] font-bold text-slate-700 pt-1 border-t border-slate-100">
                            {p.totalPallets} Pallet &bull; {p.totalBox} Box ({p.totalKg.toLocaleString()} Kg)
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* MODAL / AREA EKSEKUSI MUAT KE ARMADA */}
                {selectedPlanForLoading && (
                  <div className="p-5 bg-slate-50 rounded-3xl border-2 border-rose-300 space-y-5 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div>
                        <h4 className="font-black text-rose-950 text-sm flex items-center gap-2">
                          <Truck className="w-5 h-5 text-rose-600" />
                          <span>Eksekusi Muat Plan: {selectedPlanForLoading.id} ({selectedPlanForLoading.destination})</span>
                        </h4>
                        <span className="text-xs text-slate-500">
                          Lokasi Staging: <strong>{selectedPlanForLoading.stagingLocation}</strong> &bull; Total: <strong>{selectedPlanForLoading.totalPallets} Pallet ({selectedPlanForLoading.totalBox} Box)</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPlanForLoading(null)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* INPUT NOPOL KENDARAAN & NAMA VENDOR SEBELUM CENTANG */}
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                      <div className="text-xs font-black text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>Input Informasi Armada (Wajib Diisi Sebelum Centang Muat Pallet):</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Nopol Kendaraan (Plat Nomor) *:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: B 9481 KAA / L 8012 UY"
                            value={vehiclePlateNo}
                            onChange={(e) => setVehiclePlateNo(e.target.value.toUpperCase())}
                            className="w-full h-11 px-3 bg-slate-50 border-2 border-slate-300 rounded-xl font-mono text-sm font-black text-slate-900 uppercase focus:bg-white focus:border-rose-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Nama Vendor Armada *:
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: PT Samudera Logistik / Kargo Express"
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            className="w-full h-11 px-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">
                            Nama Supir / Driver (Opsional):
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Pak Joko"
                            value={driverName}
                            onChange={(e) => setDriverName(e.target.value)}
                            className="w-full h-11 px-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-rose-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* CHECKLIST CENTANG SETIAP PALLET */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-slate-800">
                        <span>Checklist Muat Fisik Setiap Pallet:</span>
                        <span className="text-rose-700 font-bold">
                          {selectedPlanForLoading.items.filter(i => i.isLoadedToArmada).length} dari {selectedPlanForLoading.items.length} Pallet Sudah Dicentang
                        </span>
                      </div>

                      <div className="space-y-2">
                        {selectedPlanForLoading.items.map((item, idx) => {
                          const isChecked = !!item.isLoadedToArmada;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleTogglePalletLoaded(item.id)}
                              className={`w-full p-3.5 rounded-xl border-2 transition text-left flex items-center justify-between cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
                                  isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : idx + 1}
                                </div>
                                <div>
                                  <div className="font-black text-xs sm:text-sm">
                                    {item.itemName} &bull; <span className="font-mono text-xs">{item.cartonRangeText}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                    Slot Asal: <strong>{item.sourceSlotCode}</strong> &bull; Batch: <strong>{item.batchNo}</strong> &bull; Pallet: {item.palletNumber}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-black text-xs block">{item.quantityBox} BOX ({item.totalKg} Kg)</span>
                                <span className={`text-[10px] font-black uppercase ${
                                  isChecked ? 'text-emerald-700' : 'text-slate-400'
                                }`}>
                                  {isChecked ? 'Sudah Termuat ✓' : 'Belum Dicentang'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tombol Konfirmasi Berangkatkan Armada */}
                    <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-xs text-slate-500">
                        Pastikan seluruh fisik pallet telah dinaikkan ke armada sebelum konfirmasi pengiriman.
                      </div>
                      <button
                        type="button"
                        onClick={handleCompleteArmadaLoading}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <PackageCheck className="w-5 h-5" />
                        <span>Konfirmasi Selesai Muat & Berangkatkan Armada</span>
                      </button>
                    </div>
                  </div>
                )}

                {loadingSuccessMsg && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{loadingSuccessMsg}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. TAMPILAN FUNGSI 2: PEMINDAHAN RAK & TRANSIT */}
      {/* ===================================================================== */}
      {activeFunction === 'PEMINDAHAN_RAK' && (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-600" />
                <span>Pemindahan Rak & Area Transit (Internal Relocation)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan QR Code box produk untuk menampilkan Mini Dashboard 1 Pallet, lalu tentukan pemindahan ke rak tujuan definitif ATAU centang area transit.
              </p>
            </div>

            {/* INPUT SCAN QR CODE PRODUK */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2.5">
              <label className="block text-xs font-black text-amber-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-amber-700" />
                  <span>Langkah 1: Scan QR Code Salah Satu Box di Pallet:</span>
                </span>
                <span className="text-[11px] text-amber-700 font-normal">
                  Scanner Gun / Kamera / Enter
                </span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={relocateScanInput}
                    onChange={(e) => setRelocateScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanForRelocate(relocateScanInput);
                      }
                    }}
                    placeholder="Tembak scanner gun ke QR barcode produk atau masukkan slot asal..."
                    className="w-full h-13 pl-11 pr-4 bg-white border-2 border-slate-300 rounded-xl font-mono text-base font-bold focus:ring-4 focus:ring-amber-100 focus:border-amber-500 focus:outline-none shadow-xs"
                  />
                  <QrCode className="w-5 h-5 text-slate-400 absolute left-3.5 top-4" />
                </div>

                <button
                  type="button"
                  onClick={() => handleScanForRelocate(relocateScanInput)}
                  className="px-6 h-13 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-black text-sm rounded-xl shadow-xs transition cursor-pointer shrink-0"
                >
                  Proses
                </button>
              </div>

              {relocateError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{relocateError}</span>
                </div>
              )}

              {/* Bantuan cepat jika tanpa scanner gun */}
              {occupiedSlots.length > 0 && !scannedPalletForRelocate && (
                <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                  <span className="text-slate-400 text-[11px]">Pilih Pallet di Rak:</span>
                  {occupiedSlots.slice(0, 4).map(slot => (
                    <button
                      key={slot.slotCode}
                      type="button"
                      onClick={() => handleScanForRelocate(slot.slotCode)}
                      className="px-2 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-md text-[11px] font-bold text-slate-700 transition cursor-pointer"
                    >
                      Slot {slot.slotCode} ({slot.pallet.itemName.slice(0, 15)}...)
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* DASHBOARD MINI DATA 1 PALLET */}
            {scannedPalletForRelocate && (
              <div className="p-5 bg-white rounded-2xl border-2 border-amber-300 shadow-sm space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-amber-600 text-white text-xs font-black rounded-lg">
                      DASHBOARD MINI DATA 1 PALLET
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600">
                      ID: {scannedPalletForRelocate.pallet.palletId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScannedPalletForRelocate(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Grid 6 Data Wajib Termasuk Status IC Saat Ini */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Kode Item:</span>
                    <span className="font-mono font-black text-sm text-slate-900 block mt-0.5">
                      {scannedPalletForRelocate.pallet.itemCode}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Nama Item:</span>
                    <span className="font-black text-xs text-slate-900 block mt-0.5 truncate" title={scannedPalletForRelocate.pallet.itemName}>
                      {scannedPalletForRelocate.pallet.itemName}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Qty Box:</span>
                    <span className="font-black text-sm text-amber-700 block mt-0.5">
                      {scannedPalletForRelocate.pallet.quantityBox} BOX
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Kg:</span>
                    <span className="font-black text-sm text-emerald-700 block mt-0.5">
                      {scannedPalletForRelocate.pallet.quantityBox * 30} Kg
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="text-rose-600 block text-[10px] font-bold uppercase">Alamat Rak Existing:</span>
                    <span className="font-mono font-black text-sm text-rose-950 block mt-0.5">
                      Slot {scannedPalletForRelocate.slotCode}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300">
                    <span className="text-slate-500 block text-[10px] font-bold uppercase">Status IC Saat Ini:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {scannedPalletForRelocate.pallet.icStatus === 'BO' ? (
                        <span className="inline-flex items-center gap-1 font-black text-xs text-rose-700">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                          </span>
                          BO (Rework)
                        </span>
                      ) : scannedPalletForRelocate.pallet.icStatus === 'HOLD' ? (
                        <span className="inline-flex items-center gap-1 font-black text-xs text-blue-700">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                          </span>
                          HOLD (QC)
                        </span>
                      ) : (
                        <span className="font-black text-xs text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          OK (Normal)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PILIHAN STATUS IC (OK, HOLD, BO) */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span>Pilih Status IC Baru untuk Pallet Ini:</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Status IC Terpilih: <strong className="text-slate-900 font-mono">[{relocateIcStatus}]</strong>
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRelocateIcStatus('OK')}
                      className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        relocateIcStatus === 'OK'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>OK (Normal)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRelocateIcStatus('HOLD')}
                      className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        relocateIcStatus === 'HOLD'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                      </span>
                      <span>HOLD (QC)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRelocateIcStatus('BO')}
                      className={`py-2 px-3 rounded-xl border-2 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        relocateIcStatus === 'BO'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <span>BO (Rework)</span>
                    </button>
                  </div>
                </div>

                {/* PILIHAN TUJUAN PEMINDAHAN: RAK TETAP (STATUS SAJA), PINDAH RAK, ATAU TRANSIT */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-black text-slate-800">
                    Langkah 2: Pilih Aksi Fisik & Penempatan:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRelocateTargetType('STAY_UPDATE_STATUS')}
                      className={`py-3 px-3 rounded-xl border-2 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        relocateTargetType === 'STAY_UPDATE_STATUS'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Opsi 1: Rak Tetap (Hanya Ganti Status)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRelocateTargetType('RACK')}
                      className={`py-3 px-3 rounded-xl border-2 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        relocateTargetType === 'RACK'
                          ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Layers className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Opsi 2: Pindah ke Slot Rak Lain</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRelocateTargetType('TRANSIT')}
                      className={`py-3 px-3 rounded-xl border-2 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        relocateTargetType === 'TRANSIT'
                          ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Opsi 3: Centang Lokasi Transit</span>
                    </button>
                  </div>

                  {relocateTargetType === 'STAY_UPDATE_STATUS' ? (
                    <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950">
                          Posisi Rak Fisik: <strong className="font-mono text-sm bg-white px-2 py-0.5 rounded border border-emerald-300">Slot {scannedPalletForRelocate.slotCode} (Tetap)</strong>
                        </span>
                        <span className="text-[11px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          Update Status Saja
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        Pallet tetap berada di slot saat ini. Status IC pallet akan diperbarui menjadi <strong>[{relocateIcStatus}]</strong> {relocateIcStatus === 'BO' ? '(akan muncul titik merah berkedip di dashboard)' : relocateIcStatus === 'HOLD' ? '(akan muncul titik biru berkedip di dashboard)' : '(normal tanpa titik berkedip)'}.
                      </p>
                      <button
                        type="button"
                        onClick={handleExecuteRelocateAction}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Simpan Perubahan Status ke [{relocateIcStatus}] (Rak Tetap di Slot {scannedPalletForRelocate.slotCode})</span>
                      </button>
                    </div>
                  ) : relocateTargetType === 'RACK' ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Scan QR Sticker Tiang Rak Tujuan (atau ketik kode slot misal B1a):
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={relocateTargetSlot}
                          onChange={(e) => setRelocateTargetSlot(e.target.value.toUpperCase())}
                          placeholder="Arahkan scanner ke QR tiang rak tujuan (contoh: B1a, RAK-B-P1)..."
                          className="flex-1 h-12 px-4 bg-white border-2 border-slate-300 rounded-xl font-mono text-base font-bold focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleExecuteRelocateAction}
                          className="px-6 h-12 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer"
                        >
                          Pindahkan ke Rak Ini (Status: {relocateIcStatus})
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">
                          Pilih Centang Salah Satu Opsi Lokasi Transit:
                        </span>
                        <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Status Produk Otomatis "BERADA DI TRANSIT"
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {availableStagingLocations.map(loc => {
                          const areaInfo = masterStagingAreas.find(a => a.name === loc || a.id === loc);
                          const isSelected = relocateTransitLocation === loc;

                          return (
                            <div
                              key={loc}
                              onClick={() => setRelocateTransitLocation(loc)}
                              className={`h-11 px-3 rounded-xl border font-bold text-xs transition cursor-pointer flex items-center justify-between group ${
                                isSelected
                                  ? 'bg-amber-100 border-amber-600 text-amber-950 font-black'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate">{loc}</span>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (areaInfo) {
                                      setPreviewAreaModal(areaInfo);
                                    } else {
                                      setPreviewAreaModal({
                                        id: loc,
                                        name: loc,
                                        type: loc.startsWith('Loading') ? 'LOADING' : 'LORONG',
                                        description: `Area transit ${loc}`,
                                        photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
                                        capacityPallets: 12
                                      });
                                    }
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-200/60 transition cursor-pointer"
                                  title={`Lihat Foto Area ${loc}`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {isSelected ? (
                                  <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0 group-hover:border-slate-400"></span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleExecuteRelocateAction}
                          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Keluarkan dari Rak ke Transit ({relocateTransitLocation})</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {relocateNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{relocateNotice}</span>
              </div>
            )}
          </div>

          {/* AREA KELOLA PRODUK YANG BERADA DI TRANSIT (DI WAKTU BERBEDA) */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Daftar Pallet yang Sedang Berada di Area Transit ({transitItems.length} Pallet)</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Di waktu yang berbeda, operator dapat memilih pallet di transit ini untuk dialihkan ke Rak Baru, Plan Kirim (SJA Sepanjang/Semarang/Karawang), atau BO ke Produksi.
                </p>
              </div>
            </div>

            {transitItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Tidak ada pallet yang sedang berada di area transit.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {transitItems.map(item => (
                  <div
                    key={item.id}
                    className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded">
                          Transit: {item.transitLocation}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.movedAt}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-900 text-sm mt-1.5 leading-snug">
                        {item.pallet.itemName}
                      </h4>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Batch: {item.pallet.batchNo} &bull; Asal: {item.sourceSlotCode}
                      </div>
                      <div className="text-xs font-black text-amber-900 mt-2">
                        {item.pallet.quantityBox} BOX ({item.pallet.quantityBox * 30} Kg)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTransitItem(item);
                        setTransitNextAction('TO_RACK');
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Tindak Lanjut Pallet Transit</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* MODAL / FORM TINDAK LANJUT PALLET DARI TRANSIT */}
            {selectedTransitItem && (
              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-amber-400 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">
                      Tindak Lanjut Pallet: {selectedTransitItem.pallet.itemName} ({selectedTransitItem.pallet.quantityBox} Box)
                    </h4>
                    <span className="text-xs text-slate-500">
                      Posisi Saat Ini: <strong>{selectedTransitItem.transitLocation}</strong> &bull; Slot Asal: <strong>{selectedTransitItem.sourceSlotCode}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTransitItem(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* 3 Pilihan Aksi Lanjutan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransitNextAction('TO_RACK')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      transitNextAction === 'TO_RACK'
                        ? 'bg-amber-100 border-amber-600 text-amber-950 font-black'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block font-bold">1. Pindahkan ke Rak</span>
                    <span className="text-[10px] text-slate-500">Scan slot rak tujuan baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransitNextAction('TO_PLAN')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      transitNextAction === 'TO_PLAN'
                        ? 'bg-rose-100 border-rose-600 text-rose-950 font-black'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block font-bold">2. Alihkan ke Plan Kirim</span>
                    <span className="text-[10px] text-slate-500">Sepanjang / Semarang / Karawang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransitNextAction('TO_PRODUCTION')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      transitNextAction === 'TO_PRODUCTION'
                        ? 'bg-blue-100 border-blue-600 text-blue-950 font-black'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="text-xs block font-bold">3. Kirim BO ke Produksi</span>
                    <span className="text-[10px] text-slate-500">Rework / sortir ulang pabrik</span>
                  </button>
                </div>

                {/* Konten Aksi Terpilih */}
                {transitNextAction === 'TO_RACK' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Scan / ketik slot rak tujuan (contoh: A1a, B2c)..."
                      value={transitTargetRack}
                      onChange={(e) => setTransitTargetRack(e.target.value.toUpperCase())}
                      className="flex-1 h-11 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleExecuteTransitFollowUp}
                      className="px-5 h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Simpan ke Rak
                    </button>
                  </div>
                )}

                {transitNextAction === 'TO_PLAN' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                    <input
                      type="date"
                      value={transitPlanDate}
                      onChange={(e) => setTransitPlanDate(e.target.value)}
                      className="h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                    />
                    <select
                      value={transitPlanDest}
                      onChange={(e) => setTransitPlanDest(e.target.value)}
                      className="h-10 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                    >
                      <option value="SJA SEPANJANG">SJA SEPANJANG</option>
                      <option value="SJA SEMARANG">SJA SEMARANG</option>
                      <option value="SJA KARAWANG">SJA KARAWANG</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleExecuteTransitFollowUp}
                      className="h-10 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Masukkan ke Plan Kirim
                    </button>
                  </div>
                )}

                {transitNextAction === 'TO_PRODUCTION' && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Catatan untuk bagian produksi..."
                      value={transitProdNote}
                      onChange={(e) => setTransitProdNote(e.target.value)}
                      className="flex-1 h-11 px-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleExecuteTransitFollowUp}
                      className="px-5 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Kirim ke Produksi
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. TAMPILAN FUNGSI 3: PENGIRIMAN PRODUK BO KE PACKING */}
      {/* ===================================================================== */}
      {activeFunction === 'BO_PACKING' && (
        <div className="space-y-6">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Factory className="w-5 h-5 text-blue-600" />
                <span>Pengiriman Produk BO ke Packing (Packing 1 atau Packing 2)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih unit Packing tujuan, scan barcode QR produk BO dari rak gudang, dan tambahkan catatan lokasi penempatan sementara.
              </p>
            </div>

            {/* OPSI PILIHAN PACKING: PACKING 1 ATAU PACKING 2 */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
                Pilih Unit Packing Tujuan Pengiriman:
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                <button
                  type="button"
                  onClick={() => setBoPackingUnit('Packing 1')}
                  className={`h-14 px-5 rounded-2xl border-2 font-black text-sm transition cursor-pointer flex items-center justify-between ${
                    boPackingUnit === 'Packing 1'
                      ? 'bg-blue-50 border-blue-600 text-blue-950 ring-4 ring-blue-600/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Factory className="w-5 h-5 text-blue-600" />
                    <span>Packing 1</span>
                  </span>
                  {boPackingUnit === 'Packing 1' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setBoPackingUnit('Packing 2')}
                  className={`h-14 px-5 rounded-2xl border-2 font-black text-sm transition cursor-pointer flex items-center justify-between ${
                    boPackingUnit === 'Packing 2'
                      ? 'bg-blue-50 border-blue-600 text-blue-950 ring-4 ring-blue-600/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Factory className="w-5 h-5 text-blue-600" />
                    <span>Packing 2</span>
                  </span>
                  {boPackingUnit === 'Packing 2' && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  )}
                </button>
              </div>
            </div>

            {/* SCAN QR CODE PRODUK BO */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-2.5">
              <label className="block text-xs font-black text-blue-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-blue-700" />
                  <span>Scan QR Code Produk BO di Rak:</span>
                </span>
                <span className="text-[11px] text-blue-700 font-normal">
                  Scanner Gun / Kamera / Enter
                </span>
              </label>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={boScanInput}
                    onChange={(e) => setBoScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleScanForBo(boScanInput);
                      }
                    }}
                    placeholder="Scan QR barcode produk BO atau masukkan slot asal..."
                    className="w-full h-13 pl-11 pr-4 bg-white border-2 border-slate-300 rounded-xl font-mono text-base font-bold focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none shadow-xs"
                  />
                  <QrCode className="w-5 h-5 text-slate-400 absolute left-3.5 top-4" />
                </div>

                <button
                  type="button"
                  onClick={() => handleScanForBo(boScanInput)}
                  className="px-6 h-13 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-black text-sm rounded-xl shadow-xs transition cursor-pointer shrink-0"
                >
                  Proses
                </button>
              </div>

              {boErrorNotice && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{boErrorNotice}</span>
                </div>
              )}

              {/* Bantuan cepat: HANYA PALLET BERSTATUS BO YANG BISA DIPILIH */}
              {!scannedBoPallet && (() => {
                const boOccupiedSlots = occupiedSlots.filter(s => s.pallet.icStatus === 'BO');
                if (boOccupiedSlots.length === 0) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">Tidak ada produk berstatus "BO" (Back Order / Rework) di dalam rak saat ini.</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Sesuai SOP FGW, <strong>HANYA</strong> produk berstatus <strong>BO</strong> yang dapat dikirimkan ke Packing. Seluruh pallet di rak saat ini berstatus OK atau HOLD. Jika ada pallet yang perlu dikirim ke packing, silakan ubah statusnya terlebih dahulu pada tab <strong>Pemindahan Rak</strong> (dapat dilakukan dengan posisi rak tetap atau sambil pindah slot).
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
                    <span className="text-slate-500 font-bold text-[11px] flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                      </span>
                      Pilih Pallet Status BO di Rak ({boOccupiedSlots.length} Pallet):
                    </span>
                    {boOccupiedSlots.map(slot => (
                      <button
                        key={slot.slotCode}
                        type="button"
                        onClick={() => handleScanForBo(slot.slotCode)}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 hover:border-rose-400 rounded-lg text-[11px] font-bold text-rose-950 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="font-mono bg-rose-100 text-rose-800 px-1 rounded text-[10px] font-black">Slot {slot.slotCode}</span>
                        <span className="truncate max-w-[130px]">{slot.pallet.itemName}</span>
                        <span className="text-[10px] text-rose-600 font-extrabold">(BO)</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* DASHBOARD MINI PRODUK BO TER-SCAN */}
            {scannedBoPallet && (
              <div className="p-5 bg-white rounded-2xl border-2 border-blue-300 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-black rounded-lg">
                      DATA PALLET PRODUK BO
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-600">
                      Slot Asal: {scannedBoPallet.slotCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScannedBoPallet(null)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Nama Produk:</span>
                    <span className="font-black text-slate-900 block mt-0.5 truncate">
                      {scannedBoPallet.pallet.itemName}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Nomor Batch:</span>
                    <span className="font-mono font-black text-slate-900 block mt-0.5">
                      {scannedBoPallet.pallet.batchNo}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Jumlah Box:</span>
                    <span className="font-black text-blue-700 block mt-0.5">
                      {scannedBoPallet.pallet.quantityBox} BOX
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Berat Muatan:</span>
                    <span className="font-black text-emerald-700 block mt-0.5">
                      {scannedBoPallet.pallet.quantityBox * 30} Kg
                    </span>
                  </div>
                </div>

                {/* KOLOM CATATAN KHUSUS */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-800">
                    Kolom Catatan (Memberikan Informasi Penempatan / Alasan):
                  </label>
                  <textarea
                    rows={2}
                    value={boNotes}
                    onChange={(e) => setBoNotes(e.target.value)}
                    placeholder="Contoh: sementara diletakkan di area depan loading dock, transit dekat meja QC, kemasan karton basah, dll..."
                    className="w-full p-3 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Tombol Eksekusi Kirim BO ke Packing */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExecuteSendBoToPacking}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                  >
                    <Factory className="w-4 h-4" />
                    <span>Keluarkan & Kirim Produk BO ke {boPackingUnit}</span>
                  </button>
                </div>
              </div>
            )}

            {boSuccessNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{boSuccessNotice}</span>
              </div>
            )}
          </div>

          {/* RIWAYAT PENGIRIMAN PRODUK BO KE PACKING */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Riwayat Pengiriman Produk BO ke Packing ({boRecords.length} Transaksi)</span>
            </h4>

            {boRecords.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                Belum ada pengiriman produk BO ke unit packing.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {boRecords.map(rec => (
                  <div
                    key={rec.id}
                    className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{rec.pallet.itemName}</span>
                        <span className="font-bold bg-blue-100 text-blue-900 text-[10px] px-2 py-0.5 rounded">
                          {rec.targetPacking}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Slot: {rec.sourceSlotCode} &bull; Muatan: {rec.pallet.quantityBox} BOX &bull; Catatan: <em>"{rec.notes}"</em>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      <div>{rec.timestamp}</div>
                      <div>{rec.operatorName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FOTO AREA STAGING / TRANSIT */}
      {previewAreaModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    {previewAreaModal.name}
                  </h3>
                  <span className="text-[11px] font-bold text-rose-700">
                    {previewAreaModal.type === 'LOADING' ? 'Area Loading Dock Bay' : 'Area Buffer Staging Lorong'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAreaModal(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Foto Area */}
            <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
              <img
                src={previewAreaModal.photoUrl}
                alt={previewAreaModal.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
                }}
              />
              <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/60 backdrop-blur-xs rounded-lg text-[10px] text-white font-mono font-bold">
                Kapasitas: {previewAreaModal.capacityPallets || 12} Pallet
              </div>
            </div>

            {/* Keterangan & Aksi */}
            <div className="p-5 space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Deskripsi & Penempatan:
                </span>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {previewAreaModal.description || 'Area penempatan pallet untuk persiapan dispatch ekspedisi dan staging pengiriman.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewAreaModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  Tutup
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const loc = previewAreaModal.name as StagingLocation;
                    if (activeFunction === 'PREPARE_PLAN') {
                      setStagingLocation(loc);
                    } else if (activeFunction === 'PEMINDAHAN_RAK') {
                      setRelocateTransitLocation(loc);
                    }
                    setPreviewAreaModal(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Pilih Lokasi Ini ({previewAreaModal.name})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
