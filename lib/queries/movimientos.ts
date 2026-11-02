import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'

export interface MovimientoRow {
  id: string
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA'
  motivo: string
  referencia_tipo: string | null
  fecha: string
  usuario_nombre?: string
  almacen_origen_nombre?: string
  almacen_destino_nombre?: string
  total_items?: number
}

export async function getMovimientos(options?: {
  tipo?: string
  q?: string
  page?: number
  pageSize?: number
}): Promise<{
  movimientos: MovimientoRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}> {
  const cacheKey = `movimientos-${options?.tipo || 'all'}-${options?.q || ''}-${options?.page || 1}`
  return withFastCache(cacheKey, 20, async () => {
    const supabase = await createClient()
  const page = options?.page || 1
  const pageSize = options?.pageSize || 15
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('movimiento_inventario')
    .select(`
      id,
      tipo,
      motivo,
      referencia_tipo,
      fecha,
      usuarios:usuario_id (nombre_completo),
      almacen_origen:almacen_origen_id (nombre),
      almacen_destino:almacen_destino_id (nombre),
      detalle:detalle_movimiento (id)
    `, { count: 'exact' })

  if (options?.tipo && options.tipo !== 'TODOS') {
    query = query.eq('tipo', options.tipo)
  }

  if (options?.q) {
    query = query.ilike('motivo', `%${options.q}%`)
  }

  const { data, count, error } = await query
    .order('fecha', { ascending: false })
    .range(from, to)

  if (error || !data || data.length === 0) {
    return {
      movimientos: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    }
  }

interface RawMovimientoItem {
  id: string
  tipo: MovimientoRow['tipo']
  motivo: string
  referencia_tipo?: string
  fecha: string
  usuarios?: { nombre_completo?: string }
  almacen_origen?: { nombre?: string }
  almacen_destino?: { nombre?: string }
  detalle?: unknown[]
}

  const movimientos: MovimientoRow[] = data.map((item) => {
    const raw = item as unknown as RawMovimientoItem
    return {
      id: raw.id,
      tipo: raw.tipo,
      motivo: raw.motivo,
      referencia_tipo: raw.referencia_tipo || null,
      fecha: raw.fecha,
      usuario_nombre: raw.usuarios?.nombre_completo || 'Operador',
      almacen_origen_nombre: raw.almacen_origen?.nombre || 'Almacén Central',
      almacen_destino_nombre: raw.almacen_destino?.nombre || 'Destino',
      total_items: Array.isArray(raw.detalle) ? raw.detalle.length : 1,
    }
  })

    return {
      movimientos,
      total: count || movimientos.length,
      page,
      pageSize,
      totalPages: Math.ceil((count || movimientos.length) / pageSize),
    }
  })
}
