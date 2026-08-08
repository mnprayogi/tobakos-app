"use client"

import { useCallback, useEffect, useState } from "react"
import { Menu, PanelLeft } from "lucide-react"

import { Sidebar } from "@/components/layout/sidebar"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "tobak:sidebar-collapsed"

export function AppShell({
  role,
  userName,
  companyName,
  children,
}: {
  role: string
  userName: string
  companyName: string
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "0") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount hydration of persisted preference
        setCollapsed(false)
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [mobileOpen])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {}
      return next
    })
  }, [])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={role}
        userName={userName}
        companyName={companyName}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={closeMobile}
      />

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center border-b border-border bg-card/80 px-4 backdrop-blur lg:px-7 print:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-2 text-muted-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="-ml-2 hidden text-muted-foreground lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={
              collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"
            }
            title={collapsed ? "Tampilkan sidebar" : "Sembunyikan sidebar"}
          >
            <PanelLeft />
          </Button>
        </header>
        <main className="min-w-0 flex-1 p-4 pb-16 sm:p-5 lg:p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
