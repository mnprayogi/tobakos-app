"use server"

import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { prisma } from "@/lib/db"
import { generateLabelCode } from "@/lib/barcode"
import { nextSequence } from "@/lib/sequences"
import { getLaneByCode } from "@/lib/actions/lanes"
import { getActorName } from "@/lib/actor"

export async function getTodayDraftFarmerIds(laneId: number): Promise<number[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const purchases = await prisma.purchase.findMany({
    where: { status: "DRAFT", laneId, transactionDate: { gte: todayStart } },
    select: { farmerId: true },
  })
  return purchases.map((p) => p.farmerId)
}

export interface RecentBaleItem {
  id: number
  labelCode: string
  grade: string
  status: string
  tobaccoType: string
  farmerName: string
  farmerId: number
  purchaseId: number
  customerName: string | null
  createdBy: string | null
}

export async function getRecentBales(laneId: number, take = 50): Promise<RecentBaleItem[]> {
  const items = await prisma.purchaseItem.findMany({
    take,
    orderBy: { createdAt: "desc" },
    where: { purchase: { laneId } },
    include: {
      purchase: { include: { farmer: true } },
      tobaccoType: true,
      customer: true,
    },
  })
  return items.map((b) => ({
    id: b.id,
    labelCode: b.labelCode,
    grade: b.grade,
    status: b.status,
    tobaccoType: b.tobaccoType.name,
    farmerName: b.purchase.farmer.name,
    farmerId: b.purchase.farmerId,
    purchaseId: b.purchaseId,
    customerName: b.customer?.name ?? null,
    createdBy: b.createdBy,
  }))
}

export interface TransactionOption {
  id: number
  transactionCode: string
  label: string
  totalItems: number
  warehouseCode: string
  laneCode: string
}

export async function getFarmerTodayTransactions(farmerId: number): Promise<TransactionOption[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const purchases = await prisma.purchase.findMany({
    where: { farmerId, status: "DRAFT", transactionDate: { gte: todayStart } },
    orderBy: { createdAt: "asc" },
    include: {
      warehouse: true,
      lane: true,
      _count: { select: { items: true } },
    },
  })
  return purchases.map((p, idx) => ({
    id: p.id,
    transactionCode: p.transactionCode,
    label: `Transaksi #${idx + 1}`,
    totalItems: p._count.items,
    warehouseCode: p.warehouse?.code ?? "—",
    laneCode: p.lane?.code ?? "—",
  }))
}

export interface LaneTransactionOption {
  id: number
  transactionCode: string
  label: string
  totalItems: number
  status: string
}

export async function getFarmerLaneTodayTransactions(
  farmerId: number,
  laneCode: string
): Promise<LaneTransactionOption[]> {
  const lane = await getLaneByCode(laneCode)
  if (!lane) throw new Error("Jalur tidak ditemukan")

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const purchases = await prisma.purchase.findMany({
    where: {
      farmerId,
      laneId: lane.id,
      transactionDate: { gte: todayStart },
      status: { in: ["DRAFT", "WEIGHED", "APPROVED", "PAID"] },
    },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { items: true } } },
  })

  return purchases.map((p, idx) => ({
    id: p.id,
    transactionCode: p.transactionCode,
    label: `Transaksi #${idx + 1}`,
    totalItems: p._count.items,
    status: p.status,
  }))
}

export async function startNewTransaction(farmerId: number, laneCode: string) {
  const lane = await getLaneByCode(laneCode)
  if (!lane) throw new Error("Jalur tidak ditemukan")

  const txSeq = await nextSequence(lane.code)
  const txDate = format(new Date(), "yyyyMMdd")
  const purchase = await prisma.purchase.create({
    data: {
      transactionCode: `${lane.code}-${txDate}-${String(txSeq).padStart(3, "0")}`,
      farmerId,
      warehouseId: lane.warehouseId,
      laneId: lane.id,
      totalPrice: 0,
      createdBy: await getActorName(),
    },
  })

  revalidatePath("/pos-1/grading")
  return purchase
}

export interface GradeInput {
  farmerId: number
  tobaccoTypeId: number
  leafTypeId: number
  packingTypeId: number
  grade: string
  moisturePercent: number
  packingWeight: number
  laneCode: string
  purchaseId?: number | null
  customerId: number
}

