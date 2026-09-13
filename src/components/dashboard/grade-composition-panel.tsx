import { Warehouse } from "lucide-react"

import type { GradeBreakdown } from "@/lib/actions/dashboard"
import { GradeComposition } from "./grade-composition"

export function GradeCompositionPanel({
  initialItems,
  fixedWarehouseName,
}: {
  initialItems: GradeBreakdown[]
  fixedWarehouseName?: string
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-md border border-border-soft bg-panel-alt px-2.5 py-1.5 text-[12px] font-bold text-foreground">
          <Warehouse className="size-3.5 text-muted-2" />
          {fixedWarehouseName ?? "Semua Gudang"}
          <span className="ml-1 text-[10px] font-medium text-muted-2">(tetap)</span>
        </div>
      </div>
      <GradeComposition items={initialItems} />
    </div>
  )
}