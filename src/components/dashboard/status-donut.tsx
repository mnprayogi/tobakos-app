import Link from "next/link"
import { cn } from "@/lib/utils"
import type { StatusCount } from "@/lib/actions/dashboard"

const DONUT_COLORS: Record<string, string> = {
  DRAFT: "#f2b64c",
  WEIGHED: "#22c98d",
  APPROVED: "#a78bfa",
  PAID: "#60a5fa",
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  WEIGHED: "Siap dibayar",
  APPROVED: "Utang",
  PAID: "Lunas",
}

export function StatusDonut({
  data,
  linkToTransactions = true,
}: {
  data: StatusCount[]
  linkToTransactions?: boolean
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const R = 40
  const C = 2 * Math.PI * R

  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Belum ada transaksi.</p>
  }

  const segments = data.filter((d) => d.count > 0).reduce<{ status: string; count: number; start: number; end: number }[]>(
    (acc, d) => {
      const start = acc.length > 0 ? acc[acc.length - 1].end : 0
      acc.push({ ...d, start, end: start + d.count })
      return acc
    },
    []
  )

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border-soft)" strokeWidth="13" />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[s.status] ?? "var(--muted-2)"}
              strokeWidth="13"
              strokeDasharray={`${((s.end - s.start) / total) * C} ${C}`}
              strokeDashoffset={(-(s.start / total) * C).toFixed(2)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold text-foreground">{total}</span>
          <span className="text-[9px] uppercase tracking-[0.1em] text-muted-2">Transaksi</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d) => {
          const label = STATUS_LABEL[d.status] ?? d.status
          const inner = (
            <>
              <span className="flex items-center gap-2 shrink-0 whitespace-nowrap text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: DONUT_COLORS[d.status] ?? "var(--muted-2)" }}
                />
                {label}
              </span>
              <span className="mx-2 min-w-0 flex-1 border-b border-dotted border-border-soft" aria-hidden />
              <span className="shrink-0 font-mono font-bold tabular-nums text-foreground">{d.count}</span>
            </>
          )
          const cls = "flex items-center text-[12px]"
          return linkToTransactions ? (
            <li key={d.status}>
              <Link href={`/admin/transactions?status=${encodeURIComponent(d.status)}`} className={cn(cls, "rounded px-1 -mx-1 transition-colors hover:bg-panel-alt")}>
                {inner}
              </Link>
            </li>
          ) : (
            <li key={d.status} className={cls}>
              {inner}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