export async function saveGrade(data: GradeInput) {
  const lane = await getLaneByCode(data.laneCode)
  if (!lane) throw new Error("Jalur tidak ditemukan")

  if (!data.customerId) throw new Error("Pilih alokasi customer")

  const tobaccoGrade = await prisma.tobaccoGrade.findFirst({
    where: { name: data.grade, tobaccoTypeId: data.tobaccoTypeId },
  })

  if (!tobaccoGrade) throw new Error("Grade tidak ditemukan")

  const sequence = await nextSequence(`bale:${lane.code}`)
  const labelCode = generateLabelCode(lane.warehouse.code, lane.code, sequence)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  let purchase: { id: number; laneId: number | null } | null = null
  let shouldCreate = false

  if (data.purchaseId) {
    const existing = await prisma.purchase.findUnique({ where: { id: data.purchaseId } })
    if (!existing) throw new Error("Transaksi tidak ditemukan")
    if (existing.status === "WEIGHED")
      throw new Error("Transaksi sudah ditimbang — tidak bisa menambah bale. Buat transaksi baru.")
    if (existing.status !== "DRAFT") throw new Error("Transaksi sudah ditutup")
    if (existing.laneId !== lane.id) throw new Error("Bale tidak bisa masuk ke transaksi dari jalur lain")
    purchase = existing
  } else {
    purchase = await prisma.purchase.findFirst({
      where: {
        farmerId: data.farmerId,
        laneId: lane.id,
        status: "DRAFT",
        transactionDate: { gte: todayStart },
      },
    })
    shouldCreate = !purchase
  }

  const actor = await getActorName()

  if (shouldCreate) {
    const txSeq = await nextSequence(lane.code)
    const txDate = format(new Date(), "yyyyMMdd")
    purchase = await prisma.purchase.create({
      data: {
        transactionCode: `${lane.code}-${txDate}-${String(txSeq).padStart(3, "0")}`,
        farmerId: data.farmerId,
        warehouseId: lane.warehouseId,
        laneId: lane.id,
        totalPrice: 0,
        createdBy: actor,
      },
    })
  }

  if (!purchase) throw new Error("Transaksi tidak ditemukan")

  const itemCount = await prisma.purchaseItem.count({ where: { purchaseId: purchase.id } })

  const item = await prisma.purchaseItem.create({
    data: {
      purchaseId: purchase.id,
      inputOrder: itemCount + 1,
      labelCode,
      packingTypeId: data.packingTypeId,
      tobaccoTypeId: data.tobaccoTypeId,
      leafTypeId: data.leafTypeId,
      grade: data.grade,
      moisturePercent: data.moisturePercent,
      packingWeight: data.packingWeight,
      pricePerKg: tobaccoGrade.defaultPrice,
      customerId: data.customerId,
      createdBy: actor,
    },
    include: {
      tobaccoType: true,
      customer: true,
      purchase: { include: { farmer: true } },
    },
  })

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { totalItems: { increment: 1 } },
  })

  revalidatePath("/pos-1/grading")
  return {
    id: item.id,
    labelCode: item.labelCode,
    grade: item.grade,
    tobaccoType: item.tobaccoType.name,
    status: item.status,
    pricePerKg: Number(item.pricePerKg),
    purchaseId: item.purchaseId,
    farmerName: item.purchase.farmer.name,
    customerName: item.customer?.name ?? null,
    createdBy: item.createdBy,
  }
}

export async function deleteBale(id: number) {
  try {
    const item = await prisma.purchaseItem.findUnique({ where: { id }, include: { purchase: true } })
    if (!item) throw new Error("Bale tidak ditemukan")
    if (item.status !== "GRADED") throw new Error("Hanya bale dengan status GRADED yang bisa dihapus")

    await prisma.purchaseItem.delete({ where: { id } })

    await prisma.purchase.update({
      where: { id: item.purchaseId },
      data: { totalItems: { decrement: 1 } },
    })

    revalidatePath("/pos-1/grading")
  } catch (err) {
    if (err instanceof Error) throw new Error(err.message)
    throw new Error("Gagal menghapus bale")
  }
}
