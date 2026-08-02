"use client"

interface PaginationProps {
  page: number
  pageSize: number
  totalItems: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const navBtn =
  "h-9 min-w-9 px-3 rounded-lg border border-border-soft bg-panel-alt font-bold text-[12px] text-foreground cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"

export function Pagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalItems)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft pt-3 mt-3">
      <div className="flex items-center gap-2">
        <button className={navBtn} disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>
          ← Prev
        </button>
        <button className={navBtn} disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>
          Next →
        </button>
        <span className="text-[11px] font-mono text-muted-2">
          Hal {start}–{end} dari {totalItems}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[10.5px] font-bold uppercase text-muted-2">Per hal</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-9 px-2 rounded-lg border border-border-soft bg-panel-alt text-[12px] font-mono text-foreground outline-none cursor-pointer"
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
