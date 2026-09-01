import { forwardRef } from "react"
import type { BankData, BankEntryInfo } from "@/lib/actions/bank"

function fmtCurrency(v: number): string {
  return v.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
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

export const BankBookPrint = forwardRef<
  HTMLDivElement,
  {
    bank: BankData
    companyName?: string
    userName?: string
    printedAt?: Date | null
  }
>(function BankBookPrint({ bank, companyName = "TobakOS", userName, printedAt }, ref) {
  const entries = bank.entries.filter((e) => !e.voided)

  return (
    <div ref={ref} style={{ width: "100%", maxWidth: "180mm", margin: "0 auto", fontFamily: "'Courier New', Courier, monospace" }}>
      <div style={{ textAlign: "center", marginBottom: "5mm", borderBottom: "2px solid #000", paddingBottom: "3mm" }}>
        <h1 style={{ fontSize: "16pt", fontWeight: 900, margin: "0 0 2mm", letterSpacing: "0.1em", color: "#000" }}>BUKU BANK</h1>
        <p style={{ fontSize: "11pt", fontWeight: 600, margin: "0 0 1mm", color: "#000" }}>{companyName}</p>
        <p style={{ fontSize: "9pt", color: "#222", margin: 0 }}>Mutasi Rekening Bank Perusahaan</p>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "6mm" }}>
        <thead>
          <tr>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "left", background: "#e5e5e5", color: "#000" }}>Rekening</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Masuk</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Keluar</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {bank.accounts.map((a) => (
            <tr key={a.account.id}>
              <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 700, color: "#000" }}>
                {a.account.bankName} {a.account.accountNumber} — {a.account.accountName}
              </td>
              <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 700, color: "#000" }}>{fmtCurrency(a.totalMasuk)}</td>
              <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 700, color: "#000" }}>{fmtCurrency(a.totalKeluar)}</td>
              <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 700, color: "#000" }}>{fmtCurrency(a.balance)}</td>
            </tr>
          ))}
          <tr>
            <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, background: "#e5e5e5", color: "#000" }}>TOTAL SEMUA REKENING</td>
            <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, background: "#e5e5e5", color: "#000" }}>{fmtCurrency(bank.totals.totalMasuk)}</td>
            <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, background: "#e5e5e5", color: "#000" }}>{fmtCurrency(bank.totals.totalKeluar)}</td>
            <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, background: "#e5e5e5", color: "#000" }}>{fmtCurrency(bank.totals.balance)}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm" }}>
        <thead>
          <tr>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>No</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "center", background: "#e5e5e5", color: "#000" }}>Tanggal</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "left", background: "#e5e5e5", color: "#000" }}>Rekening</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "left", background: "#e5e5e5", color: "#000" }}>Uraian</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Keluar</th>
            <th style={{ border: "1.5px solid #000", padding: "2.5mm 3mm", fontSize: "10pt", fontWeight: 800, textAlign: "right", background: "#e5e5e5", color: "#000" }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", border: "1.5px solid #000", padding: "4mm 3mm", fontSize: "10pt", color: "#000" }}>Belum ada mutasi bank.</td>
            </tr>
          )}
          {entries.map((e: BankEntryInfo, i: number) => (
            <tr key={e.id}>
              <td style={{ textAlign: "center", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", color: "#000" }}>{i + 1}</td>
              <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", color: "#000", whiteSpace: "nowrap" }}>
                {new Date(e.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </td>
              <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", color: "#000" }}>
                {e.bankAccount.bankName} {e.bankAccount.accountNumber}
              </td>
              <td style={{ textAlign: "left", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", color: "#000" }}>
                {e.refLabel ?? "Mutasi bank"}
                {e.note ? ` — ${e.note}` : ""}
              </td>
              <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", fontWeight: 700, color: "#000" }}>
                {fmtCurrency(e.amount)}
              </td>
              <td style={{ textAlign: "right", border: "1.5px solid #000", padding: "2mm 3mm", fontSize: "9pt", fontWeight: 700, color: "#000" }}>
                {fmtCurrency(e.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6mm" }}>
        <div style={{ width: "45%" }}>
          <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>KEUANGAN / KASIR</p>
          <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
          <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Tanda Tangan &amp; Nama Jelas)</p>
        </div>
        <div style={{ width: "45%" }}>
          <p style={{ fontSize: "12pt", fontWeight: 800, marginBottom: "10mm", textAlign: "center", color: "#000" }}>MENGETAHUI</p>
          <div style={{ borderBottom: "1.5px solid #000", marginBottom: "2mm" }} />
          <p style={{ fontSize: "9pt", color: "#333", textAlign: "center" }}>(Pimpinan / Admin)</p>
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
})
