import { Clock, ScanBarcode, Scale, Wallet, Weight } from "lucide-react"

import { formatCurrency } from "@/lib/utils"
import type { OperatorDashboard } from "@/lib/actions/dashboard"
import { KpiCard } from "./kpi-card"
import { MiniBarChart } from "./mini-bar-chart"
import { Panel } from "./panel"
import { QuickActions } from "./quick-actions"
import { BaleTable } from "./bale-table"

export function OperatorView({ data }: { data: OperatorDashboard }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Ditimbang hari ini"
          value={String(data.todayWeighed)}
          icon={Scale}
          tone="emerald"
          delta={{ value: data.todayWeighed, compare: data.yesterdayWeighed }}
        />
        <KpiCard label="Menunggu timbang" value={String(data.awaitingWeigh)} icon={Clock} tone="amber" />
        <KpiCard
          label="Netto hari ini"
          value={`${data.todayNetWeight.toFixed(1)} kg`}
          icon={Weight}
          delta={{ value: data.todayNetWeight, compare: data.yesterdayNetWeight }}
        />
        <KpiCard
          label="Nilai hari ini"
          value={formatCurrency(data.todaySubtotal)}
          icon={Wallet}
          delta={{ value: data.todaySubtotal, compare: data.yesterdaySubtotal }}
        />
      </div>

      <QuickActions
        items={[
          {
            href: "/pos-2/weighing",
            label: "Buka Pos 2 · Penimbangan",
            desc: "Scan barcode & ambil berat",
            icon: ScanBarcode,
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Tren 7 hari · aktivitas">
          <MiniBarChart rows={data.trend.map((t) => ({ label: t.label, value: t.totalBales }))} />
        </Panel>
        <Panel title="Bale terakhir ditimbang">
          <BaleTable items={data.recentWeighed} empty="Belum ada bale yang ditimbang." />
        </Panel>
      </div>
    </div>
  )
}
