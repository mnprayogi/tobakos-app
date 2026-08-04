"use client"

import { useState, useCallback } from "react"
import { getFarmersWithBales } from "@/lib/actions/weighing"
import type { FarmerQueueItem } from "@/lib/actions/weighing"
import { usePolling } from "@/hooks/usePolling"
import { useSse } from "@/hooks/useSse"
import { REALTIME_INTERVAL_MS } from "@/lib/realtime"

interface Props {
  laneId: number
  selectedFarmerId: number | null
  refreshKey: number
  onSelectFarmer: (farmer: FarmerQueueItem) => void
}

export function BaleQueue({ laneId, selectedFarmerId, refreshKey, onSelectFarmer }: Props) {
  const [farmers, setFarmers] = useState<FarmerQueueItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadQueue = useCallback(async () => {
    try {
      const data = await getFarmersWithBales(laneId)
      setFarmers(data)
    } catch {
      setFarmers([])
    } finally {
      setLoading(false)
    }
  }, [laneId])

  usePolling(loadQueue, REALTIME_INTERVAL_MS, [loadQueue, refreshKey])

  useSse(laneId, (event) => {
    if (
      event.type === "bale.created" ||
      event.type === "bale.deleted" ||
      event.type === "bale.weighed" ||
      event.type === "session.ended"
    ) {
      loadQueue()
    }
  })

  return (
    <div className="w-full lg:w-[240px] lg:shrink-0 rounded-xl border border-border bg-card p-4 pb-[18px] flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2">
          Antrian Petani
        </p>
        {farmers.length > 0 && (
          <span className="text-[10px] font-bold bg-amber/12 text-amber border border-amber/35 px-1.5 py-0.5 rounded">
            {farmers.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-panel-alt/50 animate-pulse" />
          ))}
        </div>
      ) : farmers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <svg className="w-6 h-6 text-emerald mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-[11.5px] text-muted-foreground">
            Tidak ada antrian bale
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto max-h-[320px] pr-0.5 no-scrollbar">
          {farmers.map((farmer) => {
            const isActive = farmer.farmerId === selectedFarmerId
            return (
              <button
                type="button"
                key={farmer.farmerId}
                onClick={() => onSelectFarmer(farmer)}
                className={`w-full text-left p-2.5 rounded-xl border text-[11.5px] transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald/8 border-emerald ring-1 ring-emerald"
                    : "bg-panel-alt/60 hover:bg-panel-alt border-border-soft text-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-bold text-foreground truncate">
                    {farmer.farmerName}
                  </span>
                  {farmer.gradedCount === 0 && farmer.weighedCount > 0 ? (
                    <span
                      className={`text-[10px] font-bold shrink-0 rounded px-1.5 py-0.5 border ${
                        isActive
                          ? "bg-emerald/12 text-emerald border-emerald/35"
                          : "bg-emerald/10 text-emerald border-emerald/35"
                      }`}
                      title="Semua bale sudah ditimbang — siap ditutup"
                    >
                      siap ditutup
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold shrink-0 rounded px-1.5 py-0.5 border ${
                        isActive
                          ? "bg-emerald/12 text-emerald border-emerald/35"
                          : "bg-amber/12 text-amber border-amber/35"
                      }`}
                    >
                      {farmer.gradedCount} bale
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-2">Antrian:</span>
                  <span className="font-mono text-muted-foreground truncate">
                    {farmer.farmerNik ?? "\u2014"}
                  </span>
                  {farmer.transactionCount > 1 && (
                    <span className="ml-auto text-[9.5px] font-bold text-muted-2 bg-panel px-1.5 py-0.5 rounded border border-border-soft shrink-0">
                      {farmer.transactionCount} transaksi
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {farmers.length > 0 && (
        <p className="text-[10px] text-muted-2 mt-2 text-center">
          Pilih petani untuk melihat bale
        </p>
      )}
    </div>
  )
}
