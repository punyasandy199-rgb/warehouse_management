/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  Camera, 
  CameraOff, 
  Scan, 
  X, 
  Check, 
  AlertTriangle, 
  AlertCircle,
  ArrowRight, 
  Box, 
  Layers, 
  RotateCcw,
  Sparkles,
  Search,
  CheckCircle2,
  QrCode,
  Calendar,
  Clock,
  Tag,
  Hash,
  Weight,
  ArrowLeft,
  Upload,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { ProductItem, RackData, UserRole, ICStatus, InboundNotification } from '../types';
import { soundManager } from '../utils/audio';
import { parseSlotCode, findMatchingSlotKey, formatSlotCodeProper, formatSlotInput } from '../utils/barcode';
import { parseFinishedGoodsQrCode, ParsedFinishedGoodsQr, SAMPLE_FG_QR_CODE, formatIsoDate, formatDdMmYyyy } from '../utils/productQrParser';
import { InboundSummaryModal } from './InboundSummaryModal';
import { InboundSimplePutawayView, ScannedCartonItem } from './InboundSimplePutawayView';

export type ScannerMode = 'PUTAWAY' | 'PICKING' | 'AUDIT' | 'LOOKUP';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: Record<string, RackData>;
  products: ProductItem[];
  userRole: UserRole;
  currentUserName: string;
  initialMode?: ScannerMode;
  allowedModes?: ScannerMode[];
  contextModule?: string;
  prefilledSlotCode?: string;
  initialPutawayOption?: 'OPTION_1_RANGE' | 'OPTION_2_SCAN_ALL';
  isCameraEnabled?: boolean;
  onInboundNotification?: (notif: InboundNotification) => void;
  onExecutePutaway: (slotCode: string, palletData: {
    itemCode: string;
    itemName: string;
    quantityBox: number;
    batchNo: string;
    productionDate: string;
    expiryDate: string;
    packingLine?: string;
    productPin?: string;
    cartonStart?: number;
    cartonEnd?: number;
    cartonRangeText?: string;
    productionTime?: string;
    rawQrCode?: string;
    notes?: string;
    palletNumber?: string;
    rackingOption?: 'RANGE' | 'MULTI_SCAN';
    scannedCartons?: any[];
    icStatus?: ICStatus;
  }) => void;
  onExecutePicking: (slotCode: string) => void;
  onExecuteAudit: (slotCode: string, isMatch: boolean) => void;
  onLocateSlot: (slotCode: string) => void;
}

const MODE_CONFIGS: Record<ScannerMode, {
  name: string;
  shortName: string;
  headerTitle: string;
  headerSubtitle: string;
  badgeLabel: string;
  bannerTitle: string;
  bannerDesc: string;
  inputPlaceholder: string;
  headerBg: string;
  badgeBg: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  PUTAWAY: {
    name: 'Proses In (Masukkan ke Rak)',
    shortName: 'Putaway Masuk Rak',
    headerTitle: 'Proses In: Memasukkan Barang Jadi ke Rak',
    headerSubtitle: 'Penempatan Barang Jadi ke Slot Rak Gudang • Validasi Barcode QR',
    badgeLabel: 'Inbound Putaway',
    bannerTitle: 'Modul Operasional: Proses In',
    bannerDesc: 'Hanya terkait proses input & penataan barang jadi ke rak gudang',
    inputPlaceholder: 'Scan QR Box Produk Barang Jadi (atau ketik & Enter)...',
    headerBg: 'bg-emerald-950 border-emerald-900',
    badgeBg: 'bg-emerald-500 text-slate-950',
    icon: Box
  },
  PICKING: {
    name: 'Proses Out (Picking Keluar)',
    shortName: 'Picking Keluar',
    headerTitle: 'Proses Out: Pengambilan & Pengeluaran Barang',
    headerSubtitle: 'SOP Pengeluaran Pallet FGW & Pengurangan Stok FEFO Otomatis',
    badgeLabel: 'Outbound Picking',
    bannerTitle: 'Modul Operasional: Proses Out',
    bannerDesc: 'Hanya terkait proses picking dan pengeluaran pallet dari rak',
    inputPlaceholder: 'Scan QR Barcode Rak / Pallet yang akan di-picking...',
    headerBg: 'bg-rose-950 border-rose-900',
    badgeBg: 'bg-rose-500 text-white',
    icon: Layers
  },
  AUDIT: {
    name: 'Stock Opname (Audit Fisik)',
    shortName: 'Audit Fisik Opname',
    headerTitle: 'Stock Opname: Verifikasi & Audit Fisik Slot',
    headerSubtitle: 'Pemeriksaan keakurasian fisik box di rak vs data sistem WMS',
    badgeLabel: 'Audit Opname',
    bannerTitle: 'Modul Operasional: Stock Opname',
    bannerDesc: 'Hanya terkait verifikasi hitung fisik dan validasi keakurasian slot',
    inputPlaceholder: 'Scan Barcode Slot Rak untuk verifikasi fisik...',
    headerBg: 'bg-amber-950 border-amber-900',
    badgeBg: 'bg-amber-500 text-slate-950',
    icon: CheckCircle2
  },
  LOOKUP: {
    name: 'Cek Stok & Info QR',
    shortName: 'Cek Stok & QR',
    headerTitle: 'Cek Stok & Informasi Posisi Rak',
    headerSubtitle: 'Pengecekan cepat lokasi slot, nomor batch, dan ketersediaan barang',
    badgeLabel: 'Cek Stok',
    bannerTitle: 'Pemeriksaan Stok & Posisi',
    bannerDesc: 'Scan barcode atau QR untuk melihat rincian isi slot rak',
    inputPlaceholder: 'Arahkan scanner gun / ketik barcode & Enter...',
    headerBg: 'bg-slate-900 border-slate-800',
    badgeBg: 'bg-cyan-500 text-slate-950',
    icon: Search
  }
};

/**
 * Calculates the next sequential pallet number with format KP-001, KP-002, etc.
 * Checks all existing pallets across warehouse racks to guarantee uniqueness.
 */
