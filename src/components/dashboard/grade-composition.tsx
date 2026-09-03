import { formatWeight } from "@/lib/utils"
import type { GradeBreakdown } from "@/lib/actions/dashboard"

export function GradeComposition({ items }: { items: GradeBreakdown[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Belum ada bale lunas.</p>
  }

  const totalBales = items.reduce((s, b) => s + b.baleCount, 0)
  const totalNetWeight = items.reduce((s, b) => s + b.netWeight, 0)
  const totalSubtotal = items.reduce((s, b) => s + b.subtotal, 0)
  const avgPrice = totalNetWeight > 0 ? totalSubtotal / totalNetWeight : 0

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="pb-1.5 pr-2 text-left text-[10px] font-bold uppercase text-muted-2" colSpan={2}>
                Grade / Komposisi
              </th>
              <th className="px-2 pb-1.5 text-right text-[10px] font-bold uppercase text-muted-2">Bale</th>
              <th className="pb-1.5 pl-2 text-right text-[10px] font-bold uppercase text-muted-2">Netto</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => (
              <tr key={b.grade} className="align-middle">
                <td className="w-24 py-2 pr-2 sm:w-32">
                  <span className="font-bold text-foreground">{b.grade}</span>
                </td>
                <td className="min-w-[120px] py-2 pr-3">
                  <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-panel-alt">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald"
                      style={{ width: `${Math.min(100, b.netWeightPercent)}%` }}
                    />
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-foreground">{b.baleCount}</td>
                <td className="py-2 pl-2 text-right">
                  <span className="font-mono tabular-nums text-foreground">{formatWeight(b.netWeight)}</span>
                  <span className="ml-1.5 font-mono text-[10px] text-muted-2">({b.netWeightPercent.toFixed(1)}%)</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2">Total</span>
        <div className="flex flex-wrap items-baseline justify-end gap-x-4 gap-y-1">
          <span className="font-mono text-base font-bold text-foreground">
            {totalBales}
            <span className="ml-1 text-[11px] font-bold text-muted-2">bale</span>
          </span>
          <span className="font-mono text-base font-bold text-foreground">{formatWeight(totalNetWeight)}</span>
          <span className="font-mono text-base font-bold text-amber">
            {Math.round(avgPrice).toLocaleString("id-ID")}
            <span className="ml-1 text-[11px] font-bold text-muted-2">/kg rata²</span>
          </span>
        </div>
      </div>
    </div>
  )
}
