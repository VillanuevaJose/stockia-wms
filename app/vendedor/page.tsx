import { createClient } from '../../lib/supabase/server'
import { PuntoDeVenta } from '../../components/ventas/PuntoDeVenta'

export const dynamic = 'force-dynamic'

export default async function VendedorPage() {
  const supabase = await createClient()

  // Consultar sede asignada al vendedor
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let sedeNombre: string | null = null

  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('almacen_id, almacen:almacen_id(nombre, codigo)')
      .eq('id', user.id)
      .maybeSingle()

    // @ts-expect-error Supabase nested join
    sedeNombre = Array.isArray(perfil?.almacen) ? perfil.almacen[0]?.nombre : perfil?.almacen?.nombre
  }

  // Consultar productos activos iniciales
  const { data: prods } = await supabase
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
    .limit(20)

  const items = (prods || []).map((p) => ({
    id: p.id,
    sku: p.sku,
    codigo_barras: p.codigo_barras,
    nombre: p.nombre,
    precio: Number(p.precio_soles) || 0,
    stock: Number(p.stock) || 0,
    // @ts-expect-error Supabase nested
    unidad: p.unidad_medida?.codigo || 'UND',
  }))

  const hasCulqiConfigured = Boolean(
    process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY && process.env.CULQI_SECRET_KEY
  )

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Punto de Venta y Mostrador
            </h1>
            {sedeNombre ? (
              <p className="text-[12px] font-medium text-[#2E7D32] mt-0.5">
                Despachando desde: <strong>{sedeNombre}</strong>
              </p>
            ) : (
              <p className="text-[12px] text-[#6B7A72] mt-0.5">
                Despachando desde: <strong>Sede Central (Principal)</strong>
              </p>
            )}
          </div>
          <span className="font-mono text-[12px] text-[#6B7A72]">
            Serie Activa: <span className="font-bold text-[#16201C]">B001</span>
          </span>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Emisión de comprobantes, cobro multicanal con Culqi/Efectivo y salida automática de stock.
        </p>
      </div>

      <PuntoDeVenta
        hasCulqiConfigured={hasCulqiConfigured}
        initialProductos={items}
        sedeNombre={sedeNombre}
      />
    </div>
  )
}
