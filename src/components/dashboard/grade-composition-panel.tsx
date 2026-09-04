"use client"

import { useState } from "react"
import { Loader2, Warehouse } from "lucide-react"

import type { GradeBreakdown, WarehouseOption } from "@/lib/actions/dashboard"
import type { DashboardRange } from "@/lib/dashboard-range"
import { GradeComposition } from "./grade-composition"

export function GradeCompositionPanel({
  initialItems,
  range,
  selectable,
  warehouses,
  fixedWarehouseName,
}: {
  initialItems: GradeBreakdown[]
  range: DashboardRange
  selectable: boolean
  warehouses: WarehouseOption[]
  fixedWarehouseName?: string
}) {
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [items, setItems] = useState<GradeBreakdown[]>(() => initialItems)
  const [displaySig, setDisplaySig] = useState(`${range}|all`)

  const sig = `${range}|${warehouseId ?? "all"}`
  const loading = selectable && sig !== displaySig

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        {selectable ? (
          <div className="relative flex-1">
            <Warehouse className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-2" />
            <select
              value={warehouseId ?? ""}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
              className="w-full cursor-pointer appearance-none rounded-md border border-border-soft bg-panel-alt py-1.5 pl-8 pr-8 text-[12px] font-bold text-foreground focus:border-emerald/50 focus:outline-none"
            >
              <option value="">Semua Gudang</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} · {w.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-md border border-border-soft bg-panel-alt px-2.5 py-1.5 text-[12px] font-bold text-foreground">
            <Warehouse className="size-3.5 text-muted-2" />
            {fixedWarehouseName ?? "Gudang Anda"}
            <span className="ml-1 text-[10px] font-medium text-muted-2">(tetap)</span>
          </div>
        )}
        {loading && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-2" />}
      </div>
      {selectable ? <GradeComposition items={items} /> : <GradeComposition items={initialItems} />}
    </div>
  )
}