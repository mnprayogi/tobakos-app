import { auth } from "@/lib/auth"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { getCurrentUserLane } from "@/lib/lane-resolution"
import { LanePicker } from "@/components/shared/lane-picker"
import { WeighedTransactions } from "@/components/pos-2/weighed-transactions"

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">Transaksi Ditimbang</h1>
          <p className="text-sm text-muted-foreground">
            {lane.warehouse.name} · {lane.name}
            <span className="ml-2 font-mono text-emerald font-bold">{lane.code}</span>
          </p>
        </div>
        <div className="text-right text-[11.5px] text-muted-foreground leading-relaxed">
          <div>
            user: <span className="font-semibold text-foreground">{session?.user?.name}</span>
          </div>
          <div>
            <span className="text-muted-2">Transaksi berjalan &amp; sudah diakhiri</span>
          </div>
        </div>
      </div>

      <WeighedTransactions laneId={lane.id} />
    </div>
  )
}
