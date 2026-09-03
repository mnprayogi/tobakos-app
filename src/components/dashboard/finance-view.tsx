import {
  Banknote,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Landmark,
  RefreshCcw,
  TrendingDown,
  Wallet,
} from "lucide-react"
import Link from "next/link"

import { formatCurrency } from "@/lib/utils"
import type { FinanceDashboard } from "@/lib/actions/dashboard"
import { KpiCard, KpiSectionTitle } from "./kpi-card"
import { MiniBarChart, formatCompact } from "./mini-bar-chart"
import { Panel } from "./panel"
import { PaymentTable } from "./payment-table"

export function FinanceView({ data }: { data: FinanceDashboard }) {
  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <KpiSectionTitle label="Operasional" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Menunggu review" value={String(data.awaitingReview)} icon={RefreshCcw} tone="amber" />
          <KpiCard
            label="Pembayaran hari ini"
            value={String(data.todayPayments)}
            icon={Banknote}
            delta={{ value: data.todayPayments, compare: data.yesterdayPayments }}
          />
          <KpiCard
            label="Nominal bayar hari ini"
            value={formatCurrency(data.todayPaymentAmount)}
            icon={Wallet}
            delta={{ value: data.todayPaymentAmount, compare: data.yesterdayPaymentAmount }}
          />
        </div>
      </section>

      <section className="space-y-2.5">
        <KpiSectionTitle label="Keuangan" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard label="Nilai transaksi" value={formatCurrency(data.omzet)} icon={BarChart3} tone="blue" />
          <KpiCard label="Total terbayar" value={formatCurrency(data.totalReceived)} icon={CheckCircle2} tone="emerald" />
          <KpiCard
            label="Sisa tagihan"
            value={formatCurrency(data.debtRemaining)}
            icon={TrendingDown}
            tone={data.debtRemaining > 0 ? "red" : "default"}
          />
          <KpiCard
            label="Utang piutang beredar"
            value={formatCurrency(data.loanOutstanding)}
            icon={Landmark}
            tone={data.loanOutstanding > 0 ? "amber" : "default"}
          />
          <KpiCard
            label="Buku utang aktif"
            value={String(data.loanActiveCount)}
            icon={BookOpen}
            tone={data.loanActiveCount > 0 ? "amber" : "default"}
          />
        </div>
      </section>

      <Panel title="Tren 7 hari · nilai transaksi">
        <MiniBarChart
          rows={data.trend.map((t) => ({ label: t.label, title: t.title, value: t.totalPrice }))}
          formatValue={formatCompact}
          showValues
        />
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
  )
}
