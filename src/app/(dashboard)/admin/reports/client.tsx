"use client"

import { useRef, useState } from "react"
import type { ReactNode } from "react"
import { flushSync } from "react-dom"
import { toast } from "sonner"
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  FileBarChart2,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  SearchX,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import {
  getFarmerSummary,
  getPeriodSummary,
  getTransactionDetail,
  getCustomerSummary,
  getCapitalFlow,
  getTaxSummary,
  type FarmerSummaryRow,
  type PeriodSummaryRow,
  type TransactionDetailRow,
  type CustomerSummaryRow,
  type CapitalFlowRow,
  type TaxSummaryRow,
} from "@/lib/actions/reports"
import type { WarehouseScope } from "@/lib/actions/scope"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import { lazyPrint } from "@/components/shared/lazy-print"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

const ReportPrint = lazyPrint(() =>
  import("@/components/admin/report-print").then((m) => m.ReportPrint)
)

interface WarehouseMeta { id: number; code: string; name: string }
interface FarmerMeta { id: number; name: string; nik: string | null }

type Tab = "farmer" | "period" | "transaction" | "customer" | "capital" | "tax"

const PRESETS: { key: string; label: string; type: "days" | "month"; days?: number }[] = [
  { key: "today", label: "Hari Ini", type: "days", days: 0 },
  { key: "7d", label: "7 Hari", type: "days", days: 6 },
  { key: "month", label: "Bulan Ini", type: "month" },
  { key: "30d", label: "30 Hari", type: "days", days: 29 },
]

type FilterOverrides = Partial<{ from: string; to: string; warehouseId: string; farmerId: string; customerId: string; status: string }>
type ChipKey = "date" | "warehouse" | "farmer" | "customer" | "status"

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function displayDate(s: string): string {
  if (!s) return "…"
  const d = new Date(`${s}T00:00:00`)
  if (isNaN(d.getTime())) return s
  return formatDate(d)
}

const controlCls =
  "h-8 w-full min-w-[150px] rounded-lg border border-border-soft bg-panel-alt px-2.5 text-[13px] text-foreground outline-none transition-colors focus:border-emerald focus:ring-2 focus:ring-emerald/25"

