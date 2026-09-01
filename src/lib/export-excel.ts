import writeExcelFile, { type CellObject, type Row, type SheetData } from "write-excel-file/browser"
import type { FarmerSummaryRow, PeriodSummaryRow, TransactionDetailRow } from "@/lib/actions/reports"
import type { TxnExportRow } from "@/lib/actions/transactions"
import type { PortalBale } from "@/lib/actions/portal"

const MONEY_FMT = "#,##0.##"
const KG_FMT = "#,##0.00"
const COUNT_FMT = "#,##0"

const border = { borderColor: "#000", borderStyle: "thin" } as const

type Align = "left" | "center" | "right"

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(`${d}T00:00:00`) : d
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function txt(v: string | null, opts: Partial<CellObject> = {}): CellObject {
  return { value: v ?? "", ...border, ...opts }
}

function n(v: number | null | undefined, format: string, align: Align = "right", bold = false): CellObject {
  return { value: v ?? 0, type: Number, format, align, ...(bold ? { fontWeight: "bold" } : {}), ...border }
}

function titleRow(text: string, span: number): Row {
  return [{ value: text, fontWeight: "bold", fontSize: 14, align: "center", columnSpan: span }]
}

function headerRow(labels: string[]): Row {
  return labels.map(
    (t) =>
      ({
        value: t,
        fontWeight: "bold",
        align: "center",
        wrap: true,
        backgroundColor: "#d9d9d9",
        ...border,
      }) as CellObject
  )
}

function totalRow(cells: CellObject[]): Row {
  return cells.map((c) => ({
    ...c,
    fontWeight: "bold",
    backgroundColor: "#f2f2f2",
  }))
}

function sum<T>(fn: (r: T) => number, rows: T[]): number {
  return rows.reduce((s, r) => s + fn(r), 0)
}

type XlsxSheet = { sheet: string; columns: { width: number }[]; data: SheetData; stickyRowsCount: number; showGridLines: boolean }

function buildFarmerSheet(rows: FarmerSummaryRow[], from: string, to: string): XlsxSheet {
  const widths = [26, 18, 11, 10, 14, 16, 16, 16, 16]
  const columns = widths.map((width) => ({ width }))
  const data: SheetData = [
    titleRow(`REKAP PER PETANI — Periode ${from || "awal"} s/d ${to || "sekarang"}`, columns.length),
    headerRow(["Petani", "NIK", "Transaksi", "Bale", "Netto (kg)", "Total Harga", "Dibayar", "Sisa", "Hutang Modal"]),
    ...rows.map((r) => [
      txt(r.farmerName, { fontWeight: "bold" }),
      txt(r.farmerNik),
      n(r.transactionCount, COUNT_FMT, "center"),
      n(r.totalBales, COUNT_FMT, "center"),
      n(r.totalNetWeight, KG_FMT),
      n(r.totalPrice, MONEY_FMT),
      n(r.totalPaid, MONEY_FMT),
      n(r.remaining, MONEY_FMT),
      n(r.loanBalance, MONEY_FMT),
    ] as Row),
    totalRow([
      txt("TOTAL", { backgroundColor: "#f2f2f2" }),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(sum((r) => r.transactionCount, rows), COUNT_FMT, "center", true),
      n(sum((r) => r.totalBales, rows), COUNT_FMT, "center", true),
      n(sum((r) => r.totalNetWeight, rows), KG_FMT, "right", true),
      n(sum((r) => r.totalPrice, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.totalPaid, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.remaining, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.loanBalance, rows), MONEY_FMT, "right", true),
    ]),
  ]
  return { sheet: "Rekap Petani", columns, data, stickyRowsCount: 2, showGridLines: false }
}

