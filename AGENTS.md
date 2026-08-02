# TobakOS — Agent Guide

## Project Overview

Aplikasi internal berbasis web (optimized for rugged tablet ~10") untuk digitalisasi proses pembelian tembakau dari petani — **Grading** (Pos 1) → **Penimbangan** (Pos 2) → **Penutupan Transaksi**.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router), Server Actions for mutations, Route Handlers for device endpoints |
| UI | shadcn/ui: Sidebar, Card, Table, Badge, Input, Select, Button, Dialog, Tabs, Sonner |
| Database | MySQL via Prisma ORM (migration-based) |
| Auth | NextAuth/Auth.js with role-based access (Grader/Operator/Admin/Finance) |
| Device I/O | WebSerial API (timbangan USB), `@zxing/browser` (scan kamera tablet) |
| Styling | Tailwind CSS — dark theme, emerald/amber/mono palette from `wireframe.html` |

> **Next.js cutatan**: Versi ini memiliki breaking changes. Baca `node_modules/next/dist/docs/` sebelum menulis kode.

## Schema (Prisma)

- **Farmer** — id, name, nik (unique), phone, address
- **Customer** — id, name, phone, address (default "Gudang Sendiri" di-seed)
- **PackingType** — id, name, deductionWeight (default potongan kg)
- **TobaccoType** — id, name, active
- **TobaccoGrade** — id, name, defaultPrice (Decimal), tobaccoTypeId (FK)
- **LeafType** — id, name, active
- **Purchase** — id, transactionCode (unique), farmerId (FK), transactionDate, totalGrossWeight, totalNetWeight, totalPrice (Decimal), totalItems, status (DRAFT|APPROVED|PAID), notes, createdBy, taxRate, taxAmount (Decimal), netAmount (Decimal), **originalTotalPrice? (Decimal, harga sebelum negosiasi)**, **priceReviewNote? (catatan negosiasi)**, **paidAmount (Decimal, default 0 — Σ pembayaran)**
- **PurchaseItem** — id, purchaseId (FK), inputOrder, labelCode (unique), packingTypeId, tobaccoTypeId, leafTypeId, grade, moisturePercent, packingWeight, **customerId? (FK Customer, alokasi per bale)**, grossWeight?, weightAfterPacking?, moistureDeduction?, netWeight?, pricePerKg? (Decimal), priceAdjustment (Decimal — **selisih Rp/kg hasil negosiasi, 0 bila tanpa nego**), subtotal? (Decimal), status (GRADED|WEIGHED|CLOSED)
- **Payment** — id, purchaseId (FK), amount (Decimal), method (TUNAI|TRANSFER), note?, paidBy?, paidAt — 1 baris = 1 kali pembayaran bertahap
- **SystemSetting** — key, value

## Data Flow & Business Rules

### Status Bale (PurchaseItem)
```
GRADED → WEIGHED → CLOSED
(Pos 1)   (Pos 2)   (lunas — Admin/Finance closes Purchase)
```

### Pos 1 — Grading
1. Cari/registrasi Petani → buat Purchase baru (DRAFT) jika belum ada transaksi hari itu
2. Input per bale: Jenis Tembakau, Jenis Daun, Jenis Packing, Grade, Potongan MC (%), Potongan Packing (kg), **Alokasi Customer (wajib, select dari master, default "Gudang Sendiri")**
3. Harga/kg ambil snapshot dari `TobaccoGrade.defaultPrice` sesuai grade yang dipilih (tidak berubah walau harga master berubah)
4. Simpan → buat PurchaseItem (status=GRADED), **simpan `customerId` (alokasi customer per bale)**, generate labelCode format `{gudang}-{jalur}-{tanggal}-{urutan}`, kirim cetak ke printer stiker thermal USB
5. Tabel riwayat bale per transaksi tampil real-time di bagian bawah (termasuk kolom Customer)

### Pos 2 — Penimbangan
1. Kolom scan barcode auto-focus (menerima input scanner USB sebagai keyboard-wedge), tombol kamera sebagai alternatif
2. Sistem cari PurchaseItem berdasar labelCode → tampilkan data grading di field **disabled** (read-only, terkunci dari Pos 1, termasuk Alokasi Customer)
3. Ambil berat: live dari timbangan (WebSerial) atau input manual
4. Hitung otomatis:
   - `weightAfterPacking = grossWeight − packingWeight`
   - `moistureDeduction = weightAfterPacking × moisturePercent%`
   - `netWeight = weightAfterPacking − moistureDeduction`
   - `subtotal = netWeight × pricePerKg`
5. Simpan & Kunci → update status=WEIGHED, data tidak bisa diedit kecuali Admin (dengan audit log)
6. Tabel riwayat bale ditimbang tampil di bawah

### Penutupan Transaksi (Admin Keuangan/Finance)
- Semua PurchaseItem berstatus WEIGHED → Finance **Review & Setujui** → status PURCHASE=APPROVED (bisa disertai negosiasi harga, lihat Negosiasi Harga)
- Pembayaran **bertahap**: catat Payment per kali bayar (amount, method TUNAI|TRANSFER, note?, paidBy, paidAt); `paidAmount` bertambah; lunas → PURCHASE=PAID, seluruh PurchaseItem=CLOSED
- **Reopen** transaksi hanya bila `paidAmount = 0`; transaksi yang sudah dibayar tidak bisa dibuka kembali
- Rekap: totalGrossWeight, totalNetWeight, totalItems, totalPrice, paidAmount (sisa = totalPrice − paidAmount)

### Negosiasi Harga (Admin Keuangan/Finance)
- Hanya saat transaksi berstatus **WEIGHED** (sebelum APPROVED); setelah APPROVED harga terkunci
- Harga awal per bale tetap snapshot `TobaccoGrade.defaultPrice` dari Pos 1 (`pricePerKg`)
- Rumus: `target = round100(hargaBaru)` (kelipatan 100); `adjustmentPerKg = floor((target − hargaLama) / totalNetto)` — **integer**, floor di kedua arah (negatif = harga turun); disimpan di `PurchaseItem.priceAdjustment` untuk bale 1..N−1, bale **terakhir** menyerap sisa pembulatan (`subtotal_last = target − Σ sebelumnya`) sehingga `Purchase.totalPrice = target` **persis** (kelipatan 100 Rupiah)
- `subtotal_i = round2(netWeight_i × (pricePerKg_i + adjustmentPerKg))`; total transaksi final = Σ subtotal = kelipatan 100 Rupiah; selisih pembulatan input (input vs kelipatan 100) ditampilkan di preview review
- Simpan `originalTotalPrice` (harga awal) + `priceReviewNote` (catatan negosiasi) sebagai jejak audit

### Hutang & Pembayaran Bertahap
- Semantik status (dari `Purchase.status` + `paidAmount`): `APPROVED` + `paidAmount = 0` → **Hutang**; `0 < paidAmount < totalPrice` → **Sebagian/DP**; `paidAmount = totalPrice` → **PAID (Lunas)**, PurchaseItem → CLOSED
- Catat pembayaran per kali → `Payment`; validasi `0 < amount ≤ sisa tagihan` (`totalPrice − paidAmount`) dan `amount` **kelipatan 100 Rupiah** (kecuali `amount = sisa` untuk pelunasan transaksi non-nego yang totalnya tidak kelipatan 100)
- Halaman `/admin/debt`: rekap hutang per petani (total tagihan, total dibayar, sisa, status) + riwayat bayar per transaksi

### Hutang Modal (Pinjaman Petani)
- **FarmerLoan** — satu buku per petani (`farmerId` unik), status `ACTIVE`/`SETTLED`; saldo = `Σ DISBURSEMENT − Σ REPAYMENT` (tidak disimpan denormalisasi — dihitung dari `LoanEntry`)
- **LoanEntry** (ledger): `type` = `DISBURSEMENT` (pinjam) / `REPAYMENT` (bayar); `method` = `TUNAI` / `POTONG_TRANSAKSI`; untuk potong transaksi terhubung `purchaseId` + `paymentId` (satu Payment → maks satu LoanEntry)
- **Disburse**: `disburseLoan` — buat buku jika belum ada, aktifkan ulang jika `SETTLED`; jumlah **kelipatan 100** (wajib)
- **Bayar tunai**: `repayLoanCash` — jumlah kelipatan 100 kecuali menutup sisa hutang (settle); saat saldo = 0 → `SETTLED` + `settledAt`
- **Potong lewat pembayaran transaksi**: `recordPayment` menerima `loanDeduction?` opsional. `Payment.amount` = tunai yang diterima petani (net), `credit = amount + loanDeduction` masuk ke `paidAmount` transaksi (potongan adalah bagian dari penyelesaian transaksi), `loanDeduction` masuk ke buku hutang (buat `LoanEntry` `POTONG_TRANSAKSI`). Validasi: `amount ≥ 0`, `loanDeduction ≥ 0`, `loanDeduction ≤ sisa hutang`, `loanDeduction ≤ sisa tagihan`, `loanDeduction` kelipatan 100 (kecuali menutup sisa hutang), `credit > 0`, `credit ≤ sisa tagihan`, `credit` kelipatan 100 (kecuali menutup sisa tagihan). Contoh: sisa tagihan 1.000.000, tunai 800.000 + potongan 200.000 → kredit 1.000.000 → transaksi PAID, `Payment.amount` = 800.000. Reopen transaksi ditolak bila ada `Payment` (bukan hanya `paidAmount = 0`)
- Halaman `/admin/loans`: rekap per buku (total pinjam, total bayar, sisa, status) + aksi Beri Pinjaman / Bayar Tunai; `/admin/loans/[id]`: buku hutang (ledger + saldo berjalan) + tombol Cetak (window.print)

## Design Tokens (from wireframe)

Dark theme only. Palette:
- Background base: `#060A12`
- Panel: `#101828`
- Panel Alt: `#0C1420`
- Border: `#1F2B40` / soft: `#182236`
- Text: `#E7ECF5` / muted: `#7C8AA8` / muted-2: `#586479`
- Emerald (primary): `#22C98D` — status positif, aksi utama
- Amber (attention): `#F2B64C` — status menunggu (GRADED), highlight harga
- Red (deduction): `#EF6B6B` — nilai potongan & error

Typography:
- **Inter** — UI, body, labels, buttons
- **JetBrains Mono** — numbers, barcodes, prices, table data only

Status pills:
- `GRADED` → amber (`rgba(242,182,76,.12)` bg, `#F2B64C` text, `rgba(242,182,76,.35)` border)
- `WEIGHED` → emerald (`rgba(34,201,141,.12)` bg, `#22C98D` text, `rgba(34,201,141,.35)` border)
- `CLOSED` → muted (`rgba(124,138,168,.12)` bg, `#7C8AA8` text)

## App Structure (convention)

```
src/
  app/
    (auth)/          # login, role selection
    (dashboard)/
      pos-1/         # Grading page
      pos-2/         # Penimbangan page
    admin/           # Master data CRUD, reports, close transaction
    api/             # Route handlers (device endpoints, print, export)
  components/
    ui/              # shadcn components
    pos-1/           # Grading-specific components
    pos-2/           # Penimbangan-specific components
    shared/          # Reusable: ScanInput, StickerPreview, StatusPill, etc.
  lib/
    actions/         # Server Actions per domain (grading, weighing, purchase)
    prisma.ts        # Prisma client singleton
    utils.ts         # Helpers (formatCurrency, generateLabelCode, etc.)
    calculations.ts  # Business logic: net weight, subtotal formulas
  types/             # Zod schemas for validation, shared TS types
```

## Key Implementation Notes

- Kolom scan Pos 2 harus **auto-focus** setiap halaman dibuka atau setelah simpan — operator tidak perlu sentuh layar antar-scan
- Field dari Pos 1 yang muncul di Pos 2 harus **disabled** (border dashed, teks pudar) — data terkunci
- Harga/kg di-snapshot saat grading (copy `defaultPrice` ke `pricePerKg`), jangan referensi langsung ke TobaccoGrade
- Generate `labelCode` format: `{gudang}-{jalur}-{YYYYMMDD}-{urutan}` (4 digit zero-padded, urutan per jalur per tanggal); scan Pos 2 wajib validasi format ini
- Audit trail untuk perubahan Admin setelah WEIGHED (siapa, kapan, nilai lama/baru)
- Role `FINANCE` (Admin Keuangan): review & setujui transaksi + negosiasi harga (status WEIGHED), catat pembayaran bertahap, monitor hutang — guard server via `requireRoles`, bukan hanya sidebar
- Optimistic UI / queue untuk koneksi tidak stabil — pertimbangkan di fase berikutnya
- Gunakan Server Actions untuk mutasi data, Route Handlers untuk endpoint device

## Perintah Penting

```bash
npm run dev          # development server
npx prisma migrate dev   # update database schema
npx prisma generate      # regenerate Prisma client
npm run build        # production build
```
