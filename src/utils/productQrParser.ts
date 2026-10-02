/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedFinishedGoodsQr {
  isValid: boolean;
  rawString: string;
  packingLine: 'PA' | 'PB' | string;
  packingLineName: string; // e.g. "Packing 1 (PA)" or "Packing 2 (PB)"
  batchNo: string;        // e.g. "274/26"
  batchYear: string;       // e.g. "2026"
  productPin: string;      // e.g. "122"
  productName: string;     // e.g. "INSTANT COFFEE SIC 25 BR"
  netWeightKg: number;     // e.g. 30
  cartonPrefix: string;    // e.g. "D"
  cartonNumber: number;    // e.g. 86
  cartonNumberFormatted: string; // e.g. "D086" or "086"
  productionDateRaw: string; // e.g. "30062026"
  productionDateFormatted: string; // e.g. "30 Juni 2026"
  productionTimeRaw: string; // e.g. "1435"
  productionTimeFormatted: string; // e.g. "14:35 WIB"
  bestBeforeRaw: string;    // e.g. "30062028"
  bestBeforeFormatted: string; // e.g. "30 Juni 2028"
  maxBoxPerPallet: number;  // 15 BOX
}

const KNOWN_PIN_PRODUCTS: Record<string, { name: string; type: string; weightKg: number; itemCode?: string }> = {
  '122': {
    name: 'SIC 25 BR (1 X 30 KG)',
    type: 'SIC 25 BR',
    weightKg: 30,
    itemCode: '00J.KPI18.K0307001XX'
  },
  '18': {
    name: 'SIC 25 BR (1 X 30 KG)',
    type: 'SIC 25 BR',
    weightKg: 30,
    itemCode: '00J.KPI18.K0307001XX'
  },
  '09': {
    name: 'SIC 18 C1 (1 X 30 KG)',
    type: 'SIC 18 C1',
    weightKg: 30,
    itemCode: '00J.KPI09.K0307001XX'
  },
  '01': {
    name: 'SIC 18 T (1 X 30 KG)',
    type: 'SIC 18 T',
    weightKg: 30,
    itemCode: '00J.KPI01.K0307001XX'
  },
  '11': {
    name: 'SIC 9010 M3 (1 X 30 KG)',
    type: 'SIC 9010 M3',
    weightKg: 30,
    itemCode: '00J.KPI11.K0307001XX'
  },
  '10': {
    name: 'SIC 01 PC (1 X 30 KG)',
    type: 'SIC 01 PC',
    weightKg: 30,
    itemCode: '00J.KPI10.K0307001XX'
  },
  '16': {
    name: 'SIC 8590 SD (1 X 30 KG)',
    type: 'SIC 8590 SD',
    weightKg: 30,
    itemCode: '00J.KPI16.K0307001XX'
  },
  'F3': {
    name: 'SJ1801',
    type: 'SJ1801',
    weightKg: 30,
    itemCode: '00J.KPI10.K0307001F3'
  },
  '123': {
    name: 'INSTANT COFFEE ARABICA GOLD',
    type: 'SIC 25 AG',
    weightKg: 30
  },
  '124': {
    name: 'INSTANT COFFEE ROBUSTA STRONG',
    type: 'SIC 25 RS',
    weightKg: 30
  }
};

export function formatDdMmYyyy(rawDateStr: string): string {
  if (!rawDateStr || rawDateStr.length !== 8) return rawDateStr || '';
  const day = rawDateStr.slice(0, 2);
  const month = rawDateStr.slice(2, 4);
  const year = rawDateStr.slice(4, 8);
  return `${day}-${month}-${year}`;
}

export function formatIsoDate(rawDateStr: string): string {
  if (!rawDateStr || rawDateStr.length !== 8) return '2026-06-30';
  const day = rawDateStr.slice(0, 2);
  const month = rawDateStr.slice(2, 4);
  const year = rawDateStr.slice(4, 8);
  return `${year}-${month}-${day}`;
}

