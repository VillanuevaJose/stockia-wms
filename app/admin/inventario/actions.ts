'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { invalidateFastCache } from '../../../lib/cache/fast-cache'
import type { ConteoCiegoDetalleItem, SesionConteoCiego } from '../../../lib/queries/operaciones'

const conteoCiegoItemSchema = z.object({
  producto_id: z.string().uuid('ID de producto inválido'),
  cantidad_contada: z.number().min(0, 'La cantidad contada no puede ser negativa'),
})

const enviarConteoCiegoSchema = z.object({
  almacen_id: z.string().uuid().optional().nullable(),
  motivo_general: z.string().trim().min(3, 'El motivo debe tener al menos 3 caracteres').default('Auditoría física ciega'),
  conteos: z.array(conteoCiegoItemSchema).min(1, 'Ingresa al menos un producto contado'),
})

const ajusteItemSchema = z.object({
  producto_id: z.string().uuid('ID de producto inválido'),
  producto_nombre: z.string().optional(),
  sku: z.string().optional(),
  almacen_id: z.string().uuid().optional().nullable(),
  stock_sistema: z.number().optional(),
  cantidad_contada: z.number().optional(),
  diferencia: z.number().refine((n) => n !== 0, 'La diferencia no puede ser cero'),
  costo_unitario: z.number().min(0).default(0),
})

const aplicarConteoSchema = z.object({
  sesion_id: z.string().uuid().optional(),
  almacen_id: z.string().uuid().optional().nullable(),
  motivo_general: z.string().trim().min(3).default('Auditoría física ciega'),
  operario_nombre: z.string().optional(),
  total_contados: z.number().optional(),
  ajustes: z.array(ajusteItemSchema).min(1, 'Debe haber al menos un producto con diferencia para ajustar'),
})

export type ConciliacionConteoResult = {
  success: boolean
  error?: string
  requiere_aprobacion_admin?: boolean
  sesion_id?: string
  total_contados?: number
  total_con_diferencia?: number
  faltante_soles?: number
  sobrante_soles?: number
  detalles?: ConteoCiegoDetalleItem[]
}

export type ConteoResult = {
  success: boolean
  error?: string
  totalAjustados?: number
  totalFaltanteSoles?: number
  totalSobranteSoles?: number
}

function invalidarCachesInventario() {
  invalidateFastCache('inventario-fisico')
  invalidateFastCache('sesiones-conteo-ciego')
  invalidateFastCache('dashboard-data')
  invalidateFastCache('reabastecimiento-rop')
  invalidateFastCache('kardex-sunat')
  invalidateFastCache('auditoria-list')

  revalidatePath('/admin/inventario')
  revalidatePath('/admin/movimientos')
  revalidatePath('/admin/productos')
  revalidatePath('/admin/auditoria')
  revalidatePath('/admin')
}

/**
 * Procesa un conteo ciego en servidor sin haber expuesto los saldos teóricos al operario.
 * - Si el rol es `almacenero`, guarda la sesión en estado PENDIENTE sin revelar diferencias.
 * - Si el rol es `admin`, calcula y retorna el cuadro de conciliación para revisión y firma.
 */
