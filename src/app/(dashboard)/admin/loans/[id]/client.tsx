"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { flushSync } from "react-dom"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import type { LoanBook, LoanEntryInfo } from "@/lib/actions/loans"
import { LoanDialog, type LoanDialogState } from "@/components/admin/loan-dialog"
import { LoanBookPrint } from "@/components/admin/loan-book-print"
import { Wallet, BookOpenText } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

function entryLabel(e: LoanEntryInfo): string {
  if (e.type === "DISBURSEMENT") return "Pinjam"
  if (e.method === "POTONG_TRANSAKSI") return "Potong Transaksi"
  return "Bayar Tunai"
}

export function LoanBookClient({ book, companyName, userName }: { book: LoanBook; companyName: string; userName: string }) {
  const [dialog, setDialog] = useState<LoanDialogState | null>(null)
  const [printedAt, setPrintedAt] = useState<Date | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = usePrintDocument(printRef, printBaseStyle, {
    documentTitle: `Buku-Hutang-${book.farmerName}`,
  })
  const active = book.status === "ACTIVE" && book.balance > 0.005

  function onPrint() {
    flushSync(() => setPrintedAt(new Date()))
    handlePrint()
  }

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="flex items-center gap-3 print:hidden">
        <Link href="/admin/loans" className="text-[12px] font-bold text-muted-foreground hover:text-foreground cursor-pointer">
          ← Kembali
        </Link>
      </div>

      <PageHeader
        icon={BookOpenText}
        title="Buku Hutang"
        subtitle={
          <>
            {book.farmerName}
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-panel-alt border border-border-soft px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground align-middle">
              <Wallet className="w-3 h-3 text-emerald" />
              {book.warehouseName}
            </span>
          </>
        }
      >
        <button
          onClick={onPrint}
          className="rounded-lg bg-panel-alt px-3.5 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer"
        >
          Cetak
        </button>
      </PageHeader>

      <div className="hidden" aria-hidden="true">
        <LoanBookPrint ref={printRef} book={book} companyName={companyName} userName={userName} printedAt={printedAt} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 print:border-0 print:rounded-none print:p-0">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-extrabold text-foreground text-[15px]">{book.farmerName}</h2>
            <p className="font-mono text-[11px] text-muted-2 mt-0.5">{book.farmerNik ?? "—"}</p>
            <span className="inline-flex items-center gap-1.5 mt-1.5 rounded-full bg-panel-alt border border-border-soft px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
              <Wallet className="w-3 h-3 text-emerald" />
              {book.warehouseName}
            </span>
          </div>
          <span className={`inline-block px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
            active ? "bg-amber/12 text-amber border-amber/35" : "bg-blue/12 text-blue border-blue/40"
          }`}>
            {active ? "Berhutang" : "Lunas"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 print:grid-cols-3">
          <div className="bg-panel-alt border border-border-soft rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-2">Total Pinjam</p>
            <p className="font-mono font-bold text-amber text-[15px] mt-1">{formatCurrency(book.totalBorrowed)}</p>
          </div>
          <div className="bg-panel-alt border border-border-soft rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-2">Total Bayar</p>
            <p className="font-mono font-bold text-emerald text-[15px] mt-1">{formatCurrency(book.totalRepaid)}</p>
          </div>
          <div className="bg-panel-alt border border-border-soft rounded-lg p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-2">Sisa Hutang</p>
            <p className="font-mono font-bold text-red-deduction text-[15px] mt-1">{formatCurrency(book.balance)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 print:border-0 print:rounded-none print:p-0">
        <div className="flex items-center justify-between mb-2 print:hidden">
          <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Riwayat Buku</h3>
          {active && (
            <button
              onClick={() => setDialog({ mode: "repay", loanId: book.loanId, farmerName: book.farmerName, loanBalance: book.balance })}
              className="rounded-lg bg-emerald px-3 py-1.5 font-bold text-[11px] text-primary-foreground cursor-pointer"
            >
              + Bayar Tunai
            </button>
          )}
        </div>

        {book.entries.length === 0 && (
          <p className="py-6 text-center text-muted-foreground">Belum ada transaksi pada buku ini.</p>
        )}
        {book.entries.length > 0 && (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Tanggal</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Jenis</th>
                <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Keterangan</th>
                <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Jumlah</th>
                <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody>
              {book.entries.map((e) => {
                const isLoan = e.type === "DISBURSEMENT"
                return (
                  <tr key={e.id} className={e.voided ? "opacity-50" : undefined}>
                    <td className="py-2 pr-2 border-b border-border-soft font-mono text-muted-foreground whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                    <td className="py-2 px-2 border-b border-border-soft">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.voided
                          ? "bg-muted/12 text-muted border border-border"
                          : isLoan
                            ? "bg-amber/12 text-amber border border-amber/35"
                            : "bg-emerald/12 text-emerald border border-emerald/35"
                      }`}>
                        {e.voided ? "Dibatalkan" : entryLabel(e)}
                      </span>
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft">
                      {e.voided && e.voidedBy && <p className="text-[11px] text-muted-foreground italic">Dibatalkan oleh {e.voidedBy}</p>}
                      {e.note && <p className="text-[11.5px] text-muted-foreground">{e.note}</p>}
                      {e.transactionCode && <p className="font-mono text-[10.5px] text-emerald">{e.transactionCode}</p>}
                      {!e.note && !e.transactionCode && !(e.voided && e.voidedBy) && <span className="text-muted-2 text-[11px]">—</span>}
                    </td>
                    <td className={`py-2 px-2 border-b border-border-soft text-right font-mono font-bold ${isLoan ? "text-amber" : "text-emerald"}`}>
                      <span className={e.voided ? "line-through" : undefined}>
                        {isLoan ? "+" : "−"} {formatCurrency(e.amount)}
                      </span>
                    </td>
                    <td className="py-2 pl-2 border-b border-border-soft text-right font-mono font-bold text-foreground">
                      {e.voided ? <span className="text-muted-2">—</span> : formatCurrency(e.balanceAfter)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>

      <p className="text-[10.5px] text-muted-2 print:mt-4">
        Buka sejak {formatDateTime(book.openedAt)}{book.settledAt ? ` · Lunas ${formatDateTime(book.settledAt)}` : ""}
      </p>

      <LoanDialog
        state={dialog}
        onClose={() => setDialog(null)}
        onDone={() => window.location.reload()}
      />
    </div>
  )
}
