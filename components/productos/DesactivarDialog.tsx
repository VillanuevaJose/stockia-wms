'use client'

import React from 'react'
import { desactivarProducto } from '../../app/admin/actions'
import { toast } from '../ui/Toast'

interface DesactivarDialogProps {
  producto: { id: string; nombre: string; sku: string | null } | null
  isOpen: boolean
  onClose: () => void
}

export function DesactivarDialog({ producto, isOpen, onClose }: DesactivarDialogProps) {
  if (!isOpen || !producto) return null

  const handleAction = async (formData: FormData) => {
    await desactivarProducto(formData)
    toast.success('Producto desactivado del catálogo')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative bg-white rounded-[8px] border border-[#E7E5DF] max-w-md w-full p-5 text-[#16201C] z-10 space-y-4"
      >
        <div>
          <h3 id="dialog-title" className="text-[16px] font-bold text-[#16201C] tracking-[-0.02em] leading-[1.15]">
            ¿Desactivar este producto?
          </h3>
          <p className="text-[13px] text-[#6B7A72] mt-1.5 leading-normal">
            El producto <strong className="font-medium text-[#16201C]">{producto.nombre}</strong> (SKU: {producto.sku || 'S/N'}) dejará de estar disponible para ventas y nuevos despachos. Su historial en Kardex y compras se mantendrá intacto.
          </p>
        </div>

        <form action={handleAction} className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E5DF]">
          <input type="hidden" name="id" value={producto.id} />
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-[6px] text-[13px] font-medium text-[#16201C] bg-white border border-[#E7E5DF] hover:bg-[#F4F3EF] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium text-white bg-[#C93B3B] hover:bg-[#B32D2D] transition-colors cursor-pointer"
          >
            Confirmar Desactivación
          </button>
        </form>
      </div>
    </div>
  )
}
