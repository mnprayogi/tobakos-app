import {
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Database,
  FileText,
  HandCoins,
  Landmark,
  ScanBarcode,
  Scale,
  ScanLine,
  TrendingDown,
  Wallet,
} from "lucide-react"

import { formatCurrency } from "@/lib/utils"
import type { AdminDashboard } from "@/lib/actions/dashboard"
import { KpiCard, KpiSectionTitle } from "./kpi-card"
import { MiniBarChart, formatCompact } from "./mini-bar-chart"
import { StatusDonut } from "./status-donut"
import { Panel } from "./panel"
import { QuickActions } from "./quick-actions"
import { BaleTable } from "./bale-table"
import { PaymentTable } from "./payment-table"

export function AdminView({ data }: { data: AdminDashboard }) {
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
            delta={{ value: data.today.draftTransactions, compare: data.today.yesterdayDraftTransactions }}
          />
          <KpiCard
            label="Nilai hari ini"
            value={formatCurrency(data.today.todaySubtotal)}
            icon={Wallet}
            delta={{ value: data.today.todaySubtotal, compare: data.today.yesterdaySubtotal }}
          />
        </div>
      </section>

      <section className="space-y-2.5">
        <KpiSectionTitle label="Keuangan" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Total transaksi" value={String(data.finance.totalTransactions)} icon={ClipboardList} />
          <KpiCard label="Total diterima" value={formatCurrency(data.finance.totalPaid)} icon={CheckCircle2} tone="emerald" />
          <KpiCard label="Sisa tagihan" value={formatCurrency(data.finance.totalRemaining)} icon={TrendingDown} tone="red" />
          <KpiCard label="Menunggu review" value={String(data.finance.awaitingReview)} icon={Clock} tone="amber" />
          <KpiCard label="Hutang transaksi" value={formatCurrency(data.finance.debtRemaining)} icon={HandCoins} />
          <KpiCard label="Hutang modal" value={formatCurrency(data.finance.loanOutstanding)} icon={Landmark} />
        </div>
      </section>

      <QuickActions
        items={[
          { href: "/pos-1/grading", label: "Pos 1 · Grading", desc: "Input bale", icon: ScanLine },
          { href: "/pos-2/weighing", label: "Pos 2 · Penimbangan", desc: "Scan & timbang", icon: ScanBarcode },
          { href: "/admin/transactions", label: "Transaksi", desc: "Review & bayar", icon: ClipboardList },
          { href: "/admin/master-data", label: "Master Data", desc: "Kelola data", icon: Database },
          { href: "/admin/loans", label: "Hutang Modal", desc: "Pinjaman petani", icon: Landmark },
          { href: "/admin/reports", label: "Laporan", desc: "Rekap & export", icon: BarChart3 },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Tren 7 hari · omzet">
          <MiniBarChart rows={data.trend.map((t) => ({ label: t.label, title: t.title, value: t.totalPrice }))} formatValue={formatCompact} />
        </Panel>
        <Panel title="Status transaksi">
          <StatusDonut data={data.byStatus} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Bale terbaru hari ini">
          <BaleTable items={data.recentBales} empty="Belum ada bale hari ini." />
        </Panel>
        <Panel title="Pembayaran terakhir">
          <PaymentTable items={data.recentPayments} empty="Belum ada pembayaran." />
        </Panel>
      </div>
    </div>
  )
}
