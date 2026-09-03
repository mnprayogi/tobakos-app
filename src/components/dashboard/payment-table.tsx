"use client"

import { useMemo, useState } from "react"
import { Banknote, Building2, Search } from "lucide-react"

import { formatDateTime, formatCurrency } from "@/lib/utils"
import type { RecentPayment } from "@/lib/actions/dashboard"

export function PaymentTable({ items, empty }: { items: RecentPayment[]; empty: string }) {
  const [q, setQ] = useState("")

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (p) =>
        p.transactionCode.toLowerCase().includes(term) ||
        p.farmerName.toLowerCase().includes(term) ||
        p.method.toLowerCase().includes(term)
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
            placeholder="Cari transaksi / petani / metode…"
            className="w-full rounded-md border border-border-soft bg-panel-alt py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-2 focus:border-emerald/50 focus:outline-none"
          />
        </div>
        {q && <span className="text-[10.5px] font-mono text-muted-2">{filtered.length} hasil</span>}
      </div>
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada pembayaran yang cocok.
                </td>
              </tr>
            )}
            {filtered.map((p) => {
              const isTransfer = p.method === "TRANSFER"
              const MethodIcon = isTransfer ? Building2 : Banknote
              return (
                <tr key={p.id}>
                  <td className="border-b border-border-soft py-2 pr-2 font-mono text-foreground">{p.transactionCode}</td>
                  <td className="border-b border-border-soft px-2 py-2 text-foreground">{p.farmerName}</td>
                  <td className="border-b border-border-soft px-2 py-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-panel-alt px-2 py-0.5 text-[10.5px] font-bold text-muted-2"
                      title={[
                        p.bankAccount ? `${p.bankAccount.bankName} · ${p.bankAccount.accountNumber}` : null,
                        p.recipientAccount ? `Ke: ${p.recipientAccount}` : null,
                      ].filter(Boolean).join("\n")}
                    >
                      <MethodIcon className="size-3" />
                      {p.method}
                      {isTransfer && p.bankAccount && (
                        <span className="font-mono text-[9.5px] text-muted-2">· {p.bankAccount.accountNumber.slice(-4)}</span>
                      )}
                    </span>
                  </td>
                  <td className="border-b border-border-soft px-2 py-2 text-right font-mono font-bold text-emerald">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="border-b border-border-soft py-2 pl-2 text-right font-mono text-[11px] text-muted-2">
                    {formatDateTime(p.paidAt)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