export function getNextKpPalletNumber(allRacks: Record<string, RackData>): string {
  let maxKp = 0;
  for (const r of Object.values(allRacks || {})) {
    if (!r || !r.slots) continue;
    for (const s of Object.values(r.slots)) {
      const pList = s.pallets && s.pallets.length > 0 ? s.pallets : (s.pallet ? [s.pallet] : []);
      for (const p of pList) {
        const pNo = p.palletNumber || p.palletId || '';
        const match = pNo.match(/KP-?(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxKp) {
            maxKp = num;
          }
        }
      }
    }
  }
  const nextNum = maxKp + 1;
  return `KP-${String(nextNum).padStart(3, '0')}`;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  racks,
  products,
  userRole,
  currentUserName,
  initialMode = 'LOOKUP',
  allowedModes,
  contextModule,
  prefilledSlotCode = '',
  initialPutawayOption = 'OPTION_2_SCAN_ALL',
  isCameraEnabled = true,
  onInboundNotification,
  onExecutePutaway,
  onExecutePicking,
  onExecuteAudit,
  onLocateSlot
}) => {
  // Effective allowed modes determined strictly by user context
  const effectiveAllowedModes = React.useMemo<ScannerMode[]>(() => {
    if (allowedModes && allowedModes.length > 0) {
      return allowedModes;
    }
    if (contextModule === 'in-warehouse') return ['PUTAWAY'];
    if (contextModule === 'out-warehouse') return ['PICKING'];
    if (contextModule === 'stock-opname') return ['AUDIT'];
    // Default strictly to initialMode to guarantee process isolation
    return [initialMode || 'PUTAWAY'];
  }, [allowedModes, contextModule, initialMode]);

  const [mode, setMode] = useState<ScannerMode>(initialMode);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastInboundNotification, setLastInboundNotification] = useState<InboundNotification | null>(null);
  const [showInboundSummaryModal, setShowInboundSummaryModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Synchronize mode when initialMode or effectiveAllowedModes change
  useEffect(() => {
    if (initialMode && effectiveAllowedModes.includes(initialMode)) {
      setMode(initialMode);
    } else if (effectiveAllowedModes.length > 0 && !effectiveAllowedModes.includes(mode)) {
      setMode(effectiveAllowedModes[0]);
    }
  }, [initialMode, effectiveAllowedModes]);

  // Raw scanned buffer
  const [scannedInput, setScannedInput] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState<string | null>(null);

  // PUTAWAY 2-OPTION FLOW STATE
  // Opsi 1 (scan-range): Scan 1 QR + Input Range Karton (Maks 15 Box) + Input No Pallet + Scan QR Rak
  // Opsi 2 (scan allbox): Scan Semua QR Karton Produk (Min 2, Maks 15 Box) + Input No Pallet + Scan QR Rak
  const [putawayOption, setPutawayOption] = useState<'OPTION_1_RANGE' | 'OPTION_2_SCAN_ALL'>(initialPutawayOption);

  // Synchronize putaway option when initialPutawayOption or modal open state changes
  useEffect(() => {
    if (initialPutawayOption) {
      setPutawayOption(initialPutawayOption);
    }
  }, [initialPutawayOption, isOpen]);
  const [putawayStep, setPutawayStep] = useState<1 | 2 | 3>(1);
  const [parsedFgQr, setParsedFgQr] = useState<ParsedFinishedGoodsQr | null>(null);
  // Pastikan isian semua kosong awalnya sesuai permintaan user
  const [cartonStart, setCartonStart] = useState<number>(0);
  const [cartonEnd, setCartonEnd] = useState<number>(0);
  const [boxCount, setBoxCount] = useState<number>(0);
  const [palletNumber, setPalletNumber] = useState<string>('');
  const [operatorNote, setOperatorNote] = useState<string>('');
  const [icStatus, setIcStatus] = useState<ICStatus>('OK');
  const [scannedCartons, setScannedCartons] = useState<Array<{
    cartonNumber: number;
    cartonFormatted: string;
    productName: string;
    batchNo: string;
    productionDate?: string;
    productionTime?: string;
    rawCode: string;
    scannedAt: string;
  }>>([]);
  const [option2Notice, setOption2Notice] = useState<string | null>(null);
  const [targetSlot, setTargetSlot] = useState(prefilledSlotCode ? formatSlotCodeProper(prefilledSlotCode) : '');
  const [putawaySuccess, setPutawaySuccess] = useState(false);
  const [scanTargetField, setScanTargetField] = useState<'product' | 'pallet' | 'rack' | null>(null);

  const scannedCartonsRef = useRef(scannedCartons);
  scannedCartonsRef.current = scannedCartons;

  const putawayOptionRef = useRef(putawayOption);
  putawayOptionRef.current = putawayOption;

  const modeRef = useRef(mode);
  modeRef.current = mode;

  const scanTargetFieldRef = useRef(scanTargetField);
  scanTargetFieldRef.current = scanTargetField;

  const parsedFgQrRef = useRef(parsedFgQr);
  parsedFgQrRef.current = parsedFgQr;

  const handleBarcodeDetectedRef = useRef<(code: string) => void>(() => {});

  // Standar nomor pallet bebas sesuai dengan QR code pallet fisik (misal: FG-383, K-717, B-383, M-444, H-339, SM-123 dsb)
  const formatPalletCode = (val: string): string => {
    return (val || '').trim().toUpperCase();
  };

  // Hitung jumlah box aktif pada pallet
  const effectiveBoxCount = React.useMemo(() => {
    if (putawayOption === 'OPTION_2_SCAN_ALL') {
      return scannedCartons.length;
    }
    if (boxCount > 0) return boxCount;
    if (cartonEnd > 0 && cartonStart > 0 && cartonEnd >= cartonStart) {
      return cartonEnd - cartonStart + 1;
    }
    if (scannedCartons.length > 0) return scannedCartons.length;
    return 0;
  }, [putawayOption, scannedCartons, boxCount, cartonStart, cartonEnd]);

  // Logika status box kapasitas pallet:
  // - 15 box: warna HIJAU tanda maks 15 box (SOP Pallet Penuh)
  // - Di bawah 15 box (dan min 1 box): warna KUNING tanda masih bisa diinput, minimal 1 box terpenuhi
  // - Di atas 15 box: warning warna MERAH dan TIDAK DAPAT terinput / masuk ke rak
  const boxCapacityInfo = React.useMemo(() => {
    if (effectiveBoxCount === 15) {
      return {
        status: 'MAX_15',
        color: 'emerald',
        badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-800',
        cardBg: 'bg-emerald-50/90 border-emerald-300 text-emerald-950',
        indicatorColor: 'bg-emerald-500',
        label: 'Maks 15 Box (Pallet Penuh Sesuai SOP)',
        hint: 'Kapasitas maksimal 15 Box terpenuhi. Pallet siap dialokasikan ke rak.',
        canSubmit: true,
      };
    } else if (effectiveBoxCount >= 1 && effectiveBoxCount < 15) {
      return {
        status: 'UNDER_15',
        color: 'amber',
        badgeBg: 'bg-amber-100 border-amber-300 text-amber-800',
        cardBg: 'bg-amber-50/90 border-amber-300 text-amber-950',
        indicatorColor: 'bg-amber-500',
        label: `${effectiveBoxCount} Box (Di Bawah 15 Box) - Siap Disimpan`,
        hint: `Kapasitas di bawah 15 box (minimal 1 box terpenuhi). Pallet siap dialokasikan ke rak.`,
        canSubmit: true,
      };
    } else if (effectiveBoxCount > 15) {
      return {
        status: 'OVER_15',
        color: 'rose',
        badgeBg: 'bg-rose-100 border-rose-400 text-rose-900 font-black animate-pulse',
        cardBg: 'bg-rose-50 border-rose-300 text-rose-950',
        indicatorColor: 'bg-rose-600',
        label: `${effectiveBoxCount} Box - WARNING: Melebihi Batas Maksimal 15 Box!`,
        hint: `PERINGATAN: Muatan melebihi batas maksimal 15 Box! Tidak dapat terinput / masuk ke rak.`,
        canSubmit: false,
      };
    } else {
      // effectiveBoxCount === 0
      return {
        status: 'BELOW_MIN_1',
        color: 'slate',
        badgeBg: 'bg-slate-100 border-slate-300 text-slate-700',
        cardBg: 'bg-slate-50 border-slate-200 text-slate-700',
        indicatorColor: 'bg-slate-400',
        label: `0 Box - Belum Memenuhi Minimal 1 Box`,
        hint: `Minimal 1 Box per pallet untuk dapat masuk ke rak.`,
        canSubmit: false,
      };
    }
  }, [effectiveBoxCount]);

  // Reset semua isian menjadi KOSONG saat modal dibuka untuk memastikan awal selalu bersih
  useEffect(() => {
    if (isOpen) {
      setIcStatus('OK');
      setPalletNumber('');
      setOperatorNote('');
      setParsedFgQr(null);
      setCartonStart(0);
      setCartonEnd(0);
      setBoxCount(0);
      setScannedCartons([]);
      scannedCartonsRef.current = [];
      setOption2Notice(null);
      setScanTargetField(null);
      setPutawaySuccess(false);
      if (prefilledSlotCode) {
        setTargetSlot(formatSlotCodeProper(prefilledSlotCode));
      } else {
        setTargetSlot('');
      }
    }
  }, [isOpen, prefilledSlotCode]);

  // Lookup result state
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    type: 'slot' | 'product' | 'fg_qr';
    slotCode?: string;
    rackId?: string;
    level?: number;
    bay?: string;
    status?: string;
    pallet?: any;
    product?: ProductItem;
    parsedQr?: ParsedFinishedGoodsQr;
  } | null>(null);

  // Picking & Audit states
  const [pickingSlotCode, setPickingSlotCode] = useState(prefilledSlotCode || '');
  const [auditSlotCode, setAuditSlotCode] = useState(prefilledSlotCode || '');
  const [auditStatus, setAuditStatus] = useState<'MATCH' | 'MISMATCH' | null>(null);

  // Validation: Apakah slot target terkendala di lapangan sehingga tidak boleh diisi pallet IC
  const isTargetSlotBlocked = React.useMemo(() => {
    if (!targetSlot) return false;
    const parsed = parseSlotCode(targetSlot);
    if (!parsed || !racks[parsed.rackId]) return false;
    const rack = racks[parsed.rackId];
    const matchedKey = findMatchingSlotKey(rack.slots, targetSlot) || parsed.canonicalSlotCode;
    const s = rack.slots[matchedKey];
    return !!s && (s.isBlocked || s.status === 'maintenance');
  }, [targetSlot, racks]);

  const targetSlotBlockedReason = React.useMemo(() => {
    if (!targetSlot) return '';
    const parsed = parseSlotCode(targetSlot);
    if (!parsed || !racks[parsed.rackId]) return '';
    const rack = racks[parsed.rackId];
    const matchedKey = findMatchingSlotKey(rack.slots, targetSlot) || parsed.canonicalSlotCode;
    const s = rack.slots[matchedKey];
    return s?.blockReason || 'Kendala fisik di lapangan (diblokir dari isi pallet IC)';
  }, [targetSlot, racks]);

  useEffect(() => {
    if (prefilledSlotCode) {
      const proper = formatSlotCodeProper(prefilledSlotCode);
      setTargetSlot(proper);
      setPickingSlotCode(proper);
      setAuditSlotCode(proper);
    }
  }, [prefilledSlotCode]);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Reset putaway wizard state
  useEffect(() => {
    if (mode === 'PUTAWAY') {
      setPutawaySuccess(false);
    }
  }, [mode]);

  // File input ref for direct photo capture / file scan on mobile devices
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const scannerInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');
  const scannerGunBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const lastScanProcessedTimeRef = useRef<number>(0);

  // Start Camera with robust fallback (back camera -> any camera -> graceful notice)
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Fitur live video stream kamera tidak didukung di browser ini. Silakan gunakan Scanner Gun Fisik (HID), input manual barcode, atau tombol "Ambil Foto Barcode".');
        setCameraActive(false);
        return;
      }

      // Check if any video input device exists on this system first
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter(d => d.kind === 'videoinput');
          if (devices.length > 0 && videoInputs.length === 0) {
            setCameraError('Perangkat kamera tidak terdeteksi pada sistem ini. Anda tetap dapat menggunakan Scanner Gun Fisik (HID), input manual barcode, atau tombol Ambil Foto.');
            setCameraActive(false);
            return;
          }
        } catch {
          // ignore device enumeration errors
        }
      }

      let stream: MediaStream | null = null;
      
      // Attempt 1: Back camera with ideal resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
      } catch (e1) {
        // Attempt 2: Environment camera basic
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
        } catch (e2) {
          // Attempt 3: Any available video camera (webcam, front cam, etc.)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: true
            });
          } catch (e3) {
            console.warn('Camera stream request fallback note:', e3);
          }
        }
      }

      if (!stream) {
        setCameraError('Kamera tidak terdeteksi pada perangkat ini. Silakan gunakan Scanner Gun Fisik (HID), input manual barcode, atau tombol Ambil Foto.');
        setCameraActive(false);
        return;
      }

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.warn('Video auto-play warning:', err);
        });
      }
    } catch (err: any) {
      console.warn('Camera access unavailable:', err?.message || err);
      let errMsg = err?.message || 'Gagal mengakses kamera.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap klik ikon gembok / setelan di bilah alamat browser HP Anda dan aktifkan izin Kamera.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError' || String(err?.message || '').toLowerCase().includes('perangkat') || String(err?.message || '').toLowerCase().includes('not found')) {
        errMsg = 'Kamera tidak terdeteksi pada perangkat ini. Anda dapat menggunakan Scanner Gun Fisik (HID), input manual barcode, atau unggah foto.';
      }
      setCameraError(errMsg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Ensure stream is assigned when video element mounts or cameraActive becomes true
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(err => console.warn('Video play error on mount:', err));
    }
  }, [cameraActive]);

  useEffect(() => {
    if (isOpen) {
      // Clear deduplication cache so new session scans instantly
      lastScannedCodeRef.current = '';
      lastScannedTimeRef.current = 0;
      if (isCameraEnabled) {
        startCamera();
      } else {
        stopCamera();
      }
      // Auto-focus barcode input for instant hardware scanner gun typing
      const focusTimer = setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 150);
      return () => {
        clearTimeout(focusTimer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, isCameraEnabled]);

  // Global Hardware Scanner Gun (HID Keyboard Wedge) Listener
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA';
      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (isInput) {
          // Input element already handles Enter via its own onKeyDown handler!
          scannerGunBufferRef.current = '';
          return;
        }

        const buffered = scannerGunBufferRef.current.trim();
        scannerGunBufferRef.current = '';
        if (buffered.length >= 2) {
          e.preventDefault();
          handleBarcodeDetected(buffered);
          return;
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Fast sequence typical of hardware 2D barcode scanner gun (< 120ms per character)
        if (timeDiff > 150 && scannerGunBufferRef.current.length > 0) {
          scannerGunBufferRef.current = '';
        }
        scannerGunBufferRef.current += e.key;

        // If operator hasn't focused an input, stream characters into the scanner bar
        if (!isInput) {
          setScannedInput(prev => prev + e.key);
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isOpen, mode, putawayStep, putawayOption, scannedCartons, parsedFgQr]);

  // Universal QR and Barcode Scanner using jsQR + native BarcodeDetector
  useEffect(() => {
    if (!cameraActive) return;
    let isMounted = true;
    let isDetecting = false;
    let detector: any = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a', 'data_matrix', 'ean_8']
        });
      } catch (err) {
        console.warn('BarcodeDetector initialization:', err);
      }
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const intervalId = setInterval(async () => {
      if (!isMounted || isDetecting || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;

      const now = Date.now();

      // Native BarcodeDetector (fast hardware decoding on Chromium/Android)
      let foundBarcode = false;
      if (detector) {
        try {
          isDetecting = true;
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            foundBarcode = true;
            const rawVal = barcodes[0].rawValue.trim();
            const timeSinceLastScan = now - lastScannedTimeRef.current;
            const isDifferentCode = rawVal !== lastScannedCodeRef.current;
            const isSameCodeCooldownPassed = timeSinceLastScan > 4000;
            // Minimum 750ms guard between scans to prevent adjacent frame duplicate triggers
            const hasMinimumInterScanGap = timeSinceLastScan > 750;

            if (rawVal && hasMinimumInterScanGap && (isDifferentCode || isSameCodeCooldownPassed)) {
              lastScannedCodeRef.current = rawVal;
              lastScannedTimeRef.current = now;
              handleBarcodeDetectedRef.current(rawVal);
              isDetecting = false;
              return;
            }
          }
        } catch {
        } finally {
          isDetecting = false;
        }
      }

      // Universal jsQR Decoder (works everywhere: iOS Safari, Android, Chrome, Edge, Firefox)
      if (!foundBarcode) {
        try {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const w = video.videoWidth;
          const h = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          // Pass 1: Reticle center crop at 1:1 original pixel scale (maximum clarity for QR codes)
          const size = Math.min(w, h, 640);
          const sx = Math.floor((w - size) / 2);
          const sy = Math.floor((h - size) / 2);

          canvas.width = size;
          canvas.height = size;
          ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

          let imgData = ctx.getImageData(0, 0, size, size);
          let code = jsQR(imgData.data, size, size, {
            inversionAttempts: 'attemptBoth'
          });

          // Pass 2: If not found in center, scan full frame (with maximum 800px dimension for speed)
          if (!code) {
            const maxDim = 800;
            const scale = Math.min(1, maxDim / Math.max(w, h));
            const fw = Math.floor(w * scale);
            const fh = Math.floor(h * scale);
            canvas.width = fw;
            canvas.height = fh;
            ctx.drawImage(video, 0, 0, fw, fh);
            imgData = ctx.getImageData(0, 0, fw, fh);
            code = jsQR(imgData.data, fw, fh, {
              inversionAttempts: 'attemptBoth'
            });
          }

          if (code && code.data) {
            foundBarcode = true;
            const rawVal = code.data.trim();
            const timeSinceLastScan = now - lastScannedTimeRef.current;
            const isDifferentCode = rawVal !== lastScannedCodeRef.current;
            const isSameCodeCooldownPassed = timeSinceLastScan > 4000;
            const hasMinimumInterScanGap = timeSinceLastScan > 750;

            if (rawVal && hasMinimumInterScanGap && (isDifferentCode || isSameCodeCooldownPassed)) {
              lastScannedCodeRef.current = rawVal;
              lastScannedTimeRef.current = now;
              handleBarcodeDetectedRef.current(rawVal);
            }
          }
        } catch (qrErr) {
          // Continue scanning silently
        }
      }

      // Reset cache when no barcode has been seen for >3000ms so moving to next box allows instant detection
      if (!foundBarcode && now - lastScannedTimeRef.current > 3000) {
        lastScannedCodeRef.current = '';
      }
    }, 90);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [cameraActive]);

  // Handler for uploading or taking a photo of a barcode/QR
  const handleImageFileScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        if (code && code.data) {
          handleBarcodeDetected(code.data.trim());
        } else {
          soundManager.playScanError();
          alert('QR Code tidak terdeteksi pada gambar. Pastikan gambar cukup terang dan barcode fokus.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be re-selected if needed
    e.target.value = '';
  };

  // Central Barcode Processor with Instant Auto-Fill
  const handleBarcodeDetected = (rawCode: string) => {
    const code = (rawCode || '').trim();
    if (!code) return;

    // Atomic debounce lock: abaikan pemicu ganda dalam jeda 700ms (mencegah scan ganda / double input)
    const now = Date.now();
    if (now - lastScanProcessedTimeRef.current < 700) {
      return;
    }
    lastScanProcessedTimeRef.current = now;

    setLastScannedResult(code);
    setScannedInput('');

    const currentMode = modeRef.current;
    const currentOption = putawayOptionRef.current;
    const currentTarget = scanTargetFieldRef.current;

    // ==============================================================
    // A. PUTAWAY (PROSES IN / MEMASUKKAN BARANG JADI KE RAK)
    // ==============================================================
    if (currentMode === 'PUTAWAY') {
      // 1. Jika operator secara khusus sedang membidik tombol "Scan Pallet"
      if (currentTarget === 'pallet') {
        const cleanPallet = formatPalletCode(code);
        setPalletNumber(cleanPallet);
        setScanTargetField(null);
        stopCamera();
        soundManager.playScanSuccess();
        setOption2Notice(`✓ Nomor Pallet "${cleanPallet}" berhasil ter-scan!`);
        return;
      }

      // 2. Jika operator secara khusus sedang membidik tombol "Scan Rak"
      if (currentTarget === 'rack') {
        const properSlot = formatSlotCodeProper(code);
        setTargetSlot(properSlot);
        setScanTargetField(null);
        stopCamera();
        soundManager.playScanSuccess();
        setOption2Notice(`✓ Nomor Rak "${properSlot}" berhasil ter-scan!`);
        return;
      }

      // 3. Hanya jika kode secara eksplisit diawali prefix "RAK-" dan bukan sedang membidik box produk
      if (code.toUpperCase().startsWith('RAK-') && currentTarget !== 'product' && scannedCartonsRef.current.length >= 1) {
        const properSlot = formatSlotCodeProper(code);
        setTargetSlot(properSlot);
        stopCamera();
        soundManager.playScanSuccess();
        setOption2Notice(`✓ Nomor Rak "${properSlot}" berhasil dipilih!`);
        return;
      }

      // 4. Pengguna sedang memindai BOX PRODUK (Kamera on real-time)
      // Parse data box dari QR Code
      const parsedFg = parseFinishedGoodsQrCode(code);

      // Cocokkan produk dengan master produk jika ada
      const matchedProd = products.find(p => 
        (parsedFg.productPin && (p.itemCode.includes(parsedFg.productPin) || p.barcode.includes(parsedFg.productPin))) ||
        (parsedFg.productName && p.itemName.toLowerCase().includes(parsedFg.productName.toLowerCase())) ||
        (parsedFg.productPin === '122' && (p.itemName.includes('SIC 25') || p.itemCode.includes('18')))
      ) || products.find(p => p.itemCode === '00J.KPI18.K0307001XX') || products[0];

      if (matchedProd) {
        parsedFg.productName = matchedProd.itemName;
      }

      setParsedFgQr(parsedFg);

      // Ambil list box saat ini dari ref yang selalu sinkron & terhindar dari state-batch closure lag
      const currentCartons = scannedCartonsRef.current;

      if (currentCartons.length >= 15) {
        soundManager.playScanError();
        stopCamera();
        setOption2Notice('⚠️ Kapasitas Pallet sudah mencapai batas maksimal 15 Box (Pallet Penuh Sesuai SOP)! Silakan lanjut ke Nomor Pallet & Nomor Rak.');
        return;
      }

      // 1. Ambil nomor box fisik langsung dari QR code (bisa acak / tidak berurutan)
      let cartonNum = parsedFg.cartonNumber;
      const cartonPrefix = parsedFg.cartonPrefix || 'D';
      const candidateCartonFmt = (cartonNum !== null && cartonNum !== undefined) 
        ? `${cartonPrefix}${String(cartonNum).padStart(3, '0')}` 
        : '';

      // Proteksi Anti-Double Input: Cek apakah box ini sudah ada di dalam list review sesi ini
      const duplicateIdx = currentCartons.findIndex(c => {
        // Cek kecocokan raw code yang sama persis
        if (c.rawCode && c.rawCode.trim() === code) return true;
        // Cek kecocokan format karton (misal D087)
        if (candidateCartonFmt && c.cartonFormatted === candidateCartonFmt) {
          if (!c.batchNo || !parsedFg.batchNo || c.batchNo === parsedFg.batchNo) return true;
        }
        // Cek kecocokan nomor karton numerik jika sama batch
        if (cartonNum !== null && cartonNum !== undefined && c.cartonNumber === cartonNum) {
          if (!c.batchNo || !parsedFg.batchNo || c.batchNo === parsedFg.batchNo) return true;
        }
        return false;
      });

      if (duplicateIdx !== -1) {
        const dupItem = currentCartons[duplicateIdx];
        const displayFmt = candidateCartonFmt || dupItem.cartonFormatted || `Box #${dupItem.cartonNumber}`;
        soundManager.playScanError();
        setOption2Notice(`⚠️ Box "${displayFmt}" sudah ada di list scan (Scan #${duplicateIdx + 1})! Duplikat diabaikan, data tidak didoublekan.`);
        setScannedInput('');
        return;
      }

      // Jika nomor karton tidak terdeteksi dari QR, baru gunakan urutan angka berikutnya sebagai fallback
      if (cartonNum === null || cartonNum === undefined) {
        const maxExisting = currentCartons.length > 0
          ? Math.max(...currentCartons.map(c => c.cartonNumber))
          : 0;
        cartonNum = maxExisting + 1;
      }

      const cartonFmt = candidateCartonFmt || `${cartonPrefix}${String(cartonNum).padStart(3, '0')}`;
      const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Pengecekan Batch Berbeda dalam 1 Sesi Scan Pallet
      let isDifferentBatch = false;
      let sessionBatch = '';
      if (currentCartons.length > 0) {
        sessionBatch = currentCartons[0].batchNo;
        if (parsedFg.batchNo && sessionBatch && parsedFg.batchNo !== sessionBatch) {
          isDifferentBatch = true;
          soundManager.playScanError();
        }
      }

      const newBoxItem: ScannedCartonItem = {
        cartonNumber: cartonNum,
        cartonFormatted: cartonFmt,
        productName: parsedFg.productName,
        batchNo: parsedFg.batchNo,
        productionDate: parsedFg.productionDateFormatted || '30-06-2026',
        productionTime: parsedFg.productionTimeFormatted || '14:35 WIB',
        rawCode: code,
        scannedAt: nowTime,
        isDifferentBatch: isDifferentBatch,
        expectedBatch: sessionBatch || undefined
      };

      const nextCartons = [...currentCartons, newBoxItem];
      scannedCartonsRef.current = nextCartons;
      setScannedCartons(nextCartons);

      setBoxCount(nextCartons.length);
      const allNums = nextCartons.map(c => c.cartonNumber).filter(n => typeof n === 'number' && !isNaN(n));
      if (allNums.length > 0) {
        setCartonStart(Math.min(...allNums));
        setCartonEnd(Math.max(...allNums));
      }

      // Jika dalam Opsi 1 (Rentang Box) dan baru ada 1 box:
      if (currentOption === 'OPTION_1_RANGE' && currentCartons.length === 0) {
        setCartonEnd(cartonNum);
        setCartonStart(Math.max(1, cartonNum - 14));
        setBoxCount(15);
        setOperatorNote(`Verified QR FG ${parsedFg.productName} • Batch ${parsedFg.batchNo} (${cartonFmt})`);
      }

      if (!isDifferentBatch) {
        soundManager.playScanSuccess();
      }

      const totalNow = nextCartons.length;

      if (isDifferentBatch) {
        setOption2Notice(`⚠️ PERINGATAN BATCH BERBEDA! Sesi pallet ini menggunakan Batch "${sessionBatch}", namun Box yang baru discan adalah Batch "${parsedFg.batchNo}" (Box ${cartonFmt})! Harap periksa fisik kardus apakah ada barang tercampur.`);
      } else if (totalNow >= 15) {
        stopCamera();
        setOption2Notice(`✓ Box ke-15 (${cartonFmt}) Masuk! Kapasitas Maksimal 15 Box Tercapai (Pallet Penuh Sesuai SOP). Kamera otomatis menutup. Silakan review list box di bawah, lalu input Nomor Pallet & Nomor Rak.`);
      } else {
        setOption2Notice(`✓ Box (${cartonFmt}) Masuk ke list! (${totalNow}/15 Box). Kamera tetap on, silakan terus scan box berikutnya.`);
      }

      setScannedInput('');
      return;
    }

    // ==============================================================
    // B. MODE LAINNYA (PICKING, AUDIT, LOOKUP)
    // ==============================================================

    // 1. Check if it's a Slot Code (e.g. A1a, F2b, RAK-A1a, etc.)
    const slotParsed = parseSlotCode(code);
    const isSlotPattern = !!slotParsed || /^RAK/i.test(code) || /^[A-Za-z]\d{1,2}[a-z]?$/i.test(code);

    if (isSlotPattern) {
      const rackId = slotParsed?.rackId || code.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase();
      const matchedKey = racks[rackId]
        ? (findMatchingSlotKey(racks[rackId].slots, code) || slotParsed?.canonicalSlotCode || formatSlotCodeProper(code))
        : (slotParsed?.canonicalSlotCode || formatSlotCodeProper(code));
      const properSlot = formatSlotCodeProper(matchedKey);

      if (currentMode === 'PICKING') {
        setPickingSlotCode(properSlot);
        stopCamera();
        soundManager.playScanSuccess();
        return;
      } else if (currentMode === 'AUDIT') {
        setAuditSlotCode(properSlot);
        stopCamera();
        soundManager.playScanSuccess();
        return;
      } else {
        doLookup(properSlot);
        stopCamera();
        return;
      }
    }

    // 2. Check if it's a Finished Goods Barcode String (e.g. PA274/26...)
    const parsedFg = parseFinishedGoodsQrCode(code);
    const isFgQr = parsedFg.isValid ||
      code.length >= 15 ||
      code.startsWith('PA') ||
      code.startsWith('PB') ||
      code.includes('274/26') ||
      code.includes('275/26') ||
      code.includes('122');

    if (isFgQr) {
      // Auto-match product from Master Products
      const matchedProd = products.find(p => 
        (parsedFg.productPin && (p.itemCode.includes(parsedFg.productPin) || p.barcode.includes(parsedFg.productPin))) ||
        (parsedFg.productName && p.itemName.toLowerCase().includes(parsedFg.productName.toLowerCase())) ||
        (parsedFg.productPin === '122' && (p.itemName.includes('SIC 25') || p.itemCode.includes('18')))
      ) || products.find(p => p.itemCode === '00J.KPI18.K0307001XX') || products[0];

      if (matchedProd) {
        parsedFg.productName = matchedProd.itemName;
      }

      if (currentMode === 'PICKING') {
        // Search if this batch is located in any rack slot
        for (const r of Object.values(racks)) {
          for (const s of Object.values(r.slots)) {
            if (s.pallet && (s.pallet.batchNo === parsedFg.batchNo || s.pallet.rawQrCode === code)) {
              setPickingSlotCode(s.slotCode);
              soundManager.playScanSuccess();
              return;
            }
          }
        }
        setLookupResult({ found: true, type: 'fg_qr', parsedQr: parsedFg });
        soundManager.playScanSuccess();
        return;
      } else {
        setLookupResult({
          found: true,
          type: 'fg_qr',
          parsedQr: parsedFg
        });
        soundManager.playScanSuccess();
        return;
      }
    }

    // 3. Check matching product from Master Products list (1D barcode or itemCode)
    const matchingProd = products.find(p => 
      p.barcode.toUpperCase() === code.toUpperCase() || 
      p.itemCode.toUpperCase() === code.toUpperCase()
    );

    if (matchingProd) {
      doLookup(matchingProd.itemCode);
      return;
    }

    // 4. Default: Run general lookup
    doLookup(code);
  };

  // Keep handleBarcodeDetectedRef always updated on every render
  handleBarcodeDetectedRef.current = handleBarcodeDetected;

  const doLookup = (query: string) => {
    const q = query.trim().toUpperCase();

    // 1. Check if Slot
    const slotParsed = parseSlotCode(q);
    if (slotParsed && racks[slotParsed.rackId]) {
      const rack = racks[slotParsed.rackId];
      const matchedKey = findMatchingSlotKey(rack.slots, q) || slotParsed.canonicalSlotCode;

      const slot = rack.slots[matchedKey];
      if (slot) {
        setLookupResult({
          found: true,
          type: 'slot',
          slotCode: matchedKey,
          rackId: slotParsed.rackId,
          level: slot.level,
          bay: slot.bay,
          status: slot.status,
          pallet: slot.pallet
        });
        soundManager.playScanSuccess();
        return;
      }
    }

    // 2. Check if Product
    const prod = products.find(p => p.barcode === q || p.itemCode.toUpperCase() === q || p.itemName.toUpperCase().includes(q));
    if (prod) {
      setLookupResult({
        found: true,
        type: 'product',
        product: prod
      });
      soundManager.playScanSuccess();
      return;
    }

    // 3. Check if Batch or Pallet in any slot
    for (const r of Object.values(racks)) {
      for (const s of Object.values(r.slots)) {
        if (s.pallet && (
          s.pallet.batchNo?.toUpperCase() === q ||
          s.pallet.palletNumber?.toUpperCase() === q ||
          s.pallet.palletId?.toUpperCase() === q ||
          (s.pallet.rawQrCode && s.pallet.rawQrCode.toUpperCase().includes(q))
        )) {
          setLookupResult({
            found: true,
            type: 'slot',
            slotCode: s.slotCode,
            rackId: r.id,
            level: s.level,
            bay: s.bay,
            status: s.status,
            pallet: s.pallet
          });
          soundManager.playScanSuccess();
          return;
        }
      }
    }

    // Not found
    soundManager.playScanError();
    setLookupResult({ found: false, type: 'slot' });
  };

  // Keyboard wedge / Barcode Scanner Gun listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeDetected(scannedInput);
    }
  };

  // Submit Putaway
  const handleFinalPutawaySubmit = () => {
    if (!targetSlot || !parsedFgQr) {
      soundManager.playScanError();
      alert('Harap lengkapi scan Produk IC, Nomor Pallet, dan Nomor Rak!');
      return;
    }

    if (!boxCapacityInfo.canSubmit) {
      soundManager.playScanError();
      if (effectiveBoxCount > 15) {
        alert(`PENEMPATAN DITOLAK: Pallet berisi ${effectiveBoxCount} Box (Melebihi batas maksimal 15 Box)! Tidak dapat terinput / masuk ke rak sesuai SOP.`);
      } else {
        alert(`PENEMPATAN DITOLAK: Pallet berisi ${effectiveBoxCount} Box (Minimal 1 Box per pallet). Harap sesuaikan nomor box awal dan akhir.`);
      }
      return;
    }

    const cleanPallet = formatPalletCode(palletNumber);
    if (!cleanPallet) {
      soundManager.playScanError();
      alert('Harap scan atau isi Nomor Pallet fisik sebelum konfirmasi simpan!');
      return;
    }

    const properSlot = formatSlotCodeProper(targetSlot);

    if (isTargetSlotBlocked) {
      soundManager.playScanError();
      alert(`PENEMPATAN DIBLOKIR: Slot ${properSlot} sedang TERKENDALA DI LAPANGAN (${targetSlotBlockedReason}). Tidak dapat diisikan pallet IC! Harap pilih slot lain.`);
      return;
    }

    const matchedProduct = products.find(p => 
      (parsedFgQr?.productPin && (p.itemCode.includes(parsedFgQr.productPin) || p.barcode.includes(parsedFgQr.productPin))) ||
      (parsedFgQr?.productName && p.itemName.toLowerCase().includes(parsedFgQr.productName.toLowerCase())) ||
      (p.itemName === parsedFgQr?.productName)
    ) || products.find(p => p.itemCode === '00J.KPI18.K0307001XX') || products[0];

    const prodDateIso = parsedFgQr?.productionDateRaw 
      ? formatIsoDate(parsedFgQr.productionDateRaw) 
      : '2026-06-30';
    const expiryDateIso = parsedFgQr?.bestBeforeRaw 
      ? formatIsoDate(parsedFgQr.bestBeforeRaw) 
      : '2028-06-30';

    const cartonRangeStr = cartonStart > 0 && cartonEnd > 0
      ? `D${String(cartonStart).padStart(3, '0')} - D${String(cartonEnd).padStart(3, '0')} (${effectiveBoxCount} Box)`
      : `${effectiveBoxCount} Box`;

    const defaultNote = `Inbound Pallet ${cleanPallet} (${effectiveBoxCount} Box) oleh ${currentUserName}`;
    const finalNotes = operatorNote.trim() ? `${operatorNote.trim()} | ${defaultNote}` : defaultNote;

    onExecutePutaway(properSlot, {
      itemCode: matchedProduct.itemCode,
      itemName: parsedFgQr.productName || matchedProduct.itemName,
      quantityBox: effectiveBoxCount,
      batchNo: parsedFgQr.batchNo,
      packingLine: parsedFgQr.packingLine,
      productPin: parsedFgQr.productPin,
      cartonStart: cartonStart > 0 ? cartonStart : undefined,
      cartonEnd: cartonEnd > 0 ? cartonEnd : undefined,
      cartonRangeText: cartonRangeStr,
      scannedCartons: scannedCartons.length > 0 ? scannedCartons.map(c => c.cartonFormatted) : undefined,
      productionDate: prodDateIso,
      productionTime: parsedFgQr.productionTimeFormatted || '14:35 WIB',
      expiryDate: expiryDateIso,
      rawQrCode: parsedFgQr.rawString || SAMPLE_FG_QR_CODE,
      palletNumber: cleanPallet,
      rackingOption: putawayOption === 'OPTION_2_SCAN_ALL' ? 'MULTI_SCAN' : 'RANGE',
      icStatus: icStatus,
      notes: finalNotes
    });

    const inbNotif: InboundNotification = {
      id: `INB-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: 'INBOUND_SUCCESS',
      palletNumber: cleanPallet,
      itemName: parsedFgQr.productName || matchedProduct.itemName,
      itemCode: matchedProduct.itemCode,
      batchNo: parsedFgQr.batchNo,
      quantityBox: effectiveBoxCount,
      cartonRangeText: cartonRangeStr,
      productionDate: parsedFgQr.productionDateFormatted || prodDateIso,
      productionTime: parsedFgQr.productionTimeFormatted || '14:35 WIB',
      expiryDate: parsedFgQr.bestBeforeFormatted || expiryDateIso,
      slotCode: properSlot,
      operatorName: currentUserName,
      icStatus: icStatus,
      timestamp: new Date().toISOString(),
      createdAt: Date.now(),
      notes: finalNotes
    };

    setLastInboundNotification(inbNotif);
    setShowInboundSummaryModal(true);

    if (onInboundNotification) {
      onInboundNotification(inbNotif);
    }

    soundManager.playScanSuccess();
    setPutawaySuccess(true);
  };

  // Submit Picking
  const handleConfirmPicking = () => {
    if (!pickingSlotCode) return;
    onExecutePicking(pickingSlotCode);
    soundManager.playScanSuccess();
    onClose();
  };

  // Submit Audit
  const handleConfirmAudit = (isMatch: boolean) => {
    if (!auditSlotCode) return;
    onExecuteAudit(auditSlotCode, isMatch);
    setAuditStatus(isMatch ? 'MATCH' : 'MISMATCH');
    soundManager.playScanSuccess();
  };

  // Handler untuk mengelola list box di Inbound Opsi 2 (Multi-scan)
  const handleRemoveScannedCarton = (index: number) => {
    const current = scannedCartonsRef.current;
    const removedItem = current[index];
    const next = current.filter((_, i) => i !== index);
    scannedCartonsRef.current = next;
    setScannedCartons(next);
    setBoxCount(next.length);
    if (next.length === 0) {
      setCartonStart(0);
      setCartonEnd(0);
    } else {
      const allNums = next.map(c => c.cartonNumber).filter(n => typeof n === 'number' && !isNaN(n));
      setCartonStart(allNums.length > 0 ? Math.min(...allNums) : 0);
      setCartonEnd(allNums.length > 0 ? Math.max(...allNums) : 0);
    }
    lastScannedCodeRef.current = '';
    soundManager.playScanSuccess();
    setOption2Notice(`✓ Box "${removedItem?.cartonFormatted || `#${index + 1}`}" berhasil dihapus dari list.`);
    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 50);
  };

  const handleClearScannedCartons = () => {
    scannedCartonsRef.current = [];
    setScannedCartons([]);
    setBoxCount(0);
    setCartonStart(0);
    setCartonEnd(0);
    lastScannedCodeRef.current = '';
    lastScannedTimeRef.current = 0;
    soundManager.playScanSuccess();
    setOption2Notice('List box telah direset. Silakan mulai scan kembali dari Box ke-1.');
    setTimeout(() => {
      scannerInputRef.current?.focus();
    }, 50);
  };

  // Simulasi scan box berikutnya secara berurutan untuk kemudahan testing tanpa scanner fisik
  const handleSimulateScanNextBox = () => {
    const current = scannedCartonsRef.current;
    if (current.length >= 15) {
      soundManager.playScanError();
      setOption2Notice('⚠️ Kapasitas maksimal 15 Box sudah terpenuhi!');
      return;
    }
    const currentCount = current.length;
    const baseCarton = parsedFgQr?.cartonNumber || 72;
    const nextCartonNum = baseCarton + currentCount;
    const cFmt = `D${String(nextCartonNum).padStart(3, '0')}`;
    const mockRawCode = `PA274/2612230062026${cFmt}14353006202630062028${String(nextCartonNum).padStart(3, '0')}`;
    handleBarcodeDetected(mockRawCode);
  };

  // Simulasi isi penuh 15 box secara instan untuk kemudahan testing
  const handleSimulateFill15Boxes = () => {
    const baseCarton = parsedFgQr?.cartonNumber || 72;
    const items: ScannedCartonItem[] = [];
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    for (let i = 0; i < 15; i++) {
      const cNum = baseCarton + i;
      const cFmt = `D${String(cNum).padStart(3, '0')}`;
      items.push({
        cartonNumber: cNum,
        cartonFormatted: cFmt,
        productName: parsedFgQr?.productName || 'SIC 25 BR (1 X 30 KG)',
        batchNo: parsedFgQr?.batchNo || '274/26',
        productionDate: parsedFgQr?.productionDateFormatted || '30-06-2026',
        productionTime: parsedFgQr?.productionTimeFormatted || '14:35 WIB',
        rawCode: `PA274/2612230062026${cFmt}14353006202630062028${String(cNum).padStart(3, '0')}`,
        scannedAt: nowTime
      });
    }
    setScannedCartons(items);
    scannedCartonsRef.current = items;
    setBoxCount(15);
    setCartonStart(baseCarton);
    setCartonEnd(baseCarton + 14);
    if (!parsedFgQr) {
      const parsed = parseFinishedGoodsQrCode(SAMPLE_FG_QR_CODE);
      setParsedFgQr(parsed);
    }
    soundManager.playScanSuccess();
    setOption2Notice('✓ Simulasi: 15 Box Berhasil Dimasukkan Lengkap (Pallet Penuh)! Silakan periksa daftar box, lalu isi Nomor Pallet & Nomor Rak.');
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopCamera();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-slate-950/80 backdrop-blur-xs"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl w-[96vw] max-w-3xl max-h-[90dvh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`px-4 sm:px-6 py-3.5 sm:py-4 text-white flex items-center justify-between border-b transition-colors shrink-0 ${MODE_CONFIGS[mode]?.headerBg || 'bg-slate-900 border-slate-800'}`}>
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black shadow-md shrink-0 ${MODE_CONFIGS[mode]?.badgeBg || 'bg-cyan-500 text-slate-950'}`}>
              {React.createElement(MODE_CONFIGS[mode]?.icon || Scan, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2 truncate">
                {MODE_CONFIGS[mode]?.headerTitle || 'Pemindai Barcode & QR Real-Time SIKUTANG'}
              </h3>
              <span className="text-[11px] sm:text-xs text-slate-300 block truncate">
                {MODE_CONFIGS[mode]?.headerSubtitle || '1 Rak = 4 Pallet • Maks 15 Box per Pallet • Scan Fisik Real-Time'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-black text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Tutup Pemindai"
          >
            <X className="w-4 h-4 stroke-[3]" />
            <span>TUTUP</span>
          </button>
        </div>

        {/* Operational Mode Navigation Tabs (HANYA MUNCUL JIKA LEBIH DARI 1 MODUL DIIZINKAN) */}
        {effectiveAllowedModes.length > 1 ? (
          <div className="flex items-center p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold gap-1.5 overflow-x-auto">
            {effectiveAllowedModes.map((m) => {
              const cfg = MODE_CONFIGS[m];
              const IconComp = cfg.icon;
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`py-2.5 px-3 rounded-xl transition cursor-pointer flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? m === 'PUTAWAY'
                        ? 'bg-emerald-600 text-white shadow-sm font-black'
                        : m === 'PICKING'
                        ? 'bg-rose-600 text-white shadow-sm font-black'
                        : m === 'AUDIT'
                        ? 'bg-amber-600 text-white shadow-sm font-black'
                        : 'bg-cyan-600 text-white shadow-sm font-black'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-bold'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{cfg.shortName}</span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Single Dedicated Context Banner - TIDAK MENAMPILKAN TAB PROSES LAINNYA */
          <div className={`px-5 py-2.5 border-b flex items-center justify-between text-xs ${
            mode === 'PUTAWAY'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : mode === 'PICKING'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : mode === 'AUDIT'
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-cyan-50 border-cyan-200 text-cyan-950'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                mode === 'PUTAWAY' ? 'bg-emerald-500' :
                mode === 'PICKING' ? 'bg-rose-500' :
                mode === 'AUDIT' ? 'bg-amber-500' : 'bg-cyan-500'
              }`}></span>
              <span className="font-black uppercase tracking-wide">
                {MODE_CONFIGS[mode]?.bannerTitle}
              </span>
              <span className="opacity-40 hidden sm:inline">&bull;</span>
              <span className="font-semibold text-slate-600 hidden sm:inline">
                {MODE_CONFIGS[mode]?.bannerDesc}
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono shadow-2xs ${
              mode === 'PUTAWAY' ? 'bg-emerald-600 text-white' :
              mode === 'PICKING' ? 'bg-rose-600 text-white' :
              mode === 'AUDIT' ? 'bg-amber-600 text-white' :
              'bg-cyan-600 text-white'
            }`}>
              {MODE_CONFIGS[mode]?.badgeLabel}
            </span>
          </div>
        )}

        {/* Barcode & Camera Scan Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
          {mode === 'PUTAWAY' && (
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                <Scan className="w-4 h-4 text-cyan-600" />
                {putawayOption === 'OPTION_1_RANGE' ? (
                  putawayStep === 1
                    ? 'Target Scan Langkah 1: Arahkan Scanner Gun / Kamera ke Barcode QR Box FG'
                    : putawayStep === 2
                    ? 'Langkah 2: Input Rentang Box & Scan Barcode Pallet (KP-001) / Scan QR Rak'
                    : 'Target Scan Langkah 3: Arahkan Scanner Gun / Kamera ke QR Sticker Tiang Rak'
                ) : (
                  putawayStep === 1
                    ? `Target Scan Langkah 1: Scan QR Tiap Karton Box (${scannedCartons.length}/15 Karton Terkumpul)`
                    : 'Target Scan Langkah 2: Arahkan Scanner Gun / Kamera ke QR Sticker Tiang Rak'
                )}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
                Pintu Input Scanner Fisik / Ketik Manual lalu Enter
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={scannerInputRef}
                data-scanner-input="true"
                type="text"
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'PUTAWAY'
                    ? 'Scan QR Produk IC / No. Pallet / No. Rak (atau ketik & Enter)...'
                    : MODE_CONFIGS[mode]?.inputPlaceholder || 'Arahkan scanner gun / ketik barcode & Enter...'
                }
                autoFocus
                className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white border-2 border-slate-300 rounded-xl font-mono text-base font-bold focus:ring-4 focus:ring-cyan-100 focus:border-cyan-500 focus:outline-none shadow-xs"
              />
              <Scan className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 sm:top-4" />
            </div>

            <button
              type="button"
              onClick={() => handleBarcodeDetected(scannedInput)}
              className="px-5 py-3 sm:py-3.5 bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-black text-sm rounded-xl shadow-xs transition cursor-pointer shrink-0"
            >
              Proses
            </button>

            {isCameraEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => (cameraActive ? stopCamera() : startCamera())}
                  className={`px-3.5 py-3 sm:py-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 font-bold text-xs ${
                    cameraActive
                      ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                      : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                  }`}
                  title={cameraActive ? 'Tutup Kamera' : 'Buka Kamera HP Pemindai'}
                >
                  {cameraActive ? (
                    <>
                      <CameraOff className="w-5 h-5" />
                      <span className="hidden sm:inline">Matikan</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>Kamera HP</span>
                    </>
                  )}
                </button>

                {/* Direct Photo Capture Input for Mobile Devices (Bisa Ambil Foto Kamera Langsung) */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFileScan}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="p-3 sm:p-3.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition cursor-pointer flex items-center justify-center shrink-0"
                  title="Ambil Foto Barcode via Kamera HP / Unggah Gambar"
                >
                  <Upload className="w-5 h-5 text-slate-600" />
                </button>
              </>
            )}
          </div>

          {/* Quick Activation Bar if Camera is Inactive and Camera is Allowed */}
          {isCameraEnabled && !cameraActive && (
            <div className="flex items-center justify-between p-2.5 bg-cyan-50/70 border border-cyan-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-cyan-900">
                <Camera className="w-4 h-4 text-cyan-700 shrink-0" />
                <span className="font-semibold">
                  Akses kamera siap. Klik tombol di kanan untuk mulai scan langsung dengan kamera HP Anda.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-black rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Aktifkan Kamera</span>
                </button>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-lg transition cursor-pointer shadow-2xs hidden sm:flex items-center gap-1"
                >
                  <Upload className="w-3 h-3 text-slate-500" />
                  <span>Foto Barcode</span>
                </button>
              </div>
            </div>
          )}

          {/* Camera Viewfinder */}
          {cameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-56 flex items-center justify-center border-2 border-cyan-500 shadow-inner">
              <video 
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }} 
                onLoadedMetadata={() => {
                  if (videoRef.current) {
                    videoRef.current.play().catch(() => {});
                  }
                }}
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover" 
              />
              {/* Reticle Focus Box for fast QR alignment */}
              <div className="absolute w-40 h-40 sm:w-48 sm:h-48 border-2 border-dashed border-cyan-400/80 rounded-2xl pointer-events-none flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                {/* 4 Corner Markers */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
                {/* Center Laser Line */}
                <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse"></div>
              </div>
              <div className="absolute top-2 left-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>
                  {mode === 'PUTAWAY' && putawayOption === 'OPTION_1_RANGE'
                    ? putawayStep === 1
                      ? 'Kamera Aktif • Bidik QR Code Box FG untuk Auto-Input Detail Produk'
                      : putawayStep === 2
                      ? 'Kamera Aktif • Bidik Barcode Nomor Pallet (KP-001) atau QR Rak'
                      : 'Kamera Aktif • Bidik QR Sticker Tiang Rak Tujuan'
                    : 'Kamera Aktif • Posisikan QR / Barcode di dalam kotak bidik'}
                </span>
              </div>
              <div className="absolute bottom-2 inset-x-3 flex items-center justify-between text-white text-[10px] font-semibold bg-black/60 px-3 py-1 rounded-xl backdrop-blur-xs">
                <span>Scanner JSQR Real-Time Aktif (Mendukung Android & iOS)</span>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="text-cyan-300 hover:text-white underline cursor-pointer"
                >
                  Ambil Foto Jelas
                </button>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Coba Lagi</span>
                </button>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3 h-3 text-amber-700" />
                  <span>Ambil Foto HP</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50">
          {/* ================= MODE: PUTAWAY (TAMPILAN INBOUND SIMPLE & TERSTRUKTUR) ================= */}
          {mode === 'PUTAWAY' && (
            <div className="space-y-4">
              {option2Notice && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950 font-bold animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{option2Notice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOption2Notice(null)}
                    className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer font-bold"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <InboundSimplePutawayView
                putawayOption={putawayOption}
                onChangePutawayOption={setPutawayOption}
                parsedFgQr={parsedFgQr}
                palletNumber={palletNumber}
                targetSlot={targetSlot}
                operatorNote={operatorNote}
                icStatus={icStatus}
                effectiveBoxCount={effectiveBoxCount}
                boxCapacityInfo={boxCapacityInfo}
                cartonStart={cartonStart}
                cartonEnd={cartonEnd}
                scannedCartons={scannedCartons}
                onRemoveScannedCarton={handleRemoveScannedCarton}
                onClearScannedCartons={handleClearScannedCartons}
                onSimulateScanNextBox={handleSimulateScanNextBox}
                onSimulateFill15Boxes={handleSimulateFill15Boxes}
                isCameraEnabled={isCameraEnabled}
                cameraActive={cameraActive}
                scanTargetField={scanTargetField}
                isTargetSlotBlocked={isTargetSlotBlocked}
                targetSlotBlockedReason={targetSlotBlockedReason}
                onStartCameraForField={(field) => {
                  setScanTargetField(field);
                  startCamera();
                }}
                onStopCamera={() => {
                  stopCamera();
                  setScanTargetField(null);
                }}
                onChangePalletNumber={setPalletNumber}
                onChangeTargetSlot={setTargetSlot}
                onChangeOperatorNote={setOperatorNote}
                onChangeIcStatus={setIcStatus}
                onChangeBoxCount={(count) => {
                  setBoxCount(count);
                  if (parsedFgQr?.cartonNumber) {
                    setCartonEnd(parsedFgQr.cartonNumber);
                    setCartonStart(Math.max(1, parsedFgQr.cartonNumber - count + 1));
                  }
                }}
                onSetCartonRange={(start, end) => {
                  setCartonStart(start);
                  setCartonEnd(end);
                  setBoxCount(Math.max(1, end - start + 1));
                }}
                onUseSampleQr={() => handleBarcodeDetected(SAMPLE_FG_QR_CODE)}
                onScanCode={handleBarcodeDetected}
                onSubmit={handleFinalPutawaySubmit}
              />
            </div>
          )}

          {/* ================= MODE: LOOKUP ================= */}
          {mode === 'LOOKUP' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-600" />
                  Hasil Pengecekan Barcode & Lokasi Slot
                </h4>
                <button
                  type="button"
                  onClick={() => handleBarcodeDetected(SAMPLE_FG_QR_CODE)}
                  className="text-xs font-bold text-cyan-700 hover:underline cursor-pointer"
                >
                  Coba Tes QR FG Fisik
                </button>
              </div>

              {lookupResult ? (
                lookupResult.found ? (
                  lookupResult.type === 'fg_qr' && lookupResult.parsedQr ? (
                    // Finished Goods Barcode Breakdown Card
                    <div className="p-4 bg-cyan-50 rounded-2xl border border-cyan-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="bg-cyan-600 text-white font-mono text-xs font-bold px-2 py-0.5 rounded">
                          {lookupResult.parsedQr.packingLineName}
                        </span>
                        <span className="font-mono text-xs font-bold text-cyan-800">
                          Batch: {lookupResult.parsedQr.batchNo}
                        </span>
                      </div>

                      <h4 className="font-black text-slate-900 text-base">
                        {lookupResult.parsedQr.productName}
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">PIN PRODUK</span>
                          <span className="font-bold text-slate-800">{lookupResult.parsedQr.productPin}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">NOMOR KARTON</span>
                          <span className="font-mono font-bold text-emerald-700">{lookupResult.parsedQr.cartonNumberFormatted}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">TGL PRODUKSI</span>
                          <span className="font-semibold text-slate-800">
                            {lookupResult.parsedQr.productionDateFormatted}
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-cyan-200">
                          <span className="text-emerald-700 block text-[10px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-emerald-600" />
                            JAM PRODUKSI
                          </span>
                          <span className="font-mono font-black text-emerald-800">
                            {lookupResult.parsedQr.productionTimeFormatted || '14:35 WIB'}
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">BEST BEFORE</span>
                          <span className="font-semibold text-emerald-700">{lookupResult.parsedQr.bestBeforeFormatted}</span>
                        </div>
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMode('PUTAWAY');
                            setParsedFgQr(lookupResult.parsedQr!);
                            setPutawayStep(2);
                          }}
                          className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Box className="w-4 h-4" />
                          Lanjut Putaway Pallet Ini
                        </button>
                      </div>
                    </div>
                  ) : lookupResult.type === 'slot' ? (
                    // Slot Lookup
                    <div className="p-4 bg-cyan-50/60 rounded-2xl border border-cyan-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-black text-lg text-cyan-950">
                          {lookupResult.slotCode}
                        </span>
                        <span
                          className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                            lookupResult.status === 'occupied'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {lookupResult.status === 'occupied' ? 'TERISI PALLET' : 'SLOT KOSONG'}
                        </span>
                      </div>

                      {lookupResult.pallet ? (
                        <div className="bg-white p-3.5 rounded-xl border border-cyan-100 space-y-2">
                          <p className="font-bold text-slate-900 text-base">{lookupResult.pallet.itemName}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium text-slate-600">
                            <div>
                              <span className="text-slate-400 block text-[10px]">KODE ITEM</span>
                              <span className="font-mono font-bold text-slate-800">{lookupResult.pallet.itemCode}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">JUMLAH BOX</span>
                              <span className="font-mono font-extrabold text-emerald-600 text-sm">
                                {lookupResult.pallet.quantityBox} BOX
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">BATCH & LINE</span>
                              <span className="font-mono text-slate-800">{lookupResult.pallet.batchNo} ({lookupResult.pallet.packingLine || 'PA'})</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10px]">RENTANG KARTON</span>
                              <span className="font-semibold text-slate-800">{lookupResult.pallet.cartonRangeText || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600">
                          Slot ini kosong dan siap ditempati oleh pallet produk barang jadi.
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (lookupResult.slotCode) onLocateSlot(lookupResult.slotCode);
                            onClose();
                          }}
                          className="px-4 py-2 bg-cyan-600 text-white font-bold text-xs rounded-xl hover:bg-cyan-700 transition cursor-pointer flex items-center gap-1.5"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Tampilkan di Grid Visual
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Product Lookup
                    <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded">
                        {lookupResult.product?.itemCode}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base">{lookupResult.product?.itemName}</h4>
                      <p className="text-xs text-slate-600">
                        Total Stok Gudang: <strong>{lookupResult.product?.currentStockBox} BOX</strong> | 
                        Standar Pallet: <strong>{lookupResult.product?.boxPerPallet} BOX</strong>
                      </p>
                    </div>
                  )
                ) : (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Barcode atau Slot tidak ditemukan dalam sistem. Pastikan kode sudah benar.</span>
                  </div>
                )
              ) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-500">
                  Scan barcode untuk melihat informasi stok, slot rak, dan rincian produk secara instan.
                </div>
              )}
            </div>
          )}

          {/* ================= MODE: PICKING ================= */}
          {mode === 'PICKING' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                Picking Barang (Pengeluaran Barang Jadi dari Rak)
              </h4>

              <div>
                <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 mb-1.5">
                  Scan / Pilih Slot yang Akan Diambil
                </label>
                <input
                  type="text"
                  value={pickingSlotCode}
                  onChange={(e) => setPickingSlotCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: RAK-A-P1"
                  className="w-full h-13 sm:h-14 px-4 bg-white border-2 border-slate-300 rounded-xl font-mono text-xl sm:text-2xl font-black text-amber-950 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 uppercase tracking-wide placeholder:font-normal placeholder:text-slate-400"
                />
              </div>

              {pickingSlotCode && (
                (() => {
                  const parsed = parseSlotCode(pickingSlotCode);
                  const rack = parsed ? racks[parsed.rackId] : null;
                  const matchedKey = rack ? Object.keys(rack.slots).find(
                    k => k.toUpperCase() === pickingSlotCode.toUpperCase() ||
                         (parsed?.palletPos && k.toUpperCase() === `RAK-${parsed.rackId}-P${parsed.palletPos}`)
                  ) : null;
                  const slot = rack && matchedKey ? rack.slots[matchedKey] : null;

                  if (!slot || slot.status !== 'occupied' || !slot.pallet) {
                    return (
                      <div className="p-4 bg-slate-100 rounded-2xl text-xs text-slate-600">
                        Slot {pickingSlotCode} saat ini tidak memiliki pallet terisi.
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900">{slot.pallet.itemName}</span>
                        <span className="font-mono font-bold text-amber-700">{slot.pallet.quantityBox} BOX</span>
                      </div>
                      <p className="text-xs text-slate-600 font-mono">
                        Batch: {slot.pallet.batchNo} | Rentang: {slot.pallet.cartonRangeText || '-'}
                      </p>

                      <button
                        type="button"
                        onClick={handleConfirmPicking}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
                      >
                        Konfirmasi Pengeluaran (Picking Selesai)
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* ================= MODE: AUDIT ================= */}
          {mode === 'AUDIT' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Audit Stock Opname & Keakurasian Rak
              </h4>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Scan Slot Rak Fisik
                </label>
                <input
                  type="text"
                  value={auditSlotCode}
                  onChange={(e) => setAuditSlotCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: RAK-A-P1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base font-black text-indigo-900"
                />
              </div>

              {auditSlotCode && (
                (() => {
                  const parsed = parseSlotCode(auditSlotCode);
                  const rack = parsed ? racks[parsed.rackId] : null;
                  const matchedKey = rack ? Object.keys(rack.slots).find(
                    k => k.toUpperCase() === auditSlotCode.toUpperCase() ||
                         (parsed?.palletPos && k.toUpperCase() === `RAK-${parsed.rackId}-P${parsed.palletPos}`)
                  ) : null;
                  const slot = rack && matchedKey ? rack.slots[matchedKey] : null;

                  if (!slot) {
                    return (
                      <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500">
                        Slot tidak terdaftar di sistem.
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-indigo-900">Data Sistem Slot {slot.slotCode}:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {slot.status === 'occupied' ? `${slot.pallet?.quantityBox} BOX` : 'KOSONG'}
                        </span>
                      </div>

                      {slot.pallet && (
                        <p className="text-xs font-medium text-slate-800">
                          {slot.pallet.itemName} (Batch: {slot.pallet.batchNo}, Rentang: {slot.pallet.cartonRangeText || '-'})
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmAudit(true)}
                          className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Fisik Cocok 100%
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmAudit(false)}
                          className="py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          Selisih / Beda Fisik
                        </button>
                      </div>

                      {auditStatus && (
                        <div className={`p-2.5 rounded-xl text-xs font-bold text-center ${
                          auditStatus === 'MATCH'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {auditStatus === 'MATCH' ? '✓ Terverifikasi Akurat 100%' : '⚠ Dicatat Selisih untuk Tindak Lanjut'}
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pop up summary hasil inbound 1 pallet berhasil */}
      {showInboundSummaryModal && lastInboundNotification && (
        <InboundSummaryModal
          isOpen={showInboundSummaryModal}
          onClose={() => setShowInboundSummaryModal(false)}
          data={lastInboundNotification}
          onNextPallet={() => {
            setShowInboundSummaryModal(false);
            setPutawayStep(1);
            setPutawaySuccess(false);
            setPalletNumber('');
            setTargetSlot('');
            setParsedFgQr(null);
            setScannedCartons([]);
            if (isCameraEnabled) {
              startCamera();
            }
          }}
        />
      )}
    </div>
  );
};
