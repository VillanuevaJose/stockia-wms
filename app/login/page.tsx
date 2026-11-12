import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { parseFastAuthUser } from '../../lib/supabase/auth-fast'
import { LoginForm } from './LoginForm'
import { ShieldCheck } from '../../components/ui/icons'

export const metadata: Metadata = {
  title: 'Acceso | Stockia',
  description: 'Iniciar sesión en Stockia - Sistema de Gestión de Almacenes e Inventario.',
}

interface LoginPageProps {
  searchParams?: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies()
  const fastUser = parseFastAuthUser(cookieStore.getAll())

  if (fastUser) {
    redirect('/admin')
  }

  const params = await searchParams
  const isDesactivado = params?.error === 'desactivado'

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
          <span>TLS 1.3</span>
          <span>·</span>
          <span>SISTEMA CLOUD</span>
        </div>
      </header>

      {/* Contenedor Central */}
      <div className="w-full max-w-[400px] my-auto py-6">
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
            Iniciar Sesión
          </h1>
          <p className="text-[13px] text-[#666666] mt-1.5 leading-normal">
            Ingresa al sistema para gestionar existencias, kárdex y ventas.
          </p>
        </div>

        {/* Tarjeta de Formulario */}
        <div className="bg-white rounded-[8px] border border-[#ebebeb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 sm:p-7">
          {isDesactivado && (
            <div className="mb-4 p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[12px] text-[#C53030]">
              Tu cuenta ha sido desactivada por el administrador de tu empresa.
            </div>
          )}
          <LoginForm />
          <div className="mt-4 pt-3 border-t border-[#ebebeb] text-center">
            <span className="text-[12px] text-[#666666]">¿Fuiste invitado por tu empresa? </span>
            <Link
              href="/activar"
              className="text-[12px] font-medium text-[#171717] hover:underline"
            >
              Activar cuenta
            </Link>
          </div>
        </div>

        {/* Micro-nota de seguridad */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8f8f8f]">
          <ShieldCheck size={14} className="text-[#8f8f8f]" />
          <span>Acceso restringido · Políticas RBAC activas</span>
        </div>
      </div>

      {/* Pie de página limpio */}
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
