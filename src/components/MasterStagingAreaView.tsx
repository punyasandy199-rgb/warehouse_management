/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Eye, 
  Edit3, 
  Upload, 
  Image as ImageIcon, 
  Check, 
  X, 
  RotateCcw, 
  Truck, 
  Layers, 
  Boxes,
  Info,
  Plus,
  Trash2,
  Search,
  Filter,
  Sparkles,
  Building2,
  Cloud,
  UploadCloud,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { saveSystemConfigToCloud } from '../firebase';
import { StagingAreaInfo, UserRole } from '../types';
import { DEFAULT_STAGING_AREAS, saveStoredStagingAreas } from '../data/stagingAreas';

interface MasterStagingAreaViewProps {
  stagingAreas: StagingAreaInfo[];
  onUpdateStagingAreas: (areas: StagingAreaInfo[]) => void;
  userRole: UserRole;
}

const WAREHOUSE_PHOTO_PRESETS = [
  {
    name: 'Lorong Rak High-Bay 1',
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    type: 'LORONG' as const
  },
  {
    name: 'Lorong Gangway Forklift Ganda',
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=800&q=80',
    type: 'LORONG' as const
  },
  {
    name: 'Lorong Buffer Transit Pallet',
    url: 'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=800&q=80',
    type: 'LORONG' as const
  },
  {
    name: 'Lorong Staging Rak Belakang',
    url: 'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80',
    type: 'LORONG' as const
  },
  {
    name: 'Pintu Loading Dock Bay Ekspedisi',
    url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
    type: 'LOADING' as const
  },
  {
    name: 'Loading Bay Box Truk & Kontainer',
    url: 'https://images.unsplash.com/photo-1586528116493-a029325540fa?auto=format&fit=crop&w=800&q=80',
    type: 'LOADING' as const
  },
  {
    name: 'Staging Transit Pallet & Quality',
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=800&q=80',
    type: 'BUFFER' as const
  }
];

