/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  RackData, 
  ProductItem, 
  UserAccount, 
  ActivityLog, 
  RackSlot, 
  UserRole,
  EmployeePIC,
  PalletData,
  StagingAreaInfo,
  ICStatus
} from './types';
import { 
  Monitor, 
  Smartphone, 
  Wifi, 
  Battery, 
  Sparkles, 
  CheckCircle2,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { getStoredStagingAreas, saveStoredStagingAreas } from './data/stagingAreas';
import { createInitialRacks, 
  createEmptyRacks,
  createSampleDemoRacks,
  INITIAL_PRODUCTS, 
  INITIAL_USERS, 
  INITIAL_LOGS,
  INITIAL_EMPLOYEES
} from './data/initialData';
import { Header, MainModule } from './components/Header';
import { CompactTopLogin } from './components/CompactTopLogin';
import { LoginScreen } from './components/LoginScreen';
import { InWarehouseView } from './components/InWarehouseView';
import { OutWarehouseView } from './components/OutWarehouseView';
import { StockOpnameView } from './components/StockOpnameView';
import { WarehouseDashboardSummary } from './components/WarehouseDashboardSummary';
import { RackVisualizer } from './components/RackVisualizer';
import { MasterRakView } from './components/MasterRakView';
import { MasterProdukView } from './components/MasterProdukView';
import { AuditLogView } from './components/AuditLogView';
import { UserRoleManagement } from './components/UserRoleManagement';
import { DataMasterView } from './components/DataMasterView';
import { ConfigurationSystemView } from './components/ConfigurationSystemView';
import { BarcodeScannerModal, ScannerMode } from './components/BarcodeScannerModal';
import { SlotDetailModal } from './components/SlotDetailModal';
import { BarcodeLabelModal } from './components/BarcodeLabelModal';
import { RackQrPrintModal } from './components/RackQrPrintModal';
import { LoginModal } from './components/LoginModal';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ClearDataModal } from './components/ClearDataModal';
import { SOPFlowchartView, SOPTab } from './components/SOPFlowchartView';
import { parseSlotCode, findMatchingSlotKey } from './utils/barcode';
import { 
  testConnection,
  subscribeToRacks,
  subscribeToProducts,
  subscribeToUsers,
  subscribeToEmployees,
  subscribeToLogs,
  saveRackToCloud,
  saveAllRacksToCloud,
  deleteRackFromCloud,
  saveProductToCloud,
  saveAllProductsToCloud,
  deleteProductFromCloud,
  saveUserToCloud,
  saveAllUsersToCloud,
  deleteUserFromCloud,
  saveEmployeeToCloud,
  saveAllEmployeesToCloud,
  deleteEmployeeFromCloud,
  addLogToCloud,
  fetchInitialCloudData,
  fetchLatestCloudDatabase,
  seedInitialCloudDataIfEmpty,
  saveOutboundToCloud,
  saveSystemConfigToCloud,
  subscribeToSystemConfig
} from './firebase';

const STORAGE_KEY_RACKS = 'sikutang_racks_v1';
const STORAGE_KEY_PRODUCTS = 'sikutang_products_v1';
const STORAGE_KEY_USERS = 'sikutang_users_v1';
const STORAGE_KEY_LOGS = 'sikutang_logs_v1';
const STORAGE_KEY_EMPLOYEES = 'sikutang_employees_v1';
const STORAGE_KEY_SIM_CLEARED = 'sikutang_sim_cleared_v2';

