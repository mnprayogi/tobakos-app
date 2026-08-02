"use client"

import { useState } from "react"
import { toast } from "sonner"
import { updateSystemSetting } from "@/lib/actions/admin"

interface SystemSetting {
  key: string
  value: string
}

const knownKeys: Record<string, string> = {
  GUDANG: "Kode Gudang",
  TAX_RATE: "Persentase Pajak (%)",
  PRINTER_THERMAL: "Nama Printer Thermal",
}

export function SettingsClient({ settings: initial }: { settings: SystemSetting[] }) {
  const [settings, setSettings] = useState(initial)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  async function handleSave(key: string) {
    try {
      const updated = await updateSystemSetting(key, editValue)
      setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)))
      toast.success("Pengaturan disimpan")
      setEditingKey(null)
    } catch (err) { toast.error((err as Error).message) }
  }

  function startEdit(s: SystemSetting) {
    setEditingKey(s.key)
    setEditValue(s.value)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Pengaturan Sistem</h1>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        {settings.length === 0 && (
          <div className="py-4 text-center text-muted-foreground">Belum ada pengaturan.</div>
        )}
        <div className="space-y-3">
          {settings.map((s) => (
            <div key={s.key} className="flex items-center gap-4 py-3 border-b border-border-soft last:border-0 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <p className="text-[11px] uppercase font-bold text-muted-2">{knownKeys[s.key] ?? s.key}</p>
                {editingKey === s.key ? (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 bg-panel-alt border border-border-soft text-foreground text-[13.5px] px-2.5 py-2 rounded-lg outline-none"
                      autoFocus
                    />
                    <button onClick={() => handleSave(s.key)} className="rounded-lg bg-emerald px-3 py-2 font-bold text-[12px] text-primary-foreground cursor-pointer">Simpan</button>
                    <button onClick={() => setEditingKey(null)} className="rounded-lg bg-panel-alt px-3 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer">Batal</button>
                  </div>
                ) : (
                  <p className="text-foreground font-mono mt-0.5">{s.value || "—"}</p>
                )}
              </div>
              {editingKey !== s.key && (
                <button onClick={() => startEdit(s)} className="text-[11px] font-bold text-emerald cursor-pointer hover:underline flex-shrink-0">Edit</button>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-2">Pengaturan tambahan dapat ditambahkan langsung melalui database.</p>
    </div>
  )
}
