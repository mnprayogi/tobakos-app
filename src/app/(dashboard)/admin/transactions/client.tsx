"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { reopenTransaction, voidTransaction } from "@/lib/actions/finance"
import { getTransactionsExport } from "@/lib/actions/transactions"
import { useSse } from "@/hooks/useSse"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { Pagination } from "@/components/shared/pagination"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Search, Wallet, ReceiptText } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import type { WarehouseScope } from "@/lib/actions/scope"
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
  voidedAt?: Date | null
  voidedBy?: string | null
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
  voidedAt?: Date | null
  voidedBy?: string | null
  voidNote?: string | null
  items: PurchaseItem[]
  payments: Payment[]
  loanBalance: number
  crossLoanBalance: number
}

interface TransactionsClientProps {
  purchases: Purchase[]
  total: number
  page: number
  pageSize: number
  q: string
  status: string
  statusCounts: Record<string, number>
  role: string
  scope: WarehouseScope
  stats: { totalTransactions: number; totalValue: number; totalOutstanding: number }
}

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "DRAFT", label: "Draft" },
  { key: "WEIGHED", label: "Menunggu" },
  { key: "APPROVED", label: "Disetujui" },
  { key: "PAID", label: "Lunas" },
  { key: "VOIDED", label: "Void" },
]

