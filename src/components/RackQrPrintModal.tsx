/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  X, 
  QrCode, 
  Check, 
  ExternalLink,
  AlertCircle,
  Copy,
  Sliders,
  Info,
  Wifi,
  Download,
  Terminal,
  Send,
  Server,
  Settings,
  CheckCircle2,
  RefreshCw,
  FileCode
} from 'lucide-react';
import { RackData } from '../types';
import { QrCodeRenderer } from './BarcodeRenderer';
import QRCode from 'qrcode';

interface RackQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: Record<string, RackData>;
  initialRackId?: string;
}

// Generate authentic, 100% scannable ISO/IEC compliant QR code SVG
function generateQrSvgString(value: string, size: number = 140, bgColor: string = '#ffffff', fgColor: string = '#000000'): string {
  try {
    const cleanVal = (value || '').trim() || 'N/A';
    const qr = QRCode.create(cleanVal, { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const margin = 2; // Quiet zone standard for camera scanning
    const totalCount = count + margin * 2;
    const cellSize = size / totalCount;

    let rects = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.modules.get(r, c)) {
          const x = ((c + margin) * cellSize).toFixed(2);
          const y = ((r + margin) * cellSize).toFixed(2);
          const w = (cellSize + 0.15).toFixed(2);
          const h = (cellSize + 0.15).toFixed(2);
          rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fgColor}" />`;
        }
      }
    }

    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="display:block;"><rect width="${size}" height="${size}" fill="${bgColor}" />${rects}</svg>`;
  } catch (err) {
    console.error('Failed to generate standard QR SVG:', err);
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><rect width="${size}" height="${size}" fill="${bgColor}" /></svg>`;
  }
}

