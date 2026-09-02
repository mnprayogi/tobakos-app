# Rancangan Fitur: Perluasan Laporan untuk Pemilik Modal & Mitra (Customer)

## Tujuan
Menjawab kebutuhan pemilik modal: **berapa uang yang digunakan untuk pembelian tembakau** dan **nilai transaksi**, serta rekap nilai pasokan per **mitra (= Customer)**.

## Keputusan (disepakati)
- **Mitra = Customer** (alokasi per bale via `PurchaseItem.customerId`).
- Perluas halaman **`/admin/reports`** (tidak buat halaman baru).
- Pakai **data yang sudah ada** (kas, bank, purchase, purchaseItem, customer, warehouse).
- **Arus modal per gudang** (baris = gudang).
- Rekap per customer **dapat difilter per customer**.
- Dashboard Owner **tidak** diubah — cukup di laporan.
- Arus modal = nilai transaksi (`Purchase.totalPrice`) vs **uang keluar dari `CashEntry` + `BankEntry`**.
- Status terhitung: **APPROVED & PAID** saja.
- Pajak **disiapkan sekarang (nilai 0)** hingga fitur pajak jadi (`docs/rancangan-pajak.md`).
- Akses: Owner semua gudang; Finance scoped per gudang.

## Konsep data

### Tab baru #1 — Rekap Per Customer (Mitra)
- Sumber: `PurchaseItem.subtotal` (sudah termasuk adj negosiasi) dikelompokkan per `customerId`, di dalam Purchase berstatus APPROVED/PAID & rentang tanggal & gudang.
- Baris: customer, jumlah transaksi, total bale, total netto (kg), **total nilai** (Σ subtotal), pajak proporsional, take home, harga/kg rata-rata.
- Filter: periode, gudang, **customer**.

### Tab baru #2 — Arus Modal (Cash Flow Lengkap, per gudang)
- Menampilkan **seluruh mutasi kas & bank** pada periode per gudang, bukan hanya sisi transaksi pembelian — sehingga pengeluaran modal selalu punya sumber yang jelas dan balance tertutup.
- **MASUK** (kas/bank masuk):
  - **Bayar Hutang** — `CashEntry MASUK` via `LoanEntry REPAYMENT` (bayar hutang tunai, modal kembali).
  - **Kas Manual** — `CashEntry MASUK` manual (tanpa loanEntry), semua kategori.
  - **Bank** — `BankEntry MASUK`.
  - **Total Masuk** = jumlah di atas.
- **KELUAR** (kas/bank keluar):
  - **Beli Tunai** — `CashEntry KELUAR` bertaut `purchaseId` (bayar transaksi tunai).
  - **Beli Transfer** — `BankEntry KELUAR` bertaut `purchaseId`.
  - **Pinjam Modal** — `CashEntry KELUAR` via `LoanEntry DISBURSEMENT` (dana pinjaman modal diberikan).
  - **Operasional** — `CashEntry KELUAR` kategori `KAS_OPERASIONAL`.
  - **Total Keluar** = jumlah di atas. (Kas manual keluar kategori KAS_PEMBELIAN tanpa relasi dimasukkan ke Kas Manual/umum.)
- **Selisih (Masuk − Keluar)**: negatif = net pengeluaran modal.
- **Pajak** (Σ `Purchase.taxAmount`, nilai 0 sekarang).
- Mengapa ini benar: potongan hutang transaksi **tidak** membuat mutasi kas saat dipotong — uangnya sudah keluar sebagai **Pinjam Modal** saat dana diberikan (disburse) dan masuk kembali sebagai **Bayar Hutang** saat dibayar tunai. Dengan menampilkan seluruh mutasi, selisih modal selalu dapat dilacak sumbernya.
- Akses/scope bank: per gudang via `BankAccount.warehouseId`, fallback ke warehouse transaksi (`purchaseId`).
- Validasi: tsc, eslint, build.

### Tab baru #3 — Rekap Pajak
- Sumber: `Purchase.taxAmount` per periode/gudang. Nilai 0 sekarang, aktif setelah fitur pajak.

## Perubahan File
1. `src/lib/actions/reports.ts` — tambah tipe & fungsi `getCustomerSummary`, `getCapitalFlow`, `getTaxSummary`; `getReportMeta` sertakan daftar customer.
2. `src/app/(dashboard)/admin/reports/client.tsx` — Tab type tambah `customer|capital|tax`; state, render tabel & Stat, filter customer.
3. `src/app/(dashboard)/admin/reports/page.tsx` — pass customer list + akses scope.
4. `src/components/admin/report-print.tsx` — dukungan cetak tab baru.
5. `src/lib/export-excel.ts` — dukungan export Excel tab baru.

## Desain UI (token)
- Ikuti token desain: angka mono (JetBrains Mono), Total amber, Dibayar emerald, deduction red, panel `bg-panel-alt`, border `border-border-soft`.
- Konsisten dengan 3 tab yang sudah ada (kartu Stat + tabel + footer total).

## Validasi
- `npx tsc --noEmit`, `eslint`, `npm run build`.