export const MasterStagingAreaView: React.FC<MasterStagingAreaViewProps> = ({
  stagingAreas,
  onUpdateStagingAreas,
  userRole
}) => {
  const [selectedAreaForView, setSelectedAreaForView] = useState<StagingAreaInfo | null>(null);
  
  // State: Edit Area (termasuk ganti nama lorong)
  const [editingArea, setEditingArea] = useState<StagingAreaInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'LORONG' | 'LOADING' | 'BUFFER' | 'OTHER'>('LORONG');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCapacity, setEditCapacity] = useState(12);

  // State: Tambah Area Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'LORONG' | 'LOADING' | 'BUFFER' | 'OTHER'>('LORONG');
  const [newPhotoUrl, setNewPhotoUrl] = useState(WAREHOUSE_PHOTO_PRESETS[0].url);
  const [newDescription, setNewDescription] = useState('');
  const [newCapacity, setNewCapacity] = useState(12);

  // State: Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'LORONG' | 'LOADING' | 'BUFFER' | 'OTHER'>('ALL');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [addErrorMsg, setAddErrorMsg] = useState<string | null>(null);
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State: Konfirmasi Hapus Area (In-App Modal agar tidak terblokir sandbox iframe)
  const [areaToDelete, setAreaToDelete] = useState<StagingAreaInfo | null>(null);

  // Otomatis bersihkan jika ada sisa Lorong KL di dalam data
  useEffect(() => {
    const hasKL = stagingAreas.some(a => a && (a.id === 'Lorong KL' || a.name?.toLowerCase().trim() === 'lorong kl'));
    if (hasKL) {
      const cleaned = stagingAreas.filter(a => a && a.id !== 'Lorong KL' && a.name?.toLowerCase().trim() !== 'lorong kl');
      onUpdateStagingAreas(cleaned);
      saveStoredStagingAreas(cleaned);
      saveSystemConfigToCloud({ stagingAreas: cleaned });
    }
  }, [stagingAreas, onUpdateStagingAreas]);

  // Akses edit & tambah lokasi untuk seluruh pengguna sistem gudang
  const canEdit = true;

  // Open Edit Modal
  const handleStartEdit = (area: StagingAreaInfo) => {
    setEditingArea(area);
    setEditName(area.name);
    setEditType((area.type as any) || 'LORONG');
    setEditPhotoUrl(area.photoUrl);
    setEditDescription(area.description);
    setEditCapacity(area.capacityPallets);
    setEditErrorMsg(null);
  };

  // Save Edit (Rename lorong, update kapasitas, photo, description, etc.)
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea) return;
    setEditErrorMsg(null);

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditErrorMsg('Nama lorong / area tidak boleh kosong!');
      return;
    }

    if (stagingAreas.some(a => a.id !== editingArea.id && a.name.toLowerCase() === trimmedName.toLowerCase())) {
      setEditErrorMsg(`Area dengan nama "${trimmedName}" sudah terdaftar. Gunakan nama lain.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = stagingAreas.map(item => {
        if (item.id === editingArea.id) {
          return {
            ...item,
            name: trimmedName,
            type: editType,
            photoUrl: editPhotoUrl.trim() || item.photoUrl,
            description: editDescription.trim(),
            capacityPallets: Number(editCapacity) || 10,
            updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
          };
        }
        return item;
      });

      onUpdateStagingAreas(updated);
      saveStoredStagingAreas(updated);
      setEditingArea(null);
      setSuccessNotice(`Nama & data area "${trimmedName}" berhasil diperbarui! Menyinkronkan ke Cloud...`);
      
      saveSystemConfigToCloud({ stagingAreas: updated }).then(ok => {
        if (ok) {
          setSuccessNotice(`✅ Nama & data area "${trimmedName}" berhasil diperbarui & tersimpan ke Cloud Firestore!`);
        } else {
          setSuccessNotice(`Perubahan "${trimmedName}" tersimpan lokal (Cloud offline/sinkron otomatis nanti).`);
        }
      });
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch {
      setEditErrorMsg('Gagal menyimpan perubahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add New Area
  const handleSaveNewArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddErrorMsg(null);
    const trimmedName = newName.trim();
    if (!trimmedName) {
      setAddErrorMsg('Silakan masukkan nama area / lorong baru.');
      return;
    }

    // Check duplicate (case insensitive)
    const isDuplicate = stagingAreas.some(
      a => a.name.toLowerCase().trim() === trimmedName.toLowerCase() ||
           a.id.toLowerCase().trim() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddErrorMsg(`Area dengan nama "${trimmedName}" sudah ada dalam daftar. Silakan gunakan nama lorong / pintu lain.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newArea: StagingAreaInfo = {
        id: trimmedName,
        name: trimmedName,
        type: newType,
        description: newDescription.trim() || `Area staging ${trimmedName} untuk penempatan muatan pallet barang jadi.`,
        photoUrl: newPhotoUrl.trim() || WAREHOUSE_PHOTO_PRESETS[0].url,
        capacityPallets: Number(newCapacity) || 12,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        isCustom: true
      };

      const updated = [...stagingAreas, newArea];
      
      // 1. Immediately apply to local state & localStorage to guarantee no loss
      onUpdateStagingAreas(updated);
      saveStoredStagingAreas(updated);

      // 2. Close modal & reset view so user sees it right away
      setIsAddModalOpen(false);
      setTypeFilter('ALL');
      setSearchTerm('');

      // 3. Reset form
      setNewName('');
      setNewType('LORONG');
      setNewDescription('');
      setNewCapacity(12);
      setNewPhotoUrl(WAREHOUSE_PHOTO_PRESETS[0].url);

      setSuccessNotice(`Area baru "${trimmedName}" berhasil dibuat! Menyinkronkan ke Cloud...`);

      // 4. Cloud sync in background
      saveSystemConfigToCloud({ stagingAreas: updated }).then(ok => {
        if (ok) {
          setSuccessNotice(`✅ Area baru "${trimmedName}" berhasil ditambahkan & tersimpan ke Cloud Firestore!`);
        } else {
          setSuccessNotice(`Area baru "${trimmedName}" aktif di sistem lokal (Cloud tersinkron saat online).`);
        }
      });
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch {
      setAddErrorMsg('Terjadi kesalahan saat menambahkan area baru.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Area Handlers
  const handleDeleteArea = (area: StagingAreaInfo) => {
    setAreaToDelete(area);
  };

  const handleConfirmDelete = async () => {
    if (!areaToDelete) return;
    const target = areaToDelete;
    const updated = stagingAreas.filter(item => 
      item.id !== target.id && 
      item.name.toLowerCase().trim() !== target.name.toLowerCase().trim()
    );
    onUpdateStagingAreas(updated);
    saveStoredStagingAreas(updated);
    await saveSystemConfigToCloud({ stagingAreas: updated });
    setSuccessNotice(`Area "${target.name}" berhasil dihapus.`);
    setAreaToDelete(null);
    setEditingArea(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Upload Photo File with automatic canvas compression (< 50 KB)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isForNew = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 360;
        const MAX_HEIGHT = 270;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.55);
        if (isForNew) {
          setNewPhotoUrl(compressedDataUrl);
        } else {
          setEditPhotoUrl(compressedDataUrl);
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Reset to Defaults
  const handleResetDefaults = async () => {
    if (window.confirm('Kembalikan semua master foto & data lokasi staging ke standar awal? Area kustom akan dihapus.')) {
      onUpdateStagingAreas(DEFAULT_STAGING_AREAS);
      saveStoredStagingAreas(DEFAULT_STAGING_AREAS);
      await saveSystemConfigToCloud({ stagingAreas: DEFAULT_STAGING_AREAS });
      setSuccessNotice('Semua data lokasi staging berhasil di-reset ke standar awal & tersimpan ke Cloud!');
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const handleSyncToCloud = async () => {
    setIsSyncingCloud(true);
    try {
      await saveSystemConfigToCloud({ stagingAreas });
      setSuccessNotice('✅ Master Lokasi Staging, Lorong & Dock berhasil disinkronkan ke Cloud Firestore!');
    } catch {
      alert('Gagal menyinkronkan ke Cloud Firestore.');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  // Filtered areas
  const filteredAreas = stagingAreas.filter(area => {
    const matchSearch = area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      area.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (typeFilter === 'ALL') return matchSearch;
    return matchSearch && area.type === typeFilter;
  });

  const totalCapacity = stagingAreas.reduce((acc, a) => acc + (a.capacityPallets || 0), 0);
  const lorongCount = stagingAreas.filter(a => a.type === 'LORONG').length;
  const loadingCount = stagingAreas.filter(a => a.type === 'LOADING').length;
  const otherCount = stagingAreas.filter(a => a.type === 'BUFFER' || a.type === 'OTHER').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>Master Lokasi Staging, Lorong & Dock</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {stagingAreas.length} Area
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Kelola nama lorong, kapasitas pallet, deskripsi, dan foto visual. Anda dapat <strong>mengubah nama lorong</strong> atau <strong>menambahkan data area baru</strong> yang dibutuhkan.
              </p>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs hover:shadow-rose-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Area / Lorong Baru</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToCloud}
              disabled={isSyncingCloud}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Kirim dan sinkronkan master lokasi saat ini ke Cloud Firestore"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
              <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkron Cloud'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              title="Kembalikan semua foto & area ke data bawaan pabrik"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Default</span>
            </button>
          </div>
        )}
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Area Aktif</span>
          <span className="text-2xl font-black font-mono text-slate-900">{stagingAreas.length} Lokasi</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Kapasitas Buffer</span>
          <span className="text-2xl font-black font-mono text-emerald-700">{totalCapacity} Pallet</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lorong Buffer</span>
          <span className="text-2xl font-black font-mono text-rose-700">{lorongCount} Lorong</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Loading Dock & Lainnya</span>
          <span className="text-2xl font-black font-mono text-amber-700">{loadingCount + otherCount} Pintu/Area</span>
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              typeFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({stagingAreas.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('LORONG')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              typeFilter === 'LORONG'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Lorong Buffer ({lorongCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('LOADING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              typeFilter === 'LOADING'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Loading Dock ({loadingCount})
          </button>
          {otherCount > 0 && (
            <button
              type="button"
              onClick={() => setTypeFilter('BUFFER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                typeFilter === 'BUFFER'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Area Khusus ({otherCount})
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari lorong / loading dock..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-medium"
          />
        </div>
      </div>

      {/* Grid Lokasi Staging */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredAreas.map((area) => {
          const isLorong = area.type === 'LORONG';
          const isLoading = area.type === 'LOADING';

          return (
            <div
              key={area.id}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group relative"
            >
              {/* Foto Thumbnail dengan Hover Action */}
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                <img
                  src={area.photoUrl}
                  alt={area.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30" />

                {/* Badges on image */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-xs shadow-xs ${
                    isLoading
                      ? 'bg-amber-500/90 text-white border border-amber-300/40'
                      : isLorong
                      ? 'bg-rose-600/90 text-white border border-rose-300/40'
                      : 'bg-indigo-600/90 text-white border border-indigo-300/40'
                  }`}>
                    {isLoading ? 'Loading Dock' : isLorong ? 'Lorong Buffer' : 'Area Staging'}
                  </span>

                  {area.isCustom && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/90 text-white border border-emerald-300/40 uppercase">
                      Baru
                    </span>
                  )}
                </div>

                {/* View Full Photo Button */}
                <button
                  type="button"
                  onClick={() => setSelectedAreaForView(area)}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-xs transition cursor-pointer"
                  title="Lihat Foto Penuh"
                >
                  <Eye className="w-4 h-4" />
                </button>

                {/* Name & Capacity on Image */}
                <div className="absolute bottom-2.5 left-3 right-3 text-white">
                  <h4 className="font-black text-lg drop-shadow-md leading-tight text-white">
                    {area.name}
                  </h4>
                  <span className="text-xs text-white/90 font-bold block mt-0.5 drop-shadow-xs">
                    Kapasitas: {area.capacityPallets} Pallet
                  </span>
                </div>
              </div>

              {/* Description & Action */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-normal">
                  {area.description || 'Tidak ada keterangan khusus.'}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedAreaForView(area)}
                    className="text-xs font-bold text-slate-600 hover:text-rose-600 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(area)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                          title="Ubah Nama Lorong, Kapasitas, atau Foto"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ubah Nama/Data</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteArea(area)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                          title={`Hapus area ${area.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAreas.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-6 space-y-3">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-700">Tidak ada area yang cocok</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tidak ditemukan area staging dengan kata kunci &quot;{searchTerm}&quot;. Klik tombol Tambah Area jika ingin mendaftarkan lorong baru.
          </p>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: PREVIEW FOTO AREA LOKASI                                     */}
      {/* ===================================================================== */}
      {selectedAreaForView && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    Foto Lokasi: {selectedAreaForView.name}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {selectedAreaForView.type === 'LOADING' 
                      ? 'Area Loading Bay / Pintu Muat Armada' 
                      : selectedAreaForView.type === 'LORONG'
                      ? 'Area Staging Lorong Rak Pallet'
                      : 'Area Transit Khusus Gudang'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAreaForView(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Big Photo */}
            <div className="relative max-h-[380px] bg-slate-950 overflow-hidden flex items-center justify-center">
              <img
                src={selectedAreaForView.photoUrl}
                alt={selectedAreaForView.name}
                className="w-full max-h-[380px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>

            {/* Detail info */}
            <div className="p-5 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Kapasitas Muat: <strong className="text-emerald-700 font-mono text-sm">{selectedAreaForView.capacityPallets} Pallet</strong></span>
                <span className="text-slate-500 font-mono text-[11px]">Update: {selectedAreaForView.updatedAt || 'Tersedia'}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-2xl border border-slate-200">
                {selectedAreaForView.description}
              </p>

              <div className="pt-1 flex justify-end gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = selectedAreaForView;
                      setSelectedAreaForView(null);
                      handleStartEdit(cur);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah Data Ini</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAreaForView(null)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL KONFIRMASI HAPUS AREA                                           */}
      {/* ===================================================================== */}
      {areaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Hapus Area Staging?
                </h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini akan menghapus area secara permanen.
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3.5 space-y-1 text-xs">
              <div className="font-bold text-slate-800">
                Nama Area: <span className="font-mono text-rose-700">{areaToDelete.name}</span>
              </div>
              <div className="text-slate-600">
                Tipe: <span className="font-semibold">{areaToDelete.type}</span> &bull; Kapasitas: <span className="font-semibold">{areaToDelete.capacityPallets} Pallet</span>
              </div>
              <p className="text-[11px] text-rose-600 font-medium pt-1">
                Data akan dihapus dari sistem gudang lokal dan Cloud Firestore.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAreaToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-md flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: UBAH NAMA LORONG, FOTO & DATA AREA                           */}
      {/* ===================================================================== */}
      {editingArea && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-600" />
                <span>Ubah Nama & Data: {editingArea.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingArea(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Field 1: Nama Lorong / Area (Bisa diubah bebas) */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Nama Lorong / Area Staging:
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Contoh: Lorong AB, Lorong CD (Buffer Depan), dll."
                  className="w-full h-11 px-3.5 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Nama ini akan langsung tampil pada pilihan Staging di Outbound Plan Kirim & Denah Gudang.
                </span>
              </div>

              {/* Field 2: Tipe Area */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Tipe / Kategori Area:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('LORONG')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      editType === 'LORONG'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-rose-700">Lorong Buffer</div>
                    <div className="text-[10px] font-normal opacity-80">Antar rak A-J</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('LOADING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      editType === 'LOADING'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-amber-700">Loading Dock</div>
                    <div className="text-[10px] font-normal opacity-80">Pintu muat ekspedisi</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('BUFFER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      editType === 'BUFFER'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-indigo-700">Buffer Transit</div>
                    <div className="text-[10px] font-normal opacity-80">Penampungan sementara</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('OTHER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      editType === 'OTHER'
                        ? 'bg-slate-100 border-slate-700 text-slate-900 ring-1 ring-slate-700/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-slate-800">Area Khusus</div>
                    <div className="text-[10px] font-normal opacity-80">Karantina / QC / Pallet</div>
                  </button>
                </div>
              </div>

              {/* Field 3: Kapasitas Pallet */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Kapasitas Maksimal Muatan (Pallet):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Number(e.target.value))}
                    className="w-32 h-11 px-3 border border-slate-300 rounded-xl text-base font-black font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-500">Pallet Standar</span>
                </div>
              </div>

              {/* Photo Preview & Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Foto Area Visual:
                </label>
                <div className="h-40 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
                  {editPhotoUrl ? (
                    <img
                      src={editPhotoUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span className="text-xs">Belum ada foto</span>
                    </div>
                  )}
                </div>

                {/* Upload or URL */}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, false)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                />

                <input
                  type="url"
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="Atau tempel Link URL Foto di sini..."
                  className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                />

                {/* Quick Preset Selector */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    Atau Pilih Template Foto Gudang:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {WAREHOUSE_PHOTO_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditPhotoUrl(preset.url)}
                        className="w-14 h-11 rounded-lg overflow-hidden shrink-0 border-2 border-slate-200 hover:border-rose-500 transition cursor-pointer"
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field: Deskripsi */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Deskripsi Area Staging:
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Keterangan area staging..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              {editErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editErrorMsg}</span>
                </div>
              )}

              {/* Form Action */}
              <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (editingArea) handleDeleteArea(editingArea);
                    setEditingArea(null);
                  }}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                >
                  Hapus Area Ini
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingArea(null)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: TAMBAH DATA AREA LAIN YANG DIRASA KURANG                     */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Tambah Area Staging / Lorong Baru
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Daftarkan lorong tambahan atau pintu loading baru
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewArea} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Field 1: Nama Area Baru */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Nama Area / Lorong Baru: *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Lorong MN, Loading 4, Area Transit QC, dll."
                  className="w-full h-11 px-3.5 border-2 border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-rose-500 bg-white"
                />

                {/* Quick suggestions */}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold">Saran Cepat:</span>
                  {[
                    { name: 'Lorong MN', type: 'LORONG' as const, cap: 12 },
                    { name: 'Lorong OP', type: 'LORONG' as const, cap: 14 },
                    { name: 'Loading 4', type: 'LOADING' as const, cap: 16 },
                    { name: 'Loading 5', type: 'LOADING' as const, cap: 18 },
                    { name: 'Buffer Transit QC', type: 'BUFFER' as const, cap: 10 }
                  ].map((sug, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setNewName(sug.name);
                        setNewType(sug.type);
                        setNewCapacity(sug.cap);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-[10px] font-bold border border-slate-200 transition cursor-pointer"
                    >
                      + {sug.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Field 2: Tipe Area */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Kategori Area:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('LORONG')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      newType === 'LORONG'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-rose-700">Lorong Buffer</div>
                    <div className="text-[10px] font-normal opacity-80">Jalur antar rak</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('LOADING')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      newType === 'LOADING'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-amber-700">Loading Dock</div>
                    <div className="text-[10px] font-normal opacity-80">Pintu muat ekspedisi</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('BUFFER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      newType === 'BUFFER'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-indigo-700">Buffer Transit</div>
                    <div className="text-[10px] font-normal opacity-80">Buffer sebelum muat</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewType('OTHER')}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      newType === 'OTHER'
                        ? 'bg-slate-100 border-slate-700 text-slate-900 ring-1 ring-slate-700/30'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-extrabold text-slate-800">Area Khusus</div>
                    <div className="text-[10px] font-normal opacity-80">Karantina / Pallet Kosong</div>
                  </button>
                </div>
              </div>

              {/* Field 3: Kapasitas Pallet */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Kapasitas Maksimal (Pallet):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-32 h-11 px-3 border border-slate-300 rounded-xl text-base font-black font-mono text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                  <span className="text-xs font-bold text-slate-500">Pallet</span>
                </div>
              </div>

              {/* Photo Preview & Options */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-slate-800">
                  Foto Area Visual:
                </label>
                <div className="h-36 bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200">
                  <img
                    src={newPhotoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                  />

                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="Atau tempel tautan foto online..."
                    className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Quick Presets */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    Atau Klik Cepat Foto Template:
                  </span>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {WAREHOUSE_PHOTO_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewPhotoUrl(preset.url)}
                        className={`w-14 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition cursor-pointer ${
                          newPhotoUrl === preset.url ? 'border-rose-600 ring-2 ring-rose-500/30' : 'border-slate-200 hover:border-slate-400'
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Field 4: Deskripsi */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Deskripsi / Keterangan Area:
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Keterangan fungsi area, lokasi fisik, atau instruksi staging..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              {addErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{addErrorMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Area Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
