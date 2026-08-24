"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { FileSpreadsheet } from "lucide-react"
import type { PortalExportData } from "@/lib/export-excel"

export function PortalExportButton({ data }: { data: PortalExportData }) {
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  function handleClick() {
    setLoading(true)
    startTransition(async () => {
      try {
        const { exportPortalExcel } = await import("@/lib/export-excel")
        await exportPortalExcel(data)
        toast.success("File Excel berhasil diunduh")
      } catch (err) {
        toast.error((err as Error).message || "Gagal membuat file Excel")
      } finally {
        setLoading(false)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl bg-emerald px-3.5 py-2.5 text-[12.5px] font-bold text-primary-foreground transition-colors hover:bg-emerald/80 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
    >
      <FileSpreadsheet className="size-4" />
      {loading ? "Menyiapkan..." : "Unduh Excel"}
    </button>
  )
}
