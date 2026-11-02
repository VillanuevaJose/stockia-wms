export default function AdminLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-apple-fade">
      {/* Skeleton Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#ebebeb] pb-5">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-[#ebebeb] rounded-full animate-pulse" />
          <div className="h-7 w-64 bg-[#ebebeb] rounded-[6px] animate-pulse" />
          <div className="h-3.5 w-80 bg-[#ebebeb]/70 rounded-[4px] animate-pulse" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-28 bg-[#ebebeb] rounded-[6px] animate-pulse" />
          <div className="h-8 w-36 bg-[#ebebeb] rounded-[6px] animate-pulse" />
        </div>
      </div>

      {/* Skeleton Metric Spine (4 KPI cards) */}
      <div className="bg-white rounded-[8px] border border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#ebebeb] overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-[#ebebeb] rounded-full animate-pulse" />
              <div className="w-4 h-4 bg-[#ebebeb] rounded-full animate-pulse" />
            </div>
            <div className="h-8 w-32 bg-[#ebebeb] rounded-[6px] animate-pulse" />
            <div className="h-3 w-40 bg-[#ebebeb]/70 rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      {/* Skeleton Grid Operativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white rounded-[8px] border border-[#ebebeb] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#ebebeb]">
            <div className="h-4 w-36 bg-[#ebebeb] rounded-full animate-pulse" />
            <div className="h-3 w-16 bg-[#ebebeb] rounded-full animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="h-9 w-full bg-[#fafafa] border border-[#ebebeb]/60 rounded-[6px] animate-pulse" />
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-[8px] border border-[#ebebeb] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#ebebeb]">
            <div className="h-4 w-32 bg-[#ebebeb] rounded-full animate-pulse" />
            <div className="h-3 w-14 bg-[#ebebeb] rounded-full animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-12 w-full bg-[#fafafa] border border-[#ebebeb]/60 rounded-[6px] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
