import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { getSetting } from "@/lib/settings"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const companyName = await getSetting("COMPANY_NAME", "TobakOS")

  return (
    <AppShell role={session.user.role ?? ""} userName={session.user.name ?? ""} companyName={companyName}>
      {children}
    </AppShell>
  )
}
