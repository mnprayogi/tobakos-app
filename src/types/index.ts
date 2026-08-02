export type PurchaseItemStatus = "GRADED" | "WEIGHED" | "CLOSED"
export type PurchaseStatus = "DRAFT" | "WEIGHED" | "APPROVED" | "PAID"

export interface LabelCode {
  warehouse: string
  date: string
  sequence: number
  toString(): string
}
