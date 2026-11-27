'use client'

import React, { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Truck } from '../ui/icons'
import {
  registrarFirmaEntregaAction,
  type EntregaPublicaPayload,
} from '@/lib/actions/epod'

interface EntregaPublicaClientProps {
  solicitudId: string
  token: string
  data: EntregaPublicaPayload
}

export function EntregaPublicaClient({ solicitudId, token, data }: EntregaPublicaClientProps) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [paths, setPaths] = useState<string[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [receptorNombre, setReceptorNombre] = useState('')
  const [receptorDni, setReceptorDni] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [firmadoOk, setFirmadoOk] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!data.valid || !data.solicitud) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-[8px] border border-[#E7E5DF] p-6 text-center space-y-3">
          <AlertTriangle size={28} className="mx-auto text-[#C93B3B]" />
          <h1 className="text-lg font-bold text-[#16201C]">Enlace no válido</h1>
          <p className="text-xs text-[#6B7A72]">{data.error}</p>
        </div>
      </div>
    )
  }

  const { solicitud, firma } = data

  const getRelativeCoords = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 400),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 160),
    }
  }

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const { x, y } = getRelativeCoords(e)
    setCurrentPath(`M ${x} ${y}`)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!currentPath) return
    const { x, y } = getRelativeCoords(e)
    setCurrentPath((prev) => (prev ? `${prev} L ${x} ${y}` : null))
  }

  const handlePointerUp = () => {
    if (currentPath) {
      setPaths((prev) => [...prev, currentPath])
      setCurrentPath(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    startTransition(async () => {
      const res = await registrarFirmaEntregaAction({
        solicitud_id: solicitudId,
        token,
        receptor_nombre: receptorNombre,
        receptor_dni: receptorDni,
        observaciones,
        firma_svg_paths: paths,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'No se pudo registrar la conformidad.')
        return
      }

      setFirmadoOk(true)
      router.refresh()
    })
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] py-8 px-4 font-sans text-[#16201C]">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="bg-white rounded-[8px] border border-[#E7E5DF] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#E7E5DF] pb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C97D1A]">
                <Truck size={13} />
                Confirmación Digital de Entrega (e-POD)
              </span>
              <h1 className="text-xl font-bold text-[#16201C] mt-1">
                Guía #{solicitud.codigo}
              </h1>
            </div>
            <span className="px-2.5 py-1 rounded-[4px] border border-[#E7E5DF] bg-[#FAFAF7] text-[11px] font-semibold">
              {solicitud.estado}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF]">
              <span className="text-[10px] uppercase tracking-[0.05em] text-[#6B7A72] font-semibold block">
                Origen (Despacho)
              </span>
              <span className="font-bold text-[#16201C] mt-0.5 block">
                {solicitud.sede_destino_nombre}
              </span>
            </div>
            <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF]">
              <span className="text-[10px] uppercase tracking-[0.05em] text-[#6B7A72] font-semibold block">
                Destino (Recepción)
              </span>
              <span className="font-bold text-[#16201C] mt-0.5 block">
                {solicitud.sede_origen_nombre}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-[6px] border border-[#E7E5DF] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#16201C]">
                {solicitud.producto_nombre || solicitud.mensaje}
              </span>
              <span className="font-bold text-sm tabular-nums">{solicitud.cantidad} und</span>
            </div>
            {solicitud.producto_sku && (
              <span className="text-[11px] text-[#6B7A72] block">SKU: {solicitud.producto_sku}</span>
            )}
          </div>
        </div>

        {/* Si ya fue firmado anteriormente o acaba de firmarse */}
        {firma || firmadoOk ? (
          <div className="bg-white rounded-[8px] border border-[#2A7A4C] p-5 space-y-4">
            <div className="flex items-center gap-2 text-[#2A7A4C]">
              <CheckCircle2 size={20} />
              <h2 className="text-base font-bold">Entrega Firmada y Conformidad Sellada</h2>
            </div>

            {firma && (
              <>
                <div className="text-xs text-[#6B7A72] space-y-1 tabular-nums">
                  <p>
                    <strong className="text-[#16201C]">Recibido por:</strong> {firma.receptor_nombre}{' '}
                    (DNI: {firma.receptor_dni})
                  </p>
                  <p>
                    <strong className="text-[#16201C]">Fecha y hora:</strong>{' '}
                    {new Date(firma.fecha_firma).toLocaleString('es-PE')}
                  </p>
                  <p>
                    <strong className="text-[#16201C]">Observaciones:</strong> {firma.observaciones}
                  </p>
                </div>

                <div className="border border-[#E7E5DF] rounded-[6px] bg-[#FAFAF7] p-3">
                  <span className="text-[10px] uppercase tracking-[0.05em] text-[#6B7A72] font-semibold block mb-1">
                    Firma Digital Registrada
                  </span>
                  <svg viewBox="0 0 400 160" className="w-full h-32">
                    {firma.firma_svg_paths.map((d, idx) => (
                      <path
                        key={idx}
                        d={d}
                        fill="none"
                        stroke="#16201C"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>
                </div>
              </>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-[8px] border border-[#E7E5DF] p-5 space-y-4"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#C97D1A]" />
              <h2 className="text-sm font-bold text-[#16201C]">
                Registrar Conformidad de Recepción
              </h2>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#C93B3B] text-xs text-[#C93B3B]">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#16201C] mb-1">
                  Nombre completo del receptor *
                </label>
                <input
                  type="text"
                  required
                  value={receptorNombre}
                  onChange={(e) => setReceptorNombre(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-2 text-xs focus:outline-none focus:border-[#E8A33D]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#16201C] mb-1">
                  DNI (8 dígitos) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  inputMode="numeric"
                  value={receptorDni}
                  onChange={(e) => setReceptorDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="71234567"
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-2 text-xs tabular-nums focus:outline-none focus:border-[#E8A33D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#16201C] mb-1">
                Observaciones de entrega (opcional)
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej. Bultos completos y sellados sin novedad"
                className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-2 text-xs focus:outline-none focus:border-[#E8A33D]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#16201C]">
                  Firma táctil (traza con el dedo o mouse) *
                </label>
                {paths.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaths([])}
                    className="text-[11px] text-[#C93B3B] hover:underline"
                  >
                    Limpiar firma
                  </button>
                )}
              </div>
              <svg
                ref={svgRef}
                viewBox="0 0 400 160"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full h-40 rounded-[6px] border border-[#E7E5DF] bg-[#FAFAF7] touch-none cursor-crosshair"
              >
                <line
                  x1="24"
                  y1="130"
                  x2="376"
                  y2="130"
                  stroke="#E7E5DF"
                  strokeDasharray="4 4"
                />
                {paths.map((d, i) => (
                  <path
                    key={i}
                    d={d}
                    fill="none"
                    stroke="#16201C"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {currentPath && (
                  <path
                    d={currentPath}
                    fill="none"
                    stroke="#16201C"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

            <button
              type="submit"
              disabled={isPending || paths.length === 0}
              className="w-full py-2.5 rounded-[6px] bg-[#16201C] text-[#FAFAF7] text-xs font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              <span>Sellar Conformidad de Entrega (e-POD)</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
