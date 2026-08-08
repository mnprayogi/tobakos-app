"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export type WarehouseScope =
  | { mode: "all" }
  | { mode: "scoped"; warehouseId: number; warehouseName: string }

export async function resolveWarehouseScope(): Promise<WarehouseScope> {
  const session = await auth()
  const role = session?.user?.role ?? null
  if (role === "SUPER_ADMIN" || role === "OWNER") return { mode: "all" }

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { lane: { select: { warehouse: { select: { id: true, name: true } } } } },
      })
    : null
  const warehouse = user?.lane?.warehouse
  if (warehouse == null) {
    throw new Error("Akun Anda belum ditugaskan ke gudang — hubungi admin untuk mengatur jalur")
  }
  return { mode: "scoped", warehouseId: warehouse.id, warehouseName: warehouse.name }
}
