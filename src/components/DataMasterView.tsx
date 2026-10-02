/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Layers, Boxes, ShieldCheck, Users, MapPin } from 'lucide-react';
import { RackData, ProductItem, UserRole, ActivityLog, EmployeePIC, StagingAreaInfo } from '../types';
import { MasterRakView } from './MasterRakView';
import { MasterProdukView } from './MasterProdukView';
import { AuditLogView } from './AuditLogView';
import { MasterEmployeePicView } from './MasterEmployeePicView';
import { MasterStagingAreaView } from './MasterStagingAreaView';
import { getStoredStagingAreas } from '../data/stagingAreas';

interface DataMasterViewProps {
  racks: Record<string, RackData>;
  products: ProductItem[];
  employees: EmployeePIC[];
  userRole: UserRole;
  logs: ActivityLog[];
  stagingAreas?: StagingAreaInfo[];
  onUpdateStagingAreas?: (areas: StagingAreaInfo[]) => void;
  onSaveRack: (rack: RackData) => void;
  onDeleteRack: (rackId: string) => void;
  onSelectRackForVisual: (rackId: string) => void;
  onPrintRackBarcodes: (rackId: string) => void;
  onSaveProduct: (product: ProductItem) => void;
  onDeleteProduct: (productId: string) => void;
  onSelectProductForLabel: (product: ProductItem) => void;
  onSaveEmployee: (employee: EmployeePIC) => void;
  onDeleteEmployee: (employeeId: string) => void;
  onOpenAuditScanner: (slotCode?: string) => void;
  onExportCsvLogs: () => void;
  initialTab?: 'rak' | 'produk' | 'karyawan' | 'staging' | 'audit';
}

export const DataMasterView: React.FC<DataMasterViewProps> = ({
  racks,
  products,
  employees,
  userRole,
  logs,
  stagingAreas: propStagingAreas,
  onUpdateStagingAreas: propOnUpdateStagingAreas,
  onSaveRack,
  onDeleteRack,
  onSelectRackForVisual,
  onPrintRackBarcodes,
  onSaveProduct,
  onDeleteProduct,
  onSelectProductForLabel,
  onSaveEmployee,
  onDeleteEmployee,
  onOpenAuditScanner,
  onExportCsvLogs,
  initialTab = 'rak'
}) => {
  const [activeMasterTab, setActiveMasterTab] = useState<'rak' | 'produk' | 'karyawan' | 'staging' | 'audit'>(initialTab);
  const [localStagingAreas, setLocalStagingAreas] = useState<StagingAreaInfo[]>(() => getStoredStagingAreas());

  const currentStagingAreas = propStagingAreas || localStagingAreas;
  const handleUpdateStaging = (updated: StagingAreaInfo[]) => {
    setLocalStagingAreas(updated);
    if (propOnUpdateStagingAreas) {
      propOnUpdateStagingAreas(updated);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Data Master Gudang
              </h2>
              <span className="bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                Master Files
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pusat pengelolaan master rak gudang, katalog produk, data master karyawan (NIK), lokasi staging / transit (foto & kapasitas), dan audit stok.
            </p>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 flex-wrap">
          <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            {Object.keys(racks).length} Master Rak
          </span>
          <span className="bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            {products.length} Master Produk FG
          </span>
          <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-200">
            {currentStagingAreas.length} Lokasi Staging
          </span>
          <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-200 font-mono">
            {employees.length} NIK Karyawan
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs inside Data Master */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveMasterTab('rak')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeMasterTab === 'rak'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Master Rak Gudang</span>
        </button>

        <button
          onClick={() => setActiveMasterTab('produk')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeMasterTab === 'produk'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Master Produk (BOX)</span>
        </button>

        <button
          onClick={() => setActiveMasterTab('staging')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeMasterTab === 'staging'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Master Lokasi Staging & Transit (Foto)</span>
        </button>

        <button
          onClick={() => setActiveMasterTab('karyawan')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeMasterTab === 'karyawan'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Master Karyawan & PIC (NIK)</span>
        </button>

        <button
          onClick={() => setActiveMasterTab('audit')}
          className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
            activeMasterTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit & Keakurasian Stok</span>
        </button>
      </div>

      {/* Content Rendering based on Tab */}
      <div>
        {activeMasterTab === 'rak' && (
          <MasterRakView
            racks={racks}
            userRole={userRole}
            onSaveRack={onSaveRack}
            onDeleteRack={onDeleteRack}
            onSelectRackForVisual={onSelectRackForVisual}
            onPrintRackBarcodes={onPrintRackBarcodes}
          />
        )}

        {activeMasterTab === 'produk' && (
          <MasterProdukView
            products={products}
            userRole={userRole}
            onSaveProduct={onSaveProduct}
            onDeleteProduct={onDeleteProduct}
            onSelectProductForLabel={onSelectProductForLabel}
          />
        )}

        {activeMasterTab === 'staging' && (
          <MasterStagingAreaView
            stagingAreas={currentStagingAreas}
            onUpdateStagingAreas={handleUpdateStaging}
            userRole={userRole}
          />
        )}

        {activeMasterTab === 'karyawan' && (
          <MasterEmployeePicView
            employees={employees}
            userRole={userRole}
            onSaveEmployee={onSaveEmployee}
            onDeleteEmployee={onDeleteEmployee}
          />
        )}

        {activeMasterTab === 'audit' && (
          <AuditLogView
            logs={logs}
            racks={racks}
            userRole={userRole}
            onOpenAuditScanner={onOpenAuditScanner}
            onExportCsv={onExportCsvLogs}
          />
        )}
      </div>

    </div>
  );
};

