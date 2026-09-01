import { roundMoney } from "@/lib/calculations"
import type { CashFlowTypeValue } from "@/lib/cash-totals"

export interface BankTotalsSource {
  type: CashFlowTypeValue
  amount: unknown
  voidedAt?: Date | null
}

export interface BankTotals {
  totalMasuk: number
  totalKeluar: number
  balance: number
}

export function bankTotals(entries: BankTotalsSource[]): BankTotals {
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

export function bankTotalsPerAccount(
  accounts: { id: number }[],
  entries: (BankTotalsSource & { bankAccountId: number })[]
): { totalMasuk: number; totalKeluar: number; balance: number }[] {
  return accounts.map((acc) => {
    const mine = entries.filter((e) => e.bankAccountId === acc.id)
    const t = bankTotals(mine)
    return { totalMasuk: t.totalMasuk, totalKeluar: t.totalKeluar, balance: t.balance }
  })
}
