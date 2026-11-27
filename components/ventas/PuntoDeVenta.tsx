'use client'

import { useState, useTransition, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react'
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Barcode,
  Camera,
  Calculator,
  Banknote,
} from '../ui/icons'
import {
  buscarProductosParaVentaAction,
  registrarVentaAction,
  obtenerResumenCajaTurnoAction,
  type VentaResult,
  type ResumenCaja,
} from '../../lib/actions/ventas'
import {
  enqueueOfflineSale,
  getOfflineSalesQueue,
  markOfflineSaleError,
  removeOfflineSale,
  saveCatalogSnapshot,
} from '../../lib/offline/pos-queue'
import { PosCameraModal, PosArqueoCajaModal, PosVentaExitosa } from './pos'

function subscribeOnlineStatus(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

function getOnlineSnapshot() {
  return navigator.onLine
}

function getServerOnlineSnapshot() {
  return true
}

interface ProductoItem {
  id: string
  sku: string
  codigo_barras: string | null
  nombre: string
  precio: number
  stock: number
  unidad: string
}

interface CartItem extends ProductoItem {
  cantidad: number
}

interface Props {
  hasCulqiConfigured?: boolean
  initialProductos?: ProductoItem[]
  sedeNombre?: string | null
  almacenes?: { id: string; nombre: string; es_principal: boolean }[]
  stockPorAlmacen?: Record<string, Record<string, number>>
  initialAlmacenId?: string
  esAdmin?: boolean
}

export function PuntoDeVenta({
  hasCulqiConfigured = false,
  initialProductos = [],
  sedeNombre = null,
  almacenes = [],
  stockPorAlmacen,
  initialAlmacenId = '',
}: Props) {
  const [selectedAlmacenId, setSelectedAlmacenId] = useState<string>(
    initialAlmacenId || almacenes[0]?.id || ''
  )
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoItem[]>([])
  const [carrito, setCarrito] = useState<CartItem[]>([])
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CULQI'>('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState<string>('')
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null)

  // Modales de Cámara y Arqueo
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isArqueoOpen, setIsArqueoOpen] = useState(false)
  const [resumenCaja, setResumenCaja] = useState<ResumenCaja | null>(null)
  const [isLoadingResumen, startResumenTransition] = useTransition()
  const [soloConStock, setSoloConStock] = useState<boolean>(true)

  const [isSearching, startSearch] = useTransition()
  const [isSubmitting, startSubmit] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [ventaExitosa, setVentaExitosa] = useState<(VentaResult & { vuelto?: number }) | null>(null)

  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  )
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0)
  const [isSyncingOffline, setIsSyncingOffline] = useState(false)
  const [syncNotice, setSyncNotice] = useState<string | null>(null)

  const sincronizarColaOffline = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const queue = await getOfflineSalesQueue()
    setPendingOfflineCount(queue.length)
    if (queue.length === 0) return

    setIsSyncingOffline(true)
    let sincronizadas = 0
    for (const sale of queue) {
      try {
        const res = await registrarVentaAction({
          almacen_id: sale.almacen_id,
          metodo_pago: sale.metodo_pago,
          items: sale.items.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
          culqi_charge_id: sale.culqi_charge_id,
          idempotency_key: sale.idempotency_key,
        })
        if (res.success) {
          await removeOfflineSale(sale.idempotency_key)
          sincronizadas++
        } else {
          await markOfflineSaleError(sale.idempotency_key, res.error || 'Error de sincronización')
        }
      } catch {
        // Detener si se pierde red a mitad de sincronización
        break
      }
    }

    const restantes = await getOfflineSalesQueue()
    setPendingOfflineCount(restantes.length)
    setIsSyncingOffline(false)

    if (sincronizadas > 0) {
      setSyncNotice(
        `${sincronizadas} ${sincronizadas === 1 ? 'venta offline sincronizada' : 'ventas offline sincronizadas'} con el servidor.`
      )
      setTimeout(() => setSyncNotice(null), 5000)
    }
  }, [])

  // Guardar catálogo offline en IndexedDB y sincronizar pendientes al reconectar
  useEffect(() => {
    if (initialProductos.length > 0) {
      void saveCatalogSnapshot(initialProductos)
    }
    void getOfflineSalesQueue().then((q) => {
      setPendingOfflineCount(q.length)
      if (q.length > 0 && navigator.onLine) {
        void sincronizarColaOffline()
      }
    })

    const onReconnect = () => {
      void sincronizarColaOffline()
    }
    window.addEventListener('online', onReconnect)
    return () => window.removeEventListener('online', onReconnect)
  }, [initialProductos, sincronizarColaOffline])

  // Catálogo dinámico reflejando el stock exacto de la sede seleccionada (con fallback local si está offline)
  const catalogo = useMemo(() => {
    const qLower = query.trim().toLowerCase()
    const baseList = qLower
      ? isOnline && searchResults.length > 0
        ? searchResults
        : initialProductos.filter(
            (p) =>
              p.nombre.toLowerCase().includes(qLower) ||
              p.sku.toLowerCase().includes(qLower) ||
              (p.codigo_barras && p.codigo_barras.toLowerCase().includes(qLower))
          )
      : initialProductos
    if (!stockPorAlmacen || !selectedAlmacenId) return baseList

    const mapped = baseList.map((p) => {
      const realStock = stockPorAlmacen[p.id]?.[selectedAlmacenId] ?? 0
      return {
        ...p,
        stock: realStock,
      }
    })

    if (soloConStock) {
      return mapped.filter((p) => p.stock > 0)
    }

    return mapped
  }, [query, searchResults, initialProductos, stockPorAlmacen, selectedAlmacenId, soloConStock, isOnline])

  const handleSedeChange = (nuevoId: string) => {
    if (carrito.length > 0) {
      if (
        !confirm(
          'Al cambiar de sede se reiniciará el carrito actual para verificar existencias en el nuevo local. ¿Deseas continuar?'
        )
      ) {
        return
      }
      setCarrito([])
    }
    setSelectedAlmacenId(nuevoId)
    setErrorMsg(null)
  }

  // Bip de confirmación de escaneo (Web Audio API)
  const playBeep = () => {
    try {
      // @ts-expect-error webkit audio fallback
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1760, ctx.currentTime) // Nota A6
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.1)
    } catch {
      // Audio bloqueado por el navegador
    }
  }

  // Búsqueda en vivo al escribir en la barra de texto
  useEffect(() => {
    if (!query.trim()) return

    const timer = setTimeout(() => {
      startSearch(async () => {
        const resultados = await buscarProductosParaVentaAction(query, selectedAlmacenId)
        setSearchResults(resultados)
      })
    }, 250)

    return () => clearTimeout(timer)
  }, [query, selectedAlmacenId])

  const agregarAlCarrito = (prod: ProductoItem) => {
    setErrorMsg(null)
    if (prod.stock <= 0) {
      setErrorMsg(`"${prod.nombre}" no tiene existencias disponibles en almacén.`)
      return
    }

    setCarrito((prev) => {
      const existing = prev.find((i) => i.id === prod.id)
      if (existing) {
        if (existing.cantidad + 1 > prod.stock) {
          setErrorMsg(`Stock máximo disponible alcanzado (${prod.stock} ${prod.unidad}).`)
          return prev
        }
        return prev.map((i) => (i.id === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i))
      }
      return [...prev, { ...prod, cantidad: 1 }]
    })
  }

  const buscarYAgregarPorCodigo = useCallback(async (codigo: string) => {
    setErrorMsg(null)
    const clean = codigo.trim().toLowerCase()
    if (!clean) return

    // 1. Buscar en catálogo local cargado
    let encontrado = catalogo.find(
      (p) =>
        p.codigo_barras?.toLowerCase() === clean ||
        p.sku.toLowerCase() === clean
    )

    // 2. Si no está en memoria, consultar al servidor
    if (!encontrado) {
      const dbResult = await buscarProductosParaVentaAction(codigo.trim(), selectedAlmacenId)
      encontrado = dbResult.find(
        (p) =>
          p.codigo_barras?.toLowerCase() === clean ||
          p.sku.toLowerCase() === clean
      )
    }

    if (encontrado) {
      playBeep()
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([60, 40, 60])
      }
      agregarAlCarrito(encontrado)
      setScannedFeedback(`¡Escaneado: ${encontrado.nombre}!`)
      setTimeout(() => setScannedFeedback(null), 2500)
    } else {
      setErrorMsg(`Código de barras "${codigo}" no encontrado en existencias de esta sede.`)
    }
  }, [catalogo, selectedAlmacenId])

  // ===== 1. LECTOR DE PISTOLA DE CÓDIGO DE BARRAS GLOBAL =====
  useEffect(() => {
    let barcodeBuf = ''
    let lastTime = 0

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')

      const now = Date.now()

      // Si el foco está en un input y no es Enter con buffer ultrarrápido, no intervenir
      if (isInput) {
        if (e.key === 'Enter' && barcodeBuf.length >= 3 && now - lastTime < 150) {
          e.preventDefault()
          buscarYAgregarPorCodigo(barcodeBuf.trim())
          barcodeBuf = ''
        }
        return
      }

      // Reiniciar buffer si el intervalo de pulsación supera los 90ms (humano vs pistola óptica)
      if (now - lastTime > 90) {
        barcodeBuf = ''
      }
      lastTime = now

      if (e.key === 'Enter') {
        if (barcodeBuf.length >= 3) {
          e.preventDefault()
          buscarYAgregarPorCodigo(barcodeBuf.trim())
        }
        barcodeBuf = ''
      } else if (e.key.length === 1) {
        barcodeBuf += e.key
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [buscarYAgregarPorCodigo])

  const cambiarCantidad = (id: string, delta: number) => {
    setErrorMsg(null)
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nueva = item.cantidad + delta
            if (nueva > item.stock) {
              setErrorMsg(`Solo hay ${item.stock} unidades disponibles en almacén.`)
              return item
            }
            return { ...item, cantidad: nueva }
          }
          return item
        })
        .filter((item) => item.cantidad > 0)
    )
  }

  const fijarCantidad = (id: string, nueva: number) => {
    setErrorMsg(null)
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const val = Math.max(1, nueva)
          if (val > item.stock) {
            setErrorMsg(`Solo hay ${item.stock} unidades disponibles en almacén.`)
            return { ...item, cantidad: item.stock }
          }
          return { ...item, cantidad: val }
        }
        return item
      })
    )
  }

  const eliminarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((i) => i.id !== id))
  }

  const subtotal = carrito.reduce((acc, cur) => acc + cur.precio * cur.cantidad, 0)
  const total = Math.round(subtotal * 100) / 100

  // ===== 3. CÁLCULO DE VUELTO Y EFECTIVO RÁPIDO =====
  const recibidoNum = parseFloat(montoRecibido) || 0
  const vuelto = recibidoNum >= total ? Math.round((recibidoNum - total) * 100) / 100 : 0
  const falta = recibidoNum < total && recibidoNum > 0 ? Math.round((total - recibidoNum) * 100) / 100 : 0

  const handleCobrar = () => {
    if (carrito.length === 0) return
    setErrorMsg(null)

    if (metodoPago === 'EFECTIVO') {
      if (!montoRecibido || recibidoNum < total) {
        setErrorMsg(`El efectivo recibido (S/ ${recibidoNum.toFixed(2)}) debe cubrir el total de S/ ${total.toFixed(2)}.`)
        return
      }
    }

    startSubmit(async () => {
      const idempotencyKey = crypto.randomUUID()
      const culqiChargeId =
        metodoPago === 'CULQI' ? `chr_test_${Date.now().toString().slice(-8)}` : undefined

      const guardarEnColaOffline = async () => {
        await enqueueOfflineSale({
          idempotency_key: idempotencyKey,
          created_at: new Date().toISOString(),
          almacen_id: selectedAlmacenId || undefined,
          metodo_pago: metodoPago,
          items: carrito.map((i) => ({
            producto_id: i.id,
            cantidad: i.cantidad,
            nombre: i.nombre,
          })),
          total_estimado: total,
          vuelto: metodoPago === 'EFECTIVO' ? vuelto : undefined,
          culqi_charge_id: culqiChargeId,
          estado: 'PENDIENTE',
        })
        const q = await getOfflineSalesQueue()
        setPendingOfflineCount(q.length)
        setVentaExitosa({
          success: true,
          numero_comprobante: `OFFLINE-${idempotencyKey.slice(0, 8).toUpperCase()}`,
          total,
          vuelto: metodoPago === 'EFECTIVO' ? vuelto : undefined,
        })
        setCarrito([])
        setQuery('')
        setMontoRecibido('')
      }

      if (!isOnline) {
        await guardarEnColaOffline()
        return
      }

      try {
        const res = await registrarVentaAction({
          almacen_id: selectedAlmacenId || undefined,
          metodo_pago: metodoPago,
          items: carrito.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
          culqi_charge_id: culqiChargeId,
          idempotency_key: idempotencyKey,
        })

        if (!res.success) {
          setErrorMsg(res.error || 'Ocurrió un error al procesar la venta.')
        } else {
          setVentaExitosa({
            ...res,
            vuelto: metodoPago === 'EFECTIVO' ? vuelto : undefined,
          })
          setCarrito([])
          setQuery('')
          setMontoRecibido('')
        }
      } catch {
        // Si falla la red durante el cobro, resguardar en cola Offline
        await guardarEnColaOffline()
      }
    })
  }

  const nuevaVenta = () => {
    setVentaExitosa(null)
    setErrorMsg(null)
    setCarrito([])
    setQuery('')
    setMontoRecibido('')
  }

  // ===== 4. APERTURA DE ARQUEO DE CAJA =====
  const handleOpenArqueo = () => {
    setIsArqueoOpen(true)
    startResumenTransition(async () => {
      const data = await obtenerResumenCajaTurnoAction()
      setResumenCaja(data)
    })
  }

  return (
    <div className="relative">
      {/* Barra de Atajos Rápidos Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-white border border-[#E7E5DF] rounded-[8px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-pulse" />
          <span className="text-[13px] font-semibold text-[#16201C]">
            Lector de Código de Barras Activo
          </span>
          <span className="hidden sm:inline-block text-[11px] text-[#6B7A72] font-sans bg-[#FAFAF7] px-2 py-0.5 rounded border border-[#E7E5DF]">
            Pistola USB / Bluetooth lista
          </span>
          {almacenes && almacenes.length > 1 ? (
            <div className="flex items-center gap-1.5 bg-[#E8F5E9] px-2.5 py-1 rounded-[6px] border border-[#C8E6C9] text-[12px]">
              <span className="text-[#2E7D32] font-semibold whitespace-nowrap">Sede:</span>
              <select
                value={selectedAlmacenId}
                onChange={(e) => handleSedeChange(e.target.value)}
                className="bg-transparent font-bold text-[#1B5E20] focus:outline-none cursor-pointer text-[12px]"
              >
                {almacenes.map((a) => (
                  <option key={a.id} value={a.id} className="text-[#16201C] bg-white">
                    {a.nombre} {a.es_principal ? '(Principal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            (sedeNombre || almacenes[0]?.nombre) && (
              <span className="hidden md:inline-block text-[11px] text-[#2E7D32] bg-[#E8F5E9] font-medium px-2 py-0.5 rounded border border-[#C8E6C9]">
                {sedeNombre || almacenes[0]?.nombre}
              </span>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Indicador de conectividad y cola Offline */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] border border-[#E7E5DF] bg-[#FAFAF7] text-[12px]">
            <span
              className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#2A7A4C]' : 'bg-[#C97D1A]'}`}
              aria-hidden="true"
            />
            <span className="font-semibold text-[#16201C]">
              {isOnline ? 'En línea' : 'Modo Offline'}
            </span>
            {pendingOfflineCount > 0 && (
              <button
                type="button"
                onClick={() => void sincronizarColaOffline()}
                disabled={!isOnline || isSyncingOffline}
                className="ml-1 px-2 py-0.5 rounded-[4px] bg-[#16201C] text-[#FAFAF7] text-[11px] font-semibold disabled:opacity-40"
              >
                {isSyncingOffline ? 'Sincronizando...' : `Sincronizar (${pendingOfflineCount})`}
              </button>
            )}
          </div>

          {/* Botón Lector con Cámara de Celular */}
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#FAFAF7] hover:bg-[#16201C] hover:text-white border border-[#E7E5DF] text-[#16201C] text-[12px] font-medium transition-colors cursor-pointer"
            title="Activa la cámara del celular para escanear etiquetas"
          >
            <Camera size={14} />
            <span>Escanear con Cámara</span>
          </button>

          {/* Botón Arqueo de Caja / Cierre de Turno */}
          <button
            type="button"
            onClick={handleOpenArqueo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium transition-colors cursor-pointer"
          >
            <Calculator size={14} />
            <span>Arqueo y Cierre de Turno</span>
          </button>
        </div>
      </div>

      {/* Banner de Sincronización Offline */}
      {syncNotice && (
        <div className="mb-4 p-3 rounded-[6px] bg-[#FAFAF7] border border-[#2A7A4C] text-[#16201C] text-[13px] font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#2A7A4C] shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Banner de Feedback al Escanear */}
      {scannedFeedback && (
        <div className="mb-4 p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-medium flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{scannedFeedback}</span>
          </div>
          <span className="text-[11px] font-sans text-emerald-700">+1 en carrito</span>
        </div>
      )}

      {/* Grid Principal del POS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Catálogo y Búsqueda (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Buscador de artículos */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7A72]">
              {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, código SKU o código de barras (pistola)..."
              autoFocus
              className="w-full rounded-[6px] border border-[#E7E5DF] bg-white pl-9 pr-3.5 py-2.5 text-[14px] text-[#16201C] placeholder:text-[#6B7A72] focus:outline-none focus:border-[#16201C] transition-colors"
            />
          </div>

          {/* Lista de Resultados de Catálogo */}
          <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#FAFAF7] border-b border-[#E7E5DF] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">
                  Artículos Disponibles en Sede
                </span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-[#6B7A72] hover:text-[#16201C] transition-colors">
                  <input
                    type="checkbox"
                    checked={soloConStock}
                    onChange={(e) => setSoloConStock(e.target.checked)}
                    className="rounded border-[#E7E5DF] text-[#16201C] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Solo con stock</span>
                </label>
              </div>
              <span className="text-[11px] font-sans text-[#6B7A72]">
                {catalogo.length} artículos
              </span>
            </div>

            <div className="divide-y divide-[#E7E5DF] max-h-[520px] overflow-y-auto">
              {catalogo.length === 0 ? (
                <div className="p-10 text-center text-[#6B7A72]">
                  <Barcode size={32} className="mx-auto mb-2 text-[#6B7A72]/40" />
                  <p className="text-[13px] font-medium text-[#16201C]">
                    {query
                      ? 'No hay stock disponible de este artículo en esta sede'
                      : 'No hay productos con existencias disponibles en esta sede'}
                  </p>
                  <p className="text-[12px] text-[#6B7A72] mt-0.5">
                    {query
                      ? 'Consulta en "Productos y Stock" para verificar disponibilidad en otras sedes.'
                      : 'Ingresa mercadería mediante Compras, Traslados o Aprovisionamiento Inicial.'}
                  </p>
                </div>
              ) : (
                catalogo.map((prod) => {
                  const sinStock = prod.stock <= 0
                  return (
                    <div
                      key={prod.id}
                      onClick={() => !sinStock && agregarAlCarrito(prod)}
                      className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                        sinStock
                          ? 'opacity-50 bg-[#FAFAF7] cursor-not-allowed'
                          : 'hover:bg-[#FAFAF7] cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-[11px] text-[#6B7A72]">{prod.sku}</span>
                          {prod.codigo_barras && (
                            <span className="font-sans text-[10px] text-[#6B7A72]/80 bg-[#FAFAF7] border border-[#E7E5DF] px-1 rounded-[3px]">
                              {prod.codigo_barras}
                            </span>
                          )}
                        </div>
                        <h4 className="text-[14px] font-medium text-[#16201C] truncate mt-0.5">
                          {prod.nombre}
                        </h4>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div>
                          <div className="text-[14px] font-bold font-sans text-[#16201C] tabular-nums">
                            S/ {prod.precio.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-[#6B7A72] flex items-center justify-end gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                sinStock ? 'bg-[#D32F2F]' : 'bg-[#2E7D32]'
                              }`}
                            />
                            <span>
                              {sinStock ? 'Sin stock' : `${prod.stock} ${prod.unidad}`}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={sinStock}
                          className="p-1.5 rounded-[4px] border border-[#E7E5DF] hover:border-[#16201C] text-[#16201C] disabled:opacity-30 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Carrito y Cobro (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden flex flex-col h-full min-h-[580px]">
          {/* Cabecera Carrito */}
          <div className="px-4 py-3 bg-[#FAFAF7] border-b border-[#E7E5DF] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#16201C]">
              <ShoppingCart size={16} />
              <h3 className="text-[14px] font-bold">Orden de Venta Actual</h3>
            </div>
            <span className="font-sans text-[12px] text-[#6B7A72] tabular-nums">
              {carrito.reduce((acc, c) => acc + c.cantidad, 0)} ítems
            </span>
          </div>

          {/* Feedback de error */}
          {errorMsg && (
            <div className="m-3 p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[12px] text-[#C53030] flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Modal / Panel de Éxito de Venta */}
          {ventaExitosa ? (
            <PosVentaExitosa
              venta={ventaExitosa}
              metodoPago={metodoPago}
              onNuevaVenta={nuevaVenta}
            />
          ) : (
            <>
              {/* Lista de ítems en carrito */}
              <div className="flex-1 divide-y divide-[#E7E5DF] overflow-y-auto max-h-[300px]">
                {carrito.length === 0 ? (
                  <div className="p-8 text-center text-[#6B7A72]">
                    <p className="text-[13px]">El carrito está vacío</p>
                    <p className="text-[12px] text-[#6B7A72]/70 mt-1">
                      Pistolea un código de barras o selecciona productos del catálogo.
                    </p>
                  </div>
                ) : (
                  carrito.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h5 className="text-[13px] font-medium text-[#16201C] truncate">
                          {item.nombre}
                        </h5>
                        <span className="font-sans text-[11px] text-[#6B7A72]">
                          S/ {item.precio.toFixed(2)} c/u
                        </span>
                      </div>

                      {/* Controles de Cantidad con Entrada Directa */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.id, -1)}
                          className="w-6 h-6 rounded-[4px] border border-[#E7E5DF] flex items-center justify-center text-[#16201C] hover:bg-[#FAFAF7]"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.cantidad}
                          onChange={(e) => fijarCantidad(item.id, parseInt(e.target.value) || 1)}
                          className="font-sans text-[12px] font-bold tabular-nums w-11 text-center border border-[#E7E5DF] rounded-[4px] py-0.5 focus:outline-none focus:border-[#16201C] bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.id, 1)}
                          className="w-6 h-6 rounded-[4px] border border-[#E7E5DF] flex items-center justify-center text-[#16201C] hover:bg-[#FAFAF7]"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right pl-2">
                        <span className="font-sans text-[13px] font-bold text-[#16201C] tabular-nums">
                          S/ {(item.precio * item.cantidad).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => eliminarDelCarrito(item.id)}
                          className="block ml-auto mt-0.5 text-[#6B7A72] hover:text-[#D32F2F] p-0.5"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Opciones de Pago y Resumen */}
              <div className="p-4 bg-[#FAFAF7] border-t border-[#E7E5DF] space-y-4">
                {/* Selector de Método de Pago */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72] mb-1.5">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <button
                      type="button"
                      onClick={() => setMetodoPago('EFECTIVO')}
                      className={`py-1.5 px-3 rounded-[6px] border text-left font-medium transition-colors ${
                        metodoPago === 'EFECTIVO'
                          ? 'border-[#16201C] bg-[#16201C] text-white'
                          : 'border-[#E7E5DF] bg-white text-[#16201C] hover:border-[#6B7A72]'
                      }`}
                    >
                      Efectivo (Caja)
                    </button>

                    <button
                      type="button"
                      onClick={() => setMetodoPago('TRANSFERENCIA')}
                      className={`py-1.5 px-3 rounded-[6px] border text-left font-medium transition-colors ${
                        metodoPago === 'TRANSFERENCIA'
                          ? 'border-[#16201C] bg-[#16201C] text-white'
                          : 'border-[#E7E5DF] bg-white text-[#16201C] hover:border-[#6B7A72]'
                      }`}
                    >
                      Yape / Plin / Transf.
                    </button>

                    {/* Pasarela Culqi (solo si está configurada) */}
                    {hasCulqiConfigured && (
                      <button
                        type="button"
                        onClick={() => setMetodoPago('CULQI')}
                        className={`col-span-2 py-1.5 px-3 rounded-[6px] border text-left font-medium transition-colors flex items-center justify-between ${
                          metodoPago === 'CULQI'
                            ? 'border-[#16201C] bg-[#16201C] text-white'
                            : 'border-[#E7E5DF] bg-white text-[#16201C] hover:border-[#6B7A72]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <CreditCard size={14} />
                          <span>Tarjeta con Culqi Online</span>
                        </span>
                        <span className="text-[10px] uppercase font-sans px-1 rounded bg-[#E8A33D]/20 text-[#16201C]">
                          Activo
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ===== CONTROL DE EFECTIVO RÁPIDO Y VUELTO ===== */}
                {metodoPago === 'EFECTIVO' && (
                  <div className="p-3 bg-white border border-[#E7E5DF] rounded-[6px] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Banknote size={14} className="text-[#2E7D32]" />
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">
                          Cliente paga con (S/)
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMontoRecibido(total.toFixed(2))}
                        className="text-[11px] font-bold text-[#16201C] hover:underline cursor-pointer"
                      >
                        Monto Exacto
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-sans text-[#6B7A72]">
                          S/
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={montoRecibido}
                          onChange={(e) => setMontoRecibido(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-1.5 text-[14px] font-sans font-bold text-[#16201C] border border-[#E7E5DF] rounded-[5px] focus:outline-none focus:border-[#16201C]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setMontoRecibido(total.toFixed(2))}
                        className="px-2.5 py-1.5 text-[12px] font-semibold bg-[#FAFAF7] hover:bg-[#E7E5DF] border border-[#E7E5DF] rounded-[5px] transition-colors"
                      >
                        Exacto
                      </button>
                    </div>

                    {/* Botones de Efectivo Rápido con Billetes Oficiales */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[10, 20, 50, 100, 200].map((billete) => (
                        <button
                          key={billete}
                          type="button"
                          onClick={() => setMontoRecibido(billete.toString())}
                          className="py-1 px-1.5 text-center text-[11px] font-sans font-bold bg-[#FAFAF7] hover:bg-[#16201C] hover:text-white border border-[#E7E5DF] rounded-[4px] transition-colors cursor-pointer"
                        >
                          S/ {billete}
                        </button>
                      ))}
                    </div>

                    {/* Vuelto dinámico en vivo */}
                    {recibidoNum > 0 && (
                      <div className="pt-1">
                        {recibidoNum >= total ? (
                          <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-bold flex items-center justify-between">
                            <span>Vuelto a entregar:</span>
                            <span className="font-sans text-[14px]">S/ {vuelto.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[12px] font-semibold flex items-center justify-between">
                            <span>Falta cobrar:</span>
                            <span className="font-sans text-[13px]">S/ {falta.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Totales */}
                <div className="pt-2 border-t border-[#E7E5DF] space-y-1">
                  <div className="flex justify-between text-[12px] text-[#6B7A72]">
                    <span>Subtotal Imponible:</span>
                    <span className="font-sans tabular-nums">S/ {(total / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[12px] text-[#6B7A72]">
                    <span>IGV (18%):</span>
                    <span className="font-sans tabular-nums">
                      S/ {(total - total / 1.18).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[16px] font-bold text-[#16201C] pt-1 border-t border-[#E7E5DF]">
                    <span>Total a Pagar:</span>
                    <span className="font-sans tabular-nums">S/ {total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Botón Cobrar */}
                <button
                  type="button"
                  onClick={handleCobrar}
                  disabled={isSubmitting || carrito.length === 0}
                  className="w-full py-2.5 px-4 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-40 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Procesando venta en servidor...</span>
                    </>
                  ) : (
                    <span>Registrar Venta (S/ {total.toFixed(2)})</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== MODAL 1: ESCÁNER DE CÁMARA PARA CELULARES ===== */}
      <PosCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScan={buscarYAgregarPorCodigo}
      />

      {/* ===== MODAL 2: ARQUEO DE CAJA Y CIERRE DE TURNO ===== */}
      <PosArqueoCajaModal
        isOpen={isArqueoOpen}
        onClose={() => setIsArqueoOpen(false)}
        resumenCaja={resumenCaja}
        isLoadingResumen={isLoadingResumen}
        onError={(msg) => setErrorMsg(msg)}
      />
    </div>
  )
}
