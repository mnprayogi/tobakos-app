import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { getSetting } from "@/lib/settings"
import { getCurrentUserLane } from "@/lib/lane-resolution"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const [companyName, lane] = await Promise.all([
    getSetting("COMPANY_NAME", "TobakOS"),
    getCurrentUserLane(session),
  ])

  return (
    <AppShell
      role={session.user.role ?? ""}
      userName={session.user.name ?? ""}
      companyName={companyName}
      warehouseName={lane?.warehouse.name ?? null}
      laneName={lane?.name ?? null}
    >
      {children}
    </AppShell>
  )
}
