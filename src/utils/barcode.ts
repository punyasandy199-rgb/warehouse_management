/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Generate deterministic pseudo-bar code pattern based on text input
export function generateBarcodePattern(text: string): boolean[] {
  const bars: boolean[] = [true, false, true, false]; // Start guard
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) ^ (hash & 0x7f);
    for (let b = 0; b < 6; b++) {
      bars.push(((code >> b) & 1) === 1);
    }
    bars.push(false);
  }
  
  // End guard
  bars.push(true, false, true, true, false, true);
  return bars;
}

export interface ParsedSlotCode {
  rackId: string;
  level: number;
  bay: string;
  palletPos?: number;
  canonicalSlotCode: string;
}

export function parseSlotCode(fullCode: string): ParsedSlotCode | null {
  if (!fullCode) return null;
  const clean = fullCode.trim().toUpperCase();

  // Pattern 1: A1a, F2b, A10m, or with RAK- prefix like RAK-A1a
  const cleanNoPrefix = clean.replace(/^RAK-/, '');
  const matchBayStyle = cleanNoPrefix.match(/^([A-Z0-9]+?)(\d+)([A-Z]+)$/);
  if (matchBayStyle) {
    const rackId = matchBayStyle[1];
    const level = parseInt(matchBayStyle[2], 10);
    const bay = matchBayStyle[3].toLowerCase();
    return {
      rackId,
      level,
      bay,
      palletPos: level,
      canonicalSlotCode: `${rackId}${level}${bay}`
    };
  }

  // Pattern 2: RAK-A-P1, RAK-A-P4, RAK-B-P2 or A-P1, B-P4
  const matchRakP = clean.match(/^(?:RAK-)?([A-Z0-9]+)-P(\d+)$/);
  if (matchRakP) {
    const rackId = matchRakP[1];
    const pos = parseInt(matchRakP[2], 10);
    return {
      rackId,
      level: pos,
      bay: 'a',
      palletPos: pos,
      canonicalSlotCode: `${rackId}${pos}a`
    };
  }

  // Pattern 3: A1, B4
  const matchSimple = clean.match(/^([A-Z]+)(\d+)$/);
  if (matchSimple) {
    const rackId = matchSimple[1];
    const pos = parseInt(matchSimple[2], 10);
    return {
      rackId,
      level: pos,
      bay: 'a',
      palletPos: pos,
      canonicalSlotCode: `${rackId}${pos}a`
    };
  }

  // Pattern 4: RAK-A or RAK-B
  const matchRakOnly = clean.match(/^RAK-([A-Z0-9]+)$/);
  if (matchRakOnly) {
    const rackId = matchRakOnly[1];
    return {
      rackId,
      level: 1,
      bay: 'a',
      palletPos: 1,
      canonicalSlotCode: `${rackId}1a`
    };
  }

  return null;
}

export function findMatchingSlotKey(slots: Record<string, any>, rawCode: string): string | null {
  if (!rawCode || !slots) return null;
  const clean = rawCode.trim();

  // 1. Exact key match (e.g. 'A1a')
  if (slots[clean]) return clean;

  const upper = clean.toUpperCase();
  // 2. Case-insensitive key match
  const directFound = Object.keys(slots).find(k => k.toUpperCase() === upper);
  if (directFound) return directFound;

  // 3. Strip 'RAK-' prefix if any
  const noPrefix = upper.replace(/^RAK-/, '');
  const noPrefixFound = Object.keys(slots).find(k => k.toUpperCase() === noPrefix);
  if (noPrefixFound) return noPrefixFound;

  // 4. Parsed match
  const parsed = parseSlotCode(clean);
  if (parsed) {
    // Check canonicalSlotCode (e.g. A1a)
    const canonFound = Object.keys(slots).find(k => k.toUpperCase() === parsed.canonicalSlotCode.toUpperCase());
    if (canonFound) return canonFound;

    // Check by level and bay
    const byLvlBay = Object.values(slots).find(
      (s: any) => s.level === parsed.level && s.bay?.toLowerCase() === parsed.bay.toLowerCase()
    );
    if (byLvlBay) return (byLvlBay as any).slotCode;
  }

  return null;
}

export function bayCountToChar(count: number): string {
  const safeCount = Math.max(1, Math.min(26, count || 1));
  return String.fromCharCode('a'.charCodeAt(0) + safeCount - 1);
}

