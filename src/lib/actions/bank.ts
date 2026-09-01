"use server"

import { prisma } from "@/lib/db"
import { roundMoney } from "@/lib/calculations"
import { requireRoles } from "@/lib/roles"
import { resolveWarehouseScope } from "@/lib/actions/scope"
import { bankTotals, type BankTotals } from "@/lib/bank-totals"
import type { CashFlowTypeValue } from "@/lib/cash-totals"

export interface BankAccountInfo {
  id: number
  bankName: string
  accountNumber: string
  accountName: string
}

export interface BankEntryInfo {
  id: number
  bankAccount: BankAccountInfo
  type: CashFlowTypeValue
  amount: number
  note: string | null
  refLabel: string | null
  transactionCode: string | null
  farmerName: string | null
  createdBy: string | null
  createdAt: Date
  voided: boolean
  voidedBy: string | null
  balance: number
}

export interface BankAccountBalance {
  account: BankAccountInfo
  totalMasuk: number
  totalKeluar: number
  balance: number
}

export interface BankData {
  accounts: BankAccountBalance[]
  totals: BankTotals
  entries: BankEntryInfo[]
}

export async function getBankData(): Promise<BankData> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const scope = await resolveWarehouseScope()

  const scopedIds =
    scope.mode === "scoped"
      ? { OR: [{ warehouseId: scope.warehouseId }, { warehouseId: null }] }
      : {}

  const accounts = await prisma.bankAccount.findMany({
    where: { active: true, ...scopedIds },
    orderBy: [{ bankName: "asc" }, { accountNumber: "asc" }],
    select: { id: true, bankName: true, accountNumber: true, accountName: true },
  })

  const entryWhere =
    scope.mode === "scoped"
      ? { bankAccountId: { in: accounts.map((a) => a.id) } }
      : {}

  const entries = await prisma.bankEntry.findMany({
    where: entryWhere,
    orderBy: { createdAt: "desc" },
    include: {
      bankAccount: {
        select: { id: true, bankName: true, accountNumber: true, accountName: true },
      },
      purchase: { select: { transactionCode: true, farmer: { select: { name: true } } } },
    },
  })

  let running = 0
  const reversed = [...entries].reverse()
  const runningMap = new Map<number, number>()
  for (const e of reversed) {
    running += e.type === "MASUK" ? Number(e.amount) : -Number(e.amount)
    runningMap.set(e.id, roundMoney(running))
  }

  const info: BankEntryInfo[] = entries.map((e) => ({
    id: e.id,
    bankAccount: {
      id: e.bankAccount.id,
      bankName: e.bankAccount.bankName,
      accountNumber: e.bankAccount.accountNumber,
      accountName: e.bankAccount.accountName,
    },
    type: e.type as CashFlowTypeValue,
    amount: Number(e.amount),
    note: e.note,
    refLabel: e.purchase ? `Pembayaran ${e.purchase.transactionCode}` : "Mutasi bank",
    transactionCode: e.purchase?.transactionCode ?? null,
    farmerName: e.purchase?.farmer?.name ?? null,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    voided: e.voidedAt != null,
    voidedBy: e.voidedBy,
    balance: runningMap.get(e.id) ?? 0,
  }))

  const accountBalances: BankAccountBalance[] = accounts.map((a) => {
    const mine = info.filter((e) => e.bankAccount.id === a.id)
    const t = bankTotals(mine)
    return { account: a, ...t }
  })

  return {
    accounts: accountBalances,
    totals: bankTotals(info),
    entries: info,
  }
}

export interface BankExportRow {
  createdAt: Date
  bankAccountName: string
  type: CashFlowTypeValue
  uraian: string
  transactionCode: string | null
  note: string | null
  amount: number
  createdBy: string | null
  balance: number
}

export async function getBankExportData(from?: string, to?: string): Promise<BankExportRow[]> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const scope = await resolveWarehouseScope()

  const scopedWhere =
    scope.mode === "scoped"
      ? { OR: [{ warehouseId: scope.warehouseId }, { warehouseId: null }] }
      : {}
  const accounts = await prisma.bankAccount.findMany({
    where: { active: true, ...scopedWhere },
    select: { id: true },
  })
  const accountIds = scope.mode === "scoped" ? accounts.map((a) => a.id) : null

  const where: Record<string, unknown> = { voidedAt: null }
  if (accountIds) where.bankAccountId = { in: accountIds }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999`) } : {}),
    }
  }

  const entries = await prisma.bankEntry.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      bankAccount: { select: { bankName: true, accountNumber: true, accountName: true } },
      purchase: { select: { transactionCode: true, farmer: { select: { name: true } } } },
    },
  })

  let bal = 0
  return entries.map((e) => {
    const uraian = e.purchase
      ? e.purchase.farmer?.name
        ? `Pembayaran ${e.purchase.transactionCode} — ${e.purchase.farmer.name}`
        : `Pembayaran ${e.purchase.transactionCode}`
      : "Mutasi bank"
    bal += e.type === "MASUK" ? Number(e.amount) : -Number(e.amount)
    return {
      createdAt: e.createdAt,
      bankAccountName: `${e.bankAccount.bankName} ${e.bankAccount.accountNumber} (${e.bankAccount.accountName})`,
      type: e.type as CashFlowTypeValue,
      uraian,
      transactionCode: e.purchase?.transactionCode ?? null,
      note: e.note,
      amount: Number(e.amount),
      createdBy: e.createdBy,
      balance: roundMoney(bal),
    }
  })
}
