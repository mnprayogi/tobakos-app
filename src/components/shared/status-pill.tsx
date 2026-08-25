import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

type Status = "GRADED" | "WEIGHED" | "CLOSED" | "DRAFT" | "APPROVED" | "PAID" | "PENDING" | "SYNCING" | "VOIDED"

const variantMap: Record<Status, string> = {
  DRAFT: "bg-amber/12 text-amber border-amber/35",
  GRADED: "bg-amber/12 text-amber border-amber/35",
  WEIGHED: "bg-emerald/12 text-emerald border-emerald/35",
  APPROVED: "bg-emerald/12 text-emerald border-emerald/35",
  CLOSED: "bg-blue/12 text-blue border-blue/35",
  PAID: "bg-blue/12 text-blue border-blue/35",
  PENDING: "bg-amber/12 text-amber border-amber/35",
  SYNCING: "bg-blue/12 text-blue border-blue/35",
  VOIDED: "bg-red-deduction/12 text-red-deduction border-red-deduction/35",
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-sans font-bold text-[10.5px] px-[9px] py-[3px] rounded-full tracking-[0.02em] h-auto",
        variantMap[status]
      )}
    >
      {status}
    </Badge>
  )
}
