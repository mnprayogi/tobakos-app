import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getPengantarData } from "@/lib/actions/finance"
import { PengantarPrint } from "@/components/admin/pengantar-print"
import { PengantarPrintToolbar } from "@/components/admin/pengantar-print-toolbar"

export default async function PengantarPage({
  params,
}: {
  params: Promise<{ purchaseId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { purchaseId: pidStr } = await params
  const purchaseId = Number(pidStr)
  if (!purchaseId) notFound()

  let data
  try {
    data = await getPengantarData(purchaseId)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white" style={{ color: "#000" }}>
      <PengantarPrintToolbar title={`Surat Pengantar — ${data.farmerName}`} />
      <div className="max-w-[170mm] mx-auto py-6 px-4">
        <PengantarPrint {...data} />
      </div>
    </div>
  )
}
