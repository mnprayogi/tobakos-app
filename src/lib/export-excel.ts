import writeExcelFile, { type CellObject, type Row, type SheetData } from "write-excel-file/browser"
import type { FarmerSummaryRow, PeriodSummaryRow, TransactionDetailRow } from "@/lib/actions/reports"

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
