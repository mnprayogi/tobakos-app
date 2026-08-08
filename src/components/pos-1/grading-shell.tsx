"use client"

import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { flushSync } from "react-dom"
import dynamic from "next/dynamic"
import { usePrintDocument, thermalStickerPageStyle } from "@/lib/print"
import { toast } from "sonner"
import {
  saveGrade,
  getTodayDraftFarmerIds,
  getRecentBales,
  getFarmerTodayTransactions,
  getFarmerLaneTodayTransactions,
  startNewTransaction,
  type TransactionOption,
  type LaneTransactionOption,
  type RecentBaleItem,
} from "@/lib/actions/grading"
import { laneToken } from "@/lib/barcode"
import { toDateKey, cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/shared/status-pill"
import { PrinterManager } from "@/components/shared/printer-manager"
import { BaleHistoryTable } from "@/components/pos-1/bale-history-table"
import { SyncStatusBanner } from "@/components/shared/sync-status-banner"
import { useThermalPrinter } from "@/hooks/useThermalPrinter"
import { useOfflineQueue, isNetworkError } from "@/hooks/useOfflineQueue"
import { useRealtime } from "@/hooks/useRealtime"
import { useQueueStore } from "@/lib/queue"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Search, Info, Plus, MousePointerClick, Printer, ScanLine } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

const StickerPreview = dynamic(
  () => import("@/components/shared/sticker-preview").then((m) => m.StickerPreview),
  {
    loading: () => (
      <Skeleton className="rounded-lg" style={{ height: 170 }} />
    ),
  }
)

const QRCodeSVG = dynamic(() => import("qrcode.react").then((m) => m.QRCodeSVG), {
  ssr: false,
  loading: () => null,
})

interface Grade { id: number; name: string; defaultPrice: number }
interface TobaccoType { id: number; name: string; grades: Grade[] }
interface Farmer { id: number; name: string; nik: string | null; address: string | null }

interface BaleItem {
  id: number; labelCode: string; grade: string; status: string
  tobaccoType: string; farmerName: string; farmerId: number
  customerName: string | null
  createdBy: string | null
}

type PrintMode = "manual" | "auto"

let tempBaleId = 0
function nextTempBaleId() {
  tempBaleId -= 1
  return tempBaleId
}

function mergeRecentBales(prev: BaleItem[], fetched: RecentBaleItem[]): BaleItem[] {
  const fetchedIds = new Set(fetched.map((b) => b.id))
  const prevSurvivors = prev.filter((b) => fetchedIds.has(b.id))
  const added: BaleItem[] = []
  for (const b of fetched) {
    if (!prevSurvivors.some((p) => p.id === b.id)) {
      added.push(b)
    }
  }
  return [...added, ...prevSurvivors]
}

interface Props {
  tobaccoTypes: TobaccoType[]
  leafTypes: Array<{ id: number; name: string }>
  packingTypes: Array<{ id: number; name: string; deductionWeight: number }>
  farmers: Farmer[]
  customers: Array<{ id: number; name: string }>
  warehouse: string
  warehouseName: string
  laneCode: string
  laneName: string
  laneId: number
  todayDraftFarmerIds: number[]
  baleItems: BaleItem[]
  maxMoisturePercent: number
  defaultMoisturePercent: number
  defaultWarehouseId: number
  userName: string
}

