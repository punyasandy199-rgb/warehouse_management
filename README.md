# 📦 SIKUTANG WMS
### Sistem Keakuratan Monitoring Barang Jadi (Warehouse Finished Goods)
**PT. Santos Jaya Abadi**

[![Buka Aplikasi SIKUTANG WMS](https://img.shields.io/badge/%F0%9F%9A%80%20KLIK%20UNTUK%20MEMBUKA%20APLIKASI-SIKUTANG%20WMS-0284c7?style=for-the-badge&logo=googlechrome&logoColor=white)](https://ais-pre-hdta4ueneu5lppkndlikou-939789397042.asia-east1.run.app)

---

## 📱 CARA MEMBUKA DAN MENGGUNAKAN APLIKASI:

> ⚠️ **PENTING: Kenapa di GitHub hanya muncul gambar/tulisan?**  
> GitHub adalah tempat penyimpanan **source code** (berkas kode program). GitHub tidak bisa langsung menjalankan aplikasi web interaktif jika hanya dibuka halamannya.

Untuk **membuka aplikasi yang aktif dan langsung tersinkronisasi database**, klik link di bawah ini:

👉 **[KLIK DI SINI: BUKA APLIKASI SIKUTANG WMS](https://ais-pre-hdta4ueneu5lppkndlikou-939789397042.asia-east1.run.app)**  
*(Dapat dibuka langsung melalui Google Chrome di HP Android / iOS maupun di Komputer/Laptop)*

---

### 🔄 BAGAIMANA CARA DATABASE TERSINKRONISASI?

Aplikasi ini menggunakan database **Google Cloud Firestore**.
1. **Otomatis Real-Time:** Setiap kali Anda login, melakukan *Putaway* (penataan pallet), *Picking* (pengeluaran FEFO), atau *Stock Opname* di HP, data langsung tersimpan ke Cloud Firestore dalam hitungan detik.
2. **Sinkron Antar Perangkat:** Saat Anda membuka tautan di atas melalui Komputer di kantor atau HP di gudang, layar akan menampilkan data yang **100% sama dan real-time**.
3. **Tombol Sinkronisasi Manual:** Di pojok kanan atas menu login terdapat tombol **"Status DB: Cloud Aktif"**. Anda dapat mengkliknya kapan saja untuk melakukan:
   * **📤 Kirim Data ke Cloud (Push)**
   * **📥 Tarik Data dari Cloud (Pull)**

---

## 👥 Akun Pengguna Terdaftar (Database Aktual)

| Role | Username | Nama Petugas | NIK / HRIS | Divisi | PIN / Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `@asst.mgrsc` | Arga Verbrianto | `00007545` | Supply Chain | `54321` |
| **Supervisor** | `@spv` | Shandy Ernanto | `00028369` | Supply Chain | `1234` |
| **Admin FGW** | `@admin.yolanda` | Septiana Yolanda Putri | `00067840` | Supply Chain | `1234` |
| **Admin FGW** | `@admin.kemal` | Mochamad Kemal Redondo | `00066463` | Supply Chain | `1234` |
| **Admin FGW** | `@admin.dadang` | Dadang Prihatin Baskoro | `00014498` | Supply Chain | `1234` |
| **Admin FGW** | `@admin.aris` | Aris Siswanto | `00041243` | Supply Chain | `1234` |
| **Operator FGW** | `@operator.yogi` | Yogi Ari Prasetyo | `00009344` | Supply Chain | `1234` |
| **Operator FGW** | `@operator.wiku` | Wiku Ade Nugroho | `00014703` | Supply Chain | `1234` |
| **Operator FGW** | `@operator.choirudin` | Muchamad Choirudin | `00008151` | Supply Chain | `1234` |
| **Operator FGW** | `@operator.bisri` | Rizal Bisri | `00049383` | Supply Chain | `1234` |

---

## 🏷️ Master Produk Finished Goods

1. **SIC 18 C1 (1 X 30 KG)** — Item Code: `00J.KPI09.K0307001XX` (15 Box / Pallet)
2. **SIC 18 T (1 X 30 KG)** — Item Code: `00J.KPI01.K0307001XX` (50 Box / Pallet)
3. **SIC 9010 M3 (1 X 30 KG)** — Item Code: `00J.KPI11.K0307001XX` (60 Box / Pallet)
4. **SIC 01 PC (1 X 30 KG)** — Item Code: `00J.KPI10.K0307001XX` (60 Box / Pallet)
5. **SIC 8590 SD (1 X 30 KG)** — Item Code: `00J.KPI16.K0307001XX` (50 Box / Pallet)
6. **SIC 25 BR (1 X 30 KG)** — Item Code: `00J.KPI18.K0307001XX` (40 Box / Pallet)
7. **SJ1801** — Item Code: `00J.KPI10.K0307001F3` (60 Box / Pallet)

---

## ✨ Fitur Utama Sistem

* **Visualisasi Denah Rak Interaktif:** Monitoring Rak A s/d I serta Rak Retur R (Level 1 s/d 4, Bay a s/d m).
* **Alur Inbound & Putaway:**
  * Opsi 1: Range Nomor Karton (contoh: D072 - D086)
  * Opsi 2: Scan Semua Barcode Karton Multi-Scan
* **Alur Outbound FEFO & Picking:** Rekomendasi otomatis pallet paling awal kadaluarsa (First Expired First Out).
* **Pemindai Barcode / QR Kamera Smartphone:** Mendukung kamera depan & belakang HP, input manual, dan pencarian slot instan.
* **Audit Stock Opname & Validasi PIC HRIS / ID Card:** Verifikasi fisik stok barang jadi dengan pencocokan otomatis data identitas karyawan.
* **Sinkronisasi Cloud Firestore:** Seluruh perubahan di HP langsung tampil di PC secara seketika (real-time).

---

## 🚀 Menjalankan Secara Lokal (Development)

Jika ingin menjalankan atau mengembangkan sistem ini di laptop/PC:

```bash
# 1. Install dependencies
npm install

# 2. Jalankan server lokal
npm run dev
```

Buka browser di `http://localhost:3000`.

### Build untuk Produksi
```bash
npm run build
```

---

## ☁️ Deploy ke Vercel / Netlify (Gratis)

Repository ini sudah dilengkapi dengan konfigurasi `vercel.json`. Untuk membuat tautan publik custom gratis:
1. Buka [vercel.com](https://vercel.com) lalu Login dengan akun GitHub Anda.
2. Klik **Add New Project** dan pilih repository `monitoring_keakuratan_warehouse`.
3. Klik **Deploy**. Dalam 1 menit, Anda akan mendapatkan URL web publik aktif seperti `https://sikutang-wms.vercel.app`.

---

## 🌐 Cara Mengaktifkan Link Web Langsung dari GitHub (GitHub Pages):

Repository ini sudah dilengkapi file workflow otomatis `.github/workflows/deploy.yml`. Agar aplikasi dapat dibuka langsung dari GitHub Pages:

1. Di repository GitHub Anda, klik menu tab **Settings** (Pengaturan di kanan atas).
2. Pada bilah menu samping kiri, klik menu **Pages**.
3. Di bagian **Build and deployment** -> **Source**, ubah dropdown dari *Deploy from a branch* menjadi **GitHub Actions**.
4. Workflow build otomatis akan berjalan. Dalam 1–2 menit, GitHub akan menampilkan tautan web aktif:  
   👉 `https://punyasandy199.github.io/monitoring_keakuratan_warehouse/`  
   *(Tautan ini dapat langsung dibuka di HP maupun komputer dengan database Firestore aktif)*.
