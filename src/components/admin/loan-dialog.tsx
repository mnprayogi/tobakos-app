"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { disburseLoan, repayLoanCash } from "@/lib/actions/loans"
import { isMultipleOf100, roundMoney } from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"

export interface LoanFarmer {
  id: number
  name: string
  nik: string | null
}

export interface LoanDialogState {
  mode: "disburse" | "repay"
  loanId?: number
  farmerName?: string
  loanBalance?: number
}

interface Props {
  state: LoanDialogState | null
  farmers?: LoanFarmer[]
  warehouseName?: string
  onClose: () => void
  onDone?: () => void
}

export function LoanDialog({ state, farmers = [], warehouseName, onClose, onDone }: Props) {
  const [farmerId, setFarmerId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const filteredFarmers = useMemo(
    () =>
      farmers.filter(
        (f) =>
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (f.nik && f.nik.includes(searchTerm))
      ),
    [farmers, searchTerm]
  )

  const maxAmount = state?.mode === "repay" ? state.loanBalance ?? 0 : 0
  const parsedAmount = state && amount !== "" ? Number(amount) : NaN

  async function handleSubmit() {
    if (!state) return
    const parsed = amount === "" ? NaN : Number(amount)
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error(state.mode === "disburse" ? "Jumlah pinjaman harus lebih dari 0" : "Jumlah pembayaran harus lebih dari 0")
      return
    }
    if (state.mode === "disburse") {
      if (farmerId == null) {
        toast.error("Pilih petani terlebih dahulu")
        return
      }
      if (!isMultipleOf100(parsed)) {
        toast.error("Jumlah pinjaman harus kelipatan 100 Rupiah")
        return
      }    }
    if (state.mode === "repay" && parsed > maxAmount + 0.005) {
      toast.error(`Melebihi sisa hutang (${formatCurrency(maxAmount)})`)
      return
    }
    setSubmitting(true)
    try {
      if (state.mode === "disburse") {
        await disburseLoan({ farmerId: farmerId!, amount: roundMoney(parsed), note: note || null })
        toast.success("Pinjaman dicatat")
      } else {
        await repayLoanCash({ loanId: state.loanId!, amount: roundMoney(parsed), note: note || null })
        toast.success("Pembayaran hutang dicatat")
      }
      onDone?.()
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose()
      setFarmerId(null)
      setSearchTerm("")
      setAmount("")
      setNote("")
    }
  }

  return (
    <Dialog open={!!state} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{state?.mode === "disburse" ? "Beri Pinjaman Modal" : "Bayar Hutang Tunai"}</DialogTitle>
          <DialogDescription>
            {state?.mode === "repay" ? `${state.farmerName ?? "—"} · sisa ${formatCurrency(maxAmount)}` : "Catat pinjaman modal baru untuk petani"}
          </DialogDescription>
        </DialogHeader>

        {state && (
          <div className="space-y-4">
            {state.mode === "disburse" && warehouseName && (
              <p className="text-[10.5px] text-muted-2">
                Pinjaman dicatat ke buku <b className="text-foreground">{warehouseName}</b>.
              </p>
            )}
            {state.mode === "disburse" && (
              <div>
                <label className="block text-[11px] font-bold text-muted-foreground mb-1">Cari Petani *</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ketik nama atau NIK petani…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm rounded-lg outline-none"
                />
                <div className="mt-2 rounded-lg border border-border-soft overflow-hidden max-h-44 overflow-y-auto">
                  {filteredFarmers.length === 0 && (
                    <p className="px-3 py-3 text-xs text-muted-2">Tidak ada petani cocok</p>
                  )}
                  {filteredFarmers.map((f) => {
                    const isSelected = farmerId === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => { setFarmerId(f.id); setSearchTerm(f.name) }}
                        className={`w-full text-left px-3 py-2 text-xs border-t border-border-soft first:border-t-0 cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected ? "bg-emerald/12" : "hover:bg-panel-alt"
                        }`}
                      >
                        <span className={`font-bold ${isSelected ? "text-emerald" : "text-foreground"}`}>{f.name}</span>
                        {f.nik && <span className="font-mono text-[10px] text-muted-2">{f.nik}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                {state.mode === "disburse" ? "Jumlah Pinjaman (Rp) *" : "Jumlah Pembayaran (Rp) *"}
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoFocus={state.mode === "repay"}
                placeholder={state.mode === "repay" ? `Maks ${formatCurrency(maxAmount)}` : "Contoh: 2.000.000"}
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm font-mono font-bold rounded-lg outline-none"
              />
              {!Number.isNaN(parsedAmount) && (
                <p className="text-[10.5px] text-muted-2 mt-1 font-mono">= {formatCurrency(parsedAmount)}</p>
              )}
              {state.mode === "disburse" && amount !== "" && !isMultipleOf100(Number(amount)) && (
                <p className="text-[10.5px] text-red-deduction mt-1">Jumlah harus kelipatan 100 Rupiah</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Catatan</label>
              <textarea
                rows={2}
                placeholder="Keterangan (opsional)…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none resize-none"
              />
            </div>
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
            {submitting ? "Menyimpan…" : state?.mode === "disburse" ? "Catat Pinjaman" : "Catat Pembayaran"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
