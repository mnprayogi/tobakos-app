import { auth } from "@/lib/auth"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { getCurrentUserLane } from "@/lib/lane-resolution"
import { LanePicker } from "@/components/shared/lane-picker"
import { WeighedTransactions } from "@/components/pos-2/weighed-transactions"
import { ClipboardList } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

export default async function Pos2TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string }>
}) {
  const [session, { lane: laneCode }] = await Promise.all([auth(), searchParams])
  const assignedLane = await getCurrentUserLane(session)

  const lane = assignedLane ?? (laneCode ? await getLaneByCode(laneCode) : null)

  if (!lane) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Pos 2 · Transaksi Ditimbang"
        subtitle="Pilih jalur untuk melihat transaksi yang sudah ditimbang."
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ClipboardList}
        title="Transaksi Ditimbang"
        subtitle={
          <>
            {lane.warehouse.name} · {lane.name}
            <span className="ml-2 font-mono text-emerald font-bold">{lane.code}</span>
          </>
        }
      >
        <div className="text-right text-[11.5px] text-muted-foreground leading-relaxed">
          <div>
            user: <span className="font-semibold text-foreground">{session?.user?.name}</span>
          </div>
          <div>
            <span className="text-muted-2">Transaksi berjalan &amp; sudah diakhiri</span>
          </div>
        </div>
      </PageHeader>

      <WeighedTransactions laneId={lane.id} />
    </div>
  )
}
