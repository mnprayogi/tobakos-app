"use client"

import { memo } from "react"
import { toast } from "sonner"
import { useScale } from "@/hooks/useScale"

interface Props {
  disabled?: boolean
  onCapture: (weight: number) => void
}

function LiveScalePanelBase({ disabled = false, onCapture }: Props) {
  const scale = useScale()

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
            onClick={() => {
              const w = scale.capture()
              if (w != null) {
                onCapture(w)
                toast.success(`Berat diambil: ${w.toFixed(2)} kg`)
              } else {
                toast.error("Berat belum stabil — tunggu indikator Stabil")
              }
            }}
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
