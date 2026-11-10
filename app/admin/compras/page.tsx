import { getComprasList } from '../../../lib/queries/operaciones'
import { createClient } from '../../../lib/supabase/server'
import { ComprasManager } from '../../../components/compras/ComprasManager'

export const dynamic = 'force-dynamic'

export default async function ComprasPage() {
  const compras = await getComprasList()
  const supabase = await createClient()

  // Consultar proveedores, productos y almacenes para el drawer de compra
  const [{ data: proveedores }, { data: productos }, { data: almacenes }] = await Promise.all([
    supabase.from('proveedor').select('id, razon_social').eq('activo', true).order('razon_social'),
    supabase.from('productos').select('id, nombre, sku, costo').eq('activo', true).order('nombre'),
    supabase.from('almacen').select('id, nombre').eq('activo', true).order('es_principal', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Compras y Abastecimiento
          </h1>
          <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
            {compras.length} {compras.length === 1 ? 'orden registrada' : 'órdenes registradas'}
          </span>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Control de comprobantes de compra a proveedores y generación automática de entradas al inventario.
        </p>
      </div>

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
        almacenes={almacenes || []}
      />
    </div>
  )
}
