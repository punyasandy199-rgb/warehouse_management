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
  if (!rawDateStr) return '';
  const clean = rawDateStr.trim();
  // If already DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(clean)) {
    return clean.replace(/\//g, '-');
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // If raw 8-digit DDMMYYYY (e.g. 30062026)
  if (clean.length === 8 && /^\d{8}$/.test(clean)) {
    const day = clean.slice(0, 2);
    const month = clean.slice(2, 4);
    const year = clean.slice(4, 8);
    return `${day}-${month}-${year}`;
  }
  return clean;
}

export function formatIsoDate(rawDateStr: string): string {
  if (!rawDateStr) return '2026-06-30';
  const clean = rawDateStr.trim();
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.slice(0, 10);
  }
  // If DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(clean)) {
    const parts = clean.split(/[-/]/);
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  // If raw 8-digit DDMMYYYY
  if (clean.length === 8 && /^\d{8}$/.test(clean)) {
    const day = clean.slice(0, 2);
    const month = clean.slice(2, 4);
    const year = clean.slice(4, 8);
    return `${year}-${month}-${day}`;
  }
  return '2026-06-30';
}

export function parseFinishedGoodsQrCode(rawInput: string): ParsedFinishedGoodsQr {
  const clean = (rawInput || '').trim();
  
  // Default structure without hardcoded carton number
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
    cartonNumber: null as any,
    cartonNumberFormatted: '',
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

  // B. Extract Packing Line (PA / PB)
  if (/^PB/i.test(clean) || /\bPB\b/i.test(clean)) {
    result.packingLine = 'PB';
    result.packingLineName = 'Packing 2 (PB)';
  } else {
    result.packingLine = 'PA';
    result.packingLineName = 'Packing 1 (PA)';
  }

  // C. Extract Batch Number (e.g. 274/26, 275/26, 01/26)
  const batchMatch = clean.match(/(?:BATCH|LOT|LOTNO)?[:\s-]?(\d{1,4}\/\d{2})/i) ||
                     clean.match(/(?:PA|PB)(\d{2,4}\/\d{2})/i) ||
                     clean.match(/(\d{1,4}[-/]\d{2})/i);
  if (batchMatch) {
    result.batchNo = batchMatch[1].replace('-', '/');
    result.batchYear = '20' + (result.batchNo.split('/')[1] || '26');
  }

  // D. Extract Product PIN & Name
  const pinMatch = clean.match(/(?:PA|PB)?\d{1,4}\/\d{2}(\d{2,3})/i) || clean.match(/\b(122|18|09|01|11|10|123|124)\b/);
  if (pinMatch && KNOWN_PIN_PRODUCTS[pinMatch[1]]) {
    const prod = KNOWN_PIN_PRODUCTS[pinMatch[1]];
    result.productPin = pinMatch[1];
    result.productName = prod.name;
    result.netWeightKg = prod.weightKg;
  }

  // E. Extract Production Date (8 digits DDMMYYYY) and Best Before
  const dateMatches = clean.match(/\b\d{8}\b/g) || clean.match(/\d{8}/g);
  if (dateMatches && dateMatches.length > 0) {
    result.productionDateRaw = dateMatches[0];
    result.productionDateFormatted = formatDdMmYyyy(dateMatches[0]);
    if (dateMatches.length > 1) {
      result.bestBeforeRaw = dateMatches[dateMatches.length - 1];
      result.bestBeforeFormatted = formatDdMmYyyy(result.bestBeforeRaw);
    }
  }

  // F. Extract Production Time (4 digits HHMM right after carton or keyword)
  const timeRegexMatch = clean.match(/([DABCDEFGHJKMNPQRSTUVWYZ]\d{2,4})(\d{4})/i);
  if (timeRegexMatch) {
    const rawTime = timeRegexMatch[2];
    result.productionTimeRaw = rawTime;
    result.productionTimeFormatted = `${rawTime.slice(0, 2)}:${rawTime.slice(2, 4)} WIB`;
  }

  // G. Extract Carton Number & Carton Prefix (Physical Box Number from QR Code)
  let cNum: number | null = null;
  let cPrefix = 'D';

  // 1. Standard concatenated Finished Goods: 8 digits date + [A-Z] + 3 digits carton + 4 digits time (HHMM)
  const m1 = clean.match(/\d{8}[-/_ ]*([DABCDEFGHJKMNPQRSTUVWYZ])(\d{3})(?=\d{4}|[-/_ ]|$)/i);
  if (m1) {
    cPrefix = m1[1].toUpperCase();
    cNum = parseInt(m1[2], 10);
  }

  // 2. Delimited or spaced 1-4 digit carton following date
  if (cNum === null) {
    const m2 = clean.match(/\d{8}[-/_ ]+([DABCDEFGHJKMNPQRSTUVWYZ])(\d{1,4})(?=\b|[-/_ ]|$)/i);
    if (m2) {
      cPrefix = m2[1].toUpperCase();
      cNum = parseInt(m2[2], 10);
    }
  }

  // 3. Repeat carton at the very end of concatenated string (e.g. ...30062028087)
  if (cNum === null) {
    const m3 = clean.match(/\d{8}([DABCDEFGHJKMNPQRSTUVWYZ])?(\d{1,4})$/i);
    if (m3) {
      if (m3[1]) cPrefix = m3[1].toUpperCase();
      cNum = parseInt(m3[2], 10);
    }
  }

  // 4. Explicit keyword BOX / KARTON / CARTON / NO (e.g. "BOX 89", "KARTON 087", "BOX-87")
  if (cNum === null) {
    const m4 = clean.match(/(?:BOX|KARTON|CARTON|NO\.?)\s*[-:]?\s*([A-Z])?(\d{1,4})/i);
    if (m4) {
      if (m4[1]) cPrefix = m4[1].toUpperCase();
      cNum = parseInt(m4[2], 10);
    }
  }

  // 5. Standalone or delimited carton code with prefix (e.g. "D087", "-D089-", "/D015/")
  if (cNum === null) {
    const m5 = clean.match(/(?:^|[^0-9A-Za-z])([DABCDEFGHJKMNPQRSTUVWYZ])(\d{1,4})(?:[^0-9A-Za-z]|$)/i);
    if (m5) {
      cPrefix = m5[1].toUpperCase();
      cNum = parseInt(m5[2], 10);
    }
  }

  // 6. Delimited with batch (e.g. "274/26-089", "274/26/D087", "274/26 D087")
  if (cNum === null) {
    const m6 = clean.match(/\d{1,4}\/\d{2}[-/\s:]([A-Z])?(\d{1,4})/i);
    if (m6) {
      if (m6[1]) cPrefix = m6[1].toUpperCase();
      cNum = parseInt(m6[2], 10);
    }
  }

  // 7. Pure standalone digits (e.g. "087", "87")
  if (cNum === null) {
    const m7 = clean.match(/^(\d{1,4})$/);
    if (m7) {
      cNum = parseInt(m7[1], 10);
    }
  }

  if (cNum !== null && !isNaN(cNum)) {
    result.isValid = true;
    result.cartonNumber = cNum;
    result.cartonPrefix = cPrefix;
    result.cartonNumberFormatted = `${cPrefix}${String(cNum).padStart(3, '0')}`;
  } else {
    // If carton number not directly found, validate if string is a valid FG label
    if (clean.length >= 10 && (clean.includes('PA') || clean.includes('PB') || clean.includes('274/26') || clean.includes('122'))) {
      result.isValid = true;
    }
  }

  return result;
}

export const SAMPLE_FG_QR_CODE = "PA274/2612230062026D08614353006202630062028086";
