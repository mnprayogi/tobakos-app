# PRD — TobakOS
### Sistem Input Pembelian Tembakau (Grading & Penimbangan)

| | |
|---|---|
| **Versi** | 0.1 (Draft) |
| **Status** | Untuk direview |
| **Tech Stack** | Next.js (App Router), Prisma ORM, MySQL, shadcn/ui |

---

## 1. Ringkasan

TobakOS adalah aplikasi internal berbasis web (dioptimalkan untuk tablet rugged di lapangan) yang mendigitalkan proses pembelian tembakau dari petani, mulai dari **grading** (penilaian kualitas oleh grader) hingga **penimbangan** (validasi berat oleh operator). Setiap bale tembakau dilacak lewat barcode unik dari titik grading sampai transaksi ditutup, menggantikan pencatatan manual di kertas.

## 2. Latar Belakang & Masalah

- Pencatatan pembelian tembakau saat ini manual (kertas), rawan salah tulis, sulit direkap, dan sulit dilacak per bale.
- Tidak ada tautan langsung antara hasil grading dan hasil timbang — potensi bale tertukar atau data tidak sinkron.
- Rekap total pembayaran per petani memakan waktu karena harus digabung manual dari beberapa pos.

## 3. Tujuan

1. Setiap bale punya identitas unik (barcode) sejak digrade, terlacak sampai transaksi ditutup.
2. Data grading (jenis tembakau, jenis daun, jenis packing, grade, potongan MC, potongan packing) terkunci begitu masuk ke pos timbang — mengurangi kesalahan input ulang.
3. Perhitungan berat netto & subtotal otomatis, konsisten dengan aturan potongan yang berlaku.
4. Rekap transaksi per petani (N bale per transaksi) tersedia real-time.

## 4. Ruang Lingkup

### Termasuk (MVP — sudah diimplementasikan)
- Master data: Petani, Jenis Tembakau, Jenis Daun, Jenis Packing, Grade Tembakau, **Gudang**, **Jalur**, **Users**.
- **Pos 1 — Grading**: pilih jalur kerja, input data bale, cetak stiker barcode, riwayat bale per transaksi, catat **grader yang menginput** (`createdBy`).
- **Pos 2 — Penimbangan**: scan barcode (scanner fisik keyboard-wedge), ambil berat (manual; live timbangan tersedia sebagai hook), kalkulasi potongan & pembulatan, kunci data timbang, antrian petani per jalur, akhiri sesi & cetak nota, catat **operator yang menimbang** (`weighedBy`).
- Alur status transaksi: `DRAFT → WEIGHED → APPROVED → PAID`; alur bale: `GRADED → WEIGHED → CLOSED`; **setiap transisi mencatat user pengeksekusi**.
- Rekap transaksi per petani, list transaksi admin, & export nota (print).
- Error–UI boundary (halaman Pos 1/Pos 2 dan dashboard).

### Tidak Termasuk (Fase Berikutnya)
- Timbangan live ter-wire ke UI (hook WebSerial `useScale` sudah disiapkan, belum dihubungkan).
- Scan barcode via kamera tablet (hook `useBarcodeScan` sudah disiapkan, belum dihubungkan).
- Driver printer stiker thermal sungguhan (`/api/printer` & `/api/scale` saat ini mock; stiker/nota dicetak via browser print).
- Audit trail lengkap (log nilai lama/baru saat Admin override) — saat ini hanya pencatatan user per transisi status.
- Guard akses per halaman (role baru dibatasi di sidebar).
- Implementasi modul negosiasi harga & hutang (desain sudah ditentukan di §7.5–§7.6, belum dikode), integrasi akuntansi/ERP, aplikasi mobile native.

## 5. Peran Pengguna

| Peran | Deskripsi | Akses Utama |
|---|---|---|
| **Grader (Operator 1)** | Menilai kualitas bale di kebun/gudang | Pos 1: Grading |
| **Operator Timbang (Operator 2)** | Menimbang bale yang sudah digrade | Pos 2: Penimbangan |
| **Admin Keuangan (Finance)** | Review & setujui transaksi (termasuk negosiasi harga), catat pembayaran bertahap, monitor hutang | Transaksi, Hutang |
| **Admin/Owner** | Kelola master data, lihat rekap, pengaturan sistem, supervisi seluruh modul | Semua modul + laporan |

