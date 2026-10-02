/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Barcode, ShieldAlert, X, Check, Box, Layers } from 'lucide-react';
import { ProductItem, UserRole } from '../types';
import { BarcodeRenderer } from './BarcodeRenderer';

interface MasterProdukViewProps {
  products: ProductItem[];
  userRole: UserRole;
  onSaveProduct: (product: ProductItem) => void;
  onDeleteProduct: (productId: string) => void;
  onSelectProductForLabel: (product: ProductItem) => void;
}

export const MasterProdukView: React.FC<MasterProdukViewProps> = ({
  products,
  userRole,
  onSaveProduct,
  onDeleteProduct,
  onSelectProductForLabel
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form State
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Instant Coffee');
  const [barcode, setBarcode] = useState('');
  const [description, setDescription] = useState('');
  const [boxPerPallet, setBoxPerPallet] = useState<number>(15);
  const [weightPerBoxKg, setWeightPerBoxKg] = useState<number>(30.0);

  // Akses edit terbuka penuh untuk Superadmin, Supervisor (SPV), dan Admin
  const canEdit = userRole === 'superadmin' || userRole === 'supervisor' || userRole === 'admin';

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setItemCode(`FG-COF-${String(products.length + 1).padStart(3, '0')}`);
    setItemName('');
    setCategory('Instant Coffee');
    setBarcode(`899100100${String(products.length + 101)}`);
    setDescription('');
    setBoxPerPallet(15);
    setWeightPerBoxKg(30.0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prod: ProductItem) => {
    setEditingProduct(prod);
    setItemCode(prod.itemCode);
    setItemName(prod.itemName);
    setCategory(prod.category);
    setBarcode(prod.barcode);
    setDescription(prod.description || '');
    setBoxPerPallet(prod.boxPerPallet || 15);
    setWeightPerBoxKg(prod.weightPerBoxKg || 30.0);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCode.trim() || !itemName.trim()) return;

    const saved: ProductItem = {
      id: editingProduct ? editingProduct.id : `PRD-${Date.now()}`,
      itemCode: itemCode.trim().toUpperCase(),
      itemName: itemName.trim(),
      unit: 'BOX', // Sesuai instruksi: Satuan "BOX"
      category: category.trim() || 'Instant Coffee',
      boxPerPallet: boxPerPallet > 0 ? boxPerPallet : 15, // Standar kapasitas pallet (15 Box)
      barcode: barcode.trim() || `899${Date.now().toString().slice(-8)}`,
      minStockBox: 0,
      currentStockBox: editingProduct ? editingProduct.currentStockBox : 0,
      weightPerBoxKg: weightPerBoxKg > 0 ? weightPerBoxKg : 30.0,
      description: description.trim()
    };

    onSaveProduct(saved);
    setIsModalOpen(false);
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="w-3 h-8 bg-cyan-500 rounded-full inline-block"></span>
            Master Produk Barang Jadi
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Katalog Finished Goods (FG) tersinkronisasi barcode dengan satuan baku <strong>BOX</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canEdit ? (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800 text-white font-semibold text-sm shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Produk Baru
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Mode Baca (Operator)
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari Kode Item, Nama Item, Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Kategori ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-xs uppercase tracking-wider font-semibold border-b border-slate-800">
                <th className="py-4 px-6">KODE ITEM</th>
                <th className="py-4 px-6">NAMA ITEM BARANG JADI</th>
                <th className="py-4 px-6 text-center">SATUAN</th>
                <th className="py-4 px-6">KATEGORI</th>
                <th className="py-4 px-6">BARCODE RESMI</th>
                <th className="py-4 px-6 text-center">STOK GUDANG</th>
                <th className="py-4 px-6 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {filteredProducts.map((prod) => {
                return (
                  <tr key={prod.id} className="hover:bg-cyan-50/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-cyan-600 shrink-0" />
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {prod.itemCode}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <span className="font-bold text-slate-900 block text-base">
                          {prod.itemName}
                        </span>
                        <span className="text-xs text-slate-600 line-clamp-1">
                          {prod.description || prod.category}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-extrabold bg-cyan-100 text-cyan-800 border border-cyan-200">
                        {prod.unit}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <BarcodeRenderer value={prod.barcode} width={130} height={32} showText={false} />
                        <span className="font-mono text-xs font-semibold text-slate-600">{prod.barcode}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-mono font-bold text-base text-emerald-700">
                          {prod.currentStockBox.toLocaleString('id-ID')} BOX
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {((prod.currentStockBox || 0) * 30).toLocaleString('id-ID')} Kg
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onSelectProductForLabel(prod)}
                          title="Cetak Label Barcode"
                          className="p-2 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 transition cursor-pointer font-semibold text-xs flex items-center gap-1"
                        >
                          <Barcode className="w-4 h-4" />
                          <span className="hidden lg:inline">Label</span>
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(prod)}
                              title="Edit Produk"
                              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {userRole === 'admin' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus produk ${prod.itemName} (${prod.itemCode})?`)) {
                                    onDeleteProduct(prod.id);
                                  }
                                }}
                                title="Hapus Produk"
                                className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Tambah/Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Box className="w-5 h-5 text-cyan-600" />
                {editingProduct ? 'Edit Produk Barang Jadi' : 'Tambah Produk Barang Jadi'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kode Item
                  </label>
                  <input
                    type="text"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                    placeholder="FG-COF-001"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Satuan Baku
                  </label>
                  <input
                    type="text"
                    value="BOX"
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl font-extrabold text-sm text-cyan-700 cursor-not-allowed text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Nama Item Barang Jadi
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Contoh: Instant Coffee Classic 3-in-1"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Instant Coffee"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Barcode Item / EAN
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="899100100101"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Konfigurasi Pallet & Berat (Standar 15 Box & 30 Kg) */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-cyan-50/50 rounded-xl border border-cyan-100">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-900 mb-1">
                    Isi Box per Pallet
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={boxPerPallet}
                      onChange={(e) => setBoxPerPallet(parseInt(e.target.value, 10) || 15)}
                      className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs font-bold text-cyan-800">BOX</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standar: 15 Box</span>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-900 mb-1">
                    Berat Bersih per Box
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      min={0.1}
                      max={1000}
                      value={weightPerBoxKg}
                      onChange={(e) => setWeightPerBoxKg(parseFloat(e.target.value) || 30.0)}
                      className="w-full px-3 py-2 bg-white border border-cyan-200 rounded-lg font-mono font-bold text-sm text-slate-900 focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs font-bold text-cyan-800">Kg</span>
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Standar: 30.0 Kg</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Deskripsi / Catatan Kemasan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan spesifikasi karton atau packaging..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm shadow-sm transition cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
