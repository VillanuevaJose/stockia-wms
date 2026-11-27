import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'

export interface AnomaliaStockFantasma {
  producto_id: string
  sku: string
  nombre: string
  stock_actual: number
  ventas_previas: number
  ventas_recientes_10d: number
  valor_riesgo_soles: number
}

export interface AnomaliaOperativaItem {
  id: string
  tipo: 'STOCK_FANTASMA' | 'MERMA_RECURRENTE' | 'ANULACION_ALTA'
  severidad: 'ALTA' | 'MEDIA'
  titulo: string
  detalle: string
  accion_href: string
  accion_label: string
}

export interface ReporteAnomalias {
  stockFantasma: AnomaliaStockFantasma[]
  alertas: AnomaliaOperativaItem[]
  resumen: {
    productos_fantasma: number
    mermas_30d_count: number
    ventas_anuladas_30d_count: number
    ventas_anuladas_30d_soles: number
  }
}

export async function getAnomaliasOperativas(): Promise<ReporteAnomalias> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let negocioId: string | null = null
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('negocio_id')
      .eq('id', user.id)
      .maybeSingle()
    negocioId = usuario?.negocio_id || null
  }

  return withFastCache(`anomalias-operativas-${negocioId || 'default'}`, 30, async () => {
    const ahoraMs = Date.now()
    const hace10DiasMs = ahoraMs - 10 * 24 * 60 * 60 * 1000
    const hace30DiasIso = new Date(ahoraMs - 30 * 24 * 60 * 60 * 1000).toISOString()
    const hace45DiasIso = new Date(ahoraMs - 45 * 24 * 60 * 60 * 1000).toISOString()

    let prodQuery = supabase
      .from('productos')
      .select('id, sku, nombre, stock, costo, precio_soles')
      .eq('activo', true)
      .gt('stock', 0)

    let ventasQuery = supabase
      .from('venta')
      .select('fecha_emision, estado, total, detalle_venta(producto_id, cantidad)')
      .gte('fecha_emision', hace45DiasIso)

    let ajustesQuery = supabase
      .from('movimiento_inventario')
      .select('id, motivo, usuario_id, almacen_origen_id, fecha')
      .eq('tipo', 'AJUSTE')
      .gte('fecha', hace30DiasIso)

    if (negocioId) {
      prodQuery = prodQuery.eq('negocio_id', negocioId)
      ventasQuery = ventasQuery.eq('negocio_id', negocioId)
      ajustesQuery = ajustesQuery.eq('negocio_id', negocioId)
    }

    const [{ data: productos }, { data: ventas45d }, { data: ajustes30d }] = await Promise.all([
      prodQuery,
      ventasQuery,
      ajustesQuery,
    ])

    const ventasRecientesMap = new Map<string, number>()
    const ventasPreviasMap = new Map<string, number>()
    let anuladasCount = 0
    let anuladasSoles = 0
    let ventasValidasCount = 0

    for (const v of ventas45d || []) {
      if (v.estado === 'ANULADA') {
        if (v.fecha_emision >= hace30DiasIso) {
          anuladasCount++
          anuladasSoles += Number(v.total) || 0
        }
        continue
      }

      ventasValidasCount++
      const fechaMs = new Date(v.fecha_emision).getTime()
      const esReciente = fechaMs >= hace10DiasMs
      const detalles = Array.isArray(v.detalle_venta) ? v.detalle_venta : []

      for (const det of detalles) {
        if (!det.producto_id) continue
        const cant = Number(det.cantidad) || 0
        if (cant <= 0) continue

        if (esReciente) {
          ventasRecientesMap.set(
            det.producto_id,
            (ventasRecientesMap.get(det.producto_id) || 0) + cant
          )
        } else {
          ventasPreviasMap.set(
            det.producto_id,
            (ventasPreviasMap.get(det.producto_id) || 0) + cant
          )
        }
      }
    }

    // 1. Detectar posible Stock Fantasma: tenía rotación previa (>= 4 und) y cayó a 0 en últimos 10 días con stock > 0
    const stockFantasma: AnomaliaStockFantasma[] = []
    const alertas: AnomaliaOperativaItem[] = []

    for (const p of productos || []) {
      const stock = Number(p.stock) || 0
      const ventasPrev = ventasPreviasMap.get(p.id) || 0
      const ventasRec = ventasRecientesMap.get(p.id) || 0
      const costo = Number(p.costo) > 0 ? Number(p.costo) : Number(p.precio_soles) || 0

      if (stock > 0 && ventasPrev >= 4 && ventasRec === 0) {
        const valorRiesgo = Math.round(stock * costo * 100) / 100
        stockFantasma.push({
          producto_id: p.id,
          sku: p.sku || 'S/N',
          nombre: p.nombre,
          stock_actual: stock,
          ventas_previas: ventasPrev,
          ventas_recientes_10d: ventasRec,
          valor_riesgo_soles: valorRiesgo,
        })

        alertas.push({
          id: `ghost-${p.id}`,
          tipo: 'STOCK_FANTASMA',
          severidad: valorRiesgo >= 200 ? 'ALTA' : 'MEDIA',
          titulo: `Posible Stock Fantasma: ${p.nombre} (${p.sku || 'S/N'})`,
          detalle: `Registró ${ventasPrev} und vendidas entre los días 11–45, pero cayó a 0 ventas en los últimos 10 días manteniendo ${stock} und en sistema (S/ ${valorRiesgo.toFixed(2)}).`,
          accion_href: '/admin/inventario',
          accion_label: 'Verificar con Conteo Ciego',
        })
      }
    }

    stockFantasma.sort((a, b) => b.valor_riesgo_soles - a.valor_riesgo_soles)

    // 2. Detectar concentración de mermas (ajustes negativos en últimos 30 días)
    const mermas = (ajustes30d || []).filter((a) => Boolean(a.almacen_origen_id))
    if (mermas.length >= 2) {
      alertas.push({
        id: 'mermas-30d',
        tipo: 'MERMA_RECURRENTE',
        severidad: mermas.length >= 5 ? 'ALTA' : 'MEDIA',
        titulo: `${mermas.length} ajustes negativos (mermas) en los últimos 30 días`,
        detalle:
          'Se detectaron múltiples salidas por ajuste/merma en el último mes. Revisa el Kardex y programa una auditoría física ciega por zona.',
        accion_href: '/admin/movimientos',
        accion_label: 'Inspeccionar Kardex',
      })
    }

    // 3. Detectar tasa elevada de anulaciones de venta
    if (anuladasCount >= 2 || (ventasValidasCount > 0 && anuladasCount / ventasValidasCount > 0.1)) {
      alertas.push({
        id: 'anulaciones-30d',
        tipo: 'ANULACION_ALTA',
        severidad: anuladasSoles >= 500 || anuladasCount >= 5 ? 'ALTA' : 'MEDIA',
        titulo: `${anuladasCount} ventas anuladas en los últimos 30 días (S/ ${anuladasSoles.toFixed(2)})`,
        detalle:
          'Las anulaciones frecuentes después de emitir ticket pueden indicar errores operativos en caja o devoluciones no auditadas.',
        accion_href: '/admin/ventas',
        accion_label: 'Revisar Ventas',
      })
    }

    return {
      stockFantasma: stockFantasma.slice(0, 10),
      alertas,
      resumen: {
        productos_fantasma: stockFantasma.length,
        mermas_30d_count: mermas.length,
        ventas_anuladas_30d_count: anuladasCount,
        ventas_anuladas_30d_soles: Math.round(anuladasSoles * 100) / 100,
      },
    }
  })
}
