"use client"

import { useRouter } from "next/navigation"

export type LaneOption = {
  id: number
  code: string
  name: string
  warehouse: { code: string; name: string }
}

export function LanePicker({
  lanes,
  title = "Pilih Jalur Kerja",
  subtitle = "Identitas perangkat mengikuti jalur yang dipilih.",
}: {
  lanes: LaneOption[]
  title?: string
  subtitle?: string
}) {
  const router = useRouter()

  const grouped = lanes.reduce<Record<string, LaneOption[]>>((acc, lane) => {
    const key = lane.warehouse.code
    if (!acc[key]) acc[key] = []
    acc[key].push(lane)
    return acc
  }, {})

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] sm:min-h-[80vh] px-4">
      <div className="text-center mb-8">
        <h1 className="font-sans text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        <p className="font-sans text-sm text-muted mt-2">{subtitle}</p>
      </div>

      <div className="grid gap-6 w-full max-w-3xl">
        {Object.entries(grouped).map(([warehouseCode, warehouseLanes]) => {
          const warehouse = warehouseLanes[0].warehouse
          return (
            <section key={warehouseCode} className="bg-panel border border-border rounded-2xl p-4 sm:p-5">
              <header className="mb-4">
                <span className="font-mono text-xs text-emerald font-bold tracking-wider">{warehouse.code}</span>
                <h2 className="font-sans text-lg font-bold text-foreground mt-1">{warehouse.name}</h2>
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {warehouseLanes.map((lane) => (
                  <button
                    key={lane.id}
                    onClick={() => router.push(`?lane=${encodeURIComponent(lane.code)}`)}
                    className="flex items-center justify-between rounded-lg border border-border bg-panel-alt px-5 py-4 text-left hover:border-emerald/40 hover:bg-panel transition-colors"
                  >
                    <div>
                      <div className="font-mono text-sm font-bold text-foreground">{lane.code}</div>
                      <div className="font-sans text-xs text-muted mt-0.5">{lane.name}</div>
                    </div>
                    <span className="font-sans text-emerald font-bold text-lg">→</span>
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
