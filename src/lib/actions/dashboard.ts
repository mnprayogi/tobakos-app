"use server"

import { prisma } from "@/lib/db"
import { roundMoney } from "@/lib/calculations"
import { requireRoles } from "@/lib/roles"
import { resolveWarehouseScope } from "@/lib/actions/scope"
import { getDebtSummary } from "@/lib/actions/finance"
import { getLoansData } from "@/lib/actions/loans"
import { toDateKey } from "@/lib/utils"
import { dashboardRangeFrom, dashboardRangeTrendDays } from "@/lib/dashboard-range"
import type { DashboardRange } from "@/lib/dashboard-range"

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function yesterdayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - 1)
  return d
}

// Window tanggal untuk periode sebelumnya (sama panjang dgn range aktif),
// untuk perbandingan delta pada section Keuangan.
function prevRange(range: DashboardRange): { from: Date | null; to: Date } | null {
  if (range === "all") return null
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)
  if (range === "today") {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    from.setDate(from.getDate() - 1)
    return { from, to }
  }
  const days = range === "7d" ? 7 : 30
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - days)
  const end = new Date(from)
  end.setDate(end.getDate() + days - 1)
  end.setHours(23, 59, 59, 999)
  return { from, to: end }
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
  recipientAccount?: string | null
  bankAccount?: { bankName: string; accountNumber: string } | null
}

export interface StatusCount {
  status: string
  count: number
}

export interface WarehouseOption {
  id: number
  code: string
  name: string
}

export interface GradeBreakdown {
  grade: string
  baleCount: number
  netWeight: number
  subtotal: number
  netWeightPercent: number
}

// Breakdown per grade dari bale lunas (PurchaseItem status CLOSED),
// mengikuti filter rentang tanggal yang sama dengan panel, serta scope gudang.
async function getClosedGradeBreakdown(
  txDateFilter: { gte: Date } | undefined,
  warehouseId?: number
): Promise<GradeBreakdown[]> {
  const rows = await prisma.purchaseItem.groupBy({
    by: ["grade"],
    where: {
      status: "CLOSED",
      purchase: {
        transactionDate: txDateFilter ?? undefined,
        status: { not: "VOIDED" },
        ...(warehouseId != null ? { warehouseId } : {}),
      },
    },
    _count: { _all: true },
    _sum: { netWeight: true, subtotal: true },
  })

  const totalNetWeight = rows.reduce((s, r) => s + Number(r._sum.netWeight ?? 0), 0)

  return rows
    .map((r) => {
      const netWeight = Number(r._sum.netWeight ?? 0)
      return {
        grade: r.grade,
        baleCount: r._count._all,
        netWeight: roundMoney(netWeight),
        subtotal: roundMoney(Number(r._sum.subtotal ?? 0)),
        netWeightPercent: totalNetWeight > 0 ? (netWeight / totalNetWeight) * 100 : 0,
      }
    })
    .sort((a, b) => b.netWeight - a.netWeight)
}

// Komposisi per grade; ADMIN di-scope otomatis ke gudang miliknya,
// OWNER/SUPER_ADMIN bebas memilih gudang (warehouseId) atau semua.
export async function getGradeComposition(
  range: DashboardRange = "all",
  warehouseId?: number
): Promise<GradeBreakdown[]> {
  await requireRoles("ADMIN", "OWNER", "SUPER_ADMIN")
  const scope = await resolveWarehouseScope()
  const effectiveWh = scope.mode === "scoped" ? scope.warehouseId : warehouseId
  const from = dashboardRangeFrom(range)
  const txDateFilter = from ? { gte: from } : undefined
  return getClosedGradeBreakdown(txDateFilter, effectiveWh)
}

export interface TrendRow {
  label: string
  title: string
  transactionCount: number
  totalBales: number
  totalNetWeight: number
  totalPrice: number
  totalPaid: number
}

// ─── Tren N hari terakhir (dipakai semua role) ──────

