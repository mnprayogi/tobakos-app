"use client"

import { useEffect, useRef } from "react"

export interface SseEvent {
  type: string
  laneId?: number | null
  at: number
}

export function useSse(
  laneId: number | null,
  onEvent: (event: SseEvent) => void
) {
  const cbRef = useRef(onEvent)

  useEffect(() => {
    cbRef.current = onEvent
  })

  useEffect(() => {
    const query = laneId != null ? `?laneId=${laneId}` : ""
    const es = new EventSource(`/api/events${query}`)

    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as SseEvent
        if (parsed && parsed.type) cbRef.current(parsed)
      } catch {
        // event malformed — abaikan
      }
    }

    return () => es.close()
  }, [laneId])
}
