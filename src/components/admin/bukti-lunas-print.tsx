import { forwardRef } from "react"
import type { CSSProperties } from "react"
import { QRCodeSVG } from "qrcode.react"
import type { BuktiData } from "@/lib/actions/finance"
import { formatTerbilangRupiah } from "@/lib/terbilang"

const SANS = "var(--font-sans), system-ui, -apple-system, 'Segoe UI', sans-serif"
const MONO = "var(--font-mono), ui-monospace, 'Cascadia Mono', 'Courier New', monospace"

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

function signName(name: string | null | undefined): string {
  return name && name.trim() ? name : "……………………"
}

const th: CSSProperties = {
  border: "1.2px solid #000",
  padding: "2mm 2mm",
  fontSize: "9pt",
  fontWeight: 800,
  textAlign: "center",
  background: "#e5e5e5",
  color: "#000",
  fontFamily: SANS,
}

const td: CSSProperties = {
  border: "1.2px solid #000",
  padding: "1.8mm 2mm",
  fontSize: "9.5pt",
  color: "#000",
  fontFamily: MONO,
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
      paidBy,
      approvedBy,
      lastPaidAt,
      payments,
    } = props

    const adaNego =
      originalTotalPrice != null && Math.abs(originalTotalPrice - totalPrice) > 0.005

    return (
      <div ref={ref} className="print-nota">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "2.5px solid #000",
            paddingBottom: "3mm",
            marginBottom: "5mm",
          }}
        >
          <div style={{ width: "26%", fontFamily: SANS }}>
            <div style={{ fontSize: "12pt", fontWeight: 800, letterSpacing: "0.14em", color: "#000" }}>TOBAKOS</div>
            <div style={{ fontSize: "9pt", fontWeight: 600, color: "#333", marginTop: "1mm" }}>Gudang Tembakau</div>
            <div style={{ fontSize: "9pt", color: "#333", marginTop: "0.5mm" }}>
              {[warehouseLabel, laneCode].filter(Boolean).join(" \u00b7 ") || "TobakOS"}
            </div>
          </div>

          <div style={{ flex: 1, textAlign: "center", fontFamily: SANS }}>
            <h1 style={{ fontSize: "18pt", fontWeight: 800, margin: "0 0 1mm", letterSpacing: "0.16em", color: "#000" }}>
              BUKTI LUNAS
            </h1>
            <p style={{ fontSize: "10.5pt", fontWeight: 600, margin: "0 0 1mm", color: "#000" }}>
              KWITANSI PELUNASAN PEMBAYARAN
            </p>
            <p style={{ fontSize: "9.5pt", margin: 0, color: "#333" }}>
              Dibayar pada {fmtDate(lastPaidAt)}
            </p>
          </div>

          <div style={{ width: "26%", display: "flex", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ background: "#fff", border: "1px solid #000", padding: "2.5mm", borderRadius: "2mm" }}>
                <QRCodeSVG value={transactionCode} size={80} />
              </div>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: "8.5pt",
                  fontWeight: 700,
                  marginTop: "1.5mm",
                  letterSpacing: "0.04em",
                  color: "#000",
                }}
              >
                {transactionCode}
              </div>
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm", fontFamily: SANS }}>
          <tbody>
            <tr>
              <td style={{ width: "24mm", fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>No. Kwitansi</td>
              <td style={{ width: "4mm", padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontFamily: MONO, fontWeight: 700 }}>
                {transactionCode}
              </td>
              <td style={{ width: "22mm", fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Tanggal</td>
              <td style={{ width: "4mm", padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>{fmtDate(lastPaidAt)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Petani</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontWeight: 600 }}>{farmerName}</td>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>NIK</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>{farmerNik ?? "\u2014"}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Kode Transaksi</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontFamily: MONO, fontWeight: 700 }}>
                {transactionCode}
              </td>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Tanggal Transaksi</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>{fmtDate(transactionDate)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Bale / Netto</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontFamily: MONO }}>
                {totalItems} bale · {totalNetWeight.toFixed(2)} kg
              </td>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Dibayar oleh</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontWeight: 600 }}>
                {paidBy ?? "\u2014"}
              </td>
            </tr>
          </tbody>
        </table>

        <div
          style={{
            border: "2px solid #000",
            borderRadius: "3mm",
            padding: "3mm 4mm",
            marginBottom: "5mm",
            background: "#f5f5f5",
            fontFamily: SANS,
          }}
        >
          <p style={{ fontSize: "11pt", margin: 0, color: "#000" }}>
            <b>Sejumlah uang:</b>{" "}
            <b style={{ fontFamily: MONO, textTransform: "capitalize" }}>{formatTerbilangRupiah(paidAmount)}</b>
          </p>
          <p style={{ fontSize: "11pt", margin: "1mm 0 0", color: "#000" }}>
            untuk pelunasan pembelian tembakau <b>{transactionCode}</b> atas nama <b>{farmerName}</b>.
          </p>
        </div>

        {payments.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm" }}>
            <thead>
              <tr>
                <th style={{ ...th, width: "8mm" }}>No</th>
                <th style={{ ...th }}>Tanggal</th>
                <th style={{ ...th }}>Metode</th>
                <th style={{ ...th }}>Tunai</th>
                <th style={{ ...th }}>Potongan Hutang</th>
                <th style={{ ...th, textAlign: "left" }}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay, i) => (
                <tr key={pay.id} style={{ background: i % 2 === 1 ? "#f7f7f7" : "#fff" }}>
                  <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
                  <td style={{ ...td, textAlign: "center", fontFamily: SANS }}>{fmtDateTime(pay.paidAt)}</td>
                  <td style={{ ...td, textAlign: "center", fontFamily: SANS }}>{pay.method}</td>
                  <td style={{ ...td, textAlign: "right" }}>{fmtCurrency(pay.amount)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {pay.loanDeduction > 0 ? fmtCurrency(pay.loanDeduction) : "\u2014"}
                  </td>
                  <td style={{ ...td, textAlign: "left", fontFamily: SANS }}>{pay.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm", fontFamily: SANS }}>
          <tbody>
            <tr>
              <td style={{ width: "62%", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", background: "#f5f5f5" }}>
                Total Harga
                {adaNego && (
                  <span style={{ display: "block", fontSize: "9pt", fontWeight: 400, textDecoration: "line-through", color: "#444" }}>
                    Harga awal {fmtCurrency(originalTotalPrice!)}
                  </span>
                )}
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", background: "#f5f5f5", fontFamily: MONO }}>
                {fmtCurrency(totalPrice)}
              </td>
            </tr>
            {totalLoanDeduction > 0 && (
              <tr>
                <td style={{ fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000" }}>
                  Total Potongan Hutang
                </td>
                <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", fontFamily: MONO }}>
                  {fmtCurrency(totalLoanDeduction)}
                </td>
              </tr>
            )}
            <tr>
              <td style={{ fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", background: "#f5f5f5" }}>
                Total Dibayar
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", background: "#f5f5f5", fontFamily: MONO }}>
                {fmtCurrency(paidAmount)}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 900, padding: "2mm 3mm", fontSize: "11pt", color: "#000", border: "2px solid #000", background: "#e5e5e5" }}>
                Sisa Tagihan
              </td>
              <td style={{ textAlign: "right", fontWeight: 900, padding: "2mm 3mm", fontSize: "11pt", color: "#000", border: "2px solid #000", background: "#e5e5e5", fontFamily: MONO }}>
                {fmtCurrency(remaining)}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm", fontFamily: SANS }}>
          {[
            { role: "PETANI", name: farmerName, caption: "(Tanda tangan & tanggal)" },
            { role: "FINANCE", name: paidBy, caption: "(Yang Menerima)" },
            { role: "MANAGER", name: approvedBy, caption: "(Tanda tangan & tanggal)" },
          ].map((s) => (
            <div key={s.role} style={{ width: "30%", textAlign: "center" }}>
              <p style={{ fontSize: "10.5pt", fontWeight: 800, margin: "0 0 12mm", textAlign: "center", color: "#000" }}>
                {s.role}
              </p>
              <div style={{ borderBottom: "1.5px solid #000", marginBottom: "1.5mm" }} />
              <p style={{ fontSize: "9pt", fontFamily: MONO, fontWeight: 700, color: "#000", margin: "0 0 1mm" }}>
                {signName(s.name)}
              </p>
              <p style={{ fontSize: "8pt", color: "#333", margin: 0 }}>{s.caption}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", borderTop: "2.5px solid #000", paddingTop: "3mm", fontFamily: SANS }}>
          <p style={{ fontSize: "14pt", fontWeight: 900, letterSpacing: "0.2em", color: "#000", margin: 0 }}>LUNAS</p>
          <p style={{ fontSize: "8pt", color: "#333", margin: "2mm 0 0" }}>Dicetak dari TobakOS</p>
        </div>
      </div>
    )
  }
)
