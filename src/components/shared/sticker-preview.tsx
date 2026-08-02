import { QRCodeSVG } from "qrcode.react"

export function StickerPreview({
  labelCode,
  grade,
  warehouse,
  lane,
  farmerName,
}: {
  labelCode: string
  grade: string
  warehouse: string
  lane?: string
  farmerName?: string
}) {
  return (
    <div className="sticker-wf">
      <div className="absolute top-2 right-2.5 text-[14px] z-10 select-none">🌿</div>
      <div className="flex justify-center mb-2.5">
        <div className="p-1.5 bg-white rounded-lg">
          <QRCodeSVG value={labelCode} size={100} />
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
