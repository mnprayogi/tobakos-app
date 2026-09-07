import { forwardRef } from "react"
import type { CSSProperties } from "react"
import type { PengantarData } from "@/lib/actions/finance"
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

function signName(name: string | null | undefined): string {
  return name && name.trim() ? name : "……………………"
}

const th: CSSProperties = {
  border: "1.2px solid #000",
  padding: "2mm 3mm",
  fontSize: "9.5pt",
  fontWeight: 800,
  textAlign: "center",
  background: "#e5e5e5",
  color: "#000",
  fontFamily: SANS,
}

const td: CSSProperties = {
  border: "1.2px solid #000",
  padding: "2mm 3mm",
  fontSize: "10pt",
  color: "#000",
  fontFamily: MONO,
}

export const PengantarPrint = forwardRef<HTMLDivElement, PengantarData>(
  function PengantarPrint(props, ref) {
    const {
      transactionCode,
      transactionDate,
      farmerName,
      farmerNik,
      farmerAddress,
      warehouseLabel,
      laneCode,
      totalItems,
      totalNetWeight,
      totalPrice,
      paidAmount,
      remaining,
      approvedBy,
      financeName,
      companyName,
    } = props

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
          <div style={{ width: "32%", fontFamily: SANS }}>
            <div style={{ fontSize: "12pt", fontWeight: 800, letterSpacing: "0.14em", color: "#000" }}>{companyName}</div>
            <div style={{ fontSize: "9pt", fontWeight: 600, color: "#333", marginTop: "1mm" }}>Gudang Tembakau</div>
            <div style={{ fontSize: "9pt", color: "#333", marginTop: "0.5mm" }}>
              {[warehouseLabel, laneCode].filter(Boolean).join(" \u00b7 ") || "TobakOS"}
            </div>
          </div>

          <div style={{ flex: 1, textAlign: "center", fontFamily: SANS }}>
            <h1 style={{ fontSize: "16pt", fontWeight: 800, margin: "0 0 1mm", letterSpacing: "0.12em", color: "#000" }}>
              SURAT PENGANTAR
            </h1>
            <p style={{ fontSize: "11pt", fontWeight: 700, margin: "0 0 1mm", color: "#000" }}>
              PENGAMBILAN UANG PEMBAYARAN
            </p>
            <p style={{ fontSize: "9.5pt", margin: 0, color: "#333" }}>
              No. {transactionCode}
            </p>
          </div>

          <div style={{ width: "32%" }} />
        </div>

        <p
          style={{
            fontSize: "10pt",
            margin: "0 0 4mm",
            color: "#000",
            fontFamily: SANS,
            lineHeight: 1.6,
          }}
        >
          Kepada Yang Terhormat,<br />
          Petugas {companyName} di Gudang <b>{warehouseLabel ?? "\u2014"}</b>
        </p>

        <p style={{ fontSize: "10pt", margin: "0 0 4mm", color: "#000", fontFamily: SANS, lineHeight: 1.6 }}>
          Bersama ini kami mengantar petani di bawah ini untuk mengambil uang pembayaran hasil
          tembakau yang belum dibayar:
        </p>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm", fontFamily: SANS }}>
          <tbody>
            <tr>
              <td style={{ width: "26mm", fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>
                Nama Petani
              </td>
              <td style={{ width: "4mm", padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontWeight: 600 }}>
                {farmerName}
              </td>
              <td style={{ width: "22mm", fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>
                NIK
              </td>
              <td style={{ width: "4mm", padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>{farmerNik ?? "\u2014"}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>No. Transaksi</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontFamily: MONO, fontWeight: 700 }}>
                {transactionCode}
              </td>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Tanggal Transaksi</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>{fmtDate(transactionDate)}</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Alamat</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>{farmerAddress ?? "\u2014"}</td>
              <td style={{ fontWeight: 700, padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>Bale / Netto</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.2mm 1mm", fontSize: "10pt", color: "#000", fontFamily: MONO }}>
                <div>{totalItems} bale</div>
                <div>{totalNetWeight.toFixed(2)} kg</div>
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
            <b style={{ fontFamily: MONO, textTransform: "capitalize" }}>{formatTerbilangRupiah(remaining)}</b>
          </p>
          <p style={{ fontSize: "11pt", margin: "1mm 0 0", color: "#000" }}>
            ({fmtCurrency(remaining)}) untuk dibayarkan kepada <b>{farmerName}</b> atas sisa
            tagihan transaksi <b>{transactionCode}</b>.
          </p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm", fontFamily: SANS }}>
          <tbody>
            <tr>
              <td style={{ width: "62%", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", background: "#f5f5f5" }}>
                Total Harga
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", background: "#f5f5f5", fontFamily: MONO }}>
                {fmtCurrency(totalPrice)}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000" }}>
                Total Dibayar
              </td>
              <td style={{ textAlign: "right", fontWeight: 700, padding: "2mm 3mm", fontSize: "10.5pt", color: "#000", border: "1.2px solid #000", fontFamily: MONO }}>
                {fmtCurrency(paidAmount)}
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 900, padding: "2mm 3mm", fontSize: "11pt", color: "#000", border: "2px solid #000", background: "#e5e5e5" }}>
                Sisa Tagihan Yang Diambil
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
            { role: "FINANCE", name: financeName, caption: "(Yang Menyerahkan Uang)" },
            { role: "MANAGER", name: approvedBy, caption: "(Mengetahui)" },
          ].map((s) => (
            <div key={s.role} style={{ width: "30%", textAlign: "center" }}>
              <p style={{ fontSize: "10.5pt", fontWeight: 800, margin: "0 0 15mm", textAlign: "center", color: "#000" }}>
                {s.role}
              </p>
              <div style={{ borderBottom: "1.5px dashed #000", marginBottom: "1.5mm" }} />
              <p style={{ fontSize: "9pt", fontFamily: MONO, fontWeight: 700, color: "#000", margin: "0 0 1mm" }}>
                {signName(s.name)}
              </p>
              <p style={{ fontSize: "8pt", color: "#333", margin: 0 }}>{s.caption}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", borderTop: "2.5px solid #000", paddingTop: "3mm", fontFamily: SANS }}>
          <p style={{ fontSize: "8pt", color: "#333", margin: 0 }}>Dicetak dari TobakOS</p>
        </div>
      </div>
    )
  }
)
