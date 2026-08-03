"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  getFarmerSummary,
  getPeriodSummary,
  getTransactionDetail,
  type FarmerSummaryRow,
  type PeriodSummaryRow,
  type TransactionDetailRow,
} from "@/lib/actions/reports"
import { formatCurrency, formatDate } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import { ReportPrint } from "@/components/admin/report-print"
import { exportReportExcel } from "@/lib/export-excel"

interface WarehouseMeta { id: number; code: string; name: string }
interface FarmerMeta { id: number; name: string; nik: string | null }

type Tab = "farmer" | "period" | "transaction"

export function ReportsClient({ warehouses, farmers, companyName }: { warehouses: WarehouseMeta[]; farmers: FarmerMeta[]; companyName: string }) {
  const [tab, setTab] = useState<Tab>("farmer")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [warehouseId, setWarehouseId] = useState<string>("")
  const [farmerId, setFarmerId] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const [farmerRows, setFarmerRows] = useState<FarmerSummaryRow[] | null>(null)
  const [periodRows, setPeriodRows] = useState<PeriodSummaryRow[] | null>(null)
  const [txRows, setTxRows] = useState<TransactionDetailRow[] | null>(null)

  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = usePrintDocument(printRef, printBaseStyle, { documentTitle: "Laporan-TobakOS" })

  async function handleLoad() {
    if (from && to && from > to) {
      toast.error("Periode tidak valid — tanggal 'Dari' harus sebelum 'Sampai'")
      return
    }
    setLoading(true)
    try {
      const filters = {
        from: from || undefined,
        to: to || undefined,
        warehouseId: warehouseId ? Number(warehouseId) : null,
        farmerId: farmerId ? Number(farmerId) : null,
        status: status || null,
      }
      if (tab === "farmer") setFarmerRows(await getFarmerSummary(filters))
      if (tab === "period") setPeriodRows(await getPeriodSummary(filters))
      if (tab === "transaction") setTxRows(await getTransactionDetail(filters))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleExportExcel() {
    setLoading(true)
    try {
      await exportReportExcel(
        tab,
        { farmerRows, periodRows, txRows },
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
        remaining: farmerRows.reduce((s, r) => s + r.remaining, 0),
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "farmer", label: "Rekap Per Petani" },
    { key: "period", label: "Rekap Per Periode" },
    { key: "transaction", label: "Rincian Transaksi" },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-bold text-foreground">Laporan</h1>
        <button
          onClick={handleExportExcel}
          disabled={loading || (farmerRows === null && periodRows === null && txRows === null)}
          className="rounded-lg bg-panel-alt px-4 py-2 font-bold text-[12px] text-emerald border border-border-soft cursor-pointer hover:border-emerald/40 disabled:opacity-50"
        >
          Export Excel
        </button>
        <button
          onClick={handlePrint}
          disabled={loading || (farmerRows === null && periodRows === null && txRows === null)}
          className="rounded-lg bg-emerald px-4 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer hover:bg-emerald/90 disabled:opacity-50"
        >
          Cetak / Export PDF
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10.5px] uppercase font-bold text-muted-2 block mb-1">Dari</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-panel-alt border border-border-soft text-foreground text-[13px] px-2.5 py-2 rounded-lg outline-none" />
          </div>
          <div>
            <label className="text-[10.5px] uppercase font-bold text-muted-2 block mb-1">Sampai</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-panel-alt border border-border-soft text-foreground text-[13px] px-2.5 py-2 rounded-lg outline-none" />
          </div>
          <div>
            <label className="text-[10.5px] uppercase font-bold text-muted-2 block mb-1">Gudang</label>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="bg-panel-alt border border-border-soft text-foreground text-[13px] px-2.5 py-2 rounded-lg outline-none">
              <option value="">Semua</option>
              {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          {tab === "farmer" && (
            <div>
              <label className="text-[10.5px] uppercase font-bold text-muted-2 block mb-1">Petani</label>
              <select value={farmerId} onChange={(e) => setFarmerId(e.target.value)} className="bg-panel-alt border border-border-soft text-foreground text-[13px] px-2.5 py-2 rounded-lg outline-none">
                <option value="">Semua</option>
                {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10.5px] uppercase font-bold text-muted-2 block mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-panel-alt border border-border-soft text-foreground text-[13px] px-2.5 py-2 rounded-lg outline-none">
              <option value="">Semua</option>
              <option value="DRAFT">DRAFT</option>
              <option value="WEIGHED">WEIGHED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
          <button
            onClick={handleLoad}
            disabled={loading}
            className="rounded-lg bg-panel-alt px-4 py-2 font-bold text-[12px] text-emerald border border-border-soft cursor-pointer hover:border-emerald/40 disabled:opacity-50"
          >
            {loading ? "Memuat\u2026" : "Tampilkan"}
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="flex w-max bg-panel-alt rounded-xl border border-border-soft p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key)
                if (t.key === "period") setFarmerId("")
                setFarmerRows(null)
                setPeriodRows(null)
                setTxRows(null)
              }}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                tab === t.key ? "bg-emerald text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {tab === "farmer" && (
          farmerRows === null ? (
            <p className="py-8 text-center text-muted-foreground text-sm">Atur filter lalu tekan &quot;Tampilkan&quot;.</p>
          ) : farmerRows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">Tidak ada data pada periode ini.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Stat label="Petani" value={String(farmerRows.length)} />
                <Stat label="Transaksi" value={String(farmerTotals!.transactionCount)} />
                <Stat label="Total Netto" value={`${farmerTotals!.totalNetWeight.toFixed(1)} kg`} />
                <Stat label="Total Harga" value={formatCurrency(farmerTotals!.totalPrice)} />
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Petani</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Tx</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Bale</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto (kg)</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Dibayar</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Sisa</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Hutang Modal</th>
                  </tr>
                </thead>
                <tbody>
                  {farmerRows.map((r) => (
                    <tr key={r.farmerId}>
                      <td className="py-2 pr-2 border-b border-border-soft text-foreground">
                        <b>{r.farmerName}</b>
                        {r.farmerNik && <span className="block font-mono text-[10.5px] text-muted-2">{r.farmerNik}</span>}
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.transactionCount}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalBales}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalNetWeight.toFixed(1)}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber font-bold">{formatCurrency(r.totalPrice)}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-emerald">{formatCurrency(r.totalPaid)}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{formatCurrency(r.remaining)}</td>
                      <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-red-deduction">{formatCurrency(r.loanBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )
        )}

        {tab === "period" && (
          periodRows === null ? (
            <p className="py-8 text-center text-muted-foreground text-sm">Atur filter lalu tekan &quot;Tampilkan&quot;.</p>
          ) : periodRows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">Tidak ada data pada periode ini.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                <Stat label="Hari" value={String(periodRows.length)} />
                <Stat label="Transaksi" value={String(periodTotals!.transactionCount)} />
                <Stat label="Bale" value={String(periodTotals!.totalBales)} />
                <Stat label="Total Netto" value={`${periodTotals!.totalNetWeight.toFixed(1)} kg`} />
                <Stat label="Total Harga" value={formatCurrency(periodTotals!.totalPrice)} />
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Tanggal</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Tx</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Bale</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto (kg)</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total</th>
                    <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Dibayar</th>
                  </tr>
                </thead>
                <tbody>
                  {periodRows.map((r) => (
                    <tr key={r.label}>
                      <td className="py-2 pr-2 border-b border-border-soft font-mono text-foreground">{r.label}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.transactionCount}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalBales}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalNetWeight.toFixed(1)}</td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber font-bold">{formatCurrency(r.totalPrice)}</td>
                      <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-emerald">{formatCurrency(r.totalPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </>
          )
        )}

        {tab === "transaction" && (
          txRows === null ? (
            <p className="py-8 text-center text-muted-foreground text-sm">Atur filter lalu tekan &quot;Tampilkan&quot;.</p>
          ) : txRows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">Tidak ada data pada periode ini.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
                <Stat label="Transaksi" value={String(txRows.length)} />
                <Stat label="Bale" value={String(txTotals!.totalBales)} />
                <Stat label="Total Netto" value={`${txTotals!.totalNetWeight.toFixed(1)} kg`} />
                <Stat label="Total Harga" value={formatCurrency(txTotals!.totalPrice)} />
                <Stat label="Dibayar" value={formatCurrency(txTotals!.paidAmount)} />
              </div>
              <div className="space-y-4">
                {txRows.map((p) => (
                  <div key={p.id} className="border border-border-soft rounded-lg">
                    <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-2 px-3 py-2 border-b border-border-soft bg-panel-alt/40 rounded-t-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[12px] font-bold text-foreground">{p.transactionCode}</span>
                        <span className="text-[11.5px] text-muted-foreground">{p.farmerName}</span>
                        <span className="text-[10.5px] font-mono text-muted-2">{formatDate(p.transactionDate)}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-[11px] text-muted-2">{p.warehouseCode ?? "—"} · {p.laneCode ?? "—"}</span>
                        <span className="font-mono text-[11.5px] text-amber font-bold">{formatCurrency(p.totalPrice)}</span>
                        <StatusPill status={p.status as "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"} />
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] border-collapse text-[12px]">
                      <thead>
                        <tr>
                          <th className="text-left text-[10px] uppercase font-bold text-muted-2 py-1.5 px-3">Barcode</th>
                          <th className="text-left text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Tanggal</th>
                          <th className="text-left text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Grade</th>
                          <th className="text-left text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Customer</th>
                          <th className="text-right text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Bruto</th>
                          <th className="text-right text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Pot. MC</th>
                          <th className="text-right text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Pot. Packing</th>
                          <th className="text-right text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Netto</th>
                          <th className="text-right text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Harga</th>
                          <th className="text-right text-[10px] uppercase font-bold text-muted-2 py-1.5 px-2">Adj</th>
                          <th className="text-right text-[10px] uppercase font-bold text-muted-2 py-1.5 px-3">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.items.map((i) => (
                          <tr key={i.id}>
                            <td className="py-1.5 px-3 font-mono text-foreground">{i.labelCode}</td>
                            <td className="py-1.5 px-2 font-mono text-muted-foreground">{formatDate(p.transactionDate)}</td>
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
                    </table>
                    </div>
                  </div>
                ))}
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
          companyName={companyName}
        />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel-alt border border-border-soft rounded-lg p-3 text-center">
      <p className="text-[10px] uppercase font-bold text-muted-2">{label}</p>
      <p className="font-mono font-bold text-foreground text-[14px] mt-1">{value}</p>
    </div>
  )
}
