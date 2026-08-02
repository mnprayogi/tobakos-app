import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { canAccess } from "@/lib/roles"
import { getLoansData } from "@/lib/actions/loans"
import { LoansClient } from "./client"

export default async function LoansPage() {
  if (!(await canAccess(["ADMIN", "FINANCE", "OWNER"]))) redirect("/")

  const [loans, farmers] = await Promise.all([
    getLoansData(),
    prisma.farmer.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, nik: true },
    }),
  ])

  return <LoansClient loans={loans} farmers={farmers.map((f) => ({ id: f.id, name: f.name, nik: f.nik }))} />
}
