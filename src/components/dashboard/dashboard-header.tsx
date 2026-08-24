"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"
import { LayoutDashboard, Plus } from "lucide-react"
import { PageHeader } from "@/components/shared/page-header"

const ROLE_META: Record<string, { label: string; cls: string }> = {
  GRADER: { label: "Grader", cls: "bg-amber/12 text-amber border-amber/35" },
  OPERATOR: { label: "Operator", cls: "bg-emerald/12 text-emerald border-emerald/35" },
  FINANCE: { label: "Admin Keuangan", cls: "bg-blue/12 text-blue border-blue/35" },
  ADMIN: { label: "Administrator", cls: "bg-emerald/12 text-emerald border-emerald/35" },
  OWNER: { label: "Owner", cls: "bg-muted/12 text-muted-foreground border-border-soft" },
  SUPER_ADMIN: { label: "Super Admin", cls: "bg-red-deduction/12 text-red-deduction border-red-deduction/35" },
}

const QUICK_ACTION: Record<string, { href: string; label: string }> = {
  GRADER: { href: "/pos-1/grading", label: "Input Grade Baru" },
  OPERATOR: { href: "/pos-2/weighing", label: "Mulai Penimbangan" },
  FINANCE: { href: "/admin/transactions", label: "Bayar Nota / Transaksi" },
}

export function DashboardHeader({ userName, role }: { userName: string; role: string }) {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now)

  const timeLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(now)

  const meta = ROLE_META[role] ?? ROLE_META.GRADER
  const action = QUICK_ACTION[role]

  return (
    <PageHeader
      icon={LayoutDashboard}
      title="Dashboard"
      subtitle={`Halo, ${userName} · ${dateLabel}`}
    >
      {action && (
        <Link
          href={action.href}
          className="flex items-center gap-1.5 rounded-lg bg-emerald px-3 py-1.5 text-[11.5px] font-bold text-primary-foreground transition-all hover:bg-emerald/90 active:translate-y-px"
        >
          <Plus className="size-3.5" />
          {action.label}
        </Link>
      )}
      <span
        className={cn("rounded-full border px-2.5 py-1 text-[10.5px] font-bold", meta.cls)}
      >
        {meta.label}
      </span>
      <span className="font-mono text-[13px] font-bold tabular-nums text-muted-2">
        {timeLabel}
      </span>
    </PageHeader>
  )
}
