export type RoundMode = "normal" | "floor" | "ceil"

export function roundWeight(
  value: number,
  mode: RoundMode,
  decimals: number = 1
): number {
  if (mode === "normal") {
    const factor = Math.pow(10, decimals)
    return Math.round(value * factor) / factor
  }
  const fn = mode === "ceil" ? Math.ceil : Math.floor
  return fn(value)
}

export function calculateWeightAfterPacking(
  grossWeight: number,
  packingWeight: number
): number {
  return grossWeight - packingWeight
}

export function calculateMoistureDeduction(
  weightAfterPacking: number,
  moisturePercent: number
): number {
  return weightAfterPacking * (moisturePercent / 100)
}

export function calculateNetWeight(
  weightAfterPacking: number,
  moistureDeduction: number
): number {
  return weightAfterPacking - moistureDeduction
}

export function calculateSubtotal(
  netWeight: number,
  pricePerKg: number
): number {
  return netWeight * pricePerKg
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function roundRupiah(value: number): number {
  return Math.round(value / 100) * 100
}

export function isMultipleOf100(value: number): boolean {
  return Math.abs(value % 100) < 0.005
}

export function calculateAdjustmentPerKg(
  originalTotalPrice: number,
  newTotalPrice: number,
  totalNetWeight: number
): number {
  if (totalNetWeight <= 0) throw new Error("Total netto tidak valid untuk negosiasi")
  return (newTotalPrice - originalTotalPrice) / totalNetWeight
}

export interface NegotiationItem {
  netWeight: number
  pricePerKg: number
}

export interface NegotiationResult {
  adjustmentsPerKg: number[]
  subtotals: number[]
  adjustmentPerKg: number
  exactTotal: number
  targetTotal: number
  roundingDiff: number
}

export function negotiateItems(
  items: NegotiationItem[],
  originalTotalPrice: number,
  newTotalPrice: number
): NegotiationResult {
  if (newTotalPrice < 0) throw new Error("Total harga tidak boleh negatif")
  if (items.length === 0) throw new Error("Tidak ada bale untuk dinegosiasi")

  const targetTotal = roundRupiah(newTotalPrice)
  const totalNetWeight = items.reduce((s, i) => s + i.netWeight, 0)
  const adjustmentPerKg = Math.floor(
    calculateAdjustmentPerKg(originalTotalPrice, targetTotal, totalNetWeight)
  )

  const subtotals: number[] = []
  for (let i = 0; i < items.length - 1; i++) {
    const item = items[i]
    const subtotal = roundMoney(item.netWeight * (item.pricePerKg + adjustmentPerKg))
    if (subtotal < 0) throw new Error("Total harga baru menghasilkan nilai negatif pada salah satu bale")
    subtotals.push(subtotal)
  }

  const lastItem = items[items.length - 1]
  if (lastItem.netWeight <= 0) throw new Error("Netto bale terakhir tidak valid untuk negosiasi")
  const previousTotal = subtotals.reduce((s, x) => s + x, 0)
  const lastSubtotal = roundMoney(targetTotal - previousTotal)
  if (lastSubtotal < 0) throw new Error("Total harga baru menghasilkan nilai negatif pada salah satu bale")
  subtotals.push(lastSubtotal)

  const lastAdjustment = roundMoney(lastSubtotal / lastItem.netWeight - lastItem.pricePerKg)
  const adjustmentsPerKg = items.slice(0, -1).map(() => adjustmentPerKg)
  adjustmentsPerKg.push(lastAdjustment)

  const exactTotal = subtotals.reduce((s, x) => s + x, 0)
  return {
    adjustmentsPerKg,
    subtotals,
    adjustmentPerKg,
    exactTotal,
    targetTotal,
    roundingDiff: roundMoney(exactTotal - newTotalPrice),
  }
}
