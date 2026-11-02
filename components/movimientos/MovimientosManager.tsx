'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, History } from '../ui/icons'
import { NuevoMovimientoDrawer } from './NuevoMovimientoDrawer'
import type { MovimientoRow } from '../../lib/queries/movimientos'

interface Props {
  movimientos: MovimientoRow[]
  total: number
  productos: { id: string; nombre: string; sku: string; stock: number }[]
  almacenes: { id: string; nombre: string }[]
  tipoActual: string
}

export function MovimientosManager({
  movimientos,
  productos,
  almacenes,
  tipoActual,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()

  const tipoBadge = (tipoItem: string) => {
    switch (tipoItem) {
      case 'ENTRADA':
        return 'text-[#2E7D32]'
      case 'SALIDA':
        return 'text-[#16201C]'
      case 'AJUSTE':
        return 'text-[#E8A33D]'
      case 'TRANSFERENCIA':
        return 'text-[#1565C0]'
      default:
        return 'text-[#6B7A72]'
    }
  }

  const handleFilterTipo = (t: string) => {
    if (t === 'TODOS') {
      router.push('/admin/movimientos')
    } else {
      router.push(`/admin/movimientos?tipo=${t}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Acción */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto text-[12px]">
          {(['TODOS', 'ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleFilterTipo(t)}
              className={`px-3 py-1 rounded-[6px] border font-medium transition-colors ${
                tipoActual === t
                  ? 'border-[#16201C] bg-[#16201C] text-white'
                  : 'border-[#E7E5DF] bg-white text-[#6B7A72] hover:border-[#16201C] hover:text-[#16201C]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={14} />
          <span>Nuevo Movimiento</span>
        </button>
      </div>

      {/* Tabla Kardex */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Tipo</th>
                <th className="py-2.5 px-3.5">Motivo / Operación</th>
                <th className="py-2.5 px-3.5">Origen</th>
                <th className="py-2.5 px-3.5">Destino</th>
                <th className="py-2.5 px-3.5 text-center">Ítems</th>
                <th className="py-2.5 px-3.5">Operador</th>
                <th className="py-2.5 px-3.5 text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7A72]">
                    <History size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
                    <p className="text-[13px] font-medium text-[#16201C]">No hay movimientos registrados en el Kardex</p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5 mb-3">
                      Las entradas, compras, salidas, ventas y ajustes de stock se auditarán aquí.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium"
                    >
                      <Plus size={13} />
                      <span>Registrar primer movimiento</span>
                    </button>
                  </td>
                </tr>
              ) : (
                movimientos.map((mov) => (
                  <tr key={mov.id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold ${tipoBadge(mov.tipo)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {mov.tipo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 max-w-sm truncate font-medium">
                      {mov.motivo}
                      {mov.referencia_tipo && (
                        <span className="ml-2 text-[10px] text-[#6B7A72] font-mono">
                          [{mov.referencia_tipo}]
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                      {mov.almacen_origen_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                      {mov.almacen_destino_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-semibold tabular-nums">
                      {mov.total_items}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                      {mov.usuario_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-[12px] text-[#6B7A72] whitespace-nowrap tabular-nums">
                      {new Date(mov.fecha).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuevoMovimientoDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        productos={productos}
        almacenes={almacenes}
      />
    </div>
  )
}
