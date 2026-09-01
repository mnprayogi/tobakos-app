import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDebtSummary } from "@/lib/actions/finance"
import { getActiveBankAccounts } from "@/lib/actions/bank-accounts"
import { canAccess } from "@/lib/roles"
import { resolveWarehouseScope, type WarehouseScope } from "@/lib/actions/scope"
import { DebtClient } from "./client"

export default async function DebtPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  let scope: WarehouseScope
  try {
    scope = await resolveWarehouseScope()
  } catch (err) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-bold text-foreground">Hutang Petani</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(err as Error).message}</p>
      </div>
    )
  }

  const session = await auth()
  const role = session?.user?.role ?? ""
  const [summary, bankAccounts] = await Promise.all([
    getDebtSummary(),
    getActiveBankAccounts(scope.mode === "scoped" ? scope.warehouseId : undefined),
  ])
  return (
    <DebtClient
      farmers={summary}
      role={role}
      scope={scope}
      bankAccounts={bankAccounts.map((b) => ({
        id: b.id,
        bankName: b.bankName,
        accountNumber: b.accountNumber,
        accountName: b.accountName,
      }))}
    />
  )
}
