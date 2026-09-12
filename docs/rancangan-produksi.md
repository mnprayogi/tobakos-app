# Rancangan & Rencana Implementasi — Modul Produksi, Stok, Penjualan & Margin

### Alur Produksi: Reclass/Sortir → Setel Berat → Press & Packing → Simpan Gudang Stok → Kirim Truk → Tagihan Customer

| | |
|---|---|
| **Versi** | 0.3 (Final — semua keputusan terkonfirmasi) |
| **Status** | Untuk direview |
| **Base** | TobakOS Next.js 16 (App Router), Prisma 7, MySQL, shadcn/ui |
| **Tanggal** | 2026-09-12 |

---

## 1. Ringkasan

Menambah modul **bagian produksi** yang mengolah kembali tembakau hasil pembelian dari petani menjadi bale baru sesuai alur 7 langkah di lini produksi, lalu menyimpan bale di beberapa gudang stok dan mengirimkannya ke customer menggunakan truk — dilengkapi **stok bahan baku (FIFO)** dan **stok ready per gudang**, **tagihan/piutang customer per pengiriman**, serta **laporan biaya & margin**.

Latar belakang gudang aktual:

- Kapasitas produksi **maksimum ~10 ton/hari**, sedangkan pembelian bisa **> 10 ton/hari** → sisa tembakau yang belum diproses **disimpan** sebagai stok bahan baku.
- Produksi mengambil bale pembelian dengan **FIFO** (bale tertua diproses lebih dulu).
- Setiap bale pembelian **dibongkar dan disortir ulang** — tidak ada stok "bale pembelian siap kirim"; yang dikirim ke customer hanya **bale hasil produksi**.
- Bale hasil produksi disimpan di **beberapa gudang stok** sebelum pengiriman.

## 2. Alur Produksi (7 langkah) & Pemetaan Sistem

| # | Langkah di lini | Konsep sistem | Entitas/field |
|---|---|---|---|
| 1 | Pekerja ambil stok tembakau pembelian → serahkan ke sortir | Buat batch dari stok bahan baku **FIFO**; bale sumber jadi `ProductionBatchSource` | `ProductionBatch` + `sources` |
| 2 | Sortir/reclass kelompokkan sesuai **mutu, warna, panjang daun** | Catat hasil reclass: **`SortCategory`** (master: mutu/warna/panjang → grade) | `ProductionItem` (`status = SET`) + `sortCategoryId` |
| 3 | Setel berat sesuai target (mis. **1 bale = 80 kg**) | `setWeight` + `targetWeight` (default `BALE_TARGET_WEIGHT`, bisa diubah) | `ProductionItem.setWeight/targetWeight` |
| 4 | Staff produksi catat **berat & grade** yang disetel | Rekam pre-press: `SET` (grade + SortCategory + setWeight) | `ProductionItem`, `setBy/setAt` |
| 5 | Bawa ke press hidrolis untuk packing | Transisi fisik; data `SET → PACKED` | — |
| 6 | Setelah packing → **barcode** → **timbang ulang**, staff catat lagi | Generate `labelCode`, input `grossWeight` final → hitung net & subtotal; `packedBy` | `ProductionItem` (`PACKED`) |
| 7 | Bale disimpan di **beberapa gudang stok** sebelum kirim | `storageWarehouseId` per bale + aksi **Pindah Gudang** (audit `ProductionItemMove`) | `ProductionItem.storageWarehouseId` |

Alur data secara keseluruhan:

```
Pembelian (bisa >10 t/hari)
  ↓ PAID (lunas)
STOK BAHAN BAKU — bale pembelian disimpan, urutan FIFO (transactionDate asc)
  ↓ batch mengambil ≈ targetNetWeight (default FIFO, boleh override)
BATCH PRODUKSI — [1] ambil stok → [2] reclass/sortir → [3-4] setel berat & catat (SET)
              → [5] press → [6] barcode + timbang ulang (PACKED)
  ↓
STOK READY — bale PACKED disimpan di gudang stok (storageWarehouseId), siap kirim
  ↓ loading truk + konfirmasi berangkat
PENGIRIMAN TRUK — SHIPPED → Surat Jalan → otomatis buat INVOICE per kiriman
  ↓
PIUTANG CUSTOMER — pembayaran bertahap (TUNAI → Kas KAS_PENJUALAN / TRANSFER → Bank)
```

Setiap bale hasil produksi ter-lacak balik ke bale sumber (`ProductionItemSource`) sehingga memungkinkan **split** (1 sumber → N lot) maupun **merge** (N sumber → 1 bale).

## 3. Keputusan Desain (terkonfirmasi)