export function GradingShell({ tobaccoTypes, leafTypes, packingTypes, farmers, customers, warehouse, warehouseName, laneCode, laneName, laneId, todayDraftFarmerIds, baleItems: initialBaleItems, maxMoisturePercent, defaultMoisturePercent, userName }: Props) {
  const [baleItems, setBaleItems] = useState(initialBaleItems)
  const [optimisticBales, setOptimisticBales] = useState<BaleItem[]>([])
  const [draftFarmerIds, setDraftFarmerIds] = useState(todayDraftFarmerIds)
  const [farmerId, setFarmerId] = useState<number | null>(null)
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null)

  const [purchases, setPurchases] = useState<TransactionOption[]>([])
  const purchasesRef = useRef<TransactionOption[]>([])

  const refreshPurchases = useCallback(async () => {
    if (farmerId == null) return
    const all = await getFarmerTodayTransactions(farmerId)
    const inLane = all.filter((p) => p.laneCode === laneCode)
    const drafts = inLane.filter((p) => p.status === "DRAFT")
    const prevDraftIds = new Set(purchasesRef.current.filter((p) => p.status === "DRAFT").map((p) => p.id))
    const nowDraftIds = new Set(drafts.map((d) => d.id))
    const closedSome = [...prevDraftIds].some((id) => !nowDraftIds.has(id))
    purchasesRef.current = inLane
    setPurchases(inLane)
    if (closedSome) {
      toast.info("Transaksi yang dipilih sudah ditimbang/ditutup — bale baru akan masuk transaksi baru.", { id: "tx-closed" })
    }
    setSelectedPurchaseId((prev) => {
      if (prev == null) return drafts.length > 0 ? drafts[drafts.length - 1].id : null
      return drafts.some((d) => d.id === prev) ? prev : drafts.length > 0 ? drafts[drafts.length - 1].id : null
    })
  }, [farmerId, laneCode])

  const realtimeRefetch = useCallback(async () => {
    const [idsRes, recentRes] = await Promise.allSettled([
      getTodayDraftFarmerIds(laneId),
      getRecentBales(laneId),
      refreshPurchases(),
    ])
    if (idsRes.status === "fulfilled") setDraftFarmerIds(idsRes.value)
    if (recentRes.status === "fulfilled") setBaleItems((prev) => mergeRecentBales(prev, recentRes.value))
  }, [laneId, refreshPurchases])

  useRealtime(laneId, [realtimeRefetch])

  const [searchTerm, setSearchTerm] = useState("")
  const [tobaccoTypeId, setTobaccoTypeId] = useState("")
  const [leafTypeId, setLeafTypeId] = useState("")
  const [packingTypeId, setPackingTypeId] = useState("")
  const [moisturePercent, setMoisturePercent] = useState(String(defaultMoisturePercent))
  const [packingWeight, setPackingWeight] = useState("2.00")
  const defaultCustomerId = customers.find((c) => c.name === "Gudang Sendiri")?.id ?? customers[0]?.id ?? 0
  const [customerId, setCustomerId] = useState(defaultCustomerId)

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [printMode, setPrintMode] = useState<PrintMode>(() => {
    try {
      return window.localStorage.getItem("tobak:print-mode") === "auto" ? "auto" : "manual"
    } catch {
      return "manual"
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem("tobak:print-mode", printMode)
    } catch {
      // penyimpanan preferensi diabaikan jika gagal
    }
  }, [printMode])

  const [startingNew, setStartingNew] = useState(false)
  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [txOptions, setTxOptions] = useState<LaneTransactionOption[]>([])
  const [txChecking, setTxChecking] = useState(false)

  const [lastItem, setLastItem] = useState<{
    id: number; labelCode: string; grade: string; status: string; farmerName: string
  } | null>(null)

  const selectedFarmer = farmers.find((f) => f.id === farmerId)
  const currentGrades = tobaccoTypes.find((t) => t.id === Number(tobaccoTypeId))?.grades ?? []
  const filteredFarmers = useMemo(() => {
    const q = searchTerm.toLowerCase()
    if (!q) return farmers
    return farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.nik && f.nik.includes(searchTerm)) ||
        (f.address && f.address.toLowerCase().includes(q))
    )
  }, [farmers, searchTerm])

  const farmerBaleItems = useMemo(
    () => baleItems.filter((b) => (farmerId ? b.farmerId === farmerId && b.status === "GRADED" : true)),
    [baleItems, farmerId]
  )

  const queuedPending = useQueueStore((s) => s.pending)
  const queuedSyncing = useQueueStore((s) => s.syncing)

  const pendingBaleItems = useMemo(() => {
    const queued = queuedPending.filter((a) => a.type === "GRADE")
    return queued
      .filter((a) => (farmerId ? a.payload.farmerId === farmerId : true))
      .map((a, i) => ({
        id: -1 - i,
        labelCode: `ANTRI #${i + 1}`,
        grade: a.payload.grade,
        status: queuedSyncing[a.id] ? "SYNCING" : "PENDING",
        tobaccoType: tobaccoTypes.find((t) => t.id === a.payload.tobaccoTypeId)?.name ?? "—",
        farmerName: farmers.find((f) => f.id === a.payload.farmerId)?.name ?? "—",
        customerName: customers.find((c) => c.id === a.payload.customerId)?.name ?? "—",
        createdBy: null,
      }))
  }, [queuedPending, queuedSyncing, farmerId, tobaccoTypes, farmers, customers])

  const farmerOptimisticBales = useMemo(
    () => optimisticBales.filter((b) => (farmerId ? b.farmerId === farmerId : true)),
    [optimisticBales, farmerId]
  )

  const shortLane = laneToken(laneCode, warehouse)
  const todaySampleCode = `${warehouse}-${shortLane}-${toDateKey(new Date()).replace(/-/g, "")}-XXXX`

  function handleGradeSelect(name: string, price: number) {
    setSelectedGrade(name)
    setSelectedPrice(price)
  }

  function resetForm() {
    setSelectedGrade(null)
    setSelectedPrice(null)
    setCustomerId(defaultCustomerId)
  }

  async function loadPurchases(farmerId: number) {
    const all = await getFarmerTodayTransactions(farmerId)
    const inLane = all.filter((p) => p.laneCode === laneCode)
    const drafts = inLane.filter((p) => p.status === "DRAFT")
    purchasesRef.current = inLane
    setPurchases(inLane)
    setSelectedPurchaseId((prev) => {
      if (prev == null) return drafts.length > 0 ? drafts[drafts.length - 1].id : null
      return drafts.some((p) => p.id === prev) ? prev : drafts.length > 0 ? drafts[drafts.length - 1].id : null
    })
  }

  async function handleSelectFarmer(id: number) {
    setFarmerId(id)
    setSearchTerm("")
    setSelectedGrade(null)
    setSelectedPrice(null)
    try {
      await loadPurchases(id)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleStartNewTransaction() {
    if (!farmerId) return
    setStartingNew(true)
    try {
      await startNewTransaction(farmerId, laneCode)
      await loadPurchases(farmerId)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setStartingNew(false)
    }
  }

  async function handleAddTransaction() {
    if (!farmerId) { toast.error("Pilih petani terlebih dahulu"); return }
    setTxChecking(true)
    try {
      const list = await getFarmerLaneTodayTransactions(farmerId, laneCode)
      if (list.length === 0) {
        await handleStartNewTransaction()
      } else {
        setTxOptions(list)
        setTxDialogOpen(true)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setTxChecking(false)
    }
  }

  async function handleSave() {
    if (!farmerId) { toast.error("Pilih petani"); return }
    if (!tobaccoTypeId) { toast.error("Pilih jenis tembakau"); return }
    if (!leafTypeId) { toast.error("Pilih jenis daun"); return }
    if (!packingTypeId) { toast.error("Pilih jenis packing"); return }
    if (!selectedGrade) { toast.error("Pilih grade"); return }
    if (moisturePercent.trim() === "" || isNaN(Number(moisturePercent)) || Number(moisturePercent) < 0 || Number(moisturePercent) > maxMoisturePercent) {
      toast.error(`Isi potongan MC yang valid (0–${maxMoisturePercent}%)`)
      return
    }
    if (packingWeight.trim() === "" || isNaN(Number(packingWeight)) || Number(packingWeight) < 0) {
      toast.error("Isi potongan packing yang valid")
      return
    }
    if (purchases.some((p) => p.status === "DRAFT") && !selectedPurchaseId) {
      toast.error("Pilih transaksi terlebih dahulu")
      return
    }
    if (!customerId) {
      toast.error("Pilih alokasi customer")
      return
    }

    if (submitting) return

    const payload = {
      farmerId,
      tobaccoTypeId: Number(tobaccoTypeId),
      leafTypeId: Number(leafTypeId),
      packingTypeId: Number(packingTypeId),
      grade: selectedGrade,
      moisturePercent: Number(moisturePercent),
      packingWeight: Number(packingWeight),
      laneCode,
      purchaseId: selectedPurchaseId,
      customerId,
    }

    const tempId = nextTempBaleId()
    const optimisticItem: BaleItem = {
      id: tempId,
      labelCode: "MENUNGGU\u2026",
      grade: selectedGrade,
      status: "SYNCING",
      tobaccoType: tobaccoTypes.find((t) => t.id === Number(tobaccoTypeId))?.name ?? "—",
      farmerName: selectedFarmer?.name ?? "—",
      farmerId: farmerId!,
      customerName: customers.find((c) => c.id === customerId)?.name ?? "—",
      createdBy: null,
    }
    const gradeSnapshot = selectedGrade
    const priceSnapshot = selectedPrice
    const customerSnapshot = customerId
    setOptimisticBales((prev) => [optimisticItem, ...prev])
    setSubmitting(true)
    resetForm()

    try {
      const result = await saveGrade(payload)
      const newItem: BaleItem = {
        id: result.id,
        labelCode: result.labelCode,
        grade: result.grade,
        status: result.status,
        tobaccoType: result.tobaccoType,
        farmerName: result.farmerName,
        farmerId: farmerId!,
        customerName: result.customerName,
        createdBy: result.createdBy,
      }
      setOptimisticBales((prev) => prev.filter((b) => b.id !== tempId))
      setBaleItems((prev) => [newItem, ...prev])
      toast.success(`Bale ${result.labelCode} berhasil disimpan`)
      try {
        await loadPurchases(farmerId)
      } catch {
        // refresh transaksi diabaikan jika gagal
      }
      flushSync(() => {
        setLastItem(newItem)
      })
      if (printMode === "auto") {
        if (printer.connected) {
          try {
            await printer.printLabel({
              labelCode: result.labelCode,
              farmerName: result.farmerName,
              grade: result.grade,
              warehouse,
              lane: shortLane,
            })
          } catch (err) {
            toast.error(`Cetak thermal gagal (${(err as Error).message})`)
          }
        } else {
          toast.info("Printer thermal belum terhubung — bale tersimpan tanpa cetak")
        }
      }
    } catch (err) {
      setOptimisticBales((prev) => prev.filter((b) => b.id !== tempId))
      if (isNetworkError(err)) {
        enqueue({ type: "GRADE", payload })
        toast.info("Offline — bale masuk antrean sinkron")
        return
      }
      setSelectedGrade(gradeSnapshot)
      setSelectedPrice(priceSnapshot)
      setCustomerId(customerSnapshot)
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("ditimbang") || msg.includes("ditutup")) {
        realtimeRefetch()
      }
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const previewLabelCode = lastItem
    ? lastItem.labelCode
    : selectedFarmer
    ? `${warehouse}-${shortLane}-${toDateKey(new Date()).replace(/-/g, "")}-001`
    : todaySampleCode

  const previewFarmerName = lastItem
    ? lastItem.farmerName
    : selectedFarmer
    ? selectedFarmer.name
    : undefined

  const previewGrade = lastItem
    ? lastItem.grade
    : selectedGrade || "—"

  const stickerRef = useRef<HTMLDivElement>(null)
  const handlePrintSticker = usePrintDocument(stickerRef, thermalStickerPageStyle)
  const printer = useThermalPrinter()
  const { enqueue } = useOfflineQueue()

  return (
    <>
    {/* ===== SCREEN HEADER ===== */}
    <PageHeader
      className="mb-4"
      icon={ScanLine}
      title="Pos 1 · Grading"
      subtitle={
        <>
          {warehouseName} · {laneName}
          <span className="ml-2 font-mono text-emerald font-bold">{laneCode}</span>
        </>
      }
    >
      <div className="flex items-center justify-end gap-2">
        <SyncStatusBanner />
        <span className="text-muted-2 text-[11.5px]">user:</span>
        <b className="font-semibold text-foreground">{userName}</b>
      </div>
      <PrinterManager
        connected={printer.connected}
        deviceName={printer.deviceName}
        error={printer.error}
        onConnect={printer.connect}
        onDisconnect={printer.disconnect}
        onTest={printer.printTest}
      />
    </PageHeader>

        {/* ===== 3-COLUMN GRID ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ===== KOLOM 1: Registrasi Petani ===== */}
          <div className="bg-panel border border-border rounded-xl p-4 pb-[18px]">
            <p className="card-title-wf">Registrasi Petani</p>

            {/* Search */}
            <div className="field-wf">
              <InputGroup>
                <InputGroupInput
                  type="text"
                  placeholder="Cari Nama, NIK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
              </InputGroup>
            </div>

            {/* Farmer List */}
            <div className="max-h-40 overflow-y-auto flex flex-col gap-1 mb-3 pr-1 no-scrollbar">
              {filteredFarmers.map((f) => {
                const isSelected = f.id === farmerId
                const hasOpen = draftFarmerIds.includes(f.id)
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSelectFarmer(f.id)}
                    className={cn(
                      "p-2 rounded-lg border text-[12px] transition-all cursor-pointer text-left",
                      isSelected
                        ? "bg-panel-alt border-emerald ring-1 ring-emerald"
                        : "bg-panel-alt/60 hover:bg-panel-alt border-border-soft text-foreground"
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{f.name}</span>
                      {hasOpen && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 uppercase bg-amber/12 text-amber border-amber/30">
                          Open
                        </Badge>
                      )}
                    </span>
                    {f.nik && <span className="font-mono text-[11px] text-muted-foreground">{f.nik}</span>}
                  </button>
                )
              })}
              {filteredFarmers.length === 0 && (
                <p className="text-center text-muted-foreground py-2 text-[11px]">Petani tidak ditemukan.</p>
              )}
            </div>

            {!farmerId && (
              <div className="text-center py-4 text-muted-foreground text-[11px]">
                <Info className="size-5 text-muted-2 mx-auto mb-1.5" />
                Pilih petani di atas untuk memulai grading bale.
              </div>
            )}

            {farmerId && (
              <div className="mb-3">
                <label className="field-wf-label">Transaksi</label>
                <div className="flex gap-1.5">
                  <select
                    value={selectedPurchaseId ?? ""}
                    onChange={(e) => setSelectedPurchaseId(e.target.value ? Number(e.target.value) : null)}
                    className="field-input flex-1"
                  >
                    {!purchases.some((p) => p.status === "DRAFT") && <option value="">Transaksi baru otomatis…</option>}
                    {purchases.map((p) => (
                      <option key={p.id} value={p.id} disabled={p.status !== "DRAFT"}>
                        {p.label} · {p.totalItems} bale{p.status !== "DRAFT" ? " · ditutup" : ""}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={handleAddTransaction}
                    disabled={startingNew || txChecking}
                    title="Tambah transaksi"
                    aria-label="Tambah transaksi"
                    variant="default"
                    size="icon"
                  >
                    <Plus data-icon="inline-start" />
                  </Button>
                </div>
                {!purchases.some((p) => p.status === "DRAFT") && (
                  <p className="text-[10.5px] text-muted-2 mt-1">
                    {purchases.length > 0
                      ? `Transaksi hari ini di ${laneCode} sudah ditutup — bale baru akan dibuat transaksi baru.`
                      : `Belum ada transaksi hari ini di ${laneCode} — akan dibuat otomatis saat bale pertama disimpan.`}
                  </p>
                )}
              </div>
            )}

            {/* Jenis Tembakau + Jenis Daun */}
            <div className="field-wf-row">
              <div>
                <label className="field-wf-label">Jenis Tembakau</label>
                <select
                  value={tobaccoTypeId}
                  onChange={(e) => { setTobaccoTypeId(e.target.value); setSelectedGrade(null); setSelectedPrice(null) }}
                  className="field-input"
                >
                  <option value="">Pilih…</option>
                  {tobaccoTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-wf-label">Jenis Daun</label>
                <select
                  value={leafTypeId}
                  onChange={(e) => setLeafTypeId(e.target.value)}
                  className="field-input"
                >
                  <option value="">Pilih…</option>
                  {leafTypes.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {/* Jenis Packing */}
            <div className="field-wf">
              <label className="field-wf-label">Jenis Packing</label>
              <select
                value={packingTypeId}
                onChange={(e) => {
                const val = e.target.value
                setPackingTypeId(val)
                const found = packingTypes.find((p) => p.id === Number(val))
                if (found) setPackingWeight(String(found.deductionWeight))
              }}
                className="field-input"
              >
                <option value="">Pilih…</option>
                {packingTypes.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (Tara {p.deductionWeight}kg)</option>
                ))}
              </select>
            </div>

            {/* Potongan */}
            <div className="field-wf-row">
              <div>
                <label className="field-wf-label">Potongan MC (%)</label>
                <input
                  type="number" step="0.5" min="0" max={maxMoisturePercent}
                  value={moisturePercent}
                  onChange={(e) => setMoisturePercent(e.target.value)}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-wf-label">Potongan Packing (kg)</label>
                <input
                  type="number" step="0.1" min="0"
                  value={packingWeight}
                  onChange={(e) => setPackingWeight(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>
          </div>

          {/* ===== KOLOM 2: Grade Quality ===== */}
          <div className="bg-panel border border-border rounded-xl p-4 pb-[18px]">
            <p className="card-title-wf">Grade Quality</p>

            {/* Grade Grid */}
            {currentGrades.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Pilih jenis tembakau terlebih dahulu
              </p>
            ) : (
              <div className="grade-grid">
                {currentGrades.map((g) => {
                  const isSelected = selectedGrade === g.name
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleGradeSelect(g.name, g.defaultPrice)}
                      className={cn("grade-btn", isSelected && "grade-btn-active")}
                    >
                      {g.name}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Price Snapshot */}
            {selectedPrice && (
              <div className="price-line">
                <span>Harga/kg (snapshot Grade {selectedGrade})</span>
                <b className="price-line-value">Rp {selectedPrice.toLocaleString("id-ID")}</b>
              </div>
            )}

            {/* Alokasi Customer */}
            <div className="field-wf mt-3.5">
              <label className="field-wf-label">Alokasi Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : 0)}
                className="field-input"
              >
                {customerId === 0 && <option value={0}>Pilih customer…</option>}
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || !farmerId}
              className="btn-wf-primary mt-1.5 disabled:opacity-50"
            >
              {submitting ? "Menyimpan…" : printMode === "auto" ? "Simpan Grade & Cetak Barcode" : "Simpan Grade"}
            </button>
          </div>

          {/* ===== KOLOM 3: Sticker Preview ===== */}
          <div className="bg-panel border border-border rounded-xl p-4 pb-[18px]">
            <p className="card-title-wf">Sticker Barcode Preview</p>

            <StickerPreview
              labelCode={previewLabelCode}
              grade={previewGrade}
              warehouse={warehouse}
              lane={shortLane}
              farmerName={previewFarmerName}
            />

            <div className="mt-3">
              <p className="text-[11px] font-medium text-muted-2 mb-1.5">Mode Cetak</p>
              <ToggleGroup
                value={printMode === "auto" ? ["auto"] : ["manual"]}
                onValueChange={(v) => {
                  const next = v[v.length - 1]
                  if (next === "manual" || next === "auto") setPrintMode(next)
                }}
                size="sm"
                variant="outline"
                className="w-full [&_[data-slot='toggle-group-item']]:flex-1"
              >
                <ToggleGroupItem value="manual">
                  <MousePointerClick data-icon="inline-start" />
                  Manual
                </ToggleGroupItem>
                <ToggleGroupItem value="auto">
                  <Printer data-icon="inline-start" />
                  Auto
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {lastItem && (
              <div className="pending-tag">
                <span className="size-1.5 rounded-full bg-amber shrink-0" />
                <StatusPill status={lastItem.status as "GRADED" | "WEIGHED" | "CLOSED"} />
                <span>— menunggu ditimbang</span>
              </div>
            )}
            <button
              type="button"
              onClick={handlePrintSticker}
              className="btn-wf-ghost mt-2"
            >
              Cetak QR Code
            </button>
          </div>
        </div>

        {/* ===== TABLE: BALE HISTORY ===== */}
        <BaleHistoryTable
          items={farmerBaleItems}
          syncingItems={farmerOptimisticBales}
          pendingItems={pendingBaleItems}
          farmerName={selectedFarmer?.name ?? null}
          farmerNik={selectedFarmer?.nik ?? null}
          onDelete={(id) => setBaleItems((prev) => prev.filter((b) => b.id !== id))}
        />

    {/* Print Sticker hidden */}
    <div style={{ display: "none" }}>
      <div ref={stickerRef} className="print-sticker">
        <div className="qr-container">
          <div className="p-2 bg-white rounded-lg">
            <QRCodeSVG value={previewLabelCode} size={110} />
          </div>
        </div>
        <div className="sticker-label">{previewLabelCode}</div>
        {previewFarmerName && <div className="sticker-text">{previewFarmerName}</div>}
        <div className="sticker-text">GRADE {previewGrade} · {warehouse} · {shortLane}</div>
      </div>
    </div>

    {/* Dialog Opsi Transaksi */}
    {txDialogOpen && selectedFarmer && (
      <Dialog open onOpenChange={(open) => { if (!open) setTxDialogOpen(false) }}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Transaksi Hari Ini — {selectedFarmer.name}</DialogTitle>
          <DialogDescription>
            Pilih transaksi yang mau dilanjutkan, atau buat transaksi baru. Transaksi yang sudah
            ditimbang tidak bisa ditambah bale.
          </DialogDescription>
          <div className="flex flex-col gap-1.5">
            {txOptions.map((txn) => {
              const continuable = txn.status === "DRAFT"
              return (
                <div
                  key={txn.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-2.5 rounded-xl border text-[12px]",
                    continuable
                      ? "bg-panel-alt/60 border-amber/35 hover:border-amber"
                      : "bg-panel-alt/40 border-border-soft opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-foreground truncate">{txn.label}</span>
                    <span className="text-muted-2 whitespace-nowrap">{txn.totalItems} bale</span>
                    <StatusPill status={txn.status as "GRADED" | "WEIGHED" | "CLOSED" | "DRAFT" | "APPROVED" | "PAID"} />
                  </div>
                  {continuable ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPurchaseId(txn.id)
                        setTxDialogOpen(false)
                      }}
                      className="px-3 py-1 bg-amber hover:bg-amber/80 text-primary-foreground font-extrabold text-[10.5px] rounded-lg transition-all cursor-pointer shrink-0"
                    >
                      Lanjutkan
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-2 italic shrink-0">
                      Tidak bisa tambah bale
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTxDialogOpen(false)}
                className="px-4 py-1.5 bg-panel-alt text-foreground border border-border-soft font-bold text-[11.5px] rounded-lg cursor-pointer hover:bg-border/50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setTxDialogOpen(false)
                  await handleStartNewTransaction()
                }}
                disabled={startingNew}
                className="px-4 py-1.5 bg-emerald hover:bg-emerald/80 text-primary-foreground font-extrabold text-[11.5px] rounded-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {startingNew ? "Membuat\u2026" : "Buat Transaksi Baru"}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )}
    </>
  )
}