export function charToBayCount(char: string): number {
  if (!char) return 1;
  const code = char.toLowerCase().charCodeAt(0);
  const aCode = 'a'.charCodeAt(0);
  const count = code - aCode + 1;
  return Math.max(1, Math.min(26, count || 1));
}

export function generateStandard4PalletSlots(rackId: string): string[] {
  return ['P1', 'P2', 'P3', 'P4'];
}

export type SlotAddressFormat = 'with_prefix' | 'standard' | 'with_qty' | 'sub_pallets';

export function generateSlotsFromLevelAndBays(
  levels: number,
  maxBayChar: string,
  rackPrefix: string = '',
  formatStyle: SlotAddressFormat = 'with_prefix',
  palletsPerSlot: number = 4,
  orderByBayFirst: boolean = true
): string[] {
  const slots: string[] = [];
  const startChar = 'a'.charCodeAt(0);
  const endChar = (maxBayChar || 'm').toLowerCase().charCodeAt(0);
  const prefix = rackPrefix ? rackPrefix.trim().toUpperCase() : '';
  const safeLevels = Math.max(1, levels || 1);
  const safePallets = Math.max(1, palletsPerSlot || 4);

  if (orderByBayFirst) {
    // Susunan per Kolom / Bay terlebih dahulu (Bay a: 1a, 2a, 3a, 4a... Bay b: 1b, 2b...)
    // Persis seperti tampilan fisik rak gudang dan screenshot Rak D
    for (let c = startChar; c <= endChar; c++) {
      const bayLetter = String.fromCharCode(c);
      for (let lvl = 1; lvl <= safeLevels; lvl++) {
        const baseAddr = `${prefix ? prefix : ''}${lvl}${bayLetter}`;
        if (formatStyle === 'with_qty') {
          slots.push(`${baseAddr} [${safePallets}P]`);
        } else if (formatStyle === 'sub_pallets') {
          for (let p = 1; p <= safePallets; p++) {
            slots.push(`${baseAddr}-P${p}`);
          }
        } else if (formatStyle === 'standard') {
          slots.push(`${lvl}${bayLetter}`);
        } else {
          // 'with_prefix' (or default)
          slots.push(baseAddr);
        }
      }
    }
  } else {
    // Susunan per Tingkat / Level terlebih dahulu
    for (let lvl = 1; lvl <= safeLevels; lvl++) {
      for (let c = startChar; c <= endChar; c++) {
        const bayLetter = String.fromCharCode(c);
        const baseAddr = `${prefix ? prefix : ''}${lvl}${bayLetter}`;
        if (formatStyle === 'with_qty') {
          slots.push(`${baseAddr} [${safePallets}P]`);
        } else if (formatStyle === 'sub_pallets') {
          for (let p = 1; p <= safePallets; p++) {
            slots.push(`${baseAddr}-P${p}`);
          }
        } else if (formatStyle === 'standard') {
          slots.push(`${lvl}${bayLetter}`);
        } else {
          slots.push(baseAddr);
        }
      }
    }
  }
  return slots;
}

export function parseSlotsString(raw: string, rackId?: string): string[] {
  if (!raw) return [];
  const cleanId = rackId ? rackId.trim().toUpperCase() : '';
  const rawItems = raw.split(',');
  const resultSet = new Set<string>();

  rawItems.forEach(item => {
    let clean = item.trim();
    if (!clean) return;

    // 1. Remove bracketed/parenthesized quantity notes e.g. [4P], (4 Pallet), {4}
    clean = clean.replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();

    // 2. Remove sub-pallet suffixes like -P1, -P2, -1, etc.
    clean = clean.replace(/-(?:P|p)?\d+$/, '').trim();

    // 3. Remove leading RAK- or rackId prefix
    clean = clean.replace(/^RAK-/i, '');
    if (cleanId && clean.toUpperCase().startsWith(cleanId)) {
      clean = clean.slice(cleanId.length);
    }

    // 4. Also check if clean has any prefix letter before the digits
    const match = clean.match(/^([a-zA-Z]*)(\d+)([a-zA-Z]+)$/);
    if (match) {
      // match[2] is level digits, match[3] is bay letter
      const normalizedSuffix = `${match[2]}${match[3].toLowerCase()}`;
      resultSet.add(normalizedSuffix);
    } else {
      const lower = clean.toLowerCase();
      if (lower) resultSet.add(lower);
    }
  });

  return Array.from(resultSet);
}
