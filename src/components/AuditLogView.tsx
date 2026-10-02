/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Download, 
  History, 
  ShieldCheck, 
  FileText,
  Clock,
  UserCheck
} from 'lucide-react';
import { ActivityLog, RackData, UserRole } from '../types';

interface AuditLogViewProps {
  logs: ActivityLog[];
  racks: Record<string, RackData>;
  userRole: UserRole;
  onOpenAuditScanner: (slotCode?: string) => void;
  onExportCsv: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  racks,
  userRole,
  onOpenAuditScanner,
  onExportCsv
}) => {
  const [searchLog, setSearchLog] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');

  // Compute Overall Warehouse Accuracy
  let totalOccupiedSlots = 0;
  let totalVerifiedOccupiedSlots = 0;
  let totalSlotsAllRacks = 0;

  Object.values(racks).forEach(r => {
    totalSlotsAllRacks += r.slotCount;
    Object.values(r.slots).forEach(s => {
      if (s.status === 'occupied' && s.pallet) {
        totalOccupiedSlots++;
        if (s.pallet.isVerifiedAudit) {
          totalVerifiedOccupiedSlots++;
        }
      }
    });
  });

  const accuracyRate = totalOccupiedSlots > 0
    ? Math.round((totalVerifiedOccupiedSlots / totalOccupiedSlots) * 100)
    : 100;

  const filteredLogs = logs.filter(l => {
    const matchesSearch =
      l.userName.toLowerCase().includes(searchLog.toLowerCase()) ||
      (l.slotCode || '').toLowerCase().includes(searchLog.toLowerCase()) ||
      (l.itemCode || '').toLowerCase().includes(searchLog.toLowerCase()) ||
      l.description.toLowerCase().includes(searchLog.toLowerCase());
    const matchesAction = filterAction === 'all' || l.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Accuracy Gauge */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="w-3 h-8 bg-emerald-500 rounded-full inline-block"></span>
              Sistem Keakurasian & Audit Stock Opname
            </h2>
            <p className="text-slate-600 text-sm">
              Evaluasi keakurasian data sistem vs stok fisik di rak secara berkelanjutan melalui pemindaian barcode.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenAuditScanner()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mulai Pemindaian Audit
            </button>
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Ekspor Laporan (CSV)
            </button>
          </div>
        </div>

        {/* Big Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/80">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
              TINGKAT KEAKURASIAN GUDANG
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black font-mono text-emerald-700">{accuracyRate}%</span>
              <span className="text-xs font-bold text-emerald-600">Sesuai Fisik</span>
            </div>
            <div className="w-full bg-emerald-200 h-2 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${accuracyRate}%` }}></div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              TOTAL SLOT TERISI PALLET
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-slate-900">{totalOccupiedSlots}</span>
              <span className="text-xs text-slate-500">dari {totalSlotsAllRacks} Slot</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">Kapasitas Rak A sampai J</p>
          </div>

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200/80">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 block">
              PALLET TERVERIFIKASI
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-indigo-700">{totalVerifiedOccupiedSlots}</span>
              <span className="text-xs font-bold text-indigo-600">Pallet Fisik</span>
            </div>
            <p className="text-[11px] text-indigo-600 mt-3">Telah di-scan oleh supervisor</p>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
              BELUM TERVERIFIKASI
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black font-mono text-amber-700">
                {totalOccupiedSlots - totalVerifiedOccupiedSlots}
              </span>
              <span className="text-xs font-bold text-amber-600">Perlu Audit</span>
            </div>
            <p className="text-[11px] text-amber-600 mt-3">Segera lakukan scan opname</p>
          </div>
        </div>
      </div>

      {/* Audit Trail Activity Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-lg">Log Mutasi & Jejak Audit (Audit Trail)</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari user, slot, deskripsi..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">Semua Aksi</option>
              <option value="PUTAWAY">PUTAWAY (Simpan)</option>
              <option value="PICKING">PICKING (Ambil)</option>
              <option value="RELOCATE">RELOCATE (Pindah)</option>
              <option value="AUDIT_VERIFY">AUDIT (Verifikasi)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-xs uppercase font-semibold border-b border-slate-800">
                <th className="py-3.5 px-6">WAKTU SISTEM</th>
                <th className="py-3.5 px-6">PETUGAS / USER</th>
                <th className="py-3.5 px-6 text-center">JENIS MUTASI</th>
                <th className="py-3.5 px-6 text-center">SLOT RAK</th>
                <th className="py-3.5 px-6">DESKRIPSI LENGKAP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-6 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-3.5 px-6">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{log.userName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full uppercase bg-slate-100 text-slate-600">
                        {log.userRole}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md text-xs font-black font-mono ${
                        log.action === 'PUTAWAY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'PICKING'
                          ? 'bg-rose-100 text-rose-800'
                          : log.action === 'RELOCATE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    {log.slotCode ? (
                      <span className="font-mono font-black text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-900 border border-slate-200">
                        {log.slotCode}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-6 text-xs text-slate-700">
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
