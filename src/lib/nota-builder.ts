import type { NotaItem } from "@/lib/actions/weighing"

export interface NotaPurchase {
  transactionCode: string
  transactionDate: Date
  createdBy: string | null
  weighedBy: string | null
  approvedBy: string | null
  farmer: { name: string; nik: string | null }
  warehouse: { name: string | null; code: string | null } | null
  lane: { code: string | null } | null
  items: {
    grade: string
    grossWeight: number | null
    packingWeight: number | null
    moistureDeduction: number | null
    netWeight: number | null
    subtotal: unknown
    status: string
  }[]
}

export function buildNotaData(purchase: NotaPurchase) {
  const weighedItems = purchase.items.filter(
    (i) => i.status === "WEIGHED" || i.status === "CLOSED"
  )

  const gradeMap = new Map<string, NotaItem>()
  for (const item of weighedItems) {
    const existing = gradeMap.get(item.grade) ?? {
      grade: item.grade,
      count: 0,
      totalGross: 0,
      totalTara: 0,
      totalNet: 0,
      totalSubtotal: 0,
    }
    existing.count++
    existing.totalGross += Number(item.grossWeight ?? 0)
    existing.totalTara += Number(item.packingWeight ?? 0) + Number(item.moistureDeduction ?? 0)
    existing.totalNet += Number(item.netWeight ?? 0)
    existing.totalSubtotal += Number(item.subtotal ?? 0)
    gradeMap.set(item.grade, existing)
  }

  const notaItems = Array.from(gradeMap.values()).sort((a, b) =>
    a.grade.localeCompare(b.grade)
  )

  const totals: NotaItem = {
    grade: "TOTAL",
    count: notaItems.reduce((s, g) => s + g.count, 0),
    totalGross: notaItems.reduce((s, g) => s + g.totalGross, 0),
    totalTara: notaItems.reduce((s, g) => s + g.totalTara, 0),
    totalNet: notaItems.reduce((s, g) => s + g.totalNet, 0),
    totalSubtotal: notaItems.reduce((s, g) => s + g.totalSubtotal, 0),
  }

  return {
    transactionCode: purchase.transactionCode,
    farmerName: purchase.farmer.name,
    farmerNik: purchase.farmer.nik,
    warehouse: purchase.warehouse?.name ?? purchase.warehouse?.code ?? "Gudang",
    laneCode: purchase.lane?.code ?? null,
    createdBy: purchase.createdBy,
    weighedBy: purchase.weighedBy,
    approvedBy: purchase.approvedBy,
    date: purchase.transactionDate.toISOString(),
    items: notaItems,
    totals,
  }
}
