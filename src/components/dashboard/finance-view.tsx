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
import { KpiCard } from "./kpi-card"
import { Panel } from "./panel"
import { PaymentTable } from "./payment-table"
import { QuickActions } from "./quick-actions"

export function FinanceView({ data }: { data: FinanceDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <KpiCard label="Sisa tagihan" value={formatCurrency(data.debtRemaining)} icon={TrendingDown} tone="red" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Total tagihan" value={formatCurrency(data.debtTotal)} icon={HandCoins} />
        <KpiCard label="Sudah dibayar" value={formatCurrency(data.debtPaid)} icon={CheckCircle2} tone="emerald" />
        <KpiCard label="Pinjaman beredar" value={formatCurrency(data.loanOutstanding)} icon={Landmark} />
        <KpiCard label="Buku hutang aktif" value={String(data.loanActiveCount)} icon={BookOpen} />
      </div>

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
