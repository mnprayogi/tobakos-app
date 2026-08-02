"use client"

import { useOfflineQueue } from "@/hooks/useOfflineQueue"
import { RefreshCw, WifiOff } from "lucide-react"

export function SyncStatusBanner() {
  const { online, pendingCount } = useOfflineQueue()
  if (online && pendingCount === 0) return null
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11.5px] font-semibold ${
        online
          ? "bg-amber/12 text-amber border-amber/35"
          : "bg-red-deduction/10 text-red-deduction border-red-deduction/35"
      }`}
    >
      {online ? <RefreshCw className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      {online
        ? `${pendingCount} aksi menunggu sinkron otomatis\u2026`
        : "Koneksi terputus — data disimpan lokal & disinkron saat online"}
    </div>
  )
}
