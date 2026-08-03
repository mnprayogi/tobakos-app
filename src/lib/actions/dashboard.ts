"use server"

import { prisma } from "@/lib/db"
import { roundMoney } from "@/lib/calculations"
import { requireRoles } from "@/lib/roles"
import { getDebtSummary } from "@/lib/actions/finance"
import { getLoansData } from "@/lib/actions/loans"
import { getPeriodSummary } from "@/lib/actions/reports"
import { toDateKey } from "@/lib/utils"

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Shared types ────────────────────────────────────

export interface RecentBale {
  id: number
  labelCode: string
  grade: string
  status: string
  farmerName: string
  customerName: string | null
  laneCode: string | null
  netWeight: number | null
  subtotal: number
  createdAt: Date
}

export interface RecentPayment {
  id: number
  amount: number
  method: string
  paidAt: Date
  transactionCode: string
  farmerName: string
}

// ─── GRADER ──────────────────────────────────────────

export interface GraderDashboard {
  todayGraded: number
  todayDraftTransactions: number
  todayActiveFarmers: number
  awaitingWeigh: number
  recentBales: RecentBale[]
}

export async function getGraderDashboard(): Promise<GraderDashboard> {
  await requireRoles("GRADER", "ADMIN")
  const start = todayStart()

  const [createdToday, awaitingWeigh, draftTx, activeFarmers, recentItems] =
    await Promise.all([
      prisma.purchaseItem.count({ where: { createdAt: { gte: start } } }),
      prisma.purchaseItem.count({ where: { status: "GRADED" } }),
      prisma.purchase.count({
        where: { status: "DRAFT", transactionDate: { gte: start } },
      }),
      prisma.purchase.groupBy({
        by: ["farmerId"],
        where: { transactionDate: { gte: start } },
      }),
      prisma.purchaseItem.findMany({
        where: { createdAt: { gte: start } },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          purchase: { include: { farmer: true, lane: true } },
          customer: true,
        },
      }),
    ])

  return {
    todayGraded: createdToday,
    todayDraftTransactions: draftTx,
    todayActiveFarmers: activeFarmers.length,
    awaitingWeigh,
    recentBales: recentItems.map((i) => ({
      id: i.id,
      labelCode: i.labelCode,
      grade: i.grade,
      status: i.status,
      farmerName: i.purchase.farmer.name,
      customerName: i.customer?.name ?? null,
      laneCode: i.purchase.lane?.code ?? null,
      netWeight: i.netWeight,
      subtotal: Number(i.subtotal ?? 0),
      createdAt: i.createdAt,
    })),
  }
}

// ─── OPERATOR ────────────────────────────────────────

export interface OperatorDashboard {
  todayWeighed: number
  awaitingWeigh: number
  todayGrossWeight: number
  todayNetWeight: number
  todaySubtotal: number
  recentWeighed: RecentBale[]
}

export async function getOperatorDashboard(): Promise<OperatorDashboard> {
  await requireRoles("OPERATOR", "ADMIN")
  const start = todayStart()

  const [todayWeighed, awaitingWeigh, todayAgg, recentWeighed] =
    await Promise.all([
      prisma.purchaseItem.count({
        where: { status: "WEIGHED", createdAt: { gte: start } },
      }),
      prisma.purchaseItem.count({ where: { status: "GRADED" } }),
      prisma.purchaseItem.aggregate({
        where: { status: "WEIGHED", createdAt: { gte: start } },
        _sum: { grossWeight: true, netWeight: true, subtotal: true },
      }),
      prisma.purchaseItem.findMany({
        where: { status: "WEIGHED" },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          purchase: { include: { farmer: true, lane: true } },
          customer: true,
        },
      }),
    ])

  return {
    todayWeighed,
    awaitingWeigh,
    todayGrossWeight: Number(todayAgg._sum.grossWeight ?? 0),
    todayNetWeight: Number(todayAgg._sum.netWeight ?? 0),
    todaySubtotal: Number(todayAgg._sum.subtotal ?? 0),
    recentWeighed: recentWeighed.map((i) => ({
      id: i.id,
      labelCode: i.labelCode,
      grade: i.grade,
      status: i.status,
      farmerName: i.purchase.farmer.name,
      customerName: i.customer?.name ?? null,
      laneCode: i.purchase.lane?.code ?? null,
      netWeight: i.netWeight,
      subtotal: Number(i.subtotal ?? 0),
      createdAt: i.createdAt,
    })),
  }
}

// ─── FINANCE ─────────────────────────────────────────

export interface FinanceDashboard {
  awaitingReview: number
  debtTotal: number
  debtPaid: number
  debtRemaining: number
  loanOutstanding: number
  loanActiveCount: number
  recentPayments: RecentPayment[]
}

