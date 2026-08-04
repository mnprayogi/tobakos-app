// Event hub real-time (SSE) — in-memory pub/sub.
//
// SINGLE-INSTANCE: modul ini hanya aman karena deploy memakai satu proses
// Next.js (`PM2 instances: 1`). Jika nanti multi-instance, ganti dengan
// pub/sub Redis (mis. ioredis) — event tidak tersinkron antar instance.

export interface SseEvent {
  type: string
  laneId?: number | null
  at: number
}

type Send = (event: SseEvent) => void

const subscribers = new Map<string, Set<Send>>()

function channelFor(laneId: number | null): string[] {
  const channels = ["global"]
  if (laneId != null) channels.push(`lane:${laneId}`)
  return channels
}

export function subscribe(laneId: number | null, send: Send): () => void {
  const channels = channelFor(laneId)
  for (const ch of channels) {
    let set = subscribers.get(ch)
    if (!set) {
      set = new Set()
      subscribers.set(ch, set)
    }
    set.add(send)
  }
  return () => {
    for (const ch of channels) {
      const set = subscribers.get(ch)
      if (!set) continue
      set.delete(send)
      if (set.size === 0) subscribers.delete(ch)
    }
  }
}

export function publishEvent(type: string, laneId?: number | null): void {
  const event: SseEvent = { type, laneId: laneId ?? null, at: Date.now() }
  const channels = channelFor(event.laneId ?? null)
  const sent = new Set<Send>()
  for (const ch of channels) {
    const set = subscribers.get(ch)
    if (!set) continue
    for (const send of set) {
      if (sent.has(send)) continue
      sent.add(send)
      try {
        send(event)
      } catch {
        // koneksi bermasalah — client dianggap hilang
      }
    }
  }
}

export function clientCount(): number {
  const unique = new Set<Send>()
  for (const set of subscribers.values()) {
    for (const s of set) unique.add(s)
  }
  return unique.size
}
