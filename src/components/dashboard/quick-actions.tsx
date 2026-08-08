import Link from "next/link"
import type { LucideIcon } from "lucide-react"

export interface QuickActionItem {
  href: string
  label: string
  desc: string
  icon: LucideIcon
}

export function QuickActions({ items }: { items: QuickActionItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-3 rounded-xl border border-emerald/30 bg-emerald/10 px-4 py-3 transition-colors hover:bg-emerald/15"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald/30 bg-emerald/15 text-emerald">
              <Icon className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13px] font-bold text-emerald">{item.label}</span>
              <span className="text-[11px] text-muted-foreground">{item.desc}</span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
