'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { invalidateFastCache } from '../../../lib/cache/fast-cache'

const ajusteItemSchema = z.object({
  producto_id: z.string().uuid('ID de producto inválido'),
  producto_nombre: z.string().optional(),
  almacen_id: z.string().uuid().optional().nullable(),
  diferencia: z.number().refine((n) => n !== 0, 'La diferencia no puede ser cero'),
  costo_unitario: z.number().min(0).default(0),
})

const aplicarConteoSchema = z.object({
  almacen_id: z.string().uuid().optional().nullable(),
  motivo_general: z.string().default('Toma de inventario físico y auditoría'),
  ajustes: z.array(ajusteItemSchema).min(1, 'Debe haber al menos un producto con diferencia para ajustar'),
})

export type ConteoResult = {
  success: boolean
  error?: string
  totalAjustados?: number
  totalFaltanteSoles?: number
  totalSobranteSoles?: number
}

export async function aplicarConteoFisicoAction(
  rawInput: z.infer<typeof aplicarConteoSchema>
): Promise<ConteoResult> {
  const parsed = aplicarConteoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Datos de conteo inválidos' }
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
    .select('negocio_id, rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return { success: false, error: 'Usuario sin negocio asignado.' }
  }

  if (usuario.rol === 'vendedor') {
    return { success: false, error: 'Solo administradores y jefes de almacén pueden aplicar ajustes de conteo.' }
  }

  const adminClient = createAdminClient()
  const negocio_id = usuario.negocio_id

  // Obtener almacén por defecto si no se especificó
  let defaultAlmacenId = parsed.data.almacen_id
  if (!defaultAlmacenId) {
    const { data: alm } = await adminClient
      .from('almacen')
      .select('id')
      .eq('negocio_id', negocio_id)
      .eq('activo', true)
      .order('es_principal', { ascending: false })
      .limit(1)
      .single()
    defaultAlmacenId = alm?.id || null
  }

  if (!defaultAlmacenId) {
    return { success: false, error: 'No se encontró un almacén activo para registrar los ajustes.' }
  }

  let totalFaltanteSoles = 0
  let totalSobranteSoles = 0
  let totalAjustados = 0

  for (const item of parsed.data.ajustes) {
    const diff = item.diferencia
    const cantAbs = Math.abs(diff)
    const costo = item.costo_unitario || 0
    const itemAlmacenId = item.almacen_id || defaultAlmacenId

    const esMerma = diff < 0
    const motivo = `${parsed.data.motivo_general}: ${esMerma ? 'Faltante de' : 'Sobrante de'} ${cantAbs} und`

    if (esMerma) {
      totalFaltanteSoles += cantAbs * costo
    } else {
      totalSobranteSoles += cantAbs * costo
    }

    const { error: rpcErr } = await adminClient.rpc('registrar_movimiento', {
      p_negocio_id: negocio_id,
      p_usuario_id: user.id,
      p_tipo: 'AJUSTE',
      p_motivo: motivo,
      p_almacen_origen_id: esMerma ? itemAlmacenId : null,
      p_almacen_destino_id: esMerma ? null : itemAlmacenId,
      p_detalles: [
        {
          producto_id: item.producto_id,
          cantidad: cantAbs,
          costo_unitario: costo,
        },
      ],
      p_referencia_tipo: 'CONTEO_FISICO',
      p_referencia_id: null,
    })

    if (rpcErr) {
      console.error('[CONTEO RPC ERROR]', rpcErr)
      return {
        success: false,
        error: `Error al ajustar ${item.producto_nombre || item.producto_id}: ${rpcErr.message}`,
      }
    }

    totalAjustados++
  }

  // Registrar auditoría si la tabla existe
  try {
    await adminClient.from('auditoria').insert({
      negocio_id,
      usuario_id: user.id,
      tabla: 'inventario',
      accion: 'CONTEO_FISICO',
      descripcion: `Ajuste masivo por conteo: ${totalAjustados} productos. Faltante: S/ ${totalFaltanteSoles.toFixed(2)}, Sobrante: S/ ${totalSobranteSoles.toFixed(2)}`,
    })
  } catch (auditErr) {
    console.warn('[AUDIT CONTEO NOTICE]', auditErr)
  }

  invalidateFastCache('inventario-fisico')
  invalidateFastCache('dashboard-stats')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/movimientos')
  revalidatePath('/admin/productos')
  revalidatePath('/admin')

  return {
    success: true,
    totalAjustados,
    totalFaltanteSoles: Math.round(totalFaltanteSoles * 100) / 100,
    totalSobranteSoles: Math.round(totalSobranteSoles * 100) / 100,
  }
}
