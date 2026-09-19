"use client"

import { useMemo, useState } from "react"
import { PackageSearch } from "lucide-react"
import { formatCurrency, formatDate, formatWeightNumber } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { Pagination } from "@/components/shared/pagination"
import type { PortalBale } from "@/lib/actions/portal"

interface Props {
  items: PortalBale[]
  emptyTitle: string
  emptyDescription: string
}

export function PortalBaleTable({ items, emptyTitle, emptyDescription }: Props) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
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
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-14 text-center">
                  <PackageSearch className="mx-auto size-8 text-muted-2" />
                  <p className="mt-3 text-sm font-bold text-muted-foreground">{emptyTitle}</p>
                  <p className="mt-1 text-xs text-muted-2">{emptyDescription}</p>
                </td>
              </tr>
            ) : (
              pageItems.map((bale) => {
                const deduction =
                  bale.grossWeight != null && bale.netWeight != null ? bale.grossWeight - bale.netWeight : null
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
                      {weighed ? `${formatWeightNumber(bale.grossWeight, 1)} kg` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12px] text-red-deduction">
                      {deduction != null ? (
                        <>
                          −{formatWeightNumber(deduction, 1)} kg
                          <span className="block text-[10px] text-muted-2">
                            packing {formatWeightNumber(bale.packingWeight, 1)} kg · MC {bale.moisturePercent}%
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[12.5px] font-bold text-emerald">
                      {weighed ? `${formatWeightNumber(bale.netWeight, 1)} kg` : "—"}
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
      <div className="px-3 pb-3">
        <Pagination
          page={safePage}
          pageSize={pageSize}
          totalItems={items.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>
    </section>
  )
}