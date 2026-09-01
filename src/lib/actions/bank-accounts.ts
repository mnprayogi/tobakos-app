"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/db"
import { requireRoles } from "@/lib/roles"
import { bankAccountSchema } from "@/lib/validations"

type ActionError = { error: string }

function handleError(err: unknown): ActionError {
  if (err instanceof Error) return { error: err.message }
  return { error: "Terjadi kesalahan" }
}

export async function getActiveBankAccounts(warehouseId?: number) {
  await requireRoles("ADMIN", "FINANCE", "OWNER", "SUPER_ADMIN")
  return prisma.bankAccount.findMany({
    where: {
      active: true,
      ...(warehouseId != null ? { OR: [{ warehouseId }, { warehouseId: null }] } : {}),
    },
    orderBy: [{ bankName: "asc" }, { accountNumber: "asc" }],
  })
}

export async function createBankAccount(data: {
  bankName: string
  accountNumber: string
  accountName: string
  warehouseId?: number | null
}) {
  await requireRoles("ADMIN")
  try {
    const parsed = bankAccountSchema.parse(data)
    const account = await prisma.bankAccount.create({
      data: {
        bankName: parsed.bankName,
        accountNumber: parsed.accountNumber,
        accountName: parsed.accountName,
        warehouseId: parsed.warehouseId ?? null,
      },
    })
    revalidatePath("/admin/master-data")
    revalidatePath("/admin/transactions")
    return account
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function updateBankAccount(
  id: number,
  data: {
    bankName: string
    accountNumber: string
    accountName: string
    warehouseId?: number | null
  }
) {
  await requireRoles("ADMIN")
  try {
    const parsed = bankAccountSchema.parse(data)
    const account = await prisma.bankAccount.update({
      where: { id },
      data: {
        bankName: parsed.bankName,
        accountNumber: parsed.accountNumber,
        accountName: parsed.accountName,
        warehouseId: parsed.warehouseId ?? null,
      },
    })
    revalidatePath("/admin/master-data")
    revalidatePath("/admin/transactions")
    return account
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function toggleBankAccount(id: number, active: boolean) {
  await requireRoles("ADMIN")
  try {
    const account = await prisma.bankAccount.update({ where: { id }, data: { active } })
    revalidatePath("/admin/master-data")
    revalidatePath("/admin/transactions")
    return account
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}

export async function deleteBankAccount(id: number) {
  await requireRoles("ADMIN")
  try {
    const count = await prisma.payment.count({ where: { bankAccountId: id } })
    if (count > 0) throw new Error("Rekening tidak bisa dihapus karena sudah dipakai pembayaran")
    await prisma.bankAccount.delete({ where: { id } })
    revalidatePath("/admin/master-data")
    revalidatePath("/admin/transactions")
  } catch (err) {
    throw new Error(handleError(err).error)
  }
}
