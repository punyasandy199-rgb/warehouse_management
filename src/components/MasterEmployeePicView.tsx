/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  QrCode, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Building2, 
  Printer, 
  X, 
  Camera, 
  IdCard, 
  AlertCircle,
  CreditCard,
  Hash,
  Sparkles
} from 'lucide-react';
import { EmployeePIC, UserRole } from '../types';

interface MasterEmployeePicViewProps {
  employees: EmployeePIC[];
  userRole: UserRole;
  onSaveEmployee: (employee: EmployeePIC) => void;
  onDeleteEmployee: (employeeId: string) => void;
}

export const MasterEmployeePicView: React.FC<MasterEmployeePicViewProps> = ({
  employees,
  userRole,
  onSaveEmployee,
  onDeleteEmployee
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [hrisId, setHrisId] = useState('');
  const [idCard, setIdCard] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Warehouse FGW');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Scan ID Card Simulator Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedIdInput, setScannedIdInput] = useState('');

  // Print Badge Modal State
  const [printBadgeEmployee, setPrintBadgeEmployee] = useState<EmployeePIC | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'superadmin' || userRole === 'supervisor';

  const departmentsList = Array.from(new Set(employees.map(e => e.department))).filter(Boolean);

  const filteredEmployees = employees.filter(emp => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (emp.hrisId && emp.hrisId.toLowerCase().includes(q)) ||
      (emp.idCard && emp.idCard.toLowerCase().includes(q)) ||
      (emp.nik && emp.nik.toLowerCase().includes(q)) ||
      emp.name.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      (emp.position && emp.position.toLowerCase().includes(q));

    const matchesDept = selectedDepartment === 'ALL' || emp.department === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const handleOpenAdd = () => {
    setEditingEmployeeId(null);
    const newRandomHris = `216${Math.floor(1000 + Math.random() * 9000)}`;
    const newRandomCard = `IDC-${Math.floor(100000 + Math.random() * 900000)}`;
    setHrisId(newRandomHris);
    setIdCard(newRandomCard);
    setName('');
    setDepartment('Warehouse FGW');
    setPosition('Petugas Stock Opname');
    setPhone('');
    setStatus('active');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeePIC) => {
    setEditingEmployeeId(emp.id);
    setHrisId(emp.hrisId || emp.nik || '');
    setIdCard(emp.idCard || `IDC-${emp.nik || '001'}`);
    setName(emp.name);
    setDepartment(emp.department);
    setPosition(emp.position || '');
    setPhone(emp.phone || '');
    setStatus(emp.status);
    setIsModalOpen(true);
  };

  const handleGenerateIdCard = () => {
    const randomBadge = `IDC-${Math.floor(100000 + Math.random() * 900000)}`;
    setIdCard(randomBadge);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hrisId.trim() || !idCard.trim() || !name.trim()) {
      alert('Mohon lengkapi ID HRIS, ID CARD, dan Nama Karyawan!');
      return;
    }

    const cleanHris = hrisId.trim();
    const cleanCard = idCard.trim();

    // Check duplicate ID HRIS if new
    const dupHris = employees.find(item => 
      item.id !== editingEmployeeId && 
      ((item.hrisId && item.hrisId.toLowerCase() === cleanHris.toLowerCase()) || 
       (item.nik && item.nik.toLowerCase() === cleanHris.toLowerCase()))
    );
    if (dupHris) {
      alert(`ID HRIS "${cleanHris}" sudah terdaftar atas nama ${dupHris.name} (${dupHris.department})!`);
      return;
    }

    // Check duplicate ID CARD if new
    const dupCard = employees.find(item => 
      item.id !== editingEmployeeId && 
      item.idCard && item.idCard.toLowerCase() === cleanCard.toLowerCase()
    );
    if (dupCard) {
      alert(`ID CARD "${cleanCard}" sudah terdaftar atas nama ${dupCard.name} (${dupCard.department})!`);
      return;
    }

    const employeeToSave: EmployeePIC = {
      id: editingEmployeeId || `EMP-${Date.now()}`,
      hrisId: cleanHris,
      idCard: cleanCard,
      nik: cleanHris,
      name: name.trim(),
      department: department.trim() || 'Warehouse FGW',
      position: position.trim() || 'Petugas Stock Opname',
      phone: phone.trim(),
      status
    };

    onSaveEmployee(employeeToSave);
    setIsModalOpen(false);
  };

  const handleDelete = (emp: EmployeePIC) => {
    if (window.confirm(`Yakin ingin menghapus data karyawan ${emp.name} (ID HRIS: ${emp.hrisId || emp.nik})?`)) {
      onDeleteEmployee(emp.id);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search & Dept Filter */}
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID HRIS (2161105), ID CARD (IDC-908122), Nama, atau Dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="py-2 px-3 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Semua Departemen</option>
            {departmentsList.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScannedIdInput('');
              setIsScannerOpen(true);
            }}
            className="py-2 px-3.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Tes Scan ID (HRIS / ID CARD)</span>
          </button>

          {canEdit && (
            <button
              onClick={handleOpenAdd}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Karyawan / PIC</span>
            </button>
          )}
        </div>
      </div>

      {/* Info Card Banner Dual ID Feature */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 rounded-2xl border border-indigo-200/80 flex items-start gap-3 text-slate-800 text-xs">
        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <strong className="font-bold text-indigo-950 text-sm">
              Sistem Dual-ID Karyawan: 1 Karyawan Memiliki 2 ID Valid
            </strong>
            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
              Dual Scan Active
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Setiap karyawan memiliki <strong>ID HRIS</strong> (NIK Sistem HRIS, misal: <code className="bg-indigo-100/80 text-indigo-900 px-1 py-0.5 rounded font-mono font-bold">2161105</code>) dan <strong>ID CARD</strong> (Barcode/RFID Kartu Fisik, misal: <code className="bg-purple-100/80 text-purple-900 px-1 py-0.5 rounded font-mono font-bold">IDC-908122</code>).
            Keduanya dapat di-scan secara fleksibel; <strong>scan salah satu ID mana pun akan langsung mendeteksi Nama & Departemen</strong> secara otomatis!
          </p>
        </div>
      </div>

      {/* Table of Employees */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ID HRIS (NIK)</span>
                  </div>
                </th>
                <th className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    <span>ID CARD (Fisik)</span>
                  </div>
                </th>
                <th className="py-3 px-4">Nama Karyawan</th>
                <th className="py-3 px-4">Departemen</th>
                <th className="py-3 px-4">Jabatan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">ID Badge</th>
                {canEdit && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data karyawan atau PIC dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                    {/* ID HRIS */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 text-xs">
                        {emp.hrisId || emp.nik}
                      </span>
                    </td>

                    {/* ID CARD */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 text-xs inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-purple-500" />
                        <span>{emp.idCard || `IDC-${emp.nik}`}</span>
                      </span>
                    </td>

                    {/* Nama Karyawan */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {emp.name}
                    </td>

                    {/* Departemen */}
                    <td className="py-3 px-4 text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{emp.department}</span>
                    </td>

                    {/* Jabatan */}
                    <td className="py-3 px-4 text-slate-600">
                      {emp.position || '-'}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        emp.status === 'active' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {emp.status === 'active' ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </td>

                    {/* Cetak Badge */}
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setPrintBadgeEmployee(emp)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 transition cursor-pointer"
                        title="Cetak ID Card Barcode Dual-ID"
                      >
                        <IdCard className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Aksi Edit/Delete */}
                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Data Karyawan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Hapus Karyawan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit Employee with Dual ID Inputs */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>{editingEmployeeId ? 'Edit Data Karyawan (Dual ID)' : 'Tambah Karyawan Baru (Dual ID)'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 mt-4 text-xs sm:text-sm">
              {/* ID HRIS */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ID HRIS (NIK Karyawan) <span className="text-rose-500">*</span></span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2161105"
                  value={hrisId}
                  onChange={(e) => setHrisId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Nomor Induk Karyawan pada aplikasi HRIS perusahaan.
                </span>
              </div>

              {/* ID CARD */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                    <span>ID CARD (Nomor Kartu / Barcode Fisik) <span className="text-rose-500">*</span></span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateIdCard}
                    className="text-[10px] text-purple-700 hover:underline font-bold"
                  >
                    Acak ID Card
                  </button>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: IDC-908122"
                    value={idCard}
                    onChange={(e) => setIdCard(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-xl font-mono font-bold text-purple-900 bg-purple-50/50 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Nomor barcode atau chip RFID pada kartu fisik tanda pengenal karyawan.
                </span>
              </div>

              {/* Nama Lengkap */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Departemen */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Departemen <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Warehouse FGW / Quality Control"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Jabatan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Jabatan / Posisi
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Supervisor Warehouse / Operator"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Phone & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    No. Handphone / WA
                  </label>
                  <input
                    type="text"
                    placeholder="0812-xxxx-xxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition shadow-xs"
                >
                  Simpan Karyawan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulator Scan Dual-ID Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                <span>Uji Coba Scan ID Karyawan (Dual-ID)</span>
              </h3>
              <button
                onClick={() => setIsScannerOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-600">
                Ketik atau scan <strong>salah satu ID</strong> (bisa ID HRIS atau ID CARD) untuk menguji deteksi otomatis:
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik ID HRIS (cth: 2161105) ATAU ID CARD (cth: IDC-908122)"
                  value={scannedIdInput}
                  onChange={(e) => setScannedIdInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Preset Sample Buttons (HRIS vs ID CARD) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-500 block">Pilih Contoh Cepat:</span>
                
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {employees.slice(0, 4).map(emp => (
                    <div key={emp.id} className="p-1.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{emp.name}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setScannedIdInput(emp.hrisId || emp.nik)}
                          className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200 transition"
                          title="Tes scan menggunakan ID HRIS"
                        >
                          Scan HRIS: {emp.hrisId || emp.nik}
                        </button>
                        <button
                          type="button"
                          onClick={() => setScannedIdInput(emp.idCard || `IDC-${emp.nik}`)}
                          className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-200 transition"
                          title="Tes scan menggunakan ID CARD"
                        >
                          Scan Card: {emp.idCard || `IDC-${emp.nik}`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detection Result Box */}
              {scannedIdInput && (() => {
                const trimmed = scannedIdInput.trim().toLowerCase();
                const found = employees.find(e => 
                  (e.hrisId && e.hrisId.toLowerCase() === trimmed) ||
                  (e.idCard && e.idCard.toLowerCase() === trimmed) ||
                  (e.nik && e.nik.toLowerCase() === trimmed)
                );

                if (found) {
                  const matchedVia = (found.idCard && found.idCard.toLowerCase() === trimmed) ? 'ID CARD' : 'ID HRIS';

                  return (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Berhasil Terdeteksi di Master!</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200/70 text-emerald-900 border border-emerald-300">
                          Via {matchedVia}
                        </span>
                      </div>

                      <div className="text-xs space-y-0.5 pt-1 border-t border-emerald-200/60">
                        <div>Nama: <strong>{found.name}</strong></div>
                        <div>Departemen: <strong>{found.department}</strong></div>
                        <div>Jabatan: <strong>{found.position || '-'}</strong></div>
                        <div className="pt-1 flex items-center gap-2 text-[11px] font-mono">
                          <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                            HRIS: {found.hrisId || found.nik}
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                            CARD: {found.idCard}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs space-y-1 animate-in fade-in">
                      <span className="font-bold block text-rose-700">ID "{scannedIdInput}" Tidak Ditemukan!</span>
                      <p className="text-[11px] text-rose-600">
                        ID ini tidak cocok dengan ID HRIS maupun ID CARD di master data.
                      </p>
                    </div>
                  );
                }
              })()}

              <div className="pt-2">
                <button
                  onClick={() => setIsScannerOpen(false)}
                  className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
                >
                  Tutup Simulator
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Dual-ID Badge Modal */}
      {printBadgeEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <IdCard className="w-4 h-4 text-indigo-600" />
                <span>Kartu Tanda Pengenal (Dual-ID)</span>
              </h3>
              <button
                onClick={() => setPrintBadgeEmployee(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Visual Badge Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-900 to-slate-900 text-white shadow-md text-left space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold block">
                    SIKUTANG WMS FGW
                  </span>
                  <span className="text-xs font-black text-white">ID BADGE KARYAWAN & PIC</span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              </div>

              <div>
                <h4 className="text-base font-black tracking-tight">{printBadgeEmployee.name}</h4>
                <p className="text-xs text-indigo-200">{printBadgeEmployee.department}</p>
                <p className="text-[11px] text-slate-300">{printBadgeEmployee.position || 'Petugas Gudang'}</p>
              </div>

              {/* Barcode Section with Both IDs */}
              <div className="bg-white p-3 rounded-xl text-center text-slate-900 space-y-2">
                <div className="h-9 flex items-center justify-center space-x-1">
                  {/* Simulated Barcode lines */}
                  {[4, 2, 6, 2, 4, 3, 2, 5, 2, 4, 2, 6, 3, 4, 2, 5, 3, 2, 6, 2, 4, 5, 2].map((h, i) => (
                    <div 
                      key={i} 
                      className="bg-black" 
                      style={{ 
                        width: (i % 3 === 0) ? '3px' : '1.5px', 
                        height: `${22 + (h * 2)}px` 
                      }}
                    />
                  ))}
                </div>

                {/* Both IDs displayed clearly */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100">
                  <div className="p-1 bg-indigo-50 rounded">
                    <span className="text-[9px] uppercase font-bold text-indigo-500 block">ID HRIS</span>
                    <strong className="font-mono text-xs text-indigo-950 font-black">
                      {printBadgeEmployee.hrisId || printBadgeEmployee.nik}
                    </strong>
                  </div>
                  <div className="p-1 bg-purple-50 rounded">
                    <span className="text-[9px] uppercase font-bold text-purple-500 block">ID CARD</span>
                    <strong className="font-mono text-xs text-purple-950 font-black">
                      {printBadgeEmployee.idCard}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPrintBadgeEmployee(null)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak ID Card</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
