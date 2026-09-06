import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/db"

export const MASTER_TAG = "master"

const MASTER_REVALIDATE = 600

export interface CachedGrade {
  id: number
  name: string
  defaultPrice: number
}

export interface CachedTobaccoType {
  id: number
  name: string
  active: boolean
  grades: CachedGrade[]
}

export interface CachedLeafType {
  id: number
  name: string
  active: boolean
}

export interface CachedPackingType {
  id: number
  name: string
  deductionWeight: number
}

export interface CachedFarmer {
  id: number
  name: string
  nik: string | null
  phone: string | null
  address: string | null
}

export interface CachedCustomer {
  id: number
  name: string
  phone: string | null
  address: string | null
}

export const getCachedActiveTobaccoTypes = unstable_cache(
  async (): Promise<CachedTobaccoType[]> => {
    const rows = await prisma.tobaccoType.findMany({
      where: { active: true },
      include: { grades: true },
    })
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      active: t.active,
      grades: t.grades.map((g) => ({ id: g.id, name: g.name, defaultPrice: Number(g.defaultPrice) })),
    }))
  },
  ["master", "active-tobacco-types"],
  { revalidate: MASTER_REVALIDATE, tags: [MASTER_TAG] },
)

export const getCachedActiveLeafTypes = unstable_cache(
  async (): Promise<CachedLeafType[]> => {
    const rows = await prisma.leafType.findMany({ where: { active: true } })
    return rows.map((t) => ({ id: t.id, name: t.name, active: t.active }))
  },
  ["master", "active-leaf-types"],
  { revalidate: MASTER_REVALIDATE, tags: [MASTER_TAG] },
)

export const getCachedPackingTypes = unstable_cache(
  async (): Promise<CachedPackingType[]> => {
    const rows = await prisma.packingType.findMany({ orderBy: { name: "asc" } })
    return rows.map((t) => ({ id: t.id, name: t.name, deductionWeight: t.deductionWeight }))
  },
  ["master", "packing-types"],
  { revalidate: MASTER_REVALIDATE, tags: [MASTER_TAG] },
)

export const getCachedFarmers = unstable_cache(
  async (): Promise<CachedFarmer[]> => {
    const rows = await prisma.farmer.findMany({ orderBy: { name: "asc" } })
    return rows.map((f) => ({ id: f.id, name: f.name, nik: f.nik, phone: f.phone, address: f.address }))
  },
  ["master", "farmers"],
  { revalidate: MASTER_REVALIDATE, tags: [MASTER_TAG] },
)

export const getCachedCustomers = unstable_cache(
  async (): Promise<CachedCustomer[]> => {
    const rows = await prisma.customer.findMany({ orderBy: { name: "asc" } })
    return rows.map((c) => ({ id: c.id, name: c.name, phone: c.phone, address: c.address }))
  },
  ["master", "customers"],
  { revalidate: MASTER_REVALIDATE, tags: [MASTER_TAG] },
)