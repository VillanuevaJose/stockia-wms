import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'

export interface SugerenciaReabastecimientoRow {
  producto_id: string
  sku: string
  nombre: string
  categoria: string
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  demanda_diaria: number
  lead_time_dias: number
  stock_seguridad: number
  rop: number
  estado: 'CRITICO' | 'REORDEN' | 'OPTIMO'
  cantidad_sugerida: number
  inversion_estimada: number
  proveedor_sugerido_id: string | null
  proveedor_sugerido_nombre: string
}

export interface ReabastecimientoReporte {
  articulos: SugerenciaReabastecimientoRow[]
  kpis: {
    total_articulos: number
    articulos_criticos: number
    articulos_reorden: number
    articulos_optimos: number
    presupuesto_total_sugerido: number
  }
}

export async function getSugerenciasReabastecimiento(): Promise<ReabastecimientoReporte> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let negocio_id: string | null = null
  if (user) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('negocio_id')
      .eq('id', user.id)
      .maybeSingle()
    negocio_id = usuario?.negocio_id || null
  }

  const cacheKey = `reabastecimiento-rop-${negocio_id || 'default'}`

  return withFastCache(cacheKey, 15, async () => {
    // 1. Obtener productos activos aislados por negocio
    let prodQuery = supabase
      .from('productos')
      .select('id, sku, nombre, stock, stock_minimo, costo, categoria:categoria_id (nombre)')
      .eq('activo', true)
      .order('nombre')

    if (negocio_id) {
      prodQuery = prodQuery.eq('negocio_id', negocio_id)
    }

    const { data: productos } = await prodQuery

    if (!productos || productos.length === 0) {
      return {
        articulos: [],
        kpis: {
          total_articulos: 0,
          articulos_criticos: 0,
          articulos_reorden: 0,
          articulos_optimos: 0,
          presupuesto_total_sugerido: 0,
        },
      }
    }

    // 2. Obtener proveedor por defecto o principal del negocio
    let provQuery = supabase
      .from('proveedor')
      .select('id, razon_social')
      .eq('activo', true)
      .order('created_at', { ascending: true })

    if (negocio_id) {
      provQuery = provQuery.eq('negocio_id', negocio_id)
    }

    const { data: proveedores } = await provQuery
    const primerProv = proveedores && proveedores.length > 0 ? proveedores[0] : null

    // 3. Obtener ventas de los últimos 30 días para calcular demanda diaria real
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: ventas30d } = await supabase
      .from('detalle_venta')
      .select('producto_id, cantidad')
      .gte('created_at', hace30Dias)

    const mapaVentas: Record<string, number> = {}
    if (ventas30d) {
      for (const item of ventas30d) {
        mapaVentas[item.producto_id] = (mapaVentas[item.producto_id] || 0) + Number(item.cantidad || 0)
      }
    }

    // 4. Calcular ROP y sugerencias
    let totalCriticos = 0
    let totalReorden = 0
    let totalOptimos = 0
    let presupuestoTotal = 0

    const LEAD_TIME_ESTANDAR = 5 // 5 días promedio de transporte y entrega

    const articulos: SugerenciaReabastecimientoRow[] = productos.map((p) => {
      const stock = Number(p.stock) || 0
      const stockMin = Number(p.stock_minimo) || 0
      const costo = Number(p.costo) || 10

      // Demanda diaria estimada: ventas reales en 30 días / 30, o derivado del stock mínimo si no registra ventas
      const ventasMes = mapaVentas[p.id] || 0
      const demandaDiaria = ventasMes > 0 ? ventasMes / 30 : stockMin > 0 ? stockMin / 30 : 0

      // Stock de seguridad: el mayor entre stock_minimo configurado o 3 días de demanda
      const stockSeguridad = Math.max(stockMin, Math.ceil(demandaDiaria * 3))

      // ROP = (Demanda Diaria * Lead Time) + Stock Seguridad
      const rop = Math.ceil(demandaDiaria * LEAD_TIME_ESTANDAR + stockSeguridad)

      // Evaluación del estado
      let estado: SugerenciaReabastecimientoRow['estado'] = 'OPTIMO'
      let cantidadSugerida = 0

      if (stock <= 0) {
        estado = 'CRITICO'
        totalCriticos++
        cantidadSugerida = Math.max(rop * 2, stockSeguridad * 2, 10)
      } else if (stock <= rop) {
        estado = 'REORDEN'
        totalReorden++
        cantidadSugerida = Math.max(rop * 2 - stock, stockSeguridad * 1.5 - stock, 10)
      } else {
        estado = 'OPTIMO'
        totalOptimos++
        cantidadSugerida = 0
      }

      // Redondear cantidad a múltiplo de 5 para empaque logístico
      cantidadSugerida = Math.ceil(cantidadSugerida / 5) * 5
      const inversionEstimada = cantidadSugerida * costo

      if (estado !== 'OPTIMO') {
        presupuestoTotal += inversionEstimada
      }

      const catRel = Array.isArray(p.categoria) ? p.categoria[0] : p.categoria

      return {
        producto_id: p.id,
        sku: p.sku || 'S/SKU',
        nombre: p.nombre,
        categoria: catRel?.nombre || 'General',
        stock_actual: stock,
        stock_minimo: stockMin,
        costo_unitario: costo,
        demanda_diaria: Number(demandaDiaria.toFixed(2)),
        lead_time_dias: LEAD_TIME_ESTANDAR,
        stock_seguridad: stockSeguridad,
        rop,
        estado,
        cantidad_sugerida: cantidadSugerida,
        inversion_estimada: inversionEstimada,
        proveedor_sugerido_id: primerProv?.id || null,
        proveedor_sugerido_nombre: primerProv?.razon_social || 'Distribuidora Ferretera Central S.A.C.',
      }
    })

    // Ordenar: primero los críticos, luego los que están en reorden, y finalmente los óptimos
    const prioridad = { CRITICO: 0, REORDEN: 1, OPTIMO: 2 }
    articulos.sort((a, b) => prioridad[a.estado] - prioridad[b.estado])

    return {
      articulos,
      kpis: {
        total_articulos: articulos.length,
        articulos_criticos: totalCriticos,
        articulos_reorden: totalReorden,
        articulos_optimos: totalOptimos,
        presupuesto_total_sugerido: presupuestoTotal,
      },
    }
  })
}
