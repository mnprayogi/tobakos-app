# Rancangan Fitur: Pajak Dipotong dari Take Home Petani

## Tujuan
Mengaktifkan fitur pajak yang selama ini mati (kolom `taxRate`/`taxAmount`/`netAmount` ada tapi tidak pernah diisi/dibaca). Pajak **dibebankan ke petani** dan **dipotong dari take home pay**, bukan ditambahkan di atas tagihan.

## Model Bisnis (disepakati)
- **Kas tetap mengalir keluar `totalPrice` penuh**, terbagi: porsi `amount` (ke petani) + porsi pajak (ke akun pajak).
- **`paidAmount` menutup `totalPrice`** (basis hutang/pelunasan tidak berubah).
- Pajak hanya mengalihkan ke mana uang masuk, bukan mengubah total tagihan.
- Pajak **dihitung satu kali saat lunas** (bukan proporsional per-pembayaran).
- Pajak mengalir juga lewat **Bank** (saat metode TRANSFER).
- Kategori kas: **`KAS_PAJAK`**.
- **`TAX_RATE = 0`** → tanpa pajak, perilaku identik dengan sekarang (semua guard `> 0.005` menangani).

## Rumus
```
taxAmount       = roundMoney(totalPrice × taxRate / 100)
takeHomeAmount  = roundMoney(totalPrice − taxAmount)      // sebelum potongan hutang
takeHomePay     = takeHomeAmount − totalLoanDeduction     // pada bukti lunas
```

## Skema Database (Migration)
### `Purchase` (tobacco_purchases)
- `netAmount` → **rename ke `takeHomeAmount`** (makna: nilai diterima petani sebelum hutang). Kolom ini tak pernah dipakai, rename aman.
- `taxRate` (Float), `taxAmount` (Decimal) — sudah ada, diaktifkan.
- `totalPrice` = harga final tembakau (hasil nego, basis paidAmount) — tak berubah.
- `originalTotalPrice` = harga awal sebelum nego (jejak audit) — tak disentuh pajak.

### `Payment`
- tambah `taxDeduction Decimal @default(0.00) @db.Decimal(15,2)` — porsi pajak dari pembayaran yang melunasi (jejak + void).

### `CashCategory` enum
- tambah `KAS_PAJAK`.

## Perubahan Kode
1. **Helper pajak**: `resolveTaxRate()` (baca `TAX_RATE` dari SystemSetting), `calcTax()`, `takeHome()`. Letakkan di `src/lib/calculations.ts` atau file baru.
2. **`finance.ts reviewAndApprove`** (baris 25-96): saat approve, snapshot `TAX_RATE` → set `taxRate`, `taxAmount`, `takeHomeAmount` (pakai totalPrice final, kedua cabang nego & non-nego).
3. **`finance.ts recordPayment`** (baris 107-322): `paidAmount`/`remaining`/`isPaidOff` tetap basis `totalPrice`. Saat transaksi **lunas** (`isPaidOff`) & `taxAmount > 0`: set `payment.taxDeduction = taxAmount`; buat entry pajak terpisah (TUNAI → `CashEntry KAS_PAJAK`; TRANSFER → `BankEntry`), terhubung `paymentId`.
4. **`finance.ts voidPayment`** (baris 324+): batalkan juga entry pajak dari payment & recalc ulang status lunas.
5. **`finance.ts reopenTransaction`** (baris ~602): saat revert APPROVED→WEIGHED, set `taxRate=0`, `taxAmount=0`, `takeHomeAmount=totalPrice` (pajak di-recalc saat approve berikutnya).
6. **`finance.ts getBuktiData`** (baris 806-860): `takeHomePay = totalPrice − taxAmount − totalLoanDeduction`; tampilkan baris pajak.
7. **Tipe kas & validasi**: `cash-totals.ts` (`CashCategoryValue` + `KAS_PAJAK`), `validations.ts` (zod), `cash.ts` (row), `cash-book-print.tsx` (label). UI kas `admin/kas/client.tsx` label/filter. `cash-dialog.tsx` — pajak TIDAK ditambahkan ke dialog manual (hanya via sistem).
8. **Tipe returned** `transactions.ts`, `reports.ts` bila memakai kolom pajak.
9. **UI preview/approve/nota**: tampilkan `takeHomeAmount` / baris Pajak.

## Migrasi & Validasi
- `npx prisma migrate dev` + `npx prisma generate`
- `npx tsc --noEmit`, `eslint`, `npm run build`
