import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PortalHeader } from "@/components/portal/portal-header"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  let customerName: string | undefined
  if (session.user.role === "CUSTOMER") {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { customer: { select: { name: true } } },
    })
    customerName = user?.customer?.name
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PortalHeader
        companyName="TobakOS"
        userName={session.user.name ?? "Mitra"}
        customerName={customerName}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-5 sm:px-6">{children}</main>
    </div>
  )
}
