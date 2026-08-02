"use client"

import { useRef, useState, useCallback } from "react"
import { BrowserQRCodeReader } from "@zxing/browser"

const CAPTURE_WIDTH = 320
const DECODE_INTERVAL_MS = 200

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<string | null>
}

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>
}

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): NativeBarcodeDetector
  getSupportedFormats?: () => Promise<string[]>
}

function createNativeDetector(): Promise<NativeDetector | null> {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
    return Promise.resolve(null)
  }
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector
  if (!Ctor) return Promise.resolve(null)
  return (async () => {
    try {
      const supported = (await Ctor.getSupportedFormats?.()) ?? []
      if (!supported.includes("qr_code")) return null
      const detector = new Ctor({ formats: ["qr_code"] })
      return {
        detect: async (source) => {
          const codes = await detector.detect(source)
          return codes.length > 0 ? codes[0].rawValue : null
        },
      }
    } catch {
      return null
    }
  })()
}

export function useBarcodeScan() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onDetectRef = useRef<((code: string) => void) | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const generationRef = useRef(0)
  const startedRef = useRef(false)

  const stopScan = useCallback(() => {
    generationRef.current += 1
    startedRef.current = false
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setScanning(false)
  }, [])

  const startScan = useCallback(
    async (onDetect?: (code: string) => void) => {
      if (startedRef.current) return
      startedRef.current = true
      if (onDetect) onDetectRef.current = onDetect
      const gen = ++generationRef.current
      setScanning(true)
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (gen !== generationRef.current) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) throw new Error("Elemen video tidak tersedia")
        video.srcObject = stream
        await video.play()
        if (gen !== generationRef.current) return

        const native = await createNativeDetector()
        if (gen !== generationRef.current) return

        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) throw new Error("Canvas 2D tidak didukung")

        const reader = native ? null : new BrowserQRCodeReader()

        timerRef.current = setInterval(() => {
          if (video.readyState < 2 || !video.videoWidth) return
          const cw = CAPTURE_WIDTH
          const ch = Math.max(1, Math.round((cw * video.videoHeight) / Math.max(1, video.videoWidth)))
          canvas.width = cw
          canvas.height = ch
          ctx.drawImage(video, 0, 0, cw, ch)

          const handleCode = (code: string | null) => {
            if (!code || gen !== generationRef.current) return
            const cb = onDetectRef.current
            stopScan()
            cb?.(code)
          }

          if (native) {
            native.detect(canvas).then(handleCode).catch(() => {})
          } else {
            try {
              handleCode(reader!.decodeFromCanvas(canvas).getText())
            } catch {
              // barcode tidak terdeteksi di frame ini
            }
          }
        }, DECODE_INTERVAL_MS)
      } catch (err) {
        startedRef.current = false
        if (gen === generationRef.current) {
          setError((err as Error).message)
          setScanning(false)
        }
      }
    },
    [stopScan]
  )

  return { scanning, error, videoRef, startScan, stopScan }
}
