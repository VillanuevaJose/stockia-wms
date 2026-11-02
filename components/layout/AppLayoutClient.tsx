'use client'

import React, { useState } from 'react'
import { AppSidebar } from './AppSidebar'
import { AppTopbar } from './AppTopbar'
import { X } from '../ui/icons'

interface AppLayoutClientProps {
  userName: string
  userRole: 'admin' | 'almacenero' | 'vendedor'
  userEmail: string
  children: React.ReactNode
}

export function AppLayoutClient({
  userName,
  userRole,
  userEmail,
  children,
}: AppLayoutClientProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="flex h-screen w-full bg-[#FAFAF7] overflow-hidden font-sans text-[#16201C]">
      {/* Sidebar Desktop fijo 220px */}
      <div className="hidden md:flex shrink-0">
        <AppSidebar
          userRole={userRole}
        />
      </div>

      {/* Drawer Móvil */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/30 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-[240px] max-w-xs flex-1 flex flex-col bg-[#FAFAF7] text-[#16201C] z-10 border-r border-[#E7E5DF]">
            <div className="absolute top-3.5 right-3 z-20">
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF]"
                aria-label="Cerrar menú"
              >
                <X size={16} />
              </button>
            </div>
            <AppSidebar
              userRole={userRole}
              onCloseMobile={() => setIsMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Contenedor Principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <AppTopbar
          userName={userName}
          userRole={userRole}
          userEmail={userEmail}
          onOpenMobile={() => setIsMobileOpen(true)}
        />

        {/* Área de contenido con scroll independiente y espaciado ergonómico */}
        <main className="flex-1 overflow-y-auto bg-[#FAFAF7]">
          <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
