import { roundMoney } from "@/lib/calculations"

export type LoanEntryTypeValue = "DISBURSEMENT" | "REPAYMENT"

export interface LoanTotalsSource {
  type: LoanEntryTypeValue
  amount: unknown
  voidedAt?: Date | null
}

export function loanTotals(entries: LoanTotalsSource[]): { totalBorrowed: number; totalRepaid: number; balance: number } {
  let borrowed = 0
  let repaid = 0
  for (const e of entries) {
    if (e.voidedAt) continue
    if (e.type === "DISBURSEMENT") borrowed += Number(e.amount)
    else repaid += Number(e.amount)
  }
  return {
    totalBorrowed: roundMoney(borrowed),
    totalRepaid: roundMoney(repaid),
    balance: roundMoney(borrowed - repaid),
  }
}
