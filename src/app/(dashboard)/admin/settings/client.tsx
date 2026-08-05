"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updateSystemSetting } from "@/lib/actions/admin"
import { Settings2, Search, Pencil, Loader2, ChevronDown } from "lucide-react"

interface SystemSetting {
  key: string
  value: string
}

interface Warehouse {
  id: number
  code: string
  name: string
}

type SettingType = "text" | "number" | "select" | "warehouse"

interface SettingMeta {
  label: string
  description: string
  type: SettingType
  options?: { label: string; value: string }[]
  unit?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
}

const knownMeta: Record<string, SettingMeta> = {
  COMPANY_NAME: {
    label: "Nama Perusahaan",
    description: "Nama yang tampil di header aplikasi dan dokumen laporan.",
    type: "text",
    placeholder: "TobakOS",
  },
  TAX_RATE: {
    label: "Pajak",
    description: "Persentase pajak yang dipakai pada nota (khusus kebutuhan tertentu).",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.5,
  },
  MAX_MOISTURE_PERCENT: {
    label: "Maksimum Kadar Air",
    description: "Batas tertinggi potongan MC yang bisa diinput di Pos 1 (Grading).",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.5,
  },
  DEFAULT_MOISTURE_PERCENT: {
    label: "Kadar Air Default",
    description: "Nilai awal potongan MC saat form grading dibuka.",
    type: "number",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.5,
  },
  WEIGHT_ROUND_MODE: {
    label: "Pembulatan Berat",
    description: "Cara pembulatan berat bale di Pos 2 (Penimbangan).",
    type: "select",
    options: [
      { label: "Normal", value: "normal" },
      { label: "Bulatkan ke atas", value: "ceil" },
      { label: "Bulatkan ke bawah", value: "floor" },
    ],
  },
  DEFAULT_WAREHOUSE_ID: {
    label: "Gudang Default",
    description: "Gudang yang dipakai sebagai default aplikasi.",
    type: "warehouse",
  },
  GUDANG: {
    label: "Kode Gudang",
    description: "Kode gudang untuk keperluan tertentu (khusus kebutuhan tertentu).",
    type: "text",
    placeholder: "GUDANG 01",
  },
  PRINTER_THERMAL: {
    label: "Nama Printer Thermal",
    description: "Nama printer thermal untuk pencetakan label (opsional).",
    type: "text",
    placeholder: "Nama printer…",
  },
}

const defaults: Record<string, string> = {
  COMPANY_NAME: "TobakOS",
  MAX_MOISTURE_PERCENT: "20",
  DEFAULT_MOISTURE_PERCENT: "3.00",
  WEIGHT_ROUND_MODE: "normal",
  DEFAULT_WAREHOUSE_ID: "1",
  TAX_RATE: "0",
}

const sectionDefs: { id: string; title: string; keys: string[] }[] = [
  { id: "perusahaan", title: "Perusahaan", keys: ["COMPANY_NAME", "TAX_RATE"] },
  { id: "grading", title: "Grading · Pos 1", keys: ["MAX_MOISTURE_PERCENT", "DEFAULT_MOISTURE_PERCENT"] },
  { id: "penimbangan", title: "Penimbangan · Pos 2", keys: ["WEIGHT_ROUND_MODE"] },
  { id: "kompatibilitas", title: "Kompatibilitas", keys: ["DEFAULT_WAREHOUSE_ID", "GUDANG", "PRINTER_THERMAL"] },
]

