import { getAuditoriaList } from '../../../lib/queries/operaciones'
import { getAnomaliasOperativas } from '../../../lib/queries/anomalias'
import { ShieldCheck } from '../../../components/ui/icons'
import { DetectorAnomaliasPanel } from '../../../components/auditoria/DetectorAnomaliasPanel'

export const dynamic = 'force-dynamic'

export default async function AuditoriaPage() {
  const [logs, reporteAnomalias] = await Promise.all([
    getAuditoriaList(),
    getAnomaliasOperativas(),
  ])

  const accionBadge = (accion: string) => {
    switch (accion) {
      case 'INSERT':
      case 'CONTEO_CIEGO_APROBADO':
        return 'text-[#2A7A4C]'
      case 'UPDATE':
      case 'CONTEO_CIEGO_PENDIENTE':
        return 'text-[#C97D1A]'
      case 'DELETE':
      case 'CONTEO_CIEGO_RECHAZADO':
        return 'text-[#C93B3B]'
      default:
        return 'text-[#16201C]'
    }
  }

  return (
    <div className="space-y-6 ops-fade-in font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E7E5DF] pb-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#16201C] tracking-tight flex items-center gap-2 leading-[1.15]">
            <ShieldCheck size={22} className="text-[#C97D1A]" />
            <span>Auditoría, Anomalías y Trazabilidad</span>
          </h1>
          <p className="text-[13px] text-[#6B7A72] mt-1">
            Detección proactiva de stock fantasma y bitácora inmutable de operaciones críticas en base de datos.
          </p>
        </div>

        <div className="text-xs text-[#6B7A72] bg-white px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] tabular-nums self-start sm:self-auto">
          Eventos Registrados: <strong className="text-[#16201C]">{logs.length}</strong>
        </div>
      </div>

      {/* Detector de Stock Fantasma y Anomalías */}
      <DetectorAnomaliasPanel reporte={reporteAnomalias} />

      {/* Tabla Auditoría Inmutable */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-[0.06em]">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold">Acción</th>
                <th className="py-2.5 px-3.5 font-semibold">Tabla Afectada</th>
                <th className="py-2.5 px-3.5 font-semibold">Registro ID</th>
                <th className="py-2.5 px-3.5 font-semibold">Actor / Usuario</th>
                <th className="py-2.5 px-3.5 font-semibold text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6B7A72] text-xs">
                    No hay eventos registrados aún. Los registros aparecerán automáticamente cuando se realicen operaciones en el sistema.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${accionBadge(log.accion)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
                        {log.accion}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-semibold text-[#16201C] whitespace-nowrap">
                      public.{log.tabla}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap tabular-nums">
                      {log.registro_id || '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#16201C] font-medium whitespace-nowrap">
                      {log.usuario_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-[#6B7A72] whitespace-nowrap tabular-nums">
                      {new Date(log.created_at).toLocaleString('es-PE')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
