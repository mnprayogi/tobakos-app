"use client"

import { useState, useEffect, useRef } from "react"
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
  const prevCapturedRef = useRef<number | null>(null)
  const { enqueue } = useOfflineQueue()

  useEffect(() => {
    if (capturedWeight == null) {
      prevCapturedRef.current = null
      return
    }
    if (item && capturedWeight !== prevCapturedRef.current) {
      prevCapturedRef.current = capturedWeight
      setGrossWeight(String(capturedWeight))
    }
  }, [item, capturedWeight])

  const grossWeightNum = parseFloat(grossWeight) || 0

  // Read-only view for already-weighed bales (loaded from history)
  if (item?.status === "WEIGHED") {
    return (
      <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
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

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          <div>
            <label className="text-[10.5px] text-muted-foreground block mb-1">Grade</label>
            <input value={item.grade} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
          </div>
          <div>
            <label className="text-[10.5px] text-muted-foreground block mb-1">Petani</label>
            <input value={`${item.farmerName} (${item.farmerNik ?? item.farmerName})`} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
          </div>
          <div>
            <label className="text-[10.5px] text-muted-foreground block mb-1">Jenis Tembakau</label>
            <input value={item.tobaccoType} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
          </div>
          <div>
            <label className="text-[10.5px] text-muted-foreground block mb-1">Jenis Daun</label>
            <input value={item.leafType} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
          </div>
          <div>
            <label className="text-[10.5px] text-muted-foreground block mb-1">Jenis Packing</label>
            <input value={item.packingType} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
          </div>
          <div>
            <label className="text-[10.5px] text-muted-foreground block mb-1">Alokasi Customer</label>
            <input value={item.customerName ?? "\u2014"} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
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
          <div className="flex justify-between items-center py-1.5 text-[12px]">
            <span className="text-muted-foreground">Bruto</span>
            <span className="font-mono font-semibold text-foreground">
              {item.grossWeight?.toFixed(1)} KG
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 text-[12px]">
            <span className="text-muted-foreground">Tara Packing</span>
            <span className="font-mono font-semibold text-red-deduction">
              {item.packingWeight > 0 ? `(-${item.packingWeight.toFixed(1)} KG)` : "\u2014"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 text-[12px]">
            <span className="text-muted-foreground">Berat Setelah Packing</span>
            <span className="font-mono font-semibold text-foreground">
              {item.weightAfterPacking?.toFixed(1)} KG
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 text-[12px]">
            <span className="text-muted-foreground">
              Potongan Kadar Air ({item.moisturePercent.toFixed(2)}%)
            </span>
            <span className="font-mono font-semibold text-red-deduction">
              (-{item.moistureDeduction?.toFixed(1)} KG)
            </span>
          </div>
          <div className="flex justify-between items-center py-1.5 text-[12px]">
            <span className="text-muted-foreground">Harga/kg</span>
            <span className="font-mono font-semibold text-amber">
              {formatCurrency(item.pricePerKg)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald/40 bg-gradient-to-br from-emerald/14 to-emerald/[0.03] p-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
            Berat Netto
          </p>
          <p className="font-mono font-extrabold text-[26px] text-emerald my-0.5">
            {item.netWeight?.toFixed(1)} KG
          </p>
          <p className="font-mono font-bold text-[13.5px] text-amber mb-2.5">
            {formatCurrency(item.subtotal)}
          </p>
          <button
            type="button"
            onClick={handleLocalReset}
            className="w-full rounded-lg bg-panel-alt text-foreground border border-border-soft py-2.5 font-bold text-[13.5px] cursor-pointer hover:bg-border/50"
          >
            Tutup
          </button>
        </div>
      </div>
    )
  }

  const weightDecimals = roundingMode === "normal" ? 1 : 0

  const rawWeightAfterPacking = grossWeightNum > 0
    ? calculateWeightAfterPacking(grossWeightNum, item?.packingWeight ?? 0)
    : 0
  const weightAfterPacking = rawWeightAfterPacking > 0
    ? roundWeight(rawWeightAfterPacking, roundingMode, weightDecimals)
    : 0

  const rawMoistureDeduction = weightAfterPacking > 0
    ? calculateMoistureDeduction(weightAfterPacking, item?.moisturePercent ?? 0)
    : 0
  const moistureDeduction = roundWeight(rawMoistureDeduction, roundingMode, weightDecimals)

  const netWeight = weightAfterPacking > 0
    ? roundWeight(calculateNetWeight(weightAfterPacking, moistureDeduction), roundingMode, weightDecimals)
    : 0

  const subtotal = netWeight > 0
    ? roundWeight(calculateSubtotal(netWeight, item?.pricePerKg ?? 0), "normal", 2)
    : 0

  const roundingOptions: { value: RoundMode; label: string }[] = [
    { value: "normal", label: "Normal" },
    { value: "floor", label: "Floor" },
    { value: "ceil", label: "Ceil" },
  ]

  async function handleSave() {
    if (!item) return
    if (weighing) return
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
      try {
        const result = await saveWeighData(payload)
        onSaved?.()
        toast.success(`Bale ${item.labelCode} — Netto ${(result.netWeight ?? 0).toFixed(weightDecimals)} KG`)
        handleLocalReset()
      } catch (err) {
        if (isNetworkError(err)) {
          const alreadyQueued = useQueueStore.getState().pending.some(
            (a) => a.type === "WEIGH" && a.payload.labelCode === item.labelCode
          )
          if (!alreadyQueued) {
            enqueue({ type: "WEIGH", payload })
            toast.info(`Offline — bale ${item.labelCode} masuk antrean sinkron`)
          } else {
            toast.info(`Bale ${item.labelCode} sudah ada di antrean sinkron`)
          }
          onSaved?.()
          handleLocalReset()
          return
        }
        setGrossWeight("")
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("ditutup")) {
          onSaved?.()
          onReset()
        }
        toast.error(msg)
      }
    } finally {
      setWeighing(false)
    }
  }

  function handleLocalReset() {
    setGrossWeight("")
    onReset()
  }

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 space-y-3">
      <div className="flex items-center justify-between border-b border-border-soft pb-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
          Stiker & Detail Bale
        </h3>
        {item && (
          <span className="text-[10px] bg-emerald/12 text-emerald px-2 py-0.5 rounded font-bold border border-emerald/30">
            {item.labelCode}
          </span>
        )}
      </div>

      <div className="lg:flex lg:items-stretch lg:gap-3">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <div>
              <label className="text-[10.5px] text-muted-foreground block mb-1">Grade</label>
              <input value={item?.grade ?? ""} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
            </div>
            <div>
              <label className="text-[10.5px] text-muted-foreground block mb-1">Petani</label>
              <input value={item ? `${item.farmerName} (${item.farmerNik ?? item.farmerName})` : ""} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
            </div>
            <div>
              <label className="text-[10.5px] text-muted-foreground block mb-1">Jenis Tembakau</label>
              <input value={item?.tobaccoType ?? ""} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
            </div>
            <div>
              <label className="text-[10.5px] text-muted-foreground block mb-1">Jenis Daun</label>
              <input value={item?.leafType ?? ""} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
            </div>
            <div>
              <label className="text-[10.5px] text-muted-foreground block mb-1">Jenis Packing</label>
              <input value={item?.packingType ?? ""} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
            </div>
            <div>
              <label className="text-[10.5px] text-muted-foreground block mb-1">Alokasi Customer</label>
              <input value={item?.customerName ?? "\u2014"} disabled className="w-full bg-panel border border-dashed border-border-soft text-foreground/80 font-sans text-[13px] px-2.5 py-1.5 rounded-lg" />
            </div>
          </div>

          {item && (
            <p className="text-[10px] text-muted-2 italic">
              Data dikunci dari input Grader (Pos 1){item.createdBy ? ` — dibuat oleh ${item.createdBy}` : ""}
            </p>
          )}

          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[170px]">
              <label className="text-[10.5px] text-muted-foreground block mb-1">Berat Timbangan (kg)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="any"
                  placeholder="0.0"
                  value={grossWeight}
                  onChange={(e) => setGrossWeight(e.target.value)}
                  disabled={!item || capturedWeight != null}
                  className="flex-1 bg-panel-alt border border-border-soft text-foreground font-sans text-[13px] px-2.5 py-1.5 rounded-lg outline-none placeholder:text-muted-2 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {capturedWeight != null && (
                  <span className="inline-flex items-center px-2 text-[10px] font-bold text-emerald bg-emerald/10 border border-emerald/30 rounded-lg">
                    dari timbangan
                  </span>
                )}
              </div>
              {!item && (
                <p className="text-[10px] text-muted-2 italic mt-1">
                  Scan barcode untuk memulai penimbangan
                </p>
              )}
            </div>

            <div className="shrink-0">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.06em] block mb-1">
                Pembulatan
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
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-1.5">
              Perhitungan
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
                <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">Tara Packing</p>
                <p className="font-mono font-semibold text-[12.5px] text-red-deduction">
                  {item && item.packingWeight > 0 ? `(-${item.packingWeight.toFixed(1)} KG)` : "\u2014"}
                </p>
              </div>
              <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
                <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">Setelah Packing</p>
                <p className="font-mono font-semibold text-[12.5px] text-foreground">
                  {weightAfterPacking > 0 ? `${weightAfterPacking.toFixed(weightDecimals)} KG` : "\u2014"}
                </p>
              </div>
              <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
                <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">
                  Pot. Kadar Air ({item ? item.moisturePercent.toFixed(2) : "0.00"}%)
                </p>
                <p className="font-mono font-semibold text-[12.5px] text-red-deduction">
                  {moistureDeduction > 0 ? `(-${moistureDeduction.toFixed(weightDecimals)} KG)` : "\u2014"}
                </p>
              </div>
              <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
                <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">Harga/kg</p>
                <p className="font-mono font-semibold text-[12.5px] text-amber">
                  {item ? formatCurrency(item.pricePerKg) : "\u2014"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-[230px] shrink-0 mt-3 lg:mt-0 flex flex-col gap-2">
          <div className="rounded-xl border border-emerald/40 bg-gradient-to-br from-emerald/14 to-emerald/[0.03] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Berat Netto
            </p>
            <p className="font-mono font-extrabold text-[26px] text-emerald my-0.5">
              {netWeight > 0 ? `${netWeight.toFixed(weightDecimals)} KG` : "\u2014"}
            </p>
            <p className="font-mono font-bold text-[13.5px] text-amber">
              {subtotal > 0 ? formatCurrency(subtotal) : "\u2014"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {item && (
              <button
                type="button"
                onClick={handleLocalReset}
                className="rounded-lg bg-panel-alt text-foreground border border-border-soft py-2.5 font-bold text-[13.5px] cursor-pointer hover:bg-border/50"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!item || weighing || grossWeightNum <= 0}
              className="rounded-lg bg-emerald py-2.5 font-bold text-[13.5px] text-primary-foreground cursor-pointer transition-colors hover:bg-emerald/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {weighing ? "Menyimpan\u2026" : "Simpan & Kunci Data Timbang"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
