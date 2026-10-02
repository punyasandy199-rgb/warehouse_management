/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductItem, RackData, UserAccount, ActivityLog, RackSlot, EmployeePIC } from '../types';
import { generateSlotsFromLevelAndBays } from '../utils/barcode';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'USR-001',
    name: 'Arga Verbrianto',
    username: 'asst.mgrsc',
    role: 'superadmin',
    pin: '54321',
    avatarColor: 'bg-indigo-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru saja',
    passwordChangedAt: '2026-09-29 01:16',
    passwordHistory: [
      {
        id: 'pwd-1790644571430',
        type: 'admin_reset',
        changedBy: 'Arga Verbrianto (superadmin)',
        note: 'Reset / ubah sandi lewat Configuration System',
        newPin: '54321',
        changedAt: '2026-09-29 01:16'
      }
    ]
  },
  {
    id: 'USR-002',
    name: 'Shandy Ernanto',
    username: 'spv',
    role: 'supervisor',
    pin: '1234',
    avatarColor: 'bg-teal-600',
    phone: '-',
    status: 'active',
    lastActive: '5 menit lalu',
    passwordChangedAt: '2026-09-24 07:32',
    passwordHistory: []
  },
  {
    id: 'USR-003',
    name: 'SEPTIANA YOLANDA PUTRI',
    username: 'admin.yolanda',
    role: 'admin',
    pin: '1234',
    avatarColor: 'bg-amber-600',
    phone: '-',
    status: 'active',
    lastActive: '12 menit lalu',
    passwordChangedAt: '2026-09-24 07:33',
    passwordHistory: []
  },
  {
    id: 'user-1790235218256',
    name: 'MOCHAMAD KEMAL REDONDO',
    username: 'admin.kemal',
    role: 'admin',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru dibuat',
    passwordChangedAt: '2026-09-24 07:33',
    passwordHistory: []
  },
  {
    id: 'user-1790235240713',
    name: 'DADANG PRIHATIN BASKORO',
    username: 'admin.dadang',
    role: 'admin',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru dibuat',
    passwordChangedAt: '2026-09-24 07:34',
    passwordHistory: []
  },
  {
    id: 'user-1790235254500',
    name: 'ARIS SISWANTO',
    username: 'admin.aris',
    role: 'admin',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru dibuat',
    passwordChangedAt: '2026-09-24 07:34',
    passwordHistory: []
  },
  {
    id: 'user-1790644385674',
    name: 'YOGI ARI PRASETYO',
    username: 'operator.yogi',
    role: 'operator',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru dibuat',
    passwordChangedAt: '2026-09-29 01:13',
    passwordHistory: []
  },
  {
    id: 'user-1790644448859',
    name: 'WIKU ADE NUGROHO',
    username: 'operator.wiku',
    role: 'operator',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru dibuat',
    passwordChangedAt: '2026-09-29 01:14',
    passwordHistory: []
  },
  {
    id: 'user-1790644468407',
    name: 'MUCHAMAD CHOIRUDIN',
    username: 'operator.choirudin',
    role: 'operator',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru dibuat',
    passwordChangedAt: '2026-09-29 01:14',
    passwordHistory: []
  },
  {
    id: 'user-1790644556275',
    name: 'RIZAL BISRI',
    username: 'operator.bisri',
    role: 'operator',
    pin: '1234',
    avatarColor: 'bg-blue-600',
    phone: '-',
    status: 'active',
    lastActive: 'Baru dibuat',
    passwordChangedAt: '2026-09-29 01:15',
    passwordHistory: []
  }
];

