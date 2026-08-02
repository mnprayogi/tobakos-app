import { redirect } from "next/navigation"
import { canAccess } from "@/lib/roles"
import { getReportMeta } from "@/lib/actions/reports"
import { ReportsClient } from "./client"

export default async function ReportsPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  const meta = await getReportMeta()
  return <ReportsClient warehouses={meta.warehouses} farmers={meta.farmers} />
}
