import type { Metadata } from 'next'
import Image from 'next/image'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseFastAuthUser } from '../../lib/supabase/auth-fast'
import { RegistroForm } from './RegistroForm'
import { ShieldCheck } from '../../components/ui/icons'

export const metadata: Metadata = {
  title: 'Crear Cuenta | Stockia',
  description: 'Registro de empresa en Stockia - Sistema de Gestión de Almacenes e Inventario.',
}

export default async function RegistroPage() {
  const cookieStore = await cookies()
  const fastUser = parseFastAuthUser(cookieStore.getAll())

  if (fastUser) {
    redirect('/admin')
  }

  return (
    <main className="min-h-screen bg-[#fafafa] flex flex-col justify-between items-center px-4 py-8 sm:py-12">
      {/* Barra superior de marca Stockia */}
      <header className="w-full max-w-5xl flex items-center justify-between text-xs text-[#666666]">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/stockia-icon.png"
            alt="Stockia"
            width={20}
            height={20}
            className="w-5 h-5 object-contain"
            priority
          />
          <span className="text-[#171717] font-bold tracking-tight text-[13px]">STOCKIA · WMS</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[#8f8f8f] text-[12px]">
          <span>ALTA DE EMPRESA</span>
          <span>·</span>
          <span>SISTEMA CLOUD</span>
        </div>
      </header>

      {/* Contenedor Central */}
      <div className="w-full max-w-[420px] my-auto py-6">
        {/* Identidad con Logo Stockia */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/brand/stockia-logo.png"
              alt="Stockia"
              width={160}
              height={65}
              className="h-12 w-auto object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
            Crear Cuenta de Negocio
          </h1>
          <p className="text-[13px] text-[#666666] mt-1.5 leading-normal">
            Registra tu empresa para gestionar almacenes, compras y punto de venta.
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-white rounded-[8px] border border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 sm:p-7">
          <div className="mb-4 p-2.5 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] text-[11px] text-[#6B7A72] leading-relaxed">
            <b className="text-[#16201C] font-semibold">¿Eres colaborador o empleado?</b> No es necesario registrarte aquí. Tu administrador debe enviarte una invitación a tu correo.
          </div>
          <RegistroForm />
        </div>

        {/* Micro-nota de política de acceso */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8f8f8f]">
          <ShieldCheck size={14} className="text-[#8f8f8f]" />
          <span>Acceso administrativo inicial · Multi-empresa activo</span>
        </div>
      </div>

      {/* Pie de página */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-[#ebebeb] text-[12px] text-[#8f8f8f]">
        <p>© 2026 Stockia WMS. Todos los derechos reservados.</p>
        <div className="flex items-center gap-4">
          <span className="hover:text-[#171717] cursor-pointer transition-colors">Términos</span>
          <span>·</span>
          <span className="hover:text-[#171717] cursor-pointer transition-colors">Privacidad</span>
          <span>·</span>
          <span className="hover:text-[#171717] cursor-pointer transition-colors">Soporte</span>
        </div>
      </footer>
    </main>
  )
}
