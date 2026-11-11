import Link from 'next/link'
import { getVentasList } from '../../../lib/queries/operaciones'
import { Plus } from '../../../components/ui/icons'
import { VentasManager } from '../../../components/ventas/VentasManager'

export const dynamic = 'force-dynamic'

export default async function VentasPage() {
  const ventas = await getVentasList()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Ventas y Despacho
          </h1>
          <div className="flex items-center gap-3">
            <a
              href="/api/reportes/ventas?format=xlsx"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] hover:border-[#16201C] bg-white text-[#16201C] text-[13px] font-medium transition-colors cursor-pointer"
            >
              Exportar Excel (.xlsx)
            </a>
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
          Historial interactivo de comprobantes, inspección de tickets térmicos y trazabilidad de despacho.
        </p>
      </div>

      {/* Gestor Interactivo de Ventas */}
      <VentasManager ventas={ventas} />
    </div>
  )
}
