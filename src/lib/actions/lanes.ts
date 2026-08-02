"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { warehouseSchema, laneSchema } from "@/lib/validations"

type ActionError = { error: string }

function handleError(err: unknown): ActionError {
  if (err instanceof Error) return { error: err.message }
  return { error: "Terjadi kesalahan" }
}

// ─── Reads ────────────────────────────────────────────

export async function getActiveLanes() {
  return prisma.lane.findMany({
    where: { active: true },
    include: { warehouse: true },
    orderBy: [{ warehouseId: "asc" }, { code: "asc" }],
  })
}

export async function getLaneByCode(code: string) {
  return prisma.lane.findUnique({
    where: { code },
    include: { warehouse: true },
  })
}

// ─── Warehouse ────────────────────────────────────────

export async function createWarehouse(data: { code: string; name: string; address?: string }) {
  try {
    const parsed = warehouseSchema.parse(data)
    const warehouse = await prisma.warehouse.create({ data: parsed })
    revalidatePath("/admin/master-data")
    return warehouse
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateWarehouse(id: number, data: { code: string; name: string; address?: string }) {
  try {
    const parsed = warehouseSchema.parse(data)
    const warehouse = await prisma.warehouse.update({ where: { id }, data: parsed })
    revalidatePath("/admin/master-data")
    return warehouse
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function toggleWarehouse(id: number, active: boolean) {
  try {
    const warehouse = await prisma.warehouse.update({ where: { id }, data: { active } })
    revalidatePath("/admin/master-data")
    return warehouse
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteWarehouse(id: number) {
  try {
    const count = await prisma.purchase.count({ where: { warehouseId: id } })
    if (count > 0) throw new Error("Gudang tidak bisa dihapus karena sudah memiliki transaksi")
    await prisma.warehouse.delete({ where: { id } })
    revalidatePath("/admin/master-data")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── Lane ─────────────────────────────────────────────

export async function createLane(data: { code: string; name: string; warehouseId: number }) {
  try {
    const parsed = laneSchema.parse(data)
    const lane = await prisma.lane.create({ data: parsed })
    revalidatePath("/admin/master-data")
    return lane
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateLane(id: number, data: { code: string; name: string; warehouseId: number }) {
  try {
    const parsed = laneSchema.parse(data)
    const lane = await prisma.lane.update({ where: { id }, data: parsed })
    revalidatePath("/admin/master-data")
    return lane
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function toggleLane(id: number, active: boolean) {
  try {
    const lane = await prisma.lane.update({ where: { id }, data: { active } })
    revalidatePath("/admin/master-data")
    return lane
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteLane(id: number) {
  try {
    const count = await prisma.purchase.count({ where: { laneId: id } })
    if (count > 0) throw new Error("Jalur tidak bisa dihapus karena sudah memiliki transaksi")
    await prisma.lane.delete({ where: { id } })
    revalidatePath("/admin/master-data")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}
