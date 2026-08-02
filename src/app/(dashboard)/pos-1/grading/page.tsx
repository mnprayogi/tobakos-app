import { prisma } from "@/lib/db"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { LanePicker } from "@/components/shared/lane-picker"
import { GradingShell } from "@/components/pos-1/grading-shell"

export default async function GradingPage({ searchParams }: { searchParams: Promise<{ lane?: string }> }) {
  const { lane: laneCode } = await searchParams

  if (!laneCode) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Pos 1 · Pilih Jalur Kerja"
        subtitle="Tentukan jalur grading yang dipakai perangkat ini."
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

  const [rawTypes, leafTypes, packingTypes, farmers, customers, todayDraftPurchases, recentBales] = await Promise.all([
    prisma.tobaccoType.findMany({ where: { active: true }, include: { grades: true } }),
    prisma.leafType.findMany({ where: { active: true } }),
    prisma.packingType.findMany(),
    prisma.farmer.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.purchase.findMany({
      where: { status: "DRAFT", laneId: lane.id, transactionDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      select: { farmerId: true },
    }),
    prisma.purchaseItem.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        purchase: { include: { farmer: true } },
        tobaccoType: true,
        customer: true,
      },
    }),
  ])

  const tobaccoTypes = rawTypes.map((t) => ({
    id: t.id,
    name: t.name,
    active: t.active,
    grades: t.grades.map((g) => ({ id: g.id, name: g.name, defaultPrice: Number(g.defaultPrice) })),
  }))

  const leafTypesPlain = leafTypes.map((t) => ({ id: t.id, name: t.name, active: t.active }))

  const packingTypesPlain = packingTypes.map((t) => ({ id: t.id, name: t.name, deductionWeight: t.deductionWeight }))

  const farmersPlain = farmers.map((f) => ({ id: f.id, name: f.name, nik: f.nik, address: f.address }))
  const customersPlain = customers.map((c) => ({ id: c.id, name: c.name }))
  const draftFarmerIds = todayDraftPurchases.map((p) => p.farmerId)

  const baleItems = recentBales.map((b) => ({
    id: b.id,
    labelCode: b.labelCode,
    grade: b.grade,
    status: b.status,
    tobaccoType: b.tobaccoType.name,
    farmerName: b.purchase.farmer.name,
    purchaseId: b.purchaseId,
    farmerId: b.purchase.farmerId,
    customerName: b.customer?.name ?? null,
    createdBy: b.createdBy,
  }))

  return (
    <div className="space-y-5">
      <GradingShell
        tobaccoTypes={tobaccoTypes}
        leafTypes={leafTypesPlain}
        packingTypes={packingTypesPlain}
        farmers={farmersPlain}
        customers={customersPlain}
        warehouse={lane.warehouse.code}
        warehouseName={lane.warehouse.name}
        laneCode={lane.code}
        laneName={lane.name}
        laneId={lane.id}
        todayDraftFarmerIds={draftFarmerIds}
        baleItems={baleItems}
      />
    </div>
  )
}
