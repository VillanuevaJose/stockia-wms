'use client'

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Link from 'next/link'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Plus,
  SlidersHorizontal,
  X,
} from '../ui/icons'
import { DashboardWidgetRenderer } from './DashboardWidgets'
import {
  WIDGET_CATALOG,
  getDefaultLayoutForRole,
  type DashboardDataPayload,
  type WidgetColSpan,
  type WidgetConfigItem,
  type WidgetType,
} from './types'

interface InteractiveDashboardGridProps {
  data: DashboardDataPayload
  fechaCapitalizada: string
}

interface ActiveDragState {
  id: string
  widget: WidgetConfigItem
  startX: number
  startY: number
  currentX: number
  currentY: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  activated: boolean
}

interface ActiveResizeState {
  id: string
  startX: number
  startY: number
  initialCardWidth: number
  gridWidth: number
  initialColSpan: WidgetColSpan
  currentColSpan: WidgetColSpan
  allowedSpans: WidgetColSpan[]
  hasDragged: boolean
}

type PresetProfile = 'admin' | 'almacenero' | 'vendedor'

const LAYOUT_EVENT = 'stockia-dashboard-layout-change'

const COL_SPAN_CLASSES: Record<WidgetColSpan, string> = {
  3: 'md:col-span-3 lg:col-span-3',
  4: 'md:col-span-3 lg:col-span-4',
  6: 'md:col-span-6 lg:col-span-6',
  8: 'md:col-span-6 lg:col-span-8',
  12: 'md:col-span-6 lg:col-span-12',
}

const SPAN_LABELS: Record<WidgetColSpan, string> = {
  3: '1/4',
  4: '1/3',
  6: '1/2',
  8: '2/3',
  12: 'Ancho',
}

const PRESET_TABS: { key: PresetProfile; label: string }[] = [
  { key: 'admin', label: 'Ejecutivo' },
  { key: 'almacenero', label: 'Almacén' },
  { key: 'vendedor', label: 'Ventas' },
]

function subscribeLayoutStore(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(LAYOUT_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(LAYOUT_EVENT, callback)
  }
}

function saveLayoutToStorage(storageKey: string, layout: WidgetConfigItem[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(layout))
    window.dispatchEvent(new Event(LAYOUT_EVENT))
  } catch {
    // Silenciar errores de cuota en navegadores restringidos
  }
}

function snapClosestSpan(targetCols: number, allowed: WidgetColSpan[]): WidgetColSpan {
  let closest = allowed[0]
  let minDiff = Math.abs(targetCols - closest)
  for (const span of allowed) {
    const diff = Math.abs(targetCols - span)
    if (diff < minDiff) {
      minDiff = diff
      closest = span
    }
  }
  return closest
}

function CornerResizeIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 9v5H9" />
      <path d="M9 9l5 5" />
      <path d="M7 2H2v5" />
      <path d="M2 2l5 5" />
    </svg>
  )
}

