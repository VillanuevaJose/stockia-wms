'use client'

import { useState } from 'react'
import { Plus, Truck } from '../ui/icons'
import { NuevaCompraDrawer } from './NuevaCompraDrawer'
import type { CompraRow } from '../../lib/queries/operaciones'

interface Props {
  compras: CompraRow[]
  proveedores: { id: string; nombre: string }[]
  productos: { id: string; nombre: string; sku: string; costo: number }[]
  almacenes: { id: string; nombre: string }[]
}

export function ComprasManager({
  compras,
  proveedores,
  productos,
  almacenes,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'RECIBIDA':
        return 'text-[#2E7D32]'
      case 'PENDIENTE':
        return 'text-[#E8A33D]'
      case 'CANCELADA':
        return 'text-[#D32F2F]'
      default:
        return 'text-[#6B7A72]'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B7A72]">
          Gestión de abastecimiento, órdenes de compra y recepción física de mercancía.
        </p>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer"
        >
          <Plus size={14} />
          <span>Nueva Orden de Compra</span>
        </button>
      </div>

      {/* Tabla Compras */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Factura / O.C.</th>
                <th className="py-2.5 px-3.5">Proveedor</th>
                <th className="py-2.5 px-3.5">Solicitante</th>
                <th className="py-2.5 px-3.5 text-right">Monto Total (S/)</th>
                <th className="py-2.5 px-3.5 text-center">Recepción</th>
                <th className="py-2.5 px-3.5 text-right">Fecha Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {compras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7A72]">
                    <Truck size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
                    <p className="text-[13px] font-medium text-[#16201C]">No hay compras registradas</p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5 mb-3">
                      Genera órdenes de compra para abastecer tus almacenes y actualizar costos.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium"
                    >
                      <Plus size={13} />
                      <span>Registrar primera compra</span>
                    </button>
                  </td>
                </tr>
              ) : (
                compras.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-medium whitespace-nowrap">
                      {c.numero_factura}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium max-w-xs truncate">
                      {c.proveedor_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                      {c.solicitante_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums">
                      S/ {c.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${estadoBadge(c.estado)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {c.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-[12px] text-[#6B7A72] tabular-nums whitespace-nowrap">
                      {new Date(c.fecha).toLocaleDateString('es-PE')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NuevaCompraDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        proveedores={proveedores}
        productos={productos}
        almacenes={almacenes}
      />
    </div>
  )
}
