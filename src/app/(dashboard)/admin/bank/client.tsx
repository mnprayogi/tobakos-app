"use client"

import { useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import { getBankData, getBankExportData, type BankData, type BankEntryInfo } from "@/lib/actions/bank"
import { BankBookPrint } from "@/components/admin/bank-book-print"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Download, Landmark, Printer } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { useSse } from "@/hooks/useSse"
import { toast } from "sonner"
import { exportBankExcel } from "@/lib/export-excel"

function entryUraian(e: BankEntryInfo): string {
  if (e.voided) return "Dibatalkan"
  return e.refLabel ?? "Mutasi bank"
}

export function BankClient({
  bank: initial,
  companyName,
  userName,
}: {
  bank: BankData
  companyName: string
  userName: string
}) {
  const [bank, setBank] = useState(initial)
  const [printedAt, setPrintedAt] = useState<Date | null>(null)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [exporting, setExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = usePrintDocument(printRef, printBaseStyle, { documentTitle: "Buku-Bank" })

  async function refresh() {
    setBank(await getBankData())
  }

  useSse(null, (event) => {
    if (
      event.type === "cash.updated" ||
      event.type === "payment.recorded" ||
      event.type === "payment.voided"
    ) {
      refresh()
    }
  })

  function onPrint() {
    flushSync(() => setPrintedAt(new Date()))
    handlePrint()
  }

  async function handleExport() {
    setExporting(true)
    try {
      const data = await getBankExportData(fromDate || undefined, toDate || undefined)
      await exportBankExcel({ rows: data }, fromDate, toDate)
      toast.success("File Excel berhasil diunduh")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const voidedCount = bank.entries.filter((e) => e.voided).length
  const shown = useMemo(
    () => bank.entries.filter((e) => !e.voided),
    [bank.entries]
  )

  return (
    <div className="space-y-5">
      <PageHeader icon={Landmark} title="Bank" subtitle="Buku bank — mutasi rekening perusahaan (transfer ke petani)">
        <button
          onClick={onPrint}
          className="rounded-lg bg-panel-alt px-3.5 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer inline-flex items-center gap-1.5"
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak
        </button>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="field-input !py-1.5 !text-[11px] !w-[130px]"
            placeholder="Dari"
          />
          <span className="text-[11px] text-muted-foreground">—</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="field-input !py-1.5 !text-[11px] !w-[130px]"
            placeholder="Sampai"
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-panel-alt px-3.5 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Export…" : "Excel"}
          </button>
        </div>
      </PageHeader>

      <div className="hidden" aria-hidden="true">
        <BankBookPrint
          ref={printRef}
          bank={bank}
          companyName={companyName}
          userName={userName}
          printedAt={printedAt}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {bank.accounts.map((a) => (
          <div key={a.account.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Saldo {a.account.bankName}</p>
            <p className="font-mono font-bold text-xl text-foreground">{a.account.accountNumber}</p>
            <p className="text-[11px] text-muted-foreground mb-2">{a.account.accountName}</p>
            <p className={`font-mono font-bold text-2xl ${a.balance < 0 ? "text-red-deduction" : "text-emerald"}`}>
              {formatCurrency(a.balance)}
            </p>
            <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                Masuk: <b className="font-mono text-emerald">{formatCurrency(a.totalMasuk)}</b>
              </span>
              <span className="inline-flex items-center gap-1">
                Keluar: <b className="font-mono text-red-deduction">{formatCurrency(a.totalKeluar)}</b>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Mutasi Bank</h3>
          {voidedCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {voidedCount} entri dibatalkan tidak ditampilkan
            </span>
          )}
        </div>

        {shown.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Landmark className="size-4 text-muted-2" />
              </EmptyMedia>
              <EmptyTitle>Belum ada mutasi bank</EmptyTitle>
              <EmptyDescription>
                Pembayaran transfer ke petani otomatis tercatat di sini sebagai uang keluar dari rekening
                perusahaan.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {shown.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Tanggal</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Rekening</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Uraian</th>
                  <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Keluar</th>
                  <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Saldo</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-2 border-b border-border-soft font-mono text-muted-foreground whitespace-nowrap">
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft">
                      <p className="font-bold text-foreground">{e.bankAccount.bankName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{e.bankAccount.accountNumber}</p>
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft">
                      <p className="font-bold text-foreground">{entryUraian(e)}</p>
                      {e.farmerName && <p className="text-[11px] text-muted-foreground">Petani: {e.farmerName}</p>}
                      {e.note && (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="text-muted-2 font-bold">Ke:</span> {e.note}
                        </p>
                      )}
                      {e.transactionCode && <p className="font-mono text-[10.5px] text-emerald">{e.transactionCode}</p>}
                    </td>
                    <td className={`py-2 px-2 border-b border-border-soft text-right font-mono font-bold text-red-deduction`}>
                      − {formatCurrency(e.amount)}
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft text-right font-mono font-bold text-foreground">
                      {formatCurrency(e.balance)}
                    </td>
                    <td className="py-2 px-2 border-b border-border-soft text-muted-foreground text-[11.5px]">
                      {e.createdBy ?? "—"}
                      <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald/12 text-emerald border border-emerald/35">
                        Otomatis
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
