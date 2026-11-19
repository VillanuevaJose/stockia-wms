'use client'

import { useActionState, useState } from 'react'
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

  const [nombre, setNombre] = useState(negocio.nombre || '')
  const [ruc, setRuc] = useState(negocio.ruc || '')
  const [telefono, setTelefono] = useState(negocio.telefono || '')
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  const handleTelefonoChange = (val: string) => {
    if (/[^\d\s\-\+]/.test(val)) {
      setClientErrors((prev) => ({
        ...prev,
        telefono: 'Error: solo se permiten números en el teléfono.',
      }))
    } else {
      setClientErrors((prev) => {
        const next = { ...prev }
        delete next.telefono
        return next
      })
    }
    setTelefono(val.replace(/\D/g, '').slice(0, 15))
  }

  const handleRucChange = (val: string) => {
    if (/[^\d]/.test(val)) {
      setClientErrors((prev) => ({
        ...prev,
        ruc: 'Error: el RUC solo debe contener números.',
      }))
    } else {
      setClientErrors((prev) => {
        const next = { ...prev }
        delete next.ruc
        return next
      })
    }
    setRuc(val.replace(/\D/g, '').slice(0, 11))
  }

  const handleNombreChange = (val: string) => {
    setNombre(val)
    if (val.trim().length >= 2) {
      setClientErrors((prev) => {
        const next = { ...prev }
        delete next.nombre
        return next
      })
    }
  }

  const errorNombre = clientErrors.nombre || state?.fieldErrors?.nombre
  const errorRuc = clientErrors.ruc || state?.fieldErrors?.ruc
  const errorTelefono = clientErrors.telefono || state?.fieldErrors?.telefono

  return (
    <div className="max-w-2xl bg-white rounded-[8px] border border-[#E7E5DF] p-6 space-y-6 font-sans">
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

      <form action={formAction} className="space-y-4" noValidate>
        {/* Nombre de la Empresa */}
        <div>
          <label className="block text-[12px] font-medium text-[#16201C] mb-1">
            Razón Social o Nombre Comercial *
          </label>
          <input
            name="nombre"
            value={nombre}
            onChange={(e) => handleNombreChange(e.target.value)}
            onBlur={() => {
              if (!nombre.trim()) {
                setClientErrors((prev) => ({ ...prev, nombre: 'El nombre comercial es obligatorio.' }))
              } else if (nombre.trim().length < 2) {
                setClientErrors((prev) => ({ ...prev, nombre: 'Debe tener al menos 2 caracteres.' }))
              }
            }}
            required
            aria-invalid={!!errorNombre}
            className={`w-full rounded-[6px] border px-3.5 py-2 text-[13px] text-[#16201C] focus:outline-none ${
              errorNombre
                ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                : 'border-[#E7E5DF] focus:border-[#16201C]'
            }`}
          />
          {errorNombre && (
            <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">{errorNombre}</p>
          )}
        </div>

        {/* RUC */}
        <div>
          <label className="block text-[12px] font-medium text-[#16201C] mb-1">
            RUC <span className="text-[#6B7A72] font-normal">(11 dígitos numéricos)</span>
          </label>
          <input
            name="ruc"
            value={ruc}
            onChange={(e) => handleRucChange(e.target.value)}
            onBlur={() => {
              if (ruc.trim() && ruc.trim().length !== 11) {
                setClientErrors((prev) => ({ ...prev, ruc: 'El RUC debe tener exactamente 11 dígitos numéricos.' }))
              }
            }}
            maxLength={11}
            inputMode="numeric"
            placeholder="20123456789"
            aria-invalid={!!errorRuc}
            className={`w-full rounded-[6px] border px-3.5 py-2 text-[13px] text-[#16201C] font-mono tabular-nums focus:outline-none ${
              errorRuc
                ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                : 'border-[#E7E5DF] focus:border-[#16201C]'
            }`}
          />
          {errorRuc && (
            <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">{errorRuc}</p>
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
              value={telefono}
              onChange={(e) => handleTelefonoChange(e.target.value)}
              onBlur={() => {
                if (telefono.trim() && telefono.trim().length < 7) {
                  setClientErrors((prev) => ({ ...prev, telefono: 'El teléfono debe tener entre 7 y 15 dígitos.' }))
                }
              }}
              inputMode="numeric"
              placeholder="987654321"
              aria-invalid={!!errorTelefono}
              className={`w-full rounded-[6px] border px-3.5 py-2 text-[13px] text-[#16201C] font-mono focus:outline-none ${
                errorTelefono
                  ? 'border-[#C93B3B] focus:border-[#C93B3B] focus:ring-1 focus:ring-[#C93B3B]'
                : 'border-[#E7E5DF] focus:border-[#16201C]'
              }`}
            />
            {errorTelefono && (
              <p role="alert" className="text-[11px] text-[#C93B3B] mt-1 font-medium">{errorTelefono}</p>
            )}
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
