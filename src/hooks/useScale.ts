"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createScaleFrameParser } from "@/lib/scale-parser"

interface ScaleState {
  weight: number | null
  stable: boolean
  connected: boolean
  error: string | null
}

const STABLE_WINDOW = 4

export function useScale() {
  const [state, setState] = useState<ScaleState>({
    weight: null,
    stable: false,
    connected: false,
    error: null,
  })
  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null)
  const readLoopPromiseRef = useRef<Promise<void> | null>(null)
  const closedRef = useRef(false)
  const readingsRef = useRef<number[]>([])
  const lastStableRef = useRef<number | null>(null)
  const stableRef = useRef(false)

  const clearReadings = useCallback(() => {
    readingsRef.current = []
    stableRef.current = false
    lastStableRef.current = null
    setState((prev) => ({ ...prev, stable: false }))
  }, [])

  const emitReading = useCallback((weight: number) => {
    const window = readingsRef.current
    window.push(weight)
    if (window.length > STABLE_WINDOW) window.shift()
    const isStable =
      window.length >= STABLE_WINDOW &&
      window.every((w) => Math.abs(w - window[0]) < 0.05)
    if (isStable && !stableRef.current) {
      lastStableRef.current = window[window.length - 1]
    }
    stableRef.current = isStable
    setState((prev) => ({ ...prev, weight, stable: isStable }))
  }, [])

  const readLoop = useCallback(
    async (reader: ReadableStreamDefaultReader) => {
      const parser = createScaleFrameParser()
      try {
        while (!closedRef.current) {
          const { value, done } = await reader.read()
          if (done) break
const readings = parser.push(value)
          for (const r of readings) emitReading(r.value)
        }
      } catch {
        // disconnected
      } finally {
        try {
          reader.releaseLock()
        } catch {
          // ignore
        }
      }
    },
    [emitReading]
  )

  const connect = useCallback(async () => {
    try {
      if (!navigator.serial) {
        throw new Error("WebSerial tidak didukung browser ini")
      }
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })
      portRef.current = port
      closedRef.current = false
      clearReadings()
      setState((prev) => ({ ...prev, connected: true, error: null, weight: null }))

      const reader = port.readable?.getReader()
      readerRef.current = reader ?? null

      if (reader) {
        readLoopPromiseRef.current = readLoop(reader)
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: (err as Error).message,
      }))
    }
  }, [clearReadings, readLoop])

  const disconnect = useCallback(async () => {
    closedRef.current = true
    const reader = readerRef.current
    const port = portRef.current
    const readLoopPromise = readLoopPromiseRef.current
    readerRef.current = null
    portRef.current = null
    readLoopPromiseRef.current = null

    if (reader) {
      try {
        await reader.cancel()
      } catch {
        // ignore
      }
    }
    try {
      await readLoopPromise
    } catch {
      // ignore
    }

    if (port) {
      try {
        await port.close()
      } catch {
        // ignore
      }
    }
    clearReadings()
    setState({ weight: null, stable: false, connected: false, error: null })
  }, [clearReadings])

  const capture = useCallback((): number | null => {
    if (!stableRef.current || lastStableRef.current == null) return null
    return lastStableRef.current
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { ...state, connect, disconnect, capture }
}