"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { prisma } from "@/lib/db"
import { requireRoles } from "@/lib/roles"
import { MASTER_TAG } from "@/lib/master-data"
import { parseRiwayatFile, type RiwayatPreview } from "@/lib/import/riwayat"
import { createJob, updateJob, finishJob, type ImportProgress } from "@/lib/import/progress"

const IMPORT_ACTOR = "Import Riwayat"
const MAX_FILE_SIZE = 5 * 1024 * 1024

const DEFAULT_CUSTOMER = "Gudang Sendiri"
const DEFAULT_TOBACCO_TYPE = "Virginia FC"
const DEFAULT_LEAF_TYPE = "Lamina"
const DEFAULT_PACKING_TYPE = "Keranjang Bambu"

export async function parseRiwayatUpload(formData: FormData): Promise<RiwayatPreview> {
  await requireRoles("ADMIN", "SUPER_ADMIN")

  const file = formData.get("file")
  if (!(file instanceof File)) throw new Error("File .xlsx tidak ditemukan")
  if (!/\.xlsx$/i.test(file.name)) throw new Error("File harus berekstensi .xlsx")
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran file maksimal 5MB")
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  return parseRiwayatFile(buffer, file.name)
}

export interface ImportResult {
  importedTransactions: number
  skippedTransactions: number
  importedBales: number
  generatedLabels: number
  payments: number
  cashOutflow: number
  totalPrice: number
  fileName: string
}

function toDate(v: Date | string): Date {
  if (v instanceof Date && !isNaN(v.getTime())) return v
  const parsed = new Date(String(v))
  if (isNaN(parsed.getTime())) return new Date()
  return parsed
}

export interface ImportMasterOptions {
  warehouses: { id: number; code: string; name: string }[]
  lanes: { id: number; code: string; name: string; warehouseId: number }[]
  customers: { id: number; name: string }[]
  tobaccoTypes: { id: number; name: string }[]
  leafTypes: { id: number; name: string }[]
  packingTypes: { id: number; name: string; deductionWeight: number }[]
}

export interface ImportOverrides {
  warehouseId?: number | null
  laneId?: number | null
  customerId?: number | null
  tobaccoTypeId?: number | null
  leafTypeId?: number | null
  packingTypeId?: number | null
  duplicateMode?: "skip" | "relabel"
}

export async function getImportMasterOptions(): Promise<ImportMasterOptions> {
  await requireRoles("ADMIN", "SUPER_ADMIN")

  const [warehouses, lanes, customers, tobaccoTypes, leafTypes, packingTypes] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
    prisma.lane.findMany({ orderBy: [{ warehouseId: "asc" }, { code: "asc" }] }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.tobaccoType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.leafType.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.packingType.findMany({ orderBy: { name: "asc" } }),
  ])

  return {
    warehouses: warehouses.map((w) => ({ id: w.id, code: w.code, name: w.name })),
    lanes: lanes.map((l) => ({ id: l.id, code: l.code, name: l.name, warehouseId: l.warehouseId })),
    customers: customers.map((c) => ({ id: c.id, name: c.name })),
    tobaccoTypes: tobaccoTypes.map((t) => ({ id: t.id, name: t.name })),
    leafTypes: leafTypes.map((t) => ({ id: t.id, name: t.name })),
    packingTypes: packingTypes.map((p) => ({ id: p.id, name: p.name, deductionWeight: p.deductionWeight })),
  }
}

