"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { reopenTransaction } from "@/lib/actions/finance"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { Pagination } from "@/components/shared/pagination"
import {
  PaymentDialog,
  type PayPurchase,
  type PaymentUpdate,
} from "@/components/admin/payment-dialog"
import { BuktiLunasDialog } from "@/components/admin/bukti-lunas-dialog"

interface PurchaseItem {
  id: number
  status: string
  labelCode: string
  grade: string
  netWeight: number | null
  pricePerKg: number
  subtotal: number
}

interface Payment {
  id: number
  amount: number
  method: string
  note: string | null
  paidBy: string | null
  paidAt: Date
  loanDeduction: number
}

interface Purchase {
  id: number
  transactionCode: string
  farmer: { name: string }
  transactionDate: Date
  totalItems: number
  totalNetWeight: number
  totalPrice: number
  paidAmount: number
  originalTotalPrice: number | null
  priceReviewNote: string | null
  status: string
  createdBy: string | null
  weighedBy: string | null
  approvedBy: string | null
  paidBy: string | null
  items: PurchaseItem[]
  payments: Payment[]
  loanBalance: number
}

interface TransactionsClientProps {
  purchases: Purchase[]
  total: number
  page: number
  pageSize: number
  q: string
  status: string
  statusCounts: Record<string, number>
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "DRAFT", label: "Draft" },
  { key: "WEIGHED", label: "Menunggu" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "PAID", label: "Lunas" },
]

const filterActiveStyle: Record<string, string> = {
  ALL: "bg-emerald text-primary-foreground border-emerald",
  DRAFT: "bg-amber/15 text-amber border-amber/40",
  WEIGHED: "bg-emerald/15 text-emerald border-emerald/40",
  APPROVED: "bg-emerald/15 text-emerald border-emerald/40",
  PAID: "bg-blue/15 text-blue border-blue/40",
}

function buildTxnUrl(opts: { q: string; status: string; page: number; pageSize: number }) {
  const params = new URLSearchParams()
  if (opts.q) params.set("q", opts.q)
  if (opts.status !== "ALL") params.set("status", opts.status)
  params.set("page", String(opts.page))
  params.set("pageSize", String(opts.pageSize))
  const s = params.toString()
  return `/admin/transactions${s ? `?${s}` : ""}`
}

function deriveStatus(p: Purchase): string | null {
  if (p.status !== "APPROVED") return null
  const remaining = Math.round((p.totalPrice - p.paidAmount) * 100) / 100
  if (remaining <= 0.005) return "Lunas"
  if (p.paidAmount <= 0.005) return "Hutang"
  return "Sebagian (DP)"
}

