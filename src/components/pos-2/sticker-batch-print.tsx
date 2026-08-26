import { forwardRef } from "react"
import { QRCodeSVG } from "qrcode.react"

interface StickerItem {
  labelCode: string
  grade: string
  farmerName: string | null
}

export const StickerBatchPrint = forwardRef<
  HTMLDivElement,
  { items: StickerItem[]; warehouse: string; lane: string }
>(function StickerBatchPrint({ items, warehouse, lane }, ref) {
  return (
    <div ref={ref} className="sticker-batch">
      <style>{`
        .sticker-batch {
          font-family: 'Courier New', monospace;
        }
        .sticker-batch-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4mm;
          padding: 10mm;
        }
        .sticker-batch-item {
          width: 100mm;
          height: 60mm;
          border: 0.5pt solid #ccc;
          border-radius: 3mm;
          padding: 3mm 4mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          page-break-inside: avoid;
          background: #fff;
        }
        .sticker-batch-item .qr {
          margin-bottom: 1.5mm;
        }
        .sticker-batch-item .code {
          font-weight: 700;
          font-size: 11pt;
          letter-spacing: 0.04em;
          color: #000;
          text-align: center;
        }
        .sticker-batch-item .farmer {
          font-size: 8pt;
          color: #333;
          text-align: center;
          margin-top: 0.5mm;
        }
        .sticker-batch-item .meta {
          font-size: 7pt;
          color: #555;
          text-align: center;
          margin-top: 0.5mm;
        }
        @media print {
          .sticker-batch {
            background: #fff !important;
          }
          .sticker-batch-grid {
            padding: 5mm !important;
            gap: 3mm !important;
          }
        }
      `}</style>
      <div className="sticker-batch-grid">
        {items.map((item) => (
          <div key={item.labelCode} className="sticker-batch-item">
            <div className="qr">
              <QRCodeSVG value={item.labelCode} size={80} />
            </div>
            <div className="code">{item.labelCode}</div>
            {item.farmerName && (
              <div className="farmer">{item.farmerName}</div>
            )}
            <div className="meta">
              {item.grade} · {warehouse}{lane ? ` · ${lane}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
