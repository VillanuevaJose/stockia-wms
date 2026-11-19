'use client'

import React, { useState, useTransition } from 'react'
import { Calculator, X, Loader2, CheckCircle2 } from '@/components/ui/icons'
import { registrarArqueoCajaAction } from '@/lib/actions/ventas'

interface ResumenCaja {
  totalVentas: number
  totalEfectivo: number
  totalDigital: number
  cantidadVentas: number
}

interface PosArqueoCajaModalProps {
  isOpen: boolean
  onClose: () => void
  resumenCaja: ResumenCaja | null
  isLoadingResumen: boolean
  onError?: (msg: string) => void
}

export function PosArqueoCajaModal({
  isOpen,
  onClose,
  resumenCaja,
  isLoadingResumen,
  onError,
}: PosArqueoCajaModalProps) {
  const [efectivoContado, setEfectivoContado] = useState<string>('')
  const [notasArqueo, setNotasArqueo] = useState<string>('')
  const [arqueoResultado, setArqueoResultado] = useState<string | null>(null)
  const [isSubmittingArqueo, startSubmitArqueo] = useTransition()

  if (!isOpen) return null

  const esperadoNum = resumenCaja?.totalEfectivo || 0
  const contadoNum = parseFloat(efectivoContado || '0')
  const diferenciaArqueo = Math.round((contadoNum - esperadoNum) * 100) / 100

  const handleGuardarArqueo = () => {
    if (efectivoContado === '') return
    startSubmitArqueo(async () => {
      const res = await registrarArqueoCajaAction({
        monto_esperado: esperadoNum,
        monto_contado: contadoNum,
        notas: notasArqueo,
      })

      if (res.success) {
        setArqueoResultado(res.mensaje || 'Arqueo de caja registrado correctamente.')
      } else {
        onError?.(res.error || 'Error al guardar arqueo.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-[10px] max-w-lg w-full overflow-hidden border border-[#E7E5DF] shadow-2xl">
        <div className="p-4 bg-[#16201C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator size={18} />
            <h4 className="text-[15px] font-bold">Arqueo de Caja y Cierre de Turno</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {isLoadingResumen ? (
            <div className="py-10 text-center text-[#6B7A72]">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#16201C]" />
              <p className="text-[13px]">Calculando ventas del turno...</p>
            </div>
          ) : (
            <>
              {/* Resumen del Sistema */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#FAFAF7] border border-[#E7E5DF] rounded-[8px]">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7A72] font-semibold block">
                    Efectivo Esperado en Caja
                  </span>
                  <span className="text-[20px] font-bold font-sans text-[#16201C] tabular-nums">
                    S/ {resumenCaja?.totalEfectivo.toFixed(2) || '0.00'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wider text-[#6B7A72] font-semibold block">
                    Ventas Digitales (Yape/Culqi)
                  </span>
                  <span className="text-[20px] font-bold font-sans text-[#2E7D32] tabular-nums">
                    S/ {resumenCaja?.totalDigital.toFixed(2) || '0.00'}
                  </span>
                </div>

                <div className="col-span-2 pt-2 border-t border-[#E7E5DF] flex justify-between text-[12px] text-[#6B7A72]">
                  <span>
                    Total Cobrado en Turno: S/{' '}
                    <strong>{resumenCaja?.totalVentas.toFixed(2) || '0.00'}</strong>
                  </span>
                  <span>
                    Transacciones: <strong>{resumenCaja?.cantidadVentas || 0}</strong>
                  </span>
                </div>
              </div>

              {/* Input de Efectivo Contado Físico */}
              <div>
                <label className="block text-[12px] font-bold text-[#16201C] mb-1">
                  Efectivo Físico Contado en Gaveta (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  placeholder="Ingresa el monto contado..."
                  className="w-full px-3.5 py-2 text-[16px] font-sans font-bold border border-[#E7E5DF] rounded-[6px] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              {/* Diferencia en vivo */}
              {efectivoContado !== '' && (
                <div>
                  {Math.abs(diferenciaArqueo) < 0.01 ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[6px] text-[13px] font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      <span>¡La caja cuadra perfecto! Sin faltantes ni sobrantes.</span>
                    </div>
                  ) : diferenciaArqueo < 0 ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-[6px] text-[13px] font-bold flex items-center justify-between">
                      <span>Faltante en caja:</span>
                      <span className="font-sans text-[14px]">
                        - S/ {Math.abs(diferenciaArqueo).toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-[6px] text-[13px] font-bold flex items-center justify-between">
                      <span>Sobrante en caja:</span>
                      <span className="font-sans text-[14px]">
                        + S/ {diferenciaArqueo.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  Observaciones del Turno (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notasArqueo}
                  onChange={(e) => setNotasArqueo(e.target.value)}
                  placeholder="Ej. Se dejaron S/ 50.00 de sencillo de inicio para el siguiente turno..."
                  className="w-full px-3 py-2 text-[12px] border border-[#E7E5DF] rounded-[6px] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              {arqueoResultado && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-[6px] text-[13px] font-medium">
                  {arqueoResultado}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 bg-[#FAFAF7] border-t border-[#E7E5DF] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#16201C] hover:bg-[#E7E5DF] rounded-[6px] transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={isSubmittingArqueo || efectivoContado === ''}
            onClick={handleGuardarArqueo}
            className="px-4 py-2 text-[13px] font-medium bg-[#16201C] hover:bg-[#2A3B34] text-white rounded-[6px] disabled:opacity-40 transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isSubmittingArqueo ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Guardando en auditoría...</span>
              </>
            ) : (
              <span>Registrar Cierre en Auditoría</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