const filterActiveStyle: Record<string, string> = {
  ALL: "bg-emerald text-primary-foreground border-emerald",
  DRAFT: "bg-amber/15 text-amber border-amber/40",
  WEIGHED: "bg-amber/15 text-amber border-amber/40",
  APPROVED: "bg-emerald/15 text-emerald border-emerald/40",
  PAID: "bg-blue/15 text-blue border-blue/40",
  VOIDED: "bg-red-deduction/15 text-red-deduction border-red-deduction/40",
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

export function TransactionsClient({
  purchases: initial,
  total,
  page,
  pageSize,
  q,
  status,
  statusCounts,
  role,
  scope,
  stats,
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
  const [voidTarget, setVoidTarget] = useState<Purchase | null>(null)
  const [exporting, setExporting] = useState(false)

  useSse(null, (event) => {
    if (
      event.type === "purchase.approved" ||
      event.type === "payment.recorded" ||
      event.type === "payment.voided" ||
      event.type === "purchase.reopened" ||
      event.type === "purchase.voided" ||
      event.type === "session.ended" ||
      event.type === "bale.weighed"
    ) {
      router.refresh()
    }
  })

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

  async function handleVoidConfirmed(id: number) {
    setPurchases((prev) => prev.filter((p) => p.id !== id))
  }

  function changeStatus(next: string) {
    setStatusFilter(next)
    router.replace(buildTxnUrl({ q: query, status: next, page: 1, pageSize }))
  }

  async function handleExport() {
    setExporting(true)
    try {
      const rows = await getTransactionsExport(query, statusFilter)
      if (rows.length === 0) throw new Error("Tidak ada transaksi untuk diekspor")
      const { exportTransactionsExcel } = await import("@/lib/export-excel")
      await exportTransactionsExcel(rows)
      toast.success(`Export ${rows.length} transaksi berhasil`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ReceiptText}
        title="Transaksi"
        subtitle="Pantau, review & setujui, negosiasi harga, dan pembayaran bertahap"
      >
        {scope.mode === "scoped" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-alt border border-border-soft px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-emerald" />
            Gudang: {scope.warehouseName}
          </span>
        )}
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Total Transaksi</p>
          <p className="font-mono font-bold text-2xl text-foreground">{stats.totalTransactions}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Total Nilai (Disetujui & Lunas)</p>
          <p className="font-mono font-bold text-2xl text-amber">{formatCurrency(stats.totalValue)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Total Sisa Tagihan</p>
          <p className="font-mono font-bold text-2xl text-red-deduction">{formatCurrency(stats.totalOutstanding)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-2" />
          <input
            type="text"
            placeholder="Cari kode transaksi / petani / NIK…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 w-full pl-9 pr-3 bg-panel-alt border border-border-soft text-foreground text-[12px] rounded-lg outline-none placeholder:text-muted-2"
          />
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="h-9 px-3 rounded-lg border border-emerald/35 bg-emerald/12 text-emerald text-[12px] font-bold cursor-pointer flex items-center gap-1.5 hover:bg-emerald/20 disabled:opacity-50"
        >
          {exporting ? "Mengekspor…" : "Export Excel"}
        </button>
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
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search className="size-4 text-muted-2" />
              </EmptyMedia>
              <EmptyTitle>Tidak ada transaksi</EmptyTitle>
              <EmptyDescription>
                {query || status !== "ALL"
                  ? "Coba ubah kata kunci pencarian atau filter status."
                  : "Belum ada transaksi pembelian pada gudang ini."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
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
                const payPurchase: PayPurchase = {
                  id: p.id,
                  transactionCode: p.transactionCode,
                  farmerName: p.farmer.name,
                  totalPrice: p.totalPrice,
                  paidAmount: p.paidAmount,
                  remaining,
                  payments: p.payments,
                  loanBalance: p.loanBalance,
                  crossLoanBalance: p.crossLoanBalance,
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
                      <StatusPill status={p.status as "DRAFT" | "WEIGHED" | "APPROVED" | "PAID" | "VOIDED"} />
                      {p.status === "VOIDED" && p.voidNote && (
                        <span className="block text-[10px] text-red-deduction/80 italic mt-1 max-w-[160px] truncate" title={`${p.voidedBy ?? ""}: ${p.voidNote}`}>
                          {p.voidNote}
                        </span>
                      )}
                      {p.status !== "VOIDED" && p.priceReviewNote && (
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
                      {p.status === "VOIDED" ? (
                        <span className="text-[11px] text-muted-2">Dibatalkan</span>
                      ) : (
                        <div className="flex flex-col gap-1">
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
                            <>
                              {remaining > 0.005 && (
                                <button onClick={() => setPayTarget(payPurchase)} className="text-left text-[11px] font-bold text-emerald cursor-pointer hover:underline">
                                  Catat Pembayaran
                                </button>
                              )}
                              {remaining <= 0.005 && <span className="text-[11px] text-muted-2">Lunas</span>}
                              {p.paidAmount <= 0.005 && (
                                <button
                                  onClick={() => handleReopen(p.id)}
                                  className="text-left mt-1 pt-1 border-t border-border-soft text-[11px] font-bold text-amber cursor-pointer hover:underline"
                                >
                                  Buka
                                </button>
                              )}
                            </>
                          )}
                          {p.status === "PAID" && (
                            <button
                              onClick={() => setReceiptTarget(p.id)}
                              className="text-left text-[11px] font-bold text-emerald cursor-pointer hover:underline"
                            >
                              Cetak Bukti
                            </button>
                          )}
                          {role === "SUPER_ADMIN" && (
                            <button
                              onClick={() => setVoidTarget(p)}
                              className="text-left mt-1 pt-1 border-t border-border-soft text-[11px] font-bold text-red-deduction cursor-pointer hover:underline"
                            >
                              Void
                            </button>
                          )}
                        </div>
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
        canVoid={role === "SUPER_ADMIN" || role === "OWNER"}
        canDeduct={payTarget ? (payTarget.loanBalance ?? 0) > 0.005 : true}
      />

      <BuktiLunasDialog
        purchaseId={receiptTarget}
        onClose={() => setReceiptTarget(null)}
      />

      <VoidDialog
        purchase={voidTarget}
        onClose={() => setVoidTarget(null)}
        onVoided={handleVoidConfirmed}
      />
    </div>
  )
}

function VoidDialog({
  purchase,
  onClose,
  onVoided,
}: {
  purchase: Purchase | null
  onClose: () => void
  onVoided: (id: number) => void
}) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const open = purchase != null

  useEffect(() => {
    if (open) setNote("")
  }, [open])

  if (!open || !purchase) return null

  const activePayments = purchase.payments.filter((pay) => !pay.voidedAt)
  const paidCash = activePayments.reduce((s, pay) => s + pay.amount, 0)
  const loanCut = activePayments.reduce((s, pay) => s + pay.loanDeduction, 0)

  async function submit() {
    if (!purchase) return
    if (!note.trim()) {
      toast.error("Alasan void wajib diisi")
      return
    }
    setBusy(true)
    try {
      await voidTransaction(purchase.id, note.trim())
      toast.success(`Transaksi ${purchase.transactionCode} dibatalkan`)
      onVoided(purchase.id)
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-red-deduction/35 bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-bold text-red-deduction uppercase tracking-wide">
          Void Transaksi
        </h2>
        <p className="mt-1 font-mono text-[12px] text-foreground">
          {purchase.transactionCode} · {purchase.farmer.name}
        </p>

        <div className="mt-3 rounded-lg border border-border-soft bg-panel-alt p-3 text-[11.5px] space-y-1">
          <p className="text-muted-foreground">
            Status saat ini: <StatusPill status={purchase.status as "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"} />
          </p>
          {activePayments.length > 0 ? (
            <>
              <p className="text-muted-foreground">
                Pembayaran aktif:{" "}
                <span className="font-mono text-emerald font-bold">
                  {activePayments.length}× {formatCurrency(paidCash)}
                </span>
              </p>
              {loanCut > 0.005 && (
                <p className="text-muted-foreground">
                  Potongan hutang ikut dibatalkan:{" "}
                  <span className="font-mono text-amber font-bold">{formatCurrency(loanCut)}</span>{" "}
                  (saldo hutang petani dipulihkan)
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Belum ada pembayaran tercatat.</p>
          )}
          <p className="text-red-deduction/90 pt-1">
            Semua bale & pembayaran transaksi ini dibatalkan permanen dan tidak masuk laporan.
          </p>
        </div>

        <label className="block mt-3 text-[11px] font-bold text-muted-foreground uppercase">
          Alasan Void <span className="text-red-deduction">*</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Contoh: salah input petani / duplikat transaksi"
          className="mt-1 w-full rounded-lg border border-border-soft bg-panel-alt px-3 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-2 focus:border-red-deduction/50 resize-none"
        />

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 px-4 rounded-lg border border-border-soft bg-panel-alt text-[12px] font-bold text-muted-foreground cursor-pointer hover:border-emerald/50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !note.trim()}
            className="h-9 px-4 rounded-lg border border-red-deduction/40 bg-red-deduction/15 text-[12px] font-bold text-red-deduction cursor-pointer hover:bg-red-deduction/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Memproses…" : "Void Permanen"}
          </button>
        </div>
      </div>
    </div>
  )
}
