export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-48 animate-pulse rounded-md bg-[#182236]" />
        <div className="h-9 w-32 animate-pulse rounded-md bg-[#182236]" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border border-[#1F2B40] bg-[#101828]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-[#1F2B40] bg-[#101828]" />
    </div>
  )
}