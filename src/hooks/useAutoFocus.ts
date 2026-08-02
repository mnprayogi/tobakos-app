"use client"

import { useEffect, useRef } from "react"

export function useAutoFocus() {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.focus()
    }
  })

  return ref
}
