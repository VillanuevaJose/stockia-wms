'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2, Loader2, AlertTriangle, CheckCircle2 } from '../ui/icons'
import { registrarMovimientoAction } from '../../lib/actions/movimientos'

interface Props {
  isOpen: boolean
  onClose: () => void
  productos: { id: string; nombre: string; sku: string; stock: number }[]
  almacenes: { id: string; nombre: string }[]
}

export function NuevoMovimientoDrawer({
  isOpen,
  onClose,
  productos,
  almacenes,
}: Props) {
  const [tipo, setTipo] = useState<'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA'>('ENTRADA')
  const [subtipoAjuste, setSubtipoAjuste] = useState<'SOBRANTE' | 'MERMA'>('MERMA')
  const [motivo, setMotivo] = useState('')
  const [almacenOrigenId, setAlmacenOrigenId] = useState(almacenes[0]?.id || '')
  const [almacenDestinoId, setAlmacenDestinoId] = useState(almacenes[1]?.id || almacenes[0]?.id || '')

  const [lineas, setLineas] = useState<{ producto_id: string; cantidad: number }[]>([
    { producto_id: productos[0]?.id || '', cantidad: 1 },
  ])

  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleProductoChange = (index: number, prodId: string) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, producto_id: prodId } : l))
    )
  }

  const handleCantidadChange = (index: number, cant: number) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, cantidad: Math.max(1, cant) } : l))
    )
  }

  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
      { producto_id: productos[0]?.id || '', cantidad: 1 },
    ])
  }

  const eliminarLinea = (index: number) => {
    if (lineas.length === 1) return
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!motivo.trim() || motivo.trim().length < 3) {
      setErrorMsg('El motivo de la operación es obligatorio (mínimo 3 caracteres).')
      return
    }

    if (tipo === 'TRANSFERENCIA' && almacenOrigenId === almacenDestinoId) {
      setErrorMsg('En una transferencia, el almacén de origen y destino deben ser distintos.')
      return
    }

    startTransition(async () => {
      const res = await registrarMovimientoAction({
        tipo,
        subtipo_ajuste: tipo === 'AJUSTE' ? subtipoAjuste : undefined,
        motivo: motivo.trim(),
        almacen_origen_id:
          tipo === 'SALIDA' || tipo === 'TRANSFERENCIA' || (tipo === 'AJUSTE' && subtipoAjuste === 'MERMA')
            ? almacenOrigenId
            : null,
        almacen_destino_id:
          tipo === 'ENTRADA' || tipo === 'TRANSFERENCIA' || (tipo === 'AJUSTE' && subtipoAjuste === 'SOBRANTE')
            ? (tipo === 'TRANSFERENCIA' ? almacenDestinoId : almacenOrigenId)
            : null,
        detalles: lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: Number(l.cantidad),
          costo_unitario: 0,
        })),
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Error al registrar el movimiento.')
      } else {
        setSuccess(true)
        setTimeout(() => {
          onClose()
        }, 1200)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl border-l border-[#E7E5DF] flex flex-col justify-between p-6 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#E7E5DF]">
            <div>
              <h2 className="text-[18px] font-bold text-[#16201C]">Registrar Movimiento</h2>
              <p className="text-[12px] text-[#6B7A72]">
                Entrada, salida, ajuste con motivo auditado o transferencia entre sedes.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#FAFAF7]"
            >
              <X size={16} />
            </button>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[12px] text-[#C53030] flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 rounded-[6px] bg-[#E8F5E9] border border-[#C8E6C9] text-[12px] text-[#2E7D32] flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>¡Movimiento transaccional aplicado correctamente al Kardex!</span>
            </div>
          )}

          <form id="mov-form" onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Tipo de Movimiento */}
            <div>
              <label className="block text-[12px] font-medium text-[#16201C] mb-1.5">
                Tipo de Operación
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-[12px]">
                {(['ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`py-1.5 px-2 rounded-[6px] border text-center font-medium transition-colors ${
                      tipo === t
                        ? 'border-[#16201C] bg-[#16201C] text-white'
                        : 'border-[#E7E5DF] bg-white text-[#16201C] hover:border-[#6B7A72]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtipo de Ajuste */}
            {tipo === 'AJUSTE' && (
              <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF]">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72] mb-1">
                  Naturaleza del Ajuste
                </label>
                <div className="flex gap-4 text-[12px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subtipo"
                      checked={subtipoAjuste === 'MERMA'}
                      onChange={() => setSubtipoAjuste('MERMA')}
                    />
                    <span>Merma / Pérdida / Rotura (- stock)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="subtipo"
                      checked={subtipoAjuste === 'SOBRANTE'}
                      onChange={() => setSubtipoAjuste('SOBRANTE')}
                    />
                    <span>Sobrante / Hallazgo (+ stock)</span>
                  </label>
                </div>
              </div>
            )}

            {/* Motivo Obligatorio */}
            <div>
              <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                Motivo de la Operación <span className="text-[#D32F2F]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={
                  tipo === 'AJUSTE'
                    ? 'Ej: Conteo físico mensual - 1 unidad rota en estante 4'
                    : tipo === 'TRANSFERENCIA'
                    ? 'Ej: Reabastecimiento urgente de sede Ate'
                    : 'Ej: Ingreso por devolución de cliente o donación'
                }
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
              />
            </div>

            {/* Almacenes */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  {tipo === 'TRANSFERENCIA' ? 'Almacén Origen' : 'Almacén'}
                </label>
                <select
                  value={almacenOrigenId}
                  onChange={(e) => {
                    const newOrigen = e.target.value
                    setAlmacenOrigenId(newOrigen)
                    if (almacenDestinoId === newOrigen) {
                      const otro = almacenes.find((a) => a.id !== newOrigen)
                      if (otro) setAlmacenDestinoId(otro.id)
                    }
                  }}
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C] bg-white"
                >
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {tipo === 'TRANSFERENCIA' && (
                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Almacén Destino
                  </label>
                  <select
                    value={almacenDestinoId}
                    onChange={(e) => setAlmacenDestinoId(e.target.value)}
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C] bg-white"
                  >
                    {almacenes
                      .filter((a) => a.id !== almacenOrigenId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Líneas de Productos */}
            <div className="pt-2 border-t border-[#E7E5DF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">
                  Productos a Mover
                </span>
                <button
                  type="button"
                  onClick={agregarLinea}
                  className="text-[11px] font-medium text-[#16201C] hover:underline flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Agregar Producto</span>
                </button>
              </div>

              {productos.length === 0 ? (
                <div className="p-4 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] text-center text-[12px] text-[#6B7A72]">
                  No hay productos registrados en el sistema.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {lineas.map((linea, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[6px] border border-[#E7E5DF] bg-[#FAFAF7] grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-8">
                        <select
                          value={linea.producto_id}
                          onChange={(e) => handleProductoChange(idx, e.target.value)}
                          className="w-full rounded-[4px] border border-[#E7E5DF] bg-white px-2 py-1 text-[12px] text-[#16201C]"
                        >
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.nombre} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cantidad"
                          value={linea.cantidad}
                          onChange={(e) => handleCantidadChange(idx, Number(e.target.value))}
                          className="w-full rounded-[4px] border border-[#E7E5DF] bg-white px-2 py-1 text-[12px] font-mono tabular-nums text-[#16201C]"
                        />
                      </div>

                      <div className="col-span-1 text-center">
                        <button
                          type="button"
                          disabled={lineas.length === 1}
                          onClick={() => eliminarLinea(idx)}
                          className="text-[#6B7A72] hover:text-[#D32F2F] disabled:opacity-30"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="pt-4 border-t border-[#E7E5DF] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] text-[13px] text-[#16201C] hover:bg-[#FAFAF7]"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="mov-form"
            disabled={isPending || productos.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-40"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            <span>Aplicar Movimiento al Kardex</span>
          </button>
        </div>
      </div>
    </div>
  )
}
