"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { invalidateSetting } from "@/lib/settings"
import {
  farmerSchema,
  customerSchema,
  tobaccoTypeSchema,
  leafTypeSchema,
  packingTypeSchema,
  gradeSchema,
} from "@/lib/validations"

type ActionError = { error: string }

function handleError(err: unknown): ActionError {
  if (err instanceof Error) return { error: err.message }
  return { error: "Terjadi kesalahan" }
}

// ─── Farmer ──────────────────────────────────────────

export async function createFarmer(data: { name: string; nik?: string; phone?: string; address?: string }) {
  try {
    const parsed = farmerSchema.parse(data)
    const farmer = await prisma.farmer.create({ data: parsed })
    revalidatePath("/admin/farmers")
    return farmer
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateFarmer(id: number, data: { name: string; nik?: string; phone?: string; address?: string }) {
  try {
    const parsed = farmerSchema.parse(data)
    const farmer = await prisma.farmer.update({ where: { id }, data: parsed })
    revalidatePath("/admin/farmers")
    return farmer
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteFarmer(id: number) {
  try {
    await prisma.farmer.delete({ where: { id } })
    revalidatePath("/admin/farmers")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── Customer ────────────────────────────────────────

export async function createCustomer(data: { name: string; phone?: string; address?: string }) {
  try {
    const parsed = customerSchema.parse(data)
    const customer = await prisma.customer.create({ data: parsed })
    revalidatePath("/admin/master-data")
    return customer
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateCustomer(id: number, data: { name: string; phone?: string; address?: string }) {
  try {
    const parsed = customerSchema.parse(data)
    const customer = await prisma.customer.update({ where: { id }, data: parsed })
    revalidatePath("/admin/master-data")
    return customer
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteCustomer(id: number) {
  try {
    await prisma.customer.delete({ where: { id } })
    revalidatePath("/admin/master-data")
  } catch (err) {
    if (err instanceof Error && err.message.includes("Foreign key constraint"))
      throw new Error("Customer masih dipakai oleh bale. Alihkan bale terlebih dahulu.")
    throw new Error(handleError(err).error)
  }
}

// ─── Tobacco Type ────────────────────────────────────

export async function createTobaccoType(data: { name: string }) {
  try {
    const parsed = tobaccoTypeSchema.parse(data)
    const type = await prisma.tobaccoType.create({ data: parsed })
    revalidatePath("/admin/tobacco-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateTobaccoType(id: number, data: { name: string }) {
  try {
    const parsed = tobaccoTypeSchema.parse(data)
    const type = await prisma.tobaccoType.update({ where: { id }, data: parsed })
    revalidatePath("/admin/tobacco-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function toggleTobaccoType(id: number, active: boolean) {
  try {
    const type = await prisma.tobaccoType.update({ where: { id }, data: { active } })
    revalidatePath("/admin/tobacco-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── Leaf Type ───────────────────────────────────────

export async function createLeafType(data: { name: string }) {
  try {
    const parsed = leafTypeSchema.parse(data)
    const type = await prisma.leafType.create({ data: parsed })
    revalidatePath("/admin/leaf-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateLeafType(id: number, data: { name: string }) {
  try {
    const parsed = leafTypeSchema.parse(data)
    const type = await prisma.leafType.update({ where: { id }, data: parsed })
    revalidatePath("/admin/leaf-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function toggleLeafType(id: number, active: boolean) {
  try {
    const type = await prisma.leafType.update({ where: { id }, data: { active } })
    revalidatePath("/admin/leaf-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── Packing Type ────────────────────────────────────

export async function createPackingType(data: { name: string; deductionWeight: number }) {
  try {
    const parsed = packingTypeSchema.parse(data)
    const type = await prisma.packingType.create({ data: parsed })
    revalidatePath("/admin/packing-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updatePackingType(id: number, data: { name: string; deductionWeight: number }) {
  try {
    const parsed = packingTypeSchema.parse(data)
    const type = await prisma.packingType.update({ where: { id }, data: parsed })
    revalidatePath("/admin/packing-types")
    return type
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deletePackingType(id: number) {
  try {
    await prisma.packingType.delete({ where: { id } })
    revalidatePath("/admin/packing-types")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── Tobacco Grade ───────────────────────────────────

export async function createGrade(data: { name: string; defaultPrice: number; tobaccoTypeId: number }) {
  try {
    const parsed = gradeSchema.parse(data)
    const grade = await prisma.tobaccoGrade.create({
      data: { name: parsed.name, defaultPrice: parsed.defaultPrice, tobaccoTypeId: parsed.tobaccoTypeId },
    })
    revalidatePath("/admin/grades")
    return { ...grade, defaultPrice: Number(grade.defaultPrice) }
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateGrade(id: number, data: { name: string; defaultPrice: number; tobaccoTypeId: number }) {
  try {
    const parsed = gradeSchema.parse(data)
    const grade = await prisma.tobaccoGrade.update({
      where: { id },
      data: { name: parsed.name, defaultPrice: parsed.defaultPrice, tobaccoTypeId: parsed.tobaccoTypeId },
    })
    revalidatePath("/admin/grades")
    return { ...grade, defaultPrice: Number(grade.defaultPrice) }
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteGrade(id: number) {
  try {
    await prisma.tobaccoGrade.delete({ where: { id } })
    revalidatePath("/admin/grades")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── User ────────────────────────────────────────────

export async function createUser(data: {
  name: string
  username: string
  email?: string
  password?: string
  role: string
  laneId?: number | null
}) {
  try {
    const user = await prisma.user.create({
      data: { ...data, laneId: data.laneId ?? null },
    })
    revalidatePath("/admin/master-data")
    return user
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateUser(
  id: string,
  data: { name: string; username: string; email?: string; role: string; laneId?: number | null }
) {
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { ...data, laneId: data.laneId ?? null },
    })
    revalidatePath("/admin/master-data")
    return user
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteUser(id: string) {
  try {
    await prisma.user.delete({ where: { id } })
    revalidatePath("/admin/master-data")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── System Settings ─────────────────────────────────

export async function updateSystemSetting(key: string, value: string) {
  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })
    invalidateSetting(key)
    revalidatePath("/admin/settings")
    return setting
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}
