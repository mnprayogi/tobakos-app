import { auth } from "@/lib/auth"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { getCurrentUserLane } from "@/lib/lane-resolution"
import { LanePicker } from "@/components/shared/lane-picker"
import { WeighingPageClient } from "@/components/pos-2/weighing-page-client"
import { getSetting } from "@/lib/settings"
import type { RoundMode } from "@/lib/calculations"
import { Scale } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

export default async function WeighingPage({ searchParams }: { searchParams: Promise<{ lane?: string }> }) {
  const [session, { lane: laneCode }] = await Promise.all([auth(), searchParams])
  const assignedLane = await getCurrentUserLane(session)

  const lane = assignedLane ?? (laneCode ? await getLaneByCode(laneCode) : null)

  if (!lane) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Pos 2 · Pilih Jalur Kerja"
        subtitle="Tentukan jalur penimbangan yang dipakai perangkat ini."
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Scale}
        title="Pos 2 · Penimbangan"
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
            <span className="text-muted-2">Timbang bale yang sudah di-grade di Pos 1</span>
          </div>
        </div>
      </PageHeader>

      <WeighingPageClient laneId={lane.id} defaultRoundingMode={(await getSetting("WEIGHT_ROUND_MODE", "normal")) as RoundMode} />
    </div>
  )
}
