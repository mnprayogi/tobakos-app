export type DashboardRange = "today" | "7d" | "14d" | "30d" | "all"

export const DASHBOARD_RANGES: { value: DashboardRange; label: string }[] = [
  { value: "7d", label: "7 Hari" },
  { value: "14d", label: "14 Hari" },
  { value: "30d", label: "30 Hari" },
  { value: "all", label: "Semua" },
]

export function dashboardRangeFrom(range: DashboardRange): Date | null {
  if (range === "all") return null
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (range === "today") return d
  const days = range === "7d" ? 7 : range === "14d" ? 14 : 30
  d.setDate(d.getDate() - (days - 1))
  return d
}

export function dashboardRangeTrendDays(range: DashboardRange): number {
  if (range === "30d" || range === "all") return 30
  if (range === "14d") return 14
  return 7
}

export function dashboardRangeLabel(range: DashboardRange): string {
  return DASHBOARD_RANGES.find((r) => r.value === range)?.label ?? "Semua"
}