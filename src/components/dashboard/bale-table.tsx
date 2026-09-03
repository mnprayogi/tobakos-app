"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"

import { formatDateTime, formatCurrency } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import type { RecentBale } from "@/lib/actions/dashboard"

export function BaleTable({ items, empty }: { items: RecentBale[]; empty: string }) {
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (b) =>
        b.labelCode.toLowerCase().includes(term) ||
        b.farmerName.toLowerCase().includes(term) ||
        b.grade.toLowerCase().includes(term) ||
        (b.customerName ?? "").toLowerCase().includes(term)
    )
  }, [items, q])

  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari barcode / petani / grade…"
            className="w-full rounded-md border border-border-soft bg-panel-alt py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-2 focus:border-emerald/50 focus:outline-none"
          />
        </div>
        {q && <span className="text-[10.5px] font-mono text-muted-2">{filtered.length} hasil</span>}
      </div>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada bale yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((b) => (
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
    </div>
  )
}
