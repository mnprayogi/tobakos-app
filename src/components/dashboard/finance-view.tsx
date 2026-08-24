import {
  Banknote,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  HandCoins,
  Landmark,
  RefreshCcw,
  TrendingDown,
  Wallet,
} from "lucide-react"

import { formatCurrency } from "@/lib/utils"
import type { FinanceDashboard } from "@/lib/actions/dashboard"
import { KpiCard, KpiSectionTitle } from "./kpi-card"
import { Panel } from "./panel"
import { PaymentTable } from "./payment-table"
import { QuickActions } from "./quick-actions"

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Omzet" value={formatCurrency(data.omzet)} icon={BarChart3} tone="blue" />
          <KpiCard label="Diterima" value={formatCurrency(data.totalReceived)} icon={CheckCircle2} tone="emerald" />
          <KpiCard label="Sisa tagihan" value={formatCurrency(data.debtRemaining)} icon={TrendingDown} tone="red" />
          <KpiCard label="Hutang modal beredar" value={formatCurrency(data.loanOutstanding)} icon={Landmark} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Total tagihan hutang" value={formatCurrency(data.debtTotal)} icon={HandCoins} />
          <KpiCard label="Terbayar (hutang)" value={formatCurrency(data.debtPaid)} icon={Banknote} />
          <KpiCard label="Buku hutang aktif" value={String(data.loanActiveCount)} icon={BookOpen} />
        </div>
      </section>

      <QuickActions
        items={[
          { href: "/admin/transactions", label: "Transaksi", desc: "Kelola & tutup transaksi", icon: ClipboardList },
          { href: "/admin/debt", label: "Hutang Transaksi", desc: "Rekap piutang per petani", icon: HandCoins },
          { href: "/admin/loans", label: "Hutang Modal", desc: "Pinjaman petani", icon: Landmark },
          { href: "/admin/reports", label: "Laporan", desc: "Rekap & export PDF", icon: BarChart3 },
        ]}
      />

      <Panel title="Pembayaran terakhir">
        <PaymentTable items={data.recentPayments} empty="Belum ada pembayaran." />
      </Panel>
    </div>
  )
}
