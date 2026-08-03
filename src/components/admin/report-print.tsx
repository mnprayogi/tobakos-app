import { forwardRef } from "react"
import type { CSSProperties } from "react"
import type { FarmerSummaryRow, PeriodSummaryRow, TransactionDetailRow } from "@/lib/actions/reports"

function fmtCurrency(v: number): string {
  return v.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function dateLabel(s: string): string {
  if (!s) return "\u2014"
  const d = new Date(`${s}T00:00:00`)
  if (isNaN(d.getTime())) return s
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface ReportPrintProps {
  tab: "farmer" | "period" | "transaction"
  from: string
  to: string
  farmerRows: FarmerSummaryRow[] | null
  periodRows: PeriodSummaryRow[] | null
  txRows: TransactionDetailRow[] | null
}

const th: CSSProperties = {
  border: "1.2px solid #000",
  padding: "2mm 3mm",
  fontSize: "9.5pt",
  fontWeight: 800,
  textAlign: "center",
  background: "#e5e5e5",
  color: "#000",
}

const td: CSSProperties = {
  border: "1.2px solid #000",
  padding: "1.8mm 3mm",
  fontSize: "9pt",
  color: "#000",
}

export const ReportPrint = forwardRef<HTMLDivElement, ReportPrintProps>(function ReportPrint(
  { tab, from, to, farmerRows, periodRows, txRows },
  ref
) {
  const title =
    tab === "farmer" ? "REKAP PER PETANI" : tab === "period" ? "REKAP PER PERIODE" : "RINCIAN TRANSAKSI"

  const farmerTotals = farmerRows
    ? {
        tx: farmerRows.reduce((s, r) => s + r.transactionCount, 0),
        bales: farmerRows.reduce((s, r) => s + r.totalBales, 0),
        netto: farmerRows.reduce((s, r) => s + r.totalNetWeight, 0),
        price: farmerRows.reduce((s, r) => s + r.totalPrice, 0),
        paid: farmerRows.reduce((s, r) => s + r.totalPaid, 0),
        remaining: farmerRows.reduce((s, r) => s + r.remaining, 0),
      }
    : null

  const periodTotals = periodRows
    ? {
        tx: periodRows.reduce((s, r) => s + r.transactionCount, 0),
        bales: periodRows.reduce((s, r) => s + r.totalBales, 0),
        netto: periodRows.reduce((s, r) => s + r.totalNetWeight, 0),
        price: periodRows.reduce((s, r) => s + r.totalPrice, 0),
        paid: periodRows.reduce((s, r) => s + r.totalPaid, 0),
      }
    : null

  const txTotals = txRows
    ? {
        bales: txRows.reduce((s, r) => s + r.totalBales, 0),
        netto: txRows.reduce((s, r) => s + r.totalNetWeight, 0),
        price: txRows.reduce((s, r) => s + r.totalPrice, 0),
        paid: txRows.reduce((s, r) => s + r.paidAmount, 0),
      }
    : null

  const rows = farmerRows ?? periodRows ?? txRows ?? []

  return (
    <div ref={ref} style={{ width: "100%", maxWidth: "180mm", margin: "0 auto", fontFamily: "'Courier New', Courier, monospace" }}>
      <div style={{ textAlign: "center", marginBottom: "5mm", borderBottom: "2px solid #000", paddingBottom: "3mm" }}>
        <h1 style={{ fontSize: "15pt", fontWeight: 900, margin: "0 0 2mm", letterSpacing: "0.1em", color: "#000" }}>{title}</h1>
        <p style={{ fontSize: "11pt", fontWeight: 600, margin: "0 0 1mm", color: "#000" }}>TobakOS · Gudang Tembakau</p>
        <p style={{ fontSize: "9.5pt", color: "#222", margin: 0 }}>
          Periode: {dateLabel(from)} — {dateLabel(to)} · Daftar {rows.length}
        </p>
      </div>

      {tab === "farmer" && farmerRows && farmerTotals && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm" }}>
          <thead>
            <tr>
              <th style={th}>#</th>
              <th style={{ ...th, textAlign: "left" }}>Petani</th>
              <th style={th}>Tx</th>
              <th style={th}>Bale</th>
              <th style={th}>Netto (kg)</th>
              <th style={th}>Total</th>
              <th style={th}>Dibayar</th>
              <th style={th}>Sisa</th>
              <th style={th}>Hutang Modal</th>
            </tr>
          </thead>
          <tbody>
            {farmerRows.map((r, i) => (
              <tr key={r.farmerId}>
                <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 700 }}>{r.farmerName}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.transactionCount}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.totalBales}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.totalNetWeight.toFixed(1)}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtCurrency(r.totalPrice)}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmtCurrency(r.totalPaid)}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmtCurrency(r.remaining)}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmtCurrency(r.loanBalance)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={3} style={{ ...td, fontWeight: 800 }}>TOTAL</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{farmerTotals.bales}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{farmerTotals.netto.toFixed(1)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtCurrency(farmerTotals.price)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtCurrency(farmerTotals.paid)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtCurrency(farmerTotals.remaining)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtCurrency(farmerRows.reduce((s, r) => s + r.loanBalance, 0))}</td>
            </tr>
          </tbody>
        </table>
      )}

      {tab === "period" && periodRows && periodTotals && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm" }}>
          <thead>
            <tr>
              <th style={th}>Tanggal</th>
              <th style={th}>Tx</th>
              <th style={th}>Bale</th>
              <th style={th}>Netto (kg)</th>
              <th style={th}>Total</th>
              <th style={th}>Dibayar</th>
            </tr>
          </thead>
          <tbody>
            {periodRows.map((r) => (
              <tr key={r.label}>
                <td style={{ ...td, textAlign: "center" }}>{r.label}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.transactionCount}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.totalBales}</td>
                <td style={{ ...td, textAlign: "right" }}>{r.totalNetWeight.toFixed(1)}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtCurrency(r.totalPrice)}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmtCurrency(r.totalPaid)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, fontWeight: 800 }}>TOTAL</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{periodTotals.tx}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{periodTotals.bales}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{periodTotals.netto.toFixed(1)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtCurrency(periodTotals.price)}</td>
              <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{fmtCurrency(periodTotals.paid)}</td>
            </tr>
          </tbody>
        </table>
      )}

      {tab === "transaction" && txRows && txTotals && (
        <>
          {txRows.map((p) => (
            <div key={p.id} style={{ marginBottom: "4mm" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5mm" }}>
                <tbody>
                  <tr>
                    <td style={{ ...td, fontWeight: 800 }}>{p.transactionCode}</td>
                    <td style={{ ...td }}>{p.farmerName}</td>
                    <td style={{ ...td, textAlign: "center" }}>{new Date(p.transactionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                    <td style={{ ...td, textAlign: "center" }}>{p.warehouseCode ?? "\u2014"}</td>
                    <td style={{ ...td, textAlign: "center" }}>{p.status}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtCurrency(p.totalPrice)}</td>
                  </tr>
                </tbody>
              </table>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.5mm" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Barcode</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Tanggal</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Grade</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Bruto</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Pot. MC</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Pot. Packing</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Netto</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Harga</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Adj</th>
                    <th style={{ ...th, padding: "1.5mm 1.5mm", fontSize: "8.5pt" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {p.items.map((i) => (
                    <tr key={i.id}>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", fontFamily: "'Courier New', Courier, monospace" }}>{i.labelCode}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "center" }}>{new Date(p.transactionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "center" }}>{i.grade}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "right" }}>{i.grossWeight != null ? i.grossWeight.toFixed(1) : "\u2014"}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "right" }}>{i.moistureDeduction != null ? i.moistureDeduction.toFixed(1) : "\u2014"}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "right" }}>{i.packingWeight > 0 ? i.packingWeight.toFixed(1) : "\u2014"}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "right" }}>{i.netWeight != null ? i.netWeight.toFixed(1) : "\u2014"}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "right" }}>{i.pricePerKg != null ? i.pricePerKg.toLocaleString("id-ID") : "\u2014"}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "right" }}>{i.priceAdjustment > 0 ? `+${i.priceAdjustment}` : i.priceAdjustment}</td>
                      <td style={{ ...td, padding: "1.2mm 1.5mm", fontSize: "8pt", textAlign: "right" }}>{fmtCurrency(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm" }}>
            <tbody>
              <tr>
                <td style={{ ...td, fontWeight: 800, textAlign: "center" }}>Bale: {txTotals.bales}</td>
                <td style={{ ...td, fontWeight: 800, textAlign: "center" }}>Netto: {txTotals.netto.toFixed(1)} kg</td>
                <td style={{ ...td, fontWeight: 800, textAlign: "center" }}>Total: {fmtCurrency(txTotals.price)}</td>
                <td style={{ ...td, fontWeight: 800, textAlign: "center" }}>Dibayar: {fmtCurrency(txTotals.paid)}</td>
                <td style={{ ...td, fontWeight: 800, textAlign: "center" }}>Sisa: {fmtCurrency(txTotals.price - txTotals.paid)}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}

      {rows.length === 0 && (
        <p style={{ textAlign: "center", fontSize: "10pt", color: "#000", padding: "10mm 0" }}>Tidak ada data pada periode ini.</p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6mm", marginBottom: "8mm" }}>
        <div style={{ width: "45%" }}>
          <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>MENGETAHUI</p>
          <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
          <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Nama Jelas)</p>
        </div>
        <div style={{ width: "45%" }}>
          <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>PETUGAS GUDANG</p>
          <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
          <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Nama Jelas)</p>
        </div>
      </div>

      <div style={{ textAlign: "center", borderTop: "2.5px solid #000", paddingTop: "3mm", fontSize: "11pt", fontWeight: 700 }}>
        <p style={{ color: "#000" }}>Dicetak dari TobakOS</p>
      </div>
    </div>
  )
})