export async function procesarConteoCiegoAction(
  rawInput: z.infer<typeof enviarConteoCiegoSchema>
): Promise<ConciliacionConteoResult> {
  const parsed = enviarConteoCiegoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Datos de conteo inválidos.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Sesión no iniciada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) return { success: false, error: 'Usuario sin negocio asignado.' }
  if (usuario.rol === 'vendedor') {
    return { success: false, error: 'Los vendedores no tienen acceso a auditorías de inventario.' }
  }

  const negocio_id = usuario.negocio_id

  // Resolver almacén objetivo
  let almacenId = parsed.data.almacen_id || null
  let almacenNombre = 'Almacén Principal'

  if (almacenId) {
    const { data: alm } = await supabase
      .from('almacen')
      .select('id, nombre')
      .eq('id', almacenId)
      .eq('negocio_id', negocio_id)
      .maybeSingle()
    if (!alm) return { success: false, error: 'Almacén seleccionado no válido.' }
    almacenNombre = alm.nombre
  } else {
    const { data: alm } = await supabase
      .from('almacen')
      .select('id, nombre')
      .eq('negocio_id', negocio_id)
      .eq('activo', true)
      .order('es_principal', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (alm) {
      almacenId = alm.id
      almacenNombre = alm.nombre
    }
  }

  const productIds = [...new Set(parsed.data.conteos.map((c) => c.producto_id))]

  // Consultar productos y saldos reales en servidor (RLS multi-tenant activo)
  const [{ data: productos }, { data: inventarioRows }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, sku, nombre, costo, precio_soles, stock')
      .eq('negocio_id', negocio_id)
      .in('id', productIds),
    almacenId
      ? supabase
          .from('inventario')
          .select('producto_id, stock_actual')
          .eq('almacen_id', almacenId)
          .in('producto_id', productIds)
      : Promise.resolve({ data: [] as { producto_id: string; stock_actual: number }[] }),
  ])

  const mapaProd = new Map((productos || []).map((p) => [p.id, p]))
  const mapaInv = new Map((inventarioRows || []).map((r) => [r.producto_id, Number(r.stock_actual) || 0]))

  let faltanteSoles = 0
  let sobranteSoles = 0
  const detalles: ConteoCiegoDetalleItem[] = []

  for (const item of parsed.data.conteos) {
    const prod = mapaProd.get(item.producto_id)
    if (!prod) continue

    const stockSistema = mapaInv.has(item.producto_id)
      ? mapaInv.get(item.producto_id)!
      : Number(prod.stock) || 0
    const costo = Number(prod.costo) > 0 ? Number(prod.costo) : Number(prod.precio_soles) || 0
    const diferencia = Math.round((item.cantidad_contada - stockSistema) * 100) / 100
    const impactoSoles = Math.round(diferencia * costo * 100) / 100

    if (diferencia < 0) faltanteSoles += Math.abs(impactoSoles)
    else if (diferencia > 0) sobranteSoles += impactoSoles

    detalles.push({
      producto_id: item.producto_id,
      sku: prod.sku || 'S/N',
      producto_nombre: prod.nombre,
      almacen_id: almacenId,
      stock_sistema: stockSistema,
      cantidad_contada: item.cantidad_contada,
      diferencia,
      costo_unitario: costo,
      impacto_soles: impactoSoles,
    })
  }

  faltanteSoles = Math.round(faltanteSoles * 100) / 100
  sobranteSoles = Math.round(sobranteSoles * 100) / 100
  const totalConDiferencia = detalles.filter((d) => d.diferencia !== 0).length
  const sesionId = crypto.randomUUID()

  // Si es almacenero, guardamos la sesión ciega como PENDIENTE para aprobación gerencial
  // sin exponer los saldos del sistema al operario.
  if (usuario.rol !== 'admin') {
    const adminClient = createAdminClient()
    const payloadSesion: SesionConteoCiego = {
      sesion_id: sesionId,
      estado: 'PENDIENTE',
      motivo: parsed.data.motivo_general,
      almacen_id: almacenId,
      almacen_nombre: almacenNombre,
      operario_nombre: usuario.nombre_completo || user.email || 'Almacenero',
      fecha_envio: new Date().toISOString(),
      total_contados: detalles.length,
      total_con_diferencia: totalConDiferencia,
      faltante_soles: faltanteSoles,
      sobrante_soles: sobranteSoles,
      detalles,
    }

    const { error: auditErr } = await adminClient.from('auditoria').insert({
      negocio_id,
      usuario_id: user.id,
      tabla: 'conteo_ciego',
      registro_id: sesionId,
      accion: 'CONTEO_CIEGO_PENDIENTE',
      datos_nuevos: payloadSesion,
    })

    if (auditErr) {
      return { success: false, error: 'No se pudo registrar la sesión de conteo ciego.' }
    }

    invalidarCachesInventario()

    return {
      success: true,
      requiere_aprobacion_admin: true,
      sesion_id: sesionId,
      total_contados: detalles.length,
    }
  }

  // Si es admin, devolvemos el cuadro completo de conciliación para revisión antes de asentar
  return {
    success: true,
    requiere_aprobacion_admin: false,
    sesion_id: sesionId,
    total_contados: detalles.length,
    total_con_diferencia: totalConDiferencia,
    faltante_soles: faltanteSoles,
    sobrante_soles: sobranteSoles,
    detalles,
  }
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

  if (usuario.rol !== 'admin') {
    return {
      success: false,
      error: 'Solo un administrador puede aprobar diferencias y asentar ajustes en Kardex.',
    }
  }

  const negocio_id = usuario.negocio_id

  // Obtener almacén por defecto si no se especificó
  let defaultAlmacenId = parsed.data.almacen_id || null
  let almacenNombre = 'Almacén Principal'

  if (defaultAlmacenId) {
    const { data: alm } = await supabase
      .from('almacen')
      .select('id, nombre')
      .eq('id', defaultAlmacenId)
      .eq('negocio_id', negocio_id)
      .maybeSingle()
    if (alm) almacenNombre = alm.nombre
  } else {
    const { data: alm } = await supabase
      .from('almacen')
      .select('id, nombre')
      .eq('negocio_id', negocio_id)
      .eq('activo', true)
      .order('es_principal', { ascending: false })
      .limit(1)
      .maybeSingle()
    defaultAlmacenId = alm?.id || null
    if (alm?.nombre) almacenNombre = alm.nombre
  }

  if (!defaultAlmacenId) {
    return { success: false, error: 'No se encontró un almacén activo para registrar los ajustes.' }
  }

  let totalFaltanteSoles = 0
  let totalSobranteSoles = 0
  let totalAjustados = 0
  const detallesAudit: ConteoCiegoDetalleItem[] = []

  for (const item of parsed.data.ajustes) {
    const diff = item.diferencia
    const cantAbs = Math.abs(diff)
    const costo = item.costo_unitario || 0
    const itemAlmacenId = item.almacen_id || defaultAlmacenId

    const esMerma = diff < 0
    const motivo = `${parsed.data.motivo_general}: ${esMerma ? 'Faltante de' : 'Sobrante de'} ${cantAbs} und`
    const impactoSoles = Math.round(diff * costo * 100) / 100

    if (esMerma) {
      totalFaltanteSoles += cantAbs * costo
    } else {
      totalSobranteSoles += cantAbs * costo
    }

    const { error: rpcErr } = await supabase.rpc('registrar_movimiento', {
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
      p_referencia_tipo: 'CONTEO_CIEGO',
      p_referencia_id: parsed.data.sesion_id || null,
    })

    if (rpcErr) {
      return {
        success: false,
        error: `Error al ajustar ${item.producto_nombre || item.producto_id}: ${rpcErr.message}`,
      }
    }

    detallesAudit.push({
      producto_id: item.producto_id,
      sku: item.sku || 'S/N',
      producto_nombre: item.producto_nombre || 'Producto',
      almacen_id: itemAlmacenId,
      stock_sistema: item.stock_sistema ?? 0,
      cantidad_contada: item.cantidad_contada ?? 0,
      diferencia: diff,
      costo_unitario: costo,
      impacto_soles: impactoSoles,
    })

    totalAjustados++
  }

  totalFaltanteSoles = Math.round(totalFaltanteSoles * 100) / 100
  totalSobranteSoles = Math.round(totalSobranteSoles * 100) / 100

  // Registrar evento inmutable de aprobación en auditoría (columnas reales del esquema)
  try {
    const adminClient = createAdminClient()
    const sesionId = parsed.data.sesion_id || crypto.randomUUID()
    const payloadAprobado: SesionConteoCiego = {
      sesion_id: sesionId,
      estado: 'APROBADO',
      motivo: parsed.data.motivo_general,
      almacen_id: defaultAlmacenId,
      almacen_nombre: almacenNombre,
      operario_nombre: parsed.data.operario_nombre || usuario.nombre_completo || 'Administrador',
      revisor_nombre: usuario.nombre_completo || user.email || 'Administrador',
      fecha_envio: new Date().toISOString(),
      fecha_resolucion: new Date().toISOString(),
      total_contados: parsed.data.total_contados ?? totalAjustados,
      total_con_diferencia: totalAjustados,
      faltante_soles: totalFaltanteSoles,
      sobrante_soles: totalSobranteSoles,
      detalles: detallesAudit,
    }

    await adminClient.from('auditoria').insert({
      negocio_id,
      usuario_id: user.id,
      tabla: 'conteo_ciego',
      registro_id: sesionId,
      accion: 'CONTEO_CIEGO_APROBADO',
      datos_nuevos: payloadAprobado,
    })
  } catch {
    // No bloquear confirmación si fallara el log secundario
  }

  invalidarCachesInventario()

  return {
    success: true,
    totalAjustados,
    totalFaltanteSoles,
    totalSobranteSoles,
  }
}

