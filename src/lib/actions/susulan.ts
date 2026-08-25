"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { generateLabelCode, generateTransactionCode } from "@/lib/barcode"
import { nextSequence } from "@/lib/sequences"
import { resolveActorLane } from "@/lib/lane-resolution"
import { getActorName } from "@/lib/actor"
import { getSettingNumber } from "@/lib/settings"
import { requireRoles } from "@/lib/roles"
import { publishEvent } from "@/lib/events"
import {
  calculateWeightAfterPacking,
  calculateMoistureDeduction,
  calculateNetWeight,
  calculateSubtotal,
  roundMoney,
  roundWeight,
  type RoundMode,
} from "@/lib/calculations"

export interface SusulanBaleInput {
  tobaccoTypeId: number
  leafTypeId: number
  packingTypeId: number
  grade: string
  moisturePercent: number
  packingWeight: number
  customerId: number
  grossWeight: number | null
  roundingMode?: RoundMode
}

export interface SusulanBatchInput {
  farmerId: number
  laneCode: string
  transactionDate: string
  bales: SusulanBaleInput[]
}

export interface SusulanLabelResult {
  labelCode: string
  grade: string
  netWeight: number | null
  status: string
}

export interface SusulanBatchResult {
  purchaseId: number
  transactionCode: string
  warehouseCode: string
  farmerName: string
  transactionDate: string
  status: string
  sessionEnded: boolean
  weighedCount: number
  gradedCount: number
  totalNetWeight: number
  labels: SusulanLabelResult[]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_BALES_PER_BATCH = 200

function parseSusulanDate(value: string): Date {
  if (!ISO_DATE.test(value)) throw new Error("Tanggal transaksi tidak valid")
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal transaksi tidak valid")
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  if (date.getTime() > todayStart.getTime()) {
    throw new Error("Tanggal transaksi tidak boleh di masa depan")
  }
  return date
}

export async function checkSusulanDuplicate(
  farmerId: number,
  laneCode: string,
  transactionDate: string
): Promise<string | null> {
  await requireRoles("OPERATOR", "ADMIN")
  const lane = await resolveActorLane({ laneCode })
  if (!lane) return null
  let date: Date
  try {
    date = parseSusulanDate(transactionDate)
  } catch {
    return null
  }
  const dayEnd = new Date(date)
  dayEnd.setHours(23, 59, 59, 999)
  const existing = await prisma.purchase.findFirst({
    where: { farmerId, laneId: lane.id, transactionDate: { gte: date, lte: dayEnd }, status: { not: "VOIDED" } },
    select: { transactionCode: true, status: true },
  })
  return existing ? `${existing.transactionCode} (${existing.status})` : null
}

export async function saveSusulanBatch(input: SusulanBatchInput): Promise<SusulanBatchResult> {
  await requireRoles("OPERATOR", "ADMIN")

  const lane = await resolveActorLane({ laneCode: input.laneCode })
  if (!lane) throw new Error("Jalur tidak ditemukan")

  const transactionDate = parseSusulanDate(input.transactionDate)
  if (!Array.isArray(input.bales) || input.bales.length === 0) {
    throw new Error("Minimal satu bale harus diisi")
  }
  if (input.bales.length > MAX_BALES_PER_BATCH) {
    throw new Error(`Maksimal ${MAX_BALES_PER_BATCH} bale per pengiriman`)
  }

  const maxMoisture = await getSettingNumber("MAX_MOISTURE_PERCENT", 20)

  for (const [idx, bale] of input.bales.entries()) {
    if (!bale.customerId) throw new Error(`Baris ${idx + 1}: pilih alokasi customer`)
    if (!bale.grade?.trim()) throw new Error(`Baris ${idx + 1}: grade wajib dipilih`)
    if (
      !Number.isFinite(bale.moisturePercent) ||
      bale.moisturePercent < 0 ||
      bale.moisturePercent > maxMoisture
    ) {
      throw new Error(`Baris ${idx + 1}: Potongan MC harus antara 0–${maxMoisture}%`)
    }
    if (!Number.isFinite(bale.packingWeight) || bale.packingWeight < 0) {
      throw new Error(`Baris ${idx + 1}: Potongan packing tidak boleh negatif`)
    }
    if (bale.grossWeight != null && (!Number.isFinite(bale.grossWeight) || bale.grossWeight < 0)) {
      throw new Error(`Baris ${idx + 1}: Berat bruto tidak valid`)
    }
  }

  const actor = await getActorName()

  const customerIds = [...new Set(input.bales.map((b) => b.customerId))]
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true },
  })
  if (customers.length !== customerIds.length) {
    throw new Error("Alokasi customer tidak ditemukan")
  }

  const gradePairs = [
    ...new Set(input.bales.map((b) => `${b.tobaccoTypeId}|${b.grade.trim()}`)),
  ].map((key) => {
    const [tobaccoTypeId, grade] = key.split("|")
    return { tobaccoTypeId: Number(tobaccoTypeId), name: grade }
  })
  const grades = await prisma.tobaccoGrade.findMany({ where: { OR: gradePairs } })
  const priceMap = new Map(
    grades.map((g) => [`${g.tobaccoTypeId}|${g.name}`, g.defaultPrice])
  )
  for (const bale of input.bales) {
    const key = `${bale.tobaccoTypeId}|${bale.grade.trim()}`
    if (!priceMap.has(key)) {
      throw new Error(`Grade "${bale.grade}" tidak ditemukan untuk jenis tembakau tersebut`)
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM lanes WHERE id = ${lane.id} FOR UPDATE
    `
    if (locked.length === 0) throw new Error("Jalur tidak ditemukan")

    const farmer = await tx.farmer.findUnique({
      where: { id: input.farmerId },
      select: { name: true },
    })
    if (!farmer) throw new Error("Petani tidak ditemukan")

    const txSeq = await nextSequence(lane.code, tx, transactionDate)
    const purchase = await tx.purchase.create({
      data: {
        transactionCode: generateTransactionCode(lane.code, txSeq, transactionDate),
        farmerId: input.farmerId,
        warehouseId: lane.warehouseId,
        laneId: lane.id,
        transactionDate,
        totalPrice: 0,
        createdBy: actor,
        notes: "Input susulan dari formulir kertas",
      },
    })

    const labels: SusulanLabelResult[] = []
    let order = 0
    let weighedCount = 0
    let gradedCount = 0
    let totalGrossWeight = 0
    let totalNetWeight = 0
    let totalPrice = 0

    for (const bale of input.bales) {
      order += 1
      const seq = await nextSequence(`bale:${lane.code}`, tx, transactionDate)
      const labelCode = generateLabelCode(lane.warehouse.code, lane.code, seq, transactionDate)
      const pricePerKg = priceMap.get(`${bale.tobaccoTypeId}|${bale.grade.trim()}`)!
      const roundingMode: RoundMode = bale.roundingMode ?? "normal"
      const weightDecimals = roundingMode === "normal" ? 1 : 0

      const hasGross = bale.grossWeight != null && Number.isFinite(bale.grossWeight)
      let weightAfterPacking: number | undefined
      let moistureDeduction: number | undefined
      let netWeight: number | undefined
      let subtotal: number | undefined
      let status: "GRADED" | "WEIGHED" = "GRADED"

      if (hasGross) {
        weightAfterPacking = roundWeight(
          calculateWeightAfterPacking(bale.grossWeight!, bale.packingWeight),
          roundingMode,
          weightDecimals
        )
        moistureDeduction = roundWeight(
          calculateMoistureDeduction(weightAfterPacking, bale.moisturePercent),
          roundingMode,
          weightDecimals
        )
        netWeight = roundWeight(
          calculateNetWeight(weightAfterPacking, moistureDeduction),
          roundingMode,
          weightDecimals
        )
        subtotal = roundWeight(calculateSubtotal(netWeight, Number(pricePerKg)), "normal", 2)
        status = "WEIGHED"
        weighedCount += 1
        totalGrossWeight += bale.grossWeight!
        totalNetWeight += netWeight
        totalPrice += subtotal
      } else {
        gradedCount += 1
      }

      await tx.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          inputOrder: order,
          labelCode,
          packingTypeId: bale.packingTypeId,
          tobaccoTypeId: bale.tobaccoTypeId,
          leafTypeId: bale.leafTypeId,
          grade: bale.grade.trim(),
          moisturePercent: bale.moisturePercent,
          packingWeight: bale.packingWeight,
          customerId: bale.customerId,
          pricePerKg,
          grossWeight: hasGross ? bale.grossWeight : null,
          weightAfterPacking,
          moistureDeduction,
          netWeight,
          subtotal,
          status,
          createdBy: actor,
          weighedBy: status === "WEIGHED" ? actor : null,
        },
      })

      labels.push({
        labelCode,
        grade: bale.grade.trim(),
        netWeight: netWeight ?? null,
        status,
      })
    }

    const sessionEnded = gradedCount === 0 && weighedCount > 0

    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        totalItems: input.bales.length,
        totalGrossWeight,
        totalNetWeight,
        totalPrice,
        ...(sessionEnded ? { status: "WEIGHED", weighedBy: actor } : {}),
      },
    })

    return {
      purchase,
      farmerName: farmer.name,
      labels,
      weighedCount,
      gradedCount,
      totalGrossWeight,
      totalNetWeight,
      totalPrice,
      sessionEnded,
    }
  })

  revalidatePath("/pos-1/grading")
  revalidatePath("/pos-2/weighing")
  revalidatePath("/pos-2/transactions")
  revalidatePath("/admin/transactions")
  publishEvent("bale.created", lane.id)
  if (result.sessionEnded) publishEvent("session.ended", lane.id)

  return {
    purchaseId: result.purchase.id,
    transactionCode: result.purchase.transactionCode,
    warehouseCode: lane.warehouse.code,
    farmerName: result.farmerName,
    transactionDate: input.transactionDate,
    status: result.sessionEnded ? "WEIGHED" : "DRAFT",
    sessionEnded: result.sessionEnded,
    weighedCount: result.weighedCount,
    gradedCount: result.gradedCount,
    totalNetWeight: roundMoney(result.totalNetWeight),
    labels: result.labels,
  }
}
