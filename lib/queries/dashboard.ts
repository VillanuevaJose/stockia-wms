import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'

export interface DashboardKPIs {
  valorInventarioSoles: number
  totalProductosActivos: number
  productosStockBajo: number
  movimientosHoy: number
}

export interface ProductoAlertaStock {
  id: string
  sku: string | null
  nombre: string
  stock: number
  stock_minimo: number
  categoria_nombre?: string
}

export interface UltimoMovimiento {
  id: string
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA'
  motivo: string
  fecha: string
  referencia_tipo: string | null
}

export async function getDashboardData(): Promise<{
  kpis: DashboardKPIs
  alertasStock: ProductoAlertaStock[]
  ultimosMovimientos: UltimoMovimiento[]
}> {
  return withFastCache('dashboard-data', 20, async () => {
    const supabase = await createClient()

    // 1. Consultar todos los productos activos con sus costos y categorías
    const { data: productos } = await supabase
      .from('productos')
    .select(`
      id,
      sku,
      nombre,
      costo,
      precio_soles,
      stock,
      stock_minimo,
      activo,
      categoria:categoria_id (nombre)
    `)
    .eq('activo', true)

  const prods = productos || []

  // Si no hay productos registrados aún, retornamos métricas en cero y listas vacías limpias
  if (prods.length === 0) {
    const hoyInicio = new Date()
    hoyInicio.setHours(0, 0, 0, 0)

    const { count: movimientosHoyCount } = await supabase
      .from('movimiento_inventario')
      .select('id', { count: 'exact', head: true })
      .gte('fecha', hoyInicio.toISOString())

    const { data: movimientos } = await supabase
      .from('movimiento_inventario')
      .select('id, tipo, motivo, fecha, referencia_tipo')
      .order('fecha', { ascending: false })
      .limit(6)

    return {
      kpis: {
        valorInventarioSoles: 0,
        totalProductosActivos: 0,
        productosStockBajo: 0,
        movimientosHoy: movimientosHoyCount || 0,
      },
      alertasStock: [],
      ultimosMovimientos: (movimientos || []) as UltimoMovimiento[],
    }
  }

  // Calcular valorización total y alertas de stock de Supabase
  let valorTotal = 0
  const alertas: ProductoAlertaStock[] = []

  prods.forEach((p) => {
    const stock = Number(p.stock) || 0
    const costo = Number(p.costo) > 0 ? Number(p.costo) : Number(p.precio_soles) || 0
    valorTotal += stock * costo

    const stockMin = Number(p.stock_minimo) || 0
    if (stock <= stockMin) {
      alertas.push({
        id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        stock,
        stock_minimo: stockMin,
        // @ts-expect-error Supabase nested relation shape
        categoria_nombre: p.categoria?.nombre || 'General',
      })
    }
  })

  // Movimientos registrados el día de hoy
  const hoyInicio = new Date()
  hoyInicio.setHours(0, 0, 0, 0)

  const { count: movimientosHoyCount } = await supabase
    .from('movimiento_inventario')
    .select('id', { count: 'exact', head: true })
    .gte('fecha', hoyInicio.toISOString())

  // Últimos 6 movimientos para el feed operativo
  const { data: movimientos } = await supabase
    .from('movimiento_inventario')
    .select('id, tipo, motivo, fecha, referencia_tipo')
    .order('fecha', { ascending: false })
    .limit(6)

    return {
      kpis: {
        valorInventarioSoles: Math.round(valorTotal * 100) / 100,
        totalProductosActivos: prods.length,
        productosStockBajo: alertas.length,
        movimientosHoy: movimientosHoyCount || 0,
      },
      alertasStock: alertas.slice(0, 6),
      ultimosMovimientos: (movimientos || []) as UltimoMovimiento[],
    }
  })
}
