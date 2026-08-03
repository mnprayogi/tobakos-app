import { forwardRef } from "react"
import type { BuktiData } from "@/lib/actions/finance"
import { formatTerbilangRupiah } from "@/lib/terbilang"

function fmtCurrency(v: number): string {
  return v.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function fmtDateTime(d: Date | string | null): string {
  if (!d) return "\u2014"
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const BuktiLunasPrint = forwardRef<HTMLDivElement, BuktiData>(
  function BuktiLunasPrint(props, ref) {
    const {
      transactionCode,
      transactionDate,
      farmerName,
      farmerNik,
      warehouseLabel,
      laneCode,
      totalItems,
      totalNetWeight,
      totalPrice,
      originalTotalPrice,
      paidAmount,
      totalLoanDeduction,
      remaining,
      lastPaidAt,
      payments,
    } = props

    const adaNego =
      originalTotalPrice != null && Math.abs(originalTotalPrice - totalPrice) > 0.005

    return (
      <div ref={ref} className="print-nota">
        <div style={{ textAlign: "center", marginBottom: "6mm", borderBottom: "2.5px solid #000", paddingBottom: "3mm" }}>
          <h1 style={{ fontSize: "20pt", fontWeight: 900, margin: "0 0 1mm", letterSpacing: "0.14em", color: "#000" }}>
            BUKTI LUNAS
          </h1>
          <p style={{ fontSize: "11pt", fontWeight: 600, margin: "0 0 1mm", color: "#000" }}>
            KWITANSI PELUNASAN PEMBAYARAN
          </p>
          <p style={{ fontSize: "10pt", color: "#222", margin: 0 }}>
            {[warehouseLabel, laneCode].filter(Boolean).join(" \u00b7 ") || "TobakOS"}
          </p>
        </div>

        <div style={{ marginBottom: "5mm" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "26mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>No. Kwitansi</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000", fontWeight: 600 }}>{transactionCode}</td>
              </tr>
              <tr>
                <td style={{ width: "26mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Tanggal</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{fmtDate(lastPaidAt)}</td>
              </tr>
              <tr>
                <td style={{ width: "26mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Petani</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000", fontWeight: 600 }}>{farmerName}</td>
              </tr>
              <tr>
                <td style={{ width: "26mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>NIK</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{farmerNik ?? "\u2014"}</td>
              </tr>
              <tr>
                <td style={{ width: "26mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Kode Transaksi</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{transactionCode}</td>
              </tr>
              <tr>
                <td style={{ width: "26mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Tanggal Transaksi</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{fmtDate(transactionDate)}</td>
              </tr>
              <tr>
                <td style={{ width: "26mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Bale / Netto</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>
                  {totalItems} bale · {totalNetWeight.toFixed(2)} kg
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ border: "2px solid #000", borderRadius: "3mm", padding: "3mm 4mm", marginBottom: "5mm", background: "#f5f5f5" }}>
          <p style={{ fontSize: "11pt", margin: 0, color: "#000" }}>
            <b>Sejumlah uang:</b> <b style={{ textTransform: "capitalize" }}>{formatTerbilangRupiah(paidAmount)}</b>
          </p>
          <p style={{ fontSize: "11pt", margin: "1mm 0 0", color: "#000" }}>
            untuk pelunasan pembelian tembakau <b>{transactionCode}</b> atas nama <b>{farmerName}</b>.
          </p>
        </div>

        {payments.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm" }}>
            <thead>
              <tr>
                <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>No</th>
                <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Tanggal</th>
                <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Metode</th>
                <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Tunai</th>
                <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Potongan Hutang</th>
                <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "left", background: "#e5e5e5", color: "#000" }}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay, i) => (
                <tr key={pay.id}>
                  <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{i + 1}</td>
                  <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{fmtDateTime(pay.paidAt)}</td>
                  <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{pay.method}</td>
                  <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{fmtCurrency(pay.amount)}</td>
                  <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>
                    {pay.loanDeduction > 0 ? fmtCurrency(pay.loanDeduction) : "\u2014"}
                  </td>
                  <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>
                    {pay.note ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "50%", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.5px solid #000", background: "#f5f5f5" }}>
                Total Harga
                {adaNego && (
                  <span style={{ display: "block", fontSize: "9pt", fontWeight: 400, textDecoration: "line-through", color: "#444" }}>
                    Harga awal {fmtCurrency(originalTotalPrice!)}
                  </span>
                )}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.5px solid #000", background: "#f5f5f5" }}>
                {fmtCurrency(totalPrice)}
              </td>
            </tr>
            {totalLoanDeduction > 0 && (
              <tr>
                <td style={{ fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.5px solid #000" }}>
                  Total Potongan Hutang
                </td>
                <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.5px solid #000" }}>
                  {fmtCurrency(totalLoanDeduction)}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.5px solid #000", background: "#f5f5f5" }}>
                Total Dibayar
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.5px solid #000", background: "#f5f5f5" }}>
                {fmtCurrency(paidAmount)}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 900, padding: "2mm 3mm", fontSize: "11pt", color: "#000", border: "2px solid #000", background: "#e5e5e5" }}>
                Sisa Tagihan
              </td>
              <td style={{ textAlign: "right", fontWeight: 900, padding: "2mm 3mm", fontSize: "11pt", color: "#000", border: "2px solid #000", background: "#e5e5e5" }}>
                {fmtCurrency(remaining)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
          <div style={{ width: "30%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "12mm", textAlign: "center", color: "#000" }}>PETANI</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Tanggal)</p>
          </div>
          <div style={{ width: "30%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "12mm", textAlign: "center", color: "#000" }}>FINANCE</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Yang Menerima)</p>
          </div>
          <div style={{ width: "30%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "12mm", textAlign: "center", color: "#000" }}>MANAGER</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Tanggal)</p>
          </div>
        </div>

        <div style={{ textAlign: "center", borderTop: "2.5px solid #000", paddingTop: "3mm", fontSize: "12pt", fontWeight: 900, letterSpacing: "0.18em" }}>
          <p style={{ color: "#000", margin: 0 }}>LUNAS</p>
        </div>
      </div>
    )
  }
)
