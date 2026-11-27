'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'
import { invalidateFastCache } from '../cache/fast-cache'

export interface LoteFefoRow {
  lote_id: string
  producto_id: string
  sku: string
  producto_nombre: string
  almacen_id: string | null
  almacen_nombre: string
  numero_lote: string
  fecha_vencimiento: string
  stock_lote: number
  dias_restantes: number
  estado_caducidad: 'VENCIDO' | 'POR_VENCER' | 'VIGENTE'
}

export async function getLotesFefoAction(): Promise<LoteFefoRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario?.negocio_id) return []

  const adminClient = createAdminClient()
  const { data: eventos } = await adminClient
    .from('auditoria')
    .select('registro_id, datos_nuevos, created_at')
    .eq('negocio_id', usuario.negocio_id)
    .eq('tabla', 'producto_lotes')
    .order('created_at', { ascending: false })
    .limit(200)

  if (!eventos || eventos.length === 0) return []

  const lotesMap = new Map<string, Omit<LoteFefoRow, 'dias_restantes' | 'estado_caducidad'>>()
  for (const ev of eventos) {
    const id = ev.registro_id
    if (!id || lotesMap.has(id) || !ev.datos_nuevos) continue
    const data = ev.datos_nuevos as Partial<LoteFefoRow>
    if ((Number(data.stock_lote) || 0) <= 0) continue

    lotesMap.set(id, {
      lote_id: id,
      producto_id: data.producto_id || '',
      sku: data.sku || 'S/N',
      producto_nombre: data.producto_nombre || 'Producto',
      almacen_id: data.almacen_id || null,
      almacen_nombre: data.almacen_nombre || 'Principal',
      numero_lote: data.numero_lote || '',
      fecha_vencimiento: data.fecha_vencimiento || '',
      stock_lote: Number(data.stock_lote) || 0,
    })
  }

  const hoyMs = Date.now()
  const list: LoteFefoRow[] = Array.from(lotesMap.values()).map((lote) => {
    const expMs = new Date(lote.fecha_vencimiento).getTime()
    const dias = Math.ceil((expMs - hoyMs) / (1000 * 60 * 60 * 24))
    const estado: LoteFefoRow['estado_caducidad'] =
      dias <= 0 ? 'VENCIDO' : dias <= 30 ? 'POR_VENCER' : 'VIGENTE'

    return {
      ...lote,
      dias_restantes: dias,
      estado_caducidad: estado,
    }
  })

  // Orden estricto FEFO: primero los que vencen antes
  list.sort((a, b) => a.fecha_vencimiento.localeCompare(b.fecha_vencimiento))
  return list
}

const crearLoteSchema = z.object({
  producto_id: z.string().uuid('Selecciona un producto válido'),
  almacen_id: z.string().uuid().optional().nullable(),
  numero_lote: z.string().trim().min(2, 'El código de lote es obligatorio'),
  fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de vencimiento inválida'),
  cantidad: z.number().positive('La cantidad del lote debe ser mayor a 0'),
})

export async function registrarLoteFefoAction(
  rawInput: z.infer<typeof crearLoteSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = crearLoteSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Datos de lote inválidos.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no iniciada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id || usuario.rol === 'vendedor') {
    return { success: false, error: 'Sin permisos para registrar lotes.' }
  }

  const [{ data: prod }, { data: alm }] = await Promise.all([
    supabase
      .from('productos')
      .select('id, sku, nombre')
      .eq('id', parsed.data.producto_id)
      .eq('negocio_id', usuario.negocio_id)
      .single(),
    parsed.data.almacen_id
      ? supabase
          .from('almacen')
          .select('id, nombre')
          .eq('id', parsed.data.almacen_id)
          .eq('negocio_id', usuario.negocio_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!prod) return { success: false, error: 'Producto no encontrado.' }

  const loteId = crypto.randomUUID()
  const adminClient = createAdminClient()

  const { error } = await adminClient.from('auditoria').insert({
    negocio_id: usuario.negocio_id,
    usuario_id: user.id,
    tabla: 'producto_lotes',
    registro_id: loteId,
    accion: 'LOTE_REGISTRADO',
    datos_nuevos: {
      lote_id: loteId,
      producto_id: prod.id,
      sku: prod.sku || 'S/N',
      producto_nombre: prod.nombre,
      almacen_id: alm?.id || null,
      almacen_nombre: alm?.nombre || 'Almacén Principal',
      numero_lote: parsed.data.numero_lote,
      fecha_vencimiento: parsed.data.fecha_vencimiento,
      stock_lote: parsed.data.cantidad,
    },
  })

  if (error) {
    return { success: false, error: 'No se pudo registrar el lote.' }
  }

  invalidateFastCache('inventario-fisico')
  revalidatePath('/admin/inventario')
  return { success: true }
}

const despachoFefoSchema = z.object({
  producto_id: z.string().uuid(),
  cantidad_despachar: z.number().positive('La cantidad a despachar debe ser mayor a 0'),
})

/**
 * Descuenta existencias en estricto orden FEFO (First-Expired, First-Out):
 * consume primero los lotes más próximos a caducar.
 */
export async function despacharPorFefoAction(
  rawInput: z.infer<typeof despachoFefoSchema>
): Promise<{
  success: boolean
  error?: string
  resumen_lotes?: Array<{ numero_lote: string; descontado: number; fecha_vencimiento: string }>
}> {
  const parsed = despachoFefoSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Datos inválidos.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no iniciada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id || usuario.rol === 'vendedor') {
    return { success: false, error: 'Sin permisos para despachar lotes.' }
  }

  const todosLotes = await getLotesFefoAction()
  const lotesProducto = todosLotes.filter(
    (l) => l.producto_id === parsed.data.producto_id && l.stock_lote > 0
  )

  const disponibleTotal = lotesProducto.reduce((acc, l) => acc + l.stock_lote, 0)
  if (disponibleTotal < parsed.data.cantidad_despachar) {
    return {
      success: false,
      error: `Stock insuficiente en lotes registrados (disponible: ${disponibleTotal} und).`,
    }
  }

  let restante = parsed.data.cantidad_despachar
  const resumen: Array<{ numero_lote: string; descontado: number; fecha_vencimiento: string }> = []
  const adminClient = createAdminClient()

  for (const lote of lotesProducto) {
    if (restante <= 0) break
    const tomar = Math.min(restante, lote.stock_lote)
    const nuevoSaldo = Math.round((lote.stock_lote - tomar) * 100) / 100
    restante = Math.round((restante - tomar) * 100) / 100

    await adminClient.from('auditoria').insert({
      negocio_id: usuario.negocio_id,
      usuario_id: user.id,
      tabla: 'producto_lotes',
      registro_id: lote.lote_id,
      accion: 'LOTE_DESCONTADO_FEFO',
      datos_nuevos: {
        lote_id: lote.lote_id,
        producto_id: lote.producto_id,
        sku: lote.sku,
        producto_nombre: lote.producto_nombre,
        almacen_id: lote.almacen_id,
        almacen_nombre: lote.almacen_nombre,
        numero_lote: lote.numero_lote,
        fecha_vencimiento: lote.fecha_vencimiento,
        stock_lote: nuevoSaldo,
      },
    })

    resumen.push({
      numero_lote: lote.numero_lote,
      descontado: tomar,
      fecha_vencimiento: lote.fecha_vencimiento,
    })
  }

  revalidatePath('/admin/inventario')
  return { success: true, resumen_lotes: resumen }
}