## 6. Tech Stack

| Layer | Pilihan | Catatan |
|---|---|---|
| Framework | **Next.js** (App Router) | Server Actions untuk mutasi data (simpan grade, simpan timbang), Route Handlers untuk endpoint device (scanner/timbangan). |
| Database | **MySQL** | Sesuai schema Prisma yang sudah didraf sebelumnya (Farmer, TobaccoType, LeafType, PackingType, TobaccoGrade, Purchase, PurchaseItem). |
| ORM | **Prisma** | Migration-based schema management, Prisma Client di server actions/route handlers. |
| UI Kit | **shadcn/ui** | `Sidebar`, `Card`, `Table`, `Badge` (status pill), `Input`, `Select`, `Button`, `Dialog`, `Tabs`, `Sonner` (toast notifikasi). Tema disesuaikan dengan token warna di panduan (emerald/amber/mono font). |
| Auth | *Open question* | Kandidat: NextAuth/Auth.js dengan role-based access (Grader/Operator/Admin/Finance). |
| Device I/O | WebSerial API (untuk timbangan via USB, khusus browser Chromium) + kamera browser (`getUserMedia` atau lib seperti `@zxing/browser`) untuk scan barcode via kamera tablet. |

## 7. Kebutuhan Fungsional

### 7.1 Master Data
- CRUD Petani (ID/NIK, nama, kontak).
- CRUD **Customer** (nama, kontak) — default **"Gudang Sendiri"** (id 1, di-seed). Alokasi customer bersifat **per bale** (`PurchaseItem.customerId`), bukan per transaksi — dipakai untuk memisah data pada laporan. Customer yang sudah dipakai bale tidak bisa dihapus.
- CRUD Jenis Tembakau, Jenis Daun, Jenis Packing (termasuk `deductionWeight` default untuk packing).
- CRUD Grade Tembakau per Jenis Tembakau, termasuk `defaultPrice`/kg.
- CRUD Gudang (`code`, nama, alamat) & Jalur (`code`, gudang, nama) — jalur menjadi scope kerja Pos 1 & Pos 2.
- CRUD Users (nama, username, role: `GRADER`/`OPERATOR`/`ADMIN`) — sebagai identitas user yang mengeksekusi aksi.
- Pengaturan sistem (`SystemSetting`): kode gudang, persentase pajak, nama printer thermal.

### 7.2 Pos 1 — Grading
1. Buka halaman → pilih **jalur kerja** (`?lane=`); seluruh data Pos 1 di-scope ke jalur tersebut.
2. Cari/registrasi Petani, lalu pilih **transaksi**: lampirkan ke transaksi `DRAFT` yang masih terbuka hari itu di jalur yang sama, atau buat transaksi baru ("Transaksi #N"). Satu petani bisa punya lebih dari satu transaksi `DRAFT` per hari. Tombol **Tambah Transaksi** divalidasi: jika tidak ada transaksi → langsung buat transaksi baru; jika ada → dialog opsi **Lanjutkan** (transaksi `DRAFT`) atau **Buat Transaksi Baru**; transaksi yang sudah `WEIGHED`/ditutup tampil disabled dan **tidak bisa ditambah bale** (dikunci di UI & server).
3. Input per bale: Jenis Tembakau, Jenis Daun, Jenis Packing, Grade, Potongan MC (%), Potongan Packing (kg), **Alokasi Customer (wajib, default "Gudang Sendiri")**. **Wajib memilih transaksi** bila sudah ada transaksi terbuka (validasi client + server).
4. Sistem ambil harga/kg dari `TobaccoGrade.defaultPrice` sesuai grade terpilih (snapshot, tidak berubah walau harga master berubah kemudian).
5. Tekan **Simpan Grade & Cetak Barcode** →
   - Buat record `PurchaseItem` baru dengan `status = GRADED`, `labelCode` unik ter-generate (format: `{gudang}-{jalur}-{YYYYMMDD}-{urutan}`, urutan per jalur per tanggal), **simpan `customerId` (alokasi customer per bale)**, **catat `createdBy` = user Grader**.
   - Tampilkan stiker QR untuk dicetak (browser print).
