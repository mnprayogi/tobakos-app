"use client"

import { useState } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { getLoansData, type LoanAccount } from "@/lib/actions/loans"
import { LoanDialog, type LoanDialogState, type LoanFarmer } from "@/components/admin/loan-dialog"
import { useSse } from "@/hooks/useSse"

export function LoansClient({ loans: initial, farmers }: { loans: LoanAccount[]; farmers: LoanFarmer[] }) {
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-foreground">Hutang Modal</h1>
        <button
          onClick={() => setDialog({ mode: "disburse" })}
          className="rounded-lg bg-emerald px-3.5 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer"
        >
          + Beri Pinjaman
        </button>
      </div>

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
          <p className="py-6 text-center text-muted-foreground">Belum ada buku hutang. Klik &quot;Beri Pinjaman&quot; untuk memulai.</p>
        )}
        {loans.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Petani</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">NIK</th>
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
        onClose={() => setDialog(null)}
        onDone={refresh}
      />
    </div>
  )
}
