import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateApiKey } from '@/lib/auth/api-key'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateFastCache } from '@/lib/cache/fast-cache'

const apiMovimientoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  motivo: z.string().min(3, 'El motivo debe tener al menos 3 caracteres'),
  almacen_id: z.string().uuid().optional(),
  referencia_externa: z.string().optional(),
  items: z
    .array(
      z.object({
        sku: z.string().min(1, 'El SKU es requerido'),
        cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
        costo_unitario: z.number().min(0).optional(),
      })
    )
    .min(1, 'Debe incluir al menos un artículo en el movimiento'),
})

export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid || !auth.negocio_id) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = apiMovimientoSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Datos de movimiento inválidos', detalles: validated.error.issues },
        { status: 400 }
      )
    }

    const { tipo, motivo, almacen_id, referencia_externa, items } = validated.data
    const adminClient = createAdminClient()

    // 1. Resolver almacén
    let targetAlmacenId = almacen_id
    if (!targetAlmacenId) {
      const { data: alm } = await adminClient
        .from('almacen')
        .select('id')
        .eq('negocio_id', auth.negocio_id)
        .eq('es_principal', true)
        .limit(1)
        .single()
      targetAlmacenId = alm?.id
    }

    if (!targetAlmacenId) {
      return NextResponse.json({ error: 'No se encontró un almacén válido para procesar el movimiento' }, { status: 400 })
    }

    // 2. Mapear SKUs a IDs de productos del negocio autenticado
    const skus = items.map((i) => i.sku)
    const { data: prodsDb, error: prodErr } = await adminClient
      .from('productos')
      .select('id, sku, costo, stock')
      .eq('negocio_id', auth.negocio_id)
      .in('sku', skus)

    if (prodErr || !prodsDb || prodsDb.length === 0) {
      return NextResponse.json({ error: 'No se encontraron los productos especificados por SKU en su catálogo' }, { status: 404 })
    }

    const mapProds: Record<string, { id: string; costo: number; stock: number }> = {}
    for (const p of prodsDb) {
      if (p.sku) mapProds[p.sku] = { id: p.id, costo: Number(p.costo) || 0, stock: Number(p.stock) || 0 }
    }

    const detallesParaRpc: Array<{ producto_id: string; cantidad: number; costo_unitario: number }> = []

    for (const item of items) {
      const p = mapProds[item.sku]
      if (!p) {
        return NextResponse.json({ error: `El producto con SKU "${item.sku}" no existe en el catálogo.` }, { status: 404 })
      }

      if (tipo === 'SALIDA' && p.stock < item.cantidad) {
        return NextResponse.json(
          { error: `Stock insuficiente para "${item.sku}". Disponible: ${p.stock}, Requerido: ${item.cantidad}` },
          { status: 409 }
        )
      }

      detallesParaRpc.push({
        producto_id: p.id,
        cantidad: item.cantidad,
        costo_unitario: item.costo_unitario ?? p.costo,
      })
    }

    // 3. Ejecutar función transaccional en PostgreSQL con almacenes válidos
    const origenAlm = tipo === 'SALIDA' ? targetAlmacenId : null
    const destinoAlm = tipo === 'ENTRADA' || tipo === 'AJUSTE' ? targetAlmacenId : null

    // Obtener un usuario de sistema para la auditoría
    const { data: usr } = await adminClient
      .from('usuarios')
      .select('id')
      .eq('negocio_id', auth.negocio_id)
      .limit(1)
      .maybeSingle()

    const { data: movId, error: rpcErr } = await adminClient.rpc('registrar_movimiento', {
      p_negocio_id: auth.negocio_id,
      p_usuario_id: usr?.id || '00000000-0000-0000-0000-000000000000',
      p_tipo: tipo,
      p_motivo: `[API B2B: ${auth.nombre_clave}] ${motivo}${referencia_externa ? ` (Ref: ${referencia_externa})` : ''}`,
      p_almacen_origen_id: origenAlm,
      p_almacen_destino_id: destinoAlm,
      p_referencia_tipo: 'API_B2B',
      p_referencia_id: null,
      p_detalles: detallesParaRpc,
    })

    if (rpcErr) {
      return NextResponse.json({ error: 'Error al registrar el movimiento: ' + rpcErr.message }, { status: 500 })
    }

    invalidateFastCache('inventario-fisico')
    invalidateFastCache('reabastecimiento-rop')
    invalidateFastCache('kardex-sunat')

    return NextResponse.json(
      {
        status: 'success',
        mensaje: `Movimiento de ${tipo} registrado correctamente vía API B2B`,
        movimiento_id: movId,
        items_procesados: items.length,
        almacen_id: targetAlmacenId,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API B2B MOVIMIENTO ERROR]', error)
    return NextResponse.json({ error: 'Error interno al procesar el JSON de la solicitud' }, { status: 500 })
  }
}
