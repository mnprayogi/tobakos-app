"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { lookupItem } from "@/lib/actions/weighing"
import type { FarmerQueueItem } from "@/lib/actions/weighing"
import { parseLabelCode } from "@/lib/barcode"
import { ScanInput } from "@/components/shared/scan-input"
import { ScannedBaleDetail } from "@/components/pos-2/weighing-form"
import { BaleQueue } from "@/components/pos-2/bale-queue"
import { WeighedHistory } from "@/components/pos-2/weighed-history-table"
import { SyncStatusBanner } from "@/components/shared/sync-status-banner"
import { useScale } from "@/hooks/useScale"
import type { RoundMode } from "@/lib/calculations"

interface ScannedItem {
  id: number
  purchaseId: number
  farmerId: number
  labelCode: string
  grade: string
  moisturePercent: number
  packingWeight: number
  status: string
  farmerName: string
  farmerNik: string | null
  customerName: string | null
  tobaccoType: string
  leafType: string
  packingType: string
  pricePerKg: number
  grossWeight: number | null
  weightAfterPacking: number | null
  moistureDeduction: number | null
  netWeight: number | null
  subtotal: number
  createdBy: string | null
  weighedBy: string | null
}

interface Props {
  laneId: number
  defaultRoundingMode?: RoundMode
}

export function WeighingPageClient({ laneId, defaultRoundingMode = "normal" }: Props) {
  const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null)
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerQueueItem | null>(null)
  const [scanValue, setScanValue] = useState("")
  const [roundingMode, setRoundingMode] = useState<RoundMode>(defaultRoundingMode)
  const [scanKey, setScanKey] = useState(0)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)
  const [queueRefreshKey, setQueueRefreshKey] = useState(0)
  const scale = useScale()
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null)

  const loadItem = useCallback(async (code: string, allowWeighed: boolean) => {
    if (!code.trim()) return
    if (!parseLabelCode(code.trim())) {
      toast.error("Format barcode tidak valid")
      return
    }
    try {
      const item = await lookupItem(code.trim(), laneId)
      if (!item) {
        toast.error("Barcode tidak ditemukan")
        return
      }
      if (!allowWeighed && item.status !== "GRADED") {
        toast.error(`Bale sudah berstatus ${item.status}`)
        return
      }
      setScannedItem(item)
      setCapturedWeight(null)
      setSelectedFarmer({
        farmerId: item.farmerId,
        farmerName: item.farmerName,
        farmerNik: item.farmerNik,
        purchaseIds: [item.purchaseId],
        primaryPurchaseId: item.purchaseId,
        gradedCount: 0,
        weighedCount: item.status === "WEIGHED" ? 1 : 0,
        transactionCount: 1,
      })
      setScanValue("")
      toast.success(`Bale ${item.labelCode} dimuat`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }, [laneId])

  const handleScan = useCallback((code: string) => loadItem(code, false), [loadItem])
  const handleHistorySelect = useCallback((labelCode: string) => loadItem(labelCode, true), [loadItem])

  function handleFarmerSelect(farmer: FarmerQueueItem) {
    setSelectedFarmer(farmer)
    setScannedItem(null)
    setCapturedWeight(null)
    setScanValue("")
    setScanKey((k) => k + 1)
  }

  function handleReset() {
    setScannedItem(null)
    setScanValue("")
    setScanKey((k) => k + 1)
    setCapturedWeight(null)
  }

  function handleSessionEnded() {
    setScannedItem(null)
    setScanValue("")
    setScanKey((k) => k + 1)
    setHistoryRefreshKey((k) => k + 1)
    setQueueRefreshKey((k) => k + 1)
  }

  function handleSaved() {
    setHistoryRefreshKey((k) => k + 1)
    setQueueRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-5">
      <SyncStatusBanner />
      <div className="grid grid-cols-[1fr_1.15fr] gap-4 max-lg:grid-cols-1">
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
                  <span className="text-amber font-bold">Menunggu Stabil\u2026</span>
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
                    setCapturedWeight(w)
                    toast.success(`Berat diambil: ${w.toFixed(2)} kg`)
                  } else {
                    toast.error("Berat belum stabil — tunggu indikator Stabil")
                  }
                }}
                disabled={!scannedItem}
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

        <div className="rounded-xl border border-border bg-card p-4 pb-[18px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
            Scan Barcode
          </p>
          <ScanInput
            key={scanKey}
            value={scanValue}
            onChange={setScanValue}
            onSubmit={handleScan}
            disabled={!!scannedItem}
          />
          <p className="text-[10.5px] text-muted-2 italic">
            Kursor otomatis aktif di kolom ini — tinggal tembak scanner, atau tap ikon kamera
            untuk scan pakai kamera tablet.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-4 max-lg:grid-cols-1">
        <BaleQueue
          laneId={laneId}
          selectedFarmerId={selectedFarmer?.farmerId ?? null}
          refreshKey={queueRefreshKey}
          onSelectFarmer={handleFarmerSelect}
        />

        <ScannedBaleDetail
          item={scannedItem}
          roundingMode={roundingMode}
          laneId={laneId}
          capturedWeight={capturedWeight}
          onRoundingModeChange={setRoundingMode}
          onReset={handleReset}
          onSaved={handleSaved}
        />
      </div>

      <WeighedHistory
        laneId={laneId}
        farmerId={selectedFarmer?.farmerId ?? null}
        farmerName={selectedFarmer?.farmerName ?? null}
        refreshKey={historyRefreshKey}
        onSessionEnded={handleSessionEnded}
        onSelectItem={handleHistorySelect}
      />
    </div>
  )
}
