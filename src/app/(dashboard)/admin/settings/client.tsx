"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updateSystemSetting } from "@/lib/actions/admin"

interface SystemSetting {
  key: string
  value: string
}

const knownKeys: Record<string, { label: string; type: "text" | "number" | "select"; options?: string[]; unit?: string }> = {
  COMPANY_NAME: { label: "Nama Perusahaan", type: "text" },
  MAX_MOISTURE_PERCENT: { label: "Max MC%", type: "number", unit: "%" },
  DEFAULT_MOISTURE_PERCENT: { label: "Default MC%", type: "number", unit: "%" },
  WEIGHT_ROUND_MODE: { label: "Pembulatan Berat", type: "select", options: ["normal", "ceil", "floor"] },
  DEFAULT_WAREHOUSE_ID: { label: "Gudang Default (ID)", type: "number" },
  TAX_RATE: { label: "Pajak", type: "number", unit: "%" },
  GUDANG: { label: "Kode Gudang", type: "text" },
  PRINTER_THERMAL: { label: "Nama Printer Thermal", type: "text" },
}

const defaults: Record<string, string> = {
  COMPANY_NAME: "TobakOS",
  MAX_MOISTURE_PERCENT: "20",
  DEFAULT_MOISTURE_PERCENT: "3.00",
  WEIGHT_ROUND_MODE: "normal",
  DEFAULT_WAREHOUSE_ID: "1",
  TAX_RATE: "0",
}

function validateNumber(key: string, value: string): string | null {
  const n = Number(value)
  if (isNaN(n)) return "Harus berupa angka"
  if (key === "MAX_MOISTURE_PERCENT" && (n < 0 || n > 100)) return "Harus antara 0-100"
  if (key === "DEFAULT_MOISTURE_PERCENT" && (n < 0 || n > 100)) return "Harus antara 0-100"
  if (key === "TAX_RATE" && (n < 0 || n > 100)) return "Harus antara 0-100"
  if (key === "DEFAULT_WAREHOUSE_ID" && n < 1) return "Minimal 1"
  return null
}

export function SettingsClient({ settings: initial }: { settings: SystemSetting[] }) {
  const [settings, setSettings] = useState(initial)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  function getValue(key: string): string {
    return settings.find((s) => s.key === key)?.value ?? defaults[key] ?? ""
  }

  async function handleSave(key: string) {
    const meta = knownKeys[key]
    if (meta?.type === "number") {
      const err = validateNumber(key, editValue)
      if (err) { setError(err); return }
    }
    try {
      const updated = await updateSystemSetting(key, editValue)
      setSettings((prev) => {
        const exists = prev.find((s) => s.key === key)
        if (exists) return prev.map((s) => (s.key === key ? updated : s))
        return [...prev, updated]
      })
      toast.success("Pengaturan disimpan")
      setEditingKey(null)
      setError(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  function startEdit(key: string) {
    setEditingKey(key)
    setEditValue(getValue(key))
    setError(null)
  }

  const allKeys = [...new Set([...Object.keys(knownKeys), ...settings.map((s) => s.key)])]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Pengaturan Sistem</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="space-y-3">
          {allKeys.map((key) => {
            const meta = knownKeys[key]
            const label = meta?.label ?? key
            const value = getValue(key)
            return (
              <div key={key} className="flex items-center gap-4 py-3 border-b border-border-soft last:border-0 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <p className="text-[11px] uppercase font-bold text-muted-2">{label}</p>
                  {editingKey === key ? (
                    <div className="flex gap-2 mt-1 flex-wrap items-start">
                      {meta?.type === "select" && meta.options ? (
                        <select
                          value={editValue}
                          onChange={(e) => { setEditValue(e.target.value); setError(null) }}
                          className="bg-panel-alt border border-border-soft text-foreground text-[13.5px] px-2.5 py-2 rounded-lg outline-none"
                        >
                          {meta.options.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={meta?.type === "number" ? "number" : "text"}
                          step={meta?.type === "number" ? "any" : undefined}
                          value={editValue}
                          onChange={(e) => { setEditValue(e.target.value); setError(null) }}
                          className="flex-1 min-w-[120px] bg-panel-alt border border-border-soft text-foreground text-[13.5px] px-2.5 py-2 rounded-lg outline-none font-mono"
                          autoFocus
                        />
                      )}
                      {meta?.unit && <span className="text-[12px] text-muted-foreground py-2">{meta.unit}</span>}
                      <button onClick={() => handleSave(key)} className="rounded-lg bg-emerald px-3 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer">Simpan</button>
                      <button onClick={() => { setEditingKey(null); setError(null) }} className="rounded-lg bg-panel-alt px-3 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer">Batal</button>
                      {error && <p className="w-full text-[11px] text-red mt-1">{error}</p>}
                    </div>
                  ) : (
                    <p className="text-foreground font-mono mt-0.5">{value || "—"}</p>
                  )}
                </div>
                {editingKey !== key && (
                  <button onClick={() => startEdit(key)} className="text-[11px] font-bold text-emerald cursor-pointer hover:underline flex-shrink-0">Edit</button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <p className="text-[11px] text-muted-2">Pengaturan tambahan dapat ditambahkan langsung melalui database.</p>
    </div>
  )
}