function buildPeriodSheet(rows: PeriodSummaryRow[], from: string, to: string): XlsxSheet {
  const widths = [14, 11, 10, 14, 16, 16]
  const columns = widths.map((width) => ({ width }))
  const data: SheetData = [
    titleRow(`REKAP PER PERIODE — ${from || "awal"} s/d ${to || "sekarang"}`, columns.length),
    headerRow(["Tanggal", "Transaksi", "Bale", "Netto (kg)", "Total Harga", "Dibayar"]),
    ...rows.map((r) => [
      txt(fmtDate(r.label)),
      n(r.transactionCount, COUNT_FMT, "center"),
      n(r.totalBales, COUNT_FMT, "center"),
      n(r.totalNetWeight, KG_FMT),
      n(r.totalPrice, MONEY_FMT),
      n(r.totalPaid, MONEY_FMT),
    ] as Row),
    totalRow([
      txt("TOTAL", { backgroundColor: "#f2f2f2" }),
      n(sum((r) => r.transactionCount, rows), COUNT_FMT, "center", true),
      n(sum((r) => r.totalBales, rows), COUNT_FMT, "center", true),
      n(sum((r) => r.totalNetWeight, rows), KG_FMT, "right", true),
      n(sum((r) => r.totalPrice, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.totalPaid, rows), MONEY_FMT, "right", true),
    ]),
  ]
  return { sheet: "Rekap Periode", columns, data, stickyRowsCount: 2, showGridLines: false }
}

function buildTransactionSheets(rows: TransactionDetailRow[], from: string, to: string): XlsxSheet[] {
  const txWidths = [20, 22, 12, 12, 10, 12, 8, 14, 16, 16, 16]
  const txColumns = txWidths.map((width) => ({ width }))
  const txData: SheetData = [
    titleRow(`RINCIAN TRANSAKSI — ${from || "awal"} s/d ${to || "sekarang"}`, txColumns.length),
    headerRow(["Kode", "Petani", "Tanggal", "Gudang", "Jalur", "Status", "Bale", "Netto (kg)", "Total Harga", "Dibayar", "Sisa"]),
    ...rows.map((p) => [
      txt(p.transactionCode, { fontWeight: "bold" }),
      txt(p.farmerName),
      txt(fmtDate(p.transactionDate)),
      txt(p.warehouseCode),
      txt(p.laneCode),
      txt(p.status),
      n(p.totalBales, COUNT_FMT, "center"),
      n(p.totalNetWeight, KG_FMT),
      n(p.totalPrice, MONEY_FMT),
      n(p.paidAmount, MONEY_FMT),
      n(p.remaining, MONEY_FMT),
    ] as Row),
    totalRow([
      txt("TOTAL", { backgroundColor: "#f2f2f2" }),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(sum((r) => r.totalBales, rows), COUNT_FMT, "center", true),
      n(sum((r) => r.totalNetWeight, rows), KG_FMT, "right", true),
      n(sum((r) => r.totalPrice, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.paidAmount, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.remaining, rows), MONEY_FMT, "right", true),
    ]),
  ]

  const itemWidths = [20, 12, 24, 22, 10, 20, 14, 12, 12, 14, 14, 15, 16]
  const itemColumns = itemWidths.map((width) => ({ width }))
  const itemData: SheetData = [
    titleRow(`RINCIAN BALE — ${from || "awal"} s/d ${to || "sekarang"}`, itemColumns.length),
    headerRow(["Kode Transaksi", "Tanggal", "Barcode", "Petani", "Grade", "Customer", "Bruto (kg)", "Pot. MC (kg)", "Pot. Packing (kg)", "Netto (kg)", "Harga (Rp/kg)", "Adj Harga (Rp/kg)", "Subtotal"]),
    ...rows.flatMap((p) =>
      p.items.map((i) =>
        [
          txt(p.transactionCode),
          txt(fmtDate(p.transactionDate)),
          txt(i.labelCode, { fontWeight: "bold" }),
          txt(p.farmerName),
          txt(i.grade),
          txt(i.customerName),
          n(i.grossWeight, KG_FMT),
          n(i.moistureDeduction, KG_FMT),
          n(i.packingWeight, KG_FMT),
          n(i.netWeight, KG_FMT),
          n(i.pricePerKg, MONEY_FMT),
          n(i.priceAdjustment, "#,##0.##"),
          n(i.subtotal, MONEY_FMT),
        ] as Row
      )
    ),
    totalRow([
      txt("TOTAL", { backgroundColor: "#f2f2f2" }),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(
        rows.reduce((s, p) => s + p.items.reduce((si, i) => si + (i.grossWeight ?? 0), 0), 0),
        KG_FMT,
        "right",
        true
      ),
      n(
        rows.reduce((s, p) => s + p.items.reduce((si, i) => si + (i.moistureDeduction ?? 0), 0), 0),
        KG_FMT,
        "right",
        true
      ),
      n(rows.reduce((s, p) => s + p.items.reduce((si, i) => si + i.packingWeight, 0), 0), KG_FMT, "right", true),
      n(
        rows.reduce((s, p) => s + p.items.reduce((si, i) => si + (i.netWeight ?? 0), 0), 0),
        KG_FMT,
        "right",
        true
      ),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(rows.reduce((s, p) => s + p.items.reduce((si, i) => si + i.subtotal, 0), 0), MONEY_FMT, "right", true),
    ]),
  ]

  return [
    { sheet: "Transaksi", columns: txColumns, data: txData, stickyRowsCount: 2, showGridLines: false },
    { sheet: "Rincian Bale", columns: itemColumns, data: itemData, stickyRowsCount: 2, showGridLines: false },
  ]
}

