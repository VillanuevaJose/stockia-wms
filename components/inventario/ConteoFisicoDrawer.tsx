'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Barcode,
  Calculator,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  X,
} from '../ui/icons'
import {
  aplicarConteoFisicoAction,
  procesarConteoCiegoAction,
  type ConciliacionConteoResult,
} from '../../app/admin/inventario/actions'

export interface ProductoConteoCiego {
  id: string
  producto_id: string
  sku: string
  codigo_barras: string | null
  producto_nombre: string
  categoria: string
  almacen_id: string | null
  almacen_nombre: string
}

interface Props {
  productos: ProductoConteoCiego[]
  almacenes?: { id: string; nombre: string; es_principal?: boolean }[]
  userRole: 'admin' | 'almacenero' | 'vendedor'
}

export function ConteoFisicoDrawer({ productos, almacenes = [], userRole }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [etapa, setEtapa] = useState<'CONTEO' | 'CONCILIACION'>('CONTEO')
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('TODAS')
  const [avanceFiltro, setAvanceFiltro] = useState<'TODOS' | 'PENDIENTES' | 'CONTADOS'>('TODOS')
  const [motivo, setMotivo] = useState('Auditoría física ciega')
  const [selectedAlmacenId, setSelectedAlmacenId] = useState<string>(
    almacenes.find((a) => a.es_principal)?.id || almacenes[0]?.id || ''
  )
  const [conteos, setConteos] = useState<Record<string, string>>({})
  const [conciliacion, setConciliacion] = useState<ConciliacionConteoResult | null>(null)
  const [scanNotice, setScanNotice] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Productos filtrados por sede (cuando hay registros ligados al almacén seleccionado)
  const productosDeSede = useMemo(() => {
    if (!selectedAlmacenId) return productos
    const deSede = productos.filter(
      (p) => !p.almacen_id || p.almacen_id === selectedAlmacenId
    )
    return deSede.length > 0 ? deSede : productos
  }, [productos, selectedAlmacenId])

  const categorias = useMemo(() => {
    const set = new Set(productosDeSede.map((p) => p.categoria))
    return ['TODAS', ...Array.from(set).sort()]
  }, [productosDeSede])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return productosDeSede.filter((item) => {
      if (categoriaFiltro !== 'TODAS' && item.categoria !== categoriaFiltro) return false

      const tieneValor = conteos[item.producto_id] !== undefined && conteos[item.producto_id] !== ''
      if (avanceFiltro === 'CONTADOS' && !tieneValor) return false
      if (avanceFiltro === 'PENDIENTES' && tieneValor) return false

      if (!q) return true
      return (
        item.producto_nombre.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.codigo_barras && item.codigo_barras.toLowerCase().includes(q)) ||
        item.categoria.toLowerCase().includes(q)
      )
    })
  }, [productosDeSede, search, categoriaFiltro, avanceFiltro, conteos])

  const totalContados = useMemo(() => {
    return Object.values(conteos).filter((val) => {
      if (val === '') return false
      const n = Number(val)
      return !Number.isNaN(n) && n >= 0
    }).length
  }, [conteos])

  const handleInputChange = (productoId: string, val: string) => {
    setConteos((prev) => ({ ...prev, [productoId]: val }))
    setErrorMsg(null)
  }

  const handleSumarUno = (item: ProductoConteoCiego) => {
    const actual = Number(conteos[item.producto_id] || '0')
    const siguiente = (Number.isNaN(actual) ? 0 : actual) + 1
    setConteos((prev) => ({ ...prev, [item.producto_id]: String(siguiente) }))
    setScanNotice(`${item.producto_nombre}: ${siguiente} und contadas`)
    setErrorMsg(null)
  }

  // Soporte directo para pistola lectora o búsqueda rápida con Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const q = search.trim().toLowerCase()
    if (!q) return

    e.preventDefault()
    const matchExacto = productosDeSede.find(
      (p) =>
        p.sku.toLowerCase() === q ||
        (p.codigo_barras && p.codigo_barras.toLowerCase() === q)
    )
    const target = matchExacto || (filteredItems.length === 1 ? filteredItems[0] : null)

    if (target) {
      handleSumarUno(target)
      setSearch('')
    }
  }

  const handleLimpiar = () => {
    setConteos({})
    setConciliacion(null)
    setEtapa('CONTEO')
    setScanNotice(null)
    setErrorMsg(null)
    setSuccessMsg(null)
  }

  const handleFinalizarConteoCiego = () => {
    const payloadConteos = Object.entries(conteos)
      .filter(([, val]) => val !== '' && !Number.isNaN(Number(val)) && Number(val) >= 0)
      .map(([producto_id, val]) => ({
        producto_id,
        cantidad_contada: Number(val),
      }))

    if (payloadConteos.length === 0) {
      setErrorMsg('Ingresa al menos un producto contado antes de finalizar la auditoría.')
      return
    }

    setErrorMsg(null)
    startTransition(async () => {
      const res = await procesarConteoCiegoAction({
        almacen_id: selectedAlmacenId || null,
        motivo_general: motivo.trim() || 'Auditoría física ciega',
        conteos: payloadConteos,
      })

      if (!res.success) {
        setErrorMsg(res.error || 'No se pudo procesar el conteo ciego.')
        return
      }

      if (res.requiere_aprobacion_admin) {
        setSuccessMsg(
          `Conteo ciego enviado a revisión (${res.total_contados} productos contados). Un administrador aprobará las diferencias.`
        )
        setConteos({})
        setScanNotice(null)
        router.refresh()
        setTimeout(() => {
          setSuccessMsg(null)
          setIsOpen(false)
        }, 2600)
        return
      }

      setConciliacion(res)
      setEtapa('CONCILIACION')
    })
  }

  const handleAprobarYAplicar = () => {
    if (!conciliacion?.detalles) return
    const ajustes = conciliacion.detalles
      .filter((d) => d.diferencia !== 0)
      .map((d) => ({
        producto_id: d.producto_id,
        producto_nombre: d.producto_nombre,
        sku: d.sku,
        almacen_id: d.almacen_id || selectedAlmacenId || null,
        stock_sistema: d.stock_sistema,
        cantidad_contada: d.cantidad_contada,
        diferencia: d.diferencia,
        costo_unitario: d.costo_unitario,
      }))

    if (ajustes.length === 0) {
      setIsOpen(false)
      handleLimpiar()
      return
    }

    setErrorMsg(null)
    startTransition(async () => {
      const res = await aplicarConteoFisicoAction({
        sesion_id: conciliacion.sesion_id,
        almacen_id: selectedAlmacenId || null,
        motivo_general: motivo.trim() || 'Auditoría física ciega',
        total_contados: conciliacion.total_contados,
        ajustes,
      })

      if (res.success) {
        setSuccessMsg(
          `Ajustes asentados en Kardex: ${res.totalAjustados} productos conciliados (Mermas: -S/ ${res.totalFaltanteSoles?.toFixed(2)} | Sobrantes: +S/ ${res.totalSobranteSoles?.toFixed(2)}).`
        )
        setConteos({})
        setConciliacion(null)
        setEtapa('CONTEO')
        router.refresh()
        setTimeout(() => {
          setSuccessMsg(null)
          setIsOpen(false)
        }, 2500)
      } else {
        setErrorMsg(res.error || 'No se pudieron asentar los ajustes en Kardex.')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setEtapa('CONTEO')
          setConciliacion(null)
          setErrorMsg(null)
          setSuccessMsg(null)
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#16201C] bg-[#16201C] hover:opacity-90 text-[#FAFAF7] text-[13px] font-medium transition-opacity cursor-pointer"
      >
        <Calculator size={14} />
        <span>Conteo Ciego Físico</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Auditoría física con conteo ciego"
          className="fixed inset-0 z-50 flex justify-end bg-[#16201C]/40 font-sans"
        >
          <div className="w-full max-w-2xl bg-white h-full flex flex-col justify-between border-l border-[#E7E5DF]">
            {/* Cabecera */}
            <div className="p-5 border-b border-[#E7E5DF] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-bold text-[#16201C]">
                    {etapa === 'CONTEO'
                      ? 'Conteo Ciego de Inventario'
                      : 'Conciliación y Aprobación de Descuadres'}
                  </h2>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.04em] uppercase px-2 py-0.5 rounded-[4px] bg-[#FAFAF7] border border-[#E7E5DF] text-[#16201C]">
                    <ShieldCheck size={11} className="text-[#C97D1A]" />
                    Saldo Oculto
                  </span>
                </div>
                <p className="text-[12px] text-[#6B7A72] mt-0.5">
                  {etapa === 'CONTEO'
                    ? 'Cuenta únicamente lo que ves en anaquel. El stock del sistema permanece oculto para evitar sesgos.'
                    : 'Revisa las diferencias detectadas contra el Kardex teórico antes de asentar los ajustes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar panel de conteo ciego"
                className="p-1.5 rounded-[6px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#FAFAF7] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* ETAPA 1: CONTEO CIEGO */}
            {etapa === 'CONTEO' && (
              <>
                <div className="p-4 bg-[#FAFAF7] border-b border-[#E7E5DF] space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
                      <input
                        type="text"
                        placeholder="Escanear código / SKU + Enter o buscar artículo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full rounded-[6px] border border-[#E7E5DF] bg-white pl-8 pr-8 py-1.5 text-[12px] text-[#16201C] focus:outline-none focus:border-[#E8A33D]"
                      />
                      <Barcode size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
                    </div>

                    {almacenes.length > 0 && (
                      <select
                        value={selectedAlmacenId}
                        onChange={(e) => setSelectedAlmacenId(e.target.value)}
                        aria-label="Seleccionar almacén"
                        className="rounded-[6px] border border-[#E7E5DF] bg-white px-2.5 py-1.5 text-[12px] text-[#16201C] focus:outline-none focus:border-[#E8A33D]"
                      >
                        {almacenes.map((alm) => (
                          <option key={alm.id} value={alm.id}>
                            {alm.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <select
                        value={categoriaFiltro}
                        onChange={(e) => setCategoriaFiltro(e.target.value)}
                        aria-label="Filtrar por categoría"
                        className="rounded-[6px] border border-[#E7E5DF] bg-white px-2 py-1 text-[11px] text-[#16201C]"
                      >
                        {categorias.map((c) => (
                          <option key={c} value={c}>
                            {c === 'TODAS' ? 'Todas las categorías' : c}
                          </option>
                        ))}
                      </select>

                      {(['TODOS', 'PENDIENTES', 'CONTADOS'] as const).map((est) => (
                        <button
                          key={est}
                          type="button"
                          onClick={() => setAvanceFiltro(est)}
                          className={`px-2 py-1 text-[11px] font-medium rounded-[6px] transition-colors ${
                            avanceFiltro === est
                              ? 'bg-[#16201C] text-[#FAFAF7]'
                              : 'bg-white border border-[#E7E5DF] text-[#6B7A72] hover:text-[#16201C]'
                          }`}
                        >
                          {est === 'TODOS' ? 'Todos' : est === 'PENDIENTES' ? 'Por contar' : 'Contados'}
                        </button>
                      ))}
                    </div>

                    {totalContados > 0 && (
                      <button
                        type="button"
                        onClick={handleLimpiar}
                        className="text-[11px] text-[#6B7A72] hover:text-[#C93B3B] underline transition-colors"
                      >
                        Limpiar ({totalContados})
                      </button>
                    )}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Motivo o zona del conteo (ej. Auditoría semanal - Pasillo B)"
                      aria-label="Motivo de la auditoría"
                      className="w-full rounded-[6px] border border-[#E7E5DF] bg-white px-3 py-1.5 text-[12px] text-[#16201C] focus:outline-none focus:border-[#E8A33D]"
                    />
                  </div>
                </div>

                {scanNotice && (
                  <div className="mx-4 mt-3 px-3 py-2 rounded-[6px] bg-[#FAFAF7] border border-[#E8A33D] text-[12px] text-[#16201C] flex items-center justify-between">
                    <span className="font-medium">{scanNotice}</span>
                    <button
                      type="button"
                      onClick={() => setScanNotice(null)}
                      aria-label="Cerrar aviso de escaneo"
                      className="text-[#6B7A72] hover:text-[#16201C]"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {errorMsg && (
                  <div className="mx-4 mt-3 p-3 rounded-[6px] bg-[#FAFAF7] border border-[#C93B3B] text-[12px] text-[#C93B3B] flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mx-4 mt-3 p-3 rounded-[6px] bg-[#FAFAF7] border border-[#2A7A4C] text-[12px] text-[#2A7A4C] flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Lista Ciega de Productos */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {filteredItems.length === 0 ? (
                    <div className="py-12 text-center text-[13px] text-[#6B7A72]">
                      No se encontraron artículos con este filtro.
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const valStr = conteos[item.producto_id] || ''
                      const yaContado = valStr !== '' && !Number.isNaN(Number(valStr))

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-[6px] border transition-colors flex items-center justify-between gap-3 ${
                            yaContado
                              ? 'border-[#16201C] bg-[#FAFAF7]'
                              : 'border-[#E7E5DF] bg-white hover:border-[#B9B3A7]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-semibold text-[#6B7A72] bg-[#FAFAF7] px-1.5 py-0.5 rounded-[4px] border border-[#E7E5DF]">
                                {item.sku || 'S/N'}
                              </span>
                              <span className="text-[13px] font-semibold text-[#16201C] truncate">
                                {item.producto_nombre}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#6B7A72] mt-1 flex items-center gap-2">
                              <span>{item.categoria}</span>
                              <span>·</span>
                              <span>{item.almacen_nombre}</span>
                              {item.codigo_barras && (
                                <>
                                  <span>·</span>
                                  <span>EAN: {item.codigo_barras}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSumarUno(item)}
                              aria-label={`Sumar 1 unidad a ${item.producto_nombre}`}
                              className="px-2 py-1.5 rounded-[6px] border border-[#E7E5DF] bg-white hover:bg-[#F4F3EF] text-[12px] font-semibold text-[#16201C] inline-flex items-center gap-0.5"
                            >
                              <Plus size={12} />1
                            </button>

                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0"
                              aria-label={`Cantidad física contada de ${item.producto_nombre}`}
                              value={valStr}
                              onChange={(e) => handleInputChange(item.producto_id, e.target.value)}
                              className="w-24 text-right tabular-nums text-[13px] font-bold px-2.5 py-1.5 rounded-[6px] border border-[#E7E5DF] bg-white focus:outline-none focus:border-[#E8A33D]"
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Pie de Etapa 1 */}
                <div className="p-4 bg-[#FAFAF7] border-t border-[#E7E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#6B7A72] tabular-nums">
                    <strong className="text-[#16201C]">{totalContados}</strong> de {productosDeSede.length} artículos contados
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] bg-white text-[13px] text-[#16201C] hover:bg-[#F4F3EF]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalizarConteoCiego}
                      disabled={isPending || totalContados === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-[#16201C] hover:opacity-90 text-[#FAFAF7] text-[13px] font-semibold disabled:opacity-40 transition-opacity cursor-pointer"
                    >
                      {isPending && <Loader2 size={13} className="animate-spin" />}
                      <span>
                        {userRole === 'admin'
                          ? 'Conciliar Diferencias'
                          : 'Enviar Conteo a Revisión'}
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ETAPA 2: CONCILIACIÓN Y APROBACIÓN (SOLO ADMIN) */}
            {etapa === 'CONCILIACION' && conciliacion && (
              <>
                <div className="p-4 bg-[#FAFAF7] border-b border-[#E7E5DF] grid grid-cols-3 divide-x divide-[#E7E5DF] text-center">
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
                      Con Descuadre
                    </span>
                    <span className="text-lg font-bold text-[#16201C] tabular-nums">
                      {conciliacion.total_con_diferencia} de {conciliacion.total_contados}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
                      Mermas (Faltantes)
                    </span>
                    <span className="text-lg font-bold text-[#C93B3B] tabular-nums">
                      -S/ {(conciliacion.faltante_soles || 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.06em] text-[#6B7A72]">
                      Sobrantes
                    </span>
                    <span className="text-lg font-bold text-[#2A7A4C] tabular-nums">
                      +S/ {(conciliacion.sobrante_soles || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="mx-4 mt-3 p-3 rounded-[6px] bg-[#FAFAF7] border border-[#C93B3B] text-[12px] text-[#C93B3B] flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mx-4 mt-3 p-3 rounded-[6px] bg-[#FAFAF7] border border-[#2A7A4C] text-[12px] text-[#2A7A4C] flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-[0.05em]">
                        <th className="py-2 pr-2">Artículo</th>
                        <th className="py-2 px-2 text-right">Sistema</th>
                        <th className="py-2 px-2 text-right">Contado</th>
                        <th className="py-2 px-2 text-right">Diferencia</th>
                        <th className="py-2 pl-2 text-right">Impacto (S/)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E5DF] text-[#16201C] tabular-nums">
                      {(conciliacion.detalles || []).map((det) => (
                        <tr key={det.producto_id} className="hover:bg-[#FAFAF7]">
                          <td className="py-2.5 pr-2">
                            <div className="font-semibold text-[#16201C]">{det.producto_nombre}</div>
                            <div className="text-[11px] text-[#6B7A72]">{det.sku}</div>
                          </td>
                          <td className="py-2.5 px-2 text-right text-[#6B7A72]">{det.stock_sistema}</td>
                          <td className="py-2.5 px-2 text-right font-semibold">{det.cantidad_contada}</td>
                          <td className="py-2.5 px-2 text-right font-semibold">
                            {det.diferencia === 0 ? (
                              <span className="inline-flex items-center gap-1 text-[#2A7A4C]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2A7A4C]" />
                                Cuadra
                              </span>
                            ) : det.diferencia < 0 ? (
                              <span className="text-[#C93B3B]">{det.diferencia}</span>
                            ) : (
                              <span className="text-[#C97D1A]">+{det.diferencia}</span>
                            )}
                          </td>
                          <td className="py-2.5 pl-2 text-right font-semibold">
                            {det.impacto_soles === 0 ? (
                              <span className="text-[#6B7A72]">S/ 0.00</span>
                            ) : det.impacto_soles < 0 ? (
                              <span className="text-[#C93B3B]">
                                -S/ {Math.abs(det.impacto_soles).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-[#2A7A4C]">+S/ {det.impacto_soles.toFixed(2)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-[#FAFAF7] border-t border-[#E7E5DF] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setEtapa('CONTEO')}
                    disabled={isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] bg-white text-[13px] text-[#16201C] hover:bg-[#F4F3EF]"
                  >
                    <ChevronLeft size={14} />
                    Corregir conteo
                  </button>

                  {(conciliacion.total_con_diferencia || 0) > 0 ? (
                    <button
                      type="button"
                      onClick={handleAprobarYAplicar}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-[#16201C] hover:opacity-90 text-[#FAFAF7] text-[13px] font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      {isPending && <Loader2 size={13} className="animate-spin" />}
                      <span>Aprobar y Asentar en Kardex ({conciliacion.total_con_diferencia})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        handleLimpiar()
                      }}
                      className="px-4 py-1.5 rounded-[6px] bg-[#16201C] text-[#FAFAF7] text-[13px] font-semibold"
                    >
                      Cerrar (Todo Cuadrado)
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
