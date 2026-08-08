export function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-2">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}
