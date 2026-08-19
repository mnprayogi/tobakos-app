"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { roundMoney } from "@/lib/calculations"
import { requireRoles } from "@/lib/roles"
import { publishEvent } from "@/lib/events"
import { resolveWarehouseScope } from "@/lib/actions/scope"
import { cashTotalsByCategory, type CashCategoryValue, type CashFlowTypeValue } from "@/lib/cash-totals"
import { cashEntrySchema } from "@/lib/validations"

export interface CashEntryInfo {
  id: number
  category: CashCategoryValue
  type: CashFlowTypeValue
  amount: number
  note: string | null
  refLabel: string | null
  transactionCode: string | null
  createdBy: string | null
  createdAt: Date
  voided: boolean
  voidedBy: string | null
  manual: boolean
}

export interface CashData {
  entries: CashEntryInfo[]
  totals: ReturnType<typeof cashTotalsByCategory>
}

export async function getCashData(): Promise<CashData> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const scope = await resolveWarehouseScope()

  const entries = await prisma.cashEntry.findMany({
    where: scope.mode === "scoped" ? { warehouseId: scope.warehouseId } : {},
    orderBy: { createdAt: "desc" },
    include: {
      purchase: { select: { transactionCode: true } },
      loanEntry: { select: { type: true } },
    },
  })

  const info: CashEntryInfo[] = entries.map((e) => {
    let refLabel: string | null = null
    let transactionCode: string | null = null
    if (e.paymentId != null) {
      refLabel = e.purchase?.transactionCode ? `Pembayaran ${e.purchase.transactionCode}` : "Pembayaran transaksi"
      transactionCode = e.purchase?.transactionCode ?? null
    } else if (e.loanEntryId != null) {
      refLabel = e.loanEntry?.type === "DISBURSEMENT" ? "Pencairan pinjaman" : "Bayar hutang tunai"
    }
    return {
      id: e.id,
      category: e.category as CashCategoryValue,
      type: e.type as CashFlowTypeValue,
      amount: Number(e.amount),
      note: e.note,
      refLabel,
      transactionCode,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      voided: e.voidedAt != null,
      voidedBy: e.voidedBy,
      manual: e.paymentId == null && e.loanEntryId == null,
    }
  })

  return { entries: info, totals: cashTotalsByCategory(info) }
}

export interface CreateCashEntryInput {
  category: CashCategoryValue
  type: CashFlowTypeValue
  amount: number
  note?: string | null
  warehouseId?: number
}

export async function createCashEntry(input: CreateCashEntryInput) {
  const actor = await requireRoles("ADMIN", "FINANCE")

  const parsed = cashEntrySchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Data mutasi kas tidak valid")
  }

  const amount = roundMoney(parsed.data.amount)
  if (amount <= 0) throw new Error("Jumlah harus lebih dari 0")

  const scope = await resolveWarehouseScope()
  const warehouseId = scope.mode === "scoped" ? scope.warehouseId : parsed.data.warehouseId
  if (warehouseId == null) {
    throw new Error("Pilih gudang terlebih dahulu")
  }

  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
  if (!warehouse) throw new Error("Gudang tidak ditemukan")

  await prisma.cashEntry.create({
    data: {
      warehouseId,
      category: parsed.data.category,
      type: parsed.data.type,
      amount,
      note: parsed.data.note?.trim() || null,
      createdBy: actor,
    },
  })

  revalidatePath("/admin/kas")
  publishEvent("cash.updated")
}

export async function voidCashEntry(entryId: number) {
  const actor = await requireRoles("ADMIN", "FINANCE")

  const entry = await prisma.cashEntry.findUnique({ where: { id: entryId } })
  if (!entry) throw new Error("Mutasi kas tidak ditemukan")
  if (entry.paymentId != null || entry.loanEntryId != null) {
    throw new Error("Mutasi otomatis tidak bisa dibatalkan di sini — batalkan dari sumbernya (pembayaran/pinjaman)")
  }
  if (entry.voidedAt) throw new Error("Mutasi ini sudah dibatalkan")

  await prisma.cashEntry.update({
    where: { id: entryId },
    data: { voidedAt: new Date(), voidedBy: actor },
  })

  revalidatePath("/admin/kas")
  publishEvent("cash.updated")
}