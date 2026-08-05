"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { getBuktiData, type BuktiData } from "@/lib/actions/finance"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import { lazyPrint } from "@/components/shared/lazy-print"

const BuktiLunasPrint = lazyPrint(() =>
  import("@/components/admin/bukti-lunas-print").then((m) => m.BuktiLunasPrint)
)

interface Props {
  purchaseId: number | null
  onClose: () => void
}

export function BuktiLunasDialog({ purchaseId, onClose }: Props) {
  const [data, setData] = useState<BuktiData | null>(null)
  const [loading, setLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = usePrintDocument(printRef, printBaseStyle, {
    documentTitle: () => (data ? `Bukti-Lunas-${data.transactionCode}` : "Bukti-Lunas"),
  })

  const [prevPurchaseId, setPrevPurchaseId] = useState(purchaseId)
  if (prevPurchaseId !== purchaseId) {
    setPrevPurchaseId(purchaseId)
    setData(null)
    setLoading(true)
  }

  useEffect(() => {
    if (purchaseId == null) return
    let cancelled = false
    getBuktiData(purchaseId)
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) toast.error((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [purchaseId])

  if (purchaseId == null) return null

  return (
    <div className="nota-overlay" onClick={onClose}>
      <div className="nota-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <p className="font-bold text-sm text-foreground">
            {loading ? "Memuat bukti lunas…" : data ? `Bukti Lunas — ${data.farmerName}` : "Bukti Lunas"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !data}
              className="px-4 py-2 bg-emerald text-primary-foreground font-bold text-xs rounded-lg cursor-pointer hover:bg-emerald/80 disabled:opacity-50"
            >
              Cetak Bukti Lunas
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-panel-alt text-foreground border border-border-soft font-bold text-xs rounded-lg cursor-pointer hover:bg-border/50"
            >
              Tutup
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl p-10 text-center text-sm font-mono" style={{ color: "#333" }}>
            Memuat…
          </div>
        )}

        {!loading && data && (
          <div className="bg-white rounded-xl p-6">
            <BuktiLunasPrint ref={printRef} {...data} />
          </div>
        )}
      </div>
    </div>
  )
}
