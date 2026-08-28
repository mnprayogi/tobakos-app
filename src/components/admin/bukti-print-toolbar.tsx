"use client"

import { Printer, X } from "lucide-react"

export function BuktiPrintToolbar({ title }: { title?: string }) {
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2.5 bg-panel border-b border-border">
      <p className="text-[12px] font-bold text-foreground">{title ?? "Bukti Lunas — Print Preview"}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald hover:bg-emerald/80 text-primary-foreground font-bold text-[11.5px] rounded-lg cursor-pointer transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-panel-alt text-foreground border border-border-soft font-bold text-[11.5px] rounded-lg cursor-pointer hover:bg-border/50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Tutup
        </button>
      </div>
    </div>
  )
}
