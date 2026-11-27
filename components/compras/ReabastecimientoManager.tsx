'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, Check, Search, ShoppingCart, Truck, X } from '../ui/icons'
import type { ReabastecimientoReporte, SugerenciaReabastecimientoRow } from '@/lib/queries/reabastecimiento'
import { calcularProyeccionRopRunway } from '@/lib/utils/runway'
import { generarCompraRapidaRopAction } from '@/lib/actions/compras'
import { crearSolicitudSedesAction } from '@/lib/actions/sedes'

interface ReabastecimientoManagerProps {
  reporte: ReabastecimientoReporte
  almacenes: Array<{ id: string; nombre: string }>
}

const LEAD_TIME_OPTIONS = [3, 5, 7, 10, 15] as const

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Lima',
  }).format(new Date(iso))
}

export function ReabastecimientoManager({ reporte, almacenes }: ReabastecimientoManagerProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<'ALERTAS' | 'BALANCEO' | 'TODOS' | 'CRITICO' | 'REORDEN' | 'OPTIMO'>('ALERTAS')
  const [selectedAlmacen, setSelectedAlmacen] = useState<string>(almacenes[0]?.id || '')
  const [leadTimeDias, setLeadTimeDias] = useState<number>(5)
  const [isPending, startTransition] = useTransition()
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [confirmandoTrasladoId, setConfirmandoTrasladoId] = useState<string | null>(null)
  const [comprandoId, setComprandoId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
    linkHref?: string
    linkLabel?: string
  } | null>(null)

  // Recalcular proyecciones en vivo cuando el usuario cambia el Lead Time
  const { articulosCalculados, kpis } = useMemo(() => {
    if (leadTimeDias === 5) {
      return { articulosCalculados: reporte.articulos, kpis: reporte.kpis }
    }

    let criticos = 0
    let reorden = 0
    let optimos = 0
    let runwayBajo = 0
    let presupuesto = 0

    const lista = reporte.articulos.map((art): SugerenciaReabastecimientoRow => {
      const ventas10d = art.ventas_10d
      const ventas20dPrev = Math.max(0, art.ventas_30d - art.ventas_10d)

      const proy = calcularProyeccionRopRunway({
        stock: art.stock_actual,
        stockMinimo: art.stock_minimo,
        costoUnitario: art.costo_unitario,
        ventas10d,
        ventas20dPrev,
        leadTimeDias,
      })

      if (proy.estado === 'CRITICO') criticos++
      else if (proy.estado === 'REORDEN') reorden++
      else optimos++

      if (proy.runwayDias !== null && proy.runwayDias <= leadTimeDias) {
        runwayBajo++
      }
      if (proy.estado !== 'OPTIMO') {
        presupuesto += proy.inversionEstimada
      }

      return {
        ...art,
        lead_time_dias: leadTimeDias,
        demanda_diaria: proy.demandaDiaria,
        runway_dias: proy.runwayDias,
        fecha_quiebre_iso: proy.fechaQuiebreIso,
        stock_seguridad: proy.stockSeguridad,
        rop: proy.rop,
        estado: proy.estado,
        cantidad_sugerida: proy.cantidadSugerida,
        inversion_estimada: proy.inversionEstimada,
      }
    })

    const prioridad = { CRITICO: 0, REORDEN: 1, OPTIMO: 2 }
    lista.sort((a, b) => {
      if (prioridad[a.estado] !== prioridad[b.estado]) {
        return prioridad[a.estado] - prioridad[b.estado]
      }
      return (a.runway_dias ?? 9999) - (b.runway_dias ?? 9999)
    })

    return {
      articulosCalculados: lista,
      kpis: {
        total_articulos: lista.length,
        articulos_criticos: criticos,
        articulos_reorden: reorden,
        articulos_optimos: optimos,
        articulos_runway_bajo: runwayBajo,
        presupuesto_total_sugerido: Math.round(presupuesto * 100) / 100,
        oportunidades_balanceo: reporte.kpis.oportunidades_balanceo,
        ahorro_potencial_balanceo: reporte.kpis.ahorro_potencial_balanceo,
      },
    }
  }, [reporte, leadTimeDias])

  const articulosFiltrados = useMemo(() => {
    const query = searchTerm.toLowerCase().trim()
    return articulosCalculados.filter((item) => {
      const matchesSearch =
        !query ||
        item.nombre.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.proveedor_sugerido_nombre.toLowerCase().includes(query)

      let matchesEstado = true
      if (filterEstado === 'ALERTAS') {
        matchesEstado = item.estado === 'CRITICO' || item.estado === 'REORDEN' || Boolean(item.sugerencia_balanceo)
      } else if (filterEstado === 'BALANCEO') {
        matchesEstado = Boolean(item.sugerencia_balanceo)
      } else if (filterEstado !== 'TODOS') {
        matchesEstado = item.estado === filterEstado
      }

      return matchesSearch && matchesEstado
    })
  }, [articulosCalculados, searchTerm, filterEstado])

  const ejecutarTrasladoUnClic = (art: SugerenciaReabastecimientoRow) => {
    const bal = art.sugerencia_balanceo
    if (!bal) return

    setConfirmandoTrasladoId(null)
    setComprandoId(art.producto_id)
    setFeedback(null)

    startTransition(async () => {
      const res = await crearSolicitudSedesAction({
        sede_origen_id: bal.sede_receptora_id,
        sede_destino_id: bal.sede_emisora_id,
        producto_id: art.producto_id,
        cantidad: bal.cantidad_transferible,
        prioridad: art.estado === 'CRITICO' ? 'URGENTE' : 'ALTA',
        mensaje: `Balanceo inteligente Runway/ROP: transferir ${bal.cantidad_transferible} und de ${bal.sede_emisora_nombre} a ${bal.sede_receptora_nombre} (ahorro est. S/ ${bal.ahorro_estimado_soles.toFixed(2)}).`,
      })

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Traslado inter-sedes solicitado: +${bal.cantidad_transferible} und de "${art.nombre}" desde ${bal.sede_emisora_nombre} hacia ${bal.sede_receptora_nombre}.`,
          linkHref: '/admin/almacenes',
          linkLabel: 'Despachar en Sedes',
        })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'No se pudo generar la solicitud de traslado entre sedes.',
        })
      }
      setComprandoId(null)
    })
  }

  const ejecutarCompraUnClic = (art: SugerenciaReabastecimientoRow) => {
    if (art.cantidad_sugerida <= 0) return

    setConfirmandoId(null)
    setComprandoId(art.producto_id)
    setFeedback(null)

    startTransition(async () => {
      const res = await generarCompraRapidaRopAction({
        producto_id: art.producto_id,
        cantidad: art.cantidad_sugerida,
        costo_unitario: art.costo_unitario,
        proveedor_id: art.proveedor_sugerido_id,
        almacen_id: selectedAlmacen || undefined,
      })

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Orden de compra registrada: +${art.cantidad_sugerida} und de "${art.nombre}" ingresadas al inventario y Kardex.`,
        })
        router.refresh()
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'No se pudo generar la orden de compra sugerida.',
        })
      }
      setComprandoId(null)
    })
  }

  return (
    <div className="space-y-5 font-sans">
      {/* Banner de Feedback Inline */}
      {feedback && (
        <div
          role="status"
          className={`px-4 py-3 rounded-[8px] border flex items-center justify-between gap-3 text-[13px] ${
            feedback.type === 'success'
              ? 'bg-[#FAFAF7] border-[#2A7A4C] text-[#16201C]'
              : 'bg-[#FAFAF7] border-[#C93B3B] text-[#C93B3B]'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            {feedback.type === 'success' ? (
              <Check size={16} className="text-[#2A7A4C] shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-[#C93B3B] shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
            {feedback.linkHref && feedback.linkLabel && (
              <Link
                href={feedback.linkHref}
                className="inline-flex items-center gap-1 font-semibold text-[#16201C] underline underline-offset-2 ml-1"
              >
                {feedback.linkLabel} <ArrowRight size={12} />
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Cerrar mensaje"
            className="p-1 text-[#6B7A72] hover:text-[#16201C] rounded-[4px]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Encabezado Explicativo + Selector de Lead Time */}
      <div className="bg-[#FAFAF7] border border-[#E7E5DF] p-4 rounded-[8px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72] block">
            Predictor de Quiebre de Stock (Runway y Punto de Reorden)
          </span>
          <p className="text-[12px] text-[#16201C]">
            <strong>Velocidad ponderada:</strong> 60% últimos 10 días + 40% los 20 días previos.{' '}
            <span className="text-[#6B7A72]">
              Runway = Stock actual / Demanda diaria · ROP = (Demanda × Lead Time) + Stock de seguridad.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#6B7A72]">
            Lead Time:
          </span>
          <div
            role="group"
            aria-label="Simular tiempo de entrega de proveedor en días"
            className="inline-flex items-center p-0.5 rounded-[6px] bg-white border border-[#E7E5DF]"
          >
            {LEAD_TIME_OPTIONS.map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => setLeadTimeDias(dias)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-[4px] tabular-nums transition-colors ${
                  leadTimeDias === dias
                    ? 'bg-[#16201C] text-[#FAFAF7]'
                    : 'text-[#6B7A72] hover:text-[#16201C]'
                }`}
              >
                {dias}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs de Reabastecimiento y Runway */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
            Críticos (Agotado / ≤2d)
          </span>
          <p className="text-2xl font-bold text-[#C93B3B] tabular-nums mt-1">
            {kpis.articulos_criticos}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
            En Punto de Reorden
          </span>
          <p className="text-2xl font-bold text-[#C97D1A] tabular-nums mt-1">
            {kpis.articulos_reorden}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
            Cobertura ≤ {leadTimeDias} Días
          </span>
          <p className="text-2xl font-bold text-[#16201C] tabular-nums mt-1">
            {kpis.articulos_runway_bajo}
          </p>
        </div>

        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
            Stock Óptimo
          </span>
          <p className="text-2xl font-bold text-[#2A7A4C] tabular-nums mt-1">
            {kpis.articulos_optimos}
          </p>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
            Presupuesto Reposición
          </span>
          <p className="text-2xl font-bold text-[#16201C] tabular-nums mt-1">
            S/ {kpis.presupuesto_total_sugerido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Aviso de Balanceo Inteligente Inter-Sedes */}
      {kpis.oportunidades_balanceo > 0 && (
        <div className="bg-white border border-[#E8A33D] rounded-[8px] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E8A33D]" aria-hidden="true" />
              <span className="text-xs font-bold text-[#16201C]">
                Balanceo Inteligente Inter-Sedes: {kpis.oportunidades_balanceo}{' '}
                {kpis.oportunidades_balanceo === 1 ? 'artículo puede' : 'artículos pueden'} cubrirse transfiriendo excedentes
              </span>
            </div>
            <p className="text-[12px] text-[#6B7A72] tabular-nums">
              Ahorro estimado al transferir entre sedes antes de comprar a proveedor:{' '}
              <strong className="text-[#2A7A4C]">
                S/ {kpis.ahorro_potencial_balanceo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilterEstado(filterEstado === 'BALANCEO' ? 'ALERTAS' : 'BALANCEO')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[6px] shrink-0 transition-colors ${
              filterEstado === 'BALANCEO'
                ? 'bg-[#16201C] text-[#FAFAF7]'
                : 'bg-[#FAFAF7] border border-[#E7E5DF] text-[#16201C] hover:bg-[#F4F3EF]'
            }`}
          >
            {filterEstado === 'BALANCEO' ? 'Ver todas las alertas' : 'Filtrar por Balanceo'}
          </button>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[8px] border border-[#E7E5DF]">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
          <input
            type="text"
            placeholder="Buscar artículo por nombre, SKU o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-[6px] border border-[#E7E5DF] focus:border-[#E8A33D] focus:outline-none bg-white text-[#16201C]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {almacenes.length > 1 && (
            <select
              value={selectedAlmacen}
              onChange={(e) => setSelectedAlmacen(e.target.value)}
              aria-label="Seleccionar almacén de destino"
              className="text-[12px] rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 bg-white text-[#16201C]"
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  Destino: {a.nombre}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 overflow-x-auto">
            {(['ALERTAS', 'BALANCEO', 'TODOS', 'CRITICO', 'REORDEN', 'OPTIMO'] as const).map((fil) => (
              <button
                key={fil}
                type="button"
                onClick={() => setFilterEstado(fil)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer whitespace-nowrap ${
                  filterEstado === fil
                    ? 'bg-[#16201C] text-[#FAFAF7]'
                    : 'bg-[#FAFAF7] hover:bg-[#E7E5DF] text-[#6B7A72]'
                }`}
              >
                {fil === 'ALERTAS'
                  ? 'Solo Alertas'
                  : fil === 'BALANCEO'
                    ? `Balanceo (${kpis.oportunidades_balanceo})`
                    : fil.charAt(0) + fil.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla Predictiva de Runway y Reorden */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-[0.06em] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Artículo / SKU</th>
                <th className="py-2.5 px-3 text-right">Stock</th>
                <th className="py-2.5 px-3 text-right">Velocidad</th>
                <th className="py-2.5 px-3">Runway (Cobertura)</th>
                <th className="py-2.5 px-3 text-right">ROP</th>
                <th className="py-2.5 px-3 text-center">Estado</th>
                <th className="py-2.5 px-3 text-right">Compra Sugerida</th>
                <th className="py-2.5 px-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {articulosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7A72]">
                    <ShoppingCart size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
                    <p className="text-[13px] font-medium text-[#16201C]">
                      No se encontraron artículos con este filtro
                    </p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5">
                      Los productos mantienen cobertura saludable o ajusta el criterio de búsqueda.
                    </p>
                  </td>
                </tr>
              ) : (
                articulosFiltrados.map((art) => {
                  const estaConfirmando = confirmandoId === art.producto_id
                  const estaComprando = isPending && comprandoId === art.producto_id

                  return (
                    <tr key={art.producto_id} className="hover:bg-[#FAFAF7] transition-colors">
                      <td className="py-2.5 px-3.5 max-w-[230px]">
                        <div className="font-semibold text-[#16201C] truncate" title={art.nombre}>
                          {art.nombre}
                        </div>
                        <div className="text-[11px] text-[#6B7A72] flex items-center gap-1.5 mt-0.5 truncate">
                          <span>{art.sku}</span>
                          <span>·</span>
                          <span>{art.categoria}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                        <span
                          className={
                            art.stock_actual <= 0
                              ? 'text-[#C93B3B]'
                              : art.stock_actual <= art.rop
                                ? 'text-[#C97D1A]'
                                : 'text-[#16201C]'
                          }
                        >
                          {art.stock_actual}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right tabular-nums text-[#6B7A72]">
                        <div>{art.demanda_diaria} und/d</div>
                        <div className="text-[10px] text-[#6B7A72]/80">
                          {art.ventas_10d} en 10d
                        </div>
                      </td>

                      <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                        {art.stock_actual <= 0 ? (
                          <div>
                            <span className="font-semibold text-[#C93B3B]">Agotado (0 días)</span>
                            <div className="text-[11px] text-[#C93B3B]">Quiebre activo</div>
                          </div>
                        ) : art.runway_dias !== null ? (
                          <div>
                            <span
                              className={`font-semibold ${
                                art.runway_dias <= 2
                                  ? 'text-[#C93B3B]'
                                  : art.runway_dias <= leadTimeDias + 2
                                    ? 'text-[#C97D1A]'
                                    : 'text-[#2A7A4C]'
                              }`}
                            >
                              {art.runway_dias} {art.runway_dias === 1 ? 'día' : 'días'}
                            </span>
                            {art.fecha_quiebre_iso && (
                              <div className="text-[11px] text-[#6B7A72]">
                                Quiebre est.: {formatShortDate(art.fecha_quiebre_iso)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="font-medium text-[#6B7A72]">Sin ventas (30d)</span>
                            <div className="text-[11px] text-[#6B7A72]">Cobertura estable</div>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-[#16201C]">
                        {art.rop}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {art.estado === 'CRITICO' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C93B3B]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C93B3B]" aria-hidden="true" />
                            Crítico
                          </span>
                        ) : art.estado === 'REORDEN' ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C97D1A]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C97D1A]" aria-hidden="true" />
                            Reorden
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2A7A4C]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2A7A4C]" aria-hidden="true" />
                            Óptimo
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right tabular-nums">
                        {art.sugerencia_balanceo ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-[#2A7A4C]">
                              Transferir +{art.sugerencia_balanceo.cantidad_transferible} und
                            </div>
                            <div className="text-[11px] text-[#16201C]">
                              {art.sugerencia_balanceo.sede_emisora_nombre} → {art.sugerencia_balanceo.sede_receptora_nombre}
                            </div>
                            <div className="text-[10px] text-[#6B7A72]">
                              Ahorro est.: S/ {art.sugerencia_balanceo.ahorro_estimado_soles.toFixed(2)}
                            </div>
                          </div>
                        ) : art.traslado_en_curso ? (
                          <Link
                            href="/admin/almacenes"
                            className="text-[11px] font-semibold text-[#C97D1A] hover:underline"
                          >
                            Traslado en curso
                          </Link>
                        ) : art.cantidad_sugerida > 0 ? (
                          <div>
                            <div className="font-bold text-[#16201C]">
                              +{art.cantidad_sugerida} und · S/ {art.inversion_estimada.toFixed(2)}
                            </div>
                            <div
                              className="text-[11px] text-[#6B7A72] truncate max-w-[180px] ml-auto"
                              title={art.proveedor_sugerido_nombre}
                            >
                              {art.proveedor_sugerido_nombre}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#6B7A72]">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {art.sugerencia_balanceo ? (
                          confirmandoTrasladoId === art.producto_id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => ejecutarTrasladoUnClic(art)}
                                disabled={estaComprando}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-[#2A7A4C] text-white rounded-[6px] hover:opacity-90 disabled:opacity-50"
                              >
                                {estaComprando ? 'Enviando...' : 'Confirmar Traslado'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmandoTrasladoId(null)}
                                aria-label="Cancelar traslado"
                                className="p-1 text-[#6B7A72] hover:text-[#16201C] border border-[#E7E5DF] rounded-[6px]"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmandoId(null)
                                setConfirmandoTrasladoId(art.producto_id)
                              }}
                              disabled={estaComprando}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-[#16201C] hover:opacity-90 text-[#FAFAF7] rounded-[6px] transition-opacity cursor-pointer disabled:opacity-50"
                            >
                              <Truck size={13} />
                              <span>Transferir 1 Clic</span>
                            </button>
                          )
                        ) : art.traslado_en_curso ? (
                          <Link
                            href="/admin/almacenes"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16201C] hover:underline"
                          >
                            Ver envío <ArrowRight size={11} />
                          </Link>
                        ) : art.estado !== 'OPTIMO' ? (
                          estaConfirmando ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => ejecutarCompraUnClic(art)}
                                disabled={estaComprando}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px] hover:opacity-90 disabled:opacity-50"
                              >
                                {estaComprando ? 'Emitiendo...' : 'Confirmar O.C.'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmandoId(null)}
                                aria-label="Cancelar orden sugerida"
                                className="p-1 text-[#6B7A72] hover:text-[#16201C] border border-[#E7E5DF] rounded-[6px]"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmandoTrasladoId(null)
                                setConfirmandoId(art.producto_id)
                              }}
                              disabled={estaComprando}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-[#16201C] hover:opacity-90 text-[#FAFAF7] rounded-[6px] transition-opacity cursor-pointer disabled:opacity-50"
                            >
                              <Truck size={13} />
                              <span>Reorden 1 Clic</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-[#6B7A72]">Cubierto</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
