'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  History,
  Package,
  Plus,
  ShoppingCart,
  TrendingUp,
} from '../ui/icons'
import type { DashboardDataPayload, WidgetType } from './types'

interface WidgetRendererProps {
  type: WidgetType
  data: DashboardDataPayload
}

function formatSoles(amount: number): string {
  return amount.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function Flujo7DiasChart({ data }: { data: DashboardDataPayload['flujo7Dias'] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(data.length > 0 ? data.length - 1 : null)

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.ventas, d.compras]),
    100
  )
  const hasActivity = data.some((d) => d.ventas > 0 || d.compras > 0)
  const activeItem = activeIndex !== null ? data[activeIndex] : null

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-4 text-[12px] text-[#6B7A72]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#16201C]">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#16201C]" aria-hidden="true" />
            Ventas
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[#16201C]">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-[#E8A33D]" aria-hidden="true" />
            Compras
          </span>
        </div>

        {activeItem && (
          <div className="text-[12px] text-[#16201C] tabular-nums font-medium bg-[#FAFAF7] border border-[#E7E5DF] rounded-[6px] px-2.5 py-1">
            <span className="text-[#6B7A72] mr-2">{activeItem.etiqueta}:</span>
            <span className="font-semibold mr-3">V: S/ {formatSoles(activeItem.ventas)}</span>
            <span className="font-semibold text-[#C97D1A]">C: S/ {formatSoles(activeItem.compras)}</span>
          </div>
        )}
      </div>

      {!hasActivity ? (
        <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center text-center border border-dashed border-[#E7E5DF] rounded-[6px] p-6">
          <TrendingUp size={20} className="text-[#6B7A72] mb-2" />
          <p className="text-xs font-medium text-[#16201C]">Sin transacciones monetarias en los últimos 7 días</p>
          <p className="text-[11px] text-[#6B7A72] mt-1">
            Registra ventas en el POS o ingresos de compra para visualizar la tendencia diaria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 items-end h-[170px] pt-4 border-b border-[#E7E5DF] pb-2">
          {data.map((day, idx) => {
            const ventasPct = Math.max((day.ventas / maxVal) * 100, day.ventas > 0 ? 6 : 2)
            const comprasPct = Math.max((day.compras / maxVal) * 100, day.compras > 0 ? 6 : 2)
            const isSelected = activeIndex === idx

            return (
              <button
                key={day.fecha}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onFocus={() => setActiveIndex(idx)}
                onClick={() => setActiveIndex(idx)}
                aria-label={`${day.etiqueta}: Ventas S/ ${formatSoles(day.ventas)}, Compras S/ ${formatSoles(day.compras)}`}
                className={`group flex flex-col items-center h-full justify-end rounded-[6px] px-1 pt-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A33D] ${
                  isSelected ? 'bg-[#FAFAF7]' : 'hover:bg-[#FAFAF7]/70'
                }`}
              >
                <div className="w-full flex items-end justify-center gap-1 h-[126px]">
                  <div
                    className="w-2.5 sm:w-3.5 bg-[#16201C] rounded-t-[2px] transition-all duration-200"
                    style={{ height: `${ventasPct}%` }}
                  />
                  <div
                    className="w-2.5 sm:w-3.5 bg-[#E8A33D] rounded-t-[2px] transition-all duration-200"
                    style={{ height: `${comprasPct}%` }}
                  />
                </div>
                <span
                  className={`mt-2 text-[11px] truncate max-w-full ${
                    isSelected ? 'font-bold text-[#16201C]' : 'font-medium text-[#6B7A72]'
                  }`}
                >
                  {day.etiqueta}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DashboardWidgetRenderer({ type, data }: WidgetRendererProps) {
  const { kpis, alertasStock, ultimosMovimientos, flujo7Dias, distribucionCategorias, topProductosValor } = data

  switch (type) {
    case 'kpi-valorizacion':
      return (
        <div className="flex flex-col justify-between h-full">
          <div>
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              Valorización Stock
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium text-[#6B7A72]">S/</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#16201C] tabular-nums tracking-[-0.02em] leading-[1.15]">
                {formatSoles(kpis.valorInventarioSoles)}
              </span>
            </div>
          </div>
          <p className="text-[12px] text-[#6B7A72] mt-3">Costo total consolidado en almacén</p>
        </div>
      )

    case 'kpi-skus':
      return (
        <div className="flex flex-col justify-between h-full">
          <div>
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              SKUs Habilitados
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#16201C] tabular-nums tracking-[-0.02em] leading-[1.15]">
                {kpis.totalProductosActivos}
              </span>
              <span className="text-xs text-[#6B7A72] font-medium">artículos</span>
            </div>
          </div>
          <p className="text-[12px] text-[#6B7A72] mt-3">
            Distribuidos en {kpis.totalCategoriasActivas} categorías activas
          </p>
        </div>
      )

    case 'kpi-stock-bajo':
      return (
        <div className="flex flex-col justify-between h-full">
          <div>
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              Bajo Nivel Mínimo
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-[-0.02em] leading-[1.15] ${
                  kpis.productosStockBajo > 0 ? 'text-[#C93B3B]' : 'text-[#2A7A4C]'
                }`}
              >
                {kpis.productosStockBajo}
              </span>
              <span className="text-xs text-[#6B7A72] font-medium">en riesgo</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[12px] text-[#6B7A72]">Requieren reposición</span>
            <Link
              href="/admin/productos?stock_bajo=true"
              className="text-[12px] font-semibold text-[#16201C] hover:underline"
            >
              Revisar
            </Link>
          </div>
        </div>
      )

    case 'kpi-operaciones':
      return (
        <div className="flex flex-col justify-between h-full">
          <div>
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              Operaciones Hoy
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#16201C] tabular-nums tracking-[-0.02em] leading-[1.15]">
                {kpis.movimientosHoy}
              </span>
              <span className="text-xs text-[#6B7A72] font-medium">movimientos</span>
            </div>
          </div>
          <p className="text-[12px] text-[#6B7A72] mt-3">Ingresos, salidas y traslados del día</p>
        </div>
      )

    case 'kpi-ventas-7d':
      return (
        <div className="flex flex-col justify-between h-full">
          <div>
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              Ventas Últimos 7 Días
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium text-[#6B7A72]">S/</span>
              <span className="text-2xl sm:text-3xl font-bold text-[#16201C] tabular-nums tracking-[-0.02em] leading-[1.15]">
                {formatSoles(kpis.ventasUltimos7DiasSoles)}
              </span>
            </div>
          </div>
          <p className="text-[12px] text-[#6B7A72] mt-3 tabular-nums">
            Compras período: S/ {formatSoles(kpis.comprasUltimos7DiasSoles)}
          </p>
        </div>
      )

    case 'chart-flujo-7d':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-[#16201C] tracking-[-0.02em]">
                Tendencia Ventas vs Compras
              </h2>
              <span className="text-[11px] text-[#6B7A72]">Flujo monetario de los últimos 7 días</span>
            </div>
            <Link href="/admin/ventas" className="text-[12px] font-medium text-[#6B7A72] hover:text-[#16201C]">
              Ver ventas
            </Link>
          </div>
          <Flujo7DiasChart data={flujo7Dias} />
        </div>
      )

    case 'chart-categorias':
      return (
        <div className="flex flex-col justify-between h-full">
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#16201C] tracking-[-0.02em]">
                  Capital por Categoría
                </h2>
                <span className="text-[11px] text-[#6B7A72]">
                  Participación en la valorización total
                </span>
              </div>
              <Link href="/admin/categorias" className="text-[12px] font-medium text-[#6B7A72] hover:text-[#16201C]">
                Categorías
              </Link>
            </div>

            {distribucionCategorias.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#6B7A72] border border-dashed border-[#E7E5DF] rounded-[6px]">
                Sin categorías con stock valorizado.
              </div>
            ) : (
              <div className="space-y-3">
                {distribucionCategorias.map((cat) => (
                  <div key={cat.categoria} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#16201C] truncate max-w-[55%]">
                        {cat.categoria}
                        <span className="text-[#6B7A72] font-normal ml-1.5">({cat.skus})</span>
                      </span>
                      <span className="tabular-nums text-[#16201C] font-medium">
                        S/ {formatSoles(cat.valorSoles)}
                        <span className="text-[#6B7A72] ml-1.5 text-[11px]">{cat.porcentaje}%</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F0EEEA] rounded-[2px] overflow-hidden">
                      <div
                        className="h-full bg-[#16201C] rounded-[2px] transition-all duration-300"
                        style={{ width: `${Math.min(Math.max(cat.porcentaje, 3), 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )

    case 'table-reposicion':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-baseline justify-between pb-3 border-b border-[#E7E5DF] mb-2">
            <div>
              <h2 className="text-base font-bold text-[#16201C] tracking-[-0.02em]">
                Requieren Reposición
              </h2>
              <span className="text-[11px] text-[#6B7A72]">
                {alertasStock.length} artículos en o bajo umbral de seguridad
              </span>
            </div>
            <Link
              href="/admin/productos?stock_bajo=true"
              className="text-[12px] text-[#6B7A72] hover:text-[#16201C] font-medium"
            >
              Ver todos
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] font-semibold uppercase tracking-[0.06em]">
                  <th className="h-9 pr-3">SKU</th>
                  <th className="h-9 px-3">Artículo</th>
                  <th className="h-9 px-3 text-right">Mín.</th>
                  <th className="h-9 px-3 text-right">Actual</th>
                  <th className="h-9 pl-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
                {alertasStock.map((prod) => {
                  const esAgotado = prod.stock <= 0
                  return (
                    <tr key={prod.id} className="h-10 hover:bg-[#FAFAF7] transition-colors">
                      <td className="pr-3 text-xs font-medium text-[#6B7A72] whitespace-nowrap">
                        {prod.sku || 'S/N'}
                      </td>
                      <td className="px-3 max-w-[180px] truncate" title={prod.nombre}>
                        <div className="font-semibold text-[#16201C] text-[13px] truncate">{prod.nombre}</div>
                        <div className="text-[11px] text-[#6B7A72] truncate">{prod.categoria_nombre}</div>
                      </td>
                      <td className="px-3 text-right text-[#6B7A72] tabular-nums">{prod.stock_minimo}</td>
                      <td className="px-3 text-right font-semibold text-[#16201C] tabular-nums">{prod.stock}</td>
                      <td className="pl-3 text-right whitespace-nowrap">
                        {esAgotado ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C93B3B]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C93B3B]" aria-hidden="true" />
                            Agotado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C97D1A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C97D1A]" aria-hidden="true" />
                            Bajo
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {alertasStock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#6B7A72] text-xs">
                      Niveles de existencia estables. No hay alertas críticas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="pt-3 mt-2 border-t border-[#E7E5DF] flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/admin/compras?tab=reabastecimiento"
              className="text-xs text-[#C97D1A] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              Predictor Runway (ROP) <ArrowRight size={12} />
            </Link>
            <Link
              href="/admin/inventario"
              className="text-xs text-[#16201C] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              Consultar inventario físico completo <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )

    case 'feed-movimientos':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-baseline justify-between pb-3 border-b border-[#E7E5DF] mb-2">
            <div>
              <h2 className="text-base font-bold text-[#16201C] tracking-[-0.02em]">
                Últimos Movimientos
              </h2>
              <span className="text-[11px] text-[#6B7A72]">Kardex reciente</span>
            </div>
            <Link href="/admin/movimientos" className="text-[12px] text-[#6B7A72] hover:text-[#16201C] font-medium">
              Auditoría
            </Link>
          </div>

          <div className="divide-y divide-[#E7E5DF] flex-1">
            {ultimosMovimientos.slice(0, 6).map((mov) => (
              <div key={mov.id} className="py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-[0.04em] text-[#16201C] font-semibold">
                    {mov.tipo}
                  </span>
                  <span className="text-[11px] text-[#6B7A72] tabular-nums font-medium">
                    {new Date(mov.fecha).toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-[#6B7A72] text-[12px] font-medium mt-0.5 truncate" title={mov.motivo}>
                  {mov.motivo}
                </p>
              </div>
            ))}

            {ultimosMovimientos.length === 0 && (
              <div className="py-8 text-center text-[#6B7A72] text-xs">
                Sin movimientos registrados recientemente.
              </div>
            )}
          </div>

          <div className="pt-3 mt-2 border-t border-[#E7E5DF] text-right">
            <Link
              href="/admin/movimientos"
              className="text-xs text-[#16201C] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              Abrir registro completo <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )

    case 'top-valor':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-baseline justify-between pb-3 border-b border-[#E7E5DF] mb-2">
            <div>
              <h2 className="text-base font-bold text-[#16201C] tracking-[-0.02em]">
                Top Productos por Capital
              </h2>
              <span className="text-[11px] text-[#6B7A72]">Mayor valor inmovilizado en stock</span>
            </div>
            <Link href="/admin/productos" className="text-[12px] text-[#6B7A72] hover:text-[#16201C] font-medium">
              Catálogo
            </Link>
          </div>

          <div className="divide-y divide-[#E7E5DF] flex-1">
            {topProductosValor.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-[#16201C] truncate">{item.nombre}</div>
                  <div className="text-[11px] text-[#6B7A72] truncate">
                    {item.sku || 'S/N'} · {item.categoria_nombre}
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className="font-bold text-[#16201C]">S/ {formatSoles(item.valorSoles)}</div>
                  <div className="text-[11px] text-[#6B7A72]">{item.stock} und.</div>
                </div>
              </div>
            ))}

            {topProductosValor.length === 0 && (
              <div className="py-8 text-center text-[#6B7A72] text-xs">
                No hay existencias valorizadas todavía.
              </div>
            )}
          </div>
        </div>
      )

    case 'acciones-rapidas':
      return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-[#16201C]">Atajos Operativos</h2>
            <p className="text-[12px] text-[#6B7A72]">Acceso directo a flujos de turno frecuentes</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/vendedor"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px] hover:opacity-90 transition-opacity"
            >
              <ShoppingCart size={14} />
              Nueva Venta (POS)
            </Link>
            <Link
              href="/admin/compras"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#FAFAF7] text-[#16201C] border border-[#E7E5DF] rounded-[6px] hover:bg-[#F4F3EF] transition-colors"
            >
              <Plus size={14} />
              Registrar Compra
            </Link>
            <Link
              href="/admin/inventario"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#FAFAF7] text-[#16201C] border border-[#E7E5DF] rounded-[6px] hover:bg-[#F4F3EF] transition-colors"
            >
              <Boxes size={14} />
              Conteo Físico
            </Link>
            <Link
              href="/admin/movimientos"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#FAFAF7] text-[#16201C] border border-[#E7E5DF] rounded-[6px] hover:bg-[#F4F3EF] transition-colors"
            >
              <History size={14} />
              Kardex
            </Link>
            <Link
              href="/admin/productos"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#FAFAF7] text-[#16201C] border border-[#E7E5DF] rounded-[6px] hover:bg-[#F4F3EF] transition-colors"
            >
              <Package size={14} />
              Productos
            </Link>
          </div>
        </div>
      )

    default:
      return (
        <div className="flex items-center gap-2 text-xs text-[#6B7A72]">
          <AlertTriangle size={14} />
          Widget no reconocido
        </div>
      )
  }
}
