import { forwardRef } from "react"
import type { NotaItem } from "@/lib/actions/weighing"

function fmtCurrency(v: number): string {
  return v.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

interface Props {
  transactionCode: string
  farmerName: string
  farmerNik: string | null
  warehouse: string
  date: string
  items: NotaItem[]
  totals: NotaItem
}

export const NotaTimbangan = forwardRef<HTMLDivElement, Props>(
  function NotaTimbangan(props, ref) {
    const {
      transactionCode,
      farmerName,
      farmerNik,
      warehouse,
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
      <div ref={ref} className="print-nota">
        <div style={{ textAlign: "center", marginBottom: "6mm", borderBottom: "2px solid #000", paddingBottom: "3mm" }}>
          <h1 style={{ fontSize: "18pt", fontWeight: 900, margin: "0 0 2mm", letterSpacing: "0.12em", color: "#000" }}>NOTA SEMENTARA TIMBANGAN</h1>
          <p style={{ fontSize: "11pt", fontWeight: 600, margin: "0 0 1mm", color: "#000" }}>Pos 2: Penimbangan — {warehouse}</p>
          <p style={{ fontSize: "10pt", color: "#222", margin: 0 }}>{dateStr}</p>
          <p style={{ fontSize: "9pt", color: "#b91c1c", marginTop: "3mm", fontStyle: "italic", fontWeight: 600 }}>
            Nota ini bersifat sementara dan bukan merupakan bukti pembayaran resmi.
          </p>
        </div>

        <div style={{ marginBottom: "5mm" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ width: "22mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Petani</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000", fontWeight: 600 }}>{farmerName}</td>
              </tr>
              <tr>
                <td style={{ width: "22mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>NIK</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{farmerNik ?? "\u2014"}</td>
              </tr>
              <tr>
                <td style={{ width: "22mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>No. Nota</td>
                <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
                <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{transactionCode}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm" }}>
          <thead>
            <tr>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>No</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "left", background: "#e5e5e5", color: "#000" }}>Grade</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Jml Bale</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Bruto (kg)</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Tara (kg)</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Netto (kg)</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Komposisi (%)</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g, i) => (
              <tr key={g.grade}>
                <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{i + 1}</td>
                <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{g.grade}</td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{g.count}</td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{g.totalGross.toFixed(1)}</td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{g.totalTara > 0 ? g.totalTara.toFixed(1) : "\u2014"}</td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>{g.totalNet.toFixed(1)}</td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000" }}>
                  {totals.totalNet > 0 ? `${((g.totalNet / totals.totalNet) * 100).toFixed(1)}%` : "\u2014"}
                </td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "10pt", color: "#000", fontWeight: 700 }}>{fmtCurrency(g.totalSubtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} style={{ textAlign: "left", fontWeight: 900, border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "11pt", borderTop: "2.5px solid #000", color: "#000", background: "#f5f5f5" }}>TOTAL</td>
              <td style={{ textAlign: "right", fontWeight: 900, border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "11pt", borderTop: "2.5px solid #000", color: "#000", background: "#f5f5f5" }}>{totals.count}</td>
              <td style={{ textAlign: "right", fontWeight: 900, border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "11pt", borderTop: "2.5px solid #000", color: "#000", background: "#f5f5f5" }}>{totals.totalGross.toFixed(1)}</td>
              <td style={{ textAlign: "right", fontWeight: 900, border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "11pt", borderTop: "2.5px solid #000", color: "#000", background: "#f5f5f5" }}>{totals.totalTara > 0 ? totals.totalTara.toFixed(1) : "\u2014"}</td>
              <td style={{ textAlign: "right", fontWeight: 900, border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "11pt", borderTop: "2.5px solid #000", color: "#000", background: "#f5f5f5" }}>{totals.totalNet.toFixed(1)}</td>
              <td style={{ textAlign: "right", fontWeight: 900, border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "11pt", borderTop: "2.5px solid #000", color: "#000", background: "#f5f5f5" }}>{totals.totalNet > 0 ? "100%" : "\u2014"}</td>
              <td style={{ textAlign: "right", fontWeight: 900, border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "11pt", borderTop: "2.5px solid #000", color: "#000", background: "#f5f5f5" }}>{fmtCurrency(totals.totalSubtotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6mm" }}>
          <div style={{ width: "45%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>APEL</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Tanggal)</p>
          </div>
          <div style={{ width: "45%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>PARAF</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Tanggal)</p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6mm" }}>
          <div style={{ width: "45%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>OPERATOR TIMBANG</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Nama Jelas)</p>
          </div>
          <div style={{ width: "45%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>MANAGER</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Nama Jelas)</p>
          </div>
        </div>

        <div style={{ textAlign: "center", borderTop: "2.5px solid #000", paddingTop: "3mm", fontSize: "11pt", fontWeight: 700 }}>
          <p style={{ color: "#000" }}>Status: MENUNGGU VERIFIKASI ADMIN</p>
        </div>
      </div>
    )
  }
)
