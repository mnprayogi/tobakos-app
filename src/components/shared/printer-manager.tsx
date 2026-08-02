"use client"

import { toast } from "sonner"

interface PrinterManagerProps {
  connected: boolean
  deviceName: string | null
  error: string | null
  onConnect: () => void
  onDisconnect: () => void
  onTest?: () => void
}

export function PrinterManager({ connected, deviceName, error, onConnect, onDisconnect, onTest }: PrinterManagerProps) {
  async function handleTest() {
    if (!onTest) return
    try {
      await onTest()
      toast.success("Test print dikirim")
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            connected ? "bg-emerald shadow-[0_0_6px_#22c98d]" : "bg-muted-2"
          }`}
        />
        <span className={connected ? "text-emerald font-semibold" : "text-muted-foreground"}>
          {connected ? deviceName ?? "Printer Thermal" : "Printer (WebUSB) belum terhubung"}
        </span>
      </span>
      {!connected ? (
        <button
          type="button"
          onClick={onConnect}
          className="px-2.5 py-1 rounded-md bg-panel-alt border border-border-soft text-[10.5px] font-bold text-foreground cursor-pointer hover:border-emerald/40"
        >
          Hubungkan
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={handleTest}
            className="px-2.5 py-1 rounded-md bg-panel-alt border border-border-soft text-[10.5px] font-bold text-emerald cursor-pointer hover:border-emerald/40"
          >
            Test
          </button>
          <button
            type="button"
            onClick={onDisconnect}
            className="px-2.5 py-1 rounded-md bg-panel-alt border border-border-soft text-[10.5px] font-bold text-muted-foreground cursor-pointer hover:border-red/40"
          >
            Putuskan
          </button>
        </>
      )}
      {error && <span className="text-[10px] text-red">{error}</span>}
    </div>
  )
}
