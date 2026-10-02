/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  writeBatch,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { RackData, ProductItem, UserAccount, EmployeePIC, ActivityLog } from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (using specific databaseId if configured)
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Clean helper: Firestore rejects objects with undefined values.
// JSON serialization removes undefined values cleanly and recursively.
export function cleanForFirestore<T>(data: T): T {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (err) {
    console.warn('[Firebase] Clean data serialization warning:', err);
    return data;
  }
}

// Connection test as required by skill guidelines
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Connected to Firestore database successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline. Firestore will cache locally.');
    } else {
      console.log('[Firebase] Connection check:', error);
    }
    return false;
  }
}

// -------------------------------------------------------------
// RACKS SYNC
// -------------------------------------------------------------
export function subscribeToRacks(callback: (racks: Record<string, RackData>) => void) {
  const racksCol = collection(db, 'racks');
  return onSnapshot(racksCol, (snapshot) => {
    if (snapshot.empty) return;
    const racksMap: Record<string, RackData> = {};
    snapshot.forEach((docSnap) => {
      racksMap[docSnap.id] = docSnap.data() as RackData;
    });
    callback(racksMap);
  }, (err) => {
    console.error('[Firebase] Racks subscription error:', err);
  });
}

export async function saveRackToCloud(rack: RackData) {
  try {
    const cleaned = cleanForFirestore(rack);
    await setDoc(doc(db, 'racks', rack.id), cleaned);
    console.log(`[Firebase] Successfully updated rack ${rack.id} in cloud`);
  } catch (err) {
    console.error(`[Firebase] Failed to save rack ${rack.id}:`, err);
  }
}

export async function saveAllRacksToCloud(racks: Record<string, RackData>) {
  try {
    const batch = writeBatch(db);
    Object.values(racks).forEach(rack => {
      const rackRef = doc(db, 'racks', rack.id);
      batch.set(rackRef, cleanForFirestore(rack));
    });
    await batch.commit();
    console.log('[Firebase] Successfully saved all racks to cloud');
  } catch (err) {
    console.error('[Firebase] Failed to save all racks batch:', err);
  }
}

export async function deleteRackFromCloud(rackId: string) {
  try {
    await deleteDoc(doc(db, 'racks', rackId));
  } catch (err) {
    console.error('[Firebase] Failed to delete rack:', err);
  }
}

// -------------------------------------------------------------
// PRODUCTS SYNC
// -------------------------------------------------------------
export function subscribeToProducts(callback: (products: ProductItem[]) => void) {
  const prodCol = collection(db, 'products');
  return onSnapshot(prodCol, (snapshot) => {
    if (snapshot.empty) return;
    const list: ProductItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ProductItem);
    });
    callback(list);
  }, (err) => {
    console.error('[Firebase] Products subscription error:', err);
  });
}

export async function saveProductToCloud(product: ProductItem) {
  try {
    await setDoc(doc(db, 'products', product.id), cleanForFirestore(product));
  } catch (err) {
    console.error('[Firebase] Failed to save product:', err);
  }
}

export async function saveAllProductsToCloud(products: ProductItem[]) {
  try {
    const batch = writeBatch(db);
    products.forEach(p => {
      const ref = doc(db, 'products', p.id);
      batch.set(ref, cleanForFirestore(p));
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firebase] Failed to save products batch:', err);
  }
}

export async function deleteProductFromCloud(productId: string) {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    console.error('[Firebase] Failed to delete product:', err);
  }
}

// -------------------------------------------------------------
// USERS SYNC
// -------------------------------------------------------------
export function subscribeToUsers(callback: (users: UserAccount[]) => void) {
  const usersCol = collection(db, 'users');
  return onSnapshot(usersCol, (snapshot) => {
    if (snapshot.empty) return;
    const list: UserAccount[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as UserAccount);
    });
    callback(list);
  }, (err) => {
    console.error('[Firebase] Users subscription error:', err);
  });
}

export async function saveUserToCloud(user: UserAccount) {
  try {
    await setDoc(doc(db, 'users', user.id), cleanForFirestore(user));
  } catch (err) {
    console.error('[Firebase] Failed to save user:', err);
  }
}

export async function saveAllUsersToCloud(users: UserAccount[]) {
  try {
    const batch = writeBatch(db);
    users.forEach(u => {
      const ref = doc(db, 'users', u.id);
      batch.set(ref, cleanForFirestore(u));
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firebase] Failed to save users batch:', err);
  }
}

export async function deleteUserFromCloud(userId: string) {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (err) {
    console.error('[Firebase] Failed to delete user:', err);
  }
}

// -------------------------------------------------------------
// EMPLOYEES SYNC
// -------------------------------------------------------------
export function subscribeToEmployees(callback: (employees: EmployeePIC[]) => void) {
  const empCol = collection(db, 'employees');
  return onSnapshot(empCol, (snapshot) => {
    if (snapshot.empty) return;
    const list: EmployeePIC[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as EmployeePIC);
    });
    callback(list);
  }, (err) => {
    console.error('[Firebase] Employees subscription error:', err);
  });
}

export async function saveEmployeeToCloud(employee: EmployeePIC) {
  try {
    await setDoc(doc(db, 'employees', employee.id), cleanForFirestore(employee));
  } catch (err) {
    console.error('[Firebase] Failed to save employee:', err);
  }
}

export async function deleteEmployeeFromCloud(employeeId: string) {
  try {
    await deleteDoc(doc(db, 'employees', employeeId));
  } catch (err) {
    console.error('[Firebase] Failed to delete employee:', err);
  }
}

