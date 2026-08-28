"use client"

import { cn } from "@/lib/utils"
import { DASHBOARD_RANGES } from "@/lib/dashboard-range"
import type { DashboardRange } from "@/lib/dashboard-range"

export function DashboardRangeFilter({
  value,
  onChange,
}: {
  value: DashboardRange
  onChange: (r: DashboardRange) => void
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
      {DASHBOARD_RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={cn(
            "cursor-pointer rounded-md px-3 py-1 text-[11px] font-bold transition-colors",
            value === r.value
              ? "bg-emerald text-primary-foreground"
              : "text-muted-foreground hover:bg-panel-alt hover:text-foreground"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}