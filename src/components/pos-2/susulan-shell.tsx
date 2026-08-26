"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { PrinterManager } from "@/components/shared/printer-manager"
import { useThermalPrinter } from "@/hooks/useThermalPrinter"
import { usePrintDocument, printBaseStyle } from "@/lib/print"
import { StickerBatchPrint } from "@/components/pos-2/sticker-batch-print"
import {
  checkSusulanDuplicate,
  saveSusulanBatch,
  type SusulanBatchResult,
} from "@/lib/actions/susulan"
import {
  calculateWeightAfterPacking,
  calculateMoistureDeduction,
  calculateNetWeight,
  calculateSubtotal,
  roundWeight,
  roundMoney,
  type RoundMode,
} from "@/lib/calculations"
import { laneToken } from "@/lib/barcode"
import { cn, toDateKey, formatCurrency } from "@/lib/utils"

interface GradeOption {
  id: number
  name: string
  defaultPrice: number
}
interface TobaccoTypeOption {
  id: number
  name: string
  grades: GradeOption[]
}
interface SimpleOption {
  id: number
  name: string
}
interface PackingOption extends SimpleOption {
  deductionWeight: number
}
interface FarmerOption {
  id: number
  name: string
  nik: string | null
  address: string | null
}

interface SusulanShellProps {
  tobaccoTypes: TobaccoTypeOption[]
  leafTypes: SimpleOption[]
  packingTypes: PackingOption[]
  farmers: FarmerOption[]
  customers: SimpleOption[]
  warehouse: string
  laneCode: string
  laneName: string
  maxMoisturePercent: number
  defaultMoisturePercent: number
  userName: string
}

interface SavedBale {
  key: number
  tobaccoTypeId: number
  tobaccoTypeName: string
  leafTypeId: number
  leafTypeName: string
  packingTypeId: number
  packingTypeName: string
  packingWeight: number
  gradeName: string
  gradePrice: number
  moisturePercent: number
  customerId: number
  customerName: string
  grossWeight: number | null
  roundingMode: RoundMode
  weightAfterPacking: number | null
  moistureDeduction: number | null
  netWeight: number | null
  subtotal: number | null
}

const ROUNDING_OPTIONS: { value: RoundMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "floor", label: "Floor" },
  { value: "ceil", label: "Ceil" },
]