| No | Topik | Keputusan |
|---|---|---|
| 1 | Pengguna modul | Role baru **`PRODUKSI`**; `ADMIN`/`SUPER_ADMIN` tetap bisa akses |
| 2 | Sumber bale input | Hanya bale dari transaksi **`PAID`/lunas** (inventory milik perusahaan) |
| 3 | Nilai produk | Snapshot **`pricePerKg`** dari `TobaccoGrade.defaultPrice` saat packing |
| 4 | Truk | **Master data truk** (nopol, driver, perusahaan angkutan, kapasitas) |
| 5 | Reclass | **Master `SortCategory`** (mutu/warna/panjang daun → grade) + dropdown di form sortir |
| 6 | Pencatatan bale | **Dua momen timbang**: `SET` (berat setel pre-press, langkah 4) → `PACKED` (barcode + berat final, langkah 6) |
| 7 | Barcode | `labelCode` **nullable** sampai `PACKED` — stiker dicetak setelah press |
| 8 | Target berat bale | Default `SystemSetting BALE_TARGET_WEIGHT` (mis. 80), bisa diubah per bale |
| 9 | Gudang stok | `storageWarehouseId` per bale di-set saat PACKED + aksi **Pindah Gudang** (audit `ProductionItemMove`); gudang asal kirim = gudang stok tempat bale disimpan |
| 10 | Kebijakan FIFO | **Default** tertua dulu, **boleh override** (peringatan saat ada bale lebih tua tersedia) |
| 11 | Kunci FIFO | **`transactionDate`** (tanggal transaksi pembelian) → tiebreaker `createdAt`/`labelCode` |
| 12 | Rencana batch | Kolom **`targetNetWeight`** (target tonase harian, ~10 t) |
| 13 | Stok | **Dua stok**: bahan baku (bale `PAID` belum diproses, FIFO) + ready bale (`PACKED`, per gudang stok). Keduanya **computed** (tanpa tabel saldo) |
| 14 | Basis invoice | **1 Pengiriman → 1 Invoice** (auto-generated saat SHIPPED) |
| 15 | Biaya | **Internal saja** — biaya produksi & angkut sebagai data laporan, tanpa entri kas otomatis |
| 16 | Pembayaran customer | TUNAI → `CashEntry` MASUK kategori baru **`KAS_PENJUALAN`**; TRANSFER → `BankEntry` |
| 17 | Scope | **Opsi C penuh**: Fase 1 produksi · Fase 2 stok + penjualan/piutang · Fase 3 biaya & margin |

Asumsi default:

- Pengiriman cukup sampai status **SHIPPED**; konfirmasi ketibaan (`DELIVERED`) untuk fase lanjutan.
- Input berat **manual**; integrasi timbangan/WebSerial & scan kamera menyusul bila diperlukan.

## 4. Roadmap

| Fase | Cakupan | Nilai bisnis |
|---|---|---|
| **1** | Modul Produksi: batch (FIFO), reclass/setel (SET), press & packing (PACKED), gudang stok, shipment, surat jalan, truk, `SortCategory`, role `PRODUKSI` | Digitalisasi lini produksi & pengiriman |
| **2** | Stok bahan baku (FIFO) + stok ready per gudang · Penjualan & piutang (invoice per kiriman) · portal customer | Stok terkelola, uang masuk terjaga |
| **3** | Biaya produksi & angkut · laporan margin per batch/customer · umur penyimpanan | Profitabilitas & kualitas |

---

## FASE 1 — MODUL PRODUKSI

## 5. Alur Status (Fase 1)

```
PRODUCTION BATCH
OPEN ──(semua lot terpack)──▶ PACKED ──(semua bale terkirim)──▶ SHIPPED ──(fase lanjut)──▶ CLOSED

PRODUCTION ITEM (lot / bale hasil)
SET ──(press + barcode + timbang ulang)──▶ PACKED ──(dimuat & truk berangkat)──▶ SHIPPED
   setBy/setAt                               packedBy                              shippedBy

SHIPMENT (pengiriman)
LOADING ──(konfirmasi berangkat)──▶ SHIPPED ──(fase lanjut)──▶ DELIVERED
```

Actor dicatat pada setiap transisi (pola Pos 1/Pos 2): `setBy`, `packedBy`, `shippedBy`.

## 6. Perubahan Schema (Prisma)

### 6.1 Model baru (9)

