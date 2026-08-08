import { cn } from "@/lib/utils"

export function formatCompact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(".", ",")} M`
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} jt`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0).replace(".", ",")} rb`
  return String(Math.round(n))
}

export interface MiniBarChartRow {
  label: string
  value: number
}

export function MiniBarChart({
  rows,
  formatValue = formatCompact,
}: {
  rows: MiniBarChartRow[]
  formatValue?: (v: number) => string
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)

  return (
    <div>
      <div className="flex h-28 items-end gap-1.5">
        {rows.map((r, i) => {
          const pct = max > 0 ? Math.max((r.value / max) * 100, 4) : 4
          const isLast = i === rows.length - 1
          return (
            <div
              key={i}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${r.label}: ${r.value}`}
            >
              <span className="max-w-full truncate font-mono text-[9px] font-bold text-muted-2">
                {formatValue(r.value)}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-[3px] transition-colors",
                  isLast ? "bg-amber" : "bg-emerald/70 hover:bg-emerald"
                )}
                style={{ height: `${pct}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {rows.map((r, i) => (
          <span
            key={i}
            className="min-w-0 flex-1 truncate text-center font-mono text-[9px] text-muted-2"
          >
            {r.label}
          </span>
        ))}
      </div>
    </div>
  )
}
