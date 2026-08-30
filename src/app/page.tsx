"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

const ROLE_REDIRECT: Record<string, string> = {
  CUSTOMER: "/portal",
  GRADER: "/pos-1/grading",
  OPERATOR: "/pos-2",
  ADMIN: "/dashboard",
  FINANCE: "/dashboard",
  OWNER: "/dashboard",
  SUPER_ADMIN: "/dashboard",
}

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" })
        if (cancelled) return
        const session = await res.json()

        if (!session?.user) {
          router.replace("/login")
          return
        }

        const target = ROLE_REDIRECT[session.user.role] ?? "/login"
        router.replace(target)
      } catch {
        if (!cancelled) router.replace("/login")
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-background px-6">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
        <span className="text-2xl font-bold text-emerald">T</span>
      </div>
      <div className="space-y-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">TobakOS</h1>
        <p className="text-sm text-muted-2">Memuat aplikasi...</p>
      </div>
    </div>
  )
}
