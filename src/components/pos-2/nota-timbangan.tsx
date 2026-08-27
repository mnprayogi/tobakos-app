import type { CSSProperties } from "react"
import { QRCodeSVG } from "qrcode.react"
import type { NotaItem } from "@/lib/actions/weighing"
import { formatTerbilangRupiah } from "@/lib/terbilang"

const SANS = "var(--font-sans), system-ui, -apple-system, 'Segoe UI', sans-serif"
const MONO = "var(--font-mono), ui-monospace, 'Cascadia Mono', 'Courier New', monospace"

function fmtCurrency(v: number): string {
  return v.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function signName(name: string | null | undefined): string {
  return name && name.trim() ? name : "\u2026\u2026\u2026\u2026\u2026\u2026"
}

interface Props {
  transactionCode: string
  farmerName: string
  farmerNik: string | null
  warehouse: string
  laneCode: string | null
  createdBy: string | null
  weighedBy: string | null
  approvedBy: string | null
  date: string
  items: NotaItem[]
  totals: NotaItem
}

const th: CSSProperties = {
  border: "1.2px solid #000",
  padding: "1.5mm 1.2mm",
  fontSize: "8pt",
  fontWeight: 800,
  textAlign: "center",
  background: "#d4d4d4",
  color: "#000",
  fontFamily: SANS,
}

const td: CSSProperties = {
  border: "1.2px solid #000",
  padding: "1.5mm 1.2mm",
  fontSize: "9pt",
  color: "#000",
  fontFamily: MONO,
}

export function NotaTimbangan(props: Props) {
  const {
    transactionCode,
    farmerName,
    farmerNik,
    warehouse,
    laneCode,
    createdBy,
    weighedBy,
    approvedBy,
    date,
    items,
    totals,
  } = props

  const d = new Date(date)
  const dateStr = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="print-nota">
      {/* Status Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6mm",
          background: "#fef3c7",
          border: "1px solid #f59e0b",
          borderRadius: "2mm",
          padding: "2mm 4mm",
          marginBottom: "3mm",
          fontFamily: SANS,
        }}
      >
        <span style={{ fontSize: "9pt", fontWeight: 700, color: "#92400e" }}>
          NOTA SEMENTARA
        </span>
        <span style={{ fontSize: "8pt", color: "#92400e" }}>|</span>
        <span style={{ fontSize: "8pt", color: "#92400e" }}>
          Bukan Bukti Pembayaran Resmi
        </span>
        <span style={{ fontSize: "8pt", color: "#92400e" }}>|</span>
        <span
          style={{
            fontSize: "8pt",
            fontWeight: 700,
            color: "#92400e",
            border: "1px solid #f59e0b",
            borderRadius: "1.5mm",
            padding: "0.5mm 2mm",
            background: "#fffbeb",
          }}
        >
          MENUNGGU VERIFIKASI ADMIN
        </span>
      </div>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "2px solid #000",
          paddingBottom: "2mm",
          marginBottom: "3mm",
        }}
      >
        <div style={{ width: "26%", fontFamily: SANS }}>
          <div style={{ fontSize: "11pt", fontWeight: 800, letterSpacing: "0.14em", color: "#000" }}>TOBAKOS</div>
          <div style={{ fontSize: "8.5pt", fontWeight: 600, color: "#333", marginTop: "0.5mm" }}>
            Gudang Tembakau
          </div>
          <div style={{ fontSize: "8.5pt", color: "#333", marginTop: "0.3mm" }}>{warehouse}</div>
        </div>

        <div style={{ flex: 1, textAlign: "center", fontFamily: SANS }}>
          <h1 style={{ fontSize: "14pt", fontWeight: 800, margin: "0 0 0.5mm", letterSpacing: "0.14em", color: "#000" }}>
            NOTA TIMBANGAN
          </h1>
          <p style={{ fontSize: "9.5pt", fontWeight: 600, margin: "0 0 0.5mm", color: "#000" }}>
            Penimbangan Tembakau — Pos 2
          </p>
          <p style={{ fontSize: "8.5pt", margin: 0, color: "#333" }}>{dateStr}</p>
        </div>

        <div style={{ width: "26%", display: "flex", justifyContent: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ background: "#fff", border: "1px solid #000", padding: "2mm", borderRadius: "2mm" }}>
              <QRCodeSVG value={transactionCode} size={65} />
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "8pt",
                fontWeight: 700,
                marginTop: "1mm",
                letterSpacing: "0.04em",
                color: "#000",
              }}
            >
              {transactionCode}
            </div>
          </div>
        </div>
      </div>

      {/* Info Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "3mm", fontFamily: SANS }}>
        <tbody>
          <tr>
            <td style={{ width: "20mm", fontWeight: 700, padding: "1mm", fontSize: "9.5pt", color: "#000" }}>Petani</td>
            <td style={{ width: "4mm", padding: "1mm", fontSize: "9.5pt", color: "#000" }}>:</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000", fontWeight: 600 }}>{farmerName}</td>
            <td style={{ width: "24mm", fontWeight: 700, padding: "1mm", fontSize: "9.5pt", color: "#000" }}>No. Nota</td>
            <td style={{ width: "4mm", padding: "1mm", fontSize: "9.5pt", color: "#000" }}>:</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000", fontFamily: MONO, fontWeight: 700 }}>
              {transactionCode}
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700, padding: "1mm", fontSize: "9.5pt", color: "#000" }}>NIK</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000" }}>:</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000" }}>{farmerNik ?? "\u2014"}</td>
            <td style={{ fontWeight: 700, padding: "1mm", fontSize: "9.5pt", color: "#000" }}>Tanggal</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000" }}>:</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000" }}>{dateStr}</td>
          </tr>
          <tr>
            <td style={{ fontWeight: 700, padding: "1mm", fontSize: "9.5pt", color: "#000" }}>Jalur</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000" }}>:</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000", fontFamily: MONO }}>
              {laneCode ?? "\u2014"}
            </td>
            <td style={{ fontWeight: 700, padding: "1mm", fontSize: "9.5pt", color: "#000" }}>Jml Bale</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000" }}>:</td>
            <td style={{ padding: "1mm", fontSize: "9.5pt", color: "#000", fontFamily: MONO }}>
              {totals.count} bale
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", marginBottom: "3mm" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "8mm" }}>No</th>
            <th style={{ ...th, width: "26mm", textAlign: "left" }}>Grade</th>
            <th style={{ ...th, width: "13mm" }}>Jml</th>
            <th style={{ ...th, width: "17mm" }}>Bruto (kg)</th>
            <th style={{ ...th, width: "17mm" }}>Tara (kg)</th>
            <th style={{ ...th, width: "17mm" }}>Netto (kg)</th>
            <th style={{ ...th, width: "15mm" }}>Komposisi</th>
            <th style={{ ...th, width: "22mm" }}>Harga (Rp/kg)</th>
            <th style={{ ...th }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((g, i) => (
            <tr key={g.grade} style={{ background: i % 2 === 1 ? "#f7f7f7" : "#fff" }}>
              <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
              <td style={{ ...td, textAlign: "left", fontFamily: SANS, fontWeight: 600 }}>{g.grade}</td>
              <td style={{ ...td, textAlign: "right" }}>{g.count}</td>
              <td style={{ ...td, textAlign: "right" }}>{g.totalGross.toFixed(1)}</td>
              <td style={{ ...td, textAlign: "right" }}>{g.totalTara > 0 ? g.totalTara.toFixed(1) : "\u2014"}</td>
              <td style={{ ...td, textAlign: "right" }}>{g.totalNet.toFixed(1)}</td>
              <td style={{ ...td, textAlign: "right" }}>
                {totals.totalNet > 0 ? `${((g.totalNet / totals.totalNet) * 100).toFixed(1)}%` : "\u2014"}
              </td>
              <td style={{ ...td, textAlign: "right", color: "#000" }}></td>
              <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtCurrency(g.totalSubtotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={2}
              style={{
                ...td,
                textAlign: "left",
                fontWeight: 800,
                fontSize: "10pt",
                fontFamily: SANS,
                background: "#efefef",
                borderTop: "2px solid #000",
              }}
            >
              TOTAL
            </td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800, background: "#efefef", borderTop: "2px solid #000" }}>
              {totals.count}
            </td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800, background: "#efefef", borderTop: "2px solid #000" }}>
              {totals.totalGross.toFixed(1)}
            </td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800, background: "#efefef", borderTop: "2px solid #000" }}>
              {totals.totalTara > 0 ? totals.totalTara.toFixed(1) : "\u2014"}
            </td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800, background: "#efefef", borderTop: "2px solid #000" }}>
              {totals.totalNet.toFixed(1)}
            </td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800, background: "#efefef", borderTop: "2px solid #000" }}>
              {totals.totalNet > 0 ? "100%" : "\u2014"}
            </td>
            <td style={{ ...td, textAlign: "right", background: "#efefef", borderTop: "2px solid #000" }}></td>
            <td style={{ ...td, textAlign: "right", fontWeight: 800, background: "#efefef", borderTop: "2px solid #000" }}>
              {fmtCurrency(totals.totalSubtotal)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Terbilang */}
      <div
        style={{
          border: "1.5px solid #000",
          borderRadius: "2mm",
          padding: "2mm 3mm",
          marginBottom: "4mm",
          background: "#f7f7f7",
          fontFamily: SANS,
        }}
      >
        <p style={{ fontSize: "9.5pt", margin: 0, color: "#000" }}>
          <b>Terbilang:</b>{" "}
          <b style={{ fontFamily: MONO, textTransform: "capitalize" }}>{formatTerbilangRupiah(totals.totalSubtotal)}</b>
        </p>
      </div>

      {/* Signatures — 2x2 grid on screen, 4-col on print */}
      <div
        className="signature-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4mm 8mm",
          marginBottom: "4mm",
          fontFamily: SANS,
        }}
      >
        {[
          { role: "PETANI", name: farmerName },
          { role: "GRADER", name: createdBy },
          { role: "OPERATOR TIMBANG", name: weighedBy },
          { role: "MANAGER", name: approvedBy },
        ].map((s) => (
          <div key={s.role} style={{ textAlign: "center" }}>
            <p style={{ fontSize: "9pt", fontWeight: 800, margin: "0 0 5mm", textAlign: "center", color: "#000" }}>
              {s.role}
            </p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "1mm" }} />
            <p style={{ fontSize: "8.5pt", fontFamily: MONO, fontWeight: 700, color: "#000", margin: "0 0 0.5mm" }}>
              {signName(s.name)}
            </p>
            <p style={{ fontSize: "7.5pt", color: "#333", margin: 0 }}>(Tanda tangan &amp; nama jelas)</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", borderTop: "1.5px solid #000", paddingTop: "2mm", fontFamily: SANS }}>
        <p style={{ fontSize: "7.5pt", color: "#333", margin: 0 }}>Dicetak dari TobakOS</p>
      </div>
    </div>
  )
}
