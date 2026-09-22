import { readSheet } from "read-excel-file/node"
import { parse, isValid } from "date-fns"
import { roundMoney, roundRupiah } from "@/lib/calculations"

export interface RiwayatBale {
  inputOrder: number
  labelCode: string
  grade: string
  grossWeight: number
  netWeight: number
  pricePerKg: number
  priceAdjustment: number
  subtotal: number
}

export interface RiwayatTransaction {
  transactionCode: string
  transactionDate: Date
  farmerName: string
  farmerCode: string
  warehouseCode: string
  laneCode: string
  totalGrossWeight: number
  totalNetWeight: number
  originalTotalPrice: number
  totalPrice: number
  roundingDiff: number
  items: RiwayatBale[]
}

export interface RiwayatFarmer {
  name: string
  code: string
}

export interface RiwayatPreview {
  fileName: string
  warehouseCode: string
  laneCode: string
  warehouseCodes: string[]
  duplicateLabels: { label: string; count: number; transactions: string[] }[]
  farmers: RiwayatFarmer[]
  transactions: RiwayatTransaction[]
  totalBales: number
  totalGrossWeight: number
  totalNetWeight: number
  totalPrice: number
  warnings: string[]
}

type CellValue = string | number | boolean | typeof Date | null

const LEGACY_DATE_FORMATS = [
  "dd/MM/yyyy HH:mm",
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy",
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd",
] as const

function asText(v: CellValue): string {
  if (v == null) return ""
  if (v instanceof Date) return v.toISOString()
  return String(v).trim()
}

function asNumber(v: CellValue): number {
  if (v == null) return NaN
  if (typeof v === "number") return v
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ""))
  return Number.isFinite(n) ? n : NaN
}

function parseDate(v: CellValue): Date | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v
  const s = asText(v)
  if (!s) return null
  for (const fmt of LEGACY_DATE_FORMATS) {
    const d = parse(s, fmt, new Date())
    if (isValid(d)) return d
  }
  return null
}

function roundSubtotal(v: number): number {
  return roundMoney(v)
}

