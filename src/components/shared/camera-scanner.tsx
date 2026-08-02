"use client"

import { useEffect, useRef } from "react"
import { useBarcodeScan } from "@/hooks/useBarcodeScan"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface CameraScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}

export function CameraScanner({ open, onOpenChange, onDetected }: CameraScannerProps) {
  const { scanning, error, videoRef, startScan, stopScan } = useBarcodeScan()
  const onDetectedRef = useRef(onDetected)

  useEffect(() => {
    onDetectedRef.current = onDetected
  }, [onDetected])

  useEffect(() => {
    if (open) {
      startScan((code) => onDetectedRef.current(code))
    } else {
      stopScan()
    }
    return () => stopScan()
  }, [open, startScan, stopScan])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogTitle>Scan Barcode via Kamera</DialogTitle>
        <DialogDescription>
          Arahkan kamera ke kode QR/barcode pada stiker bale. Hasil akan terisi otomatis.
        </DialogDescription>
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-border">
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[70%] h-[55%] rounded-lg border-2 border-emerald/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {!scanning && !error && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground bg-black/60">
              Menghidupkan kamera\u2026
            </p>
          )}
        </div>
        {error && (
          <p className="text-[11.5px] text-red text-center">
            Gagal mengakses kamera: {error}. Pastikan izin kamera diberikan.
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] text-muted-2">Format: GUDANG-JALUR-TANGGAL-URUTAN</p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-panel-alt px-4 py-2 font-bold text-[12px] text-foreground border border-border-soft cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
