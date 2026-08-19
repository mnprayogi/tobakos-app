"use client"

import { Fragment, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { DebtFarmer, DebtStatus } from "@/lib/actions/finance"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils"
import { ChevronDown, ChevronRight, Search, Warehouse, HandCoins } from "lucide-react"
import { BuktiLunasDialog } from "@/components/admin/bukti-lunas-dialog"
import {
  PaymentDialog,
  type PayPurchase,
} from "@/components/admin/payment-dialog"
import { PageHeader } from "@/components/shared/page-header"
import type { WarehouseScope } from "@/lib/actions/scope"
import { useSse } from "@/hooks/useSse"

const statusStyle: Record<DebtStatus, string> = {
  HUTANG: "bg-amber/12 text-amber border border-amber/35",
  DP: "bg-emerald/12 text-emerald border border-emerald/35",
  LUNAS: "bg-blue/12 text-blue border border-blue/40",
}

const statusLabel: Record<DebtStatus, string> = {
  HUTANG: "Hutang",
  DP: "Sebagian (DP)",
  LUNAS: "Lunas",
}

type DebtFilter = "SEMUA" | DebtStatus

const FILTERS: { key: DebtFilter; label: string }[] = [
  { key: "SEMUA", label: "Semua" },
  { key: "HUTANG", label: "Hutang" },
  { key: "DP", label: "Sebagian (DP)" },
  { key: "LUNAS", label: "Lunas" },
]

const filterActiveStyle: Record<DebtFilter, string> = {
  SEMUA: "bg-emerald text-primary-foreground border-emerald",
  HUTANG: "bg-amber/15 text-amber border-amber/40",
  DP: "bg-emerald/15 text-emerald border-emerald/40",
  LUNAS: "bg-blue/15 text-blue border-blue/40",
}

export function DebtClient({
  farmers,
  role,
  scope,
}: {
  farmers: DebtFarmer[]
  role: string
  scope: WarehouseScope
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [receiptTarget, setReceiptTarget] = useState<number | null>(null)
  const [payTarget, setPayTarget] = useState<PayPurchase | null>(null)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<DebtFilter>("SEMUA")

  useSse(null, (event) => {
    if (
      event.type === "purchase.approved" ||
      event.type === "payment.recorded" ||
      event.type === "payment.voided" ||
      event.type === "purchase.reopened" ||
      event.type === "loan.updated"
    ) {
      router.refresh()
    }
  })

  const totalOutstanding = farmers.reduce((s, f) => s + f.sisa, 0)
  const totalPaid = farmers.reduce((s, f) => s + f.totalDibayar, 0)
  const farmersWithDebt = farmers.filter((f) => f.sisa > 0.005).length

  const counts = useMemo(() => {
    const c: Record<DebtFilter, number> = { SEMUA: farmers.length, HUTANG: 0, DP: 0, LUNAS: 0 }
    for (const f of farmers) c[f.status]++
    return c
  }, [farmers])

  const filteredFarmers = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = farmers
    if (q) {
      list = list.filter(
        (f) =>
          f.farmerName.toLowerCase().includes(q) ||
          (f.farmerNik ?? "").toLowerCase().includes(q)
      )
    }
    if (filter !== "SEMUA") list = list.filter((f) => f.status === filter)
    return list
  }, [farmers, query, filter])

  function toggle(farmerId: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(farmerId)) next.delete(farmerId)
      else next.add(farmerId)
      return next
    })
  }

  function handlePaid() {
    router.refresh()
    setPayTarget(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={HandCoins}
        title="Hutang Petani"
        subtitle="Rekap tagihan, pembayaran bertahap & sisa per petani"
      >
        {scope.mode === "scoped" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-alt border border-border-soft px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            <Warehouse className="w-3.5 h-3.5 text-emerald" />
            Gudang: {scope.warehouseName}
          </span>
        )}
      </PageHeader>

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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-2" />
          <input
            type="text"
            placeholder="Cari nama petani / NIK…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full pl-9 pr-3 bg-panel-alt border border-border-soft text-foreground text-[12px] rounded-lg outline-none placeholder:text-muted-2"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`h-9 px-3 rounded-lg border text-[12px] font-bold cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? filterActiveStyle[f.key]
                    : "bg-panel-alt text-muted-foreground border-border-soft hover:border-emerald/50"
                }`}
              >
                {f.label}
                <span className="font-mono text-[10px] opacity-80">{counts[f.key]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {filteredFarmers.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">Tidak ada data hutang.</p>
        )}
        {filteredFarmers.length > 0 && (
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
              {filteredFarmers.map((f) => {
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
                            {f.purchases.map((p) => {
                              const payPurchase: PayPurchase = {
                                id: p.id,
                                transactionCode: p.transactionCode,
                                farmerName: f.farmerName,
                                totalPrice: p.totalPrice,
                                paidAmount: p.paidAmount,
                                remaining: p.remaining,
                                payments: p.payments,
                                loanBalance: f.loanBalance,
                              }
                              return (
                                <div key={p.id} className="rounded-lg border border-border-soft bg-panel-alt p-3">
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-emerald text-xs">{p.transactionCode}</span>
                                    <span className="text-[10.5px] text-muted-2 font-mono">{formatDate(p.transactionDate)}</span>
                                    <span className="text-[10.5px] text-muted-2">({p.itemCount} bale)</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {p.derived !== "LUNAS" && (
                                      <button
                                        type="button"
                                        onClick={() => setPayTarget(payPurchase)}
                                        className="text-[10.5px] font-bold text-emerald cursor-pointer hover:underline"
                                      >
                                        Catat Pembayaran
                                      </button>
                                    )}
                                    {p.derived === "LUNAS" && (
                                      <button
                                        type="button"
                                        onClick={() => setReceiptTarget(p.id)}
                                        className="text-[10.5px] font-bold text-emerald cursor-pointer hover:underline"
                                      >
                                        Cetak Bukti
                                      </button>
                                    )}
                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle[p.derived]}`}>
                                      {statusLabel[p.derived]}
                                    </span>
                                  </div>
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
                              )
                            })}
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

      <PaymentDialog
        purchase={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={handlePaid}
        canVoid={role === "SUPER_ADMIN" || role === "OWNER"}
      />

      <BuktiLunasDialog
        purchaseId={receiptTarget}
        onClose={() => setReceiptTarget(null)}
      />
    </div>
  )
}
