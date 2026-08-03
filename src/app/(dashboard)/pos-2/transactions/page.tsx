import { auth } from "@/lib/auth"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { LanePicker } from "@/components/shared/lane-picker"
import { WeighedTransactions } from "@/components/pos-2/weighed-transactions"

export default async function Pos2TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ lane?: string }>
}) {
  const session = await auth()
  const { lane: laneCode } = await searchParams

  if (!laneCode) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Pos 2 · Transaksi Ditimbang"
        subtitle="Pilih jalur untuk melihat transaksi yang sudah ditimbang."
      />
    )
  }

  const lane = await getLaneByCode(laneCode)
  if (!lane) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Jalur tidak ditemukan"
        subtitle="Pilih jalur kerja yang tersedia."
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