#### `SortCategory` (master hasil reclass)
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| name | String | nama kategori sortir (mis. "Merah panjang", "Coklat pendek") |
| grade | String | mapping ke grade (mis. "A1") |
| tobaccoType | TobaccoType? @relation | opsional — kategori khusus jenis tembakau |
| tobaccoTypeId | Int? | |
| warna | String? | deskripsi warna (informasi) |
| panjangDaun | String? | deskripsi panjang daun (informasi) |
| active | Boolean @default(true) | |
| createdAt / updatedAt | DateTime | |

#### `ProductionBatch`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| batchCode | String @unique | `PROD-{kode-gudang}-{yyyyMMdd}-{NNN}` (scope `prod:{wh}`) |
| warehouse | Warehouse @relation | asal material |
| warehouseId | Int | |
| productionDate | DateTime @default(now()) | |
| status | ProductionBatchStatus @default(OPEN) | |
| **targetNetWeight** | Float? | rencana kapasitas harian (~10 t), diisi dari pemilihan sumber, bisa diedit |
| notes | String? @db.Text | |
| totalInputBales / totalOutputBales | Int @default(0) | output dihitung dari bale `PACKED` |
| totalInputNetWeight | Float @default(0) | netto bale sumber masuk |
| **totalSetWeight** | Float @default(0) | berat disetel (Σ `setWeight` lot SET/PACKED) |
| totalOutputNetWeight | Float @default(0) | berat final (Σ bale PACKED); selisih vs totalSetWeight = toleransi press |
| totalValue | Decimal @default(0) | Σ `ProductionItem.subtotal` |
| createdBy / closedBy | String? | |
| createdAt / updatedAt | DateTime | |
| relasi | sources[], items[] | |

#### `ProductionBatchSource`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| batch / batchId | ProductionBatch / Int | onDelete Cascade |
| sourceItem / sourceItemId | PurchaseItem / Int | onDelete `Restrict`; bale sumber statusnya tidak diubah |
| sourceNetWeight | Float | snapshot netto masuk produksi |
| note | String? | |
| createdAt | DateTime | |
| unique | `@@unique([batchId, sourceItemId])` | 1 bale sumber dipakai sekali per batch |

#### `ProductionItem` (lot / bale hasil — dua momen pencatatan)
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| batch / batchId | ProductionBatch / Int | onDelete Cascade |
| **labelCode** | **String? @unique** | `{kode-gudang}-PROD-{yyyyMMdd}-{NNNN}` (scope `prod-bale:{wh}`) — **diisi saat PACKED** (barcode setelah press) |
| inputOrder | Int | urutan per batch |
| **sortCategory / sortCategoryId** | SortCategory / Int | hasil reclass (langkah 2) |
| packingType / packingTypeId | PackingType / Int | |
| tobaccoType / tobaccoTypeId | TobaccoType / Int | |
| leafType / leafTypeId | LeafType / Int | |
| grade | String | dari SortCategory / pemilihan |
| moisturePercent | Float @default(0) | |
| packingWeight | Float @default(0) | tara |
| **setWeight** | Float? | berat yang disetel sebelum press (langkah 4) |
| **targetWeight** | Float? | target per bale (default `BALE_TARGET_WEIGHT`, editable) |
| **storageWarehouse / storageWarehouseId** | Warehouse? / Int? | gudang stok penyimpanan, di-set saat PACKED (langkah 7) |
| customer / customerId | Customer? / Int? | alokasi tujuan, default "Gudang Sendiri" |
| grossWeight / weightAfterPacking / moistureDeduction / netWeight | Float? | berat final hasil timbang ulang (langkah 6) |
| pricePerKg | Decimal? | **snapshot harga jual** dari TobaccoGrade.defaultPrice |
| subtotal | Decimal? | nilai jual = netWeight × pricePerKg |
| status | ProductionItemStatus @default(SET) | `SET` → `PACKED` → `SHIPPED` |
| setBy / setAt | String? / DateTime? | staff produksi yang mencatat SET (langkah 4) |
| packedBy | String? | operator press + timbang ulang (langkah 6) |
| shippedBy | String? | |
| createdAt / updatedAt | DateTime | |
| relasi | sources[], shipmentItem?, moves[] (ProductionItemMove) | |

#### `ProductionItemSource` (traceability)
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| productionItem / productionItemId | ProductionItem / Int | onDelete Cascade |
| batchSource / batchSourceId | ProductionBatchSource / Int | onDelete Cascade |
| sourceItem / sourceItemId | PurchaseItem / Int | onDelete Restrict (denormalisasi utk query cepat) |
| shareWeight | Float? | kg bersih dari sumber yang masuk ke lot/bale |

#### `ProductionItemMove` (audit pindah gudang — langkah 7)
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| productionItem / productionItemId | ProductionItem / Int | onDelete Cascade |
| fromWarehouse / fromWarehouseId | Warehouse / Int | |
| toWarehouse / toWarehouseId | Warehouse / Int | |
| movedBy | String? | |
| movedAt | DateTime @default(now()) | |

