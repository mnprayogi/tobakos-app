"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { invalidateSetting } from "@/lib/settings"
import { getSessionRole, requireRoles } from "@/lib/roles"
import type { Prisma } from "@/generated/prisma/client"
import {
  farmerSchema,
  customerSchema,
  tobaccoTypeSchema,
  leafTypeSchema,
  packingTypeSchema,
  gradeSchema,
  userSchema,
} from "@/lib/validations"

const PASSWORD_ROUNDS = 12

// Hanya SUPER_ADMIN yang boleh membuat/mengubah user dengan role SUPER_ADMIN atau ADMIN.
// Mencegah ADMIN biasa meng-escalate privilege dirinya sendiri atau orang lain.
async function assertNoPrivilegeEscalation(role: string): Promise<void> {
  if (role !== "SUPER_ADMIN" && role !== "ADMIN") return
  const sessionRole = await getSessionRole()
  if (sessionRole !== "SUPER_ADMIN") {
    throw new Error("Hanya SUPER_ADMIN yang dapat mengelola role ADMIN/SUPER_ADMIN")
  }
}

type ActionError = { error: string }

function handleError(err: unknown): ActionError {
  if (err instanceof Error) return { error: err.message }
  return { error: "Terjadi kesalahan" }
}

// ─── Farmer ──────────────────────────────────────────

export async function createFarmer(data: { name: string; nik?: string; phone?: string; address?: string }) {
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
  try {
    await prisma.farmer.delete({ where: { id } })
    revalidatePath("/admin/farmers")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── Customer ────────────────────────────────────────

export async function createCustomer(data: { name: string; phone?: string; address?: string }) {
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
  try {
    await prisma.packingType.delete({ where: { id } })
    revalidatePath("/admin/packing-types")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── Tobacco Grade ───────────────────────────────────

export async function createGrade(data: { name: string; defaultPrice: number; tobaccoTypeId: number }) {
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
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
  await requireRoles("ADMIN")
  try {
    await prisma.tobaccoGrade.delete({ where: { id } })
    revalidatePath("/admin/grades")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── User ────────────────────────────────────────────

function resolveCustomerLink(role: string, customerId?: number | null): number | null {
  if (role === "CUSTOMER") {
    if (customerId == null) {
      throw new Error("Akun CUSTOMER wajib ditautkan ke mitra bisnis")
    }
    return customerId
  }
  return null
}

export async function createUser(data: {
  name: string
  username: string
  email?: string | null
  password?: string | null
  role: string
  laneId?: number | null
  customerId?: number | null
}) {
  await requireRoles("ADMIN")
  const parsed = userSchema.parse(data)
  if (!parsed.password) {
    throw new Error("Password wajib diisi")
  }
  assertNoPrivilegeEscalation(parsed.role)
  const customerId = resolveCustomerLink(parsed.role, parsed.customerId)
  try {
    const hashed = await bcrypt.hash(parsed.password, PASSWORD_ROUNDS)
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        username: parsed.username,
        email: parsed.email,
        password: hashed,
        role: parsed.role,
        laneId: parsed.role === "CUSTOMER" ? null : parsed.laneId ?? null,
        customerId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        laneId: true,
        customerId: true,
      },
    })
    revalidatePath("/admin/master-data")
    return user
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateUser(
  id: string,
  data: {
    name: string
    username: string
    email?: string | null
    password?: string | null
    role: string
    laneId?: number | null
    customerId?: number | null
  }
) {
  await requireRoles("ADMIN")
  const parsed = userSchema.parse(data)
  assertNoPrivilegeEscalation(parsed.role)
  let customerId: number | null
  try {
    customerId = resolveCustomerLink(parsed.role, parsed.customerId)
  } catch (err) {
    // saat edit boleh mempertahankan link lama bila tidak dikirim
    if (parsed.customerId == null) {
      const existing = await prisma.user.findUnique({ where: { id }, select: { role: true, customerId: true } })
      if (!existing) throw new Error("User tidak ditemukan")
      customerId = parsed.role === "CUSTOMER" ? existing.customerId : null
      if (parsed.role === "CUSTOMER" && customerId == null) {
        throw new Error("Akun CUSTOMER wajib ditautkan ke mitra bisnis")
      }
    } else {
      throw err
    }
  }
  try {
    const dataUpdate: Prisma.UserUncheckedUpdateInput = {
      name: parsed.name,
      username: parsed.username,
      email: parsed.email,
      role: parsed.role,
      laneId: parsed.role === "CUSTOMER" ? null : parsed.laneId ?? null,
      customerId,
    }
    if (parsed.password) {
      dataUpdate.password = await bcrypt.hash(parsed.password, PASSWORD_ROUNDS)
    }
    const user = await prisma.user.update({
      where: { id },
      data: dataUpdate,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        laneId: true,
        customerId: true,
      },
    })
    revalidatePath("/admin/master-data")
    return user
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteUser(id: string) {
  await requireRoles("ADMIN")
  try {
    await prisma.user.delete({ where: { id } })
    revalidatePath("/admin/master-data")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

// ─── System Settings ─────────────────────────────────

export async function updateSystemSetting(key: string, value: string) {
  await requireRoles("ADMIN")
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
