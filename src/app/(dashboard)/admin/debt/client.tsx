"use client"

import { Fragment, useState } from "react"
import type { DebtFarmer, DebtStatus } from "@/lib/actions/finance"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { ChevronDown, ChevronRight } from "lucide-react"

const statusStyle: Record<DebtStatus, string> = {
  HUTANG: "bg-amber/12 text-amber border border-amber/35",
  DP: "bg-emerald/12 text-emerald border border-emerald/35",
  LUNAS: "bg-muted/12 text-muted border border-border",
}

const statusLabel: Record<DebtStatus, string> = {
  HUTANG: "Hutang",
  DP: "Sebagian (DP)",
  LUNAS: "Lunas",
}

export function DebtClient({ farmers }: { farmers: DebtFarmer[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const totalOutstanding = farmers.reduce((s, f) => s + f.sisa, 0)
  const totalPaid = farmers.reduce((s, f) => s + f.totalDibayar, 0)
  const farmersWithDebt = farmers.filter((f) => f.sisa > 0.005).length

  function toggle(farmerId: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(farmerId)) next.delete(farmerId)
      else next.add(farmerId)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">Hutang Petani</h1>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Total Sisa Tagihan</p>
          <p className="font-mono font-bold text-2xl text-red-deduction">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Total Dibayar</p>
          <p className="font-mono font-bold text-2xl text-emerald">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Petani Berhutang</p>
          <p className="font-mono font-bold text-2xl text-amber">{farmersWithDebt}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {farmers.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">Tidak ada transaksi hutang.</p>
        )}
        {farmers.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft" />
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Petani</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">NIK</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total Tagihan</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total Dibayar</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Sisa</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Status</th>
              </tr>
            </thead>
            <tbody>
              {farmers.map((f) => {
                const isOpen = expanded.has(f.farmerId)
                return (
                  <Fragment key={f.farmerId}>
                    <tr className="cursor-pointer" onClick={() => toggle(f.farmerId)}>
                      <td className="py-2 pr-2 border-b border-border-soft">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-muted-2" /> : <ChevronRight className="w-4 h-4 text-muted-2" />}
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft font-bold text-foreground">{f.farmerName}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-muted-foreground">{f.farmerNik ?? "—"}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{formatCurrency(f.totalTagihan)}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-emerald">{formatCurrency(f.totalDibayar)}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono font-bold text-foreground">{formatCurrency(f.sisa)}</td>
                      <td className="py-2 pl-2 border-b border-border-soft">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle[f.status]}`}>
                          {statusLabel[f.status]}
                        </span>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="py-2 pl-8 pr-2 border-b border-border-soft">
                          <div className="space-y-3">
                            {f.purchases.map((p) => (
                              <div key={p.id} className="rounded-lg border border-border-soft bg-panel-alt p-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-emerald text-xs">{p.transactionCode}</span>
                                    <span className="text-[10.5px] text-muted-2 font-mono">{formatDate(p.transactionDate)}</span>
                                    <span className="text-[10.5px] text-muted-2">({p.itemCount} bale)</span>
                                  </div>
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle[p.derived]}`}>
                                    {statusLabel[p.derived]}
                                  </span>
                                </div>
                                <div className="flex gap-6 mt-2 text-[11.5px] flex-wrap">
                                  <span className="text-muted-foreground">Tagihan: <b className="font-mono text-foreground">{formatCurrency(p.totalPrice)}</b></span>
                                  <span className="text-muted-foreground">Dibayar: <b className="font-mono text-emerald">{formatCurrency(p.paidAmount)}</b></span>
                                  <span className="text-muted-foreground">Sisa: <b className="font-mono text-red-deduction">{formatCurrency(p.remaining)}</b></span>
                                </div>

                                {p.payments.length > 0 && (
                                  <div className="mt-2.5 border-t border-border-soft pt-2">
                                    <p className="text-[9.5px] uppercase font-bold text-muted-2 mb-1">Riwayat Pembayaran</p>
                                    <div className="space-y-1">
                                      {p.payments.map((pay) => (
                                        <div key={pay.id} className="flex items-center justify-between text-[11px]">
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-foreground">{formatCurrency(pay.amount)}</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${pay.method === "TUNAI" ? "bg-emerald/12 text-emerald" : "bg-amber/12 text-amber"}`}>
                                              {pay.method}
                                            </span>
                                            {pay.loanDeduction > 0 && (
                                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-deduction/12 text-red-deduction">
                                                Hutang −{formatCurrency(pay.loanDeduction)}
                                              </span>
                                            )}
                                            {pay.note && <span className="text-muted-2 text-[10px] italic">{pay.note}</span>}
                                          </div>
                                          <span className="text-muted-2 text-[10px] font-mono">
                                            {formatDateTime(pay.paidAt)} · {pay.paidBy ?? "—"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
