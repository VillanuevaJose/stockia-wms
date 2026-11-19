'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2 } from '../ui/icons'
import { crearAlmacenAction } from '../../lib/actions/maestros'
import type { AlmacenDetailRow } from '../../lib/queries/operaciones'

interface Props {
  almacenes: AlmacenDetailRow[]
}

export function AlmacenesManager({ almacenes }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)

    const errors: Record<string, string> = {}
    if (!nombre.trim()) {
      errors.nombre = 'El nombre de la sede o almacén es obligatorio.'
    } else if (nombre.trim().length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres.'
    }

    if (codigo.trim() && !/^[A-Za-z0-9\-_]{2,10}$/.test(codigo.trim())) {
      errors.codigo = 'El código debe tener entre 2 y 10 caracteres alfanuméricos (ej. ALM-01).'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    const formData = new FormData()
    formData.append('nombre', nombre.trim())
    if (codigo.trim()) formData.append('codigo', codigo.trim().toUpperCase())
    if (direccion.trim()) formData.append('direccion', direccion.trim())

    startTransition(async () => {
      const res = await crearAlmacenAction(null, formData)
      if (res?.success) {
        setNombre('')
        setCodigo('')
        setDireccion('')
        setDrawerOpen(false)
      } else {
        setErrorMsg(res?.error || 'Error al crear la sede.')
        if (res?.fieldErrors) setFieldErrors(res.fieldErrors)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B7A72]">
          Configuración de sedes y ubicaciones físicas autorizadas para almacenaje y transferencias.
        </p>

        <button
          type="button"
          onClick={() => {
            setErrorMsg(null)
            setDrawerOpen(true)
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer"
        >
          <Plus size={14} />
          <span>Nueva Sede / Almacén</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {almacenes.map((alm) => (
          <div
            key={alm.id}
            className="p-5 bg-white rounded-[8px] border border-[#E7E5DF] hover:border-[#16201C] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-[#16201C] text-[15px]">{alm.nombre}</h3>
                  <span className="text-[11px] font-mono text-[#6B7A72]">
                    Código: {alm.codigo || 'S/C'}
                  </span>
                </div>

                {alm.es_principal && (
                  <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px] bg-[#FAFAF7] text-[#16201C] border border-[#E7E5DF]">
                    Sede Matriz Principal
                  </span>
                )}
              </div>

              <div className="text-[12px] text-[#6B7A72] space-y-1 mt-2 bg-[#FAFAF7] p-3 rounded-[6px] border border-[#E7E5DF]">
                <p>
                  <strong className="text-[#16201C]">Dirección:</strong>{' '}
                  {alm.direccion || 'Sin dirección específica registrada'}
                </p>
                <p>
                  <strong className="text-[#16201C]">Operaciones:</strong> Ingreso, custodia física y despacho
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E7E5DF] flex items-center justify-between text-[11px] text-[#6B7A72]">
              <span className="flex items-center gap-1.5 text-[#2E7D32] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                Operativo
              </span>
              <span className="font-mono">ID: {alm.id.slice(0, 8)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E7E5DF] flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5DF]">
                <div>
                  <h2 className="text-[16px] font-bold text-[#16201C]">Crear Almacén o Sede</h2>
                  <p className="text-[12px] text-[#6B7A72]">
                    Nueva ubicación para recepcionar y custodiar existencias.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#FAFAF7]"
                >
                  <X size={16} />
                </button>
              </div>

              {errorMsg && (
                <div className="mt-4 p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[12px] text-[#C53030]">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleFormSubmit} id="alm-form" className="mt-4 space-y-4" noValidate>
                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Nombre del Almacén / Sede *
                  </label>
                  <input
                    name="nombre"
                    required
                    value={nombre}
                    onChange={(e) => {
                      setNombre(e.target.value)
                      if (e.target.value.trim().length >= 2) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev }
                          delete copy.nombre
                          return copy
                        })
                      }
                    }}
                    onBlur={() => {
                      if (!nombre.trim()) {
                        setFieldErrors((prev) => ({ ...prev, nombre: 'El nombre de la sede es obligatorio.' }))
                      } else if (nombre.trim().length < 2) {
                        setFieldErrors((prev) => ({ ...prev, nombre: 'El nombre debe tener al menos 2 caracteres.' }))
                      }
                    }}
                    placeholder="Sede Despacho Rápido - Ate"
                    aria-invalid={!!fieldErrors.nombre}
                    className={`w-full rounded-[6px] border px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none ${
                      fieldErrors.nombre
                        ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                        : 'border-[#E7E5DF] focus:border-[#16201C]'
                    }`}
                  />
                  {fieldErrors.nombre && (
                    <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">{fieldErrors.nombre}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Código de Sede <span className="text-[#6B7A72] font-normal">(Opcional, 2 a 10 caracteres)</span>
                  </label>
                  <input
                    name="codigo"
                    value={codigo}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase()
                      setCodigo(val)
                      if (!val || /^[A-Za-z0-9\-_]{2,10}$/.test(val)) {
                        setFieldErrors((prev) => {
                          const copy = { ...prev }
                          delete copy.codigo
                          return copy
                        })
                      }
                    }}
                    onBlur={() => {
                      if (codigo.trim() && !/^[A-Za-z0-9\-_]{2,10}$/.test(codigo.trim())) {
                        setFieldErrors((prev) => ({ ...prev, codigo: 'Formato inválido (solo letras, números y guiones).' }))
                      }
                    }}
                    placeholder="ALM-02"
                    aria-invalid={!!fieldErrors.codigo}
                    className={`w-full rounded-[6px] border px-3 py-1.5 text-[13px] text-[#16201C] font-mono focus:outline-none ${
                      fieldErrors.codigo
                        ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                        : 'border-[#E7E5DF] focus:border-[#16201C]'
                    }`}
                  />
                  {fieldErrors.codigo && (
                    <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">{fieldErrors.codigo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Dirección Física <span className="text-[#6B7A72] font-normal">(Opcional)</span>
                  </label>
                  <input
                    name="direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Carretera Central Km 7.5, Ate"
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-[#E7E5DF] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] text-[13px] text-[#16201C] hover:bg-[#FAFAF7]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="alm-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-50"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                <span>Guardar Almacén</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
