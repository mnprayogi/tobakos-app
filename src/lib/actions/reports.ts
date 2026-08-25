"use server"

import { prisma } from "@/lib/db"
import { requireRoles } from "@/lib/roles"
import { roundMoney } from "@/lib/calculations"
import { toDateKey } from "@/lib/utils"
import {
  resolveWarehouseScope,
} from "@/lib/actions/scope"

export interface ReportFilters {
  from?: string
  to?: string
  warehouseId?: number | null
  farmerId?: number | null
  status?: string | null
}

export interface FarmerSummaryRow {
  farmerId: number
  farmerName: string
  farmerNik: string | null
  transactionCount: number
  totalBales: number
  totalNetWeight: number
  totalGrossWeight: number
  totalPrice: number
  totalPaid: number
  remaining: number
  loanBalance: number
}

export interface PeriodSummaryRow {
  label: string
  date: string
  transactionCount: number
  totalBales: number
  totalNetWeight: number
  totalPrice: number
  totalPaid: number
}

export interface TransactionDetailRow {
  id: number
  transactionCode: string
  transactionDate: Date
  farmerId: number
  farmerName: string
  farmerNik: string | null
  warehouseCode: string | null
  laneCode: string | null
  totalBales: number
  totalNetWeight: number
  totalPrice: number
  paidAmount: number
  remaining: number
  status: string
  createdBy: string | null
  weighedBy: string | null
  approvedBy: string | null
  paidBy: string | null
  originalTotalPrice: number | null
  priceReviewNote: string | null
  items: {
    id: number
    labelCode: string
    grade: string
    status: string
    grossWeight: number | null
    packingWeight: number
    moistureDeduction: number | null
    netWeight: number | null
    pricePerKg: number | null
    priceAdjustment: number
    subtotal: number
    customerName: string | null
  }[]
}

export async function getReportMeta() {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const scope = await resolveWarehouseScope()
  const [warehouses, farmers] = await Promise.all([
    prisma.warehouse.findMany({
      where: {
        active: true,
        ...(scope.mode === "scoped" ? { id: scope.warehouseId } : {}),
      },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.farmer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, nik: true },
    }),
  ])
  return { warehouses, farmers, scope }
}

function dateRange(filters: ReportFilters): { from: Date; to: Date } {
  const from = filters.from ? new Date(`${filters.from}T00:00:00`) : new Date(0)
  const to = filters.to ? new Date(`${filters.to}T23:59:59`) : new Date()
  if (isNaN(from.getTime())) return { from: new Date(0), to }
  if (isNaN(to.getTime())) return { from, to: new Date() }
  return { from, to }
}

type ReportStatus = "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"

function statusWhere(status?: string | null) {
  if (status) return { status: status as ReportStatus }
  return { status: { not: "VOIDED" as const } }
}

