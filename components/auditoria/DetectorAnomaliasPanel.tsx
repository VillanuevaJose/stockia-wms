import Link from 'next/link'
import { AlertTriangle, ArrowRight, CheckCircle2 } from '../ui/icons'
import type { ReporteAnomalias } from '@/lib/queries/anomalias'

interface DetectorAnomaliasPanelProps {
  reporte: ReporteAnomalias
}

export function DetectorAnomaliasPanel({ reporte }: DetectorAnomaliasPanelProps) {
  const { alertas, resumen } = reporte

  return (
    <section
      aria-label="Detector de Stock Fantasma y Anomalías Operativas"
      className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden font-sans"
    >
      <div className="px-5 py-4 bg-[#FAFAF7] border-b border-[#E7E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle
              size={16}
              className={alertas.length > 0 ? 'text-[#C97D1A]' : 'text-[#2A7A4C]'}
            />
            <h2 className="text-sm font-bold text-[#16201C]">
              Detector de Stock Fantasma y Anomalías Operativas
            </h2>
          </div>
          <p className="text-xs text-[#6B7A72] mt-0.5">
            Cruce automático de rotación de ventas, ajustes de merma y anulaciones en los últimos 30–45 días.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs tabular-nums">
          <span>
            <strong className="text-[#16201C]">{resumen.productos_fantasma}</strong>{' '}
            <span className="text-[#6B7A72]">stock fantasma</span>
          </span>
          <span>
            <strong className="text-[#16201C]">{resumen.mermas_30d_count}</strong>{' '}
            <span className="text-[#6B7A72]">mermas 30d</span>
          </span>
          <span>
            <strong className="text-[#16201C]">{resumen.ventas_anuladas_30d_count}</strong>{' '}
            <span className="text-[#6B7A72]">anulaciones</span>
          </span>
        </div>
      </div>

      {alertas.length === 0 ? (
        <div className="p-6 flex items-center gap-3 text-xs text-[#16201C]">
          <CheckCircle2 size={18} className="text-[#2A7A4C] shrink-0" />
          <div>
            <span className="font-semibold">Operación sin anomalías detectadas.</span>{' '}
            <span className="text-[#6B7A72]">
              No hay caídas abruptas de rotación en productos con stock ni concentración inusual de mermas o anulaciones.
            </span>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-[#E7E5DF]">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF7] transition-colors"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                      alerta.severidad === 'ALTA' ? 'text-[#C93B3B]' : 'text-[#C97D1A]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        alerta.severidad === 'ALTA' ? 'bg-[#C93B3B]' : 'bg-[#C97D1A]'
                      }`}
                    />
                    {alerta.severidad === 'ALTA' ? 'Prioridad Alta' : 'Atención'}
                  </span>
                  <h3 className="text-[13px] font-bold text-[#16201C]">{alerta.titulo}</h3>
                </div>
                <p className="text-xs text-[#6B7A72] leading-relaxed">{alerta.detalle}</p>
              </div>

              <Link
                href={alerta.accion_href}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] text-[#FAFAF7] text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <span>{alerta.accion_label}</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
