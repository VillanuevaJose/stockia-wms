import { Sheet, packXlsx } from './xlsx-engine'

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100
const r3 = (n: number) => Math.round((Number(n) || 0) * 1000) / 1000
const Q = (name: string) => `'${name}'!`

export interface ProductoReporte {
  sku: string
  nombre: string
  costo: number | string | null
  precio_soles: number | string | null
  stock: number | string | null
  stock_minimo: number | string | null
  categoria?: { nombre?: string } | null
  unidad?: { codigo?: string } | null
}

export interface VentaReporte {
  serie: string
  correlativo: number
  fecha_emision: string
  estado: string
  subtotal: number | string
  impuesto: number | string
  total: number | string
  cliente?: { nombre?: string } | null
  usuario?: { nombre_completo?: string } | null
}

export interface MovimientoReporte {
  fecha: string
  tipo: string
  motivo: string
  referencia_tipo?: string | null
  almacen_origen?: { nombre?: string } | null
  almacen_destino?: { nombre?: string } | null
  usuario?: { nombre_completo?: string } | null
}

export function generarExcelInventario(prods: ProductoReporte[], bizName = 'Stockia WMS'): Uint8Array {
  const when = new Date().toLocaleString('es-PE')
  const totalItems = prods.length

  let valorCostoTotal = 0
  let valorVentaTotal = 0
  let stockFisicoTotal = 0
  let bajoMinimoCount = 0
  let agotadosCount = 0

  const catMap: Record<string, { prods: number; valor: number }> = {}
  const itemsValorizados: { nombre: string; stock: number; valor: number }[] = []

  prods.forEach((p) => {
    const stock = r3(Number(p.stock) || 0)
    const costo = r2(Number(p.costo) || 0)
    const precio = r2(Number(p.precio_soles) || 0)
    const min = r3(Number(p.stock_minimo) || 0)
    const cat = p.categoria?.nombre || 'Sin Categoría'

    const valCosto = r2(stock * costo)
    const valVenta = r2(stock * precio)

    valorCostoTotal = r2(valorCostoTotal + valCosto)
    valorVentaTotal = r2(valorVentaTotal + valVenta)
    stockFisicoTotal = r3(stockFisicoTotal + stock)

    if (stock <= 0) agotadosCount++
    else if (stock <= min) bajoMinimoCount++

    if (!catMap[cat]) catMap[cat] = { prods: 0, valor: 0 }
    catMap[cat].prods++
    catMap[cat].valor = r2(catMap[cat].valor + valCosto)

    itemsValorizados.push({ nombre: p.nombre, stock, valor: valCosto })
  })

  const margenTotal = r2(valorVentaTotal - valorCostoTotal)

  // HOJA 1: RESUMEN EJECUTIVO CON GRÁFICOS
  const R = new Sheet('Resumen', { grid: false, first: true, cols: [32, 18, 14, 3, 12, 12, 12, 12, 12, 12, 12, 12] })
  R.set(1, 1, `${bizName} — Resumen Ejecutivo de Inventario`, 1)
  for (let c = 2; c <= 12; c++) R.set(1, c, '', 1)
  R.merges.push('A1:L1')
  R.rowH[1] = 32

  R.set(2, 1, `Generado: ${when}`, 19)
  R.merges.push('A2:D2')

  R.set(4, 1, 'Indicador de Existencias', 2).set(4, 2, 'Cifra en Sistema', 2)
  const kpis: [string, number, number][] = [
    ['Valorización Total (Costo)', valorCostoTotal, 11],
    ['Valorización Total (Venta)', valorVentaTotal, 11],
    ['Margen Bruto Proyectado', margenTotal, 11],
    ['Total Unidades en Stock', stockFisicoTotal, 18],
    ['Total Productos en Catálogo', totalItems, 18],
    ['Productos con Stock Normal', Math.max(0, totalItems - bajoMinimoCount - agotadosCount), 18],
    ['Productos Bajo Stock Mínimo', bajoMinimoCount, 18],
    ['Productos Agotados (Quiebre)', agotadosCount, 18],
  ]
  kpis.forEach(([l, v, s], i) => R.set(5 + i, 1, l, 10).set(5 + i, 2, v, s))

  // Tabla Categorías
  const cats = Object.entries(catMap).sort((a, b) => b[1].valor - a[1].valor)
  const r = 15
  R.set(r - 1, 1, 'Valorización por Categoría', 14)
  R.set(r, 1, 'Categoría', 2).set(r, 2, 'Valorización (S/)', 2).set(r, 3, 'Productos', 2)
  cats.forEach(([cName, data], i) => {
    const rr = r + 1 + i
    R.set(rr, 1, cName, 3).set(rr, 2, data.valor, 4).set(rr, 3, data.prods, 5)
  })

  if (cats.length) {
    const topCats = cats.slice(0, 5)
    R.charts.push({
      type: 'pie',
      title: 'Distribución de Valorización por Categoría',
      cats: topCats.map((c) => c[0]),
      vals: topCats.map((c) => c[1].valor),
      catRef: `${Q('Resumen')}$A$${r + 1}:$A$${r + topCats.length}`,
      valRef: `${Q('Resumen')}$B$${r + 1}:$B$${r + topCats.length}`,
      colors: ['16201C', '2A7A4C', 'E8A33D', '3B82F6', '8B5CF6'],
      a: [4, 2, 12, 18],
    })
  }

  // Top Productos
  const topProds = itemsValorizados.sort((a, b) => b.valor - a.valor).slice(0, 8)
  const prRow = r + cats.length + 3
  R.set(prRow - 1, 1, 'Top Productos de Mayor Inversión', 14)
  R.set(prRow, 1, 'Producto', 2).set(prRow, 2, 'Valor Total (S/)', 2).set(prRow, 3, 'Stock Actual', 2)
  topProds.forEach((tp, i) => {
    const rr = prRow + 1 + i
    R.set(rr, 1, tp.nombre, 3).set(rr, 2, tp.valor, 4).set(rr, 3, tp.stock, 5)
  })

  if (topProds.length) {
    R.charts.push({
      type: 'barH',
      title: 'Top Productos Más Valorizados (S/)',
      serie: 'Valorización',
      fmt: '"S/ "#,##0',
      cats: topProds.map((t) => t.nombre),
      vals: topProds.map((t) => t.valor),
      catRef: `${Q('Resumen')}$A$${prRow + 1}:$A$${prRow + topProds.length}`,
      valRef: `${Q('Resumen')}$B$${prRow + 1}:$B$${prRow + topProds.length}`,
      colors: ['2A7A4C'],
      a: [4, 19, 12, 36],
    })
  }

  // HOJA 2: DETALLE DEL CATÁLOGO FÍSICO
  const D = new Sheet('Catálogo Físico', {
    cols: [14, 38, 22, 10, 14, 14, 16, 16, 18, 14],
    freeze: 2,
    filter: `A2:J${totalItems + 2}`,
  })
  D.set(1, 1, `${bizName} — Catálogo Maestro y Existencias`, 1)
  for (let c = 2; c <= 10; c++) D.set(1, c, '', 1)
  D.merges.push('A1:J1')
  D.rowH[1] = 28

  const headers = ['SKU', 'Producto', 'Categoría', 'Unidad', 'Stock Actual', 'Stock Mínimo', 'Costo Unit. (S/)', 'Precio Venta (S/)', 'Valorización (S/)', 'Estado']
  headers.forEach((h, i) => D.set(2, i + 1, h, 2))

  prods.forEach((p, i) => {
    const rr = 3 + i
    const stock = r3(Number(p.stock) || 0)
    const costo = r2(Number(p.costo) || 0)
    const precio = r2(Number(p.precio_soles) || 0)
    const min = r3(Number(p.stock_minimo) || 0)
    const cat = p.categoria?.nombre || 'General'
    const und = p.unidad?.codigo || 'UND'

    const isZero = stock <= 0
    const isLow = !isZero && stock <= min

    const textStyle = isZero ? 12 : isLow ? 6 : 3
    const currStyle = isZero ? 13 : isLow ? 7 : 4
    const estado = isZero ? 'AGOTADO' : isLow ? 'BAJO MÍNIMO' : 'NORMAL'

    D.set(rr, 1, p.sku, 17)
      .set(rr, 2, p.nombre, textStyle)
      .set(rr, 3, cat, textStyle)
      .set(rr, 4, und, 5)
      .set(rr, 5, stock, 5)
      .set(rr, 6, min, 5)
      .set(rr, 7, costo, currStyle)
      .set(rr, 8, precio, currStyle)
      .set(rr, 9, r2(stock * costo), currStyle, `E${rr}*G${rr}`)
      .set(rr, 10, estado, isZero ? 12 : isLow ? 6 : 15)
  })

  // Fila Total
  const totalRow = totalItems + 3
  D.set(totalRow, 1, 'TOTAL', 8)
  for (let c = 2; c <= 4; c++) D.set(totalRow, c, '', 8)
  D.set(totalRow, 5, stockFisicoTotal, 9, totalItems ? `SUM(E3:E${totalItems + 2})` : undefined)
  D.set(totalRow, 6, '', 8)
  D.set(totalRow, 7, '', 8)
  D.set(totalRow, 8, '', 8)
  D.set(totalRow, 9, valorCostoTotal, 9, totalItems ? `SUM(I3:I${totalItems + 2})` : undefined)
  D.set(totalRow, 10, '', 8)

  return packXlsx([R, D])
}

