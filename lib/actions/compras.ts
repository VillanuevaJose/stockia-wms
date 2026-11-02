'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'

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

  // 3. Ejecutar función transaccional de compra
  const { data: compraId, error: rpcErr } = await adminClient.rpc('registrar_compra', {
    p_negocio_id: negocio_id,
    p_usuario_id: user.id,
    p_proveedor_id: proveedor_id,
    p_almacen_destino_id: almacen_destino_id,
    p_numero_comprobante: validated.data.numero_comprobante,
    p_detalles: validated.data.detalles,
    p_notas: validated.data.notas || null,
  })

  if (rpcErr) {
    console.error('[REGISTRAR COMPRA ERROR]', rpcErr)
    return { success: false, error: rpcErr.message }
  }

  revalidatePath('/admin/compras')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/movimientos')
  revalidatePath('/admin/productos')
  revalidatePath('/admin')

  return { success: true, compra_id: compraId }
}
