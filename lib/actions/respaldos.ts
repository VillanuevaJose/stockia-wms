'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'

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

  const { data: rows } = await supabase
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
