import type { StatusCount } from "@/lib/actions/dashboard"

const DONUT_COLORS: Record<string, string> = {
  DRAFT: "#f2b64c",
  WEIGHED: "#22c98d",
  APPROVED: "#60a5fa",
  PAID: "#60a5fa",
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  WEIGHED: "Siap dibayar",
  APPROVED: "Hutang",
  PAID: "Lunas",
}

export function StatusDonut({ data }: { data: StatusCount[] }) {
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
          <circle cx="50" cy="50" r={R} fill="none" stroke="#182236" strokeWidth="13" />
          {segments.map((s, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[s.status] ?? "#7c8aa8"}
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
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <li key={d.status} className="flex items-center justify-between gap-3 text-[12px]">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: DONUT_COLORS[d.status] ?? "#7c8aa8" }}
              />
              {STATUS_LABEL[d.status] ?? d.status}
            </span>
            <span className="font-mono font-bold text-foreground">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
