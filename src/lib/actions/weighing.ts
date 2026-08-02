"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import {
  calculateWeightAfterPacking,
  calculateMoistureDeduction,
  calculateNetWeight,
  calculateSubtotal,
  roundWeight,
  type RoundMode,
} from "@/lib/calculations"
import { getActorName } from "@/lib/actor"
import { parseLabelCode } from "@/lib/barcode"

export interface WeighInput {
  labelCode: string
  grossWeight: number
  roundingMode: RoundMode
  laneId: number
}

export async function lookupItem(labelCode: string, laneId: number) {
  if (!parseLabelCode(labelCode.trim())) throw new Error("Format barcode tidak valid")

  const item = await prisma.purchaseItem.findUnique({
    where: { labelCode },
    include: {
      purchase: { include: { farmer: true, lane: true } },
      packingType: true,
      tobaccoType: true,
      leafType: true,
      customer: true,
    },
  })
  if (!item) return null
  if (item.purchase.laneId !== laneId) {
    throw new Error(`Bale milik jalur ${item.purchase.lane?.code ?? "-"} — gunakan stasiun jalur tersebut`)
  }
  return {
    id: item.id,
    purchaseId: item.purchaseId,
    farmerId: item.purchase.farmerId,
    labelCode: item.labelCode,
    grade: item.grade,
    moisturePercent: item.moisturePercent,
    packingWeight: item.packingWeight,
    status: item.status,
    createdBy: item.createdBy,
    weighedBy: item.weighedBy,
    farmerName: item.purchase.farmer.name,
    farmerNik: item.purchase.farmer.nik,
    customerName: item.customer?.name ?? null,
    tobaccoType: item.tobaccoType.name,
    leafType: item.leafType.name,
    packingType: item.packingType.name,
    pricePerKg: Number(item.pricePerKg ?? 0),
    grossWeight: item.grossWeight,
    weightAfterPacking: item.weightAfterPacking,
    moistureDeduction: item.moistureDeduction,
    netWeight: item.netWeight,
    subtotal: Number(item.subtotal ?? 0),
  }
}

export async function saveWeighData(data: WeighInput) {
  if (!parseLabelCode(data.labelCode.trim())) throw new Error("Format barcode tidak valid")

  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.purchaseItem.findUnique({
      where: { labelCode: data.labelCode },
      include: { packingType: true, purchase: { select: { status: true, laneId: true } } },
    })

    if (!item) throw new Error("Bale tidak ditemukan")
    if (item.purchase.laneId !== data.laneId) throw new Error("Bale milik jalur lain")
    if (item.purchase.status !== "DRAFT") throw new Error("Transaksi sudah ditutup")
    if (item.status !== "GRADED") throw new Error("Bale sudah ditimbang")
    if (data.grossWeight <= 0) throw new Error("Berat harus lebih dari 0")

    const weightDecimals = data.roundingMode === "normal" ? 1 : 0

    const weightAfterPacking = roundWeight(
      calculateWeightAfterPacking(data.grossWeight, item.packingWeight),
      data.roundingMode,
      weightDecimals
    )
    const moistureDeduction = roundWeight(
      calculateMoistureDeduction(weightAfterPacking, item.moisturePercent),
      data.roundingMode,
      weightDecimals
    )
    const netWeight = roundWeight(
      calculateNetWeight(weightAfterPacking, moistureDeduction),
      data.roundingMode,
      weightDecimals
    )
    const pricePerKg = Number(item.pricePerKg ?? 0)
    const subtotal = roundWeight(
      calculateSubtotal(netWeight, pricePerKg),
      "normal",
      2
    )

    const result = await tx.purchaseItem.update({
      where: { id: item.id },
      data: {
        grossWeight: data.grossWeight,
        weightAfterPacking,
        moistureDeduction,
        netWeight,
        subtotal,
        status: "WEIGHED",
        weighedBy: await getActorName(),
      },
    })

    await tx.purchase.update({
      where: { id: item.purchaseId },
      data: {
        totalGrossWeight: { increment: data.grossWeight },
        totalNetWeight: { increment: netWeight },
        totalPrice: { increment: subtotal },
      },
    })

    return result
  })

  revalidatePath("/pos-2/weighing")
  return {
    id: updated.id,
    grossWeight: updated.grossWeight,
    weightAfterPacking: updated.weightAfterPacking,
    moistureDeduction: updated.moistureDeduction,
    netWeight: updated.netWeight,
    subtotal: Number(updated.subtotal),
    status: updated.status,
  }
}

export interface HistoryItem {
  id: number
  inputOrder: number
  labelCode: string
  grade: string
  grossWeight: number | null
  weightAfterPacking: number | null
  moistureDeduction: number | null
  netWeight: number | null
  subtotal: number
  status: string
  weighedBy: string | null
  customerName: string | null
}

export interface HistoryPurchase {
  id: number
  transactionCode: string
  transactionLabel: string
  laneCode: string
  items: HistoryItem[]
}

export async function getWeighedHistory(farmerId: number, laneId: number) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const allToday = await prisma.purchase.findMany({
    where: {
      farmerId,
      status: "DRAFT",
      transactionDate: { gte: todayStart },
    },
    orderBy: { createdAt: "asc" },
    include: {
      lane: true,
      items: {
        where: { status: { in: ["GRADED", "WEIGHED"] } },
        orderBy: { inputOrder: "asc" },
        include: { customer: true },
      },
    },
  })

  const byLane = allToday.filter((p) => p.laneId === laneId)

  return byLane.map((p) => ({
    id: p.id,
    transactionCode: p.transactionCode,
    transactionLabel: `Transaksi #${allToday.indexOf(p) + 1}`,
    laneCode: p.lane?.code ?? "",
    items: p.items.map((item) => ({
      id: item.id,
      inputOrder: item.inputOrder,
      labelCode: item.labelCode,
      grade: item.grade,
      grossWeight: item.grossWeight,
      weightAfterPacking: item.weightAfterPacking,
      moistureDeduction: item.moistureDeduction,
      netWeight: item.netWeight,
      subtotal: Number(item.subtotal ?? 0),
      status: item.status,
      weighedBy: item.weighedBy,
      customerName: item.customer?.name ?? null,
    })),
  }))
}

