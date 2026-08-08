import { Clock, FileText, ScanLine, Users } from "lucide-react"

import type { GraderDashboard } from "@/lib/actions/dashboard"
import { KpiCard } from "./kpi-card"
import { MiniBarChart } from "./mini-bar-chart"
import { Panel } from "./panel"
import { QuickActions } from "./quick-actions"
import { BaleTable } from "./bale-table"

export function GraderView({ data }: { data: GraderDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Bale di-grade hari ini"
          value={String(data.todayGraded)}
          icon={ScanLine}
          tone="emerald"
          delta={{ value: data.todayGraded, compare: data.yesterdayGraded }}
        />
        <KpiCard
          label="Transaksi aktif hari ini"
          value={String(data.todayDraftTransactions)}
          icon={FileText}
          delta={{ value: data.todayDraftTransactions, compare: data.yesterdayDraftTransactions }}
        />
        <KpiCard
          label="Petani aktif hari ini"
          value={String(data.todayActiveFarmers)}
          icon={Users}
          delta={{ value: data.todayActiveFarmers, compare: data.yesterdayActiveFarmers }}
        />
        <KpiCard label="Menunggu penimbangan" value={String(data.awaitingWeigh)} icon={Clock} tone="amber" />
      </div>

      <QuickActions
        items={[
          {
            href: "/pos-1/grading",
            label: "Buka Pos 1 · Grading",
            desc: "Input bale baru & cetak stiker",
            icon: ScanLine,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Tren 7 hari · bale di-grade">
          <MiniBarChart rows={data.trend.map((t) => ({ label: t.label, value: t.totalBales }))} />
        </Panel>
        <Panel title="Bale terbaru hari ini">
          <BaleTable items={data.recentBales} empty="Belum ada bale yang di-grade hari ini." />
        </Panel>
      </div>
    </div>
  )
}