async function getTrend(days: number): Promise<TrendRow[]> {
  const from = new Date()
  from.setHours(0, 0, 0, 0)
  from.setDate(from.getDate() - (days - 1))

  const purchases = await prisma.purchase.findMany({
    where: { transactionDate: { gte: from }, status: { not: "VOIDED" } },
    select: {
      transactionDate: true,
      totalNetWeight: true,
      totalPrice: true,
      paidAmount: true,
      _count: { select: { items: true } },
    },
  })

  const arr: { label: string; title: string; date: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const fmt = (opts: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("id-ID", opts).format(d)
    arr.push({
      label: fmt({ day: "2-digit", month: "2-digit" }),
      title: fmt({ weekday: "short", day: "2-digit", month: "2-digit" }),
      date: toDateKey(d),
    })
  }

  const map = new Map<string, Omit<TrendRow, "label" | "title">>()
  for (const p of purchases) {
    const key = toDateKey(new Date(p.transactionDate))
    const totalPrice = Number(p.totalPrice)
    const paid = Number(p.paidAmount)
    const existing = map.get(key)
    if (existing) {
      existing.transactionCount += 1
      existing.totalBales += p._count.items
      existing.totalNetWeight = roundMoney(existing.totalNetWeight + Number(p.totalNetWeight))
      existing.totalPrice = roundMoney(existing.totalPrice + totalPrice)
      existing.totalPaid = roundMoney(existing.totalPaid + paid)
    } else {
      map.set(key, {
        transactionCount: 1,
        totalBales: p._count.items,
        totalNetWeight: roundMoney(Number(p.totalNetWeight)),
        totalPrice: roundMoney(totalPrice),
        totalPaid: roundMoney(paid),
      })
    }
  }

  return arr.map((d) => {
    const t = map.get(d.date)
    return {
      label: d.label,
      title: d.title,
      transactionCount: t?.transactionCount ?? 0,
      totalBales: t?.totalBales ?? 0,
      totalNetWeight: roundMoney(t?.totalNetWeight ?? 0),
      totalPrice: roundMoney(t?.totalPrice ?? 0),
      totalPaid: roundMoney(t?.totalPaid ?? 0),
    }
  })
}

// ─── GRADER ──────────────────────────────────────────

export interface GraderDashboard {
  todayGraded: number
  yesterdayGraded: number
  todayDraftTransactions: number
  yesterdayDraftTransactions: number
  todayActiveFarmers: number
  yesterdayActiveFarmers: number
  awaitingWeigh: number
  trend: TrendRow[]
  recentBales: RecentBale[]
}

export async function getGraderDashboard(): Promise<GraderDashboard> {
  await requireRoles("GRADER", "ADMIN")
  const start = todayStart()
  const yStart = yesterdayStart()

  const [
    createdToday,
    createdYesterday,
    draftTxToday,
    draftTxYesterday,
    farmersToday,
    farmersYesterday,
    awaitingWeigh,
    trend,
    recentItems,
  ] = await Promise.all([
    prisma.purchaseItem.count({ where: { createdAt: { gte: start }, purchase: { status: { not: "VOIDED" } } } }),
    prisma.purchaseItem.count({ where: { createdAt: { gte: yStart, lt: start }, purchase: { status: { not: "VOIDED" } } } }),
    prisma.purchase.count({ where: { status: "DRAFT", transactionDate: { gte: start } } }),
    prisma.purchase.count({ where: { status: "DRAFT", transactionDate: { gte: yStart, lt: start } } }),
    prisma.purchase.groupBy({ by: ["farmerId"], where: { transactionDate: { gte: start }, status: { not: "VOIDED" } } }),
    prisma.purchase.groupBy({ by: ["farmerId"], where: { transactionDate: { gte: yStart, lt: start }, status: { not: "VOIDED" } } }),
    prisma.purchaseItem.count({ where: { status: "GRADED", purchase: { status: { not: "VOIDED" } } } }),
    getTrend(7),
    prisma.purchaseItem.findMany({
      where: { createdAt: { gte: start }, purchase: { status: { not: "VOIDED" } } },
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
    yesterdayGraded: createdYesterday,
    todayDraftTransactions: draftTxToday,
    yesterdayDraftTransactions: draftTxYesterday,
    todayActiveFarmers: farmersToday.length,
    yesterdayActiveFarmers: farmersYesterday.length,
    awaitingWeigh,
    trend,
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
  yesterdayWeighed: number
  todayGrossWeight: number
  todayNetWeight: number
  yesterdayNetWeight: number
  todaySubtotal: number
  yesterdaySubtotal: number
  awaitingWeigh: number
  trend: TrendRow[]
  recentWeighed: RecentBale[]
}

export async function getOperatorDashboard(): Promise<OperatorDashboard> {
  await requireRoles("OPERATOR", "ADMIN")
  const start = todayStart()
  const yStart = yesterdayStart()

  const [todayWeighed, yesterdayWeighed, awaitingWeigh, todayAgg, yesterdayAgg, trend, recentWeighed] =
    await Promise.all([
      prisma.purchaseItem.count({ where: { status: "WEIGHED", createdAt: { gte: start }, purchase: { status: { not: "VOIDED" } } } }),
      prisma.purchaseItem.count({ where: { status: "WEIGHED", createdAt: { gte: yStart, lt: start }, purchase: { status: { not: "VOIDED" } } } }),
      prisma.purchaseItem.count({ where: { status: "GRADED", purchase: { status: { not: "VOIDED" } } } }),
      prisma.purchaseItem.aggregate({
        where: { status: "WEIGHED", createdAt: { gte: start }, purchase: { status: { not: "VOIDED" } } },
        _sum: { grossWeight: true, netWeight: true, subtotal: true },
      }),
      prisma.purchaseItem.aggregate({
        where: { status: "WEIGHED", createdAt: { gte: yStart, lt: start }, purchase: { status: { not: "VOIDED" } } },
        _sum: { grossWeight: true, netWeight: true, subtotal: true },
      }),
      getTrend(7),
      prisma.purchaseItem.findMany({
        where: { status: "WEIGHED", purchase: { status: { not: "VOIDED" } } },
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
    yesterdayWeighed,
    todayGrossWeight: Number(todayAgg._sum.grossWeight ?? 0),
    todayNetWeight: Number(todayAgg._sum.netWeight ?? 0),
    yesterdayNetWeight: Number(yesterdayAgg._sum.netWeight ?? 0),
    todaySubtotal: Number(todayAgg._sum.subtotal ?? 0),
    yesterdaySubtotal: Number(yesterdayAgg._sum.subtotal ?? 0),
    awaitingWeigh,
    trend,
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
  omzet: number
  totalReceived: number
  debtRemaining: number
  loanOutstanding: number
  loanActiveCount: number
  todayPayments: number
  yesterdayPayments: number
  todayPaymentAmount: number
  yesterdayPaymentAmount: number
  trend: TrendRow[]
  recentPayments: RecentPayment[]
}

export async function getFinanceDashboard(): Promise<FinanceDashboard> {
  await requireRoles("FINANCE", "ADMIN")
  const start = todayStart()
  const yStart = yesterdayStart()

  const [debt, loans, awaitingReview, payments, todayPayAgg, yesterdayPayAgg, txAgg, trend] =
    await Promise.all([
      getDebtSummary(),
      getLoansData(),
      prisma.purchase.count({ where: { status: "WEIGHED" } }),
      prisma.payment.findMany({
        where: { voidedAt: null, purchase: { status: { not: "VOIDED" } } },
        orderBy: { paidAt: "desc" },
        take: 10,
        include: { purchase: { include: { farmer: true } }, bankAccount: true },
      }),
      prisma.payment.aggregate({
        where: { paidAt: { gte: start }, voidedAt: null, purchase: { status: { not: "VOIDED" } } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { paidAt: { gte: yStart, lt: start }, voidedAt: null, purchase: { status: { not: "VOIDED" } } },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.purchase.aggregate({
        where: { status: { not: "VOIDED" } },
        _sum: { totalPrice: true, paidAmount: true },
      }),
      getTrend(7),
    ])

  const debtRemaining = debt.reduce((s, f) => s + f.sisa, 0)
  const loanOutstanding = loans.reduce((s, l) => s + l.balance, 0)
  const loanActiveCount = loans.filter((l) => l.status === "ACTIVE").length

  return {
    awaitingReview,
    omzet: roundMoney(Number(txAgg._sum.totalPrice ?? 0)),
    totalReceived: roundMoney(Number(txAgg._sum.paidAmount ?? 0)),
    debtRemaining: roundMoney(debtRemaining),
    loanOutstanding: roundMoney(loanOutstanding),
    loanActiveCount,
    todayPayments: todayPayAgg._count._all,
    yesterdayPayments: yesterdayPayAgg._count._all,
    todayPaymentAmount: roundMoney(Number(todayPayAgg._sum.amount ?? 0)),
    yesterdayPaymentAmount: roundMoney(Number(yesterdayPayAgg._sum.amount ?? 0)),
    trend,
    recentPayments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      paidAt: p.paidAt,
      transactionCode: p.purchase.transactionCode,
      farmerName: p.purchase.farmer.name,
      recipientAccount: p.recipientAccount,
      bankAccount: p.bankAccount
        ? { bankName: p.bankAccount.bankName, accountNumber: p.bankAccount.accountNumber }
        : null,
    })),
  }
}

// ─── OWNER ───────────────────────────────────────────

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
  debtRemaining: number
  loanOutstanding: number
  trend: TrendRow[]
  byWarehouse: WarehouseSummary[]
  warehouses: WarehouseOption[]
  byStatus: StatusCount[]
  closedByGrade: GradeBreakdown[]
  recentTransactions: OwnerRecentTransaction[]
}

export async function getOwnerDashboard(range: DashboardRange = "all"): Promise<OwnerDashboard> {
  await requireRoles("OWNER", "ADMIN", "FINANCE")

  const from = dashboardRangeFrom(range)
  const txDateFilter = from ? { gte: from } : undefined

  const [txAgg, byStatusAgg, baleCount, trend, debt, loans, whAgg, warehouses, recentTx, closedByGrade] =
    await Promise.all([
      prisma.purchase.aggregate({
        where: { transactionDate: txDateFilter, status: { not: "VOIDED" } },
        _count: { _all: true },
        _sum: { totalGrossWeight: true, totalNetWeight: true, totalPrice: true, paidAmount: true },
      }),
      prisma.purchase.groupBy({
        by: ["status"],
        where: { transactionDate: txDateFilter, status: { not: "VOIDED" } },
        _count: { _all: true },
      }),
      prisma.purchaseItem.count({
        where: { purchase: { transactionDate: txDateFilter, status: { not: "VOIDED" } } },
      }),
      getTrend(dashboardRangeTrendDays(range)),
      getDebtSummary(),
      getLoansData(),
      prisma.purchase.groupBy({
        by: ["warehouseId"],
        where: { transactionDate: txDateFilter, status: { not: "VOIDED" } },
        _count: { _all: true },
        _sum: { totalNetWeight: true, totalPrice: true },
      }),
      prisma.warehouse.findMany({ select: { id: true, code: true, name: true } }),
      prisma.purchase.findMany({
        where: { transactionDate: txDateFilter, status: { not: "VOIDED" } },
        orderBy: { transactionDate: "desc" },
        take: 8,
        include: { farmer: true, lane: true, _count: { select: { items: true } } },
      }),
      getClosedGradeBreakdown(txDateFilter),
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
    trend,
    byWarehouse,
    warehouses: warehouses.map((w) => ({ id: w.id, code: w.code, name: w.name })),
    closedByGrade,
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
    yesterdayGraded: number
    draftTransactions: number
    yesterdayDraftTransactions: number
    weighed: number
    yesterdayWeighed: number
    awaitingWeigh: number
    todaySubtotal: number
    yesterdaySubtotal: number
  }
  finance: {
    totalTransactions: number
    totalPrice: number
    totalPaid: number
    totalRemaining: number
    awaitingReview: number
    debtRemaining: number
    loanOutstanding: number
    totalPricePrev: number | null
    totalPaidPrev: number | null
  }
  pendingReview: {
    id: number
    transactionCode: string
    farmerName: string
    totalPrice: number
  }[]
  byStatus: StatusCount[]
  trend: TrendRow[]
  recentBales: RecentBale[]
  recentPayments: RecentPayment[]
  closedByGrade: GradeBreakdown[]
}

export async function getAdminDashboard(range: DashboardRange = "all"): Promise<AdminDashboard> {
  await requireRoles("ADMIN")
  const scope = await resolveWarehouseScope()
  const scopeWarehouseId = scope.mode === "scoped" ? scope.warehouseId : undefined
  const start = todayStart()
  const yStart = yesterdayStart()

  const from = dashboardRangeFrom(range)
  const txDateFilter = from ? { gte: from } : undefined

  const prevWindow = prevRange(range)

  const [
    gradedToday,
    gradedYesterday,
    draftTxToday,
    draftTxYesterday,
    weighedToday,
    weighedYesterday,
    awaitingWeigh,
    subtotalToday,
    subtotalYesterday,
    txAgg,
    prevAgg,
    pendingReview,
    awaitingReview,
    debt,
    loans,
    byStatusAgg,
    trend,
    recentItems,
    payments,
    closedByGrade,
  ] = await Promise.all([
    prisma.purchaseItem.count({ where: { createdAt: { gte: start }, purchase: { status: { not: "VOIDED" } } } }),
    prisma.purchaseItem.count({ where: { createdAt: { gte: yStart, lt: start }, purchase: { status: { not: "VOIDED" } } } }),
    prisma.purchase.count({ where: { status: "DRAFT", transactionDate: { gte: start } } }),
    prisma.purchase.count({ where: { status: "DRAFT", transactionDate: { gte: yStart, lt: start } } }),
    prisma.purchaseItem.count({ where: { status: "WEIGHED", createdAt: { gte: start }, purchase: { status: { not: "VOIDED" } } } }),
    prisma.purchaseItem.count({ where: { status: "WEIGHED", createdAt: { gte: yStart, lt: start }, purchase: { status: { not: "VOIDED" } } } }),
    prisma.purchaseItem.count({ where: { status: "GRADED", purchase: { status: { not: "VOIDED" } } } }),
    prisma.purchaseItem.aggregate({
      where: { status: "WEIGHED", createdAt: { gte: start }, purchase: { status: { not: "VOIDED" } } },
      _sum: { subtotal: true },
    }),
    prisma.purchaseItem.aggregate({
      where: { status: "WEIGHED", createdAt: { gte: yStart, lt: start }, purchase: { status: { not: "VOIDED" } } },
      _sum: { subtotal: true },
    }),
    prisma.purchase.aggregate({
      where: { transactionDate: txDateFilter, status: { not: "VOIDED" } },
      _count: { _all: true },
      _sum: { totalPrice: true, paidAmount: true },
    }),
    prevWindow
      ? prisma.purchase.aggregate({
          where: {
            transactionDate: { gte: prevWindow.from!, lte: prevWindow.to },
            status: { not: "VOIDED" },
          },
          _sum: { totalPrice: true, paidAmount: true },
        })
      : null,
    prisma.purchase.findMany({
      where: { status: "WEIGHED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        transactionCode: true,
        totalPrice: true,
        farmer: { select: { name: true } },
      },
    }),
    prisma.purchase.count({ where: { status: "WEIGHED" } }),
    getDebtSummary(),
    getLoansData(),
    prisma.purchase.groupBy({
      by: ["status"],
      where: { transactionDate: txDateFilter, status: { not: "VOIDED" } },
      _count: { _all: true },
    }),
    getTrend(dashboardRangeTrendDays(range)),
    prisma.purchaseItem.findMany({
      where: { purchase: { transactionDate: txDateFilter, status: { not: "VOIDED" } } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        purchase: { include: { farmer: true, lane: true } },
        customer: true,
      },
    }),
    prisma.payment.findMany({
      where: { voidedAt: null, purchase: { transactionDate: txDateFilter, status: { not: "VOIDED" } } },
      orderBy: { paidAt: "desc" },
      take: 8,
      include: { purchase: { include: { farmer: true } }, bankAccount: true },
    }),
    getClosedGradeBreakdown(txDateFilter, scopeWarehouseId),
  ])

  const totalPrice = Number(txAgg._sum.totalPrice ?? 0)
  const totalPaid = Number(txAgg._sum.paidAmount ?? 0)
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

  return {
    today: {
      graded: gradedToday,
      yesterdayGraded: gradedYesterday,
      draftTransactions: draftTxToday,
      yesterdayDraftTransactions: draftTxYesterday,
      weighed: weighedToday,
      yesterdayWeighed: weighedYesterday,
      awaitingWeigh,
      todaySubtotal: roundMoney(Number(subtotalToday._sum.subtotal ?? 0)),
      yesterdaySubtotal: roundMoney(Number(subtotalYesterday._sum.subtotal ?? 0)),
    },
    finance: {
      totalTransactions: txAgg._count._all,
      totalPrice: roundMoney(totalPrice),
      totalPaid: roundMoney(totalPaid),
      totalRemaining: roundMoney(totalPrice - totalPaid),
      awaitingReview,
      debtRemaining: roundMoney(debtRemaining),
      loanOutstanding: roundMoney(loanOutstanding),
      totalPricePrev: prevAgg ? roundMoney(Number(prevAgg._sum.totalPrice ?? 0)) : null,
      totalPaidPrev: prevAgg ? roundMoney(Number(prevAgg._sum.paidAmount ?? 0)) : null,
    },
    pendingReview: pendingReview.map((p) => ({
      id: p.id,
      transactionCode: p.transactionCode,
      farmerName: p.farmer.name,
      totalPrice: roundMoney(Number(p.totalPrice)),
    })),
    byStatus,
    trend,
    closedByGrade,
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
      recipientAccount: p.recipientAccount,
      bankAccount: p.bankAccount
        ? { bankName: p.bankAccount.bankName, accountNumber: p.bankAccount.accountNumber }
        : null,
    })),
  }
}
