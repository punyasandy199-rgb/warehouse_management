/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Users, 
  Printer, 
  Search, 
  X, 
  Layers, 
  Boxes, 
  Check, 
  Sparkles,
  ShieldAlert,
  ArrowRight,
  CreditCard,
  Hash,
  Scan,
  BookOpen,
  ShieldCheck,
  RefreshCw,
  Lock,
  Award,
  ChevronRight,
  UserCheck,
  ArrowLeftRight,
  HelpCircle,
  Percent,
  Sliders,
  Dices,
  CheckSquare,
  Target
} from 'lucide-react';
import { 
  EmployeePIC, 
  RackData, 
  ProductItem, 
  UserRole, 
  StockOpnamePICAssignment, 
  UserAccount,
  PalletData
} from '../types';

export type DiscrepancyType = 
  | 'MATCH'              // Cocok Sempurna (100%)
  | 'DISCREPANCY_QTY'    // Selisih Qty Fisik vs Sistem
  | 'WRONG_RACK'         // Salah Rak (Misplaced di lokasi lain)
  | 'WRONG_PRODUCT'      // Salah Produk (Barang fisik beda jenis dari terdaftar)
  | 'UNVERIFIED';        // Belum Diperiksa

export type OpnameWorkflowStage = 
  | 'STAGE_1_RANDOM_SCAN'      // Sesi 1: Random scan produk & lokasi rak, input real qty
  | 'STAGE_2_RECONCILIATION'   // Sesi 2: Investigasi, pencarian produk & membetulkan stok di sistem
  | 'STAGE_3_WAITING_APPROVAL' // Menunggu verifikasi SPV / Super Admin (Hasil sudah sesuai semua)
  | 'STAGE_4_APPROVED';        // Selesai diverifikasi & disahkan oleh SPV / Super Admin

export interface AuditItemRecord {
  id: string;
  slotCode: string;
  rackId: string;
  level: number; // 1, 2, 3, 4, 5
  // Data Sistem
  systemItemCode: string;
  systemItemName: string;
  systemQtyBox: number;
  systemBatchNo?: string;
  
  // Data Temuan Fisik (Sesi 1 Random Scan)
  scannedSlotCode?: string;
  scannedItemCode?: string;
  scannedItemName?: string;
  actualQtyBox: number;
  discrepancyBox: number; // actualQtyBox - systemQtyBox
  discrepancyType: DiscrepancyType;
  
  // Sampling Target Flag
  isSampleTarget?: boolean;
  samplingType?: 'PERCENTAGE' | 'MANUAL';
  
  // Sesi 2 Tracking & Rekonsiliasi
  auditSession: 1 | 2;
  isReconciledInSession2?: boolean;
  reconciliationAction?: 'CORRECTED_QTY' | 'RELOCATED_RACK' | 'CORRECTED_PRODUCT' | 'NONE';
  reconciliationNotes?: string;
  
  checkedByNik?: string;
  checkedByName?: string;
  checkedAt?: string;
  notes?: string;
}

export interface SpvApprovalData {
  approvedBy: string;
  approverRole: string;
  approverNik?: string;
  approvedAt: string;
  notes: string;
  certificateId: string;
  signaturePinVerified: boolean;
}

interface StockOpnameViewProps {
  employees: EmployeePIC[];
  racks: Record<string, RackData>;
  products: ProductItem[];
  userRole: UserRole;
  currentUserName: string;
  currentUser?: UserAccount;
  allUsers?: UserAccount[];
  onSwitchUser?: (user: UserAccount) => void;
  onUpdateRacks?: React.Dispatch<React.SetStateAction<Record<string, RackData>>>;
  onSaveAuditLog?: (slotCode: string, isMatch: boolean, actualQty: number, notes: string) => void;
  onOpenMasterEmployee?: () => void;
  onOpenScannerAudit?: (slotCode?: string) => void;
  onOpenSOP?: () => void;
}

