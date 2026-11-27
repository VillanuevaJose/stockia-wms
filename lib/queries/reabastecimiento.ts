import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'
import { calcularProyeccionRopRunway } from '../utils/runway'

export interface SugerenciaBalanceoSedes {
  sede_emisora_id: string
  sede_emisora_nombre: string
  stock_emisora: number
  sede_receptora_id: string
  sede_receptora_nombre: string
  stock_receptora: number
  cantidad_transferible: number
  ahorro_estimado_soles: number
}

export interface SugerenciaReabastecimientoRow {
  producto_id: string
  sku: string
  nombre: string
  categoria: string
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  ventas_10d: number
  ventas_30d: number
  demanda_diaria: number
  runway_dias: number | null
  fecha_quiebre_iso: string | null
  lead_time_dias: number
  stock_seguridad: number
  rop: number
  estado: 'CRITICO' | 'REORDEN' | 'OPTIMO'
  cantidad_sugerida: number
  inversion_estimada: number
  proveedor_sugerido_id: string | null
  proveedor_sugerido_nombre: string
  sugerencia_balanceo: SugerenciaBalanceoSedes | null
  traslado_en_curso: boolean
}

export interface ReabastecimientoReporte {
  articulos: SugerenciaReabastecimientoRow[]
  kpis: {
    total_articulos: number
    articulos_criticos: number
    articulos_reorden: number
    articulos_optimos: number
    articulos_runway_bajo: number
    presupuesto_total_sugerido: number
    oportunidades_balanceo: number
    ahorro_potencial_balanceo: number
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
    let prodQuery = supabase
      .from('productos')
      .select('id, sku, nombre, stock, stock_minimo, costo, precio_soles, categoria:categoria_id (nombre)')
      .eq('activo', true)
      .order('nombre')

    if (negocio_id) {
      prodQuery = prodQuery.eq('negocio_id', negocio_id)
    }

    let provQuery = supabase
      .from('proveedor')
      .select('id, razon_social')
      .eq('activo', true)
      .order('created_at', { ascending: true })

    if (negocio_id) {
      provQuery = provQuery.eq('negocio_id', negocio_id)
    }

    let almacenesQuery = supabase
      .from('almacen')
      .select('id, nombre, es_principal')
      .eq('activo', true)
      .order('es_principal', { ascending: false })

    if (negocio_id) {
      almacenesQuery = almacenesQuery.eq('negocio_id', negocio_id)
    }

    const ahoraMs = Date.now()
    const hace10DiasMs = ahoraMs - 10 * 24 * 60 * 60 * 1000
    const hace30DiasIso = new Date(ahoraMs - 30 * 24 * 60 * 60 * 1000).toISOString()

    let ventasQuery = supabase
      .from('venta')
      .select('almacen_origen_id, fecha_emision, detalle_venta(producto_id, cantidad)')
      .gte('fecha_emision', hace30DiasIso)
      .neq('estado', 'ANULADA')

    if (negocio_id) {
      ventasQuery = ventasQuery.eq('negocio_id', negocio_id)
    }

    let comprasRecientesQuery = supabase
      .from('compra')
      .select('proveedor_id, proveedor:proveedor_id(razon_social), detalle_compra(producto_id)')
      .neq('estado', 'ANULADA')
      .order('fecha_emision', { ascending: false })
      .limit(120)

    if (negocio_id) {
      comprasRecientesQuery = comprasRecientesQuery.eq('negocio_id', negocio_id)
    }

    let trasladosActivosQuery = supabase
      .from('solicitud_traslado')
      .select('producto_id')
      .in('estado', ['PENDIENTE', 'EN_TRANSITO'])

    if (negocio_id) {
      trasladosActivosQuery = trasladosActivosQuery.eq('negocio_id', negocio_id)
    }

    const [
      { data: productos },
      { data: proveedores },
      { data: almacenes },
      { data: ventas30d },
      { data: comprasRecientes },
      { data: trasladosActivos },
    ] = await Promise.all([
      prodQuery,
      provQuery,
      almacenesQuery,
      ventasQuery,
      comprasRecientesQuery,
      trasladosActivosQuery,
    ])

    if (!productos || productos.length === 0) {
      return {
        articulos: [],
        kpis: {
          total_articulos: 0,
          articulos_criticos: 0,
          articulos_reorden: 0,
          articulos_optimos: 0,
          articulos_runway_bajo: 0,
          presupuesto_total_sugerido: 0,
          oportunidades_balanceo: 0,
          ahorro_potencial_balanceo: 0,
        },
      }
    }

    const almacenesList = almacenes || []
    const trasladosEnCursoSet = new Set(
      (trasladosActivos || []).map((t) => t.producto_id).filter(Boolean) as string[]
    )

    // Si existen 2+ sedes, consultar inventario por sede para balanceo inteligente
    const mapaStockPorSede: Record<string, Record<string, number>> = {}
    if (almacenesList.length >= 2) {
      const almacenIds = almacenesList.map((a) => a.id)
      const { data: invRows } = await supabase
        .from('inventario')
        .select('producto_id, almacen_id, stock_actual')
        .in('almacen_id', almacenIds)

      for (const row of invRows || []) {
        if (!mapaStockPorSede[row.producto_id]) {
          mapaStockPorSede[row.producto_id] = {}
        }
        mapaStockPorSede[row.producto_id][row.almacen_id] = Number(row.stock_actual) || 0
      }
    }

    const primerProv = proveedores && proveedores.length > 0 ? proveedores[0] : null

    const mapaProveedorProducto: Record<string, { id: string; nombre: string }> = {}
    if (comprasRecientes) {
      for (const comp of comprasRecientes) {
        if (!comp.proveedor_id) continue
        const provRel = Array.isArray(comp.proveedor) ? comp.proveedor[0] : comp.proveedor
        const provNombre =
          provRel && typeof provRel === 'object' && 'razon_social' in provRel
            ? String(provRel.razon_social || 'Proveedor registrado')
            : 'Proveedor registrado'

        const detalles = Array.isArray(comp.detalle_compra) ? comp.detalle_compra : []
        for (const det of detalles) {
          if (det.producto_id && !mapaProveedorProducto[det.producto_id]) {
            mapaProveedorProducto[det.producto_id] = {
              id: comp.proveedor_id,
              nombre: provNombre,
            }
          }
        }
      }
    }

    const mapaVentas10d: Record<string, number> = {}
    const mapaVentas20dPrev: Record<string, number> = {}
    const mapaVentasPorSede: Record<string, Record<string, number>> = {}

    if (ventas30d) {
      for (const v of ventas30d) {
        const fechaMs = new Date(v.fecha_emision).getTime()
        const esReciente = fechaMs >= hace10DiasMs
        const detalles = Array.isArray(v.detalle_venta) ? v.detalle_venta : []

        for (const det of detalles) {
          if (!det.producto_id) continue
          const cant = Number(det.cantidad || 0)
          if (cant <= 0) continue

          if (esReciente) {
            mapaVentas10d[det.producto_id] = (mapaVentas10d[det.producto_id] || 0) + cant
          } else {
            mapaVentas20dPrev[det.producto_id] = (mapaVentas20dPrev[det.producto_id] || 0) + cant
          }

          if (v.almacen_origen_id) {
            if (!mapaVentasPorSede[det.producto_id]) {
              mapaVentasPorSede[det.producto_id] = {}
            }
            mapaVentasPorSede[det.producto_id][v.almacen_origen_id] =
              (mapaVentasPorSede[det.producto_id][v.almacen_origen_id] || 0) + cant
          }
        }
      }
    }

    let totalCriticos = 0
    let totalReorden = 0
    let totalOptimos = 0
    let totalRunwayBajo = 0
    let presupuestoTotal = 0
    let oportunidadesBalanceo = 0
    let ahorroPotencialBalanceo = 0

    const LEAD_TIME_ESTANDAR = 5

    const articulos: SugerenciaReabastecimientoRow[] = productos.map((p) => {
      const stock = Number(p.stock) || 0
      const stockMin = Number(p.stock_minimo) || 0
      const costo = Number(p.costo) > 0 ? Number(p.costo) : Number(p.precio_soles) || 0

      const ventas10d = mapaVentas10d[p.id] || 0
      const ventas20dPrev = mapaVentas20dPrev[p.id] || 0

      const proyeccion = calcularProyeccionRopRunway({
        stock,
        stockMinimo: stockMin,
        costoUnitario: costo,
        ventas10d,
        ventas20dPrev,
        leadTimeDias: LEAD_TIME_ESTANDAR,
      })

      if (proyeccion.estado === 'CRITICO') totalCriticos++
      else if (proyeccion.estado === 'REORDEN') totalReorden++
      else totalOptimos++

      if (proyeccion.runwayDias !== null && proyeccion.runwayDias <= 5) {
        totalRunwayBajo++
      }

      if (proyeccion.estado !== 'OPTIMO') {
        presupuestoTotal += proyeccion.inversionEstimada
      }

      // Evaluar oportunidad de Balanceo Inter-Sedes (Transferir antes de Comprar)
      let sugerenciaBalanceo: SugerenciaBalanceoSedes | null = null
      const trasladoEnCurso = trasladosEnCursoSet.has(p.id)

      if (almacenesList.length >= 2 && !trasladoEnCurso) {
        const sedesEval = almacenesList.map((alm) => {
          const stockSede = mapaStockPorSede[p.id]?.[alm.id] ?? 0
          const ventasSede = mapaVentasPorSede[p.id]?.[alm.id] ?? 0
          const demandaSede = ventasSede / 30
          const ropSede = Math.ceil(
            demandaSede * LEAD_TIME_ESTANDAR + Math.max(Math.ceil(demandaSede * 3), 2)
          )
          const excedente = Math.floor(stockSede - Math.max(ropSede, 4))
          return {
            id: alm.id,
            nombre: alm.nombre,
            es_principal: alm.es_principal,
            stockSede,
            ventasSede,
            ropSede,
            excedente,
          }
        })

        // Sede receptora: menor stock relativo o bajo su ROP (prioriza sedes con demanda o principal)
        const candidatasReceptoras = [...sedesEval]
          .filter((s) => s.stockSede <= Math.max(s.ropSede, 2))
          .sort((a, b) => {
            if (a.stockSede !== b.stockSede) return a.stockSede - b.stockSede
            return b.ventasSede - a.ventasSede
          })

        const receptora = candidatasReceptoras[0]
        if (receptora) {
          const emisora = [...sedesEval]
            .filter((s) => s.id !== receptora.id && s.excedente >= 2)
            .sort((a, b) => b.excedente - a.excedente)[0]

          if (emisora) {
            const necesidadReceptora = Math.max(
              proyeccion.cantidadSugerida,
              receptora.ropSede * 2 - receptora.stockSede,
              4
            )
            const cantidadTransferible = Math.min(emisora.excedente, Math.ceil(necesidadReceptora))

            if (cantidadTransferible >= 2) {
              const ahorro = Math.round(cantidadTransferible * costo * 100) / 100
              sugerenciaBalanceo = {
                sede_emisora_id: emisora.id,
                sede_emisora_nombre: emisora.nombre,
                stock_emisora: emisora.stockSede,
                sede_receptora_id: receptora.id,
                sede_receptora_nombre: receptora.nombre,
                stock_receptora: receptora.stockSede,
                cantidad_transferible: cantidadTransferible,
                ahorro_estimado_soles: ahorro,
              }
              oportunidadesBalanceo++
              ahorroPotencialBalanceo += ahorro
            }
          }
        }
      }

      const catRel = Array.isArray(p.categoria) ? p.categoria[0] : p.categoria
      const provHabitual = mapaProveedorProducto[p.id] || (primerProv
        ? { id: primerProv.id, nombre: primerProv.razon_social }
        : { id: null, nombre: 'Proveedor por asignar' })

      return {
        producto_id: p.id,
        sku: p.sku || 'S/SKU',
        nombre: p.nombre,
        categoria: catRel?.nombre || 'General',
        stock_actual: stock,
        stock_minimo: stockMin,
        costo_unitario: costo,
        ventas_10d: ventas10d,
        ventas_30d: ventas10d + ventas20dPrev,
        demanda_diaria: proyeccion.demandaDiaria,
        runway_dias: proyeccion.runwayDias,
        fecha_quiebre_iso: proyeccion.fechaQuiebreIso,
        lead_time_dias: LEAD_TIME_ESTANDAR,
        stock_seguridad: proyeccion.stockSeguridad,
        rop: proyeccion.rop,
        estado: proyeccion.estado,
        cantidad_sugerida: proyeccion.cantidadSugerida,
        inversion_estimada: proyeccion.inversionEstimada,
        proveedor_sugerido_id: provHabitual.id,
        proveedor_sugerido_nombre: provHabitual.nombre,
        sugerencia_balanceo: sugerenciaBalanceo,
        traslado_en_curso: trasladoEnCurso,
      }
    })

    const prioridad = { CRITICO: 0, REORDEN: 1, OPTIMO: 2 }
    articulos.sort((a, b) => {
      if (prioridad[a.estado] !== prioridad[b.estado]) {
        return prioridad[a.estado] - prioridad[b.estado]
      }
      if (Boolean(a.sugerencia_balanceo) !== Boolean(b.sugerencia_balanceo)) {
        return a.sugerencia_balanceo ? -1 : 1
      }
      const runA = a.runway_dias ?? 9999
      const runB = b.runway_dias ?? 9999
      return runA - runB
    })

    return {
      articulos,
      kpis: {
        total_articulos: articulos.length,
        articulos_criticos: totalCriticos,
        articulos_reorden: totalReorden,
        articulos_optimos: totalOptimos,
        articulos_runway_bajo: totalRunwayBajo,
        presupuesto_total_sugerido: Math.round(presupuestoTotal * 100) / 100,
        oportunidades_balanceo: oportunidadesBalanceo,
        ahorro_potencial_balanceo: Math.round(ahorroPotencialBalanceo * 100) / 100,
      },
    }
  })
}
