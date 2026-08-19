"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { isMultipleOf100, roundMoney } from "@/lib/calculations"
import { requireRoles } from "@/lib/roles"
import { publishEvent } from "@/lib/events"
import { resolveWarehouseScope } from "@/lib/actions/scope"
import { loanTotals } from "@/lib/loan-totals"

export type LoanStatusValue = "ACTIVE" | "SETTLED"
export type LoanEntryTypeValue = "DISBURSEMENT" | "REPAYMENT"
export type LoanMethodValue = "TUNAI" | "POTONG_TRANSAKSI"

export interface LoanAccount {
  loanId: number
  farmerId: number
  farmerName: string
  farmerNik: string | null
  warehouseId: number
  warehouseName: string
  status: LoanStatusValue
  openedAt: Date
  settledAt: Date | null
  totalBorrowed: number
  totalRepaid: number
  balance: number
  entryCount: number
}

export interface LoanEntryInfo {
  id: number
  type: LoanEntryTypeValue
  method: LoanMethodValue | null
  amount: number
  note: string | null
  transactionCode: string | null
  createdBy: string | null
  createdAt: Date
  balanceAfter: number
  voided: boolean
  voidedBy: string | null
}

export interface LoanBook {
  loanId: number
  farmerId: number
  farmerName: string
  farmerNik: string | null
  warehouseId: number
  warehouseName: string
  status: LoanStatusValue
  openedAt: Date
  settledAt: Date | null
  totalBorrowed: number
  totalRepaid: number
  balance: number
  entries: LoanEntryInfo[]
}

export async function getLoansData(): Promise<LoanAccount[]> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const scope = await resolveWarehouseScope()
  const loans = await prisma.farmerLoan.findMany({
    where: scope.mode === "scoped" ? { warehouseId: scope.warehouseId } : {},
    orderBy: { updatedAt: "desc" },
    include: {
      farmer: true,
      warehouse: true,
      entries: { select: { type: true, amount: true, voidedAt: true } },
    },
  })

  return loans.map((loan) => {
    const totals = loanTotals(loan.entries)
    return {
      loanId: loan.id,
      farmerId: loan.farmerId,
      farmerName: loan.farmer.name,
      farmerNik: loan.farmer.nik,
      warehouseId: loan.warehouseId,
      warehouseName: loan.warehouse.name,
      status: loan.status as LoanStatusValue,
      openedAt: loan.openedAt,
      settledAt: loan.settledAt,
      ...totals,
      entryCount: loan.entries.length,
    }
  })
}

export interface DisburseInput {
  farmerId: number
  amount: number
  note?: string | null
}

