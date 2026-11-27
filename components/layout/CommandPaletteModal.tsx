'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Package, Search, X } from '../ui/icons'
import { buscarProductosParaVentaAction } from '@/lib/actions/ventas'

interface CommandActionItem {
  id: string
  title: string
  subtitle: string
  href: string
  category: string
  roles: Array<'admin' | 'almacenero' | 'vendedor'>
}

const COMMAND_ACTIONS: CommandActionItem[] = [
  {
    id: 'cmd-dashboard',
    title: 'Panel Principal Interactivo',
    subtitle: 'Tablero modular de widgets y métricas',
    href: '/admin',
    category: 'Navegación',
    roles: ['admin', 'almacenero', 'vendedor'],
  },
  {
    id: 'cmd-pos',
    title: 'Punto de Venta (POS)',
    subtitle: 'Cobro rápido, cámara de barras y modo Offline',
    href: '/vendedor',
    category: 'Operación',
    roles: ['admin', 'vendedor'],
  },
  {
    id: 'cmd-runway',
    title: 'Predictor Runway y Balanceo Inter-Sedes',
    subtitle: 'Días de stock, ROP y traslados en 1 clic',
    href: '/admin/compras?tab=reabastecimiento',
    category: 'Inteligencia',
    roles: ['admin', 'almacenero'],
  },
  {
    id: 'cmd-compras',
    title: 'Compras e Importador XML SUNAT',
    subtitle: 'Órdenes de compra y carga desde factura UBL 2.1',
    href: '/admin/compras',
    category: 'Operación',
    roles: ['admin', 'almacenero'],
  },
  {
    id: 'cmd-inventario',
    title: 'Inventario Físico y Conteo Ciego',
    subtitle: 'Existencias por sede y auditoría ciega',
    href: '/admin/inventario',
    category: 'Almacén',
    roles: ['admin', 'almacenero'],
  },
  {
    id: 'cmd-fefo',
    title: 'Control de Lotes y Despacho FEFO',
    subtitle: 'Vencimientos y salida prioritaria por caducidad',
    href: '/admin/inventario?tab=lotes',
    category: 'Almacén',
    roles: ['admin', 'almacenero'],
  },
  {
    id: 'cmd-anomalias',
    title: 'Detector de Stock Fantasma y Auditoría',
    subtitle: 'Anomalías operativas y bitácora inmutable',
    href: '/admin/auditoria',
    category: 'Seguridad',
    roles: ['admin'],
  },
  {
    id: 'cmd-sedes',
    title: 'Sedes, Traslados y Firma e-POD',
    subtitle: 'Despacho entre locales y conformidad digital',
    href: '/admin/almacenes',
    category: 'Logística',
    roles: ['admin', 'almacenero'],
  },
  {
    id: 'cmd-respaldos',
    title: 'Respaldos Manual y Automático (SHA-256)',
    subtitle: 'Exportación íntegra y verificador de archivos',
    href: '/admin/configuracion?tab=respaldos',
    category: 'Seguridad',
    roles: ['admin'],
  },
  {
    id: 'cmd-productos',
    title: 'Catálogo de Productos',
    subtitle: 'Alta, edición, precios y códigos de barras',
    href: '/admin/productos',
    category: 'Catálogo',
    roles: ['admin', 'almacenero', 'vendedor'],
  },
  {
    id: 'cmd-kardex',
    title: 'Kardex y Movimientos',
    subtitle: 'Entradas, salidas, ajustes y transferencias',
    href: '/admin/movimientos',
    category: 'Almacén',
    roles: ['admin', 'almacenero'],
  },
]

interface ProductHit {
  id: string
  sku: string
  nombre: string
  precio: number
  stock: number
}

interface CommandPaletteModalProps {
  isOpen: boolean
  onClose: () => void
  userRole: 'admin' | 'almacenero' | 'vendedor'
}