export const RackQrPrintModal: React.FC<RackQrPrintModalProps> = ({
  isOpen,
  onClose,
  racks,
  initialRackId = 'A'
}) => {
  const [selectedRackId, setSelectedRackId] = useState(initialRackId || 'A');
  const [selectedBay, setSelectedBay] = useState<string>('a');
  const [enableAlternatingColors, setEnableAlternatingColors] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Intermec Printer configuration state
  const [showIntermecModal, setShowIntermecModal] = useState<boolean>(false);
  const [intermecIp, setIntermecIp] = useState<string>(() => localStorage.getItem('sikutang_intermec_ip') || '192.168.1.150');
  const [intermecPort, setIntermecPort] = useState<string>(() => localStorage.getItem('sikutang_intermec_port') || '9100');
  const [intermecModel, setIntermecModel] = useState<string>(() => localStorage.getItem('sikutang_intermec_model') || 'PC43d');
  const [intermecProtocol, setIntermecProtocol] = useState<'DP' | 'IPL'>('DP');
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [isSendingRawJob, setIsSendingRawJob] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [showScriptPreview, setShowScriptPreview] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('sikutang_intermec_ip', intermecIp);
  }, [intermecIp]);

  useEffect(() => {
    localStorage.setItem('sikutang_intermec_port', intermecPort);
  }, [intermecPort]);

  useEffect(() => {
    localStorage.setItem('sikutang_intermec_model', intermecModel);
  }, [intermecModel]);

  const currentRack = racks[selectedRackId] || Object.values(racks)[0];

  // Dynamic bays extracted from current rack master slots (e.g. 'a' through 'm')
  const availableBays = useMemo(() => {
    if (!currentRack) return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'];
    
    // Check baysList
    if (currentRack.baysList && currentRack.baysList.length > 0) {
      const nonP = currentRack.baysList.filter(b => !b.toLowerCase().startsWith('p'));
      if (nonP.length > 0) return nonP.map(b => b.toLowerCase());
    }

    // Extract from slots
    const baySet = new Set<string>();
    Object.values(currentRack.slots || {}).forEach(s => {
      if (s.bay && !s.bay.toLowerCase().startsWith('p')) {
        baySet.add(s.bay.toLowerCase());
      }
    });

    const list = Array.from(baySet).sort();
    return list.length > 0 ? list : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'];
  }, [currentRack]);

  // Ensure selectedBay is valid when rack or availableBays changes
  useEffect(() => {
    if (selectedBay !== 'ALL' && !availableBays.includes(selectedBay)) {
      setSelectedBay(availableBays[0] || 'a');
    }
  }, [availableBays, selectedBay]);

  if (!isOpen) return null;

  const baysToRender = selectedBay === 'ALL' ? availableBays : [selectedBay];
  const maxLevels = currentRack?.maxLevels || 4;

  const stickers: Array<{
    displayCode: string;
    level: number;
    bay: string;
    isDarkBg: boolean;
  }> = [];

  for (const b of baysToRender) {
    for (let lvl = 1; lvl <= maxLevels; lvl++) {
      // Alternating color logic requested by user:
      // Level 1: background putih, qr code hitam
      // Level 2: background hitam, qr code putih
      // Level 3: background putih, qr code hitam
      // Level 4: background hitam, qr code putih
      const isDark = enableAlternatingColors ? lvl % 2 === 0 : false;
      const bayCode = `${selectedRackId}${lvl}${b}`;

      stickers.push({
        displayCode: bayCode,
        level: lvl,
        bay: b,
        isDarkBg: isDark
      });
    }
  }

  // Generate complete HTML for standalone print document
  const buildPrintHtml = () => {
    const stickersHtml = stickers.map(item => {
      const bgColor = item.isDarkBg ? '#000000' : '#ffffff';
      const textColor = item.isDarkBg ? '#ffffff' : '#000000';
      const subTextColor = item.isDarkBg ? '#cbd5e1' : '#334155';
      const borderColor = item.isDarkBg ? '#ffffff' : '#000000';
      const qrSvg = generateQrSvgString(
        item.displayCode, 
        140, 
        bgColor, 
        item.isDarkBg ? '#ffffff' : '#000000'
      );

      return `
        <div class="sticker-card" style="background-color:${bgColor}; color:${textColor}; border: 2.5px solid ${borderColor};">
          <div class="left-section">
            <div class="header-tag" style="border-bottom: 1.5px solid ${borderColor};">
              <span class="brand">SIKUTANG WMS</span>
              <span class="sub-brand">WMS FGW</span>
            </div>

            <div class="main-code-wrap">
              <span class="code-label" style="color:${subTextColor};">KODE LOKASI RAK</span>
              <div class="main-code">${item.displayCode}</div>
              <div class="alt-code" style="color:${subTextColor};">
                RAK ${selectedRackId} &bull; LEVEL ${item.level} (LOKASI ${item.bay.toLowerCase()})
              </div>
            </div>

            <div class="meta-wrap" style="color:${subTextColor};">
              <div>KAPASITAS 1 RAK: <strong>4 PALLET (60 BOX)</strong></div>
              <div>PERUNTUKAN: <strong>${currentRack?.primaryProduct || 'INSTANT COFFEE'}</strong></div>
            </div>
          </div>

          <div class="right-section">
            <div class="qr-container" style="background-color:${bgColor}; border: 1.5px solid ${borderColor};">
              ${qrSvg}
            </div>
          </div>
        </div>
      `;
    }).join('\n');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Stiker Rak SIKUTANG - Rak ${selectedRackId}</title>
          <style>
            @page {
              size: 90mm 50mm landscape;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background-color: #f1f5f9;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            .no-print {
              display: block;
            }
            .print-bar {
              position: sticky;
              top: 0;
              z-index: 9999;
              background: #0f172a;
              color: #ffffff;
              padding: 12px 20px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.25);
              font-family: sans-serif;
            }
            .print-bar-content {
              max-width: 900px;
              margin: 0 auto;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              flex-wrap: wrap;
            }
            .print-bar-info strong {
              display: block;
              font-size: 14px;
              color: #38bdf8;
            }
            .print-bar-info span {
              font-size: 11px;
              color: #94a3b8;
            }
            .print-bar-actions {
              display: flex;
              gap: 10px;
            }
            .btn-print {
              background: #0284c7;
              color: #ffffff;
              border: none;
              padding: 9px 18px;
              font-size: 13px;
              font-weight: bold;
              border-radius: 8px;
              cursor: pointer;
            }
            .btn-print:hover {
              background: #0369a1;
            }
            .btn-close {
              background: #334155;
              color: #ffffff;
              border: none;
              padding: 9px 16px;
              font-size: 13px;
              border-radius: 8px;
              cursor: pointer;
            }
            .page-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8mm;
              padding: 8mm;
            }
            .sticker-card {
              width: 90mm;
              height: 50mm;
              padding: 3.5mm 4mm;
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-radius: 4px;
              overflow: hidden;
              box-sizing: border-box;
              page-break-after: always;
              break-after: page;
            }
            .left-section {
              width: 53mm;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              padding-right: 2mm;
            }
            .header-tag {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-bottom: 1.5mm;
              font-size: 7.5pt;
              font-weight: 800;
              letter-spacing: 0.5px;
            }
            .brand {
              font-weight: 900;
            }
            .sub-brand {
              font-size: 6.5pt;
              font-weight: 700;
            }
            .main-code-wrap {
              margin-top: 1mm;
            }
            .code-label {
              font-size: 6.5pt;
              font-weight: 700;
              letter-spacing: 0.8px;
              text-transform: uppercase;
              display: block;
            }
            .main-code {
              font-size: 33pt;
              font-weight: 900;
              line-height: 1;
              font-family: 'Courier New', Courier, monospace;
              letter-spacing: -1px;
              margin: 1mm 0;
            }
            .alt-code {
              font-size: 7pt;
              font-weight: 700;
              letter-spacing: 0.2px;
            }
            .meta-wrap {
              font-size: 6pt;
              line-height: 1.35;
              border-top: 1px dotted currentColor;
              padding-top: 1.5mm;
            }
            .right-section {
              width: 35mm;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-container {
              padding: 1.5mm;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            @media print {
              .no-print {
                display: none !important;
              }
              html, body {
                background: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .page-container {
                padding: 0 !important;
                gap: 0 !important;
              }
              .sticker-card {
                border-radius: 0 !important;
                margin: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="no-print print-bar">
            <div class="print-bar-content">
              <div class="print-bar-info">
                <strong>🖨️ Dokumen Stiker Rak ${selectedRackId} (Total ${stickers.length} Lembar)</strong>
                <span>Ukuran Cetak Presisi: 90mm x 50mm | Seling Warna Aktif</span>
              </div>
              <div class="print-bar-actions">
                <button onclick="window.print()" class="btn-print">Cetak Sekarang (Ctrl+P)</button>
                <button onclick="window.close()" class="btn-close">Tutup</button>
              </div>
            </div>
          </div>
          <div class="page-container">
            ${stickersHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;
  };

  // Robust Direct Print across all browsers and container iframes
  const handleDirectPrint = () => {
    const html = buildPrintHtml();
    
    // Strategy 1: Direct window.open with document write (standard and reliable)
    try {
      const printWin = window.open('', '_blank', 'width=950,height=750,menubar=no,toolbar=no,location=no,status=no');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          try {
            printWin.print();
          } catch (e) {
            console.warn('Auto print call failed:', e);
          }
        }, 500);
        return;
      }
    } catch (err) {
      console.warn('Direct popup print caught error:', err);
    }

    // Strategy 2: Blob URL via dynamic link (bypasses popup blockers and iframe restrictions)
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 8000);
      return;
    } catch (err2) {
      console.error('Blob link print failed:', err2);
    }

    // Strategy 3: Direct fallback
    window.print();
  };

  // Open standalone print tab via Blob
  const handleOpenPrintTab = () => {
    const html = buildPrintHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 8000);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Generate Intermec Direct Protocol (DP) script
  const generateIntermecDpCode = (singleStickerCode?: string) => {
    const targetStickers = singleStickerCode ? stickers.filter(s => s.displayCode === singleStickerCode) : stickers;
    return targetStickers.map(item => `
OPTIMIZE "BATCH" ON
SETUP "MEDIA,MEDIA TYPE,LABEL (w GAPS)"
SETUP "MEDIA,PRINT METHOD,DIRECT THERMAL"
CLIP ON
LBLSIZE 500,900
LBLCOND 3,0
C
PRPOS 40,460
DIR 1
ALIGN 1
FONT "Swiss 721 BT",10
PRTXT "SIKUTANG WMS FGW"
PRPOS 40,380
FONT "Swiss 721 Bold BT",26
PRTXT "${item.displayCode}"
PRPOS 40,300
FONT "Swiss 721 BT",9
PRTXT "RAK ${selectedRackId} LEVEL ${item.level} (LOKASI ${item.bay.toLowerCase()})"
PRPOS 40,240
PRTXT "KAPASITAS 1 RAK: 4 PALLET (60 BOX)"
PRPOS 40,190
PRTXT "PERUNTUKAN: ${currentRack?.primaryProduct || 'FINISHED GOODS'}"
PRPOS 480,460
BARCODE "QR",7
BARDATA "${item.displayCode}"
BARPRINT
PRINT 1
`).join('\n');
  };

  // Generate Intermec IPL script
  const generateIntermecIplCode = (singleStickerCode?: string) => {
    const targetStickers = singleStickerCode ? stickers.filter(s => s.displayCode === singleStickerCode) : stickers;
    return targetStickers.map(item => `
<STX><ESC>C<ETX>
<STX><ESC>P<ETX>
<STX>E4;F4;<ETX>
<STX>H1;o40,40;f3;c26;d3,SIKUTANG WMS FGW;<ETX>
<STX>H2;o40,90;f3;c28;d3,${item.displayCode};<ETX>
<STX>H3;o40,200;f3;c20;d3,RAK ${selectedRackId} LEVEL ${item.level} (LOKASI ${item.bay.toLowerCase()});<ETX>
<STX>H4;o40,240;f3;c20;d3,KAPASITAS 1 RAK: 4 PALLET (60 BOX);<ETX>
<STX>H5;o40,275;f3;c20;d3,PERUNTUKAN: ${currentRack?.primaryProduct || 'FINISHED GOODS'};<ETX>
<STX>B1;o450,40;c6,0;d3,${item.displayCode};<ETX>
<STX>R;<ETX>
<STX><ESC>G1<ETX>
`).join('\n');
  };

  const getActiveIntermecScript = (singleStickerCode?: string) => {
    return intermecProtocol === 'DP'
      ? generateIntermecDpCode(singleStickerCode)
      : generateIntermecIplCode(singleStickerCode);
  };

  const handleDownloadIntermecFile = (singleStickerCode?: string) => {
    const script = getActiveIntermecScript(singleStickerCode);
    const blob = new Blob([script], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stiker_rak_${selectedRackId}_${singleStickerCode || 'all'}_${intermecProtocol.toLowerCase()}.prn`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleCopyIntermecCli = () => {
    const filename = `stiker_rak_${selectedRackId}.prn`;
    const cliCmd = `# Kirim langsung ke IP Printer Intermec port ${intermecPort}:\nnc -w 3 ${intermecIp} ${intermecPort} < ${filename}\n\n# Atau di Windows PowerShell (RAW Socket TCP):\n$client = New-Object System.Net.Sockets.TcpClient('${intermecIp}', ${intermecPort}); $stream = $client.GetStream(); $bytes = [System.IO.File]::ReadAllBytes('${filename}'); $stream.Write($bytes, 0, $bytes.Length); $stream.Close(); $client.Close()`;
    navigator.clipboard.writeText(cliCmd);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleSendToIntermecIp = async () => {
    setIsSendingRawJob(true);
    setTestResult({ status: 'testing', message: `Menghubungi printer Intermec di IP ${intermecIp}:${intermecPort}...` });

    try {
      const script = getActiveIntermecScript();
      await fetch(`http://${intermecIp}:${intermecPort}`, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: script
      });

      setTestResult({
        status: 'success',
        message: `Paket cetak (${stickers.length} stiker) telah dikirim ke IP ${intermecIp}:${intermecPort}! Pastikan printer Intermec dalam status online.`
      });
    } catch {
      setTestResult({
        status: 'warning',
        message: `Browser membatasi socket mentah ke IP lokal ${intermecIp}:${intermecPort}. Gunakan tombol "Download File Cetak (.PRN)" atau hubungkan printer via Driver Windows Standard TCP/IP.`
      });
    } finally {
      setIsSendingRawJob(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      {/* Modal Card */}
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-cyan-400 flex items-center justify-center shadow-xs">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Cetak Stiker QR Code Rak Gudang
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-300">
                  Seling Warna Otomatis
                </span>
              </h3>
              <p className="text-xs text-slate-600">
                Stiker industri siap cetak ke printer label thermal/vinyl. Menampilkan QR Code besar dan seling warna ganjil (putih) & genap (hitam).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-3">
          {/* Select Rack */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 shrink-0">Pilih Rak:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map(rId => (
                <button
                  key={rId}
                  onClick={() => setSelectedRackId(rId)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition cursor-pointer ${
                    rId === selectedRackId
                      ? 'bg-slate-900 text-cyan-300 shadow-xs ring-2 ring-cyan-500'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Rak {rId}
                </button>
              ))}
            </div>
          </div>

          {/* Select Lokasi (Bay) & Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 shrink-0">Pilih Lokasi Rak:</span>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
                {availableBays.map(bayKey => (
                  <button
                    key={bayKey}
                    onClick={() => setSelectedBay(bayKey)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      selectedBay === bayKey
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Lokasi {bayKey}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedBay('ALL')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    selectedBay === 'ALL'
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Semua Lokasi ({availableBays[0]} s/d {availableBays[availableBays.length - 1]})
                </button>
              </div>
            </div>

            {/* Toggle Alternating Colors */}
            <button
              onClick={() => setEnableAlternatingColors(!enableAlternatingColors)}
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
                enableAlternatingColors
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Seling Warna: {enableAlternatingColors ? 'Aktif (Putih & Hitam)' : 'Seragam (Putih)'}</span>
            </button>
          </div>
        </div>

        {/* Action Header & Print Buttons */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Total Stiker Siap Cetak: <strong>{stickers.length} Lembar</strong> &bull; Kapasitas 1 Rak: <strong>4 Pallet (60 Box)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIntermecModal(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
              title="Akses Konfigurasi Printer Intermec via IP Address"
            >
              <Wifi className="w-3.5 h-3.5 text-slate-950" />
              <span>Printer Intermec ({intermecIp})</span>
            </button>

            <button
              onClick={handleOpenPrintTab}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2.5 rounded-xl transition cursor-pointer border border-slate-300"
              title="Buka dokumen stiker di tab peramban baru untuk dicetak langsung"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              <span>Buka Tab Cetak Khusus / PDF</span>
            </button>

            <button
              onClick={handleDirectPrint}
              className="flex items-center gap-2 bg-slate-900 hover:bg-black text-cyan-300 hover:text-cyan-200 text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Cetak ke Printer</span>
            </button>
          </div>
        </div>

        {/* Preview Area: Render exact cards with alternating colors without redundant text */}
        <div className="p-6 overflow-y-auto bg-slate-200/80 flex-1">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 place-items-center">
              {stickers.map((item, idx) => {
                const isDark = item.isDarkBg;

                return (
                  <div
                    key={`${item.displayCode}-${idx}`}
                    className={`relative rounded-xl p-4 shadow-md transition-transform hover:scale-[1.01] flex items-center justify-between border-2 ${
                      isDark
                        ? 'bg-black text-white border-slate-800'
                        : 'bg-white text-slate-950 border-black'
                    }`}
                    style={{
                      width: '100%',
                      maxWidth: '380px',
                      minHeight: '190px'
                    }}
                  >
                    {/* Left: Metadata & Big Code */}
                    <div className="flex-1 pr-3 flex flex-col justify-between h-full space-y-2">
                      <div>
                        <div className={`text-[10px] font-black uppercase tracking-wider ${
                          isDark ? 'text-cyan-400' : 'text-slate-800'
                        }`}>
                          SIKUTANG &bull; WMS FGW
                        </div>
                        <div className={`text-[9px] font-bold uppercase tracking-widest ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          KODE LOKASI RAK
                        </div>
                      </div>

                      {/* Massive Code */}
                      <div>
                        <h2 className={`text-4xl sm:text-5xl font-black font-mono tracking-tight leading-none ${
                          isDark ? 'text-white' : 'text-black'
                        }`}>
                          {item.displayCode}
                        </h2>
                        <span className={`text-[11px] font-bold block mt-1 ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          Rak {selectedRackId} &bull; Level {item.level} (Lokasi {item.bay})
                        </span>
                      </div>

                      {/* Details */}
                      <div className={`text-[10px] space-y-0.5 border-t pt-1.5 ${
                        isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'
                      }`}>
                        <p>Kapasitas 1 Rak: <strong>4 Pallet (60 Box)</strong></p>
                        <p>Peruntukan: <strong>{currentRack?.primaryProduct || 'Instant Coffee Finished Goods'}</strong></p>
                      </div>

                      {/* Copy and PRN helper */}
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleCopy(item.displayCode)}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800 text-cyan-300 hover:bg-slate-700' 
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {copiedCode === item.displayCode ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin Kode</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDownloadIntermecFile(item.displayCode)}
                          title="Download format raw Intermec (.PRN) untuk stiker ini"
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded transition cursor-pointer ${
                            isDark 
                              ? 'bg-amber-950/70 text-amber-300 hover:bg-amber-900 border border-amber-700/60' 
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                          }`}
                        >
                          <Download className="w-3 h-3" />
                          <span>.PRN Intermec</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Large Vector QR Code (Alternating) - Clean without labels */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className={`p-1.5 rounded-lg border-2 ${
                        isDark ? 'border-white bg-black' : 'border-black bg-white'
                      }`}>
                        <QrCodeRenderer
                          value={item.displayCode}
                          size={135}
                          bgColor={isDark ? '#000000' : '#ffffff'}
                          fgColor={isDark ? '#ffffff' : '#000000'}
                          noBorder={true}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info & tips */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>
              <strong>Koneksi Printer:</strong> Klik <strong>"Cetak ke Printer"</strong> untuk mencetak langsung. Untuk printer barcode label <strong>Intermec / Honeywell</strong> via IP address, klik tombol <strong>"Printer Intermec ({intermecIp})"</strong>.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Intermec Direct IP Configuration Modal */}
      {showIntermecModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-amber-500 text-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-xs">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                    Akses Koneksi Printer Intermec (IP Address)
                    <span className="text-[10px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                      RAW 9100 / DP / IPL
                    </span>
                  </h3>
                  <p className="text-xs text-slate-900 font-medium">
                    Konfigurasi IP printer label Honeywell / Intermec untuk cetak stiker rak secara langsung
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIntermecModal(false)}
                className="p-2 text-slate-900 hover:bg-amber-600 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Status Alert if any */}
              {testResult && (
                <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                  testResult.status === 'success' 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                    : testResult.status === 'warning'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : testResult.status === 'testing'
                    ? 'bg-blue-50 text-blue-900 border-blue-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300'
                }`}>
                  {testResult.status === 'testing' ? (
                    <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0 mt-0.5" />
                  ) : testResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold leading-relaxed">{testResult.message}</p>
                  </div>
                </div>
              )}

              {/* IP & Port Configuration */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-cyan-600" />
                  Parameter Jaringan & IP Printer
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      IP Address Printer Intermec:
                    </label>
                    <input
                      type="text"
                      value={intermecIp}
                      onChange={(e) => setIntermecIp(e.target.value.trim())}
                      placeholder="Contoh: 192.168.1.150"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Contoh IP:</span>
                      {['192.168.1.150', '192.168.0.100', '10.10.1.50'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setIntermecIp(preset)}
                          className="text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-1.5 py-0.5 rounded transition cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Port RAW / JetDirect:
                    </label>
                    <input
                      type="text"
                      value={intermecPort}
                      onChange={(e) => setIntermecPort(e.target.value.trim())}
                      placeholder="9100"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Standar port RAW Intermec / Honeywell adalah <strong>9100</strong> (atau 515 LPR).
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Model Printer Intermec:
                    </label>
                    <select
                      value={intermecModel}
                      onChange={(e) => setIntermecModel(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="PC43d">Intermec PC43d (Desktop Direct Thermal)</option>
                      <option value="PC43t">Intermec PC43t (Desktop Thermal Transfer)</option>
                      <option value="PM43">Intermec PM43 / PM43c (Mid-Range Industrial)</option>
                      <option value="PD42">Intermec PD42 / EasyCoder (Heavy Industrial)</option>
                      <option value="PX4i">Intermec PX4i / PX6i (High Performance)</option>
                      <option value="Generic">Generic Intermec / Honeywell RAW 203 DPI</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Bahasa Perintah (Protocol):
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIntermecProtocol('DP')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          intermecProtocol === 'DP'
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Direct Protocol (DP)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIntermecProtocol('IPL')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                          intermecProtocol === 'IPL'
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        IPL (Intermec Lang)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Aksi Cetak & Pengiriman Data
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={handleSendToIntermecIp}
                    disabled={isSendingRawJob}
                    className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-amber-300 font-black text-xs px-4 py-3 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {isSendingRawJob ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Send className="w-4 h-4 text-amber-400" />
                    )}
                    <span>Kirim Print Job ke IP ({stickers.length} Stiker)</span>
                  </button>

                  <button
                    onClick={() => handleDownloadIntermecFile()}
                    className="flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs px-4 py-3 rounded-xl transition cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-amber-700" />
                    <span>Download File Cetak ({intermecProtocol === 'DP' ? '.PRN DP' : '.IPL'})</span>
                  </button>

                  <button
                    onClick={handleCopyIntermecCli}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    {copiedScript ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Script Tersalin ke Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="w-4 h-4 text-slate-600" />
                        <span>Salin Script Kirim (Netcat / PowerShell)</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`http://${intermecIp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer text-center"
                    title={`Buka Web Interface Intermec di http://${intermecIp}`}
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>Buka Web Console Intermec</span>
                  </a>
                </div>
              </div>

              {/* Code Script Inspector */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowScriptPreview(!showScriptPreview)}
                  className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-slate-500" />
                    Lihat Kode Script {intermecProtocol === 'DP' ? 'Direct Protocol' : 'IPL'} ({stickers.length} Label)
                  </span>
                  <span>{showScriptPreview ? '▲ Sembunyikan' : '▼ Tampilkan'}</span>
                </button>
                {showScriptPreview && (
                  <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
                    {getActiveIntermecScript()}
                  </div>
                )}
              </div>

              {/* Quick Guide */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-600" />
                  Panduan Koneksi Printer Intermec di Gudang (WMS FGW):
                </h5>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>
                    <strong>Cek IP Printer:</strong> Nyalakan printer Intermec ({intermecModel}), periksa IP address pada layar LCD atau cetak lembar konfigurasi (feed test).
                  </li>
                  <li>
                    <strong>Input IP:</strong> Masukkan IP address printer pada kolom di atas (misal <code>{intermecIp}</code>). Nilai akan tersimpan otomatis.
                  </li>
                  <li>
                    <strong>Koneksi Windows Driver:</strong> Buka Windows <em>Printers & Scanners &gt; Add a printer using IP address</em> &gt; Masukkan IP <code>{intermecIp}</code> &gt; Pilih driver Intermec.
                  </li>
                  <li>
                    <strong>Cetak Instan:</strong> Setelah driver terhubung, Anda cukup menekan tombol <strong>"Cetak ke Printer"</strong> untuk mencetak semua label stiker rak dengan ukuran 90x50 mm.
                  </li>
                </ol>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Tersimpan di sistem: <strong>{intermecIp}:{intermecPort}</strong> ({intermecModel})
              </span>
              <button
                onClick={() => setShowIntermecModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
