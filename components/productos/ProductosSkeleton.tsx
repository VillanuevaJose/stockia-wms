import React from 'react'

export function ProductosSkeleton() {
  return (
    <div className="space-y-4 ops-fade-in font-sans">
      <div className="h-12 bg-white rounded-[8px] border border-[#E7E5DF] animate-pulse" />
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] p-4 space-y-3">
        <div className="h-6 bg-[#F4F3EF] rounded-[6px] w-1/4 animate-pulse" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-[#FAFAF7] border border-[#E7E5DF]/60 rounded-[4px] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
