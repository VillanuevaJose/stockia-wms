import { getMovimientos } from '../../../lib/queries/movimientos'
import { createClient } from '../../../lib/supabase/server'
import { MovimientosManager } from '../../../components/movimientos/MovimientosManager'

export const dynamic = 'force-dynamic'

interface MovimientosPageProps {
  searchParams: Promise<{
    tipo?: string
    q?: string
    page?: string
  }>
}

export default async function MovimientosPage({ searchParams }: MovimientosPageProps) {
  const params = await searchParams
  const tipo = params.tipo || 'TODOS'
  const q = params.q || ''
  const page = params.page ? parseInt(params.page, 10) : 1

  const { movimientos, total } = await getMovimientos({
    tipo,
    q,
    page,
    pageSize: 25,
  })

  const supabase = await createClient()

  // Consultar productos y almacenes para el drawer de movimiento
  const [{ data: productos }, { data: almacenes }] = await Promise.all([
    supabase.from('productos').select('id, nombre, sku, stock').eq('activo', true).order('nombre'),
    supabase.from('almacen').select('id, nombre').eq('activo', true).order('es_principal', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Kardex y Movimientos
          </h1>
          <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
            {total} {total === 1 ? 'registro' : 'registros'}
          </span>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Trazabilidad transaccional de ingresos, compras, despachos, mermas auditadas y traslados.
        </p>
      </div>

      <MovimientosManager
        movimientos={movimientos}
        total={total}
        productos={(productos || []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          sku: p.sku,
          stock: Number(p.stock) || 0,
        }))}
        almacenes={almacenes || []}
        tipoActual={tipo}
      />
    </div>
  )
}
