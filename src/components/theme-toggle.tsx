"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount hydration of theme
    setMounted(true)
  }, [])

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? (isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap") : "Ubah tema"}
      title={mounted ? (isDark ? "Mode terang" : "Mode gelap") : "Ubah tema"}
    >
      {mounted ? (isDark ? <Sun className="size-4" /> : <Moon className="size-4" />) : <span className="size-4" aria-hidden />}
    </Button>
  )
}
