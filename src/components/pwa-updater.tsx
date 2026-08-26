"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSerwist } from "@serwist/turbopack/react"
import { toast } from "sonner"

export function PwaUpdater() {
  const { serwist } = useSerwist()
  const router = useRouter()

  useEffect(() => {
    if (!serwist) return

    const onWaiting = () => {
      toast.info("Versi baru tersedia", {
        description: "Aplikasi akan dimuat ulang agar versi terbaru aktif.",
        action: {
          label: "Muat Ulang",
          onClick: () => serwist.messageSkipWaiting(),
        },
      })
    }

    const onControlling = (event: { isUpdate?: boolean }) => {
      if (event.isUpdate) {
        router.refresh()
      }
    }

    serwist.addEventListener("waiting", onWaiting)
    serwist.addEventListener("controlling", onControlling)

    return () => {
      serwist.removeEventListener("waiting", onWaiting)
      serwist.removeEventListener("controlling", onControlling)
    }
  }, [serwist, router])

  return null
}
