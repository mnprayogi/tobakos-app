import { prisma } from "@/lib/db"
import { MasterDataClient } from "./client"

export default async function MasterDataPage() {
  const [farmers, tobaccoTypes, leafTypes, packingTypes, grades, users, warehouses, lanes, customers] = await Promise.all([
    prisma.farmer.findMany({ orderBy: { name: "asc" } }),
    prisma.tobaccoType.findMany({ orderBy: { name: "asc" }, include: { grades: true } }),
    prisma.leafType.findMany({ orderBy: { name: "asc" } }),
    prisma.packingType.findMany({ orderBy: { name: "asc" } }),
    prisma.tobaccoGrade.findMany({
      orderBy: [{ tobaccoTypeId: "asc" }, { name: "asc" }],
      include: { tobaccoType: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, include: { lane: { include: { warehouse: true } } } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
    prisma.lane.findMany({
      orderBy: [{ warehouseId: "asc" }, { code: "asc" }],
      include: { warehouse: true },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ])

  const gradesWithPrice = grades.map((g) => ({ ...g, defaultPrice: Number(g.defaultPrice) }))
  const typesWithGrades = tobaccoTypes.map((t) => ({
    ...t,
    grades: t.grades.map((g) => ({ ...g, defaultPrice: Number(g.defaultPrice) })),
  }))

  return (
    <MasterDataClient
      farmers={farmers}
      tobaccoTypes={typesWithGrades}
      leafTypes={leafTypes}
      packingTypes={packingTypes}
      grades={gradesWithPrice}
      users={users}
      warehouses={warehouses}
      lanes={lanes}
      customers={customers}
    />
  )
}
