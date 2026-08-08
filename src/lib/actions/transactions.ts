"use server"

import { prisma } from "@/lib/db"
import { requireRoles } from "@/lib/roles"
import { resolveWarehouseScope } from "@/lib/actions/scope"

export interface TxnExportRow {
  transactionCode: string
  farmerName: string
  farmerNik: string | null
  transactionDate: Date
  warehouseCode: string | null
  laneCode: string | null
  totalItems: number
  totalNetWeight: number
  totalPrice: number
  originalTotalPrice: number | null
  paidAmount: number
  remaining: number
  status: string
  derived: string
  createdBy: string | null
  weighedBy: string | null
  approvedBy: string | null
  paidBy: string | null
}

export async function getTransactionsExport(q: string, status: string): Promise<TxnExportRow[]> {
  await requireRoles("ADMIN", "FINANCE")

  const scope = await resolveWarehouseScope()
  const warehouseWhere = scope.mode === "scoped" ? { warehouseId: scope.warehouseId } : {}

  const query = (q ?? "").trim()
  const statusValues = ["DRAFT", "WEIGHED", "APPROVED", "PAID"] as const
  type TxnStatus = (typeof statusValues)[number]
  const statusFilter = (statusValues as readonly string[]).includes(status) ? (status as TxnStatus) : "ALL"

  const where: Record<string, unknown> = {
    ...warehouseWhere,
    ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
    ...(query
      ? {
          OR: [
            { transactionCode: { contains: query } },
            { farmer: { name: { contains: query } } },
            { farmer: { nik: { contains: query } } },
          ],
        }
      : {}),
  }

  const rows = await prisma.purchase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { farmer: true, warehouse: true, lane: true },
  })

  return rows.map((p) => {
    const totalPrice = Number(p.totalPrice)
    const paidAmount = Number(p.paidAmount)
    const remaining = Math.round((totalPrice - paidAmount) * 100) / 100
    let derived = ""
    if (p.status === "APPROVED") {
      if (remaining <= 0.005) derived = "Lunas"
      else if (paidAmount <= 0.005) derived = "Hutang"
      else derived = "Sebagian (DP)"
    }
    return {
      transactionCode: p.transactionCode,
      farmerName: p.farmer.name,
      farmerNik: p.farmer.nik,
      transactionDate: p.transactionDate,
      warehouseCode: p.warehouse?.code ?? null,
      laneCode: p.lane?.code ?? null,
      totalItems: p.totalItems,
      totalNetWeight: p.totalNetWeight,
      totalPrice,
      originalTotalPrice: p.originalTotalPrice != null ? Number(p.originalTotalPrice) : null,
      paidAmount,
      remaining,
      status: p.status,
      derived,
      createdBy: p.createdBy,
      weighedBy: p.weighedBy,
      approvedBy: p.approvedBy,
      paidBy: p.paidBy,
    }
  })
}
