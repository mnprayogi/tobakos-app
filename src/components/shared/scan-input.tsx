"use client"

import { useCallback, useState } from "react"
import { useAutoFocus } from "@/hooks/useAutoFocus"
import { CameraScanner } from "@/components/shared/camera-scanner"

interface ScanInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ScanInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Scan barcode di sini…",
}: ScanInputProps) {
  const inputRef = useAutoFocus()
  const [cameraOpen, setCameraOpen] = useState(false)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && onSubmit) {
      e.preventDefault()
      onSubmit(value)
    }
  }

  const handleDetected = useCallback(
    (code: string) => {
      setCameraOpen(false)
      onSubmit?.(code)
    },
    [onSubmit]
  )

  return (
    <div className="flex gap-2 mb-3.5">
      <div className="flex-1 relative flex items-center bg-panel-alt border-[1.5px] border-emerald rounded-lg px-3 shadow-[0_0_0_3px_rgba(34,201,141,0.14)]">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="flex-shrink-0 text-emerald"
        >
          <path d="M3 5v14M8 5v14M12 5v14M13 5v14M17 5v14M21 5v14" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-foreground font-mono text-[14px] py-3 px-2 tracking-[0.02em] placeholder:text-muted-2 placeholder:font-sans placeholder:tracking-normal"
          placeholder={placeholder}
        />
        <span className="w-0.5 h-4 bg-emerald animate-pulse ml-[-4px]" />
      </div>
      {!disabled && (
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          className="flex-shrink-0 w-[46px] flex items-center justify-center bg-panel-alt border border-border-soft rounded-lg text-foreground cursor-pointer hover:border-emerald hover:text-emerald"
          title="Scan pakai kamera tablet"
        >
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      )}

      <CameraScanner
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onDetected={handleDetected}
      />
    </div>
  )
}
