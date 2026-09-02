import { prisma } from "@/lib/db"
import { MasterDataClient } from "./client"

export default async function MasterDataPage() {
  const [farmers, tobaccoTypes, leafTypes, packingTypes, grades, users, warehouses, lanes, customers, bankAccounts] = await Promise.all([
    prisma.farmer.findMany({ orderBy: { name: "asc" } }),
    prisma.tobaccoType.findMany({ orderBy: { name: "asc" }, include: { grades: true } }),
    prisma.leafType.findMany({ orderBy: { name: "asc" } }),
    prisma.packingType.findMany({ orderBy: { name: "asc" } }),
    prisma.tobaccoGrade.findMany({
      orderBy: [{ tobaccoTypeId: "asc" }, { name: "asc" }],
      include: { tobaccoType: true },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        laneId: true,
        customerId: true,
        lane: { include: { warehouse: true } },
        customer: { select: { id: true, name: true } },
      },
    }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
    prisma.lane.findMany({
      orderBy: [{ warehouseId: "asc" }, { code: "asc" }],
      include: { warehouse: true },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.bankAccount.findMany({
      orderBy: [{ bankName: "asc" }, { accountNumber: "asc" }],
      include: { warehouse: { select: { id: true, code: true, name: true } } },
    }),
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
      bankAccounts={bankAccounts}
    />
  )
}
