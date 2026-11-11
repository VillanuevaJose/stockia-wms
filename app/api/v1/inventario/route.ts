import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/auth/api-key'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const skuFilter = searchParams.get('sku')
  const almacenFilter = searchParams.get('almacen_id')

  const adminClient = createAdminClient()

  // 1. Consultar productos del negocio
  let prodQuery = adminClient
    .from('productos')
    .select(`
      id,
      sku,
      nombre,
      costo,
      precio_soles,
      stock,
      stock_minimo,
      activo,
      categoria:categoria_id (nombre)
    `)
    .eq('activo', true)
    .order('nombre')

  if (skuFilter) {
    prodQuery = prodQuery.ilike('sku', `%${skuFilter}%`)
  }

  const { data: productos, error: prodErr } = await prodQuery

  if (prodErr) {
    return NextResponse.json({ error: 'Error al consultar inventario: ' + prodErr.message }, { status: 500 })
  }

  // 2. Consultar desglose por sedes / almacenes
  let invQuery = adminClient
    .from('inventario')
    .select('producto_id, stock_actual, almacen:almacen_id (id, nombre, codigo)')

  if (almacenFilter) {
    invQuery = invQuery.eq('almacen_id', almacenFilter)
  }

  const { data: invSedes } = await invQuery

  const sedesPorProducto: Record<
    string,
    Array<{ almacen_id: string; almacen_nombre: string; stock: number }>
  > = {}

  if (invSedes) {
    for (const inv of invSedes) {
      const almRel = Array.isArray(inv.almacen) ? inv.almacen[0] : inv.almacen
      if (!sedesPorProducto[inv.producto_id]) {
        sedesPorProducto[inv.producto_id] = []
      }
      sedesPorProducto[inv.producto_id].push({
        almacen_id: almRel?.id || '',
        almacen_nombre: almRel?.nombre || 'Sede General',
        stock: Number(inv.stock_actual) || 0,
      })
    }
  }

  interface CatVal {
    nombre?: string
  }

  const items = (productos || []).map((p) => {
    const catRel = Array.isArray(p.categoria) ? (p.categoria[0] as CatVal) : (p.categoria as CatVal)
    const stockTotal = Number(p.stock) || 0
    const stockMin = Number(p.stock_minimo) || 0

    return {
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      categoria: catRel?.nombre || 'General',
      precio_venta_pe: Number(p.precio_soles) || 0,
      costo_referencial_pe: Number(p.costo) || 0,
      stock_disponible_total: stockTotal,
      stock_minimo_seguridad: stockMin,
      estado_existencia: stockTotal <= 0 ? 'AGOTADO' : stockTotal <= stockMin ? 'CRITICO' : 'DISPONIBLE',
      desglose_por_sedes: sedesPorProducto[p.id] || [],
    }
  })

  return NextResponse.json({
    status: 'success',
    autenticado_como: auth.nombre_clave,
    timestamp: new Date().toISOString(),
    total_articulos: items.length,
    datos: items,
  })
}
