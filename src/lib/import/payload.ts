// Serialization dua arah untuk hasil parse riwayat (RiwayatPreview).
//
// Sejak import dipecah menjadi batch (serverless Vercel tidak boleh menerima
// payload besar sebagai argumen Server Action), hasil parse disimpan server-
// side ke kolom import_jobs.data. Satu-satunya field bertipe Date adalah
// RiwayatTransaction.transactionDate — disimpan ISO-8601, di-revive saat
// deserialize. Field lainnya seluruhnya primitif (string/number/boolean).

import type { RiwayatPreview, RiwayatTransaction } from "@/lib/import/riwayat"

interface SerializedTransaction extends Omit<RiwayatTransaction, "transactionDate"> {
  transactionDate: string
}

interface SerializedPreview extends Omit<RiwayatPreview, "transactions"> {
  transactions: SerializedTransaction[]
}

export function serializePreview(p: RiwayatPreview): string {
  const out: SerializedPreview = {
    ...p,
    transactions: p.transactions.map((t) => ({
      ...t,
      transactionDate: t.transactionDate.toISOString(),
    })),
  }
  return JSON.stringify(out)
}

export function deserializePreview(raw: string): RiwayatPreview {
  const parsed = JSON.parse(raw) as SerializedPreview
  const transactions: RiwayatTransaction[] = parsed.transactions.map((t) => ({
    ...t,
    transactionDate: new Date(t.transactionDate),
  }))
  return { ...parsed, transactions }
}