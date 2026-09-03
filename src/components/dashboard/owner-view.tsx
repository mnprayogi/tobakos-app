"use client"

import Link from "next/link"
import {
  Boxes,
  ClipboardList,
  HandCoins,
  Landmark,
  Scale,
  TrendingDown,
  TrendingUp,
  Warehouse,
  Wallet,
} from "lucide-react"

import { formatCurrency, formatDateTime } from "@/lib/utils"
import type { OwnerDashboard } from "@/lib/actions/dashboard"
import { dashboardRangeTrendDays } from "@/lib/dashboard-range"
import type { DashboardRange } from "@/lib/dashboard-range"
import { StatusPill } from "@/components/shared/status-pill"
import { KpiCard, KpiSectionTitle } from "./kpi-card"
import { MiniBarChart } from "./mini-bar-chart"
import { ChartRangeToggle } from "./chart-range-toggle"
import { StatusDonut } from "./status-donut"
import { GradeCompositionPanel } from "./grade-composition-panel"
import { Panel } from "./panel"

export function OwnerView({
  data,
  range,
  onRangeChange,
}: {
  data: OwnerDashboard
  range: DashboardRange
  onRangeChange: (r: DashboardRange) => void
}) {
  const trendDays = dashboardRangeTrendDays(range)
  const warehouseTotal = data.byWarehouse.reduce((s, w) => s + w.totalPrice, 0)
  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <KpiSectionTitle label="Operasional" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Total transaksi" value={String(data.totalTransactions)} icon={ClipboardList} />
          <KpiCard label="Total bale" value={String(data.totalBales)} icon={Boxes} />
          <KpiCard label="Total netto" value={`${data.totalNetWeight.toFixed(1)} kg`} icon={Scale} />
        </div>
      </section>

      <section className="space-y-2.5">
        <KpiSectionTitle label="Keuangan" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Nilai transaksi" value={formatCurrency(data.totalPrice)} icon={Wallet} tone="blue" />
          <KpiCard label="Total terbayar" value={formatCurrency(data.totalPaid)} icon={TrendingUp} tone="emerald" />
          <KpiCard
            label="Sisa tagihan"
            value={formatCurrency(data.totalRemaining)}
            icon={TrendingDown}
            tone={data.totalRemaining > 0 ? "red" : "default"}
          />
          <KpiCard
            label="Utang transaksi"
            value={formatCurrency(data.debtRemaining)}
            icon={HandCoins}
            tone={data.debtRemaining > 0 ? "amber" : "default"}
          />
          <KpiCard
            label="Utang piutang beredar"
            value={formatCurrency(data.loanOutstanding)}
            icon={Landmark}
            tone={data.loanOutstanding > 0 ? "amber" : "default"}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-10">
        <div className="lg:col-span-7">
          <Panel
            title={`Tren ${trendDays} hari · nilai transaksi`}
            action={<ChartRangeToggle value={range} onChange={onRangeChange} />}
          >
            <MiniBarChart
              rows={data.trend.map((t) => ({
                label: t.label,
                title: t.title,
                value: t.totalPrice,
                fullValue: t.totalPrice,
                baleCount: t.totalBales,
              }))}
              labelStep={trendDays > 14 ? 5 : 1}
              showValues={trendDays <= 14}
            />
          </Panel>
        </div>
        <div className="lg:col-span-3">
          <Panel title="Status transaksi">
            <StatusDonut data={data.byStatus} />
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Rekap per gudang">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="border-b border-border-soft pb-2 pr-2 text-left text-[10px] font-bold uppercase text-muted-2">Gudang</th>
                  <th className="border-b border-border-soft px-2 pb-2 text-right text-[10px] font-bold uppercase text-muted-2">Tx</th>
                  <th className="border-b border-border-soft px-2 pb-2 text-right text-[10px] font-bold uppercase text-muted-2">Netto</th>
                  <th className="border-b border-border-soft pb-2 pl-2 text-right text-[10px] font-bold uppercase text-muted-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byWarehouse.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
                {data.byWarehouse.map((w) => {
                  const pct = warehouseTotal > 0 ? (w.totalPrice / warehouseTotal) * 100 : 0
                  return (
                    <tr key={w.code} className="align-middle">
                      <td className="border-b border-border-soft py-2 pr-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11.5px] font-bold text-foreground">{w.code}</span>
                          <span className="font-mono text-[10px] text-muted-2">{pct.toFixed(1)}%</span>
                        </div>
                        <span className="mb-1 block truncate text-[10.5px] text-muted-2">{w.name}</span>
                        <span className="relative block h-1.5 w-full overflow-hidden rounded-full bg-panel-alt">
                          <span className="absolute inset-y-0 left-0 rounded-full bg-emerald" style={{ width: `${Math.min(100, pct)}%` }} />
                        </span>
                      </td>
                      <td className="border-b border-border-soft px-2 py-2 text-right font-mono text-foreground">{w.transactionCount}</td>
                      <td className="border-b border-border-soft px-2 py-2 text-right font-mono text-foreground">{w.totalNetWeight.toFixed(1)} kg</td>
                      <td className="border-b border-border-soft py-2 pl-2 text-right font-mono font-bold text-amber">{formatCurrency(w.totalPrice)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Per Grade / Komposisi">
          <GradeCompositionPanel
            initialItems={data.closedByGrade}
            range={range}
            selectable
            warehouses={data.warehouses}
          />
        </Panel>
      </div>

      <Panel
        title="Transaksi terakhir"
        action={
          <Link href="/admin/reports" className="text-[11.5px] font-bold text-emerald hover:underline">
            Lihat laporan →
          </Link>
        }
      >
        <div className="space-y-2">
          {data.recentTransactions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi.</p>
          )}
          {data.recentTransactions.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-soft px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[12px] font-bold text-foreground">{t.transactionCode}</span>
                <span className="text-[11.5px] text-muted-foreground">{t.farmerName}</span>
                <span className="font-mono text-[10.5px] text-muted-2">
                  {formatDateTime(t.transactionDate)} · {t.laneCode ?? "—"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1 font-mono text-[10.5px] text-muted-2">
                  <Warehouse className="size-3" />
                  {t.totalBales} bale
                </span>
                <span className="font-mono text-[12px] font-bold text-amber">{formatCurrency(t.totalPrice)}</span>
                <StatusPill status={t.status as "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
