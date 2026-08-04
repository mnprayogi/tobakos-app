"use client"

import { useState } from "react"
import { toast } from "sonner"
import { saveWeighData } from "@/lib/actions/weighing"
import { useOfflineQueue, isNetworkError } from "@/hooks/useOfflineQueue"
import { useQueueStore } from "@/lib/queue"
import { StatusPill } from "@/components/shared/status-pill"
import {
  calculateWeightAfterPacking,
  calculateMoistureDeduction,
  calculateNetWeight,
  calculateSubtotal,
  roundWeight,
  type RoundMode,
} from "@/lib/calculations"
import { formatCurrency } from "@/lib/utils"

export interface ScannedItem {
  id: number
  purchaseId: number
  farmerId: number
  labelCode: string
  grade: string
  moisturePercent: number
  packingWeight: number
  status: string
  farmerName: string
  farmerNik: string | null
  customerName: string | null
  tobaccoType: string
  leafType: string
  packingType: string
  pricePerKg: number
  grossWeight: number | null
  weightAfterPacking: number | null
  moistureDeduction: number | null
  netWeight: number | null
  subtotal: number
  createdBy: string | null
  weighedBy: string | null
}

interface Props {
  item: ScannedItem | null
  roundingMode: RoundMode
  laneId: number
  capturedWeight?: number | null
  onRoundingModeChange: (mode: RoundMode) => void
  onReset: () => void
  onSaved?: () => void
}

