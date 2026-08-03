import { redirect } from "next/navigation"
import { canAccess } from "@/lib/roles"
import { getReportMeta } from "@/lib/actions/reports"
import { ReportsClient } from "./client"
import { getSetting } from "@/lib/settings"

export default async function ReportsPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  const [meta, companyName] = await Promise.all([getReportMeta(), getSetting("COMPANY_NAME", "TobakOS")])
  return <ReportsClient warehouses={meta.warehouses} farmers={meta.farmers} companyName={companyName} />
}
