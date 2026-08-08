import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: LucideIcon
  title: React.ReactNode
  subtitle?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 bg-panel border border-border rounded-2xl p-4 shadow-sm", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-emerald/15 border border-emerald/30 flex items-center justify-center text-emerald shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-extrabold text-foreground">{title}</h1>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{children}</div>}
    </div>
  )
}
