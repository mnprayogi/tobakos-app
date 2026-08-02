import { format } from "date-fns"

export function laneToken(lane: string, warehouse: string): string {
  const prefix = `${warehouse}-`
  return lane.startsWith(prefix) ? lane.slice(prefix.length) : lane
}

export function generateLabelCode(warehouse: string, lane: string, sequence: number): string {
  const date = format(new Date(), "yyyyMMdd")
  return `${warehouse}-${laneToken(lane, warehouse)}-${date}-${String(sequence).padStart(4, "0")}`
}

export function parseLabelCode(code: string): {
  warehouse: string
  lane: string
  date: string
  sequence: number
} | null {
  const parts = code.match(/^([\w-]+)-([\w-]+)-(\d{8})-(\d{4})$/)
  if (!parts) return null
  return {
    warehouse: parts[1],
    lane: parts[2],
    date: parts[3],
    sequence: parseInt(parts[4], 10),
  }
}
