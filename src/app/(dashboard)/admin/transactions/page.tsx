import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canAccess } from "@/lib/roles"
import { roundMoney } from "@/lib/calculations"
import { resolveWarehouseScope, type WarehouseScope } from "@/lib/actions/scope"
import { TransactionsClient } from "./client"

const STATUS_VALUES = ["DRAFT", "WEIGHED", "APPROVED", "PAID"] as const
type TxnStatus = (typeof STATUS_VALUES)[number]

interface TransactionsSearchParams {
  q?: string
  status?: string
  page?: string
  pageSize?: string
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<TransactionsSearchParams>
}) {
  if (!(await canAccess(["ADMIN", "FINANCE"]))) redirect("/")

  const session = await auth()
  const role = session?.user?.role ?? ""

  let scope: WarehouseScope
  try {
    scope = await resolveWarehouseScope()
  } catch (err) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-bold text-foreground">Transaksi</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(err as Error).message}</p>
      </div>
    )
  }

  const sp = searchParams ? await searchParams : {}
  const q = (sp.q ?? "").trim()
  const status = (STATUS_VALUES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as TxnStatus)
    : "ALL"
  const requestedPage = Math.max(1, Number(sp.page) || 1)
  const pageSize = Math.min(100, Math.max(10, Number(sp.pageSize) || 25))

  const warehouseWhere = scope.mode === "scoped" ? { warehouseId: scope.warehouseId } : {}
  const where = {
    ...warehouseWhere,
    ...(status !== "ALL" ? { status } : {}),
    ...(q
      ? {
          OR: [
            { transactionCode: { contains: q } },
            { farmer: { name: { contains: q } } },
            { farmer: { nik: { contains: q } } },
          ],
        }
      : {}),
  }

  const total = await prisma.purchase.count({ where })
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(requestedPage, totalPages)

  const [raw, statusRows, allStats, closedStats] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        farmer: { select: { name: true } },
        items: {
          select: {
            id: true,
            status: true,
            labelCode: true,
            grade: true,
            netWeight: true,
            pricePerKg: true,
            subtotal: true,
          },
          orderBy: { inputOrder: "asc" },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            note: true,
            paidBy: true,
            paidAt: true,
            loanDeduction: true,
            voidedAt: true,
            voidedBy: true,
          },
          orderBy: { paidAt: "asc" },
        },
      },
    }),
    prisma.purchase.groupBy({
      by: ["status"],
      where: warehouseWhere,
      _count: { _all: true },
    }),
    prisma.purchase.aggregate({
      where: warehouseWhere,
      _count: { _all: true },
    }),
    prisma.purchase.aggregate({
      where: { ...warehouseWhere, status: { in: ["APPROVED", "PAID"] } },
      _sum: { totalPrice: true, paidAmount: true },
    }),
  ])

  const statusCounts: Record<string, number> = { ALL: total }
  for (const row of statusRows) statusCounts[row.status] = row._count._all

  const totalValue = Number(closedStats._sum.totalPrice ?? 0)
  const totalPaid = Number(closedStats._sum.paidAmount ?? 0)
  const totalOutstanding = roundMoney(totalValue - totalPaid)

  const farmerIds = [...new Set(raw.map((p) => p.farmerId))]
  const loans = await prisma.farmerLoan.findMany({
    where: { farmerId: { in: farmerIds }, status: "ACTIVE" },
    include: { entries: { select: { type: true, amount: true, voidedAt: true } } },
  })
  const loanBalanceByFarmer = new Map<number, number>()
  const crossLoanBalanceByFarmer = new Map<number, number>()
  for (const loan of loans) {
    let borrowed = 0
    let repaid = 0
    for (const e of loan.entries) {
      if (e.voidedAt) continue
      if (e.type === "DISBURSEMENT") borrowed += Number(e.amount)
      else repaid += Number(e.amount)
    }
    const balance = Number((borrowed - repaid).toFixed(2))
    if (scope.mode === "scoped" && loan.warehouseId !== scope.warehouseId) {
      crossLoanBalanceByFarmer.set(
        loan.farmerId,
        Number(((crossLoanBalanceByFarmer.get(loan.farmerId) ?? 0) + balance).toFixed(2))
      )
    } else {
      loanBalanceByFarmer.set(loan.farmerId, balance)
    }
  }

  const purchases = raw.map((p) => ({
    id: p.id,
    transactionCode: p.transactionCode,
    farmer: p.farmer,
    transactionDate: p.transactionDate,
    totalItems: p.totalItems,
    totalNetWeight: p.totalNetWeight,
    totalPrice: Number(p.totalPrice),
    paidAmount: Number(p.paidAmount),
    originalTotalPrice: p.originalTotalPrice != null ? Number(p.originalTotalPrice) : null,
    priceReviewNote: p.priceReviewNote,
    status: p.status,
    createdBy: p.createdBy,
    weighedBy: p.weighedBy,
    approvedBy: p.approvedBy,
    paidBy: p.paidBy,
    items: p.items.map((i) => ({
      id: i.id,
      status: i.status,
      labelCode: i.labelCode,
      grade: i.grade,
      netWeight: i.netWeight,
      pricePerKg: Number(i.pricePerKg ?? 0),
      subtotal: Number(i.subtotal ?? 0),
    })),
    payments: p.payments.map((pay) => ({
      id: pay.id,
      amount: Number(pay.amount),
      method: pay.method,
      note: pay.note,
      paidBy: pay.paidBy,
      paidAt: pay.paidAt,
      loanDeduction: Number(pay.loanDeduction ?? 0),
      voidedAt: pay.voidedAt,
      voidedBy: pay.voidedBy,
    })),
    loanBalance: loanBalanceByFarmer.get(p.farmerId) ?? 0,
    crossLoanBalance: crossLoanBalanceByFarmer.get(p.farmerId) ?? 0,
  }))

  return (
    <TransactionsClient
      purchases={purchases}
      total={total}
      page={page}
      pageSize={pageSize}
      q={q}
      status={status}
      statusCounts={statusCounts}
      role={role}
      scope={scope}
      stats={{ totalTransactions: allStats._count._all, totalValue, totalOutstanding }}
    />
  )
}