export async function importRiwayatTransactions(
  preview: RiwayatPreview,
  jobId?: string,
  overrides?: ImportOverrides
): Promise<ImportResult> {
  await requireRoles("ADMIN", "SUPER_ADMIN")

  if (!preview.transactions || preview.transactions.length === 0) {
    throw new Error("Tidak ada transaksi untuk diimpor")
  }
  if (jobId) await createJob(jobId, preview.transactions.length)
  const report = async (patch: Partial<ImportProgress>) => {
    if (jobId) await updateJob(jobId, patch)
  }

  try {
  const result = await prisma.$transaction(
    async (tx) => {
      const locCache = new Map<string, { warehouse: { id: number }; lane: { id: number } }>()

      async function resolveWarehouseLane(warehouseCode: string, laneToken: string) {
        const key = `${warehouseCode}|${laneToken}`
        const cached = locCache.get(key)
        if (cached) return cached

        let warehouseId: number
        if (overrides?.warehouseId) {
          const w = await tx.warehouse.findUnique({ where: { id: overrides.warehouseId }, select: { id: true } })
          if (!w) throw new Error("Gudang terpilih tidak ditemukan")
          warehouseId = w.id
        } else {
          const w = await tx.warehouse.upsert({
            where: { code: warehouseCode },
            update: {},
            create: { code: warehouseCode, name: `Gudang ${warehouseCode}` },
            select: { id: true },
          })
          warehouseId = w.id
        }

        let laneId: number
        if (overrides?.laneId) {
          const l = await tx.lane.findUnique({ where: { id: overrides.laneId }, select: { id: true, warehouseId: true } })
          if (!l) throw new Error("Jalur terpilih tidak ditemukan")
          if (l.warehouseId !== warehouseId) throw new Error("Jalur terpilih tidak sesuai dengan gudang terpilih")
          laneId = l.id
        } else {
          const laneCode = `${warehouseCode}-${laneToken}`
          const l = await tx.lane.upsert({
            where: { code: laneCode },
            update: {},
            create: { code: laneCode, name: `Jalur ${laneToken}`, warehouseId },
            select: { id: true, warehouseId: true },
          })
          if (l.warehouseId !== warehouseId) {
            throw new Error(
              `Jalur "${laneCode}" sudah terdaftar di gudang lain — pilih override Jalur/Gudang untuk memaksa lokasi.`
            )
          }
          laneId = l.id
        }

        const result = { warehouse: { id: warehouseId }, lane: { id: laneId } }
        locCache.set(key, result)
        return result
      }

      const customer = overrides?.customerId
        ? await tx.customer.findUnique({ where: { id: overrides.customerId } })
        : await tx.customer.findFirst({ where: { name: DEFAULT_CUSTOMER } })
      if (overrides?.customerId && !customer) throw new Error("Customer terpilih tidak ditemukan")
      const customerId = customer
        ? customer.id
        : (
            await tx.customer.create({ data: { name: DEFAULT_CUSTOMER } })
          ).id

      const tobaccoType = overrides?.tobaccoTypeId
        ? await tx.tobaccoType.findUnique({ where: { id: overrides.tobaccoTypeId } })
        : await tx.tobaccoType.findFirst({ where: { name: DEFAULT_TOBACCO_TYPE } })
      if (overrides?.tobaccoTypeId && !tobaccoType) throw new Error("Jenis tembakau terpilih tidak ditemukan")
      const tobaccoTypeId = tobaccoType
        ? tobaccoType.id
        : (await tx.tobaccoType.create({ data: { name: DEFAULT_TOBACCO_TYPE } })).id

      const leafType = overrides?.leafTypeId
        ? await tx.leafType.findUnique({ where: { id: overrides.leafTypeId } })
        : await tx.leafType.findFirst({ where: { name: DEFAULT_LEAF_TYPE } })
      if (overrides?.leafTypeId && !leafType) throw new Error("Jenis daun terpilih tidak ditemukan")
      const leafTypeId = leafType
        ? leafType.id
        : (await tx.leafType.create({ data: { name: DEFAULT_LEAF_TYPE } })).id

      const packingType = overrides?.packingTypeId
        ? await tx.packingType.findUnique({ where: { id: overrides.packingTypeId } })
        : await tx.packingType.findFirst({ where: { name: DEFAULT_PACKING_TYPE } })
      if (overrides?.packingTypeId && !packingType) throw new Error("Jenis packing terpilih tidak ditemukan")
      const packingTypeId = packingType
        ? packingType.id
        : (await tx.packingType.create({ data: { name: DEFAULT_PACKING_TYPE, deductionWeight: 0 } })).id

      const farmerMap = new Map<string, number>()
      for (const farmer of preview.farmers) {
        let id = farmerMap.get(farmer.code)
        if (id == null) {
          const existing = await tx.farmer.findFirst({ where: { nik: farmer.code } })
          if (existing) {
            id = existing.id
          } else {
            const created = await tx.farmer.create({ data: { name: farmer.name, nik: farmer.code } })
            id = created.id
          }
          farmerMap.set(farmer.code, id)
        }
      }

      const fileLabelCounts = new Map<string, number>()
      for (const t of preview.transactions) {
        for (const b of t.items) {
          fileLabelCounts.set(b.labelCode, (fileLabelCounts.get(b.labelCode) ?? 0) + 1)
        }
      }
      const fileLabels = new Set(fileLabelCounts.keys())
      const allLabelCodes = Array.from(fileLabelCounts.keys())
      const existingLabelSet = new Set(
        (
          await tx.purchaseItem.findMany({
            where: { labelCode: { in: allLabelCodes } },
            select: { labelCode: true },
          })
        ).map((i) => i.labelCode)
      )

      const duplicateMode = overrides?.duplicateMode ?? "skip"
      const blockedLabels = new Set<string>()
      for (const [label, count] of fileLabelCounts) {
        if (count > 1 || existingLabelSet.has(label)) blockedLabels.add(label)
      }
      const usedLabels = new Set(existingLabelSet)

      let importedTransactions = 0
      let skippedTransactions = 0
      let importedBales = 0
      let generatedLabels = 0
      let payments = 0
      let cashOutflow = 0
      let totalPrice = 0
      let processedTx = 0

      await report({
        phase: "master",
        message: "Master data siap — mulai impor transaksi.",
      })

      for (const txData of preview.transactions) {
        processedTx++
        await report({
          phase: "importing",
          processed: processedTx,
          imported: importedTransactions,
          skipped: skippedTransactions,
          generatedLabels,
          currentLabel: txData.transactionCode,
          message: `Mengimpor transaksi ${processedTx}/${preview.transactions.length}…`,
        })

        const farmerId = farmerMap.get(txData.farmerCode)
        if (farmerId == null) {
          throw new Error(`Petani "${txData.farmerCode}" tidak ditemukan`)
        }

        const existing = await tx.purchase.findUnique({
          where: { transactionCode: txData.transactionCode },
          select: { id: true },
        })
        if (existing) {
          skippedTransactions++
          continue
        }

        const blockedInTx = txData.items.some((b) => blockedLabels.has(b.labelCode))
        if (duplicateMode === "skip" && blockedInTx) {
          skippedTransactions++
          await report({
            phase: "importing",
            processed: processedTx,
            imported: importedTransactions,
            skipped: skippedTransactions,
            generatedLabels,
            currentLabel: txData.transactionCode,
            message: `Transaksi "${txData.transactionCode}" dilewati — ada Kode Stok duplikat dalam file / sudah terpakai di database.`,
          })
          continue
        }

        const { warehouse, lane } = await resolveWarehouseLane(txData.warehouseCode, txData.laneCode)
        const transactionDate = toDate(txData.transactionDate)
        const totalPriceTx = txData.totalPrice

        const purchase = await tx.purchase.create({
          data: {
            transactionCode: txData.transactionCode,
            farmerId,
            warehouseId: warehouse.id,
            laneId: lane.id,
            transactionDate,
            totalGrossWeight: txData.totalGrossWeight,
            totalNetWeight: txData.totalNetWeight,
            totalPrice: totalPriceTx,
            totalItems: txData.items.length,
            status: "PAID",
            taxRate: 0,
            taxAmount: 0,
            netAmount: totalPriceTx,
            paidAmount: totalPriceTx,
            ...(txData.originalTotalPrice !== txData.totalPrice
              ? {
                  originalTotalPrice: txData.originalTotalPrice,
                  priceReviewNote: `Impor riwayat — total dibulatkan ke kelipatan 100 (selisih ${
                    txData.roundingDiff >= 0 ? "+" : ""
                  }${txData.roundingDiff}).`,
                }
              : {}),
            createdBy: IMPORT_ACTOR,
            weighedBy: IMPORT_ACTOR,
            approvedBy: IMPORT_ACTOR,
            paidBy: IMPORT_ACTOR,
            notes: `Impor riwayat dari ${preview.fileName}. Total dibulatkan ke kelipatan 100 — subtotal = nilai historis file, bale terakhir menyerap selisih pembulatan.`,
          },
        })

        for (const bale of txData.items) {
          let labelCode = bale.labelCode
          if (blockedLabels.has(labelCode)) {
            if (usedLabels.has(labelCode)) {
              let n = 2
              let candidate = `${labelCode}-${n}`
              while (usedLabels.has(candidate) || fileLabels.has(candidate)) {
                n++
                candidate = `${labelCode}-${n}`
              }
              usedLabels.add(candidate)
              labelCode = candidate
              generatedLabels++
            } else {
              usedLabels.add(labelCode)
            }
          } else {
            usedLabels.add(labelCode)
          }

          const packingWeight = Math.round((bale.grossWeight - bale.netWeight) * 10) / 10
          await tx.purchaseItem.create({
            data: {
              purchaseId: purchase.id,
              inputOrder: bale.inputOrder,
              labelCode,
              packingTypeId,
              tobaccoTypeId,
              leafTypeId,
              grade: bale.grade,
              moisturePercent: 0,
              packingWeight,
              customerId,
              grossWeight: bale.grossWeight,
              weightAfterPacking: bale.netWeight,
              moistureDeduction: 0,
              netWeight: bale.netWeight,
              pricePerKg: bale.pricePerKg,
              priceAdjustment: bale.priceAdjustment,
              subtotal: bale.subtotal,
              status: "CLOSED",
              createdBy: IMPORT_ACTOR,
              weighedBy: IMPORT_ACTOR,
              closedBy: IMPORT_ACTOR,
              createdAt: transactionDate,
            },
          })
          importedBales++
          if (importedBales % 25 === 0) {
            await report({
              phase: "importing",
              processed: processedTx,
              imported: importedTransactions,
              skipped: skippedTransactions,
              generatedLabels,
              bales: importedBales,
              currentLabel: labelCode,
            })
          }
        }

        const payment = await tx.payment.create({
          data: {
            purchaseId: purchase.id,
            amount: totalPriceTx,
            method: "TUNAI",
            note: "Pembayaran lunas — impor riwayat",
            paidBy: IMPORT_ACTOR,
            paidAt: transactionDate,
            loanDeduction: 0,
          },
        })
        payments++

        await tx.cashEntry.create({
          data: {
            warehouseId: warehouse.id,
            category: "KAS_PEMBELIAN",
            type: "KELUAR",
            amount: totalPriceTx,
            note: `Pembayaran ${txData.transactionCode} (impor riwayat)`,
            purchaseId: purchase.id,
            paymentId: payment.id,
            createdBy: IMPORT_ACTOR,
            createdAt: transactionDate,
          },
        })
        cashOutflow += totalPriceTx
        totalPrice += totalPriceTx
        importedTransactions++
        await report({
          imported: importedTransactions,
          skipped: skippedTransactions,
          generatedLabels,
          bales: importedBales,
        })
      }

      return {
        importedTransactions,
        skippedTransactions,
        importedBales,
        generatedLabels,
        payments,
        cashOutflow,
        totalPrice,
      }
    },
    { timeout: 60000 }
  )

  if (jobId) {
    try {
      await finishJob(jobId, {
        phase: "done",
        message: `Import selesai — ${result.importedTransactions} transaksi diimpor, ${result.skippedTransactions} dilewati, ${result.importedBales} bal, ${result.generatedLabels} label baru.`,
        processed: result.importedTransactions + result.skippedTransactions,
        imported: result.importedTransactions,
        skipped: result.skippedTransactions,
        generatedLabels: result.generatedLabels,
        bales: result.importedBales,
      })
    } catch (e) {
      console.error("Gagal menulis status selesai impor", e)
    }
  }

  return { ...result, fileName: preview.fileName }
  } catch (err) {
    if (jobId) {
      await finishJob(jobId, {
        phase: "error",
        message: err instanceof Error ? err.message : "Import gagal.",
      }).catch(() => {})
    }
    throw err
  } finally {
    // Revalidation cache bersifat best-effort — tidak boleh menahan/menggagalkan
    // respons impor dan status job sudah ditulis oleh finishJob di atas.
    try {
      revalidatePath("/dashboard")
      revalidatePath("/pos-1/grading")
      revalidatePath("/pos-2/weighing")
      revalidatePath("/pos-2/transactions")
      revalidatePath("/admin/transactions")
      revalidatePath("/admin/debt")
      revalidatePath("/admin/kas")
      revalidatePath("/admin/bank")
      revalidatePath("/admin/loans")
      revalidatePath("/admin/reports")
      revalidateTag(MASTER_TAG, "max")
    } catch {
      // abaikan
    }
  }
}