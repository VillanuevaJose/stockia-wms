'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ShieldCheck, X } from '../ui/icons'
import type { SesionConteoCiego } from '@/lib/queries/operaciones'
import {
  aplicarConteoFisicoAction,
  rechazarConteoCiegoAction,
} from '@/app/admin/inventario/actions'

interface RevisionConteosCiegosProps {
  sesiones: SesionConteoCiego[]
}

export function RevisionConteosCiegos({ sesiones }: RevisionConteosCiegosProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(
    sesiones.find((s) => s.estado === 'PENDIENTE')?.sesion_id || null
  )
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (sesiones.length === 0) return null

  const pendientesCount = sesiones.filter((s) => s.estado === 'PENDIENTE').length

  const handleAprobar = (sesion: SesionConteoCiego) => {
    const ajustes = sesion.detalles
      .filter((d) => d.diferencia !== 0)
      .map((d) => ({
        producto_id: d.producto_id,
        producto_nombre: d.producto_nombre,
        sku: d.sku,
        almacen_id: d.almacen_id || sesion.almacen_id,
        stock_sistema: d.stock_sistema,
        cantidad_contada: d.cantidad_contada,
        diferencia: d.diferencia,
        costo_unitario: d.costo_unitario,
      }))

    if (ajustes.length === 0) {
      setFeedback({ type: 'error', message: 'Esta sesión no tiene diferencias para ajustar en Kardex.' })
      return
    }

    startTransition(async () => {
      const res = await aplicarConteoFisicoAction({
        sesion_id: sesion.sesion_id,
        almacen_id: sesion.almacen_id,
        motivo_general: sesion.motivo,
        operario_nombre: sesion.operario_nombre,
        total_contados: sesion.total_contados,
        ajustes,
      })

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Auditoría aprobada y asentada en Kardex (${res.totalAjustados} productos ajustados).`,
        })
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || 'Error al aprobar auditoría.' })
      }
    })
  }

  const handleRechazar = (sesionId: string) => {
    startTransition(async () => {
      const res = await rechazarConteoCiegoAction({ sesion_id: sesionId })
      if (res.success) {
        setFeedback({ type: 'success', message: 'Auditoría marcada como rechazada para reconteo.' })
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || 'No se pudo rechazar la sesión.' })
      }
    })
  }

  return (
    <section
      aria-label="Auditorías de conteo ciego"
      className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden font-sans"
    >
      <div className="px-4 py-3 bg-[#FAFAF7] border-b border-[#E7E5DF] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-[#C97D1A]" />
          <h2 className="text-sm font-bold text-[#16201C]">
            Auditorías de Conteo Ciego
          </h2>
          {pendientesCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C97D1A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C97D1A]" aria-hidden="true" />
              {pendientesCount} pendiente{pendientesCount > 1 ? 's' : ''} de aprobación
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#6B7A72]">
          Últimas {sesiones.length} sesiones registradas
        </span>
      </div>

      {feedback && (
        <div
          role="status"
          className={`mx-4 mt-3 px-3 py-2.5 rounded-[6px] border flex items-center justify-between text-xs ${
            feedback.type === 'success'
              ? 'bg-[#FAFAF7] border-[#2A7A4C] text-[#16201C]'
              : 'bg-[#FAFAF7] border-[#C93B3B] text-[#C93B3B]'
          }`}
        >
          <span className="inline-flex items-center gap-1.5 font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={14} className="text-[#2A7A4C]" />
            ) : (
              <AlertTriangle size={14} className="text-[#C93B3B]" />
            )}
            {feedback.message}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Cerrar notificación"
            className="text-[#6B7A72] hover:text-[#16201C]"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="divide-y divide-[#E7E5DF]">
        {sesiones.slice(0, 6).map((ses) => {
          const isExpanded = expandedId === ses.sesion_id
          return (
            <div key={ses.sesion_id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : ses.sesion_id)}
                  className="flex items-start gap-2 text-left min-w-0"
                >
                  <span className="mt-0.5 text-[#6B7A72]">
                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-bold text-[#16201C]">{ses.motivo}</span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                          ses.estado === 'APROBADO'
                            ? 'text-[#2A7A4C]'
                            : ses.estado === 'RECHAZADO'
                              ? 'text-[#C93B3B]'
                              : 'text-[#C97D1A]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            ses.estado === 'APROBADO'
                              ? 'bg-[#2A7A4C]'
                              : ses.estado === 'RECHAZADO'
                                ? 'bg-[#C93B3B]'
                                : 'bg-[#C97D1A]'
                          }`}
                        />
                        {ses.estado === 'PENDIENTE'
                          ? 'Pendiente de firma'
                          : ses.estado === 'APROBADO'
                            ? 'Aprobado'
                            : 'Rechazado'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7A72] mt-0.5 tabular-nums">
                      Operario: {ses.operario_nombre} · {ses.almacen_nombre} ·{' '}
                      {new Date(ses.fecha_envio).toLocaleString('es-PE')}
                    </p>
                  </div>
                </button>

                <div className="flex flex-wrap items-center gap-3 shrink-0 tabular-nums text-xs">
                  <div className="text-right">
                    <span className="text-[#C93B3B] font-semibold mr-3">
                      -S/ {ses.faltante_soles.toFixed(2)}
                    </span>
                    <span className="text-[#2A7A4C] font-semibold">
                      +S/ {ses.sobrante_soles.toFixed(2)}
                    </span>
                  </div>

                  {ses.estado === 'PENDIENTE' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleRechazar(ses.sesion_id)}
                        disabled={isPending}
                        className="px-2.5 py-1 text-[11px] font-semibold border border-[#E7E5DF] rounded-[6px] text-[#C93B3B] hover:bg-[#FAFAF7]"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAprobar(ses)}
                        disabled={isPending}
                        className="px-3 py-1 text-[11px] font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px] hover:opacity-90"
                      >
                        Aprobar y Ajustar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && ses.detalles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E7E5DF] overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-[0.05em] text-[#6B7A72] border-b border-[#E7E5DF]">
                        <th className="py-1.5 pr-3">Producto</th>
                        <th className="py-1.5 px-2 text-right">Sistema</th>
                        <th className="py-1.5 px-2 text-right">Contado</th>
                        <th className="py-1.5 px-2 text-right">Diferencia</th>
                        <th className="py-1.5 pl-2 text-right">Impacto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EEEA] tabular-nums">
                      {ses.detalles.map((det) => (
                        <tr key={det.producto_id}>
                          <td className="py-1.5 pr-3">
                            <span className="font-semibold text-[#16201C]">{det.producto_nombre}</span>
                            <span className="text-[#6B7A72] ml-2 text-[11px]">{det.sku}</span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#6B7A72]">{det.stock_sistema}</td>
                          <td className="py-1.5 px-2 text-right font-semibold">{det.cantidad_contada}</td>
                          <td
                            className={`py-1.5 px-2 text-right font-semibold ${
                              det.diferencia < 0
                                ? 'text-[#C93B3B]'
                                : det.diferencia > 0
                                  ? 'text-[#C97D1A]'
                                  : 'text-[#2A7A4C]'
                            }`}
                          >
                            {det.diferencia > 0 ? `+${det.diferencia}` : det.diferencia === 0 ? 'Cuadra' : det.diferencia}
                          </td>
                          <td className="py-1.5 pl-2 text-right font-semibold">
                            {det.impacto_soles < 0
                              ? `-S/ ${Math.abs(det.impacto_soles).toFixed(2)}`
                              : det.impacto_soles > 0
                                ? `+S/ ${det.impacto_soles.toFixed(2)}`
                                : 'S/ 0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
