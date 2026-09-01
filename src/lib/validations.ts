import { z } from "zod"

export const farmerSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
  nik: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const customerSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const tobaccoTypeSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
})

export const leafTypeSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
})

export const packingTypeSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
  deductionWeight: z.number().min(0, "Tara tidak boleh negatif"),
})

export const gradeSchema = z.object({
  name: z.string().min(1, "Nama grade harus diisi"),
  defaultPrice: z.number().min(0, "Harga tidak boleh negatif"),
  tobaccoTypeId: z.number().int().positive("Jenis tembakau harus dipilih"),
})

export const warehouseSchema = z.object({
  code: z.string().min(2, "Kode gudang harus diisi"),
  name: z.string().min(1, "Nama gudang harus diisi"),
  address: z.string().optional(),
})

export const laneSchema = z.object({
  code: z.string().min(2, "Kode jalur harus diisi"),
  name: z.string().min(1, "Nama jalur harus diisi"),
  warehouseId: z.number().int().positive("Gudang harus dipilih"),
})

export type FarmerInput = z.infer<typeof farmerSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type TobaccoTypeInput = z.infer<typeof tobaccoTypeSchema>
export type LeafTypeInput = z.infer<typeof leafTypeSchema>
export type PackingTypeInput = z.infer<typeof packingTypeSchema>
export type GradeInput = z.infer<typeof gradeSchema>

export const cashEntrySchema = z.object({
  category: z.enum(["KAS_PEMBELIAN", "KAS_OPERASIONAL"]),
  type: z.enum(["MASUK", "KELUAR"]),
  amount: z.number().positive("Jumlah harus lebih dari 0"),
  note: z.string().max(500, "Keterangan terlalu panjang").nullish(),
  warehouseId: z.number().int().positive("Gudang harus dipilih").optional(),
})

export type CashEntryInput = z.infer<typeof cashEntrySchema>

export const bankAccountSchema = z.object({
  bankName: z.string().min(1, "Nama bank harus diisi"),
  accountNumber: z.string().min(1, "Nomor rekening harus diisi"),
  accountName: z.string().min(1, "Nama pemilik rekening harus diisi"),
  warehouseId: z.number().int().positive("Gudang harus dipilih").optional().nullable(),
})

export type BankAccountInput = z.infer<typeof bankAccountSchema>
