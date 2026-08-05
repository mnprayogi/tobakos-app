"use client"

import Link from "next/link"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import type {
  GraderDashboard,
  OperatorDashboard,
  FinanceDashboard,
  OwnerDashboard,
  AdminDashboard,
  RecentBale,
  RecentPayment,
} from "@/lib/actions/dashboard"

export type DashboardView =
  | { role: "GRADER"; data: GraderDashboard }
  | { role: "OPERATOR"; data: OperatorDashboard }
  | { role: "FINANCE"; data: FinanceDashboard }
  | { role: "OWNER"; data: OwnerDashboard }
  | { role: "ADMIN"; data: AdminDashboard }
  | { role: "SUPER_ADMIN"; data: OwnerDashboard }

type KpiTone = "default" | "emerald" | "amber" | "red"

export function DashboardClient({
  view,
  userName,
}: {
  view: DashboardView
  userName: string
}) {
  const today = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">
          Halo, {userName} · {today}
        </p>
      </header>

      {view.role === "GRADER" && <GraderView data={view.data} />}
      {view.role === "OPERATOR" && <OperatorView data={view.data} />}
      {view.role === "FINANCE" && <FinanceView data={view.data} />}
      {view.role === "OWNER" && <OwnerView data={view.data} />}
      {view.role === "ADMIN" && <AdminView data={view.data} />}
      {view.role === "SUPER_ADMIN" && <OwnerView data={view.data} />}
    </div>
  )
}

// ─── GRADER ─────────────────────────────────────────

function GraderView({ data }: { data: GraderDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Bale di-grade hari ini" value={String(data.todayGraded)} tone="emerald" />
        <Kpi label="Transaksi aktif hari ini" value={String(data.todayDraftTransactions)} />
        <Kpi label="Petani aktif hari ini" value={String(data.todayActiveFarmers)} />
        <Kpi label="Menunggu penimbangan" value={String(data.awaitingWeigh)} tone="amber" />
      </div>

      <QuickLinks
        items={[
          { href: "/pos-1/grading", label: "Buka Pos 1 · Grading", desc: "Input bale baru & cetak stiker" },
        ]}
      />

      <Panel title="Bale terbaru hari ini">
        <BaleTable items={data.recentBales} empty="Belum ada bale yang di-grade hari ini." />
      </Panel>
    </div>
  )
}

// ─── OPERATOR ───────────────────────────────────────

function OperatorView({ data }: { data: OperatorDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Ditimbang hari ini" value={String(data.todayWeighed)} tone="emerald" />
        <Kpi label="Menunggu timbang" value={String(data.awaitingWeigh)} tone="amber" />
        <Kpi label="Netto hari ini" value={`${data.todayNetWeight.toFixed(1)} kg`} />
        <Kpi label="Nilai hari ini" value={formatCurrency(data.todaySubtotal)} />
      </div>

      <QuickLinks
        items={[
          { href: "/pos-2/weighing", label: "Buka Pos 2 · Penimbangan", desc: "Scan barcode & ambil berat" },
        ]}
      />

      <Panel title="Bale terakhir ditimbang">
        <BaleTable items={data.recentWeighed} empty="Belum ada bale yang ditimbang." />
      </Panel>
    </div>
  )
}

// ─── FINANCE ────────────────────────────────────────

function FinanceView({ data }: { data: FinanceDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Menunggu review" value={String(data.awaitingReview)} tone="amber" />
        <Kpi label="Total tagihan" value={formatCurrency(data.debtTotal)} />
        <Kpi label="Sudah dibayar" value={formatCurrency(data.debtPaid)} tone="emerald" />
        <Kpi label="Sisa tagihan" value={formatCurrency(data.debtRemaining)} tone="red" />
        <Kpi label="Pinjaman beredar" value={formatCurrency(data.loanOutstanding)} />
        <Kpi label="Buku hutang aktif" value={String(data.loanActiveCount)} />
      </div>

      <QuickLinks
        items={[
          { href: "/admin/transactions", label: "Transaksi", desc: "Kelola & tutup transaksi" },
          { href: "/admin/debt", label: "Hutang Transaksi", desc: "Rekap piutang per petani" },
          { href: "/admin/loans", label: "Hutang Modal", desc: "Pinjaman petani" },
          { href: "/admin/reports", label: "Laporan", desc: "Rekap & export PDF" },
        ]}
      />

      <Panel title="Pembayaran terakhir">
        <PaymentTable items={data.recentPayments} empty="Belum ada pembayaran." />
      </Panel>
    </div>
  )
}

