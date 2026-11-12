import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { CompletarInvitacionForm } from './CompletarInvitacionForm'
import { Building2, Warehouse, CheckCircle2, ShieldCheck } from '../../components/ui/icons'

export const metadata: Metadata = {
  title: 'Activar Cuenta de Colaborador | Stockia WMS',
  description: 'Establece tu contraseña personal para acceder al entorno corporativo en Stockia.',
}

export default async function CompletarInvitacionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=enlace_expirado')
  }

  // Consultar perfil del colaborador junto con su empresa y sede asignada
  const { data: perfil } = await supabase
    .from('usuarios')
    .select(`
      id,
      nombre_completo,
      email,
      rol,
      negocio:negocio_id (nombre, ruc),
      almacen:almacen_id (nombre, codigo)
    `)
    .eq('id', user.id)
    .maybeSingle()

  // @ts-expect-error Supabase nested
  const empresaNombre = perfil?.negocio?.nombre || 'Empresa Asociada'
  // @ts-expect-error Supabase nested
  const empresaRuc = perfil?.negocio?.ruc || null
  // @ts-expect-error Supabase nested
  const sedeNombre = perfil?.almacen?.nombre || 'Sede Central'
  const rolEtiqueta =
    perfil?.rol === 'vendedor'
      ? 'Ventas y Mostrador (POS)'
      : perfil?.rol === 'almacenero'
      ? 'Operador de Bodega y Almacén'
      : 'Administrador General'

  return (
    <main className="min-h-screen bg-[#FAFAF7] flex flex-col justify-between items-center px-4 py-8 sm:py-12 font-sans">
      {/* Encabezado editorial */}
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
          <span>AUTENTICACIÓN SEGURA</span>
          <span>·</span>
          <span>AISLAMIENTO B2B</span>
        </div>
      </header>

      {/* Contenedor central */}
      <div className="w-full max-w-[440px] my-auto py-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#E7E5DF]/50 border border-[#E7E5DF] text-[11px] font-mono text-[#6B7A72] mb-3">
            <CheckCircle2 size={13} className="text-[#2E7D32]" />
            <span>Invitación Oficial Verificada</span>
          </div>
          <h1 className="text-[24px] font-bold tracking-tight text-[#16201C] leading-snug">
            Bienvenido a tu Equipo
          </h1>
          <p className="text-[13px] text-[#6B7A72] mt-1">
            Has sido invitado a formar parte del entorno operativo de{' '}
            <strong className="text-[#16201C] font-semibold">{empresaNombre}</strong>.
          </p>
        </div>

        {/* Ficha de Asignación de Puesto */}
        <div className="rounded-[8px] bg-white border border-[#E7E5DF] p-4.5 mb-5 shadow-sm space-y-2.5">
          <div className="flex items-start justify-between border-b border-[#E7E5DF]/70 pb-2.5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7A72] block">
                Colaborador
              </span>
              <span className="text-[14px] font-medium text-[#16201C]">
                {perfil?.nombre_completo || user.email}
              </span>
              <span className="text-[11px] text-[#6B7A72] block font-mono mt-0.5">
                {user.email}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7A72] block">
                Rol Asignado
              </span>
              <span className="text-[12px] font-bold text-[#16201C]">
                {rolEtiqueta}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px] pt-0.5">
            <div className="flex items-center gap-2 text-[#6B7A72]">
              <Building2 size={13} className="text-[#6B7A72]/80 shrink-0" />
              <span className="truncate" title={empresaNombre}>
                {empresaNombre} {empresaRuc ? `(${empresaRuc})` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[#6B7A72]">
              <Warehouse size={13} className="text-[#6B7A72]/80 shrink-0" />
              <span className="truncate" title={sedeNombre}>
                {sedeNombre}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario para Crear Contraseña */}
        <div className="rounded-[8px] bg-white border border-[#E7E5DF] p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-[15px] font-bold text-[#16201C]">Establece tu Contraseña</h2>
            <p className="text-[12px] text-[#6B7A72] mt-0.5">
              Crea tu clave personal para ingresar a partir de ahora desde cualquier dispositivo.
            </p>
          </div>

          <CompletarInvitacionForm />
        </div>

        <div className="text-center mt-5">
          <Link
            href="/login"
            className="text-[12px] text-[#6B7A72] hover:text-[#16201C] transition-colors"
          >
            ¿Ya tienes una clave asignada? Iniciar sesión
          </Link>
        </div>
      </div>

      {/* Pie de página */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7A72] gap-2 pt-4 border-t border-[#E7E5DF]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#2E7D32]" />
          <span>Acceso seguro protegido con aislamiento multi-tenant RLS</span>
        </div>
        <div>
          <span>Stockia WMS Cloud · Lima, Perú</span>
        </div>
      </footer>
    </main>
  )
}
