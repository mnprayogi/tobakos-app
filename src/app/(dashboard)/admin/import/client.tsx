"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { FileUp, FileSpreadsheet, Loader2, ChevronDown, ShieldAlert, CheckCircle2, TriangleAlert } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"
import { formatCurrency } from "@/lib/utils"
import { parseRiwayatUpload, importRiwayatTransactions, getImportMasterOptions, type ImportResult, type ImportChunkResult, type ImportMasterOptions, type ImportOverrides } from "@/lib/actions/import"
import type { RiwayatPreview, RiwayatTransaction } from "@/lib/import/riwayat"
import type { ImportProgress } from "@/lib/import/progress"

type Step = "idle" | "preview" | "done"

const MAX_POLL_MS = 900_000
const FROZEN_MS = 30_000

export function ImportRiwayatClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>("idle")
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<RiwayatPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const jobIdRef = useRef<string | null>(null)
  const pollStartRef = useRef(0)
  const notFoundRef = useRef(0)
  const lastSeenUpdatedRef = useRef(0)
  const lastMovementAtRef = useRef(0)
  const progressRef = useRef<ImportProgress | null>(null)
  const [stall, setStall] = useState<null | "frozen" | "lost">(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [options, setOptions] = useState<ImportMasterOptions | null>(null)
  const [optionsError, setOptionsError] = useState(false)
  const [overrides, setOverrides] = useState<ImportOverrides>({})
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "relabel">("skip")

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const overselected = Object.values(overrides).some((v) => v != null)

  useEffect(() => {
    if (step !== "preview") return
    let active = true
    getImportMasterOptions()
      .then((data) => {
        if (active) setOptions(data)
      })
      .catch(() => {
        if (active) setOptionsError(true)
      })
    return () => {
      active = false
    }
  }, [step])

  const optionsLoading = step === "preview" && options === null && !optionsError

  async function handleFile(file: File) {
    setParsing(true)
    setResult(null)
    setStall(null)
    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file maksimal 5MB")
      }
      const form = new FormData()
      form.append("file", file)
      const parsed = await parseRiwayatUpload(form)
      jobIdRef.current = parsed.jobId
      setPreview(parsed.preview)
      setFileName(file.name)
      setStep("preview")
      toast.success("File berhasil dibaca")
    } catch (err) {
      toast.error((err as Error).message)
      setStep("idle")
      setPreview(null)
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!preview) return
    const jobId = jobIdRef.current
    if (!jobId) {
      toast.error("Silakan baca ulang file terlebih dahulu.")
      return
    }
    setResult(null)
    setProgress(null)
    setStall(null)
    setImporting(true)
    progressRef.current = null
    notFoundRef.current = 0
    lastSeenUpdatedRef.current = 0
    lastMovementAtRef.current = Date.now()
    pollStartRef.current = Date.now()

    const jobIdForPoll = jobId
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/import/progress?job=${jobIdForPoll}`)
        if (res.status === 404) {
          // job belum dibuat / sudah dihapus — beberapa kali berturut berarti respons action hilang
          notFoundRef.current += 1
          if (notFoundRef.current >= 3) {
            stopPolling()
            setStall("lost")
            setImporting(false)
          }
          return
        }
        if (!res.ok) return
        const data = (await res.json()) as { job?: ImportProgress }
        if (!data.job) return
        notFoundRef.current = 0
        const job = data.job
        if (job.updatedAt !== lastSeenUpdatedRef.current) {
          lastSeenUpdatedRef.current = job.updatedAt
          lastMovementAtRef.current = Date.now()
        }
        progressRef.current = job
        setProgress(job)
        if (job.phase === "done" || job.phase === "error") {
          stopPolling()
          return
        }
      } catch {
        // jaringan/deviasi transien — polling berikutnya akan mencoba lagi
      }

      if (Date.now() - pollStartRef.current > MAX_POLL_MS) {
        stopPolling()
        setStall("lost")
        setImporting(false)
        return
      }

      const last = progressRef.current
      if (last && Date.now() - lastMovementAtRef.current > FROZEN_MS) {
        setStall("frozen")
      } else {
        setStall(null)
      }
    }, 600)

    try {
      const overridesArg = { ...overrides, duplicateMode }
      const acc: ImportResult = {
        importedTransactions: 0,
        skippedTransactions: 0,
        importedBales: 0,
        generatedLabels: 0,
        payments: 0,
        cashOutflow: 0,
        totalPrice: 0,
        fileName: "",
      }
      let chunk: ImportChunkResult
      do {
        chunk = await importRiwayatTransactions(jobId, overridesArg)
        acc.importedTransactions += chunk.importedTransactions
        acc.skippedTransactions += chunk.skippedTransactions
        acc.importedBales += chunk.importedBales
        acc.generatedLabels += chunk.generatedLabels
        acc.payments += chunk.payments
        acc.cashOutflow += chunk.cashOutflow
        acc.totalPrice += chunk.totalPrice
        acc.fileName = chunk.fileName || acc.fileName
      } while (!chunk.done)
      stopPolling()
      setStall(null)
      setResult(acc)
      setStep("done")
      toast.success(`${acc.importedTransactions} transaksi diimpor`)
    } catch (err) {
      stopPolling()
      setStall(null)
      toast.error((err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  function checkStatus() {
    if (!jobIdRef.current) return
    fetch(`/api/import/progress?job=${jobIdRef.current}`)
      .then(async (res) => {
        if (res.ok) {
          const data = (await res.json()) as { job?: ImportProgress }
          if (data.job) {
            progressRef.current = data.job
            setProgress(data.job)
            if (data.job.phase === "done" || data.job.phase === "error") setStall(null)
          }
        }
      })
      .catch(() => {})
  }

  function reset() {
    stopPolling()
    jobIdRef.current = null
    progressRef.current = null
    notFoundRef.current = 0
    lastSeenUpdatedRef.current = 0
    lastMovementAtRef.current = 0
    setStall(null)
    setStep("idle")
    setPreview(null)
    setResult(null)
    setProgress(null)
    setOptions(null)
    setOptionsError(false)
    setOverrides({})
    setDuplicateMode("skip")
    setFileName(null)
    setExpanded(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const toggleExpand = (code: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileUp}
        title="Import Riwayat Transaksi"
        subtitle="Impor data historis transaksi pembelian dari file Excel (.xlsx) sebagai transaksi lunas (PAID)."
      />

      {step === "idle" && (
        <div className="rounded-xl border border-dashed border-border bg-panel-alt/40 px-5 py-10 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald/15 border border-emerald/30 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6 text-emerald" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-foreground">Pilih file Excel</p>
            <p className="text-[11.5px] text-muted-2 mt-1 max-w-md">
              Format kolom: Kode Stok, Grade, Bruto, Netto, Harga, Apel/Netto, Subtotal, Tanggal, Kode Transaksi, Nama Petani, Kode Petani. Gudang &amp; jalur tiap transaksi otomatis diambil dari Kode Stok (format <span className="font-mono">K31/L1/...</span> atau <span className="font-mono">GDG01-J1-20240101-0001</span>) — satu file boleh campur beberapa gudang. Semua transaksi akan diimpor dalam status <strong>PAID / Lunas</strong> dengan satu pembayaran tunai (kas keluar) per transaksi.
            </p>
          </div>
          {parsing ? (
            <button disabled className="rounded-lg bg-emerald px-4 py-2.5 font-bold text-[13px] text-primary-foreground inline-flex items-center gap-2 disabled:opacity-60 cursor-not-allowed">
              <Loader2 className="w-4 h-4 animate-spin" /> Membaca file…
            </button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-emerald px-4 py-2.5 font-bold text-[13px] text-primary-foreground cursor-pointer hover:opacity-90 inline-flex items-center gap-2"
              >
                <FileUp className="w-4 h-4" /> Pilih File…
              </button>
            </>
          )}
          <p className="text-[11px] text-muted-2">
            Impor bersifat idempoten — transaksi dengan Kode Transaksi yang sudah ada tidak akan diimpor ulang.
          </p>
        </div>
      )}

      {step === "preview" && preview && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald shrink-0" />
              <div className="min-w-0">
                <p className="font-mono text-[13px] font-bold text-foreground truncate">{fileName}</p>
                <p className="text-[11px] text-muted-2">Pratinjau hasil pembacaan</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={importing}
                className="rounded-lg bg-panel border border-border-soft px-3 py-2 font-bold text-[12px] text-foreground cursor-pointer hover:border-emerald/60 disabled:opacity-50"
              >
                Ganti File
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || preview.transactions.length === 0}
                className="rounded-lg bg-emerald px-4 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                {importing ? "Mengimpor…" : `Impor ${preview.transactions.length} Transaksi`}
              </button>
            </div>
          </div>

          {importing && progress && (
            <ImportProgressPanel progress={progress} />
          )}

          {importing && stall === "frozen" && (
            <div className="rounded-xl border border-amber/25 bg-amber/8 px-3.5 py-3 flex flex-wrap items-center gap-2">
              <p className="flex-1 min-w-[220px] text-[12px] text-amber font-bold flex items-center gap-1.5">
                <TriangleAlert className="w-4 h-4 shrink-0" />
                Progres impor tidak memperbarui beberapa saat ini — server mungkin sedang sibuk.
              </p>
              <button
                type="button"
                onClick={checkStatus}
                className="rounded-lg bg-panel border border-border-soft px-3 py-1.5 font-bold text-[11px] text-foreground cursor-pointer hover:border-emerald/60"
              >
                Periksa status
              </button>
              <button
                type="button"
                onClick={() => location.reload()}
                className="rounded-lg bg-panel border border-border-soft px-3 py-1.5 font-bold text-[11px] text-foreground cursor-pointer hover:border-emerald/60"
              >
                Muat ulang halaman
              </button>
            </div>
          )}

          {stall === "lost" && (
            <div className="rounded-xl border border-amber/25 bg-amber/8 px-3.5 py-3 flex flex-wrap items-center gap-2">
              <p className="flex-1 min-w-[220px] text-[12px] text-foreground/80">
                <ShieldAlert className="w-4 h-4 inline mr-1 -mt-0.5 text-amber" />
                Impor mungkin telah selesai di server, tetapi respons tidak kembali. Muat ulang halaman untuk melihat data; impor ulang akan melewati baris yang sudah ada.
              </p>
              <button
                type="button"
                onClick={() => location.reload()}
                className="rounded-lg bg-panel border border-border-soft px-3 py-1.5 font-bold text-[11px] text-foreground cursor-pointer hover:border-emerald/60"
              >
                Muat ulang halaman
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-lg bg-panel border border-border-soft px-3 py-1.5 font-bold text-[11px] text-foreground cursor-pointer hover:border-emerald/60"
              >
                Kembali ke awal
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {[
              { label: "Transaksi", value: preview.transactions.length.toLocaleString("id-ID"), accent: "text-foreground" },
              { label: "Bal", value: preview.totalBales.toLocaleString("id-ID"), accent: "text-foreground" },
              { label: "Petani", value: preview.farmers.length.toLocaleString("id-ID"), accent: "text-foreground" },
              { label: "Gudang", value: preview.warehouseCodes.length.toLocaleString("id-ID"), accent: "text-foreground" },
              { label: "Bruto", value: `${preview.totalGrossWeight.toLocaleString("id-ID")} kg`, accent: "text-foreground" },
              { label: "Netto", value: `${preview.totalNetWeight.toLocaleString("id-ID")} kg`, accent: "text-foreground" },
              { label: "Total (kelipatan 100)", value: formatCurrency(preview.totalPrice), accent: "text-emerald" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card px-3.5 py-3">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-2">{s.label}</p>
                <p className={`font-mono text-[15px] font-bold mt-1 ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded-xl border border-amber/25 bg-amber/8 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-amber">
                <TriangleAlert className="w-3.5 h-3.5" /> Perhatian
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="text-[11.5px] text-foreground/70 leading-relaxed">• {w}</li>
                ))}
              </ul>
            </div>
          )}

          {preview.duplicateLabels.length > 0 && (
            <div className="rounded-xl border border-amber/25 bg-amber/8 px-3.5 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-bold text-amber">
                <TriangleAlert className="w-3.5 h-3.5" /> {preview.duplicateLabels.length} Kode Stok duplikat
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {preview.duplicateLabels.map((d) => (
                  <li key={d.label} className="text-[11.5px] text-foreground/70 leading-relaxed">
                    • <span className="font-mono">{d.label}</span> × {d.count} — transaksi: {d.transactions.join(", ")}
                  </li>
                ))}
              </ul>
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-2">Perlakuan</span>
                <div className="inline-flex rounded-lg border border-border-soft overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDuplicateMode("skip")}
                    disabled={importing}
                    className={`px-3 py-1.5 text-[11px] font-bold cursor-pointer disabled:opacity-50 ${
                      duplicateMode === "skip"
                        ? "bg-amber/15 text-amber"
                        : "bg-panel text-muted-2 hover:text-foreground"
                    }`}
                  >
                    Lewati transaksi
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateMode("relabel")}
                    disabled={importing}
                    className={`px-3 py-1.5 text-[11px] font-bold cursor-pointer disabled:opacity-50 ${
                      duplicateMode === "relabel"
                        ? "bg-emerald/15 text-emerald"
                        : "bg-panel text-muted-2 hover:text-foreground"
                    }`}
                  >
                    Buat label baru
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-muted-2">
                {duplicateMode === "skip"
                  ? "Transaksi yang memuat Kode Stok duplikat tidak akan diimpor dan tercatat di laporan sebagai dilewati."
                  : "Bal duplikat tetap diimpor dengan Kode Stok baru bersuffix (-2, -3, …), mis. K12/LA/KST26/8236-2."}
              </p>
            </div>
          )}

          {(() => {
            const selectedWarehouseCode = overrides.warehouseId
              ? (options?.warehouses.find((w) => w.id === overrides.warehouseId)?.code ?? preview.warehouseCode)
              : preview.warehouseCode
            const laneOptionsRaw =
              overrides.warehouseId != null && options
                ? options.lanes.filter((l) => l.warehouseId === overrides.warehouseId)
                : options?.lanes ?? []
            const laneLabel = (l: { id: number; code: string; name: string; warehouseId: number }) => {
              const code = options?.warehouses.find((w) => w.id === l.warehouseId)?.code
              return code ? `${l.code} — ${code}` : l.code
            }
            const setOverride = (key: Exclude<keyof ImportOverrides, "duplicateMode">, value: number | null) => {
              setOverrides((prev) => {
                const next: ImportOverrides = { ...prev }
                if (value == null) delete next[key]
                else next[key] = value
                return next
              })
            }
            const selectClass =
              "w-full mt-1.5 bg-panel border border-border-soft rounded-lg px-2 py-1.5 text-[12px] font-mono text-foreground outline-none focus:border-emerald/60 cursor-pointer disabled:opacity-60"

            const rows: {
              label: string
              value: string
              overridden: boolean
              disabled?: boolean
              onChange: (v: string) => void
              optionList: { label: string; value: string }[]
            }[] = [
              {
                label: "Gudang",
                value: overrides.warehouseId?.toString() ?? "",
                overridden: overrides.warehouseId != null,
                onChange: (v) => {
                  setOverride("warehouseId", v ? Number(v) : null)
                  setOverrides((prev) => {
                    const next: ImportOverrides = { ...prev }
                    delete next.laneId
                    return next
                  })
                },
                optionList: [
                  {
                    label:
                      preview.warehouseCodes.length > 1
                        ? `Otomatis mengikuti Kode Stok (${preview.warehouseCodes.length} gudang)`
                        : `Buat/pakai otomatis — ${preview.warehouseCode}`,
                    value: "",
                  },
                  ...(options?.warehouses.map((w) => ({ label: `${w.code} — ${w.name}`, value: String(w.id) })) ?? []),
                ],
              },
              {
                label: "Jalur",
                value: overrides.laneId?.toString() ?? "",
                overridden: overrides.laneId != null,
                onChange: (v) => setOverride("laneId", v ? Number(v) : null),
                optionList: [
                  {
                    label:
                      preview.warehouseCodes.length > 1
                        ? "Otomatis mengikuti Kode Stok per transaksi"
                        : `Buat/pakai otomatis — ${selectedWarehouseCode}-${preview.laneCode}`,
                    value: "",
                  },
                  ...laneOptionsRaw.map((l) => ({ label: laneLabel(l), value: String(l.id) })),
                ],
              },
              {
                label: "Customer",
                value: overrides.customerId?.toString() ?? "",
                overridden: overrides.customerId != null,
                onChange: (v) => setOverride("customerId", v ? Number(v) : null),
                optionList: [
                  { label: "Buat/pakai otomatis — Gudang Sendiri", value: "" },
                  ...(options?.customers.map((c) => ({ label: c.name, value: String(c.id) })) ?? []),
                ],
              },
              {
                label: "Jenis Tembakau",
                value: overrides.tobaccoTypeId?.toString() ?? "",
                overridden: overrides.tobaccoTypeId != null,
                onChange: (v) => setOverride("tobaccoTypeId", v ? Number(v) : null),
                optionList: [
                  { label: "Buat/pakai otomatis — Virginia FC", value: "" },
                  ...(options?.tobaccoTypes.map((t) => ({ label: t.name, value: String(t.id) })) ?? []),
                ],
              },
              {
                label: "Jenis Daun",
                value: overrides.leafTypeId?.toString() ?? "",
                overridden: overrides.leafTypeId != null,
                onChange: (v) => setOverride("leafTypeId", v ? Number(v) : null),
                optionList: [
                  { label: "Buat/pakai otomatis — Lamina", value: "" },
                  ...(options?.leafTypes.map((t) => ({ label: t.name, value: String(t.id) })) ?? []),
                ],
              },
              {
                label: "Jenis Packing",
                value: overrides.packingTypeId?.toString() ?? "",
                overridden: overrides.packingTypeId != null,
                onChange: (v) => setOverride("packingTypeId", v ? Number(v) : null),
                optionList: [
                  { label: "Buat/pakai otomatis — Keranjang Bambu", value: "" },
                  ...(options?.packingTypes.map((p) => ({ label: p.name, value: String(p.id) })) ?? []),
                ],
              },
            ]

            return (
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2">
                    Master Data yang akan Dibuat / Dipakai
                  </p>
                  {overselected && (
                    <span className="text-[10.5px] font-bold text-emerald rounded-md bg-emerald/10 border border-emerald/30 px-1.5 py-0.5">
                      {Object.values(overrides).filter((v) => v != null).length} diubah
                    </span>
                  )}
                </div>

                {optionsLoading ? (
                  <p className="text-[11.5px] text-muted-2 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memuat opsi master…
                  </p>
                ) : optionsError ? (
                  <p className="text-[11.5px] text-red-deduction">
                    Gagal memuat opsi master data. Klik Impor untuk memakai nilai otomatis.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {rows.map((r) => (
                        <div key={r.label} className="rounded-lg bg-panel-alt/60 border border-border-soft px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-2 font-bold flex items-center justify-between gap-1">
                            {r.label}
                            {r.overridden && <span className="w-1.5 h-1.5 rounded-full bg-emerald shrink-0" />}
                          </p>
                          <select
                            value={r.value}
                            disabled={importing}
                            onChange={(e) => r.onChange(e.target.value)}
                            className={selectClass}
                          >
                            {r.optionList.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 rounded-lg bg-panel-alt/60 border border-border-soft px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.06em] text-muted-2 font-bold">Petani ({preview.farmers.length})</p>
                      <p className="text-[11.5px] text-foreground/80 mt-1">
                        {preview.farmers.map((f) => `${f.name} (${f.code})`).join(" · ")}
                      </p>
                    </div>
                    {preview.warehouseCodes.length > 1 && (
                      <div className="mt-2 rounded-lg bg-amber/8 border border-amber/25 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.06em] text-amber font-bold">
                          Gudang/Jalur terdeteksi di file ({preview.warehouseCodes.length} gudang)
                        </p>
                        <p className="text-[11.5px] text-foreground/80 mt-1 font-mono">
                          {Array.from(
                            new Set(preview.transactions.map((t) => `${t.warehouseCode}/${t.laneCode}`))
                          )
                            .sort()
                            .join(" · ")}
                        </p>
                        <p className="text-[11px] text-muted-2 mt-1">
                          Tanpa override (Otomatis), tiap transaksi diimpor ke gudang &amp; jalur sesuai Kode Stok-nya. Pilih Gudang/Jalur untuk memaksa semua transaksi ke satu tujuan.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
              Rincian Transaksi
            </p>
            <div className="space-y-1.5">
              {preview.transactions.map((t) => (
                <TransactionRow key={t.transactionCode} tx={t} expanded={expanded.has(t.transactionCode)} onToggle={() => toggleExpand(t.transactionCode)} />
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted-2">
            Efek ke Kas: setiap transaksi dicatat sebagai satu pembayaran tunai penuh (kas keluar). Jika perlu, masukkan saldo awal kas lewat halaman Kas setelah impor.
          </p>
        </>
      )}

      {step === "done" && result && (
        <div className="rounded-xl border border-emerald/30 bg-emerald/8 px-5 py-6 flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald" />
          <p className="text-[15px] font-extrabold text-foreground">Impor selesai</p>
          <p className="text-[12px] text-muted-2 leading-relaxed">
            {result.importedTransactions} transaksi diimpor ({result.importedBales} bal, {result.payments} pembayaran tunai, kas keluar {formatCurrency(result.cashOutflow)}). {result.generatedLabels > 0 && <>{result.generatedLabels} label baru dibuat dari Kode Stok duplikat. </>}{result.skippedTransactions > 0 && <>{result.skippedTransactions} transaksi dilewati.</>}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-panel border border-border-soft px-4 py-2 font-bold text-[12px] text-foreground cursor-pointer hover:border-emerald/60"
            >
              Import File Lain
            </button>
          </div>
        </div>
      )}

      {result && result.skippedTransactions > 0 && step === "done" && (
        <div className="rounded-xl border border-amber/25 bg-amber/8 px-3.5 py-3 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber mt-0.5 shrink-0" />
          <p className="text-[12px] text-foreground/70">
            {result.skippedTransactions} transaksi dilewati karena Kode Transaksi sudah ada, Kode Stok sudah terpakai, atau duplikat dalam file (mode Lewati).
          </p>
        </div>
      )}
    </div>
  )
}

function ImportProgressPanel({ progress }: { progress: ImportProgress }) {
  const pct =
    progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0
  const phaseLabel: Record<ImportProgress["phase"], string> = {
    master: "Menyiapkan data",
    importing: "Mengimpor transaksi",
    finalize: "Menyelesaikan",
    done: "Selesai",
    error: "Gagal",
  }
  const isError = progress.phase === "error"
  const accent = isError ? "text-red" : "text-emerald"
  const barColor = isError ? "bg-red" : "bg-emerald"

  return (
    <div className={`rounded-xl border p-4 ${isError ? "border-red/40 bg-red/5" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {isError ? (
            <ShieldAlert className={`w-4 h-4 shrink-0 ${accent}`} />
          ) : progress.phase === "done" ? (
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${accent}`} />
          ) : (
            <Loader2 className={`w-4 h-4 animate-spin shrink-0 ${accent}`} />
          )}
          <p className={`text-[12.5px] font-bold ${accent}`}>{phaseLabel[progress.phase]}</p>
        </div>
        <p className="font-mono text-[11px] text-muted-2">
          {progress.processed}/{progress.total} transaksi · {progress.bales} bal{progress.generatedLabels > 0 ? ` · ${progress.generatedLabels} label baru` : ""}
        </p>
      </div>

      <div className="mt-2.5 h-1.5 rounded-full bg-panel overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.max(4, pct)}%` }}
        />
      </div>

      <p className="mt-2.5 text-[12px] text-foreground/80">{progress.message}</p>
      {progress.currentLabel && progress.phase === "importing" && (
        <p className="mt-1 text-[11px] text-muted-2 font-mono">
          Bale terakhir: <span className="text-foreground">{progress.currentLabel}</span>
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-panel-alt/60 border border-border-soft px-2.5 py-1.5">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-2 font-bold">Terimpor</p>
          <p className={`font-mono text-[13px] font-bold ${accent}`}>{progress.imported}</p>
        </div>
        <div className="rounded-lg bg-panel-alt/60 border border-border-soft px-2.5 py-1.5">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-2 font-bold">Dilewati</p>
          <p className="font-mono text-[13px] font-bold text-foreground">{progress.skipped}</p>
        </div>
        <div className="rounded-lg bg-panel-alt/60 border border-border-soft px-2.5 py-1.5">
          <p className="text-[10px] uppercase tracking-[0.06em] text-muted-2 font-bold">Bal</p>
          <p className="font-mono text-[13px] font-bold text-foreground">{progress.bales}</p>
        </div>
      </div>
    </div>
  )
}

function TransactionRow({
  tx,
  expanded,
  onToggle,
}: {
  tx: RiwayatTransaction
  expanded: boolean
  onToggle: () => void
}) {
  const hasRoundDiff = Math.abs(tx.roundingDiff) > 0.005
  return (
    <div className="rounded-lg border border-border-soft bg-panel-alt/40">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer text-left"
      >
        <ChevronDown className={`w-4 h-4 text-muted-2 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[12px] font-bold text-emerald">{tx.transactionCode}</span>
            <span className="text-[11.5px] font-bold text-foreground">{tx.farmerName}</span>
            <span className="text-[11px] text-muted-2">{tx.transactionDate.toLocaleString("id-ID")}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-[12px] font-bold text-foreground">{formatCurrency(tx.totalPrice)}</p>
          <p className="font-mono text-[10.5px] text-muted-2">
            {tx.items.length} bal · {tx.totalNetWeight.toLocaleString("id-ID")} kg
            {hasRoundDiff ? ` · asli ${formatCurrency(tx.originalTotalPrice)}` : ""}
          </p>
        </div>
        {hasRoundDiff ? (
          <span
            className="shrink-0 rounded-md bg-amber/10 border border-amber/30 text-amber font-mono text-[10.5px] px-1.5 py-0.5"
            title="Total dibulatkan ke kelipatan 100 — selisih terhadap total asli dari file Excel"
          >
            {tx.roundingDiff > 0 ? "+" : "−"}
            {formatCurrency(Math.abs(tx.roundingDiff))}
          </span>
        ) : (
          <span
            className="shrink-0 rounded-md bg-emerald/10 border border-emerald/30 text-emerald font-mono text-[10.5px] px-1.5 py-0.5"
            title="Total sudah kelipatan 100 — tidak ada pembulatan"
          >
            ok
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2.5">
          <div className="rounded-lg overflow-hidden border border-border-soft">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-panel text-muted-2 uppercase text-[9.5px] tracking-[0.06em]">
                  <th className="text-left font-bold px-2.5 py-1.5">No</th>
                  <th className="text-left font-bold px-2.5 py-1.5">Kode Stok</th>
                  <th className="text-left font-bold px-2.5 py-1.5">Grade</th>
                  <th className="text-right font-bold px-2.5 py-1.5">Bruto</th>
                  <th className="text-right font-bold px-2.5 py-1.5">Netto</th>
                  <th className="text-right font-bold px-2.5 py-1.5">Harga</th>
                  <th className="text-right font-bold px-2.5 py-1.5">Apel</th>
                  <th className="text-right font-bold px-2.5 py-1.5">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-panel-alt/40">
                {tx.items.map((b) => (
                  <tr key={b.labelCode} className="border-t border-border-soft">
                    <td className="px-2.5 py-1.5 text-muted-2 font-mono">{b.inputOrder}</td>
                    <td className="px-2.5 py-1.5 font-mono font-bold text-foreground">{b.labelCode}</td>
                    <td className="px-2.5 py-1.5 text-muted-foreground">{b.grade}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-muted-foreground">{b.grossWeight}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-muted-foreground">{b.netWeight}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-muted-foreground">{b.pricePerKg.toLocaleString("id-ID")}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono text-amber">{b.priceAdjustment.toLocaleString("id-ID")}</td>
                    <td className="px-2.5 py-1.5 text-right font-mono font-bold text-foreground">{formatCurrency(b.subtotal)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border-soft bg-panel">
                  <td colSpan={13} className="px-2.5 py-1.5 text-right font-mono font-bold text-foreground">
                    Total (kelipatan 100) {formatCurrency(tx.totalPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}