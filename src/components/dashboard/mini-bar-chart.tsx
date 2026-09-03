"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/utils"

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
  fullValue?: number
  baleCount?: number
}

export function MiniBarChart({
  rows,
  formatValue = formatCompact,
  labelStep = 1,
  showValues = true,
  showTooltip = true,
}: {
  rows: MiniBarChartRow[]
  formatValue?: (v: number) => string
  labelStep?: number
  showValues?: boolean
  showTooltip?: boolean
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  const many = rows.length > 14
  const BAR_MAX = 132

  const active = activeIndex != null && rows[activeIndex] ? rows[activeIndex] : null

  const handleMove = (i: number, e: React.MouseEvent<HTMLDivElement>) => {
    setActiveIndex(i)
    if (!containerRef.current) return
    const barLeft = e.currentTarget.offsetLeft
    const barWidth = e.currentTarget.offsetWidth
    containerRef.current.style.setProperty("--tip-left", `${barLeft + barWidth / 2}px`)
    containerRef.current.style.setProperty("--tip-top", `${e.currentTarget.offsetTop}px`)
  }

  return (
    <div ref={containerRef} className="relative">
      {active && showTooltip && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-lg border border-border bg-panel px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: "var(--tip-left, 50%)", top: "var(--tip-top, 12px)" }}
        >
          <div className="font-bold text-foreground">{active.title ?? active.label}</div>
          {active.baleCount != null && (
            <div className="mt-0.5 font-mono text-muted-foreground">{active.baleCount} bale</div>
          )}
          <div className="mt-0.5 font-mono font-bold text-amber">
            {formatCurrency(active.fullValue ?? active.value)}
          </div>
        </div>
      )}
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
                className="relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                onMouseEnter={(e) => handleMove(i, e)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {showValues && (
                  <span className="max-w-full truncate font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                    {formatValue(r.value)}
                  </span>
                )}
                <div
                  className={cn(
                    "w-full shrink-0 rounded-t-[3px] transition-colors",
                    activeIndex === i
                      ? "from-amber/80 to-amber"
                      : isLast
                        ? "bg-gradient-to-t from-amber/60 to-amber"
                        : "bg-gradient-to-t from-emerald/55 to-emerald",
                    showTooltip && "cursor-pointer"
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
