"use client"

import { isRoundMode, type RoundMode } from "@/lib/calculations"
import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const ROUNDING_OPTIONS: { value: RoundMode; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "round", label: "Round" },
  { value: "floor", label: "Floor" },
  { value: "ceil", label: "Ceil" },
]

interface RoundingModeToggleProps {
  value: RoundMode
  onChange: (mode: RoundMode) => void
  className?: string
}

export function RoundingModeToggle({
  value,
  onChange,
  className,
}: RoundingModeToggleProps) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(values) => {
        const nextMode = values[values.length - 1]
        if (isRoundMode(nextMode)) onChange(nextMode)
      }}
      size="sm"
      variant="outline"
      spacing={0}
      aria-label="Pembulatan potongan MC"
      className={cn(
        "h-9 w-full gap-0 [&_[data-slot='toggle-group-item']]:h-full [&_[data-slot='toggle-group-item']]:flex-1 [&_[data-slot='toggle-group-item']]:px-1 [&_[data-slot='toggle-group-item']]:font-semibold [&_[data-slot='toggle-group-item']]:text-muted-foreground",
        "[&_[data-slot='toggle-group-item'][aria-pressed='true']]:border-emerald [&_[data-slot='toggle-group-item'][aria-pressed='true']]:bg-emerald [&_[data-slot='toggle-group-item'][aria-pressed='true']]:font-bold [&_[data-slot='toggle-group-item'][aria-pressed='true']]:text-primary-foreground [&_[data-slot='toggle-group-item'][aria-pressed='true']]:shadow-[0_0_12px_rgba(34,201,141,0.25)] [&_[data-slot='toggle-group-item'][aria-pressed='true']]:hover:bg-emerald/85",
        className
      )}
    >
      {ROUNDING_OPTIONS.map((opt) => (
        <ToggleGroupItem key={opt.value} value={opt.value}>
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
