"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export function PortalHeader({
  companyName,
  userName,
  customerName,
}: {
  companyName: string
  userName: string
  customerName?: string
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/icons/tobakos-logo.png"
            alt={companyName}
            className="h-8 w-8 shrink-0 object-contain"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13.5px] font-extrabold tracking-tight text-foreground">
              Portal Mitra
              <span className="ml-1.5 rounded-md bg-border px-1.5 py-0.5 align-middle font-mono text-[9px] font-bold text-muted-2">
                OS
              </span>
            </p>
            <p className="truncate font-mono text-[10px] text-muted-2">
              {customerName ? `${customerName} · ${userName}` : `${companyName} · ${userName}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 rounded-lg border border-border-soft px-3 py-2 text-[12.5px] font-bold text-red-deduction transition-colors hover:bg-red-deduction/10 hover:border-red-deduction/40 cursor-pointer"
        >
          <LogOut className="size-3.5" />
          Keluar
        </button>
      </div>
    </header>
  )
}
