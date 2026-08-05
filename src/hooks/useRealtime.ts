"use client"

import { useCallback, useEffect, useRef } from "react"
import { useSse } from "@/hooks/useSse"
import { usePolling } from "@/hooks/usePolling"
import { REALTIME_INTERVAL_MS } from "@/lib/realtime"

const TRIGGER_EVENTS = new Set(["bale.created", "bale.deleted", "bale.weighed", "session.ended"])

export function useRealtime(
  laneId: number | null,
  reloads: Array<() => void>,
  intervalMs: number = REALTIME_INTERVAL_MS
) {
  const reloadsRef = useRef(reloads)
  useEffect(() => {
    reloadsRef.current = reloads
  }, [reloads])

  const runAll = useCallback(async () => {
    await Promise.allSettled(reloadsRef.current.map((fn) => fn()))
  }, [])

  useSse(laneId, (event) => {
    if (TRIGGER_EVENTS.has(event.type)) runAll()
  })

  usePolling(runAll, intervalMs, [runAll])
}
