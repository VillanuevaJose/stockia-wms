import Link from 'next/link'
import { getInventarioFisico, getSesionesConteoCiego } from '../../../lib/queries/operaciones'
import { getLotesFefoAction } from '../../../lib/actions/lotes'
import { createClient } from '../../../lib/supabase/server'
import { Boxes, Plus } from '../../../components/ui/icons'
import {
  ConteoFisicoDrawer,
  type ProductoConteoCiego,
} from '../../../components/inventario/ConteoFisicoDrawer'
import { RevisionConteosCiegos } from '../../../components/inventario/RevisionConteosCiegos'
import { LotesFefoManager } from '../../../components/inventario/LotesFefoManager'

export const dynamic = 'force-dynamic'

interface InventarioPageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

export default async function InventarioPage({ searchParams }: InventarioPageProps) {
  const params = await searchParams
  const tab = params.tab === 'lotes' ? 'lotes' : 'existencias'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole: 'admin' | 'almacenero' | 'vendedor' = 'admin'
  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()

    if (perfil?.rol === 'almacenero' || perfil?.rol === 'vendedor' || perfil?.rol === 'admin') {
      userRole = perfil.rol
    }
  }

  const [{ inventario, totales }, { data: almacenes }, sesionesConteo, lotesFefo] = await Promise.all([
    getInventarioFisico(),
    supabase
      .from('almacen')
      .select('id, nombre, es_principal')
      .eq('activo', true)
      .order('es_principal', { ascending: false }),
    userRole === 'admin' && tab === 'existencias' ? getSesionesConteoCiego() : Promise.resolve([]),
    tab === 'lotes' ? getLotesFefoAction() : Promise.resolve([]),
  ])

  // Proyección ciega: el componente de conteo en piso NO recibe saldos ni costos del sistema
  const productosParaConteo: ProductoConteoCiego[] = inventario.map((item) => ({
    id: item.id,
    producto_id: item.producto_id,
    sku: item.sku,
    codigo_barras: item.codigo_barras,
    producto_nombre: item.producto_nombre,
    categoria: item.categoria,
    almacen_id: item.almacen_id,
    almacen_nombre: item.almacen_nombre,
  }))

  const semaforoStock = (estado: string) => {
    switch (estado) {
      case 'CRITICO':
        return { dot: 'bg-[#C93B3B]', text: 'text-[#C93B3B]', label: 'Crítico' }
      case 'BAJO':
        return { dot: 'bg-[#C97D1A]', text: 'text-[#C97D1A]', label: 'Bajo Mínimo' }
      default:
        return { dot: 'bg-[#2A7A4C]', text: 'text-[#2A7A4C]', label: 'Óptimo' }
    }
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Inventario Físico
            </h1>
            <p className="text-[13px] text-[#6B7A72] mt-1">
              Existencias por sede en tiempo real, auditorías con conteo ciego y control de roturas de stock.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-[#FAFAF7] p-1 rounded-[8px] border border-[#E7E5DF]">
              <Link
                href="/admin/inventario"
                className={`px-3 py-1 text-[12px] font-medium rounded-[6px] transition-colors ${
                  tab === 'existencias'
                    ? 'bg-[#16201C] text-white'
                    : 'text-[#6B7A72] hover:text-[#16201C]'
                }`}
              >
                Existencias
              </Link>
              <Link
                href="/admin/inventario?tab=lotes"
                className={`px-3 py-1 text-[12px] font-medium rounded-[6px] transition-colors ${
                  tab === 'lotes'
                    ? 'bg-[#16201C] text-white'
                    : 'text-[#6B7A72] hover:text-[#16201C]'
                }`}
              >
                Lotes y FEFO
              </Link>
            </div>
            <ConteoFisicoDrawer
              productos={productosParaConteo}
              almacenes={almacenes || []}
              userRole={userRole}
            />
            <a
              href="/api/reportes/inventario?format=xlsx"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] hover:border-[#16201C] bg-white text-[#16201C] text-[13px] font-medium transition-colors cursor-pointer"
            >
              Exportar Excel (.xlsx)
            </a>
            <Link
              href="/admin/productos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:opacity-90 text-[#FAFAF7] text-[13px] font-medium transition-opacity"
            >
              <Plus size={14} />
              <span>Nuevo Producto</span>
            </Link>
          </div>
        </div>
      </div>

      {tab === 'lotes' ? (
        <LotesFefoManager
          lotes={lotesFefo}
          productos={inventario.map((i) => ({
            id: i.producto_id,
            sku: i.sku,
            nombre: i.producto_nombre,
          }))}
          almacenes={(almacenes || []).map((a) => ({ id: a.id, nombre: a.nombre }))}
        />
      ) : (
        <>
          {/* Cola de Revisión y Aprobación de Conteos Ciegos (Solo Admin) */}
          {userRole === 'admin' && sesionesConteo.length > 0 && (
            <RevisionConteosCiegos sesiones={sesionesConteo} />
          )}

      {/* 3 Cifras Grandes Tipográficas sin Caja */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#E7E5DF] py-2 border-b border-[#E7E5DF]">
        <div className="py-2 sm:py-0 sm:px-4 first:pl-0">
          <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[#6B7A72]">
            Valorización Total
          </span>
          <div className="text-[28px] font-bold text-[#16201C] tabular-nums leading-tight mt-1">
            S/ {totales.valorTotalSoles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="py-2 sm:py-0 sm:px-4">
          <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[#6B7A72]">
            Unidades en Custodia
          </span>
          <div className="text-[28px] font-bold text-[#16201C] tabular-nums leading-tight mt-1">
            {totales.totalArticulos}
          </div>
        </div>

        <div className="py-2 sm:py-0 sm:px-4 last:pr-0">
          <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[#6B7A72]">
            Artículos Bajo Mínimo
          </span>
          <div
            className={`text-[28px] font-bold tabular-nums leading-tight mt-1 ${
              totales.articulosEnAlerta > 0 ? 'text-[#C93B3B]' : 'text-[#16201C]'
            }`}
          >
            {totales.articulosEnAlerta}
          </div>
        </div>
      </div>

      {/* Tabla Inventario Físico */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-[0.06em] font-semibold">
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:opacity-90 text-[#FAFAF7] text-[12px] font-medium"
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
                      <td className="py-2.5 px-3.5 font-medium text-[#6B7A72] whitespace-nowrap">
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
                      <td className="py-2.5 px-3.5 text-right font-bold tabular-nums">
                        {item.stock_actual}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-[#6B7A72] tabular-nums">
                        {item.stock_minimo}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-[#6B7A72] tabular-nums">
                        {item.costo_unitario.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-bold tabular-nums">
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
        </>
      )}
    </div>
  )
}