export function CommandPaletteModal({ isOpen, onClose, userRole }: CommandPaletteModalProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [productHits, setProductHits] = useState<ProductHit[]>([])
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const q = query.trim()
    if (q.length < 2) return

    const timer = setTimeout(async () => {
      setIsSearchingProducts(true)
      try {
        const res = await buscarProductosParaVentaAction(q)
        setProductHits(res.slice(0, 5))
      } catch {
        setProductHits([])
      } finally {
        setIsSearchingProducts(false)
      }
    }, 180)

    return () => clearTimeout(timer)
  }, [query, isOpen])

  const filteredActions = useMemo(() => {
    const allowed = COMMAND_ACTIONS.filter((a) => a.roles.includes(userRole))
    const q = query.trim().toLowerCase()
    if (!q) return allowed
    return allowed.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    )
  }, [query, userRole])

  const combinedEntries = useMemo(() => {
    const entries: Array<{
      key: string
      title: string
      subtitle: string
      badge: string
      href: string
      isProduct?: boolean
    }> = []

    for (const prod of productHits) {
      entries.push({
        key: `prod-${prod.id}`,
        title: prod.nombre,
        subtitle: `SKU: ${prod.sku} · Stock: ${prod.stock} · S/ ${prod.precio.toFixed(2)}`,
        badge: 'Producto',
        href: `/admin/productos?q=${encodeURIComponent(prod.sku || prod.nombre)}`,
        isProduct: true,
      })
    }

    for (const act of filteredActions) {
      entries.push({
        key: act.id,
        title: act.title,
        subtitle: act.subtitle,
        badge: act.category,
        href: act.href,
      })
    }

    return entries
  }, [productHits, filteredActions])

  const navigateTo = (href: string) => {
    onClose()
    setQuery('')
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }
    if (combinedEntries.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % combinedEntries.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + combinedEntries.length) % combinedEntries.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const chosen = combinedEntries[Math.min(selectedIndex, combinedEntries.length - 1)]
      if (chosen) navigateTo(chosen.href)
    }
  }

  if (!isOpen) return null

  const clampedIndex = Math.min(selectedIndex, Math.max(0, combinedEntries.length - 1))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos rápida"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-[#16201C]/40 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-[8px] border border-[#E7E5DF] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#E7E5DF]">
          <Search size={16} className="text-[#6B7A72] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const val = e.target.value
              setQuery(val)
              setSelectedIndex(0)
              if (val.trim().length < 2) {
                setProductHits([])
                setIsSearchingProducts(false)
              }
            }}
            placeholder="Ir a un módulo, buscar SKU o producto..."
            className="w-full text-sm text-[#16201C] placeholder:text-[#6B7A72] focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar buscador rápido"
            className="p-1 text-[#6B7A72] hover:text-[#16201C] rounded-[4px]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto divide-y divide-[#F0EEEA]">
          {isSearchingProducts && (
            <div className="px-4 py-2 text-[11px] text-[#6B7A72]">Buscando en catálogo...</div>
          )}

          {combinedEntries.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#6B7A72]">
              No se encontraron comandos ni productos para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            combinedEntries.map((entry, idx) => {
              const isSelected = idx === clampedIndex
              return (
                <button
                  key={entry.key}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => navigateTo(entry.href)}
                  className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-[#FAFAF7]' : 'bg-white hover:bg-[#FAFAF7]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {entry.isProduct && <Package size={15} className="text-[#C97D1A] shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-[#16201C] truncate">
                        {entry.title}
                      </div>
                      <div className="text-[11px] text-[#6B7A72] truncate">{entry.subtitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[#6B7A72]">
                      {entry.badge}
                    </span>
                    {isSelected && <ArrowRight size={13} className="text-[#16201C]" />}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="px-4 py-2 bg-[#FAFAF7] border-t border-[#E7E5DF] flex items-center justify-between text-[11px] text-[#6B7A72]">
          <span>Usa flechas arriba/abajo y Enter para navegar</span>
          <span>Esc para cerrar</span>
        </div>
      </div>
    </div>
  )
}
