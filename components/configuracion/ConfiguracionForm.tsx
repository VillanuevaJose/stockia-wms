'use client'

import { useActionState } from 'react'
import { Loader2, CheckCircle2 } from '../ui/icons'
import {
  actualizarConfiguracionAction,
  type ConfiguracionState,
} from '../../app/admin/configuracion/actions'

interface Props {
  negocio: {
    id: string
    nombre: string
    ruc: string | null
    direccion: string | null
    telefono: string | null
    email: string | null
    logo_url: string | null
  }
}

export function ConfiguracionForm({ negocio }: Props) {
  const [state, formAction, isPending] = useActionState<ConfiguracionState | null, FormData>(
    actualizarConfiguracionAction,
    null
  )

  return (
    <div className="max-w-2xl bg-white rounded-[8px] border border-[#E7E5DF] p-6 space-y-6">
      {state?.error && (
        <div className="p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[13px] text-[#C53030]">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3 rounded-[6px] bg-[#E8F5E9] border border-[#C8E6C9] text-[13px] text-[#2E7D32] flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>¡Datos de la empresa actualizados exitosamente!</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Nombre de la Empresa */}
        <div>
          <label className="block text-[12px] font-medium text-[#16201C] mb-1">
            Razón Social o Nombre Comercial
          </label>
          <input
            name="nombre"
            defaultValue={negocio.nombre}
            required
            className="w-full rounded-[6px] border border-[#E7E5DF] px-3.5 py-2 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
          />
          {state?.fieldErrors?.nombre && (
            <p className="text-[11px] text-[#D32F2F] mt-1">{state.fieldErrors.nombre}</p>
          )}
        </div>

        {/* RUC */}
        <div>
          <label className="block text-[12px] font-medium text-[#16201C] mb-1">
            RUC <span className="text-[#6B7A72] font-normal">(11 dígitos)</span>
          </label>
          <input
            name="ruc"
            defaultValue={negocio.ruc || ''}
            maxLength={11}
            placeholder="20123456789"
            className="w-full rounded-[6px] border border-[#E7E5DF] px-3.5 py-2 text-[13px] text-[#16201C] font-mono tabular-nums focus:outline-none focus:border-[#16201C]"
          />
          {state?.fieldErrors?.ruc && (
            <p className="text-[11px] text-[#D32F2F] mt-1">{state.fieldErrors.ruc}</p>
          )}
        </div>

        {/* Dirección */}
        <div>
          <label className="block text-[12px] font-medium text-[#16201C] mb-1">
            Dirección Fiscal o Sede Central
          </label>
          <input
            name="direccion"
            defaultValue={negocio.direccion || ''}
            placeholder="Av. Nicolás de Piérola 1234, Lima"
            className="w-full rounded-[6px] border border-[#E7E5DF] px-3.5 py-2 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
          />
        </div>

        {/* Teléfono y Correo */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[12px] font-medium text-[#16201C] mb-1">
              Teléfono de Contacto
            </label>
            <input
              name="telefono"
              defaultValue={negocio.telefono || ''}
              placeholder="+51 987 654 321"
              className="w-full rounded-[6px] border border-[#E7E5DF] px-3.5 py-2 text-[13px] text-[#16201C] font-mono focus:outline-none focus:border-[#16201C]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-[#16201C] mb-1">
              Correo Institucional
            </label>
            <input
              disabled
              value={negocio.email || ''}
              className="w-full rounded-[6px] border border-[#E7E5DF] bg-[#FAFAF7] px-3.5 py-2 text-[13px] text-[#6B7A72] font-mono cursor-not-allowed"
            />
          </div>
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-[12px] font-medium text-[#16201C] mb-1">
            URL del Logo de la Empresa <span className="text-[#6B7A72] font-normal">(Opcional)</span>
          </label>
          <input
            name="logo_url"
            defaultValue={negocio.logo_url || ''}
            placeholder="https://ejemplo.com/logo.png"
            className="w-full rounded-[6px] border border-[#E7E5DF] px-3.5 py-2 text-[13px] text-[#16201C] font-mono focus:outline-none focus:border-[#16201C]"
          />
        </div>

        <div className="pt-3 border-t border-[#E7E5DF] flex items-center justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>
    </div>
  )
}
