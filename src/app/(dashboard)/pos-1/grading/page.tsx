import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getActiveLanes, getLaneByCode } from "@/lib/actions/lanes"
import { getCurrentUserLane } from "@/lib/lane-resolution"
import { LanePicker } from "@/components/shared/lane-picker"
import { GradingShell } from "@/components/pos-1/grading-shell"
import { getSettingNumber } from "@/lib/settings"

export default async function GradingPage({ searchParams }: { searchParams: Promise<{ lane?: string }> }) {
  const session = await auth()
  const { lane: laneCode } = await searchParams
  const assignedLane = await getCurrentUserLane()

  const lane = assignedLane ?? (laneCode ? await getLaneByCode(laneCode) : null)

  if (!lane) {
    const lanes = await getActiveLanes()
    return (
      <LanePicker
        lanes={lanes}
        title="Pos 1 · Pilih Jalur Kerja"
        subtitle="Tentukan jalur grading yang dipakai perangkat ini."
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
      where: { purchase: { laneId: lane.id } },
      include: {
        purchase: { include: { farmer: true } },
        tobaccoType: true,
        customer: true,
      },
    }),
  ])

  const [maxMoisturePercent, defaultMoisturePercent, defaultWarehouseId] = await Promise.all([
    getSettingNumber("MAX_MOISTURE_PERCENT", 20),
    getSettingNumber("DEFAULT_MOISTURE_PERCENT", 3),
    getSettingNumber("DEFAULT_WAREHOUSE_ID", 1),
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
        maxMoisturePercent={maxMoisturePercent}
        defaultMoisturePercent={defaultMoisturePercent}
        defaultWarehouseId={defaultWarehouseId}
        userName={session?.user.name ?? "Operator"}
      />
    </div>
  )
}