export interface NotaItem {
  grade: string
  count: number
  totalGross: number
  totalTara: number
  totalNet: number
  totalSubtotal: number
}

export interface SessionCheckResult {
  totalBales: number
  weighedCount: number
  unweighedCount: number
  unweighedBales: { labelCode: string; grade: string }[]
}

export async function getSessionUnweighed(purchaseId: number, laneId: number): Promise<SessionCheckResult> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      items: {
        where: { status: { in: ["GRADED", "WEIGHED"] } },
        orderBy: { inputOrder: "asc" },
        select: { labelCode: true, grade: true, status: true },
      },
    },
  })
  if (!purchase) throw new Error("Transaksi tidak ditemukan")
  if (purchase.laneId !== laneId) throw new Error("Transaksi bukan milik jalur ini")
  if (purchase.status !== "DRAFT") throw new Error("Transaksi sudah ditutup")

  const unweighedBales = purchase.items
    .filter((i) => i.status === "GRADED")
    .map((i) => ({ labelCode: i.labelCode, grade: i.grade }))

  return {
    totalBales: purchase.items.length,
    weighedCount: purchase.items.filter((i) => i.status === "WEIGHED").length,
    unweighedCount: unweighedBales.length,
    unweighedBales,
  }
}

export async function endWeighSession(purchaseId: number, laneId: number) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { farmer: true, items: true, warehouse: true },
  })
  if (!purchase) throw new Error("Transaksi tidak ditemukan")
  if (purchase.laneId !== laneId) throw new Error("Transaksi bukan milik jalur ini")
  if (purchase.status !== "DRAFT") throw new Error("Transaksi sudah ditutup")

  const unweighedItems = purchase.items.filter((i) => i.status === "GRADED")
  const weighedItems = purchase.items.filter((i) => i.status === "WEIGHED")
  if (weighedItems.length === 0) throw new Error("Tidak ada bale yang ditimbang")
  if (unweighedItems.length > 0) {
    const labels = unweighedItems
      .map((i) => i.labelCode)
      .sort()
      .join(", ")
    throw new Error(
      `Masih ada ${unweighedItems.length} bale belum ditimbang (${labels}). Timbang semua bale sebelum menutup sesi.`
    )
  }

  await prisma.purchase.update({
    where: { id: purchaseId },
    data: { status: "WEIGHED", weighedBy: await getActorName() },
  })

  const gradeMap = new Map<string, NotaItem>()
  for (const item of weighedItems) {
    const existing = gradeMap.get(item.grade) ?? {
      grade: item.grade,
      count: 0,
      totalGross: 0,
      totalTara: 0,
      totalNet: 0,
      totalSubtotal: 0,
    }
    existing.count++
    existing.totalGross += Number(item.grossWeight ?? 0)
    existing.totalTara += Number(item.packingWeight ?? 0)
    existing.totalNet += Number(item.netWeight ?? 0)
    existing.totalSubtotal += Number(item.subtotal ?? 0)
    gradeMap.set(item.grade, existing)
  }

  const notaItems = Array.from(gradeMap.values()).sort((a, b) =>
    a.grade.localeCompare(b.grade)
  )

  const totals: NotaItem = {
    grade: "TOTAL",
    count: notaItems.reduce((s, g) => s + g.count, 0),
    totalGross: notaItems.reduce((s, g) => s + g.totalGross, 0),
    totalTara: notaItems.reduce((s, g) => s + g.totalTara, 0),
    totalNet: notaItems.reduce((s, g) => s + g.totalNet, 0),
    totalSubtotal: notaItems.reduce((s, g) => s + g.totalSubtotal, 0),
  }

  revalidatePath("/pos-2/weighing")
  return {
    transactionCode: purchase.transactionCode,
    farmerName: purchase.farmer.name,
    farmerNik: purchase.farmer.nik,
    warehouse: purchase.warehouse?.name ?? purchase.warehouse?.code ?? "Gudang",
    date: purchase.transactionDate.toISOString(),
    items: notaItems,
    totals,
  }
}

export interface FarmerQueueItem {
  farmerId: number
  farmerName: string
  farmerNik: string | null
  purchaseIds: number[]
  primaryPurchaseId: number
  gradedCount: number
  transactionCount: number
}

export async function getFarmersWithBales(laneId: number): Promise<FarmerQueueItem[]> {
  const purchases = await prisma.purchase.findMany({
    where: {
      status: "DRAFT",
      laneId,
      items: { some: { status: "GRADED" } },
    },
    include: {
      farmer: true,
      _count: {
        select: { items: { where: { status: "GRADED" } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const map = new Map<number, FarmerQueueItem>()
  for (const p of purchases) {
    const existing = map.get(p.farmerId)
    if (existing) {
      existing.purchaseIds.push(p.id)
      existing.gradedCount += p._count.items
      existing.transactionCount += 1
    } else {
      map.set(p.farmerId, {
        farmerId: p.farmerId,
        farmerName: p.farmer.name,
        farmerNik: p.farmer.nik,
        purchaseIds: [p.id],
        primaryPurchaseId: p.id,
        gradedCount: p._count.items,
        transactionCount: 1,
      })
    }
  }
  return Array.from(map.values())
}
