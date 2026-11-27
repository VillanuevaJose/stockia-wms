'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'
import { invalidateFastCache } from '../cache/fast-cache'

export interface RespaldoHistorialItem {
  id: string
  tipo: 'MANUAL' | 'AUTOMATICO'
  checksum_sha256: string
  tamano_kb: number
  counts: Record<string, number>
  usuario_nombre: string
  fecha: string
}

export interface VerificacionRespaldoResult {
  valid: boolean
  error?: string
  schema_version?: string
  generated_at?: string
  negocio_nombre?: string
  misma_empresa?: boolean
  integridad_ok?: boolean
  checksum_calculado?: string
  counts?: Record<string, number>
}

export async function getHistorialRespaldosAction(): Promise<RespaldoHistorialItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario?.negocio_id || usuario.rol !== 'admin') return []

  const adminClient = createAdminClient()
  const { data: rows } = await adminClient
    .from('auditoria')
    .select('id, accion, datos_nuevos, created_at')
    .eq('negocio_id', usuario.negocio_id)
    .eq('tabla', 'respaldos')
    .order('created_at', { ascending: false })
    .limit(20)

  if (!rows) return []

  return rows.map((r) => {
    const payload = (r.datos_nuevos || {}) as Partial<RespaldoHistorialItem>
    return {
      id: r.id,
      tipo: r.accion === 'RESPALDO_AUTOMATICO' ? 'AUTOMATICO' : 'MANUAL',
      checksum_sha256: payload.checksum_sha256 || '',
      tamano_kb: Number(payload.tamano_kb) || 0,
      counts: payload.counts || {},
      usuario_nombre: payload.usuario_nombre || 'Sistema',
      fecha: payload.fecha || r.created_at,
    }
  })
}

export async function generarSnapshotAutomaticoAction(): Promise<{
  success: boolean
  error?: string
  respaldo?: RespaldoHistorialItem
}> {
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
    return { success: false, error: 'Solo administradores pueden generar respaldos automáticos.' }
  }

  const negocioId = usuario.negocio_id

  const [{ data: productos }, { data: inventario }, { data: almacenes }, { data: proveedores }] =
    await Promise.all([
      supabase
        .from('productos')
        .select('id, sku, nombre, stock, stock_minimo, costo, precio_soles, activo')
        .eq('negocio_id', negocioId),
      supabase.from('inventario').select('id, almacen_id, producto_id, stock_actual'),
      supabase.from('almacen').select('id, nombre').eq('negocio_id', negocioId),
      supabase.from('proveedor').select('id, razon_social, ruc').eq('negocio_id', negocioId),
    ])

  const snapshotData = {
    almacenes: almacenes || [],
    productos: productos || [],
    inventario: inventario || [],
    proveedores: proveedores || [],
  }

  const counts = {
    almacenes: snapshotData.almacenes.length,
    productos: snapshotData.productos.length,
    inventario: snapshotData.inventario.length,
    proveedores: snapshotData.proveedores.length,
  }

  const serialized = JSON.stringify(snapshotData)
  const checksum = createHash('sha256').update(serialized).digest('hex')
  const tamanoKb = Math.max(1, Math.round(Buffer.byteLength(serialized, 'utf8') / 1024))
  const fecha = new Date().toISOString()

  const adminClient = createAdminClient()
  const { data: inserted, error } = await adminClient
    .from('auditoria')
    .insert({
      negocio_id: negocioId,
      usuario_id: user.id,
      tabla: 'respaldos',
      registro_id: crypto.randomUUID(),
      accion: 'RESPALDO_AUTOMATICO',
      datos_nuevos: {
        tipo: 'AUTOMATICO',
        checksum_sha256: checksum,
        tamano_kb: tamanoKb,
        counts,
        usuario_nombre: `Auto (${usuario.nombre_completo || 'Admin'})`,
        fecha,
      },
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return { success: false, error: 'No se pudo registrar el snapshot automático.' }
  }

  revalidatePath('/admin/configuracion')
  return {
    success: true,
    respaldo: {
      id: inserted.id,
      tipo: 'AUTOMATICO',
      checksum_sha256: checksum,
      tamano_kb: tamanoKb,
      counts,
      usuario_nombre: `Auto (${usuario.nombre_completo || 'Admin'})`,
      fecha,
    },
  }
}

