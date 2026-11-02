import Link from 'next/link'
import { getDashboardData } from '../../lib/queries/dashboard'
import { ArrowRight } from '../../components/ui/icons'

export default async function AdminDashboardPage() {
  const { kpis, alertasStock, ultimosMovimientos } = await getDashboardData()

  // Fecha actual en formato editorial
  const hoyTexto = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
  const fechaCapitalizada = hoyTexto.charAt(0).toUpperCase() + hoyTexto.slice(1)

  return (
    <div className="space-y-8 ops-fade-in font-sans">
      {/* Encabezado Editorial en Manrope */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-[#E7E5DF] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-[1.15] text-[#16201C]">
            Libro Diario de Almacén
          </h1>
          <p className="text-[13px] text-[#6B7A72] mt-1 font-medium">
            {fechaCapitalizada} · Sede Central Callao
          </p>
        </div>

        {/* Enlaces operativos directos */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/movimientos"
            className="text-[13px] text-[#6B7A72] hover:text-[#16201C] underline-offset-4 hover:underline transition-colors font-medium"
          >
            Kardex general
          </Link>
          <span className="text-[#E7E5DF]">/</span>
          <Link
            href="/admin/productos"
            className="text-[13px] font-semibold text-[#16201C] underline-offset-4 hover:underline transition-colors"
          >
            Catálogo completo →
          </Link>
        </div>
      </div>

      {/* Fila de 4 Cifras Grandes en Manrope sin caja, separadas por líneas finas */}
      <section aria-label="Indicadores clave de inventario">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E7E5DF] py-2">
          {/* Cifra 1: Valorización */}
          <div className="py-3 sm:py-0 sm:px-6 first:pl-0">
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              Valorización Stock
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-medium text-[#6B7A72]">S/</span>
              <span className="text-3xl sm:text-4xl font-bold text-[#16201C] tabular-nums tracking-[-0.02em] leading-[1.15]">
                {kpis.valorInventarioSoles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-[12px] text-[#6B7A72] mt-1">Costo total consolidado</p>
          </div>

          {/* Cifra 2: SKUs */}
          <div className="py-3 sm:py-0 sm:px-6">
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              SKUs Habilitados
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-bold text-[#16201C] tabular-nums tracking-[-0.02em] leading-[1.15]">
                {kpis.totalProductosActivos}
              </span>
              <span className="text-xs text-[#6B7A72] font-medium">artículos</span>
            </div>
            <p className="text-[12px] text-[#6B7A72] mt-1">En catálogo activo</p>
          </div>

          {/* Cifra 3: Stock Bajo Mínimo */}
          <div className="py-3 sm:py-0 sm:px-6">
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              Bajo Nivel Mínimo
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-3xl sm:text-4xl font-bold tabular-nums tracking-[-0.02em] leading-[1.15] ${
                  kpis.productosStockBajo > 0 ? 'text-[#C93B3B]' : 'text-[#16201C]'
                }`}
              >
                {kpis.productosStockBajo}
              </span>
              <span className="text-xs text-[#6B7A72] font-medium">en riesgo</span>
            </div>
            <p className="text-[12px] text-[#6B7A72] mt-1">Requieren reposición</p>
          </div>

          {/* Cifra 4: Operaciones Hoy */}
          <div className="py-3 sm:py-0 sm:px-6 last:pr-0">
            <span className="block text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em] mb-1.5">
              Operaciones Hoy
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-bold text-[#16201C] tabular-nums tracking-[-0.02em] leading-[1.15]">
                {kpis.movimientosHoy}
              </span>
              <span className="text-xs text-[#6B7A72] font-medium">movimientos</span>
            </div>
            <p className="text-[12px] text-[#6B7A72] mt-1">Ingresos y despachos</p>
          </div>
        </div>
      </section>

      {/* Disposición Editorial Asimétrica: Columna Principal (7 cols) + Lateral (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Principal: Requieren Reposición (7 cols) */}
        <section className="lg:col-span-7 space-y-3" aria-labelledby="seccion-reposicion">
          <div className="flex items-baseline justify-between border-b border-[#E7E5DF] pb-2">
            <div>
              <h2 id="seccion-reposicion" className="text-lg sm:text-xl font-bold text-[#16201C] tracking-[-0.02em] leading-[1.15]">
                Requieren Reposición
              </h2>
              <span className="text-[11px] text-[#6B7A72] block mt-0.5">
                {alertasStock.length} artículos en o bajo umbral de seguridad
              </span>
            </div>
            <Link
              href="/admin/productos?stock_bajo=true"
              className="text-[12px] text-[#6B7A72] hover:text-[#16201C] transition-colors font-medium"
            >
              Ver todos →
            </Link>
          </div>

          <div className="bg-white border border-[#E7E5DF] rounded-[8px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E7E5DF] bg-[#FAFAF7] text-[#6B7A72] text-[11px] font-semibold uppercase tracking-[0.06em]">
                    <th className="h-10 px-3.5">SKU</th>
                    <th className="h-10 px-3.5">Artículo</th>
                    <th className="h-10 px-3.5 text-right">Mín.</th>
                    <th className="h-10 px-3.5 text-right">Actual</th>
                    <th className="h-10 px-3.5 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
                  {alertasStock.map((prod) => {
                    const esAgotado = prod.stock <= 0
                    return (
                      <tr key={prod.id} className="h-11 hover:bg-[#F4F3EF] transition-colors">
                        <td className="px-3.5 font-mono text-xs text-[#16201C] whitespace-nowrap">
                          {prod.sku || 'S/N'}
                        </td>
                        <td className="px-3.5 max-w-[200px] truncate" title={prod.nombre}>
                          <div className="font-semibold text-[#16201C] text-[13px] truncate">{prod.nombre}</div>
                          <div className="text-[11px] text-[#6B7A72] truncate">{prod.categoria_nombre}</div>
                        </td>
                        <td className="px-3.5 text-right text-[#6B7A72] tabular-nums text-xs">
                          {prod.stock_minimo}
                        </td>
                        <td className="px-3.5 text-right font-semibold text-[#16201C] tabular-nums text-xs">
                          {prod.stock}
                        </td>
                        {/* Semáforo SOLO como punto de color + texto */}
                        <td className="px-3.5 text-right whitespace-nowrap">
                          {esAgotado ? (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C93B3B]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C93B3B]" aria-hidden="true" />
                              Agotado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C97D1A]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C97D1A]" aria-hidden="true" />
                              Bajo
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {alertasStock.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-[#6B7A72] text-xs">
                        Niveles de existencia estables. No hay alertas críticas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#FAFAF7] border-t border-[#E7E5DF] text-right">
              <Link
                href="/admin/inventario"
                className="text-xs text-[#16201C] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Consultar inventario físico completo <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>

        {/* Columna Lateral: Últimos Movimientos (5 cols) */}
        <section className="lg:col-span-5 space-y-3" aria-labelledby="seccion-movimientos">
          <div className="flex items-baseline justify-between border-b border-[#E7E5DF] pb-2">
            <div>
              <h2 id="seccion-movimientos" className="text-lg sm:text-xl font-bold text-[#16201C] tracking-[-0.02em] leading-[1.15]">
                Últimos Movimientos
              </h2>
              <span className="text-[11px] text-[#6B7A72] block mt-0.5">Kardex reciente</span>
            </div>
            <Link
              href="/admin/movimientos"
              className="text-[12px] text-[#6B7A72] hover:text-[#16201C] transition-colors font-medium"
            >
              Auditoría →
            </Link>
          </div>

          <div className="bg-white border border-[#E7E5DF] rounded-[8px] overflow-hidden">
            <div className="divide-y divide-[#E7E5DF]">
              {ultimosMovimientos.map((mov) => (
                <div key={mov.id} className="p-3.5 hover:bg-[#F4F3EF] transition-colors text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#16201C] font-semibold">
                      {mov.tipo}
                    </span>
                    <span className="text-[11px] text-[#6B7A72] tabular-nums font-medium">
                      {new Date(mov.fecha).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-[#16201C] text-[13px] font-medium mt-1 truncate" title={mov.motivo}>
                    {mov.motivo}
                  </p>
                </div>
              ))}

              {ultimosMovimientos.length === 0 && (
                <div className="py-8 text-center text-[#6B7A72] text-xs">
                  Sin movimientos registrados hoy.
                </div>
              )}
            </div>

            <div className="p-3 bg-[#FAFAF7] border-t border-[#E7E5DF] text-right">
              <Link
                href="/admin/movimientos"
                className="text-xs text-[#16201C] hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Abrir registro completo <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
