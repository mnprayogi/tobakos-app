"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createCashEntry } from "@/lib/actions/cash"
import { roundMoney } from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"
import type { CashCategoryValue, CashFlowTypeValue } from "@/lib/cash-totals"

export interface CashWarehouse {
  id: number
  name: string
}

interface Props {
  open: boolean
  warehouses: CashWarehouse[]
  warehouseName?: string
  onClose: () => void
  onDone?: () => void
}

export function CashDialog({ open, warehouses, warehouseName, onClose, onDone }: Props) {
  const [type, setType] = useState<CashFlowTypeValue>("KELUAR")
  const [category, setCategory] = useState<CashCategoryValue>("KAS_OPERASIONAL")
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const parsedAmount = amount !== "" ? Number(amount) : NaN

  async function handleSubmit() {
    const parsed = amount === "" ? NaN : Number(amount)
    if (Number.isNaN(parsed) || parsed <= 0) {
      toast.error("Jumlah harus lebih dari 0")
      return
    }
    if (warehouses.length > 0 && warehouseId == null) {
      toast.error("Pilih gudang terlebih dahulu")
      return
    }
    setSubmitting(true)
    try {
      await createCashEntry({
        category,
        type,
        amount: roundMoney(parsed),
        note: note || null,
        warehouseId: warehouseId ?? undefined,
      })
      toast.success(type === "MASUK" ? "Kas masuk dicatat" : "Kas keluar dicatat")
      onDone?.()
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function handleOpenChange(openDialog: boolean) {
    if (!openDialog) {
      onClose()
      setType("KELUAR")
      setCategory("KAS_OPERASIONAL")
      setWarehouseId(null)
      setAmount("")
      setNote("")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tambah Mutasi Kas</DialogTitle>
          <DialogDescription>Catat pemasukan atau pengeluaran kas secara manual</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType("MASUK")}
              className={`rounded-lg px-3 py-2 font-bold text-[12px] border cursor-pointer transition-colors ${
                type === "MASUK"
                  ? "bg-emerald/12 text-emerald border-emerald/35"
                  : "bg-panel-alt text-muted-foreground border-border-soft"
              }`}
            >
              + Kas Masuk
            </button>
            <button
              type="button"
              onClick={() => setType("KELUAR")}
              className={`rounded-lg px-3 py-2 font-bold text-[12px] border cursor-pointer transition-colors ${
                type === "KELUAR"
                  ? "bg-red-deduction/12 text-red-deduction border-red-deduction/35"
                  : "bg-panel-alt text-muted-foreground border-border-soft"
              }`}
            >
              − Kas Keluar
            </button>
          </div>

          {warehouses.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-muted-foreground mb-1">Gudang *</label>
              <select
                value={warehouseId ?? ""}
                onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
                className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm rounded-lg outline-none"
              >
                <option value="">Pilih gudang…</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {warehouseName && (
            <p className="text-[10.5px] text-muted-2">
              Mutasi dicatat ke kas <b className="text-foreground">{warehouseName}</b>.
            </p>
          )}

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Kategori *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CashCategoryValue)}
              className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm rounded-lg outline-none"
            >
              <option value="KAS_PEMBELIAN">Kas Pembelian (beli tembakau / bayar petani)</option>
              <option value="KAS_OPERASIONAL">Kas Operasional (biaya operasional)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Jumlah (Rp) *</label>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="Contoh: 500.000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-sm font-mono font-bold rounded-lg outline-none"
            />
            {!Number.isNaN(parsedAmount) && (
              <p className="text-[10.5px] text-muted-2 mt-1 font-mono">= {formatCurrency(parsedAmount)}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Keterangan</label>
            <textarea
              rows={2}
              placeholder="Uraian mutasi (opsional)…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-2 bg-panel-alt border border-border-soft text-foreground text-xs rounded-lg outline-none resize-none"
            />
          </div>
        </div>

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
            {submitting ? "Menyimpan…" : type === "MASUK" ? "Catat Kas Masuk" : "Catat Kas Keluar"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}