export const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: 'PRD-001',
    itemCode: '00J.KPI09.K0307001XX',
    itemName: 'SIC 18 C1 (1 X 30 KG)',
    unit: 'BOX',
    category: 'Instant Coffee',
    boxPerPallet: 15,
    barcode: '00JKPI09K0307001XX',
    minStockBox: 300,
    currentStockBox: 0,
    weightPerBoxKg: 30.0,
    description: 'Finished Goods SIC 18 C1 (1 X 30 KG) PT Santos Jaya Abadi'
  },
  {
    id: 'PRD-002',
    itemCode: '00J.KPI01.K0307001XX',
    itemName: 'SIC 18 T (1 X 30 KG)',
    unit: 'BOX',
    category: 'Instant Coffee',
    boxPerPallet: 50,
    barcode: '00JKPI01K0307001XX',
    minStockBox: 250,
    currentStockBox: 0,
    weightPerBoxKg: 30.0,
    description: 'Finished Goods SIC 18 T (1 X 30 KG)'
  },
  {
    id: 'PRD-003',
    itemCode: '00J.KPI11.K0307001XX',
    itemName: 'SIC 9010 M3 (1 X 30 KG)',
    unit: 'BOX',
    category: 'Instant Coffee',
    boxPerPallet: 60,
    barcode: '00JKPI11K0307001XX',
    minStockBox: 200,
    currentStockBox: 0,
    weightPerBoxKg: 30.0,
    description: 'Finished Goods SIC 9010 M3 (1 X 30 KG)'
  },
  {
    id: 'PRD-004',
    itemCode: '00J.KPI10.K0307001XX',
    itemName: 'SIC 01 PC (1 X 30 KG)',
    unit: 'BOX',
    category: 'Instant Coffee',
    boxPerPallet: 60,
    barcode: '00JKPI10K0307001XX',
    minStockBox: 180,
    currentStockBox: 0,
    weightPerBoxKg: 30.0,
    description: 'Finished Goods SIC 01 PC (1 X 30 KG)'
  },
  {
    id: 'PRD-005',
    itemCode: '00J.KPI16.K0307001XX',
    itemName: 'SIC 8590 SD (1 X 30 KG)',
    unit: 'BOX',
    category: 'Instant Coffee',
    boxPerPallet: 50,
    barcode: '00JKPI16K0307001XX',
    minStockBox: 200,
    currentStockBox: 0,
    weightPerBoxKg: 30.0,
    description: 'Finished Goods SIC 8590 SD (1 X 30 KG)'
  },
  {
    id: 'PRD-006',
    itemCode: '00J.KPI18.K0307001XX',
    itemName: 'SIC 25 BR (1 X 30 KG)',
    unit: 'BOX',
    category: 'Instant Coffee',
    boxPerPallet: 40,
    barcode: '00JKPI18K0307001XX',
    minStockBox: 120,
    currentStockBox: 0,
    weightPerBoxKg: 30.0,
    description: 'Finished Goods SIC 25 BR (1 X 30 KG)'
  },
  {
    id: 'PRD-1790069409267',
    itemCode: '00J.KPI10.K0307001F3',
    itemName: 'SJ1801',
    unit: 'BOX',
    category: 'Instant Coffee',
    boxPerPallet: 60,
    barcode: '00JKPI10K0307001F3',
    minStockBox: 200,
    currentStockBox: 0,
    weightPerBoxKg: 30.0,
    description: 'Finished Goods SJ1801'
  }
];

// Helper to build warehouse rack with 4 levels, 13 bays ('a'-'m'), 4 pallet slots per address (Total: 208 Pallet Slots / 3.120 Box / 93.600 Kg)
export function buildFullWarehouseRack(
  id: string,
  primaryProduct: string = 'INSTANT COFFEE SIC 25 BR',
  maxBayChar: string = 'm',
  palletsPerSlot: number = 4
): RackData {
  const startChar = 'a'.charCodeAt(0);
  const endChar = maxBayChar.toLowerCase().charCodeAt(0);
  const baysList: string[] = [];
  const slotsList: string[] = [];
  const slots: Record<string, RackSlot> = {};

  for (let c = startChar; c <= endChar; c++) {
    baysList.push(String.fromCharCode(c));
  }

  for (let lvl = 1; lvl <= 4; lvl++) {
    for (const bay of baysList) {
      const slotSuffix = `${lvl}${bay}`;
      slotsList.push(slotSuffix);
      const fullCode = `${id}${slotSuffix}`;
      slots[fullCode] = {
        slotCode: fullCode,
        level: lvl,
        bay,
        status: 'empty',
        pallets: [],
        maxPalletCapacity: palletsPerSlot,
        isBlocked: false
      };
    }
  }

  const locationCount = slotsList.length; // 52 lokasi alamat (13 baris x 4 tingkat)
  const totalPalletSlots = locationCount * palletsPerSlot; // 52 x 4 = 208 pallet slots

  return {
    id,
    primaryProduct,
    slotsList,
    slotCount: totalPalletSlots, // 208 Pallet Slots
    locationCount,
    palletsPerSlot,
    slots,
    maxLevels: 4,
    baysList,
    notes: `Rak Pallet ${id} - ${baysList.length} Baris x 4 Tingkat = ${locationCount} Alamat x ${palletsPerSlot} Pallet = ${totalPalletSlots} Pallet (${totalPalletSlots * 15} Box / ${totalPalletSlots * 15 * 30} Kg Maks)`
  };
}

