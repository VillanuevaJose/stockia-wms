'use client'

import React from 'react'
import { CheckCircle2 } from '@/components/ui/icons'

export interface VentaExitosaData {
  numero_comprobante?: string
  total?: number
  vuelto?: number
}

interface PosVentaExitosaProps {
  venta: VentaExitosaData
  metodoPago: string
  onNuevaVenta: () => void
}

export function PosVentaExitosa({
  venta,
  metodoPago,
  onNuevaVenta,
}: PosVentaExitosaProps) {
  return (
    <div className="p-6 my-auto text-center space-y-4 animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto border border-[#C8E6C9]">
        <CheckCircle2 size={24} />
      </div>
      <div>
        <h4 className="text-[18px] font-bold text-[#16201C]">¡Venta Registrada con Éxito!</h4>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Comprobante N°{' '}
          <span className="font-sans font-bold text-[#16201C]">
            {venta.numero_comprobante}
          </span>
        </p>
        <div className="text-[28px] font-bold font-sans text-[#16201C] tabular-nums mt-3">
          S/ {Number(venta.total || 0).toFixed(2)}
        </div>

        {venta.vuelto !== undefined && (
          <div className="mt-3 inline-block text-[13px] font-sans font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-[6px] border border-emerald-200">
            Vuelto Entregado: S/ {venta.vuelto.toFixed(2)}
          </div>
        )}

        {metodoPago === 'CULQI' && (
          <div className="mt-2 inline-block text-[11px] font-sans font-medium text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-1 rounded-[4px] border border-[#C8E6C9]">
            Transacción Aprobada vía Culqi Gateway
          </div>
        )}
      </div>
      <p className="text-[12px] text-[#6B7A72]">
        El stock se ha descontado automáticamente de la base de datos y se registró la salida en el Kardex.
      </p>
      <button
        type="button"
        onClick={onNuevaVenta}
        className="w-full py-2.5 px-4 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer"
      >
        Iniciar Nueva Venta
      </button>
    </div>
  )
}
