'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'
import { invalidateFastCache } from '../cache/fast-cache'

const itemCompraSchema = z.object({
  producto_id: z.string().uuid('ID de producto inválido'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  costo_unitario: z.number().min(0, 'El costo unitario no puede ser negativo'),
})

const registrarCompraSchema = z.object({
  proveedor_id: z.string().uuid().optional().nullable(),
  nuevo_proveedor_nombre: z.string().trim().optional(),
  nuevo_proveedor_ruc: z.string().trim().optional(),
  almacen_destino_id: z.string().uuid().optional(),
  numero_comprobante: z.string().trim().min(1, 'El número de comprobante es requerido'),
  notas: z.string().trim().optional(),
  detalles: z.array(itemCompraSchema).min(1, 'Agrega al menos un producto a la compra'),
})

export type CompraResult = {
  success: boolean
  error?: string
  compra_id?: string
}

export async function registrarCompraAction(
  data: z.infer<typeof registrarCompraSchema>
): Promise<CompraResult> {
  const validated = registrarCompraSchema.safeParse(data)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Datos de compra inválidos.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesión no iniciada.' }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return { success: false, error: 'Usuario sin negocio asignado.' }
  }

  if (usuario.rol === 'vendedor') {
    return { success: false, error: 'Los vendedores no tienen permisos para registrar compras.' }
  }

  const negocio_id = usuario.negocio_id
  const adminClient = createAdminClient()

  // 1. Resolver proveedor
  let proveedor_id = validated.data.proveedor_id

  if (!proveedor_id && validated.data.nuevo_proveedor_nombre) {
    const { data: newProv, error: provErr } = await adminClient
      .from('proveedor')
      .insert({
        negocio_id,
        razon_social: validated.data.nuevo_proveedor_nombre,
        ruc: validated.data.nuevo_proveedor_ruc || null,
        activo: true,
      })
      .select('id')
      .single()

    if (provErr) {
      return { success: false, error: 'Error al registrar el nuevo proveedor: ' + provErr.message }
    }
    proveedor_id = newProv.id
  }

  if (!proveedor_id) {
    // Si no se especificó proveedor, buscar o crear uno por defecto "Proveedor General"
    const { data: provGen } = await adminClient
      .from('proveedor')
      .select('id')
      .eq('negocio_id', negocio_id)
      .limit(1)
      .maybeSingle()

    if (provGen) {
      proveedor_id = provGen.id
    } else {
      const { data: createdGen } = await adminClient
        .from('proveedor')
        .insert({
          negocio_id,
          razon_social: 'Proveedor General',
          activo: true,
        })
        .select('id')
        .single()
      proveedor_id = createdGen?.id
    }
  }

  // 2. Resolver almacén destino
  let almacen_destino_id = validated.data.almacen_destino_id
  if (!almacen_destino_id) {
    const { data: alm } = await adminClient
      .from('almacen')
      .select('id')
      .eq('negocio_id', negocio_id)
      .eq('es_principal', true)
      .limit(1)
      .single()

    almacen_destino_id = alm?.id
  }

  if (!almacen_destino_id) {
    return { success: false, error: 'No se encontró un almacén de destino activo.' }
  }

  // 3. Ejecutar función transaccional de compra con fallback resiliente
  let compraId: string | null = null
  const totalCompra = validated.data.detalles.reduce((acc, d) => acc + d.cantidad * d.costo_unitario, 0)

  const { data: rpcId, error: rpcErr } = await adminClient.rpc('registrar_compra', {
    p_negocio_id: negocio_id,
    p_usuario_id: user.id,
    p_proveedor_id: proveedor_id,
    p_almacen_destino_id: almacen_destino_id,
    p_numero_comprobante: validated.data.numero_comprobante,
    p_detalles: validated.data.detalles,
    p_notas: validated.data.notas || null,
  })

  if (rpcErr) {
    // Fallback nativo si la función SQL falla por columna movimiento_id
    const { data: nuevaCompra, error: insErr } = await adminClient
      .from('compra')
      .insert({
        negocio_id,
        proveedor_id,
        almacen_destino_id,
        usuario_id: user.id,
        numero_comprobante: validated.data.numero_comprobante,
        fecha_emision: new Date().toISOString(),
        estado: 'RECIBIDA',
        total: totalCompra,
        notas: validated.data.notas || null,
      })
      .select('id')
      .single()

    if (insErr || !nuevaCompra) {
      return { success: false, error: 'Error al registrar la cabecera de compra: ' + (insErr?.message || '') }
    }

    compraId = nuevaCompra.id

    // Registrar detalles
    const detallesPayload = validated.data.detalles.map((d) => ({
      compra_id: compraId,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      costo_unitario: d.costo_unitario,
      subtotal: d.cantidad * d.costo_unitario,
    }))

    await adminClient.from('detalle_compra').insert(detallesPayload)

    // Ingresar existencias al almacén mediante movimiento oficial
    await adminClient.rpc('registrar_movimiento', {
      p_negocio_id: negocio_id,
      p_usuario_id: user.id,
      p_tipo: 'ENTRADA',
      p_motivo: `Ingreso por Compra: ${validated.data.numero_comprobante}`,
      p_almacen_origen_id: null,
      p_almacen_destino_id: almacen_destino_id,
      p_referencia_tipo: 'COMPRA',
      p_referencia_id: compraId,
      p_detalles: validated.data.detalles,
    })
  } else {
    compraId = rpcId
  }

  invalidateFastCache('compras-list')
  invalidateFastCache('inventario-fisico')
  invalidateFastCache('reabastecimiento-rop')
  invalidateFastCache('kardex-sunat')

  revalidatePath('/admin/compras')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/movimientos')
  revalidatePath('/admin/productos')
  revalidatePath('/admin')

  return { success: true, compra_id: compraId || undefined }
}

