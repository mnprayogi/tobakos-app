"use client"

import { useEffect, useRef } from "react"

export function usePolling(
  callback: () => Promise<void> | void,
  intervalMs: number,
  deps: React.DependencyList = []
) {
  const cbRef = useRef(callback)

  useEffect(() => {
    cbRef.current = callback
  })

  useEffect(() => {
    let cancelled = false
    let pending = false

    async function run() {
      if (cancelled || document.hidden || pending) return
      pending = true
      try {
        await cbRef.current()
      } catch {
        // polling tidak boleh merusak UI; error ditangani per-callback bila perlu
      } finally {
        pending = false
      }
    }

    run()

    const id = setInterval(run, intervalMs)

    const onVisibility = () => {
      if (!document.hidden) run()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps])
}
