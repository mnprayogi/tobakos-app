"use client"

import { memo, useState, useCallback } from "react"
import { toast } from "sonner"
import { useScale } from "@/hooks/useScale"

interface Props {
  disabled?: boolean
  onCapture: (weight: number) => void
}

type CaptureRoundMode = "1desimal" | "integer" | "floor" | "ceil"

const ROUND_OPTIONS: { value: CaptureRoundMode; label: string }[] = [
  { value: "1desimal", label: "1 Desimal" },
  { value: "integer", label: "Integer" },
  { value: "floor", label: "Floor" },
  { value: "ceil", label: "Ceil" },
]

function roundCapture(value: number, mode: CaptureRoundMode): number {
  switch (mode) {
    case "1desimal": return Math.round(value * 10) / 10
    case "integer": return Math.round(value)
    case "floor": return Math.floor(value)
    case "ceil": return Math.ceil(value)
  }
}

function LiveScalePanelBase({ disabled = false, onCapture }: Props) {
  const scale = useScale()
  const [roundMode, setRoundMode] = useState<CaptureRoundMode>("1desimal")

  const handleCapture = useCallback(() => {
    const raw = scale.capture()
    if (raw == null) {
      toast.error("Berat belum stabil — tunggu indikator Stabil")
      return
    }
    const weight = roundCapture(raw, roundMode)
    const decimals = roundMode === "1desimal" ? 1 : 0
    onCapture(weight)
    toast.success(`Berat diambil: ${weight.toFixed(decimals)} kg`)
  }, [scale, roundMode, onCapture])

  return (
    <div className="rounded-xl border border-border bg-card p-4 pb-[18px]">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
        Live Scale
      </p>
      <div className="font-mono font-bold text-4xl sm:text-5xl lg:text-[56px] tracking-tight text-foreground text-center my-2.5 leading-none">
        {scale.connected && scale.weight != null ? (
          <>
            {scale.weight.toFixed(2)}<span className="text-xl text-muted-foreground font-semibold"> KG</span>
          </>
        ) : (
          <span className="text-3xl text-muted-2 font-semibold">— — —</span>
        )}
      </div>
      <div className="flex items-center justify-center gap-1.5 text-[11.5px] my-2 mb-4">
        {scale.connected ? (
          scale.stable ? (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald" />
              <span className="text-emerald font-bold">Stream Stabil</span>
            </>
          ) : (
            <>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
              <span className="text-amber font-bold">Menunggu Stabil…</span>
            </>
          )
        ) : (
          <span className="text-muted-2">Belum terhubung</span>
        )}
      </div>
      {scale.connected && (
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-1.5">
            Pembulatan
          </p>
          <div className="flex h-[32px] items-center bg-panel-alt rounded-lg border border-border-soft p-0.5">
            {ROUND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRoundMode(opt.value)}
                className={`h-full flex-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${
                  roundMode === opt.value
                    ? "bg-emerald text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {!scale.connected ? (
        <button
          onClick={scale.connect}
          className="w-full rounded-lg bg-emerald text-primary-foreground border border-emerald py-3 font-bold text-[13.5px] cursor-pointer hover:bg-emerald/90"
        >
          Koneksi Timbangan (USB)
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={handleCapture}
            disabled={disabled}
            className="flex-1 rounded-lg bg-amber text-primary-foreground py-3 font-bold text-[13.5px] cursor-pointer hover:bg-amber/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Ambil Berat
          </button>
          <button
            onClick={scale.disconnect}
            className="flex-1 rounded-lg bg-panel-alt text-foreground border border-border-soft py-3 font-bold text-[13.5px] cursor-pointer hover:bg-border/50"
          >
            Putuskan
          </button>
        </div>
      )}
      {scale.error && (
        <p className="text-[10.5px] text-red mt-2 text-center">{scale.error}</p>
      )}
      <p className="text-[10.5px] text-muted-2 mt-2 text-center">
        Buka halaman di Chrome/Edge (WebSerial) — pilih perangkat timbangan saat diminta.
      </p>
    </div>
  )
}

export const LiveScalePanel = memo(LiveScalePanelBase)
