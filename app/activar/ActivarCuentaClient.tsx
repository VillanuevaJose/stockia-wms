'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  consultarInvitacionAction,
  reenviarInvitacionAction,
  type ConsultaInvitacionResult,
} from './actions'
import {
  Mail,
  Search,
  Building2,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from '../../components/ui/icons'

export function ActivarCuentaClient() {
  const [email, setEmail] = useState('')
  const [resultado, setResultado] = useState<ConsultaInvitacionResult | null>(null)
  const [notificacionReenvio, setNotificacionReenvio] = useState<{
    tipo: 'success' | 'error'
    mensaje: string
  } | null>(null)
  const [isConsulting, startConsult] = useTransition()
  const [isReenviando, startReenvio] = useTransition()

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    setNotificacionReenvio(null)
    startConsult(async () => {
      const res = await consultarInvitacionAction(email)
      setResultado(res)
    })
  }

  const handleReenviar = () => {
    if (!resultado?.datos?.email) return
    setNotificacionReenvio(null)
    startReenvio(async () => {
      const res = await reenviarInvitacionAction(resultado.datos!.email)
      if (res.success) {
        setNotificacionReenvio({
          tipo: 'success',
          mensaje: res.message || 'Correo reenviado con éxito.',
        })
      } else {
        setNotificacionReenvio({
          tipo: 'error',
          mensaje: res.error || 'No se pudo reenviar la invitación.',
        })
      }
    })
  }

  return (
    <div className="space-y-5">
      {/* Formulario de Consulta */}
      <form onSubmit={handleBuscar} className="space-y-3">
        <label htmlFor="email" className="block text-[13px] font-medium text-[#16201C]">
          Ingresa tu Correo Corporativo o Personal
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7A72]">
            <Mail size={14} />
          </div>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo: colaborador@empresa.com"
            className="w-full rounded-[6px] border border-[#E7E5DF] bg-white pl-9 pr-24 py-2 text-[13px] text-[#16201C] placeholder:text-[#6B7A72]/60 focus:outline-none focus:border-[#16201C] transition-colors"
          />
          <button
            type="submit"
            disabled={isConsulting || !email.trim()}
            className="absolute inset-y-1 right-1 px-3 inline-flex items-center gap-1.5 rounded-[4px] bg-[#16201C] hover:bg-black text-[#FAFAF7] text-[12px] font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isConsulting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Search size={13} />
            )}
            <span>Verificar</span>
          </button>
        </div>
        <p className="text-[11px] text-[#6B7A72]">
          El sistema verificará si tu Administrador ha generado una invitación activa para tu cuenta.
        </p>
      </form>

      {/* Resultados de la Consulta */}
      {resultado && (
        <div className="pt-2 animate-fade-in">
          {resultado.success && resultado.datos ? (
            <div className="rounded-[8px] bg-[#FAFAF7] border border-[#E7E5DF] p-4.5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#E7E5DF] pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-[#2E7D32]" />
                  <span className="text-[13px] font-bold text-[#16201C]">
                    Invitación Localizada con Éxito
                  </span>
                </div>
                {resultado.datos.estado === 'pendiente' ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-[4px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Pendiente de Activar</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[4px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Cuenta ya Activa</span>
                  </span>
                )}
              </div>

              {/* Ficha de Asignación */}
              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between items-baseline">
                  <span className="text-[#6B7A72]">Colaborador:</span>
                  <span className="font-semibold text-[#16201C]">
                    {resultado.datos.nombre_completo}
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[#6B7A72]">Empresa:</span>
                  <span className="font-semibold text-[#16201C] flex items-center gap-1.5">
                    <Building2 size={12} className="text-[#6B7A72]" />
                    <span>{resultado.datos.empresa_nombre}</span>
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[#6B7A72]">Sede Asignada:</span>
                  <span className="font-semibold text-[#16201C] flex items-center gap-1.5">
                    <Warehouse size={12} className="text-[#6B7A72]" />
                    <span>{resultado.datos.sede_nombre}</span>
                  </span>
                </div>

                <div className="flex justify-between items-baseline">
                  <span className="text-[#6B7A72]">Puesto Operativo:</span>
                  <span className="font-semibold text-[#16201C]">
                    {resultado.datos.rol}
                  </span>
                </div>
              </div>

              {/* Acciones según estado */}
              {resultado.datos.estado === 'pendiente' ? (
                <div className="pt-2 border-t border-[#E7E5DF] space-y-2.5">
                  <p className="text-[11px] text-[#6B7A72] leading-relaxed">
                    Para activar tu cuenta debes abrir el enlace oficial enviado a tu correo{' '}
                    <strong className="text-[#16201C]">{resultado.datos.email}</strong>.
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isReenviando}
                      onClick={handleReenviar}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[5px] bg-white border border-[#E7E5DF] hover:border-[#16201C] text-[#16201C] text-[12px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isReenviando && <Loader2 size={12} className="animate-spin" />}
                      <span>Reenviar Correo de Activación</span>
                    </button>
                  </div>

                  {notificacionReenvio && (
                    <div
                      className={`text-[11px] p-2.5 rounded-[4px] border flex items-start gap-2 ${
                        notificacionReenvio.tipo === 'success'
                          ? 'text-[#2E7D32] bg-emerald-50 border-emerald-200'
                          : 'text-[#D32F2F] bg-red-50 border-red-200'
                      }`}
                    >
                      {notificacionReenvio.tipo === 'success' ? (
                        <CheckCircle2 size={14} className="text-[#2E7D32] shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={14} className="text-[#D32F2F] shrink-0 mt-0.5" />
                      )}
                      <span className="leading-snug">{notificacionReenvio.mensaje}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-2 border-t border-[#E7E5DF]">
                  <p className="text-[12px] text-[#6B7A72] mb-3">
                    Esta cuenta ya completó su activación previa. Puedes ingresar directamente con tus credenciales.
                  </p>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[5px] bg-[#16201C] hover:bg-black text-[#FAFAF7] text-[12px] font-medium transition-colors"
                  >
                    <span>Ir al Inicio de Sesión</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-[6px] bg-amber-50 border border-amber-200 text-amber-800 text-[12px] flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Invitación no encontrada</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  {resultado.error || 'Verifica que el correo coincida con el que ingresó tu administrador.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
