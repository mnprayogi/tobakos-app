import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getBuktiData } from "@/lib/actions/finance"
import { BuktiLunasPrint } from "@/components/admin/bukti-lunas-print"
import { BuktiPrintToolbar } from "@/components/admin/bukti-print-toolbar"

export default async function BuktiLunasPage({
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
    data = await getBuktiData(purchaseId)
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white" style={{ color: "#000" }}>
      <BuktiPrintToolbar title={`Bukti Lunas — ${data.farmerName}`} />
      <div className="max-w-[170mm] mx-auto py-6 px-4">
        <BuktiLunasPrint {...data} />
      </div>
    </div>
  )
}