export function ReportsClient({
  warehouses,
  farmers,
  customers,
  companyName,
  scope,
  userName = "",
}: {
  warehouses: WarehouseMeta[]
  farmers: FarmerMeta[]
  customers: { id: number; name: string }[]
  companyName: string
  scope: WarehouseScope
  userName?: string
}) {
  const [tab, setTab] = useState<Tab>("farmer")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [warehouseId, setWarehouseId] = useState<string>("")
  const [farmerId, setFarmerId] = useState<string>("")
  const [customerId, setCustomerId] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const [farmerRows, setFarmerRows] = useState<FarmerSummaryRow[] | null>(null)
  const [periodRows, setPeriodRows] = useState<PeriodSummaryRow[] | null>(null)
  const [txRows, setTxRows] = useState<TransactionDetailRow[] | null>(null)
  const [customerRows, setCustomerRows] = useState<CustomerSummaryRow[] | null>(null)
  const [capitalRows, setCapitalRows] = useState<CapitalFlowRow[] | null>(null)
  const [taxRows, setTaxRows] = useState<TaxSummaryRow[] | null>(null)
  const [openTx, setOpenTx] = useState<number[]>([])

  const printRef = useRef<HTMLDivElement>(null)
  const [printedAt, setPrintedAt] = useState("")
  const print = usePrintDocument(printRef, printBaseStyle, { documentTitle: "Laporan-TobakOS" })
  const handlePrint = () => {
    flushSync(() => {
      setPrintedAt(
        new Date().toLocaleString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      )
    })
    print()
  }

  const scopedWarehouseId = scope.mode === "scoped" ? scope.warehouseId : null

  async function runLoad(overrides: FilterOverrides = {}) {
    const f = {
      from: overrides.from ?? from,
      to: overrides.to ?? to,
      warehouseId:
        scopedWarehouseId != null ? String(scopedWarehouseId) : overrides.warehouseId ?? warehouseId,
      farmerId: overrides.farmerId ?? farmerId,
      customerId: overrides.customerId ?? customerId,
      status: overrides.status ?? status,
    }
    if (f.from && f.to && f.from > f.to) {
      toast.error("Periode tidak valid — tanggal 'Dari' harus sebelum 'Sampai'")
      return
    }
    setFrom(f.from)
    setTo(f.to)
    setWarehouseId(f.warehouseId)
    setFarmerId(f.farmerId)
    setCustomerId(f.customerId)
    setStatus(f.status)
    setLoading(true)
    try {
      const filters = {
        from: f.from || undefined,
        to: f.to || undefined,
        warehouseId: f.warehouseId ? Number(f.warehouseId) : null,
        farmerId: f.farmerId ? Number(f.farmerId) : null,
        status: f.status || null,
      }
      if (tab === "farmer") setFarmerRows(await getFarmerSummary(filters))
      if (tab === "period") setPeriodRows(await getPeriodSummary(filters))
      if (tab === "transaction") {
        const rows = await getTransactionDetail(filters)
        setTxRows(rows)
        setOpenTx(rows.length > 0 ? [rows[0].id] : [])
      }
      if (tab === "customer") {
        setCustomerRows(await getCustomerSummary({ ...filters, customerId: f.customerId ? Number(f.customerId) : null }))
      }
      if (tab === "capital") setCapitalRows(await getCapitalFlow(filters))
      if (tab === "tax") setTaxRows(await getTaxSummary(filters))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportExcel() {
    setLoading(true)
    try {
      const { exportReportExcel } = await import("@/lib/export-excel")
      await exportReportExcel(
        tab,
        { farmerRows, periodRows, txRows, customerRows, capitalRows, taxRows },
        from,
        to
      )
      toast.success("File Excel berhasil diunduh")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(p: (typeof PRESETS)[number]) {
    const toDate = new Date()
    const fromDate = p.type === "month"
      ? new Date(toDate.getFullYear(), toDate.getMonth(), 1)
      : (() => {
          const d = new Date()
          d.setDate(d.getDate() - (p.days ?? 0))
          return d
        })()
    runLoad({ from: dateStr(fromDate), to: dateStr(toDate) })
  }

  function resetFilters() {
    setFrom("")
    setTo("")
    setWarehouseId("")
    setFarmerId("")
    setCustomerId("")
    setStatus("")
    setFarmerRows(null)
    setPeriodRows(null)
    setTxRows(null)
    setCustomerRows(null)
    setCapitalRows(null)
    setTaxRows(null)
    setOpenTx([])
  }

  function clearFilter(key: ChipKey) {
    const override: FilterOverrides =
      key === "date" ? { from: "", to: "" }
      : key === "warehouse" ? { warehouseId: "" }
      : key === "farmer" ? { farmerId: "" }
      : key === "customer" ? { customerId: "" }
      : { status: "" }
    runLoad(override)
  }

  function switchTab(t: Tab) {
    setTab(t)
    if (t === "period") setFarmerId("")
    setFarmerRows(null)
    setPeriodRows(null)
    setTxRows(null)
    setCustomerRows(null)
    setCapitalRows(null)
    setTaxRows(null)
    setOpenTx([])
  }

  function toggleTx(id: number) {
    setOpenTx((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const periodTotals = periodRows
    ? {
        transactionCount: periodRows.reduce((s, r) => s + r.transactionCount, 0),
        totalBales: periodRows.reduce((s, r) => s + r.totalBales, 0),
        totalNetWeight: periodRows.reduce((s, r) => s + r.totalNetWeight, 0),
        totalPrice: periodRows.reduce((s, r) => s + r.totalPrice, 0),
        totalPaid: periodRows.reduce((s, r) => s + r.totalPaid, 0),
      }
    : null

  const farmerTotals = farmerRows
    ? {
        transactionCount: farmerRows.reduce((s, r) => s + r.transactionCount, 0),
        totalBales: farmerRows.reduce((s, r) => s + r.totalBales, 0),
        totalNetWeight: farmerRows.reduce((s, r) => s + r.totalNetWeight, 0),
        totalPrice: farmerRows.reduce((s, r) => s + r.totalPrice, 0),
        totalPaid: farmerRows.reduce((s, r) => s + r.totalPaid, 0),
        remaining: farmerRows.reduce((s, r) => s + r.remaining, 0),
        loanBalance: farmerRows.reduce((s, r) => s + r.loanBalance, 0),
      }
    : null

  const txTotals = txRows
    ? {
        totalBales: txRows.reduce((s, r) => s + r.totalBales, 0),
        totalNetWeight: txRows.reduce((s, r) => s + r.totalNetWeight, 0),
        totalPrice: txRows.reduce((s, r) => s + r.totalPrice, 0),
        paidAmount: txRows.reduce((s, r) => s + r.paidAmount, 0),
        remaining: txRows.reduce((s, r) => s + r.remaining, 0),
      }
    : null

  const customerTotals = customerRows
    ? {
        totalBales: customerRows.reduce((s, r) => s + r.totalBales, 0),
        totalNetWeight: customerRows.reduce((s, r) => s + r.totalNetWeight, 0),
        totalPrice: customerRows.reduce((s, r) => s + r.totalPrice, 0),
      }
    : null

  const capitalTotals = capitalRows
    ? {
        loanRepayCash: capitalRows.reduce((s, r) => s + r.loanRepayCash, 0),
        cashInManual: capitalRows.reduce((s, r) => s + r.cashInManual, 0),
        bankIn: capitalRows.reduce((s, r) => s + r.bankIn, 0),
        totalIn: capitalRows.reduce((s, r) => s + r.totalIn, 0),
        purchaseCash: capitalRows.reduce((s, r) => s + r.purchaseCash, 0),
        purchaseBank: capitalRows.reduce((s, r) => s + r.purchaseBank, 0),
        loanDisburse: capitalRows.reduce((s, r) => s + r.loanDisburse, 0),
        operational: capitalRows.reduce((s, r) => s + r.operational, 0),
        cashOutManual: capitalRows.reduce((s, r) => s + r.cashOutManual, 0),
        totalOut: capitalRows.reduce((s, r) => s + r.totalOut, 0),
        netFlow: capitalRows.reduce((s, r) => s + r.netFlow, 0),
        taxAmount: capitalRows.reduce((s, r) => s + r.taxAmount, 0),
      }
    : null

  const taxTotals = taxRows
    ? {
        transactionCount: taxRows.reduce((s, r) => s + r.transactionCount, 0),
        taxAmount: taxRows.reduce((s, r) => s + r.taxAmount, 0),
      }
    : null

  const tabs: { key: Tab; label: string }[] = [
    { key: "farmer", label: "Rekap Per Petani" },
    { key: "period", label: "Rekap Per Periode" },
    { key: "transaction", label: "Rincian Transaksi" },
    { key: "customer", label: "Rekap Per Customer" },
    { key: "capital", label: "Arus Modal" },
    { key: "tax", label: "Rekap Pajak" },
  ]

  const loaded = farmerRows !== null || periodRows !== null || txRows !== null || customerRows !== null || capitalRows !== null || taxRows !== null
  const currentCount =
    tab === "farmer" ? farmerRows?.length
    : tab === "period" ? periodRows?.length
    : tab === "transaction" ? txRows?.length
    : tab === "customer" ? customerRows?.length
    : tab === "capital" ? capitalRows?.length
    : taxRows?.length

  const chips: { key: ChipKey; label: string; locked?: boolean }[] = []
  if (from || to) chips.push({ key: "date", label: `${displayDate(from)} → ${displayDate(to)}` })
  if (scopedWarehouseId != null) {
    const w = warehouses.find((x) => x.id === scopedWarehouseId) ?? warehouses[0]
    if (w) chips.push({ key: "warehouse", label: `Gudang: ${w.code}`, locked: true })
  } else if (warehouseId) {
    const w = warehouses.find((x) => x.id === Number(warehouseId))
    if (w) chips.push({ key: "warehouse", label: `Gudang: ${w.code}` })
  }
  if (farmerId && tab === "farmer") {
    const f = farmers.find((x) => x.id === Number(farmerId))
    if (f) chips.push({ key: "farmer", label: `Petani: ${f.name}` })
  }
  if (customerId && tab === "customer") {
    const c = customers.find((x) => x.id === Number(customerId))
    if (c) chips.push({ key: "customer", label: `Customer: ${c.name}` })
  }
  if (status) chips.push({ key: "status", label: `Status: ${status}` })

  const warehouseLabel =
    scopedWarehouseId != null
      ? warehouses.find((x) => x.id === scopedWarehouseId)?.name ?? "—"
      : (warehouses.find((x) => x.id === Number(warehouseId))?.name ?? "Semua Gudang")

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileBarChart2}
        title="Laporan"
        subtitle="Rekap pembelian tembakau — per petani & per periode"
      >
        <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={loading || !loaded}>
          <FileSpreadsheet />
          Export Excel
        </Button>
        <Button size="sm" onClick={handlePrint} disabled={loading || !loaded}>
          <Printer />
          Cetak / PDF
        </Button>
      </PageHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          runLoad()
        }}
        className="rounded-xl border border-border bg-card p-4 space-y-3"
      >
        <div className="flex flex-wrap items-end gap-2.5">
          <Field label="Dari">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={controlCls} />
          </Field>
          <Field label="Sampai">
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={controlCls} />
          </Field>
          <Field label="Gudang">
            {scopedWarehouseId != null ? (
              <div className="flex h-8 min-w-[150px] cursor-not-allowed items-center rounded-lg border border-border-soft bg-panel-alt/60 px-2.5 font-mono text-[13px] text-muted-foreground">
                {warehouses[0]?.code ?? "—"} — {warehouses[0]?.name ?? ""}
              </div>
            ) : (
              <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={controlCls}>
                <option value="">Semua</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.code} — {w.name}</option>
                ))}
              </select>
            )}
          </Field>
          {tab === "farmer" && (
            <Field label="Petani">
              <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className={controlCls}>
                <option value="">Semua</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </Field>
          )}
          {tab === "customer" && (
            <Field label="Customer">
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={controlCls}>
                <option value="">Semua</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={controlCls}>
              <option value="">Semua</option>
              <option value="DRAFT">DRAFT</option>
              <option value="WEIGHED">WEIGHED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PAID">PAID</option>
            </select>
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Memuat…" : "Tampilkan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={resetFilters}
              disabled={loading}
              title="Reset filter"
              aria-label="Reset filter"
            >
              <RotateCcw />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border-soft pt-3">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[10.5px] uppercase font-bold text-muted-2">
            <Calendar className="size-3.5" />
            Rentang cepat
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p)}
              className="rounded-full border border-border-soft bg-panel-alt px-2.5 py-1 text-[10.5px] font-bold text-muted-foreground transition-colors cursor-pointer hover:border-emerald/50 hover:text-foreground"
            >
              {p.label}
            </button>
          ))}
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex w-max bg-panel-alt rounded-xl border border-border-soft p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => switchTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  tab === t.key ? "bg-emerald text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
                {tab === t.key && currentCount !== undefined && (
                  <span className="rounded-md bg-primary-foreground/15 px-1.5 py-px font-mono text-[10px]">
                    {currentCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((c) => (
                <span
                  key={c.key}
                  className="inline-flex items-center gap-1 rounded-full border border-border-soft bg-panel-alt px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                >
                  {c.label}
                  {!c.locked && (
                    <button
                      type="button"
                      onClick={() => clearFilter(c.key)}
                      className="text-muted-2 transition-colors hover:text-foreground cursor-pointer"
                      aria-label={`Hapus filter ${c.label}`}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[68px]" />
              ))}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`row-${i}`} className="h-9 w-full" />
            ))}
          </div>
        ) : tab === "farmer" ? (
          farmerRows === null ? (
            <InitialEmpty />
          ) : farmerRows.length === 0 ? (
            <NoDataEmpty onReset={resetFilters} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                <Stat label="Petani" value={String(farmerRows.length)} />
                <Stat label="Transaksi" value={String(farmerTotals!.transactionCount)} />
                <Stat label="Bale" value={String(farmerTotals!.totalBales)} />
                <Stat label="Total Netto" value={`${farmerTotals!.totalNetWeight.toFixed(1)} kg`} />
                <Stat label="Total Harga" value={formatCurrency(farmerTotals!.totalPrice)} tone="amber" />
                <Stat
                  label="Sisa"
                  value={formatCurrency(farmerTotals!.remaining)}
                  tone={farmerTotals!.remaining > 0 ? "red" : "emerald"}
                />
                <Stat label="Hutang Modal" value={formatCurrency(farmerTotals!.loanBalance)} tone="amber" />
              </div>
              <div className="max-h-[560px] overflow-auto rounded-lg border border-border-soft">
                <table className="w-full min-w-[760px] border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th className={`${thBase} text-left pr-2`}>Petani</th>
                      <th className={`${thBase} text-right px-2`}>Tx</th>
                      <th className={`${thBase} text-right px-2`}>Bale</th>
                      <th className={`${thBase} text-right px-2`}>Netto (kg)</th>
                      <th className={`${thBase} text-right px-2`}>Total</th>
                      <th className={`${thBase} text-right px-2`}>Dibayar</th>
                      <th className={`${thBase} text-right px-2`}>Sisa</th>
                      <th className={`${thBase} text-right pl-2`}>Hutang Modal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmerRows.map((r) => (
                      <tr key={r.farmerId} className="transition-colors hover:bg-panel-alt/50">
                        <td className="py-2 pr-2 border-b border-border-soft text-foreground">
                          <b>{r.farmerName}</b>
                          {r.farmerNik && (
                            <span className="block font-mono text-[10.5px] text-muted-2">{r.farmerNik}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.transactionCount}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalBales}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalNetWeight.toFixed(1)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber font-bold">{formatCurrency(r.totalPrice)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-emerald">{formatCurrency(r.totalPaid)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right">
                          <span className={r.remaining > 0 ? "text-amber" : "text-emerald"}>
                            {formatCurrency(r.remaining)}
                          </span>
                        </td>
                        <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-red-deduction">{formatCurrency(r.loanBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-panel-alt/60">
                      <td colSpan={2} className="py-2.5 pr-2 text-[11px] font-extrabold uppercase tracking-wide text-foreground">Total</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{farmerTotals!.totalBales}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{farmerTotals!.totalNetWeight.toFixed(1)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-amber">{formatCurrency(farmerTotals!.totalPrice)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-emerald">{formatCurrency(farmerTotals!.totalPaid)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{formatCurrency(farmerTotals!.remaining)}</td>
                      <td className="py-2.5 pl-2 font-mono text-right font-bold text-red-deduction">{formatCurrency(farmerTotals!.loanBalance)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )
        ) : tab === "period" ? (
          periodRows === null ? (
            <InitialEmpty />
          ) : periodRows.length === 0 ? (
            <NoDataEmpty onReset={resetFilters} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat label="Hari" value={String(periodRows.length)} />
                <Stat label="Transaksi" value={String(periodTotals!.transactionCount)} />
                <Stat label="Bale" value={String(periodTotals!.totalBales)} />
                <Stat label="Total Netto" value={`${periodTotals!.totalNetWeight.toFixed(1)} kg`} />
                <Stat label="Total Harga" value={formatCurrency(periodTotals!.totalPrice)} tone="amber" />
                <Stat label="Dibayar" value={formatCurrency(periodTotals!.totalPaid)} tone="emerald" />
              </div>
              <div className="max-h-[560px] overflow-auto rounded-lg border border-border-soft">
                <table className="w-full min-w-[620px] border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th className={`${thBase} text-left pr-2`}>Tanggal</th>
                      <th className={`${thBase} text-right px-2`}>Tx</th>
                      <th className={`${thBase} text-right px-2`}>Bale</th>
                      <th className={`${thBase} text-right px-2`}>Netto (kg)</th>
                      <th className={`${thBase} text-right px-2`}>Total</th>
                      <th className={`${thBase} text-right pl-2`}>Dibayar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodRows.map((r) => (
                      <tr key={r.label} className="transition-colors hover:bg-panel-alt/50">
                        <td className="py-2 pr-2 border-b border-border-soft font-mono text-foreground">{formatDate(r.label)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.transactionCount}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalBales}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalNetWeight.toFixed(1)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber font-bold">{formatCurrency(r.totalPrice)}</td>
                        <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-emerald">{formatCurrency(r.totalPaid)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-panel-alt/60">
                      <td className="py-2.5 pr-2 text-[11px] font-extrabold uppercase tracking-wide text-foreground">Total</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{periodTotals!.transactionCount}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{periodTotals!.totalBales}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{periodTotals!.totalNetWeight.toFixed(1)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-amber">{formatCurrency(periodTotals!.totalPrice)}</td>
                      <td className="py-2.5 pl-2 font-mono text-right font-bold text-emerald">{formatCurrency(periodTotals!.totalPaid)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )
        ) : tab === "customer" ? (
          customerRows === null ? (
            <InitialEmpty />
          ) : customerRows.length === 0 ? (
            <NoDataEmpty onReset={resetFilters} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Stat label="Customer" value={String(customerRows.length)} />
                <Stat label="Bale" value={String(customerTotals!.totalBales)} />
                <Stat label="Total Netto" value={`${customerTotals!.totalNetWeight.toFixed(1)} kg`} />
                <Stat label="Total Harga" value={formatCurrency(customerTotals!.totalPrice)} tone="amber" />
                <Stat label="Rata-rata Harga/kg" value={formatCurrency(customerTotals!.totalNetWeight > 0 ? customerTotals!.totalPrice / customerTotals!.totalNetWeight : 0)} />
              </div>
              <div className="max-h-[560px] overflow-auto rounded-lg border border-border-soft">
                <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th className={`${thBase} text-left pr-2`}>Customer</th>
                      <th className={`${thBase} text-right px-2`}>Tx</th>
                      <th className={`${thBase} text-right px-2`}>Bale</th>
                      <th className={`${thBase} text-right px-2`}>Netto (kg)</th>
                      <th className={`${thBase} text-right px-2`}>Total</th>
                      <th className={`${thBase} text-right pl-2`}>Harga/kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerRows.map((r) => (
                      <tr key={r.customerId} className="transition-colors hover:bg-panel-alt/50">
                        <td className="py-2 pr-2 border-b border-border-soft text-foreground">
                          <b>{r.customerName}</b>
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.transactionCount}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalBales}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalNetWeight.toFixed(1)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber font-bold">{formatCurrency(r.totalPrice)}</td>
                        <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-foreground">{formatCurrency(r.avgPricePerKg)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-panel-alt/60">
                      <td className="py-2.5 pr-2 text-[11px] font-extrabold uppercase tracking-wide text-foreground">Total</td>
                      <td className="py-2.5 px-2" />
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{customerTotals!.totalBales}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{customerTotals!.totalNetWeight.toFixed(1)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-amber">{formatCurrency(customerTotals!.totalPrice)}</td>
                      <td className="py-2.5 pl-2" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )
        ) : tab === "capital" ? (
          capitalRows === null ? (
            <InitialEmpty />
          ) : capitalRows.length === 0 ? (
            <NoDataEmpty onReset={resetFilters} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat label="Gudang" value={String(capitalRows.length)} />
                <Stat label="Total Masuk" value={formatCurrency(capitalTotals!.totalIn)} tone="emerald" />
                <Stat label="Total Keluar" value={formatCurrency(capitalTotals!.totalOut)} tone="amber" />
                <Stat
                  label="Selisih (Masuk−Keluar)"
                  value={formatCurrency(capitalTotals!.netFlow)}
                  tone={capitalTotals!.netFlow >= 0 ? "emerald" : "red"}
                />
                <Stat label="Pembelian Tunai" value={formatCurrency(capitalTotals!.purchaseCash + capitalTotals!.purchaseBank)} tone="amber" />
                <Stat label="Pajak" value={formatCurrency(capitalTotals!.taxAmount)} tone="red" />
              </div>
              <div className="max-h-[560px] overflow-auto rounded-lg border border-border-soft">
                <table className="w-full min-w-[1080px] border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th rowSpan={2} className={`${thBase} text-left pr-2 align-bottom`}>Gudang</th>
                      <th colSpan={4} className={`${thBase} text-center px-2 border-b border-border-soft text-emerald`}>MASUK</th>
                      <th colSpan={5} className={`${thBase} text-center px-2 border-b border-border-soft text-amber`}>KELUAR</th>
                      <th rowSpan={2} className={`${thBase} text-right px-2 align-bottom`}>Selisih</th>
                      <th rowSpan={2} className={`${thBase} text-right pl-2 align-bottom`}>Pajak</th>
                    </tr>
                    <tr>
                      <th className={`${thBase} text-right px-2`}>Bayar Hutang</th>
                      <th className={`${thBase} text-right px-2`}>Kas Manual</th>
                      <th className={`${thBase} text-right px-2`}>Bank</th>
                      <th className={`${thBase} text-right px-2`}>Total</th>
                      <th className={`${thBase} text-right px-2`}>Beli Tunai</th>
                      <th className={`${thBase} text-right px-2`}>Beli Transfer</th>
                      <th className={`${thBase} text-right px-2`}>Pinjam Modal</th>
                      <th className={`${thBase} text-right px-2`}>Operasional</th>
                      <th className={`${thBase} text-right px-2`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capitalRows.map((r) => (
                      <tr key={r.warehouseId} className="transition-colors hover:bg-panel-alt/50">
                        <td className="py-2 pr-2 border-b border-border-soft text-foreground">
                          <b>{r.warehouseName}</b>
                          <span className="block font-mono text-[10.5px] text-muted-2">{r.warehouseCode}</span>
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-emerald">{formatCurrency(r.loanRepayCash)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-emerald">{formatCurrency(r.cashInManual)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-emerald">{formatCurrency(r.bankIn)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right font-bold text-emerald">{formatCurrency(r.totalIn)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber">{formatCurrency(r.purchaseCash)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber">{formatCurrency(r.purchaseBank)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{formatCurrency(r.loanDisburse)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{formatCurrency(r.operational)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right font-bold text-amber">{formatCurrency(r.totalOut)}</td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right font-bold">
                          <span className={r.netFlow >= 0 ? "text-emerald" : "text-red-deduction"}>{formatCurrency(r.netFlow)}</span>
                        </td>
                        <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-red-deduction">{formatCurrency(r.taxAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-panel-alt/60">
                      <td className="py-2.5 pr-2 text-[11px] font-extrabold uppercase tracking-wide text-foreground">Total</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-emerald">{formatCurrency(capitalTotals!.loanRepayCash)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-emerald">{formatCurrency(capitalTotals!.cashInManual)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-emerald">{formatCurrency(capitalTotals!.bankIn)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-emerald">{formatCurrency(capitalTotals!.totalIn)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-amber">{formatCurrency(capitalTotals!.purchaseCash)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-amber">{formatCurrency(capitalTotals!.purchaseBank)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{formatCurrency(capitalTotals!.loanDisburse)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{formatCurrency(capitalTotals!.operational)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-amber">{formatCurrency(capitalTotals!.totalOut)}</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold">
                        <span className={capitalTotals!.netFlow >= 0 ? "text-emerald" : "text-red-deduction"}>{formatCurrency(capitalTotals!.netFlow)}</span>
                      </td>
                      <td className="py-2.5 pl-2 font-mono text-right font-bold text-red-deduction">{formatCurrency(capitalTotals!.taxAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="text-[11px] text-muted-2">
                Menampilkan <b className="text-foreground">seluruh mutasi kas &amp; bank</b> pada periode ini per gudang.{" "}
                <b className="text-emerald">Masuk</b> = kas/bank yang masuk (bayar hutang tunai, kas manual, bank masuk);{" "}
                <b className="text-amber">Keluar</b> = kas/bank yang keluar (beli tembakau tunai/transfer, pinjamkan modal, operasional, kas manual).{" "}
                <b className="text-foreground">Selisih</b> = Masuk − Keluar (negatif berarti net pengeluaran modal). Pengeluaran modal untuk
                potongan hutang tercatat sebagai <b className="text-foreground">Pinjam Modal</b> saat dana diberikan, bukan saat dipotong dari transaksi.
              </p>
            </>
          )
        ) : tab === "tax" ? (
          taxRows === null ? (
            <InitialEmpty />
          ) : taxRows.length === 0 ? (
            <NoDataEmpty onReset={resetFilters} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Stat label="Gudang" value={String(taxRows.length)} />
                <Stat label="Transaksi" value={String(taxTotals!.transactionCount)} />
                <Stat label="Total Pajak" value={formatCurrency(taxTotals!.taxAmount)} tone="red" />
              </div>
              <div className="max-h-[560px] overflow-auto rounded-lg border border-border-soft">
                <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                  <thead>
                    <tr>
                      <th className={`${thBase} text-left pr-2`}>Gudang</th>
                      <th className={`${thBase} text-right px-2`}>Transaksi</th>
                      <th className={`${thBase} text-right pl-2`}>Pajak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxRows.map((r) => (
                      <tr key={r.warehouseId ?? -1} className="transition-colors hover:bg-panel-alt/50">
                        <td className="py-2 pr-2 border-b border-border-soft text-foreground">
                          <b>{r.warehouseName ?? "Tanpa gudang"}</b>
                          {r.warehouseCode && <span className="block font-mono text-[10.5px] text-muted-2">{r.warehouseCode}</span>}
                        </td>
                        <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.transactionCount}</td>
                        <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-red-deduction font-bold">{formatCurrency(r.taxAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-panel-alt/60">
                      <td className="py-2.5 pr-2 text-[11px] font-extrabold uppercase tracking-wide text-foreground">Total</td>
                      <td className="py-2.5 px-2 font-mono text-right font-bold text-foreground">{taxTotals!.transactionCount}</td>
                      <td className="py-2.5 pl-2 font-mono text-right font-bold text-red-deduction">{formatCurrency(taxTotals!.taxAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )
        ) : (
          txRows === null ? (
            <InitialEmpty />
          ) : txRows.length === 0 ? (
            <NoDataEmpty onReset={resetFilters} />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Stat label="Transaksi" value={String(txRows.length)} />
                <Stat label="Bale" value={String(txTotals!.totalBales)} />
                <Stat label="Total Netto" value={`${txTotals!.totalNetWeight.toFixed(1)} kg`} />
                <Stat label="Total Harga" value={formatCurrency(txTotals!.totalPrice)} tone="amber" />
                <Stat label="Dibayar" value={formatCurrency(txTotals!.paidAmount)} tone="emerald" />
                <Stat
                  label="Sisa"
                  value={formatCurrency(txTotals!.remaining)}
                  tone={txTotals!.remaining > 0 ? "red" : "emerald"}
                />
              </div>
              <div className="space-y-3">
                {txRows.map((p) => {
                  const open = openTx.includes(p.id)
                  return (
                    <div key={p.id} className="overflow-hidden rounded-lg border border-border-soft">
                      <button
                        type="button"
                        onClick={() => toggleTx(p.id)}
                        aria-expanded={open}
                        className="flex w-full items-center justify-between gap-x-3 gap-y-1.5 flex-wrap bg-panel-alt/40 px-3 py-2.5 text-left transition-colors cursor-pointer hover:bg-panel-alt/70"
                      >
                        <span className="flex min-w-0 items-center gap-2.5 flex-wrap">
                          {open ? (
                            <ChevronDown className="size-4 shrink-0 text-emerald" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0 text-muted-2" />
                          )}
                          <span className="font-mono text-[12px] font-bold text-foreground">{p.transactionCode}</span>
                          <span className="text-[11.5px] text-muted-foreground">{p.farmerName}</span>
                          <span className="font-mono text-[10.5px] text-muted-2">{formatDate(p.transactionDate)}</span>
                          <span className="font-mono text-[10.5px] text-muted-2">
                            {p.warehouseCode ?? "—"} · {p.laneCode ?? "—"}
                          </span>
                        </span>
                        <span className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-[10.5px] text-muted-2">{p.totalBales} bale</span>
                          <span className="font-mono text-[12.5px] font-bold text-amber">{formatCurrency(p.totalPrice)}</span>
                          {p.remaining > 0 ? (
                            <>
                              <span className="font-mono text-[11px] text-emerald">{formatCurrency(p.paidAmount)}</span>
                              <span className="font-mono text-[11px] text-red-deduction">sisa {formatCurrency(p.remaining)}</span>
                            </>
                          ) : (
                            <span className="font-mono text-[11px] text-emerald">lunas {formatCurrency(p.paidAmount)}</span>
                          )}
                          <StatusPill status={p.status as "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"} />
                        </span>
                      </button>
                      {open && (
                        <div className="overflow-x-auto border-t border-border-soft">
                          <table className="w-full min-w-[880px] border-collapse text-[12px]">
                            <thead>
                              <tr>
                                <th className={`${thBase} text-left px-3`}>Barcode</th>
                                <th className={`${thBase} text-left px-2`}>Grade</th>
                                <th className={`${thBase} text-left px-2`}>Customer</th>
                                <th className={`${thBase} text-right px-2`}>Bruto</th>
                                <th className={`${thBase} text-right px-2`}>Pot. MC</th>
                                <th className={`${thBase} text-right px-2`}>Pot. Packing</th>
                                <th className={`${thBase} text-right px-2`}>Netto</th>
                                <th className={`${thBase} text-right px-2`}>Harga</th>
                                <th className={`${thBase} text-right px-2`}>Adj</th>
                                <th className={`${thBase} text-right px-3`}>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.items.map((i) => (
                                <tr key={i.id} className="transition-colors hover:bg-panel-alt/50">
                                  <td className="py-1.5 px-3 font-mono text-foreground">{i.labelCode}</td>
                                  <td className="py-1.5 px-2 font-mono text-foreground">{i.grade}</td>
                                  <td className="py-1.5 px-2 text-muted-foreground">{i.customerName ?? "—"}</td>
                                  <td className="py-1.5 px-2 font-mono text-right text-foreground">{i.grossWeight != null ? i.grossWeight.toFixed(1) : "—"}</td>
                                  <td className="py-1.5 px-2 font-mono text-right text-red-deduction">{i.moistureDeduction != null ? i.moistureDeduction.toFixed(1) : "—"}</td>
                                  <td className="py-1.5 px-2 font-mono text-right text-red-deduction">{i.packingWeight > 0 ? i.packingWeight.toFixed(1) : "—"}</td>
                                  <td className="py-1.5 px-2 font-mono text-right text-foreground">{i.netWeight != null ? i.netWeight.toFixed(1) : "—"}</td>
                                  <td className="py-1.5 px-2 font-mono text-right text-foreground">{i.pricePerKg != null ? i.pricePerKg.toLocaleString("id-ID") : "—"}</td>
                                  <td className="py-1.5 px-2 font-mono text-right text-amber">
                                    {i.priceAdjustment > 0 ? `+${i.priceAdjustment}` : i.priceAdjustment}
                                  </td>
                                  <td className="py-1.5 px-3 font-mono text-right text-foreground">{formatCurrency(i.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-border bg-panel-alt/60">
                                <td colSpan={6} className="py-2 px-3 text-[10.5px] font-extrabold uppercase tracking-wide text-muted-2">
                                  Total {p.totalBales} bale
                                </td>
                                <td className="py-2 px-2 font-mono text-right font-bold text-foreground">{p.totalNetWeight.toFixed(1)} kg</td>
                                <td className="py-2 px-2" />
                                <td className="py-2 px-2" />
                                <td className="py-2 px-3 font-mono text-right font-bold text-amber">{formatCurrency(p.totalPrice)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )
        )}
      </div>

      <div className="hidden" aria-hidden="true">
        <ReportPrint
          ref={printRef}
          tab={tab}
          from={from}
          to={to}
          farmerRows={farmerRows}
          periodRows={periodRows}
          txRows={txRows}
          customerRows={customerRows}
          capitalRows={capitalRows}
          taxRows={taxRows}
          companyName={companyName}
          warehouseLabel={warehouseLabel}
          printedBy={userName}
          printedAt={printedAt}
        />
      </div>
    </div>
  )
}

const thBase =
  "sticky top-0 z-10 bg-card text-[10.5px] uppercase font-bold text-muted-2 py-2 border-b border-border-soft"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10.5px] uppercase font-bold text-muted-2">{label}</label>
      {children}
    </div>
  )
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: "default" | "emerald" | "amber" | "red"
}) {
  const toneCls =
    tone === "emerald" ? "text-emerald" : tone === "amber" ? "text-amber" : tone === "red" ? "text-red-deduction" : "text-foreground"
  return (
    <div className="rounded-lg border border-border-soft bg-panel-alt px-3.5 py-3">
      <p className="mb-1 text-[10px] font-bold uppercase text-muted-2">{label}</p>
      <p className={`truncate font-mono text-[17px] font-bold leading-tight ${toneCls}`}>{value}</p>
    </div>
  )
}

function InitialEmpty() {
  return (
    <Empty className="py-12">
      <EmptyMedia variant="icon">
        <FileBarChart2 />
      </EmptyMedia>
      <EmptyContent>
        <EmptyTitle>Atur filter untuk melihat laporan</EmptyTitle>
        <EmptyDescription>Pilih periode, gudang, atau status lalu tekan &quot;Tampilkan&quot;.</EmptyDescription>
      </EmptyContent>
    </Empty>
  )
}

function NoDataEmpty({ onReset }: { onReset: () => void }) {
  return (
    <Empty className="py-12">
      <EmptyMedia variant="icon">
        <SearchX />
      </EmptyMedia>
      <EmptyContent>
        <EmptyTitle>Tidak ada data pada periode ini</EmptyTitle>
        <EmptyDescription>Coba ubah rentang tanggal atau kosongkan filter.</EmptyDescription>
        <Button variant="outline" size="sm" onClick={onReset} type="button">
          <RotateCcw />
          Reset filter
        </Button>
      </EmptyContent>
    </Empty>
  )
}
