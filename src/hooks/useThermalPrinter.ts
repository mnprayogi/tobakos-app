"use client"

import { useState, useCallback, useRef, useEffect } from "react"

interface ThermalPrinterState {
  connected: boolean
  deviceName: string | null
  error: string | null
}

const ESC = 0x1b
const GS = 0x1d

function textEncoder() {
  return new TextEncoder()
}

function encodeLabel(data: {
  labelCode: string
  farmerName: string | null
  grade: string
  warehouse: string
  lane: string
}): Uint8Array<ArrayBuffer> {
  const enc = textEncoder()
  const parts: Uint8Array[] = []

  parts.push(Uint8Array.from([ESC, 0x40])) // initialize
  parts.push(Uint8Array.from([ESC, 0x33, 0x00])) // line spacing 0
  parts.push(Uint8Array.from([GS, 0x21, 0x00])) // reset char size

  // Large title "TOBAKOS"
  parts.push(Uint8Array.from([GS, 0x21, 0x11])) // double height+width
  parts.push(enc.encode("TOBAKOS\n"))
  parts.push(Uint8Array.from([GS, 0x21, 0x00])) // normal

  // Barcode / label code - big bold
  parts.push(Uint8Array.from([ESC, 0x45, 0x01])) // bold on
  parts.push(Uint8Array.from([GS, 0x21, 0x11])) // double
  parts.push(enc.encode(`${data.labelCode}\n`))
  parts.push(Uint8Array.from([GS, 0x21, 0x00]))
  parts.push(Uint8Array.from([ESC, 0x45, 0x00])) // bold off

  // Metadata
  parts.push(Uint8Array.from([GS, 0x21, 0x01])) // double height
  if (data.farmerName) {
    parts.push(enc.encode(`${data.farmerName}\n`))
  }
  parts.push(enc.encode(`GRADE ${data.grade}\n`))
  parts.push(enc.encode(`${data.warehouse} - ${data.lane}\n`))
  parts.push(Uint8Array.from([GS, 0x21, 0x00]))

  // QR Code via GS ( k (model 2, module 6, error 2)
  const qrData = enc.encode(data.labelCode)
  const qrLen = qrData.length
  // QR function 165 (0xB1): model 2
  parts.push(Uint8Array.from([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]))
  // set module size = 8
  parts.push(Uint8Array.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x08]))
  // error correction level 48 (L)
  parts.push(Uint8Array.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]))
  // store data: pL pH = len+3
  const pL = (qrLen + 3) & 0xff
  const pH = ((qrLen + 3) >> 8) & 0xff
  const storeHead = Uint8Array.from([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30])
  parts.push(storeHead)
  parts.push(qrData)
  // print QR
  parts.push(Uint8Array.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]))

  // feed + cut
  parts.push(Uint8Array.from([ESC, 0x64, 0x04])) // feed 4 lines
  parts.push(Uint8Array.from([GS, 0x56, 0x42])) // partial cut
  parts.push(Uint8Array.from([ESC, 0x40])) // init

  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

function encodeTest(): Uint8Array<ArrayBuffer> {
  const enc = textEncoder()
  const parts: Uint8Array[] = []
  parts.push(Uint8Array.from([ESC, 0x40]))
  parts.push(Uint8Array.from([GS, 0x21, 0x11]))
  parts.push(enc.encode("TOBAKOS TEST\n"))
  parts.push(Uint8Array.from([GS, 0x21, 0x00]))
  parts.push(enc.encode("Printer Thermal OK\n"))
  parts.push(Uint8Array.from([ESC, 0x64, 0x03]))
  parts.push(Uint8Array.from([GS, 0x56, 0x42]))
  parts.push(Uint8Array.from([ESC, 0x40]))
  const total = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

export function useThermalPrinter() {
  const [state, setState] = useState<ThermalPrinterState>({
    connected: false,
    deviceName: null,
    error: null,
  })
  const deviceRef = useRef<USBDevice | null>(null)
  const endpointRef = useRef<number | null>(null)

  const claimInterfaceAndFindEndpoint = async (device: USBDevice): Promise<number | null> => {
    for (const config of device.configurations) {
      for (const iface of config.interfaces) {
        const printerAlt = iface.alternates.find((alt) => alt.interfaceClass === 7)
        if (!printerAlt) continue
        try {
          await device.claimInterface(iface.interfaceNumber)
        } catch {
          // interface mungkin sudah di-claim
        }
        const out = printerAlt.endpoints.find(
          (e) => e.direction === "out" && (e.type === "bulk" || e.type === "interrupt")
        )
        if (out) return out.endpointNumber
      }
    }
    return null
  }

  const connect = useCallback(async () => {
    try {
      const device = await navigator.usb.requestDevice({
        filters: [{ classCode: 7 }],
        exclusionFilters: [{ classCode: 0, subclassCode: 1 }],
      })
      await device.open()
      const endpoint = await claimInterfaceAndFindEndpoint(device)
      if (endpoint == null) {
        throw new Error("Endpoint output printer tidak ditemukan pada perangkat ini")
      }
      deviceRef.current = device
      endpointRef.current = endpoint
      setState({
        connected: true,
        deviceName: device.productName ?? "Printer Thermal",
        error: null,
      })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        connected: false,
        deviceName: null,
        error: (err as Error).message || "Gagal terhubung ke printer",
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    deviceRef.current?.close().catch(() => {})
    deviceRef.current = null
    endpointRef.current = null
    setState({ connected: false, deviceName: null, error: null })
  }, [])

  const write = useCallback(async (bytes: Uint8Array<ArrayBuffer>): Promise<void> => {
    const device = deviceRef.current
    const endpoint = endpointRef.current
    if (!device || endpoint == null) throw new Error("Printer belum terhubung")
    await device.transferOut(endpoint, bytes)
  }, [])

  const printLabel = useCallback(
    async (data: { labelCode: string; farmerName: string | null; grade: string; warehouse: string; lane: string }) => {
      await write(encodeLabel(data))
    },
    [write]
  )

  const printTest = useCallback(async () => {
    await write(encodeTest())
  }, [write])

  useEffect(() => {
    return () => {
      deviceRef.current?.close().catch(() => {})
    }
  }, [])

  return { ...state, connect, disconnect, printLabel, printTest }
}
