/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mengubah format tanggal dari YYYY-MM-DD menjadi DD-MM-YYYY
 * Contoh: '2026-06-30' -> '30-06-2026'
 * Juga mendukung format dengan waktu: '2026-09-28 08:20' -> '28-09-2026 08:20'
 */
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr || dateStr === '-' || dateStr.trim() === '') return '-';
  const trimmed = dateStr.trim();

  // Pola YYYY-MM-DD atau YYYY/MM/DD dengan opsional jam (HH:mm atau HH:mm:ss)
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?))?$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    const timePart = ymdMatch[4] ? ` ${ymdMatch[4]}` : '';
    return `${day}-${month}-${year}${timePart}`;
  }

  // Jika sudah DD-MM-YYYY atau DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?))?$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const timePart = dmyMatch[4] ? ` ${dmyMatch[4]}` : '';
    return `${day}-${month}-${year}${timePart}`;
  }

  // Coba parse dengan objek Date standar
  const d = new Date(trimmed);
  if (!isNaN(d.getTime()) && trimmed.length >= 8) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    // Jika input asli memiliki jam
    if (trimmed.includes(':')) {
      return `${day}-${month}-${year} ${hours}:${minutes}`;
    }
    return `${day}-${month}-${year}`;
  }

  return trimmed;
}

/**
 * Format tanggal hari ini dalam format DD-MM-YYYY
 */
export function getTodayDDMMYYYY(): string {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
