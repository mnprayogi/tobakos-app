import { formatDateTime, formatCurrency } from "@/lib/utils"
import type { RecentPayment } from "@/lib/actions/dashboard"

export function PaymentTable({ items, empty }: { items: RecentPayment[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="border-b border-border-soft pb-2 pr-2 text-left text-[10px] font-bold uppercase text-muted-2">Transaksi</th>
            <th className="border-b border-border-soft px-2 pb-2 text-left text-[10px] font-bold uppercase text-muted-2">Petani</th>
            <th className="border-b border-border-soft px-2 pb-2 text-left text-[10px] font-bold uppercase text-muted-2">Metode</th>
            <th className="border-b border-border-soft px-2 pb-2 text-right text-[10px] font-bold uppercase text-muted-2">Jumlah</th>
            <th className="border-b border-border-soft pb-2 pl-2 text-right text-[10px] font-bold uppercase text-muted-2">Waktu</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td className="border-b border-border-soft py-2 pr-2 font-mono text-foreground">{p.transactionCode}</td>
              <td className="border-b border-border-soft px-2 py-2 text-foreground">{p.farmerName}</td>
              <td className="border-b border-border-soft px-2 py-2">
                <span className="rounded-full border border-border-soft px-2 py-0.5 text-[10.5px] font-bold text-muted-2">
                  {p.method}
                </span>
              </td>
              <td className="border-b border-border-soft px-2 py-2 text-right font-mono font-bold text-emerald">
                {formatCurrency(p.amount)}
              </td>
              <td className="border-b border-border-soft py-2 pl-2 text-right font-mono text-[11px] text-muted-2">
                {formatDateTime(p.paidAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
