export type WidgetType =
  | 'kpi-valorizacion'
  | 'kpi-skus'
  | 'kpi-stock-bajo'
  | 'kpi-operaciones'
  | 'kpi-ventas-7d'
  | 'chart-flujo-7d'
  | 'chart-categorias'
  | 'table-reposicion'
  | 'feed-movimientos'
  | 'top-valor'
  | 'acciones-rapidas'

export type WidgetColSpan = 3 | 4 | 6 | 8 | 12

export interface WidgetConfigItem {
  id: string
  type: WidgetType
  colSpan: WidgetColSpan
}

export interface WidgetCatalogEntry {
  type: WidgetType
  title: string
  description: string
  category: 'KPIs' | 'Gráficos' | 'Operación'
  defaultSpan: WidgetColSpan
  allowedSpans: WidgetColSpan[]
}

export interface DashboardKPIs {
  valorInventarioSoles: number
  totalProductosActivos: number
  productosStockBajo: number
  movimientosHoy: number
  ventasUltimos7DiasSoles: number
  comprasUltimos7DiasSoles: number
  totalCategoriasActivas: number
}

export interface ProductoAlertaStock {
  id: string
  sku: string | null
  nombre: string
  stock: number
  stock_minimo: number
  categoria_nombre: string
}

export interface UltimoMovimiento {
  id: string
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA'
  motivo: string
  fecha: string
  referencia_tipo: string | null
}

export interface FlujoDiarioPoint {
  fecha: string
  etiqueta: string
  ventas: number
  compras: number
}

export interface DistribucionCategoria {
  categoria: string
  skus: number
  valorSoles: number
  porcentaje: number
}

export interface ProductoTopValor {
  id: string
  sku: string | null
  nombre: string
  stock: number
  valorSoles: number
  categoria_nombre: string
}

export interface DashboardUserContext {
  userId: string
  rol: 'admin' | 'almacenero' | 'vendedor'
  sedeNombre: string
}

export interface DashboardDataPayload {
  kpis: DashboardKPIs
  alertasStock: ProductoAlertaStock[]
  ultimosMovimientos: UltimoMovimiento[]
  flujo7Dias: FlujoDiarioPoint[]
  distribucionCategorias: DistribucionCategoria[]
  topProductosValor: ProductoTopValor[]
  userContext: DashboardUserContext
}

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  {
    type: 'kpi-valorizacion',
    title: 'Valorización de Stock',
    description: 'Costo total consolidado del inventario activo en Soles.',
    category: 'KPIs',
    defaultSpan: 3,
    allowedSpans: [3, 4, 6],
  },
  {
    type: 'kpi-skus',
    title: 'SKUs Habilitados',
    description: 'Cantidad de artículos activos en catálogo y categorías.',
    category: 'KPIs',
    defaultSpan: 3,
    allowedSpans: [3, 4, 6],
  },
  {
    type: 'kpi-stock-bajo',
    title: 'Bajo Nivel Mínimo',
    description: 'Artículos en umbral de riesgo o agotados que requieren reposición.',
    category: 'KPIs',
    defaultSpan: 3,
    allowedSpans: [3, 4, 6],
  },
  {
    type: 'kpi-operaciones',
    title: 'Operaciones Hoy',
    description: 'Conteo de entradas, salidas y transferencias del día en curso.',
    category: 'KPIs',
    defaultSpan: 3,
    allowedSpans: [3, 4, 6],
  },
  {
    type: 'kpi-ventas-7d',
    title: 'Ventas (Últimos 7 Días)',
    description: 'Facturación acumulada de la última semana vs compras.',
    category: 'KPIs',
    defaultSpan: 4,
    allowedSpans: [3, 4, 6],
  },
  {
    type: 'chart-flujo-7d',
    title: 'Tendencia Ventas vs Compras (7 Días)',
    description: 'Gráfico comparativo diario de ingresos comerciales y abastecimiento.',
    category: 'Gráficos',
    defaultSpan: 6,
    allowedSpans: [6, 8, 12],
  },
  {
    type: 'chart-categorias',
    title: 'Capital por Categoría',
    description: 'Distribución porcentual del valor del inventario entre líneas de producto.',
    category: 'Gráficos',
    defaultSpan: 6,
    allowedSpans: [4, 6, 8, 12],
  },
  {
    type: 'table-reposicion',
    title: 'Requieren Reposición',
    description: 'Tabla operativa con SKUs críticos ordenados por déficit de stock.',
    category: 'Operación',
    defaultSpan: 8,
    allowedSpans: [6, 8, 12],
  },
  {
    type: 'feed-movimientos',
    title: 'Últimos Movimientos (Kardex)',
    description: 'Registro cronológico reciente de ingresos, salidas y ajustes.',
    category: 'Operación',
    defaultSpan: 4,
    allowedSpans: [4, 6, 8, 12],
  },
  {
    type: 'top-valor',
    title: 'Top Productos por Valorización',
    description: 'Artículos que concentran el mayor capital inmovilizado en almacén.',
    category: 'Operación',
    defaultSpan: 6,
    allowedSpans: [4, 6, 8, 12],
  },
  {
    type: 'acciones-rapidas',
    title: 'Atajos Operativos',
    description: 'Accesos directos a POS, recepción de compras, inventario y kardex.',
    category: 'Operación',
    defaultSpan: 12,
    allowedSpans: [6, 8, 12],
  },
]

export function getDefaultLayoutForRole(
  rol: 'admin' | 'almacenero' | 'vendedor'
): WidgetConfigItem[] {
  if (rol === 'almacenero') {
    return [
      { id: 'w-acciones', type: 'acciones-rapidas', colSpan: 12 },
      { id: 'w-skus', type: 'kpi-skus', colSpan: 4 },
      { id: 'w-bajo', type: 'kpi-stock-bajo', colSpan: 4 },
      { id: 'w-ops', type: 'kpi-operaciones', colSpan: 4 },
      { id: 'w-reposicion', type: 'table-reposicion', colSpan: 8 },
      { id: 'w-kardex', type: 'feed-movimientos', colSpan: 4 },
      { id: 'w-cats', type: 'chart-categorias', colSpan: 12 },
    ]
  }

  if (rol === 'vendedor') {
    return [
      { id: 'w-acciones', type: 'acciones-rapidas', colSpan: 12 },
      { id: 'w-ventas7d', type: 'kpi-ventas-7d', colSpan: 4 },
      { id: 'w-skus', type: 'kpi-skus', colSpan: 4 },
      { id: 'w-bajo', type: 'kpi-stock-bajo', colSpan: 4 },
      { id: 'w-flujo', type: 'chart-flujo-7d', colSpan: 8 },
      { id: 'w-kardex', type: 'feed-movimientos', colSpan: 4 },
    ]
  }

  // Preset por defecto para Administrador / Gerencia
  return [
    { id: 'w-val', type: 'kpi-valorizacion', colSpan: 3 },
    { id: 'w-skus', type: 'kpi-skus', colSpan: 3 },
    { id: 'w-bajo', type: 'kpi-stock-bajo', colSpan: 3 },
    { id: 'w-ops', type: 'kpi-operaciones', colSpan: 3 },
    { id: 'w-flujo', type: 'chart-flujo-7d', colSpan: 6 },
    { id: 'w-cats', type: 'chart-categorias', colSpan: 6 },
    { id: 'w-reposicion', type: 'table-reposicion', colSpan: 8 },
    { id: 'w-kardex', type: 'feed-movimientos', colSpan: 4 },
  ]
}