export async function rechazarConteoCiegoAction(params: {
  sesion_id: string
  motivo_rechazo?: string
}): Promise<{ success: boolean; error?: string }> {
  const sesionParsed = z.string().uuid().safeParse(params.sesion_id)
  if (!sesionParsed.success) {
    return { success: false, error: 'ID de sesión inválido.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no iniciada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol, nombre_completo')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id || usuario.rol !== 'admin') {
    return { success: false, error: 'Solo un administrador puede rechazar auditorías.' }
  }

  // Verificar que la sesión pertenezca al negocio del administrador
  const { data: sesionPrev } = await supabase
    .from('auditoria')
    .select('datos_nuevos')
    .eq('negocio_id', usuario.negocio_id)
    .eq('tabla', 'conteo_ciego')
    .eq('registro_id', params.sesion_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!sesionPrev) {
    return { success: false, error: 'Sesión de conteo ciego no encontrada.' }
  }

  const prevData = (sesionPrev.datos_nuevos || {}) as Partial<SesionConteoCiego>
  const adminClient = createAdminClient()

  const { error } = await adminClient.from('auditoria').insert({
    negocio_id: usuario.negocio_id,
    usuario_id: user.id,
    tabla: 'conteo_ciego',
    registro_id: params.sesion_id,
    accion: 'CONTEO_CIEGO_RECHAZADO',
    datos_nuevos: {
      ...prevData,
      sesion_id: params.sesion_id,
      estado: 'RECHAZADO',
      motivo: params.motivo_rechazo?.trim() || prevData.motivo || 'Rechazado por administrador',
      revisor_nombre: usuario.nombre_completo || user.email || 'Administrador',
      fecha_resolucion: new Date().toISOString(),
    },
  })

  if (error) {
    return { success: false, error: 'No se pudo registrar el rechazo de la sesión.' }
  }

  invalidarCachesInventario()
  return { success: true }
}
