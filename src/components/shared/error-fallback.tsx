"use client"

import { TriangleAlert, RotateCcw } from "lucide-react"

export function ErrorFallback({
  error,
  onRetry,
  title = "Terjadi Kesalahan",
}: {
  error: Error & { digest?: string }
  onRetry?: () => void
  title?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md bg-panel border border-border rounded-2xl p-6 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-deduction/12 border border-red-deduction/30 flex items-center justify-center">
          <TriangleAlert className="w-6 h-6 text-red-deduction" />
        </div>
        <h2 className="font-sans text-lg font-bold text-foreground">{title}</h2>
        <p className="font-sans text-sm text-muted mt-2">
          Halaman gagal dimuat. Coba lagi atau hubungi admin.
        </p>
        {error.message && (
          <p className="mt-4 font-mono text-[12px] text-red-deduction bg-panel-alt border border-border-soft rounded-lg p-3 text-left break-words whitespace-pre-wrap">
            {error.message}
          </p>
        )}
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-muted-2">
            digest: {error.digest}
          </p>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-wf-primary mt-5 inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  )
}
