"use client"

import { useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import { getCashData, getCashExportData, voidCashEntry, type CashData, type CashEntryInfo } from "@/lib/actions/cash"
import type { WarehouseScope } from "@/lib/actions/scope"
import { CashDialog, type CashWarehouse } from "@/components/admin/cash-dialog"
import { CashBookPrint } from "@/components/admin/cash-book-print"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Banknote, Download, Printer, Wallet } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { useSse } from "@/hooks/useSse"
import { toast } from "sonner"
import { exportCashExcel } from "@/lib/export-excel"

function categoryLabel(category: string): string {
  return category === "KAS_PEMBELIAN" ? "Kas Pembelian" : "Kas Operasional"
}

function entryUraian(e: CashEntryInfo): string {
  if (e.voided) return "Dibatalkan"
  return e.refLabel ?? "Manual"
}

export function CashClient({
  cash: initial,
  scope,
  warehouses,
  companyName,
  userName,
}: {
  cash: CashData
  scope: WarehouseScope
  warehouses: CashWarehouse[]
  companyName: string
  userName: string
}) {
  const [cash, setCash] = useState(initial)
  const [filter, setFilter] = useState<"SEMUA" | "KAS_PEMBELIAN" | "KAS_OPERASIONAL">("SEMUA")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<CashEntryInfo | null>(null)
  const [voiding, setVoiding] = useState(false)
  const [printedAt, setPrintedAt] = useState<Date | null>(null)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [exporting, setExporting] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = usePrintDocument(printRef, printBaseStyle, { documentTitle: "Buku-Kas" })

  async function refresh() {
    setCash(await getCashData())
  }

  useSse(null, (event) => {
    if (
      event.type === "cash.updated" ||
      event.type === "payment.recorded" ||
      event.type === "payment.voided" ||
      event.type === "loan.updated"
    ) {
      refresh()
    }
  })

  const filtered = useMemo(() => {
    if (filter === "SEMUA") return cash.entries
    return cash.entries.filter((e) => e.category === filter)
  }, [cash.entries, filter])

  const scoped = scope.mode === "scoped"
  const warehouseName = scoped ? scope.warehouseName : null

  function onPrint() {
    flushSync(() => setPrintedAt(new Date()))
    handlePrint()
  }

  async function handleVoid() {
    if (!voidTarget) return
    setVoiding(true)
    try {
      await voidCashEntry(voidTarget.id)
      toast.success("Mutasi kas dibatalkan")
      setVoidTarget(null)
      await refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setVoiding(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const data = await getCashExportData(fromDate || undefined, toDate || undefined)
      await exportCashExcel(data, fromDate, toDate)
      toast.success("File Excel berhasil diunduh")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const tabs: { key: typeof filter; label: string }[] = [
    { key: "SEMUA", label: "Semua" },
    { key: "KAS_PEMBELIAN", label: "Kas Pembelian" },
    { key: "KAS_OPERASIONAL", label: "Kas Operasional" },
  ]

  return (
    <div className="space-y-5">
      <PageHeader icon={Banknote} title="Kas" subtitle="Buku kas pembelian & operasional perusahaan">
        {warehouseName && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-panel-alt border border-border-soft px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
            <Wallet className="w-3.5 h-3.5 text-emerald" />
            Gudang: {warehouseName}
          </span>
        )}
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
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-lg bg-emerald px-3.5 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer"
        >
          + Tambah Mutasi
        </button>
      </PageHeader>

      <div className="hidden" aria-hidden="true">
        <CashBookPrint
          ref={printRef}
          cash={cash}
          warehouseName={warehouseName}
          companyName={companyName}
          userName={userName}
          printedAt={printedAt}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Saldo Kas</p>
          <p className={`font-mono font-bold text-2xl ${cash.totals.total.balance < 0 ? "text-red-deduction" : "text-emerald"}`}>
            {formatCurrency(cash.totals.total.balance)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Kas Pembelian</p>
          <p className={`font-mono font-bold text-2xl ${cash.totals.pembelian.balance < 0 ? "text-red-deduction" : "text-amber"}`}>
            {formatCurrency(cash.totals.pembelian.balance)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase font-bold text-muted-2 mb-1">Kas Operasional</p>
          <p className={`font-mono font-bold text-2xl ${cash.totals.operasional.balance < 0 ? "text-red-deduction" : "text-emerald"}`}>
            {formatCurrency(cash.totals.operasional.balance)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Mutasi Kas</h3>
          <div className="flex gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                  filter === t.key
                    ? "bg-emerald/12 text-emerald border-emerald/35"
                    : "bg-panel-alt text-muted-foreground border-border-soft"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {cash.entries.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Banknote className="size-4 text-muted-2" />
              </EmptyMedia>
              <EmptyTitle>Belum ada mutasi kas</EmptyTitle>
              <EmptyDescription>
                Pembayaran tunai & pinjaman otomatis tercatat di sini. Klik &quot;Tambah Mutasi&quot; untuk kas
                operasional atau saldo awal.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {cash.entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Tanggal</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Kategori</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Jenis</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Uraian</th>
                  <th className="text-right text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Jumlah</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Dibuat</th>
                  <th className="text-left text-[10.5px] uppercase font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const masuk = e.type === "MASUK"
                  return (
                    <tr key={e.id} className={e.voided ? "opacity-50" : undefined}>
                      <td className="py-2 pr-2 border-b border-border-soft font-mono text-muted-foreground whitespace-nowrap">
                        {formatDateTime(e.createdAt)}
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          e.category === "KAS_PEMBELIAN"
                            ? "bg-amber/12 text-amber border-amber/35"
                            : "bg-blue/12 text-blue border-blue/40"
                        }`}>
                          {categoryLabel(e.category)}
                        </span>
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          e.voided
                            ? "bg-muted/12 text-muted border-border"
                            : masuk
                              ? "bg-emerald/12 text-emerald border-emerald/35"
                              : "bg-red-deduction/12 text-red-deduction border-red-deduction/35"
                        }`}>
                          {e.voided ? "Dibatalkan" : masuk ? "Masuk" : "Keluar"}
                        </span>
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft">
                        <p className="font-bold text-foreground">{entryUraian(e)}</p>
                        {e.farmerName && <p className="text-[11px] text-muted-foreground">Petani: {e.farmerName}</p>}
                        {e.note && <p className="text-[11px] text-muted-foreground">{e.note}</p>}
                        {e.transactionCode && <p className="font-mono text-[10.5px] text-emerald">{e.transactionCode}</p>}
                        {e.voided && e.voidedBy && (
                          <p className="text-[11px] text-muted-foreground italic">Dibatalkan oleh {e.voidedBy}</p>
                        )}
                      </td>
                      <td className={`py-2 px-2 border-b border-border-soft text-right font-mono font-bold ${masuk ? "text-emerald" : "text-red-deduction"}`}>
                        <span className={e.voided ? "line-through" : undefined}>
                          {masuk ? "+" : "−"} {formatCurrency(e.amount)}
                        </span>
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft text-muted-foreground text-[11.5px]">
                        {e.createdBy ?? "—"}
                        {!e.manual && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald/12 text-emerald border border-emerald/35">
                            Otomatis
                          </span>
                        )}
                      </td>
                      <td className="py-2 pl-2 border-b border-border-soft">
                        {e.manual && !e.voided && (
                          <button
                            onClick={() => setVoidTarget(e)}
                            className="text-[11px] font-bold text-red-deduction cursor-pointer hover:underline"
                          >
                            Batal
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CashDialog
        open={dialogOpen}
        warehouses={warehouses}
        warehouseName={warehouseName ?? undefined}
        onClose={() => setDialogOpen(false)}
        onDone={refresh}
      />

      <AlertDialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) setVoidTarget(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan mutasi kas?</AlertDialogTitle>
            <AlertDialogDescription>
              {voidTarget && (
                <>
                  {categoryLabel(voidTarget.category)} · {entryUraian(voidTarget)} ·{" "}
                  <b className="font-mono">{formatCurrency(voidTarget.amount)}</b> akan dibatalkan dan tidak
                  dihitung dalam saldo.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={voiding}>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleVoid} disabled={voiding}>
              {voiding ? "Membatalkan…" : "Batalkan Mutasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}