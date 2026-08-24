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
  subtotal: number
  status: string
  purchaseStatus: string
}

export interface CustomerPortalData {
  customerName: string
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

export async function getCustomerPortalData(): Promise<CustomerPortalData> {
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

  const [customer, allAgg, todayAgg, awaitingWeigh, items] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: user.customerId },
      select: { name: true },
    }),
    prisma.purchaseItem.aggregate({
      where: { customerId: user.customerId },
      _count: { _all: true },
      _sum: { netWeight: true, subtotal: true },
    }),
    prisma.purchaseItem.aggregate({
      where: { customerId: user.customerId, createdAt: { gte: start } },
      _count: { _all: true },
      _sum: { subtotal: true },
    }),
    prisma.purchaseItem.count({
      where: { customerId: user.customerId, status: "GRADED" },
    }),
    prisma.purchaseItem.findMany({
      where: { customerId: user.customerId },
      orderBy: { createdAt: "desc" },
      take: 200,
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
      subtotal: Number(i.subtotal ?? 0),
      status: i.status,
      purchaseStatus: i.purchase.status,
    })),
  }
}
