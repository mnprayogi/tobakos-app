export interface ScaleReading {
  value: number
  stable: boolean
}

export interface ScaleFrameParser {
  push(bytes: Uint8Array): ScaleReading[]
}

const STX = 0x02
const CR = 0x0d
const LF = 0x0a

const DECIMALS = 1
const MAX_BUFFER = 512

const FRAME_LEN = 17

function parseToledoFrame(frame: Uint8Array): number | null {
  let raw = ""
  for (let i = 4; i <= 9; i++) raw += String.fromCharCode(frame[i])
  raw = raw.trim()
  if (raw.length === 0) return null
  let negative = false
  if (raw.startsWith("-")) {
    negative = true
    raw = raw.slice(1)
  }
  if (!/^\d+$/.test(raw)) return null
  const value = parseInt(raw, 10) / Math.pow(10, DECIMALS)
  return negative ? -value : value
}

function consumeAsciiLines(buf: number[]): { readings: ScaleReading[]; rest: number[] } {
  const readings: ScaleReading[] = []
  let lastTerm = -1
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === CR || buf[i] === LF) lastTerm = i
  }
  if (lastTerm === -1) return { readings, rest: buf }
  const consumed = buf.slice(0, lastTerm + 1)
  const rest = buf.slice(lastTerm + 1)
  let text = ""
  for (const b of consumed) text += String.fromCharCode(b)
  for (const line of text.split(/[\r\n]+/).filter(Boolean)) {
    const cleaned = line.replace(/[^0-9.\-]/g, "")
    const value = parseFloat(cleaned)
    if (!isNaN(value)) readings.push({ value, stable: false })
  }
  return { readings, rest }
}

export function createScaleFrameParser(): ScaleFrameParser {
  let buffer: number[] = []
  let sawStx = false
  let guard = 0

  const trim = () => {
    if (buffer.length > MAX_BUFFER * 2) {
      const idx = buffer.indexOf(STX)
      buffer = idx >= 0 ? buffer.slice(idx) : []
      sawStx = idx >= 0
    }
  }

  return {
    push(bytes) {
      buffer.push(...bytes)
      const readings: ScaleReading[] = []
      guard = 0

      while (buffer.length > 0 && guard++ < MAX_BUFFER) {
        const stx = buffer.indexOf(STX)
        if (stx === -1) {
          if (!sawStx) {
            const res = consumeAsciiLines(buffer)
            readings.push(...res.readings)
            buffer = res.rest
          }
          break
        }
        if (stx > 0) {
          buffer.splice(0, stx)
          continue
        }
        sawStx = true
        if (buffer.length < FRAME_LEN) break
        if (buffer[FRAME_LEN - 1] !== CR) {
          buffer.splice(0, 1)
          continue
        }
        const frame = new Uint8Array(buffer.slice(0, FRAME_LEN))
        const value = parseToledoFrame(frame)
        if (value != null) readings.push({ value, stable: false })
        buffer.splice(0, FRAME_LEN)
      }

      trim()
      return readings
    },
  }
}