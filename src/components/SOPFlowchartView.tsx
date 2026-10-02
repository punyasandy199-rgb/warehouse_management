/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  GitFork, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Search, 
  Layers, 
  Boxes, 
  Scan, 
  ShieldCheck, 
  Clock, 
  Truck, 
  FileText, 
  Sparkles, 
  ChevronRight, 
  Check, 
  HelpCircle, 
  ArrowRight,
  UserCheck,
  QrCode,
  ExternalLink,
  Workflow,
  Factory,
  Database,
  Info
} from 'lucide-react';
import { UserRole } from '../types';

export type SOPTab = 'all' | 'inbound' | 'outbound' | 'opname' | 'flowchart';

interface SOPFlowchartViewProps {
  initialTab?: SOPTab;
  onNavigateToModule?: (module: 'in-warehouse' | 'out-warehouse' | 'stock-opname') => void;
  userRole?: UserRole;
}

export const SOPFlowchartView: React.FC<SOPFlowchartViewProps> = ({
  initialTab = 'flowchart',
  onNavigateToModule,
  userRole = 'operator'
}) => {
  const [activeTab, setActiveTab] = useState<SOPTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlowStep, setSelectedFlowStep] = useState<number | null>(null);

  const handlePrint = () => {
    window.print();
  };

  // Flowchart steps data
  const flowchartSteps = [
    {
      id: 1,
      phase: 'Fase 1: Kedatangan Produk',
      title: 'Barang Jadi dari Line Produksi',
      actor: 'Unit Produksi & Packing',
      color: 'from-blue-600 to-sky-600',
      borderColor: 'border-blue-300',
      badgeBg: 'bg-blue-100 text-blue-800',
      icon: Factory,
      summary: 'Produk Finished Goods selesai di-packing dan disusun di atas pallet standar.',
      rule: 'Maksimum 15 Box per Pallet, 1 jenis item & batch sama per pallet.',
      details: [
        'Line Packing menyelesaikan proses packing dan penempelan Barcode/QR Box.',
        'Box disusun di atas pallet kayu/plastik dengan standar kerapian pabrik.',
        'Serah terima dilakukan dengan dokumen bukti serah terima Finished Goods (FG).'
      ]
    },
    {
      id: 2,
      phase: 'Fase 2: Registrasi Inbound',
      title: 'Scan QR Box di Modul Proses In',
      actor: 'Operator Scanner Inbound FGW',
      color: 'from-emerald-600 to-teal-600',
      borderColor: 'border-emerald-300',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      icon: Scan,
      summary: 'Operator membuka Modul Proses In dan memilih metode scanning.',
      rule: 'Opsi 1 (Scan-Range) atau Opsi 2 (Scan-Allbox).',
      details: [
        'Opsi 1 (Scan-Range): Scan 1 box FG, lalu masukkan range nomor karton (contoh: D072 - D086).',
        'Opsi 2 (Scan-Allbox): Scan setiap box fisik secara bertahap sampai jumlah pas (maks 15 box).',
        'Sistem memvalidasi Item Code, Batch No, Expired Date, dan menghasilkan Barcode Pallet unik.'
      ]
    },
    {
      id: 3,
      phase: 'Fase 3: Putaway & Racking',
      title: 'Scan QR Tiang Slot Rak Gudang',
      actor: 'Operator Forklift / Reach Truck',
      color: 'from-teal-600 to-emerald-700',
      borderColor: 'border-teal-300',
      badgeBg: 'bg-teal-100 text-teal-800',
      icon: ArrowDownToLine,
      summary: 'Pallet diangkut ke lokasi rak dan dikonfirmasi dengan scan tiang rak.',
      rule: '1 Slot Rak = 1 Pallet. Wajib scan sticker QR tiang slot untuk verifikasi sistem.',
      details: [
        'Petugas membawa pallet menuju slot rak tujuan (Rak A - L, Level 1 - 4).',
        'Petugas memindai stiker QR pada tiang rak fisik (misal: RAK-A-01-1).',
        'Sistem SIKUTANG mencocokkan ketersediaan slot (slot harus berstatus EMPTY).',
        'Setelah scan berhasil, status slot berubah menjadi OCCUPIED dan stok aktif bertambah.'
      ]
    },
    {
      id: 4,
      phase: 'Fase 4: Monitoring Stok',
      title: 'Penyimpanan & Visualisasi Rak',
      actor: 'Admin Gudang & Supervisor',
      color: 'from-indigo-600 to-blue-700',
      borderColor: 'border-indigo-300',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      icon: Database,
      summary: 'Data stok tersimpan secara real-time dan dapat dipantau di denah rak.',
      rule: 'Pemantauan kapasitas, lokasi slot kosong, dan tanggal kadaluarsa (FEFO).',
      details: [
        'Denah visual menampilkan posisi Rak A - L, bay a - m, dan level 1 - 4.',
        'Warna slot menandakan status: Hijau/Cyan (Terisi), Putih/Abu (Kosong), Kuning (Mendekati ED).',
        'Sistem mencatat tanggal masuk dan histori mutasi di log audit tak terhapus.'
      ]
    },
    {
      id: 5,
      phase: 'Fase 5: Stock Opname Rutin',
      title: 'Audit Fisik & Validasi PIC NIK',
      actor: 'Tim Auditor & Supervisor SPV',
      color: 'from-amber-600 to-orange-600',
      borderColor: 'border-amber-300',
      badgeBg: 'bg-amber-100 text-amber-800',
      icon: ClipboardCheck,
      summary: 'Verifikasi berkala antara stok fisik di rak dengan catatan sistem SIKUTANG.',
      rule: 'Wajib scan ID CARD / NIK HRIS Petugas PIC sebelum memulai penghitungan.',
      details: [
        'Buka Modul Stock Opname dan buat sesi audit baru.',
        'Scan ID Card/HRIS auditor untuk otorisasi dan akuntabilitas Berita Acara.',
        'Scan QR tiang slot, hitung box fisik dan bandingkan dengan data sistem.',
        'Jika fisik == sistem -> MATCH (Sesuai). Jika berbeda -> DISCREPANCY (Selisih) dengan catatan investigasi.',
        'Penerbitan Berita Acara Stock Opname (BAST) bertanda tangan SPV.'
      ]
    },
    {
      id: 6,
      phase: 'Fase 6: Order Pengeluaran',
      title: 'Pembuatan Plan Kirim / Relokasi / BO',
      actor: 'Admin Gudang / PPIC / Logistik',
      color: 'from-rose-600 to-pink-600',
      borderColor: 'border-rose-300',
      badgeBg: 'bg-rose-100 text-rose-800',
      icon: Truck,
      summary: 'Menentukan tujuan pengeluaran produk berdasarkan pesanan atau kebutuhan gudang.',
      rule: '3 Opsi: Plan Kirim Ekspedisi, Relokasi/Transit Antar Area, atau Retur BO ke Packing.',
      details: [
        'Opsi A (Plan Kirim): Ekspedisi antar depo (SJA Sepanjang, Semarang, Karawang, dll).',
        'Opsi B (Transit & Relokasi): Pemindahan pallet antar slot rak atau staging area lorong/loading.',
        'Opsi C (Retur BO): Pengembalian barang rusak / revisi packing ke unit produksi.'
      ]
    },
    {
      id: 7,
      phase: 'Fase 7: Picking Outbound FEFO',
      title: 'Scan Picking & Validasi FEFO',
      actor: 'Operator Scanner Outbound & Reach Truck',
      color: 'from-red-600 to-rose-700',
      borderColor: 'border-red-300',
      badgeBg: 'bg-red-100 text-red-800',
      icon: ArrowUpFromLine,
      summary: 'Sistem otomatis merekomendasikan pallet dengan Expiry Date paling awal (FEFO).',
      rule: 'Disiplin FEFO ketat untuk mencegah expired di gudang. Validasi scan slot & pallet.',
      details: [
        'Sistem memfilter dan mengurutkan slot dengan tanggal kedaluwarsa terdekat.',
        'Operator menuju slot yang direkomendasikan dan memindai barcode pallet/slot.',
        'Jika operator mengambil batch yang lebih baru padahal batch lama masih ada, sistem memicu peringatan FEFO.',
        'Konfirmasi picking memotong stok di sistem secara real-time dan mengosongkan slot rak.'
      ]
    },
    {
      id: 8,
      phase: 'Fase 8: Dispatch & Berita Acara',
      title: 'Penerbitan Surat Jalan & Log Audit',
      actor: 'Supervisor & Admin Gudang',
      color: 'from-slate-700 to-slate-900',
      borderColor: 'border-slate-300',
      badgeBg: 'bg-slate-100 text-slate-800',
      icon: FileText,
      summary: 'Cetak Surat Jalan Dispatch dan pencatatan audit log otomatis permanen.',
      rule: 'Setiap transaksi memiliki ID unik, timestamp, nama petugas, dan tidak dapat dimanipulasi.',
      details: [
        'Cetak Surat Jalan Dispatch / Berita Acara Pengeluaran Barang Jadi.',
        'Truk ekspedisi memuat barang dari Staging / Loading Bay.',
        'Sistem memperbarui dashboard analitik dan mencatat histori transaksi di Audit Log.'
      ]
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header Banner SOP & Alur Proses */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-500/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none transform translate-x-20 -translate-y-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-[11px] font-black uppercase tracking-wider border border-blue-400/30 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                Standard Operating Procedure (SOP) & Alur
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                Resmi WMS FGW v2.4
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Workflow className="w-8 h-8 text-blue-300" />
              <span>Pusat SOP & Flow Chart Alur Proses Aplikasi</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              Panduan terpadu prosedur operasional standar gudang Finished Goods (FGW): Proses In (Penerimaan), Proses Out (Distribusi FEFO), Stock Opname (Audit Fisik PIC), dan Diagram Alur Sistem SIKUTANG.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
              title="Cetak atau Simpan PDF SOP ini"
            >
              <Printer className="w-4 h-4 text-blue-700" />
              <span>Cetak / PDF SOP</span>
            </button>
          </div>
        </div>

        {/* Tab Navigasi SOP */}
        <div className="mt-6 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('flowchart')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'flowchart'
                ? 'bg-white text-blue-900 shadow-md font-black'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <GitFork className="w-4 h-4" />
            <span>Flow Chart Alur Proses</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-white text-blue-900 shadow-md font-black'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Semua SOP Lengkap</span>
          </button>

          <button
            onClick={() => setActiveTab('inbound')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'inbound'
                ? 'bg-emerald-500 text-white shadow-md font-black'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>SOP Proses In (Inbound)</span>
          </button>

          <button
            onClick={() => setActiveTab('outbound')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'outbound'
                ? 'bg-rose-500 text-white shadow-md font-black'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4" />
            <span>SOP Proses Out (Outbound)</span>
          </button>

          <button
            onClick={() => setActiveTab('opname')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'opname'
                ? 'bg-amber-500 text-white shadow-md font-black'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>SOP Stock Opname</span>
          </button>
        </div>
      </div>

      {/* Search & Quick Access Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari SOP (cth: FEFO, 15 Box, QR Tiang, NIK, Opsi 1)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-500 shrink-0">Buka Langsung:</span>
          {onNavigateToModule && (
            <>
              <button
                onClick={() => onNavigateToModule('in-warehouse')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Modul Inbound</span>
              </button>

              <button
                onClick={() => onNavigateToModule('out-warehouse')}
                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-600" />
                <span>Modul Outbound</span>
              </button>

              <button
                onClick={() => onNavigateToModule('stock-opname')}
                className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition flex items-center gap-1 shrink-0"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-700" />
                <span>Modul Opname</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: FLOW CHART ALUR PROSES APLIKASI */}
      {(activeTab === 'flowchart' || activeTab === 'all') && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                Diagram Interaktif
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
                <GitFork className="w-6 h-6 text-blue-600" />
                <span>Flow Chart Alur Proses Aplikasi SIKUTANG WMS FGW</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik salah satu tahapan alur di bawah untuk melihat rincian instruksi kerja, aturan validasi, dan penanggung jawab (PIC).
              </p>
            </div>
            
            {/* Legend Swimlanes */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Inbound
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Opname / Audit
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Outbound FEFO
              </span>
            </div>
          </div>

          {/* Interactive Flow Nodes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {flowchartSteps.map((step, idx) => {
              const IconComp = step.icon;
              const isSelected = selectedFlowStep === step.id;

              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedFlowStep(isSelected ? null : step.id)}
                  className={`rounded-2xl border-2 p-4 transition-all cursor-pointer relative flex flex-col justify-between ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-500/20 scale-[1.02]' 
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70 shadow-xs'
                  }`}
                >
                  {/* Step Sequence Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center font-mono">
                      0{step.id}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${step.badgeBg}`}>
                      {step.phase}
                    </span>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl bg-gradient-to-br ${step.color} text-white shadow-xs`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 leading-snug">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {step.summary}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-500 truncate max-w-[170px]">
                      PIC: {step.actor}
                    </span>
                    <span className="text-blue-600 font-bold hover:underline shrink-0">
                      {isSelected ? 'Tutup ▲' : 'Detail ▼'}
                    </span>
                  </div>

                  {/* Flow Arrow (kecuali step terakhir di baris) */}
                  {idx < flowchartSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-5 h-5 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-slate-400">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Expanded Step Details (if any selected) */}
          {selectedFlowStep && (
            <div className="bg-slate-50 rounded-2xl p-5 border-2 border-blue-400 animate-in fade-in duration-200">
              {(() => {
                const cur = flowchartSteps.find(s => s.id === selectedFlowStep);
                if (!cur) return null;
                const IconComp = cur.icon;
                return (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-2xl bg-gradient-to-br ${cur.color} text-white`}>
                          <IconComp className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                              Langkah 0{cur.id}
                            </span>
                            <span className="text-xs font-bold text-slate-500">
                              {cur.phase}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-slate-900 mt-0.5">
                            {cur.title}
                          </h4>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedFlowStep(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                        <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 text-blue-700">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          Rincian Prosedur Kerja
                        </h5>
                        <ul className="space-y-2 text-xs text-slate-700">
                          {cur.details.map((d, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                          <h5 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Aturan Kritis & Standar WMS
                          </h5>
                          <p className="text-xs text-amber-950 font-semibold mt-1 leading-relaxed">
                            {cur.rule}
                          </p>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-600">Pelaksana / PIC Utama:</span>
                          <span className="font-extrabold text-slate-900 font-mono bg-slate-100 px-2.5 py-1 rounded-md">
                            {cur.actor}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Quick Flow Summary Diagram / Roadmap */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Workflow className="w-3.5 h-3.5 text-cyan-400" />
                Ringkasan Alur Siklus SIKUTANG WMS
              </span>
              <span className="text-[11px] text-cyan-300 font-mono">100% Real-Time & FEFO Compliant</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1.5">
                <span>1. Inbound (15 Box)</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-3 py-1.5 rounded-lg bg-teal-950 text-teal-300 border border-teal-700 flex items-center gap-1.5">
                <span>2. Scan Tiang Rak</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-3 py-1.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-700 flex items-center gap-1.5">
                <span>3. Live Storage Slot</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-3 py-1.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1.5">
                <span>4. Stock Opname PIC NIK</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-3 py-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-700 flex items-center gap-1.5">
                <span>5. Outbound FEFO Picking</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-600 flex items-center gap-1.5">
                <span>6. Dispatch Surat Jalan</span>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: SOP PROSES IN (INBOUND WAREHOUSE) */}
      {(activeTab === 'inbound' || activeTab === 'all') && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-300">
                  Dokumen No: SOP-FGW-INB-001 &bull; Rev. 03
                </span>
                <span className="text-[11px] font-bold text-slate-500">Maks 15 Box/Pallet</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                <ArrowDownToLine className="w-6 h-6 text-emerald-600 stroke-[2.5]" />
                <span>SOP Proses In: Penerimaan Barang Jadi & Racking</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Standar operasional penerimaan barang Finished Goods (FG) dari Line Produksi & penempatan ke slot rak gudang.
              </p>
            </div>

            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule('in-warehouse')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
              >
                <span>Buka Form Inbound</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Key Guidelines Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Kapasitas Maksimal</span>
              <h4 className="text-base font-black text-emerald-950">Maksimal 15 Box / Pallet</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Tiap pallet hanya boleh memuat maksimal 15 karton/box. Dilarang melebihi batas demi keselamatan tumpukan rak.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Alokasi Slot Rak</span>
              <h4 className="text-base font-black text-teal-950">1 Slot Rak = 1 Pallet</h4>
              <p className="text-xs text-teal-800 leading-relaxed">
                Setiap slot rak (Level 1 s/d Level 4) didesain presisi untuk menampung tepat 1 pallet produk.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Konfirmasi Wajib</span>
              <h4 className="text-base font-black text-blue-950">Scan Sticker QR Tiang Rak</h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                Wajib memindai stiker barcode QR pada tiang rak fisik untuk mengonfirmasi penempatan slot yang benar.
              </p>
            </div>
          </div>

          {/* Step-by-Step Instructions */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Tahapan Pelaksanaan Proses Inbound:
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Serah Terima Fisik dari Line Produksi</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Petugas gudang menerima pallet barang jadi dari bagian packing produksi. Periksa kondisi fisik kemasan box, segel karton, dan pastikan tidak ada box basah, penyok, atau robek.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Pemilihan Metode Scan di SIKUTANG (Opsi 1 / Opsi 2)</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Buka menu <strong>Proses In</strong>, lalu pilih salah satu dari 2 opsi resmi:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div className="p-2.5 rounded-lg bg-white border border-emerald-300 text-xs">
                      <span className="font-extrabold text-emerald-800 block"># Opsi 1 (Scan-Range):</span>
                      Scan 1 box FG produk, tentukan nomor karton awal s/d akhir (contoh: D072 s/d D086). Sangat cepat untuk batch berurutan.
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-teal-300 text-xs">
                      <span className="font-extrabold text-teal-800 block"># Opsi 2 (Scan-Allbox):</span>
                      Scan seluruh box satu per satu fisik secara menyeluruh sampai terverifikasi genap 15 box dengan counter real-time.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Pemindahan ke Slot Rak & Validasi QR Tiang</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bawa pallet menggunakan hand pallet/reach truck ke slot rak tujuan yang kosong (Level 1 s/d Level 4). Arahkan scanner ke <strong>Sticker QR Tiang Rak</strong>. Sistem akan mencocokkan kode slot (misal: RAK-A-01-1) dan mengubah status slot menjadi OCCUPIED.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Verifikasi Label Barcode Pallet</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tempelkan label Barcode Pallet hasil cetak pada sisi luar pallet yang menghadap ke lorong jalan (aisle) agar mudah di-scan saat proses Outbound FEFO atau Stock Opname.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: SOP PROSES OUT (OUTBOUND WAREHOUSE) */}
      {(activeTab === 'outbound' || activeTab === 'all') && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-rose-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2.5 py-1 rounded-md border border-rose-300">
                  Dokumen No: SOP-FGW-OUT-002 &bull; Rev. 04
                </span>
                <span className="text-[11px] font-bold text-slate-500">Prinsip FEFO Ketat</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                <ArrowUpFromLine className="w-6 h-6 text-rose-600 stroke-[2.5]" />
                <span>SOP Proses Out: Distribusi FEFO, Relokasi & BO</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Standar pengeluaran pallet Finished Goods dari gudang dengan disiplin FEFO (First Expired, First Out).
              </p>
            </div>

            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule('out-warehouse')}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
              >
                <span>Buka Form Outbound</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 3 Modus Pengeluaran Produk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 text-[10px] font-black uppercase">
                Opsi 1: Plan Kirim
              </span>
              <h4 className="text-sm font-black text-rose-950">Distribusi Ekspedisi / DO</h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                Pengiriman resmi ke distributor/cabang (SJA Sepanjang, Semarang, Karawang, dll.) berdasarkan Surat Jalan DO.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-orange-200 text-orange-900 text-[10px] font-black uppercase">
                Opsi 2: Relokasi / Transit
              </span>
              <h4 className="text-sm font-black text-orange-950">Pemindahan Antar Slot / Staging</h4>
              <p className="text-xs text-orange-800 leading-relaxed">
                Pemindahan sementara ke area Staging Lorong AB s/d IJ atau Loading 1-3 untuk konsolidasi muatan.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1.5">
              <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[10px] font-black uppercase">
                Opsi 3: Retur BO
              </span>
              <h4 className="text-sm font-black text-amber-950">Kembali ke Packing Produksi</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Pengembalian pallet rusak (Break Open) atau re-packaging ke unit packing produksi dengan BA resmi.
              </p>
            </div>
          </div>

          {/* SOP FEFO Rule */}
          <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-red-900 uppercase tracking-wider">
                Ketentuan Wajib FEFO (First Expired, First Out):
              </h4>
              <p className="text-xs text-red-800 leading-relaxed">
                Operator dilarang mengambil pallet dengan expired date lebih baru jika masih terdapat batch yang lebih lama di slot rak lainnya. Sistem SIKUTANG akan otomatis menandai pallet rekomendasi FEFO dengan badge merah/oranye.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-600" />
              Langkah Kerja Eksekusi Picking Outbound:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-mono font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md text-[10px]">
                  STEP 01
                </span>
                <h5 className="font-black text-slate-900">Cek Order & Rekomendasi FEFO</h5>
                <p className="text-slate-600">
                  Pilih item barang yang akan dikeluarkan. Lihat rekomendasi slot yang disorot oleh sistem berdasarkan tanggal kedaluwarsa paling mendesak.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-mono font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md text-[10px]">
                  STEP 02
                </span>
                <h5 className="font-black text-slate-900">Scan Verifikasi Slot & Pallet</h5>
                <p className="text-slate-600">
                  Pindai QR slot rak fisik untuk mengonfirmasi bahwa unit reach truck mengambil pallet dari slot yang tepat.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-mono font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md text-[10px]">
                  STEP 03
                </span>
                <h5 className="font-black text-slate-900">Pemotongan Stok & Slot Empty</h5>
                <p className="text-slate-600">
                  Setelah konfirmasi picking tereksekusi, sistem secara otomatis mengurangi stok aktif dan mengubah status slot menjadi EMPTY (Kosong).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="font-mono font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md text-[10px]">
                  STEP 04
                </span>
                <h5 className="font-black text-slate-900">Penerbitan Berita Acara & Dispatch</h5>
                <p className="text-slate-600">
                  Cetak Berita Acara Pengeluaran Barang Jadi atau Surat Jalan Ekspedisi untuk ditandatangani oleh Sopir dan Petugas Gudang.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: SOP STOCK OPNAME (AUDIT FISIK & REKONSILIASI) */}
      {(activeTab === 'opname' || activeTab === 'all') && (
        <section className="bg-white rounded-3xl p-6 sm:p-7 border border-amber-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300">
                  Dokumen No: SOP-FGW-SOP-003 &bull; Rev. 02
                </span>
                <span className="text-[11px] font-bold text-slate-500">Verifikasi NIK PIC</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-amber-600 stroke-[2.5]" />
                <span>SOP Stock Opname: Verifikasi Fisik & PIC NIK</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Prosedur audit berkala untuk menjamin kesesuaian 100% antara data sistem SIKUTANG dan stok fisik di slot rak.
              </p>
            </div>

            {onNavigateToModule && (
              <button
                onClick={() => onNavigateToModule('stock-opname')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
              >
                <span>Buka Form Opname</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Key Audit Directives */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Autentikasi PIC</span>
              <h4 className="text-base font-black text-amber-950">Wajib Scan NIK / ID Card</h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                Setiap auditor dan penghitung wajib memindai barcode NIK/HRIS karyawan agar terekam resmi dalam Berita Acara.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800">Metode Verifikasi</span>
              <h4 className="text-base font-black text-orange-950">Scan QR Slot & Hitung Box</h4>
              <p className="text-xs text-orange-800 leading-relaxed">
                Scan kode slot tiang rak, lalu hitung jumlah box fisik satu demi satu. Bandingkan dengan angka di sistem.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">Status Hasil Audit</span>
              <h4 className="text-base font-black text-blue-950">MATCH vs DISCREPANCY</h4>
              <p className="text-xs text-blue-800 leading-relaxed">
                Jika fisik sama dengan sistem, tandai MATCH. Jika ada selisih, tandai DISCREPANCY beserta investigasi penyebabnya.
              </p>
            </div>
          </div>

          {/* Detailed Audit Protocol */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              Protokol Pelaksanaan Stock Opname:
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  A
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Pra-Opname: Freeze Movement & Registrasi Tim</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hentikan pergerakan barang (Cut-off in/out) selama proses opname. Supervisor membuat nomor sesi audit di sistem dan mendaftarkan tim pemeriksa dengan melakukan scan ID Card / HRIS NIK PIC.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  B
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Pemeriksaan Fisik Lapangan Slot per Slot</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tim auditor menyisir dari Rak A sampai Rak L secara berurutan. Di setiap slot, scan sticker QR tiang rak, periksa batch no, hitung fisik jumlah box (standar 15 box per pallet), dan masukkan angka fisik ke aplikasi SIKUTANG.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  C
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Rekonsiliasi & Investigasi Selisih (Discrepancy)</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bila ditemukan ketidaksesuaian jumlah atau jenis produk, sistem memberikan tanda peringatan merah (Selisih). Auditor dan SPV wajib melakukan hitung ulang (double-check) dan mencantumkan catatan audit investigasi.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60">
                <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  D
                </span>
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black text-slate-900">Penerbitan Berita Acara Stock Opname (BAST)</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Setelah seluruh rak terverifikasi, klik tombol <strong>Cetak Berita Acara</strong> untuk mencetak dokumen Berita Acara Pemeriksaan Fisik yang memuat rincian akurasi, daftar auditor, dan tanda tangan resmi.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer Info Hubungi SPV / Bantuan */}
      <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 text-center text-xs text-slate-600 space-y-1">
        <p className="font-bold text-slate-800">
          SIKUTANG WMS FGW &bull; Sistem Keakuratan Monitoring Barang Jadi
        </p>
        <p className="text-slate-500 text-[11px]">
          SOP ini berlaku untuk seluruh personel operasional gudang FGW. Untuk usulan revisi atau kendala operasional, hubungi Supervisor Gudang (SPV) atau Super Admin.
        </p>
      </div>
    </div>
  );
};