export function generarExcelVentas(ventas: VentaReporte[], bizName = 'Stockia WMS'): Uint8Array {
  const when = new Date().toLocaleString('es-PE')
  const totalVentas = ventas.length

  let facturacionTotal = 0
  let igvTotal = 0
  let subtotalTotal = 0
  let cobradas = 0
  let pendientes = 0
  let anuladas = 0

  const statusMap: Record<string, number> = {}

  ventas.forEach((v) => {
    const tot = r2(Number(v.total) || 0)
    const sub = r2(Number(v.subtotal) || 0)
    const igv = r2(Number(v.impuesto) || 0)
    const est = v.estado || 'PAGADA'

    statusMap[est] = r2((statusMap[est] || 0) + tot)

    if (est === 'PAGADA') {
      cobradas++
      facturacionTotal = r2(facturacionTotal + tot)
      subtotalTotal = r2(subtotalTotal + sub)
      igvTotal = r2(igvTotal + igv)
    } else if (est === 'PENDIENTE') {
      pendientes++
    } else if (est === 'ANULADA') {
      anuladas++
    }
  })

  // HOJA 1: RESUMEN VENTAS
  const R = new Sheet('Resumen', { grid: false, first: true, cols: [32, 18, 14, 3, 12, 12, 12, 12, 12, 12, 12, 12] })
  R.set(1, 1, `${bizName} — Resumen Ejecutivo de Ventas y Facturación`, 1)
  for (let c = 2; c <= 12; c++) R.set(1, c, '', 1)
  R.merges.push('A1:L1')
  R.rowH[1] = 32

  R.set(2, 1, `Generado: ${when}`, 19)
  R.merges.push('A2:D2')

  R.set(4, 1, 'Indicador de Ventas', 2).set(4, 2, 'Monto en Soles', 2)
  const kpis: [string, number, number][] = [
    ['Total Facturado (Cobradas)', facturacionTotal, 11],
    ['Base Imponible (Subtotal)', subtotalTotal, 11],
    ['IGV Fiscal Liquidado', igvTotal, 11],
    ['Ticket Promedio', cobradas ? r2(facturacionTotal / cobradas) : 0, 11],
    ['Comprobantes Cobrados', cobradas, 18],
    ['Comprobantes Pendientes', pendientes, 18],
    ['Comprobantes Anulados', anuladas, 18],
    ['Total Emisiones', totalVentas, 18],
  ]
  kpis.forEach(([l, v, s], i) => R.set(5 + i, 1, l, 10).set(5 + i, 2, v, s))

  // Gráfico Estado de Ventas
  const sts = Object.entries(statusMap)
  const r = 15
  R.set(r - 1, 1, 'Facturación por Estado', 14)
  R.set(r, 1, 'Estado', 2).set(r, 2, 'Monto (S/)', 2)
  sts.forEach(([sName, sVal], i) => {
    R.set(r + 1 + i, 1, sName, 3).set(r + 1 + i, 2, sVal, 4)
  })

  if (sts.length) {
    R.charts.push({
      type: 'pie',
      title: 'Facturación por Estado de Comprobante',
      cats: sts.map((s) => s[0]),
      vals: sts.map((s) => s[1]),
      catRef: `${Q('Resumen')}$A$${r + 1}:$A$${r + sts.length}`,
      valRef: `${Q('Resumen')}$B$${r + 1}:$B$${r + sts.length}`,
      colors: ['2A7A4C', 'E8A33D', 'C93B3B'],
      a: [4, 2, 12, 18],
    })
  }

  // HOJA 2: DETALLE COMPROBANTES
  const D = new Sheet('Detalle Ventas', {
    cols: [16, 20, 30, 22, 14, 14, 14, 16],
    freeze: 2,
    filter: `A2:H${totalVentas + 2}`,
  })
  D.set(1, 1, `${bizName} — Registro Detallado de Ventas`, 1)
  for (let c = 2; c <= 8; c++) D.set(1, c, '', 1)
  D.merges.push('A1:H1')
  D.rowH[1] = 28

  const headers = ['Comprobante', 'Fecha Emisión', 'Cliente', 'Vendedor', 'Estado', 'Subtotal (S/)', 'IGV (S/)', 'Total (S/)']
  headers.forEach((h, i) => D.set(2, i + 1, h, 2))

  ventas.forEach((v, i) => {
    const rr = 3 + i
    const comp = `${v.serie}-${String(v.correlativo).padStart(8, '0')}`
    const fecha = new Date(v.fecha_emision).toLocaleString('es-PE')
    const cliente = v.cliente?.nombre || 'Público General'
    const vendedor = v.usuario?.nombre_completo || 'Vendedor'
    const isAnulada = v.estado === 'ANULADA'
    const isPendiente = v.estado === 'PENDIENTE'

    const styleText = isAnulada ? 12 : isPendiente ? 6 : 3
    const styleCurr = isAnulada ? 13 : isPendiente ? 7 : 4

    D.set(rr, 1, comp, 17)
      .set(rr, 2, fecha, 5)
      .set(rr, 3, cliente, styleText)
      .set(rr, 4, vendedor, styleText)
      .set(rr, 5, v.estado, isAnulada ? 12 : isPendiente ? 6 : 15)
      .set(rr, 6, r2(Number(v.subtotal)), styleCurr)
      .set(rr, 7, r2(Number(v.impuesto)), styleCurr)
      .set(rr, 8, r2(Number(v.total)), styleCurr)
  })

  // Fila Total
  const totalRow = totalVentas + 3
  D.set(totalRow, 1, 'TOTAL', 8)
  for (let c = 2; c <= 5; c++) D.set(totalRow, c, '', 8)
  D.set(totalRow, 6, subtotalTotal, 9, totalVentas ? `SUMIF(E3:E${totalVentas + 2},"PAGADA",F3:F${totalVentas + 2})` : undefined)
  D.set(totalRow, 7, igvTotal, 9, totalVentas ? `SUMIF(E3:E${totalVentas + 2},"PAGADA",G3:G${totalVentas + 2})` : undefined)
  D.set(totalRow, 8, facturacionTotal, 9, totalVentas ? `SUMIF(E3:E${totalVentas + 2},"PAGADA",H3:H${totalVentas + 2})` : undefined)

  return packXlsx([R, D])
}

