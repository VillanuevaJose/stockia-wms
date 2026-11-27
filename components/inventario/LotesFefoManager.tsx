'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, Plus, X } from '../ui/icons'
import {
  despacharPorFefoAction,
  registrarLoteFefoAction,
  type LoteFefoRow,
} from '@/lib/actions/lotes'

interface Props {
  lotes: LoteFefoRow[]
  productos: Array<{ id: string; sku: string; nombre: string }>
  almacenes: Array<{ id: string; nombre: string }>
}

export function LotesFefoManager({ lotes, productos, almacenes }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [productoId, setProductoId] = useState(productos[0]?.id || '')
  const [almacenId, setAlmacenId] = useState(almacenes[0]?.id || '')
  const [numeroLote, setNumeroLote] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [cantidad, setCantidad] = useState('10')
  const [despachoProdId, setDespachoProdId] = useState(productos[0]?.id || '')
  const [despachoCant, setDespachoCant] = useState('1')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleRegistrarLote = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    startTransition(async () => {
      const res = await registrarLoteFefoAction({
        producto_id: productoId,
        almacen_id: almacenId || null,
        numero_lote: numeroLote,
        fecha_vencimiento: fechaVencimiento,
        cantidad: Number(cantidad) || 0,
      })

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'No se pudo registrar el lote.' })
        return
      }

      setNumeroLote('')
      setFechaVencimiento('')
      setFeedback({ type: 'success', message: 'Lote registrado en cola FEFO correctamente.' })
      router.refresh()
    })
  }

  const handleDespachoFefo = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    startTransition(async () => {
      const res = await despacharPorFefoAction({
        producto_id: despachoProdId,
        cantidad_despachar: Number(despachoCant) || 0,
      })

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'No se pudo realizar el despacho FEFO.' })
        return
      }

      const detalleTexto = (res.resumen_lotes || [])
        .map((r) => `${r.descontado} und de Lote ${r.numero_lote} (vence ${r.fecha_vencimiento})`)
        .join(' + ')

      setFeedback({
        type: 'success',
        message: `Despacho FEFO ejecutado: ${detalleTexto}`,
      })
      router.refresh()
    })
  }

  const vencidos = lotes.filter((l) => l.estado_caducidad === 'VENCIDO').length
  const porVencer = lotes.filter((l) => l.estado_caducidad === 'POR_VENCER').length

  return (
    <div className="space-y-6 font-sans">
      {feedback && (
        <div
          role="status"
          className={`px-4 py-3 rounded-[8px] border flex items-center justify-between gap-2 text-xs ${
            feedback.type === 'success'
              ? 'bg-[#FAFAF7] border-[#2A7A4C] text-[#16201C]'
              : 'bg-[#FAFAF7] border-[#C93B3B] text-[#C93B3B]'
          }`}
        >
          <span className="inline-flex items-center gap-2 font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} className="text-[#2A7A4C] shrink-0" />
            ) : (
              <AlertTriangle size={15} className="text-[#C93B3B] shrink-0" />
            )}
            {feedback.message}
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Cerrar notificación"
            className="text-[#6B7A72] hover:text-[#16201C]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Formularios: Registrar Lote + Despacho FEFO Automático */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form
          onSubmit={handleRegistrarLote}
          className="bg-white rounded-[8px] border border-[#E7E5DF] p-5 space-y-3"
        >
          <div>
            <h2 className="text-sm font-bold text-[#16201C]">Registrar Nuevo Lote con Caducidad</h2>
            <p className="text-[11px] text-[#6B7A72]">
              Registra número de lote y fecha de vencimiento para trazabilidad sanitaria.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              aria-label="Producto del lote"
              className="rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 bg-white"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.nombre}
                </option>
              ))}
            </select>

            <select
              value={almacenId}
              onChange={(e) => setAlmacenId(e.target.value)}
              aria-label="Almacén del lote"
              className="rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 bg-white"
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>

            <input
              type="text"
              required
              placeholder="N° de Lote (ej. L-2026-A)"
              value={numeroLote}
              onChange={(e) => setNumeroLote(e.target.value)}
              className="rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 focus:outline-none focus:border-[#E8A33D]"
            />

            <input
              type="date"
              required
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              aria-label="Fecha de vencimiento"
              className="rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 focus:outline-none focus:border-[#E8A33D]"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#6B7A72]">Cantidad:</span>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-24 rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 text-right tabular-nums"
              />
            </div>

            <button
              type="submit"
              disabled={isPending || productos.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] text-[#FAFAF7] text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              <span>Registrar Lote</span>
            </button>
          </div>
        </form>

        <form
          onSubmit={handleDespachoFefo}
          className="bg-white rounded-[8px] border border-[#E7E5DF] p-5 flex flex-col justify-between space-y-3"
        >
          <div>
            <h2 className="text-sm font-bold text-[#16201C]">
              Despacho Automático FEFO (First-Expired, First-Out)
            </h2>
            <p className="text-[11px] text-[#6B7A72]">
              Descuenta automáticamente las unidades empezando por el lote más próximo a vencer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <select
              value={despachoProdId}
              onChange={(e) => setDespachoProdId(e.target.value)}
              aria-label="Producto a despachar por FEFO"
              className="sm:col-span-2 rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 bg-white"
            >
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.nombre}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={despachoCant}
              onChange={(e) => setDespachoCant(e.target.value)}
              placeholder="Cantidad"
              className="rounded-[6px] border border-[#E7E5DF] px-2.5 py-1.5 text-right tabular-nums"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] text-[#6B7A72] tabular-nums">
              <span className="text-[#C93B3B] font-semibold mr-3">{vencidos} vencidos</span>
              <span className="text-[#C97D1A] font-semibold">{porVencer} por vencer (≤30d)</span>
            </div>

            <button
              type="submit"
              disabled={isPending || lotes.length === 0}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#16201C] text-[#FAFAF7] text-xs font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Despachar FEFO
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de Lotes ordenados por caducidad FEFO */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFAF7] border-b border-[#E7E5DF] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#16201C]">
            Cola de Salida Prioritaria FEFO (Ordenado por Fecha de Vencimiento)
          </h3>
          <span className="text-[11px] text-[#6B7A72] tabular-nums">{lotes.length} lotes activos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-[0.06em] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">N° Lote</th>
                <th className="py-2.5 px-3">Artículo / SKU</th>
                <th className="py-2.5 px-3">Almacén</th>
                <th className="py-2.5 px-3 text-right">Saldo Lote</th>
                <th className="py-2.5 px-3 text-right">Vencimiento</th>
                <th className="py-2.5 px-3.5 text-right">Estado FEFO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C] tabular-nums">
              {lotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#6B7A72]">
                    No hay lotes registrados. Agrega el primer lote arriba para controlar fechas de caducidad.
                  </td>
                </tr>
              ) : (
                lotes.map((lote) => (
                  <tr key={lote.lote_id} className="hover:bg-[#FAFAF7]">
                    <td className="py-2.5 px-3.5 font-bold">{lote.numero_lote}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold">{lote.producto_nombre}</div>
                      <div className="text-[11px] text-[#6B7A72]">{lote.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#6B7A72]">{lote.almacen_nombre}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{lote.stock_lote} und</td>
                    <td className="py-2.5 px-3 text-right">{lote.fecha_vencimiento}</td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      {lote.estado_caducidad === 'VENCIDO' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C93B3B]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C93B3B]" />
                          Vencido ({Math.abs(lote.dias_restantes)}d)
                        </span>
                      ) : lote.estado_caducidad === 'POR_VENCER' ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C97D1A]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C97D1A]" />
                          Por vencer ({lote.dias_restantes}d)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2A7A4C]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2A7A4C]" />
                          Vigente ({lote.dias_restantes}d)
                        </span>
                      )}
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
