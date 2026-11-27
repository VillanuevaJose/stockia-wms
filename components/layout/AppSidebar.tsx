'use client'

import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  SidebarShortcutControls,
  formatKeyEventToCombo,
} from './SidebarShortcutModal'

export interface NavItem {
  title: string
  href: string
  roles: Array<'admin' | 'almacenero' | 'vendedor'>
}

export interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'OPERACIÓN',
    items: [
      {
        title: 'Panel Principal',
        href: '/admin',
        roles: ['admin', 'almacenero', 'vendedor'],
      },
      {
        title: 'Kardex y Movimientos',
        href: '/admin/movimientos',
        roles: ['admin', 'almacenero'],
      },
      {
        title: 'Inventario Físico',
        href: '/admin/inventario',
        roles: ['admin', 'almacenero'],
      },
    ],
  },
  {
    title: 'CATÁLOGO',
    items: [
      {
        title: 'Productos y Stock',
        href: '/admin/productos',
        roles: ['admin', 'almacenero', 'vendedor'],
      },
      {
        title: 'Categorías',
        href: '/admin/categorias',
        roles: ['admin', 'almacenero'],
      },
    ],
  },
  {
    title: 'COMPRAS Y VENTAS',
    items: [
      {
        title: 'Punto de Venta (POS)',
        href: '/vendedor',
        roles: ['admin', 'vendedor'],
      },
      {
        title: 'Ventas y Despachos',
        href: '/admin/ventas',
        roles: ['admin', 'vendedor'],
      },
      {
        title: 'Compras y Abastecimiento',
        href: '/admin/compras',
        roles: ['admin', 'almacenero'],
      },
      {
        title: 'Directorio Proveedores',
        href: '/admin/proveedores',
        roles: ['admin', 'almacenero'],
      },
    ],
  },
  {
    title: 'ADMINISTRACIÓN',
    items: [
      {
        title: 'Almacenes y Sedes',
        href: '/admin/almacenes',
        roles: ['admin', 'almacenero'],
      },
      {
        title: 'Usuarios y Roles',
        href: '/admin/usuarios',
        roles: ['admin'],
      },
      {
        title: 'Configuración de Empresa',
        href: '/admin/configuracion',
        roles: ['admin'],
      },
      {
        title: 'Auditoría del Sistema',
        href: '/admin/auditoria',
        roles: ['admin'],
      },
    ],
  },
]

const SHORTCUTS_STORAGE_KEY = 'stockia:sidebar-shortcuts:v1'
const SHORTCUTS_EVENT = 'stockia-sidebar-shortcuts-change'

function subscribeShortcuts(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener(SHORTCUTS_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(SHORTCUTS_EVENT, cb)
  }
}

function getShortcutsSnapshot(): string {
  try {
    return window.localStorage.getItem(SHORTCUTS_STORAGE_KEY) || '{}'
  } catch {
    return '{}'
  }
}

function getServerShortcutsSnapshot(): string {
  return '{}'
}

function writeShortcuts(map: Record<string, string>) {
  try {
    window.localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(map))
    window.dispatchEvent(new Event(SHORTCUTS_EVENT))
  } catch {
    // ignore
  }
}

interface AppSidebarProps {
  userRole: 'admin' | 'almacenero' | 'vendedor'
  onCloseMobile?: () => void
}