export async function getFarmerSummary(filters: ReportFilters): Promise<FarmerSummaryRow[]> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const { from, to } = dateRange(filters)
  const scope = await resolveWarehouseScope()
  const warehouseId = scope.mode === "scoped" ? scope.warehouseId : filters.warehouseId

  const purchases = await prisma.purchase.findMany({
    where: {
      transactionDate: { gte: from, lte: to },
      ...(warehouseId ? { warehouseId } : {}),
      ...(filters.farmerId ? { farmerId: filters.farmerId } : {}),
      ...statusWhere(filters.status),
    },
    include: {
      farmer: true,
      _count: { select: { items: true } },
    },
  })

  const farmerIds = [...new Set(purchases.map((p) => p.farmerId))]
  const loans = await prisma.farmerLoan.findMany({
    where: { farmerId: { in: farmerIds } },
    include: { entries: { select: { type: true, amount: true, voidedAt: true } } },
  })
  const loanBalanceMap = new Map<number, number>()
  for (const loan of loans) {
    let borrowed = 0
    let repaid = 0
    for (const e of loan.entries) {
      if (e.voidedAt) continue
      if (e.type === "DISBURSEMENT") borrowed += Number(e.amount)
      else repaid += Number(e.amount)
    }
    loanBalanceMap.set(loan.farmerId, roundMoney(borrowed - repaid))
  }

  const map = new Map<number, FarmerSummaryRow>()
  for (const p of purchases) {
    const totalPrice = Number(p.totalPrice)
    const paid = Number(p.paidAmount)
    const existing = map.get(p.farmerId)
    if (existing) {
      existing.transactionCount += 1
      existing.totalBales += p._count.items
      existing.totalNetWeight = roundMoney(existing.totalNetWeight + Number(p.totalNetWeight))
      existing.totalGrossWeight = roundMoney(existing.totalGrossWeight + Number(p.totalGrossWeight))
      existing.totalPrice = roundMoney(existing.totalPrice + totalPrice)
      existing.totalPaid = roundMoney(existing.totalPaid + paid)
      existing.remaining = roundMoney(existing.remaining + (totalPrice - paid))
    } else {
      map.set(p.farmerId, {
        farmerId: p.farmerId,
        farmerName: p.farmer.name,
        farmerNik: p.farmer.nik,
        transactionCount: 1,
        totalBales: p._count.items,
        totalNetWeight: roundMoney(Number(p.totalNetWeight)),
        totalGrossWeight: roundMoney(Number(p.totalGrossWeight)),
        totalPrice: roundMoney(totalPrice),
        totalPaid: roundMoney(paid),
        remaining: roundMoney(totalPrice - paid),
        loanBalance: roundMoney(loanBalanceMap.get(p.farmerId) ?? 0),
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalPrice - a.totalPrice)
}

export async function getPeriodSummary(filters: ReportFilters): Promise<PeriodSummaryRow[]> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const { from, to } = dateRange(filters)
  const scope = await resolveWarehouseScope()
  const warehouseId = scope.mode === "scoped" ? scope.warehouseId : filters.warehouseId

  const purchases = await prisma.purchase.findMany({
    where: {
      transactionDate: { gte: from, lte: to },
      ...(warehouseId ? { warehouseId } : {}),
      ...statusWhere(filters.status),
    },
    include: { _count: { select: { items: true } } },
    orderBy: { transactionDate: "asc" },
  })

  const map = new Map<string, PeriodSummaryRow>()
  for (const p of purchases) {
    const label = toDateKey(new Date(p.transactionDate))
    const existing = map.get(label)
    const totalPrice = Number(p.totalPrice)
    const paid = Number(p.paidAmount)
    if (existing) {
      existing.transactionCount += 1
      existing.totalBales += p._count.items
      existing.totalNetWeight = roundMoney(existing.totalNetWeight + Number(p.totalNetWeight))
      existing.totalPrice = roundMoney(existing.totalPrice + totalPrice)
      existing.totalPaid = roundMoney(existing.totalPaid + paid)
    } else {
      map.set(label, {
        label,
        date: label,
        transactionCount: 1,
        totalBales: p._count.items,
        totalNetWeight: roundMoney(Number(p.totalNetWeight)),
        totalPrice: roundMoney(totalPrice),
        totalPaid: roundMoney(paid),
      })
    }
  }

  return Array.from(map.values())
}

export async function getTransactionDetail(filters: ReportFilters): Promise<TransactionDetailRow[]> {
  await requireRoles("ADMIN", "FINANCE", "OWNER")
  const { from, to } = dateRange(filters)
  const scope = await resolveWarehouseScope()
  const warehouseId = scope.mode === "scoped" ? scope.warehouseId : filters.warehouseId

  const purchases = await prisma.purchase.findMany({
    where: {
      transactionDate: { gte: from, lte: to },
      ...(warehouseId ? { warehouseId } : {}),
      ...(filters.farmerId ? { farmerId: filters.farmerId } : {}),
      ...statusWhere(filters.status),
    },
    include: {
      farmer: true,
      warehouse: true,
      lane: true,
      items: {
        orderBy: { inputOrder: "asc" },
        include: { customer: true },
      },
    },
    orderBy: { transactionDate: "desc" },
  })

  return purchases.map((p) => {
    const totalPrice = Number(p.totalPrice)
    const paid = Number(p.paidAmount)
    return {
      id: p.id,
      transactionCode: p.transactionCode,
      transactionDate: p.transactionDate,
      farmerId: p.farmerId,
      farmerName: p.farmer.name,
      farmerNik: p.farmer.nik,
      warehouseCode: p.warehouse?.code ?? null,
      laneCode: p.lane?.code ?? null,
      totalBales: p.totalItems,
      totalNetWeight: Number(p.totalNetWeight),
      totalPrice,
      paidAmount: paid,
      remaining: roundMoney(totalPrice - paid),
      status: p.status,
      createdBy: p.createdBy,
      weighedBy: p.weighedBy,
      approvedBy: p.approvedBy,
      paidBy: p.paidBy,
      originalTotalPrice: p.originalTotalPrice != null ? Number(p.originalTotalPrice) : null,
      priceReviewNote: p.priceReviewNote,
      items: p.items.map((i) => ({
        id: i.id,
        labelCode: i.labelCode,
        grade: i.grade,
        status: i.status,
        grossWeight: i.grossWeight,
        packingWeight: i.packingWeight,
        moistureDeduction: i.moistureDeduction,
        netWeight: i.netWeight,
        pricePerKg: i.pricePerKg != null ? Number(i.pricePerKg) : null,
        priceAdjustment: Number(i.priceAdjustment),
        subtotal: Number(i.subtotal ?? 0),
        customerName: i.customer?.name ?? null,
      })),
    }
  })
}