export async function generarCompraRapidaRopAction(params: {
  producto_id: string
  cantidad: number
  costo_unitario: number
  proveedor_id?: string | null
  almacen_id?: string
}): Promise<CompraResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesión no iniciada.' }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return { success: false, error: 'Usuario sin negocio asignado.' }
  }

  const negocio_id = usuario.negocio_id
  const adminClient = createAdminClient()

  // 1. Resolver proveedor
  let provId = params.proveedor_id
  if (!provId) {
    const { data: prov } = await adminClient
      .from('proveedor')
      .select('id')
      .eq('negocio_id', negocio_id)
      .limit(1)
      .maybeSingle()

    if (prov) {
      provId = prov.id
    } else {
      const { data: np } = await adminClient
        .from('proveedor')
        .insert({
          negocio_id,
          razon_social: 'Distribuidora Ferretera Central S.A.C.',
          ruc: '20100088921',
          activo: true,
        })
        .select('id')
        .single()
      provId = np?.id
    }
  }

  // 2. Resolver almacén
  let almId = params.almacen_id
  if (!almId) {
    const { data: alm } = await adminClient
      .from('almacen')
      .select('id')
      .eq('negocio_id', negocio_id)
      .eq('es_principal', true)
      .limit(1)
      .single()
    almId = alm?.id
  }

  if (!almId || !provId) {
    return { success: false, error: 'No se pudo determinar el almacén o proveedor de destino.' }
  }

  const numeroComprobante = `OC-ROP-${Date.now().toString().slice(-6)}`
  const total = params.cantidad * params.costo_unitario

  // 3. Insertar orden de compra
  const { data: compra, error: cErr } = await adminClient
    .from('compra')
    .insert({
      negocio_id,
      proveedor_id: provId,
      almacen_destino_id: almId,
      usuario_id: user.id,
      numero_comprobante: numeroComprobante,
      fecha_emision: new Date().toISOString(),
      estado: 'RECIBIDA',
      total,
      notas: 'Orden de reabastecimiento inteligente generada en 1 Clic (Algoritmo ROP).',
    })
    .select('id')
    .single()

  if (cErr || !compra) {
    return { success: false, error: 'Error al registrar la orden de compra: ' + cErr?.message }
  }

  // 4. Detalle de compra
  await adminClient.from('detalle_compra').insert({
    compra_id: compra.id,
    producto_id: params.producto_id,
    cantidad: params.cantidad,
    costo_unitario: params.costo_unitario,
    subtotal: total,
  })

  // 5. Ingreso de existencias al almacén
  await adminClient.rpc('registrar_movimiento', {
    p_negocio_id: negocio_id,
    p_usuario_id: user.id,
    p_tipo: 'ENTRADA',
    p_motivo: `Reabastecimiento ROP Automático: ${numeroComprobante}`,
    p_almacen_origen_id: null,
    p_almacen_destino_id: almId,
    p_referencia_tipo: 'COMPRA',
    p_referencia_id: compra.id,
    p_detalles: [
      {
        producto_id: params.producto_id,
        cantidad: params.cantidad,
        costo_unitario: params.costo_unitario,
      },
    ],
  })

  invalidateFastCache('compras-list')
  invalidateFastCache('inventario-fisico')
  invalidateFastCache('reabastecimiento-rop')
  invalidateFastCache('kardex-sunat')

  revalidatePath('/admin/compras')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/movimientos')
  revalidatePath('/admin/productos')
  revalidatePath('/admin')

  return { success: true, compra_id: compra.id }
}
