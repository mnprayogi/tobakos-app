"use client"

import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[#060A12] px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-panel">
        <WifiOff className="size-8 text-amber" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[#E7ECF5]">Tidak Ada Koneksi</h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Perangkat ini sedang offline. Periksa jaringan LAN atau WiFi, lalu coba muat ulang halaman.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl border border-[rgba(34,201,141,.35)] bg-[rgba(34,201,141,.12)] px-5 py-2.5 text-sm font-semibold text-emerald transition hover:bg-[rgba(34,201,141,.2)]"
      >
        Muat Ulang
      </button>
    </div>
  )
}