export function ScannedBaleDetail({ item, roundingMode, laneId, capturedWeight, onRoundingModeChange, onReset, onSaved }: Props) {
  const [grossWeight, setGrossWeight] = useState("")
  const [weighing, setWeighing] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)
  const [lastWeighed, setLastWeighed] = useState<{
    netWeight: number
    subtotal: number
  } | null>(null)
  const [prevCaptured, setPrevCaptured] = useState<number | null>(null)
  const { enqueue } = useOfflineQueue()

  if (item && capturedWeight !== prevCaptured && capturedWeight != null) {
    setPrevCaptured(capturedWeight)
    setGrossWeight(String(capturedWeight))
  }

  if (!item) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-center py-14">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="mx-auto mb-4 text-muted-2"
          >
            <path d="M3 5v14M8 5v14M12 5v14M13 5v14M17 5v14M21 5v14" />
          </svg>
          <p className="text-sm text-muted-foreground">
            Scan barcode untuk memulai penimbangan
          </p>
          <p className="text-[11px] text-muted-2 mt-1.5">
            Barcode akan terisi otomatis setelah scan
          </p>
        </div>
      </div>
    )
  }

  const grossWeightNum = parseFloat(grossWeight) || 0

  // Read-only view for already-weighed bales (loaded from history)
  if (item.status === "WEIGHED") {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-border-soft pb-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
            Stiker & Detail Bale
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald/12 text-emerald px-2 py-0.5 rounded font-bold border border-emerald/30">
              {item.labelCode}
            </span>
            <StatusPill status="WEIGHED" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1.5">Grade</label>
            <input value={item.grade} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1.5">Petani</label>
            <input value={`${item.farmerName} (${item.farmerNik ?? item.farmerName})`} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1.5">Jenis Tembakau</label>
            <input value={item.tobaccoType} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1.5">Jenis Packing</label>
            <input value={item.packingType} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground block mb-1.5">Alokasi Customer</label>
            <input value={item.customerName ?? "\u2014"} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
          </div>
        </div>

      <p className="text-[10.5px] text-muted-2 italic mt-[-6px] mb-0">
        Data di atas dikunci dari input Grader (Pos 1){item.createdBy ? ` — dibuat oleh ${item.createdBy}` : ""}
      </p>

      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
        Hasil Timbangan (Terkunci)
      </p>
        {item.weighedBy && (
          <p className="text-[10.5px] text-muted-2 mb-3">
            Ditimbang oleh {item.weighedBy}
          </p>
        )}
        <div className="divide-y divide-dashed divide-border-soft">
          <div className="flex justify-between items-center py-2 text-[12.5px]">
            <span className="text-muted-foreground">Bruto</span>
            <span className="font-mono font-semibold text-foreground">
              {item.grossWeight?.toFixed(1)} KG
            </span>
          </div>
          <div className="flex justify-between items-center py-2 text-[12.5px]">
            <span className="text-muted-foreground">Tara Packing</span>
            <span className="font-mono font-semibold text-red-deduction">
              {item.packingWeight > 0 ? `(-${item.packingWeight.toFixed(1)} KG)` : "\u2014"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 text-[12.5px]">
            <span className="text-muted-foreground">Berat Setelah Packing</span>
            <span className="font-mono font-semibold text-foreground">
              {item.weightAfterPacking?.toFixed(1)} KG
            </span>
          </div>
          <div className="flex justify-between items-center py-2 text-[12.5px]">
            <span className="text-muted-foreground">
              Potongan Kadar Air ({item.moisturePercent.toFixed(2)}%)
            </span>
            <span className="font-mono font-semibold text-red-deduction">
              (-{item.moistureDeduction?.toFixed(1)} KG)
            </span>
          </div>
          <div className="flex justify-between items-center py-2 text-[12.5px]">
            <span className="text-muted-foreground">Harga/kg</span>
            <span className="font-mono font-semibold text-amber">
              {formatCurrency(item.pricePerKg)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald/40 bg-gradient-to-br from-emerald/14 to-emerald/[0.03] p-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Berat Netto
          </p>
          <p className="font-mono font-extrabold text-3xl sm:text-[34px] text-emerald my-1 mb-1">
            {item.netWeight?.toFixed(1)} KG
          </p>
          <p className="font-mono font-bold text-[15px] text-amber mb-3">
            {formatCurrency(item.subtotal)}
          </p>
          <button
            type="button"
            onClick={handleLocalReset}
            className="w-full rounded-lg bg-panel-alt text-foreground border border-border-soft py-3 font-bold text-[13.5px] cursor-pointer hover:bg-border/50"
          >
            Tutup
          </button>
        </div>
      </div>
    )
  }

  const weightDecimals = roundingMode === "normal" ? 1 : 0

  const rawWeightAfterPacking = grossWeightNum > 0
    ? calculateWeightAfterPacking(grossWeightNum, item.packingWeight)
    : 0
  const weightAfterPacking = rawWeightAfterPacking > 0
    ? roundWeight(rawWeightAfterPacking, roundingMode, weightDecimals)
    : 0

  const rawMoistureDeduction = weightAfterPacking > 0
    ? calculateMoistureDeduction(weightAfterPacking, item.moisturePercent)
    : 0
  const moistureDeduction = roundWeight(rawMoistureDeduction, roundingMode, weightDecimals)

  const netWeight = weightAfterPacking > 0
    ? roundWeight(calculateNetWeight(weightAfterPacking, moistureDeduction), roundingMode, weightDecimals)
    : 0

  const subtotal = netWeight > 0
    ? roundWeight(calculateSubtotal(netWeight, item.pricePerKg), "normal", 2)
    : 0

  const roundingOptions: { value: RoundMode; label: string }[] = [
    { value: "normal", label: "Normal" },
    { value: "floor", label: "Floor" },
    { value: "ceil", label: "Ceil" },
  ]

  async function handleSave() {
    if (!item) return
    if (grossWeightNum <= 0) {
      toast.error("Masukkan berat timbangan")
      return
    }
    setWeighing(true)
    try {
      const payload = {
        labelCode: item.labelCode,
        grossWeight: grossWeightNum,
        roundingMode,
        laneId,
      }
      let result: Awaited<ReturnType<typeof saveWeighData>>
      try {
        result = await saveWeighData(payload)
      } catch (err) {
        if (!isNetworkError(err)) throw err
        const alreadyQueued = useQueueStore.getState().pending.some(
          (a) => a.type === "WEIGH" && a.payload.labelCode === item.labelCode
        )
        if (!alreadyQueued) {
          enqueue({ type: "WEIGH", payload })
          toast.info(`Offline — bale ${item.labelCode} masuk antrean sinkron`)
        } else {
          toast.info(`Bale ${item.labelCode} sudah ada di antrean sinkron`)
        }
        setLastWeighed({ netWeight, subtotal })
        setPendingSync(true)
        onSaved?.()
        return
      }
      setLastWeighed({
        netWeight: result.netWeight ?? 0,
        subtotal: result.subtotal ?? 0,
      })
      setPendingSync(false)
      onSaved?.()
      toast.success(`Bale ${item.labelCode} — Netto ${(result.netWeight ?? 0).toFixed(weightDecimals)} KG`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("ditutup")) {
        onSaved?.()
        onReset()
      }
      toast.error(msg)
    } finally {
      setWeighing(false)
    }
  }

  function handleLocalReset() {
    if (!item) return
    setGrossWeight("")
    setLastWeighed(null)
    setPendingSync(false)
    onReset()
  }

  if (lastWeighed) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="text-center py-6">
          {pendingSync && (
            <span className="inline-block text-[10px] font-bold text-amber bg-amber/12 border border-amber/35 px-2.5 py-1 rounded-full mb-3">
              MENUNGGU SINKRON — otomatis saat koneksi pulih
            </span>
          )}
          <p className="text-sm text-muted-foreground mb-1">
            Bale {item.labelCode} berhasil ditimbang
          </p>
          <p className="font-mono font-bold text-emerald text-lg">
            Netto: {lastWeighed.netWeight.toFixed(weightDecimals)} KG
          </p>
          <p className="font-mono text-amber font-bold">
            {formatCurrency(lastWeighed.subtotal)}
          </p>
          <button
            type="button"
            onClick={handleLocalReset}
            className="mt-4 rounded-lg bg-emerald px-6 py-2 font-bold text-[13.5px] text-primary-foreground cursor-pointer hover:bg-emerald/90"
          >
            Timbang Berikutnya
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border-soft pb-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
          Stiker & Detail Bale
        </h3>
        <span className="text-[10px] bg-emerald/12 text-emerald px-2 py-0.5 rounded font-bold border border-emerald/30">
          {item.labelCode}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1.5">Grade</label>
          <input value={item.grade} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1.5">Petani</label>
          <input value={`${item.farmerName} (${item.farmerNik ?? item.farmerName})`} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1.5">Jenis Tembakau</label>
          <input value={item.tobaccoType} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1.5">Jenis Packing</label>
          <input value={item.packingType} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground block mb-1.5">Alokasi Customer</label>
          <input value={item.customerName ?? "\u2014"} disabled className="w-full bg-[#0a121f] border border-dashed border-border-soft text-foreground/80 font-sans text-[13.5px] px-2.5 py-2 rounded-lg" />
        </div>
      </div>

      <p className="text-[10.5px] text-muted-2 italic mt-[-6px] mb-0">
        Data di atas dikunci dari input Grader (Pos 1){item.createdBy ? ` — dibuat oleh ${item.createdBy}` : ""}
      </p>

      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em]">
          Pembulatan:
        </span>
        <div className="flex bg-panel-alt rounded-xl border border-border-soft p-0.5">
          {roundingOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onRoundingModeChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                roundingMode === opt.value
                  ? "bg-emerald text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] text-muted-foreground block mb-1.5">Berat Timbangan (kg)</label>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            step="any"
            placeholder="0.0"
            value={grossWeight}
            onChange={(e) => setGrossWeight(e.target.value)}
            className="flex-1 bg-panel-alt border border-border-soft text-foreground font-sans text-[13.5px] px-2.5 py-2 rounded-lg outline-none placeholder:text-muted-2"
          />
          {capturedWeight != null && (
            <span className="inline-flex items-center px-2 text-[10px] font-bold text-emerald bg-emerald/10 border border-emerald/30 rounded-lg">
              dari timbangan
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
        Perhitungan
      </p>
      <div className="divide-y divide-dashed divide-border-soft">
        <div className="flex justify-between items-center py-2 text-[12.5px]">
          <span className="text-muted-foreground">Tara Packing</span>
          <span className="font-mono font-semibold text-red-deduction">
            {item.packingWeight > 0 ? `(-${item.packingWeight.toFixed(1)} KG)` : "\u2014"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 text-[12.5px]">
          <span className="text-muted-foreground">Berat Setelah Packing</span>
          <span className="font-mono font-semibold text-foreground">
            {weightAfterPacking > 0 ? `${weightAfterPacking.toFixed(weightDecimals)} KG` : "\u2014"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 text-[12.5px]">
          <span className="text-muted-foreground">
            Potongan Kadar Air ({item.moisturePercent.toFixed(2)}%)
          </span>
          <span className="font-mono font-semibold text-red-deduction">
            {moistureDeduction > 0
              ? `(-${moistureDeduction.toFixed(weightDecimals)} KG)`
              : "\u2014"}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 text-[12.5px]">
          <span className="text-muted-foreground">Harga/kg</span>
          <span className="font-mono font-semibold text-amber">
            {formatCurrency(item.pricePerKg)}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-emerald/40 bg-gradient-to-br from-emerald/14 to-emerald/[0.03] p-4 text-center">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Berat Netto
        </p>
        <p className="font-mono font-extrabold text-[34px] text-emerald my-1 mb-1">
          {netWeight > 0 ? `${netWeight.toFixed(weightDecimals)} KG` : "\u2014"}
        </p>
        <p className="font-mono font-bold text-[15px] text-amber mb-3">
          {subtotal > 0 ? formatCurrency(subtotal) : "\u2014"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleLocalReset}
            className="flex-1 rounded-lg bg-panel-alt text-foreground border border-border-soft py-3 font-bold text-[13.5px] cursor-pointer hover:bg-border/50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={weighing || grossWeightNum <= 0}
            className="flex-1 rounded-lg bg-emerald py-3 font-bold text-[13.5px] text-primary-foreground cursor-pointer transition-colors hover:bg-emerald/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {weighing ? "Menyimpan\u2026" : "Simpan & Kunci Data Timbang"}
          </button>
        </div>
      </div>
    </div>
  )
}