export function TransactionsClient({
  purchases: initial,
  total,
  page,
  pageSize,
  q,
  status,
  statusCounts,
}: TransactionsClientProps) {
  const router = useRouter()
  const [purchases, setPurchases] = useState(initial)
  const [prevInitial, setPrevInitial] = useState(initial)
  if (initial !== prevInitial) {
    setPrevInitial(initial)
    setPurchases(initial)
  }
  const [query, setQuery] = useState(q)
  const [statusFilter, setStatusFilter] = useState(status)
  const [payTarget, setPayTarget] = useState<PayPurchase | null>(null)
  const [receiptTarget, setReceiptTarget] = useState<number | null>(null)

  useEffect(() => {
    if (query === q) return
    const t = setTimeout(() => {
      router.replace(buildTxnUrl({ q: query, status: statusFilter, page: 1, pageSize }))
    }, 350)
    return () => clearTimeout(t)
  }, [query, q, statusFilter, pageSize, router])

  function handlePaid(updated: PaymentUpdate) {
    setPurchases((prev) =>
      prev.map((p) =>
        p.id === updated.id
          ? {
              ...p,
              status: updated.paidOff ? "PAID" : "APPROVED",
              paidAmount: updated.paidAmount,
              payments: updated.payment ? [...p.payments, updated.payment] : p.payments,
              loanBalance: updated.loanBalance ?? p.loanBalance,
            }
          : p
      )
    )
    if (updated.paidOff) setReceiptTarget(updated.id)
  }

  async function handleReopen(id: number) {
    if (!confirm("Buka kembali transaksi ini? (hanya jika belum ada pembayaran)")) return
    try {
      await reopenTransaction(id)
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: "WEIGHED", paidAmount: 0, approvedBy: null, paidBy: null } : p
        )
      )
      toast.success("Transaksi dibuka kembali")
    } catch (err) { toast.error((err as Error).message) }
  }

  function changeStatus(next: string) {
    setStatusFilter(next)
    router.replace(buildTxnUrl({ q: query, status: next, page: 1, pageSize }))
  }

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">Transaksi</h1>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Cari kode transaksi / petani / NIK…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-9 flex-1 min-w-[200px] px-3 bg-panel-alt border border-border-soft text-foreground text-[12px] rounded-lg outline-none placeholder:text-muted-2"
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => changeStatus(f.key)}
                className={`h-9 px-3 rounded-lg border text-[12px] font-bold cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? filterActiveStyle[f.key]
                    : "bg-panel-alt text-muted-foreground border-border-soft hover:border-emerald/50"
                }`}
              >
                {f.label}
                {statusCounts[f.key] != null && (
                  <span className="font-mono text-[10px] opacity-80">{statusCounts[f.key]}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {purchases.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-muted-2">Tidak ada transaksi.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Kode</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Petani</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Tanggal</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Bale</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total Harga</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Dibayar</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Sisa</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Status</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">PIC Transaksi</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => {
                const allWeighed = p.items.length > 0 && p.items.every((i) => i.status === "WEIGHED" || i.status === "CLOSED")
                const remaining = Math.round((p.totalPrice - p.paidAmount) * 100) / 100
                const derived = deriveStatus(p)
                const payPurchase: PayPurchase = {
                  id: p.id,
                  transactionCode: p.transactionCode,
                  farmerName: p.farmer.name,
                  totalPrice: p.totalPrice,
                  paidAmount: p.paidAmount,
                  remaining,
                  payments: p.payments,
                  loanBalance: p.loanBalance,
                }
                return (
                  <tr key={p.id}>
                    <td className="py-2 pr-2 border-b border-border-soft font-mono text-foreground">{p.transactionCode}</td>
                    <td className="py-2 px-2 border-b border-border-soft text-foreground">{p.farmer.name}</td>
                    <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{formatDate(p.transactionDate)}</td>
                    <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{p.totalItems}</td>
                    <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{p.totalNetWeight.toFixed(2)} kg</td>
                    <td className="py-2 px-2 border-b border-border-soft font-mono text-amber font-bold">
                      {formatCurrency(p.totalPrice)}
                      {p.originalTotalPrice != null && p.originalTotalPrice !== p.totalPrice && (
                        <span className="block text-[10px] font-normal text-muted-2 line-through">{formatCurrency(p.originalTotalPrice)}</span>
                      )}
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft font-mono text-emerald font-bold">{formatCurrency(p.paidAmount)}</td>
                    <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">
                      {formatCurrency(remaining)}
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft">
                      <StatusPill status={p.status as "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"} />
                      {derived && (
                        <span className="block text-[10px] font-bold mt-1 text-muted-foreground">{derived}</span>
                      )}
                      {p.priceReviewNote && (
                        <span className="block text-[10px] text-muted-2 italic mt-1 max-w-[160px] truncate" title={p.priceReviewNote}>
                          {p.priceReviewNote}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft">
                      <div className="space-y-0.5 text-[10.5px] leading-snug">
                        {p.createdBy && <p><span className="text-muted-2">Buat:</span> <span className="font-mono text-foreground">{p.createdBy}</span></p>}
                        {p.weighedBy && <p><span className="text-muted-2">Timbang:</span> <span className="font-mono text-foreground">{p.weighedBy}</span></p>}
                        {p.approvedBy && <p><span className="text-muted-2">Setuju:</span> <span className="font-mono text-foreground">{p.approvedBy}</span></p>}
                        {p.paidBy && <p><span className="text-muted-2">Bayar:</span> <span className="font-mono text-foreground">{p.paidBy}</span></p>}
                        {!p.createdBy && !p.weighedBy && !p.approvedBy && !p.paidBy && (
                          <span className="text-muted-2">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pl-2 border-b border-border-soft">
                      {p.status === "DRAFT" && (
                        <span className="text-[11px] text-muted-2">{allWeighed ? "Menunggu ditimbang Pos 2" : "Proses grading"}</span>
                      )}
                      {p.status === "WEIGHED" && (
                        <Link
                          href={`/admin/transactions/${p.id}/review`}
                          className="text-[11px] font-bold text-emerald cursor-pointer hover:underline"
                        >
                          Review &amp; Setujui
                        </Link>
                      )}
                      {p.status === "APPROVED" && (
                        <div className="flex flex-col gap-1">
                          {remaining > 0.005 && (
                            <button onClick={() => setPayTarget(payPurchase)} className="text-[11px] font-bold text-emerald cursor-pointer hover:underline">
                              Catat Pembayaran
                            </button>
                          )}
                          {remaining <= 0.005 && <span className="text-[11px] text-muted-2">Lunas</span>}
                          {p.paidAmount <= 0.005 && (
                            <button onClick={() => handleReopen(p.id)} className="text-[11px] font-bold text-amber cursor-pointer hover:underline">
                              Buka
                            </button>
                          )}
                        </div>
                      )}
                      {p.status === "PAID" && (
                        <button
                          onClick={() => setReceiptTarget(p.id)}
                          className="text-[11px] font-bold text-emerald cursor-pointer hover:underline"
                        >
                          Cetak Bukti
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}

        {total > 0 && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={(p) => router.replace(buildTxnUrl({ q: query, status: statusFilter, page: p, pageSize }))}
            onPageSizeChange={(s) => router.replace(buildTxnUrl({ q: query, status: statusFilter, page: 1, pageSize: s }))}
          />
        )}
      </div>

      <PaymentDialog
        purchase={payTarget}
        onClose={() => setPayTarget(null)}
        onPaid={handlePaid}
      />

      <BuktiLunasDialog
        purchaseId={receiptTarget}
        onClose={() => setReceiptTarget(null)}
      />
    </div>
  )
}
