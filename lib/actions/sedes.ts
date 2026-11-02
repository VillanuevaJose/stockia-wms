'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'

const crearSolicitudSchema = z.object({
  sede_origen_id: z.string().uuid('Selecciona la sede emisora válida'),
  sede_destino_id: z.string().uuid('Selecciona la sede receptora válida'),
  producto_id: z.string().uuid().optional().nullable(),
  cantidad: z.coerce.number().positive('La cantidad debe ser mayor a 0').default(1),
  prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'URGENTE']).default('MEDIA'),
  mensaje: z.string().trim().min(5, 'La comunicación debe contener al menos 5 caracteres'),
})

export type SolicitudResult = {
  success: boolean
  error?: string
  solicitud_id?: string
}

export async function crearSolicitudSedesAction(
  data: z.infer<typeof crearSolicitudSchema>
): Promise<SolicitudResult> {
  const validated = crearSolicitudSchema.safeParse(data)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Datos de comunicación inválidos.' }
  }

  if (validated.data.sede_origen_id === validated.data.sede_destino_id) {
    return { success: false, error: 'La sede emisora y la sede de destino deben ser diferentes.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida o expirada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return { success: false, error: 'Usuario no asignado a ninguna empresa.' }
  }

  const adminClient = createAdminClient()
  const { data: newRow, error } = await adminClient
    .from('solicitud_traslado')
    .insert({
      negocio_id: usuario.negocio_id,
      sede_origen_id: validated.data.sede_origen_id,
      sede_destino_id: validated.data.sede_destino_id,
      producto_id: validated.data.producto_id || null,
      cantidad: validated.data.cantidad,
      prioridad: validated.data.prioridad,
      mensaje: validated.data.mensaje,
      usuario_emisor_id: user.id,
      estado: 'PENDIENTE',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[CREAR SOLICITUD SEDES ERROR]', error.message)
    return { success: false, error: 'Error al enviar la comunicación entre sedes: ' + error.message }
  }

  revalidatePath('/admin/almacenes')
  return { success: true, solicitud_id: newRow.id }
}

const responderSolicitudSchema = z.object({
  solicitud_id: z.string().uuid(),
  nuevo_estado: z.enum(['APROBADO', 'EN_TRANSITO', 'RECIBIDO', 'RECHAZADO']),
  respuesta: z.string().trim().min(3, 'Ingresa una respuesta u observación (mínimo 3 caracteres)'),
})

export async function responderSolicitudSedesAction(
  data: z.infer<typeof responderSolicitudSchema>
): Promise<SolicitudResult> {
  const validated = responderSolicitudSchema.safeParse(data)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Datos de respuesta inválidos.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('solicitud_traslado')
    .update({
      estado: validated.data.nuevo_estado,
      respuesta: validated.data.respuesta,
      usuario_receptor_id: user.id,
      fecha_respuesta: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', validated.data.solicitud_id)

  if (error) {
    console.error('[RESPONDER SOLICITUD ERROR]', error.message)
    return { success: false, error: 'No se pudo actualizar el estado: ' + error.message }
  }

  revalidatePath('/admin/almacenes')
  return { success: true }
}

export async function anularSolicitudSedesAction(solicitudId: string): Promise<SolicitudResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida.' }

  const adminClient = createAdminClient()

  // Verificar que la solicitud esté PENDIENTE antes de anular
  const { data: sol, error: fetchErr } = await adminClient
    .from('solicitud_traslado')
    .select('id, estado')
    .eq('id', solicitudId)
    .single()

  if (fetchErr || !sol) {
    return { success: false, error: 'La solicitud no existe o ya fue eliminada.' }
  }

  if (sol.estado !== 'PENDIENTE') {
    return {
      success: false,
      error: 'No se puede anular un requerimiento que ya ha sido despachado en camión o completado.',
    }
  }

  const { error: delErr } = await adminClient
    .from('solicitud_traslado')
    .delete()
    .eq('id', solicitudId)

  if (delErr) {
    console.error('[ANULAR SOLICITUD ERROR]', delErr.message)
    return { success: false, error: 'Error al anular la solicitud: ' + delErr.message }
  }

  revalidatePath('/admin/almacenes')
  return { success: true }
}
