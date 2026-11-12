'use client'

import { useActionState, useState, useMemo } from 'react'
import { completarInvitacionAction, type FormState } from './actions'
import { Alert } from '../../components/ui'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, Check } from '../../components/ui/icons'

function evaluatePassword(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Débil', color: 'bg-[#D32F2F]' }
    case 2:
      return { score: 2, label: 'Básica', color: 'bg-amber-500' }
    case 3:
      return { score: 3, label: 'Buena', color: 'bg-amber-400' }
    case 4:
      return { score: 4, label: 'Excelente', color: 'bg-[#2E7D32]' }
    default:
      return { score: 0, label: '', color: 'bg-[#E7E5DF]' }
  }
}

export function CompletarInvitacionForm() {
  const [state, formAction, isPending] = useActionState<FormState | null, FormData>(
    completarInvitacionAction,
    null
  )
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const strength = useMemo(() => evaluatePassword(password), [password])
  const passwordsMatch = useMemo(() => {
    return password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  }, [password, confirmPassword])

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error && (
        <Alert variant="error" title="No se pudo completar el registro">
          {state.error}
        </Alert>
      )}

      {/* Nueva Contraseña */}
      <div>
        <label
          htmlFor="password"
          className="block text-[13px] font-medium text-[#16201C] mb-1.5"
        >
          Nueva Contraseña
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7A72]">
            <Lock size={14} />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres, mayúscula y número"
            className={`w-full rounded-[6px] border ${
              state?.fieldErrors?.password ? 'border-[#D32F2F]' : 'border-[#E7E5DF]'
            } bg-white pl-9 pr-10 py-2 text-[13px] text-[#16201C] placeholder:text-[#6B7A72]/60 focus:outline-none focus:border-[#16201C] transition-colors`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7A72] hover:text-[#16201C] transition-colors cursor-pointer"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {/* Indicador de Fortaleza */}
        {password.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <div className="flex gap-1 h-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-300 ${
                    i <= strength.score ? strength.color : 'bg-[#E7E5DF]'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between items-center text-[11px] text-[#6B7A72]">
              <span>Seguridad de contraseña:</span>
              <span className="font-medium text-[#16201C]">{strength.label}</span>
            </div>
          </div>
        )}

        {state?.fieldErrors?.password && (
          <p className="mt-1 text-[12px] text-[#D32F2F]">{state.fieldErrors.password}</p>
        )}
      </div>

      {/* Confirmar Contraseña */}
      <div>
        <label
          htmlFor="confirmarPassword"
          className="block text-[13px] font-medium text-[#16201C] mb-1.5"
        >
          Confirmar Contraseña
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7A72]">
            <Lock size={14} />
          </div>
          <input
            id="confirmarPassword"
            name="confirmarPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite la contraseña elegida"
            className={`w-full rounded-[6px] border ${
              state?.fieldErrors?.confirmarPassword ? 'border-[#D32F2F]' : 'border-[#E7E5DF]'
            } bg-white pl-9 pr-10 py-2 text-[13px] text-[#16201C] placeholder:text-[#6B7A72]/60 focus:outline-none focus:border-[#16201C] transition-colors`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#6B7A72] hover:text-[#16201C] transition-colors cursor-pointer"
            aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
          >
            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {confirmPassword.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            {passwordsMatch ? (
              <>
                <Check size={12} className="text-[#2E7D32]" />
                <span className="text-[#2E7D32]">Las contraseñas coinciden</span>
              </>
            ) : (
              <span className="text-[#D32F2F]">Las contraseñas no coinciden aún</span>
            )}
          </div>
        )}

        {state?.fieldErrors?.confirmarPassword && (
          <p className="mt-1 text-[12px] text-[#D32F2F]">{state.fieldErrors.confirmarPassword}</p>
        )}
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || !passwordsMatch || password.length < 8}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#16201C] hover:bg-black text-[#FAFAF7] font-medium text-[13px] py-2.5 px-4 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              <span>Guardando credenciales...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={15} />
              <span>Activar Cuenta y Entrar al Sistema</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
