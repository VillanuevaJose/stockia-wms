'use client'

import React, { useActionState, useEffect, useRef, useState } from 'react'
import { X, AlertTriangle, ScanBarcode } from '../ui/icons'
import { BarcodeScanner } from './BarcodeScanner'
import { agregarProducto, editarProducto, type FormState } from '../../app/admin/actions'
import { toast } from '../ui/Toast'
import type { ProductoRow } from '../../lib/queries/productos'

interface CategoriaOption {
  id: string
  nombre: string
}

interface UnidadOption {
  id: string
  codigo: string
  nombre: string
}

interface AlmacenOption {
  id: string
  nombre: string
  codigo: string | null
  es_principal: boolean
}

interface ProductoDrawerProps {
  isOpen: boolean
  onClose: () => void
  productoEditar?: ProductoRow | null
  categorias: CategoriaOption[]
  unidades: UnidadOption[]
  almacenes: AlmacenOption[]
}

export function ProductoDrawer({
  isOpen,
  onClose,
  productoEditar,
  categorias,
  unidades,
  almacenes,
}: ProductoDrawerProps) {
  const isEditing = Boolean(productoEditar)
  const [scannerOpen, setScannerOpen] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)

  const action = isEditing ? editarProducto : agregarProducto
  const [state, formAction, isPending] = useActionState<FormState | null, FormData>(action, null)

  // Cerrar y notificar al completarse con éxito
  useEffect(() => {
    if (state?.success) {
      toast.success(state.message || 'Operación completada con éxito')
      onClose()
    }
  }, [state, onClose])

  // Atajo tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
      {/* Telón de fondo */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel lateral deslizable (sin tarjetas decorativas ni iconos dentro de círculos) */}
      <div className="relative w-full max-w-lg bg-white z-10 flex flex-col h-full border-l border-[#E7E5DF] text-[#16201C]">
        {/* Cabecera del Drawer */}
        <div className="p-4 border-b border-[#E7E5DF] flex items-baseline justify-between bg-[#FAFAF7]">
          <div>
            <h2 className="text-lg font-bold text-[#16201C] tracking-[-0.02em] leading-[1.15]">
              {isEditing ? `Editar: ${productoEditar?.nombre}` : 'Nuevo Registro de Producto'}
            </h2>
            <p className="text-[12px] text-[#6B7A72] font-medium mt-0.5">
              {isEditing ? `SKU: ${productoEditar?.sku || 'S/N'}` : 'Ficha de catálogo de existencias'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF] transition-colors"
            aria-label="Cerrar panel"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form action={formAction} className="flex-1 overflow-y-auto p-5 space-y-4">
          {state?.error && (
            <div className="p-3 rounded-[6px] bg-[#fff0f0] border border-[#C93B3B]/30 text-[#C93B3B] text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="shrink-0 text-[#C93B3B]" />
              <span>{state.error}</span>
            </div>
          )}

          {isEditing && <input type="hidden" name="id" value={productoEditar?.id} />}

          {/* Fila: SKU y Código de Barras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#16201C] mb-1">
                Código SKU <span className="text-[#C93B3B]">*</span>
              </label>
              <input
                type="text"
                name="sku"
                required
                defaultValue={productoEditar?.sku || ''}
                placeholder="ej. HER-001"
                className="w-full px-2.5 py-1.5 text-xs font-mono uppercase bg-white border border-[#E7E5DF] rounded-[6px] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] focus:outline-none"
              />
              <p className="text-[11px] text-[#6B7A72] mt-0.5">Identificador único de almacén</p>
              {state?.fieldErrors?.sku && (
                <p className="text-[11px] text-[#C93B3B] mt-0.5">{state.fieldErrors.sku}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#16201C] mb-1">
                Código de Barras (EAN/UPC)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  name="codigo_barras"
                  ref={barcodeInputRef}
                  defaultValue={productoEditar?.codigo_barras || ''}
                  placeholder="7751234000018"
                  className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono bg-white border border-[#E7E5DF] rounded-[6px] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setScannerOpen(true)}
                  title="Escanear con cámara"
                  className="shrink-0 px-2 py-1.5 rounded-[6px] border border-[#E7E5DF] bg-white hover:bg-[#F4F3EF] text-[#6B7A72] hover:text-[#16201C] transition-colors cursor-pointer"
                >
                  <ScanBarcode size={16} />
                </button>
              </div>
              <p className="text-[11px] text-[#6B7A72] mt-0.5">Lectura óptica para escáner</p>
            </div>
          </div>

          {/* Nombre Comercial */}
          <div>
            <label className="block text-xs font-semibold text-[#16201C] mb-1">
              Nombre Comercial <span className="text-[#C93B3B]">*</span>
            </label>
            <input
              type="text"
              name="nombre"
              required
              defaultValue={productoEditar?.nombre || ''}
              placeholder="Martillo de uña curva 16oz mango fibra"
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E7E5DF] rounded-[6px] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] focus:outline-none"
            />
            {state?.fieldErrors?.nombre && (
              <p className="text-[11px] text-[#C93B3B] mt-0.5">{state.fieldErrors.nombre}</p>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-[#16201C] mb-1">
              Descripción y Especificaciones
            </label>
            <textarea
              name="descripcion"
              rows={2}
              defaultValue={productoEditar?.descripcion || ''}
              placeholder="Detalles técnicos, materiales o especificaciones..."
              className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E7E5DF] rounded-[6px] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] focus:outline-none"
            />
            <p className="text-[11px] text-[#6B7A72] mt-0.5">Información visible para compras y cotizaciones</p>
          </div>

          {/* Categoría y Unidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#16201C] mb-1">
                Categoría
              </label>
              <select
                name="categoria_id"
                defaultValue={productoEditar?.categoria_id || ''}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E7E5DF] rounded-[6px] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] focus:outline-none"
              >
                <option value="">-- Sin categoría --</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#16201C] mb-1">
                Unidad de Medida
              </label>
              <select
                name="unidad_medida_id"
                defaultValue={productoEditar?.unidad_medida_id || ''}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#E7E5DF] rounded-[6px] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] focus:outline-none"
              >
                <option value="">-- Unidad estándar --</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo} - {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Parámetros Financieros y Umbral */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-[#FAFAF7] border border-[#E7E5DF] rounded-[6px]">
            <div>
              <label className="block text-[11px] font-semibold text-[#16201C] mb-1">
                Costo (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="costo"
                required
                defaultValue={productoEditar?.costo ?? 0}
                className="w-full px-2 py-1 text-xs font-mono text-right bg-white border border-[#E7E5DF] rounded-[4px] focus:border-[#16201C] focus:outline-none tabular-nums"
              />
              <span className="text-[10px] text-[#6B7A72] block mt-0.5">Adquisición</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#16201C] mb-1">
                Precio (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="precio_venta"
                required
                defaultValue={productoEditar?.precio_venta ?? productoEditar?.precio_soles ?? 0}
                className="w-full px-2 py-1 text-xs font-mono text-right bg-white border border-[#E7E5DF] rounded-[4px] focus:border-[#16201C] focus:outline-none tabular-nums font-semibold"
              />
              <span className="text-[10px] text-[#6B7A72] block mt-0.5">Venta público</span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#16201C] mb-1">
                Stock Mín.
              </label>
              <input
                type="number"
                step="1"
                min="0"
                name="stock_minimo"
                required
                defaultValue={productoEditar?.stock_minimo ?? 5}
                className="w-full px-2 py-1 text-xs font-mono text-right bg-white border border-[#E7E5DF] rounded-[4px] focus:border-[#16201C] focus:outline-none tabular-nums"
              />
              <span className="text-[10px] text-[#6B7A72] block mt-0.5">Umbral alerta</span>
            </div>
          </div>

          {/* Información de Stock Físico */}
          {isEditing ? (
            <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#16201C]">Stock físico actual:</span>
                <span className="font-mono font-bold text-[#16201C] text-sm tabular-nums">
                  {productoEditar?.stock} {productoEditar?.unidad_medida?.codigo || 'und'}
                </span>
              </div>
              <p className="text-[11px] text-[#6B7A72] leading-tight">
                El stock no se altera en esta ficha. Para entradas, salidas o ajustes de inventario, utilice la sección de Kardex.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-[#FAFAF7] border border-[#E7E5DF] rounded-[6px] space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72] block">
                Asignación a Sede y Stock Inicial (Opcional)
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#16201C] mb-1 font-medium">Sede / Almacén Destino</label>
                  <select
                    name="almacen_id"
                    className="w-full px-2 py-1 text-xs bg-white border border-[#E7E5DF] rounded-[4px] focus:border-[#16201C] focus:outline-none"
                  >
                    <option value="">-- Sin asignar a sede aún --</option>
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} {a.es_principal ? '(Principal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[#16201C] mb-1 font-medium">Stock Inicial en Sede</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    name="stock_inicial"
                    defaultValue={0}
                    className="w-full px-2 py-1 text-xs font-mono text-right bg-white border border-[#E7E5DF] rounded-[4px] focus:border-[#16201C] focus:outline-none tabular-nums"
                  />
                </div>
              </div>
              <p className="text-[10px] text-[#6B7A72] leading-tight">
                El artículo se creará con esta existencia física disponible en el mostrador (POS) de la sede seleccionada.
              </p>
            </div>
          )}

          {/* Pie de acciones del panel */}
          <div className="pt-4 border-t border-[#E7E5DF] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium text-[#16201C] bg-white border border-[#E7E5DF] hover:bg-[#F4F3EF] disabled:opacity-40 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-1.5 rounded-[6px] text-[13px] font-medium text-[#FAFAF7] bg-[#16201C] hover:bg-black disabled:opacity-40 transition-colors cursor-pointer"
            >
              {isPending ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
            </button>
          </div>
        </form>

        {/* Escáner de código de barras con cámara */}
        <BarcodeScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(code) => {
            if (barcodeInputRef.current) {
              // Usar nativeInputValueSetter para que React detecte el cambio
              const nativeSetter = Object.getOwnPropertyDescriptor(
                HTMLInputElement.prototype,
                'value'
              )?.set
              nativeSetter?.call(barcodeInputRef.current, code)
              barcodeInputRef.current.dispatchEvent(new Event('input', { bubbles: true }))
            }
          }}
        />
      </div>
    </div>
  )
}
