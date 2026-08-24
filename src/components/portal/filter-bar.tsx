"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Filter, X } from "lucide-react"

export function PortalFilterBar({ from, to }: { from: string | null; to: string | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fromValue, setFromValue] = useState(from ?? "")
  const [toValue, setToValue] = useState(to ?? "")

  function apply(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (fromValue) params.set("from", fromValue)
    if (toValue) params.set("to", toValue)
    const qs = params.toString()
    startTransition(() => router.push(qs ? `/portal?${qs}` : "/portal"))
  }

  function reset() {
    setFromValue("")
    setToValue("")
    startTransition(() => router.push("/portal"))
  }

  const inputCls =
    "rounded-lg border border-border-soft bg-panel-alt px-2.5 py-2 font-mono text-[12px] text-foreground outline-none focus:border-emerald/50"

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-card px-3.5 py-3"
    >
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-2">
          Dari Tanggal
        </label>
        <input type="date" value={fromValue} onChange={(e) => setFromValue(e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-2">
          Sampai Tanggal
        </label>
        <input type="date" value={toValue} onChange={(e) => setToValue(e.target.value)} className={inputCls} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center gap-1.5 rounded-lg bg-emerald px-3 py-2 text-[12px] font-bold text-primary-foreground transition-colors hover:bg-emerald/80 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        <Filter className="size-3.5" />
        {pending ? "Memuat..." : "Terapkan"}
      </button>
      {(from || to) && (
        <button
          type="button"
          onClick={reset}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-lg border border-border-soft bg-panel-alt px-3 py-2 text-[12px] font-bold text-muted-foreground transition-colors hover:text-red-deduction hover:border-red-deduction/40 cursor-pointer"
        >
          <X className="size-3.5" />
          Reset
        </button>
      )}
      {from || to ? (
        <span className="ml-auto font-mono text-[11px] text-muted-2">
          Periode aktif: {from ?? "awal"} s/d {to ?? "sekarang"}
        </span>
      ) : (
        <span className="ml-auto font-mono text-[11px] text-muted-2">Menampilkan semua data</span>
      )}
    </form>
  )
}
