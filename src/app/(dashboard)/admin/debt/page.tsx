import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getDebtSummary } from "@/lib/actions/finance"
import { canAccess } from "@/lib/roles"
import { DebtClient } from "./client"

export default async function DebtPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")
  const session = await auth()
  const role = session?.user?.role ?? ""
  const summary = await getDebtSummary()
  return <DebtClient farmers={summary} role={role} />
}
