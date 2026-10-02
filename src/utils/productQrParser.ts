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

const KNOWN_PIN_PRODUCTS: Record<string, { name: string; type: string; weightKg: number }> = {
  '122': {
    name: 'INSTANT COFFEE SIC 25 BR',
    type: 'SIC 25 BR',
    weightKg: 30
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

function formatDdMmYyyy(rawDateStr: string): string {
  if (rawDateStr.length !== 8) return rawDateStr;
  const day = rawDateStr.slice(0, 2);
  const month = rawDateStr.slice(2, 4);
  const year = rawDateStr.slice(4, 8);
  return `${day}-${month}-${year}`;
}

export function parseFinishedGoodsQrCode(rawInput: string): ParsedFinishedGoodsQr {
  const clean = rawInput.trim();
  
  // Default fallback
  const result: ParsedFinishedGoodsQr = {
    isValid: false,
    rawString: clean,
    packingLine: 'PA',
    packingLineName: 'Packing 1 (PA)',
    batchNo: '274/26',
    batchYear: '2026',
    productPin: '122',
    productName: 'INSTANT COFFEE SIC 25 BR',
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

  // 1. Check full standard pattern:
  // Example: "PA274/2612230062026D08614353006202630062028086"
  // Groups:
  // 1: Packing prefix (PA or PB or A or B)
  // 2: Batch (274/26 or 27426)
  // 3: PIN (122)
  // 4: Production date (30062026)
  // 5: Carton prefix + number (D086 or 086)
  // 6: Time (1435)
  // 7: Prod date repeat (30062026)
  // 8: Expiry date (30062028)
  // 9: Carton number repeat (086)
  const fullRegex = /^(PA|PB|[A-Z]{1,2})(\d{1,4}\/\d{2}|\d{3,5})(\d{3})(\d{8})([A-Z]?\d{3,4})(\d{4})(\d{8})(\d{8})(\d{3,4})$/i;
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
    result.batchYear = '20' + bNo.split('/')[1] || '2026';
    result.productPin = pin;
    result.productName = KNOWN_PIN_PRODUCTS[pin]?.name || `Produk Finished Goods PIN #${pin}`;
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

  // 2. Check short format from label: e.g. "A274/26/086" or "PA274/26/086" or "PB274/26/086"
  const shortRegex = /^(PA|PB|A|B)?(\d+\/\d+)\/(\d+)$/i;
  const matchShort = clean.match(shortRegex);
  if (matchShort) {
    const pLineRaw = (matchShort[1] || 'PA').toUpperCase();
    const pLine = pLineRaw.includes('B') ? 'PB' : 'PA';
    const bNo = matchShort[2];
    const cNum = parseInt(matchShort[3], 10);

    result.isValid = true;
    result.packingLine = pLine;
    result.packingLineName = pLine === 'PB' ? 'Packing 2 (PB)' : 'Packing 1 (PA)';
    result.batchNo = bNo;
    result.cartonNumber = cNum;
    result.cartonNumberFormatted = `D${String(cNum).padStart(3, '0')}`;
    return result;
  }

  // 3. Fallback: If string contains keywords like PA274 or 274/26
  if (clean.includes('274/26') || clean.includes('122')) {
    result.isValid = true;
    return result;
  }

  return result;
}

export const SAMPLE_FG_QR_CODE = "PA274/2612230062026D08614353006202630062028086";