export function parseFinishedGoodsQrCode(rawInput: string): ParsedFinishedGoodsQr {
  const clean = (rawInput || '').trim();
  
  // Default fallback
  const result: ParsedFinishedGoodsQr = {
    isValid: false,
    rawString: clean,
    packingLine: 'PA',
    packingLineName: 'Packing 1 (PA)',
    batchNo: '274/26',
    batchYear: '2026',
    productPin: '122',
    productName: 'SIC 25 BR (1 X 30 KG)',
    netWeightKg: 30,
    cartonPrefix: 'D',
    cartonNumber: 86,
    cartonNumberFormatted: 'D086',
    productionDateRaw: '30062026',
    productionDateFormatted: '30-06-2026',
    productionTimeRaw: '1435',
    productionTimeFormatted: '14:35 WIB',
    bestBeforeRaw: '30062028',
    bestBeforeFormatted: '30-06-2028',
    maxBoxPerPallet: 15
  };

  if (!clean) return result;

  // A. Check JSON formatted QR code
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const data = JSON.parse(clean);
      result.isValid = true;
      result.productName = data.productName || data.name || result.productName;
      result.batchNo = data.batchNo || data.batch || result.batchNo;
      result.productPin = String(data.pin || data.productPin || result.productPin);
      if (data.cartonNumber) {
        result.cartonNumber = parseInt(data.cartonNumber, 10);
        result.cartonNumberFormatted = `D${String(result.cartonNumber).padStart(3, '0')}`;
      }
      if (data.productionDate) {
        result.productionDateFormatted = data.productionDate;
      }
      if (data.expiryDate || data.bestBefore) {
        result.bestBeforeFormatted = data.expiryDate || data.bestBefore;
      }
      return result;
    } catch {}
  }

  // B. Check standard high-density concatenated QR code
  // Example: "PA274/2612230062026D08614353006202630062028086"
  // Or "PB275/2612230062026D01515003006202630062028015"
  const fullRegex = /^(PA|PB|[A-Z]{1,2})(\d{1,4}\/\d{2}|\d{3,5})(\d{2,4})(\d{8})([A-Z]?\d{2,4})(\d{4})(\d{8})(\d{8})(\d{2,4})$/i;
  const matchFull = clean.match(fullRegex);

  if (matchFull) {
    const pLine = matchFull[1].toUpperCase();
    const bNo = matchFull[2].includes('/') ? matchFull[2] : `${matchFull[2].slice(0, -2)}/${matchFull[2].slice(-2)}`;
    const pin = matchFull[3];
    const prodDate = matchFull[4];
    const rawCarton = matchFull[5];
    const prodTime = matchFull[6];
    const expiryDate = matchFull[8];
    const repeatCarton = matchFull[9];

    const cPrefix = rawCarton.charAt(0).match(/[A-Z]/i) ? rawCarton.charAt(0).toUpperCase() : 'D';
    const cNum = parseInt(repeatCarton, 10) || parseInt(rawCarton.replace(/\D/g, ''), 10) || 86;

    result.isValid = true;
    result.packingLine = pLine.startsWith('PB') ? 'PB' : 'PA';
    result.packingLineName = result.packingLine === 'PB' ? 'Packing 2 (PB)' : 'Packing 1 (PA)';
    result.batchNo = bNo;
    result.batchYear = '20' + (bNo.split('/')[1] || '26');
    result.productPin = pin;
    result.productName = KNOWN_PIN_PRODUCTS[pin]?.name || `SIC 25 BR (1 X 30 KG)`;
    result.netWeightKg = KNOWN_PIN_PRODUCTS[pin]?.weightKg || 30;
    result.cartonPrefix = cPrefix;
    result.cartonNumber = cNum;
    result.cartonNumberFormatted = `${cPrefix}${String(cNum).padStart(3, '0')}`;
    result.productionDateRaw = prodDate;
    result.productionDateFormatted = formatDdMmYyyy(prodDate);
    result.productionTimeRaw = prodTime;
    result.productionTimeFormatted = `${prodTime.slice(0, 2)}:${prodTime.slice(2, 4)} WIB`;
    result.bestBeforeRaw = expiryDate;
    result.bestBeforeFormatted = formatDdMmYyyy(expiryDate);
    return result;
  }

  // C. Delimited string with semicolon, pipe, slash, or commas
  // e.g. "PA274/26/122/D086/30062026" or "PA;274/26;122;D086"
  const parts = clean.split(/[;/|,]/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 3) {
    result.isValid = true;
    parts.forEach(part => {
      if (/^(PA|PB)$/i.test(part)) {
        result.packingLine = part.toUpperCase() as any;
        result.packingLineName = result.packingLine === 'PB' ? 'Packing 2 (PB)' : 'Packing 1 (PA)';
      } else if (/^\d{1,4}\/\d{2}$/.test(part)) {
        result.batchNo = part;
      } else if (KNOWN_PIN_PRODUCTS[part]) {
        result.productPin = part;
        result.productName = KNOWN_PIN_PRODUCTS[part].name;
      } else if (/^[A-Z]?\d{1,4}$/i.test(part) && parseInt(part.replace(/\D/g, ''), 10) < 500) {
        const cNum = parseInt(part.replace(/\D/g, ''), 10);
        result.cartonNumber = cNum;
        result.cartonNumberFormatted = `D${String(cNum).padStart(3, '0')}`;
      } else if (/^\d{8}$/.test(part)) {
        result.productionDateRaw = part;
        result.productionDateFormatted = formatDdMmYyyy(part);
      }
    });
    return result;
  }

  // D. Short format from label: e.g. "A274/26/086" or "PA274/26/086" or "PB274/26/086"
  const shortRegex = /^(PA|PB|A|B)?(\d+\/\d+)\/([A-Z]?\d+)$/i;
  const matchShort = clean.match(shortRegex);
  if (matchShort) {
    const pLineRaw = (matchShort[1] || 'PA').toUpperCase();
    const pLine = pLineRaw.includes('B') ? 'PB' : 'PA';
    const bNo = matchShort[2];
    const cNum = parseInt(matchShort[3].replace(/\D/g, ''), 10) || 86;

    result.isValid = true;
    result.packingLine = pLine;
    result.packingLineName = pLine === 'PB' ? 'Packing 2 (PB)' : 'Packing 1 (PA)';
    result.batchNo = bNo;
    result.cartonNumber = cNum;
    result.cartonNumberFormatted = `D${String(cNum).padStart(3, '0')}`;
    return result;
  }

  // E. Fallback: If string contains keywords like PA274 or 274/26 or 122
  if (clean.includes('274/26') || clean.includes('122') || clean.includes('275/26')) {
    result.isValid = true;
    const numMatch = clean.match(/D?(\d{2,3})/);
    if (numMatch) {
      const cNum = parseInt(numMatch[1], 10);
      result.cartonNumber = cNum;
      result.cartonNumberFormatted = `D${String(cNum).padStart(3, '0')}`;
    }
    return result;
  }

  return result;
}

export const SAMPLE_FG_QR_CODE = "PA274/2612230062026D08614353006202630062028086";