export function AppSidebar({
  userRole,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const shortcutsSerialized = useSyncExternalStore(
    subscribeShortcuts,
    getShortcutsSnapshot,
    getServerShortcutsSnapshot
  )

  const shortcuts = useMemo<Record<string, string>>(() => {
    try {
      const parsed = JSON.parse(shortcutsSerialized)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>
      }
    } catch {
      // ignore
    }
    return {}
  }, [shortcutsSerialized])

  const [contextMenu, setContextMenu] = useState<{
    href: string
    title: string
    x: number
    y: number
  } | null>(null)
  const [recordingItem, setRecordingItem] = useState<{ href: string; title: string } | null>(null)

  const visibleNavItems = useMemo(
    () => navSections.flatMap((s) => s.items.filter((i) => i.roles.includes(userRole))),
    [userRole]
  )

  const handleSaveShortcut = useCallback(
    (href: string, combo: string) => {
      const next: Record<string, string> = {}
      // Limpiar si el mismo combo ya existía en otro apartado
      for (const [k, v] of Object.entries(shortcuts)) {
        if (v !== combo && k !== href) {
          next[k] = v
        }
      }
      next[href] = combo
      writeShortcuts(next)
    },
    [shortcuts]
  )

  const handleRemoveShortcut = useCallback(
    (href: string) => {
      const next = { ...shortcuts }
      delete next[href]
      writeShortcuts(next)
    },
    [shortcuts]
  )

  // Escucha global de atajos personalizados (ej. Ctrl+Q -> /vendedor)
  useEffect(() => {
    if (recordingItem) return

    const handleGlobalKey = (e: KeyboardEvent) => {
      const combo = formatKeyEventToCombo(e)
      if (!combo) return

      const matched = visibleNavItems.find((item) => shortcuts[item.href] === combo)
      if (!matched) return

      e.preventDefault()
      onCloseMobile?.()
      router.push(matched.href)
    }

    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [shortcuts, visibleNavItems, recordingItem, router, onCloseMobile])

  return (
    <>
      <aside className="w-[220px] h-full flex flex-col bg-[#FAFAF7] border-r border-[#E7E5DF] text-[#16201C] select-none shrink-0 font-sans">
        {/* Encabezado con identidad de marca Stockia */}
        <div className="h-14 border-b border-[#E7E5DF] flex items-center px-4 bg-[#FAFAF7]">
          <Link
            href="/admin"
            onClick={onCloseMobile}
            className="flex items-center gap-2 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#16201C] rounded-[4px] py-1"
          >
            <Image
              src="/brand/stockia-logo.png"
              alt="Stockia WMS"
              width={118}
              height={48}
              className="h-8 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Menú de navegación con clic derecho para personalizar atajos */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4" aria-label="Menú principal">
          {navSections.map((section) => {
            const visibleItems = section.items.filter((item) => item.roles.includes(userRole))
            if (visibleItems.length === 0) return null

            return (
              <div key={section.title} className="space-y-1">
                <p className="px-2 text-[11px] font-semibold text-[#6B7A72] uppercase tracking-[0.06em]">
                  {section.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive =
                      item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
                    const assignedCombo = shortcuts[item.href]

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={true}
                        onClick={onCloseMobile}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          setContextMenu({
                            href: item.href,
                            title: item.title,
                            x: e.clientX,
                            y: e.clientY,
                          })
                        }}
                        title="Clic derecho para asignar atajo de teclado"
                        className={`relative flex items-center justify-between gap-1.5 h-8 px-2.5 rounded-[4px] text-[13px] font-medium transition-colors duration-100 ${
                          isActive
                            ? 'text-[#16201C] font-semibold bg-[#F4F3EF]'
                            : 'text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF]/60 font-medium'
                        }`}
                      >
                        {isActive && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#16201C] rounded-full"
                            aria-hidden="true"
                          />
                        )}
                        <span className="truncate">{item.title}</span>
                        {assignedCombo && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7A72] bg-white border border-[#E7E5DF] rounded-[3px]">
                            {assignedCombo}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Pie de sidebar */}
        <div className="p-3.5 border-t border-[#E7E5DF] text-[11px] text-[#6B7A72] flex items-center justify-between bg-[#FAFAF7]">
          <span className="flex items-center gap-1.5 font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2A7A4C]" aria-hidden="true" />
            En línea
          </span>
          <span className="text-[10px] text-[#6B7A72] tabular-nums">WMS v2.4</span>
        </div>
      </aside>

      <SidebarShortcutControls
        contextMenu={contextMenu}
        onCloseContextMenu={() => setContextMenu(null)}
        recordingItem={recordingItem}
        onOpenRecorder={(item) => setRecordingItem(item)}
        onCloseRecorder={() => setRecordingItem(null)}
        shortcuts={shortcuts}
        allItems={visibleNavItems}
        onSaveShortcut={handleSaveShortcut}
        onRemoveShortcut={handleRemoveShortcut}
      />
    </>
  )
}