export function InteractiveDashboardGrid({
  data,
  fechaCapitalizada,
}: InteractiveDashboardGridProps) {
  const { userContext } = data
  const storageKey = `stockia:dashboard:v1:${userContext.userId}`

  const defaultLayout = useMemo(
    () => getDefaultLayoutForRole(userContext.rol),
    [userContext.rol]
  )
  const defaultSerialized = useMemo(() => JSON.stringify(defaultLayout), [defaultLayout])

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) ?? defaultSerialized
    } catch {
      return defaultSerialized
    }
  }, [storageKey, defaultSerialized])

  const getServerSnapshot = useCallback(() => defaultSerialized, [defaultSerialized])

  const layoutSerialized = useSyncExternalStore(
    subscribeLayoutStore,
    getSnapshot,
    getServerSnapshot
  )

  const layout = useMemo<WidgetConfigItem[]>(() => {
    try {
      const parsed = JSON.parse(layoutSerialized)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (item): item is WidgetConfigItem =>
            typeof item?.id === 'string' &&
            typeof item?.type === 'string' &&
            WIDGET_CATALOG.some((cat) => cat.type === item.type)
        )
      }
    } catch {
      // Fallback al layout por defecto si el JSON almacenado está corrupto
    }
    return defaultLayout
  }, [layoutSerialized, defaultLayout])

  const [isEditing, setIsEditing] = useState(false)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [catalogFilter, setCatalogFilter] = useState<'Todos' | 'KPIs' | 'Gráficos' | 'Operación'>('Todos')
  const [activePreset, setActivePreset] = useState<PresetProfile | null>(userContext.rol)
  const [dragState, setDragState] = useState<ActiveDragState | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [resizeState, setResizeState] = useState<ActiveResizeState | null>(null)

  const dragSessionRef = useRef<{
    id: string
    startX: number
    startY: number
    activated: boolean
    overId: string | null
  } | null>(null)

  const resizeSessionRef = useRef<ActiveResizeState | null>(null)

  const dragActiveId = dragState?.id ?? null
  const resizeActiveId = resizeState?.id ?? null

  const gridContainerRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map())
  const prevRectsRef = useRef<Map<string, DOMRect>>(new Map())

  const setCardRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      cardRefs.current.set(id, el)
    } else {
      cardRefs.current.delete(id)
    }
  }, [])

  const capturePositions = useCallback(() => {
    const rects = new Map<string, DOMRect>()
    cardRefs.current.forEach((el, id) => {
      rects.set(id, el.getBoundingClientRect())
    })
    prevRectsRef.current = rects
  }, [])

  // Motor FLIP (First, Last, Invert, Play) para deslizar widgets suavemente en cualquier cambio de grid
  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current
    if (prevRects.size === 0) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      prevRects.clear()
      return
    }

    const animatedElements: HTMLElement[] = []
    cardRefs.current.forEach((el, id) => {
      const prev = prevRects.get(id)
      if (!prev) return
      const next = el.getBoundingClientRect()
      const dx = prev.left - next.left
      const dy = prev.top - next.top

      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return

      el.style.transition = 'none'
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`
      animatedElements.push(el)
    })

    prevRects.clear()
    if (animatedElements.length === 0) return

    // Forzar reflow una sola vez para aplicar el estado inicial invertido antes de animar
    void document.body.offsetHeight

    requestAnimationFrame(() => {
      animatedElements.forEach((el) => {
        el.style.transition = 'transform 260ms cubic-bezier(0.23, 1, 0.32, 1)'
        el.style.transform = ''
        el.addEventListener(
          'transitionend',
          () => {
            el.style.transition = ''
          },
          { once: true }
        )
      })
    })
  }, [layout])

  const activeTypes = useMemo(() => new Set(layout.map((w) => w.type)), [layout])

  const commitLayout = useCallback(
    (nextLayout: WidgetConfigItem[], preset: PresetProfile | null = null) => {
      capturePositions()
      setActivePreset(preset)
      saveLayoutToStorage(storageKey, nextLayout)
    },
    [capturePositions, storageKey]
  )

  const handleMoveWidget = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= layout.length) return
    const next = [...layout]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    commitLayout(next)
  }

  const handleResizeWidget = useCallback(
    (id: string, colSpan: WidgetColSpan) => {
      const next = layout.map((w) => (w.id === id ? { ...w, colSpan } : w))
      commitLayout(next)
    },
    [layout, commitLayout]
  )

  const handleRemoveWidget = (id: string) => {
    const next = layout.filter((w) => w.id !== id)
    commitLayout(next)
  }

  const handleAddWidget = (type: WidgetType) => {
    const meta = WIDGET_CATALOG.find((c) => c.type === type)
    if (!meta || activeTypes.has(type)) return
    const next: WidgetConfigItem[] = [
      ...layout,
      {
        id: `w-${type}`,
        type,
        colSpan: meta.defaultSpan,
      },
    ]
    commitLayout(next)
  }

  const handleApplyPreset = (preset: PresetProfile) => {
    commitLayout(getDefaultLayoutForRole(preset), preset)
  }

  // Seguimiento global de puntero para arrastre con inclinación física y swap (sin re-registrar listeners)
  useEffect(() => {
    if (!dragActiveId) return

    const handlePointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current
      if (!session) return

      const dist = Math.hypot(e.clientX - session.startX, e.clientY - session.startY)
      const shouldActivate = session.activated || dist > 5

      if (shouldActivate && !session.activated) {
        session.activated = true
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
      }

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              activated: shouldActivate,
            }
          : null
      )

      if (shouldActivate) {
        let foundOver: string | null = null
        cardRefs.current.forEach((el, id) => {
          if (id === session.id) return
          const rect = el.getBoundingClientRect()
          if (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            foundOver = id
          }
        })
        if (foundOver !== session.overId) {
          session.overId = foundOver
          setDragOverId(foundOver)
        }
      }
    }

    const handlePointerUp = () => {
      const session = dragSessionRef.current
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      if (session?.activated && session.overId && session.overId !== session.id) {
        const fromIdx = layout.findIndex((w) => w.id === session.id)
        const toIdx = layout.findIndex((w) => w.id === session.overId)
        if (fromIdx !== -1 && toIdx !== -1) {
          const next = [...layout]
          const temp = next[fromIdx]
          next[fromIdx] = next[toIdx]
          next[toIdx] = temp
          commitLayout(next)
        }
      }

      dragSessionRef.current = null
      setDragState(null)
      setDragOverId(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragActiveId, layout, commitLayout])

  // Seguimiento global de puntero para redimensión en esquina inferior derecha (grid-snap en vivo)
  useEffect(() => {
    if (!resizeActiveId) return

    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'nwse-resize'

    const handlePointerMove = (e: PointerEvent) => {
      const session = resizeSessionRef.current
      if (!session) return

      const deltaX = e.clientX - session.startX
      const deltaY = e.clientY - session.startY
      const moved = session.hasDragged || Math.hypot(deltaX, deltaY) > 4

      if (!moved) return
      session.hasDragged = true

      const projectedWidth = session.initialCardWidth + deltaX
      const rawCols = Math.max(
        1,
        Math.min(12, Math.round((projectedWidth / Math.max(session.gridWidth, 300)) * 12))
      )
      const snapped = snapClosestSpan(rawCols, session.allowedSpans)

      if (snapped !== session.currentColSpan) {
        session.currentColSpan = snapped
        handleResizeWidget(session.id, snapped)
        setResizeState((prev) =>
          prev ? { ...prev, currentColSpan: snapped, hasDragged: true } : null
        )
      }
    }

    const handlePointerUp = () => {
      const session = resizeSessionRef.current
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      // Si solo fue un clic rápido en la esquina sin arrastrar, rota al siguiente ancho permitido
      if (session && !session.hasDragged && session.allowedSpans.length > 1) {
        const idx = session.allowedSpans.indexOf(session.currentColSpan)
        const nextSpan = session.allowedSpans[(idx + 1) % session.allowedSpans.length]
        handleResizeWidget(session.id, nextSpan)
      }

      resizeSessionRef.current = null
      setResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [resizeActiveId, handleResizeWidget])

  const filteredCatalog = useMemo(() => {
    if (catalogFilter === 'Todos') return WIDGET_CATALOG
    return WIDGET_CATALOG.filter((entry) => entry.category === catalogFilter)
  }, [catalogFilter])

  return (
    <div className="space-y-6 ops-fade-in font-sans">
      {/* Encabezado Editorial */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-[#E7E5DF] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-[1.15] text-[#16201C]">
            Libro Diario de Almacén
          </h1>
          <p className="text-[13px] text-[#6B7A72] mt-1 font-medium">
            {fechaCapitalizada} · {userContext.sedeNombre}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/movimientos"
            className="text-[13px] text-[#6B7A72] hover:text-[#16201C] underline-offset-4 hover:underline transition-colors font-medium"
          >
            Kardex general
          </Link>
          <span className="text-[#E7E5DF]" aria-hidden="true">/</span>
          <Link
            href="/admin/productos"
            className="text-[13px] font-semibold text-[#16201C] underline-offset-4 hover:underline transition-colors"
          >
            Catálogo completo
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsEditing((prev) => !prev)
              if (isEditing) setIsCatalogOpen(false)
            }}
            aria-pressed={isEditing}
            className={`ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[6px] border transition-colors ${
              isEditing
                ? 'bg-[#16201C] text-[#FAFAF7] border-[#16201C]'
                : 'bg-white text-[#16201C] border-[#E7E5DF] hover:bg-[#F4F3EF]'
            }`}
          >
            {isEditing ? (
              <>
                <Check size={14} />
                Finalizar edición
              </>
            ) : (
              <>
                <SlidersHorizontal size={14} />
                Personalizar tablero
              </>
            )}
          </button>
        </div>
      </div>

      {/* Barra de Herramientas y Presets en 1 clic */}
      {isEditing && (
        <div
          role="region"
          aria-label="Controles de personalización del tablero"
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-[#FAFAF7] border border-[#E8A33D] rounded-[8px] px-4 py-3"
        >
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-[#16201C]">
            <LayoutDashboard size={16} className="text-[#C97D1A] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Modo edición:</strong> Arrastra cualquier tarjeta para intercambiarla o tira de su esquina inferior derecha para cambiar el tamaño.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Pestañas de Presets con transición FLIP */}
            <div
              role="group"
              aria-label="Plantillas rápidas de tablero"
              className="inline-flex items-center p-0.5 rounded-[6px] bg-[#EFECE5] border border-[#E7E5DF]"
            >
              {PRESET_TABS.map((tab) => {
                const isActive = activePreset === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleApplyPreset(tab.key)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-[4px] transition-all duration-150 ${
                      isActive
                        ? 'bg-white text-[#16201C] shadow-xs'
                        : 'text-[#6B7A72] hover:text-[#16201C]'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsCatalogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px] hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              Agregar widgets
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(userContext.rol)}
              className="px-3 py-1.5 text-xs font-semibold bg-white text-[#16201C] border border-[#E7E5DF] rounded-[6px] hover:bg-[#F4F3EF] transition-colors"
            >
              Restablecer
            </button>
          </div>
        </div>
      )}

      {/* Parrilla Modular de 12 Columnas */}
      {layout.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E7E5DF] rounded-[8px] p-12 text-center space-y-3">
          <LayoutDashboard size={28} className="mx-auto text-[#6B7A72]" />
          <h2 className="text-base font-bold text-[#16201C]">Tu tablero está vacío</h2>
          <p className="text-xs text-[#6B7A72] max-w-md mx-auto">
            Agrega widgets desde el catálogo o restablece la configuración predeterminada para tu perfil.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true)
                setIsCatalogOpen(true)
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px]"
            >
              Explorar widgets
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(userContext.rol)}
              className="px-3.5 py-2 text-xs font-semibold bg-white text-[#16201C] border border-[#E7E5DF] rounded-[6px]"
            >
              Restaurar vista por defecto
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={gridContainerRef}
          className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 items-stretch"
        >
          {layout.map((widget, index) => {
            const meta = WIDGET_CATALOG.find((c) => c.type === widget.type)
            const spanClass = COL_SPAN_CLASSES[widget.colSpan] || COL_SPAN_CLASSES[6]
            const isBeingDragged = dragState?.id === widget.id && dragState.activated
            const isDropTarget =
              dragState?.activated && dragOverId === widget.id && dragState.id !== widget.id
            const isResizing = resizeState?.id === widget.id

            return (
              <section
                key={widget.id}
                ref={(el) => setCardRef(widget.id, el)}
                aria-label={meta?.title || 'Widget de tablero'}
                onPointerDown={(e) => {
                  if (!isEditing || e.button !== 0) return
                  const target = e.target as HTMLElement
                  if (target.closest('button, a, input, select, [data-no-drag="true"]')) {
                    return
                  }
                  const rect = e.currentTarget.getBoundingClientRect()
                  dragSessionRef.current = {
                    id: widget.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    activated: false,
                    overId: null,
                  }
                  setDragState({
                    id: widget.id,
                    widget,
                    startX: e.clientX,
                    startY: e.clientY,
                    currentX: e.clientX,
                    currentY: e.clientY,
                    offsetX: e.clientX - rect.left,
                    offsetY: e.clientY - rect.top,
                    width: rect.width,
                    height: rect.height,
                    activated: false,
                  })
                }}
                className={`${spanClass} relative rounded-[8px] border flex flex-col transition-[border-color,box-shadow,background-color,opacity] duration-150 ${
                  isEditing ? 'select-none' : 'select-auto'
                } ${
                  isBeingDragged
                    ? 'opacity-35 border-dashed border-[#E8A33D] bg-[#F8F1E5]/35'
                    : isDropTarget
                      ? 'bg-[#FAFAF7] border-[#E8A33D] ring-2 ring-[#E8A33D]/30 scale-[0.985]'
                      : isResizing
                        ? 'bg-white border-[#16201C] ring-2 ring-[#E8A33D]/35'
                        : isEditing
                          ? 'bg-white border-[#D5D1C8] cursor-grab hover:border-[#B9B3A7]'
                          : 'bg-white border-[#E7E5DF]'
                }`}
              >
                {/* Controles de edición en cabecera de tarjeta */}
                {isEditing && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#FAFAF7] border-b border-[#E7E5DF] rounded-t-[8px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.04em] truncate">
                        {meta?.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {meta && meta.allowedSpans.length > 1 && (
                        <div
                          data-no-drag="true"
                          className="hidden sm:flex items-center border border-[#E7E5DF] rounded-[6px] bg-white overflow-hidden mr-1"
                        >
                          {meta.allowedSpans.map((span) => (
                            <button
                              key={span}
                              type="button"
                              onClick={() => handleResizeWidget(widget.id, span)}
                              aria-label={`Ajustar ancho a ${SPAN_LABELS[span]}`}
                              className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                                widget.colSpan === span
                                  ? 'bg-[#16201C] text-[#FAFAF7]'
                                  : 'text-[#6B7A72] hover:text-[#16201C]'
                              }`}
                            >
                              {SPAN_LABELS[span]}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleMoveWidget(index, -1)}
                        disabled={index === 0}
                        aria-label={`Mover ${meta?.title} hacia atrás`}
                        className="p-1 text-[#6B7A72] hover:text-[#16201C] disabled:opacity-30 rounded-[4px] hover:bg-[#E7E5DF]/50"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveWidget(index, 1)}
                        disabled={index === layout.length - 1}
                        aria-label={`Mover ${meta?.title} hacia adelante`}
                        className="p-1 text-[#6B7A72] hover:text-[#16201C] disabled:opacity-30 rounded-[4px] hover:bg-[#E7E5DF]/50"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveWidget(widget.id)}
                        aria-label={`Ocultar ${meta?.title}`}
                        className="p-1 text-[#C93B3B] hover:bg-[#C93B3B]/10 rounded-[4px]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <div className={`p-5 flex-1 ${isEditing ? 'pointer-events-none' : ''}`}>
                  <DashboardWidgetRenderer type={widget.type} data={data} />
                </div>

                {/* Asa de Redimensión Directa en la Esquina Inferior Derecha (inspirada en el reel) */}
                {isEditing && meta && meta.allowedSpans.length > 1 && (
                  <button
                    type="button"
                    data-no-drag="true"
                    aria-label={`Redimensionar ${meta.title} (actual: ${SPAN_LABELS[widget.colSpan]})`}
                    title="Arrastra para cambiar el tamaño o haz clic para alternar"
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      if (e.button !== 0) return
                      const cardEl = cardRefs.current.get(widget.id)
                      const cardWidth = cardEl?.getBoundingClientRect().width || 300
                      const gridWidth = gridContainerRef.current?.getBoundingClientRect().width || 1100
                      const nextResize: ActiveResizeState = {
                        id: widget.id,
                        startX: e.clientX,
                        startY: e.clientY,
                        initialCardWidth: cardWidth,
                        gridWidth,
                        initialColSpan: widget.colSpan,
                        currentColSpan: widget.colSpan,
                        allowedSpans: meta.allowedSpans,
                        hasDragged: false,
                      }
                      resizeSessionRef.current = nextResize
                      setResizeState(nextResize)
                    }}
                    className={`hidden md:flex absolute bottom-2 right-2 z-10 w-6 h-6 items-center justify-center rounded-[5px] border transition-colors cursor-nwse-resize ${
                      isResizing
                        ? 'bg-[#16201C] text-[#FAFAF7] border-[#16201C]'
                        : 'bg-[#FAFAF7] text-[#6B7A72] border-[#E7E5DF] hover:bg-[#16201C] hover:text-[#FAFAF7] hover:border-[#16201C]'
                    }`}
                  >
                    <CornerResizeIcon />
                  </button>
                )}

                {/* Indicador flotante de ancho proyectado mientras se redimensiona */}
                {isResizing && (
                  <div className="absolute bottom-2.5 right-10 z-20 px-2 py-0.5 text-[11px] font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[4px] pointer-events-none tabular-nums">
                    Ancho: {SPAN_LABELS[widget.colSpan]}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* Overlay Flotante del Widget Levantado con Inclinación Física (-2.2deg) */}
      {dragState && dragState.activated && (
        <div
          aria-hidden="true"
          style={{
            left: dragState.currentX - dragState.offsetX,
            top: dragState.currentY - dragState.offsetY,
            width: dragState.width,
            height: dragState.height,
            transform: 'rotate(-2.2deg) scale(1.015)',
          }}
          className="fixed z-50 pointer-events-none bg-white rounded-[8px] border-2 border-[#E8A33D] shadow-[0_20px_45px_-12px_rgba(22,32,28,0.28)] flex flex-col overflow-hidden transition-transform duration-75 motion-reduce:transform-none"
        >
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#FAFAF7] border-b border-[#E7E5DF]">
            <span className="text-[11px] font-semibold text-[#16201C] uppercase tracking-[0.04em]">
              {WIDGET_CATALOG.find((c) => c.type === dragState.widget.type)?.title}
            </span>
            <span className="text-[10px] font-semibold text-[#C97D1A]">Soltar para intercambiar</span>
          </div>
          <div className="p-5 flex-1 opacity-95">
            <DashboardWidgetRenderer type={dragState.widget.type} data={data} />
          </div>
        </div>
      )}

      {/* Drawer Lateral: Catálogo de Widgets */}
      {isCatalogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="catalogo-widgets-titulo"
          className="fixed inset-0 z-50 flex justify-end bg-[#16201C]/35"
        >
          <div className="w-full max-w-md bg-white h-full border-l border-[#E7E5DF] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E5DF]">
              <div>
                <h2 id="catalogo-widgets-titulo" className="text-base font-bold text-[#16201C]">
                  Catálogo de Widgets
                </h2>
                <p className="text-xs text-[#6B7A72]">
                  Activa métricas, gráficos o listas operativas en tu panel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                aria-label="Cerrar catálogo de widgets"
                className="p-1.5 text-[#6B7A72] hover:text-[#16201C] rounded-[6px] hover:bg-[#FAFAF7]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-[#E7E5DF] bg-[#FAFAF7]">
              {(['Todos', 'KPIs', 'Gráficos', 'Operación'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCatalogFilter(cat)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-[6px] transition-colors ${
                    catalogFilter === cat
                      ? 'bg-[#16201C] text-[#FAFAF7]'
                      : 'text-[#6B7A72] hover:text-[#16201C]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {filteredCatalog.map((entry) => {
                const isAdded = activeTypes.has(entry.type)
                const activeInstance = layout.find((w) => w.type === entry.type)

                return (
                  <div
                    key={entry.type}
                    className="p-4 rounded-[8px] border border-[#E7E5DF] bg-white flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#16201C]">{entry.title}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#6B7A72]">
                          {entry.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#6B7A72] mt-1 leading-relaxed">
                        {entry.description}
                      </p>
                    </div>

                    {isAdded && activeInstance ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveWidget(activeInstance.id)}
                        className="shrink-0 px-2.5 py-1.5 text-xs font-semibold text-[#C93B3B] border border-[#E7E5DF] rounded-[6px] hover:bg-[#FAFAF7]"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddWidget(entry.type)}
                        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px] hover:opacity-90"
                      >
                        <Plus size={12} />
                        Agregar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3.5 border-t border-[#E7E5DF] bg-[#FAFAF7] flex items-center justify-between">
              <span className="text-xs text-[#6B7A72]">
                {layout.length} de {WIDGET_CATALOG.length} activos
              </span>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px]"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
