import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canAccess } from "@/lib/roles"
import { resolveActorLane } from "@/lib/lane-resolution"
import { buildNotaData } from "@/lib/nota-builder"
import { NotaTimbangan } from "@/components/pos-2/nota-timbangan"
import { NotaPrintToolbar } from "@/components/pos-2/nota-print-toolbar"

export default async function NotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ purchaseId: string }>
  searchParams: Promise<{ laneId?: string }>
}) {
  if (!(await canAccess(["OPERATOR", "ADMIN"]))) redirect("/")

  const { purchaseId: pidStr } = await params
  const sp = await searchParams
  const purchaseId = Number(pidStr)
  const laneId = Number(sp.laneId)

  if (!purchaseId || !laneId) redirect("/")

  let lane
  try {
    lane = await resolveActorLane({ laneId })
  } catch {
    redirect("/")
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { farmer: true, items: true, warehouse: true, lane: true },
  })

  if (!purchase || purchase.laneId !== lane.id || purchase.status !== "WEIGHED") {
    redirect("/")
  }

  const notaData = buildNotaData(purchase)

  return (
    <div className="min-h-screen bg-white">
      <NotaPrintToolbar />
      <div className="max-w-[170mm] mx-auto py-6 px-4">
        <NotaTimbangan {...notaData} />
      </div>
    </div>
  )
}
