import { redirect } from "next/navigation"
import {
  Banknote,
  CalendarClock,
  Handshake,
  Hourglass,
  Package,
  PackageSearch,
  Scale,
} from "lucide-react"
import { auth } from "@/lib/auth"
import { getCustomerPortalData } from "@/lib/actions/portal"
import { formatCurrency, formatDate, formatWeight } from "@/lib/utils"
import { PageHeader } from "@/components/shared/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { KpiCard, KpiSectionTitle } from "@/components/dashboard/kpi-card"
import { PrintButton } from "@/components/portal/print-button"

export const dynamic = "force-dynamic"

export default async function PortalPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "CUSTOMER") redirect("/")

  const data = await getCustomerPortalData()

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Handshake}
        title={`Alokasi untuk ${data.customerName}`}
        subtitle="Rekap bale tembakau yang dialokasikan ke mitra Anda"
      >
        <PrintButton />
      </PageHeader>

      <section className="space-y-2.5">
        <KpiSectionTitle label="Total Alokasi" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Total Bale" value={`${data.totalBales}`} icon={Package} />
          <KpiCard label="Total Netto" value={`${formatWeight(data.totalNetWeight)} kg`} icon={Scale} />
          <KpiCard
            label="Total Nilai Alokasi"
            value={formatCurrency(data.totalSubtotal)}
            icon={Banknote}
            tone="emerald"
          />
        </div>
      </section>

      <section className="space-y-2.5 print:hidden">
        <KpiSectionTitle label="Hari Ini" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard label="Bale Masuk Hari Ini" value={`${data.todayBales}`} icon={CalendarClock} tone="blue" />
          <KpiCard label="Nilai Masuk Hari Ini" value={formatCurrency(data.todaySubtotal)} icon={Banknote} tone="blue" />
          <KpiCard label="Menunggu Timbang" value={`${data.awaitingWeigh}`} icon={Hourglass} tone="amber" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel-alt text-left">
                <th className="px-3 py-2.5 font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Tanggal</th>
                <th className="px-3 py-2.5 font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">No. Transaksi</th>
                <th className="px-3 py-2.5 font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Petani</th>
                <th className="px-3 py-2.5 font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Grade</th>
                <th className="px-3 py-2.5 text-right font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Bruto</th>
                <th className="px-3 py-2.5 text-right font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Potongan</th>
                <th className="px-3 py-2.5 text-right font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Netto</th>
                <th className="px-3 py-2.5 text-right font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Nilai</th>
                <th className="px-3 py-2.5 font-sans text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-14 text-center">
                    <PackageSearch className="mx-auto size-8 text-muted-2" />
                    <p className="mt-3 text-sm font-bold text-muted-foreground">Belum ada alokasi bale</p>
                    <p className="mt-1 text-xs text-muted-2">
                      Bale yang dialokasikan ke mitra ini akan tampil di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                data.items.map((bale) => {
                  const deduction =
                    bale.grossWeight != null && bale.netWeight != null
                      ? bale.grossWeight - bale.netWeight
                      : null
                  const weighed = bale.netWeight != null
                  return (
                    <tr key={bale.id} className="border-b border-border-soft last:border-b-0 hover:bg-panel-alt/60">
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-muted-foreground">
                        {formatDate(bale.transactionDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] font-bold text-foreground">
                        {bale.transactionCode}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 font-sans font-semibold text-foreground">
                        {bale.farmerName}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-mono text-[12.5px] font-bold text-amber">{bale.grade}</p>
                        <p className="text-[10.5px] text-muted-2">
                          {bale.leafTypeName} · {bale.tobaccoTypeName}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] text-muted-foreground">
                        {weighed ? `${formatWeight(bale.grossWeight)} kg` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] text-red-deduction">
                        {deduction != null ? (
                          <>
                            −{formatWeight(deduction)} kg
                            <span className="block text-[10px] text-muted-2">
                              packing {formatWeight(bale.packingWeight)} · MC {bale.moisturePercent}%
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12.5px] font-bold text-emerald">
                        {weighed ? `${formatWeight(bale.netWeight)} kg` : "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12.5px] font-bold text-foreground">
                        {weighed ? (
                          <>
                            {formatCurrency(bale.subtotal)}
                            {bale.pricePerKg != null && (
                              <span className="block text-[10px] font-normal text-muted-2">
                                {formatCurrency(bale.pricePerKg)}/kg
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <StatusPill status={bale.status as "GRADED" | "WEIGHED" | "CLOSED"} />
                        <span className="mt-1 block font-mono text-[9.5px] uppercase text-muted-2">
                          Nota: {bale.purchaseStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        {data.items.length >= 200 && (
          <p className="border-t border-border px-3 py-2 text-center text-[11px] text-muted-2 print:hidden">
            Menampilkan 200 alokasi terbaru dari {data.totalBales} total bale.
          </p>
        )}
      </section>
    </div>
  )
}
