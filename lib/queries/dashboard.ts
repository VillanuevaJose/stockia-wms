import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'
import type {
  DashboardDataPayload,
  DistribucionCategoria,
  FlujoDiarioPoint,
  ProductoAlertaStock,
  ProductoTopValor,
  UltimoMovimiento,
} from '../../components/dashboard/types'

export type {
  DashboardKPIs,
  ProductoAlertaStock,
  UltimoMovimiento,
  FlujoDiarioPoint,
  DistribucionCategoria,
  ProductoTopValor,
  DashboardUserContext,
  DashboardDataPayload,
} from '../../components/dashboard/types'

interface ProductoQueryRow {
  id: string
  sku: string | null
  nombre: string
  costo: number | string | null
  precio_soles: number | string | null
  stock: number | string | null
  stock_minimo: number | string | null
  categoria: { nombre: string } | { nombre: string }[] | null
}

function getCategoryName(cat: ProductoQueryRow['categoria']): string {
  return extractRelationNombre(cat, 'General')
}

function extractRelationNombre(rel: unknown, fallback = ''): string {
  if (!rel) return fallback
  if (Array.isArray(rel)) {
    const first = rel[0]
    if (first && typeof first === 'object' && 'nombre' in first && typeof first.nombre === 'string') {
      return first.nombre
    }
    return fallback
  }
  if (typeof rel === 'object' && 'nombre' in rel && typeof rel.nombre === 'string') {
    return rel.nombre
  }
  return fallback
}

function toLimaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(date)
}