export function SettingsClient({
  settings: initial,
  warehouses,
}: {
  settings: SystemSetting[]
  warehouses: Warehouse[]
}) {
  const [settings, setSettings] = useState(initial)
  const [search, setSearch] = useState("")
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [othersOpen, setOthersOpen] = useState(false)

  function getStoredValue(key: string): string | null {
    return settings.find((s) => s.key === key)?.value ?? null
  }

  function getEffectiveValue(key: string): string {
    return getStoredValue(key) ?? defaults[key] ?? ""
  }

  function matchesSearch(key: string): boolean {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const meta = knownMeta[key]
    const hay = [key, meta?.label, meta?.description].filter(Boolean).join(" ").toLowerCase()
    return hay.includes(q)
  }

  function displayValue(key: string): { text: string; set: boolean } {
    const meta = knownMeta[key]
    const stored = getStoredValue(key)
    const raw = getEffectiveValue(key)
    if (meta?.type === "warehouse") {
      const wh = warehouses.find((w) => w.id === Number(raw))
      return { text: wh ? `${wh.name} (${wh.code})` : `ID ${raw}`, set: stored != null }
    }
    if (meta?.type === "select") {
      const opt = meta.options?.find((o) => o.value === raw)
      return { text: opt?.label ?? raw, set: stored != null }
    }
    return { text: raw, set: stored != null }
  }

  function validate(key: string, value: string): string | null {
    const meta = knownMeta[key]
    if (meta?.type === "number") {
      const n = Number(value)
      if (value.trim() === "" || isNaN(n)) return "Harus berupa angka"
      if (meta.min != null && n < meta.min) return `Minimal ${meta.min}${meta.unit ?? ""}`
      if (meta.max != null && n > meta.max) return `Maksimal ${meta.max}${meta.unit ?? ""}`
    }
    if (meta?.type === "warehouse") {
      if (!warehouses.some((w) => w.id === Number(value))) return "Pilih gudang"
    }
    if (meta?.type === "select" && meta.options) {
      if (!meta.options.some((o) => o.value === value)) return "Pilih salah satu opsi"
    }
    return null
  }

  function applySetting(updated: SystemSetting) {
    setSettings((prev) => {
      const exists = prev.find((s) => s.key === updated.key)
      if (exists) return prev.map((s) => (s.key === updated.key ? updated : s))
      return [...prev, updated]
    })
  }

  async function handleSave(key: string) {
    const err = validate(key, editValue)
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const meta = knownMeta[key]
      const value = meta?.type === "text" ? editValue.trim() : editValue
      const updated = await updateSystemSetting(key, value)
      applySetting(updated)
      toast.success("Pengaturan disimpan")
      setEditingKey(null)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset(key: string) {
    const def = defaults[key]
    if (def === undefined) return
    if (!confirm(`Kembalikan ${knownMeta[key]?.label ?? key} ke nilai default?`)) return
    setSaving(true)
    try {
      const updated = await updateSystemSetting(key, def)
      applySetting(updated)
      toast.success("Dikembalikan ke nilai default")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(key: string) {
    const meta = knownMeta[key]
    let val = getEffectiveValue(key)
    if (meta?.type === "warehouse") {
      const stored = getStoredValue(key)
      const valid = stored != null && warehouses.some((w) => w.id === Number(stored))
      if (!valid) val = String(warehouses[0]?.id ?? "")
    }
    setEditingKey(key)
    setEditValue(val)
    setError(null)
  }

  function cancelEdit() {
    setEditingKey(null)
    setError(null)
  }

  function renderEditor(key: string) {
    const meta = knownMeta[key]
    const inputClass =
      "flex-1 min-w-[140px] bg-panel border border-border-soft text-foreground text-[13.5px] px-2.5 py-2 rounded-lg outline-none focus:border-emerald/60 font-mono"
    const onKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") cancelEdit()
    }
    if (meta?.type === "select" && meta.options) {
      return (
        <select
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value); setError(null) }}
          onKeyDown={onKeyDown}
          autoFocus
          className={inputClass}
        >
          {meta.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )
    }
    if (meta?.type === "warehouse") {
      return (
        <select
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value); setError(null) }}
          onKeyDown={onKeyDown}
          autoFocus
          className={inputClass}
        >
          {warehouses.length === 0 && <option value="">Tidak ada gudang</option>}
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
          ))}
        </select>
      )
    }
    return (
      <input
        type={meta?.type === "number" ? "number" : "text"}
        step={meta?.step}
        min={meta?.min}
        max={meta?.max}
        value={editValue}
        onChange={(e) => { setEditValue(e.target.value); setError(null) }}
        onKeyDown={onKeyDown}
        placeholder={meta?.placeholder}
        autoFocus
        className={inputClass}
      />
    )
  }

  function renderRow(key: string) {
    const meta = knownMeta[key]
    const label = meta?.label ?? key
    const { text, set } = displayValue(key)
    const isEditing = editingKey === key
    const stored = getStoredValue(key)
    const canReset = defaults[key] !== undefined && stored != null && stored !== defaults[key]

    return (
      <div key={key} className="rounded-xl border border-border-soft bg-panel-alt/40 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-[180px] flex-1">
            <p className="text-[12.5px] font-bold text-foreground">{label}</p>
            {meta?.description && (
              <p className="text-[10.5px] text-muted-2 mt-0.5">{meta.description}</p>
            )}
            {!isEditing && (
              <p className="font-mono text-[13px] text-muted-foreground mt-1.5">
                {text}
                {!set && (
                  <span className="font-sans text-[10.5px] text-muted-2 ml-2">
                    (belum diset)
                  </span>
                )}
              </p>
            )}
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1.5 shrink-0">
              {canReset && (
                <button
                  type="button"
                  onClick={() => handleReset(key)}
                  disabled={saving}
                  className="text-[11px] font-bold text-muted-foreground cursor-pointer hover:text-foreground border border-border-soft rounded-lg px-2.5 py-1.5 bg-panel disabled:opacity-50"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => startEdit(key)}
                className="text-[11px] font-bold text-emerald cursor-pointer hover:underline inline-flex items-center gap-1"
              >
                <Pencil className="w-3.5 h-3.5" /> Ubah
              </button>
            </div>
          )}
        </div>

        {isEditing && (
          <form
            className="mt-2 flex gap-2 flex-wrap items-start"
            onSubmit={(e) => { e.preventDefault(); handleSave(key) }}
          >
            {renderEditor(key)}
            {meta?.unit && <span className="text-[12px] text-muted-foreground py-2">{meta.unit}</span>}
            <button
              type="submit"
              disabled={saving || !!error}
              className="rounded-lg bg-emerald px-3 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Simpan
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="rounded-lg bg-panel-alt px-3 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            {error && <p className="w-full text-[11px] text-red mt-1">{error}</p>}
          </form>
        )}
      </div>
    )
  }

  const unknownKeys = settings.filter((s) => !knownMeta[s.key]).map((s) => s.key)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-panel border border-border rounded-2xl p-4 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-emerald/15 border border-emerald/30 flex items-center justify-center text-emerald shrink-0">
          <Settings2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-extrabold text-foreground">Pengaturan Sistem</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Konfigurasi umum aplikasi — perubahan berlaku langsung.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari pengaturan…"
          className="w-full bg-panel border border-border rounded-xl pl-9 pr-3 py-2.5 text-[13.5px] text-foreground placeholder:text-muted-2 outline-none focus:border-emerald/60"
        />
      </div>

      {sectionDefs.map((section) => {
        const keys = section.keys.filter(matchesSearch)
        if (keys.length === 0) return null
        return (
          <section key={section.id} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2 mb-3">
              {section.title}
            </p>
            <div className="space-y-2">{keys.map(renderRow)}</div>
          </section>
        )
      })}

      {unknownKeys.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <button
            type="button"
            onClick={() => setOthersOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 cursor-pointer"
          >
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-2">
                Lainnya
              </p>
              <p className="text-[11px] text-muted-2 mt-0.5">
                {unknownKeys.length} key tambahan di database
              </p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-2 transition-transform ${othersOpen ? "rotate-180" : ""}`}
            />
          </button>
          {othersOpen && (
            <div className="mt-3 space-y-2">
              {unknownKeys.filter(matchesSearch).map(renderRow)}
            </div>
          )}
        </section>
      )}

      <p className="text-[11px] text-muted-2">
        Pengaturan tambahan dapat ditambahkan langsung melalui database.
      </p>
    </div>
  )
}
