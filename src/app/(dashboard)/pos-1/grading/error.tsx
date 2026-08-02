"use client"

import { useEffect } from "react"
import { ErrorFallback } from "@/components/shared/error-fallback"

export default function GradingError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <ErrorFallback error={error} onRetry={unstable_retry} title="Pos 1 · Grading Error" />
}
