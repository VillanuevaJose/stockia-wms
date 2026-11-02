import Link from 'next/link'
import { getInventarioFisico } from '../../../lib/queries/operaciones'
import { Boxes, Plus } from '../../../components/ui/icons'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const { inventario, totales } = await getInventarioFisico()

  const semaforoStock = (estado: string) => {
    switch (estado) {
      case 'CRITICO':
        return { dot: 'bg-[#D32F2F]', text: 'text-[#D32F2F]', label: 'Crítico' }
      case 'BAJO':
        return { dot: 'bg-[#E8A33D]', text: 'text-[#E8A33D]', label: 'Bajo Mínimo' }
      default:
        return { dot: 'bg-[#2E7D32]', text: 'text-[#2E7D32]', label: 'Óptimo' }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Inventario Físico
            </h1>
            <p className="text-[13px] text-[#6B7A72] mt-1">
              Existencias por sede en tiempo real, valorización total y control de roturas de stock.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/reportes/inventario"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] hover:border-[#16201C] bg-white text-[#16201C] text-[13px] font-medium transition-colors"
            >
              Exportar CSV
            </a>
            <Link
              href="/admin/productos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors"
            >
              <Plus size={14} />
              <span>Nuevo Producto</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3 Cifras Grandes Tipográficas sin Caja (Editorial) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E7E5DF] py-2 border-b border-[#E7E5DF]">
        <div className="py-2 sm:py-0 sm:px-4 first:pl-0">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B7A72]">
            Valorización Total
          </span>
          <div className="text-[28px] font-bold text-[#16201C] font-mono tabular-nums leading-tight mt-1">
            S/ {totales.valorTotalSoles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="py-2 sm:py-0 sm:px-4">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B7A72]">
            Unidades en Custodia
          </span>
          <div className="text-[28px] font-bold text-[#16201C] font-mono tabular-nums leading-tight mt-1">
            {totales.totalArticulos}
          </div>
        </div>

        <div className="py-2 sm:py-0 sm:px-4 last:pr-0">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#6B7A72]">
            Artículos Bajo Mínimo
          </span>
          <div className={`text-[28px] font-bold font-mono tabular-nums leading-tight mt-1 ${totales.articulosEnAlerta > 0 ? 'text-[#D32F2F]' : 'text-[#16201C]'}`}>
            {totales.articulosEnAlerta}
          </div>
        </div>
      </div>

      {/* Tabla Inventario Físico */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">SKU</th>
                <th className="py-2.5 px-3.5">Artículo / Producto</th>
                <th className="py-2.5 px-3.5">Categoría</th>
                <th className="py-2.5 px-3.5">Almacén</th>
                <th className="py-2.5 px-3.5 text-right">Stock Actual</th>
                <th className="py-2.5 px-3.5 text-right">Stock Mín.</th>
                <th className="py-2.5 px-3.5 text-right">Costo Unit. (S/)</th>
                <th className="py-2.5 px-3.5 text-right">Total Valorizado (S/)</th>
                <th className="py-2.5 px-3.5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {inventario.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#6B7A72]">
                    <Boxes size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
                    <p className="text-[13px] font-medium text-[#16201C]">El inventario está vacío</p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5 mb-3">
                      Crea tu primer producto para comenzar a controlar el stock de tu almacén.
                    </p>
                    <Link
                      href="/admin/productos"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium"
                    >
                      <Plus size={13} />
                      <span>Crear primer producto</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                inventario.map((item) => {
                  const estadoInfo = semaforoStock(item.estado)
                  return (
                    <tr key={item.id} className="hover:bg-[#FAFAF7] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-medium whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium max-w-xs truncate" title={item.producto_nombre}>
                        {item.producto_nombre}
                      </td>
                      <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                        {item.categoria}
                      </td>
                      <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                        {item.almacen_nombre}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums">
                        {item.stock_actual}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-[#6B7A72] tabular-nums">
                        {item.stock_minimo}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-[#6B7A72] tabular-nums">
                        {item.costo_unitario.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums">
                        {item.valor_total.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${estadoInfo.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${estadoInfo.dot}`} />
                          {estadoInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
