"use client"

import { useCallback, useEffect, useRef } from "react"
import { useSse } from "@/hooks/useSse"
import { usePolling } from "@/hooks/usePolling"
import { REALTIME_INTERVAL_MS } from "@/lib/realtime"

const TRIGGER_EVENTS = new Set([
  "bale.created",
  "bale.deleted",
  "bale.weighed",
  "session.ended",
  "payment.recorded",
  "payment.voided",
  "purchase.approved",
  "purchase.reopened",
  "loan.updated",
])

export function useRealtime(
  laneId: number | null,
  reloads: Array<() => void>,
  intervalMs: number = REALTIME_INTERVAL_MS
) {
  const reloadsRef = useRef(reloads)
  useEffect(() => {
    reloadsRef.current = reloads
  }, [reloads])

  const inflightRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runAll = useCallback(() => {
    if (inflightRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      inflightRef.current = true
      try {
        await Promise.allSettled(reloadsRef.current.map((fn) => fn()))
      } finally {
        inflightRef.current = false
      }
    }, 500)
  }, [])

  useSse(laneId, (event) => {
    if (TRIGGER_EVENTS.has(event.type)) runAll()
  })

  usePolling(runAll, intervalMs, [runAll])
}