export async function disburseLoan(input: DisburseInput) {
  const actor = await requireRoles("ADMIN", "FINANCE")

  const amount = roundMoney(input.amount)
  if (amount <= 0) throw new Error("Jumlah pinjaman harus lebih dari 0")
  if (!isMultipleOf100(amount)) throw new Error("Jumlah pinjaman harus kelipatan 100 Rupiah")

  const scope = await resolveWarehouseScope()
  const warehouseId = scope.mode === "scoped" ? scope.warehouseId : null
  if (warehouseId == null) throw new Error("Akun Anda belum ditugaskan ke gudang")

  const farmer = await prisma.farmer.findUnique({ where: { id: input.farmerId } })
  if (!farmer) throw new Error("Petani tidak ditemukan")

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM farmer_loans WHERE farmerId = ${input.farmerId} FOR UPDATE`

    let loan = await tx.farmerLoan.findUnique({ where: { farmerId: input.farmerId } })
    if (!loan) {
      loan = await tx.farmerLoan.create({
        data: { farmerId: input.farmerId, warehouseId, status: "ACTIVE", notes: null },
      })
    } else {
      if (loan.warehouseId !== warehouseId) {
        throw new Error("Buku hutang petani ini terdaftar di gudang lain")
      }
      if (loan.status === "SETTLED") {
        loan = await tx.farmerLoan.update({
          where: { id: loan.id },
          data: { status: "ACTIVE", settledAt: null },
        })
      }
    }

    const entry = await tx.loanEntry.create({
      data: {
        loanId: loan.id,
        type: "DISBURSEMENT",
        amount,
        note: input.note?.trim() || null,
        createdBy: actor,
      },
    })

    await tx.cashEntry.create({
      data: {
        warehouseId: loan.warehouseId,
        category: "KAS_PEMBELIAN",
        type: "KELUAR",
        amount,
        loanEntryId: entry.id,
        createdBy: actor,
      },
    })

    return tx.farmerLoan.update({
      where: { id: loan.id },
      data: { updatedAt: new Date() },
    })
  })

  revalidatePath("/admin/loans")
  revalidatePath("/admin/transactions")
  revalidatePath("/admin/kas")
  publishEvent("loan.updated")
  publishEvent("cash.updated")
  return result
}

export interface RepayInput {
  loanId: number
  amount: number
  note?: string | null
}

export async function repayLoanCash(input: RepayInput) {
  const actor = await requireRoles("ADMIN", "FINANCE")

  const amount = roundMoney(input.amount)
  if (amount <= 0) throw new Error("Jumlah pembayaran harus lebih dari 0")

  const scope = await resolveWarehouseScope()

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM farmer_loans WHERE id = ${input.loanId} FOR UPDATE`

    const loan = await tx.farmerLoan.findUnique({
      where: { id: input.loanId },
      include: {
        entries: { select: { type: true, amount: true, voidedAt: true } },
      },
    })
    if (!loan) throw new Error("Buku hutang tidak ditemukan")
    if (loan.status !== "ACTIVE") throw new Error("Buku hutang sudah lunas")
    if (scope.mode === "scoped" && loan.warehouseId !== scope.warehouseId) {
      throw new Error("Buku hutang bukan milik gudang Anda")
    }

    const balance = loanTotals(loan.entries).balance
    if (amount > balance + 0.005) {
      throw new Error(`Pembayaran melebihi sisa hutang (sisa Rp ${balance.toLocaleString("id-ID")})`)
    }
    const isSettle = Math.abs(amount - balance) <= 0.005
    if (!isSettle && !isMultipleOf100(amount)) {
      throw new Error("Jumlah pembayaran harus kelipatan 100 Rupiah")
    }

    const entry = await tx.loanEntry.create({
      data: {
        loanId: loan.id,
        type: "REPAYMENT",
        method: "TUNAI",
        amount,
        note: input.note?.trim() || null,
        createdBy: actor,
      },
    })

    await tx.cashEntry.create({
      data: {
        warehouseId: loan.warehouseId,
        category: "KAS_PEMBELIAN",
        type: "MASUK",
        amount,
        loanEntryId: entry.id,
        createdBy: actor,
      },
    })

    return tx.farmerLoan.update({
      where: { id: loan.id },
      data: {
        ...(isSettle ? { status: "SETTLED", settledAt: new Date() } : {}),
        updatedAt: new Date(),
      },
    })
  })

  revalidatePath("/admin/loans")
  revalidatePath("/admin/transactions")
  revalidatePath("/admin/kas")
  publishEvent("loan.updated")
  publishEvent("cash.updated")
  return result
}

export async function getLoanBook(loanId: number): Promise<LoanBook> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const scope = await resolveWarehouseScope()
  const loan = await prisma.farmerLoan.findUnique({
    where: { id: loanId },
    include: {
      farmer: true,
      warehouse: true,
      entries: {
        orderBy: { createdAt: "asc" },
        include: {
          purchase: { select: { transactionCode: true } },
        },
      },
    },
  })
  if (!loan) throw new Error("Buku hutang tidak ditemukan")
  if (scope.mode === "scoped" && loan.warehouseId !== scope.warehouseId) {
    throw new Error("Buku hutang bukan milik gudang Anda")
  }

  const entries: LoanEntryInfo[] = []
  let running = 0
  let totalBorrowed = 0
  let totalRepaid = 0
  for (const e of loan.entries) {
    const voided = e.voidedAt != null
    if (!voided) {
      if (e.type === "DISBURSEMENT") {
        running += Number(e.amount)
        totalBorrowed += Number(e.amount)
      } else {
        running -= Number(e.amount)
        totalRepaid += Number(e.amount)
      }
    }
    entries.push({
      id: e.id,
      type: e.type as LoanEntryTypeValue,
      method: e.method as LoanMethodValue | null,
      amount: Number(e.amount),
      note: e.note,
      transactionCode: e.purchase?.transactionCode ?? null,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      balanceAfter: roundMoney(running),
      voided,
      voidedBy: e.voidedBy,
    })
  }

  return {
    loanId: loan.id,
    farmerId: loan.farmerId,
    farmerName: loan.farmer.name,
    farmerNik: loan.farmer.nik,
    warehouseId: loan.warehouseId,
    warehouseName: loan.warehouse.name,
    status: loan.status as LoanStatusValue,
    openedAt: loan.openedAt,
    settledAt: loan.settledAt,
    totalBorrowed: roundMoney(totalBorrowed),
    totalRepaid: roundMoney(totalRepaid),
    balance: roundMoney(running),
    entries,
  }
}
