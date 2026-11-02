'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Edit, Trash2, Package, ChevronLeft, ChevronRight } from '../ui/icons'
import { DesactivarDialog } from './DesactivarDialog'
import type { ProductoRow } from '../../lib/queries/productos'

interface ProductosTablaProps {
  productos: ProductoRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  onEditar: (producto: ProductoRow) => void
}

export function ProductosTabla({
  productos,
  total,
  page,
  pageSize,
  totalPages,
  onEditar,
}: ProductosTablaProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [productoDesactivar, setProductoDesactivar] = useState<ProductoRow | null>(null)

  const cambiarPagina = (nuevaPagina: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', nuevaPagina.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const from = total > 0 ? (page - 1) * pageSize + 1 : 0
  const to = Math.min(page * pageSize, total)

  return (
    <>
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden flex flex-col font-sans">
        {/* Contenedor con scroll y encabezado fijo */}
        <div className="overflow-x-auto max-h-[68vh] relative">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#FAFAF7] z-10 border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] font-semibold uppercase tracking-wider">
              <tr>
                <th className="h-10 px-3.5 font-medium">SKU</th>
                <th className="h-10 px-3.5 font-medium">Descripción / Producto</th>
                <th className="h-10 px-3.5 font-medium">Categoría</th>
                <th className="h-10 px-3.5 font-medium text-center">Unidad</th>
                <th className="h-10 px-3.5 font-medium text-right">Costo (S/)</th>
                <th className="h-10 px-3.5 font-medium text-right">Precio (S/)</th>
                <th className="h-10 px-3.5 font-medium text-right">Mín.</th>
                <th className="h-10 px-3.5 font-medium text-right">Stock</th>
                <th className="h-10 px-3.5 font-medium text-center">Estado</th>
                <th className="h-10 px-3.5 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {productos.map((prod) => {
                const stock = Number(prod.stock) || 0
                const stockMin = Number(prod.stock_minimo) || 0
                const esAgotado = stock <= 0
                const esBajo = stock > 0 && stock <= stockMin

                return (
                  <tr key={prod.id} className="group h-11 hover:bg-[#F4F3EF] transition-colors text-[13px]">
                    {/* SKU en mono discreta */}
                    <td className="px-3.5 font-mono text-xs text-[#16201C] whitespace-nowrap">
                      {prod.sku || 'S/N'}
                    </td>

                    {/* Nombre y detalles */}
                    <td className="px-3.5 min-w-[200px] max-w-[320px]">
                      <div className="font-medium text-[#16201C] truncate" title={prod.nombre}>
                        {prod.nombre}
                      </div>
                      {prod.codigo_barras && (
                        <div className="text-[11px] font-mono text-[#6B7A72]">
                          EAN: {prod.codigo_barras}
                        </div>
                      )}
                    </td>

                    {/* Categoría */}
                    <td className="px-3.5 text-[#6B7A72] whitespace-nowrap text-xs">
                      {prod.categoria?.nombre || 'General'}
                    </td>

                    {/* Unidad */}
                    <td className="px-3.5 text-center font-mono text-[#6B7A72] uppercase text-xs">
                      {prod.unidad_medida?.codigo || 'UND'}
                    </td>

                    {/* Costo alineado a la derecha */}
                    <td className="px-3.5 text-right font-sans text-[#6B7A72] tabular-nums text-xs">
                      {Number(prod.costo || 0).toFixed(2)}
                    </td>

                    {/* Precio Venta alineado a la derecha */}
                    <td className="px-3.5 text-right font-sans font-medium text-[#16201C] tabular-nums text-xs">
                      {Number(prod.precio_venta || prod.precio_soles || 0).toFixed(2)}
                    </td>

                    {/* Stock Mínimo */}
                    <td className="px-3.5 text-right font-sans text-[#6B7A72] tabular-nums text-xs">
                      {stockMin}
                    </td>

                    {/* Stock Total Consolidado */}
                    <td className="px-3.5 text-right font-sans font-medium text-[#16201C] tabular-nums text-xs">
                      {stock}
                    </td>

                    {/* Semáforo de Stock: SOLO punto de color + texto */}
                    <td className="px-3.5 text-center whitespace-nowrap">
                      {esAgotado ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#C93B3B]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C93B3B]" aria-hidden="true" />
                          Agotado
                        </span>
                      ) : esBajo ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#C97D1A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C97D1A]" aria-hidden="true" />
                          Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#2A7A4C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2A7A4C]" aria-hidden="true" />
                          Normal
                        </span>
                      )}
                    </td>

                    {/* Botones de acción: aparecen al pasar el cursor */}
                    <td className="px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => onEditar(prod)}
                          className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-black/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A33D]"
                          title="Editar producto"
                          aria-label={`Editar ${prod.nombre}`}
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductoDesactivar(prod)}
                          className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#C93B3B] hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C93B3B]"
                          title="Desactivar producto"
                          aria-label={`Desactivar ${prod.nombre}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {productos.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#6B7A72]">
                    <Package size={28} className="mx-auto mb-2 text-[#E7E5DF]" />
                    <p className="text-[13px] font-medium text-[#16201C]">No se encontraron artículos</p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5">Ajusta los términos de búsqueda o los filtros.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación al Pie */}
        <div className="p-3 bg-[#FAFAF7] border-t border-[#E7E5DF] flex items-center justify-between text-[12px] text-[#6B7A72] select-none">
          <div className="font-sans text-[11px] tabular-nums">
            Mostrando <span className="font-semibold text-[#16201C]">{from}</span> a <span className="font-semibold text-[#16201C]">{to}</span> de <span className="font-semibold text-[#16201C]">{total}</span> artículos
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => cambiarPagina(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded-[4px] border border-[#E7E5DF] bg-white hover:bg-[#F4F3EF] disabled:opacity-30 disabled:cursor-not-allowed text-[#16201C] transition-colors cursor-pointer"
              title="Página anterior"
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-sans text-[11px] text-[#6B7A72] tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => cambiarPagina(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-[4px] border border-[#E7E5DF] bg-white hover:bg-[#F4F3EF] disabled:opacity-30 disabled:cursor-not-allowed text-[#16201C] transition-colors cursor-pointer"
              title="Página siguiente"
              aria-label="Página siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Diálogo accesible de desactivación */}
      <DesactivarDialog
        producto={productoDesactivar}
        isOpen={Boolean(productoDesactivar)}
        onClose={() => setProductoDesactivar(null)}
      />
    </>
  )
}
