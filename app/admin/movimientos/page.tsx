import Link from 'next/link'
import { getMovimientos, type MovimientoRow } from '../../../lib/queries/movimientos'
import { getKardexSunat131 } from '../../../lib/queries/kardex-sunat'
import { createClient } from '../../../lib/supabase/server'
import { MovimientosManager } from '../../../components/movimientos/MovimientosManager'
import { KardexSunatView } from '../../../components/kardex/KardexSunatView'

export const dynamic = 'force-dynamic'

interface MovimientosPageProps {
  searchParams: Promise<{
    tipo?: string
    q?: string
    page?: string
    tab?: string
    productoId?: string
    almacenId?: string
  }>
}

export default async function MovimientosPage({ searchParams }: MovimientosPageProps) {
  const params = await searchParams
  const tab = params.tab || 'transacciones'
  const tipo = params.tipo || 'TODOS'
  const q = params.q || ''
  const page = params.page ? parseInt(params.page, 10) : 1

  const supabase = await createClient()

  // Consultar productos y almacenes
  const [{ data: productos }, { data: almacenes }] = await Promise.all([
    supabase.from('productos').select('id, nombre, sku, stock').eq('activo', true).order('nombre'),
    supabase.from('almacen').select('id, nombre').eq('activo', true).order('es_principal', { ascending: false }),
  ])

  const productosFormatted = (productos || []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    stock: Number(p.stock) || 0,
  }))

  const selectedProductoId = params.productoId || productosFormatted[0]?.id || ''
  const selectedAlmacenId = params.almacenId || 'TODOS'

  // Consulta condicional según pestaña activa
  let kardexSunatData = null
  let movimientosData: { movimientos: MovimientoRow[]; total: number } = { movimientos: [], total: 0 }

  if (tab === 'sunat-13-1') {
    kardexSunatData = await getKardexSunat131({
      productoId: selectedProductoId,
      almacenId: selectedAlmacenId,
    })
  } else {
    movimientosData = await getMovimientos({
      tipo,
      q,
      page,
      pageSize: 25,
    })
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Kardex y Movimientos
            </h1>
            <p className="text-[13px] text-[#6B7A72] mt-1">
              Trazabilidad transaccional y libro contable valorizado oficial de inventarios (SUNAT 13.1).
            </p>
          </div>

          {/* Selector de Pestaña Principal */}
          <div className="flex items-center gap-1 bg-[#FAFAF7] p-1 rounded-[8px] border border-[#E7E5DF] self-start sm:self-auto">
            <Link
              href="/admin/movimientos?tab=transacciones"
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                tab !== 'sunat-13-1'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Movimientos Operativos
            </Link>
            <Link
              href={`/admin/movimientos?tab=sunat-13-1${selectedProductoId ? `&productoId=${selectedProductoId}` : ''}`}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                tab === 'sunat-13-1'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Kardex Valorizado SUNAT 13.1
            </Link>
          </div>
        </div>
      </div>

      {/* Renderizado de Pestaña */}
      {tab === 'sunat-13-1' ? (
        <KardexSunatView
          data={kardexSunatData}
          productos={productosFormatted}
          almacenes={almacenes || []}
          selectedProductoId={selectedProductoId}
          selectedAlmacenId={selectedAlmacenId}
        />
      ) : (
        <MovimientosManager
          movimientos={movimientosData.movimientos}
          total={movimientosData.total}
          productos={productosFormatted}
          almacenes={almacenes || []}
          tipoActual={tipo}
        />
      )}
    </div>
  )
}
