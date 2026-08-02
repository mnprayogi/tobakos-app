import { auth } from "@/lib/auth"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { LanePicker } from "@/components/shared/lane-picker"
import { WeighingPageClient } from "@/components/pos-2/weighing-page-client"

export default async function WeighingPage({ searchParams }: { searchParams: Promise<{ lane?: string }> }) {
  const session = await auth()
  const { lane: laneCode } = await searchParams

  if (!laneCode) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Pos 2 · Pilih Jalur Kerja"
        subtitle="Tentukan jalur penimbangan yang dipakai perangkat ini."
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
          <h1 className="text-lg font-bold text-foreground">Pos 2: Penimbangan</h1>
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
            Live Timbangan (COM3):{" "}
            <span className="font-semibold text-emerald">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald mr-1.5 shadow-[0_0_6px_#22c98d]" />
              Connected
            </span>
          </div>
        </div>
      </div>

      <WeighingPageClient laneId={lane.id} />
    </div>
  )
}