export async function getFinanceDashboard(): Promise<FinanceDashboard> {
  await requireRoles("FINANCE", "ADMIN")

  const [debt, loans, awaitingReview, payments] = await Promise.all([
    getDebtSummary(),
    getLoansData(),
    prisma.purchase.count({ where: { status: "WEIGHED" } }),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { purchase: { include: { farmer: true } } },
    }),
  ])

  const debtTotal = debt.reduce((s, f) => s + f.totalTagihan, 0)
  const debtPaid = debt.reduce((s, f) => s + f.totalDibayar, 0)
  const debtRemaining = debt.reduce((s, f) => s + f.sisa, 0)
  const loanOutstanding = loans.reduce((s, l) => s + l.balance, 0)
  const loanActiveCount = loans.filter((l) => l.status === "ACTIVE").length

  return {
    awaitingReview,
    debtTotal: roundMoney(debtTotal),
    debtPaid: roundMoney(debtPaid),
    debtRemaining: roundMoney(debtRemaining),
    loanOutstanding: roundMoney(loanOutstanding),
    loanActiveCount,
    recentPayments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt,
      transactionCode: p.purchase.transactionCode,
      farmerName: p.purchase.farmer.name,
    })),
  }
}

// ─── OWNER ───────────────────────────────────────────

export interface StatusCount {
  status: string
  count: number
}

export interface TrendRow {
  label: string
  transactionCount: number
  totalBales: number
  totalNetWeight: number
  totalPrice: number
  totalPaid: number
}

export interface WarehouseSummary {
  code: string
  name: string
  transactionCount: number
  totalNetWeight: number
  totalPrice: number
}

export interface OwnerRecentTransaction {
  id: number
  transactionCode: string
  transactionDate: Date
  farmerName: string
  laneCode: string | null
  totalBales: number
  totalPrice: number
  paidAmount: number
  remaining: number
  status: string
}

export interface OwnerDashboard {
  totalTransactions: number
  totalBales: number
  totalGrossWeight: number
  totalNetWeight: number
  totalPrice: number
  totalPaid: number
  totalRemaining: number
  byStatus: StatusCount[]
  debtRemaining: number
  loanOutstanding: number
  trend: TrendRow[]
  byWarehouse: WarehouseSummary[]
  recentTransactions: OwnerRecentTransaction[]
}

export async function getOwnerDashboard(): Promise<OwnerDashboard> {
  await requireRoles("OWNER", "ADMIN", "FINANCE")

  const from = new Date()
  from.setDate(from.getDate() - 6)

  const [txAgg, byStatusAgg, baleCount, trend, debt, loans, whAgg, warehouses, recentTx] =
    await Promise.all([
      prisma.purchase.aggregate({
        _count: { _all: true },
        _sum: { totalGrossWeight: true, totalNetWeight: true, totalPrice: true, paidAmount: true },
      }),
      prisma.purchase.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.purchaseItem.count(),
      getPeriodSummary({ from: toDateKey(from) }),
      getDebtSummary(),
      getLoansData(),
      prisma.purchase.groupBy({
        by: ["warehouseId"],
        _count: { _all: true },
        _sum: { totalNetWeight: true, totalPrice: true },
      }),
      prisma.warehouse.findMany({ select: { id: true, code: true, name: true } }),
      prisma.purchase.findMany({
        orderBy: { transactionDate: "desc" },
        take: 8,
        include: { farmer: true, lane: true, _count: { select: { items: true } } },
      }),
    ])

  const totalPrice = Number(txAgg._sum.totalPrice ?? 0)
  const totalPaid = Number(txAgg._sum.paidAmount ?? 0)
  const totalRemaining = roundMoney(totalPrice - totalPaid)
  const debtRemaining = debt.reduce((s, f) => s + f.sisa, 0)
  const loanOutstanding = loans.reduce((s, l) => s + l.balance, 0)

  const statusOrder: ("DRAFT" | "WEIGHED" | "APPROVED" | "PAID")[] = [
    "DRAFT",
    "WEIGHED",
    "APPROVED",
    "PAID",
  ]
  const statusMap = new Map(byStatusAgg.map((s) => [s.status, s._count._all]))
  const byStatus: StatusCount[] = statusOrder.map((status) => ({
    status,
    count: statusMap.get(status) ?? 0,
  }))

  const days: { label: string; date: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({
      label: new Intl.DateTimeFormat("id-ID", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      }).format(d),
      date: toDateKey(d),
    })
  }
  const trendMap = new Map(trend.map((r) => [r.date, r]))
  const trendRows: TrendRow[] = days.map((d) => {
    const t = trendMap.get(d.date)
    return {
      label: d.label,
      transactionCount: t?.transactionCount ?? 0,
      totalBales: t?.totalBales ?? 0,
      totalNetWeight: roundMoney(t?.totalNetWeight ?? 0),
      totalPrice: roundMoney(t?.totalPrice ?? 0),
      totalPaid: roundMoney(t?.totalPaid ?? 0),
    }
  })

  const whMap = new Map(warehouses.map((w) => [w.id, w]))
  const byWarehouse: WarehouseSummary[] = whAgg.map((g) => ({
    code: whMap.get(g.warehouseId!)?.code ?? `#${g.warehouseId}`,
    name: whMap.get(g.warehouseId!)?.name ?? "Gudang",
    transactionCount: g._count._all,
    totalNetWeight: roundMoney(Number(g._sum.totalNetWeight ?? 0)),
    totalPrice: roundMoney(Number(g._sum.totalPrice ?? 0)),
  }))

  return {
    totalTransactions: txAgg._count._all,
    totalBales: baleCount,
    totalGrossWeight: roundMoney(Number(txAgg._sum.totalGrossWeight ?? 0)),
    totalNetWeight: roundMoney(Number(txAgg._sum.totalNetWeight ?? 0)),
    totalPrice: roundMoney(totalPrice),
    totalPaid: roundMoney(totalPaid),
    totalRemaining,
    byStatus,
    debtRemaining: roundMoney(debtRemaining),
    loanOutstanding: roundMoney(loanOutstanding),
    trend: trendRows,
    byWarehouse,
    recentTransactions: recentTx.map((p) => ({
      id: p.id,
      transactionCode: p.transactionCode,
      transactionDate: p.transactionDate,
      farmerName: p.farmer.name,
      laneCode: p.lane?.code ?? null,
      totalBales: p._count.items,
      totalPrice: Number(p.totalPrice),
      paidAmount: Number(p.paidAmount),
      remaining: roundMoney(Number(p.totalPrice) - Number(p.paidAmount)),
      status: p.status,
    })),
  }
}