function slugToken(s: string): string {
  return s.replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function parseWarehouseLane(labelCode: string): {
  warehouseCode: string
  laneCode: string
  parsed: boolean
} {
  const norm = labelCode.trim().toUpperCase()
  if (norm.includes("/")) {
    const parts = norm.split("/")
    return {
      warehouseCode: (parts[0] || "K31").trim(),
      laneCode: (parts[1] || "L1").trim(),
      parsed: true,
    }
  }
  const parts = norm.split("-")
  if (parts.length >= 4) {
    const date = parts[parts.length - 2]
    const sequence = parts[parts.length - 1]
    if (/^\d{8}$/.test(date) && /^\d{4}$/.test(sequence)) {
      return {
        warehouseCode: (parts[0] || "K31").trim(),
        laneCode: (parts[1] || "L1").trim(),
        parsed: true,
      }
    }
  }
  return { warehouseCode: "K31", laneCode: "L1", parsed: false }
}

export async function parseRiwayatFile(buffer: Buffer, fileName: string): Promise<RiwayatPreview> {
  const data = await readSheet(buffer)

  let headerIndex = -1
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    if (asText(row?.[1]) === "Kode Stok" && asText(row?.[9]) === "Kode Transaksi") {
      headerIndex = i
      break
    }
  }
  if (headerIndex === -1) {
    throw new Error(
      "Struktur file tidak dikenali. Pastikan sheet berisi kolom: Kode Stok, Grade, Bruto, Netto, Harga, Apel/Netto, Subtotal, Tanggal, Kode Transaksi, Nama Petani, Kode Petani."
    )
  }

  const transactions = new Map<string, RiwayatTransaction>()
  const order: string[] = []
  const warnings: string[] = []
  let skippedRows = 0

  for (let i = headerIndex + 1; i < data.length; i++) {
    const row = data[i]

    const first = asText(row?.[0]).toUpperCase()
    if (first === "TOTAL") break
    if (row.every((c) => c == null || asText(c) === "")) continue

    const labelCode = asText(row?.[1])
    const txCode = asText(row?.[9])
    const farmerName = asText(row?.[10]).toUpperCase() || null
    const farmerCode = asText(row?.[11]).toUpperCase() || null

    if (!labelCode && !txCode) {
      skippedRows++
      continue
    }

    const inputOrder = isNaN(asNumber(row?.[0])) ? NaN : asNumber(row?.[0])
    const grossWeight = asNumber(row?.[3])
    const netWeight = asNumber(row?.[4])
    const pricePerKg = asNumber(row?.[5])
    const apel = asNumber(row?.[6])
    const hasApel = row?.[6] != null && asText(row?.[6]) !== ""
    const subtotal = roundSubtotal(asNumber(row?.[7]))
    const dateV = parseDate(row?.[8])

    if (!txCode) {
      warnings.push(`Baris "${labelCode}": Kode Transaksi kosong — dilewati.`)
      skippedRows++
      continue
    }
    if (!farmerName || !farmerCode) {
      warnings.push(`Baris "${labelCode}": data petani tidak lengkap — dilewati.`)
      skippedRows++
      continue
    }
    if (
      isNaN(grossWeight) ||
      isNaN(netWeight) ||
      isNaN(pricePerKg) ||
      isNaN(subtotal) ||
      isNaN(inputOrder)
    ) {
      warnings.push(`Baris "${labelCode}": nilai numerik tidak valid — dilewati.`)
      skippedRows++
      continue
    }

    if (!hasApel) {
      warnings.push(`Bale "${labelCode}" tanpa kolom Apel/Netto — priceAdjustment dianggap 0 (subtotal tetap historis).`)
    }
    const priceAdjustment = hasApel && !isNaN(apel) ? roundMoney(apel) : 0

    const loc = parseWarehouseLane(labelCode)
    let tx = transactions.get(txCode)
    if (!tx) {
      tx = {
        transactionCode: txCode,
        transactionDate: dateV ?? new Date(),
        farmerName,
        farmerCode,
        warehouseCode: loc.warehouseCode,
        laneCode: loc.laneCode,
        totalGrossWeight: 0,
        totalNetWeight: 0,
        totalPrice: 0,
        originalTotalPrice: 0,
        roundingDiff: 0,
        items: [],
      }
      transactions.set(txCode, tx)
      order.push(txCode)
      if (!loc.parsed) {
        warnings.push(
          `Transaksi "${txCode}": Kode Stok "${labelCode}" tidak sesuai format — memakai gudang/jalur default (${loc.warehouseCode}/${loc.laneCode}).`
        )
      }
    } else if (tx.warehouseCode !== loc.warehouseCode || tx.laneCode !== loc.laneCode) {
      warnings.push(
        `Transaksi "${txCode}": gudang/jalur berbeda antar bal (${tx.warehouseCode}/${tx.laneCode} vs ${loc.warehouseCode}/${loc.laneCode}) — dipakai milik bal pertama.`
      )
    }

    if (dateV && tx.transactionDate.getTime() !== dateV.getTime()) {
      warnings.push(`Transaksi "${txCode}": tanggal berbeda antar bale (${dateV.toLocaleString("id-ID")}).`)
    }

    tx.items.push({
      inputOrder,
      labelCode,
      grade: asText(row?.[2]),
      grossWeight,
      netWeight,
      pricePerKg,
      priceAdjustment,
      subtotal,
    })
    tx.totalGrossWeight += grossWeight
    tx.totalNetWeight += netWeight
    tx.totalPrice += subtotal
  }

  const transactionList = order
    .map((code) => transactions.get(code)!)
    .map((t) => {
      t.items.sort((a, b) => a.inputOrder - b.inputOrder)

      const originalTotalPrice = roundSubtotal(t.items.reduce((s, b) => s + b.subtotal, 0))
      const targetTotal = roundRupiah(originalTotalPrice)
      const roundingDiff = Math.round(targetTotal - originalTotalPrice)

      if (roundingDiff !== 0 && t.items.length > 0) {
        const last = t.items[t.items.length - 1]
        const prevTotal = t.items.slice(0, -1).reduce((s, b) => s + b.subtotal, 0)
        last.subtotal = roundSubtotal(targetTotal - prevTotal)
        last.priceAdjustment =
          last.netWeight > 0
            ? roundSubtotal(last.subtotal / last.netWeight - last.pricePerKg)
            : 0
      }

      return {
        ...t,
        totalPrice: targetTotal,
        originalTotalPrice,
        roundingDiff,
      }
    })
    .sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime())

  if (transactionList.length === 0) {
    throw new Error("Tidak ada baris transaksi valid yang ditemukan pada file.")
  }

  const nameGroupsByCode = new Map<string, { name: string; code: string }[]>()
  for (const t of transactionList) {
    let arr = nameGroupsByCode.get(t.farmerCode)
    if (!arr) {
      arr = []
      nameGroupsByCode.set(t.farmerCode, arr)
    }
    if (!arr.some((f) => f.name === t.farmerName)) {
      arr.push({ name: t.farmerName, code: t.farmerCode })
    }
  }
  const assignedNik = new Map<string, string>()
  for (const [code, names] of nameGroupsByCode) {
    names.forEach((f, i) => {
      assignedNik.set(`${code}::${f.name}`, i === 0 ? code : `${code}__${slugToken(f.name)}`)
    })
  }
  for (const t of transactionList) {
    const nik = assignedNik.get(`${t.farmerCode}::${t.farmerName}`)
    if (nik && nik !== t.farmerCode) {
      warnings.push(
        `Petani "${t.farmerName}" memakai kode "${t.farmerCode}" milik petani lain — dibuat sebagai petani terpisah dengan kode "${nik}".`
      )
    }
    t.farmerCode = nik ?? t.farmerCode
  }

  const farmerMap = new Map<string, RiwayatFarmer>()
  for (const t of transactionList) {
    if (!farmerMap.has(t.farmerCode)) {
      farmerMap.set(t.farmerCode, { name: t.farmerName, code: t.farmerCode })
    }
  }

  const labelSeen = new Map<string, { count: number; transactions: Set<string> }>()
  for (const t of transactionList) {
    for (const b of t.items) {
      let rec = labelSeen.get(b.labelCode)
      if (!rec) {
        rec = { count: 0, transactions: new Set() }
        labelSeen.set(b.labelCode, rec)
      }
      rec.count++
      rec.transactions.add(t.transactionCode)
    }
  }
  const duplicateLabels = Array.from(labelSeen.entries())
    .filter(([, rec]) => rec.count > 1)
    .map(([label, rec]) => ({
      label,
      count: rec.count,
      transactions: Array.from(rec.transactions),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  for (const d of duplicateLabels) {
    warnings.push(
      `Kode Stok "${d.label}" muncul ${d.count} kali pada ${d.transactions.join(" dan ")} — transaksi terdampak akan dilewati atau dibuatkan label baru sesuai pilihan mode.`
    )
  }

  if (skippedRows > 0) warnings.unshift(`${skippedRows} baris dilewati (tidak valid / kosong).`)

  return {
    fileName,
    warehouseCode: transactionList[0].warehouseCode,
    laneCode: transactionList[0].laneCode,
    warehouseCodes: Array.from(new Set(transactionList.map((t) => t.warehouseCode))).sort(),
    duplicateLabels,
    farmers: Array.from(farmerMap.values()).sort((a, b) => a.code.localeCompare(b.code)),
    transactions: transactionList,
    totalBales: transactionList.reduce((s, t) => s + t.items.length, 0),
    totalGrossWeight: roundMoney(transactionList.reduce((s, t) => s + t.totalGrossWeight, 0)),
    totalNetWeight: roundMoney(transactionList.reduce((s, t) => s + t.totalNetWeight, 0)),
    totalPrice: transactionList.reduce((s, t) => s + t.totalPrice, 0),
    warnings,
  }
}