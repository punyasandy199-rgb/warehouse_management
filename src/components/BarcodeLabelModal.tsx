/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  QrCode, 
  ExternalLink, 
  Settings2, 
  CheckCircle2, 
  Info, 
  Copy, 
  Check, 
  Download,
  Barcode
} from 'lucide-react';
import { QrCodeRenderer, BarcodeRenderer } from './BarcodeRenderer';
import { formatDateDDMMYYYY } from '../utils/dateFormat';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelData: {
    type: 'slot' | 'product' | 'pallet';
    code: string;
    title: string;
    subtitle?: string;
    itemCode?: string;
    quantityBox?: number;
    batchNo?: string;
    productionDate?: string;
    expiryDate?: string;
    inboundDate?: string;
    inboundBy?: string;
    slotCode?: string;
  } | null;
}

type LabelSizePreset = '100x150' | '100x100' | '80x50' | 'a4';

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  labelData
}) => {
  const labelRef = useRef<HTMLDivElement>(null);
  const [labelSize, setLabelSize] = useState<LabelSizePreset>('100x100');
  const [showPrinterGuide, setShowPrinterGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [includeBarcode1D, setIncludeBarcode1D] = useState(false);

  if (!isOpen || !labelData) return null;

  const formattedProdDate = formatDateDDMMYYYY(labelData.productionDate);
  const formattedExpDate = formatDateDDMMYYYY(labelData.expiryDate);
  const formattedInboundDate = formatDateDDMMYYYY(labelData.inboundDate);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(labelData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getLabelDimensions = () => {
    switch (labelSize) {
      case '100x150':
        return { widthMm: 100, heightMm: 150, title: '100 × 150 mm (Standar Pallet Logistik 4x6")' };
      case '100x100':
        return { widthMm: 100, heightMm: 100, title: '100 × 100 mm (Standar Pallet Box)' };
      case '80x50':
        return { widthMm: 80, heightMm: 50, title: '80 × 50 mm (Thermal Mini / Portable)' };
      case 'a4':
        return { widthMm: 210, heightMm: 297, title: 'Kertas A4 Biasa' };
    }
  };

  const buildPrintHtml = () => {
    const dim = getLabelDimensions();
    const qrSizePx = labelSize === '80x50' ? 120 : 160;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Label Pallet Fisik - ${labelData.code}</title>
          <style>
            @page {
              size: ${labelSize === 'a4' ? 'A4 portrait' : `${dim.widthMm}mm ${dim.heightMm}mm`};
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              margin: 0;
              padding: ${labelSize === 'a4' ? '15mm' : '3mm'};
              background: #ffffff;
              color: #000000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .label-container {
              width: ${labelSize === 'a4' ? '100mm' : `${dim.widthMm - 6}mm`};
              margin: 0 auto;
              border: 2px solid #000000;
              border-radius: 6px;
              padding: 8px 10px;
              text-align: center;
              background: #ffffff;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #000000;
              padding-bottom: 4px;
              margin-bottom: 6px;
            }
            .company {
              font-size: 13px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }
            .tag {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              border: 1px solid #000;
              padding: 1px 4px;
              border-radius: 3px;
            }
            .code-title {
              font-family: monospace;
              font-size: 22px;
              font-weight: 900;
              letter-spacing: 1px;
              margin: 4px 0 2px 0;
              word-break: break-all;
            }
            .product-name {
              font-size: 13px;
              font-weight: 800;
              margin: 2px 0 6px 0;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
              border: 1.5px solid #000000;
              border-radius: 4px;
              padding: 6px;
              text-align: left;
              margin-bottom: 8px;
              font-size: 10px;
            }
            .info-item {
              margin-bottom: 2px;
            }
            .info-label {
              font-size: 8px;
              font-weight: 700;
              color: #333333;
              display: block;
              text-transform: uppercase;
            }
            .info-value {
              font-weight: 900;
              font-size: 11px;
              font-family: monospace;
            }
            .highlight {
              font-size: 12px;
              font-weight: 900;
            }
            .qr-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              margin: 6px 0;
            }
            .qr-svg {
              width: ${qrSizePx}px;
              height: ${qrSizePx}px;
            }
            .scan-guide {
              font-size: 8.5px;
              font-family: monospace;
              font-weight: 700;
              margin-top: 4px;
              color: #222222;
            }
            .footer-line {
              font-size: 8px;
              color: #555555;
              border-top: 1px dashed #666666;
              padding-top: 3px;
              margin-top: 6px;
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="header">
              <span class="company">SIKUTANG WMS FGW</span>
              <span class="tag">LABEL PALLET FISIK</span>
            </div>

            <div class="code-title">${labelData.code}</div>
            <div class="product-name">${labelData.title}</div>

            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">KODE ITEM</span>
                <span class="info-value">${labelData.itemCode || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">JUMLAH MUATAN</span>
                <span class="info-value highlight">${labelData.quantityBox ? `${labelData.quantityBox} BOX` : '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">BATCH NUMBER FG</span>
                <span class="info-value">${labelData.batchNo || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">LOKASI RAK</span>
                <span class="info-value">${labelData.slotCode || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">TGL PRODUKSI (DD-MM-YYYY)</span>
                <span class="info-value">${formattedProdDate}</span>
              </div>
              <div class="info-item">
                <span class="info-label">TGL KADALUARSA (DD-MM-YYYY)</span>
                <span class="info-value">${formattedExpDate}</span>
              </div>
              ${formattedInboundDate !== '-' ? `
                <div class="info-item" style="grid-column: span 2;">
                  <span class="info-label">WAKTU MASUK & OPERATOR</span>
                  <span class="info-value" style="font-size: 9.5px;">${formattedInboundDate} ${labelData.inboundBy ? `(${labelData.inboundBy})` : ''}</span>
                </div>
              ` : ''}
            </div>

            <div class="qr-wrapper">
              <div id="qr-target">
                ${document.getElementById('printable-qr-code')?.innerHTML || ''}
              </div>
              <span class="scan-guide">Scan QR Code dengan Scanner Gun / Kamera HP</span>
            </div>

            <div class="footer-line">
              Dicetak: ${new Date().toLocaleString('id-ID')} &bull; Sistem Pergudangan PT SIKUTANG
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;
  };

  // Strategy 1: Direct Clean Print Tab (Bypasses all iframe limitations & connects to all printers)
  const handlePrintToPrinter = () => {
    const html = buildPrintHtml();
    
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        return;
      }
    } catch (e) {
      console.warn('Popup print fallback:', e);
    }

    // Strategy 2: Hidden iframe with direct onload print trigger
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '100px';
    iframe.style.height = '100px';
    iframe.style.border = '0';
    iframe.style.opacity = '0.01';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 400);
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-extrabold text-sm text-cyan-300">Cetak Label Pallet & Sambung Printer</h3>
              <p className="text-[11px] text-slate-400">Format QR Code Standar ISO 18004</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Controls: Size Presets & Connection Button */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-cyan-600" />
                Ukuran Kertas / Label Printer:
              </span>
              <button
                type="button"
                onClick={() => setShowPrinterGuide(!showPrinterGuide)}
                className="text-[11px] text-cyan-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                Panduan Printer
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setLabelSize('100x150')}
                className={`px-2.5 py-1.5 rounded-xl text-left border text-xs font-bold transition cursor-pointer ${
                  labelSize === '100x150'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px]">100 × 150 mm (4×6")</div>
                <div className={`text-[9px] font-normal ${labelSize === '100x150' ? 'text-cyan-100' : 'text-slate-400'}`}>
                  Standar Pallet Logistik
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLabelSize('100x100')}
                className={`px-2.5 py-1.5 rounded-xl text-left border text-xs font-bold transition cursor-pointer ${
                  labelSize === '100x100'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px]">100 × 100 mm</div>
                <div className={`text-[9px] font-normal ${labelSize === '100x100' ? 'text-cyan-100' : 'text-slate-400'}`}>
                  Kotak Pallet Persegi
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLabelSize('80x50')}
                className={`px-2.5 py-1.5 rounded-xl text-left border text-xs font-bold transition cursor-pointer ${
                  labelSize === '80x50'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px]">80 × 50 mm</div>
                <div className={`text-[9px] font-normal ${labelSize === '80x50' ? 'text-cyan-100' : 'text-slate-400'}`}>
                  Thermal Mini Portable
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLabelSize('a4')}
                className={`px-2.5 py-1.5 rounded-xl text-left border text-xs font-bold transition cursor-pointer ${
                  labelSize === 'a4'
                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[11px]">Kertas A4</div>
                <div className={`text-[9px] font-normal ${labelSize === 'a4' ? 'text-cyan-100' : 'text-slate-400'}`}>
                  Kertas Biasa / Laser
                </div>
              </button>
            </div>

            {/* Toggle Barcode 1D accompaniment */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBarcode1D}
                  onChange={(e) => setIncludeBarcode1D(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-0"
                />
                <span>Sertakan Barcode 1D (Code 128) di bawah QR</span>
              </label>
            </div>
          </div>

          {/* Guide Dropdown */}
          {showPrinterGuide && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-2 animate-in fade-in duration-100">
              <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                <Printer className="w-4 h-4 text-amber-700" />
                Cara Menghubungkan ke Printer Thermal di Komputer:
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-amber-900">
                <li>Klik tombol <strong>"Cetak Langsung ke Printer"</strong> di bawah.</li>
                <li>Pada jendela Print browser, di bagian <strong>Destination / Printer</strong>, pilih merk printer Anda (contoh: <em>Zebra ZD220, Intermec, TSC, Xprinter, atau Epson</em>).</li>
                <li>Pilih Paper Size sesuai label thermal (contoh: <em>100x150 mm</em> atau <em>100x100 mm</em>).</li>
                <li>Pastikan <strong>Margins</strong> diatur ke <strong>None</strong> atau <strong>Minimum</strong>.</li>
                <li>Klik <strong>Print</strong>. Label akan langsung tercetak pada stiker thermal!</li>
              </ol>
            </div>
          )}

          {/* Preview Card */}
          <div 
            ref={labelRef}
            id="printable-pallet-label"
            className="p-4 bg-white border-2 border-slate-900 rounded-2xl shadow-sm text-center space-y-2.5 font-sans"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5">
              <span className="font-black text-xs tracking-wider text-slate-950">
                SIKUTANG WMS FGW
              </span>
              <span className="text-[10px] font-mono text-slate-900 uppercase font-black px-1.5 py-0.5 border border-slate-900 rounded">
                LABEL PALLET FISIK
              </span>
            </div>

            {/* Code & Title */}
            <div>
              <span className="text-2xl font-black font-mono text-slate-950 block tracking-tight break-all">
                {labelData.code}
              </span>
              <p className="font-extrabold text-sm text-slate-900 mt-0.5">{labelData.title}</p>
              {labelData.subtitle && (
                <p className="text-[11px] text-slate-600 font-mono">{labelData.subtitle}</p>
              )}
            </div>

            {/* Metadata Grid with DD-MM-YYYY format */}
            <div className="grid grid-cols-2 gap-2 text-left bg-slate-50 p-2.5 rounded-xl border border-slate-300 text-xs">
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">KODE ITEM:</span>
                <span className="font-bold font-mono text-slate-900 text-xs">{labelData.itemCode || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">JUMLAH MUATAN:</span>
                <span className="font-extrabold font-mono text-emerald-800 text-xs">
                  {labelData.quantityBox ? `${labelData.quantityBox} BOX` : '-'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">BATCH NUMBER:</span>
                <span className="font-mono font-bold text-slate-800 text-xs">{labelData.batchNo || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">LOKASI RAK:</span>
                <span className="font-mono font-black text-cyan-800 text-xs">{labelData.slotCode || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">TGL PRODUKSI (DD-MM-YYYY):</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{formattedProdDate}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">TGL KADALUARSA (DD-MM-YYYY):</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{formattedExpDate}</span>
              </div>
            </div>

            {/* High-Resolution QR Code (100% Scannable ISO 18004) */}
            <div className="pt-1 flex flex-col items-center justify-center">
              <div id="printable-qr-code" className="p-2 bg-white border border-slate-300 rounded-xl shadow-2xs">
                <QrCodeRenderer 
                  value={labelData.code} 
                  size={labelSize === '80x50' ? 110 : 140} 
                  level="M" 
                  includeMargin={true}
                  noBorder={true}
                />
              </div>

              {includeBarcode1D && (
                <div className="w-full mt-2 pt-1 border-t border-slate-200">
                  <BarcodeRenderer value={labelData.code} width={240} height={40} showText={false} />
                </div>
              )}

              <span className="text-[10px] text-slate-700 font-mono mt-1.5 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Siap Di-scan Kamera HP & Scanner Gun
              </span>
            </div>
          </div>

          {/* Quick Code Copy & Action */}
          <div className="flex items-center justify-between bg-slate-100 p-2.5 rounded-xl text-xs">
            <span className="font-mono font-bold text-slate-800 text-xs">{labelData.code}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 bg-white hover:bg-slate-200 rounded-lg text-slate-700 font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1 text-[11px]"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Disalin' : 'Salin Kode'}</span>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handlePrintToPrinter}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs shadow-md transition cursor-pointer flex items-center gap-2 hover:shadow-cyan-500/25"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Langsung ke Printer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