#### `Truck`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| plate | String @unique | nopol |
| driverName | String | |
| driverPhone | String? | |
| carrierName | String? | perusahaan angkutan / mobil sewa |
| capacityKg | Float? | kapasitas muatan |
| active | Boolean @default(true) | |
| createdAt / updatedAt | DateTime | |
| relasi | shipments[] | |

#### `Shipment`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| shipmentCode | String @unique | `SHP-{kode-gudang}-{yyyyMMdd}-{NNN}` (scope `shp:{wh}`) |
| truck / truckId | Truck / Int | |
| customer / customerId | Customer / Int | tujuan |
| warehouse / warehouseId | Warehouse / Int | **gudang stok asal** (bale diambil dari storageWarehouseId) |
| shippingDate | DateTime @default(now()) | |
| status | ShipmentStatus @default(LOADING) | |
| totalBales | Int @default(0) | |
| totalNetWeight | Float @default(0) | |
| note | String? @db.Text | |
| createdBy / shippedBy | String? | |
| createdAt / updatedAt | DateTime | |
| relasi | items[] (ShipmentItem) | |

#### `ShipmentItem`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| shipment / shipmentId | Shipment / Int | onDelete Cascade |
| productionItem / productionItemId | ProductionItem / Int | `@unique` — 1 bale hasil hanya boleh masuk 1 kiriman |
| loadedBy | String? | |
| loadedAt | DateTime @default(now()) | |

### 6.2 Enum baru (4)

```prisma
enum ProductionBatchStatus { OPEN PACKED SHIPPED CLOSED }
enum ProductionItemStatus { SET PACKED SHIPPED }
enum ShipmentStatus { LOADING SHIPPED DELIVERED }
enum ProductionCostType { LABOR SORTIR MATERIAL LAIN }   // dipakai Fase 3
```

### 6.3 Tidak diubah
`PurchaseItem` & `Purchase` **tetap utuh**. Penanda "bale sudah masuk produksi" ditarik dari keberadaan `ProductionBatchSource` — status pembelian tidak dimutasi.

### 6.4 Pengaturan sistem baru
- `BALE_TARGET_WEIGHT` — default target berat bale per bale (mis. `80`).

### 6.5 Migrasi
```bash
npx prisma migrate dev --name production_module
npx prisma generate
```

## 7. Perubahan Role `PRODUKSI`

| File | Perubahan |
|---|---|
| `prisma/seed.ts` | tambah user `{ username: "produksi", name: "Staf Produksi", role: "PRODUKSI" }` |
| `src/types/next-auth.d.ts` | tambah `PRODUKSI` ke union `Role` |
| `src/components/layout/sidebar.tsx` | tambah `PRODUKSI` ke `ALL_ROLES` + section **Produksi** |
| `src/app/(dashboard)/dashboard/page.tsx` | tambah `case "PRODUKSI"` (dashboard ringkasan produksi) |
| `src/lib/actions/admin.ts` | guard: `PRODUKSI` tidak boleh mengelola user/role |

## 8. Kode Internal (`src/lib/`)

| File | Perubahan |
|---|---|
| `barcode.ts` | `generateBatchCode`, `generateProductionLabelCode`, `generateShipmentCode` (pakai `nextSequence(scope, tx)`; scope `prod:{wh}`, `prod-bale:{wh}`, `shp:{wh}`) |
| `calculations.ts` | reuse `calculateWeightAfterPacking/MoistureDeduction/NetWeight/Subtotal` + `roundWeight` untuk packing; helper total batch |
| `validations.ts` | Zod: `productionBatchSchema`, `sortedLotSchema`, `packedBaleSchema`, `shipmentSchema`, `truckSchema`, `sortCategorySchema`, `warehouseMoveSchema` |
| `master-data.ts` | cached getter `getCachedSortCategories` (tag `MASTER_TAG`) |

## 9. Server Actions

### 9.1 `src/lib/actions/production.ts` (role: `PRODUKSI`, `ADMIN`)
Helper umum: `resolveWarehouseScope`, `requireRoles`, `getActorName`, `publishEvent`.

