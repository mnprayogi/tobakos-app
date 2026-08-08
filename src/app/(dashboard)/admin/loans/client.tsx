"use client"

import { useState } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { getLoansData, type LoanAccount } from "@/lib/actions/loans"
import type { WarehouseScope } from "@/lib/actions/scope"
import { LoanDialog, type LoanDialogState, type LoanFarmer } from "@/components/admin/loan-dialog"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { useSse } from "@/hooks/useSse"

export function LoansClient({
  loans: initial,
  farmers,
  scope,
}: {
  loans: LoanAccount[]
  farmers: LoanFarmer[]
  scope: WarehouseScope
}) {
  const [loans, setLoans] = useState(initial)
  const [dialog, setDialog] = useState<LoanDialogState | null>(null)

  async function refresh() {
    setLoans(await getLoansData())
  }

  useSse(null, (event) => {
    if (event.type === "loan.updated" || event.type === "payment.recorded") {
      refresh()
    }
  })

  const totalBalance = loans.reduce((s, l) => s + l.balance, 0)
  const totalBorrowed = loans.reduce((s, l) => s + l.totalBorrowed, 0)
  const activeCount = loans.filter((l) => l.balance > 0.005 && l.status === "ACTIVE").length
  const scoped = scope.mode === "scoped"

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Wallet}
        title="Hutang Modal"
        subtitle="Buku hutang modal, pinjaman & pembayaran petani"
      >
        {scoped && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-alt border border-border-soft px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-emerald" />
            Gudang: {scope.warehouseName}
          </span>
        )}
        <button
          onClick={() => setDialog({ mode: "disburse" })}
          className="rounded-lg bg-emerald px-3.5 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer"
        >
          + Beri Pinjaman
        </button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Total Sisa Hutang</p>
          <p className="font-mono font-bold text-2xl text-red-deduction">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Total Pinjaman</p>
          <p className="font-mono font-bold text-2xl text-amber">{formatCurrency(totalBorrowed)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Petani Berhutang</p>
          <p className="font-mono font-bold text-2xl text-emerald">{activeCount}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {loans.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Wallet className="size-4 text-muted-2" />
              </EmptyMedia>
              <EmptyTitle>Belum ada buku hutang</EmptyTitle>
              <EmptyDescription>Klik &quot;Beri Pinjaman&quot; untuk membuka buku hutang modal petani.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {loans.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Petani</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">NIK</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Gudang</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total Pinjam</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total Bayar</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Sisa Hutang</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Status</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.loanId}>
                  <td className="py-2 pr-2 border-b border-border-soft font-bold text-foreground">{l.farmerName}</td>
                  <td className="py-2 px-2 border-b border-border-soft font-mono text-muted-foreground">{l.farmerNik ?? "—"}</td>
                  <td className="py-2 px-2 border-b border-border-soft font-bold text-muted-foreground text-[11.5px]">{l.warehouseName}</td>
                  <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">{formatCurrency(l.totalBorrowed)}</td>
                  <td className="py-2 px-2 border-b border-border-soft font-mono text-emerald">{formatCurrency(l.totalRepaid)}</td>
                  <td className="py-2 px-2 border-b border-border-soft font-mono font-bold text-red-deduction">{formatCurrency(l.balance)}</td>
                  <td className="py-2 px-2 border-b border-border-soft">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      l.status === "ACTIVE" && l.balance > 0.005
                        ? "bg-amber/12 text-amber border-amber/35"
                        : "bg-muted/12 text-muted border-border"
                    }`}>
                      {l.status === "ACTIVE" && l.balance > 0.005 ? "Berhutang" : "Lunas"}
                    </span>
                  </td>
                  <td className="py-2 pl-2 border-b border-border-soft">
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {l.status === "ACTIVE" && l.balance > 0.005 && (
                        <button
                          onClick={() => setDialog({ mode: "repay", loanId: l.loanId, farmerName: l.farmerName, loanBalance: l.balance })}
                          className="text-[11px] font-bold text-emerald cursor-pointer hover:underline"
                        >
                          Bayar Tunai
                        </button>
                      )}
                      <Link href={`/admin/loans/${l.loanId}`} className="text-[11px] font-bold text-foreground/70 cursor-pointer hover:underline">
                        Buku Hutang
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <LoanDialog
        state={dialog}
        farmers={farmers}
        warehouseName={scoped ? scope.warehouseName : undefined}
        onClose={() => setDialog(null)}
        onDone={refresh}
      />
    </div>
  )
}
