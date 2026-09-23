import { QRCodeSVG } from "qrcode.react"
import { cn, fitStickerGradeFontSize } from "@/lib/utils"

export function StickerPreview({
  labelCode,
  grade,
  warehouse,
  lane,
  farmerName,
  size = 100,
  className,
}: {
  labelCode: string
  grade: string
  warehouse: string
  lane?: string
  farmerName?: string
  size?: number
  className?: string
}) {
  const gradeFontSize = fitStickerGradeFontSize(grade, size)
  return (
    <div className={cn("sticker-wf", className)}>
      <div className="absolute top-2 right-2.5 text-[14px] z-10 select-none">🌿</div>
      <div className="flex justify-center mb-2.5">
        <div className="p-1.5 bg-white rounded-lg">
          <QRCodeSVG value={labelCode} size={size} />
        </div>
      </div>
      <div className="sticker-code">{labelCode}</div>
      {farmerName && (
        <div className="text-[10px] text-center text-gray-600 mt-0.5 font-semibold">
          {farmerName}
        </div>
      )}
      <div className="sticker-grade-label">GRADE</div>
      <div className="sticker-grade" style={{ fontSize: gradeFontSize, letterSpacing: 0 }}>
        {grade}
      </div>
      <div className="sticker-meta">
        {warehouse}{lane ? ` · ${lane}` : ""}
      </div>
    </div>
  )
}