// ─── OWNER ──────────────────────────────────────────

function OwnerView({ data }: { data: OwnerDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total transaksi" value={String(data.totalTransactions)} />
        <Kpi label="Total bale" value={String(data.totalBales)} />
        <Kpi label="Total netto" value={`${data.totalNetWeight.toFixed(1)} kg`} />
        <Kpi label="Omzet" value={formatCurrency(data.totalPrice)} />
        <Kpi label="Diterima" value={formatCurrency(data.totalPaid)} tone="emerald" />
        <Kpi label="Sisa tagihan" value={formatCurrency(data.totalRemaining)} tone="red" />
        <Kpi label="Hutang modal beredar" value={formatCurrency(data.loanOutstanding)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {data.byStatus.map((s) => (
          <Kpi key={s.status} label={`Transaksi ${s.status}`} value={String(s.count)} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Panel title="Tren 7 hari terakhir">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Hari</th>
                  <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Tx</th>
                  <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Bale</th>
                  <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto</th>
                  <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.trend.map((r) => (
                  <tr key={r.label}>
                    <td className="py-1.5 pr-2 border-b border-border-soft text-foreground">{r.label}</td>
                    <td className="py-1.5 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.transactionCount}</td>
                    <td className="py-1.5 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalBales}</td>
                    <td className="py-1.5 px-2 border-b border-border-soft font-mono text-right text-foreground">{r.totalNetWeight.toFixed(1)}</td>
                    <td className="py-1.5 pl-2 border-b border-border-soft font-mono text-right text-amber font-bold">{formatCurrency(r.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Rekap per gudang">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[380px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Gudang</th>
                  <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Tx</th>
                  <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto</th>
                  <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.byWarehouse.map((w) => (
                  <tr key={w.code}>
                    <td className="py-1.5 pr-2 border-b border-border-soft text-foreground">
                      <b className="font-mono text-[11.5px]">{w.code}</b>
                      <span className="block text-[10.5px] text-muted-2">{w.name}</span>
                    </td>
                    <td className="py-1.5 px-2 border-b border-border-soft font-mono text-right text-foreground">{w.transactionCount}</td>
                    <td className="py-1.5 px-2 border-b border-border-soft font-mono text-right text-foreground">{w.totalNetWeight.toFixed(1)}</td>
                    <td className="py-1.5 pl-2 border-b border-border-soft font-mono text-right text-amber font-bold">{formatCurrency(w.totalPrice)}</td>
                  </tr>
                ))}
                {data.byWarehouse.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">Belum ada transaksi.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
            <p className="py-6 text-center text-muted-foreground text-sm">Belum ada transaksi.</p>
          )}
          {data.recentTransactions.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 flex-wrap border border-border-soft rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-[12px] font-bold text-foreground">{t.transactionCode}</span>
                <span className="text-[11.5px] text-muted-foreground">{t.farmerName}</span>
                <span className="text-[10.5px] font-mono text-muted-2">
                  {formatDateTime(t.transactionDate)} · {t.laneCode ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10.5px] font-mono text-muted-2">{t.totalBales} bale</span>
                <span className="font-mono text-[12px] text-amber font-bold">{formatCurrency(t.totalPrice)}</span>
                <StatusPill status={t.status as "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ─── ADMIN ──────────────────────────────────────────

function AdminView({ data }: { data: AdminDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Bale di-grade hari ini" value={String(data.today.graded)} tone="emerald" />
        <Kpi label="Ditimbang hari ini" value={String(data.today.weighed)} />
        <Kpi label="Menunggu timbang" value={String(data.today.awaitingWeigh)} tone="amber" />
        <Kpi label="Transaksi aktif" value={String(data.today.draftTransactions)} />
        <Kpi label="Nilai hari ini" value={formatCurrency(data.today.todaySubtotal)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total transaksi" value={String(data.finance.totalTransactions)} />
        <Kpi label="Total diterima" value={formatCurrency(data.finance.totalPaid)} tone="emerald" />
        <Kpi label="Sisa tagihan" value={formatCurrency(data.finance.totalRemaining)} tone="red" />
        <Kpi label="Menunggu review" value={String(data.finance.awaitingReview)} tone="amber" />
        <Kpi label="Hutang transaksi" value={formatCurrency(data.finance.debtRemaining)} />
        <Kpi label="Hutang modal beredar" value={formatCurrency(data.finance.loanOutstanding)} />
      </div>

      <QuickLinks
        items={[
          { href: "/pos-1/grading", label: "Pos 1 · Grading", desc: "Input bale" },
          { href: "/pos-2/weighing", label: "Pos 2 · Penimbangan", desc: "Scan & timbang" },
          { href: "/admin/transactions", label: "Transaksi", desc: "Review & bayar" },
          { href: "/admin/master-data", label: "Master Data", desc: "Kelola data" },
          { href: "/admin/loans", label: "Hutang Modal", desc: "Pinjaman petani" },
          { href: "/admin/reports", label: "Laporan", desc: "Rekap & export" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

// ─── Shared UI ───────────────────────────────────────

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: string
  tone?: KpiTone
}) {
  const toneCls: Record<KpiTone, string> = {
    default: "text-foreground",
    emerald: "text-emerald",
    amber: "text-amber",
    red: "text-red-deduction",
  }
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">{label}</p>
      <p className={`font-mono font-bold text-[20px] mt-1.5 ${toneCls[tone]}`}>{value}</p>
    </div>
  )
}

function QuickLinks({
  items,
}: {
  items: { href: string; label: string; desc: string }[]
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3 flex flex-col gap-0.5 hover:bg-emerald/15 transition-colors"
        >
          <span className="text-[13px] font-bold text-emerald">{item.label}</span>
          <span className="text-[11px] text-muted-foreground">{item.desc}</span>
        </Link>
      ))}
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-2">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function BaleTable({ items, empty }: { items: RecentBale[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-muted-foreground text-sm">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Barcode</th>
            <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Petani</th>
            <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Grade</th>
            <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Customer</th>
            <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto</th>
            <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Subtotal</th>
            <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id}>
              <td className="py-2 pr-2 border-b border-border-soft font-mono text-foreground">
                {b.labelCode}
                <span className="block text-[10px] text-muted-2">{formatDateTime(b.createdAt)}</span>
              </td>
              <td className="py-2 px-2 border-b border-border-soft text-foreground">{b.farmerName}</td>
              <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{b.grade}</td>
              <td className="py-2 px-2 border-b border-border-soft text-muted-foreground">{b.customerName ?? "—"}</td>
              <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-foreground">
                {b.netWeight != null ? `${b.netWeight.toFixed(1)} kg` : "—"}
              </td>
              <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-amber font-bold">
                {formatCurrency(b.subtotal)}
              </td>
              <td className="py-2 pl-2 border-b border-border-soft text-right">
                <StatusPill status={b.status as "GRADED" | "WEIGHED" | "CLOSED"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentTable({ items, empty }: { items: RecentPayment[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-muted-foreground text-sm">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Transaksi</th>
            <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Petani</th>
            <th className="text-left text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Metode</th>
            <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Jumlah</th>
            <th className="text-right text-[10px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Waktu</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td className="py-2 pr-2 border-b border-border-soft font-mono text-foreground">{p.transactionCode}</td>
              <td className="py-2 px-2 border-b border-border-soft text-foreground">{p.farmerName}</td>
              <td className="py-2 px-2 border-b border-border-soft">
                <span className="text-[10.5px] font-bold text-muted-2 px-2 py-0.5 rounded-full border border-border-soft">
                  {p.method}
                </span>
              </td>
              <td className="py-2 px-2 border-b border-border-soft font-mono text-right text-emerald font-bold">
                {formatCurrency(p.amount)}
              </td>
              <td className="py-2 pl-2 border-b border-border-soft font-mono text-right text-muted-2 text-[11px]">
                {formatDateTime(p.paidAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