**Read**
- `getEligibleSourceBales` — PurchaseItem dari `Purchase.status = PAID`, filter warehouse scope, eksklusi yang sudah dipakai batch; **urut FIFO `transactionDate asc → createdAt asc`**; sertakan umur bale (tanggal beli, hari tersimpan).
- `getActiveBatch` / `getBatch(id)` — batch + sources + items (SET & PACKED).
- `getPendingSurface` — lot `SET` yang menunggu press (daftar untuk tab Packing).
- `listBatches` — paged, filter status/tanggal.
- `listShipments` / `getShipment(id)` — detail + muatan.
- `getPackedItemsForShipment(customerId, warehouseId)` — bale `PACKED` di gudang stok tsb dan belum dimuat kiriman.

**Mutate**
- `createProductionBatch(sourceItemIds[], targetNetWeight?)` — validasi bale PAID & belum dipakai; FIFO default (server menawarkan tertua dulu, override + warning); buat batch (OPEN) + sources + `targetNetWeight`.
- `saveSortedLot(batchId, {sortCategoryId, grade, leafTypeId, tobaccoTypeId, packingTypeId, setWeight, targetWeight, moisturePercent, sourceItemIds[]})` — rekam pre-press: buat `ProductionItem` (`status = SET`), `sortCategoryId`, `setWeight`, `targetWeight` (validasi 0 < setWeight ≤ target toleransi), `ProductionItemSource`, update `totalSetWeight` batch. Event `prod.lot.sorted`. **Belum ada barcode.**
- `finalizePackedBale(lotId, {grossWeight, storageWarehouseId, customerId})` — transisi press: validasi lot `SET`; generate `labelCode`; hitung packing (gross − tara, potongan MC, netto, subtotal) dgn `pricePerKg` snapshot grade; set `storageWarehouseId`, `status = PACKED`, `packedBy`; update total batch (totalOutputBales, totalOutputNetWeight, totalValue). Event `prod.bale.packed`. Cetak label.
- `deleteRecord(id)` — hapus lot `SET` (belum dipress) atau bale `PACKED` belum dimuat; tanpa memengaruhi status batch memburuk.
- `closeProductionBatch(id)` — validasi semua lot `PACKED` → batch PACKED.
- `moveBaleWarehouse(productionItemId, toWarehouseId)` — validasi bale `PACKED` belum dalam shipment `LOADING`; update `storageWarehouseId` + buat `ProductionItemMove` (from/to); event `prod.bale.moved`.
- `createShipment({truckId, customerId, warehouseId, shippingDate, note})` — `warehouseId` = gudang stok asal.
- `assignBalesToShipment` / `loadShipment(shipmentId, productionItemIds)` — validasi bale `PACKED`, `storageWarehouseId` = gudang shipment (atau warning), belum terkirim; update `ShipmentItem`, total muatan; bila semua bale batch terkirim → batch SHIPPED.
- `shipShipment(shipmentId)` — LOADING → SHIPPED; bale muatan PACKED → SHIPPED (`shippedBy`); publish `shipment.shipped` (dan pemicu pembuatan invoice di Fase 2).
- Revalidate & event pada tiap mutasi mengikuti pola existing (`revalidatePath("/produksi/...")`, `publishEvent`).

### 9.2 Truk CRUD
Tambah ke `src/lib/actions/admin.ts` (pola CRUD master data existing, guard ADMIN): `getTrucks`, `createTruck`, `updateTruck`, `deleteTruck` (restrict bila sudah punya shipment).

### 9.3 SortCategory CRUD
Tambahkan ke `src/lib/actions/admin.ts` (guard ADMIN): `getSortCategories`, `createSortCategory`, `updateSortCategory`, `deleteSortCategory` (restrict bila sudah dipakai lot).

## 10. Halaman & UI — Fase 1

Resep halaman mengikuti pola existing: server component → `auth()` + scope warehouse → fetch master data (cached) → shell `"use client"`.

### 10.1 Sidebar — section **Produksi**
| Menu | Path | Role |
|---|---|---|
| Batch Produksi | `/produksi/batch` | PRODUKSI, ADMIN |
| Riwayat Batch | `/produksi/batch/[id]` (sub-route) | PRODUKSI, ADMIN |
| Stok Ready | `/produksi/stok` (Fase 2) | PRODUKSI, ADMIN |
| Pengiriman | `/produksi/shipments` | PRODUKSI, ADMIN |
| Detail Pengiriman | `/produksi/shipments/[id]` (sub-route) | PRODUKSI, ADMIN |

