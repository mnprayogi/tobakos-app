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
import { MiniBarChart, formatCompact } from "./mini-bar-chart"
import { StatusDonut } from "./status-donut"
import { Panel } from "./panel"

export function OwnerView({ data, range }: { data: OwnerDashboard; range: DashboardRange }) {
  const trendDays = dashboardRangeTrendDays(range)
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
          <KpiCard label="Omzet" value={formatCurrency(data.totalPrice)} icon={Wallet} tone="blue" />
          <KpiCard label="Diterima" value={formatCurrency(data.totalPaid)} icon={TrendingUp} tone="emerald" />
          <KpiCard label="Sisa tagihan" value={formatCurrency(data.totalRemaining)} icon={TrendingDown} tone="red" />
          <KpiCard label="Hutang transaksi" value={formatCurrency(data.debtRemaining)} icon={HandCoins} />
          <KpiCard label="Hutang modal beredar" value={formatCurrency(data.loanOutstanding)} icon={Landmark} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title={`Tren ${trendDays} hari · omzet`}>
          <MiniBarChart
            rows={data.trend.map((t) => ({ label: t.label, title: t.title, value: t.totalPrice }))}
            formatValue={formatCompact}
            labelStep={trendDays > 14 ? 5 : 1}
            showValues={trendDays <= 14}
          />
        </Panel>
        <Panel title="Status transaksi">
          <StatusDonut data={data.byStatus} />
        </Panel>
      </div>

      <Panel title="Rekap per gudang">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[380px] border-collapse text-[12.5px]">
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
              {data.byWarehouse.map((w) => (
                <tr key={w.code}>
                  <td className="border-b border-border-soft py-1.5 pr-2 text-foreground">
                    <b className="font-mono text-[11.5px]">{w.code}</b>
                    <span className="block text-[10.5px] text-muted-2">{w.name}</span>
                  </td>
                  <td className="border-b border-border-soft px-2 py-1.5 text-right font-mono text-foreground">{w.transactionCount}</td>
                  <td className="border-b border-border-soft px-2 py-1.5 text-right font-mono text-foreground">
                    {w.totalNetWeight.toFixed(1)} kg
                  </td>
                  <td className="border-b border-border-soft py-1.5 pl-2 text-right font-mono font-bold text-amber">{formatCurrency(w.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

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
