import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { canAccess } from "@/lib/roles"
import { getLoansData } from "@/lib/actions/loans"
import { resolveWarehouseScope, type WarehouseScope } from "@/lib/actions/scope"
import { LoansClient } from "./client"

export default async function LoansPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  let scope: WarehouseScope
  try {
    scope = await resolveWarehouseScope()
  } catch (err) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-bold text-foreground">Hutang Modal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(err as Error).message}</p>
      </div>
    )
  }

  const [loans, farmers] = await Promise.all([
    getLoansData(),
    prisma.farmer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, nik: true },
    }),
  ])

  return <LoansClient loans={loans} farmers={farmers.map((f) => ({ id: f.id, name: f.name, nik: f.nik }))} scope={scope} />
}
