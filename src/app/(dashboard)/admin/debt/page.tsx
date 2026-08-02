import { redirect } from "next/navigation"
import { getDebtSummary } from "@/lib/actions/finance"
import { canAccess } from "@/lib/roles"
import { DebtClient } from "./client"

export default async function DebtPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")
  const summary = await getDebtSummary()
  return <DebtClient farmers={summary} />
}
