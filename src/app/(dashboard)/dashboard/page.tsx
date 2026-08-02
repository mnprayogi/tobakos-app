import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import {
  getGraderDashboard,
  getOperatorDashboard,
  getFinanceDashboard,
  getOwnerDashboard,
  getAdminDashboard,
} from "@/lib/actions/dashboard"
import { DashboardClient, type DashboardView } from "./client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role

  let view: DashboardView
  switch (role) {
    case "GRADER":
      view = { role, data: await getGraderDashboard() }
      break
    case "OPERATOR":
      view = { role, data: await getOperatorDashboard() }
      break
    case "FINANCE":
      view = { role, data: await getFinanceDashboard() }
      break
    case "OWNER":
      view = { role, data: await getOwnerDashboard() }
      break
    case "ADMIN":
      view = { role, data: await getAdminDashboard() }
      break
    default:
      redirect("/login")
  }

  return <DashboardClient view={view} userName={session.user.name ?? ""} />
}
