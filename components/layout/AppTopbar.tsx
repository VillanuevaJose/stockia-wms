'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Search, LogOut } from '../ui/icons'
import { cerrarSesionAction } from '../../lib/actions/auth'

interface AppTopbarProps {
  userName: string
  userRole: 'admin' | 'almacenero' | 'vendedor'
  userEmail: string
  onOpenMobile: () => void
}

export function AppTopbar({
  userName,
  userRole,
  userEmail,
  onOpenMobile,
}: AppTopbarProps) {
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Atajo de teclado global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const query = searchInputRef.current?.value.trim()
    if (query) {
      router.push(`/admin/productos?q=${encodeURIComponent(query)}`)
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    almacenero: 'Almacenero',
    vendedor: 'Ventas',
  }

  return (
    <header className="h-14 bg-white border-b border-[#E7E5DF] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Botón menú móvil y buscador */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onOpenMobile}
          className="md:hidden p-1.5 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF] transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={18} />
        </button>

        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-[#6B7A72]">
            <Search size={14} />
          </div>
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Buscar por SKU, código o producto..."
            className="w-full bg-[#FAFAF7] hover:bg-white focus:bg-white border border-[#E7E5DF] focus:border-[#16201C] focus:ring-1 focus:ring-[#E8A33D] rounded-[6px] pl-8 pr-14 py-1.5 text-[13px] text-[#16201C] placeholder:text-[#6B7A72] transition-colors"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-[#6B7A72] bg-white border border-[#E7E5DF] rounded-[3px]">
              Ctrl+K
            </kbd>
          </div>
        </form>
      </div>

      {/* Identidad de usuario y Salida */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right leading-tight hidden sm:block" title={userEmail}>
          <div className="text-[13px] font-medium text-[#16201C]">{userName}</div>
          <div className="text-[11px] text-[#6B7A72]">{roleLabels[userRole] || userRole}</div>
        </div>

        {/* Separador vertical fino */}
        <div className="h-4 w-px bg-[#E7E5DF]" />

        {/* Formulario de Salida */}
        <form action={cerrarSesionAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="p-1.5 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E8A33D] cursor-pointer"
            aria-label="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </header>
  )
}
