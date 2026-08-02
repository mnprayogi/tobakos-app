"use client"

import { useState, useCallback, useRef, useEffect } from "react"

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
  const readingsRef = useRef<number[]>([])
  const lastStableRef = useRef<number | null>(null)
  const stableRef = useRef(false)

  const clearReadings = useCallback(() => {
    readingsRef.current = []
    stableRef.current = false
    setState((prev) => ({ ...prev, stable: false }))
  }, [])

  const readLoop = useCallback(
    async (reader: ReadableStreamDefaultReader) => {
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          const text = new TextDecoder().decode(value)
          const weight = parseFloat(text.replace(/[^0-9.]/g, ""))
          if (!isNaN(weight)) {
            const window = readingsRef.current
            window.push(weight)
            if (window.length > STABLE_WINDOW) window.shift()
            const isStable =
              window.length >= STABLE_WINDOW &&
              window.every((w) => Math.abs(w - window[0]) < 0.05)
            if (isStable && !stableRef.current) {
              lastStableRef.current = window[window.length - 1]
              stableRef.current = true
            }
            setState((prev) => ({ ...prev, weight, stable: isStable }))
          }
        }
      } catch {
        // disconnected
      } finally {
        reader.releaseLock()
      }
    },
    []
  )

  const connect = useCallback(async () => {
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600 })
      portRef.current = port
      clearReadings()
      setState((prev) => ({ ...prev, connected: true, error: null, weight: null }))

      const reader = port.readable?.getReader()
      readerRef.current = reader ?? null

      if (reader) {
        readLoop(reader)
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        connected: false,
        error: (err as Error).message,
      }))
    }
  }, [clearReadings, readLoop])

  const disconnect = useCallback(() => {
    readerRef.current?.cancel()
    portRef.current?.close()
    portRef.current = null
    readerRef.current = null
    clearReadings()
    setState({ weight: null, stable: false, connected: false, error: null })
  }, [clearReadings])

  const capture = useCallback((): number | null => {
    if (stableRef.current && lastStableRef.current != null) {
      return lastStableRef.current
    }
    return state.weight
  }, [state.weight])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return { ...state, connect, disconnect, capture }
}
