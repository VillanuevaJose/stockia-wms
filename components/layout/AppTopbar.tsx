'use client'

import React, { useEffect, useState } from 'react'
import { Menu, Search, LogOut } from '../ui/icons'
import { cerrarSesionAction } from '../../lib/actions/auth'
import { CommandPaletteModal } from './CommandPaletteModal'

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
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Atajo global Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    almacenero: 'Almacenero',
    vendedor: 'Ventas',
  }

  return (
    <>
      <header className="h-14 bg-white border-b border-[#E7E5DF] px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 select-none font-sans">
        {/* Botón menú móvil y disparador Command Palette */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            type="button"
            onClick={onOpenMobile}
            className="md:hidden p-1.5 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF] transition-colors"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center justify-between gap-2 bg-[#FAFAF7] hover:bg-white border border-[#E7E5DF] hover:border-[#16201C] rounded-[6px] px-3 py-1.5 text-[13px] text-[#6B7A72] transition-colors cursor-pointer text-left"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <Search size={14} className="shrink-0" />
              <span className="truncate">Buscar SKU, producto o ir a módulo...</span>
            </span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7A72] bg-white border border-[#E7E5DF] rounded-[4px] shrink-0">
              Ctrl + K
            </span>
          </button>
        </div>

        {/* Identidad de usuario y Salida */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right leading-tight hidden sm:block" title={userEmail}>
            <div className="text-[13px] font-medium text-[#16201C]">{userName}</div>
            <div className="text-[11px] text-[#6B7A72]">{roleLabels[userRole] || userRole}</div>
          </div>

          <div className="h-4 w-px bg-[#E7E5DF]" />

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

      <CommandPaletteModal
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        userRole={userRole}
      />
    </>
  )
}