### 10.2 `/produksi/batch` — workbench dua stasiun (Tabs)
- Dialog **Buat Batch**: daftar bale PAID tersedia **urut FIFO** (kolom tanggal beli, hari tersimpan), checkbox + auto-select sampai `targetNetWeight` (memilih bale tertua dulu), peringatan bila override.
- **Tab 1 — Sortir & Setel (langkah 2–4):** form buat lot `SET` — Jenis Tembakau, Jenis Daun, Jenis Packing, **SortCategory (dropdown master)**, Grade, Potongan MC (%), **Berat Setel** (`setWeight`), **Target Berat** (`targetWeight`, default dari setting), kaitan bale sumber (multi-select + sisa berat). Simpan → lot `SET` masuk antrean press.
- **Tab 2 — Press & Packing (langkah 5–6):** antrean lot `SET`; pilih lot → input **berat final** (`grossWeight`) → pilih **gudang stok** (`storageWarehouseId`) + alokasi customer → **Simpan & Cetak Label** (generate barcode; reuse `StickerPreview`/`useThermalPrinter`). Bale `SET` → `PACKED`.
- Tabel **Sumber** (bale masuk batch, netto masuk) + Tabel **Hasil** (setel vs final, toleransi press, status, actor).
- Tombol **Tutup Batch** (validasi semua lot sudah `PACKED`).

### 10.3 `/produksi/shipments`
- List pengiriman + filter status/tanggal.
- Dialog **Buat Pengiriman**: pilih **Gudang Stok asal**, Truk (master), Customer tujuan, tanggal, catatan.

### 10.4 `/produksi/shipments/[id]`
- Header (kode kiriman, gudang asal, truk+driver, customer, tanggal, status pill).
- **Loading**: daftar bale `PACKED` di gudang stok shipment yang bisa dimuat (filter customer) + tabel muatan.
- Tombol **Konfirmasi Berangkat** → SHIPPED.
- **Cetak Surat Jalan** (pola `pengantar-print` / react-to-print, A4).

### 10.5 `/admin/master-data`
- Tab baru **Sort Kategori** (CRUD) + tab **Truk** (CRUD).

### 10.6 Komponen baru (`src/components/production/`)
`production-shell.tsx`, `sort-pack-shell.tsx`, `sorted-lot-form.tsx`, `pack-form.tsx`, `source-bale-picker.tsx`, `production-history-table.tsx`, `warehouse-move-dialog.tsx`, `shipments-client.tsx`, `shipment-detail-client.tsx`, `surat-jalan-print.tsx`.

---

## FASE 2 — STOK & PENJUALAN/PIUTANG

## 11. Stok Dua Gudang (computed, tanpa tabel baru)

| Stok | Definisi | Grup |
|---|---|---|
| **Stok Bahan Baku** | PurchaseItem transaksi `PAID` − yang ter-referensikan `ProductionBatchSource` aktif; **urutan FIFO** (`transactionDate asc`) | per gudang pembelian |
| **Stok Ready** | `ProductionItem` `PACKED` (belum `SHIPPED`) | **per gudang stok (`storageWarehouseId`)** + per grade/customer |

- Satuan: **bale + kg netto**; kolom umur bahan baku (tanggal beli, hari tersimpan) & umur stok ready (hari sejak PACKED).
- Kolom *Dialokasi*: bale yang sudah dimuat shipment `LOADING` (masih stok, ditandai).
- Aksi **Pindah Gudang** pada bale stok ready (via `moveBaleWarehouse` + riwayat `ProductionItemMove`).
- Export Excel (`export-excel.ts`).

## 12. Penjualan & Piutang (1 Shipment → 1 Invoice)

### 12.1 Model baru (3) + kategori kas

#### `SaleInvoice`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| invoiceCode | String @unique | `INV-{kode-gudang}-{yyyyMMdd}-{NNN}` |
| customer / customerId | Customer / Int | |
| warehouse / warehouseId | Warehouse / Int | |
| shipment / shipmentId | Shipment / Int | referensi 1:1 per pengiriman |
| invoiceDate | DateTime @default(now()) | |
| totalPrice | Decimal @default(0) | Σ `ProductionItem.subtotal` muatan |
| paidAmount | Decimal @default(0) | Σ `SalesPayment.amount` |
| status | SaleInvoiceStatus @default(UNPAID) | |
| note | String? | |
| createdBy / paidBy | String? | |
| createdAt / updatedAt | DateTime | |
| relasi | items[] (SaleInvoiceItem), payments[] (SalesPayment) | |

#### `SaleInvoiceItem`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| invoice / invoiceId | SaleInvoice / Int | onDelete Cascade |
| productionItem / productionItemId | ProductionItem / Int | `@unique` — 1 bale hasil ditagih sekali |
| subtotal | Decimal | snapshot nilai jual bale |

