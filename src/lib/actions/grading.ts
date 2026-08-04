"use server"

import { revalidatePath } from "next/cache"
import { format } from "date-fns"
import { prisma } from "@/lib/db"
import { generateLabelCode } from "@/lib/barcode"
import { nextSequence } from "@/lib/sequences"
import { resolveActorLane } from "@/lib/lane-resolution"
import { getActorName } from "@/lib/actor"
import { publishEvent } from "@/lib/events"

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
  status: string
}

export async function getFarmerTodayTransactions(farmerId: number): Promise<TransactionOption[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const purchases = await prisma.purchase.findMany({
    where: { farmerId, transactionDate: { gte: todayStart } },
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
    status: p.status,
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
  const lane = await resolveActorLane({ laneCode })
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
  const lane = await resolveActorLane({ laneCode })

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
  const lane = await resolveActorLane({ laneCode: data.laneCode })

  if (!data.customerId) throw new Error("Pilih alokasi customer")

  const actor = await getActorName()

  const item = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM lanes WHERE id = ${lane.id} FOR UPDATE
    `
    if (locked.length === 0) throw new Error("Jalur tidak ditemukan")

    const tobaccoGrade = await tx.tobaccoGrade.findFirst({
      where: { name: data.grade, tobaccoTypeId: data.tobaccoTypeId },
    })

    if (!tobaccoGrade) throw new Error("Grade tidak ditemukan")

    const sequence = await nextSequence(`bale:${lane.code}`, tx)
    const labelCode = generateLabelCode(lane.warehouse.code, lane.code, sequence)

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    let purchaseId: number

    if (data.purchaseId) {
      const existing = await tx.purchase.findUnique({ where: { id: data.purchaseId } })
      if (!existing) throw new Error("Transaksi tidak ditemukan")
      if (existing.status === "WEIGHED")
        throw new Error("Transaksi sudah ditimbang — tidak bisa menambah bale. Buat transaksi baru.")
      if (existing.status !== "DRAFT") throw new Error("Transaksi sudah ditutup")
      if (existing.laneId !== lane.id) throw new Error("Bale tidak bisa masuk ke transaksi dari jalur lain")
      purchaseId = existing.id
    } else {
      let purchase = await tx.purchase.findFirst({
        where: {
          farmerId: data.farmerId,
          laneId: lane.id,
          status: "DRAFT",
          transactionDate: { gte: todayStart },
        },
      })
      if (!purchase) {
        const txSeq = await nextSequence(lane.code, tx)
        const txDate = format(new Date(), "yyyyMMdd")
        purchase = await tx.purchase.create({
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
      purchaseId = purchase.id
    }

    const itemCount = await tx.purchaseItem.count({ where: { purchaseId } })

    await tx.purchase.update({
      where: { id: purchaseId },
      data: { totalItems: { increment: 1 } },
    })

    return tx.purchaseItem.create({
      data: {
        purchaseId,
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
  })

  revalidatePath("/pos-1/grading")
  publishEvent("bale.created", lane.id)
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
    let laneId: number | null = null
    await prisma.$transaction(async (tx) => {
      const item = await tx.purchaseItem.findUnique({ where: { id }, include: { purchase: true } })
      if (!item) throw new Error("Bale tidak ditemukan (mungkin sudah dihapus)")
      if (item.status !== "GRADED") throw new Error("Hanya bale dengan status GRADED yang bisa dihapus")

      laneId = item.purchase.laneId

      await tx.purchaseItem.delete({ where: { id } })

      await tx.purchase.update({
        where: { id: item.purchaseId },
        data: { totalItems: { decrement: 1 } },
      })
    })

    revalidatePath("/pos-1/grading")
    if (laneId != null) publishEvent("bale.deleted", laneId)
  } catch (err) {
    if (err instanceof Error) throw new Error(err.message)
    throw new Error("Gagal menghapus bale")
  }
}
