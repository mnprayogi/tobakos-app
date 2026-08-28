import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getNotaData } from "@/lib/actions/weighing"
import { NotaTimbangan } from "@/components/pos-2/nota-timbangan"
import { NotaPrintToolbar } from "@/components/pos-2/nota-print-toolbar"

export default async function PrintNotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ purchaseId: string }>
  searchParams: Promise<{ laneId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { purchaseId: pidStr } = await params
  const sp = await searchParams
  const purchaseId = Number(pidStr)
  const laneId = Number(sp.laneId)

  if (!purchaseId || !laneId) notFound()

  let notaData
  try {
    notaData = await getNotaData(purchaseId, laneId)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white" style={{ color: "#000" }}>
      <NotaPrintToolbar />
      <div className="max-w-[170mm] mx-auto py-6 px-4">
        <NotaTimbangan {...notaData} />
      </div>
    </div>
  )
}
