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
  title?: string
  value: number
}

export function MiniBarChart({
  rows,
  formatValue = formatCompact,
  labelStep = 1,
  showValues = true,
}: {
  rows: MiniBarChartRow[]
  formatValue?: (v: number) => string
  labelStep?: number
  showValues?: boolean
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  const many = rows.length > 14
  const BAR_MAX = 132

  return (
    <div>
      <div className="relative h-40">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[20px]" aria-hidden>
          <div className="absolute inset-x-0 bottom-1/2 border-t border-dashed border-border-soft/70" />
          <div className="absolute inset-x-0 bottom-1/4 border-t border-dashed border-border-soft/70" />
        </div>
        <div className="relative flex h-full items-stretch gap-1.5">
          {rows.map((r, i) => {
            const barH = max > 0 ? Math.max(Math.round((r.value / max) * BAR_MAX), 4) : 4
            const isLast = i === rows.length - 1
            return (
              <div
                key={i}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                title={`${r.title ?? r.label}: ${formatValue(r.value)}`}
              >
                {showValues && (
                  <span className="max-w-full truncate font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                    {formatValue(r.value)}
                  </span>
                )}
                <div
                  className={cn(
                    "w-full shrink-0 rounded-t-[3px] transition-colors",
                    isLast
                      ? "bg-gradient-to-t from-amber/60 to-amber"
                      : "bg-gradient-to-t from-emerald/55 to-emerald"
                  )}
                  style={{ height: `${barH}px` }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-border-soft pb-0.5 pt-1">
        {rows.map((r, i) => {
          const show = i % labelStep === 0 || i === rows.length - 1
          return (
            <span
              key={i}
              title={r.title ?? r.label}
              className={cn(
                "min-w-0 flex-1 truncate text-center font-mono text-[9px] leading-tight text-muted-2",
                many ? "text-[8px]" : "text-[9px]",
                !show && "opacity-0"
              )}
            >
              {r.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}