#### `SalesPayment`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| invoice / invoiceId | SaleInvoice / Int | onDelete Cascade |
| amount | Decimal | kelipatan 100; ≤ sisa tagihan (pola `Payment`) |
| method | PaymentMethod | reuse `TUNAI` / `TRANSFER` |
| note | String? @db.Text | |
| paidBy | String? | |
| paidAt | DateTime @default(now()) | |
| voidedAt / voidedBy | DateTime? / String? | |
| bankAccountId | Int? | saat TRANSFER |
| bankAccount | BankAccount? @relation | |

Tambahan enum: `SaleInvoiceStatus { UNPAID PARTIAL PAID }`.

Tambahan nilai `CashCategory`: `KAS_PENJUALAN` (masuk enum existing), untuk entri kas otomatis pembayaran TUNAI customer.

### 12.2 Aturan bisnis
- Invoice dibuat **otomatis** saat shipment berpindah ke `SHIPPED` (semua bale muatan jadi `SaleInvoiceItem`, `totalPrice` = Σ subtotal).
- Pembayaran bertahap: `SalesPayment` valid `0 < amount ≤ sisa`, kelipatan 100 (kecuali pelunasan). Lunas → `status = PAID`.
- TUNAI → `CashEntry` MASUK `KAS_PENJUALAN`; TRANSFER → `BankEntry` MASUK; keduanya tercatat `paymentId` (1:1) — pola existing cash/bank.
- Invoice tidak bisa dihapus; `void` pembayaran dengan alasan (audit).

## 13. Action & UI — Fase 2

### 13.1 Server actions baru
- `src/lib/actions/sales.ts` (role: `ADMIN`, `FINANCE`, `OWNER`): `getSalesData`, `getInvoice`, `recordSalesPayment`, `voidSalesPayment`, `getSalesExportData`.
- `src/lib/actions/production.ts` tambah: `getRawStock` (bahan baku FIFO) & `getReadyStock` (stok ready per gudang stok) atau gabung `getStockData`.
- `getCustomerPortalData` diperluas: tambah daftar kiriman & invoice + status pembayaran (role `CUSTOMER`).

### 13.2 Halaman
| Halaman | Isi | Role |
|---|---|---|
| `/produksi/stok` | Seksi bahan baku (FIFO) + seksi ready (per gudang stok), filter, export, aksi Pindah Gudang | PRODUKSI, ADMIN |
| `/admin/sales` | List invoice + rekap piutang per customer + riwayat pembayaran | ADMIN, FINANCE, OWNER |
| `/admin/sales/[id]` | Detail invoice, daftar bale, aksi catat bayar / void, cetak invoice | ADMIN, FINANCE, OWNER |
| Portal CUSTOMER | Tab kiriman & tagihan + status pembayaran | CUSTOMER |

### 13.3 Komponen baru
`src/components/admin/sales-client.tsx`, `sales-payment-dialog.tsx`, `invoice-print.tsx`; ekstensi `sidebar.tsx`, `portal/*`.

---

## FASE 3 — BIAYA & MARGIN

## 14. Model baru & kolom

### 14.1 `ProductionBatchCost`
| Field | Tipe | Catatan |
|---|---|---|
| id | Int @id | |
| batch / batchId | ProductionBatch / Int | onDelete Cascade |
| type | ProductionCostType | `LABOR` / `SORTIR` / `MATERIAL` / `LAIN` |
| amount | Decimal @db.Decimal(15,2) | |
| note | String? @db.Text | |
| createdBy | String? | |
| createdAt | DateTime | |

### 14.2 Kolom tambahan
- `Shipment.transportCost` — Decimal? ongkos angkut per kiriman.

### 14.3 Enum
```prisma
enum ProductionCostType { LABOR SORTIR MATERIAL LAIN }
```

## 15. Rumus Margin

```
Pokok batch      = Σ PurchaseItem.subtotal (bale sumber, nilai beli aktual)
Pendapatan batch = Σ ProductionItem.subtotal (bale PACKED)
Biaya produksi   = Σ ProductionBatchCost
Biaya angkut     = Shipment.transportCost (proporsi ke bale terkait jika lintas batch)

Margin batch     = Pendapatan − Pokok − Biaya produksi
Margin customer  = Σ Invoice.totalPrice − (Pokok bale terkait) − (Biaya angkut kiriman terkait)
```

## 16. Action & UI — Fase 3

- `src/lib/actions/production.ts` tambah: `addBatchCost`, `deleteBatchCost`, `updateShipmentTransportCost` (role: `PRODUKSI`, `ADMIN`; internal saja — tanpa entri kas).
- `src/lib/actions/reports.ts` tambah: `getProductionMarginReport` (per batch & per customer, rekap biaya, **umur penyimpanan rata-rata** bahan baku, export Excel).
- Halaman `/admin/reports` tambah tab **Produksi & Margin**.
- Cetak `surat-jalan-print.tsx` menampilkan ongkos angkut opsional.

