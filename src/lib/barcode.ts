import { format } from "date-fns"

export function laneToken(lane: string, warehouse: string): string {
  const prefix = `${warehouse}-`
  return lane.startsWith(prefix) ? lane.slice(prefix.length) : lane
}

export function generateLabelCode(
  warehouse: string,
  lane: string,
  sequence: number,
  date: Date = new Date()
): string {
  return `${warehouse}-${laneToken(lane, warehouse)}-${format(date, "yyyyMMdd")}-${String(sequence).padStart(4, "0")}`
}

export function generateTransactionCode(
  laneCode: string,
  sequence: number,
  date: Date = new Date()
): string {
  return `TRX-${laneCode}-${format(date, "yyyyMMdd")}-${String(sequence).padStart(3, "0")}`
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
