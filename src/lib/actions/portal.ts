"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { roundMoney } from "@/lib/calculations"
import { requireRoles } from "@/lib/roles"

export interface PortalBale {
  id: number
  labelCode: string
  transactionCode: string
  transactionDate: Date
  farmerName: string
  tobaccoTypeName: string
  leafTypeName: string
  grade: string
  moisturePercent: number
  grossWeight: number | null
  packingWeight: number
  moistureDeduction: number | null
  netWeight: number | null
  pricePerKg: number | null
  priceAdjustment: number
  subtotal: number
  status: string
  purchaseStatus: string
}

export interface CustomerPortalData {
  customerName: string
  from: string | null
  to: string | null
  totalBales: number
  totalNetWeight: number
  totalSubtotal: number
  todayBales: number
  todaySubtotal: number
  awaitingWeigh: number
  items: PortalBale[]
}

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function parseRange(from?: string, to?: string): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {}
  if (from && ISO_DATE.test(from)) {
    const d = new Date(`${from}T00:00:00`)
    if (!Number.isNaN(d.getTime())) range.gte = d
  }
  if (to && ISO_DATE.test(to)) {
    const d = new Date(`${to}T23:59:59.999`)
    if (!Number.isNaN(d.getTime())) range.lte = d
  }
  return range
}

export async function getCustomerPortalData(opts?: {
  from?: string
  to?: string
  status?: string
}): Promise<CustomerPortalData> {
  await requireRoles("CUSTOMER")

  const session = await auth()
  if (!session?.user?.id) throw new Error("Sesi tidak valid")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { customerId: true },
  })
  if (!user?.customerId) {
    throw new Error("Akun belum ditautkan ke mitra bisnis. Hubungi admin.")
  }

  const start = todayStart()
  const transactionDate = parseRange(opts?.from, opts?.to)
  const hasRange = "gte" in transactionDate || "lte" in transactionDate

  const itemWhere: Record<string, unknown> = {
    customerId: user.customerId,
    purchase: {
      status: { not: "VOIDED" as const },
      ...(hasRange ? { transactionDate } : {}),
    },
  }
  if (opts?.status && ["GRADED", "WEIGHED", "CLOSED"].includes(opts.status)) {
    itemWhere.status = opts.status
  }

  const [customer, allAgg, todayAgg, awaitingWeigh, items] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: user.customerId },
      select: { name: true },
    }),
    prisma.purchaseItem.aggregate({
      where: itemWhere,
      _count: { _all: true },
      _sum: { netWeight: true, subtotal: true },
    }),
    prisma.purchaseItem.aggregate({
      where: { customerId: user.customerId, createdAt: { gte: start }, purchase: { status: { not: "VOIDED" as const } } },
      _count: { _all: true },
      _sum: { subtotal: true },
    }),
    prisma.purchaseItem.count({
      where: { ...itemWhere, status: "GRADED" },
    }),
    prisma.purchaseItem.findMany({
      where: itemWhere,
      orderBy: [{ purchase: { transactionDate: "desc" } }, { inputOrder: "asc" }],
      include: {
        purchase: {
          select: {
            transactionCode: true,
            transactionDate: true,
            status: true,
            farmer: { select: { name: true } },
          },
        },
        tobaccoType: { select: { name: true } },
        leafType: { select: { name: true } },
      },
    }),
  ])

  return {
    customerName: customer?.name ?? "Mitra",
    from: opts?.from ?? null,
    to: opts?.to ?? null,
    totalBales: allAgg._count._all,
    totalNetWeight: roundMoney(Number(allAgg._sum.netWeight ?? 0)),
    totalSubtotal: roundMoney(Number(allAgg._sum.subtotal ?? 0)),
    todayBales: todayAgg._count._all,
    todaySubtotal: roundMoney(Number(todayAgg._sum.subtotal ?? 0)),
    awaitingWeigh,
    items: items.map((i) => ({
      id: i.id,
      labelCode: i.labelCode,
      transactionCode: i.purchase.transactionCode,
      transactionDate: i.purchase.transactionDate,
      farmerName: i.purchase.farmer.name,
      tobaccoTypeName: i.tobaccoType.name,
      leafTypeName: i.leafType.name,
      grade: i.grade,
      moisturePercent: i.moisturePercent,
      grossWeight: i.grossWeight,
      packingWeight: i.packingWeight,
      moistureDeduction: i.moistureDeduction,
      netWeight: i.netWeight,
      pricePerKg: i.pricePerKg != null ? Number(i.pricePerKg) : null,
      priceAdjustment: Number(i.priceAdjustment ?? 0),
      subtotal: Number(i.subtotal ?? 0),
      status: i.status,
      purchaseStatus: i.purchase.status,
    })),
  }
}
