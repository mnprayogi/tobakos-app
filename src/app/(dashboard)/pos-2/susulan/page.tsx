import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { getCurrentUserLane } from "@/lib/lane-resolution"
import { LanePicker } from "@/components/shared/lane-picker"
import { SusulanShell } from "@/components/pos-2/susulan-shell"
import { getSettingNumber } from "@/lib/settings"

export const dynamic = "force-dynamic"

export default async function SusulanPage({ searchParams }: { searchParams: Promise<{ lane?: string }> }) {
  const [session, { lane: laneCode }] = await Promise.all([auth(), searchParams])
  const assignedLane = await getCurrentUserLane(session)

  const lane = assignedLane ?? (laneCode ? await getLaneByCode(laneCode) : null)

  if (!lane) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Pos 2 · Pilih Jalur Kerja"
        subtitle="Tentukan jalur untuk input susulan formulir kertas."
      />
    )
  }

  const [rawTypes, leafTypes, packingTypes, farmers, customers, maxMoisturePercent, defaultMoisturePercent] =
    await Promise.all([
      prisma.tobaccoType.findMany({ where: { active: true }, include: { grades: true } }),
      prisma.leafType.findMany({ where: { active: true } }),
      prisma.packingType.findMany(),
      prisma.farmer.findMany({ orderBy: { name: "asc" } }),
      prisma.customer.findMany({ orderBy: { name: "asc" } }),
      getSettingNumber("MAX_MOISTURE_PERCENT", 20),
      getSettingNumber("DEFAULT_MOISTURE_PERCENT", 3),
    ])

  const tobaccoTypes = rawTypes.map((t) => ({
    id: t.id,
    name: t.name,
    grades: t.grades.map((g) => ({ id: g.id, name: g.name, defaultPrice: Number(g.defaultPrice) })),
  }))

  return (
    <div className="flex flex-col gap-5">
      <SusulanShell
        tobaccoTypes={tobaccoTypes}
        leafTypes={leafTypes.map((t) => ({ id: t.id, name: t.name }))}
        packingTypes={packingTypes.map((t) => ({ id: t.id, name: t.name, deductionWeight: t.deductionWeight }))}
        farmers={farmers.map((f) => ({ id: f.id, name: f.name, nik: f.nik, address: f.address }))}
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        warehouse={lane.warehouse.code}
        laneCode={lane.code}
        laneName={lane.name}
        maxMoisturePercent={maxMoisturePercent}
        defaultMoisturePercent={defaultMoisturePercent}
        userName={session?.user.name ?? "Operator"}
      />
    </div>
  )
}
