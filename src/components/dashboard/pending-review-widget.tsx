import Link from "next/link"
import { ClipboardCheck } from "lucide-react"

import { formatCurrency } from "@/lib/utils"
import { Panel } from "./panel"

export interface PendingReviewItem {
  id: number
  transactionCode: string
  farmerName: string
  totalPrice: number
}

export function PendingReviewWidget({ items }: { items: PendingReviewItem[] }) {
  const count = items.length
  return (
    <Panel title="Menunggu review" action={count > 0 ? <span className="rounded-full border border-amber/35 bg-amber/12 px-2 py-0.5 font-mono text-[10.5px] font-bold text-amber">{count} transaksi</span> : undefined}>
      {count === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada transaksi menunggu review.</p>
      ) : (
        <ul className="divide-y divide-border-soft">
          {items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber/30 bg-amber/12 text-amber">
                  <ClipboardCheck className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[12px] font-bold text-foreground">{p.transactionCode}</p>
                  <p className="truncate text-[11px] text-muted-2">{p.farmerName}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-[12px] font-bold text-amber">{formatCurrency(p.totalPrice)}</span>
                <Link
                  href={`/admin/transactions/${p.id}/review`}
                  className="rounded-md border border-emerald/30 bg-emerald/10 px-2.5 py-1 text-[11px] font-bold text-emerald transition-colors hover:bg-emerald/15"
                >
                  Review →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
