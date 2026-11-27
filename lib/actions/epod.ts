'use server'

import { createHmac, timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '../supabase/admin'
import { invalidateFastCache } from '../cache/fast-cache'

function getEpodSecret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'stockia-epod-fallback'
}

export async function signDeliveryToken(solicitudId: string): Promise<string> {
  return createHmac('sha256', getEpodSecret())
    .update(`epod:${solicitudId}`)
    .digest('hex')
    .slice(0, 24)
}

export async function verifyDeliveryToken(solicitudId: string, token: string): Promise<boolean> {
  if (!solicitudId || !token) return false
  const expected = await signDeliveryToken(solicitudId)
  const bufA = Buffer.from(expected, 'utf8')
  const bufB = Buffer.from(token, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export interface EpodFirmaGuardada {
  receptor_nombre: string
  receptor_dni: string
  observaciones: string
  firma_svg_paths: string[]
  fecha_firma: string
}

export interface EntregaPublicaPayload {
  valid: boolean
  error?: string
  solicitud?: {
    id: string
    codigo: string
    estado: string
    cantidad: number
    prioridad: string
    mensaje: string
    fecha_solicitud: string
    sede_origen_nombre: string
    sede_destino_nombre: string
    producto_nombre: string | null
    producto_sku: string | null
  }
  firma?: EpodFirmaGuardada | null
}

export async function getEntregaPublicaData(
  solicitudId: string,
  token: string
): Promise<EntregaPublicaPayload> {
  const isUuid = z.string().uuid().safeParse(solicitudId).success
  if (!isUuid || !(await verifyDeliveryToken(solicitudId, token))) {
    return { valid: false, error: 'Enlace de entrega inválido o firma de seguridad expirada.' }
  }

  const adminClient = createAdminClient()

  const [{ data: sol, error }, { data: epodAudit }] = await Promise.all([
    adminClient
      .from('solicitud_traslado')
      .select(`
        id,
        estado,
        cantidad,
        prioridad,
        mensaje,
        fecha_solicitud,
        sede_origen:sede_origen_id (nombre),
        sede_destino:sede_destino_id (nombre),
        producto:producto_id (nombre, sku)
      `)
      .eq('id', solicitudId)
      .maybeSingle(),
    adminClient
      .from('auditoria')
      .select('datos_nuevos, created_at')
      .eq('tabla', 'epod_entregas')
      .eq('registro_id', solicitudId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (error || !sol) {
    return { valid: false, error: 'La guía de traslado solicitada no existe.' }
  }

  const origenRel = Array.isArray(sol.sede_origen) ? sol.sede_origen[0] : sol.sede_origen
  const destinoRel = Array.isArray(sol.sede_destino) ? sol.sede_destino[0] : sol.sede_destino
  const prodRel = Array.isArray(sol.producto) ? sol.producto[0] : sol.producto

  const firma = (epodAudit?.datos_nuevos as EpodFirmaGuardada | null) || null

  return {
    valid: true,
    solicitud: {
      id: sol.id,
      codigo: sol.id.slice(0, 8).toUpperCase(),
      estado: sol.estado,
      cantidad: Number(sol.cantidad) || 0,
      prioridad: sol.prioridad,
      mensaje: sol.mensaje,
      fecha_solicitud: sol.fecha_solicitud,
      sede_origen_nombre: origenRel?.nombre || 'Sede Destino',
      sede_destino_nombre: destinoRel?.nombre || 'Sede Despacho',
      producto_nombre: prodRel?.nombre || null,
      producto_sku: prodRel?.sku || null,
    },
    firma,
  }
}

const registrarFirmaSchema = z.object({
  solicitud_id: z.string().uuid(),
  token: z.string().min(10),
  receptor_nombre: z.string().trim().min(3, 'Ingresa el nombre completo de quien recibe'),
  receptor_dni: z
    .string()
    .trim()
    .regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos numéricos'),
  observaciones: z.string().trim().max(300).optional(),
  firma_svg_paths: z.array(z.string()).min(1, 'Debes trazar tu firma en el recuadro'),
})

export async function registrarFirmaEntregaAction(
  rawInput: z.infer<typeof registrarFirmaSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = registrarFirmaSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Datos de conformidad incompletos.',
    }
  }

  const { solicitud_id, token, receptor_nombre, receptor_dni, observaciones, firma_svg_paths } =
    parsed.data

  if (!(await verifyDeliveryToken(solicitud_id, token))) {
    return { success: false, error: 'Firma digital no autorizada (token inválido).' }
  }

  const adminClient = createAdminClient()

  const { data: sol } = await adminClient
    .from('solicitud_traslado')
    .select('id, negocio_id, sede_origen_id, producto_id, cantidad, estado, usuario_emisor_id')
    .eq('id', solicitud_id)
    .single()

  if (!sol) {
    return { success: false, error: 'Guía de traslado no encontrada.' }
  }

  const fechaFirma = new Date().toISOString()
  const firmaPayload: EpodFirmaGuardada = {
    receptor_nombre,
    receptor_dni,
    observaciones: observaciones || 'Recepción conforme verificada en punto de entrega.',
    firma_svg_paths,
    fecha_firma: fechaFirma,
  }

  // Si la guía estaba EN_TRANSITO, registrar entrada automática en la sede receptora y marcar RECIBIDO
  if (sol.estado === 'EN_TRANSITO' && sol.producto_id && Number(sol.cantidad) > 0) {
    await adminClient.rpc('registrar_movimiento', {
      p_negocio_id: sol.negocio_id,
      p_usuario_id: sol.usuario_emisor_id,
      p_tipo: 'ENTRADA',
      p_motivo: `Recepción e-POD firmada por ${receptor_nombre} (DNI ${receptor_dni}) · Guía #${sol.id.slice(0, 8).toUpperCase()}`,
      p_almacen_origen_id: null,
      p_almacen_destino_id: sol.sede_origen_id,
      p_detalles: [
        {
          producto_id: sol.producto_id,
          cantidad: Number(sol.cantidad),
          costo_unitario: 0,
        },
      ],
      p_referencia_tipo: 'SOLICITUD_TRASLADO',
      p_referencia_id: sol.id,
    })

    await adminClient
      .from('solicitud_traslado')
      .update({
        estado: 'RECIBIDO',
        respuesta: `Conformidad e-POD firmada por ${receptor_nombre} (DNI ${receptor_dni}).`,
        fecha_respuesta: fechaFirma,
        updated_at: fechaFirma,
      })
      .eq('id', sol.id)
  }

  await adminClient.from('auditoria').insert({
    negocio_id: sol.negocio_id,
    usuario_id: sol.usuario_emisor_id,
    tabla: 'epod_entregas',
    registro_id: sol.id,
    accion: 'ENTREGA_FIRMADA',
    datos_nuevos: firmaPayload,
  })

  invalidateFastCache('reabastecimiento-rop')
  invalidateFastCache('inventario-fisico')
  invalidateFastCache('dashboard-data')
  revalidatePath('/admin/almacenes')
  revalidatePath('/admin/inventario')
  revalidatePath('/admin/movimientos')
  revalidatePath(`/entrega/${solicitud_id}`)

  return { success: true }
}

export async function getEpodDataParaAlmacenes(
  solicitudIds: string[]
): Promise<Record<string, { token: string; firma: EpodFirmaGuardada | null }>> {
  if (solicitudIds.length === 0) return {}

  const adminClient = createAdminClient()
  const [{ data: firmas }, tokens] = await Promise.all([
    adminClient
      .from('auditoria')
      .select('registro_id, datos_nuevos, created_at')
      .eq('tabla', 'epod_entregas')
      .in('registro_id', solicitudIds)
      .order('created_at', { ascending: false }),
    Promise.all(solicitudIds.map(async (id) => [id, await signDeliveryToken(id)] as const)),
  ])

  const firmasMap = new Map<string, EpodFirmaGuardada>()
  for (const row of firmas || []) {
    if (row.registro_id && !firmasMap.has(row.registro_id) && row.datos_nuevos) {
      firmasMap.set(row.registro_id, row.datos_nuevos as EpodFirmaGuardada)
    }
  }

  const result: Record<string, { token: string; firma: EpodFirmaGuardada | null }> = {}
  for (const [id, token] of tokens) {
    result[id] = {
      token,
      firma: firmasMap.get(id) || null,
    }
  }

  return result
}
