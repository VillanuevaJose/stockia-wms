'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

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
        title: 'Compras y Proveedores',
        href: '/admin/compras',
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

interface AppSidebarProps {
  userRole: 'admin' | 'almacenero' | 'vendedor'
  onCloseMobile?: () => void
}

export function AppSidebar({
  userRole,
  onCloseMobile,
}: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] h-full flex flex-col bg-[#FAFAF7] border-r border-[#E7E5DF] text-[#16201C] select-none shrink-0">
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

      {/* Menú de navegación solo texto */}
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

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={onCloseMobile}
                      className={`relative flex items-center h-8 px-2.5 rounded-[4px] text-[13px] font-medium transition-colors duration-100 ${
                        isActive
                          ? 'text-[#16201C] font-semibold bg-[#F4F3EF]'
                          : 'text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF]/60 font-medium'
                      }`}
                    >
                      {/* Indicador de ruta activa mediante línea fina */}
                      {isActive && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#16201C] rounded-full"
                          aria-hidden="true"
                        />
                      )}
                      <span className="truncate">{item.title}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Pie de sidebar: Discreto */}
      <div className="p-3.5 border-t border-[#E7E5DF] text-[11px] text-[#6B7A72] flex items-center justify-between bg-[#FAFAF7]">
        <span className="flex items-center gap-1.5 font-sans">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2A7A4C]" aria-hidden="true" />
          En línea
        </span>
        <span className="font-mono text-[10px] text-[#6B7A72] tabular-nums">WMS v2.4</span>
      </div>
    </aside>
  )
}