// Initial Racks A through I (Bays a through m, 4 levels each) - SEMUA SLOT KOSONG UNTUK SIMULASI FRESH
export function createEmptyRacks(): Record<string, RackData> {
  const rackIds = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const racks: Record<string, RackData> = {};

  rackIds.forEach(id => {
    racks[id] = buildFullWarehouseRack(id, 'INSTANT COFFEE SIC 25 BR', 'm');
  });

  return racks;
}

// Sample Demo Racks jika user ingin memuat contoh pallet terisi
export function createSampleDemoRacks(): Record<string, RackData> {
  const racks = createEmptyRacks();

  // Seed realistic occupied pallets in Rak A and B
  const samplePallets = [
    {
      rack: 'A',
      slot: 'A1a',
      prod: INITIAL_PRODUCTS[0],
      batch: '274/26',
      line: 'PA' as const,
      pin: '122',
      cStart: 72,
      cEnd: 86,
      cRange: 'D072 - D086 (15 Box)',
      qty: 15,
      prodDate: '2026-06-30',
      prodTime: '14:35',
      expDate: '2028-06-30',
      inbound: '2026-09-22 08:30',
      qr: 'PA274/2612230062026D08614353006202630062028086',
      icStatus: 'OK' as const
    },
    {
      rack: 'A',
      slot: 'A2a',
      prod: INITIAL_PRODUCTS[0],
      batch: '274/26',
      line: 'PA' as const,
      pin: '122',
      cStart: 57,
      cEnd: 71,
      cRange: 'D057 - D071 (15 Box)',
      qty: 15,
      prodDate: '2026-06-30',
      prodTime: '14:10',
      expDate: '2028-06-30',
      inbound: '2026-09-22 08:45',
      qr: 'PA274/2612230062026D071141030062028071',
      icStatus: 'HOLD' as const
    },
    {
      rack: 'A',
      slot: 'A3a',
      prod: INITIAL_PRODUCTS[1],
      batch: '275/26',
      line: 'PB' as const,
      pin: '123',
      cStart: 1,
      cEnd: 15,
      cRange: 'D001 - D015 (15 Box)',
      qty: 15,
      prodDate: '2026-06-30',
      prodTime: '15:00',
      expDate: '2028-06-30',
      inbound: '2026-09-22 09:15',
      qr: 'PB275/2612330062026D01515003006202630062028015',
      icStatus: 'BO' as const
    },
    {
      rack: 'B',
      slot: 'B1a',
      prod: INITIAL_PRODUCTS[0],
      batch: '274/26',
      line: 'PA' as const,
      pin: '122',
      cStart: 42,
      cEnd: 56,
      cRange: 'D042 - D056 (15 Box)',
      qty: 15,
      prodDate: '2026-06-30',
      prodTime: '13:45',
      expDate: '2028-06-30',
      inbound: '2026-09-22 10:00',
      qr: 'PA274/2612230062026D05613453006202630062028056',
      icStatus: 'OK' as const
    }
  ];

  samplePallets.forEach(sp => {
    if (racks[sp.rack] && racks[sp.rack].slots[sp.slot]) {
      racks[sp.rack].slots[sp.slot] = {
        ...racks[sp.rack].slots[sp.slot],
        status: 'occupied',
        pallet: {
          palletId: `PLT-${sp.slot}-${sp.batch.replace('/', '-')}`,
          itemCode: sp.prod.itemCode,
          itemName: sp.prod.itemName,
          quantityBox: sp.qty,
          unit: 'BOX',
          batchNo: sp.batch,
          packingLine: sp.line,
          productPin: sp.pin,
          cartonStart: sp.cStart,
          cartonEnd: sp.cEnd,
          cartonRangeText: sp.cRange,
          productionDate: sp.prodDate,
          productionTime: sp.prodTime,
          expiryDate: sp.expDate,
          inboundDate: sp.inbound,
          inboundBy: 'Yogi Ari Prasetyo (Operator)',
          isVerifiedAudit: true,
          rawQrCode: sp.qr,
          icStatus: sp.icStatus,
          notes: 'Kondisi kemasan karton 30 Kg rapi, plastik wrapping 15 box utuh.'
        }
      };
    }
  });

  return racks;
}