export function generarExcelKardex(movs: MovimientoReporte[], bizName = 'Stockia WMS'): Uint8Array {
  const when = new Date().toLocaleString('es-PE')
  const totalMovs = movs.length

  const tipoCount: Record<string, number> = {}
  movs.forEach((m) => {
    const t = m.tipo || 'OTRO'
    tipoCount[t] = (tipoCount[t] || 0) + 1
  })

  // HOJA 1: RESUMEN KARDEX
  const R = new Sheet('Resumen', { grid: false, first: true, cols: [30, 16, 14, 3, 12, 12, 12, 12, 12, 12, 12, 12] })
  R.set(1, 1, `${bizName} — Resumen de Operaciones y Movimientos`, 1)
  for (let c = 2; c <= 12; c++) R.set(1, c, '', 1)
  R.merges.push('A1:L1')
  R.rowH[1] = 32

  R.set(2, 1, `Generado: ${when}`, 19)
  R.merges.push('A2:D2')

  R.set(4, 1, 'Tipo de Operación', 2).set(4, 2, 'Cantidad de Eventos', 2)
  const tEntries = Object.entries(tipoCount)
  tEntries.forEach(([tName, tVal], i) => {
    R.set(5 + i, 1, tName, 10).set(5 + i, 2, tVal, 18)
  })

  if (tEntries.length) {
    R.charts.push({
      type: 'pie',
      title: 'Distribución de Movimientos por Tipo',
      cats: tEntries.map((t) => t[0]),
      vals: tEntries.map((t) => t[1]),
      catRef: `${Q('Resumen')}$A$5:$A$${4 + tEntries.length}`,
      valRef: `${Q('Resumen')}$B$5:$B$${4 + tEntries.length}`,
      colors: ['16201C', '2A7A4C', 'E8A33D', '3B82F6'],
      a: [4, 2, 12, 18],
    })
  }

  // HOJA 2: DETALLE MOVIMIENTOS
  const D = new Sheet('Kardex Detallado', {
    cols: [20, 14, 34, 16, 22, 22, 22],
    freeze: 2,
    filter: `A2:G${totalMovs + 2}`,
  })
  D.set(1, 1, `${bizName} — Historial Trazable de Movimientos`, 1)
  for (let c = 2; c <= 7; c++) D.set(1, c, '', 1)
  D.merges.push('A1:G1')
  D.rowH[1] = 28

  const headers = ['Fecha y Hora', 'Tipo', 'Motivo / Operación', 'Referencia', 'Almacén Origen', 'Almacén Destino', 'Responsable']
  headers.forEach((h, i) => D.set(2, i + 1, h, 2))

  movs.forEach((m, i) => {
    const rr = 3 + i
    const fecha = new Date(m.fecha).toLocaleString('es-PE')
    const origen = m.almacen_origen?.nombre || '—'
    const destino = m.almacen_destino?.nombre || '—'
    const user = m.usuario?.nombre_completo || 'Sistema'

    D.set(rr, 1, fecha, 5)
      .set(rr, 2, m.tipo, 17)
      .set(rr, 3, m.motivo, 3)
      .set(rr, 4, m.referencia_tipo || '—', 5)
      .set(rr, 5, origen, 3)
      .set(rr, 6, destino, 3)
      .set(rr, 7, user, 3)
  })

  return packXlsx([R, D])
}
