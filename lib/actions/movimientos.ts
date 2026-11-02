'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'

const itemMovimientoSchema = z.object({
  producto_id: z.string().uuid('ID de producto inválido'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  costo_unitario: z.number().min(0).optional().default(0),
})

const registrarMovimientoSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA']),
  subtipo_ajuste: z.enum(['SOBRANTE', 'MERMA']).optional(),
  motivo: z.string().trim().min(3, 'El motivo de la operación es obligatorio (mínimo 3 caracteres)'),
  almacen_origen_id: z.string().uuid().optional().nullable(),
  almacen_destino_id: z.string().uuid().optional().nullable(),
  detalles: z.array(itemMovimientoSchema).min(1, 'Agrega al menos un producto al movimiento'),
})

export type MovimientoResult = {
  success: boolean
  error?: string
  movimiento_id?: string
}

export async function registrarMovimientoAction(
  data: z.infer<typeof registrarMovimientoSchema>
): Promise<MovimientoResult> {
  const validated = registrarMovimientoSchema.safeParse(data)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Datos del movimiento inválidos.' }
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
    return { success: false, error: 'Los vendedores no tienen permisos para registrar movimientos de inventario.' }
  }

  const negocio_id = usuario.negocio_id
  const adminClient = createAdminClient()

  let origen_id = validated.data.almacen_origen_id || null
  let destino_id = validated.data.almacen_destino_id || null

  // Ajustes de almacén según tipo
  if (validated.data.tipo === 'AJUSTE') {
    if (validated.data.subtipo_ajuste === 'SOBRANTE') {
      // Positivo: solo destino
      destino_id = destino_id || origen_id
      origen_id = null
    } else {
      // Merma/Pérdida: solo origen
      origen_id = origen_id || destino_id
      destino_id = null
    }
  }

  const { data: movId, error: rpcErr } = await adminClient.rpc('registrar_movimiento', {
    p_negocio_id: negocio_id,
    p_usuario_id: user.id,
    p_tipo: validated.data.tipo,
    p_motivo: validated.data.motivo,
    p_almacen_origen_id: origen_id,
    p_almacen_destino_id: destino_id,
    p_detalles: validated.data.detalles,
    p_referencia_tipo: 'MANUAL',
    p_referencia_id: null,
  })

  if (rpcErr) {
    console.error('[REGISTRAR MOVIMIENTO ERROR]', rpcErr)
    return { success: false, error: rpcErr.message }
  }

  revalidatePath('/admin/movimientos')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/productos')
  revalidatePath('/admin')

  return { success: true, movimiento_id: movId }
}
