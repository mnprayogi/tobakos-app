import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  HandCoins,
  Landmark,
  Scale,
  ScanLine,
  TrendingDown,
  Wallet,
} from "lucide-react"
import Link from "next/link"

import { formatCurrency } from "@/lib/utils"
import type { AdminDashboard } from "@/lib/actions/dashboard"
import { dashboardRangeTrendDays } from "@/lib/dashboard-range"
import type { DashboardRange } from "@/lib/dashboard-range"
import { KpiCard, KpiSectionTitle } from "./kpi-card"
import { MiniBarChart, formatCompact } from "./mini-bar-chart"
import { StatusDonut } from "./status-donut"
import { GradeCompositionPanel } from "./grade-composition-panel"
import { Panel } from "./panel"
import { PendingReviewWidget } from "./pending-review-widget"
import { BaleTable } from "./bale-table"
import { PaymentTable } from "./payment-table"

export function AdminView({ data, range }: { data: AdminDashboard; range: DashboardRange }) {
  const trendDays = dashboardRangeTrendDays(range)
  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <KpiSectionTitle label="Operasional · Hari Ini" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            label="Bale di-grade hari ini"
            value={String(data.today.graded)}
            icon={ScanLine}
            tone="emerald"
            delta={{ value: data.today.graded, compare: data.today.yesterdayGraded }}
          />
          <KpiCard
            label="Ditimbang hari ini"
            value={String(data.today.weighed)}
            icon={Scale}
            delta={{ value: data.today.weighed, compare: data.today.yesterdayWeighed }}
          />
          <KpiCard label="Menunggu timbang" value={String(data.today.awaitingWeigh)} icon={Clock} tone="amber" />
          <KpiCard
            label="Transaksi aktif"
            value={String(data.today.draftTransactions)}
            icon={FileText}
            tone="blue"
            delta={{ value: data.today.draftTransactions, compare: data.today.yesterdayDraftTransactions }}
          />
          <KpiCard
            label="Nilai hari ini"
            value={formatCurrency(data.today.todaySubtotal)}
            icon={Wallet}
            tone="blue"
            delta={{ value: data.today.todaySubtotal, compare: data.today.yesterdaySubtotal }}
          />
        </div>
      </section>

      <section className="space-y-2.5">
        <KpiSectionTitle label="Keuangan" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total transaksi" value={String(data.finance.totalTransactions)} icon={ClipboardList} />
          <KpiCard
            label="Total terbayar"
            value={formatCurrency(data.finance.totalPaid)}
            icon={CheckCircle2}
            tone="emerald"
            delta={data.finance.totalPaidPrev != null ? { value: data.finance.totalPaid, compare: data.finance.totalPaidPrev } : undefined}
          />
          <KpiCard
            label="Sisa tagihan"
            value={formatCurrency(data.finance.totalRemaining)}
            icon={TrendingDown}
            tone={data.finance.totalRemaining > 0 ? "red" : "default"}
          />
          <KpiCard label="Menunggu review" value={String(data.finance.awaitingReview)} icon={Clock} tone="amber" />
          <KpiCard
            label="Utang transaksi"
            value={formatCurrency(data.finance.debtRemaining)}
            icon={HandCoins}
            tone={data.finance.debtRemaining > 0 ? "amber" : "default"}
          />
          <KpiCard
            label="Utang piutang"
            value={formatCurrency(data.finance.loanOutstanding)}
            icon={Landmark}
            tone={data.finance.loanOutstanding > 0 ? "amber" : "default"}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title={`Tren ${trendDays} hari · nilai transaksi`}>
            <MiniBarChart
              rows={data.trend.map((t) => ({ label: t.label, title: t.title, value: t.totalPrice }))}
              formatValue={formatCompact}
              labelStep={trendDays > 14 ? 5 : 1}
              showValues={trendDays <= 14}
            />
          </Panel>
        </div>
        <PendingReviewWidget items={data.pendingReview} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Status transaksi">
          <StatusDonut data={data.byStatus} />
        </Panel>
        <div className="lg:col-span-2">
          <Panel title="Per Grade / Komposisi">
            <GradeCompositionPanel
              initialItems={data.closedByGrade}
              range={range}
              selectable={false}
              warehouses={[]}
            />
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title={range === "today" ? "Bale terbaru hari ini" : "Bale terbaru"}
          action={
            <Link href="/admin/transactions" className="text-[11.5px] font-bold text-emerald hover:underline">
              Lihat semua →
            </Link>
          }
        >
          <BaleTable items={data.recentBales} empty="Belum ada bale." />
        </Panel>
        <Panel
          title="Pembayaran terakhir"
          action={
            <Link href="/admin/transactions" className="text-[11.5px] font-bold text-emerald hover:underline">
              Lihat semua →
            </Link>
          }
        >
          <PaymentTable items={data.recentPayments} empty="Belum ada pembayaran." />
        </Panel>
      </div>
    </div>
  )
}
