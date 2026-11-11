import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'

export interface KardexSunatFila {
  id: string
  fecha: string
  tipo_comprobante: string // '01' Factura, '03' Boleta, '09' Guía, '00' Doc Interno
  tipo_comprobante_desc: string
  serie_comprobante: string
  numero_comprobante: string
  tipo_operacion: string // '01' Venta, '02' Compra, '16' Saldo Inicial, '11' Conteo/Merma, '04' Traslado
  tipo_operacion_desc: string
  // Bloque Entradas
  entrada_cantidad: number
  entrada_costo_unitario: number
  entrada_costo_total: number
  // Bloque Salidas
  salida_cantidad: number
  salida_costo_unitario: number
  salida_costo_total: number
  // Bloque Saldo Final
  saldo_cantidad: number
  saldo_costo_unitario: number
  saldo_costo_total: number
}

export interface KardexSunatData {
  empresa: {
    ruc: string
    razon_social: string
  }
  producto: {
    id: string
    sku: string
    nombre: string
    costo_referencial: number
    unidad_medida: string
    tipo_existencia: string
  }
  almacen_nombre: string
  periodo: string
  filas: KardexSunatFila[]
  totales: {
    total_entradas_cant: number
    total_entradas_valor: number
    total_salidas_cant: number
    total_salidas_valor: number
    saldo_final_cant: number
    saldo_final_valor: number
    costo_promedio_actual: number
  }
}

