"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"
import { useQueueStore } from "@/lib/queue"
import { saveGrade } from "@/lib/actions/grading"
import { saveWeighData } from "@/lib/actions/weighing"

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true
  const msg = err instanceof Error ? err.message : String(err)
  return /fetch failed|failed to fetch|network error|load failed|econnreset|enotfound|timeout|offline/i.test(msg)
}

export function useOfflineQueue() {
  const pending = useQueueStore((s) => s.pending)
  const online = useQueueStore((s) => s.online)
  const setOnline = useQueueStore((s) => s.setOnline)
  const enqueue = useQueueStore((s) => s.enqueue)
  const flushing = useRef(false)

  async function flush() {
    if (flushing.current) return
    flushing.current = true
    try {
      const actions = useQueueStore.getState().pending
      for (const action of actions) {
        try {
          if (action.type === "GRADE") {
            await saveGrade(action.payload)
          } else {
            await saveWeighData(action.payload)
          }
          useQueueStore.getState().remove(action.id)
          toast.success(action.type === "GRADE" ? "Bale ter-sinkron ke server" : "Data timbang ter-sinkron")
        } catch (err) {
          if (isNetworkError(err)) break
          useQueueStore.getState().remove(action.id)
          toast.error(`Sinkron gagal: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    } finally {
      flushing.current = false
    }
  }

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      flush()
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine && useQueueStore.getState().pending.length > 0) {
        flush()
      }
    }, 15000)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [setOnline])

  return { pending, pendingCount: pending.length, online, enqueue, flush }
}