export const StockOpnameView: React.FC<StockOpnameViewProps> = ({
  employees,
  racks,
  products,
  userRole,
  currentUserName,
  currentUser,
  allUsers = [],
  onSwitchUser,
  onUpdateRacks,
  onSaveAuditLog,
  onOpenMasterEmployee,
  onOpenScannerAudit,
  onOpenSOP
}) => {
  // Default Tanggal & Jam saat ini
  const todayDateStr = new Date().toISOString().split('T')[0];
  const currentTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const [sessionNumber] = useState(() => `SO-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-001`);
  const [sessionDate, setSessionDate] = useState(todayDateStr);
  const [sessionTime, setSessionTime] = useState(currentTimeStr);
  const [targetRack, setTargetRack] = useState<string>('ALL');

  // Multi-stage Workflow State
  const [workflowStage, setWorkflowStage] = useState<OpnameWorkflowStage>('STAGE_1_RANDOM_SCAN');

  // Tim PIC Stock Opname
  const [picList, setPicList] = useState<StockOpnamePICAssignment[]>(() => {
    const defaultEmp = employees.find(e => (e.hrisId && e.hrisId === '2161105') || e.nik === '2161105') || employees[0];
    return [
      {
        id: `pic-${Date.now()}-1`,
        scannedId: defaultEmp?.hrisId || defaultEmp?.nik || '2161105',
        hrisId: defaultEmp?.hrisId || defaultEmp?.nik || '2161105',
        idCard: defaultEmp?.idCard || 'IDC-908122',
        nik: defaultEmp?.hrisId || defaultEmp?.nik || '2161105',
        name: defaultEmp?.name || 'Budi Santoso',
        department: defaultEmp?.department || 'Warehouse FGW',
        roleInAudit: 'Ketua Tim Opname',
        notes: 'Koordinator pemeriksaan fisik',
        matchedType: 'HRIS'
      }
    ];
  });

  // Modal Scanner NIK / ID CARD
  const [isNikScannerOpen, setIsNikScannerOpen] = useState(false);
  const [activePicRowIndex, setActivePicRowIndex] = useState<number>(0);
  const [scanNikInput, setScanNikInput] = useState('');

  // Initial Audit Records generator based on active racks
  const [auditRecords, setAuditRecords] = useState<AuditItemRecord[]>(() => {
    const initialList: AuditItemRecord[] = [];
    Object.values(racks).forEach(rack => {
      Object.values(rack.slots).forEach(slot => {
        if (slot.status === 'occupied' && slot.pallet) {
          const parsedLevel = slot.level || parseInt(slot.slotCode.replace(/\D/g, '').charAt(0), 10) || 1;
          initialList.push({
            id: `audit-${slot.slotCode}`,
            slotCode: slot.slotCode,
            rackId: rack.id,
            level: parsedLevel,
            systemItemCode: slot.pallet.itemCode,
            systemItemName: slot.pallet.itemName,
            systemQtyBox: slot.pallet.quantityBox,
            systemBatchNo: slot.pallet.batchNo,
            scannedSlotCode: slot.slotCode,
            scannedItemCode: slot.pallet.itemCode,
            scannedItemName: slot.pallet.itemName,
            actualQtyBox: slot.pallet.quantityBox,
            discrepancyBox: 0,
            discrepancyType: slot.pallet.isVerifiedAudit ? 'MATCH' : 'UNVERIFIED',
            auditSession: 1,
            isReconciledInSession2: false,
            isSampleTarget: true, // Default included in sample
            samplingType: 'PERCENTAGE',
            checkedByNik: '2161105',
            checkedByName: 'Budi Santoso',
            checkedAt: 'Hari ini',
            notes: 'Sesuai fisik rak'
          });
        }
      });
    });
    return initialList;
  });

  // METODE PEMILIHAN SAMPEL STOCK OPNAME (Sampling Strategy)
  const [samplingMode, setSamplingMode] = useState<'PERCENTAGE' | 'MANUAL'>('PERCENTAGE');
  const [samplePercentage, setSamplePercentage] = useState<number>(15); // default 15%
  const [customPercentageInput, setCustomPercentageInput] = useState<string>('15');
  const [floorRatioPreset, setFloorRatioPreset] = useState<'75_25' | '80_20' | '50_50'>('75_25');
  const [manualSelectedSlots, setManualSelectedSlots] = useState<Set<string>>(() => new Set(['A1a', 'A2a', 'A3a', 'B1a']));
  const [filterOnlySampleTargets, setFilterOnlySampleTargets] = useState<boolean>(false);

  // Active filter tab on product audit list
  const [filterTab, setFilterTab] = useState<'ALL' | 'ISSUES' | 'WRONG_RACK' | 'WRONG_PRODUCT' | 'QTY_MISMATCH' | 'MATCH' | 'UNVERIFIED'>('ALL');

  // Random Scan Inputs (Sesi 1)
  const [randomScanSlot, setRandomScanSlot] = useState<string>('A1a');
  const [randomScanProductCode, setRandomScanProductCode] = useState<string>(products[0]?.itemCode || 'FG-COF-122');
  const [randomScanQty, setRandomScanQty] = useState<number>(15);
  const [randomScanNotes, setRandomScanNotes] = useState<string>('Pemeriksaan fisik random');
  const [randomScanAuditorNik, setRandomScanAuditorNik] = useState<string>(picList[0]?.nik || '2161105');
  const [lastScanAlert, setLastScanAlert] = useState<{ type: 'success' | 'warning' | 'danger' | 'info'; title: string; message: string } | null>(null);

  // Sesi 2 Product Locator Search
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');

  // Sesi 2 Correction Modal
  const [selectedIssueItem, setSelectedIssueItem] = useState<AuditItemRecord | null>(null);
  const [correctionActionType, setCorrectionActionType] = useState<'CORRECT_QTY' | 'RELOCATE_RACK' | 'CORRECT_PRODUCT' | 'RECOUNT_ONLY'>('CORRECT_QTY');
  const [correctNewQty, setCorrectNewQty] = useState<number>(15);
  const [correctTargetSlot, setCorrectTargetSlot] = useState<string>('');
  const [correctTargetProductCode, setCorrectTargetProductCode] = useState<string>('');
  const [correctionNote, setCorrectionNote] = useState<string>('');

  // SPV / Super Admin Approval Modal & Data
  const [isSpvApprovalModalOpen, setIsSpvApprovalModalOpen] = useState(false);
  const [spvPinInput, setSpvPinInput] = useState('1234');
  const [spvNotesInput, setSpvNotesInput] = useState('Semua selisih fisik telah diinvestigasi pada Sesi 2 dan dikoreksi ke dalam sistem dengan benar. Periode Stock Opname resmi disetujui & ditutup.');
  const [spvApprovalData, setSpvApprovalData] = useState<SpvApprovalData | null>(null);

  // Modal Beralih Akun Cepat (Quick Switch User)
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);

  // Print Berita Acara Modal
  const [isPrintBeritaAcaraOpen, setIsPrintBeritaAcaraOpen] = useState(false);

  // Helper update current time
  const handleSetCurrentTime = () => {
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSessionTime(now);
  };

  // PIC List Handlers
  const handleAddPicRow = () => {
    const newPic: StockOpnamePICAssignment = {
      id: `pic-${Date.now()}-${picList.length + 1}`,
      scannedId: '',
      hrisId: '',
      idCard: '',
      nik: '',
      name: '',
      department: '',
      roleInAudit: 'Petugas Scan Fisik',
      notes: '',
      matchedType: 'NONE'
    };
    setPicList(prev => [...prev, newPic]);
  };

  const handleRemovePicRow = (id: string) => {
    if (picList.length <= 1) {
      alert('Minimal harus ada 1 PIC dalam sesi Stock Opname!');
      return;
    }
    setPicList(prev => prev.filter(p => p.id !== id));
  };

  const handleNikChange = (index: number, inputVal: string) => {
    const trimmed = inputVal.trim().toLowerCase();
    const foundEmp = employees.find(e => 
      (e.hrisId && e.hrisId.toLowerCase() === trimmed) ||
      (e.idCard && e.idCard.toLowerCase() === trimmed) ||
      (e.nik && e.nik.toLowerCase() === trimmed)
    );

    let matchedType: 'HRIS' | 'CARD' | 'NONE' = 'NONE';
    if (foundEmp) {
      if (foundEmp.idCard && foundEmp.idCard.toLowerCase() === trimmed) {
        matchedType = 'CARD';
      } else {
        matchedType = 'HRIS';
      }
    }

    setPicList(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        scannedId: inputVal,
        hrisId: foundEmp ? (foundEmp.hrisId || foundEmp.nik) : copy[index].hrisId,
        idCard: foundEmp ? foundEmp.idCard : copy[index].idCard,
        nik: foundEmp ? (foundEmp.hrisId || foundEmp.nik) : inputVal,
        name: foundEmp ? foundEmp.name : copy[index].name,
        department: foundEmp ? foundEmp.department : copy[index].department,
        matchedType: foundEmp ? matchedType : 'NONE'
      };
      return copy;
    });
  };

  const handleOpenNikScanner = (rowIndex: number) => {
    setActivePicRowIndex(rowIndex);
    setScanNikInput(picList[rowIndex]?.scannedId || picList[rowIndex]?.nik || '');
    setIsNikScannerOpen(true);
  };

  const handleApplyScannedNik = (detectedId: string) => {
    handleNikChange(activePicRowIndex, detectedId);
    setIsNikScannerOpen(false);
  };

  // =========================================================================
  // EXECUTE RANDOM SCAN & AUDIT CLASSIFICATION (SESI 1)
  // =========================================================================
  const handleExecuteRandomScan = (
    slotCodeInput: string,
    scannedProdCode: string,
    realQtyInput: number,
    customNotes?: string,
    forcedDiscrepancyType?: DiscrepancyType
  ) => {
    const normalizedSlot = slotCodeInput.trim().toUpperCase();
    const targetProduct = products.find(p => p.itemCode.toUpperCase() === scannedProdCode.toUpperCase() || p.id.toUpperCase() === scannedProdCode.toUpperCase());
    const auditor = picList.find(p => p.nik === randomScanAuditorNik) || employees.find(e => e.nik === randomScanAuditorNik);
    const auditorName = auditor ? `${auditor.name} (${auditor.department})` : currentUserName;
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Lookup in existing records or find slot in racks
    const existingIndex = auditRecords.findIndex(r => r.slotCode.toUpperCase() === normalizedSlot);
    let existingRecord = existingIndex >= 0 ? auditRecords[existingIndex] : null;

    // Check system slot in racks
    const rackId = normalizedSlot.charAt(0);
    const systemSlot = racks[rackId]?.slots[normalizedSlot];
    const systemPallet = systemSlot?.pallet;

    // Determine Discrepancy Type if not forced
    let detectedType: DiscrepancyType = 'MATCH';
    let alertBanner: { type: 'success' | 'warning' | 'danger' | 'info'; title: string; message: string } = {
      type: 'success',
      title: 'Scan Fisik Sesuai 100%',
      message: `Slot ${normalizedSlot} berisi ${targetProduct?.itemName || scannedProdCode} sebanyak ${realQtyInput} BOX (Sesuai Sistem).`
    };

    if (forcedDiscrepancyType) {
      detectedType = forcedDiscrepancyType;
    } else if (!systemPallet) {
      // Slot is empty in system, but physical product was found!
      detectedType = 'WRONG_RACK';
      alertBanner = {
        type: 'warning',
        title: '⚠️ SALAH RAK (Misplaced)',
        message: `Slot ${normalizedSlot} di sistem tercatat KOSONG, namun fisik ditemukan produk ${targetProduct?.itemName || scannedProdCode} (${realQtyInput} Box)!`
      };
    } else if (systemPallet.itemCode.toUpperCase() !== scannedProdCode.toUpperCase()) {
      // Product mismatch in this slot
      detectedType = 'WRONG_PRODUCT';
      alertBanner = {
        type: 'danger',
        title: '⛔ SALAH PRODUK (Mismatch)',
        message: `Slot ${normalizedSlot} di sistem tercatat "${systemPallet.itemName}", namun fisik yang di-scan adalah "${targetProduct?.itemName || scannedProdCode}"!`
      };
    } else if (realQtyInput !== systemPallet.quantityBox) {
      // Quantity mismatch
      detectedType = 'DISCREPANCY_QTY';
      const diff = realQtyInput - systemPallet.quantityBox;
      alertBanner = {
        type: 'danger',
        title: '⚠️ SELISIH KUANTITAS',
        message: `Slot ${normalizedSlot}: Qty Fisik ${realQtyInput} Box vs Sistem ${systemPallet.quantityBox} Box (Selisih ${diff > 0 ? `+${diff}` : diff} Box)!`
      };
    }

    if (forcedDiscrepancyType === 'WRONG_RACK') {
      alertBanner = {
        type: 'warning',
        title: '⚠️ SALAH RAK (Misplaced)',
        message: `Produk ${targetProduct?.itemName || scannedProdCode} ditemukan nyasar di Slot ${normalizedSlot}, padahal data sistem mencatat di lokasi lain!`
      };
    } else if (forcedDiscrepancyType === 'WRONG_PRODUCT') {
      alertBanner = {
        type: 'danger',
        title: '⛔ SALAH PRODUK (Mismatch)',
        message: `Slot ${normalizedSlot} terisi produk yang salah! Fisik: ${targetProduct?.itemName || scannedProdCode}, Sistem: ${systemPallet?.itemName || 'Produk Lain'}.`
      };
    } else if (forcedDiscrepancyType === 'DISCREPANCY_QTY') {
      alertBanner = {
        type: 'danger',
        title: '⚠️ SELISIH KUANTITAS',
        message: `Slot ${normalizedSlot}: Terjadi selisih fisik ${realQtyInput} Box vs sistem ${systemPallet?.quantityBox || 15} Box!`
      };
    }

    setLastScanAlert(alertBanner);

    const parsedLevel = parseInt(normalizedSlot.replace(/\D/g, '').charAt(0), 10) || 1;
    const updatedRecord: AuditItemRecord = {
      id: existingRecord ? existingRecord.id : `audit-${normalizedSlot}`,
      slotCode: normalizedSlot,
      rackId: rackId,
      level: existingRecord?.level || parsedLevel,
      systemItemCode: systemPallet?.itemCode || 'UNKNOWN',
      systemItemName: systemPallet?.itemName || 'Slot Kosong di Sistem',
      systemQtyBox: systemPallet?.quantityBox || 0,
      systemBatchNo: systemPallet?.batchNo || '-',
      scannedSlotCode: normalizedSlot,
      scannedItemCode: scannedProdCode,
      scannedItemName: targetProduct?.itemName || scannedProdCode,
      actualQtyBox: realQtyInput,
      discrepancyBox: realQtyInput - (systemPallet?.quantityBox || 0),
      discrepancyType: detectedType,
      auditSession: 1,
      isReconciledInSession2: false,
      isSampleTarget: existingRecord?.isSampleTarget !== undefined ? existingRecord.isSampleTarget : true,
      samplingType: existingRecord?.samplingType || 'PERCENTAGE',
      checkedByNik: randomScanAuditorNik,
      checkedByName: auditorName,
      checkedAt: nowTimeStr,
      notes: customNotes || alertBanner.message
    };

    setAuditRecords(prev => {
      const idx = prev.findIndex(r => r.slotCode.toUpperCase() === normalizedSlot);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedRecord;
        return copy;
      }
      return [updatedRecord, ...prev];
    });

    if (onSaveAuditLog) {
      onSaveAuditLog(normalizedSlot, detectedType === 'MATCH', realQtyInput, alertBanner.message);
    }
  };

  // STRATIFIED RANDOM SAMPLING ENGINE (Persentase % & Bobot Level Lantai 1-2 vs Lantai 3-5)
  const handleGenerateStratifiedSample = (
    pct: number = samplePercentage,
    ratio: '75_25' | '80_20' | '50_50' = floorRatioPreset
  ) => {
    // Kumpulkan seluruh slot terisi yang relevan di gudang
    const candidateSlots: { slotCode: string; rackId: string; level: number }[] = [];
    Object.values(racks).forEach(rack => {
      if (targetRack !== 'ALL' && rack.id !== targetRack) return;
      Object.values(rack.slots).forEach(slot => {
        if (slot.status === 'occupied' && slot.pallet) {
          const lvl = slot.level || parseInt(slot.slotCode.replace(/\D/g, '').charAt(0), 10) || 1;
          candidateSlots.push({
            slotCode: slot.slotCode,
            rackId: rack.id,
            level: lvl
          });
        }
      });
    });

    if (candidateSlots.length === 0) {
      alert('Tidak ada slot terisi pada target rak yang dipilih!');
      return;
    }

    // Hitung target kuota sampel berdasarkan persentase (min 1 slot)
    const targetTotalCount = Math.max(1, Math.round((candidateSlots.length * pct) / 100));

    // Pisahkan kandidat Lantai 1 & 2 (Bawah/Mayoritas) dan Lantai 3, 4, 5 (Atas/Sebagian)
    const lowerSlots = candidateSlots.filter(s => s.level <= 2);
    const upperSlots = candidateSlots.filter(s => s.level >= 3);

    // Rasio pembobotan: default 75% Lantai 1-2, 25% Lantai 3-5
    let lowerRatio = 0.75;
    if (ratio === '80_20') lowerRatio = 0.80;
    if (ratio === '50_50') lowerRatio = 0.50;

    let targetLower = Math.round(targetTotalCount * lowerRatio);
    let targetUpper = targetTotalCount - targetLower;

    // Pastikan jika ada slot atas dan target >= 2, minimal ada 1 dari lantai 3-5
    if (upperSlots.length > 0 && targetTotalCount >= 2 && targetUpper === 0) {
      targetUpper = 1;
      targetLower = targetTotalCount - 1;
    }
    if (targetLower > lowerSlots.length) {
      targetLower = lowerSlots.length;
      targetUpper = Math.min(upperSlots.length, targetTotalCount - targetLower);
    }
    if (targetUpper > upperSlots.length) {
      targetUpper = upperSlots.length;
      targetLower = Math.min(lowerSlots.length, targetTotalCount - targetUpper);
    }

    // Acak secara adil (deterministic-pseudo shuffle)
    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const pickedLower = shuffle(lowerSlots).slice(0, targetLower);
    const pickedUpper = shuffle(upperSlots).slice(0, targetUpper);
    const selectedSampleSlots = [...pickedLower, ...pickedUpper];
    const selectedCodesSet = new Set(selectedSampleSlots.map(s => s.slotCode.toUpperCase()));

    setManualSelectedSlots(selectedCodesSet);

    // Update auditRecords: tandai isSampleTarget = true untuk yang terpilih
    setAuditRecords(prev => {
      const updated = prev.map(rec => ({
        ...rec,
        isSampleTarget: selectedCodesSet.has(rec.slotCode.toUpperCase()),
        samplingType: 'PERCENTAGE' as const
      }));

      // Tambahkan ke auditRecords jika ada slot terpilih yang belum tercatat
      selectedSampleSlots.forEach(sel => {
        if (!updated.some(u => u.slotCode.toUpperCase() === sel.slotCode.toUpperCase())) {
          const rack = racks[sel.rackId];
          const slot = rack?.slots[sel.slotCode];
          if (slot?.pallet) {
            updated.push({
              id: `audit-${slot.slotCode}`,
              slotCode: slot.slotCode,
              rackId: sel.rackId,
              level: sel.level,
              systemItemCode: slot.pallet.itemCode,
              systemItemName: slot.pallet.itemName,
              systemQtyBox: slot.pallet.quantityBox,
              systemBatchNo: slot.pallet.batchNo,
              scannedSlotCode: slot.slotCode,
              scannedItemCode: slot.pallet.itemCode,
              scannedItemName: slot.pallet.itemName,
              actualQtyBox: slot.pallet.quantityBox,
              discrepancyBox: 0,
              discrepancyType: 'UNVERIFIED',
              auditSession: 1,
              isReconciledInSession2: false,
              isSampleTarget: true,
              samplingType: 'PERCENTAGE',
              notes: `Target Sampel Acak ${pct}% (Lantai ${sel.level})`
            });
          }
        }
      });

      return updated;
    });

    const countL1 = selectedSampleSlots.filter(s => s.level === 1).length;
    const countL2 = selectedSampleSlots.filter(s => s.level === 2).length;
    const countL3 = selectedSampleSlots.filter(s => s.level === 3).length;
    const countL4 = selectedSampleSlots.filter(s => s.level >= 4).length;

    setLastScanAlert({
      type: 'info',
      title: `🎲 Berhasil Menentukan Sampel Acak ${pct}% (${selectedSampleSlots.length} Slot Terpilih)`,
      message: `Distribusi Tingkat: Mayoritas Lantai 1 & 2 (${countL1 + countL2} Slot = ${Math.round(((countL1 + countL2)/selectedSampleSlots.length)*100)}%), serta Lantai 3: ${countL3} Slot, Lantai 4/5: ${countL4} Slot.`
    });
  };

  // Toggle checklist manual satu per satu
  const handleToggleManualSlot = (slotCode: string) => {
    setManualSelectedSlots(prev => {
      const copy = new Set(prev);
      const code = slotCode.toUpperCase();
      if (copy.has(code)) {
        copy.delete(code);
      } else {
        copy.add(code);
      }
      setAuditRecords(recs =>
        recs.map(r => ({
          ...r,
          isSampleTarget: copy.has(r.slotCode.toUpperCase()),
          samplingType: 'MANUAL'
        }))
      );
      return copy;
    });
  };

  // Preset Selection Handlers untuk Manual Mode
  const handleSelectAllFloor = (floorLevel: number | 'L1_L2' | 'L3_L5' | 'ALL' | 'CLEAR') => {
    if (floorLevel === 'CLEAR') {
      setManualSelectedSlots(new Set());
      setAuditRecords(recs => recs.map(r => ({ ...r, isSampleTarget: false, samplingType: 'MANUAL' })));
      return;
    }

    const newSet = new Set(manualSelectedSlots);
    auditRecords.forEach(r => {
      let match = false;
      if (floorLevel === 'ALL') match = true;
      else if (floorLevel === 'L1_L2') match = r.level <= 2;
      else if (floorLevel === 'L3_L5') match = r.level >= 3;
      else if (typeof floorLevel === 'number') match = r.level === floorLevel;

      if (match) newSet.add(r.slotCode.toUpperCase());
    });

    setManualSelectedSlots(newSet);
    setAuditRecords(recs =>
      recs.map(r => ({
        ...r,
        isSampleTarget: newSet.has(r.slotCode.toUpperCase()),
        samplingType: 'MANUAL'
      }))
    );
  };

  // Preset Simulation Scenarios for Quick Testing
  const handleRunPresetScenario = (scenario: 'MATCH' | 'QTY_MISMATCH' | 'WRONG_RACK' | 'WRONG_PRODUCT') => {
    if (scenario === 'MATCH') {
      setRandomScanSlot('A1a');
      setRandomScanProductCode('FG-COF-122');
      setRandomScanQty(15);
      setRandomScanNotes('Fisik A1a cocok sempurna dengan sistem');
      handleExecuteRandomScan('A1a', 'FG-COF-122', 15, 'Fisik A1a cocok sempurna dengan sistem', 'MATCH');
    } else if (scenario === 'QTY_MISMATCH') {
      setRandomScanSlot('B1a');
      setRandomScanProductCode('FG-COF-122');
      setRandomScanQty(12);
      setRandomScanNotes('Fisik ditemukan 12 box (kurang 3 box dari data sistem 15 box)');
      handleExecuteRandomScan('B1a', 'FG-COF-122', 12, 'Selisih Qty -3 Box di Slot B1a', 'DISCREPANCY_QTY');
    } else if (scenario === 'WRONG_RACK') {
      setRandomScanSlot('C1a');
      setRandomScanProductCode('FG-COF-122');
      setRandomScanQty(15);
      setRandomScanNotes('Pallet nyasar: Ditemukan di Rak C1a (seharusnya ada di Rak A3a)');
      handleExecuteRandomScan('C1a', 'FG-COF-122', 15, 'Pallet tertukar/salah rak di C1a', 'WRONG_RACK');
    } else if (scenario === 'WRONG_PRODUCT') {
      setRandomScanSlot('A2a');
      const otherProd = products[1] || products[0];
      setRandomScanProductCode(otherProd.itemCode);
      setRandomScanQty(15);
      setRandomScanNotes(`Salah produk di Slot A2a: Fisik berisi ${otherProd.itemName}`);
      handleExecuteRandomScan('A2a', otherProd.itemCode, 15, `Salah produk di Slot A2a: Fisik ${otherProd.itemName}`, 'WRONG_PRODUCT');
    }
  };

  // =========================================================================
  // SESI 2: INVESTIGASI, PENCARIAN PRODUK & KOREKSI STOK SISTEM
  // =========================================================================
  const handleOpenCorrectionModal = (item: AuditItemRecord) => {
    setSelectedIssueItem(item);
    setCorrectNewQty(item.actualQtyBox);
    setCorrectTargetSlot(item.slotCode);
    setCorrectTargetProductCode(item.scannedItemCode || item.systemItemCode);
    setCorrectionActionType(
      item.discrepancyType === 'WRONG_RACK' ? 'RELOCATE_RACK' :
      item.discrepancyType === 'WRONG_PRODUCT' ? 'CORRECT_PRODUCT' : 'CORRECT_QTY'
    );
    setCorrectionNote(`Investigasi Sesi 2: Koreksi sistem berdasarkan temuan fisik aktual.`);
  };

  // Execute system correction in Sesi 2
  const handleApplySystemCorrection = () => {
    if (!selectedIssueItem) return;

    const slotCode = selectedIssueItem.slotCode;
    const rackId = slotCode.charAt(0);
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Update system rack state if onUpdateRacks is available
    if (onUpdateRacks) {
      onUpdateRacks(prev => {
        const copy = { ...prev };
        if (!copy[rackId]) return prev;

        const rackCopy = { ...copy[rackId], slots: { ...copy[rackId].slots } };
        const slot = rackCopy.slots[slotCode];

        if (correctionActionType === 'CORRECT_QTY' && slot?.pallet) {
          slot.pallet = {
            ...slot.pallet,
            quantityBox: correctNewQty,
            isVerifiedAudit: true,
            notes: `Dikoreksi pada Sesi 2 Opname: ${correctNewQty} Box`
          };
        } else if (correctionActionType === 'RELOCATE_RACK' && correctTargetSlot) {
          const targetRackId = correctTargetSlot.charAt(0);
          if (copy[targetRackId]) {
            const targetRackCopy = { ...copy[targetRackId], slots: { ...copy[targetRackId].slots } };
            // Move pallet from source to target slot
            if (slot?.pallet) {
              const movingPallet = { ...slot.pallet, isVerifiedAudit: true };
              targetRackCopy.slots[correctTargetSlot] = {
                ...targetRackCopy.slots[correctTargetSlot],
                status: 'occupied',
                pallet: movingPallet
              };
              slot.status = 'empty';
              slot.pallet = undefined;
              copy[targetRackId] = targetRackCopy;
            }
          }
        } else if (correctionActionType === 'CORRECT_PRODUCT' && slot?.pallet) {
          const prodObj = products.find(p => p.itemCode === correctTargetProductCode);
          if (prodObj) {
            slot.pallet = {
              ...slot.pallet,
              itemCode: prodObj.itemCode,
              itemName: prodObj.itemName,
              isVerifiedAudit: true
            };
          }
        }
        copy[rackId] = rackCopy;
        return copy;
      });
    }

    // Update audit record to MATCH (Reconciled)
    setAuditRecords(prev =>
      prev.map(r => {
        if (r.id === selectedIssueItem.id) {
          return {
            ...r,
            systemQtyBox: correctNewQty,
            actualQtyBox: correctNewQty,
            discrepancyBox: 0,
            discrepancyType: 'MATCH',
            auditSession: 2,
            isReconciledInSession2: true,
            reconciliationAction: 
              correctionActionType === 'CORRECT_QTY' ? 'CORRECTED_QTY' :
              correctionActionType === 'RELOCATE_RACK' ? 'RELOCATED_RACK' :
              correctionActionType === 'CORRECT_PRODUCT' ? 'CORRECTED_PRODUCT' : 'NONE',
            reconciliationNotes: correctionNote,
            checkedAt: nowTimeStr,
            notes: `✓ Sesi 2: Sistem berhasil dibetulkan & fisik sesuai 100% (${correctionNote})`
          };
        }
        return r;
      })
    );

    if (onSaveAuditLog) {
      onSaveAuditLog(slotCode, true, correctNewQty, `Sesi 2 Terkoreksi: ${correctionNote}`);
    }

    setSelectedIssueItem(null);
  };

  // Auto Reconcile All Issues in Sesi 2 (Quick Resolve All for Operator/Supervisor)
  const handleAutoReconcileAllSession2 = () => {
    const nowTimeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    setAuditRecords(prev =>
      prev.map(r => {
        if (r.discrepancyType !== 'MATCH' && r.discrepancyType !== 'UNVERIFIED') {
          return {
            ...r,
            systemQtyBox: r.actualQtyBox,
            discrepancyBox: 0,
            discrepancyType: 'MATCH',
            auditSession: 2,
            isReconciledInSession2: true,
            reconciliationAction: 'CORRECTED_QTY',
            reconciliationNotes: 'Koreksi sistem massal Sesi 2: Stok sistem disesuaikan dengan fisik nyata.',
            checkedAt: nowTimeStr,
            notes: '✓ Sesi 2: Stok sistem telah dibetulkan sesuai hasil investigasi fisik.'
          };
        }
        return r;
      })
    );

    alert('Semua selisih telah berhasil direkonsiliasi dan disesuaikan di sistem pada Sesi 2!');
  };

  // Advance to Stage 3 (Waiting SPV / Super Admin Approval)
  const handleProceedToApproval = () => {
    setWorkflowStage('STAGE_3_WAITING_APPROVAL');
  };

  // SPV / Super Admin Approval Execution
  const handleExecuteSpvApproval = () => {
    if (spvPinInput !== '1234') {
      alert('PIN Otorisasi SPV / Super Admin salah! (Default PIN: 1234)');
      return;
    }

    const approverName = currentUser?.name || currentUserName;
    const approverRole = (currentUser?.role || userRole).toUpperCase();
    const certId = `CERT-SPV-${Date.now().toString().slice(-6)}`;
    const nowStamp = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' });

    setSpvApprovalData({
      approvedBy: approverName,
      approverRole: approverRole,
      approverNik: currentUser?.id || 'SPV-9901',
      approvedAt: nowStamp,
      notes: spvNotesInput,
      certificateId: certId,
      signaturePinVerified: true
    });

    setWorkflowStage('STAGE_4_APPROVED');
    setIsSpvApprovalModalOpen(false);
  };

  // Computed metrics
  const totalSlots = auditRecords.length;
  const matchCount = auditRecords.filter(r => r.discrepancyType === 'MATCH').length;
  const discrepancyQtyCount = auditRecords.filter(r => r.discrepancyType === 'DISCREPANCY_QTY').length;
  const wrongRackCount = auditRecords.filter(r => r.discrepancyType === 'WRONG_RACK').length;
  const wrongProductCount = auditRecords.filter(r => r.discrepancyType === 'WRONG_PRODUCT').length;
  const totalIssuesCount = discrepancyQtyCount + wrongRackCount + wrongProductCount;
  const unverifiedCount = auditRecords.filter(r => r.discrepancyType === 'UNVERIFIED').length;
  const accuracyPct = totalSlots > 0 ? Math.round((matchCount / totalSlots) * 100) : 100;

  // Sampling Target Metrics
  const sampledTargetCount = auditRecords.filter(r => r.isSampleTarget).length;
  const sampledFloor1 = auditRecords.filter(r => r.isSampleTarget && r.level === 1).length;
  const sampledFloor2 = auditRecords.filter(r => r.isSampleTarget && r.level === 2).length;
  const sampledFloor3 = auditRecords.filter(r => r.isSampleTarget && r.level === 3).length;
  const sampledFloor4Plus = auditRecords.filter(r => r.isSampleTarget && r.level >= 4).length;
  const sampledLowerTotal = sampledFloor1 + sampledFloor2;
  const sampledUpperTotal = sampledFloor3 + sampledFloor4Plus;
  const lowerPctOfSample = sampledTargetCount > 0 ? Math.round((sampledLowerTotal / sampledTargetCount) * 100) : 0;
  const upperPctOfSample = sampledTargetCount > 0 ? Math.round((sampledUpperTotal / sampledTargetCount) * 100) : 0;

  // Filtered records by Tab & Sampling Filter
  const displayedRecords = useMemo(() => {
    return auditRecords.filter(item => {
      // Filter by Target Rack
      if (targetRack !== 'ALL' && item.rackId !== targetRack) return false;

      // Filter by Only Sample Targets
      if (filterOnlySampleTargets && !item.isSampleTarget) return false;

      // Filter by Tab
      if (filterTab === 'ISSUES') {
        return item.discrepancyType === 'DISCREPANCY_QTY' || item.discrepancyType === 'WRONG_RACK' || item.discrepancyType === 'WRONG_PRODUCT';
      }
      if (filterTab === 'WRONG_RACK') return item.discrepancyType === 'WRONG_RACK';
      if (filterTab === 'WRONG_PRODUCT') return item.discrepancyType === 'WRONG_PRODUCT';
      if (filterTab === 'QTY_MISMATCH') return item.discrepancyType === 'DISCREPANCY_QTY';
      if (filterTab === 'MATCH') return item.discrepancyType === 'MATCH';
      if (filterTab === 'UNVERIFIED') return item.discrepancyType === 'UNVERIFIED';
      return true;
    });
  }, [auditRecords, targetRack, filterTab, filterOnlySampleTargets]);

  // Sesi 2 Product Locator search results across all racks
  const productLocatorResults = useMemo(() => {
    if (!searchProductQuery.trim()) return [];
    const q = searchProductQuery.toLowerCase().trim();
    const results: { rackId: string; slotCode: string; pallet: PalletData }[] = [];

    Object.values(racks).forEach(rack => {
      Object.values(rack.slots).forEach(slot => {
        if (slot.status === 'occupied' && slot.pallet) {
          const matchCode = slot.pallet.itemCode.toLowerCase().includes(q);
          const matchName = slot.pallet.itemName.toLowerCase().includes(q);
          const matchBatch = slot.pallet.batchNo.toLowerCase().includes(q);
          const matchSlot = slot.slotCode.toLowerCase().includes(q);
          if (matchCode || matchName || matchBatch || matchSlot) {
            results.push({ rackId: rack.id, slotCode: slot.slotCode, pallet: slot.pallet });
          }
        }
      });
    });
    return results;
  }, [racks, searchProductQuery]);

  const isUserSpvOrSuperadmin = userRole === 'supervisor' || userRole === 'superadmin';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto pb-16">
      
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION & FLOW STEPPER                                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Sesi Stock Opname Barang Jadi (FGW)
              </h2>
              {workflowStage === 'STAGE_4_APPROVED' ? (
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Disetujui SPV & Selesai
                </span>
              ) : workflowStage === 'STAGE_3_WAITING_APPROVAL' ? (
                <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <Lock className="w-3 h-3 text-indigo-600" />
                  Menunggu Verifikasi SPV
                </span>
              ) : workflowStage === 'STAGE_2_RECONCILIATION' ? (
                <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Sesi 2: Koreksi Stok Sistem
                </span>
              ) : (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Sesi 1: Random Scan Fisik
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Alur 3 Tahap: Sesi 1 Random Scan & Qty Real &rarr; Sesi 2 Investigasi & Koreksi Sistem &rarr; Verifikasi & Pengesahan SPV/Super Admin.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenSOP && (
            <button
              onClick={onOpenSOP}
              className="py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Buka SOP Stock Opname & Flowchart"
            >
              <BookOpen className="w-4 h-4 text-amber-700" />
              <span>SOP & Alur</span>
            </button>
          )}

          <button
            onClick={() => setIsPrintBeritaAcaraOpen(true)}
            className="py-1.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Berita Acara</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROGRESS STEPPER: TAHAPAN OPERASIONAL STOCK OPNAME                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Step 1: Sesi 1 Random Scan */}
          <div 
            onClick={() => workflowStage !== 'STAGE_4_APPROVED' && setWorkflowStage('STAGE_1_RANDOM_SCAN')}
            className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center gap-3 ${
              workflowStage === 'STAGE_1_RANDOM_SCAN'
                ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
              workflowStage === 'STAGE_1_RANDOM_SCAN' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              1
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-500">Sesi 1 Opname</div>
              <div className="font-black text-sm text-slate-900 truncate">Random Scan & Qty Real</div>
              <div className="text-[11px] text-slate-500 truncate">Scan acak beberapa area rak & input fisik</div>
            </div>
          </div>

          {/* Step 2: Sesi 2 Investigasi & Koreksi Sistem */}
          <div 
            onClick={() => workflowStage !== 'STAGE_4_APPROVED' && setWorkflowStage('STAGE_2_RECONCILIATION')}
            className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center gap-3 ${
              workflowStage === 'STAGE_2_RECONCILIATION'
                ? 'border-purple-500 bg-purple-50/70 text-purple-950 shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
              workflowStage === 'STAGE_2_RECONCILIATION' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              2
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-500">Sesi 2 Opname</div>
              <div className="font-black text-sm text-slate-900 truncate">Investigasi & Koreksi Sistem</div>
              <div className="text-[11px] text-slate-500 truncate">Cari produk nyasar & betulkan data stok</div>
            </div>
          </div>

          {/* Step 3: Verifikasi SPV / Super Admin */}
          <div 
            onClick={() => {
              if (totalIssuesCount === 0 || workflowStage === 'STAGE_3_WAITING_APPROVAL' || workflowStage === 'STAGE_4_APPROVED') {
                setWorkflowStage(workflowStage === 'STAGE_4_APPROVED' ? 'STAGE_4_APPROVED' : 'STAGE_3_WAITING_APPROVAL');
              }
            }}
            className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center gap-3 ${
              workflowStage === 'STAGE_4_APPROVED'
                ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs'
                : workflowStage === 'STAGE_3_WAITING_APPROVAL'
                ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
              workflowStage === 'STAGE_4_APPROVED' 
                ? 'bg-emerald-600 text-white' 
                : workflowStage === 'STAGE_3_WAITING_APPROVAL' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-200 text-slate-400'
            }`}>
              {workflowStage === 'STAGE_4_APPROVED' ? <Check className="w-5 h-5" /> : '3'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xs uppercase tracking-wider text-slate-500">Tahap Akhir</div>
              <div className="font-black text-sm text-slate-900 truncate">
                {workflowStage === 'STAGE_4_APPROVED' ? 'Telah Disahkan SPV' : 'Verifikasi SPV / Super Admin'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">Hasil sesuai 100% & pengesahan resmi</div>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SETTING DOKUMEN SESI & TIM PIC                                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Nomor Sesi Opname</label>
            <input
              type="text"
              readOnly
              value={sessionNumber}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Tanggal Stock Opname</span>
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Jam Pelaksanaan</span>
              </span>
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="text-[10px] text-amber-700 hover:underline font-bold"
              >
                Jam Sekarang
              </button>
            </label>
            <input
              type="text"
              value={sessionTime}
              onChange={(e) => setSessionTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Target Rak Opname</span>
            </label>
            <select
              value={targetRack}
              onChange={(e) => setTargetRack(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 bg-white"
            >
              <option value="ALL">Semua Rak Fisik (A - J)</option>
              {Object.keys(racks).map(rId => (
                <option key={rId} value={rId}>Hanya Rak {rId} ({racks[rId].primaryProduct})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tim PIC Table */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>Tim Petugas PIC Stock Opname</span>
              </h3>
              <p className="text-xs text-slate-500">
                Input NIK manual atau scan kartu ID Karyawan untuk mendeteksi Nama & Departemen otomatis dari Master.
              </p>
            </div>
            <button
              onClick={handleAddPicRow}
              className="py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>(+) Tambah PIC Petugas</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">No</th>
                  <th className="py-2 px-3 min-w-[240px]">ID HRIS / ID CARD (Scan Salah Satu)</th>
                  <th className="py-2 px-3 min-w-[180px]">Nama Karyawan</th>
                  <th className="py-2 px-3 min-w-[160px]">Departemen</th>
                  <th className="py-2 px-3 min-w-[150px]">Peran Audit</th>
                  <th className="py-2 px-3 w-12 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {picList.map((pic, idx) => {
                  const currentVal = pic.scannedId !== undefined && pic.scannedId !== '' ? pic.scannedId : (pic.hrisId || pic.nik);
                  return (
                    <tr key={pic.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2 px-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            placeholder="Scan ID HRIS / CARD..."
                            value={currentVal}
                            onChange={(e) => handleNikChange(idx, e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-xs bg-white focus:ring-2 focus:ring-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleOpenNikScanner(idx)}
                            className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition shrink-0 cursor-pointer"
                            title="Scan Barcode ID Karyawan"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={pic.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPicList(prev => {
                              const c = [...prev];
                              c[idx] = { ...c[idx], name: val };
                              return c;
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold text-xs bg-white"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={pic.department}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPicList(prev => {
                              const c = [...prev];
                              c[idx] = { ...c[idx], department: val };
                              return c;
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={pic.roleInAudit || 'Petugas Scan Fisik'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPicList(prev => {
                              const c = [...prev];
                              c[idx] = { ...c[idx], roleInAudit: val };
                              return c;
                            });
                          }}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
                        >
                          <option value="Ketua Tim Opname">Ketua Tim Opname</option>
                          <option value="Petugas Scan Fisik">Petugas Scan Fisik</option>
                          <option value="Verifikator QC">Verifikator QC</option>
                          <option value="Saksi Internal Audit">Saksi Internal Audit</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePicRow(pic.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SESI 1: PANEL RANDOM SCAN PRODUK & RAK FISIK                           */}
      {/* ========================================================================= */}
      {workflowStage === 'STAGE_1_RANDOM_SCAN' && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Sesi 1: Random Scan Produk & Lokasi Rak Fisik
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Petugas melakukan scan acak di area rak, men-scan barcode produk & barcode slot rak, lalu menginputkan kuantitas realnya (BOX).
              </p>
            </div>

            {onOpenScannerAudit && (
              <button
                type="button"
                onClick={() => onOpenScannerAudit()}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Scan className="w-4 h-4" />
                <span>Buka Kamera Scanner Audit</span>
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* FITUR STRATEGI SAMPLING: PERSENTASE ACAK (%) & LANTAI VS PEMILIHAN MANUAL  */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-black text-slate-900">
                    Metode Penentuan Sampel Audit Opname
                  </h4>
                  <p className="text-xs text-slate-500">
                    Pilih antara sampling acak otomatis berbasis persentase (%) dan distribusi lantai, atau pemilihan manual di lapangan.
                  </p>
                </div>
              </div>

              {/* Mode Toggle Switch */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSamplingMode('PERCENTAGE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    samplingMode === 'PERCENTAGE'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Sampling Acak (%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSamplingMode('MANUAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    samplingMode === 'MANUAL'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Pemilihan Manual Lapangan</span>
                </button>
              </div>
            </div>

            {/* TAB 1: SAMPLING ACAK SISTEM BERBASIS PERSENTASE (%) & LANTAI */}
            {samplingMode === 'PERCENTAGE' && (
              <div className="space-y-4">
                <div className="w-full">
                  {/* Pilihan Persentase Sampling */}
                  <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2.5">
                    <label className="block text-xs font-black text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tentukan Persentase Sampel Acak Sistem:</span>
                      </span>
                      <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Target: {samplePercentage}%
                      </span>
                    </label>

                    {/* Preset buttons */}
                    <div className="flex flex-wrap items-center gap-1">
                      {[5, 10, 15, 20, 25, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setSamplePercentage(pct);
                            setCustomPercentageInput(pct.toString());
                            handleGenerateStratifiedSample(pct);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer ${
                            samplePercentage === pct
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}

                      {/* Custom Percentage Input */}
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-[11px] text-slate-400 font-bold">Kustom:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={customPercentageInput}
                          onChange={(e) => {
                            setCustomPercentageInput(e.target.value);
                            const val = parseInt(e.target.value) || 1;
                            if (val >= 1 && val <= 100) {
                              setSamplePercentage(val);
                              handleGenerateStratifiedSample(val);
                            }
                          }}
                          className="w-12 px-1.5 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs text-center bg-white"
                        />
                        <span className="text-xs font-bold text-slate-600">%</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Sistem akan mengambil sampel acak sebesar <strong>{samplePercentage}%</strong> dari total slot terisi di sistem ({auditRecords.length} slot) secara proporsional.
                    </p>
                  </div>
                </div>

                {/* Tombol Generate & Breakdown Stats */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/40 p-3.5 rounded-xl border border-amber-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800">
                        Hasil Sampling Saat Ini: <span className="font-mono text-amber-700 font-black">{sampledTargetCount} Slot</span> ({samplePercentage}%)
                      </span>
                      <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold">
                        Lantai 1-2: {sampledLowerTotal} Slot ({lowerPctOfSample}%)
                      </span>
                      <span className="text-[10px] bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded font-bold">
                        Lantai 3-5: {sampledUpperTotal} Slot ({upperPctOfSample}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                      <span>Rincian Distribusi:</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Lt 1: {sampledFloor1}</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Lt 2: {sampledFloor2}</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Lt 3: {sampledFloor3}</span>
                      <span className="bg-white border px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">Lt 4/5: {sampledFloor4Plus}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateStratifiedSample(samplePercentage, floorRatioPreset)}
                    className="py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <Dices className="w-4 h-4" />
                    <span>🎲 Generate Sampel Acak Sistem</span>
                  </button>
                </div>

                {/* Quick Pick Chips of Sampled Slots */}
                {sampledTargetCount > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 block">
                      Daftar Slot Terpilih Hasil Sampling (Klik slot untuk langsung isi formulir scan):
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                      {auditRecords.filter(r => r.isSampleTarget).map(r => (
                        <button
                          key={r.slotCode}
                          type="button"
                          onClick={() => {
                            setRandomScanSlot(r.slotCode);
                            setRandomScanProductCode(r.systemItemCode);
                            setRandomScanQty(r.systemQtyBox);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1 cursor-pointer border ${
                            r.level <= 2
                              ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
                              : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                          }`}
                          title={`Slot ${r.slotCode} - Lantai ${r.level} (${r.systemItemName})`}
                        >
                          <span>{r.slotCode}</span>
                          <span className={`text-[9px] px-1 rounded font-sans ${r.level <= 2 ? 'bg-blue-200 text-blue-900' : 'bg-purple-200 text-purple-900'}`}>
                            Lt {r.level}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PEMILIHAN MANUAL DI LAPANGAN */}
            {samplingMode === 'MANUAL' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Mode Checklist Pemilihan Bebas di Lapangan</span>
                    <span className="text-slate-500 text-[11px]">Centang slot yang ingin diperiksa langsung oleh petugas saat inspeksi di lorong gudang.</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSelectAllFloor('L1_L2')}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer transition"
                    >
                      Pilih Semua Lantai 1 & 2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllFloor('L3_L5')}
                      className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-[11px] font-bold cursor-pointer transition"
                    >
                      Pilih Semua Lantai 3-5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllFloor('ALL')}
                      className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-bold cursor-pointer transition"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAllFloor('CLEAR')}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer transition"
                    >
                      Reset Pilihan
                    </button>
                  </div>
                </div>

                {/* Manual slot selection grid */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">Pilih Slot Rak yang Diperiksa:</span>
                    <span className="font-mono font-bold text-indigo-700">{manualSelectedSlots.size} Slot Terpilih</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {auditRecords.map(r => {
                      const isSelected = manualSelectedSlots.has(r.slotCode.toUpperCase());
                      return (
                        <div
                          key={r.slotCode}
                          onClick={() => handleToggleManualSlot(r.slotCode)}
                          className={`p-1.5 rounded-lg border text-xs font-mono font-bold transition cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-100 border-amber-400 text-amber-950 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>{r.slotCode}</span>
                          <span className={`text-[9px] px-1 rounded font-sans ${r.level <= 2 ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            Lt {r.level}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Simulation Demos */}
          <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Simulasi Cepat Skenario Lapangan (1-Klik Tanpa Perlu Ketik):
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleRunPresetScenario('MATCH')}
                className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>🎯 Cocok Sempurna (A1a)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunPresetScenario('QTY_MISMATCH')}
                className="py-1 px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>⚠️ Selisih Qty (-3 di B1a)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunPresetScenario('WRONG_RACK')}
                className="py-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-700" />
                <span>📍 Salah Rak (Nyasar di C1a)</span>
              </button>

              <button
                type="button"
                onClick={() => handleRunPresetScenario('WRONG_PRODUCT')}
                className="py-1 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Boxes className="w-3.5 h-3.5 text-purple-700" />
                <span>🔄 Salah Produk (di A2a)</span>
              </button>
            </div>
          </div>

          {/* Form Random Scan Fisik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-amber-200">
            {/* Input Slot Rak */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lokasi Slot Rak (Barcode Rak)
              </label>
              <input
                type="text"
                placeholder="Contoh: A1a, B1a, C2b..."
                value={randomScanSlot}
                onChange={(e) => setRandomScanSlot(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Input Produk Barcode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Produk Ditemukan Fisik (Barcode)
              </label>
              <select
                value={randomScanProductCode}
                onChange={(e) => setRandomScanProductCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
              >
                {products.map(p => (
                  <option key={p.id} value={p.itemCode}>
                    [{p.itemCode}] {p.itemName}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Qty Real Fisik */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Qty Real Dihitung Fisik (BOX)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={randomScanQty}
                onChange={(e) => setRandomScanQty(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-black text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Tombol Simpan Hasil Scan */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleExecuteRandomScan(randomScanSlot, randomScanProductCode, randomScanQty, randomScanNotes)}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Catat Hasil Random Scan</span>
              </button>
            </div>
          </div>

          {/* Last Scan Feedback Alert */}
          {lastScanAlert && (
            <div className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 transition animate-in fade-in ${
              lastScanAlert.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' :
              lastScanAlert.type === 'danger' ? 'bg-rose-50 border-rose-300 text-rose-950' :
              lastScanAlert.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-950' :
              'bg-blue-50 border-blue-300 text-blue-950'
            }`}>
              <div className="shrink-0 mt-0.5">
                {lastScanAlert.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              </div>
              <div className="flex-1">
                <strong className="block text-xs font-black">{lastScanAlert.title}</strong>
                <p className="mt-0.5">{lastScanAlert.message}</p>
              </div>
            </div>
          )}

          {/* Next Stage Button to Sesi 2 */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Temuan Masalah Sesi 1: <strong className="text-rose-600 font-mono font-black">{totalIssuesCount} Slot</strong> ({wrongRackCount} Salah Rak, {wrongProductCount} Salah Produk, {discrepancyQtyCount} Selisih Qty)
            </span>
            <button
              type="button"
              onClick={() => setWorkflowStage('STAGE_2_RECONCILIATION')}
              className="py-2.5 px-5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <span>Lanjut ke Sesi 2: Investigasi & Koreksi Sistem</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SESI 2: INVESTIGASI, PENCARIAN PRODUK & KOREKSI SISTEM                 */}
      {/* ========================================================================= */}
      {workflowStage === 'STAGE_2_RECONCILIATION' && (
        <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-500/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-600 animate-ping"></span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Sesi 2: Investigasi, Pencarian Produk & Koreksi Stok Sistem
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Petugas melakukan pencarian produk di seluruh area rak untuk menemukan barang nyasar/selisih, lalu membetulkan stok di sistem dengan benar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoReconcileAllSession2}
                className="py-2 px-3 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Sesuaikan seluruh selisih otomatis ke sistem"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-700" />
                <span>Koreksi Semua Masalah Otomatis</span>
              </button>
            </div>
          </div>

          {/* Feature: Pencarian Produk di Seluruh Rak (Global Product Locator) */}
          <div className="bg-white p-4 rounded-2xl border border-purple-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-purple-600" />
                <span>Pencarian Produk & Lokasi Fisik di Seluruh Rak (Locator):</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Gunakan fitur ini untuk melacak di mana letak sebenarnya produk yang selisih atau salah rak.
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Ketik Kode Produk (FG-COF-122), Nama Produk, No Batch, atau Slot..."
                value={searchProductQuery}
                onChange={(e) => setSearchProductQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Search Results Display */}
            {searchProductQuery && (
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                <div className="text-[11px] font-bold text-purple-900">
                  Hasil Pencarian Lokasi di Gudang ({productLocatorResults.length} Slot Ditemukan):
                </div>
                {productLocatorResults.length === 0 ? (
                  <div className="text-xs text-slate-500 italic">
                    Tidak ditemukan slot rak yang memuat produk dengan kata kunci tersebut.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {productLocatorResults.map((res, i) => (
                      <div key={i} className="p-2.5 bg-white rounded-xl border border-purple-200 text-xs shadow-2xs">
                        <div className="flex items-center justify-between font-mono font-bold text-purple-900">
                          <span>Slot {res.slotCode} (Rak {res.rackId})</span>
                          <span className="text-slate-800">{res.pallet.quantityBox} BOX</span>
                        </div>
                        <div className="text-slate-700 font-semibold truncate mt-0.5">{res.pallet.itemName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Batch: {res.pallet.batchNo}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sesi 2 Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs">
              Status Sesi 2: {totalIssuesCount === 0 ? (
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Semua Hasil Telah Sesuai (100% Cocok) & Siap Diverifikasi SPV!
                </span>
              ) : (
                <span className="font-bold text-purple-800 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                  Masih Terdapat {totalIssuesCount} Temuan Selisih yang Perlu Dibetulkan di Sistem.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWorkflowStage('STAGE_1_RANDOM_SCAN')}
                className="py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                &larr; Kembali ke Sesi 1
              </button>

              <button
                type="button"
                onClick={handleProceedToApproval}
                disabled={totalIssuesCount > 0}
                className={`py-2 px-4 rounded-xl font-black text-xs flex items-center gap-1.5 transition shadow-xs ${
                  totalIssuesCount === 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Ajukan ke Verifikasi SPV / Super Admin &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAHAP 3 & 4: VERIFIKASI & PENGESAHAN SPV / SUPER ADMIN                 */}
      {/* ========================================================================= */}
      {(workflowStage === 'STAGE_3_WAITING_APPROVAL' || workflowStage === 'STAGE_4_APPROVED') && (
        <div className={`border-2 rounded-3xl p-5 sm:p-6 space-y-4 ${
          workflowStage === 'STAGE_4_APPROVED' 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-indigo-500/10 border-indigo-500/30'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
            <div>
              <div className="flex items-center gap-2">
                {workflowStage === 'STAGE_4_APPROVED' ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-pulse">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    {workflowStage === 'STAGE_4_APPROVED' 
                      ? 'Periode Stock Opname Telah Sah Diverifikasi SPV / Super Admin' 
                      : 'Verifikasi & Pengesahan Periode Opname (SPV / Super Admin)'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {workflowStage === 'STAGE_4_APPROVED'
                      ? `Dokumen sah dengan Sertifikat No: ${spvApprovalData?.certificateId} oleh ${spvApprovalData?.approvedBy}`
                      : 'Hasil Sesi 2 telah sesuai 100%. Memerlukan otorisasi Supervisor / Super Admin untuk pengesahan penutupan periode opname.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {workflowStage === 'STAGE_3_WAITING_APPROVAL' && (
                isUserSpvOrSuperadmin ? (
                  <button
                    type="button"
                    onClick={() => setIsSpvApprovalModalOpen(true)}
                    className="py-2.5 px-4 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verifikasi & Setujui Periode Opname Ini</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-xl">
                      ⚠️ Role Anda: {userRole.toUpperCase()} (Hanya SPV/Super Admin yang berhak approve)
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSwitchUserModalOpen(true)}
                      className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
                    >
                      Beralih Akun SPV &rarr;
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => setIsPrintBeritaAcaraOpen(true)}
                className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Berita Acara Resmi</span>
              </button>
            </div>
          </div>

          {/* SPV Approval Official Stamp Card */}
          {workflowStage === 'STAGE_4_APPROVED' && spvApprovalData && (
            <div className="p-4 bg-white rounded-2xl border-2 border-emerald-300 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Official Certified & Approved
                </span>
                <h4 className="text-sm font-black text-slate-900">
                  Diverifikasi Oleh: {spvApprovalData.approvedBy} ({spvApprovalData.approverRole})
                </h4>
                <p className="text-xs text-slate-500">
                  Catatan SPV: "{spvApprovalData.notes}"
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Waktu Approval: {spvApprovalData.approvedAt} &bull; No Sertifikat: {spvApprovalData.certificateId}
                </div>
              </div>

              {/* Digital Gold Seal */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-center shrink-0">
                <Award className="w-8 h-8 text-amber-600 mx-auto" />
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block mt-1">
                  CAP PENGESAHAN SPV
                </span>
                <span className="text-[9px] font-mono text-amber-700">100% RECONCILED</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. RINGKASAN METRIK AUDIT FISIK VS SISTEM                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Slot Diperiksa</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {totalSlots - unverifiedCount} <span className="text-xs text-slate-400 font-normal">/ {totalSlots} Slot</span>
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-700 block">Cocok Sesuai (100%)</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
            {matchCount} Slot
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-rose-700 block">Terdapat Selisih</span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
            {totalIssuesCount} Slot
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-blue-700 block">Akurasi Stok</span>
          <span className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
            {accuracyPct}%
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8. TABEL DAFTAR SLOT & PRODUK STOCK OPNAME DENGAN FILTER DETAIL           */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header & Filter Tabs */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Daftar Slot & Palet Barang Jadi (Target: {targetRack === 'ALL' ? 'Semua Rak' : `Rak ${targetRack}`})
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan rincian status kecocokan fisik vs data sistem serta aksi koreksi Sesi 2.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 text-[11px] sm:text-xs font-bold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({auditRecords.length})
            </button>
            <button
              onClick={() => setFilterTab('ISSUES')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                filterTab === 'ISSUES' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Ada Masalah ({totalIssuesCount})</span>
            </button>
            <button
              onClick={() => setFilterTab('WRONG_RACK')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterTab === 'WRONG_RACK' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Salah Rak ({wrongRackCount})
            </button>
            <button
              onClick={() => setFilterTab('WRONG_PRODUCT')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterTab === 'WRONG_PRODUCT' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              Salah Produk ({wrongProductCount})
            </button>
            <button
              onClick={() => setFilterTab('QTY_MISMATCH')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterTab === 'QTY_MISMATCH' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              Selisih Qty ({discrepancyQtyCount})
            </button>
            <button
              onClick={() => setFilterTab('MATCH')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                filterTab === 'MATCH' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Cocok ({matchCount})
            </button>

            {/* Toggle Filter Hanya Target Sampel */}
            <button
              type="button"
              onClick={() => setFilterOnlySampleTargets(!filterOnlySampleTargets)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                filterOnlySampleTargets
                  ? 'bg-amber-500 text-white font-black shadow-xs ring-1 ring-amber-400'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-bold'
              }`}
              title="Filter hanya menampilkan slot yang terpilih sebagai target sampel"
            >
              <Target className="w-3 h-3" />
              <span>Target Sampel ({sampledTargetCount})</span>
            </button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3.5">Slot Rak</th>
                <th className="py-3 px-2 text-center">Lantai</th>
                <th className="py-3 px-3.5">Produk di Sistem</th>
                <th className="py-3 px-3.5">Fisik yang Di-scan</th>
                <th className="py-3 px-3 text-center">Qty Sistem</th>
                <th className="py-3 px-3 text-center">Qty Real</th>
                <th className="py-3 px-3 text-center">Selisih</th>
                <th className="py-3 px-3.5 text-center">Status Temuan</th>
                <th className="py-3 px-3">Sesi</th>
                <th className="py-3 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Tidak ada data slot pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                displayedRecords.map(item => {
                  const isIssue = item.discrepancyType !== 'MATCH' && item.discrepancyType !== 'UNVERIFIED';

                  return (
                    <tr key={item.id} className={`transition ${isIssue ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50/70'}`}>
                      {/* Slot Rak */}
                      <td className="py-3 px-3.5 font-mono font-black text-blue-700">
                        {item.slotCode}
                      </td>

                      {/* Lantai / Level */}
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black font-mono ${
                          item.level <= 2 ? 'bg-blue-100 text-blue-900 border border-blue-200' : 'bg-purple-100 text-purple-900 border border-purple-200'
                        }`}>
                          Lt {item.level}
                        </span>
                        {item.isSampleTarget && (
                          <span className="block text-[9px] font-bold text-amber-700 mt-0.5 font-sans">
                            🎯 Target
                          </span>
                        )}
                      </td>

                      {/* Produk di Sistem */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{item.systemItemName}</div>
                        <span className="font-mono text-[11px] text-slate-400">{item.systemItemCode}</span>
                      </td>

                      {/* Fisik yang di-scan */}
                      <td className="py-3 px-3.5">
                        <div className={`font-semibold ${
                          item.discrepancyType === 'WRONG_PRODUCT' ? 'text-purple-700 font-bold' : 'text-slate-800'
                        }`}>
                          {item.scannedItemName || item.systemItemName}
                        </div>
                        {item.scannedItemCode && item.scannedItemCode !== item.systemItemCode && (
                          <span className="font-mono text-[10px] text-purple-600 block">
                            Scan: {item.scannedItemCode} (Beda dari Sistem!)
                          </span>
                        )}
                      </td>

                      {/* Qty Sistem */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">
                        {item.systemQtyBox} BOX
                      </td>

                      {/* Qty Real Fisik */}
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                        {item.actualQtyBox} BOX
                      </td>

                      {/* Selisih */}
                      <td className="py-3 px-3 text-center font-mono font-black">
                        {item.discrepancyBox === 0 ? (
                          <span className="text-emerald-600">0</span>
                        ) : (
                          <span className="text-rose-600">
                            {item.discrepancyBox > 0 ? `+${item.discrepancyBox}` : item.discrepancyBox} BOX
                          </span>
                        )}
                      </td>

                      {/* Status Temuan */}
                      <td className="py-3 px-3.5 text-center">
                        {item.discrepancyType === 'MATCH' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>{item.isReconciledInSession2 ? 'Cocok (Sesi 2)' : 'Cocok 100%'}</span>
                          </span>
                        ) : item.discrepancyType === 'WRONG_RACK' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900">
                            <ArrowLeftRight className="w-3 h-3 text-amber-700" />
                            <span>Salah Rak</span>
                          </span>
                        ) : item.discrepancyType === 'WRONG_PRODUCT' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-900">
                            <Boxes className="w-3 h-3 text-purple-700" />
                            <span>Salah Produk</span>
                          </span>
                        ) : item.discrepancyType === 'DISCREPANCY_QTY' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Selisih Qty</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">
                            Belum Cek
                          </span>
                        )}
                      </td>

                      {/* Sesi */}
                      <td className="py-3 px-3 text-xs text-slate-500">
                        <span className="font-mono font-bold">
                          {item.auditSession === 2 ? 'Sesi 2' : 'Sesi 1'}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3.5 text-right">
                        {workflowStage === 'STAGE_2_RECONCILIATION' && isIssue ? (
                          <button
                            type="button"
                            onClick={() => handleOpenCorrectionModal(item)}
                            className="py-1 px-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs flex items-center gap-1 ml-auto"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Investigasi & Betulkan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRandomScanSlot(item.slotCode);
                              setRandomScanProductCode(item.systemItemCode);
                              setRandomScanQty(item.systemQtyBox);
                            }}
                            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Pilih Slot
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL KOREKSI & PEMBETULAN STOK SISTEM (SESI 2)                           */}
      {/* ========================================================================= */}
      {selectedIssueItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">
                  Sesi 2: Rekonsiliasi & Koreksi Stok Sistem
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Koreksi Masalah Slot {selectedIssueItem.slotCode}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIssueItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              {/* Ringkasan Temuan Masalah */}
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1">
                <div className="flex justify-between items-center font-bold">
                  <span className="text-purple-950">Status Masalah:</span>
                  <span className="font-mono text-rose-700 uppercase">{selectedIssueItem.discrepancyType}</span>
                </div>
                <div className="text-slate-700">Produk Sistem: <strong>{selectedIssueItem.systemItemName}</strong></div>
                <div className="text-slate-700">Fisik yang Ditemukan: <strong>{selectedIssueItem.scannedItemName || selectedIssueItem.systemItemName}</strong></div>
                <div className="flex justify-between items-center text-xs font-mono pt-1 text-slate-600">
                  <span>Qty Sistem: {selectedIssueItem.systemQtyBox} BOX</span>
                  <span className="font-bold text-slate-900">Qty Fisik: {selectedIssueItem.actualQtyBox} BOX</span>
                </div>
              </div>

              {/* Pilihan Aksi Koreksi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Tindakan Koreksi Sistem:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrectionActionType('CORRECT_QTY')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                      correctionActionType === 'CORRECT_QTY'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    1. Koreksi Qty Sistem
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrectionActionType('RELOCATE_RACK')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                      correctionActionType === 'RELOCATE_RACK'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    2. Pindahkan ke Rak Benar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrectionActionType('CORRECT_PRODUCT')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                      correctionActionType === 'CORRECT_PRODUCT'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    3. Koreksi Salah Produk
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrectionActionType('RECOUNT_ONLY')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                      correctionActionType === 'RECOUNT_ONLY'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    4. Konfirmasi Hitung Ulang
                  </button>
                </div>
              </div>

              {/* Dynamic Action Fields */}
              {correctionActionType === 'CORRECT_QTY' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Qty Baru yang Akan Diterapkan ke Sistem (BOX)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={correctNewQty}
                    onChange={(e) => setCorrectNewQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-base font-black focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Data kuantitas slot di database WMS akan diperbarui menjadi {correctNewQty} BOX sesuai fisik nyata.
                  </span>
                </div>
              )}

              {correctionActionType === 'RELOCATE_RACK' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Slot Rak Tujuan yang Benar
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: A3a, B2b..."
                    value={correctTargetSlot}
                    onChange={(e) => setCorrectTargetSlot(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-sm focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Pallet yang nyasar akan dipindahkan secara resmi di sistem ke lokasi slot yang benar.
                  </span>
                </div>
              )}

              {correctionActionType === 'CORRECT_PRODUCT' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Pilih Produk Sebenarnya untuk Slot Ini
                  </label>
                  <select
                    value={correctTargetProductCode}
                    onChange={(e) => setCorrectTargetProductCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs bg-white focus:ring-2 focus:ring-purple-500"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.itemCode}>
                        [{p.itemCode}] {p.itemName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Catatan Koreksi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Berita Acara Koreksi Sesi 2
                </label>
                <textarea
                  rows={2}
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssueItem(null)}
                  className="flex-1 py-2 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplySystemCorrection}
                  className="flex-1 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs shadow-xs transition"
                >
                  Terapkan Koreksi ke Sistem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL VERIFIKASI & APPROVAL SPV / SUPER ADMIN                             */}
      {/* ========================================================================= */}
      {isSpvApprovalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                    Pengesahan Resmi Supervisor
                  </span>
                  <h3 className="text-base font-black text-slate-900">
                    Verifikasi Periode Stock Opname
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsSpvApprovalModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-2">
                <span className="text-xs font-bold text-indigo-900 block">
                  Rekapitulasi Audit Fisik & Rekonsiliasi Sesi 2:
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-slate-500 block">Total Slot</span>
                    <strong className="font-mono text-sm">{totalSlots}</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-emerald-700 block">Kesesuaian Final</span>
                    <strong className="font-mono text-sm text-emerald-700">100%</strong>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] text-indigo-700 block">Sisa Selisih</span>
                    <strong className="font-mono text-sm text-indigo-700">0</strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Supervisor / Super Admin Pengesah
                </label>
                <input
                  type="text"
                  readOnly
                  value={`${currentUser?.name || currentUserName} (${(currentUser?.role || userRole).toUpperCase()})`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Rekomendasi & Hasil Evaluasi SPV
                </label>
                <textarea
                  rows={3}
                  value={spvNotesInput}
                  onChange={(e) => setSpvNotesInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Masukkan PIN Otorisasi Supervisor (Default: 1234)
                </label>
                <input
                  type="password"
                  value={spvPinInput}
                  onChange={(e) => setSpvPinInput(e.target.value)}
                  placeholder="PIN..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-center font-black tracking-widest text-base focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSpvApprovalModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSpvApproval}
                  className="flex-1 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  <span>Sahkan & Kunci Periode Opname</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL GANTI AKUN CEPAT (UNTUK MEMPERMUDAH TESTING SUPERVISOR / OPERATOR)   */}
      {/* ========================================================================= */}
      {isSwitchUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>Beralih Akun (Role Switcher)</span>
              </h3>
              <button
                onClick={() => setIsSwitchUserModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              <p className="text-xs text-slate-500">
                Pilih pengguna untuk menguji kewenangan peran saat Stock Opname (Operator vs Supervisor/Super Admin):
              </p>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {allUsers.map(user => {
                  const isCurrent = currentUser?.id === user.id;
                  const isSpv = user.role === 'supervisor' || user.role === 'superadmin';

                  return (
                    <div
                      key={user.id}
                      onClick={() => {
                        if (onSwitchUser) onSwitchUser(user);
                        setIsSwitchUserModalOpen(false);
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                          <span>{user.name}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isSpv ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">@{user.username} &bull; PIN: {user.pin}</span>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-black text-indigo-600">Aktif</span>
                      ) : (
                        <button className="text-xs font-bold text-indigo-600 hover:underline">
                          Gunakan
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SCANNER NIK / ID CARD (DUAL ID DARI MASTER)                         */}
      {/* ========================================================================= */}
      {isNikScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-600" />
                <span>Scan Barcode / ID Karyawan (Dual-ID)</span>
              </h3>
              <button
                onClick={() => setIsNikScannerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Arahkan barcode scanner kartu karyawan atau ketik salah satu ID di bawah. <strong>ID HRIS maupun ID CARD</strong> dua-duanya langsung otomatis mengenali Nama & Departemen:
              </p>

              <input
                type="text"
                autoFocus
                placeholder="Scan / Ketik ID HRIS (2161105) atau CARD (IDC-908122)"
                value={scanNikInput}
                onChange={(e) => setScanNikInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-amber-500"
              />

              {/* Quick Pick Master Employees with Dual ID buttons */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-1">Pilih dari Master Karyawan (Dual-ID):</span>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {employees.map(emp => (
                    <div
                      key={emp.id}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                    >
                      <div>
                        <strong className="text-slate-900 block">{emp.name}</strong>
                        <span className="text-[10px] text-slate-500">{emp.department}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const val = emp.hrisId || emp.nik;
                            setScanNikInput(val);
                            handleApplyScannedNik(val);
                          }}
                          className="px-2 py-1 text-[10px] font-mono font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition cursor-pointer"
                        >
                          HRIS: {emp.hrisId || emp.nik}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = emp.idCard || `IDC-${emp.nik}`;
                            setScanNikInput(val);
                            handleApplyScannedNik(val);
                          }}
                          className="px-2 py-1 text-[10px] font-mono font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200 transition cursor-pointer"
                        >
                          Card: {emp.idCard || `IDC-${emp.nik}`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNikScannerOpen(false)}
                  className="flex-1 py-2 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyScannedNik(scanNikInput)}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs"
                >
                  Gunakan ID Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PRINT BERITA ACARA STOCK OPNAME                                     */}
      {/* ========================================================================= */}
      {isPrintBeritaAcaraOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">
                Berita Acara Stock Opname Barang Jadi (FGW)
              </h3>
              <button
                onClick={() => setIsPrintBeritaAcaraOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dokumen Fisik Berita Acara */}
            <div className="mt-4 p-6 bg-slate-50 rounded-2xl border border-slate-300 space-y-5 text-xs text-slate-800">
              <div className="text-center border-b border-slate-300 pb-3 space-y-0.5">
                <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
                  BERITA ACARA HASIL STOCK OPNAME BARANG JADI
                </h2>
                <p className="text-[11px] text-slate-600">
                  SIKUTANG - Finished Goods Warehouse (FGW) &bull; No: <span className="font-mono font-bold">{sessionNumber}</span>
                </p>
                <p className="text-[11px] text-slate-600">
                  Tanggal: <strong>{sessionDate}</strong> &bull; Jam: <strong>{sessionTime} WIB</strong> &bull; Target: <strong>{targetRack === 'ALL' ? 'Semua Rak (A-J)' : `Rak ${targetRack}`}</strong>
                </p>
                <div className="pt-1">
                  <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    workflowStage === 'STAGE_4_APPROVED' ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {workflowStage === 'STAGE_4_APPROVED' ? 'STATUS: RESMI DISAHKAN OLEH SPV / SUPER ADMIN' : 'STATUS: PROSES OPNAME SEDANG BERJALAN'}
                  </span>
                </div>
              </div>

              {/* 1. Tim PIC */}
              <div className="space-y-2">
                <span className="font-bold text-slate-900 block uppercase text-[11px]">
                  1. Tim Petugas PIC Pelaksana Stock Opname
                </span>
                <table className="w-full text-left border border-slate-300 text-xs">
                  <thead className="bg-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2 border border-slate-300">ID HRIS</th>
                      <th className="p-2 border border-slate-300">ID CARD</th>
                      <th className="p-2 border border-slate-300">Nama Petugas</th>
                      <th className="p-2 border border-slate-300">Departemen</th>
                      <th className="p-2 border border-slate-300">Tugas / Peran</th>
                      <th className="p-2 border border-slate-300 text-center">Tanda Tangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {picList.map((p) => (
                      <tr key={p.id}>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-indigo-900">{p.hrisId || p.nik}</td>
                        <td className="p-2 border border-slate-300 font-mono font-bold text-purple-900">{p.idCard || '-'}</td>
                        <td className="p-2 border border-slate-300 font-bold">{p.name}</td>
                        <td className="p-2 border border-slate-300">{p.department}</td>
                        <td className="p-2 border border-slate-300">{p.roleInAudit}</td>
                        <td className="p-2 border border-slate-300 text-center text-slate-400 italic">
                          (Ttd Fisik)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2. Ringkasan Hasil Sesi 1 & Sesi 2 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 block uppercase text-[11px]">
                    2. Ringkasan Hasil Audit & Rekonsiliasi
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Metode: {samplingMode === 'PERCENTAGE' 
                      ? `Sampling Acak Sistem ${samplePercentage}% (Mayoritas Lt 1-2: ${sampledLowerTotal} Slot, Lt 3-5: ${sampledUpperTotal} Slot)`
                      : `Pemilihan Manual Lapangan (${manualSelectedSlots.size} Slot)`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <span className="text-[10px] text-slate-500 block">Total Slot Diperiksa</span>
                    <strong className="font-mono text-sm">{totalSlots}</strong>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <span className="text-[10px] text-emerald-600 block">Kesesuaian Final</span>
                    <strong className="font-mono text-sm text-emerald-700">{matchCount} Slot</strong>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <span className="text-[10px] text-rose-600 block">Sisa Selisih</span>
                    <strong className="font-mono text-sm text-rose-700">{totalIssuesCount} Slot</strong>
                  </div>
                  <div className="p-2 bg-white border border-slate-200 rounded">
                    <span className="text-[10px] text-blue-600 block">Akurasi Final</span>
                    <strong className="font-mono text-sm text-blue-700">{accuracyPct}%</strong>
                  </div>
                </div>
              </div>

              {/* 3. Pengesahan SPV / Super Admin */}
              <div className="pt-4 border-t border-slate-300">
                <span className="font-bold text-slate-900 block uppercase text-[11px] mb-2">
                  3. Pengesahan & Otorisasi
                </span>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Ketua Tim Opname,</span>
                    <div className="h-12 flex items-center justify-center italic text-slate-400 text-xs">
                      [Tanda Tangan Pelaksana]
                    </div>
                    <strong className="font-bold text-slate-900 block">{picList[0]?.name || 'Petugas Gudang'}</strong>
                    <span className="text-[10px] text-slate-500">NIK: {picList[0]?.nik || '-'}</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Verifikator QC / Saksi,</span>
                    <div className="h-12 flex items-center justify-center italic text-slate-400 text-xs">
                      [Tanda Tangan Saksi]
                    </div>
                    <strong className="font-bold text-slate-900 block">{picList[1]?.name || 'QC Inspector'}</strong>
                    <span className="text-[10px] text-slate-500">Quality Control</span>
                  </div>

                  <div className={`p-2 rounded-xl border ${workflowStage === 'STAGE_4_APPROVED' ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-100 border-slate-200'}`}>
                    <span className="text-[11px] font-bold text-slate-700 block">Supervisor / Super Admin,</span>
                    {workflowStage === 'STAGE_4_APPROVED' ? (
                      <div className="py-1">
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-block">
                          ✓ TERVERIFIKASI & DISAHKAN
                        </span>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {spvApprovalData?.approvedAt}
                        </div>
                      </div>
                    ) : (
                      <div className="h-12 flex items-center justify-center italic text-amber-600 text-xs">
                        (Menunggu Otorisasi)
                      </div>
                    )}
                    <strong className="font-bold text-slate-900 block">
                      {spvApprovalData?.approvedBy || 'Supervisor Gudang'}
                    </strong>
                    <span className="text-[10px] text-slate-500">
                      {spvApprovalData?.approverRole || 'SPV / Super Admin'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsPrintBeritaAcaraOpen(false)}
                className="flex-1 py-2 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Sekarang (Print)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