export default function App() {
  // Load State from LocalStorage or Defaults
  const [racks, setRacks] = useState<Record<string, RackData>>(() => {
    try {
      const isSimCleared = localStorage.getItem(STORAGE_KEY_SIM_CLEARED);
      if (isSimCleared === 'true') {
        const saved = localStorage.getItem(STORAGE_KEY_RACKS);
        if (saved) {
          const parsed = JSON.parse(saved);
          const first = Object.values(parsed)[0] as RackData | undefined;
          if (first && first.baysList && first.baysList.includes('a') && first.baysList.includes('m')) {
            // Normalize loaded racks to 4-pallet slots per address if needed
            Object.values(parsed).forEach((r: any) => {
              const locCount = r.slotsList?.length || Object.keys(r.slots || {}).length;
              if (!r.palletsPerSlot || r.slotCount === locCount) {
                r.palletsPerSlot = 4;
                r.slotCount = locCount * 4;
              }
            });
            return parsed;
          }
        }
      } else {
        // Automatically clear warehouse for simulation on initial run
        localStorage.setItem(STORAGE_KEY_SIM_CLEARED, 'true');
        localStorage.removeItem('fgw_outbound_plan_kirim_list');
        localStorage.removeItem('fgw_outbound_transit_items');
        localStorage.removeItem('fgw_outbound_bo_records');
        const empty = createEmptyRacks();
        localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(empty));
        return empty;
      }
    } catch {}
    return createEmptyRacks();
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const isSimCleared = localStorage.getItem(STORAGE_KEY_SIM_CLEARED);
      if (isSimCleared === 'true') {
        const saved = localStorage.getItem(STORAGE_KEY_PRODUCTS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.some((p: any) => p.itemCode === 'FG-COF-122')) {
            localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
            return INITIAL_PRODUCTS;
          }
          return parsed;
        }
      }
    } catch {}
    return INITIAL_PRODUCTS;
  });

  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((u: any) => u.username === 'admin.budi' || u.username === 'operator.dani')) {
          localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
          return INITIAL_USERS;
        }
        return parsed;
      }
    } catch {}
    return INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    return users[0] || INITIAL_USERS[0];
  });

  const [logs, setLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_LOGS;
  });

  const [employees, setEmployees] = useState<EmployeePIC[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((e: any) => e.name === 'Budi Santoso' && e.id === 'EMP-001')) {
          localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
          return INITIAL_EMPLOYEES;
        }
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((e: any, index: number) => ({
            ...e,
            hrisId: e.hrisId || e.nik || `HRIS-${index + 100}`,
            idCard: e.idCard || (e.nik ? `IDC-908${(index + 22).toString().padStart(3, '0')}` : `IDC-88${index + 100}`),
            nik: e.nik || e.hrisId || `HRIS-${index + 100}`
          }));
        }
      }
    } catch {}
    return INITIAL_EMPLOYEES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch {}
  }, [employees]);

  const handleSaveEmployee = (emp: EmployeePIC) => {
    setEmployees(prev => {
      const idx = prev.findIndex(item => item.id === emp.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = emp;
        return copy;
      }
      return [emp, ...prev];
    });
    saveEmployeeToCloud(emp);
  };

  const handleDeleteEmployee = (empId: string) => {
    setEmployees(prev => prev.filter(item => item.id !== empId));
    deleteEmployeeFromCloud(empId);
  };

  // Authentication State (Tampilan Awal Login)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      const active = localStorage.getItem('sikutang_auth_active');
      return active === 'true';
    } catch {}
    return false; // Default false: tampilkan tampilan awal login saat pertama kali dibuka
  });

  // Master Staging Areas State
  const [stagingAreas, setStagingAreas] = useState<StagingAreaInfo[]>(() => getStoredStagingAreas());

  const handleUpdateStagingAreas = (newAreas: StagingAreaInfo[]) => {
    setStagingAreas(newAreas);
    saveStoredStagingAreas(newAreas);
    saveSystemConfigToCloud({ stagingAreas: newAreas });
  };

  // UI Navigation State: in-warehouse, out-warehouse, stock-opname, data-master, configuration-system, sop-flowchart
  const [activeMainModule, setActiveMainModule] = useState<MainModule>('in-warehouse');
  const [activeTab, setActiveTab] = useState<string>('visual-rak');
  const [activeRackId, setActiveRackId] = useState<string>('A');
  const [sopInitialTab, setSopInitialTab] = useState<SOPTab>('flowchart');

  const handleOpenSOP = (tab: SOPTab = 'flowchart') => {
    setSopInitialTab(tab);
    setActiveMainModule('sop-flowchart');
  };

  // Modals State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<ScannerMode>('LOOKUP');
  const [scannerAllowedModes, setScannerAllowedModes] = useState<ScannerMode[] | undefined>(undefined);
  const [scannerPrefilledSlot, setScannerPrefilledSlot] = useState<string>('');
  const [scannerPutawayOption, setScannerPutawayOption] = useState<'OPTION_1_RANGE' | 'OPTION_2_SCAN_ALL'>('OPTION_1_RANGE');
  
  const [selectedSlot, setSelectedSlot] = useState<RackSlot | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [labelData, setLabelData] = useState<any | null>(null);
  const [isRackQrPrintOpen, setIsRackQrPrintOpen] = useState(false);
  const [printRackId, setPrintRackId] = useState('A');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [simulationResetCounter, setSimulationResetCounter] = useState(0);

  // Platform View Mode: 'web' (Desktop) vs 'android' (Handheld WMS Scanner Smartphone)
  const [deviceViewMode, setDeviceViewMode] = useState<'web' | 'android'>(() => {
    try {
      const saved = localStorage.getItem('sikutang_device_view_mode');
      if (saved === 'android' || saved === 'web') return saved;
    } catch {}
    return 'web';
  });

  const handleToggleDeviceViewMode = (mode: 'web' | 'android') => {
    setDeviceViewMode(mode);
    try {
      localStorage.setItem('sikutang_device_view_mode', mode);
    } catch {}
  };

  // Authentication & Password Management
  const handleSaveNewPassword = (userId: string, newPin: string, note?: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    let updatedUserObj: UserAccount | null = null;
    setUsers(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const history = u.passwordHistory || [];
          const updated = {
            ...u,
            pin: newPin,
            passwordChangedAt: nowStr,
            passwordHistory: [
              ...history,
              {
                id: `pwd-${Date.now()}`,
                changedAt: nowStr,
                changedBy: u.name,
                type: 'self_change' as const,
                note: note || 'Perubahan kata sandi mandiri oleh pengguna'
              }
            ]
          };
          updatedUserObj = updated;
          return updated;
        }
        return u;
      })
    );

    if (updatedUserObj) {
      saveUserToCloud(updatedUserObj);
    }

    if (currentUser.id === userId) {
      setCurrentUser(prev => ({
        ...prev,
        pin: newPin,
        passwordChangedAt: nowStr
      }));
    }

    addLog('CONFIG', `Pengguna ${currentUser.name} memperbarui kata sandi akunnya`, undefined, undefined);
  };

  // -------------------------------------------------------------
  // AUTO-LOGOUT 5 MENIT JIKA TIDAK ADA PROSES / AKTIVITAS
  // -------------------------------------------------------------
  const [autoLogoutNotice, setAutoLogoutNotice] = useState<string | null>(null);
  const lastActivityRef = React.useRef<number>(Date.now());

  useEffect(() => {
    if (!isLoggedIn) return;

    const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 menit tanpa proses / aktivitas

    const registerActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const monitoredEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    monitoredEvents.forEach(evt => window.addEventListener(evt, registerActivity, { passive: true }));

    const idleChecker = setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime >= INACTIVITY_TIMEOUT_MS) {
        setIsLoggedIn(false);
        try {
          localStorage.removeItem('sikutang_auth_active');
        } catch {}
        setAutoLogoutNotice('Sesi login Anda telah berakhir otomatis karena tidak ada proses / aktivitas selama 5 menit untuk menjaga keamanan data gudang. Silakan login kembali.');
        addLog('CONFIG', `Auto-Logout: Sesi ${currentUser.name} ditutup otomatis karena tidak ada aktivitas selama 5 menit`, undefined, undefined);
      }
    }, 4000);

    return () => {
      clearInterval(idleChecker);
      monitoredEvents.forEach(evt => window.removeEventListener(evt, registerActivity));
    };
  }, [isLoggedIn, currentUser]);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
    setAutoLogoutNotice(null);
    lastActivityRef.current = Date.now();
    setActiveMainModule('in-warehouse');
    try {
      localStorage.setItem('sikutang_auth_active', 'true');
    } catch {}
    addLog('LOGIN', `Petugas ${user.name} (${user.role.toUpperCase()}) berhasil login ke sistem`, undefined, undefined);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAutoLogoutNotice(null);
    try {
      localStorage.removeItem('sikutang_auth_active');
    } catch {}
    addLog('CONFIG', `Petugas ${currentUser.name} keluar dari sistem (Logout)`, undefined, undefined);
  };

  // Firebase Real-time sync references
  const isRemoteRacks = React.useRef(false);
  const isRemoteProducts = React.useRef(false);
  const isRemoteUsers = React.useRef(false);
  const isRemoteEmployees = React.useRef(false);
  const isCloudReady = React.useRef(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('syncing');

  // Manual Force Sync All Data to Cloud
  const handleForceSyncToCloud = async (): Promise<boolean> => {
    try {
      setCloudSyncStatus('syncing');
      await saveAllRacksToCloud(racks);
      await saveAllProductsToCloud(products);
      await saveAllUsersToCloud(users);
      await saveAllEmployeesToCloud(employees);

      // Also sync outbound plans
      try {
        const pk = localStorage.getItem('fgw_outbound_plan_kirim_list');
        const tr = localStorage.getItem('fgw_outbound_transit_items');
        const bo = localStorage.getItem('fgw_outbound_bo_records');
        await saveOutboundToCloud({
          planKirimList: pk ? JSON.parse(pk) : [],
          transitItems: tr ? JSON.parse(tr) : [],
          boRecords: bo ? JSON.parse(bo) : []
        });
      } catch {}

      // Also sync system config and staging
      try {
        const perms = localStorage.getItem('sikutang_role_permissions_v2');
        await saveSystemConfigToCloud({
          stagingAreas,
          rolePermissions: perms ? JSON.parse(perms) : undefined
        });
      } catch {}

      setCloudSyncStatus('connected');
      return true;
    } catch (err) {
      console.error('Force sync error:', err);
      setCloudSyncStatus('error');
      return false;
    }
  };

  // Manual Pull Latest Data from Cloud Firestore
  const handlePullFromCloud = async (): Promise<boolean> => {
    try {
      setCloudSyncStatus('syncing');
      const latest = await fetchLatestCloudDatabase();
      if (latest) {
        if (latest.racks && Object.keys(latest.racks).length > 0) {
          setRacks(latest.racks);
          try { localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(latest.racks)); } catch {}
        }
        if (latest.products && latest.products.length > 0) {
          setProducts(latest.products);
          try { localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(latest.products)); } catch {}
        }
        if (latest.users && latest.users.length > 0) {
          setUsers(latest.users);
          try { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(latest.users)); } catch {}
        }
        if (latest.employees && latest.employees.length > 0) {
          setEmployees(latest.employees);
          try { localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(latest.employees)); } catch {}
        }
        if (latest.logs && latest.logs.length > 0) {
          setLogs(latest.logs);
          try { localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(latest.logs)); } catch {}
        }
        if (latest.outbound) {
          try {
            if (latest.outbound.planKirimList) localStorage.setItem('fgw_outbound_plan_kirim_list', JSON.stringify(latest.outbound.planKirimList));
            if (latest.outbound.transitItems) localStorage.setItem('fgw_outbound_transit_items', JSON.stringify(latest.outbound.transitItems));
            if (latest.outbound.boRecords) localStorage.setItem('fgw_outbound_bo_records', JSON.stringify(latest.outbound.boRecords));
          } catch {}
        }
        if (latest.config) {
          try {
            if (latest.config.stagingAreas && Array.isArray(latest.config.stagingAreas) && latest.config.stagingAreas.length > 0) {
              setStagingAreas(latest.config.stagingAreas);
              saveStoredStagingAreas(latest.config.stagingAreas);
            }
            if (latest.config.rolePermissions) {
              localStorage.setItem('sikutang_role_permissions_v2', JSON.stringify(latest.config.rolePermissions));
            }
          } catch {}
        }
        setCloudSyncStatus('connected');
        return true;
      }
      setCloudSyncStatus('connected');
      return false;
    } catch (err) {
      console.error('Pull cloud error:', err);
      setCloudSyncStatus('error');
      return false;
    }
  };

  // Initialize Firebase connection and real-time synchronization
  useEffect(() => {
    let unsubRacks: (() => void) | undefined;
    let unsubProducts: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;
    let unsubEmployees: (() => void) | undefined;
    let unsubLogs: (() => void) | undefined;
    let unsubConfig: (() => void) | undefined;

    async function initCloudSync() {
      setCloudSyncStatus('syncing');
      try {
        // Real-time listener: Racks
        unsubRacks = subscribeToRacks((incomingRacks) => {
          setRacks(prev => ({
            ...prev,
            ...incomingRacks
          }));
          setCloudSyncStatus('connected');
        });

        // Real-time listener: Products
        unsubProducts = subscribeToProducts((incomingProducts) => {
          setProducts(incomingProducts);
          setCloudSyncStatus('connected');
        });

        // Real-time listener: Users
        unsubUsers = subscribeToUsers((incomingUsers) => {
          setUsers(incomingUsers);
          setCloudSyncStatus('connected');
        });

        // Real-time listener: Employees
        unsubEmployees = subscribeToEmployees((incomingEmployees) => {
          setEmployees(incomingEmployees);
          setCloudSyncStatus('connected');
        });

        // Real-time listener: Logs
        unsubLogs = subscribeToLogs((incomingLogs) => {
          setLogs(incomingLogs);
          setCloudSyncStatus('connected');
        });

        // Real-time listener: System Config (Master Lokasi Staging, Lorong & Dock)
        unsubConfig = subscribeToSystemConfig((incomingConfig) => {
          if (incomingConfig?.stagingAreas && Array.isArray(incomingConfig.stagingAreas) && incomingConfig.stagingAreas.length > 0) {
            setStagingAreas(incomingConfig.stagingAreas);
            saveStoredStagingAreas(incomingConfig.stagingAreas);
          }
          if (incomingConfig?.rolePermissions) {
            try {
              localStorage.setItem('sikutang_role_permissions_v2', JSON.stringify(incomingConfig.rolePermissions));
            } catch {}
          }
          setCloudSyncStatus('connected');
        });

        // Check if database needs first-time bootstrap seed or sync latest from cloud
        const cloudData = await fetchInitialCloudData();
        if (cloudData) {
          if (cloudData.racks && Object.keys(cloudData.racks).length > 0) {
            setRacks(cloudData.racks);
          }
          if (cloudData.products && cloudData.products.length > 0) {
            setProducts(cloudData.products);
          }
          if (cloudData.users && cloudData.users.length > 0) {
            setUsers(cloudData.users);
          }
          if (cloudData.employees && cloudData.employees.length > 0) {
            setEmployees(cloudData.employees);
          }
          if (cloudData.logs && cloudData.logs.length > 0) {
            setLogs(cloudData.logs);
          }
          if (cloudData.config?.stagingAreas && Array.isArray(cloudData.config.stagingAreas) && cloudData.config.stagingAreas.length > 0) {
            setStagingAreas(cloudData.config.stagingAreas);
            saveStoredStagingAreas(cloudData.config.stagingAreas);
          } else {
            await saveSystemConfigToCloud({ stagingAreas });
          }
        }
        if (!cloudData || !cloudData.racks || Object.keys(cloudData.racks).length === 0) {
          await seedInitialCloudDataIfEmpty(racks, products, users, employees, stagingAreas);
        }
        setCloudSyncStatus('connected');
      } catch (err) {
        console.warn('Real-time sync setup warning:', err);
        setCloudSyncStatus('offline');
      }
    }

    initCloudSync();

    return () => {
      unsubRacks?.();
      unsubProducts?.();
      unsubUsers?.();
      unsubEmployees?.();
      unsubLogs?.();
      unsubConfig?.();
    };
  }, []);

  // Sync to LocalStorage for instant offline availability (without overwriting Cloud)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(racks));
    } catch {}
  }, [racks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } catch {}
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch {}
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch {}
  }, [logs]);

  // Helper to log activities
  const addLog = (
    action: ActivityLog['action'],
    description: string,
    slotCode?: string,
    itemCode?: string,
    quantityBox?: number
  ) => {
    const newLog: ActivityLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      slotCode,
      itemCode,
      quantityBox,
      description
    };
    setLogs(prev => [newLog, ...prev]);
    addLogToCloud(newLog);
  };

  // RACK ACTIONS
  const handleSaveRack = (rack: RackData) => {
    setRacks(prev => ({
      ...prev,
      [rack.id]: rack
    }));
    saveRackToCloud(rack);
    addLog('CREATE_RACK', `Simpan konfigurasi Master Rak ${rack.id} (${rack.slotCount} slot)`);
  };

  const handleDeleteRack = (rackId: string) => {
    setRacks(prev => {
      const copy = { ...prev };
      delete copy[rackId];
      return copy;
    });
    deleteRackFromCloud(rackId);
    setActiveRackId(prev => {
      if (prev === rackId) {
        const remaining = Object.keys(racks).filter(id => id !== rackId);
        return remaining.length > 0 ? remaining[0] : '';
      }
      return prev;
    });
    addLog('UPDATE_RACK', `Menghapus Rak ${rackId} dari sistem`);
  };

  // PRODUCT ACTIONS
  const handleSaveProduct = (prod: ProductItem) => {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = prod;
        return copy;
      }
      return [...prev, prod];
    });
    saveProductToCloud(prod);
    addLog('CREATE_PRODUCT', `Simpan Master Produk ${prod.itemName} (${prod.itemCode})`, undefined, prod.itemCode);
  };

  const handleDeleteProduct = (prodId: string) => {
    const prod = products.find(p => p.id === prodId);
    setProducts(prev => prev.filter(p => p.id !== prodId));
    deleteProductFromCloud(prodId);
    if (prod) {
      addLog('UPDATE_PRODUCT', `Hapus produk ${prod.itemName} (${prod.itemCode})`, undefined, prod.itemCode);
    }
  };

  // INBOUND / PUTAWAY (PROSES RACKING)
  const handleExecutePutaway = (
    slotCode: string,
    palletData: {
      itemCode: string;
      itemName: string;
      quantityBox: number;
      batchNo: string;
      productionDate: string;
      expiryDate: string;
      palletNumber?: string;
      rackingOption?: 'RANGE' | 'MULTI_SCAN';
      packingLine?: string;
      productPin?: string;
      cartonStart?: number;
      cartonEnd?: number;
      cartonRangeText?: string;
      scannedCartons?: string[];
      productionTime?: string;
      rawQrCode?: string;
      notes?: string;
    }
  ) => {
    const parsed = parseSlotCode(slotCode);
    if (!parsed || !racks[parsed.rackId]) return;

    const rackObj = racks[parsed.rackId];
    const matchedKey = findMatchingSlotKey(rackObj.slots, slotCode) || parsed.canonicalSlotCode;

    const generatedPalletId = palletData.palletNumber
      ? (palletData.palletNumber.toUpperCase().startsWith('PLT') ? palletData.palletNumber.toUpperCase() : `PLT-${palletData.palletNumber.toUpperCase()}`)
      : `PLT-${matchedKey}-${palletData.itemCode}-${Date.now().toString().slice(-4)}`;

    const currentSlot = rackObj.slots[matchedKey];
    if (!currentSlot) return;
    if (currentSlot.isBlocked || currentSlot.status === 'maintenance') {
      alert(`Gagal: Slot ${matchedKey} sedang TERKENDALA DI LAPANGAN (${currentSlot.blockReason || 'Kerusakan fisik'}). Tidak dapat diisikan pallet IC!`);
      return;
    }

    const updatedRack: RackData = {
      ...rackObj,
      slots: {
        ...rackObj.slots,
        [matchedKey]: {
          ...currentSlot,
          status: 'occupied',
          pallet: {
            palletId: generatedPalletId,
            palletNumber: palletData.palletNumber || generatedPalletId,
            rackingOption: palletData.rackingOption || 'RANGE',
            itemCode: palletData.itemCode,
            itemName: palletData.itemName,
            quantityBox: palletData.quantityBox,
            unit: 'BOX',
            batchNo: palletData.batchNo,
            packingLine: palletData.packingLine,
            productPin: palletData.productPin,
            cartonStart: palletData.cartonStart,
            cartonEnd: palletData.cartonEnd,
            cartonRangeText: palletData.cartonRangeText,
            scannedCartons: palletData.scannedCartons,
            productionDate: palletData.productionDate,
            productionTime: palletData.productionTime,
            expiryDate: palletData.expiryDate,
            inboundDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
            inboundBy: `${currentUser.name} (${currentUser.role})`,
            isVerifiedAudit: true,
            rawQrCode: palletData.rawQrCode,
            notes: palletData.notes
          }
        }
      }
    };

    setRacks(prev => ({
      ...prev,
      [parsed.rackId]: updatedRack
    }));
    saveRackToCloud(updatedRack);

    // Update Product stock & sync to cloud
    setProducts(prev => {
      const nextProds = prev.map(p =>
        p.itemCode === palletData.itemCode
          ? { ...p, currentStockBox: p.currentStockBox + palletData.quantityBox }
          : p
      );
      const updatedP = nextProds.find(p => p.itemCode === palletData.itemCode);
      if (updatedP) saveProductToCloud(updatedP);
      return nextProds;
    });

    addLog(
      'PUTAWAY',
      `Racking Pallet ${generatedPalletId}: ${palletData.quantityBox} BOX ${palletData.itemName} (${palletData.rackingOption === 'MULTI_SCAN' ? 'Scan Semua Karton' : 'Input Range Karton'}) ke Slot ${matchedKey} (Batch: ${palletData.batchNo})`,
      matchedKey,
      palletData.itemCode,
      palletData.quantityBox
    );
  };

  // OUTBOUND / PICKING
  const handleExecutePicking = (
    slotCode: string, 
    customNote?: string,
    actionType: ActivityLog['action'] = 'PICKING',
    shouldDeductStock: boolean = true
  ) => {
    const parsed = parseSlotCode(slotCode);
    if (!parsed || !racks[parsed.rackId]) return;

    const rack = racks[parsed.rackId];
    const matchedKey = findMatchingSlotKey(rack.slots, slotCode) || slotCode;
    const slot = rack.slots[matchedKey];
    if (!slot || !slot.pallet) return;

    const pallet = slot.pallet;

    const updatedRack: RackData = {
      ...rack,
      slots: {
        ...rack.slots,
        [matchedKey]: {
          ...rack.slots[matchedKey],
          status: 'empty',
          pallet: undefined
        }
      }
    };

    setRacks(prev => ({
      ...prev,
      [parsed.rackId]: updatedRack
    }));
    saveRackToCloud(updatedRack);

    // Deduct Product Stock & sync to cloud if required
    if (shouldDeductStock) {
      setProducts(prev => {
        const nextProds = prev.map(p =>
          p.itemCode === pallet.itemCode
            ? { ...p, currentStockBox: Math.max(0, p.currentStockBox - pallet.quantityBox) }
            : p
        );
        const updatedP = nextProds.find(p => p.itemCode === pallet.itemCode);
        if (updatedP) saveProductToCloud(updatedP);
        return nextProds;
      });
    }

    addLog(
      actionType,
      customNote || `Picking ${pallet.quantityBox} BOX ${pallet.itemName} keluar dari Slot ${matchedKey}`,
      matchedKey,
      pallet.itemCode,
      pallet.quantityBox
    );
  };

  // PLACE PALLET TO SLOT (e.g. from Transit to Rack)
  const handlePlacePalletToSlot = (
    targetSlotCode: string,
    palletData: PalletData,
    customNote?: string
  ) => {
    const tgt = parseSlotCode(targetSlotCode);
    if (!tgt || !racks[tgt.rackId]) return;

    const targetMatchedKey = findMatchingSlotKey(racks[tgt.rackId].slots, targetSlotCode) || targetSlotCode;

    const updatedRack: RackData = {
      ...racks[tgt.rackId],
      slots: {
        ...racks[tgt.rackId].slots,
        [targetMatchedKey]: {
          ...racks[tgt.rackId].slots[targetMatchedKey],
          status: 'occupied',
          pallet: {
            ...palletData,
            palletId: palletData.palletId || `PLT-${targetMatchedKey}-${palletData.itemCode}`
          }
        }
      }
    };

    setRacks(prev => ({
      ...prev,
      [tgt.rackId]: updatedRack
    }));
    saveRackToCloud(updatedRack);

    addLog(
      'RELOCATE',
      customNote || `Penempatan Pallet ${palletData.itemName} ke Slot ${targetMatchedKey}`,
      targetMatchedKey,
      palletData.itemCode,
      palletData.quantityBox
    );
  };

  // RELOCATE PALLET & UBAH STATUS IC
  const handleExecuteRelocate = (
    sourceSlotCode: string, 
    targetSlotCode: string, 
    customNote?: string,
    newIcStatus?: ICStatus
  ) => {
    const src = parseSlotCode(sourceSlotCode);
    const tgt = parseSlotCode(targetSlotCode);
    if (!src || !tgt || !racks[src.rackId] || !racks[tgt.rackId]) return;

    const sourceMatchedKey = findMatchingSlotKey(racks[src.rackId].slots, sourceSlotCode) || sourceSlotCode;
    const targetMatchedKey = findMatchingSlotKey(racks[tgt.rackId].slots, targetSlotCode) || targetSlotCode;

    const sourceSlot = racks[src.rackId].slots[sourceMatchedKey];
    if (!sourceSlot || !sourceSlot.pallet) return;

    const pallet = sourceSlot.pallet;
    const finalIcStatus = newIcStatus || pallet.icStatus || 'OK';

    // Jika slot tujuan sama dengan slot asal -> Hanya perbarui Status IC (Rak Tetap)
    if (sourceMatchedKey.toLowerCase() === targetMatchedKey.toLowerCase()) {
      const updatedRack: RackData = {
        ...racks[src.rackId],
        slots: {
          ...racks[src.rackId].slots,
          [sourceMatchedKey]: {
            ...sourceSlot,
            pallet: {
              ...pallet,
              icStatus: finalIcStatus,
              notes: customNote ? `${customNote} | ${pallet.notes || ''}` : pallet.notes
            }
          }
        }
      };

      setRacks(prev => ({
        ...prev,
        [src.rackId]: updatedRack
      }));
      saveRackToCloud(updatedRack);

      addLog(
        'RELOCATE',
        customNote || `Perubahan Status IC Pallet ${pallet.itemName} di Slot ${sourceMatchedKey} menjadi [${finalIcStatus}] (Posisi Rak Tetap)`,
        sourceMatchedKey,
        pallet.itemCode,
        pallet.quantityBox
      );
      return;
    }

    // Pindah antar slot berbeda (bisa beda rak atau dalam rak yang sama)
    const updatedSourceRack: RackData = {
      ...racks[src.rackId],
      slots: {
        ...racks[src.rackId].slots,
        [sourceMatchedKey]: {
          ...racks[src.rackId].slots[sourceMatchedKey],
          status: 'empty',
          pallet: undefined
        }
      }
    };

    const targetBaseRack = src.rackId === tgt.rackId ? updatedSourceRack : racks[tgt.rackId];
    const updatedTargetRack: RackData = {
      ...targetBaseRack,
      slots: {
        ...targetBaseRack.slots,
        [targetMatchedKey]: {
          ...targetBaseRack.slots[targetMatchedKey],
          status: 'occupied',
          pallet: {
            ...pallet,
            palletId: `PLT-${targetMatchedKey}-${pallet.itemCode}`,
            icStatus: finalIcStatus,
            notes: customNote ? `${customNote} | ${pallet.notes || ''}` : pallet.notes
          }
        }
      }
    };

    setRacks(prev => {
      if (src.rackId === tgt.rackId) {
        return {
          ...prev,
          [src.rackId]: updatedTargetRack
        };
      }
      return {
        ...prev,
        [src.rackId]: updatedSourceRack,
        [tgt.rackId]: updatedTargetRack
      };
    });

    if (src.rackId === tgt.rackId) {
      saveRackToCloud(updatedTargetRack);
    } else {
      saveRackToCloud(updatedSourceRack);
      saveRackToCloud(updatedTargetRack);
    }

    addLog(
      'RELOCATE',
      customNote || `Pindah Pallet ${pallet.itemName} dari Slot ${sourceMatchedKey} ke Slot ${targetMatchedKey} (Status IC: ${finalIcStatus})`,
      targetMatchedKey,
      pallet.itemCode,
      pallet.quantityBox
    );
  };

  // AUDIT VERIFY
  const handleExecuteAudit = (slotCode: string, isMatch: boolean) => {
    const parsed = parseSlotCode(slotCode);
    if (!parsed || !racks[parsed.rackId]) return;

    const matchedKey = findMatchingSlotKey(racks[parsed.rackId].slots, slotCode) || slotCode;
    const currentRack = racks[parsed.rackId];
    const slot = currentRack.slots[matchedKey];
    if (!slot) return;

    const updatedRack: RackData = {
      ...currentRack,
      slots: {
        ...currentRack.slots,
        [matchedKey]: {
          ...slot,
          pallet: slot.pallet ? {
            ...slot.pallet,
            isVerifiedAudit: isMatch
          } : undefined
        }
      }
    };

    setRacks(prev => ({
      ...prev,
      [parsed.rackId]: updatedRack
    }));
    saveRackToCloud(updatedRack);

    addLog(
      'AUDIT_VERIFY',
      `Audit stock opname Slot ${matchedKey}: ${isMatch ? 'Fisik Cocok 100%' : 'Ada Selisih Fisik'}`,
      matchedKey
    );
  };

  // BACKUP & RESTORE
  const handleExportBackup = () => {
    const data = {
      app: 'SIKUTANG WMS',
      version: '1.0',
      exportDate: new Date().toISOString(),
      racks,
      products,
      users,
      employees,
      logs
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sikutang_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleImportBackup = (jsonData: string): boolean => {
    try {
      const parsed = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      let count = 0;
      if (parsed.racks && Object.keys(parsed.racks).length > 0) {
        setRacks(parsed.racks);
        try { localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(parsed.racks)); } catch {}
        count++;
      }
      if (parsed.products && Array.isArray(parsed.products)) {
        setProducts(parsed.products);
        try { localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(parsed.products)); } catch {}
        count++;
      }
      if (parsed.users && Array.isArray(parsed.users)) {
        setUsers(parsed.users);
        try { localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(parsed.users)); } catch {}
        count++;
      }
      if (parsed.employees && Array.isArray(parsed.employees)) {
        setEmployees(parsed.employees);
        try { localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(parsed.employees)); } catch {}
        count++;
      }
      if (parsed.logs && Array.isArray(parsed.logs)) {
        setLogs(parsed.logs);
        try { localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(parsed.logs)); } catch {}
      }
      if (count > 0) {
        addLog('CONFIG', 'Memulihkan database penuh dari file backup JSON', undefined, undefined);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Import error:', err);
      return false;
    }
  };

  const handleExportCsv = () => {
    const headers = 'ID,WAKTU,PETUGAS,ROLE,AKSI,SLOT,ITEM,JUMLAH_BOX,DESKRIPSI\n';
    const rows = logs
      .map(
        l =>
          `"${l.id}","${l.timestamp}","${l.userName}","${l.userRole}","${l.action}","${l.slotCode || ''}","${
            l.itemCode || ''
          }","${l.quantityBox || ''}","${l.description.replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sikutang_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Reset & Clear Simulation Handlers (Hanya Stok IC yang Dikosongkan, Master Data Rak 100% Tetap Utuh)
  const handleClearForSimulation = (targetRackId?: string) => {
    const isTargetAll = !targetRackId || targetRackId === 'ALL';

    // Salin objek racks yang ada tanpa mengubah struktur master data rak (level, bays, nama rak tetap utuh)
    let clearedBoxTotal = 0;
    const nextRacks = { ...racks };
    const targetKeys = isTargetAll ? Object.keys(nextRacks) : [targetRackId];

    targetKeys.forEach(rId => {
      if (nextRacks[rId]) {
        const currentRack = nextRacks[rId];
        const nextSlots = { ...currentRack.slots };
        Object.keys(nextSlots).forEach(sCode => {
          if (nextSlots[sCode].status === 'occupied') {
            clearedBoxTotal += nextSlots[sCode].pallet?.quantityBox || 0;
          }
          nextSlots[sCode] = {
            ...nextSlots[sCode],
            status: nextSlots[sCode].status === 'maintenance' ? 'maintenance' : 'empty',
            pallet: undefined
          };
        });
        nextRacks[rId] = {
          ...currentRack,
          slots: nextSlots
        };
      }
    });

    setRacks(nextRacks);

    // Hitung ulang stok produk berdasarkan sisa slot terisi di seluruh rak yang masih ada
    const remainingStockMap: Record<string, number> = {};
    Object.values(nextRacks).forEach(rack => {
      Object.values(rack.slots).forEach(slot => {
        if (slot.status === 'occupied' && slot.pallet) {
          const code = slot.pallet.itemCode;
          remainingStockMap[code] = (remainingStockMap[code] || 0) + (slot.pallet.quantityBox || 0);
        }
      });
    });

    const updatedProducts = products.map(p => ({
      ...p,
      currentStockBox: remainingStockMap[p.itemCode] || 0
    }));
    setProducts(updatedProducts);

    const targetDesc = isTargetAll
      ? 'Semua Rak (Master data rak tetap utuh 100%, hanya stok pallet IC dikosongkan)'
      : `Rak ${targetRackId} (Master data rak tetap utuh 100%, hanya stok pallet IC di rak ini dikosongkan)`;

    const cleanLog: ActivityLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'RESET_SYSTEM',
      slotCode: isTargetAll ? 'ALL_SLOTS' : `RACK_${targetRackId}`,
      itemCode: 'STOCK_IC',
      quantityBox: clearedBoxTotal,
      description: `Reset Stok Simulasi: ${targetDesc}. Total ${clearedBoxTotal} Box IC dikosongkan.`
    };
    setLogs(prev => [cleanLog, ...prev]);

    try {
      localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(nextRacks));
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(updatedProducts));
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify([cleanLog]));
      if (isTargetAll) {
        localStorage.removeItem('fgw_outbound_plan_kirim_list');
        localStorage.removeItem('fgw_outbound_transit_items');
        localStorage.removeItem('fgw_outbound_bo_records');
      }
      localStorage.setItem(STORAGE_KEY_SIM_CLEARED, 'true');
    } catch {}

    setSimulationResetCounter(prev => prev + 1);
  };

  const handleLoadDemoData = () => {
    const demo = createSampleDemoRacks();
    setRacks(demo);
    const demoProducts = products.map((p, idx) => ({
      ...p,
      currentStockBox: idx === 0 ? 45 : idx === 1 ? 15 : 0
    }));
    setProducts(demoProducts);

    try {
      localStorage.setItem(STORAGE_KEY_RACKS, JSON.stringify(demo));
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(demoProducts));
    } catch {}

    setSimulationResetCounter(prev => prev + 1);
  };

  const handleFactoryReset = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  // Find empty slots for relocation (hanya slot yang siap pakai dan tidak terkendala)
  const availableEmptySlots: string[] = [];
  Object.values(racks).forEach(r => {
    Object.values(r.slots).forEach(s => {
      if (s.status === 'empty' && !s.isBlocked) {
        availableEmptySlots.push(s.slotCode);
      }
    });
  });

  // Jika belum login: Bagian depan atas ada menu login kecil, dan bagian bawahnya langsung terlihat dashboard
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Bagian depan atas ada menu login kecil */}
        <CompactTopLogin
          users={users}
          onLoginSuccess={handleLoginSuccess}
          cloudSyncStatus={cloudSyncStatus}
          onForceSyncCloud={handleForceSyncToCloud}
          onPullFromCloud={handlePullFromCloud}
          autoLogoutNotice={autoLogoutNotice}
          onDismissNotice={() => setAutoLogoutNotice(null)}
        />

        {/* Bagian bawahnya langsung terlihat dashboard dengan kartu per rak */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <WarehouseDashboardSummary
            racks={racks}
            activeRackId={activeRackId}
            onSelectRackId={setActiveRackId}
            onSlotClick={(slot) => {
              setSelectedSlot(slot);
            }}
            onOpenScannerForSlot={() => {
              alert('Silakan login di menu bagian atas terlebih dahulu untuk menggunakan scanner barcode.');
            }}
            userRole="operator"
          />
        </main>

        {selectedSlot && (
          <SlotDetailModal
            slot={selectedSlot}
            onClose={() => setSelectedSlot(null)}
            userRole="operator"
            onStartPutaway={() => alert('Silakan login terlebih dahulu untuk melakukan Putaway.')}
            onStartPicking={() => alert('Silakan login terlebih dahulu untuk melakukan Picking.')}
            onStartRelocate={() => alert('Silakan login terlebih dahulu untuk melakukan relokasi.')}
            onVerifyAudit={() => alert('Silakan login terlebih dahulu untuk verifikasi audit.')}
            onPrintLabel={() => {}}
            availableEmptySlots={availableEmptySlots}
          />
        )}
      </div>
    );
  }

  const isAndroid = deviceViewMode === 'android';

  const mainAppView = (
    <div className={`text-slate-900 flex flex-col w-full overflow-x-hidden ${isAndroid ? 'min-h-[760px] bg-slate-50 text-xs' : 'min-h-screen bg-slate-50'}`}>
      {/* Top Main Navigation Header */}
      <Header
        currentUser={currentUser}
        users={users}
        onSwitchUser={setCurrentUser}
        onOpenScanner={() => {
          setScannerMode('LOOKUP');
          setScannerPrefilledSlot('');
          setIsScannerOpen(true);
        }}
        onOpenRackQrPrint={() => setIsRackQrPrintOpen(true)}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenChangePasswordModal={() => setIsChangePasswordModalOpen(true)}
        onOpenClearDataModal={() => setIsClearDataModalOpen(true)}
        onLogout={handleLogout}
        activeMainModule={activeMainModule}
        onSelectMainModule={setActiveMainModule}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        deviceViewMode={deviceViewMode}
        onToggleDeviceViewMode={handleToggleDeviceViewMode}
        cloudSyncStatus={cloudSyncStatus}
        onForceSyncCloud={handleForceSyncToCloud}
        onPullFromCloud={handlePullFromCloud}
      />

      {/* Main Container */}
      <main className={`flex-1 w-full max-w-full mx-auto overflow-x-hidden ${isAndroid ? 'px-2 py-2.5' : 'max-w-7xl px-4 sm:px-6 lg:px-8 py-6'}`}>
        {/* Modul: Dashboard Gudang (All-in-one: Ringkasan Total Box & Slot Kosong + Status Per Rak & Denah Visual Terintegrasi) */}
        {(activeMainModule === 'dashboard' || activeMainModule === 'main-hub') && (
          <WarehouseDashboardSummary
            racks={racks}
            activeRackId={activeRackId}
            onSelectRackId={setActiveRackId}
            onSlotClick={(slot) => setSelectedSlot(slot)}
            onOpenScannerForSlot={(slotCode) => {
              setScannerMode('LOOKUP');
              setScannerAllowedModes(['LOOKUP']);
              setScannerPrefilledSlot(slotCode);
              setIsScannerOpen(true);
            }}
            onOpenPrintRackQr={(rId) => {
              setPrintRackId(rId);
              setIsRackQrPrintOpen(true);
            }}
            userRole={currentUser.role}
            isAndroid={isAndroid}
          />
        )}

        {/* Modul: Stock Opname Barang Jadi (Sesi, PIC NIK Scan, Verifikasi Fisik Slot & Cetak Berita Acara) */}
        {activeMainModule === 'stock-opname' && (
          <StockOpnameView
            employees={employees}
            racks={racks}
            products={products}
            userRole={currentUser.role}
            currentUserName={currentUser.name}
            currentUser={currentUser}
            allUsers={users}
            onSwitchUser={(user) => {
              setCurrentUser(user);
              addLog('LOGIN', `Beralih ke akun ${user.name} (${user.role.toUpperCase()}) untuk verifikasi Opname`, undefined, undefined);
            }}
            onUpdateRacks={setRacks}
            onSaveAuditLog={(slotCode, isMatch, actualQty, notes) => {
              handleExecuteAudit(slotCode, isMatch);
              if (notes) {
                addLog('AUDIT_VERIFY', `Hasil audit fisik Slot ${slotCode}: ${isMatch ? 'Cocok' : 'Selisih'} (${notes})`, slotCode);
              }
            }}
            onOpenMasterEmployee={() => {
              setActiveMainModule('data-master');
            }}
            onOpenScannerAudit={(slotCode) => {
              setScannerMode('AUDIT');
              setScannerAllowedModes(['AUDIT']);
              setScannerPrefilledSlot(slotCode || '');
              setIsScannerOpen(true);
            }}
            onOpenSOP={() => handleOpenSOP('opname')}
          />
        )}

        {/* Modul: Data Master (Master Rak, Master Produk BOX, Master Karyawan NIK, Audit Keakurasian Stok) */}
        {activeMainModule === 'data-master' && (
          <DataMasterView
            racks={racks}
            products={products}
            employees={employees}
            userRole={currentUser.role}
            logs={logs}
            stagingAreas={stagingAreas}
            onUpdateStagingAreas={handleUpdateStagingAreas}
            onSaveRack={handleSaveRack}
            onDeleteRack={handleDeleteRack}
            onSelectRackForVisual={(rackId) => {
              setActiveRackId(rackId);
              setActiveMainModule('in-warehouse');
            }}
            onPrintRackBarcodes={(rackId) => {
              setPrintRackId(rackId);
              setIsRackQrPrintOpen(true);
            }}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onSelectProductForLabel={(prod) => {
              setLabelData({
                type: 'product',
                code: prod.barcode,
                title: prod.itemName,
                subtitle: prod.category,
                itemCode: prod.itemCode,
                quantityBox: prod.boxPerPallet
              });
              setIsLabelModalOpen(true);
            }}
            onSaveEmployee={handleSaveEmployee}
            onDeleteEmployee={handleDeleteEmployee}
            onOpenAuditScanner={(slotCode) => {
              setScannerMode('AUDIT');
              setScannerPrefilledSlot(slotCode || '');
              setIsScannerOpen(true);
            }}
            onExportCsvLogs={handleExportCsv}
          />
        )}

        {/* Modul: Configuration System (Manajemen Akun, Matriks Hak Akses, Cloud Firebase & GitHub) */}
        {activeMainModule === 'configuration-system' && (
          <ConfigurationSystemView
            users={users}
            currentUser={currentUser}
            onSaveUser={(u) => {
              setUsers(prev => {
                const idx = prev.findIndex(item => item.id === u.id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = u;
                  return copy;
                }
                return [...prev, u];
              });
              saveUserToCloud(u);
              if (u.id === currentUser.id) setCurrentUser(u);
            }}
            onDeleteUser={(uId) => {
              setUsers(prev => prev.filter(item => item.id !== uId));
              deleteUserFromCloud(uId);
            }}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onExportCsvLogs={handleExportCsv}
            onOpenClearDataModal={() => setIsClearDataModalOpen(true)}
            logs={logs}
            cloudSyncStatus={cloudSyncStatus}
            onForceSyncCloud={handleForceSyncToCloud}
          />
        )}

        {/* Modul: SOP & Flow Chart Alur Proses Aplikasi */}
        {activeMainModule === 'sop-flowchart' && (
          <SOPFlowchartView
            initialTab={sopInitialTab}
            onNavigateToModule={(mod) => setActiveMainModule(mod)}
            userRole={currentUser.role}
          />
        )}

        {/* Modul 3: Proses In Warehouse (Warna Hijau) */}
        {activeMainModule === 'in-warehouse' && (
          <InWarehouseView
            racks={racks}
            products={products}
            userRole={currentUser.role}
            onOpenScannerPutaway={(prefillSlot, opt) => {
              setScannerMode('PUTAWAY');
              setScannerAllowedModes(['PUTAWAY']);
              setScannerPrefilledSlot(prefillSlot || '');
              if (opt) setScannerPutawayOption(opt);
              setIsScannerOpen(true);
            }}
            onBackToMenuHub={() => setActiveMainModule('in-warehouse')}
            onOpenSOP={() => handleOpenSOP('inbound')}
          />
        )}

        {/* Modul 4: Proses Out Warehouse (Warna Merah) */}
        {activeMainModule === 'out-warehouse' && (
          <OutWarehouseView
            key={`outbound-${simulationResetCounter}`}
            racks={racks}
            products={products}
            currentUser={currentUser}
            userRole={currentUser.role}
            logs={logs}
            stagingAreas={stagingAreas}
            onOpenScannerPicking={(slotCode) => {
              setScannerMode('PICKING');
              setScannerAllowedModes(['PICKING']);
              setScannerPrefilledSlot(slotCode || '');
              setIsScannerOpen(true);
            }}
            onExecutePickingDirect={handleExecutePicking}
            onExecuteRelocateDirect={handleExecuteRelocate}
            onPlacePalletToSlot={handlePlacePalletToSlot}
            onAddLog={addLog}
            onBackToMenuHub={() => setActiveMainModule('in-warehouse')}
            onOpenSOP={() => handleOpenSOP('outbound')}
          />
        )}
      </main>
    </div>
  );

  return (
    <>
      {isAndroid ? (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-2 sm:p-5 flex flex-col items-center justify-start">
          {/* Top Bar Switcher Indicator */}
          <div className="max-w-md w-full mb-3 flex items-center justify-between bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 text-white text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">Mode Android Handheld WMS</span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleDeviceViewMode('web')}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl shadow transition cursor-pointer flex items-center justify-center"
              title="Kembali ke Tampilan Web Desktop"
              aria-label="Kembali ke Web"
            >
              <Monitor className="w-4 h-4 text-blue-600" />
            </button>
          </div>

          {/* Android Smartphone Shell */}
          <div className="max-w-[430px] w-full bg-slate-900 p-2 sm:p-3 rounded-[44px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] border-4 border-slate-700/70 relative flex flex-col ring-2 ring-black">
            {/* Top Android Status Bar */}
            <div className="pt-0.5 pb-2 flex items-center justify-between px-5 text-white text-[11px] font-mono select-none">
              <div className="flex items-center gap-1.5 font-bold">
                <span>09:41</span>
                <span className="text-[9px] px-1 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-sans">WMS</span>
              </div>
              {/* Speaker & Punch-hole camera */}
              <div className="w-4 h-4 rounded-full bg-black border border-slate-700 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3 h-3 text-slate-300" />
                <span className="text-[10px] font-bold text-slate-300">5G</span>
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            </div>

            {/* Viewport Screen */}
            <div className="w-full max-h-[84vh] overflow-y-auto overflow-x-hidden bg-slate-50 rounded-[28px] flex flex-col shadow-inner">
              {mainAppView}
            </div>

            {/* Android Navigation Gesture Pill */}
            <div className="pt-2 pb-0.5 flex justify-center items-center">
              <div className="w-28 h-1 bg-slate-500/70 rounded-full"></div>
            </div>
          </div>
        </div>
      ) : (
        mainAppView
      )}

      {/* Barcode Scanner Real-Time Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        racks={racks}
        products={products}
        userRole={currentUser.role}
        currentUserName={currentUser.name}
        initialMode={scannerMode}
        allowedModes={scannerAllowedModes}
        contextModule={activeMainModule}
        prefilledSlotCode={scannerPrefilledSlot}
        initialPutawayOption={scannerPutawayOption}
        onExecutePutaway={handleExecutePutaway}
        onExecutePicking={handleExecutePicking}
        onExecuteAudit={handleExecuteAudit}
        onLocateSlot={(slotCode) => {
          const parsed = parseSlotCode(slotCode);
          if (parsed) {
            setActiveRackId(parsed.rackId);
            setActiveTab('visual-rak');
          }
        }}
      />

      {/* Slot Detail & Operations Modal */}
      <SlotDetailModal
        slot={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        userRole={currentUser.role}
        onStartPutaway={(slotCode) => {
          setScannerMode('PUTAWAY');
          setScannerAllowedModes(['PUTAWAY']);
          setScannerPrefilledSlot(slotCode);
          setIsScannerOpen(true);
        }}
        onStartPicking={(slotCode) => {
          handleExecutePicking(slotCode);
        }}
        onStartRelocate={handleExecuteRelocate}
        onVerifyAudit={(slotCode) => {
          handleExecuteAudit(slotCode, true);
        }}
        onPrintLabel={(slotCode, pallet) => {
          setLabelData({
            type: 'pallet',
            code: pallet ? pallet.palletId : slotCode,
            title: pallet ? pallet.itemName : `Slot Lokasi ${slotCode}`,
            subtitle: pallet ? `Batch: ${pallet.batchNo}` : 'Lokasi Rak Pallet WMS FGW',
            itemCode: pallet?.itemCode,
            quantityBox: pallet?.quantityBox,
            batchNo: pallet?.batchNo,
            productionDate: pallet?.productionDate,
            expiryDate: pallet?.expiryDate,
            inboundDate: pallet?.inboundDate,
            inboundBy: pallet?.inboundBy,
            slotCode: slotCode
          });
          setIsLabelModalOpen(true);
        }}
        availableEmptySlots={availableEmptySlots}
      />

      {/* Printable Barcode Label Modal */}
      <BarcodeLabelModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        labelData={labelData}
      />

      {/* Printable Rack QR Code Modal (Pengganti Sticker Fisik) */}
      <RackQrPrintModal
        isOpen={isRackQrPrintOpen}
        onClose={() => setIsRackQrPrintOpen(false)}
        racks={racks}
        initialRackId={printRackId}
      />

      {/* Login & Switch User Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Change Password Modal (Mandiri per Akun) */}
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
        currentUser={currentUser}
        onSaveNewPassword={handleSaveNewPassword}
      />

      {/* Reset & Kosongkan Data Simulasi Modal */}
      <ClearDataModal
        isOpen={isClearDataModalOpen}
        onClose={() => setIsClearDataModalOpen(false)}
        racks={racks}
        onClearForSimulation={handleClearForSimulation}
        onLoadDemoData={handleLoadDemoData}
        onFactoryReset={handleFactoryReset}
      />
    </>
  );
}