export async function saveAllEmployeesToCloud(employees: EmployeePIC[]) {
  try {
    const batch = writeBatch(db);
    employees.forEach(e => {
      const ref = doc(db, 'employees', e.id);
      batch.set(ref, cleanForFirestore(e));
    });
    await batch.commit();
  } catch (err) {
    console.error('[Firebase] Failed to save employees batch:', err);
  }
}

// -------------------------------------------------------------
// ACTIVITY LOGS SYNC
// -------------------------------------------------------------
export function subscribeToLogs(callback: (logs: ActivityLog[]) => void) {
  const logsCol = collection(db, 'logs');
  const q = query(logsCol, limit(100));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) return;
    const list: ActivityLog[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ActivityLog);
    });
    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(list);
  }, (err) => {
    console.error('[Firebase] Logs subscription error:', err);
  });
}

export async function addLogToCloud(newLog: ActivityLog) {
  try {
    await setDoc(doc(db, 'logs', newLog.id), cleanForFirestore(newLog));
  } catch (err) {
    console.error('[Firebase] Failed to add log:', err);
  }
}

// -------------------------------------------------------------
// INITIAL DATABASE SEEDING & FETCH
// -------------------------------------------------------------
export interface CloudWarehouseSnapshot {
  racks?: Record<string, RackData>;
  products?: ProductItem[];
  users?: UserAccount[];
  employees?: EmployeePIC[];
  logs?: ActivityLog[];
  outbound?: any;
  config?: any;
}

export async function fetchInitialCloudData(): Promise<CloudWarehouseSnapshot | null> {
  return fetchLatestCloudDatabase();
}

export async function fetchLatestCloudDatabase(): Promise<CloudWarehouseSnapshot | null> {
  try {
    const racksSnap = await getDocs(collection(db, 'racks'));
    const racks: Record<string, RackData> = {};
    racksSnap.forEach(d => {
      racks[d.id] = d.data() as RackData;
    });

    const productsSnap = await getDocs(collection(db, 'products'));
    const products: ProductItem[] = [];
    productsSnap.forEach(d => {
      products.push(d.data() as ProductItem);
    });

    const usersSnap = await getDocs(collection(db, 'users'));
    const users: UserAccount[] = [];
    usersSnap.forEach(d => {
      users.push(d.data() as UserAccount);
    });

    const empSnap = await getDocs(collection(db, 'employees'));
    const employees: EmployeePIC[] = [];
    empSnap.forEach(d => {
      employees.push(d.data() as EmployeePIC);
    });

    const logsSnap = await getDocs(query(collection(db, 'logs'), limit(100)));
    const logs: ActivityLog[] = [];
    logsSnap.forEach(d => {
      logs.push(d.data() as ActivityLog);
    });
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    let outboundData: any = null;
    try {
      const outSnap = await getDoc(doc(db, 'system_data', 'outbound'));
      if (outSnap.exists()) outboundData = outSnap.data();
    } catch {}

    let configData: any = null;
    try {
      const cfgSnap = await getDoc(doc(db, 'system_data', 'config'));
      if (cfgSnap.exists()) configData = cfgSnap.data();
    } catch {}

    return {
      racks: Object.keys(racks).length > 0 ? racks : undefined,
      products: products.length > 0 ? products : undefined,
      users: users.length > 0 ? users : undefined,
      employees: employees.length > 0 ? employees : undefined,
      logs: logs.length > 0 ? logs : undefined,
      outbound: outboundData,
      config: configData
    };
  } catch (err) {
    console.error('[Firebase] Failed to fetch latest cloud database:', err);
    return null;
  }
}

// -------------------------------------------------------------
// OUTBOUND & SYSTEM CONFIG SYNC
// -------------------------------------------------------------
export async function saveOutboundToCloud(data: {
  planKirimList?: any[];
  transitItems?: any[];
  boRecords?: any[];
}) {
  try {
    await setDoc(doc(db, 'system_data', 'outbound'), cleanForFirestore(data));
  } catch (err) {
    console.error('[Firebase] Failed to save outbound data:', err);
  }
}

export function subscribeToSystemConfig(callback: (config: any) => void) {
  const configDoc = doc(db, 'system_data', 'config');
  return onSnapshot(configDoc, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  }, (err) => {
    console.error('[Firebase] System config subscription error:', err);
  });
}

export async function saveSystemConfigToCloud(data: {
  stagingAreas?: any[];
  rolePermissions?: any;
}) {
  try {
    await setDoc(doc(db, 'system_data', 'config'), cleanForFirestore(data), { merge: true });
  } catch (err) {
    console.error('[Firebase] Failed to save system config:', err);
  }
}

export async function seedInitialCloudDataIfEmpty(
  initialRacks: Record<string, RackData>,
  initialProducts: ProductItem[],
  initialUsers: UserAccount[],
  initialEmployees: EmployeePIC[],
  initialStagingAreas?: any[]
) {
  try {
    const racksSnap = await getDocs(collection(db, 'racks'));
    if (racksSnap.empty) {
      console.log('[Firebase] Cloud database is empty. Seeding initial warehouse data to Firestore...');
      await saveAllRacksToCloud(initialRacks);
      await saveAllProductsToCloud(initialProducts);
      await saveAllUsersToCloud(initialUsers);
      await saveAllEmployeesToCloud(initialEmployees);
      if (initialStagingAreas && initialStagingAreas.length > 0) {
        await saveSystemConfigToCloud({ stagingAreas: initialStagingAreas });
      }
      console.log('[Firebase] Cloud database successfully seeded!');
    }
  } catch (err) {
    console.error('[Firebase] Error checking or seeding cloud data:', err);
  }
}
