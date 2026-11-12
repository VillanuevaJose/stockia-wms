import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ActivarCuentaClient } from './ActivarCuentaClient'
import { ShieldCheck } from '../../components/ui/icons'

export const metadata: Metadata = {
  title: 'Portal de Activación de Colaborador | Stockia',
  description: 'Proceso exclusivo para verificar tu invitación y activar tu cuenta en Stockia WMS.',
}

export default function ActivarCuentaPage() {
  return (
    <main className="min-h-screen bg-[#FAFAF7] flex flex-col justify-between items-center px-4 py-8 sm:py-12 font-sans">
      {/* Barra superior de marca Stockia */}
      <header className="w-full max-w-5xl flex items-center justify-between text-xs text-[#6B7A72]">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/stockia-icon.png"
            alt="Stockia"
            width={20}
            height={20}
            className="w-5 h-5 object-contain"
            priority
          />
          <span className="text-[#16201C] font-bold tracking-tight text-[13px]">STOCKIA · WMS</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[#6B7A72] text-[12px]">
          <span>PORTAL DE ACTIVACIÓN</span>
          <span>·</span>
          <span>ONBOARDING B2B</span>
        </div>
      </header>

      {/* Contenedor Central */}
      <div className="w-full max-w-[440px] my-auto py-6">
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
          <h1 className="text-[24px] font-bold tracking-tight text-[#16201C]">
            Activar Cuenta de Colaborador
          </h1>
          <p className="text-[13px] text-[#6B7A72] mt-1.5 leading-relaxed">
            Portal exclusivo para confirmar tu incorporación al equipo de tu empresa en Stockia.
          </p>
        </div>

        {/* Tarjeta de Activación */}
        <div className="bg-white rounded-[8px] border border-[#E7E5DF] shadow-sm p-6 sm:p-7">
          <ActivarCuentaClient />
        </div>

        {/* Enlace de Retorno */}
        <div className="mt-5 text-center">
          <Link
            href="/login"
            className="text-[12px] text-[#6B7A72] hover:text-[#16201C] transition-colors"
          >
            ← Volver al inicio de sesión principal
          </Link>
        </div>
      </div>

      {/* Pie de página */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7A72] gap-2 pt-4 border-t border-[#E7E5DF]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#2E7D32]" />
          <span>Verificación segura de invitaciones mediante Supabase Auth</span>
        </div>
        <div>
          <span>Stockia WMS Cloud · Lima, Perú</span>
        </div>
      </footer>
    </main>
  )
}
