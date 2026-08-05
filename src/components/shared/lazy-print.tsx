"use client"

import { forwardRef, useEffect, useState } from "react"
import type { ComponentType, Ref } from "react"

export function lazyPrint<P>(loader: () => Promise<ComponentType<P>>) {
  return forwardRef<HTMLDivElement, P>(function LazyPrint(props, ref) {
    const [Loaded, setLoaded] = useState<ComponentType<P> | null>(null)

    useEffect(() => {
      let mounted = true
      loader()
        .then((Comp) => {
          if (mounted) setLoaded(() => Comp)
        })
        .catch(() => {})
      return () => {
        mounted = false
      }
    }, [])

    if (!Loaded) return null
    const Comp = Loaded as unknown as ComponentType<P & { ref?: Ref<HTMLDivElement> }>
    return <Comp {...(props as unknown as P)} ref={ref} />
  })
}