export interface ReportExportData {
  farmerRows: FarmerSummaryRow[] | null
  periodRows: PeriodSummaryRow[] | null
  txRows: TransactionDetailRow[] | null
}

export async function exportReportExcel(
  tab: "farmer" | "period" | "transaction",
  data: ReportExportData,
  from: string,
  to: string
): Promise<void> {
  let sheets: XlsxSheet[] = []
  let fileLabel = "Laporan"

  if (tab === "farmer" && data.farmerRows) {
    sheets = [buildFarmerSheet(data.farmerRows, from, to)]
    fileLabel = "Rekap-Petani"
  } else if (tab === "period" && data.periodRows) {
    sheets = [buildPeriodSheet(data.periodRows, from, to)]
    fileLabel = "Rekap-Periode"
  } else if (tab === "transaction" && data.txRows) {
    sheets = buildTransactionSheets(data.txRows, from, to)
    fileLabel = "Rincian-Transaksi"
  }

  if (sheets.length === 0) throw new Error("Tidak ada data untuk diekspor")

  const range = `${from || "semua"}_${to || "semua"}`
  await writeExcelFile(sheets, { fontFamily: "Calibri", fontSize: 11 }).toFile(
    `Laporan-${fileLabel}_${range}.xlsx`
  )
}

export async function exportTransactionsExcel(rows: TxnExportRow[]): Promise<void> {
  const widths = [20, 22, 14, 12, 12, 14, 8, 12, 16, 16, 16, 16, 12, 14, 16, 16, 16]
  const columns = widths.map((width) => ({ width }))
  const data: SheetData = [
    titleRow(`EXPORT TRANSAKSI — ${new Date().toLocaleDateString("id-ID")}`, columns.length),
    headerRow([
      "Kode",
      "Petani",
      "NIK",
      "Tanggal",
      "Gudang",
      "Jalur",
      "Bale",
      "Netto (kg)",
      "Harga Asli",
      "Total Final",
      "Dibayar",
      "Sisa",
      "Status",
      "Status Hutang",
      "Grader",
      "Operator",
      "Approver",
    ]),
    ...rows.map((p) => [
      txt(p.transactionCode, { fontWeight: "bold" }),
      txt(p.farmerName),
      txt(p.farmerNik),
      txt(fmtDate(p.transactionDate)),
      txt(p.warehouseCode),
      txt(p.laneCode),
      n(p.totalItems, COUNT_FMT, "center"),
      n(p.totalNetWeight, KG_FMT),
      p.originalTotalPrice != null ? n(p.originalTotalPrice, MONEY_FMT) : { value: "", ...border },
      n(p.totalPrice, MONEY_FMT),
      n(p.paidAmount, MONEY_FMT),
      n(p.remaining, MONEY_FMT),
      txt(p.status),
      txt(p.derived),
      txt(p.createdBy),
      txt(p.weighedBy),
      txt(p.approvedBy),
    ] as Row),
    totalRow([
      txt("TOTAL", { backgroundColor: "#f2f2f2" }),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(sum((r) => r.totalItems, rows), COUNT_FMT, "center", true),
      n(sum((r) => r.totalNetWeight, rows), KG_FMT, "right", true),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(sum((r) => r.totalPrice, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.paidAmount, rows), MONEY_FMT, "right", true),
      n(sum((r) => r.remaining, rows), MONEY_FMT, "right", true),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
    ]),
  ]

  const dateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  await writeExcelFile(
    [{ sheet: "Transaksi", columns, data, stickyRowsCount: 2, showGridLines: false }],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toFile(`Transaksi_${dateLabel}.xlsx`)
}

export interface PortalExportData {
  customerName: string
  from: string | null
  to: string | null
  items: PortalBale[]
}

function groupPortal<T>(
  items: PortalBale[],
  keyFn: (i: PortalBale) => string,
  init: (i: PortalBale) => T,
  add: (acc: T, i: PortalBale) => void
): T[] {
  const map = new Map<string, T>()
  for (const i of items) {
    const key = keyFn(i)
    const existing = map.get(key)
    if (existing) {
      add(existing, i)
    } else {
      const acc = init(i)
      add(acc, i)
      map.set(key, acc)
    }
  }
  return [...map.values()]
}

export async function exportPortalExcel(data: PortalExportData): Promise<void> {
  const { customerName, items } = data
  if (items.length === 0) throw new Error("Tidak ada data untuk diekspor")
  const range = `${data.from || "awal"} s/d ${data.to || "sekarang"}`

  const nettoOf = (i: PortalBale) => i.netWeight ?? 0
  const nilaiOf = (i: PortalBale) => i.subtotal ?? 0
  const totalNetto = sum(nettoOf, items)
  const totalNilai = sum(nilaiOf, items)

  const statusOrder = ["GRADED", "WEIGHED", "CLOSED"] as const
  const statusRows = statusOrder.map((status) => {
    const rows = items.filter((i) => i.status === status)
    return {
      label:
        status === "GRADED"
          ? "GRADED (Menunggu Timbang)"
          : status === "WEIGHED"
            ? "WEIGHED (Menunggu Penutupan)"
            : "CLOSED (Selesai)",
      bales: rows.length,
      netto: sum(nettoOf, rows),
      nilai: sum(nilaiOf, rows),
    }
  })

  // Sheet 1 � Ringkasan
  const rWidths = [34, 10, 14, 18]
  const ringkasanColumns = rWidths.map((width) => ({ width }))
  const ringkasanData: SheetData = [
    titleRow(`LAPORAN ALOKASI MITRA � ${customerName}`, ringkasanColumns.length),
    [{ value: `Periode: ${range}`, align: "center", ...border }, { value: "", ...border }, { value: "", ...border }, { value: "", ...border }],
    headerRow(["Metrik", "Bale", "Netto (kg)", "Nilai (Rp)"]),
    totalRow([
      txt("Total Alokasi"),
      n(items.length, COUNT_FMT, "center", true),
      n(totalNetto, KG_FMT, "right", true),
      n(totalNilai, MONEY_FMT, "right", true),
    ]),
    ...statusRows.map(
      (r) =>
        [
          txt(r.label),
          n(r.bales, COUNT_FMT, "center"),
          n(r.netto, KG_FMT),
          n(r.nilai, MONEY_FMT),
        ] as Row
    ),
  ]

  // Sheet 2 � Alokasi Bale (detail)
  const bWidths = [12, 18, 20, 22, 14, 14, 10, 11, 12, 12, 11, 13, 15, 15, 11, 11]
  const baleColumns = bWidths.map((width) => ({ width }))
  const baleData: SheetData = [
    titleRow(`ALOKASI BALE � Periode ${range}`, baleColumns.length),
    headerRow([
      "Tanggal",
      "No. Transaksi",
      "Barcode",
      "Petani",
      "Jenis Daun",
      "Jenis Tembakau",
      "Grade",
      "Bruto (kg)",
      "Pot. Packing (kg)",
      "Pot. MC (kg)",
      "Netto (kg)",
      "Harga (Rp/kg)",
      "Adj. Harga (Rp/kg)",
      "Subtotal (Rp)",
      "Status Bale",
      "Status Nota",
    ]),
    ...items.map((i) =>
      [
        txt(fmtDate(i.transactionDate)),
        txt(i.transactionCode),
        txt(i.labelCode, { fontWeight: "bold" }),
        txt(i.farmerName),
        txt(i.leafTypeName),
        txt(i.tobaccoTypeName),
        txt(i.grade),
        n(i.grossWeight, KG_FMT),
        n(i.packingWeight, KG_FMT),
        n(i.moistureDeduction, KG_FMT),
        n(i.netWeight, KG_FMT),
        i.pricePerKg != null ? n(i.pricePerKg, MONEY_FMT) : { value: "", ...border },
        n(i.priceAdjustment, "#,##0.##;-#,##0.##;0"),
        n(i.subtotal, MONEY_FMT),
        txt(i.status, { align: "center" }),
        txt(i.purchaseStatus, { align: "center" }),
      ] as Row
    ),
    totalRow([
      txt("TOTAL"),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(sum((i: PortalBale) => i.grossWeight ?? 0, items), KG_FMT, "right", true),
      n(sum((i: PortalBale) => i.packingWeight, items), KG_FMT, "right", true),
      n(sum((i: PortalBale) => i.moistureDeduction ?? 0, items), KG_FMT, "right", true),
      n(totalNetto, KG_FMT, "right", true),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(totalNilai, MONEY_FMT, "right", true),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
    ]),
  ]

  // Sheet 3 � Rekap per Transaksi
  interface TxnAcc { code: string; date: Date; bales: number; netto: number; nilai: number; purchaseStatus: string }
  const txnRows = groupPortal<TxnAcc>(
    items,
    (i) => i.transactionCode,
    (i) => ({ code: i.transactionCode, date: i.transactionDate, bales: 0, netto: 0, nilai: 0, purchaseStatus: i.purchaseStatus }),
    (acc, i) => {
      acc.bales += 1
      acc.netto += nettoOf(i)
      acc.nilai += nilaiOf(i)
    }
  )
  const tWidths = [18, 12, 8, 12, 16, 12]
  const txnColumns = tWidths.map((width) => ({ width }))
  const txnData: SheetData = [
    titleRow(`REKAP PER TRANSAKSI � Periode ${range}`, txnColumns.length),
    headerRow(["No. Transaksi", "Tanggal", "Bale", "Netto (kg)", "Nilai (Rp)", "Status Nota"]),
    ...txnRows.map(
      (r) =>
        [
          txt(r.code, { fontWeight: "bold" }),
          txt(fmtDate(r.date)),
          n(r.bales, COUNT_FMT, "center"),
          n(r.netto, KG_FMT),
          n(r.nilai, MONEY_FMT),
          txt(r.purchaseStatus, { align: "center" }),
        ] as Row
    ),
    totalRow([
      txt("TOTAL"),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(sum((r: TxnAcc) => r.bales, txnRows), COUNT_FMT, "center", true),
      n(sum((r: TxnAcc) => r.netto, txnRows), KG_FMT, "right", true),
      n(sum((r: TxnAcc) => r.nilai, txnRows), MONEY_FMT, "right", true),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
    ]),
  ]

  // Sheet 4 � Rekap per Grade
  interface GradeAcc { grade: string; leafType: string; tobaccoType: string; bales: number; netto: number; nilai: number }
  const gradeRows = groupPortal<GradeAcc>(
    items,
    (i) => `${i.grade}|${i.leafTypeName}|${i.tobaccoTypeName}`,
    (i) => ({ grade: i.grade, leafType: i.leafTypeName, tobaccoType: i.tobaccoTypeName, bales: 0, netto: 0, nilai: 0 }),
    (acc, i) => {
      acc.bales += 1
      acc.netto += nettoOf(i)
      acc.nilai += nilaiOf(i)
    }
  )
  gradeRows.sort((a, b) => b.nilai - a.nilai)
  const gWidths = [12, 16, 16, 8, 12, 16]
  const gradeColumns = gWidths.map((width) => ({ width }))
  const gradeData: SheetData = [
    titleRow(`REKAP PER GRADE � Periode ${range}`, gradeColumns.length),
    headerRow(["Grade", "Jenis Daun", "Jenis Tembakau", "Bale", "Netto (kg)", "Nilai (Rp)"]),
    ...gradeRows.map(
      (r) =>
        [
          txt(r.grade, { fontWeight: "bold" }),
          txt(r.leafType),
          txt(r.tobaccoType),
          n(r.bales, COUNT_FMT, "center"),
          n(r.netto, KG_FMT),
          n(r.nilai, MONEY_FMT),
        ] as Row
    ),
    totalRow([
      txt("TOTAL"),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(sum((r: GradeAcc) => r.bales, gradeRows), COUNT_FMT, "center", true),
      n(sum((r: GradeAcc) => r.netto, gradeRows), KG_FMT, "right", true),
      n(sum((r: GradeAcc) => r.nilai, gradeRows), MONEY_FMT, "right", true),
    ]),
  ]

  // Sheet 5 � Rekap per Petani
  interface FarmerAcc { farmerName: string; bales: number; netto: number; nilai: number }
  const farmerRows = groupPortal<FarmerAcc>(
    items,
    (i) => i.farmerName,
    (i) => ({ farmerName: i.farmerName, bales: 0, netto: 0, nilai: 0 }),
    (acc, i) => {
      acc.bales += 1
      acc.netto += nettoOf(i)
      acc.nilai += nilaiOf(i)
    }
  )
  farmerRows.sort((a, b) => b.nilai - a.nilai)
  const fWidths = [26, 8, 12, 16]
  const farmerColumns = fWidths.map((width) => ({ width }))
  const farmerData: SheetData = [
    titleRow(`REKAP PER PETANI PEMASOK � Periode ${range}`, farmerColumns.length),
    headerRow(["Petani", "Bale", "Netto (kg)", "Nilai (Rp)"]),
    ...farmerRows.map(
      (r) =>
        [
          txt(r.farmerName, { fontWeight: "bold" }),
          n(r.bales, COUNT_FMT, "center"),
          n(r.netto, KG_FMT),
          n(r.nilai, MONEY_FMT),
        ] as Row
    ),
    totalRow([
      txt("TOTAL"),
      n(sum((r: FarmerAcc) => r.bales, farmerRows), COUNT_FMT, "center", true),
      n(sum((r: FarmerAcc) => r.netto, farmerRows), KG_FMT, "right", true),
      n(sum((r: FarmerAcc) => r.nilai, farmerRows), MONEY_FMT, "right", true),
    ]),
  ]

  const safeName = customerName.replace(/[^\w-]+/g, "-")
  const dateLabel = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  await writeExcelFile(
    [
      { sheet: "Ringkasan", columns: ringkasanColumns, data: ringkasanData, stickyRowsCount: 3, showGridLines: false },
      { sheet: "Alokasi Bale", columns: baleColumns, data: baleData, stickyRowsCount: 2, showGridLines: false },
      { sheet: "Rekap Transaksi", columns: txnColumns, data: txnData, stickyRowsCount: 2, showGridLines: false },
      { sheet: "Rekap Grade", columns: gradeColumns, data: gradeData, stickyRowsCount: 2, showGridLines: false },
      { sheet: "Rekap Petani", columns: farmerColumns, data: farmerData, stickyRowsCount: 2, showGridLines: false },
    ],
    { fontFamily: "Calibri", fontSize: 11 }
  ).toFile(`Laporan-Mitra-${safeName}_${dateLabel}.xlsx`)
}

function buildCashSheet(
  label: string,
  rows: { createdAt: Date; type: string; uraian: string; transactionCode: string | null; note: string | null; amount: number; createdBy: string | null; balance: number }[],
  from: string,
  to: string
): XlsxSheet {
  const widths = [18, 12, 30, 22, 28, 16, 16, 18]
  const columns = widths.map((width) => ({ width }))
  const dateRange = `${from || "awal"} s/d ${to || "sekarang"}`

  const totalMasuk = rows.filter((r) => r.type === "MASUK").reduce((s, r) => s + r.amount, 0)
  const totalKeluar = rows.filter((r) => r.type === "KELUAR").reduce((s, r) => s + r.amount, 0)

  const data: SheetData = [
    titleRow(`BUKU KAS ${label.toUpperCase()} — Periode ${dateRange}`, columns.length),
    headerRow(["Tanggal", "Jenis", "Uraian", "Ref Transaksi", "Catatan", "Jumlah Masuk", "Jumlah Keluar", "Saldo"]),
    ...rows.map((r) => [
      txt(fmtDate(r.createdAt)),
      txt(r.type === "MASUK" ? "Masuk" : "Keluar"),
      txt(r.uraian, { fontWeight: r.transactionCode ? "bold" : undefined }),
      txt(r.transactionCode ?? "—"),
      txt(r.note ?? "—"),
      r.type === "MASUK" ? n(r.amount, MONEY_FMT) : { value: "", ...border },
      r.type === "KELUAR" ? n(r.amount, MONEY_FMT) : { value: "", ...border },
      n(r.balance, MONEY_FMT),
    ] as Row),
    totalRow([
      txt("TOTAL", { backgroundColor: "#f2f2f2" }),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(totalMasuk, MONEY_FMT, "right", true),
      n(totalKeluar, MONEY_FMT, "right", true),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
    ]),
  ]
  return { sheet: label, columns, data, stickyRowsCount: 2, showGridLines: false }
}

export interface CashExportData {
  pembelian: { createdAt: Date; type: string; uraian: string; transactionCode: string | null; note: string | null; amount: number; createdBy: string | null; balance: number }[]
  operasional: { createdAt: Date; type: string; uraian: string; transactionCode: string | null; note: string | null; amount: number; createdBy: string | null; balance: number }[]
}

export async function exportCashExcel(data: CashExportData, from: string, to: string): Promise<void> {
  const sheets: XlsxSheet[] = []
  if (data.pembelian.length > 0) sheets.push(buildCashSheet("Kas Pembelian", data.pembelian, from, to))
  if (data.operasional.length > 0) sheets.push(buildCashSheet("Kas Operasional", data.operasional, from, to))

  if (sheets.length === 0) throw new Error("Tidak ada data kas untuk diekspor")

  const range = `${from || "semua"}_${to || "semua"}`
  await writeExcelFile(sheets, { fontFamily: "Calibri", fontSize: 11 }).toFile(
    `Laporan-Kas_${range}.xlsx`
  )
}

function buildBankSheet(
  label: string,
  rows: { createdAt: Date; type: string; bankAccountName: string; uraian: string; transactionCode: string | null; note: string | null; amount: number; createdBy: string | null; balance: number }[],
  from: string,
  to: string
): XlsxSheet {
  const widths = [18, 24, 34, 22, 34, 16, 18]
  const columns = widths.map((width) => ({ width }))
  const dateRange = `${from || "awal"} s/d ${to || "sekarang"}`

  const totalKeluar = rows.filter((r) => r.type === "KELUAR").reduce((s, r) => s + r.amount, 0)

  const data: SheetData = [
    titleRow(`BUKU BANK ${label.toUpperCase()} — Periode ${dateRange}`, columns.length),
    headerRow(["Tanggal", "Rekening", "Uraian", "Ref Transaksi", "Catatan (Ke Rekening)", "Keluar", "Saldo"]),
    ...rows.map((r) => [
      txt(fmtDate(r.createdAt)),
      txt(r.bankAccountName),
      txt(r.uraian, { fontWeight: r.transactionCode ? "bold" : undefined }),
      txt(r.transactionCode ?? "—"),
      txt(r.note ?? "—"),
      n(r.amount, MONEY_FMT),
      n(r.balance, MONEY_FMT),
    ] as Row),
    totalRow([
      txt("TOTAL", { backgroundColor: "#f2f2f2" }),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      { value: "", ...border, backgroundColor: "#f2f2f2" },
      n(totalKeluar, MONEY_FMT, "right", true),
      { value: "", ...border, backgroundColor: "#f2f2f2" },
    ]),
  ]
  return { sheet: label, columns, data, stickyRowsCount: 2, showGridLines: false }
}

export interface BankExportData {
  rows: { createdAt: Date; type: string; bankAccountName: string; uraian: string; transactionCode: string | null; note: string | null; amount: number; createdBy: string | null; balance: number }[]
}

export async function exportBankExcel(data: BankExportData, from: string, to: string): Promise<void> {
  if (data.rows.length === 0) throw new Error("Tidak ada data bank untuk diekspor")

  const sheet = buildBankSheet("Mutasi Rekening", data.rows, from, to)
  const range = `${from || "semua"}_${to || "semua"}`
  await writeExcelFile([sheet], { fontFamily: "Calibri", fontSize: 11 }).toFile(
    `Laporan-Buku-Bank_${range}.xlsx`
  )
}
