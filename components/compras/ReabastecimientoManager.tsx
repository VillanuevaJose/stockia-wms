'use client'

import { useState, useTransition } from 'react'
import { Search, ShoppingCart, Truck, Check } from '../ui/icons'
import type { ReabastecimientoReporte, SugerenciaReabastecimientoRow } from '@/lib/queries/reabastecimiento'
import { generarCompraRapidaRopAction } from '@/lib/actions/compras'

interface ReabastecimientoManagerProps {
  reporte: ReabastecimientoReporte
  almacenes: Array<{ id: string; nombre: string }>
}

export function ReabastecimientoManager({ reporte, almacenes }: ReabastecimientoManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<'ALERTAS' | 'TODOS' | 'CRITICO' | 'REORDEN' | 'OPTIMO'>('ALERTAS')
  const [selectedAlmacen, setSelectedAlmacen] = useState<string>(almacenes[0]?.id || '')
  const [isPending, startTransition] = useTransition()
  const [comprandoId, setComprandoId] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)

  const articulosFiltrados = reporte.articulos.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase().trim())

    let matchesEstado = true
    if (filterEstado === 'ALERTAS') {
      matchesEstado = item.estado === 'CRITICO' || item.estado === 'REORDEN'
    } else if (filterEstado !== 'TODOS') {
      matchesEstado = item.estado === filterEstado
    }

    return matchesSearch && matchesEstado
  })

  const handleComprarUnClic = (art: SugerenciaReabastecimientoRow) => {
    if (art.cantidad_sugerida <= 0) return
    const confirma = window.confirm(
      `¿Generar Orden de Compra de ${art.cantidad_sugerida} unidades de "${art.nombre}" por S/ ${art.inversion_estimada.toFixed(2)}?`
    )
    if (!confirma) return

    setComprandoId(art.producto_id)
    startTransition(async () => {
      const res = await generarCompraRapidaRopAction({
        producto_id: art.producto_id,
        cantidad: art.cantidad_sugerida,
        costo_unitario: art.costo_unitario,
        proveedor_id: art.proveedor_sugerido_id,
        almacen_id: selectedAlmacen,
      })

      if (res.success) {
        setMensajeExito(`¡Compra registrada con éxito! Se ingresaron ${art.cantidad_sugerida} und al inventario y Kardex.`)
        setTimeout(() => setMensajeExito(null), 5000)
      } else {
        alert(res.error || 'Error al procesar la orden de compra')
      }
      setComprandoId(null)
    })
  }

  const estadoBadge = (estado: SugerenciaReabastecimientoRow['estado']) => {
    switch (estado) {
      case 'CRITICO':
        return 'text-[#D32F2F] bg-[#FFEBEE] border-[#FFCDD2]'
      case 'REORDEN':
        return 'text-[#E8A33D] bg-[#FFF8E1] border-[#FFE082]'
      case 'OPTIMO':
        return 'text-[#2E7D32] bg-[#E8F5E9] border-[#C8E6C9]'
    }
  }

  return (
    <div className="space-y-5">
      {/* Mensaje de Éxito Flotante */}
      {mensajeExito && (
        <div className="bg-[#E8F5E9] border border-[#2E7D32] text-[#2E7D32] px-4 py-3 rounded-[8px] flex items-center justify-between text-[13px] animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span className="font-medium">{mensajeExito}</span>
          </div>
          <button onClick={() => setMensajeExito(null)} className="font-bold cursor-pointer text-xs uppercase">
            Cerrar
          </button>
        </div>
      )}

      {/* Banner Explicativo de la Fórmula ROP */}
      <div className="bg-[#FAFAF7] border border-[#E7E5DF] p-4 rounded-[8px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7A72]">
            Algoritmo de Gestión de Existencias (Punto de Reorden)
          </span>
          <span className="text-[11px] font-mono text-[#6B7A72]">Lead Time Proveedor: 5 días</span>
        </div>
        <p className="text-[12px] text-[#16201C]">
          <strong className="font-mono">ROP = (Demanda Diaria × Lead Time) + Stock de Seguridad</strong>. Cuando el stock actual es menor o igual al ROP, el sistema alerta la necesidad inmediata de reabastecimiento para evitar quiebres operativos.
        </p>
      </div>

      {/* KPIs de Reabastecimiento */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D32F2F]">Quiebre Crítico (0 Stock)</span>
          <p className="text-[20px] font-bold text-[#D32F2F] font-mono tabular-nums mt-1">
            {reporte.kpis.articulos_criticos}
          </p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E8A33D]">En Punto de Reorden</span>
          <p className="text-[20px] font-bold text-[#E8A33D] font-mono tabular-nums mt-1">
            {reporte.kpis.articulos_reorden}
          </p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2E7D32]">Stock Óptimo</span>
          <p className="text-[20px] font-bold text-[#2E7D32] font-mono tabular-nums mt-1">
            {reporte.kpis.articulos_optimos}
          </p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#16201C]">Presupuesto Reposición</span>
          <p className="text-[20px] font-bold text-[#16201C] font-mono tabular-nums mt-1">
            S/ {reporte.kpis.presupuesto_total_sugerido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[8px] border border-[#E7E5DF]">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
          <input
            type="text"
            placeholder="Buscar artículo por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-[6px] border border-[#E7E5DF] focus:border-[#16201C] focus:outline-none bg-white text-[#16201C]"
          />
        </div>

        <div className="flex items-center gap-2">
          {almacenes.length > 1 && (
            <select
              value={selectedAlmacen}
              onChange={(e) => setSelectedAlmacen(e.target.value)}
              className="text-[12px] rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 bg-white text-[#16201C]"
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  Destino: {a.nombre}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 overflow-x-auto">
            {(['ALERTAS', 'TODOS', 'CRITICO', 'REORDEN', 'OPTIMO'] as const).map((fil) => (
              <button
                key={fil}
                type="button"
                onClick={() => setFilterEstado(fil)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer whitespace-nowrap ${
                  filterEstado === fil
                    ? 'bg-[#16201C] text-white'
                    : 'bg-[#FAFAF7] hover:bg-[#E7E5DF] text-[#6B7A72]'
                }`}
              >
                {fil === 'ALERTAS' ? 'Solo Alertas' : fil.charAt(0) + fil.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla de Artículos ROP */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Artículo / SKU</th>
                <th className="py-2.5 px-3 text-right">Stock</th>
                <th className="py-2.5 px-3 text-right">Demanda Diaria</th>
                <th className="py-2.5 px-3 text-right">ROP</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-right">Sugerido</th>
                <th className="py-2.5 px-3 text-right">Inversión (S/)</th>
                <th className="py-2.5 px-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {articulosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7A72]">
                    <ShoppingCart size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
                    <p className="text-[13px] font-medium text-[#16201C]">No se encontraron artículos con este filtro</p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5">
                      Todos los productos están abastecidos de manera óptima o ajusta el término de búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                articulosFiltrados.map((art) => (
                  <tr key={art.producto_id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-medium text-[#16201C]">{art.nombre}</div>
                      <div className="text-[11px] text-[#6B7A72] font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{art.sku}</span>
                        <span>•</span>
                        <span>{art.categoria}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                      <span className={art.stock_actual <= 0 ? 'text-[#D32F2F]' : art.stock_actual <= art.rop ? 'text-[#E8A33D]' : 'text-[#16201C]'}>
                        {art.stock_actual}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#6B7A72]">
                      {art.demanda_diaria} und/d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold tabular-nums">
                      {art.rop}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] border text-[10px] font-bold ${estadoBadge(art.estado)}`}>
                        {art.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[#1565C0]">
                      {art.cantidad_sugerida > 0 ? `+${art.cantidad_sugerida} und` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                      {art.inversion_estimada > 0 ? `S/ ${art.inversion_estimada.toFixed(2)}` : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {art.estado !== 'OPTIMO' ? (
                        <button
                          onClick={() => handleComprarUnClic(art)}
                          disabled={isPending && comprandoId === art.producto_id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium bg-[#16201C] hover:bg-[#2A3B34] text-white rounded-[4px] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Truck size={13} />
                          <span>
                            {comprandoId === art.producto_id ? 'Procesando...' : 'Comprar en 1 Clic'}
                          </span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#2E7D32] font-medium flex items-center justify-center gap-1">
                          <Check size={13} /> Abastecido
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
