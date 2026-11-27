import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sesión no iniciada.' }, { status: 401 })
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id || usuario.rol !== 'admin') {
    return NextResponse.json(
      { error: 'Solo un administrador puede exportar respaldos completos.' },
      { status: 403 }
    )
  }

  const negocioId = usuario.negocio_id

  const [
    { data: negocio },
    { data: almacenes },
    { data: categorias },
    { data: unidades },
    { data: productos },
    { data: inventario },
    { data: proveedores },
    { data: clientes },
    { data: compras },
    { data: ventas },
    { data: movimientos },
  ] = await Promise.all([
    supabase
      .from('negocio')
      .select('id, nombre, ruc, direccion, telefono, email')
      .eq('id', negocioId)
      .maybeSingle(),
    supabase.from('almacen').select('*').eq('negocio_id', negocioId),
    supabase.from('categoria').select('*').eq('negocio_id', negocioId),
    supabase.from('unidad_medida').select('*').eq('negocio_id', negocioId),
    supabase.from('productos').select('*').eq('negocio_id', negocioId),
    supabase
      .from('inventario')
      .select('id, almacen_id, producto_id, stock_actual, updated_at'),
    supabase.from('proveedor').select('*').eq('negocio_id', negocioId),
    supabase.from('cliente').select('*').eq('negocio_id', negocioId),
    supabase
      .from('compra')
      .select('*, detalle_compra(*)')
      .eq('negocio_id', negocioId)
      .order('fecha_emision', { ascending: false })
      .limit(1000),
    supabase
      .from('venta')
      .select('*, detalle_venta(*)')
      .eq('negocio_id', negocioId)
      .order('fecha_emision', { ascending: false })
      .limit(1000),
    supabase
      .from('movimiento_inventario')
      .select('*, detalle_movimiento(*)')
      .eq('negocio_id', negocioId)
      .order('fecha', { ascending: false })
      .limit(1500),
  ])

  const dataPayload = {
    negocio: negocio || null,
    almacenes: almacenes || [],
    categorias: categorias || [],
    unidades: unidades || [],
    productos: productos || [],
    inventario: inventario || [],
    proveedores: proveedores || [],
    clientes: clientes || [],
    compras: compras || [],
    ventas: ventas || [],
    movimientos: movimientos || [],
  }

  const counts = {
    almacenes: dataPayload.almacenes.length,
    categorias: dataPayload.categorias.length,
    productos: dataPayload.productos.length,
    inventario: dataPayload.inventario.length,
    proveedores: dataPayload.proveedores.length,
    clientes: dataPayload.clientes.length,
    compras: dataPayload.compras.length,
    ventas: dataPayload.ventas.length,
    movimientos: dataPayload.movimientos.length,
  }

  const checksumSha256 = createHash('sha256')
    .update(JSON.stringify(dataPayload))
    .digest('hex')

  const generatedAt = new Date().toISOString()

  const backupDocument = {
    schema_version: 'stockia-backup-v1',
    generated_at: generatedAt,
    negocio_id: negocioId,
    negocio_nombre: negocio?.nombre || 'Empresa Stockia',
    counts,
    checksum_sha256: checksumSha256,
    data: dataPayload,
  }

  const jsonString = JSON.stringify(backupDocument, null, 2)
  const tamanoKb = Math.max(1, Math.round(Buffer.byteLength(jsonString, 'utf8') / 1024))

  // Registrar evento inmutable de respaldo manual en auditoría
  try {
    const adminClient = createAdminClient()
    await adminClient.from('auditoria').insert({
      negocio_id: negocioId,
      usuario_id: user.id,
      tabla: 'respaldos',
      registro_id: crypto.randomUUID(),
      accion: 'RESPALDO_MANUAL',
      datos_nuevos: {
        tipo: 'MANUAL',
        checksum_sha256: checksumSha256,
        tamano_kb: tamanoKb,
        counts,
        usuario_nombre: usuario.nombre_completo || user.email || 'Administrador',
        fecha: generatedAt,
      },
    })
  } catch {
    // No bloquear descarga si falla el registro secundario
  }

  const fechaArchivo = generatedAt.slice(0, 10)
  return new NextResponse(jsonString, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="stockia-respaldo-${fechaArchivo}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