---

## 17. Integrasi & Real-time

- `publishEvent` + `useRealtime`/`useSse`/`usePolling` (10s) menyegarkan tabel batch, antrean press, stok, muatan & piutang antar-stasiun — pola Pos 1/Pos 2 yang sudah ada.

## 18. Update Dokumen

- `AGENTS.md` — tambah model, enum, alur status (SET→PACKED→SHIPPED) dan aturan bisnis (FIFO, stok dua gudang, dua momen penimbangan, invoice per kiriman) di bagian Schema & Data Flow.

## 19. Rencana Implementasi (Urutan Pengerjaan)

| No | Tahap | Output | Verifikasi |
|---|---|---|---|
| 1 | Schema F1 | 9 model + enum + pengaturan `BALE_TARGET_WEIGHT` + migration `production_module` | `npx prisma migrate dev` + `generate` |
| 2 | Role PRODUKSI | seed user, types, sidebar, dashboard case, guard admin | `npm run seed` + login user produksi |
| 3 | Lib internal | barcode generators, validations, cached SortCategory/Trucks | lint |
| 4 | Master data | CRUD Sort Kategori + Truk di Master Data | uji CRUD manual |
| 5 | Actions produksi | production.ts (read+mutate: batch, lot, packing, pindah gudang) | uji action |
| 6 | Halaman Batch | `/produksi/batch` dua tab (Sortir & Press) + detail | alur: batch → sortir → setel → press → packing → tutup |
| 7 | Halaman Pengiriman | `/produksi/shipments` + detail + Surat Jalan | alur: kirim → muat → berangkat |
| 8 | Schema F2 | `SaleInvoice`+`SaleInvoiceItem`+`SalesPayment`, `KAS_PENJUALAN`, migration | migrate + generate |
| 9 | Stok | `/produksi/stok` (bahan baku FIFO + ready per gudang, pindah gudang) + export | uji konsistensi stok & riwayat pindah |
| 10 | Sales & Piutang | `/admin/sales`, auto-invoice saat SHIPPED, pembayaran → kas/bank | alur: invoice → bayar → lunas |
| 11 | Portal customer | tab kiriman + tagihan | uji login CUSTOMER |
| 12 | Schema F3 | `ProductionBatchCost`, `Shipment.transportCost`, migration | migrate + generate |
| 13 | Biaya & Margin | action + tab laporan produksi/margin + export | cek kalkulasi margin |
| 14 | Real-time & polish | events, revalidate, error-boundary | `npm run lint` + `npm run build` |

## 20. Fase Lanjutan (opsional, di luar scope)

- Konfirmasi ketibaan (`DELIVERED`/`CLOSED`) + bukti terima customer.
- Integrasi timbangan (WebSerial) & scan kamera di lini packing/loading truk (juga untuk scan lot SET → press).
- Offline queue produksi (perluas `useOfflineQueue`).
- Dashboard KPI produksi & penjualan untuk role `PRODUKSI`/`OWNER`.
- Retur/penolakan customer (reverse logistics).
- Audit trail lengkap (nilai lama/baru saat override).

## 21. Risiko & Catatan

- `nextSequence` dipakai bersama Pos 1; scope produksi dibedakan (`prod:`, `prod-bale:`, `shp:`) agar nomor tidak bertabrakan.
- Bale sumber diambil dari transaksi `PAID` — transaksi hutang/DP (`APPROVED`, sebagian bayar) **tidak** boleh masuk produksi.
- Satu bale hasil hanya boleh masuk **satu pengiriman** dan **satu invoice** (invariant `@unique` di `ShipmentItem.productionItemId` & `SaleInvoiceItem.productionItemId`), dijaga juga di layer action dengan transaction.
- FIFO dihitung dari `transactionDate` (bukan tanggal input sistem) — konsisten dengan label bale.
- **Toleransi press**: `totalSetWeight` (pre-press) vs `totalOutputNetWeight` (post-press) menimbulkan selisih — disajikan sebagai indikator, bukan error.
- Barcode bale produksi baru ada setelah press (`PACKED`); lot `SET` belum punya label — antrean press memakai `inputOrder`/ID, bukan scan.
- Stok computed menuntut query dengan index pada `Purchase`, `PurchaseItem`, `ProductionBatchSource`, `ProductionItem` (`storageWarehouseId`, `status`), `ShipmentItem`; bila data membesar drastis, pertimbangkan materialisasi tabel saldo di fase lanjutan.
- Nomor surat jalan memakai `shipmentCode`; nomor invoice memakai `invoiceCode`.