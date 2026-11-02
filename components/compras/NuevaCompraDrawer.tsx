'use client'

import { useState, useTransition } from 'react'
import { X, Plus, Trash2, Loader2, AlertTriangle, CheckCircle2 } from '../ui/icons'
import { registrarCompraAction } from '../../lib/actions/compras'

interface Props {
  isOpen: boolean
  onClose: () => void
  proveedores: { id: string; nombre: string }[]
  productos: { id: string; nombre: string; sku: string; costo: number }[]
  almacenes: { id: string; nombre: string }[]
}

interface ItemLinea {
  producto_id: string
  cantidad: number
  costo_unitario: number
}

export function NuevaCompraDrawer({
  isOpen,
  onClose,
  proveedores,
  productos,
  almacenes,
}: Props) {
  const [proveedorId, setProveedorId] = useState(proveedores[0]?.id || '')
  const [nuevoProveedor, setNuevoProveedor] = useState('')
  const [nuevoRuc, setNuevoRuc] = useState('')
  const [crearNuevoProv, setCrearNuevoProv] = useState(false)
  const [almacenId, setAlmacenId] = useState(almacenes[0]?.id || '')
  const [numeroComprobante, setNumeroComprobante] = useState('')
  const [notas, setNotas] = useState('')

  const [lineas, setLineas] = useState<ItemLinea[]>([
    {
      producto_id: productos[0]?.id || '',
      cantidad: 1,
      costo_unitario: productos[0]?.costo || 0,
    },
  ])

  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleProductoChange = (index: number, prodId: string) => {
    const prod = productos.find((p) => p.id === prodId)
    setLineas((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              producto_id: prodId,
              costo_unitario: prod ? Number(prod.costo) || 0 : l.costo_unitario,
            }
          : l
      )
    )
  }

  const handleCantidadChange = (index: number, cant: number) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, cantidad: Math.max(1, cant) } : l))
    )
  }

  const handleCostoChange = (index: number, costo: number) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, costo_unitario: Math.max(0, costo) } : l))
    )
  }

  const agregarLinea = () => {
    setLineas((prev) => [
      ...prev,
      {
        producto_id: productos[0]?.id || '',
        cantidad: 1,
        costo_unitario: productos[0]?.costo || 0,
      },
    ])
  }

  const eliminarLinea = (index: number) => {
    if (lineas.length === 1) return
    setLineas((prev) => prev.filter((_, i) => i !== index))
  }

  const totalCalculado = lineas.reduce(
    (acc, cur) => acc + cur.cantidad * cur.costo_unitario,
    0
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!numeroComprobante.trim()) {
      setErrorMsg('Ingresa el número de factura o comprobante de compra.')
      return
    }

    if (lineas.some((l) => !l.producto_id || l.cantidad <= 0)) {
      setErrorMsg('Verifica los productos y cantidades de la compra.')
      return
    }

    startTransition(async () => {
      const res = await registrarCompraAction({
        proveedor_id: crearNuevoProv ? null : proveedorId || null,
        nuevo_proveedor_nombre: crearNuevoProv ? nuevoProveedor : undefined,
        nuevo_proveedor_ruc: crearNuevoProv ? nuevoRuc : undefined,
        almacen_destino_id: almacenId || undefined,
        numero_comprobante: numeroComprobante.trim(),
        notas: notas.trim() || undefined,
        detalles: lineas.map((l) => ({
          producto_id: l.producto_id,
          cantidad: Number(l.cantidad),
          costo_unitario: Number(l.costo_unitario),
        })),
      })

      if (!res.success) {
        setErrorMsg(res.error || 'Error al registrar la compra.')
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
              <h2 className="text-[18px] font-bold text-[#16201C]">Registrar Orden de Compra</h2>
              <p className="text-[12px] text-[#6B7A72]">
                Ingreso de mercancía por proveedor; actualiza el costo y suma stock al almacén.
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
              <span>¡Compra registrada e ingresada al inventario exitosamente!</span>
            </div>
          )}

          <form id="compra-form" onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Proveedor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-medium text-[#16201C]">
                  Proveedor
                </label>
                <button
                  type="button"
                  onClick={() => setCrearNuevoProv((p) => !p)}
                  className="text-[11px] text-[#6B7A72] underline hover:text-[#16201C]"
                >
                  {crearNuevoProv ? 'Elegir de la lista' : '+ Registrar nuevo proveedor'}
                </button>
              </div>

              {crearNuevoProv ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Razón Social o Nombre"
                    value={nuevoProveedor}
                    onChange={(e) => setNuevoProveedor(e.target.value)}
                    className="rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="RUC (11 dígitos)"
                    value={nuevoRuc}
                    onChange={(e) => setNuevoRuc(e.target.value)}
                    className="rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] font-mono tabular-nums focus:outline-none focus:border-[#16201C]"
                  />
                </div>
              ) : (
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C] bg-white"
                >
                  {proveedores.length === 0 && (
                    <option value="">Proveedor General (Automático)</option>
                  )}
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Almacén y Comprobante */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  Almacén Destino
                </label>
                <select
                  value={almacenId}
                  onChange={(e) => setAlmacenId(e.target.value)}
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C] bg-white"
                >
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  N° Factura / Boleta
                </label>
                <input
                  type="text"
                  required
                  placeholder="F001-000123"
                  value={numeroComprobante}
                  onChange={(e) => setNumeroComprobante(e.target.value)}
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] font-mono focus:outline-none focus:border-[#16201C]"
                />
              </div>
            </div>

            {/* Notas opcionales */}
            <div>
              <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                Observaciones / Notas <span className="text-[#6B7A72] font-normal">(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Recepción conforme de guía de remisión"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
              />
            </div>

            {/* Líneas de Productos */}
            <div className="pt-2 border-t border-[#E7E5DF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">
                  Artículos de la Compra
                </span>
                <button
                  type="button"
                  onClick={agregarLinea}
                  className="text-[11px] font-medium text-[#16201C] hover:underline flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Agregar Ítem</span>
                </button>
              </div>

              {productos.length === 0 ? (
                <div className="p-4 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] text-center text-[12px] text-[#6B7A72]">
                  No hay productos registrados en el catálogo. Crea primero productos para poder abastecerlos.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto">
                  {lineas.map((linea, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[6px] border border-[#E7E5DF] bg-[#FAFAF7] grid grid-cols-12 gap-2 items-center"
                    >
                      <div className="col-span-6">
                        <select
                          value={linea.producto_id}
                          onChange={(e) => handleProductoChange(idx, e.target.value)}
                          className="w-full rounded-[4px] border border-[#E7E5DF] bg-white px-2 py-1 text-[12px] text-[#16201C]"
                        >
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.sku} - {p.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Cant."
                          value={linea.cantidad}
                          onChange={(e) => handleCantidadChange(idx, Number(e.target.value))}
                          className="w-full rounded-[4px] border border-[#E7E5DF] bg-white px-2 py-1 text-[12px] font-mono tabular-nums text-[#16201C]"
                        />
                      </div>

                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Costo S/"
                          value={linea.costo_unitario}
                          onChange={(e) => handleCostoChange(idx, Number(e.target.value))}
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

            {/* Total */}
            <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#6B7A72]">Total Estimado de Compra:</span>
              <span className="text-[16px] font-bold font-mono text-[#16201C] tabular-nums">
                S/ {totalCalculado.toFixed(2)}
              </span>
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
            form="compra-form"
            disabled={isPending || productos.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-40"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            <span>Confirmar Compra y Generar Entrada</span>
          </button>
        </div>
      </div>
    </div>
  )
}
