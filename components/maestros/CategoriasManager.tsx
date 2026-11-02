'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Folder, Loader2 } from '../ui/icons'
import { crearCategoriaAction } from '../../lib/actions/maestros'
import type { CategoriaDetailRow } from '../../lib/queries/operaciones'

interface Props {
  categorias: CategoriaDetailRow[]
}

export function CategoriasManager({ categorias }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await crearCategoriaAction(null, formData)
      if (res?.success) {
        setDrawerOpen(false)
      } else {
        setErrorMsg(res?.error || 'Error al crear la categoría.')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B7A72]">
          Estructuración y segmentación del catálogo de artículos del almacén.
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
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Grid de Categorías */}
      {categorias.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[8px] border border-[#E7E5DF] text-[#6B7A72]">
          <Folder size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
          <p className="text-[13px] font-medium text-[#16201C]">No hay categorías creadas</p>
          <p className="text-[12px] text-[#6B7A72] mt-0.5 mb-3">
            Crea categorías para organizar tus productos (ej. Herramientas, Tornillería, EPP).
          </p>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null)
              setDrawerOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium"
          >
            <Plus size={13} />
            <span>Crear primera categoría</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categorias.map((cat) => (
            <div
              key={cat.id}
              className="p-4 bg-white rounded-[8px] border border-[#E7E5DF] hover:border-[#16201C] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#16201C]">{cat.nombre}</span>
                  <span className="text-[11px] font-mono text-[#6B7A72] bg-[#FAFAF7] border border-[#E7E5DF] px-2 py-0.5 rounded-[4px]">
                    {cat.productos_count} {cat.productos_count === 1 ? 'producto' : 'productos'}
                  </span>
                </div>
                <p className="text-[12px] text-[#6B7A72] line-clamp-2">
                  {cat.descripcion || 'Sin descripción para esta categoría.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E7E5DF] flex items-center justify-between text-[11px] text-[#6B7A72] font-mono">
                <span className="flex items-center gap-1.5 text-[#2E7D32]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                  Activa
                </span>
                <span>ID: {cat.id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E7E5DF] flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5DF]">
                <div>
                  <h2 className="text-[16px] font-bold text-[#16201C]">Crear Categoría</h2>
                  <p className="text-[12px] text-[#6B7A72]">
                    Nueva familia o segmento para clasificar productos.
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

              <form onSubmit={handleFormSubmit} id="cat-form" className="mt-4 space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Nombre de la Categoría
                  </label>
                  <input
                    name="nombre"
                    required
                    placeholder="Herramientas Eléctricas"
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Descripción <span className="text-[#6B7A72] font-normal">(Opcional)</span>
                  </label>
                  <textarea
                    name="descripcion"
                    rows={3}
                    placeholder="Taladros, sierras, amoladoras y accesorios de potencia..."
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
                form="cat-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-50"
              >
                {isPending && <Loader2 size={13} className="animate-spin" />}
                <span>Guardar Categoría</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
