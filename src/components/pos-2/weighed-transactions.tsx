"use client"

import { useState, useRef, useCallback } from "react"
import { toast } from "sonner"
import { getWeighedTransactions, endWeighSession, getSessionUnweighed, getNotaData } from "@/lib/actions/weighing"
import type { WeighedTransaction, NotaItem, SessionCheckResult } from "@/lib/actions/weighing"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import { NotaTimbangan } from "@/components/pos-2/nota-timbangan"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import { StatusPill } from "@/components/shared/status-pill"
import { usePolling } from "@/hooks/usePolling"
import { useSse } from "@/hooks/useSse"
import { REALTIME_INTERVAL_MS } from "@/lib/realtime"

interface NotaData {
  transactionCode: string
  farmerName: string
  farmerNik: string | null
  warehouse: string
  laneCode: string | null
  createdBy: string | null
  weighedBy: string | null
  approvedBy: string | null
  date: string
  items: NotaItem[]
  totals: NotaItem
}

interface Props {
  laneId: number
}

export function WeighedTransactions({ laneId }: Props) {
  const [transactions, setTransactions] = useState<WeighedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState<number | null>(null)
  const [confirmTxn, setConfirmTxn] = useState<WeighedTransaction | null>(null)
  const [sessionCheck, setSessionCheck] = useState<SessionCheckResult | null>(null)
  const [checking, setChecking] = useState(false)
  const [notaData, setNotaData] = useState<NotaData | null>(null)
  const notaRef = useRef<HTMLDivElement>(null)
  const handlePrintNota = usePrintDocument(notaRef, printBaseStyle)

  const loadTransactions = useCallback(async () => {
    try {
      const data = await getWeighedTransactions(laneId)
      setTransactions(data)
    } catch {
      setTransactions([])
      toast.error("Gagal memuat daftar transaksi")
    } finally {
      setLoading(false)
    }
  }, [laneId])

  usePolling(loadTransactions, REALTIME_INTERVAL_MS, [loadTransactions])

  useSse(laneId, (event) => {
    if (
      event.type === "bale.created" ||
      event.type === "bale.deleted" ||
      event.type === "bale.weighed" ||
      event.type === "session.ended"
    ) {
      loadTransactions()
    }
  })

  async function handleRequestFinish(txn: WeighedTransaction) {
    setConfirmTxn(txn)
    setSessionCheck(null)
    setChecking(true)
    try {
      const check = await getSessionUnweighed(txn.id, laneId)
      setSessionCheck(check)
    } catch (err) {
      setConfirmTxn(null)
      toast.error((err as Error).message)
    } finally {
      setChecking(false)
    }
  }

  async function handleFinishSession(txn: WeighedTransaction) {
    setFinishing(txn.id)
    try {
      const data = await endWeighSession(txn.id, laneId)
      setNotaData(data)
      setConfirmTxn(null)
      toast.success("Transaksi ditutup — Nota sementara siap dicetak")
      loadTransactions()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setFinishing(null)
    }
  }

  async function handleReprintNota(txn: WeighedTransaction) {
    try {
      const data = await getNotaData(txn.id, laneId)
      setNotaData(data)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const activeCount = transactions.filter((t) => t.status === "DRAFT").length
  const endedCount = transactions.length - activeCount
  const totalWeighed = transactions.reduce((s, t) => s + t.weighedCount, 0)

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
          Transaksi Ditimbang
        </p>
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2">Total Transaksi</p>
          <p className="font-mono font-extrabold text-2xl text-foreground mt-1">{transactions.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2">Sedang Berjalan</p>
          <p className="font-mono font-extrabold text-2xl text-amber mt-1">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2">Bale Ditimbang</p>
          <p className="font-mono font-extrabold text-2xl text-emerald mt-1">{totalWeighed}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {transactions.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-muted-2">
            Belum ada transaksi yang ditimbang di jalur ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 pr-2 border-b border-border-soft">Transaksi</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Petani</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Tanggal</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Bale</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Netto</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Total Harga</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">PIC Timbang</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 px-2 border-b border-border-soft">Status</th>
                  <th className="text-left text-[10.5px] uppercase tracking-[0.06em] font-bold text-muted-2 pb-2 pl-2 border-b border-border-soft">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const canEnd = txn.status === "DRAFT" && txn.weighedCount > 0
                  return (
                    <tr key={txn.id}>
                      <td className="py-2 pr-2 border-b border-border-soft">
                        <p className="font-mono text-foreground">{txn.transactionCode}</p>
                        <p className="text-[10px] text-muted-2 mt-0.5">
                          {txn.laneCode && (
                            <>
                              <span className="font-mono">{txn.laneCode}</span>
                              {" · "}
                            </>
                          )}
                          {txn.unweighedCount > 0 && txn.status === "DRAFT"
                            ? `${txn.unweighedCount} belum ditimbang`
                            : "Semua bale ditimbang"}
                        </p>
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft">
                        <p className="text-foreground">{txn.farmerName}</p>
                        <p className="text-[10px] font-mono text-muted-2">{txn.farmerNik ?? "\u2014"}</p>
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-[11.5px] text-foreground">
                        {formatDateTime(txn.transactionDate)}
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft">
                        <span className="font-mono text-foreground">
                          {txn.weighedCount}/{txn.totalBales}
                        </span>
                        {txn.unweighedCount > 0 && txn.status === "DRAFT" && (
                          <span className="block text-[10px] font-bold text-amber mt-0.5">
                            {txn.unweighedCount} bale sisa
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">
                        {txn.totalNetWeight.toFixed(2)} kg
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-amber font-bold">
                        {formatCurrency(txn.totalPrice)}
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft font-mono text-foreground">
                        {txn.weighedBy ?? "\u2014"}
                      </td>
                      <td className="py-2 px-2 border-b border-border-soft">
                        <StatusPill status={txn.status as "DRAFT" | "WEIGHED"} />
                      </td>
                      <td className="py-2 pl-2 border-b border-border-soft">
                        {canEnd ? (
                          <button
                            type="button"
                            onClick={() => handleRequestFinish(txn)}
                            disabled={finishing === txn.id}
                            className="px-3 py-1.5 bg-amber hover:bg-amber/80 text-primary-foreground font-extrabold text-[11px] rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            {finishing === txn.id ? "Memproses\u2026" : "Akhiri Sesi Timbang"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReprintNota(txn)}
                            className="px-3 py-1.5 bg-emerald hover:bg-emerald/80 text-primary-foreground font-extrabold text-[11px] rounded-lg transition-all cursor-pointer"
                          >
                            Cetak Nota
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
        <p className="text-[10.5px] text-muted-2 mt-3 text-center">
          {endedCount > 0
            ? `${endedCount} transaksi sudah diakhiri dan menunggu verifikasi Finance.`
            : "Sesi timbang yang diakhiri akan menunggu verifikasi Finance."}
        </p>
      </div>

      {/* Konfirmasi Akhiri Sesi */}
      {confirmTxn && (
        <Dialog open onOpenChange={(open) => { if (!open) setConfirmTxn(null) }}>
          <DialogContent className="sm:max-w-md">
            <DialogTitle>
              {checking
                ? "Memeriksa bale\u2026"
                : sessionCheck && sessionCheck.unweighedCount === 0
                ? "Akhiri Sesi Penimbangan?"
                : "Belum Bisa Menutup Sesi"}
            </DialogTitle>
            <DialogDescription>
              {checking
                ? "Menghitung bale yang belum ditimbang\u2026"
                : sessionCheck && sessionCheck.unweighedCount === 0
                ? `Semua ${sessionCheck.totalBales} bale sudah ditimbang. Lanjut tutup transaksi ${confirmTxn.transactionCode}? Nota sementara akan dicetak.`
                : null}
            </DialogDescription>

            {!checking && sessionCheck && sessionCheck.unweighedCount > 0 && (
              <div className="rounded-xl border border-red/35 bg-red/10 p-3">
                <p className="text-[12.5px] font-bold text-red">
                  Masih ada {sessionCheck.unweighedCount} bale belum ditimbang
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">
                  Sesi tidak dapat ditutup sebelum semua bale ditimbang. Kembali ke Pos 2:
                  Penimbangan untuk menyelesaikan bale berikut.
                </p>
                <div className="mt-2.5 space-y-1.5">
                  {sessionCheck.unweighedBales.map((bale) => (
                    <div
                      key={bale.labelCode}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-panel-alt border border-border-soft"
                    >
                      <span className="font-mono text-[11.5px] text-foreground">{bale.labelCode}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground">GRADE {bale.grade}</span>
                        <span className="text-[10px] font-bold bg-amber/12 text-amber border border-amber/35 px-1.5 py-0.5 rounded">
                          GRADED
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmTxn(null)}
                  className="px-4 py-1.5 bg-panel-alt text-foreground border border-border-soft font-bold text-[11.5px] rounded-lg cursor-pointer hover:bg-border/50"
                >
                  {sessionCheck && sessionCheck.unweighedCount > 0 ? "Tutup" : "Batal"}
                </button>
                {sessionCheck && sessionCheck.unweighedCount === 0 && !checking && (
                  <button
                    type="button"
                    onClick={() => handleFinishSession(confirmTxn)}
                    disabled={finishing === confirmTxn.id}
                    className="px-4 py-1.5 bg-emerald hover:bg-emerald/80 text-primary-foreground font-extrabold text-[11.5px] rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {finishing === confirmTxn.id ? "Memproses\u2026" : "Akhiri & Tutup"}
                  </button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Nota Dialog + Print */}
      {notaData && (
        <div className="nota-overlay" onClick={() => setNotaData(null)}>
          <div className="nota-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
              <p className="font-bold text-sm text-foreground">
                Nota Timbangan — {notaData.farmerName}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrintNota}
                  className="px-4 py-2 bg-emerald text-primary-foreground font-bold text-xs rounded-lg cursor-pointer hover:bg-emerald/80"
                >
                  Cetak Nota
                </button>
                <button
                  type="button"
                  onClick={() => setNotaData(null)}
                  className="px-4 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer hover:bg-border/50"
                >
                  Tutup
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6">
              <NotaTimbangan ref={notaRef} {...notaData} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
