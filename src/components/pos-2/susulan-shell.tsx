"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  CalendarClock,
  Check,
  ClipboardList,
  Copy,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { PageHeader } from "@/components/shared/page-header"
import { StatusPill } from "@/components/shared/status-pill"
import { PrinterManager } from "@/components/shared/printer-manager"
import { useThermalPrinter } from "@/hooks/useThermalPrinter"
import { checkSusulanDuplicate, saveSusulanBatch, type SusulanBatchResult } from "@/lib/actions/susulan"
import {
  calculateWeightAfterPacking,
  calculateMoistureDeduction,
  calculateNetWeight,
  calculateSubtotal,
  roundMoney,
} from "@/lib/calculations"
import { laneToken } from "@/lib/barcode"
import { cn, toDateKey } from "@/lib/utils"

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

interface RowState {
  key: number
  gradeName: string | null
  grossWeight: number | null
}

const ROUNDING_STEPS = [
  { value: 0, label: "Tanpa pembulatan" },
  { value: 0.1, label: "Kelipatan 0,1 kg" },
  { value: 0.5, label: "Kelipatan 0,5 kg" },
  { value: 1, label: "Kelipatan 1 kg" },
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

  function makeRow(): RowState {
    keyRef.current += 1
    return { key: keyRef.current, gradeName: null, grossWeight: null }
  }

  // ——— Pengaturan formulir (sekali untuk semua baris) ———
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerOption | null>(null)
  const [dateValue, setDateValue] = useState("")
  const [tobaccoTypeId, setTobaccoTypeId] = useState<number | null>(null)
  const [leafTypeId, setLeafTypeId] = useState<number | null>(null)
  const [packingTypeId, setPackingTypeId] = useState<number | null>(null)
  const [moisturePercent, setMoisturePercent] = useState(defaultMoisturePercent)
  const [roundingStep, setRoundingStep] = useState(0)
  const [customerId, setCustomerId] = useState<number | null>(customers[0]?.id ?? null)

  // ——— Baris bale ———
  const [rows, setRows] = useState<RowState[]>([{ key: 1, gradeName: null, grossWeight: null }])

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SusulanBatchResult | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printedCount, setPrintedCount] = useState(0)

  const printer = useThermalPrinter()

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
          (f) => f.name.toLowerCase().includes(q) || (f.nik ?? "").toLowerCase().includes(q)
        )
      : farmers
    return base.slice(0, 8)
  }, [farmers, searchQuery])

  const gradeOptions = useMemo(
    () => tobaccoTypes.find((t) => t.id === tobaccoTypeId)?.grades ?? [],
    [tobaccoTypes, tobaccoTypeId]
  )
  const selectedPacking = packingTypes.find((p) => p.id === packingTypeId) ?? null
  const taraKg = selectedPacking?.deductionWeight ?? 0

  interface RowPreview {
    netto: number | null
    subtotal: number | null
    price: number | null
    invalid: boolean
  }

  const previews = useMemo<RowPreview[]>(() => {
    return rows.map((row) => {
      if (row.grossWeight == null) return { netto: null, subtotal: null, price: null, invalid: false }
      const price = gradeOptions.find((g) => g.name === row.gradeName)?.defaultPrice ?? null
      const afterPacking = calculateWeightAfterPacking(row.grossWeight, taraKg)
      const invalid = afterPacking < 0
      if (invalid || price == null) return { netto: null, subtotal: null, price, invalid }
      const mcDeduction = calculateMoistureDeduction(afterPacking, moisturePercent)
      const nettoRaw = calculateNetWeight(afterPacking, mcDeduction)
      const netto = roundingStep > 0 ? Math.round(nettoRaw / roundingStep) * roundingStep : nettoRaw
      const nettoRounded = roundMoney(netto)
      return { netto: nettoRounded, subtotal: roundMoney(calculateSubtotal(nettoRounded, price)), price, invalid: false }
    })
  }, [rows, gradeOptions, taraKg, moisturePercent, roundingStep])

  const summary = useMemo(() => {
    let weighed = 0
    let graded = 0
    let nettoTotal = 0
    rows.forEach((row, idx) => {
      if (!row.gradeName) return
      if (row.grossWeight != null && !previews[idx].invalid) {
        weighed += 1
        nettoTotal += previews[idx].netto ?? 0
      } else {
        graded += 1
      }
    })
    return { weighed, graded, nettoTotal: roundMoney(nettoTotal) }
  }, [rows, previews])

  function updateRow(key: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()])
  }

  function duplicateRow(key: number) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key)
      if (idx < 0) return prev
      keyRef.current += 1
      const copy = { ...prev[idx], key: keyRef.current }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
  }

  function removeRow(key: number) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)))
  }

  function validate(): string | null {
    if (!selectedFarmer) return "Pilih petani terlebih dahulu"
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return "Isi tanggal transaksi dari formulir kertas"
    if (dateValue > todayKey) return "Tanggal tidak boleh di masa depan"
    if (!tobaccoTypeId) return "Pilih jenis tembakau di pengaturan atas"
    if (!leafTypeId) return "Pilih jenis daun di pengaturan atas"
    if (!packingTypeId) return "Pilih jenis packing di pengaturan atas"
    if (!customerId) return "Pilih alokasi customer di pengaturan atas"
    if (moisturePercent < 0 || moisturePercent > maxMoisturePercent)
      return `MC harus antara 0–${maxMoisturePercent}%`
    if (rows.length === 0) return "Minimal satu baris bale"
    for (const [idx, row] of rows.entries()) {
      if (!row.gradeName) return `Baris ${idx + 1}: pilih grade`
      if (row.grossWeight != null && previews[idx].invalid)
        return `Baris ${idx + 1}: bruto lebih kecil dari potongan packing (${taraKg} kg)`
    }
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }
    setSubmitting(true)
    try {
      const saved = await saveSusulanBatch({
        farmerId: selectedFarmer!.id,
        laneCode,
        transactionDate: dateValue,
        bales: rows.map((row) => ({
          tobaccoTypeId: tobaccoTypeId!,
          leafTypeId: leafTypeId!,
          packingTypeId: packingTypeId!,
          grade: row.gradeName!,
          moisturePercent,
          packingWeight: taraKg,
          customerId: customerId!,
          grossWeight: row.grossWeight,
        })),
      })
      setResult(saved)
      setSelectedFarmer(null)
      setSearchQuery("")
      setDateValue("")
      setDuplicateWarning(null)
      setRows([makeRow()])
      toast.success(`Transaksi ${saved.transactionCode} tersimpan (${saved.labels.length} bale)`)
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
      toast.error(`Cetak berhenti pada label ke-${done + 1}: ${(e as Error).message}`)
    } finally {
      setPrinting(false)
    }
  }

  const settingsComplete =
    !!selectedFarmer && /^\d{4}-\d{2}-\d{2}$/.test(dateValue) && dateValue <= todayKey && !!tobaccoTypeId && !!leafTypeId && !!packingTypeId && !!customerId
  const canSave = settingsComplete && rows.length > 0 && !submitting

  return (
    <div className="flex flex-col gap-5 w-full">
      <PageHeader
        icon={ClipboardList}
        title="Pos 2 · Input Susulan"
        subtitle={`Salin satu formulir kertas sekaligus — grading + timbang dalam satu halaman · Jalur ${laneCode}`}
      />

      {/* Pengaturan formulir — sekali untuk semua baris */}
      <div className="bg-panel border border-border rounded-xl p-4 space-y-4 w-full">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald" />
          <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Pengaturan Formulir Kertas</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* Petani */}
          <div className="col-span-2">
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Petani *</label>
            {selectedFarmer ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-panel-alt border border-emerald/30 rounded-lg h-[38px]">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-foreground truncate block">{selectedFarmer.name}</span>
                  <span className="font-mono text-[10px] text-muted-2 block leading-none">{selectedFarmer.nik ?? "NIK —"}</span>
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
                        <span className="text-xs font-bold text-foreground">{f.name}</span>
                        <span className="ml-2 font-mono text-[10px] text-muted-2">{f.nik ?? "—"}</span>
                      </button>
                    ))}
                    {filteredFarmers.length === 0 && (
                      <p className="text-center text-[11px] text-muted-2 py-2">Petani tidak ditemukan</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Tanggal Formulir *</label>
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

          {/* Jenis Tembakau */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Jenis Tembakau *</label>
            <select
              className="field-input w-full h-[38px]"
              value={tobaccoTypeId ?? ""}
              onChange={(e) => setTobaccoTypeId(e.target.value ? Number(e.target.value) : null)}
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
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Jenis Daun *</label>
            <select
              className="field-input w-full h-[38px]"
              value={leafTypeId ?? ""}
              onChange={(e) => setLeafTypeId(e.target.value ? Number(e.target.value) : null)}
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
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Jenis Packing *</label>
            <select
              className="field-input w-full h-[38px]"
              value={packingTypeId ?? ""}
              onChange={(e) => setPackingTypeId(e.target.value ? Number(e.target.value) : null)}
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
                Potongan otomatis <span className="font-mono text-amber">{taraKg} kg</span>/bale
              </p>
            )}
          </div>

          {/* MC */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Potongan MC (%) *</label>
            <input
              type="number"
              min={0}
              max={maxMoisturePercent}
              step={0.1}
              className="field-input w-full h-[38px] text-right"
              value={moisturePercent}
              onChange={(e) => setMoisturePercent(e.target.value === "" ? 0 : Number(e.target.value))}
            />
          </div>

          {/* Pembulatan */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">Pembulatan Netto</label>
            <select
              className="field-input w-full h-[38px]"
              value={roundingStep}
              onChange={(e) => setRoundingStep(Number(e.target.value))}
            >
              {ROUNDING_STEPS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1 flex items-center gap-1">
              <UserRound className="w-3 h-3" /> Customer *
            </label>
            <select
              className="field-input w-full h-[38px]"
              value={customerId ?? ""}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
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

        {duplicateWarning && (
          <div className="p-2.5 rounded-lg border border-amber/40 bg-amber/10 text-[11px] text-amber leading-snug">
            Perhatian: transaksi dengan petani, jalur &amp; tanggal yang sama sudah ada —{" "}
            <span className="font-mono font-bold">{duplicateWarning}</span>. Pastikan formulir ini bukan salinan ganda.
          </div>
        )}
      </div>

      {/* Tabel bale — hanya grade + bruto */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden w-full">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-panel-alt">
          <h3 className="font-bold text-xs uppercase tracking-wider text-foreground">
            Bale <span className="font-mono text-muted-2">({rows.length})</span> — isi Grade &amp; Bruto saja
          </h3>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald text-primary-foreground text-[11px] font-bold cursor-pointer hover:bg-emerald/80"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Baris
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left">
                <th className="px-3 py-2.5 w-12 text-center font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">#</th>
                <th className="px-3 py-2.5 min-w-[220px] font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">Grade</th>
                <th className="px-3 py-2.5 w-48 text-right font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">Bruto (kg)</th>
                <th className="px-3 py-2.5 w-56 text-right font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">Netto / Nilai</th>
                <th className="px-3 py-2.5 w-20 text-center font-sans text-[10px] uppercase tracking-wider font-bold text-muted-2">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const preview = previews[idx]
                return (
                  <tr key={row.key} className="border-b border-border-soft last:border-b-0">
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-muted-2">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <select
                        className="field-input w-full"
                        value={row.gradeName ?? ""}
                        onChange={(e) => updateRow(row.key, { gradeName: e.target.value || null })}
                        disabled={!tobaccoTypeId}
                      >
                        <option value="">{tobaccoTypeId ? "— Pilih grade —" : "Pilih jenis tembakau dulu"}</option>
                        {gradeOptions.map((g) => (
                          <option key={g.id} value={g.name}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      {preview.price != null && (
                        <span className="mt-0.5 block font-mono text-[9.5px] text-muted-2">
                          Rp {preview.price.toLocaleString("id-ID")}/kg
                          {roundingStep > 0 && ` · pembulatan ${roundingStep} kg`}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="kosong = belum timbang"
                        className="field-input w-full text-right"
                        value={row.grossWeight ?? ""}
                        onChange={(e) =>
                          updateRow(row.key, { grossWeight: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[12px]">
                      {preview.invalid ? (
                        <span className="text-red-deduction font-bold">bruto &lt; {taraKg} kg</span>
                      ) : preview.netto != null ? (
                        <>
                          <span className="font-bold text-emerald">{preview.netto.toFixed(1)} kg</span>
                          <span className="block text-[9.5px] text-muted-2">
                            Rp {(preview.subtotal ?? 0).toLocaleString("id-ID")}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-2">— Pos 2 —</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateRow(row.key)}
                          className="p-1.5 text-blue hover:bg-blue/10 rounded-lg cursor-pointer"
                          title="Duplikat baris"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRow(row.key)}
                          disabled={rows.length <= 1}
                          className="p-1.5 text-red-deduction hover:bg-red-deduction/10 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Langsung WEIGHED</p>
            <p className="font-mono text-base font-bold text-emerald">{summary.weighed}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Ke Pos 2 (GRADED)</p>
            <p className="font-mono text-base font-bold text-amber">{summary.graded}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] uppercase tracking-[0.1em] font-bold text-muted-2">Total Netto Preview</p>
            <p className="font-mono text-base font-bold text-emerald">{summary.nettoTotal.toFixed(1)} kg</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            title={!settingsComplete ? "Lengkapi pengaturan formulir di atas" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-bold shadow",
              canSave
                ? "bg-emerald text-primary-foreground hover:bg-emerald/80 cursor-pointer"
                : "bg-panel-alt text-muted-2 border border-border cursor-not-allowed"
            )}
          >
            <Check className="w-4 h-4" />
            {submitting ? "Menyimpan…" : `Simpan Semua (${rows.length} bale)`}
          </button>
        </div>
      </div>

      {!selectedFarmer && (
        <p className="text-center text-[11px] text-muted-2 flex items-center justify-center gap-1.5">
          <UserRound className="w-3.5 h-3.5" /> Pilih petani dan lengkapi pengaturan di atas, lalu salin baris formulir kertas.
        </p>
      )}

      {/* Dialog hasil simpan + cetak batch */}
      <Dialog open={result != null} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent className="max-w-lg">
          {result && (
            <>
              <DialogTitle>Transaksi {result.transactionCode} Tersimpan</DialogTitle>
              <DialogDescription>
                <span className="block">
                  {result.farmerName} · {result.warehouseCode}-{shortLane} · tanggal kertas {result.transactionDate}
                </span>
                <span className="mt-1 block">
                  <span className="text-emerald font-semibold">{result.weighedCount} bale langsung WEIGHED</span>
                  {" · "}
                  <span className="text-amber font-semibold">{result.gradedCount} bale GRADED (ke Pos 2)</span>
                  {" · total netto "}
                  <span className="font-mono">{result.totalNetWeight.toFixed(1)} kg</span>
                </span>
              </DialogDescription>

              <div className="max-h-[260px] overflow-y-auto rounded-lg border border-border-soft">
                <table className="w-full text-[12px]">
                  <tbody>
                    {result.labels.map((label, i) => (
                      <tr key={label.labelCode} className="border-b border-border-soft last:border-b-0">
                        <td className="px-3 py-2 font-mono text-muted-2 w-8">{i + 1}</td>
                        <td className="px-3 py-2 font-mono font-bold text-foreground">{label.labelCode}</td>
                        <td className="px-3 py-2 font-mono text-amber">{label.grade}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald">
                          {label.netWeight != null ? `${label.netWeight.toFixed(1)} kg` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <StatusPill status={label.status as "GRADED" | "WEIGHED"} />
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
                  <button
                    type="button"
                    onClick={printAllLabels}
                    disabled={!printer.connected || printing}
                    className="flex items-center gap-2 rounded-lg bg-emerald px-4 py-2.5 text-[12.5px] font-bold text-primary-foreground hover:bg-emerald/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="w-4 h-4" />
                    {printing ? "Mencetak…" : `Cetak Semua (${result.labels.length})`}
                  </button>
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
                  Bale berstatus GRADED tetap harus melewati penimbangan scan di Pos 2 sebelum transaksi bisa ditutup.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
