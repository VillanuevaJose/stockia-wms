'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from '../ui/icons'
import { registrarCompraAction } from '../../lib/actions/compras'
import { matchProductoDesdeXml, parseSunatInvoiceXml } from '../../lib/sunat/ubl-parser'

interface Props {
  isOpen: boolean
  onClose: () => void
  proveedores: { id: string; nombre: string; ruc?: string | null }[]
  productos: { id: string; nombre: string; sku: string; codigo_barras?: string | null; costo: number }[]
  almacenes: { id: string; nombre: string }[]
}

interface ItemLinea {
  producto_id: string
  cantidad: number
  costo_unitario: number
  xml_descripcion?: string
}

export function NuevaCompraDrawer({
  isOpen,
  onClose,
  proveedores,
  productos,
  almacenes,
}: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const [xmlResumen, setXmlResumen] = useState<string | null>(null)
  const [isDraggingXml, setIsDraggingXml] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const procesarArchivoXml = async (file: File) => {
    setErrorMsg(null)
    setXmlResumen(null)

    if (!file.name.toLowerCase().endsWith('.xml') && !file.type.includes('xml')) {
      setErrorMsg('Selecciona un archivo .xml de factura electrónica SUNAT (UBL 2.1).')
      return
    }

    try {
      const texto = await file.text()
      const parsed = parseSunatInvoiceXml(texto)

      setNumeroComprobante(parsed.numeroComprobante)
      if (parsed.fechaEmision) {
        setNotas(`Importado desde XML SUNAT (${parsed.fechaEmision}) · Moneda: ${parsed.moneda}`)
      } else {
        setNotas(`Importado desde XML SUNAT · Moneda: ${parsed.moneda}`)
      }

      // Emparejar proveedor por RUC
      const provMatch = parsed.proveedorRuc
        ? proveedores.find((p) => (p.ruc || '').trim() === parsed.proveedorRuc)
        : undefined

      if (provMatch) {
        setCrearNuevoProv(false)
        setProveedorId(provMatch.id)
      } else if (parsed.proveedorNombre || parsed.proveedorRuc) {
        setCrearNuevoProv(true)
        setNuevoProveedor(parsed.proveedorNombre || 'Proveedor XML')
        setNuevoRuc(parsed.proveedorRuc || '')
      }

      // Emparejar líneas contra el catálogo real
      let emparejados = 0
      const nuevasLineas: ItemLinea[] = parsed.lineas.map((lin) => {
        const match = matchProductoDesdeXml(lin, productos)
        if (match) emparejados++
        return {
          producto_id: match?.id || '',
          cantidad: lin.cantidad,
          costo_unitario: lin.costoUnitario,
          xml_descripcion: `${lin.sku ? `${lin.sku} · ` : ''}${lin.descripcion}`,
        }
      })

      setLineas(nuevasLineas)
      setFieldErrors({})
      setXmlResumen(
        `XML ${parsed.numeroComprobante} cargado: ${parsed.lineas.length} ítems detectados (${emparejados} emparejados automáticamente).`
      )
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo leer el archivo XML.')
    }
  }

  const handleNuevoRucChange = (val: string) => {
    if (/[^\d]/.test(val)) {
      setFieldErrors((prev) => ({
        ...prev,
        nuevo_proveedor_ruc: 'Error: el RUC solo debe contener números.',
      }))
    } else {
      setFieldErrors((prev) => {
        const copy = { ...prev }
        delete copy.nuevo_proveedor_ruc
        return copy
      })
    }
    setNuevoRuc(val.replace(/\D/g, '').slice(0, 11))
  }

  const handleNumeroComprobanteChange = (val: string) => {
    setNumeroComprobante(val)
    if (val.trim()) {
      setFieldErrors((prev) => {
        const copy = { ...prev }
        delete copy.numero_comprobante
        return copy
      })
    }
  }

  const handleProductoChange = (index: number, prodId: string) => {
    const prod = productos.find((p) => p.id === prodId)
    setLineas((prev) =>
      prev.map((l, i) =>
        i === index
          ? {
              ...l,
              producto_id: prodId,
              costo_unitario: l.xml_descripcion
                ? l.costo_unitario
                : prod
                  ? Number(prod.costo) || 0
                  : l.costo_unitario,
            }
          : l
      )
    )
  }

  const handleCantidadChange = (index: number, cant: number) => {
    setLineas((prev) =>
      prev.map((l, i) => (i === index ? { ...l, cantidad: Math.max(0.01, cant) } : l))
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

    const errors: Record<string, string> = {}

    if (crearNuevoProv) {
      if (!nuevoProveedor.trim()) {
        errors.nuevo_proveedor_nombre = 'El nombre o razón social del nuevo proveedor es obligatorio.'
      }
      if (nuevoRuc.trim() && nuevoRuc.trim().length !== 11) {
        errors.nuevo_proveedor_ruc = 'El RUC debe tener exactamente 11 dígitos numéricos.'
      }
    }

    if (!numeroComprobante.trim()) {
      errors.numero_comprobante = 'El número de comprobante o factura es obligatorio.'
    }

    if (lineas.some((l) => !l.producto_id || l.cantidad <= 0)) {
      setErrorMsg('Asocia un producto de tu catálogo a cada línea importada y verifica que la cantidad sea mayor a 0.')
      return
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

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
        router.refresh()
        setTimeout(() => {
          onClose()
        }, 1200)
      }
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Registrar orden de compra"
      className="fixed inset-0 z-50 flex justify-end bg-[#16201C]/35 font-sans"
    >
      <div className="w-full max-w-xl bg-white h-full border-l border-[#E7E5DF] flex flex-col justify-between p-6 overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-[#E7E5DF]">
            <div>
              <h2 className="text-[18px] font-bold text-[#16201C]">Registrar Orden de Compra</h2>
              <p className="text-[12px] text-[#6B7A72]">
                Ingresa manualmente o importa un comprobante XML SUNAT (UBL 2.1) automáticamente.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel de compra"
              className="p-1.5 rounded-[6px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#FAFAF7]"
            >
              <X size={16} />
            </button>
          </div>

          {/* Zona de Importación XML SUNAT */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDraggingXml(true)
            }}
            onDragLeave={() => setIsDraggingXml(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsDraggingXml(false)
              const file = e.dataTransfer.files?.[0]
              if (file) void procesarArchivoXml(file)
            }}
            className={`mt-4 p-3.5 rounded-[8px] border border-dashed transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDraggingXml
                ? 'border-[#E8A33D] bg-[#F8F1E5]/40'
                : 'border-[#E7E5DF] bg-[#FAFAF7]'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <FileText size={16} className="text-[#C97D1A] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#16201C]">
                  Importar Factura Electrónica (.xml SUNAT)
                </p>
                <p className="text-[11px] text-[#6B7A72]">
                  Arrastra el XML aquí para autocompletar RUC, comprobante, cantidades y costos.
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void procesarArchivoXml(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] hover:border-[#16201C] text-xs font-semibold text-[#16201C] transition-colors cursor-pointer"
            >
              <Upload size={13} />
              Subir .xml
            </button>
          </div>

          {xmlResumen && (
            <div className="mt-3 p-2.5 rounded-[6px] bg-[#FAFAF7] border border-[#2A7A4C] text-[12px] text-[#16201C] flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[#2A7A4C] shrink-0" />
              <span>{xmlResumen}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 p-3 rounded-[6px] bg-[#FAFAF7] border border-[#C93B3B] text-[12px] text-[#C93B3B] flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="mt-3 p-3 rounded-[6px] bg-[#FAFAF7] border border-[#2A7A4C] text-[12px] text-[#2A7A4C] flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>Compra registrada e ingresada al inventario exitosamente.</span>
            </div>
          )}

          <form id="compra-form" onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Proveedor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[12px] font-medium text-[#16201C]">Proveedor</label>
                <button
                  type="button"
                  onClick={() => setCrearNuevoProv((p) => !p)}
                  className="text-[11px] text-[#6B7A72] underline hover:text-[#16201C]"
                >
                  {crearNuevoProv ? 'Elegir de la lista' : '+ Registrar nuevo proveedor'}
                </button>
              </div>

              {crearNuevoProv ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Razón Social o Nombre"
                        value={nuevoProveedor}
                        onChange={(e) => {
                          setNuevoProveedor(e.target.value)
                          if (e.target.value.trim()) {
                            setFieldErrors((prev) => {
                              const copy = { ...prev }
                              delete copy.nuevo_proveedor_nombre
                              return copy
                            })
                          }
                        }}
                        aria-invalid={!!fieldErrors.nuevo_proveedor_nombre}
                        className={`w-full rounded-[6px] border px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none ${
                          fieldErrors.nuevo_proveedor_nombre
                            ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                            : 'border-[#E7E5DF] focus:border-[#E8A33D]'
                        }`}
                      />
                      {fieldErrors.nuevo_proveedor_nombre && (
                        <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">
                          {fieldErrors.nuevo_proveedor_nombre}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        maxLength={11}
                        inputMode="numeric"
                        placeholder="RUC (11 dígitos)"
                        value={nuevoRuc}
                        onChange={(e) => handleNuevoRucChange(e.target.value)}
                        onBlur={() => {
                          if (nuevoRuc.trim() && nuevoRuc.trim().length !== 11) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              nuevo_proveedor_ruc: 'El RUC debe tener 11 dígitos.',
                            }))
                          }
                        }}
                        aria-invalid={!!fieldErrors.nuevo_proveedor_ruc}
                        className={`w-full rounded-[6px] border px-3 py-1.5 text-[13px] text-[#16201C] tabular-nums focus:outline-none ${
                          fieldErrors.nuevo_proveedor_ruc
                            ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                            : 'border-[#E7E5DF] focus:border-[#E8A33D]'
                        }`}
                      />
                      {fieldErrors.nuevo_proveedor_ruc && (
                        <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">
                          {fieldErrors.nuevo_proveedor_ruc}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value={proveedorId}
                  onChange={(e) => setProveedorId(e.target.value)}
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#E8A33D] bg-white"
                >
                  {proveedores.length === 0 && (
                    <option value="">Proveedor General (Automático)</option>
                  )}
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.ruc ? `(${p.ruc})` : ''}
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
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#E8A33D] bg-white"
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
                  N° Factura / Boleta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="F001-000123"
                  value={numeroComprobante}
                  onChange={(e) => handleNumeroComprobanteChange(e.target.value)}
                  onBlur={() => {
                    if (!numeroComprobante.trim()) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        numero_comprobante: 'El número de comprobante es obligatorio.',
                      }))
                    }
                  }}
                  aria-invalid={!!fieldErrors.numero_comprobante}
                  className={`w-full rounded-[6px] border px-3 py-1.5 text-[13px] text-[#16201C] tabular-nums focus:outline-none ${
                    fieldErrors.numero_comprobante
                      ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                      : 'border-[#E7E5DF] focus:border-[#E8A33D]'
                  }`}
                />
                {fieldErrors.numero_comprobante && (
                  <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">
                    {fieldErrors.numero_comprobante}
                  </p>
                )}
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
                className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#E8A33D]"
              />
            </div>

            {/* Líneas de Productos */}
            <div className="pt-2 border-t border-[#E7E5DF]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
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
                <div className="space-y-2 max-h-[240px] overflow-y-auto">
                  {lineas.map((linea, idx) => {
                    const sinEmparejar = !linea.producto_id
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-[6px] border space-y-1.5 ${
                          sinEmparejar
                            ? 'border-[#C97D1A] bg-[#F8F1E5]/30'
                            : 'border-[#E7E5DF] bg-[#FAFAF7]'
                        }`}
                      >
                        {linea.xml_descripcion && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-[#6B7A72] truncate" title={linea.xml_descripcion}>
                              XML: {linea.xml_descripcion}
                            </span>
                            {sinEmparejar && (
                              <span className="text-[#C97D1A] font-semibold shrink-0 ml-2">
                                Selecciona producto
                              </span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6">
                            <select
                              value={linea.producto_id}
                              onChange={(e) => handleProductoChange(idx, e.target.value)}
                              className="w-full rounded-[4px] border border-[#E7E5DF] bg-white px-2 py-1 text-[12px] text-[#16201C]"
                            >
                              {sinEmparejar && (
                                <option value="">-- Asociar producto del catálogo --</option>
                              )}
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
                              step="any"
                              min="0.01"
                              placeholder="Cant."
                              value={linea.cantidad}
                              onChange={(e) => handleCantidadChange(idx, Number(e.target.value))}
                              className="w-full rounded-[4px] border border-[#E7E5DF] bg-white px-2 py-1 text-[12px] tabular-nums text-[#16201C]"
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
                              className="w-full rounded-[4px] border border-[#E7E5DF] bg-white px-2 py-1 text-[12px] tabular-nums text-[#16201C]"
                            />
                          </div>

                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              disabled={lineas.length === 1}
                              onClick={() => eliminarLinea(idx)}
                              aria-label="Eliminar línea"
                              className="text-[#6B7A72] hover:text-[#C93B3B] disabled:opacity-30"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#6B7A72]">Total Estimado de Compra:</span>
              <span className="text-[16px] font-bold text-[#16201C] tabular-nums">
                S/ {totalCalculado.toFixed(2)}
              </span>
            </div>
          </form>
        </div>

        <div className="pt-4 border-t border-[#E7E5DF] flex items-center justify-end gap-2 mt-6">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] hover:opacity-90 text-[#FAFAF7] text-[13px] font-medium disabled:opacity-40"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            <span>Confirmar Compra y Generar Entrada</span>
          </button>
        </div>
      </div>
    </div>
  )
}