// Default initial racks adalah kosong untuk simulasi baru
export function createInitialRacks(): Record<string, RackData> {
  return createEmptyRacks();
}

export const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'LOG-000',
    timestamp: '2026-09-28 08:00:00',
    userId: 'USR-001',
    userName: 'Budi Santoso',
    userRole: 'admin',
    action: 'RESET_SYSTEM',
    slotCode: 'ALL_SLOTS',
    itemCode: 'ALL_ITEMS',
    quantityBox: 0,
    description: 'Sistem Inisialisasi: Seluruh slot rak gudang Finished Goods (FGW) berstatus EMPTY (0 Box). Siap untuk simulasi alur proses Inbound, Putaway, Opname, dan Outbound FEFO.'
  }
];

export const INITIAL_EMPLOYEES: EmployeePIC[] = [
  {
    id: 'EMP-001',
    name: 'SHANDY ERNANTO',
    hrisId: '00028369',
    nik: '00028369',
    idCard: '2161105',
    department: 'SUPPLY CHAIN',
    position: 'SPV',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-002',
    name: 'SEPTIANA YOLANDA PUTRI',
    hrisId: '00067840',
    nik: '00067840',
    idCard: '2260302',
    department: 'SUPPLY CHAIN',
    position: 'ADMIN FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-003',
    name: 'ARIS SISWANTO',
    hrisId: '00041243',
    nik: '00041243',
    idCard: '2190704',
    department: 'SUPPLY CHAIN',
    position: 'ADMIN FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-004',
    name: 'DADANG PRIHATIN BASKORO',
    hrisId: '00014498',
    nik: '00014498',
    idCard: '2121109',
    department: 'SUPPLY CHAIN',
    position: 'ADMIN FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-005',
    name: 'MOCHAMAD KEMAL REDONDO',
    hrisId: '00066463',
    nik: '00066463',
    idCard: '2251101',
    department: 'SUPPLY CHAIN',
    position: 'ADMIN FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-006',
    name: 'MUCHAMAD CHOIRUDIN',
    hrisId: '00008151',
    nik: '00008151',
    idCard: '2110318',
    department: 'SUPPLY CHAIN',
    position: 'OPERATOR FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-1790233377204',
    name: 'RIZAL BISRI',
    hrisId: '00049383',
    nik: '00049383',
    idCard: '2220305',
    department: 'SUPPLY CHAIN',
    position: 'OPERATOR FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-1790233433422',
    name: 'WIKU ADE NUGROHO',
    hrisId: '00014703',
    nik: '00014703',
    idCard: '2121118',
    department: 'SUPPLY CHAIN',
    position: 'OPERATOR FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-1790233467443',
    name: 'YOGI ARI PRASETYO',
    hrisId: '00009344',
    nik: '00009344',
    idCard: '2110903',
    department: 'SUPPLY CHAIN',
    position: 'OPERATOR FGW',
    phone: '-',
    status: 'active'
  },
  {
    id: 'EMP-1790233497422',
    name: 'ARGA VERBRIANTO',
    hrisId: '00007545',
    nik: '00007545',
    idCard: '2110124',
    department: 'SUPPLY CHAIN',
    position: 'ASST. MGR SC',
    phone: '-',
    status: 'active'
  }
];

