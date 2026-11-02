'use client'

import React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Plus, Filter, X, FileSpreadsheet } from '../ui/icons'

interface CategoriaItem {
  id: string
  nombre: string
}

interface ProductosFiltrosProps {
  categorias: CategoriaItem[]
  onOpenNuevo: () => void
  onOpenCargaMasiva?: () => void
}

export function ProductosFiltros({
  categorias,
  onOpenNuevo,
  onOpenCargaMasiva,
}: ProductosFiltrosProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get('q') || ''
  const currentCategory = searchParams.get('categoria_id') || 'todas'
  const currentStockBajo = searchParams.get('stock_bajo') === 'true'
  const hasActiveFilters = Boolean(currentSearch || (currentCategory && currentCategory !== 'todas') || currentStockBajo)

  const updateFilters = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'todas') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1') // Reset a página 1 al filtrar
    router.push(`${pathname}?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push(pathname)
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem('q') as HTMLInputElement
    updateFilters('q', input.value.trim() || null)
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[8px] border border-[#E7E5DF] font-sans">
      {/* Grupo de Filtros Izquierdo */}
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {/* Buscador */}
        <form onSubmit={handleSearchSubmit} className="relative min-w-[220px] flex-1 sm:flex-initial">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7A72] pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={currentSearch}
            placeholder="Buscar por SKU, nombre..."
            className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-[#FAFAF7] hover:bg-white focus:bg-white border border-[#E7E5DF] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] rounded-[6px] focus:outline-none text-[#16201C] placeholder:text-[#6B7A72] transition-colors"
          />
        </form>

        {/* Filtro por Categoría */}
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[#6B7A72] hidden sm:block" />
          <select
            value={currentCategory}
            onChange={(e) => updateFilters('categoria_id', e.target.value)}
            className="px-2.5 py-1.5 text-[13px] bg-[#FAFAF7] hover:bg-white focus:bg-white border border-[#E7E5DF] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] rounded-[6px] focus:outline-none text-[#16201C] transition-colors cursor-pointer"
          >
            <option value="todas">Todas las Categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Botón Filtro Rápido: Stock Bajo Mínimo */}
        <button
          type="button"
          onClick={() => updateFilters('stock_bajo', currentStockBajo ? null : 'true')}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors border ${
            currentStockBajo
              ? 'bg-[#FAFAF7] text-[#C97D1A] border-[#C97D1A]'
              : 'bg-[#FAFAF7] text-[#6B7A72] border-[#E7E5DF] hover:text-[#16201C] hover:bg-white'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${currentStockBajo ? 'bg-[#C97D1A]' : 'bg-[#6B7A72]'}`} />
          <span>Bajo Mínimo</span>
        </button>

        {/* Botón Limpiar Filtros cuando hay alguno activo */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[6px] text-[12px] text-[#6B7A72] hover:text-[#16201C] hover:bg-black/[0.04] transition-colors"
            title="Limpiar todos los filtros"
          >
            <X size={12} />
            <span>Limpiar</span>
          </button>
        )}
      </div>

      {/* Botones de Acción: Carga Masiva y Nuevo Producto */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenCargaMasiva && (
          <button
            type="button"
            onClick={onOpenCargaMasiva}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[13px] font-medium bg-[#FAFAF7] text-[#16201C] hover:bg-[#E7E5DF] border border-[#E7E5DF] transition-colors cursor-pointer"
            title="Importar catálogo masivamente desde Excel o archivo CSV"
          >
            <FileSpreadsheet size={14} />
            <span>Carga Masiva</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenNuevo}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium bg-[#16201C] text-[#FAFAF7] hover:bg-black transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A33D]"
        >
          <Plus size={14} strokeWidth={2} />
          <span>Nuevo Producto</span>
        </button>
      </div>
    </div>
  )
}
