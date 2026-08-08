import { formatDateTime, formatCurrency } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import type { RecentBale } from "@/lib/actions/dashboard"

export function BaleTable({ items, empty }: { items: RecentBale[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="border-b border-border-soft pb-2 pr-2 text-left text-[10px] font-bold uppercase text-muted-2">Barcode</th>
            <th className="border-b border-border-soft px-2 pb-2 text-left text-[10px] font-bold uppercase text-muted-2">Petani</th>
            <th className="border-b border-border-soft px-2 pb-2 text-left text-[10px] font-bold uppercase text-muted-2">Grade</th>
            <th className="border-b border-border-soft px-2 pb-2 text-left text-[10px] font-bold uppercase text-muted-2">Customer</th>
            <th className="border-b border-border-soft px-2 pb-2 text-right text-[10px] font-bold uppercase text-muted-2">Netto</th>
            <th className="border-b border-border-soft px-2 pb-2 text-right text-[10px] font-bold uppercase text-muted-2">Subtotal</th>
            <th className="border-b border-border-soft pb-2 pl-2 text-right text-[10px] font-bold uppercase text-muted-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id}>
              <td className="border-b border-border-soft py-2 pr-2 font-mono text-foreground">
                {b.labelCode}
                <span className="block text-[10px] text-muted-2">{formatDateTime(b.createdAt)}</span>
              </td>
              <td className="border-b border-border-soft px-2 py-2 text-foreground">{b.farmerName}</td>
              <td className="border-b border-border-soft px-2 py-2 font-mono text-foreground">{b.grade}</td>
              <td className="border-b border-border-soft px-2 py-2 text-muted-foreground">{b.customerName ?? "—"}</td>
              <td className="border-b border-border-soft px-2 py-2 text-right font-mono text-foreground">
                {b.netWeight != null ? `${b.netWeight.toFixed(1)} kg` : "—"}
              </td>
              <td className="border-b border-border-soft px-2 py-2 text-right font-mono font-bold text-amber">
                {formatCurrency(b.subtotal)}
              </td>
              <td className="border-b border-border-soft py-2 pl-2 text-right">
                <StatusPill status={b.status as "GRADED" | "WEIGHED" | "CLOSED"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
