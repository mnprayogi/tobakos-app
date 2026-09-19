import { redirect } from "next/navigation"
import {
  Banknote,
  CalendarClock,
  Handshake,
  Hourglass,
  Package,
  Scale,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { getCustomerPortalData } from "@/lib/actions/portal"
import { formatCurrency, formatWeight } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"
import { KpiCard, KpiSectionTitle } from "@/components/dashboard/kpi-card"
import { PortalFilterBar } from "@/components/portal/filter-bar"
import { PortalExportButton } from "@/components/portal/export-button"
import { PortalBaleTable } from "@/components/portal/bale-table"

export const dynamic = "force-dynamic"

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function safeParam(v?: string | string[]): string | null {
  const s = Array.isArray(v) ? v[0] : v
  return s && ISO_DATE.test(s) ? s : null
}

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[]; to?: string | string[]; status?: string | string[] }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "CUSTOMER") redirect("/")

  const params = await searchParams
  const from = safeParam(params.from)
  const to = safeParam(params.to)
  const statusParam = Array.isArray(params.status) ? params.status[0] : params.status
  const status = statusParam && ["GRADED", "WEIGHED", "CLOSED"].includes(statusParam) ? statusParam : null

  const data = await getCustomerPortalData({
    from: from ?? undefined,
    to: to ?? undefined,
    status: status ?? undefined,
  })

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Handshake}
        title={`Alokasi untuk ${data.customerName}`}
        subtitle="Rekap bale tembakau yang dialokasikan ke mitra Anda"
      >
        <PortalExportButton
          data={{ customerName: data.customerName, from, to, items: data.items }}
        />
      </PageHeader>

      <PortalFilterBar from={from} to={to} status={status} />

      <section className="space-y-2.5">
        <KpiSectionTitle label={from || to ? "Total Periode" : "Total Alokasi"} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Total Bale" value={`${data.totalBales}`} icon={Package} />
          <KpiCard label="Total Netto" value={`${formatWeight(data.totalNetWeight)}`} icon={Scale} />
          <KpiCard
            label="Total Nilai Alokasi"
            value={formatCurrency(data.totalSubtotal)}
            icon={Banknote}
            tone="emerald"
          />
        </div>
      </section>

      <section className="space-y-2.5">
        <KpiSectionTitle label="Hari Ini" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Bale Masuk Hari Ini" value={`${data.todayBales}`} icon={CalendarClock} tone="blue" />
          <KpiCard label="Nilai Masuk Hari Ini" value={formatCurrency(data.todaySubtotal)} icon={Banknote} tone="blue" />
          <KpiCard label="Menunggu Timbang" value={`${data.awaitingWeigh}`} icon={Hourglass} tone="amber" />
        </div>
      </section>

      <PortalBaleTable
        items={data.items}
        emptyTitle={from || to ? "Tidak ada alokasi pada periode ini" : "Belum ada alokasi bale"}
        emptyDescription="Bale yang dialokasikan ke mitra ini akan tampil di sini."
      />
    </div>
  )
}