export async function getDashboardData(): Promise<DashboardDataPayload> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const userId = user?.id || 'anon'

  return withFastCache<DashboardDataPayload>(`dashboard-data:${userId}`, 20, async () => {
    let rol: 'admin' | 'almacenero' | 'vendedor' = 'admin'
    let sedeNombre = 'Sede Principal'

    if (user) {
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('rol, almacen:almacen_id(nombre)')
        .eq('id', user.id)
        .maybeSingle()

      if (perfil?.rol === 'almacenero' || perfil?.rol === 'vendedor' || perfil?.rol === 'admin') {
        rol = perfil.rol
      }

      const nombreAlmacen = extractRelationNombre(perfil?.almacen)

      if (nombreAlmacen) {
        sedeNombre = nombreAlmacen
      } else {
        const { data: sedePrincipal } = await supabase
          .from('almacen')
          .select('nombre')
          .eq('activo', true)
          .order('es_principal', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (sedePrincipal?.nombre) {
          sedeNombre = sedePrincipal.nombre
        }
      }
    }

    const hoyInicio = new Date()
    hoyInicio.setHours(0, 0, 0, 0)

    const hace7Dias = new Date(hoyInicio)
    hace7Dias.setDate(hace7Dias.getDate() - 6)

    const [
      { data: productosRaw },
      { count: movimientosHoyCount },
      { data: movimientosRaw },
      { data: ventasRaw },
      { data: comprasRaw },
    ] = await Promise.all([
      supabase
        .from('productos')
        .select(`
          id,
          sku,
          nombre,
          costo,
          precio_soles,
          stock,
          stock_minimo,
          categoria:categoria_id (nombre)
        `)
        .eq('activo', true),
      supabase
        .from('movimiento_inventario')
        .select('id', { count: 'exact', head: true })
        .gte('fecha', hoyInicio.toISOString()),
      supabase
        .from('movimiento_inventario')
        .select('id, tipo, motivo, fecha, referencia_tipo')
        .order('fecha', { ascending: false })
        .limit(8),
      supabase
        .from('venta')
        .select('fecha_emision, total, estado')
        .gte('fecha_emision', hace7Dias.toISOString())
        .neq('estado', 'ANULADA'),
      supabase
        .from('compra')
        .select('fecha_emision, total, estado')
        .gte('fecha_emision', hace7Dias.toISOString())
        .neq('estado', 'ANULADA'),
    ])

    const prods = (productosRaw || []) as ProductoQueryRow[]

    let valorTotal = 0
    const alertas: ProductoAlertaStock[] = []
    const categoriasMap = new Map<string, { skus: number; valorSoles: number }>()
    const topValorList: ProductoTopValor[] = []

    for (const p of prods) {
      const stock = Number(p.stock) || 0
      const costo = Number(p.costo) > 0 ? Number(p.costo) : Number(p.precio_soles) || 0
      const valorProd = stock * costo
      const catNombre = getCategoryName(p.categoria)

      valorTotal += valorProd

      const actualCat = categoriasMap.get(catNombre) || { skus: 0, valorSoles: 0 }
      categoriasMap.set(catNombre, {
        skus: actualCat.skus + 1,
        valorSoles: actualCat.valorSoles + valorProd,
      })

      topValorList.push({
        id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        stock,
        valorSoles: Math.round(valorProd * 100) / 100,
        categoria_nombre: catNombre,
      })

      const stockMin = Number(p.stock_minimo) || 0
      if (stock <= stockMin) {
        alertas.push({
          id: p.id,
          sku: p.sku,
          nombre: p.nombre,
          stock,
          stock_minimo: stockMin,
          categoria_nombre: catNombre,
        })
      }
    }

    alertas.sort((a, b) => a.stock - a.stock_minimo - (b.stock - b.stock_minimo))
    topValorList.sort((a, b) => b.valorSoles - a.valorSoles)

    const totalValorCategorias = valorTotal > 0 ? valorTotal : 1
    const distribucionCategorias: DistribucionCategoria[] = Array.from(categoriasMap.entries())
      .map(([categoria, stats]) => ({
        categoria,
        skus: stats.skus,
        valorSoles: Math.round(stats.valorSoles * 100) / 100,
        porcentaje: Math.round((stats.valorSoles / totalValorCategorias) * 1000) / 10,
      }))
      .sort((a, b) => b.valorSoles - a.valorSoles)
      .slice(0, 6)

    // Serie continua de últimos 7 días (sin huecos)
    const flujoMap = new Map<string, FlujoDiarioPoint>()
    const formatterDia = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: 'numeric' })

    for (let i = 0; i < 7; i++) {
      const d = new Date(hace7Dias)
      d.setDate(hace7Dias.getDate() + i)
      const key = toLimaDateKey(d)
      const label = formatterDia.format(d).replace('.', '')
      flujoMap.set(key, {
        fecha: key,
        etiqueta: label.charAt(0).toUpperCase() + label.slice(1),
        ventas: 0,
        compras: 0,
      })
    }

    let ventas7dTotal = 0
    for (const v of ventasRaw || []) {
      const monto = Number(v.total) || 0
      ventas7dTotal += monto
      const key = toLimaDateKey(new Date(v.fecha_emision))
      const entry = flujoMap.get(key)
      if (entry) entry.ventas = Math.round((entry.ventas + monto) * 100) / 100
    }

    let compras7dTotal = 0
    for (const c of comprasRaw || []) {
      const monto = Number(c.total) || 0
      compras7dTotal += monto
      const key = toLimaDateKey(new Date(c.fecha_emision))
      const entry = flujoMap.get(key)
      if (entry) entry.compras = Math.round((entry.compras + monto) * 100) / 100
    }

    return {
      kpis: {
        valorInventarioSoles: Math.round(valorTotal * 100) / 100,
        totalProductosActivos: prods.length,
        productosStockBajo: alertas.length,
        movimientosHoy: movimientosHoyCount || 0,
        ventasUltimos7DiasSoles: Math.round(ventas7dTotal * 100) / 100,
        comprasUltimos7DiasSoles: Math.round(compras7dTotal * 100) / 100,
        totalCategoriasActivas: categoriasMap.size,
      },
      alertasStock: alertas.slice(0, 8),
      ultimosMovimientos: (movimientosRaw || []) as UltimoMovimiento[],
      flujo7Dias: Array.from(flujoMap.values()),
      distribucionCategorias,
      topProductosValor: topValorList.slice(0, 6),
      userContext: {
        userId,
        rol,
        sedeNombre,
      },
    }
  })
}
