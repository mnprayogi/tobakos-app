"use client"

import { Printer } from "lucide-react"

export function PrintButton({ label = "Cetak Rekap" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-xl border border-border bg-panel-alt px-3.5 py-2.5 text-[12.5px] font-bold text-foreground transition-colors hover:border-emerald/40 hover:text-emerald cursor-pointer print:hidden"
    >
      <Printer className="size-4" />
      {label}
    </button>
  )
}
