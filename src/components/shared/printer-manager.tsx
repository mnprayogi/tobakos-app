"use client"

import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { PrinterTransport } from "@/hooks/useThermalPrinter"

interface PrinterManagerProps {
  connected: boolean
  deviceName: string | null
  error: string | null
  transport: PrinterTransport
  onTransportChange: (transport: PrinterTransport) => void
  onConnect: () => void
  onDisconnect: () => void
  onTest?: () => void
  onForget?: () => void
}

export function PrinterManager({
  connected,
  deviceName,
  error,
  transport,
  onTransportChange,
  onConnect,
  onDisconnect,
  onTest,
  onForget,
}: PrinterManagerProps) {
  async function handleTest() {
    if (!onTest) return
    try {
      await onTest()
      toast.success("Test print dikirim")
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const statusText = connected
    ? deviceName ?? (transport === "ble" ? "Printer Bluetooth (BLE)" : "Printer Thermal")
    : transport === "ble"
    ? "Printer Bluetooth belum terhubung"
    : "Printer (WebUSB) belum terhubung"

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex items-center gap-0.5 rounded-md bg-panel-alt border border-border-soft p-0.5">
        <button
          type="button"
          onClick={() => onTransportChange("usb")}
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer",
            transport === "usb" ? "bg-emerald text-panel" : "text-muted-foreground hover:text-foreground"
          )}
        >
          USB
        </button>
        <button
          type="button"
          onClick={() => onTransportChange("ble")}
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer",
            transport === "ble" ? "bg-emerald text-panel" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Bluetooth
        </button>
      </div>
      <span className="inline-flex items-center gap-1.5">
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            connected ? "bg-emerald shadow-[0_0_6px_#22c98d]" : "bg-muted-2"
          }`}
        />
        <span className={connected ? "text-emerald font-semibold" : "text-muted-foreground"}>{statusText}</span>
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
      {transport === "usb" && !connected && error && onForget && (
        <button
          type="button"
          onClick={onForget}
          className="px-2.5 py-1 rounded-md bg-panel-alt border border-border-soft text-[10.5px] font-bold text-muted-foreground cursor-pointer hover:border-red/40"
        >
          Lupakan USB
        </button>
      )}
      {transport === "ble" && !connected && (
        <span className="text-muted-2 text-[10px]">Chrome/Chromium Android + Bluetooth & Lokasi aktif</span>
      )}
    </div>
  )
}