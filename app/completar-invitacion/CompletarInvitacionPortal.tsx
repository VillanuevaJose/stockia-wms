'use client'

import { useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '../../lib/supabase/client'
import { CompletarInvitacionForm } from './CompletarInvitacionForm'
import {
  Building2,
  Warehouse,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from '../../components/ui/icons'
import {
  obtenerDatosInvitacionAction,
  type PerfilInvitado,
} from './actions'

interface Props {
  initialPerfil?: PerfilInvitado | null
}

export function CompletarInvitacionPortal({ initialPerfil }: Props) {
  const [perfil, setPerfil] = useState<PerfilInvitado | null>(initialPerfil || null)
  const [verificando, setVerificando] = useState(!initialPerfil)
  const [errorInvitacion, setErrorInvitacion] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (initialPerfil) return
    if (typeof window === 'undefined') return

    const hash = window.location.hash
    const supabase = createClient()

    if (hash && hash.includes('access_token=')) {
      const cleanHash = hash.replace(/^#/, '')
      const params = new URLSearchParams(cleanHash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(async ({ error }) => {
            window.history.replaceState(null, '', window.location.pathname)
            if (error) {
              setErrorInvitacion('El token de invitación no es válido o ha expirado.')
              setVerificando(false)
              return
            }

            startTransition(async () => {
              const res = await obtenerDatosInvitacionAction()
              if (res.success && res.perfil) {
                setPerfil(res.perfil)
              } else {
                setErrorInvitacion(
                  res.error || 'No se pudieron recuperar los datos de la invitación.'
                )
              }
              setVerificando(false)
            })
          })
        return
      }
    }

    // Si no hay hash, verificar si ya existe sesión de cliente
    supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data.session) {
        startTransition(async () => {
          const res = await obtenerDatosInvitacionAction()
          if (res.success && res.perfil) {
            setPerfil(res.perfil)
          } else {
            setErrorInvitacion('No se encontró una invitación pendiente para esta sesión.')
          }
          setVerificando(false)
        })
      } else {
        setErrorInvitacion(
          'No se detectó un enlace de invitación activo. Haz clic en el enlace recibido en tu correo.'
        )
        setVerificando(false)
      }
    })
  }, [initialPerfil])

  const rolEtiqueta =
    perfil?.rol === 'vendedor'
      ? 'Ventas y Mostrador (POS)'
      : perfil?.rol === 'almacenero'
      ? 'Operador de Bodega y Almacén'
      : 'Administrador General'

  return (
    <main className="min-h-screen bg-[#FAFAF7] flex flex-col justify-between items-center px-4 py-8 sm:py-12 font-sans">
      {/* Encabezado editorial Stockia */}
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
          <span className="text-[#16201C] font-bold tracking-tight text-[13px]">
            STOCKIA · WMS
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[#6B7A72] text-[12px]">
          <span>PORTAL DE CONFIGURACIÓN</span>
          <span>·</span>
          <span>INVITACIÓN EXCLUSIVA</span>
        </div>
      </header>

      {/* Contenedor central */}
      <div className="w-full max-w-[440px] my-auto py-6">
        {verificando ? (
          <div className="rounded-[8px] bg-white border border-[#E7E5DF] p-8 text-center shadow-sm space-y-3">
            <Loader2 size={24} className="animate-spin text-[#16201C] mx-auto" />
            <h2 className="text-[15px] font-bold text-[#16201C]">
              Verificando invitación oficial...
            </h2>
            <p className="text-[12px] text-[#6B7A72]">
              Sincronizando tus credenciales seguras con el entorno corporativo.
            </p>
          </div>
        ) : errorInvitacion && !perfil ? (
          <div className="rounded-[8px] bg-white border border-[#E7E5DF] p-6 shadow-sm space-y-4 text-center">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[#16201C]">
                Enlace de Invitación No Disponible
              </h2>
              <p className="text-[13px] text-[#6B7A72] mt-1.5 leading-relaxed">
                {errorInvitacion}
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                className="w-full py-2.5 px-4 rounded-[6px] bg-[#16201C] hover:bg-black text-[#FAFAF7] text-[13px] font-medium text-center transition-colors"
              >
                Ir a Iniciar Sesión
              </Link>
              <Link
                href="/activar"
                className="text-[12px] text-[#6B7A72] hover:text-[#16201C] transition-colors py-1"
              >
                ¿Necesitas reenviar tu invitación? Consultar portal
              </Link>
            </div>
          </div>
        ) : perfil ? (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] bg-[#E7E5DF]/50 border border-[#E7E5DF] text-[11px] font-mono text-[#6B7A72] mb-3">
                <CheckCircle2 size={13} className="text-[#2E7D32]" />
                <span>Invitación Oficial Verificada</span>
              </div>
              <h1 className="text-[24px] font-bold tracking-tight text-[#16201C] leading-snug">
                Configura tu Cuenta
              </h1>
              <p className="text-[13px] text-[#6B7A72] mt-1">
                Bienvenido al entorno de trabajo de{' '}
                <strong className="text-[#16201C] font-semibold">
                  {perfil.empresaNombre}
                </strong>
                .
              </p>
            </div>

            {/* Ficha de Asignación de Puesto y Sede */}
            <div className="rounded-[8px] bg-white border border-[#E7E5DF] p-4.5 mb-5 shadow-sm space-y-2.5">
              <div className="flex items-start justify-between border-b border-[#E7E5DF]/70 pb-2.5">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7A72] block">
                    Colaborador
                  </span>
                  <span className="text-[14px] font-medium text-[#16201C]">
                    {perfil.nombre_completo}
                  </span>
                  <span className="text-[11px] text-[#6B7A72] block font-mono mt-0.5">
                    {perfil.email}
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
                  <span className="truncate" title={perfil.empresaNombre}>
                    {perfil.empresaNombre}{' '}
                    {perfil.empresaRuc ? `(${perfil.empresaRuc})` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#6B7A72]">
                  <Warehouse size={13} className="text-[#6B7A72]/80 shrink-0" />
                  <span className="truncate" title={perfil.sedeNombre}>
                    {perfil.sedeNombre}
                  </span>
                </div>
              </div>
            </div>

            {/* Formulario para Crear Contraseña Personal */}
            <div className="rounded-[8px] bg-white border border-[#E7E5DF] p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-[15px] font-bold text-[#16201C]">
                  Crea tu Contraseña Personal
                </h2>
                <p className="text-[12px] text-[#6B7A72] mt-0.5">
                  Establece una clave para ingresar a partir de ahora al sistema sin depender del correo.
                </p>
              </div>

              <CompletarInvitacionForm />
            </div>

            <div className="text-center mt-5">
              <Link
                href="/login"
                className="text-[12px] text-[#6B7A72] hover:text-[#16201C] transition-colors"
              >
                ¿Ya habías configurado tu contraseña? Iniciar sesión
              </Link>
            </div>
          </>
        ) : null}
      </div>

      {/* Pie de página */}
      <footer className="w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between text-xs text-[#6B7A72] gap-2 pt-4 border-t border-[#E7E5DF]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-[#2E7D32]" />
          <span>Acceso corporativo protegido con aislamiento multi-tenant</span>
        </div>
        <div>
          <span>Stockia WMS Cloud · Lima, Perú</span>
        </div>
      </footer>
    </main>
  )
}
