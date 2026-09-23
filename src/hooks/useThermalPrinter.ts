"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export type PrinterTransport = "usb" | "ble"

interface ThermalPrinterState {
  connected: boolean
  deviceName: string | null
  error: string | null
}

const ESC = 0x1b
const GS = 0x1d

const BLE_SERVICE = "0000ff00-0000-1000-8000-00805f9b34fb"
const BLE_WRITE_CHAR = "0000ff01-0000-1000-8000-00805f9b34fb"
const BLE_WRITE_PREFIX = "0000ff01"
const BLE_BLOCK = 20

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
  // Grade line: double height+width + bold, agar mudah dibaca
  parts.push(Uint8Array.from([ESC, 0x45, 0x01])) // bold on
  parts.push(Uint8Array.from([GS, 0x21, 0x11])) // double height+width
  parts.push(enc.encode(`GRADE ${data.grade}\n`))
  parts.push(Uint8Array.from([GS, 0x21, 0x01])) // double height
  parts.push(Uint8Array.from([ESC, 0x45, 0x00])) // bold off
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

async function claimInterfaceAndFindEndpoint(device: USBDevice): Promise<number | null> {
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

async function findBleWriteChar(service: BluetoothRemoteGATTService): Promise<BluetoothRemoteGATTCharacteristic | null> {
  try {
    const char = await service.getCharacteristic(BLE_WRITE_CHAR)
    if (char.properties.write || char.properties.writeWithoutResponse) return char
  } catch {
    // karakteristik standar tidak tersedia — coba scan
  }
  let chars: BluetoothRemoteGATTCharacteristic[] = []
  try {
    chars = await service.getCharacteristics()
  } catch {
    return null
  }
  const prefixed = chars.find((c) => c.uuid.toLowerCase().startsWith(BLE_WRITE_PREFIX))
  if (prefixed) return prefixed
  return chars.find((c) => c.properties.write || c.properties.writeWithoutResponse) ?? null
}

async function discoverBleWriteChar(server: BluetoothRemoteGATTServer): Promise<BluetoothRemoteGATTCharacteristic | null> {
  try {
    const service = await server.getPrimaryService(BLE_SERVICE)
    const char = await findBleWriteChar(service)
    if (char) return char
  } catch {
    // service generik tidak ditemukan — coba enumerasi
  }
  let services: BluetoothRemoteGATTService[] = []
  try {
    services = await server.getPrimaryServices()
  } catch {
    return null
  }
  for (const service of services) {
    if (!service.uuid.toLowerCase().startsWith("0000ff00")) continue
    const char = await findBleWriteChar(service)
    if (char) return char
  }
  return null
}

function describeConnectError(err: unknown, transport: string): string {
  const raw = err instanceof Error ? err.message : String(err)
  const denied =
    err instanceof DOMException && (err.name === "SecurityError" || err.name === "NotAllowedError")
  if (transport === "usb" && (denied || /access|denied/i.test(raw))) {
    const isWindows = typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent)
    return isWindows
      ? "WebUSB diblokir Windows — driver printer menguasai perangkat. Opsi: pakai tab Bluetooth (printer BLE), ganti driver ke WinUSB via Zadig, atau uji di tablet Android."
      : "Perangkat USB sedang dipakai proses/tab lain — tutup tab lain lalu coba lagi."
  }
  return raw || "Gagal terhubung ke printer"
}

