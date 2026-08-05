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
import { LiveScalePanel } from "@/components/pos-2/live-scale-panel"
import { SyncStatusBanner } from "@/components/shared/sync-status-banner"
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
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null)

  const handleScaleCapture = useCallback((w: number) => setCapturedWeight(w), [])

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
        <LiveScalePanel disabled={!scannedItem} onCapture={handleScaleCapture} />

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