export async function getKardexSunat131(options?: {
  productoId?: string
  almacenId?: string
  periodo?: string
}): Promise<KardexSunatData | null> {
  const supabase = await createClient()

  // 1. Si no hay productoId especificado, tomar el primer producto disponible
  let productoId = options?.productoId
  if (!productoId) {
    const { data: primerProd } = await supabase
      .from('productos')
      .select('id')
      .eq('activo', true)
      .limit(1)
      .single()

    productoId = primerProd?.id
  }

  if (!productoId) {
    return null
  }

  const cacheKey = `kardex-sunat-${productoId}-${options?.almacenId || 'all'}-${options?.periodo || new Date().getFullYear()}`

  return withFastCache(cacheKey, 15, async () => {
    // 2. Obtener datos maestros del producto y empresa
    const [{ data: producto }, { data: negocio }] = await Promise.all([
      supabase.from('productos').select('id, sku, nombre, costo, precio_soles').eq('id', productoId).single(),
      supabase.from('negocio').select('nombre, ruc').limit(1).maybeSingle(),
    ])

    if (!producto) return null

    const empresaData = {
      ruc: negocio?.ruc || '20601234567',
      razon_social: negocio?.nombre ? `${negocio.nombre.toUpperCase()} S.A.C.` : 'STOCKIA LOGÍSTICA PERÚ S.A.C.',
    }

    // 3. Obtener nombre de almacén
    let almacenNombre = 'Consolidado Todas las Sedes'
    if (options?.almacenId && options.almacenId !== 'TODOS') {
      const { data: alm } = await supabase
        .from('almacen')
        .select('nombre')
        .eq('id', options.almacenId)
        .single()
      if (alm?.nombre) almacenNombre = alm.nombre
    }

    // 4. Obtener todos los detalles de movimientos ordenados cronológicamente
    const query = supabase
      .from('detalle_movimiento')
      .select(`
        id,
        cantidad,
        costo_unitario,
        created_at,
        movimiento:movimiento_id (
          id,
          tipo,
          motivo,
          referencia_tipo,
          referencia_id,
          fecha,
          almacen_origen_id,
          almacen_destino_id
        )
      `)
      .eq('producto_id', productoId)
      .order('created_at', { ascending: true })

    const { data: detalles } = await query

    // 5. Algoritmo de Costo Promedio Ponderado (CPP) oficial SUNAT
    let saldoCant = 0
    let saldoValor = 0
    let cpp = Number(producto.costo) > 0 ? Number(producto.costo) : 0

    let totalEntCant = 0
    let totalEntValor = 0
    let totalSalCant = 0
    let totalSalValor = 0

    const filas: KardexSunatFila[] = []

    interface RawDetalle {
      id: string
      cantidad: number
      costo_unitario: number
      created_at: string
      movimiento: {
        id: string
        tipo: string
        motivo: string
        referencia_tipo: string | null
        referencia_id: string | null
        fecha: string
        almacen_origen_id: string | null
        almacen_destino_id: string | null
      } | null
    }

    const items = (detalles || []) as unknown as RawDetalle[]

    for (const d of items) {
      const mov = d.movimiento
      if (!mov) continue

      // Filtrar por almacén si se especificó
      if (options?.almacenId && options.almacenId !== 'TODOS') {
        const matchesAlmacen =
          mov.almacen_origen_id === options.almacenId ||
          mov.almacen_destino_id === options.almacenId
        if (!matchesAlmacen) continue
      }

      const cant = Math.abs(Number(d.cantidad) || 0)
      if (cant === 0) continue

      // Si se filtra por almacén específico, determinar si la transferencia entra o sale
      let isTransferEntrada = false
      if (mov.tipo === 'TRANSFERENCIA') {
        if (options?.almacenId && options.almacenId !== 'TODOS') {
          if (mov.almacen_destino_id === options.almacenId) {
            isTransferEntrada = true
          } else if (mov.almacen_origen_id !== options.almacenId) {
            continue
          }
        } else {
          // En consolidado empresarial, un traslado interno no incrementa ni decrementa las existencias totales
          continue
        }
      }

      const isEntrada =
        mov.tipo === 'ENTRADA' ||
        isTransferEntrada ||
        (mov.tipo === 'AJUSTE' && (mov.motivo.toLowerCase().includes('sobrante') || Number(d.cantidad) > 0))

      // Extraer datos de comprobante de la referencia o motivo
      let tipoComp = '00'
      let tipoCompDesc = 'Doc. Interno'
      let serieComp = 'OP'
      let numComp = mov.id.slice(0, 8).toUpperCase()
      let tipoOp = '99'
      let tipoOpDesc = 'Otros'

      if (mov.referencia_tipo === 'INVENTARIO_INICIAL') {
        tipoComp = '00'
        tipoCompDesc = 'Inventario Inicial'
        serieComp = '-'
        numComp = '-'
        tipoOp = '16'
        tipoOpDesc = 'Saldo Inicial'
      } else if (mov.referencia_tipo === 'VENTA') {
        tipoOp = '01'
        tipoOpDesc = 'Venta Nacional'
        const match = mov.motivo.match(/([BF]\d{3})-(\d+)/)
        if (match) {
          serieComp = match[1]
          numComp = match[2]
          tipoComp = serieComp.startsWith('F') ? '01' : '03'
          tipoCompDesc = serieComp.startsWith('F') ? 'Factura' : 'Boleta de Venta'
        } else {
          tipoComp = '03'
          tipoCompDesc = 'Boleta de Venta'
        }
      } else if (mov.referencia_tipo === 'COMPRA') {
        tipoComp = '01'
        tipoCompDesc = 'Factura'
        tipoOp = '02'
        tipoOpDesc = 'Compra Nacional'
        serieComp = 'F001'
      } else if (mov.referencia_tipo === 'CONTEO_FISICO' || mov.tipo === 'AJUSTE') {
        tipoComp = '00'
        tipoCompDesc = 'Acta de Conteo'
        serieComp = 'AUD'
        tipoOp = '11'
        tipoOpDesc = 'Ajuste / Merma'
      } else if (mov.tipo === 'TRANSFERENCIA') {
        tipoComp = '09'
        tipoCompDesc = 'Guía de Remisión'
        serieComp = 'T001'
        tipoOp = '04'
        tipoOpDesc = 'Traslado Entre Sedes'
      }

      let entCant = 0
      let entCu = 0
      let entTotal = 0
      let salCant = 0
      let salCu = 0
      let salTotal = 0

      if (isEntrada) {
        entCant = cant
        entCu = Number(d.costo_unitario) > 0 ? Number(d.costo_unitario) : (cpp > 0 ? cpp : Number(producto.costo))
        entTotal = entCant * entCu

        saldoCant += entCant
        saldoValor += entTotal
        cpp = saldoCant > 0 ? saldoValor / saldoCant : cpp

        totalEntCant += entCant
        totalEntValor += entTotal
      } else {
        salCant = cant
        salCu = cpp > 0 ? cpp : Number(producto.costo)
        salTotal = salCant * salCu

        saldoCant = Math.max(0, saldoCant - salCant)
        saldoValor = Math.max(0, saldoValor - salTotal)
        if (saldoCant <= 0) {
          saldoCant = 0
          saldoValor = 0
        }

        totalSalCant += salCant
        totalSalValor += salTotal
      }

      filas.push({
        id: d.id,
        fecha: mov.fecha || d.created_at,
        tipo_comprobante: tipoComp,
        tipo_comprobante_desc: tipoCompDesc,
        serie_comprobante: serieComp,
        numero_comprobante: numComp,
        tipo_operacion: tipoOp,
        tipo_operacion_desc: tipoOpDesc,
        entrada_cantidad: entCant,
        entrada_costo_unitario: entCu,
        entrada_costo_total: entTotal,
        salida_cantidad: salCant,
        salida_costo_unitario: salCu,
        salida_costo_total: salTotal,
        saldo_cantidad: saldoCant,
        saldo_costo_unitario: cpp,
        saldo_costo_total: saldoValor,
      })
    }

    return {
      empresa: empresaData,
      producto: {
        id: producto.id,
        sku: producto.sku,
        nombre: producto.nombre,
        costo_referencial: Number(producto.costo) || 0,
        unidad_medida: 'NIU (Unidad)',
        tipo_existencia: '01 (Mercaderías)',
      },
      almacen_nombre: almacenNombre,
      periodo: options?.periodo || String(new Date().getFullYear()),
      filas,
      totales: {
        total_entradas_cant: totalEntCant,
        total_entradas_valor: totalEntValor,
        total_salidas_cant: totalSalCant,
        total_salidas_valor: totalSalValor,
        saldo_final_cant: saldoCant,
        saldo_final_valor: saldoValor,
        costo_promedio_actual: cpp,
      },
    }
  })
}
