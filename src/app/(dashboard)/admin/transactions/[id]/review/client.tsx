"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { reviewAndApprove } from "@/lib/actions/finance"
import { negotiateItems, roundMoney } from "@/lib/calculations"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { Pagination } from "@/components/shared/pagination"

interface ReviewItem {
  id: number
  labelCode: string
  grade: string
  customerName: string | null
  netWeight: number | null
  pricePerKg: number
  priceAdjustment: number
  subtotal: number
}

interface ReviewPurchase {
  id: number
  transactionCode: string
  farmerName: string
  transactionDate: Date
  totalItems: number
  totalNetWeight: number
  totalPrice: number
  status: string
  items: ReviewItem[]
}

export function ReviewClient({ purchase }: { purchase: ReviewPurchase }) {
  const router = useRouter()
  const [newTotal, setNewTotal] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [query, setQuery] = useState("")
  const [grade, setGrade] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const currentTotal = purchase.totalPrice

  const preview = useMemo(() => {
    const parsed = newTotal === "" ? NaN : Number(newTotal)
    const valid = !Number.isNaN(parsed) && parsed >= 0
    if (!valid || Math.abs(parsed - currentTotal) <= 0.005) return null
    try {
      const result = negotiateItems(
        purchase.items.map((i) => ({ netWeight: Number(i.netWeight ?? 0), pricePerKg: i.pricePerKg })),
        currentTotal,
        parsed
      )
      const byId = new Map<number, { adjustment: number; newSubtotal: number }>()
      purchase.items.forEach((i, idx) => {
        byId.set(i.id, { adjustment: result.adjustmentsPerKg[idx], newSubtotal: result.subtotals[idx] })
      })
      return {
        inputTotal: parsed,
        exactTotal: result.exactTotal,
        targetTotal: result.targetTotal,
        roundingDiff: result.roundingDiff,
        adjustmentPerKg: result.adjustmentPerKg,
        byId,
      }
    } catch {
      return null
    }
  }, [purchase.items, newTotal, currentTotal])

  const grades = useMemo(() => Array.from(new Set(purchase.items.map((i) => i.grade))).sort(), [purchase.items])

  const gradeSummary = useMemo(() => {
    const map = new Map<string, { count: number; net: number }>()
    for (const i of purchase.items) {
      const cur = map.get(i.grade) ?? { count: 0, net: 0 }
      map.set(i.grade, { count: cur.count + 1, net: cur.net + Number(i.netWeight ?? 0) })
    }
    return Array.from(map.entries())
  }, [purchase.items])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return purchase.items.filter((i) => {
      if (grade !== "ALL" && i.grade !== grade) return false
      if (!q) return true
      return i.labelCode.toLowerCase().includes(q) || i.grade.toLowerCase().includes(q)
    })
  }, [purchase.items, query, grade])

  const filteredTotals = useMemo(() => {
    let net = 0
    let oldTotal = 0
    let newTotalCalc = 0
    for (const i of filtered) {
      net += Number(i.netWeight ?? 0)
      oldTotal += i.subtotal
      newTotalCalc += preview ? (preview.byId.get(i.id)?.newSubtotal ?? i.subtotal) : i.subtotal
    }
    return { net, oldTotal, newTotalCalc }
  }, [filtered, preview])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  const diff = preview ? preview.exactTotal - currentTotal : null

  async function handleApprove() {
    setSubmitting(true)
    try {
      const parsed = newTotal === "" ? NaN : Number(newTotal)
      const hasValue = newTotal !== ""
      await reviewAndApprove(purchase.id, {
        newTotalPrice: hasValue ? roundMoney(parsed) : null,
        note: note || null,
      })
      toast.success("Transaksi disetujui")
      router.push("/admin/transactions")
    } catch (err) {
      toast.error((err as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/transactions"
            className="text-[12px] font-bold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ← Kembali ke Transaksi
          </Link>
          <h1 className="text-lg font-bold text-foreground mt-1">
            Review &amp; Setujui — <span className="font-mono">{purchase.transactionCode}</span>
          </h1>
          <p className="text-[12px] text-muted-2">
            {purchase.farmerName} · {formatDate(purchase.transactionDate)}
          </p>
        </div>
        <StatusPill status="WEIGHED" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5 items-start">
        <div className="space-y-4 rounded-xl border border-border bg-card p-4 xl:sticky xl:top-2">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-panel-alt border border-border-soft rounded-lg p-3">
              <p className="text-[10px] uppercase font-bold text-muted-2">Total Bale</p>
              <p className="font-mono font-bold text-foreground text-lg mt-1">{purchase.totalItems}</p>
            </div>
            <div className="bg-panel-alt border border-border-soft rounded-lg p-3">
              <p className="text-[10px] uppercase font-bold text-muted-2">Total Netto</p>
              <p className="font-mono font-bold text-foreground text-lg mt-1">{purchase.totalNetWeight.toFixed(2)} kg</p>
            </div>
          </div>
          <div className="bg-panel-alt border border-border-soft rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-2">Harga Saat Ini</p>
            <p className="font-mono font-bold text-amber text-lg mt-1 break-words">{formatCurrency(currentTotal)}</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Harga Baru (Total Rp) — kosongkan bila tanpa negosiasi
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Masukkan total harga kesepakatan"
              value={newTotal}
              onChange={(e) => setNewTotal(e.target.value.replace(/\D/g, ""))}
              className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm font-mono font-bold rounded-lg outline-none"
            />
            {newTotal !== "" && !Number.isNaN(Number(newTotal)) && (
              <p className="text-[10.5px] text-muted-2 mt-1 font-mono">= {formatCurrency(Number(newTotal))}</p>
            )}
          </div>

          {preview && diff !== null && (
            <div className="rounded-lg border border-amber/35 bg-amber/8 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-muted-foreground">Harga Awal → Baru</span>
                <span className="font-mono font-bold text-foreground text-right break-words">
                  {formatCurrency(currentTotal)} → {formatCurrency(preview.exactTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-muted-foreground">Target (kelipatan 100)</span>
                <span className="font-mono font-bold text-foreground text-right break-words">
                  {formatCurrency(preview.targetTotal)}
                  {preview.roundingDiff !== 0 && (
                    <span className="block text-[10px] font-normal text-muted-2">
                      (dari {formatCurrency(preview.inputTotal)})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-muted-foreground">Pembulatan (ke 100)</span>
                <span className={`font-mono font-bold ${preview.roundingDiff < 0 ? "text-red-deduction" : "text-emerald"}`}>
                  {preview.roundingDiff < 0 ? "" : "+"}
                  {formatCurrency(preview.roundingDiff)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-muted-foreground">Selisih (Total)</span>
                <span className={`font-mono font-bold ${diff < 0 ? "text-red-deduction" : "text-emerald"}`}>
                  {diff < 0 ? "" : "+"}
                  {formatCurrency(diff)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-muted-foreground">Adjustment per kg</span>
                <span className={`font-mono font-bold ${preview.adjustmentPerKg < 0 ? "text-red-deduction" : "text-emerald"}`}>
                  {preview.adjustmentPerKg < 0 ? "" : "+"}Rp {preview.adjustmentPerKg.toLocaleString("id-ID")}/kg
                </span>
              </div>
            </div>
          )}

          {!preview && (
            <div className="rounded-lg border border-border-soft bg-panel-alt p-3 text-[11px] text-muted-2">
              Harga tidak dinegosiasikan — transaksi akan disetujui dengan total {formatCurrency(currentTotal)}.
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Catatan Negosiasi</label>
            <textarea
              rows={2}
              placeholder="Alasan / kesepakatan harga…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Link
              href="/admin/transactions"
              className="flex-1 rounded-lg bg-panel-alt px-3 py-2 font-bold text-[12px] text-foreground border border-border-soft text-center cursor-pointer"
            >
              Batal
            </Link>
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="flex-1 rounded-lg bg-emerald px-4 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Menyimpan…" : "Setujui Transaksi"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <input
              type="text"
              placeholder="Cari kode bale / grade…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className="h-9 flex-1 min-w-[180px] px-3 bg-panel-alt border border-border-soft text-foreground text-[12px] rounded-lg outline-none placeholder:text-muted-2"
            />
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value)
                setPage(1)
              }}
              className="h-9 px-2 rounded-lg border border-border-soft bg-panel-alt text-[12px] font-mono text-foreground outline-none cursor-pointer"
            >
              <option value="ALL">Semua Grade</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {gradeSummary.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {(() => {
                const totalNet = gradeSummary.reduce((s, [, v]) => s + v.net, 0)
                return gradeSummary.map(([g, { count, net }]) => (
                  <span
                    key={g}
                    className="px-2 py-1 rounded-lg bg-panel-alt border border-border-soft text-[10.5px] font-mono text-muted-foreground"
                  >
                    {g}: {count} bale · {net.toFixed(1)} kg
                    {totalNet > 0 ? ` · ${((net / totalNet) * 100).toFixed(1)}%` : ""}
                  </span>
                ))
              })()}
            </div>
          )}

          <div className="max-h-[55vh] overflow-y-auto rounded-lg border border-border-soft">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[11.5px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-panel-alt">
                  <th className="text-left px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">No</th>
                  <th className="text-left px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">Bale</th>
                  <th className="text-left px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">Grade</th>
                  <th className="text-left px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">Customer</th>
                  <th className="text-right px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">Netto</th>
                  <th className="text-right px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">Harga/kg</th>
                  <th className="text-right px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">Adj/kg</th>
                  <th className="text-right px-2 py-1.5 text-muted-2 font-bold uppercase text-[9.5px]">Subtotal Baru</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((i, idx) => {
                  const adj = preview?.byId.get(i.id)?.adjustment ?? i.priceAdjustment
                  const sub = preview?.byId.get(i.id)?.newSubtotal ?? i.subtotal
                  const no = (safePage - 1) * pageSize + idx + 1
                  return (
                    <tr key={i.id} className={`border-t border-border-soft ${idx % 2 === 1 ? "bg-panel-alt/40" : ""}`}>
                      <td className="px-2 py-1.5 font-mono text-muted-2">{no}</td>
                      <td className="px-2 py-1.5 font-mono text-foreground">{i.labelCode}</td>
                      <td className="px-2 py-1.5 font-mono text-foreground">{i.grade}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{i.customerName ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-foreground">{(i.netWeight ?? 0).toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-muted-foreground">{formatCurrency(i.pricePerKg)}</td>
                      <td className={`px-2 py-1.5 text-right font-mono ${adj < 0 ? "text-red-deduction" : "text-emerald"}`}>
                        {adj < 0 ? "" : "+"}
                        {formatCurrency(adj)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-amber">{formatCurrency(sub)}</td>
                    </tr>
                  )
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[12px] text-muted-2">
                      Tidak ada bale yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2 pt-3 text-[11px]">
            <span className="text-muted-2">
              Netto tampil: <span className="font-mono text-foreground">{filteredTotals.net.toFixed(2)} kg</span>
            </span>
            <span className="text-muted-2">
              Subtotal lama: <span className="font-mono text-foreground">{formatCurrency(filteredTotals.oldTotal)}</span>
              {" → "}baru:{" "}
              <span className="font-mono font-bold text-amber">{formatCurrency(filteredTotals.newTotalCalc)}</span>
            </span>
          </div>
          <p className="pt-1 text-[10px] text-muted-2 italic">
            Adjustment per kg dibulatkan ke bawah (integer); sisa pembulatan hingga kelipatan 100 Rupiah dibebankan ke bale terakhir.
          </p>

          <Pagination
            page={safePage}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
          />
        </div>
      </div>
    </div>
  )
}
