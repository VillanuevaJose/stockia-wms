import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'
import type { Database } from '../../types/database'

export type ProductoRow = Database['public']['Tables']['productos']['Row'] & {
  categoria?: { id: string; nombre: string } | null
  unidad_medida?: { id: string; codigo: string; nombre: string } | null
}

export interface FiltrosProductos {
  q?: string
  categoria_id?: string
  stock_bajo?: boolean
  activo?: boolean
  page?: number
  pageSize?: number
}

export async function getProductos(filtros: FiltrosProductos = {}) {
  const supabase = await createClient()

  const page = filtros.page && filtros.page > 0 ? filtros.page : 1
  const pageSize = filtros.pageSize || 15
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('productos')
    .select(
      `
      id,
      negocio_id,
      categoria_id,
      unidad_medida_id,
      sku,
      codigo_barras,
      nombre,
      descripcion,
      costo,
      precio_venta,
      precio_soles,
      stock_minimo,
      stock,
      activo,
      fecha_creacion,
      updated_at,
      categoria:categoria_id (id, nombre),
      unidad_medida:unidad_medida_id (id, codigo, nombre),
      inventario (stock_actual)
    `,
      { count: 'exact' }
    )
    .order('nombre', { ascending: true })
    .range(from, to)

  if (filtros.activo !== undefined) {
    query = query.eq('activo', filtros.activo)
  }

  if (filtros.categoria_id && filtros.categoria_id !== 'todas') {
    query = query.eq('categoria_id', filtros.categoria_id)
  }

  if (filtros.q && filtros.q.trim()) {
    const term = `%${filtros.q.trim()}%`
    query = query.or(`nombre.ilike.${term},sku.ilike.${term},codigo_barras.ilike.${term}`)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('Error consultando productos:', error.message)
    return {
      productos: [] as ProductoRow[],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    }
  }

  let finalData = ((data || []) as unknown as Array<
    ProductoRow & { inventario?: { stock_actual: number }[] }
  >).map((p) => {
    const stockInventario = Array.isArray(p.inventario)
      ? p.inventario.reduce((acc, item) => acc + (Number(item.stock_actual) || 0), 0)
      : 0
    const stockReal = stockInventario > 0 ? stockInventario : Number(p.stock) || 0
    return {
      ...p,
      stock: stockReal,
      precio_venta: Number(p.precio_venta) || Number(p.precio_soles) || 0,
    }
  })

  if (filtros.stock_bajo) {
    finalData = finalData.filter((p) => Number(p.stock) <= Number(p.stock_minimo))
  }

  const total = count || finalData.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return {
    productos: finalData,
    total,
    page,
    pageSize,
    totalPages,
  }
}

export async function getCategorias() {
  return withFastCache('categorias-selector', 60, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('categoria')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true })

    return data || []
  })
}

export async function getUnidadesMedida() {
  return withFastCache('unidades-selector', 60, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('unidad_medida')
      .select('id, codigo, nombre')
      .eq('activo', true)
      .order('codigo', { ascending: true })

    return data || []
  })
}

export async function getAlmacenes() {
  return withFastCache('almacenes-selector', 60, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('almacen')
      .select('id, nombre, codigo, es_principal')
      .eq('activo', true)
      .order('es_principal', { ascending: false })

    return data || []
  })
}