// ─── ADMIN ───────────────────────────────────────────

export interface AdminDashboard {
  today: {
    graded: number
    draftTransactions: number
    weighed: number
    awaitingWeigh: number
    todaySubtotal: number
  }
  finance: {
    totalTransactions: number
    totalPaid: number
    totalRemaining: number
    awaitingReview: number
    debtRemaining: number
    loanOutstanding: number
  }
  recentBales: RecentBale[]
  recentPayments: RecentPayment[]
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  await requireRoles("ADMIN")
  const start = todayStart()

  const [gradedToday, draftTx, weighedToday, awaitingWeigh, subtotalAgg, txAgg, awaitingReview, debt, loans, recentItems, payments] =
    await Promise.all([
      prisma.purchaseItem.count({ where: { createdAt: { gte: start } } }),
      prisma.purchase.count({
        where: { status: "DRAFT", transactionDate: { gte: start } },
      }),
      prisma.purchaseItem.count({
        where: { status: "WEIGHED", createdAt: { gte: start } },
      }),
      prisma.purchaseItem.count({ where: { status: "GRADED" } }),
      prisma.purchaseItem.aggregate({
        where: { status: "WEIGHED", createdAt: { gte: start } },
        _sum: { subtotal: true },
      }),
      prisma.purchase.aggregate({
        _count: { _all: true },
        _sum: { totalPrice: true, paidAmount: true },
      }),
      prisma.purchase.count({ where: { status: "WEIGHED" } }),
      getDebtSummary(),
      getLoansData(),
      prisma.purchaseItem.findMany({
        where: { createdAt: { gte: start } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          purchase: { include: { farmer: true, lane: true } },
          customer: true,
        },
      }),
      prisma.payment.findMany({
        orderBy: { paidAt: "desc" },
        take: 8,
        include: { purchase: { include: { farmer: true } } },
      }),
    ])

  const totalPrice = Number(txAgg._sum.totalPrice ?? 0)
  const totalPaid = Number(txAgg._sum.paidAmount ?? 0)
  const debtRemaining = debt.reduce((s, f) => s + f.sisa, 0)
  const loanOutstanding = loans.reduce((s, l) => s + l.balance, 0)

  return {
    today: {
      graded: gradedToday,
      draftTransactions: draftTx,
      weighed: weighedToday,
      awaitingWeigh,
      todaySubtotal: roundMoney(Number(subtotalAgg._sum.subtotal ?? 0)),
    },
    finance: {
      totalTransactions: txAgg._count._all,
      totalPaid: roundMoney(totalPaid),
      totalRemaining: roundMoney(totalPrice - totalPaid),
      awaitingReview,
      debtRemaining: roundMoney(debtRemaining),
      loanOutstanding: roundMoney(loanOutstanding),
    },
    recentBales: recentItems.map((i) => ({
      id: i.id,
      labelCode: i.labelCode,
      grade: i.grade,
      status: i.status,
      farmerName: i.purchase.farmer.name,
      customerName: i.customer?.name ?? null,
      laneCode: i.purchase.lane?.code ?? null,
      netWeight: i.netWeight,
      subtotal: Number(i.subtotal ?? 0),
      createdAt: i.createdAt,
    })),
    recentPayments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt,
      transactionCode: p.purchase.transactionCode,
      farmerName: p.purchase.farmer.name,
    })),
  }
}
