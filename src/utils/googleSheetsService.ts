/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RackData, ProductItem, ActivityLog, EmployeePIC, StagingAreaInfo } from '../types';

export const DEFAULT_SPREADSHEET_ID = '1QrGpW5apY27UFbViXVK3GI13lAwbqPO4rGstoas-WtM';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1QrGpW5apY27UFbViXVK3GI13lAwbqPO4rGstoas-WtM/edit?usp=sharing';

/**
 * Ekstrak ID spreadsheet dari URL Google Sheets atau ID langsung
 */
export function extractSpreadsheetId(input: string): string {
  if (!input) return DEFAULT_SPREADSHEET_ID;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

export interface SheetMetadata {
  id: string;
  title: string;
  sheets: { id: number; title: string }[];
}

export interface WarehouseExportData {
  racks: Record<string, RackData>;
  products: ProductItem[];
  employees: EmployeePIC[];
  logs: ActivityLog[];
  stagingAreas?: StagingAreaInfo[];
  operatorName: string;
}

/**
 * Mengambil metadata spreadsheet (Judul file dan nama tab-tab yang sudah ada)
 */
export async function getSpreadsheetMetadata(
  spreadsheetId: string, 
  accessToken: string
): Promise<SheetMetadata> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=spreadsheetId,properties.title,sheets(properties(sheetId,title))`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`Gagal membuka spreadsheet Google: ${message}`);
  }

  const data = await response.json();
  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'SIKUTANG Warehouse Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      id: s.properties?.sheetId,
      title: s.properties?.title
    }))
  };
}

/**
 * Memastikan semua tab / sheet yang dibutuhkan tersedia di spreadsheet.
 * Jika belum ada, otomatis dibuatkan.
 */
export async function ensureSheetTabsExist(
  spreadsheetId: string,
  requiredTabNames: string[],
  accessToken: string
): Promise<void> {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const meta = await getSpreadsheetMetadata(cleanId, accessToken);
  const existingNames = new Set(meta.sheets.map(s => s.title));

  const missingTabs = requiredTabNames.filter(name => !existingNames.has(name));
  if (missingTabs.length === 0) return;

  const requests = missingTabs.map(name => ({
    addSheet: {
      properties: {
        title: name,
        gridProperties: {
          rowCount: 500,
          columnCount: 20
        }
      }
    }
  }));

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.warn('[Google Sheets] Warning adding sheets:', err);
  }
}

/**
 * Format data inbound dari rak gudang
 */
export function formatInboundSheetData(racks: Record<string, RackData>): (string | number)[][] {
  const headers = [
    'TIMESTAMP',
    'SLOT_RAK',
    'NO_PALLET',
    'KODE_ITEM',
    'NAMA_BARANG',
    'BATCH',
    'JUMLAH_BOX',
    'STATUS_IC',
    'PACKING_LINE',
    'TGL_PRODUKSI',
    'JAM_PRODUKSI',
    'BEST_BEFORE',
    'RENTANG_KARTON',
    'WAKTU_SIMPAN',
    'OPERATOR'
  ];

  const rows: (string | number)[][] = [];

  Object.values(racks).forEach(rack => {
    Object.values(rack.slots).forEach(slot => {
      if (slot.status === 'occupied') {
        if (slot.pallets && slot.pallets.length > 0) {
          slot.pallets.forEach(p => {
            rows.push([
              new Date().toISOString().replace('T', ' ').substring(0, 19),
              slot.slotCode,
              p.palletNumber || p.palletId || '-',
              p.itemCode || '-',
              p.itemName || '-',
              p.batchNo || '-',
              p.quantityBox || 15,
              p.icStatus || 'OK',
              p.packingLine || 'PA',
              p.productionDate || '-',
              p.productionTime || '14:35 WIB',
              p.expiryDate || '-',
              p.cartonRangeText || '-',
              p.inboundDate || '-',
              p.inboundBy || '-'
            ]);
          });
        } else if (slot.pallet) {
          rows.push([
            new Date().toISOString().replace('T', ' ').substring(0, 19),
            slot.slotCode,
            slot.pallet.palletNumber || slot.pallet.palletId || '-',
            slot.pallet.itemCode || '-',
            slot.pallet.itemName || '-',
            slot.pallet.batchNo || '-',
            slot.pallet.quantityBox || 15,
            slot.pallet.icStatus || 'OK',
            slot.pallet.packingLine || 'PA',
            slot.pallet.productionDate || '-',
            slot.pallet.productionTime || '14:35 WIB',
            slot.pallet.expiryDate || '-',
            slot.pallet.cartonRangeText || '-',
            slot.pallet.inboundDate || '-',
            slot.pallet.inboundBy || '-'
          ]);
        }
      }
    });
  });

  return [headers, ...rows];
}

/**
 * Format data outbound pengiriman
 */
export function formatOutboundSheetData(): (string | number)[][] {
  const headers = [
    'NO_PLAN',
    'TUJUAN_KIRIM',
    'NOPOL_TRUK',
    'KODE_ITEM',
    'NAMA_BARANG',
    'BATCH',
    'QTY_BOX_KIRIM',
    'STATUS',
    'STAGING_AREA',
    'OPERATOR',
    'WAKTU_UPDATE'
  ];

  let outboundList: any[] = [];
  try {
    const saved = localStorage.getItem('fgw_outbound_plan_kirim_list');
    if (saved) outboundList = JSON.parse(saved);
  } catch {}

  const rows: (string | number)[][] = outboundList.map((o: any) => [
    o.planNo || o.id || 'SJ-MANUAL',
    o.destination || 'DC Wilayah',
    o.truckPlate || '-',
    o.itemCode || '-',
    o.itemName || '-',
    o.batchNo || '-',
    o.quantityBox || 0,
    o.status || 'READY',
    o.stagingCode || '-',
    o.operatorName || '-',
    new Date().toISOString().replace('T', ' ').substring(0, 19)
  ]);

  return [headers, ...rows];
}

/**
 * Format master produk
 */
export function formatMasterProductSheetData(products: ProductItem[]): (string | number)[][] {
  const headers = [
    'KODE_ITEM',
    'NAMA_PRODUK',
    'KATEGORI',
    'BOX_PER_PALLET',
    'BARCODE',
    'STOK_SAAT_INI_BOX',
    'SAFETY_STOCK_BOX',
    'BERAT_PER_BOX_KG'
  ];

  const rows: (string | number)[][] = products.map(p => [
    p.itemCode,
    p.itemName,
    p.category || 'SIC',
    p.boxPerPallet || 15,
    p.barcode || '-',
    p.currentStockBox || 0,
    p.minStockBox || 15,
    p.weightPerBoxKg || 30
  ]);

  return [headers, ...rows];
}

/**
 * Format master rak
 */
export function formatMasterRackSheetData(racks: Record<string, RackData>): (string | number)[][] {
  const headers = [
    'KODE_RAK',
    'NAMA_RAK',
    'ZONA',
    'TINGKAT_LEVEL',
    'JUMLAH_BAY',
    'TOTAL_SLOT',
    'SLOT_TERISI',
    'SLOT_KOSONG',
    'PERSENTASE_TERISI'
  ];

  const rows: (string | number)[][] = Object.values(racks).map(r => {
    const total = Object.keys(r.slots).length;
    const occ = Object.values(r.slots).filter(s => s.status === 'occupied').length;
    const pct = total > 0 ? `${Math.round((occ / total) * 100)}%` : '0%';
    return [
      r.id,
      `Rak ${r.id}`,
      'Zona FG (Barang Jadi)',
      r.maxLevels || 4,
      r.baysList?.length || 13,
      total,
      occ,
      total - occ,
      pct
    ];
  });

  return [headers, ...rows];
}

/**
 * Format stock opname
 */
export function formatStockOpnameSheetData(): (string | number)[][] {
  const headers = [
    'WAKTU_AUDIT',
    'KODE_SLOT',
    'NO_PALLET',
    'KODE_ITEM',
    'NAMA_PRODUK',
    'BATCH',
    'QTY_SISTEM',
    'QTY_FISIK',
    'STATUS_AUDIT',
    'NIK_PEMERIKSA'
  ];

  let opnameRecords: any[] = [];
  try {
    const saved = localStorage.getItem('sikutang_stock_opname_history');
    if (saved) opnameRecords = JSON.parse(saved);
  } catch {}

  const rows: (string | number)[][] = opnameRecords.slice(0, 100).map((r: any) => [
    r.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    r.slotCode || '-',
    r.palletNumber || '-',
    r.itemCode || '-',
    r.itemName || '-',
    r.batchNo || '-',
    r.qtySystem || 15,
    r.qtyPhysical || 15,
    r.status || 'MATCH',
    r.checkerNik || '-'
  ]);

  return [headers, ...rows];
}

/**
 * Format audit logs
 */
export function formatAuditLogsSheetData(logs: ActivityLog[]): (string | number)[][] {
  const headers = [
    'TIMESTAMP',
    'OPERATOR',
    'ROLE',
    'AKSI',
    'KODE_SLOT',
    'DESKRIPSI'
  ];

  const rows: (string | number)[][] = logs.slice(0, 200).map(l => [
    l.timestamp || '-',
    l.userName || '-',
    l.userRole || '-',
    l.action || '-',
    l.slotCode || '-',
    l.description || '-'
  ]);

  return [headers, ...rows];
}

export interface SyncProgressCallback {
  (step: string, percentage: number): void;
}

/**
 * Sinkronisasi seluruh modul gudang langsung ke Google Spreadsheet via REST API v4
 */
export async function syncAllWarehouseDataToGoogleSpreadsheet(
  spreadsheetId: string,
  data: WarehouseExportData,
  accessToken: string,
  onProgress?: SyncProgressCallback
): Promise<{ success: boolean; updatedSheets: string[]; totalRows: number }> {
  const cleanId = extractSpreadsheetId(spreadsheetId);

  onProgress?.('Memeriksa metadata spreadsheet...', 10);
  const REQUIRED_TABS = [
    'INBOUND_PUTAWAY',
    'OUTBOUND_DISPATCH',
    'MASTER_PRODUK',
    'MASTER_RAK',
    'STOCK_OPNAME',
    'LOG_AKTIVITAS'
  ];

  await ensureSheetTabsExist(cleanId, REQUIRED_TABS, accessToken);

  onProgress?.('Menyiapkan baris tabel data gudang...', 30);
  const inboundTable = formatInboundSheetData(data.racks);
  const outboundTable = formatOutboundSheetData();
  const productTable = formatMasterProductSheetData(data.products);
  const rackTable = formatMasterRackSheetData(data.racks);
  const opnameTable = formatStockOpnameSheetData();
  const logTable = formatAuditLogsSheetData(data.logs);

  const sheetUpdates = [
    { title: 'INBOUND_PUTAWAY', values: inboundTable },
    { title: 'OUTBOUND_DISPATCH', values: outboundTable },
    { title: 'MASTER_PRODUK', values: productTable },
    { title: 'MASTER_RAK', values: rackTable },
    { title: 'STOCK_OPNAME', values: opnameTable },
    { title: 'LOG_AKTIVITAS', values: logTable }
  ];

  onProgress?.('Mengosongkan baris lama di spreadsheet...', 50);
  const clearRanges = sheetUpdates.map(s => `'${s.title}'!A1:Z500`);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ranges: clearRanges })
    }
  );

  onProgress?.('Menulis data terbaru ke Google Spreadsheet...', 75);
  const updatePayload = {
    valueInputOption: 'USER_ENTERED',
    data: sheetUpdates.map(s => ({
      range: `'${s.title}'!A1`,
      values: s.values
    }))
  };

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gagal menulis data ke spreadsheet (HTTP ${response.status})`);
  }

  onProgress?.('Selesai! Semua data tersinkronisasi sempurna.', 100);

  const totalRows = sheetUpdates.reduce((acc, curr) => acc + curr.values.length, 0);

  return {
    success: true,
    updatedSheets: REQUIRED_TABS,
    totalRows
  };
}
