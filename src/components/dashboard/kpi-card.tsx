import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

export type KpiTone = "default" | "emerald" | "amber" | "red" | "blue"

const TONE_VALUE: Record<KpiTone, string> = {
  default: "text-foreground",
  emerald: "text-emerald",
  amber: "text-amber",
  red: "text-red-deduction",
  blue: "text-blue",
}

const TONE_ICON: Record<KpiTone, string> = {
  default: "bg-panel-alt text-muted-2 border-border",
  emerald: "bg-emerald/12 text-emerald border-emerald/30",
  amber: "bg-amber/12 text-amber border-amber/30",
  red: "bg-red-deduction/12 text-red-deduction border-red-deduction/30",
  blue: "bg-blue/12 text-blue border-blue/30",
}

export interface KpiDelta {
  value: number
  compare: number
  inverse?: boolean
}

function Chip({ tone, label }: { tone: "up" | "down" | "flat"; label: string }) {
  const cls = {
    up: "text-emerald bg-emerald/10 border-emerald/30",
    down: "text-red-deduction bg-red-deduction/10 border-red-deduction/30",
    flat: "text-muted-2 bg-panel-alt border-border",
  }[tone]
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-bold",
        cls
      )}
    >
      {label}
    </span>
  )
}

function DeltaChip({ value, compare, inverse }: KpiDelta) {
  if (compare <= 0) {
    if (value <= 0) return null
    return <Chip tone="up" label="baru" />
  }
  const pct = ((value - compare) / compare) * 100
  if (Math.abs(pct) < 0.05) return <Chip tone="flat" label="±0%" />
  const rising = pct > 0
  const good = inverse ? !rising : rising
  const formatted = `${Math.abs(pct).toFixed(1).replace(".", ",")}%`
  return <Chip tone={good ? "up" : "down"} label={`${rising ? "↑" : "↓"} ${formatted}`} />
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  delta,
}: {
  label: string
  value: string
  icon?: LucideIcon
  tone?: KpiTone
  delta?: KpiDelta
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
              TONE_ICON[tone]
            )}
          >
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <p className={cn("mt-1.5 font-mono text-[20px] font-bold leading-tight", TONE_VALUE[tone])}>
        {value}
      </p>
      {delta && (
        <div className="mt-1.5">
          <DeltaChip {...delta} />
        </div>
      )}
    </div>
  )
}
