"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { recordPayment } from "@/lib/actions/finance"
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
}

export function PaymentDialog({ purchase, onClose, onPaid }: Props) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"TUNAI" | "TRANSFER">("TUNAI")
  const [note, setNote] = useState("")
  const [loanDeduction, setLoanDeduction] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loanBalance = purchase?.loanBalance ?? 0
  const hasActiveLoan = loanBalance > 0.005

  async function handleSubmit() {
    if (!purchase) return
    const parsed = amount === "" ? NaN : Number(amount)
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error("Jumlah tunai tidak valid")
      return
    }
    const deduction = loanDeduction === "" ? 0 : Number(loanDeduction)
    if (Number.isNaN(deduction) || deduction < 0) {
      toast.error("Potongan hutang tidak valid")
      return
    }
    const credit = parsed + deduction
    if (credit <= 0.005) {
      toast.error("Kredit transaksi harus lebih dari 0")
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
    if (credit > purchase.remaining + 0.005) {
      toast.error(`Kredit transaksi melebihi sisa tagihan (${formatCurrency(purchase.remaining)})`)
      return
    }
    setSubmitting(true)
    try {
      const result = await recordPayment(purchase.id, {
        amount: roundMoney(parsed),
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

  const parsedAmount = purchase && amount !== "" ? Number(amount) : NaN
  const parsedDeduction = purchase && loanDeduction !== "" ? Number(loanDeduction) : 0
  const parsedCredit = !Number.isNaN(parsedAmount) ? parsedAmount + parsedDeduction : NaN
  const amountNotMultiple =
    purchase != null &&
    !Number.isNaN(parsedCredit) &&
    parsedCredit > 0 &&
    !isMultipleOf100(parsedCredit) &&
    Math.abs(parsedCredit - purchase.remaining) > 0.005
  const deductionNotMultiple =
    hasActiveLoan && parsedDeduction > 0 && !isMultipleOf100(parsedDeduction) && Math.abs(parsedDeduction - loanBalance) > 0.005

  return (
    <Dialog open={!!purchase} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Pembayaran</DialogTitle>
          <DialogDescription>
            {purchase?.transactionCode} — {purchase?.farmerName}
          </DialogDescription>
        </DialogHeader>

        {purchase && (
          <div className="space-y-4">
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
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Tunai Diterima Petani (Rp) *</label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder={`Maks ${formatCurrency(purchase.remaining)}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm font-mono font-bold rounded-lg outline-none"
              />
              {!Number.isNaN(parsedAmount) && (
                <p className="text-[10.5px] text-muted-2 mt-1 font-mono">= {formatCurrency(parsedAmount)}</p>
              )}
              {amountNotMultiple && (
                <p className="text-[10.5px] text-red-deduction mt-1">Kredit transaksi harus kelipatan 100 Rupiah</p>
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
                  {deductionNotMultiple && (
                    <p className="text-[10.5px] text-red-deduction mt-1">Potongan hutang harus kelipatan 100 Rupiah</p>
                  )}
                </div>
                {!Number.isNaN(parsedCredit) && (
                  <p className="text-[11px] text-muted-foreground">
                    Kredit transaksi (tunai + potongan): <b className="font-mono text-emerald">{formatCurrency(parsedCredit)}</b>
                    {parsedDeduction > 0 && (
                      <span className="text-red-deduction"> · Potongan hutang {formatCurrency(parsedDeduction)}</span>
                    )}
                  </p>
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
                  {purchase.payments.map((pay) => (
                    <div key={pay.id} className="flex items-center justify-between gap-2 flex-wrap px-2.5 py-1.5 border-t border-border-soft text-[11.5px]">
                      <div>
                        <span className="font-mono font-bold text-foreground">{formatCurrency(pay.amount)}</span>
                        <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold ${pay.method === "TUNAI" ? "bg-emerald/12 text-emerald" : "bg-amber/12 text-amber"}`}>
                          {pay.method}
                        </span>
                        {pay.loanDeduction != null && pay.loanDeduction > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-deduction/12 text-red-deduction">
                            Hutang −{formatCurrency(pay.loanDeduction)}
                          </span>
                        )}
                        {pay.note && <p className="text-muted-2 text-[10px] mt-0.5">{pay.note}</p>}
                      </div>
                      <div className="text-right text-muted-2 text-[10px]">
                        <p>{formatDateTime(pay.paidAt)}</p>
                        <p>{pay.paidBy ?? "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
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
