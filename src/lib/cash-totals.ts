import { roundMoney } from "@/lib/calculations"

export type CashCategoryValue = "KAS_PEMBELIAN" | "KAS_OPERASIONAL"
export type CashFlowTypeValue = "MASUK" | "KELUAR"

export interface CashTotalsSource {
  type: CashFlowTypeValue
  amount: unknown
  voidedAt?: Date | null
}

export interface CashTotals {
  totalMasuk: number
  totalKeluar: number
  balance: number
}

export function cashTotals(entries: CashTotalsSource[]): CashTotals {
  let masuk = 0
  let keluar = 0
  for (const e of entries) {
    if (e.voidedAt) continue
    if (e.type === "MASUK") masuk += Number(e.amount)
    else keluar += Number(e.amount)
  }
  return {
    totalMasuk: roundMoney(masuk),
    totalKeluar: roundMoney(keluar),
    balance: roundMoney(masuk - keluar),
  }
}

export function cashTotalsByCategory(
  entries: (CashTotalsSource & { category: CashCategoryValue })[]
): { pembelian: CashTotals; operasional: CashTotals; total: CashTotals } {
  const pembelian = cashTotals(entries.filter((e) => e.category === "KAS_PEMBELIAN"))
  const operasional = cashTotals(entries.filter((e) => e.category === "KAS_OPERASIONAL"))
  const total: CashTotals = {
    totalMasuk: roundMoney(pembelian.totalMasuk + operasional.totalMasuk),
    totalKeluar: roundMoney(pembelian.totalKeluar + operasional.totalKeluar),
    balance: roundMoney(pembelian.balance + operasional.balance),
  }
  return { pembelian, operasional, total }
}