export function useThermalPrinter() {
  const [state, setState] = useState<ThermalPrinterState>({
    connected: false,
    deviceName: null,
    error: null,
  })
  const [transport, setTransportState] = useState<PrinterTransport>("usb")

  const deviceRef = useRef<USBDevice | null>(null)
  const endpointRef = useRef<number | null>(null)
  const bleDeviceRef = useRef<BluetoothDevice | null>(null)
  const bleServerRef = useRef<BluetoothRemoteGATTServer | null>(null)
  const bleWriteRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)

  const setTransport = useCallback((t: PrinterTransport) => {
    setTransportState(t)
  }, [])

  const handleGattDisconnected = useCallback(() => {
    bleDeviceRef.current = null
    bleServerRef.current = null
    bleWriteRef.current = null
    setState({ connected: false, deviceName: null, error: "Koneksi printer Bluetooth terputus" })
  }, [])

  const connectUsb = useCallback(async () => {
    const device = await navigator.usb.requestDevice({
      filters: [{ classCode: 7 }],
      exclusionFilters: [{ classCode: 0, subclassCode: 1 }],
    })
    let opened = false
    try {
      if (device.opened) {
        await device.close()
      }
      await device.open()
      opened = true
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
      if (opened) {
        try {
          await device.close()
        } catch {
          // abaikan saat membersihkan
        }
      }
      throw err
    }
  }, [])

  const connectBle = useCallback(async () => {
    if (!("bluetooth" in navigator)) {
      throw new Error("Browser tidak mendukung Web Bluetooth — pakai Chrome/Chromium di Android")
    }
    let device: BluetoothDevice
    try {
      device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE] }],
        optionalServices: [BLE_SERVICE],
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotFoundError") {
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [BLE_SERVICE],
        })
      } else {
        throw err
      }
    }
    if (!device.gatt) throw new Error("Perangkat tidak mengekspos layanan GATT")
    const server = await device.gatt.connect()
    const char = await discoverBleWriteChar(server)
    if (!char) {
      try {
        server.disconnect()
      } catch {
        // abaikan saat membersihkan
      }
      throw new Error("Karakteristik tulis printer BLE tidak ditemukan")
    }
    device.addEventListener("gattserverdisconnected", handleGattDisconnected)
    bleDeviceRef.current = device
    bleServerRef.current = server
    bleWriteRef.current = char
    setState({
      connected: true,
      deviceName: device.name ?? "Printer Bluetooth (BLE)",
      error: null,
    })
  }, [handleGattDisconnected])

  const connect = useCallback(async () => {
    try {
      if (transport === "ble") {
        await connectBle()
      } else {
        await connectUsb()
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        connected: false,
        deviceName: null,
        error: describeConnectError(err, transport),
      }))
    }
  }, [transport, connectBle, connectUsb])

  const disconnect = useCallback(() => {
    const bleDevice = bleDeviceRef.current
    if (bleDevice) {
      try {
        bleDevice.removeEventListener("gattserverdisconnected", handleGattDisconnected)
      } catch {
        // listener mungkin tidak terdaftar
      }
      try {
        if (bleDevice.gatt?.connected) {
          bleDevice.gatt.disconnect()
        }
      } catch {
        // perangkat sudah terputus
      }
    }
    bleDeviceRef.current = null
    bleServerRef.current = null
    bleWriteRef.current = null
    deviceRef.current?.close().catch(() => {})
    deviceRef.current = null
    endpointRef.current = null
    setState({ connected: false, deviceName: null, error: null })
  }, [handleGattDisconnected])

  const writeUsb = useCallback(async (bytes: Uint8Array<ArrayBuffer>): Promise<void> => {
    const device = deviceRef.current
    const endpoint = endpointRef.current
    if (!device || endpoint == null) throw new Error("Printer belum terhubung")
    await device.transferOut(endpoint, bytes)
  }, [])

  const writeBle = useCallback(async (bytes: Uint8Array<ArrayBuffer>): Promise<void> => {
    const server = bleServerRef.current
    const char = bleWriteRef.current
    if (!server?.connected || !char) throw new Error("Printer Bluetooth belum terhubung")
    for (let offset = 0; offset < bytes.length; offset += BLE_BLOCK) {
      const end = Math.min(offset + BLE_BLOCK, bytes.length)
      const chunk = bytes.slice(offset, end)
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(chunk)
      } else {
        await char.writeValueWithResponse(chunk)
      }
    }
  }, [])

  const write = useCallback(
    async (bytes: Uint8Array<ArrayBuffer>): Promise<void> => {
      if (transport === "ble") return writeBle(bytes)
      return writeUsb(bytes)
    },
    [transport, writeBle, writeUsb]
  )

  const printLabel = useCallback(
    async (data: { labelCode: string; farmerName: string | null; grade: string; warehouse: string; lane: string }) => {
      await write(encodeLabel(data))
    },
    [write]
  )

  const printTest = useCallback(async () => {
    await write(encodeTest())
  }, [write])

  const forgetUsbDevice = useCallback(async () => {
    if (!("usb" in navigator)) return
    try {
      const devices = await navigator.usb.getDevices()
      for (const device of devices) {
        await device.forget()
      }
    } catch {
      // melepas izin perangkat diabaikan jika gagal
    }
    deviceRef.current?.close().catch(() => {})
    deviceRef.current = null
    endpointRef.current = null
    setState({ connected: false, deviceName: null, error: null })
  }, [])

  useEffect(() => {
    disconnect()
  }, [transport, disconnect])

  useEffect(() => {
    return () => {
      const bleDevice = bleDeviceRef.current
      if (bleDevice) {
        try {
          bleDevice.removeEventListener("gattserverdisconnected", handleGattDisconnected)
        } catch {
          // abaikan saat unmount
        }
        try {
          if (bleDevice.gatt?.connected) {
            bleDevice.gatt.disconnect()
          }
        } catch {
          // abaikan saat unmount
        }
      }
      deviceRef.current?.close().catch(() => {})
    }
  }, [handleGattDisconnected])

  return { ...state, transport, setTransport, connect, disconnect, forgetUsbDevice, printLabel, printTest }
}
