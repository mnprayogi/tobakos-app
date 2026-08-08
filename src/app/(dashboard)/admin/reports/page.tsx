import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { canAccess } from "@/lib/roles"
import { getReportMeta } from "@/lib/actions/reports"
import { ReportsClient } from "./client"
import { getSetting } from "@/lib/settings"

export default async function ReportsPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  const [session, companyName] = await Promise.all([auth(), getSetting("COMPANY_NAME", "TobakOS")])

  let meta
  try {
    meta = await getReportMeta()
  } catch (err) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-lg font-bold text-foreground">Laporan</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(err as Error).message}</p>
      </div>
    )
  }

  return (
    <ReportsClient
      warehouses={meta.warehouses}
      farmers={meta.farmers}
      scope={meta.scope}
      companyName={companyName}
      userName={session?.user.name ?? ""}
    />
  )
}
