import Link from 'next/link'
import { getVentasList } from '../../../lib/queries/operaciones'
import { ShoppingCart, Plus } from '../../../components/ui/icons'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const ventas = await getVentasList()

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'PAGADA':
        return 'text-[#2E7D32]'
      case 'PENDIENTE':
        return 'text-[#E8A33D]'
      case 'ANULADA':
        return 'text-[#D32F2F]'
      default:
        return 'text-[#6B7A72]'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Ventas y Despacho
          </h1>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
              {ventas.length} {ventas.length === 1 ? 'comprobante' : 'comprobantes'}
            </span>
            <Link
              href="/vendedor"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span>Abrir Punto de Venta</span>
            </Link>
          </div>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Historial de comprobantes emitidos, facturación y estados de cobro.
        </p>
      </div>

      {/* Tabla Ventas */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Comprobante</th>
                <th className="py-2.5 px-3.5">Cliente</th>
                <th className="py-2.5 px-3.5">Vendedor</th>
                <th className="py-2.5 px-3.5 text-right">Total (S/)</th>
                <th className="py-2.5 px-3.5 text-center">Estado</th>
                <th className="py-2.5 px-3.5 text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B7A72]">
                    <ShoppingCart size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
                    <p className="text-[13px] font-medium text-[#16201C]">No hay ventas registradas aún</p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5 mb-3">
                      Las ventas emitidas desde el Punto de Venta aparecerán reflejadas aquí.
                    </p>
                    <Link
                      href="/vendedor"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium"
                    >
                      <Plus size={13} />
                      <span>Emitir primera venta</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-medium whitespace-nowrap">
                      {v.numero_comprobante}
                    </td>
                    <td className="py-2.5 px-3.5 max-w-xs truncate">
                      {v.cliente_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                      {v.vendedor_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums">
                      S/ {v.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${estadoBadge(v.estado)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {v.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-[12px] text-[#6B7A72] whitespace-nowrap tabular-nums">
                      {new Date(v.fecha).toLocaleString('es-PE', {
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
    </div>
  )
}
