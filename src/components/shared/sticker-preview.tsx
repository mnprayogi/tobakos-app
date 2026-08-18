import { QRCodeSVG } from "qrcode.react"
import { cn } from "@/lib/utils"

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
      <div className="sticker-meta">
        GRADE {grade} · {warehouse}{lane ? ` · ${lane}` : ""}
      </div>
    </div>
  )
}
