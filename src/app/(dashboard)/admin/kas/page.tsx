import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { canAccess } from "@/lib/roles"
import { getCashData } from "@/lib/actions/cash"
import { getSetting } from "@/lib/settings"
import { resolveWarehouseScope, type WarehouseScope } from "@/lib/actions/scope"
import { CashClient } from "./client"

export default async function CashPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  let scope: WarehouseScope
  try {
    scope = await resolveWarehouseScope()
  } catch (err) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-bold text-foreground">Kas</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(err as Error).message}</p>
      </div>
    )
  }

  const [cash, warehouses, session, companyName] = await Promise.all([
    getCashData(),
    scope.mode === "all"
      ? prisma.warehouse.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })
      : Promise.resolve([]),
    auth(),
    getSetting("COMPANY_NAME", "TobakOS"),
  ])

  return (
    <CashClient
      cash={cash}
      scope={scope}
      warehouses={warehouses.map((w) => ({ id: w.id, name: w.name }))}
      companyName={companyName}
      userName={session?.user.name ?? ""}
    />
  )
}