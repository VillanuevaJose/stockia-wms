'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
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
  X,
  Calculator,
  Banknote,
} from '../ui/icons'
import {
  buscarProductosParaVentaAction,
  registrarVentaAction,
  obtenerResumenCajaTurnoAction,
  registrarArqueoCajaAction,
  type VentaResult,
  type ResumenCaja,
} from '../../lib/actions/ventas'

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
}

export function PuntoDeVenta({
  hasCulqiConfigured = false,
  initialProductos = [],
  sedeNombre = null,
}: Props) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductoItem[]>([])
  const [carrito, setCarrito] = useState<CartItem[]>([])
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CULQI'>('EFECTIVO')
  const [montoRecibido, setMontoRecibido] = useState<string>('')
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null)

  // Modales de Cámara y Arqueo
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)

  const [isArqueoOpen, setIsArqueoOpen] = useState(false)
  const [resumenCaja, setResumenCaja] = useState<ResumenCaja | null>(null)
  const [isLoadingResumen, startResumenTransition] = useTransition()
  const [efectivoContado, setEfectivoContado] = useState<string>('')
  const [notasArqueo, setNotasArqueo] = useState<string>('')
  const [arqueoResultado, setArqueoResultado] = useState<string | null>(null)

  const [isSearching, startSearch] = useTransition()
  const [isSubmitting, startSubmit] = useTransition()
  const [isSubmittingArqueo, startSubmitArqueo] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [ventaExitosa, setVentaExitosa] = useState<(VentaResult & { vuelto?: number }) | null>(null)

  const catalogo = query.trim() ? searchResults : initialProductos

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
        const resultados = await buscarProductosParaVentaAction(query)
        setSearchResults(resultados)
      })
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

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
      const dbResult = await buscarProductosParaVentaAction(codigo.trim())
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
  }, [catalogo])

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

  // ===== 2. LECTOR CON CÁMARA DE CELULAR (MODAL STREAM) =====
  useEffect(() => {
    let active = true
    let intervalId: NodeJS.Timeout | null = null

    if (isCameraOpen) {
      navigator.mediaDevices
        ?.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        })
        .then((stream) => {
          if (!active) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          mediaStreamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play().catch(() => {})
          }

          if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
            const detector = new (window as unknown as { BarcodeDetector: new (opts: unknown) => { detect: (el: unknown) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
            })

            intervalId = setInterval(async () => {
              if (
                videoRef.current &&
                videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
              ) {
                try {
                  const codes = await detector.detect(videoRef.current)
                  if (codes && codes.length > 0) {
                    const rawValue = codes[0].rawValue
                    if (rawValue) {
                      buscarYAgregarPorCodigo(rawValue)
                      setIsCameraOpen(false)
                    }
                  }
                } catch {
                  // Frame capture skip
                }
              }
            }, 350)
          }
        })
        .catch((err) => {
          setCameraError(
            'No se pudo acceder a la cámara. Concede permisos de video en el navegador o usa la pistola de barras.'
          )
          console.warn('Camera error:', err)
        })
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
      if (intervalId) clearInterval(intervalId)
    }

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [isCameraOpen, buscarYAgregarPorCodigo])

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
      const culqiChargeId =
        metodoPago === 'CULQI' ? `chr_test_${Date.now().toString().slice(-8)}` : undefined

      const res = await registrarVentaAction({
        metodo_pago: metodoPago,
        items: carrito.map((i) => ({ producto_id: i.id, cantidad: i.cantidad })),
        culqi_charge_id: culqiChargeId,
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
    setArqueoResultado(null)
    setIsArqueoOpen(true)
    startResumenTransition(async () => {
      const data = await obtenerResumenCajaTurnoAction()
      setResumenCaja(data)
    })
  }

  const handleGuardarArqueo = () => {
    if (!resumenCaja) return
    const contado = parseFloat(efectivoContado)
    if (isNaN(contado) || contado < 0) {
      setErrorMsg('Ingresa un monto válido de efectivo contado en caja.')
      return
    }

    startSubmitArqueo(async () => {
      const res = await registrarArqueoCajaAction({
        monto_esperado: resumenCaja.totalEfectivo,
        monto_contado: contado,
        notas: notasArqueo,
      })

      if (res.success) {
        setArqueoResultado(res.mensaje || 'Arqueo de caja registrado correctamente.')
      } else {
        setErrorMsg(res.error || 'Error al guardar arqueo.')
      }
    })
  }

  const contadoNum = parseFloat(efectivoContado) || 0
  const esperadoNum = resumenCaja?.totalEfectivo || 0
  const diferenciaArqueo = Math.round((contadoNum - esperadoNum) * 100) / 100

  return (
    <div className="relative">
      {/* Barra de Atajos Rápidos Superior */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-white border border-[#E7E5DF] rounded-[8px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-pulse" />
          <span className="text-[13px] font-semibold text-[#16201C]">
            Lector de Código de Barras Activo
          </span>
          <span className="hidden sm:inline-block text-[11px] text-[#6B7A72] font-mono bg-[#FAFAF7] px-2 py-0.5 rounded border border-[#E7E5DF]">
            Pistola USB / Bluetooth lista
          </span>
          {sedeNombre && (
            <span className="hidden md:inline-block text-[11px] text-[#2E7D32] bg-[#E8F5E9] font-medium px-2 py-0.5 rounded border border-[#C8E6C9]">
              {sedeNombre}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Lector con Cámara de Celular */}
          <button
            type="button"
            onClick={() => {
              setCameraError(null)
              setIsCameraOpen(true)
            }}
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

      {/* Banner de Feedback al Escanear */}
      {scannedFeedback && (
        <div className="mb-4 p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] font-medium flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{scannedFeedback}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700">+1 en carrito</span>
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
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">
                Catálogo de Artículos Disponibles
              </span>
              <span className="text-[11px] font-mono text-[#6B7A72]">
                {catalogo.length} artículos
              </span>
            </div>

            <div className="divide-y divide-[#E7E5DF] max-h-[520px] overflow-y-auto">
              {catalogo.length === 0 ? (
                <div className="p-10 text-center text-[#6B7A72]">
                  <Barcode size={32} className="mx-auto mb-2 text-[#6B7A72]/40" />
                  <p className="text-[13px] font-medium text-[#16201C]">
                    {query
                      ? 'No se encontraron artículos con ese criterio'
                      : 'No hay productos registrados en el almacén'}
                  </p>
                  <p className="text-[12px] text-[#6B7A72] mt-0.5">
                    {query
                      ? 'Verifica el código de barras o término buscado.'
                      : 'Crea tu primer producto desde el módulo de Productos.'}
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
                          <span className="font-mono text-[11px] text-[#6B7A72]">{prod.sku}</span>
                          {prod.codigo_barras && (
                            <span className="font-mono text-[10px] text-[#6B7A72]/80 bg-[#FAFAF7] border border-[#E7E5DF] px-1 rounded-[3px]">
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
                          <div className="text-[14px] font-bold font-mono text-[#16201C] tabular-nums">
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
            <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
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
            <div className="p-6 my-auto text-center space-y-4 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto border border-[#C8E6C9]">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="text-[18px] font-bold text-[#16201C]">¡Venta Registrada con Éxito!</h4>
                <p className="text-[13px] text-[#6B7A72] mt-1">
                  Comprobante N°{' '}
                  <span className="font-mono font-bold text-[#16201C]">
                    {ventaExitosa.numero_comprobante}
                  </span>
                </p>
                <div className="text-[28px] font-bold font-mono text-[#16201C] tabular-nums mt-3">
                  S/ {Number(ventaExitosa.total || 0).toFixed(2)}
                </div>

                {ventaExitosa.vuelto !== undefined && (
                  <div className="mt-3 inline-block text-[13px] font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-[6px] border border-emerald-200">
                    Vuelto Entregado: S/ {ventaExitosa.vuelto.toFixed(2)}
                  </div>
                )}

                {metodoPago === 'CULQI' && (
                  <div className="mt-2 inline-block text-[11px] font-mono font-medium text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-1 rounded-[4px] border border-[#C8E6C9]">
                    Transacción Aprobada vía Culqi Gateway
                  </div>
                )}
              </div>
              <p className="text-[12px] text-[#6B7A72]">
                El stock se ha descontado automáticamente de la base de datos y se registró la salida en el Kardex.
              </p>
              <button
                type="button"
                onClick={nuevaVenta}
                className="w-full py-2.5 px-4 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer"
              >
                Iniciar Nueva Venta
              </button>
            </div>
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
                        <span className="font-mono text-[11px] text-[#6B7A72]">
                          S/ {item.precio.toFixed(2)} c/u
                        </span>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.id, -1)}
                          className="w-6 h-6 rounded-[4px] border border-[#E7E5DF] flex items-center justify-center text-[#16201C] hover:bg-[#FAFAF7]"
                        >
                          -
                        </button>
                        <span className="font-mono text-[12px] font-bold tabular-nums w-7 text-center">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.id, 1)}
                          className="w-6 h-6 rounded-[4px] border border-[#E7E5DF] flex items-center justify-center text-[#16201C] hover:bg-[#FAFAF7]"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right pl-2">
                        <span className="font-mono text-[13px] font-bold text-[#16201C] tabular-nums">
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
                        <span className="text-[10px] uppercase font-mono px-1 rounded bg-[#E8A33D]/20 text-[#16201C]">
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
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] font-mono text-[#6B7A72]">
                          S/
                        </span>
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          value={montoRecibido}
                          onChange={(e) => setMontoRecibido(e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-7 pr-3 py-1.5 text-[14px] font-mono font-bold text-[#16201C] border border-[#E7E5DF] rounded-[5px] focus:outline-none focus:border-[#16201C]"
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

                    {/* Botones de Efectivo Rápido */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[5, 10, 20, 50, 100].map((billete) => (
                        <button
                          key={billete}
                          type="button"
                          onClick={() => setMontoRecibido(billete.toString())}
                          className="py-1 px-1.5 text-center text-[11px] font-mono font-bold bg-[#FAFAF7] hover:bg-[#16201C] hover:text-white border border-[#E7E5DF] rounded-[4px] transition-colors cursor-pointer"
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
                            <span className="font-mono text-[14px]">S/ {vuelto.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[12px] font-semibold flex items-center justify-between">
                            <span>Falta cobrar:</span>
                            <span className="font-mono text-[13px]">S/ {falta.toFixed(2)}</span>
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
                    <span className="font-mono tabular-nums">S/ {(total / 1.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[12px] text-[#6B7A72]">
                    <span>IGV (18%):</span>
                    <span className="font-mono tabular-nums">
                      S/ {(total - total / 1.18).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[16px] font-bold text-[#16201C] pt-1 border-t border-[#E7E5DF]">
                    <span>Total a Pagar:</span>
                    <span className="font-mono tabular-nums">S/ {total.toFixed(2)}</span>
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
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-[10px] max-w-md w-full overflow-hidden border border-[#E7E5DF] shadow-2xl">
            <div className="p-4 bg-[#16201C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={16} />
                <h4 className="text-[14px] font-bold">Lector Óptico de Código de Barras</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                className="text-gray-300 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="relative bg-black rounded-[8px] overflow-hidden aspect-4/3 flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Mira óptica de escaneo */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-32 border-2 border-emerald-400 rounded-[6px] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500 animate-pulse" />
                  </div>
                  <span className="text-white text-[11px] font-mono mt-3 bg-black/60 px-2 py-0.5 rounded">
                    Apunta la cámara a la etiqueta del producto
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-[6px]">
                  {cameraError}
                </div>
              )}

              {/* Opción alternativa: ingresar código a mano si la cámara falla */}
              <div className="pt-2 border-t border-[#E7E5DF]">
                <label className="block text-[11px] text-[#6B7A72] font-semibold mb-1 uppercase">
                  O escribe el código de barras manualmente:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="manual-barcode-input"
                    placeholder="Ej. 7750123456789"
                    className="flex-1 px-3 py-1.5 text-[13px] border border-[#E7E5DF] rounded-[6px] focus:outline-none focus:border-[#16201C]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value
                        if (val) {
                          buscarYAgregarPorCodigo(val)
                          setIsCameraOpen(false)
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById(
                        'manual-barcode-input'
                      ) as HTMLInputElement | null
                      if (input?.value) {
                        buscarYAgregarPorCodigo(input.value)
                        setIsCameraOpen(false)
                      }
                    }}
                    className="px-3 py-1.5 bg-[#16201C] text-white text-[12px] font-medium rounded-[6px]"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#FAFAF7] border-t border-[#E7E5DF] flex justify-end">
              <button
                type="button"
                onClick={() => setIsCameraOpen(false)}
                className="px-4 py-1.5 text-[13px] text-[#16201C] hover:bg-[#E7E5DF] rounded-[6px] font-medium transition-colors"
              >
                Cerrar Cámara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: ARQUEO DE CAJA Y CIERRE DE TURNO ===== */}
      {isArqueoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[10px] max-w-lg w-full overflow-hidden border border-[#E7E5DF] shadow-2xl">
            <div className="p-4 bg-[#16201C] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator size={18} />
                <h4 className="text-[15px] font-bold">Arqueo de Caja y Cierre de Turno</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsArqueoOpen(false)}
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
                      <span className="text-[20px] font-bold font-mono text-[#16201C] tabular-nums">
                        S/ {resumenCaja?.totalEfectivo.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-[#6B7A72] font-semibold block">
                        Ventas Digitales (Yape/Culqi)
                      </span>
                      <span className="text-[20px] font-bold font-mono text-[#2E7D32] tabular-nums">
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
                      step="0.50"
                      min="0"
                      value={efectivoContado}
                      onChange={(e) => setEfectivoContado(e.target.value)}
                      placeholder="Ingresa el monto contado..."
                      className="w-full px-3.5 py-2 text-[16px] font-mono font-bold border border-[#E7E5DF] rounded-[6px] focus:outline-none focus:border-[#16201C]"
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
                          <span className="font-mono text-[14px]">
                            - S/ {Math.abs(diferenciaArqueo).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-[6px] text-[13px] font-bold flex items-center justify-between">
                          <span>Sobrante en caja:</span>
                          <span className="font-mono text-[14px]">
                            + S/ {diferenciaArqueo.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notas u observaciones */}
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
                onClick={() => setIsArqueoOpen(false)}
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
      )}
    </div>
  )
}
