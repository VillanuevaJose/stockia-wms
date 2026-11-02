import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

interface RouteParams {
  params: Promise<{
    tipo: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { tipo } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('No autorizado', { status: 401 })
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return new NextResponse('Usuario sin negocio', { status: 403 })
  }

  const negocio_id = usuario.negocio_id
  const searchParams = request.nextUrl.searchParams
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  const BOM = '\uFEFF'
  let csvContent = ''
  const filename = `reporte-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`

  if (tipo === 'inventario') {
    const { data: prods } = await supabase
      .from('productos')
      .select(`
        sku,
        nombre,
        costo,
        precio_soles,
        stock,
        stock_minimo,
        categoria:categoria_id (nombre),
        unidad:unidad_medida_id (codigo)
      `)
      .eq('negocio_id', negocio_id)
      .eq('activo', true)
      .order('nombre')

    const rows = [
      ['SKU', 'Producto', 'Categoría', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Costo Unitario (S/)', 'Precio Venta (S/)', 'Valorización (S/)'],
    ]

    ;(prods || []).forEach((p) => {
      const stock = Number(p.stock) || 0
      const costo = Number(p.costo) || 0
      const precio = Number(p.precio_soles) || 0
      rows.push([
        p.sku,
        `"${p.nombre.replace(/"/g, '""')}"`,
        // @ts-expect-error Supabase nested
        `"${p.categoria?.nombre || 'General'}"`,
        // @ts-expect-error Supabase nested
        p.unidad?.codigo || 'UND',
        stock.toString(),
        (Number(p.stock_minimo) || 0).toString(),
        costo.toFixed(2),
        precio.toFixed(2),
        (stock * costo).toFixed(2),
      ])
    })

    csvContent = rows.map((r) => r.join(',')).join('\n')
  } else if (tipo === 'kardex') {
    let query = supabase
      .from('movimiento_inventario')
      .select(`
        fecha,
        tipo,
        motivo,
        referencia_tipo,
        almacen_origen:almacen_origen_id (nombre),
        almacen_destino:almacen_destino_id (nombre),
        usuario:usuario_id (nombre_completo)
      `)
      .eq('negocio_id', negocio_id)
      .order('fecha', { ascending: false })

    if (desde) query = query.gte('fecha', desde)
    if (hasta) query = query.lte('fecha', hasta)

    const { data: movs } = await query

    const rows = [
      ['Fecha y Hora', 'Tipo', 'Operación / Motivo', 'Referencia', 'Almacén Origen', 'Almacén Destino', 'Operador'],
    ]

    ;(movs || []).forEach((m) => {
      rows.push([
        new Date(m.fecha).toLocaleString('es-PE'),
        m.tipo,
        `"${m.motivo.replace(/"/g, '""')}"`,
        m.referencia_tipo || '',
        // @ts-expect-error Supabase nested
        `"${m.almacen_origen?.nombre || 'N/A'}"`,
        // @ts-expect-error Supabase nested
        `"${m.almacen_destino?.nombre || 'N/A'}"`,
        // @ts-expect-error Supabase nested
        `"${m.usuario?.nombre_completo || 'Sistema'}"`,
      ])
    })

    csvContent = rows.map((r) => r.join(',')).join('\n')
  } else if (tipo === 'ventas') {
    let query = supabase
      .from('venta')
      .select(`
        serie,
        correlativo,
        fecha_emision,
        estado,
        subtotal,
        impuesto,
        total,
        cliente:cliente_id (nombre),
        usuario:usuario_id (nombre_completo)
      `)
      .eq('negocio_id', negocio_id)
      .order('fecha_emision', { ascending: false })

    if (desde) query = query.gte('fecha_emision', desde)
    if (hasta) query = query.lte('fecha_emision', hasta)

    const { data: ventas } = await query

    const rows = [
      ['Comprobante', 'Fecha Emisión', 'Cliente', 'Vendedor', 'Estado', 'Subtotal (S/)', 'IGV (S/)', 'Total (S/)'],
    ]

    ;(ventas || []).forEach((v) => {
      const numComp = `${v.serie}-${String(v.correlativo).padStart(8, '0')}`
      rows.push([
        numComp,
        new Date(v.fecha_emision).toLocaleString('es-PE'),
        // @ts-expect-error Supabase nested
        `"${v.cliente?.nombre || 'Público General'}"`,
        // @ts-expect-error Supabase nested
        `"${v.usuario?.nombre_completo || 'Vendedor'}"`,
        v.estado,
        Number(v.subtotal).toFixed(2),
        Number(v.impuesto).toFixed(2),
        Number(v.total).toFixed(2),
      ])
    })

    csvContent = rows.map((r) => r.join(',')).join('\n')
  } else {
    return new NextResponse('Tipo de reporte no soportado', { status: 400 })
  }

  return new NextResponse(BOM + csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
