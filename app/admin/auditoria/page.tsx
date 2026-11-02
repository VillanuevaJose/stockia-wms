import { getAuditoriaList } from '../../../lib/queries/operaciones'
import { ShieldCheck } from '../../../components/ui/icons'

export default async function AuditoriaPage() {
  const logs = await getAuditoriaList()

  const accionBadge = (accion: string) => {
    switch (accion) {
      case 'INSERT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'UPDATE':
        return 'bg-amber-50 text-amber-800 border-amber-300'
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <div className="space-y-6 animate-apple-fade font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck size={18} className="text-amber-500" />
            <span>Auditoría de Seguridad y Mutaciones</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trazabilidad inmutable de inserciones, actualizaciones y eventos críticos en base de datos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
            Eventos Registrados: <span className="font-bold text-slate-900 tabular-nums">{logs.length}</span>
          </div>
        </div>
      </div>

      {/* Tabla Auditoría */}
      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Acción</th>
                <th className="py-2.5 px-3 font-semibold">Tabla Afectada</th>
                <th className="py-2.5 px-3 font-semibold">Registro ID</th>
                <th className="py-2.5 px-3 font-semibold">Actor / Usuario</th>
                <th className="py-2.5 px-3 font-semibold text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${accionBadge(log.accion)}`}>
                      {log.accion}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                    public.{log.tabla}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                    {log.registro_id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-sans font-medium whitespace-nowrap">
                    {log.usuario_nombre}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap tabular-nums">
                    {new Date(log.created_at).toLocaleString('es-PE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