export function SusulanShell(props: SusulanShellProps) {
  const {
    tobaccoTypes,
    leafTypes,
    packingTypes,
    farmers,
    customers,
    warehouse,
    laneCode,
    maxMoisturePercent,
    defaultMoisturePercent,
  } = props

  const shortLane = laneToken(laneCode, warehouse)
  const todayKey = toDateKey(new Date())
  const keyRef = useRef(1)

  function nextKey() {
    keyRef.current += 1
    return keyRef.current
  }

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerOption | null>(null)
  const [dateValue, setDateValue] = useState("")

  const [tobaccoTypeId, setTobaccoTypeId] = useState<number | null>(null)
  const [leafTypeId, setLeafTypeId] = useState<number | null>(null)
  const [packingTypeId, setPackingTypeId] = useState<number | null>(null)
  const [gradeName, setGradeName] = useState<string | null>(null)
  const [moisturePercent, setMoisturePercent] = useState(defaultMoisturePercent)
  const [customerId, setCustomerId] = useState<number | null>(customers[0]?.id ?? null)
  const [grossWeight, setGrossWeight] = useState("")
  const [roundingMode, setRoundingMode] = useState<RoundMode>("normal")

  const [savedBales, setSavedBales] = useState<SavedBale[]>([])

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SusulanBatchResult | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printedCount, setPrintedCount] = useState(0)

  const printer = useThermalPrinter()
  const stickerPrintRef = useRef<HTMLDivElement>(null)
  const handleStickerPrint = usePrintDocument(stickerPrintRef, printBaseStyle, { documentTitle: "Label-Batch" })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const farmerId = selectedFarmer?.id
      let dup: string | null = null
      if (farmerId && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        try {
          dup = await checkSusulanDuplicate(farmerId, laneCode, dateValue)
        } catch {
          dup = null
        }
      }
      if (!cancelled) setDuplicateWarning(dup)
    })()
    return () => {
      cancelled = true
    }
  }, [selectedFarmer?.id, dateValue, laneCode])

  const filteredFarmers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const base = q
      ? farmers.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            (f.nik ?? "").toLowerCase().includes(q)
        )
      : farmers
    return base.slice(0, 8)
  }, [farmers, searchQuery])

  const gradeOptions = useMemo(
    () =>
      tobaccoTypes.find((t) => t.id === tobaccoTypeId)?.grades ?? [],
    [tobaccoTypes, tobaccoTypeId]
  )

  const selectedPacking =
    packingTypes.find((p) => p.id === packingTypeId) ?? null
  const taraKg = selectedPacking?.deductionWeight ?? 0

  const grossWeightNum = grossWeight === "" ? null : parseFloat(grossWeight)

  const currentPreview = useMemo(() => {
    if (grossWeightNum == null || isNaN(grossWeightNum))
      return { afterPacking: null, mcDeduction: null, price: null, netto: null, subtotal: null, invalid: false }
    const price =
      gradeOptions.find((g) => g.name === gradeName)?.defaultPrice ?? null
    if (price == null)
      return { afterPacking: null, mcDeduction: null, price: null, netto: null, subtotal: null, invalid: false }
    const weightDecimals = roundingMode === "normal" ? 1 : 0
    const afterPackingRaw = calculateWeightAfterPacking(grossWeightNum, taraKg)
    if (afterPackingRaw < 0)
      return { afterPacking: afterPackingRaw, mcDeduction: null, price, netto: null, subtotal: null, invalid: true }
    const afterPacking = roundWeight(afterPackingRaw, roundingMode, weightDecimals)
    const mcDeduction = roundWeight(
      calculateMoistureDeduction(afterPacking, moisturePercent),
      roundingMode,
      weightDecimals
    )
    const netto = roundWeight(
      calculateNetWeight(afterPacking, mcDeduction),
      roundingMode,
      weightDecimals
    )
    const subtotal = roundWeight(calculateSubtotal(netto, price), "normal", 2)
    return {
      afterPacking,
      mcDeduction,
      price,
      netto,
      subtotal,
      invalid: false,
    }
  }, [grossWeightNum, gradeName, taraKg, moisturePercent, roundingMode, gradeOptions])

  const historySummary = useMemo(() => {
    let nettoTotal = 0
    let subtotalTotal = 0
    for (const bale of savedBales) {
      if (bale.netWeight != null) nettoTotal += bale.netWeight
      if (bale.subtotal != null) subtotalTotal += bale.subtotal
    }
    return {
      nettoTotal: roundMoney(nettoTotal),
      subtotalTotal: roundMoney(subtotalTotal),
    }
  }, [savedBales])

  const canSaveBale =
    !!tobaccoTypeId &&
    !!leafTypeId &&
    !!packingTypeId &&
    !!gradeName &&
    !!customerId &&
    moisturePercent >= 0 &&
    moisturePercent <= maxMoisturePercent &&
    (grossWeight === "" ||
      (grossWeightNum != null &&
        !isNaN(grossWeightNum) &&
        grossWeightNum >= 0))

  const canSaveAll =
    !!selectedFarmer &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateValue) &&
    dateValue <= todayKey &&
    savedBales.length > 0 &&
    !submitting

  function handleSimpanBale() {
    if (!canSaveBale) return
    if (!tobaccoTypeId || !leafTypeId || !packingTypeId || !gradeName || !customerId) return

    const packing = packingTypes.find((p) => p.id === packingTypeId)!
    const grade = gradeOptions.find((g) => g.name === gradeName)!

    const bale: SavedBale = {
      key: nextKey(),
      tobaccoTypeId,
      tobaccoTypeName: tobaccoTypes.find((t) => t.id === tobaccoTypeId)!.name,
      leafTypeId,
      leafTypeName: leafTypes.find((l) => l.id === leafTypeId)!.name,
      packingTypeId,
      packingTypeName: packing.name,
      packingWeight: packing.deductionWeight,
      gradeName,
      gradePrice: grade.defaultPrice,
      moisturePercent,
      customerId,
      customerName: customers.find((c) => c.id === customerId)!.name,
      grossWeight: grossWeightNum,
      roundingMode,
      weightAfterPacking: currentPreview.afterPacking,
      moistureDeduction: currentPreview.mcDeduction,
      netWeight: currentPreview.netto,
      subtotal: currentPreview.subtotal,
    }

    setSavedBales((prev) => [...prev, bale])
    setGradeName(null)
    setGrossWeight("")
    toast.success(`Bale #${savedBales.length + 1} ditambahkan`)
  }

  function removeBale(key: number) {
    setSavedBales((prev) => prev.filter((b) => b.key !== key))
  }

  async function handleSimpanSemua() {
    if (!canSaveAll) return
    if (!selectedFarmer) return

    setSubmitting(true)
    try {
      const saved = await saveSusulanBatch({
        farmerId: selectedFarmer.id,
        laneCode,
        transactionDate: dateValue,
        bales: savedBales.map((b) => ({
          tobaccoTypeId: b.tobaccoTypeId,
          leafTypeId: b.leafTypeId,
          packingTypeId: b.packingTypeId,
          grade: b.gradeName,
          moisturePercent: b.moisturePercent,
          packingWeight: b.packingWeight,
          customerId: b.customerId,
          grossWeight: b.grossWeight,
          roundingMode: b.roundingMode,
        })),
      })
      setResult(saved)
      setSelectedFarmer(null)
      setSearchQuery("")
      setDateValue("")
      setDuplicateWarning(null)
      setSavedBales([])
      setTobaccoTypeId(null)
      setLeafTypeId(null)
      setPackingTypeId(null)
      setGradeName(null)
      setMoisturePercent(defaultMoisturePercent)
      setCustomerId(customers[0]?.id ?? null)
      setGrossWeight("")
      setRoundingMode("normal")
      toast.success(
        saved.sessionEnded
          ? `Transaksi ${saved.transactionCode} tersimpan & sesi ditutup (WEIGHED)`
          : `Transaksi ${saved.transactionCode} tersimpan (${saved.labels.length} bale)`
      )
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function printAllLabels() {
    if (!result || printing) return
    if (!printer.connected) {
      toast.error("Hubungkan printer thermal terlebih dahulu")
      return
    }
    setPrinting(true)
    setPrintedCount(0)
    let done = 0
    try {
      for (const label of result.labels) {
        await printer.printLabel({
          labelCode: label.labelCode,
          farmerName: result.farmerName,
          grade: label.grade,
          warehouse,
          lane: shortLane,
        })
        done += 1
        setPrintedCount(done)
      }
      toast.success(`${done} label tercetak`)
    } catch (e) {
      toast.error(
        `Cetak berhenti pada label ke-${done + 1}: ${(e as Error).message}`
      )
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      <PageHeader
        icon={ClipboardList}
        title="Pos 2 · Input Susulan"
        subtitle={`Salin formulir kertas — satu bale per simpan · Jalur ${laneCode}`}
      />

      {/* ===== DATA UMUM (Petani + Tanggal) ===== */}
      <div className="bg-panel border border-border rounded-xl p-4 space-y-4 w-full">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald" />
          <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
            Data Umum
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {/* Petani */}
          <div className="xl:col-span-2">
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Petani *
            </label>
            {selectedFarmer ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-panel-alt border border-emerald/30 rounded-lg h-[38px]">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground truncate block">
                    {selectedFarmer.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-2 block leading-none">
                    {selectedFarmer.nik ?? "NIK —"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFarmer(null)}
                  className="shrink-0 p-1 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer"
                  title="Ganti petani"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-2" />
                  <input
                    type="text"
                    placeholder="Cari nama / NIK…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="field-input pl-8 w-full h-[38px]"
                  />
                </div>
                {searchQuery.trim() !== "" && (
                  <div className="mt-1 space-y-1 max-h-[180px] overflow-y-auto bg-panel-alt border border-border-soft rounded-lg p-1">
                    {filteredFarmers.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setSelectedFarmer(f)
                          setSearchQuery("")
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-md hover:border-emerald/40 hover:bg-panel cursor-pointer border border-transparent"
                      >
                        <span className="text-xs font-bold text-foreground">
                          {f.name}
                        </span>
                        <span className="ml-2 font-mono text-[10px] text-muted-2">
                          {f.nik ?? "—"}
                        </span>
                      </button>
                    ))}
                    {filteredFarmers.length === 0 && (
                      <p className="text-center text-[11px] text-muted-2 py-2">
                        Petani tidak ditemukan
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Tanggal Formulir *
            </label>
            <input
              type="date"
              value={dateValue}
              max={todayKey}
              onChange={(e) => setDateValue(e.target.value)}
              className="field-input w-full h-[38px]"
            />
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-2">
              <CalendarClock className="w-3 h-3" /> Maksimal hari ini
            </p>
          </div>
        </div>

        {duplicateWarning && (
          <div className="p-2.5 rounded-lg border border-amber/40 bg-amber/10 text-[11px] text-amber leading-snug">
            Perhatian: transaksi dengan petani, jalur &amp; tanggal yang sama
            sudah ada —{" "}
            <span className="font-mono font-bold">{duplicateWarning}</span>.
            Pastikan formulir ini bukan salinan ganda.
          </div>
        )}
      </div>

      {/* ===== FORM BALE ===== */}
      <div className="bg-panel border border-border rounded-xl p-4 space-y-4 w-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
            Input Bale{" "}
            <span className="font-mono text-muted-2">
              #{savedBales.length + 1}
            </span>
          </h3>
        </div>

        {/* Field pilihan */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Jenis Tembakau */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Jenis Tembakau *
            </label>
            <select
              className="field-input w-full h-[38px]"
              value={tobaccoTypeId ?? ""}
              onChange={(e) =>
                setTobaccoTypeId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Pilih —</option>
              {tobaccoTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Daun */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Jenis Daun *
            </label>
            <select
              className="field-input w-full h-[38px]"
              value={leafTypeId ?? ""}
              onChange={(e) =>
                setLeafTypeId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Pilih —</option>
              {leafTypes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Packing */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Jenis Packing *
            </label>
            <select
              className="field-input w-full h-[38px]"
              value={packingTypeId ?? ""}
              onChange={(e) =>
                setPackingTypeId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Pilih —</option>
              {packingTypes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedPacking && (
              <p className="mt-1 text-[10px] text-muted-2">
                Potongan{" "}
                <span className="font-mono text-amber">{taraKg} kg</span>/bale
              </p>
            )}
          </div>

          {/* Customer */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Customer *
            </label>
            <select
              className="field-input w-full h-[38px]"
              value={customerId ?? ""}
              onChange={(e) =>
                setCustomerId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">— Pilih —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grade + MC + Pembulatan + Berat */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Grade */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Grade *
            </label>
            <select
              className="field-input w-full h-[38px]"
              value={gradeName ?? ""}
              onChange={(e) => setGradeName(e.target.value || null)}
              disabled={!tobaccoTypeId}
            >
              <option value="">
                {tobaccoTypeId ? "— Pilih grade —" : "Pilih jenis tembakau dulu"}
              </option>
              {gradeOptions.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            {currentPreview.price != null && (
              <p className="mt-1 font-mono text-[9.5px] text-muted-2">
                {formatCurrency(currentPreview.price)}/kg
              </p>
            )}
          </div>

          {/* MC */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Potongan MC (%) *
            </label>
            <input
              type="number"
              min={0}
              max={maxMoisturePercent}
              step={0.1}
              className="field-input w-full h-[38px] text-right"
              value={moisturePercent}
              onChange={(e) =>
                setMoisturePercent(e.target.value === "" ? 0 : Number(e.target.value))
              }
            />
          </div>

          {/* Pembulatan */}
          <div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.06em] block mb-1">
              Pembulatan
            </span>
            <div className="flex bg-panel-alt rounded-xl border border-border-soft p-0.5 h-[38px] items-center">
              {ROUNDING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRoundingMode(opt.value)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    roundingMode === opt.value
                      ? "bg-emerald text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Berat Bruto */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
              Berat Bruto (kg)
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="kosong = belum timbang"
              className="field-input w-full h-[38px] text-right"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
            />
          </div>
        </div>

        {/* Perhitungan */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-1.5">
            Perhitungan
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
              <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">
                Tara Packing
              </p>
              <p className="font-mono font-semibold text-[12.5px] text-red-deduction">
                {taraKg > 0 ? `(-${taraKg.toFixed(1)} KG)` : "\u2014"}
              </p>
            </div>
            <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
              <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">
                Setelah Packing
              </p>
              <p className="font-mono font-semibold text-[12.5px] text-foreground">
                {currentPreview.afterPacking != null
                  ? `${currentPreview.afterPacking.toFixed(1)} KG`
                  : "\u2014"}
              </p>
            </div>
            <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
              <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">
                Pot. Kadar Air ({moisturePercent.toFixed(2)}%)
              </p>
              <p className="font-mono font-semibold text-[12.5px] text-red-deduction">
                {currentPreview.mcDeduction != null
                  ? `(-${currentPreview.mcDeduction.toFixed(1)} KG)`
                  : "\u2014"}
              </p>
            </div>
            <div className="rounded-lg bg-panel-alt/50 border border-border-soft/60 px-2.5 py-2">
              <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted-2 mb-0.5">
                Harga/kg
              </p>
              <p className="font-mono font-semibold text-[12.5px] text-amber">
                {currentPreview.price != null
                  ? formatCurrency(currentPreview.price)
                  : "\u2014"}
              </p>
            </div>
          </div>
        </div>

        {/* Netto + Simpan Bale */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px] rounded-xl border border-emerald/40 bg-gradient-to-br from-emerald/14 to-emerald/[0.03] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Berat Netto
            </p>
            <p className="font-mono font-extrabold text-[26px] text-emerald my-0.5">
              {currentPreview.netto != null
                ? `${currentPreview.netto.toFixed(1)} KG`
                : "\u2014"}
            </p>
            <p className="font-mono font-bold text-[13.5px] text-amber">
              {currentPreview.subtotal != null
                ? formatCurrency(currentPreview.subtotal)
                : "\u2014"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSimpanBale}
            disabled={!canSaveBale}
            className={cn(
              "flex items-center gap-2 rounded-lg px-6 py-3 text-[13.5px] font-bold shadow transition-colors",
              canSaveBale
                ? "bg-emerald text-primary-foreground hover:bg-emerald/80 cursor-pointer"
                : "bg-panel-alt text-muted-2 border border-border cursor-not-allowed"
            )}
          >
            <Plus className="w-4 h-4" />
            Simpan Bale
          </button>
        </div>
      </div>

      {/* ===== RIWAYAT BALE ===== */}
      {savedBales.length > 0 && (
        <div className="bg-panel border border-border rounded-xl overflow-hidden w-full">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-panel-alt">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
              Riwayat Bale{" "}
              <span className="font-mono text-muted-2">
                ({savedBales.length})
              </span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-[13px]">
              <thead>
                <tr className="border-b border-border bg-panel text-left">
                  <th className="px-3 py-2.5 w-12 text-center font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">
                    #
                  </th>
                  <th className="px-3 py-2.5 min-w-[140px] font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">
                    Grade
                  </th>
                  <th className="px-3 py-2.5 min-w-[140px] font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">
                    Jenis
                  </th>
                  <th className="px-3 py-2.5 w-28 text-right font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">
                    Bruto (kg)
                  </th>
                  <th className="px-3 py-2.5 w-28 text-right font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">
                    Netto (kg)
                  </th>
                  <th className="px-3 py-2.5 w-36 text-right font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">
                    Subtotal
                  </th>
                  <th className="px-3 py-2.5 w-16 text-center font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {savedBales.map((bale, idx) => (
                  <tr
                    key={bale.key}
                    className="border-b border-border-soft last:border-b-0"
                  >
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-muted-2">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-bold text-foreground">
                        {bale.gradeName}
                      </span>
                      <span className="ml-1.5 font-mono text-[9.5px] text-muted-2">
                        {formatCurrency(bale.gradePrice)}/kg
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-muted-foreground">
                      {bale.tobaccoTypeName} · {bale.leafTypeName}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[12px]">
                      {bale.grossWeight != null ? (
                        <span className="text-foreground">
                          {bale.grossWeight.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-amber">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[12px] font-bold text-emerald">
                      {bale.netWeight != null
                        ? `${bale.netWeight.toFixed(1)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[12px] text-amber">
                      {bale.subtotal != null
                        ? formatCurrency(bale.subtotal)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeBale(bale.key)}
                          className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer"
                          title="Hapus bale"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">
                Total Netto
              </p>
              <p className="font-mono text-base font-bold text-emerald">
                {historySummary.nettoTotal.toFixed(1)} kg
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">
                Total Subtotal
              </p>
              <p className="font-mono text-base font-bold text-amber">
                {formatCurrency(historySummary.subtotalTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSimpanSemua}
              disabled={!canSaveAll}
              title={
                !selectedFarmer
                  ? "Pilih petani terlebih dahulu"
                  : !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)
                    ? "Isi tanggal formulir"
                    : undefined
              }
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-bold shadow ml-auto",
                canSaveAll
                  ? "bg-emerald text-primary-foreground hover:bg-emerald/80 cursor-pointer"
                  : "bg-panel-alt text-muted-2 border border-border cursor-not-allowed"
              )}
            >
              <Check className="w-4 h-4" />
              {submitting
                ? "Menyimpan…"
                : `Simpan Semua (${savedBales.length} bale)`}
            </button>
          </div>
        </div>
      )}

      {savedBales.length === 0 && (
        <p className="text-center text-[11px] text-muted-2 flex items-center justify-center gap-1.5">
          <ClipboardList className="w-3.5 h-3.5" /> Isi form di atas, tekan
          &quot;Simpan Bale&quot;, bale akan muncul di riwayat.
        </p>
      )}

      {/* ===== DIALOG HASIL ===== */}
      <Dialog
        open={result != null}
        onOpenChange={(open) => !open && setResult(null)}
      >
        <DialogContent className="max-w-lg">
          {result && (
            <>
              <DialogTitle>
                Transaksi {result.transactionCode} Tersimpan
              </DialogTitle>
              <DialogDescription>
                <span className="block">
                  {result.farmerName} · {result.warehouseCode}-{shortLane} ·
                  tanggal kertas {result.transactionDate}
                </span>
                <span className="mt-1 block">
                  <span className="text-emerald font-semibold">
                    {result.weighedCount} bale langsung WEIGHED
                  </span>
                  {" · "}
                  <span className="text-amber font-semibold">
                    {result.gradedCount} bale GRADED (ke Pos 2)
                  </span>
                  {" · total netto "}
                  <span className="font-mono">
                    {result.totalNetWeight.toFixed(1)} kg
                  </span>
                </span>
              </DialogDescription>

              {result.sessionEnded ? (
                <div className="p-2.5 rounded-lg border border-emerald/40 bg-emerald/10 text-[11px] text-emerald font-semibold leading-snug flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Semua bale ditimbang — sesi otomatis diakhiri, transaksi
                  berstatus <StatusPill status="WEIGHED" />
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-amber/40 bg-amber/10 text-[11px] text-amber leading-snug">
                  Transaksi masih <strong>DRAFT</strong> —{" "}
                  {result.gradedCount} bale belum memiliki berat dan harus
                  melewati penimbangan scan di Pos 2 sebelum sesi bisa
                  ditutup.
                </div>
              )}

              <div className="max-h-[260px] overflow-y-auto rounded-lg border border-border-soft">
                <table className="w-full text-[12px]">
                  <tbody>
                    {result.labels.map((label, i) => (
                      <tr
                        key={label.labelCode}
                        className="border-b border-border-soft last:border-b-0"
                      >
                        <td className="px-3 py-2 font-mono text-muted-2 w-8">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-foreground">
                          {label.labelCode}
                        </td>
                        <td className="px-3 py-2 font-mono text-amber">
                          {label.grade}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-emerald">
                          {label.netWeight != null
                            ? `${label.netWeight.toFixed(1)} kg`
                            : "\u2014"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <StatusPill
                            status={label.status as "GRADED" | "WEIGHED"}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <PrinterManager
                  connected={printer.connected}
                  deviceName={printer.deviceName}
                  error={printer.error}
                  onConnect={() => printer.connect()}
                  onDisconnect={() => printer.disconnect()}
                />
                <div className="flex items-center gap-2 ml-auto">
                  {printing && (
                    <span className="font-mono text-[11px] text-muted-2">
                      {printedCount}/{result.labels.length}
                    </span>
                  )}
                  {printer.connected && (
                    <button
                      type="button"
                      onClick={printAllLabels}
                      disabled={printing}
                      className="flex items-center gap-2 rounded-lg bg-emerald px-4 py-2.5 text-[12.5px] font-bold text-primary-foreground hover:bg-emerald/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Printer className="w-4 h-4" />
                      {printing
                        ? "Mencetak…"
                        : `Cetak Semua (${result.labels.length})`}
                    </button>
                  )}
                  {!printer.connected && (
                    <button
                      type="button"
                      onClick={handleStickerPrint}
                      className="flex items-center gap-2 rounded-lg bg-panel-alt px-4 py-2.5 text-[12.5px] font-bold text-foreground border border-border-soft hover:border-emerald/40 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      Cetak via Browser ({result.labels.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="rounded-lg border border-border-soft bg-panel-alt px-4 py-2.5 text-[12.5px] font-bold text-foreground hover:border-border cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
              {result.gradedCount > 0 && (
                <p className="text-[10.5px] text-muted-2 leading-snug">
                  Bale berstatus GRADED tetap harus melewati penimbangan scan
                  di Pos 2 sebelum transaksi bisa ditutup.
                </p>
              )}
              <div className="hidden" aria-hidden="true">
                <StickerBatchPrint
                  ref={stickerPrintRef}
                  items={result.labels.map((l) => ({
                    labelCode: l.labelCode,
                    grade: l.grade,
                    farmerName: result.farmerName,
                  }))}
                  warehouse={warehouse}
                  lane={shortLane}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
