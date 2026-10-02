/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'superadmin' | 'supervisor' | 'admin' | 'operator';

export interface PasswordChangeLog {
  id: string;
  changedAt: string;
  changedBy: string;
  type: 'self_change' | 'admin_reset';
  note?: string;
  newPin?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  pin: string;
  avatarColor: string;
  phone?: string;
  status: 'active' | 'inactive';
  lastActive: string;
  passwordChangedAt?: string;
  passwordHistory?: PasswordChangeLog[];
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageMasterProducts: boolean;
  canManageMasterRacks: boolean;
  canPerformPutaway: boolean;
  canPerformPicking: boolean;
  canPerformRelocate: boolean;
  canPerformStockOpname: boolean;
  canApproveAudit: boolean;
  canExportData: boolean;
  canClearData: boolean;
}

export interface EmployeePIC {
  id: string;
  hrisId: string;      // ID HRIS (e.g. "2161105")
  idCard: string;      // ID CARD fisik / RFID badge (e.g. "IDC-908122")
  nik: string;         // Alias for ID HRIS (compatibility)
  name: string;        // e.g. "Budi Santoso"
  department: string;  // e.g. "Warehouse FGW", "Quality Control", "Finance & Accounting", "Internal Audit"
  position?: string;   // e.g. "Supervisor Warehouse", "Operator FGW", "Auditor"
  phone?: string;
  status: 'active' | 'inactive';
}

export interface StockOpnamePICAssignment {
  id: string;
  scannedId?: string;   // ID yang di-scan atau diinput (bisa ID HRIS atau ID CARD)
  hrisId?: string;      // ID HRIS
  idCard?: string;      // ID CARD
  nik: string;          // Compatibility display
  name: string;
  department: string;
  roleInAudit?: string;
  notes?: string;
  matchedType?: 'HRIS' | 'CARD' | 'NONE';
}

export interface StockOpnameSession {
  id: string;
  sessionNumber: string;
  date: string;
  startTime: string;
  endTime?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'verified';
  pics: StockOpnamePICAssignment[];
  notes?: string;
  targetRacks: string[];
  totalItemsChecked: number;
  totalMatch: number;
  totalDiscrepancy: number;
}

export interface ProductItem {
  id: string;
  itemCode: string;
  itemName: string;
  unit: 'BOX'; // Sesuai instruksi: Satuan "BOX"
  category: string;
  boxPerPallet?: number;
  barcode: string;
  minStockBox?: number;
  currentStockBox: number;
  description?: string;
  weightPerBoxKg?: number;
}

export type SlotStatus = 'empty' | 'occupied' | 'reserved' | 'maintenance';

export type ICStatus = 'OK' | 'HOLD' | 'BO';

export interface PalletData {
  palletId: string; // e.g. PLT-001 or PLT-RAK-A-P1-122
  palletNumber?: string; // e.g. "PLT-001" or "001"
  rackingOption?: 'RANGE' | 'MULTI_SCAN'; // Opsi 1 (Range) atau Opsi 2 (Multi-Scan)
  itemCode: string;
  itemName: string;
  quantityBox: number; // Max 15 Box per Pallet
  unit: 'BOX';
  batchNo: string;     // e.g. "274/26"
  packingLine?: 'PA' | 'PB' | string; // PA = Packing 1, PB = Packing 2
  productPin?: string;  // e.g. "122" (Product Identification Number)
  cartonStart?: number; // e.g. 72
  cartonEnd?: number;   // e.g. 86
  cartonRangeText?: string; // e.g. "D072 - D086 (15 Box)"
  scannedCartons?: string[]; // Daftar nomor karton untuk Opsi 2
  productionDate: string;   // e.g. "2026-06-30"
  productionTime?: string;   // e.g. "14:35"
  expiryDate: string;       // e.g. "2028-06-30"
  inboundDate: string;
  inboundBy: string;
  isVerifiedAudit: boolean;
  rawQrCode?: string;
  icStatus?: ICStatus; // 'OK' (Normal), 'HOLD' (Ditahan QC/Admin), 'BO' (Back Order / Rework ke Packing)
  notes?: string;
}