export async function verificarRespaldoJsonAction(
  jsonText: string
): Promise<VerificacionRespaldoResult> {
  if (!jsonText.trim()) {
    return { valid: false, error: 'El archivo de respaldo está vacío.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { valid: false, error: 'Sesión no iniciada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id')
    .eq('id', user.id)
    .maybeSingle()

  try {
    const parsed = JSON.parse(jsonText) as {
      schema_version?: string
      generated_at?: string
      negocio_id?: string
      negocio_nombre?: string
      checksum_sha256?: string
      counts?: Record<string, number>
      data?: unknown
    }

    if (parsed.schema_version !== 'stockia-backup-v1' || !parsed.data || !parsed.checksum_sha256) {
      return {
        valid: false,
        error: 'El archivo no coincide con el formato oficial stockia-backup-v1.',
      }
    }

    const checksumCalculado = createHash('sha256')
      .update(JSON.stringify(parsed.data))
      .digest('hex')

    const integridadOk = checksumCalculado === parsed.checksum_sha256
    const mismaEmpresa = Boolean(usuario?.negocio_id && parsed.negocio_id === usuario.negocio_id)

    return {
      valid: integridadOk,
      error: !integridadOk
        ? 'Alerta de integridad: el hash SHA-256 no coincide. El archivo fue modificado o está corrupto.'
        : undefined,
      schema_version: parsed.schema_version,
      generated_at: parsed.generated_at,
      negocio_nombre: parsed.negocio_nombre || 'Empresa',
      misma_empresa: mismaEmpresa,
      integridad_ok: integridadOk,
      checksum_calculado: checksumCalculado,
      counts: parsed.counts || {},
    }
  } catch {
    return { valid: false, error: 'El archivo no contiene JSON válido.' }
  }
}

export async function restaurarRespaldoJsonAction(jsonText: string): Promise<{
  success: boolean
  error?: string
  resumen?: {
    almacenes: number
    categorias: number
    proveedores: number
    clientes: number
    productos: number
  }
}> {
  if (!jsonText.trim()) {
    return { success: false, error: 'El archivo de respaldo está vacío.' }
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
    return { success: false, error: 'Solo un administrador puede restaurar respaldos.' }
  }

  const negocioId = usuario.negocio_id

  try {
    const parsed = JSON.parse(jsonText) as {
      schema_version?: string
      negocio_id?: string
      checksum_sha256?: string
      data?: {
        almacenes?: Array<Record<string, unknown>>
        categorias?: Array<Record<string, unknown>>
        unidades?: Array<Record<string, unknown>>
        proveedores?: Array<Record<string, unknown>>
        clientes?: Array<Record<string, unknown>>
        productos?: Array<Record<string, unknown>>
        inventario?: Array<{ id?: string; almacen_id: string; producto_id: string; stock_actual: number }>
      }
    }

    if (parsed.schema_version !== 'stockia-backup-v1' || !parsed.data || !parsed.checksum_sha256) {
      return { success: false, error: 'Formato de respaldo inválido.' }
    }

    const checksumCalculado = createHash('sha256')
      .update(JSON.stringify(parsed.data))
      .digest('hex')

    if (checksumCalculado !== parsed.checksum_sha256) {
      return {
        success: false,
        error: 'Firma SHA-256 inválida. El archivo fue alterado o está corrupto.',
      }
    }

    if (parsed.negocio_id !== negocioId) {
      return {
        success: false,
        error: 'Este respaldo pertenece a otra empresa y no puede restaurarse aquí.',
      }
    }

    const d = parsed.data
    const adminClient = createAdminClient()

    const almacenes = (d.almacenes || []).map((r) => ({ ...r, negocio_id: negocioId }))
    const categorias = (d.categorias || []).map((r) => ({ ...r, negocio_id: negocioId }))
    const unidades = (d.unidades || []).map((r) => ({ ...r, negocio_id: negocioId }))
    const proveedores = (d.proveedores || []).map((r) => ({ ...r, negocio_id: negocioId }))
    const clientes = (d.clientes || []).map((r) => ({ ...r, negocio_id: negocioId }))
    const productos = (d.productos || []).map((r) => ({ ...r, negocio_id: negocioId }))

    if (almacenes.length > 0) {
      await adminClient.from('almacen').upsert(almacenes, { onConflict: 'id' })
    }
    if (categorias.length > 0) {
      await adminClient.from('categoria').upsert(categorias, { onConflict: 'id' })
    }
    if (unidades.length > 0) {
      await adminClient.from('unidad_medida').upsert(unidades, { onConflict: 'id' })
    }
    if (proveedores.length > 0) {
      await adminClient.from('proveedor').upsert(proveedores, { onConflict: 'id' })
    }
    if (clientes.length > 0) {
      await adminClient.from('cliente').upsert(clientes, { onConflict: 'id' })
    }
    if (productos.length > 0) {
      await adminClient.from('productos').upsert(productos, { onConflict: 'id' })
    }

    // Reconciliar existencias por sede mediante registrar_movimiento (respetando trigger Kardex)
    if (d.inventario && d.inventario.length > 0) {
      const almacenIds = [...new Set(d.inventario.map((i) => i.almacen_id).filter(Boolean))]
      const { data: invActual } = await adminClient
        .from('inventario')
        .select('almacen_id, producto_id, stock_actual')
        .in('almacen_id', almacenIds)

      const mapaActual = new Map<string, number>()
      for (const row of invActual || []) {
        mapaActual.set(`${row.almacen_id}:${row.producto_id}`, Number(row.stock_actual) || 0)
      }

      for (const item of d.inventario) {
        const actual = mapaActual.get(`${item.almacen_id}:${item.producto_id}`) ?? 0
        const deseado = Number(item.stock_actual) || 0
        const diff = Math.round((deseado - actual) * 100) / 100
        if (diff !== 0) {
          const esIngreso = diff > 0
          await adminClient.rpc('registrar_movimiento', {
            p_negocio_id: negocioId,
            p_usuario_id: user.id,
            p_tipo: 'AJUSTE',
            p_motivo: 'Restauración de stock desde respaldo SHA-256',
            p_almacen_origen_id: esIngreso ? null : item.almacen_id,
            p_almacen_destino_id: esIngreso ? item.almacen_id : null,
            p_detalles: [
              {
                producto_id: item.producto_id,
                cantidad: Math.abs(diff),
                costo_unitario: 0,
              },
            ],
            p_referencia_tipo: 'RESTAURACION_RESPALDO',
            p_referencia_id: null,
          })
        }
      }
    }

    await adminClient.from('auditoria').insert({
      negocio_id: negocioId,
      usuario_id: user.id,
      tabla: 'respaldos',
      registro_id: crypto.randomUUID(),
      accion: 'RESPALDO_RESTAURADO',
      datos_nuevos: {
        tipo: 'MANUAL',
        checksum_sha256: checksumCalculado,
        tamano_kb: Math.max(1, Math.round(Buffer.byteLength(jsonText, 'utf8') / 1024)),
        counts: {
          almacenes: almacenes.length,
          categorias: categorias.length,
          proveedores: proveedores.length,
          clientes: clientes.length,
          productos: productos.length,
        },
        usuario_nombre: usuario.nombre_completo || user.email || 'Administrador',
        fecha: new Date().toISOString(),
      },
    })

    invalidateFastCache('inventario-fisico')
    invalidateFastCache('reabastecimiento-rop')
    invalidateFastCache('dashboard-data')
    invalidateFastCache('anomalias-operativas')
    revalidatePath('/admin')
    revalidatePath('/admin/productos')
    revalidatePath('/admin/inventario')
    revalidatePath('/admin/compras')
    revalidatePath('/admin/configuracion')

    return {
      success: true,
      resumen: {
        almacenes: almacenes.length,
        categorias: categorias.length,
        proveedores: proveedores.length,
        clientes: clientes.length,
        productos: productos.length,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al restaurar el respaldo.',
    }
  }
}