6. Tabel riwayat bale per transaksi petani (barcode, grade, status, **customer**, **pengeksekusi**) tampil real-time; bale berstatus `GRADED` bisa dihapus.

### 7.3 Pos 2 — Penimbangan
1. Kolom scan barcode **auto-focus** begitu halaman dibuka (menerima input dari scanner USB sebagai keyboard-wedge), scoped ke jalur yang dipilih.
2. Sistem validasi format `labelCode` (`{gudang}-{jalur}-{YYYYMMDD}-{urutan}`, salah format ditolak), cari `PurchaseItem` berdasar `labelCode`; bila bale milik jalur lain → tolak dengan pesan. Data grading (Grade, Petani, Jenis Tembakau, Jenis Packing, **Alokasi Customer**, **dibuat oleh**) tampil di field **disabled** (read-only, terkunci dari Pos 1).
3. Ambil berat: input manual oleh operator (hook live timbangan disiapkan, belum ter-wire). Pilih **mode pembulatan**: `normal` (1 desimal), `floor`/`ceil` (integer).
4. Sistem hitung otomatis:
   - `weightAfterPacking = grossWeight − packingWeight`
   - `moistureDeduction = weightAfterPacking × moisturePercent%`
   - `netWeight = weightAfterPacking − moistureDeduction`
   - `subtotal = netWeight × pricePerKg`
5. Tekan **Simpan & Kunci Data Timbang** → update `PurchaseItem` (`status = WEIGHED`, **catat `weighedBy` = user Operator**), data tidak bisa diedit lagi kecuali oleh Admin.
6. Antrian petani per jalur (bale `GRADED` yang menunggu) & tabel riwayat bale ditimbang per transaksi (termasuk **customer** & **pengeksekusi**) tampil di bawah.
7. **Akhiri Sesi & Tutup** per transaksi → sistem **cek otomatis**: selama masih ada bale `GRADED` (belum ditimbang), sesi **tidak dapat ditutup** — modal menampilkan jumlah & daftar bale yang tertinggal (dapat diklik untuk langsung ditimbang). Bila semua sudah `WEIGHED` → transaksi berstatus `WEIGHED`, nota sementara siap cetak.

### 7.4 Penutupan Transaksi
- Alur status transaksi (`Purchase`): `DRAFT` → `WEIGHED` (dibuat & ditimbang di Pos 1/Pos 2) → `APPROVED` → `PAID`.
- Operator Pos 2 menutup sesi timbang per transaksi → `WEIGHED` (**`weighedBy`**).
- Admin Keuangan (**Finance**) **Review & Setujui** → `APPROVED` (**`approvedBy`**). Bila ada kesepakatan harga baru, negosiasi dilakukan pada tahap ini (lihat 7.5). Setelah `APPROVED`, harga terkunci.
- Pembayaran dilakukan **bertahap** (lihat 7.6): Finance mencatat pembayaran satu per satu. Transaksi `APPROVED` dengan `paidAmount = 0` berstatus **Hutang**; sebagian terbayar = **Sebagian/DP**; lunas → `PAID` dan seluruh `PurchaseItem` berstatus `WEIGHED` menjadi `CLOSED` (**`paidBy` / `closedBy`**).
- Admin dapat **Buka kembali** transaksi `APPROVED`/`PAID` → kembali `WEIGHED`, item `CLOSED` kembali `WEIGHED` (kunci `closedBy` dihapus). Guard: transaksi yang sudah pernah dibayar (`paidAmount > 0`) **tidak bisa dibuka kembali**.
- Rekap total: `totalGrossWeight`, `totalNetWeight`, `totalItems`, `totalPrice`, `paidAmount` (sisa = `totalPrice − paidAmount`) per transaksi.

