import { forwardRef } from "react"
import type { LoanBook } from "@/lib/actions/loans"

function fmtCurrency(v: number): string {
  return v.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

function entryLabel(type: string, method: string | null): string {
  if (type === "DISBURSEMENT") return "PINJAM"
  if (method === "POTONG_TRANSAKSI") return "POTONG TRANSAKSI"
  return "BAYAR TUNAI"
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export const LoanBookPrint = forwardRef<
  HTMLDivElement,
  { book: LoanBook; companyName?: string; userName?: string; printedAt?: Date | null }
>(function LoanBookPrint({ book, companyName = "TobakOS", userName, printedAt }, ref) {
    const opened = new Date(book.openedAt)
    const openedStr = opened.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    const entries = book.entries.filter((e) => !e.voided)

    return (
      <div ref={ref} style={{ width: "100%", maxWidth: "180mm", margin: "0 auto", fontFamily: "'Courier New', Courier, monospace" }}>
        <div style={{ textAlign: "center", marginBottom: "5mm", borderBottom: "2px solid #000", paddingBottom: "3mm" }}>
          <h1 style={{ fontSize: "16pt", fontWeight: 900, margin: "0 0 2mm", letterSpacing: "0.1em", color: "#000" }}>BUKU HUTANG MODAL</h1>
          <p style={{ fontSize: "11pt", fontWeight: 600, margin: "0 0 1mm", color: "#000" }}>{companyName} · {book.warehouseName}</p>
          <p style={{ fontSize: "9pt", color: "#222", margin: 0 }}>Buku ini mencatat seluruh pinjaman modal &amp; pembayarannya per petani</p>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5mm" }}>
          <tbody>
            <tr>
              <td style={{ width: "24mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Petani</td>
              <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000", fontWeight: 600 }}>{book.farmerName}</td>
            </tr>
            <tr>
              <td style={{ width: "24mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>NIK</td>
              <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{book.farmerNik ?? "\u2014"}</td>
            </tr>
            <tr>
              <td style={{ width: "24mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Gudang</td>
              <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000", fontWeight: 600 }}>{book.warehouseName}</td>
            </tr>
            <tr>
              <td style={{ width: "24mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Status</td>
              <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000", fontWeight: 600 }}>
                {book.status === "ACTIVE" && book.balance > 0.005 ? "BERHUTANG" : "LUNAS"}
              </td>
            </tr>
            <tr>
              <td style={{ width: "24mm", fontWeight: 700, padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>Buka</td>
              <td style={{ width: "4mm", padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>:</td>
              <td style={{ padding: "1.5mm 2mm", fontSize: "11pt", color: "#000" }}>{openedStr}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm" }}>
          <thead>
            <tr>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Total Pinjam</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Total Bayar</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Sisa Hutang</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "12pt", fontWeight: 800, color: "#000" }}>{fmtCurrency(book.totalBorrowed)}</td>
              <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "12pt", fontWeight: 800, color: "#000" }}>{fmtCurrency(book.totalRepaid)}</td>
              <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "12pt", fontWeight: 800, color: "#000" }}>{fmtCurrency(book.balance)}</td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm" }}>
          <thead>
            <tr>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Tanggal</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Jenis</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "left", background: "#e5e5e5", color: "#000" }}>Keterangan</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Jumlah</th>
              <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", border: "1.5px solid #000", padding: "4mm 3mm", fontSize: "10pt", color: "#000" }}>Belum ada transaksi pada buku ini.</td>
              </tr>
            )}
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", color: "#000", whiteSpace: "nowrap" }}>
                  {new Date(e.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </td>
                <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", fontWeight: 700, color: "#000" }}>{entryLabel(e.type, e.method)}</td>
                <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", color: "#000" }}>
                  {e.transactionCode ?? e.note ?? "\u2014"}
                </td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", fontWeight: 700, color: "#000" }}>
                  {e.type === "DISBURSEMENT" ? "+" : "\u2212"} {fmtCurrency(e.amount)}
                </td>
                <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", fontWeight: 700, color: "#000" }}>{fmtCurrency(e.balanceAfter)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6mm" }}>
          <div style={{ width: "45%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>PETANI</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Tanggal)</p>
          </div>
          <div style={{ width: "45%" }}>
            <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>PETUGAS GUDANG</p>
            <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
            <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Nama Jelas)</p>
          </div>
        </div>

        <div style={{ textAlign: "center", borderTop: "2.5px solid #000", paddingTop: "3mm", fontSize: "11pt", fontWeight: 700 }}>
          <p style={{ color: "#000" }}>Dicetak dari {companyName}</p>
          {printedAt && (
            <p style={{ fontSize: "9pt", color: "#333", margin: "1mm 0 0" }}>
              Dicetak oleh: {userName ?? "\u2014"} · {fmtDateTime(printedAt)}
            </p>
          )}
        </div>
      </div>
    )
  }
)
