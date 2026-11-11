import { createClient } from '../../lib/supabase/server'
import { PuntoDeVenta } from '../../components/ventas/PuntoDeVenta'

export const dynamic = 'force-dynamic'

export default async function VendedorPage() {
  const supabase = await createClient()

  // Consultar sede asignada al colaborador y lista de almacenes disponibles
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let usuario: {
    rol: string
    almacen_id: string | null
    negocio_id: string
    almacen?: { nombre: string; codigo: string | null } | { nombre: string; codigo: string | null }[] | null
  } | null = null

  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, almacen_id, negocio_id, almacen:almacen_id(nombre, codigo)')
      .eq('id', user.id)
      .maybeSingle()

    usuario = perfil
  }

  // Consultar almacenes activos de la empresa
  let almacenesQuery = supabase
    .from('almacen')
    .select('id, nombre, es_principal')
    .eq('activo', true)
    .order('es_principal', { ascending: false })

  if (usuario?.negocio_id) {
    almacenesQuery = almacenesQuery.eq('negocio_id', usuario.negocio_id)
  }

  const { data: almacenesDb } = await almacenesQuery

  const almacenes = almacenesDb || []
  const initialAlmacenId =
    usuario?.almacen_id || almacenes.find((a) => a.es_principal)?.id || almacenes[0]?.id || ''

  // Consultar inventario real agrupado por producto y almacén
  const { data: invRows } = await supabase
    .from('inventario')
    .select('almacen_id, producto_id, stock_actual')

  const stockPorAlmacen: Record<string, Record<string, number>> = {}
  if (invRows) {
    for (const r of invRows) {
      if (!stockPorAlmacen[r.producto_id]) {
        stockPorAlmacen[r.producto_id] = {}
      }
      stockPorAlmacen[r.producto_id][r.almacen_id] = Number(r.stock_actual) || 0
    }
  }

  // Consultar productos activos iniciales
  let prodsQuery = supabase
    .from('productos')
    .select(`
      id,
      sku,
      codigo_barras,
      nombre,
      precio_soles,
      stock,
      unidad_medida:unidad_medida_id (codigo)
    `)
    .eq('activo', true)
    .order('nombre')
    .limit(100)

  if (usuario?.negocio_id) {
    prodsQuery = prodsQuery.eq('negocio_id', usuario.negocio_id)
  }

  const { data: prods } = await prodsQuery

  const items = (prods || []).map((p) => ({
    id: p.id,
    sku: p.sku,
    codigo_barras: p.codigo_barras,
    nombre: p.nombre,
    precio: Number(p.precio_soles) || 0,
    stock: stockPorAlmacen[p.id]?.[initialAlmacenId] ?? 0,
    // @ts-expect-error Supabase nested
    unidad: p.unidad_medida?.codigo || 'UND',
  }))

  const hasCulqiConfigured = Boolean(
    process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY && process.env.CULQI_SECRET_KEY
  )

  const sedeNombre = Array.isArray(usuario?.almacen)
    ? usuario.almacen[0]?.nombre
    : usuario?.almacen?.nombre || almacenes.find((a) => a.id === initialAlmacenId)?.nombre || null

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Punto de Venta y Mostrador
            </h1>
            <p className="text-[12px] text-[#6B7A72] mt-0.5">
              Control de emisión de comprobantes, cobro multicanal y salida automática de stock en sede.
            </p>
          </div>
          <span className="font-mono text-[12px] text-[#6B7A72]">
            Serie Activa: <span className="font-bold text-[#16201C]">B001</span>
          </span>
        </div>
      </div>

      <PuntoDeVenta
        hasCulqiConfigured={hasCulqiConfigured}
        initialProductos={items}
        sedeNombre={sedeNombre}
        almacenes={almacenes}
        stockPorAlmacen={stockPorAlmacen}
        initialAlmacenId={initialAlmacenId}
        esAdmin={usuario?.rol === 'admin'}
      />
    </div>
  )
}