### 7.5 Negosiasi Harga (Admin Keuangan)
- Dilakukan oleh **Admin Keuangan (Finance)** saat review & setujui transaksi yang berstatus `WEIGHED`; setelah transaksi `APPROVED`, harga **terkunci** dan tidak bisa dinegosiasi lagi.
- Harga awal per bale tetap snapshot `TobaccoGrade.defaultPrice` dari Pos 1 (`pricePerKg`).
- Bila disepakati harga baru per kg (`hargaBaru`), sistem menghitung selisih dan **mengalokasikannya merata ke setiap bale**:
  - `adjustmentPerKg = (hargaBaru − hargaLama) / totalNetto` — disimpan per bale di `PurchaseItem.priceAdjustment` (Rp/kg, boleh negatif bila harga turun).
  - `subtotal_i = round2(netWeight_i × (pricePerKg_i + priceAdjustment_i))` — total transaksi final = Σ subtotal aktual (bukan `hargaBaru × totalNetto`).
- Simpan nilai awal transaksi (`Purchase.originalTotalPrice`) dan catatan negosiasi (`Purchase.priceReviewNote`, mis. alasan/alokasi/kesepakatan) sebagai jejak audit.
- UI: saat menyetujui transaksi `WEIGHED`, Finance melihat perbandingan harga lama vs baru dan selisih total, lalu konfirmasi.

### 7.6 Hutang & Pembayaran Bertahap
- Transaksi `APPROVED` yang belum lunas dianggap **hutang**: derivasi status = `paidAmount = 0` → **Hutang**; `0 < paidAmount < totalPrice` → **Sebagian/DP**; `paidAmount = totalPrice` → **PAID (Lunas)**.
- Finance mencatat pembayaran **per kali** (bisa sebagian, beberapa kali): `Payment` (amount, metode `TUNAI`/`TRANSFER`, note, `paidBy`, `paidAt`); `Purchase.paidAmount` bertambah sesuai `amount`.
- Validasi: `0 < amount ≤ sisa tagihan` (`totalPrice − paidAmount`). Saat lunas → `Purchase.status = PAID`, seluruh `PurchaseItem` → `CLOSED`.
- Halaman khusus **Hutang** (`/admin/debt`): rekap per petani (total tagihan, total dibayar, sisa, status) + riwayat pembayaran per transaksi.
- Guard: transaksi yang sudah dibayar (`paidAmount > 0`) tidak dapat dibuka kembali (dikunci di UI & server).

### 7.7 Laporan
- Terimplementasi: rekap list transaksi per admin, nota print per transaksi.
- Fase berikutnya: export PDF, rekap agregat per petani/periode/per gudang.

## 8. Alur Status

Dua status yang bergerak beriringan: **transaksi (`Purchase`)** dan **bale (`PurchaseItem`)**. Setiap transisi mencatat **user pengeksekusi**.

```
PURCHASE (Transaksi)
DRAFT ──(Operator akhiri sesi)──▶ WEIGHED ──(Finance setujui + nego harga)──▶ APPROVED ──(pembayaran bertahap)──▶ PAID
  ▲                                ▲                                                             │
  └──────────────(Admin buka kembali, hanya jika paidAmount = 0)────────────────────────────────┘
```

```
PURCHASEITEM (Bale)
GRADED ──(Grader Pos 1)──▶ WEIGHED ──(pembayaran lunas)──▶ CLOSED
          createdBy           weighedBy                       closedBy
```

- Bale `GRADED` dibuat oleh Grader di Pos 1 (`createdBy`); saat Pos 2 menimbang menjadi `WEIGHED` (`weighedBy`); saat pembayaran transaksi **lunas** menjadi `CLOSED` (`closedBy`).
- Transaksi `DRAFT` dibuat oleh Grader (`createdBy`); ditutup sesi oleh Operator (`weighedBy`); disetujui setelah review/negosiasi harga (`approvedBy`) dan dibayar bertahap sampai lunas (`paidBy`) oleh Admin Keuangan.
- Kolom actor disimpan di DB dan ditampilkan di UI (riwayat bale Pos 1, detail/riwayat Pos 2, list transaksi admin).

## 9. Model Data (Ringkasan)

Mengacu ke schema Prisma (`schema.prisma`):

