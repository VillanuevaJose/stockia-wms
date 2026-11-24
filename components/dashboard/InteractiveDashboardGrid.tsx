'use client'

import React, { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
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
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const activeTypes = useMemo(() => new Set(layout.map((w) => w.type)), [layout])

  const handleMoveWidget = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= layout.length) return
    const next = [...layout]
    const [moved] = next.splice(index, 1)
    next.splice(targetIndex, 0, moved)
    saveLayoutToStorage(storageKey, next)
  }

  const handleResizeWidget = (id: string, colSpan: WidgetColSpan) => {
    const next = layout.map((w) => (w.id === id ? { ...w, colSpan } : w))
    saveLayoutToStorage(storageKey, next)
  }

  const handleRemoveWidget = (id: string) => {
    const next = layout.filter((w) => w.id !== id)
    saveLayoutToStorage(storageKey, next)
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
    saveLayoutToStorage(storageKey, next)
  }

  const handleResetDefault = () => {
    saveLayoutToStorage(storageKey, defaultLayout)
  }

  const handleDropOnWidget = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    const fromIdx = layout.findIndex((w) => w.id === draggedId)
    const toIdx = layout.findIndex((w) => w.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return

    const next = [...layout]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    saveLayoutToStorage(storageKey, next)
    setDraggedId(null)
    setDragOverId(null)
  }

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

      {/* Barra de Herramientas del Modo Edición */}
      {isEditing && (
        <div
          role="region"
          aria-label="Controles de personalización del tablero"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAFAF7] border border-[#E8A33D] rounded-[8px] px-4 py-3"
        >
          <div className="flex items-center gap-2.5 text-xs text-[#16201C]">
            <LayoutDashboard size={16} className="text-[#C97D1A] shrink-0" />
            <span>
              <strong>Modo edición activo:</strong> Arrastra las tarjetas, cambia su ancho en rejilla o añade métricas nuevas. Los cambios se guardan automáticamente en tu cuenta.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
              onClick={handleResetDefault}
              className="px-3 py-1.5 text-xs font-semibold bg-white text-[#16201C] border border-[#E7E5DF] rounded-[6px] hover:bg-[#F4F3EF] transition-colors"
            >
              Restablecer vista
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
              onClick={handleResetDefault}
              className="px-3.5 py-2 text-xs font-semibold bg-white text-[#16201C] border border-[#E7E5DF] rounded-[6px]"
            >
              Restaurar vista por defecto
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 items-stretch">
          {layout.map((widget, index) => {
            const meta = WIDGET_CATALOG.find((c) => c.type === widget.type)
            const spanClass = COL_SPAN_CLASSES[widget.colSpan] || COL_SPAN_CLASSES[6]
            const isDragging = draggedId === widget.id
            const isDropTarget = dragOverId === widget.id && draggedId !== widget.id

            return (
              <section
                key={widget.id}
                aria-label={meta?.title || 'Widget de tablero'}
                draggable={isEditing}
                onDragStart={(e) => {
                  if (!isEditing) return
                  setDraggedId(widget.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(e) => {
                  if (!isEditing) return
                  e.preventDefault()
                  if (dragOverId !== widget.id) setDragOverId(widget.id)
                }}
                onDragLeave={() => {
                  if (dragOverId === widget.id) setDragOverId(null)
                }}
                onDrop={(e) => {
                  if (!isEditing) return
                  e.preventDefault()
                  handleDropOnWidget(widget.id)
                }}
                onDragEnd={() => {
                  setDraggedId(null)
                  setDragOverId(null)
                }}
                className={`${spanClass} bg-white rounded-[8px] border transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none flex flex-col ${
                  isDropTarget
                    ? 'border-[#E8A33D] ring-2 ring-[#E8A33D]/30 bg-[#FAFAF7]'
                    : isEditing
                      ? 'border-[#D5D1C8] cursor-grab active:cursor-grabbing'
                      : 'border-[#E7E5DF]'
                } ${isDragging ? 'opacity-50 scale-[0.99]' : 'opacity-100'}`}
              >
                {/* Controles de edición de tarjeta */}
                {isEditing && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#FAFAF7] border-b border-[#E7E5DF] rounded-t-[8px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.04em] truncate">
                        {meta?.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Selector de ancho por pasos de rejilla */}
                      {meta && meta.allowedSpans.length > 1 && (
                        <div className="hidden sm:flex items-center border border-[#E7E5DF] rounded-[6px] bg-white overflow-hidden">
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

                      {/* Reordenamiento accesible por teclado / clic */}
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

                <div className="p-5 flex-1">
                  <DashboardWidgetRenderer type={widget.type} data={data} />
                </div>
              </section>
            )
          })}
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

            {/* Filtro por categoría */}
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
