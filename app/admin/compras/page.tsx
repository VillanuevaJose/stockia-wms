import Link from 'next/link'
import { getComprasList } from '../../../lib/queries/operaciones'
import { getSugerenciasReabastecimiento } from '../../../lib/queries/reabastecimiento'
import { createClient } from '../../../lib/supabase/server'
import { ComprasManager } from '../../../components/compras/ComprasManager'
import { ReabastecimientoManager } from '../../../components/compras/ReabastecimientoManager'

export const dynamic = 'force-dynamic'

interface ComprasPageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

export default async function ComprasPage({ searchParams }: ComprasPageProps) {
  const params = await searchParams
  const tab = params.tab || 'historial'

  const [compras, reporteRop, supabase] = await Promise.all([
    getComprasList(),
    getSugerenciasReabastecimiento(),
    createClient(),
  ])

  // Consultar proveedores, productos y almacenes
  const [{ data: proveedores }, { data: productos }, { data: almacenes }] = await Promise.all([
    supabase.from('proveedor').select('id, razon_social').eq('activo', true).order('razon_social'),
    supabase.from('productos').select('id, nombre, sku, costo').eq('activo', true).order('nombre'),
    supabase.from('almacen').select('id, nombre').eq('activo', true).order('es_principal', { ascending: false }),
  ])

  const almacenesFormatted = almacenes || []

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Compras y Abastecimiento
            </h1>
            <p className="text-[13px] text-[#6B7A72] mt-1">
              Control de órdenes a proveedores y reabastecimiento inteligente basado en demanda (ROP).
            </p>
          </div>

          {/* Toggle de Pestaña */}
          <div className="flex items-center gap-1 bg-[#FAFAF7] p-1 rounded-[8px] border border-[#E7E5DF] self-start sm:self-auto">
            <Link
              href="/admin/compras?tab=historial"
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                tab !== 'reabastecimiento'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Historial de Compras ({compras.length})
            </Link>
            <Link
              href="/admin/compras?tab=reabastecimiento"
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors flex items-center gap-1.5 ${
                tab === 'reabastecimiento'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              <span>Reabastecimiento Inteligente (ROP)</span>
              {reporteRop.kpis.articulos_criticos + reporteRop.kpis.articulos_reorden > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#E8A33D]" />
              )}
            </Link>
          </div>
        </div>
      </div>

      {tab === 'reabastecimiento' ? (
        <ReabastecimientoManager reporte={reporteRop} almacenes={almacenesFormatted} />
      ) : (
        <ComprasManager
          compras={compras}
          proveedores={(proveedores || []).map((p) => ({
            id: p.id,
            nombre: p.razon_social,
          }))}
          productos={(productos || []).map((p) => ({
            id: p.id,
            nombre: p.nombre,
            sku: p.sku,
            costo: Number(p.costo) || 0,
          }))}
          almacenes={almacenesFormatted}
        />
      )}
    </div>
  )
}