export interface PalletPositionSlot {
  position: number; // 1, 2, 3, 4
  pallet?: PalletData;
  isBlocked?: boolean;
  blockReason?: string;
  blockedAt?: string;
  blockedBy?: string;
}

export interface RackSlot {
  slotCode: string; // e.g. "A1a", "B3d"
  level: number;    // 1, 2, 3, 4, ...
  bay: string;      // a, b, c, ...
  status: SlotStatus;
  pallet?: PalletData; // Primary pallet (for backward compatibility)
  pallets?: PalletData[]; // Array of pallets (up to 4 pallets in this slot)
  palletSlots?: PalletPositionSlot[]; // Specific sub-slots (1..4)
  maxPalletCapacity?: number; // 4 Pallet per Slot (Default: 4)
  isBlocked?: boolean; // Slot terkendala di lapangan sehingga tidak dapat diisi pallet IC
  blockReason?: string; // Alasan kendala fisik (tiang bengkok, pipa hydrant bocor, dll)
  blockedAt?: string;
  blockedBy?: string;
}

export interface RackData {
  id: string;             // A, B, C, D, E, F, G, H, I, J
  primaryProduct: string; // e.g. "Instant Coffee"
  slotsList: string[];    // e.g. ["1a", "1b", ... "4m"] (52 lokasi sel)
  slotCount: number;      // Total slot pallet dikali 4 (Contoh: 52 x 4 = 208 Pallet Slots)
  locationCount?: number; // 52 alamat lokasi
  palletsPerSlot?: number;// 4 pallet per slot (default: 4)
  slots: Record<string, RackSlot>; // keyed by full slot code e.g. "A1a"
  maxLevels: number;      // 4
  baysList: string[];     // ["a", "b", ... "m"] (13 baris)
  notes?: string;
  isBlocked?: boolean;
  blockReason?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'PUTAWAY' | 'PICKING' | 'RELOCATE' | 'AUDIT_VERIFY' | 'CREATE_RACK' | 'UPDATE_RACK' | 'CREATE_PRODUCT' | 'UPDATE_PRODUCT' | 'USER_UPDATE' | 'LOGIN' | 'CONFIG' | 'PLAN_KIRIM' | 'LOAD_ARMADA' | 'SHIP_BO' | 'RESET_SYSTEM' | 'BLOCK_SLOT' | 'UNBLOCK_SLOT';
  slotCode?: string;
  itemCode?: string;
  quantityBox?: number;
  description: string;
}

export type StagingLocation = string;

export interface StagingAreaInfo {
  id: string;
  name: string;
  type: 'LORONG' | 'LOADING' | 'BUFFER' | 'OTHER';
  description: string;
  photoUrl: string;
  capacityPallets: number;
  updatedAt?: string;
  isCustom?: boolean;
}

export interface PlanKirimItem {
  id: string;
  palletId: string;
  itemCode: string;
  itemName: string;
  quantityBox: number;
  totalKg: number;
  batchNo: string;
  sourceSlotCode: string;
  cartonRangeText?: string;
  palletNumber?: string;
  expiryDate?: string;
  scannedAt: string;
  isLoadedToArmada?: boolean;
}

export interface PlanKirim {
  id: string;
  shippingDate: string;
  destination: string;
  stagingLocation: StagingLocation;
  status: 'DRAFT' | 'READY_TO_LOAD' | 'LOADED_SHIPPED';
  items: PlanKirimItem[];
  totalPallets: number;
  totalBox: number;
  totalKg: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  // Armada Details (diisi Admin saat muat)
  vehiclePlateNo?: string;
  vendorName?: string;
  driverName?: string;
  loadedAt?: string;
  loadedBy?: string;
}

export interface TransitItem {
  id: string;
  pallet: PalletData;
  sourceSlotCode: string;
  transitLocation: StagingLocation;
  movedAt: string;
  movedBy: string;
  notes?: string;
}

export interface PengirimanBORecord {
  id: string;
  pallet: PalletData;
  sourceSlotCode: string;
  targetPacking: 'Packing 1' | 'Packing 2';
  timestamp: string;
  operatorName: string;
  notes?: string;
}

export interface AuditSession {
  totalSlots: number;
  occupiedSlots: number;
  verifiedSlots: number;
  accuracyRate: number; // in %
  lastAuditDate: string;
}
