import type { RefObject } from "react"
import { useReactToPrint } from "react-to-print"

function resolveSystemFonts(): string {
  if (typeof window === "undefined") return ""
  const root = getComputedStyle(document.documentElement)
  const sans = root.getPropertyValue("--font-sans").trim()
  const mono = root.getPropertyValue("--font-mono").trim()
  return `:root { --font-sans: ${sans || "system-ui, -apple-system, 'Segoe UI', sans-serif"}; --font-mono: ${mono || "ui-monospace, 'Cascadia Mono', 'Courier New', monospace"}; }`
}

export const printBaseStyle = `
  @page { margin: 12mm; size: A4 portrait; }
  body {
    background: #fff !important;
    color: #000 !important;
    font-family: var(--font-sans), system-ui, -apple-system, 'Segoe UI', sans-serif !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    margin: 0;
    padding: 0;
  }
  .print-nota {
    width: 100%;
    max-width: 170mm;
    margin: 0 auto;
    font-family: var(--font-sans), system-ui, -apple-system, 'Segoe UI', sans-serif !important;
  }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  h1, h1 * { color: #000 !important; }
  p, td, th, span, div {
    color: #000 !important;
  }
`

export const thermalStickerPageStyle = `
  @page { margin: 0; size: 100mm 60mm; }
  body {
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    margin: 0;
    padding: 0;
  }
`

export interface UsePrintDocumentOptions {
  documentTitle?: string | (() => string)
  onAfterPrint?: () => void
}

/**
 * Wrapper seragam untuk mencetak konten ref dengan react-to-print.
 * Konten dicetak dalam iframe putih (tanpa sidebar & tema gelap).
 * Harus dipanggil dari komponen "use client".
 */
export function usePrintDocument(ref: RefObject<HTMLDivElement | null>, pageStyle: string, options: UsePrintDocumentOptions = {}) {
  return useReactToPrint({
    contentRef: ref,
    pageStyle: resolveSystemFonts() + pageStyle,
    documentTitle: options.documentTitle,
    onAfterPrint: options.onAfterPrint,
  })
}
