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
import { ProductItem, RackData, UserRole, ICStatus } from '../types';
import { soundManager } from '../utils/audio';
import { parseSlotCode, findMatchingSlotKey } from '../utils/barcode';
import { parseFinishedGoodsQrCode, ParsedFinishedGoodsQr, SAMPLE_FG_QR_CODE } from '../utils/productQrParser';

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
  initialPutawayOption = 'OPTION_1_RANGE',
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
  const [cartonStart, setCartonStart] = useState<number>(72);
  const [cartonEnd, setCartonEnd] = useState<number>(86);
  const [palletNumber, setPalletNumber] = useState<string>('PLT-A-01');
  const [operatorNote, setOperatorNote] = useState<string>('');
  const [icStatus, setIcStatus] = useState<ICStatus>('OK');
  const [scannedCartons, setScannedCartons] = useState<Array<{
    cartonNumber: number;
    cartonFormatted: string;
    productName: string;
    batchNo: string;
    rawCode: string;
    scannedAt: string;
  }>>([]);
  const [option2Notice, setOption2Notice] = useState<string | null>(null);
  const [targetSlot, setTargetSlot] = useState(prefilledSlotCode || 'A1a');
  const [putawaySuccess, setPutawaySuccess] = useState(false);

  // Reset icStatus when modal is opened
  useEffect(() => {
    if (isOpen) {
      setIcStatus('OK');
    }
  }, [isOpen]);

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

  // Daftar slot kosong yang siap pakai (tidak berkendala)
  const readyEmptySlots = React.useMemo(() => {
    const list: string[] = [];
    for (const r of Object.values(racks)) {
      for (const s of Object.values(r.slots)) {
        if (!s.isBlocked && s.status !== 'maintenance' && s.status !== 'occupied') {
          list.push(s.slotCode);
          if (list.length >= 8) break;
        }
      }
      if (list.length >= 8) break;
    }
    return list.length > 0 ? list : ['A1a', 'A2a', 'A3a', 'A4a', 'A1b', 'B1a', 'B2a'];
  }, [racks]);

  useEffect(() => {
    if (prefilledSlotCode) {
      setTargetSlot(prefilledSlotCode);
      setPickingSlotCode(prefilledSlotCode);
      setAuditSlotCode(prefilledSlotCode);
    }
  }, [prefilledSlotCode]);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Reset putaway wizard when switching mode
  useEffect(() => {
    if (mode === 'PUTAWAY') {
      setPutawaySuccess(false);
      if (!parsedFgQr) {
        // Initialize default sample parser
        const initial = parseFinishedGoodsQrCode(SAMPLE_FG_QR_CODE);
        setParsedFgQr(initial);
        setCartonEnd(initial.cartonNumber);
        setCartonStart(Math.max(1, initial.cartonNumber - 14));
      }
    }
  }, [mode]);

  // File input ref for direct photo capture / file scan on mobile devices
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>('');

  // Start Camera with multi-stage fallback (back camera -> any camera)
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.protocol !== 'http:' && window.location.hostname !== 'localhost') {
        throw new Error('Akses kamera membutuhkan koneksi aman (HTTPS). Jika membuka file lokal HTML, gunakan tombol "Ambil Foto Barcode" di bawah.');
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Fitur live video stream kamera tidak didukung di peramban ini. Anda dapat menggunakan tombol "Ambil Foto Barcode" di bawah.');
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
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
      }

      if (!stream) {
        throw new Error('Tidak dapat menemukan perangkat kamera.');
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
      console.error('Camera access error:', err);
      let errMsg = err.message || 'Gagal mengakses kamera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Izin kamera ditolak. Harap klik ikon gembok / setelan di bilah alamat browser HP Anda dan aktifkan izin Kamera.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'Kamera tidak terdeteksi pada perangkat ini.';
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
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Universal QR and Barcode Scanner using jsQR + native BarcodeDetector
  useEffect(() => {
    if (!cameraActive) return;
    let isMounted = true;
    let detector: any = null;

    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a', 'data_matrix']
        });
      } catch (err) {
        console.warn('BarcodeDetector initialization:', err);
      }
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const intervalId = setInterval(async () => {
      if (!isMounted || !videoRef.current || videoRef.current.readyState < 2) return;
      const video = videoRef.current;
      const now = Date.now();

      // Native BarcodeDetector (fast 1D & 2D on supported Chromium)
      if (detector) {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            const rawVal = barcodes[0].rawValue.trim();
            if (rawVal && (rawVal !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 1500)) {
              lastScannedCodeRef.current = rawVal;
              lastScannedTimeRef.current = now;
              handleBarcodeDetected(rawVal);
              return;
            }
          }
        } catch {}
      }

      // Universal jsQR Decoder (works in Safari iOS, Android Chrome, and all browsers)
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w === 0 || h === 0) return;

        // Downscale slightly for performance on low-end mobile phones
        const scale = w > 800 ? 0.75 : 1;
        canvas.width = Math.floor(w * scale);
        canvas.height = Math.floor(h * scale);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });
          if (code && code.data) {
            const rawVal = code.data.trim();
            if (rawVal && (rawVal !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 1500)) {
              lastScannedCodeRef.current = rawVal;
              lastScannedTimeRef.current = now;
              handleBarcodeDetected(rawVal);
            }
          }
        }
      } catch (qrErr) {
        // Continue scanning silently
      }
    }, 200);

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

  // Central Barcode Processor
  const handleBarcodeDetected = (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    soundManager.playScanSuccess();
    setLastScannedResult(code);
    setScannedInput('');

    // Check if in PUTAWAY mode
    if (mode === 'PUTAWAY') {
      if (putawayOption === 'OPTION_1_RANGE') {
        if (putawayStep === 1) {
          // Operator scanned finished goods carton box QR
          const parsed = parseFinishedGoodsQrCode(code);
          setParsedFgQr(parsed);
          setCartonEnd(parsed.cartonNumber);
          setCartonStart(Math.max(1, parsed.cartonNumber - 14));
          setPutawayStep(2);
          return;
        } else if (putawayStep === 3) {
          // Operator scanned destination Rack QR code (e.g. A1a, F2b, A3m)
          const slotParsed = parseSlotCode(code);
          if (slotParsed) {
            const matchedKey = racks[slotParsed.rackId]
              ? (findMatchingSlotKey(racks[slotParsed.rackId].slots, code) || slotParsed.canonicalSlotCode)
              : slotParsed.canonicalSlotCode;
            setTargetSlot(matchedKey);
            return;
          }
          setTargetSlot(code.toUpperCase());
          return;
        }
      } else {
        // OPTION 2: SCAN ALL QR CARTONS (MIN 2, MAX 15)
        if (putawayStep === 1) {
          const slotParsed = parseSlotCode(code);
          if (slotParsed && (code.startsWith('RAK') || racks[slotParsed.rackId])) {
            setOption2Notice(`Terdeteksi QR slot rak (${code}). Selesaikan scan minimal 2 karton box terlebih dahulu, lalu klik Langkah 2.`);
            return;
          }

          const parsed = parseFinishedGoodsQrCode(code);
          setParsedFgQr(parsed);

          // Check if already in list
          const already = scannedCartons.some(c => c.cartonNumber === parsed.cartonNumber);
          if (already) {
            soundManager.playScanError();
            setOption2Notice(`Karton D${String(parsed.cartonNumber).padStart(3, '0')} sudah ada di daftar pallet!`);
            return;
          }

          if (scannedCartons.length >= 15) {
            soundManager.playScanError();
            setOption2Notice('Maksimal 15 box dalam 1 pallet telah tercapai!');
            return;
          }

          const newCarton = {
            cartonNumber: parsed.cartonNumber,
            cartonFormatted: parsed.cartonNumberFormatted,
            productName: parsed.productName,
            batchNo: parsed.batchNo,
            rawCode: code,
            scannedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          };

          setScannedCartons(prev => [...prev, newCarton]);
          setOption2Notice(`Karton D${String(parsed.cartonNumber).padStart(3, '0')} berhasil ditambahkan! (${scannedCartons.length + 1}/15 Box)`);
          return;
        } else if (putawayStep === 2) {
          // Operator scanned destination Rack QR code
          const slotParsed = parseSlotCode(code);
          if (slotParsed) {
            const matchedKey = racks[slotParsed.rackId]
              ? (findMatchingSlotKey(racks[slotParsed.rackId].slots, code) || slotParsed.canonicalSlotCode)
              : slotParsed.canonicalSlotCode;
            setTargetSlot(matchedKey);
            return;
          }
          setTargetSlot(code.toUpperCase());
          return;
        }
      }
    }

    // Check if it's a Slot Code (e.g. A1a, F2b, RAK-A1a)
    const slotParsed = parseSlotCode(code);
    if (slotParsed) {
      const fullSlot = racks[slotParsed.rackId]
        ? (findMatchingSlotKey(racks[slotParsed.rackId].slots, code) || slotParsed.canonicalSlotCode)
        : slotParsed.canonicalSlotCode;
      if (mode === 'PUTAWAY') {
        setTargetSlot(fullSlot);
      } else if (mode === 'PICKING') {
        setPickingSlotCode(fullSlot);
      } else if (mode === 'AUDIT') {
        setAuditSlotCode(fullSlot);
      } else {
        doLookup(fullSlot);
      }
      return;
    }

    // Check if it's a Finished Goods Barcode String (e.g. PA274/26...)
    if (code.length > 20 && (code.startsWith('PA') || code.startsWith('PB') || code.includes('274/26') || code.includes('122'))) {
      const parsedFg = parseFinishedGoodsQrCode(code);
      if (mode === 'PUTAWAY') {
        setParsedFgQr(parsedFg);
        setCartonEnd(parsedFg.cartonNumber);
        setCartonStart(Math.max(1, parsedFg.cartonNumber - 14));
        setPutawayStep(2);
      } else {
        setLookupResult({
          found: true,
          type: 'fg_qr',
          parsedQr: parsedFg
        });
      }
      return;
    }

    // Check matching product
    const matchingProd = products.find(p => p.barcode === code || p.itemCode.toUpperCase() === code.toUpperCase());
    if (matchingProd) {
      if (mode === 'PUTAWAY') {
        // Set up generic QR for this product
        const genericFg = parseFinishedGoodsQrCode(SAMPLE_FG_QR_CODE);
        genericFg.productName = matchingProd.itemName;
        setParsedFgQr(genericFg);
        setPutawayStep(2);
      } else {
        doLookup(matchingProd.itemCode);
      }
      return;
    }

    // Default: Run general lookup
    doLookup(code);
  };

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
      return;
    }

    // 3. Check if Batch or Pallet in any slot
    for (const r of Object.values(racks)) {
      for (const s of Object.values(r.slots)) {
        if (s.pallet && (
          s.pallet.batchNo.toUpperCase() === q ||
          s.pallet.palletId.toUpperCase() === q ||
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

  // Calculate carton quantity and validation for both options
  const boxCountOption1 = Math.max(0, cartonEnd - cartonStart + 1);
  const isBoxCountValidOption1 = boxCountOption1 > 0 && boxCountOption1 <= 15;

  const boxCountOption2 = scannedCartons.length;
  const isBoxCountValidOption2 = boxCountOption2 >= 2 && boxCountOption2 <= 15;

  const calculatedBoxCount = putawayOption === 'OPTION_1_RANGE' ? boxCountOption1 : boxCountOption2;
  const isBoxCountValid = putawayOption === 'OPTION_1_RANGE' ? isBoxCountValidOption1 : isBoxCountValidOption2;

  // Submit Putaway
  const handleFinalPutawaySubmit = () => {
    if (!targetSlot || !parsedFgQr || !isBoxCountValid) return;

    if (isTargetSlotBlocked) {
      soundManager.playScanError();
      alert(`PENEMPATAN DIBLOKIR: Slot ${targetSlot} sedang TERKENDALA DI LAPANGAN (${targetSlotBlockedReason}). Tidak dapat diisikan pallet IC! Harap pilih slot lain.`);
      return;
    }

    const matchedProduct = products.find(p => p.itemCode === 'FG-COF-122') || products[0];

    const cartonRangeStr = putawayOption === 'OPTION_1_RANGE'
      ? `D${String(cartonStart).padStart(3, '0')} - D${String(cartonEnd).padStart(3, '0')} (${calculatedBoxCount} Box)`
      : `${scannedCartons.length} Box (${scannedCartons.map(c => `D${String(c.cartonNumber).padStart(3, '0')}`).join(', ')})`;

    const defaultNote = putawayOption === 'OPTION_1_RANGE'
      ? `Putaway Opsi 1 (scan-range) (Range D${cartonStart}-D${cartonEnd}) oleh ${currentUserName}`
      : `Putaway Opsi 2 (scan allbox) (${scannedCartons.length} Karton ter-scan) oleh ${currentUserName}`;

    onExecutePutaway(targetSlot, {
      itemCode: matchedProduct.itemCode,
      itemName: parsedFgQr.productName || matchedProduct.itemName,
      quantityBox: calculatedBoxCount,
      batchNo: parsedFgQr.batchNo,
      packingLine: parsedFgQr.packingLine,
      productPin: parsedFgQr.productPin,
      cartonStart: putawayOption === 'OPTION_1_RANGE' ? cartonStart : undefined,
      cartonEnd: putawayOption === 'OPTION_1_RANGE' ? cartonEnd : undefined,
      cartonRangeText: cartonRangeStr,
      scannedCartons: putawayOption === 'OPTION_2_SCAN_ALL' ? scannedCartons : undefined,
      productionDate: '2026-06-30',
      productionTime: parsedFgQr.productionTimeFormatted || '14:35 WIB',
      expiryDate: '2028-06-30',
      rawQrCode: parsedFgQr.rawString || SAMPLE_FG_QR_CODE,
      palletNumber: palletNumber.trim() || `PLT-${Date.now().toString().slice(-4)}`,
      rackingOption: putawayOption === 'OPTION_1_RANGE' ? 'RANGE' : 'MULTI_SCAN',
      icStatus: icStatus,
      notes: operatorNote.trim() ? `${operatorNote.trim()} | ${defaultNote}` : defaultNote
    });

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
                    ? 'Langkah 2 Aktif: Masukkan Rentang Nomor Karton & ID Pallet pada Form di Bawah'
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
                type="text"
                value={scannedInput}
                onChange={(e) => setScannedInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'PUTAWAY'
                    ? putawayOption === 'OPTION_1_RANGE'
                      ? putawayStep === 1
                        ? 'Tembak scanner gun ke QR Box FG (atau ketik & Enter)...'
                        : putawayStep === 2
                        ? '(Langkah 2: Isi formulir nomor karton & ID pallet di bawah)...'
                        : 'Tembak scanner gun ke QR Rak fisik (contoh: RAK-A-P1)...'
                      : putawayStep === 1
                      ? `Tembak scanner gun ke QR karton box ke-${scannedCartons.length + 1}...`
                      : 'Tembak scanner gun ke QR Rak fisik (contoh: RAK-A-P1)...'
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
          </div>

          {/* Quick Activation Bar if Camera is Inactive */}
          {!cameraActive && (
            <div className="flex items-center justify-between p-2.5 bg-cyan-50/70 border border-cyan-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-cyan-900">
                <Camera className="w-4 h-4 text-cyan-700 shrink-0" />
                <span className="font-semibold">
                  Akses kamera belum aktif. Klik tombol di kanan untuk mulai scan langsung dengan kamera HP Anda.
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
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover" 
              />
              {/* Animated Scanner Laser */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse"></div>
              <div className="absolute top-2 left-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs flex items-center gap-1.5 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Kamera Aktif &bull; Arahkan ke QR Box / QR Rak</span>
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
          {/* ================= MODE: PUTAWAY (2 PILIHAN METODE RACKING) ================= */}
          {mode === 'PUTAWAY' && (
            <div className="space-y-4">
              {putawaySuccess ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="text-xl font-black text-emerald-900">
                    Pallet Berhasil Disimpan ke Rak!
                  </h3>
                  <div className="p-4 bg-white rounded-xl border border-emerald-200 max-w-lg mx-auto text-left text-xs space-y-1.5 text-slate-700">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nomor Pallet:</span>
                      <span className="font-mono font-bold text-slate-900">{palletNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Metode:</span>
                      <span className="font-semibold text-emerald-800">
                        {putawayOption === 'OPTION_1_RANGE' ? 'Opsi 1: Range Karton' : 'Opsi 2: Scan Semua Karton'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Produk:</span>
                      <span className="font-bold text-slate-900">{parsedFgQr?.productName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jumlah:</span>
                      <span className="font-bold text-slate-900">{calculatedBoxCount} BOX (Maks 15)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lokasi Slot Rak:</span>
                      <span className="font-mono font-bold text-cyan-800">{targetSlot}</span>
                    </div>
                    {operatorNote && (
                      <div className="pt-1 border-t border-slate-100 flex justify-between">
                        <span className="text-slate-400">Catatan Operator:</span>
                        <span className="italic text-slate-600">{operatorNote}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setPutawaySuccess(false);
                        setPutawayStep(1);
                        setScannedCartons([]);
                        setOperatorNote('');
                        setPalletNumber(`PLT-${Date.now().toString().slice(-4)}`);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Input Pallet Lainnya
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-white text-slate-700 border border-slate-300 text-xs font-bold rounded-xl hover:bg-slate-100 transition cursor-pointer"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Banner Metode Terpilih (Sesuai Pilihan pada Halaman Luar) */}
                  <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-2.5">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-white shadow-2xs ${
                        putawayOption === 'OPTION_1_RANGE' ? 'bg-cyan-600' : 'bg-emerald-600'
                      }`}>
                        {putawayOption === 'OPTION_1_RANGE' ? <Hash className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                        {putawayOption === 'OPTION_1_RANGE' ? 'Metode: Opsi 1 (scan-range)' : 'Metode: Opsi 2 (scan allbox)'}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {putawayOption === 'OPTION_1_RANGE'
                          ? 'Scan 1 QR Box FG, tentukan rentang no. karton (maks 15 box) & scan slot rak'
                          : 'Scan barcode semua karton satu per satu (min 2, maks 15 box) & scan slot rak'}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      Maks 15 Box
                    </span>
                  </div>

                  {/* ============================================================== */}
                  {/* OPSI 1: SCAN 1 QR + INPUT RANGE CARTON + NO PALLET + SCAN RAK */}
                  {/* ============================================================== */}
                  {putawayOption === 'OPTION_1_RANGE' && (
                    <>
                      {/* Step Progress Header Opsi 1 */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              putawayStep === 1 ? 'bg-cyan-600 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              1
                            </span>
                            <span className={putawayStep === 1 ? 'text-cyan-900 font-extrabold' : 'text-slate-500'}>
                              Scan 1 QR Box FG
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              putawayStep === 2 ? 'bg-cyan-600 text-white' : putawayStep > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              2
                            </span>
                            <span className={putawayStep === 2 ? 'text-cyan-900 font-extrabold' : 'text-slate-500'}>
                              Range Karton & No Pallet
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              putawayStep === 3 ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              3
                            </span>
                            <span className={putawayStep === 3 ? 'text-cyan-900 font-extrabold' : 'text-slate-500'}>
                              Scan QR Rak & Simpan
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* STEP 1: SCAN PRODUCT QR */}
                      {putawayStep === 1 && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <QrCode className="w-4 h-4 text-cyan-600" />
                                Langkah 1: Scan QR Code Salah Satu Box di Pallet
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Sistem otomatis mengurai Packing Line, Nomor Batch, PIN Produk, Tanggal & Jam Produksi.
                              </p>
                            </div>
                            <span className="text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 rounded-md">
                              Maks 15 Box / Pallet
                            </span>
                          </div>

                          {/* Quick Sample Button */}
                          <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                            <div className="text-xs text-cyan-950 flex items-center gap-2">
                              <Scan className="w-4 h-4 text-cyan-700 shrink-0" />
                              <div>
                                <span className="font-bold block">Scan barcode fisik otomatis masuk ke kolom input pemindai di atas.</span>
                                <span className="text-[11px] text-slate-500">Atau uji coba sistem langsung dengan contoh label:</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleBarcodeDetected(SAMPLE_FG_QR_CODE)}
                              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-lg transition cursor-pointer shrink-0 shadow-xs"
                            >
                              Gunakan Contoh QR
                            </button>
                          </div>

                          {parsedFgQr && (
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <div className="flex items-center gap-2">
                                  <span className="bg-emerald-600 text-white text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                                    {parsedFgQr.packingLineName}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800">
                                    Batch: {parsedFgQr.batchNo} ({parsedFgQr.batchYear})
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-cyan-700">
                                  PIN #{parsedFgQr.productPin}
                                </span>
                              </div>

                              <h4 className="font-extrabold text-slate-900 text-base">
                                {parsedFgQr.productName}
                              </h4>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Karton Terbaca</span>
                                  <span className="font-mono font-bold text-slate-800">{parsedFgQr.cartonNumberFormatted}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Waktu Produksi</span>
                                  <span className="font-semibold text-slate-800">{parsedFgQr.productionTimeFormatted}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tgl Produksi</span>
                                  <span className="font-semibold text-slate-800">{parsedFgQr.productionDateFormatted}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Best Before</span>
                                  <span className="font-semibold text-slate-800">{parsedFgQr.bestBeforeFormatted}</span>
                                </div>
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setPutawayStep(2)}
                                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2"
                                >
                                  <span>Lanjut: Input Range Karton (Langkah 2)</span>
                                  <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* STEP 2: INPUT CARTON RANGE + PALLET NUMBER + NOTE */}
                      {putawayStep === 2 && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Hash className="w-4 h-4 text-cyan-600" />
                                Langkah 2: Input Rentang Nomor Karton, Nomor Pallet & Catatan
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Batasan maksimal adalah 15 box dalam 1 pallet. Berikan note untuk memastikan operator mengetahui range sudah benar.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPutawayStep(1)}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Kembali</span>
                            </button>
                          </div>

                          {/* Range Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200">
                            <div>
                              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 mb-1.5">
                                Nomor Karton Awal
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="w-12 h-12 sm:h-13 flex items-center justify-center bg-slate-200/90 border-2 border-slate-300 rounded-xl text-lg font-mono font-black text-slate-700 shrink-0">
                                  D
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  value={cartonStart}
                                  onChange={(e) => setCartonStart(parseInt(e.target.value, 10) || 1)}
                                  className="w-full h-12 sm:h-13 px-4 bg-white border-2 border-slate-300 rounded-xl font-mono text-xl sm:text-2xl font-black text-slate-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 mb-1.5">
                                Nomor Karton Akhir
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="w-12 h-12 sm:h-13 flex items-center justify-center bg-slate-200/90 border-2 border-slate-300 rounded-xl text-lg font-mono font-black text-slate-700 shrink-0">
                                  D
                                </span>
                                <input
                                  type="number"
                                  min={1}
                                  value={cartonEnd}
                                  onChange={(e) => setCartonEnd(parseInt(e.target.value, 10) || 1)}
                                  className="w-full h-12 sm:h-13 px-4 bg-white border-2 border-slate-300 rounded-xl font-mono text-xl sm:text-2xl font-black text-slate-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Live Calculation & Validation Badge */}
                          <div className={`p-4 rounded-xl border text-xs ${
                            isBoxCountValidOption1
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-bold">
                                Total Muatan: <strong>{calculatedBoxCount} BOX</strong>
                                <span className="text-slate-500 ml-1">
                                  ({calculatedBoxCount * 30} Kg Netto &bull; {calculatedBoxCount * 32.05} Kg Gross)
                                </span>
                              </span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                isBoxCountValidOption1 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                              }`}>
                                {isBoxCountValidOption1 ? '✓ Valid (Maks 15 Box)' : '⚠ Tidak Valid'}
                              </span>
                            </div>

                            {calculatedBoxCount > 15 && (
                              <p className="text-xs font-bold text-rose-700 mt-1">
                                Peringatan: 1 Pallet maksimal berisi 15 Box! Saat ini terhitung {calculatedBoxCount} Box. Harap sesuaikan range nomor karton.
                              </p>
                            )}
                            {calculatedBoxCount <= 0 && (
                              <p className="text-xs font-bold text-rose-700 mt-1">
                                Nomor karton akhir harus lebih besar atau sama dengan nomor awal.
                              </p>
                            )}
                            {isBoxCountValidOption1 && (
                              <p className="text-xs font-semibold text-emerald-700 mt-1">
                                Rentang valid: D{String(cartonStart).padStart(3, '0')} s/d D{String(cartonEnd).padStart(3, '0')} ({calculatedBoxCount} Box).
                              </p>
                            )}
                          </div>

                          {/* Pallet Number & Operator Note Input */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 mb-1.5">
                                Nomor Pallet (ID Pallet)
                              </label>
                              <input
                                type="text"
                                value={palletNumber}
                                onChange={(e) => setPalletNumber(e.target.value.toUpperCase())}
                                placeholder="Contoh: PLT-A-01"
                                className="w-full h-12 sm:h-13 px-4 bg-white border-2 border-slate-300 rounded-xl font-mono font-black text-base sm:text-lg text-slate-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 uppercase placeholder:font-normal placeholder:text-slate-400"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 mb-1.5">
                                Catatan / Note Operator (Pemeriksaan Range)
                              </label>
                              <input
                                type="text"
                                value={operatorNote}
                                onChange={(e) => setOperatorNote(e.target.value)}
                                placeholder="Contoh: Range fisik verified D072-D086, kondisi karton baik"
                                className="w-full h-12 sm:h-13 px-4 bg-white border-2 border-slate-300 rounded-xl text-sm sm:text-base font-semibold text-slate-900 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100 placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* Pilihan Status IC (OK, HOLD, BO) - Default: OK */}
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                                Status IC Pallet (Inspection & Control):
                              </label>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Default: <strong className="text-emerald-700">OK</strong>
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setIcStatus('OK')}
                                className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  icStatus === 'OK'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>OK (Normal)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIcStatus('HOLD')}
                                className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  icStatus === 'HOLD'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <AlertCircle className="w-4 h-4" />
                                <span>HOLD (QC)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIcStatus('BO')}
                                className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  icStatus === 'BO'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/20'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                <span>BO (Rework)</span>
                              </button>
                            </div>
                          </div>

                          {/* Visual Stacked Carton Box Preview */}
                          {isBoxCountValidOption1 && (
                            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                              <span className="text-[11px] font-bold text-slate-600 block">
                                Preview Susunan {calculatedBoxCount} Box dalam Pallet:
                              </span>
                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                {Array.from({ length: calculatedBoxCount }, (_, i) => cartonStart + i).map(cNum => (
                                  <span
                                    key={cNum}
                                    className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[10px] font-bold rounded"
                                  >
                                    D{String(cNum).padStart(3, '0')}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="pt-2">
                            <button
                              type="button"
                              disabled={!isBoxCountValidOption1}
                              onClick={() => setPutawayStep(3)}
                              className={`w-full py-2.5 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                                isBoxCountValidOption1
                                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <span>Lanjut: Scan QR Code Rak Tujuan (Langkah 3)</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: SCAN RACK QR & CONFIRM STORAGE */}
                      {putawayStep === 3 && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Tag className="w-4 h-4 text-cyan-600" />
                                Langkah 3: Scan QR Code Rak yang Dituju untuk Penyimpanan
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Arahkan scanner ke sticker QR fisik pada tiang rak (Contoh: RAK-A-P1 s/d RAK-A-P4).
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPutawayStep(2)}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Kembali</span>
                            </button>
                          </div>

                          {/* Target Slot Input / Selector */}
                          <div className="space-y-2">
                            <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                              Kode Slot Rak Terpilih:
                            </label>
                            <input
                              type="text"
                              value={targetSlot}
                              onChange={(e) => setTargetSlot(e.target.value.toUpperCase())}
                              placeholder="Contoh: A1a, F2b, A3m"
                              className={`w-full h-13 sm:h-14 px-4 bg-white border-2 rounded-xl font-mono text-xl sm:text-2xl font-black uppercase tracking-wide placeholder:font-normal placeholder:text-slate-400 ${
                                isTargetSlotBlocked 
                                  ? 'border-rose-500 text-rose-900 bg-rose-50/50 focus:border-rose-600 focus:ring-rose-200' 
                                  : 'border-slate-300 text-cyan-950 focus:border-cyan-500 focus:ring-cyan-100'
                              }`}
                            />

                            {/* Alert jika slot yang dipilih terkendala di lapangan */}
                            {isTargetSlotBlocked && (
                              <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2 animate-in fade-in">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-black uppercase block">SLOT TERKENDALA DI LAPANGAN (DIBLOKIR):</span>
                                  <span className="font-semibold">
                                    Slot {targetSlot} mengalami kendala fisik: <em>"{targetSlotBlockedReason}"</em>. Sistem memblokir pengisian pallet IC ke slot ini. Harap pilih slot kosong lainnya.
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Quick Empty Slot Buttons */}
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <span className="text-xs font-bold text-slate-600">Pilih Cepat Slot Ready:</span>
                              {readyEmptySlots.map(sCode => (
                                <button
                                  key={sCode}
                                  type="button"
                                  onClick={() => setTargetSlot(sCode)}
                                  className={`px-3 py-1.5 text-xs sm:text-sm font-mono font-bold rounded-xl transition cursor-pointer ${
                                    targetSlot === sCode
                                      ? 'bg-cyan-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                  }`}
                                >
                                  {sCode}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Storage Recap Card */}
                          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                              Ringkasan Penyimpanan Pallet - Opsi 1 (scan-range)
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-slate-800">
                              <div>
                                <span className="text-slate-400 block text-[10px]">NOMOR PALLET</span>
                                <span className="font-mono font-bold text-slate-900">{palletNumber}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">PRODUK</span>
                                <span className="font-bold">{parsedFgQr?.productName}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">LINE & BATCH</span>
                                <span className="font-bold">{parsedFgQr?.packingLineName} &bull; Batch {parsedFgQr?.batchNo}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">RENTANG KARTON</span>
                                <span className="font-bold">D{String(cartonStart).padStart(3, '0')} s/d D{String(cartonEnd).padStart(3, '0')} ({calculatedBoxCount} Box)</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">LOKASI TUJUAN</span>
                                <span className="font-mono font-black text-cyan-800">{targetSlot}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">STATUS IC</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  icStatus === 'BO'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : icStatus === 'HOLD'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}>
                                  {icStatus === 'BO' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>}
                                  {icStatus === 'HOLD' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>}
                                  {icStatus} {icStatus === 'BO' ? '(Rework)' : icStatus === 'HOLD' ? '(Hold QC)' : '(Normal)'}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 block text-[10px]">NOTE OPERATOR</span>
                                <span className="italic text-slate-700">{operatorNote || 'Tidak ada catatan'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleFinalPutawaySubmit}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Check className="w-5 h-5 stroke-[2.5]" />
                              Konfirmasi Simpan ke Rak {targetSlot} (Submit 1 Pallet)
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ============================================================== */}
                  {/* OPSI 2: SCAN SEMUA QR PRODUK (MIN 2, MAKS 15) + NO PALLET + SCAN RAK */}
                  {/* ============================================================== */}
                  {putawayOption === 'OPTION_2_SCAN_ALL' && (
                    <>
                      {/* Step Progress Header Opsi 2 */}
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              putawayStep === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              1
                            </span>
                            <span className={putawayStep === 1 ? 'text-emerald-900 font-extrabold' : 'text-slate-500'}>
                              Scan Semua QR Karton ({scannedCartons.length}/15) & No. Pallet
                            </span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300" />
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                              putawayStep === 2 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              2
                            </span>
                            <span className={putawayStep === 2 ? 'text-emerald-900 font-extrabold' : 'text-slate-500'}>
                              Scan QR Rak & Simpan
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* STEP 1: SCAN ALL CARTONS */}
                      {putawayStep === 1 && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Layers className="w-4 h-4 text-emerald-600" />
                                Langkah 1: Scan Semua QR Code Produk dalam 1 Pallet
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Operator memindai satu demi satu barcode produk. Batasan: <strong>Minimal 2 Carton & Maksimal 15 Carton</strong>.
                              </p>
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                              scannedCartons.length >= 2 && scannedCartons.length <= 15
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}>
                              {scannedCartons.length} / 15 Box Ter-scan
                            </span>
                          </div>

                          {/* Quick Simulate Button for Testing/Demo without physical scanner */}
                          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs text-emerald-950 flex items-center gap-2">
                              <Scan className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>Tembakkan scanner gun fisik (atau kamera) ke QR karton — data otomatis terinput di kolom atas.</span>
                            </div>
                            <button
                              type="button"
                              disabled={scannedCartons.length >= 15}
                              onClick={() => {
                                const nextNum = scannedCartons.length > 0 
                                  ? Math.max(...scannedCartons.map(c => c.cartonNumber)) + 1 
                                  : 72;
                                const simQr = `PA274/26/FG-COF-122/${String(nextNum).padStart(3, '0')}/2026-06-30/14:35`;
                                handleBarcodeDetected(simQr);
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 shadow-xs ${
                                scannedCartons.length >= 15
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              + Tes Simulasi Scan (D{String((scannedCartons.length > 0 ? Math.max(...scannedCartons.map(c => c.cartonNumber)) : 71) + 1).padStart(3, '0')})
                            </button>
                          </div>

                          {option2Notice && (
                            <div className="p-2.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-xl text-xs flex items-center justify-between">
                              <span>{option2Notice}</span>
                              <button
                                type="button"
                                onClick={() => setOption2Notice(null)}
                                className="text-cyan-600 hover:text-cyan-900 cursor-pointer font-bold"
                              >
                                &times;
                              </button>
                            </div>
                          )}

                          {/* Scanned Cartons Table */}
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                              <span>Daftar Karton Ter-scan ({scannedCartons.length} Box)</span>
                              {scannedCartons.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setScannedCartons([])}
                                  className="text-rose-600 hover:text-rose-800 text-[11px] font-bold cursor-pointer"
                                >
                                  Hapus Semua
                                </button>
                              )}
                            </div>

                            {scannedCartons.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-xs">
                                Belum ada karton yang di-scan. Scan barcode QR produk di pallet untuk memulai (minimal 2 karton).
                              </div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                                {scannedCartons.map((item, idx) => (
                                  <div key={item.cartonNumber} className="px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-50">
                                    <div className="flex items-center gap-3">
                                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                                        {idx + 1}
                                      </span>
                                      <span className="font-mono font-black text-slate-900 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded">
                                        {item.cartonFormatted}
                                      </span>
                                      <span className="text-slate-600 text-[11px] truncate max-w-xs">
                                        {item.productName}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="text-[10px] text-slate-400 font-mono">{item.scannedAt}</span>
                                      <button
                                        type="button"
                                        onClick={() => setScannedCartons(prev => prev.filter(c => c.cartonNumber !== item.cartonNumber))}
                                        className="text-rose-500 hover:text-rose-700 text-xs font-bold p-1 cursor-pointer"
                                        title="Hapus karton ini"
                                      >
                                        &times;
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Validation Alert */}
                          {scannedCartons.length < 2 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Syarat Opsi 2: Minimal 2 karton harus di-scan sebelum dapat melanjutkan ke pemilihan rak (Saat ini: {scannedCartons.length} Box).</span>
                            </div>
                          )}

                          {/* Pallet Number & Operator Note Input */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 mb-1.5">
                                Nomor Pallet (ID Pallet)
                              </label>
                              <input
                                type="text"
                                value={palletNumber}
                                onChange={(e) => setPalletNumber(e.target.value.toUpperCase())}
                                placeholder="Contoh: PLT-A-02"
                                className="w-full h-12 sm:h-13 px-4 bg-white border-2 border-slate-300 rounded-xl font-mono font-black text-base sm:text-lg text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 uppercase placeholder:font-normal placeholder:text-slate-400"
                              />
                            </div>

                            <div>
                              <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 mb-1.5">
                                Catatan Operator (Opsional)
                              </label>
                              <input
                                type="text"
                                value={operatorNote}
                                onChange={(e) => setOperatorNote(e.target.value)}
                                placeholder="Contoh: Pallet utuh 15 carton, kondisi kemasan baik"
                                className="w-full h-12 sm:h-13 px-4 bg-white border-2 border-slate-300 rounded-xl text-sm sm:text-base font-semibold text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 placeholder:text-slate-400"
                              />
                            </div>
                          </div>

                          {/* Pilihan Status IC (OK, HOLD, BO) - Default: OK */}
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                                Status IC Pallet (Inspection & Control):
                              </label>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Default: <strong className="text-emerald-700">OK</strong>
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setIcStatus('OK')}
                                className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  icStatus === 'OK'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/20'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>OK (Normal)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIcStatus('HOLD')}
                                className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  icStatus === 'HOLD'
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/20'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <AlertCircle className="w-4 h-4" />
                                <span>HOLD (QC)</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setIcStatus('BO')}
                                className={`py-2 px-3 rounded-xl border-2 font-black text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 ${
                                  icStatus === 'BO'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/20'
                                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                <span>BO (Rework)</span>
                              </button>
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              disabled={!isBoxCountValidOption2}
                              onClick={() => setPutawayStep(2)}
                              className={`w-full py-3 sm:py-3.5 font-black text-sm rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                                isBoxCountValidOption2
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <span>Lanjut: Scan QR Code Rak Tujuan (Langkah 2)</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: SCAN RACK QR & CONFIRM STORAGE */}
                      {putawayStep === 2 && (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Tag className="w-4 h-4 text-emerald-600" />
                                Langkah 2: Scan QR Code Rak yang Dituju untuk Penyimpanan
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Arahkan scanner ke sticker QR fisik pada tiang rak (Contoh: RAK-A-P1 s/d RAK-A-P4).
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPutawayStep(1)}
                              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                              <span>Kembali</span>
                            </button>
                          </div>

                          {/* Target Slot Input / Selector */}
                          <div className="space-y-2">
                            <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                              Kode Slot Rak Terpilih:
                            </label>
                            <input
                              type="text"
                              value={targetSlot}
                              onChange={(e) => setTargetSlot(e.target.value.toUpperCase())}
                              placeholder="Contoh: A1a, F2b, A3m"
                              className={`w-full h-13 sm:h-14 px-4 bg-white border-2 rounded-xl font-mono text-xl sm:text-2xl font-black uppercase tracking-wide placeholder:font-normal placeholder:text-slate-400 ${
                                isTargetSlotBlocked 
                                  ? 'border-rose-500 text-rose-900 bg-rose-50/50 focus:border-rose-600 focus:ring-rose-200' 
                                  : 'border-slate-300 text-emerald-950 focus:border-emerald-500 focus:ring-emerald-100'
                              }`}
                            />

                            {/* Alert jika slot yang dipilih terkendala di lapangan */}
                            {isTargetSlotBlocked && (
                              <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 flex items-start gap-2 animate-in fade-in">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-black uppercase block">SLOT TERKENDALA DI LAPANGAN (DIBLOKIR):</span>
                                  <span className="font-semibold">
                                    Slot {targetSlot} mengalami kendala fisik: <em>"{targetSlotBlockedReason}"</em>. Sistem memblokir pengisian pallet IC ke slot ini. Harap pilih slot kosong lainnya.
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Quick Empty Slot Buttons */}
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <span className="text-xs font-bold text-slate-600">Pilih Cepat Slot Ready:</span>
                              {readyEmptySlots.map(sCode => (
                                <button
                                  key={sCode}
                                  type="button"
                                  onClick={() => setTargetSlot(sCode)}
                                  className={`px-3 py-1.5 text-xs sm:text-sm font-mono font-bold rounded-xl transition cursor-pointer ${
                                    targetSlot === sCode
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                                  }`}
                                >
                                  {sCode}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Storage Recap Card */}
                          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                              Ringkasan Penyimpanan Pallet - Opsi 2 (scan allbox)
                            </span>
                            <div className="grid grid-cols-2 gap-2 text-slate-800">
                              <div>
                                <span className="text-slate-400 block text-[10px]">NOMOR PALLET</span>
                                <span className="font-mono font-bold text-slate-900">{palletNumber}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">PRODUK</span>
                                <span className="font-bold">{parsedFgQr?.productName}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">TOTAL KARTON</span>
                                <span className="font-bold">{scannedCartons.length} Box (Min 2, Maks 15)</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">LOKASI TUJUAN</span>
                                <span className="font-mono font-black text-emerald-800">{targetSlot}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 block text-[10px]">STATUS IC</span>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                                  icStatus === 'BO'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : icStatus === 'HOLD'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                }`}>
                                  {icStatus === 'BO' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>}
                                  {icStatus === 'HOLD' && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></span>}
                                  {icStatus} {icStatus === 'BO' ? '(Rework)' : icStatus === 'HOLD' ? '(Hold QC)' : '(Normal)'}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-400 block text-[10px]">DAFTAR NO KARTON</span>
                                <span className="font-mono font-bold text-slate-700">
                                  {scannedCartons.map(c => c.cartonFormatted).join(', ')}
                                </span>
                              </div>
                              {operatorNote && (
                                <div className="col-span-2">
                                  <span className="text-slate-400 block text-[10px]">CATATAN OPERATOR</span>
                                  <span className="italic text-slate-700">{operatorNote}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleFinalPutawaySubmit}
                              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-sm rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                            >
                              <Check className="w-5 h-5 stroke-[2.5]" />
                              Konfirmasi Simpan ke Rak {targetSlot} (Submit 1 Pallet)
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
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

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">PIN PRODUK</span>
                          <span className="font-bold text-slate-800">{lookupResult.parsedQr.productPin}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">NOMOR KARTON</span>
                          <span className="font-mono font-bold text-emerald-700">{lookupResult.parsedQr.cartonNumberFormatted}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">WAKTU PROSES</span>
                          <span className="font-semibold text-slate-800">{lookupResult.parsedQr.productionTimeFormatted}</span>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-cyan-100">
                          <span className="text-slate-400 block text-[10px]">BEST BEFORE</span>
                          <span className="font-semibold text-slate-800">{lookupResult.parsedQr.bestBeforeFormatted}</span>
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
    </div>
  );
};
