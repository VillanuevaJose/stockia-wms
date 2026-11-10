'use client'

import { useState, useTransition, useMemo } from 'react'
import { X, Search, CheckCircle2, AlertTriangle, Loader2, Calculator } from '../ui/icons'
import { aplicarConteoFisicoAction } from '../../app/admin/inventario/actions'
import type { InventarioFisicoRow } from '../../lib/queries/operaciones'

interface Props {
  inventario: InventarioFisicoRow[]
  almacenes?: { id: string; nombre: string; es_principal?: boolean }[]
}

export function ConteoFisicoDrawer({ inventario, almacenes = [] }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedAlmacenId, setSelectedAlmacenId] = useState<string>(
    almacenes.find((a) => a.es_principal)?.id || almacenes[0]?.id || ''
  )
  const [conteos, setConteos] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filtrar productos
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return inventario
    return inventario.filter(
      (item) =>
        item.producto_nombre.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q)
    )
  }, [inventario, search])

  // Calcular diferencias en tiempo real
  const analisis = useMemo(() => {
    let faltanteSoles = 0
    let sobranteSoles = 0
    let contadosCount = 0
    const ajustesParaEnviar: {
      producto_id: string
      producto_nombre: string
      almacen_id?: string
      diferencia: number
      costo_unitario: number
    }[] = []

    inventario.forEach((item) => {
      const valStr = conteos[item.producto_id]
      if (valStr !== undefined && valStr !== '') {
        const contado = parseFloat(valStr)
        if (!isNaN(contado) && contado >= 0) {
          contadosCount++
          const diff = Math.round((contado - item.stock_actual) * 100) / 100
          if (diff !== 0) {
            const costo = item.costo_unitario || 0
            if (diff < 0) {
              faltanteSoles += Math.abs(diff) * costo
            } else {
              sobranteSoles += diff * costo
            }
            ajustesParaEnviar.push({
              producto_id: item.producto_id,
              producto_nombre: item.producto_nombre,
              almacen_id: selectedAlmacenId || undefined,
              diferencia: diff,
              costo_unitario: costo,
            })
          }
        }
      }
    })

    return {
      contadosCount,
      totalConDiferencia: ajustesParaEnviar.length,
      faltanteSoles: Math.round(faltanteSoles * 100) / 100,
      sobranteSoles: Math.round(sobranteSoles * 100) / 100,
      ajustesParaEnviar,
    }
  }, [inventario, conteos, selectedAlmacenId])

  const handleInputChange = (productoId: string, val: string) => {
    setConteos((prev) => ({ ...prev, [productoId]: val }))
    setErrorMsg(null)
  }

  const handleLimpiar = () => {
    setConteos({})
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleAplicar = () => {
    if (analisis.ajustesParaEnviar.length === 0) {
      setErrorMsg('No hay diferencias registradas para ajustar.')
      return
    }

    setErrorMsg(null)
    startTransition(async () => {
      const res = await aplicarConteoFisicoAction({
        almacen_id: selectedAlmacenId || null,
        motivo_general: 'Toma de inventario físico',
        ajustes: analisis.ajustesParaEnviar,
      })

      if (res.success) {
        setSuccessMsg(
          `¡Ajuste aplicado con éxito! Se ajustaron ${res.totalAjustados} productos. (Mermas: -S/ ${res.totalFaltanteSoles?.toFixed(2)} | Sobrantes: +S/ ${res.totalSobranteSoles?.toFixed(2)})`
        )
        setConteos({})
        setTimeout(() => {
          setSuccessMsg(null)
          setIsOpen(false)
        }, 2200)
      } else {
        setErrorMsg(res.error || 'Ocurrió un error al aplicar el ajuste.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setErrorMsg(null)
          setSuccessMsg(null)
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#16201C] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer shadow-2xs"
      >
        <Calculator size={14} />
        <span>Toma de Conteo Físico</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-[#E7E5DF] animate-in slide-in-from-right duration-200">
            {/* Cabecera */}
            <div className="p-5 border-b border-[#E7E5DF] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold text-[#16201C]">Toma de Conteo Físico</h2>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-[4px] bg-[#FAFAF7] border border-[#E7E5DF] text-[#6B7A72]">
                    Auditoría de Mermas
                  </span>
                </div>
                <p className="text-[12px] text-[#6B7A72] mt-0.5">
                  Ingresa las existencias contadas en estante. El sistema calcula mermas y diferencias en Soles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-[6px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#FAFAF7] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filtros rápidos */}
            <div className="p-4 bg-[#FAFAF7] border-b border-[#E7E5DF] flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
                <input
                  type="text"
                  placeholder="Buscar producto o SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-[6px] border border-[#E7E5DF] bg-white pl-8 pr-3 py-1.5 text-[12px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              {almacenes.length > 1 && (
                <div className="w-full sm:w-auto flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#6B7A72] whitespace-nowrap">Sede:</span>
                  <select
                    value={selectedAlmacenId}
                    onChange={(e) => setSelectedAlmacenId(e.target.value)}
                    className="rounded-[6px] border border-[#E7E5DF] bg-white px-2.5 py-1.5 text-[12px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  >
                    {almacenes.map((alm) => (
                      <option key={alm.id} value={alm.id}>
                        {alm.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {Object.keys(conteos).length > 0 && (
                <button
                  type="button"
                  onClick={handleLimpiar}
                  className="text-[11px] text-[#6B7A72] hover:text-[#C53030] underline transition-colors"
                >
                  Limpiar conteos ({analisis.contadosCount})
                </button>
              )}
            </div>

            {/* Mensajes de Alerta */}
            {errorMsg && (
              <div className="mx-4 mt-3 p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[12px] text-[#C53030] flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mx-4 mt-3 p-3 rounded-[6px] bg-[#F0FDF4] border border-[#BBF7D0] text-[12px] text-[#15803D] flex items-center gap-2">
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Lista de Productos para Conteo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-[#6B7A72]">
                  No se encontraron productos coincidentes.
                </div>
              ) : (
                filteredItems.map((item) => {
                  const valStr = conteos[item.producto_id]
                  const hasVal = valStr !== undefined && valStr !== ''
                  const contado = parseFloat(valStr || '0')
                  const diff = hasVal && !isNaN(contado) ? Math.round((contado - item.stock_actual) * 100) / 100 : null
                  const esMerma = diff !== null && diff < 0
                  const esSobrante = diff !== null && diff > 0
                  const cuadra = diff !== null && diff === 0

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-[6px] border transition-colors flex items-center justify-between gap-3 ${
                        esMerma
                          ? 'border-[#FFD6D6] bg-[#FFF8F8]'
                          : esSobrante
                          ? 'border-[#FEF08A] bg-[#FEFCE8]'
                          : cuadra
                          ? 'border-[#BBF7D0] bg-[#F7FEE7]'
                          : 'border-[#E7E5DF] bg-white hover:border-[#16201C]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-[#6B7A72] bg-[#FAFAF7] px-1.5 py-0.5 rounded border border-[#E7E5DF]">
                            {item.sku}
                          </span>
                          <span className="text-[13px] font-semibold text-[#16201C] truncate">
                            {item.producto_nombre}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6B7A72] mt-1 flex items-center gap-3">
                          <span>
                            Sistema: <b className="text-[#16201C] font-mono">{item.stock_actual}</b>
                          </span>
                          <span>·</span>
                          <span>
                            Costo: <span className="font-mono">S/ {item.costo_unitario.toFixed(2)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Input de Conteo */}
                      <div className="flex items-center gap-2.5">
                        <div className="w-24">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Contado"
                            value={valStr || ''}
                            onChange={(e) => handleInputChange(item.producto_id, e.target.value)}
                            className="w-full text-right font-mono text-[13px] font-bold px-2 py-1.5 rounded-[5px] border border-[#E7E5DF] bg-white focus:outline-none focus:border-[#16201C]"
                          />
                        </div>

                        {/* Indicador de Diferencia */}
                        <div className="w-32 text-right">
                          {diff === null ? (
                            <span className="text-[11px] text-[#6B7A72]/60 italic">Sin contar</span>
                          ) : cuadra ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D32]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                              Cuadra OK
                            </span>
                          ) : esMerma ? (
                            <div className="leading-tight">
                              <span className="text-[11px] font-bold text-[#D32F2F] font-mono">
                                {diff} und
                              </span>
                              <div className="text-[10px] text-[#D32F2F]/80 font-mono">
                                -S/ {(Math.abs(diff) * item.costo_unitario).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="leading-tight">
                              <span className="text-[11px] font-bold text-[#CA8A04] font-mono">
                                +{diff} und
                              </span>
                              <div className="text-[10px] text-[#CA8A04] font-mono">
                                +S/ {(diff * item.costo_unitario).toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Resumen inferior y Acciones */}
            <div className="p-4 bg-[#FAFAF7] border-t border-[#E7E5DF] space-y-3">
              <div className="grid grid-cols-3 divide-x divide-[#E7E5DF] text-center py-1">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7A72]">
                    Contados
                  </span>
                  <span className="text-[16px] font-bold text-[#16201C] font-mono">
                    {analisis.contadosCount} <span className="text-[11px] font-normal text-[#6B7A72]">de {inventario.length}</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7A72]">
                    Mermas (Faltantes)
                  </span>
                  <span className="text-[16px] font-bold text-[#D32F2F] font-mono">
                    -S/ {analisis.faltanteSoles.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7A72]">
                    Sobrantes
                  </span>
                  <span className="text-[16px] font-bold text-[#2E7D32] font-mono">
                    +S/ {analisis.sobranteSoles.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E5DF]">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] bg-white text-[13px] text-[#16201C] hover:bg-[#FAFAF7]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAplicar}
                  disabled={isPending || analisis.totalConDiferencia === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-40 transition-all cursor-pointer"
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>
                    Aplicar Ajustes ({analisis.totalConDiferencia})
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