- `Farmer` — data petani.
- `TobaccoType`, `LeafType`, `PackingType`, `TobaccoGrade` — master data lookup.
- `Warehouse` (gudang) & `Lane` (jalur) — scope kerja; `labelCode` & `transactionCode` berbasis kode gudang/jalur.
- `User` — akun `GRADER`/`OPERATOR`/`ADMIN`/`FINANCE`; `LabelSequence` — urutan label per scope per tanggal; `SystemSetting` — key/value pengaturan.
- `Purchase` — header transaksi (1 petani bisa punya N transaksi per hari, masing-masing berisi N bale), menyimpan rekap (`totalGrossWeight`, `totalNetWeight`, `totalPrice`, `totalItems`, `taxRate`/`taxAmount`/`netAmount`), data **negosiasi** (`originalTotalPrice`, `priceReviewNote`), data **pembayaran** (`paidAmount`) dan **actor**: `createdBy`, `weighedBy`, `approvedBy`, `paidBy`.
- `PurchaseItem` — 1 baris = 1 bale, menyimpan hasil grading (field wajib) & hasil timbang (field nullable sampai diisi operator), `labelCode` unik untuk barcode, `status` (`GRADED`/`WEIGHED`/`CLOSED`), `priceAdjustment` (selisih Rp/kg hasil negosiasi, 0 bila tanpa nego), dan **actor**: `createdBy`, `weighedBy`, `closedBy`.
- `Payment` — 1 baris = 1 kali pembayaran bertahap (`purchaseId` FK, `amount`, metode `TUNAI`/`TRANSFER`, `note`, `paidBy`, `paidAt`); `Purchase.paidAmount` = Σ `Payment.amount` per transaksi.

## 10. Kebutuhan Non-Fungsional

- **Responsif untuk tablet**: layar minimum ~10", perangkat rugged (lihat referensi UI).
- **Ketahanan koneksi**: gudang berpotensi koneksi tidak stabil — pertimbangkan optimistic UI/queue untuk aksi simpan saat offline sebentar (open question untuk fase berikutnya).
- **Kecepatan input**: kolom scan barcode harus auto-focus tiap kali Pos 2 dibuka/selesai simpan, agar operator tidak perlu sentuh layar antar-scan.
- **Audit trail**: setiap perubahan data setelah `WEIGHED` harus tercatat (siapa, kapan, nilai lama/baru) — minimal untuk kebutuhan Admin override.
- **Keamanan**: akses per peran (Grader tidak bisa ubah data timbang, Operator tidak bisa ubah data grading, Admin penuh).

## 11. Referensi UI

Wireframe & panduan tema (warna, tipografi, komponen, status pill) sudah didraf terpisah — `tobakos-wireframe.html` — sebagai acuan implementasi komponen shadcn/ui (Sidebar, Card, Badge, Input disabled, dsb).

## 12. Metrik Keberhasilan

- Waktu input per bale di Pos 1 & Pos 2 berkurang dibanding proses manual (baseline perlu diukur).
- Nol kasus bale tertukar/status tidak sinkron antara Pos 1 dan Pos 2.
- Rekap transaksi petani tersedia instan (tidak perlu rekap manual akhir hari).

## 13. Fase / Roadmap (usulan)

| Fase | Cakupan |
|---|---|
| **Fase 1 (MVP)** | Master data, Pos 1 Grading, Pos 2 Penimbangan, cetak barcode, status GRADED/WEIGHED, rekap dasar per transaksi. |
| **Fase 2** | Penutupan transaksi (CLOSED), audit trail, export nota PDF, integrasi timbangan live (WebSerial). |
| **Fase 3** | Laporan lanjutan, role & permission granular, implementasi negosiasi harga & hutang (desain §7.5–§7.6). |

## 14. Risiko & Pertanyaan Terbuka

- Bagaimana mekanisme integrasi timbangan digital ke browser (WebSerial hanya jalan di Chromium) — perlu agen lokal/desktop sebagai jembatan jika perangkat lain dipakai?
- ~~Apakah harga/kg dikunci di tahap grading (snapshot) atau bisa disesuaikan Admin sebelum transaksi ditutup?~~ **Terdefinisi**: harga di-snapshot saat grading; penyesuaian harga (naik/turun) hanya via negosiasi oleh Admin Keuangan saat transaksi `WEIGHED`, terkunci setelah `APPROVED` (lihat 7.5).
- Skema auth & manajemen user (siapa yang provisioning akun Grader/Operator/Admin)?
- Kebijakan saat transaksi harus dibatalkan setelah sebagian bale sudah `WEIGHED`.