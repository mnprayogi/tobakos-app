"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { recordPayment, voidPayment } from "@/lib/actions/finance"
import { isMultipleOf100, roundMoney } from "@/lib/calculations"
import { formatCurrency, formatDateTime } from "@/lib/utils"

export interface PaymentInfo {
  id: number
  amount: number
  method: string
  note: string | null
  paidBy: string | null
  paidAt: Date
  loanDeduction: number
  voidedAt?: Date | null
  voidedBy?: string | null
}

export interface PayPurchase {
  id: number
  transactionCode: string
  farmerName: string
  totalPrice: number
  paidAmount: number
  remaining: number
  payments: PaymentInfo[]
  loanBalance?: number
}

export interface PaymentUpdate {
  id: number
  paidOff: boolean
  paidAmount: number
  remaining: number
  payment?: PaymentInfo
  loanBalance?: number
}

interface Props {
  purchase: PayPurchase | null
  onClose: () => void
  onPaid: (updated: PaymentUpdate) => void
  canVoid?: boolean
}

export function PaymentDialog({ purchase, onClose, onPaid, canVoid = false }: Props) {
  const router = useRouter()
  const [total, setTotal] = useState("")
  const [method, setMethod] = useState<"TUNAI" | "TRANSFER">("TUNAI")
  const [note, setNote] = useState("")
  const [loanDeduction, setLoanDeduction] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loanBalance = purchase?.loanBalance ?? 0
  const hasActiveLoan = loanBalance > 0.005

  const [prevPurchaseId, setPrevPurchaseId] = useState(purchase?.id ?? null)
  if ((purchase?.id ?? null) !== prevPurchaseId) {
    setPrevPurchaseId(purchase?.id ?? null)
    setTotal("")
    setLoanDeduction("")
    setNote("")
    setMethod("TUNAI")
  }

  async function handleSubmit() {
    if (!purchase) return
    const parsedTotal = total === "" ? NaN : Number(total)
    if (Number.isNaN(parsedTotal) || parsedTotal <= 0) {
      toast.error("Total pembayaran tidak valid")
      return
    }
    const deduction = loanDeduction === "" ? 0 : Number(loanDeduction)
    if (Number.isNaN(deduction) || deduction < 0) {
      toast.error("Potongan hutang tidak valid")
      return
    }
    const cash = parsedTotal - deduction
    if (cash < 0) {
      toast.error("Potongan hutang tidak boleh melebihi total pembayaran")
      return
    }
    if (deduction > 0 && deduction > loanBalance + 0.005) {
      toast.error(`Potongan hutang melebihi sisa hutang (${formatCurrency(loanBalance)})`)
      return
    }
    if (deduction > 0 && deduction > purchase.remaining + 0.005) {
      toast.error(`Potongan hutang melebihi sisa tagihan (${formatCurrency(purchase.remaining)})`)
      return
    }
    if (deduction > 0 && !isMultipleOf100(deduction) && Math.abs(deduction - loanBalance) > 0.005) {
      toast.error("Potongan hutang harus kelipatan 100 Rupiah")
      return
    }
    if (parsedTotal > purchase.remaining + 0.005) {
      toast.error(`Total pembayaran melebihi sisa tagihan (${formatCurrency(purchase.remaining)})`)
      return
    }
    if (!isMultipleOf100(parsedTotal) && Math.abs(parsedTotal - purchase.remaining) > 0.005) {
      toast.error("Total pembayaran harus kelipatan 100 Rupiah")
      return
    }
    setSubmitting(true)
    try {
      const result = await recordPayment(purchase.id, {
        amount: roundMoney(cash),
        method,
        note: note || null,
        loanDeduction: deduction > 0 ? roundMoney(deduction) : undefined,
      })
      toast.success("Pembayaran dicatat")
      onPaid({
        id: purchase.id,
        paidOff: result.paidOff,
        paidAmount: result.newPaidAmount,
        remaining: result.remaining,
        payment: result.payment,
        loanBalance: result.loanBalance ?? undefined,
      })
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVoid(paymentId: number) {
    if (!purchase) return
    if (!confirm("Batalkan pembayaran ini? (butuh hak Super Admin/Owner — akan dihitung ulang status transaksi)")) return
    try {
      await voidPayment(purchase.id, paymentId)
      toast.success("Pembayaran dibatalkan")
      router.refresh()
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const parsedTotal = purchase && total !== "" ? Number(total) : NaN
  const parsedDeduction = purchase && loanDeduction !== "" ? Number(loanDeduction) : 0
  const parsedCash = !Number.isNaN(parsedTotal) ? roundMoney(parsedTotal - parsedDeduction) : NaN
  const cashIsZero = !Number.isNaN(parsedCash) && parsedTotal > 0 && Math.abs(parsedCash) <= 0.005
  const totalNotMultiple =
    purchase != null &&
    !Number.isNaN(parsedTotal) &&
    parsedTotal > 0 &&
    !isMultipleOf100(parsedTotal) &&
    Math.abs(parsedTotal - purchase.remaining) > 0.005
  const totalExceeds =
    purchase != null && !Number.isNaN(parsedTotal) && parsedTotal > purchase.remaining + 0.005
  const deductionNotMultiple =
    hasActiveLoan && parsedDeduction > 0 && !isMultipleOf100(parsedDeduction) && Math.abs(parsedDeduction - loanBalance) > 0.005
  const deductionExceedsTotal = !Number.isNaN(parsedTotal) && parsedDeduction > parsedTotal + 0.005
  const summaryVisible = !Number.isNaN(parsedTotal) && parsedTotal > 0

  return (
    <Dialog open={!!purchase} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Catat Pembayaran</DialogTitle>
          <DialogDescription>
            {purchase?.transactionCode} — {purchase?.farmerName}
          </DialogDescription>
        </DialogHeader>

        {purchase && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-panel-alt border border-border-soft rounded-lg p-3">
                <p className="text-[10px] uppercase font-bold text-muted-2">Total Tagihan</p>
                <p className="font-mono font-bold text-amber text-[15px] mt-1">{formatCurrency(purchase.totalPrice)}</p>
              </div>
              <div className="bg-panel-alt border border-border-soft rounded-lg p-3">
                <p className="text-[10px] uppercase font-bold text-muted-2">Sudah Dibayar</p>
                <p className="font-mono font-bold text-emerald text-[15px] mt-1">{formatCurrency(purchase.paidAmount)}</p>
              </div>
              <div className="bg-panel-alt border border-border-soft rounded-lg p-3">
                <p className="text-[10px] uppercase font-bold text-muted-2">Sisa Tagihan</p>
                <p className="font-mono font-bold text-foreground text-[15px] mt-1">{formatCurrency(purchase.remaining)}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                <label className="block text-[11px] font-bold text-muted-foreground">Total Pembayaran Transaksi (Rp) *</label>
                <button
                  type="button"
                  onClick={() => setTotal(String(roundMoney(purchase.remaining)))}
                  className="px-2.5 py-1 rounded-md bg-emerald/12 text-emerald border border-emerald/35 text-[10.5px] font-bold cursor-pointer hover:bg-emerald/20"
                >
                  Lunasi
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder={`Maks ${formatCurrency(purchase.remaining)}`}
                value={total}
                onChange={(e) => setTotal(e.target.value.replace(/\D/g, ""))}
                className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm font-mono font-bold rounded-lg outline-none"
              />
              <p className="text-[10.5px] text-muted-2 mt-1">
                Nilai tagihan yang dibayar sekarang · maks {formatCurrency(purchase.remaining)}
              </p>
              {!Number.isNaN(parsedTotal) && parsedTotal > 0 && (
                <p className="text-[10.5px] text-muted-2 mt-1 font-mono">= {formatCurrency(parsedTotal)}</p>
              )}
              {totalExceeds && (
                <p className="text-[10.5px] text-red-deduction mt-1">Total pembayaran melebihi sisa tagihan</p>
              )}
              {totalNotMultiple && (
                <p className="text-[10.5px] text-red-deduction mt-1">Total pembayaran harus kelipatan 100 Rupiah</p>
              )}
            </div>

            {hasActiveLoan && (
              <div className="rounded-lg border border-border-soft bg-panel-alt p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[11px] font-bold text-muted-foreground">Potongan Hutang Modal</p>
                  <span className="text-[10.5px] font-mono text-red-deduction font-bold">Sisa hutang {formatCurrency(loanBalance)}</span>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-muted-foreground mb-1">Jumlah Potongan (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={loanDeduction}
                    onChange={(e) => setLoanDeduction(e.target.value.replace(/\D/g, ""))}
                    className="w-full p-2 bg-panel border border-border-soft text-foreground text-sm font-mono font-bold rounded-lg outline-none"
                  />
                  {!Number.isNaN(parsedDeduction) && parsedDeduction > 0 && (
                    <p className="text-[10.5px] text-muted-2 mt-1 font-mono">= {formatCurrency(parsedDeduction)}</p>
                  )}
                  {deductionExceedsTotal && (
                    <p className="text-[10.5px] text-red-deduction mt-1">Potongan tidak boleh melebihi total pembayaran</p>
                  )}
                  {deductionNotMultiple && (
                    <p className="text-[10.5px] text-red-deduction mt-1">Potongan hutang harus kelipatan 100 Rupiah</p>
                  )}
                </div>
                <p className="text-[10.5px] text-muted-2">Opsional — dipotong dari hutang modal petani</p>
              </div>
            )}

            {summaryVisible && (
              <div className="rounded-lg border border-emerald/35 bg-emerald/8 p-3 space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-muted-2">Ringkasan Pembayaran</p>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Total Pembayaran</span>
                  <span className="font-mono font-bold text-foreground">{formatCurrency(parsedTotal)}</span>
                </div>
                {parsedDeduction > 0 && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-muted-foreground">− Potongan Hutang</span>
                    <span className="font-mono font-bold text-red-deduction">−{formatCurrency(parsedDeduction)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[12.5px] border-t border-emerald/25 pt-1.5 mt-0.5">
                  <span className="text-muted-foreground">Tunai Dibayar Petani</span>
                  <span className="font-mono font-extrabold text-emerald text-[15px]">{formatCurrency(parsedCash)}</span>
                </div>
                <div className="flex items-center justify-between text-[10.5px] text-muted-2">
                  <span>Sisa tagihan setelah ini</span>
                  <span className="font-mono">{formatCurrency(purchase.remaining - parsedTotal)}</span>
                </div>
                {hasActiveLoan && (
                  <div className="flex items-center justify-between text-[10.5px] text-muted-2">
                    <span>Sisa hutang modal setelah potongan</span>
                    <span className="font-mono">{formatCurrency(loanBalance - parsedDeduction)}</span>
                  </div>
                )}
                {cashIsZero && (
                  <p className="text-[10.5px] text-amber">Seluruh pembayaran berasal dari potongan hutang modal</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Metode *</label>
              <div className="grid grid-cols-2 gap-2">
                {(["TUNAI", "TRANSFER"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 rounded-lg text-xs font-bold border cursor-pointer ${
                      method === m
                        ? "bg-emerald text-primary-foreground border-emerald"
                        : "bg-panel-alt text-foreground border-border-soft hover:border-emerald/50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-muted-2 mt-1">Metode untuk bagian tunai yang dibayar petani</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Catatan</label>
              <textarea
                rows={2}
                placeholder="Keterangan pembayaran…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none resize-none"
              />
            </div>

            {purchase.payments.length > 0 && (
              <div className="rounded-lg border border-border-soft overflow-hidden">
                <p className="text-[10px] uppercase font-bold text-muted-2 px-2.5 py-1.5 bg-panel-alt">Riwayat Pembayaran ({purchase.payments.length})</p>
                <div className="max-h-40 overflow-y-auto">
                  {purchase.payments.map((pay) => {
                    const isVoided = !!pay.voidedAt
                    return (
                      <div key={pay.id} className={`flex items-center justify-between gap-2 flex-wrap px-2.5 py-1.5 border-t border-border-soft text-[11.5px] ${isVoided ? "opacity-50" : ""}`}>
                        <div>
                          <span className={`font-mono font-bold text-foreground ${isVoided ? "line-through" : ""}`}>{formatCurrency(pay.amount)}</span>
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${pay.method === "TUNAI" ? "bg-emerald/12 text-emerald" : "bg-amber/12 text-amber"}`}>
                            {pay.method}
                          </span>
                          {pay.loanDeduction != null && pay.loanDeduction > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-deduction/12 text-red-deduction">
                              Hutang −{formatCurrency(pay.loanDeduction)}
                            </span>
                          )}
                          {isVoided && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-deduction/12 text-red-deduction border border-red-deduction/35">
                              DIBATALKAN{pay.voidedBy ? ` · ${pay.voidedBy}` : ""}
                            </span>
                          )}
                          {pay.note && <p className="text-muted-2 text-[10px] mt-0.5">{pay.note}</p>}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="text-right text-muted-2 text-[10px]">
                            <p>{formatDateTime(pay.paidAt)}</p>
                            <p>{pay.paidBy ?? "—"}</p>
                          </div>
                          {canVoid && !isVoided && (
                            <button
                              type="button"
                              onClick={() => handleVoid(pay.id)}
                              className="text-[10px] font-bold text-red-deduction cursor-pointer hover:underline"
                            >
                              Batalkan
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg bg-panel-alt px-3 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-emerald px-4 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Menyimpan…" : "Simpan Pembayaran"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
