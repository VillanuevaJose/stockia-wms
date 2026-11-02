'use client'

import { useActionState, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { iniciarSesionAction, type AuthState } from '../../lib/actions/auth'
import { Alert } from '../../components/ui'
import { Mail, Lock, Eye, EyeOff, Loader2 } from '../../components/ui/icons'

export function LoginForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    iniciarSesionAction,
    null
  )
  const [showPassword, setShowPassword] = useState(false)

  // Redirección confiable en cliente al autenticarse con éxito
  useEffect(() => {
    if (state?.success) {
      router.push('/admin')
      window.location.replace('/admin')
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.error && (
        <Alert variant="error" title="No se pudo iniciar sesión">
          {state.error}
        </Alert>
      )}

      {state?.success && (
        <div className="space-y-2.5">
          <Alert variant="success" title="Acceso autorizado">
            {state.message || 'Ingresando al panel de control...'}
          </Alert>
          <a
            href="/admin"
            className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#171717] hover:bg-black text-white font-medium text-[13px] py-2 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
          >
            Entrar al panel de control →
          </a>
        </div>
      )}

      {/* Campo Correo */}
      <div>
        <label
          htmlFor="email"
          className="block text-[13px] font-medium text-[#171717] mb-1.5"
        >
          Correo institucional
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8f8f8f]">
            <Mail size={14} />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            required
            autoFocus
            placeholder="colaborador@almacen.com"
            aria-invalid={!!state?.fieldErrors?.email}
            className={`w-full rounded-[6px] border bg-white pl-9 pr-3.5 py-2 text-[13px] text-[#171717] placeholder:text-[#8f8f8f] transition-all focus:outline-none focus:ring-1 focus:ring-[#171717] focus:border-[#171717] ${
              state?.fieldErrors?.email
                ? 'border-[#e5484d] focus:border-[#e5484d] focus:ring-[#e5484d]'
                : 'border-[#ebebeb] hover:border-[#a8a8a8]'
            }`}
          />
        </div>
        {state?.fieldErrors?.email && (
          <p role="alert" className="mt-1 text-[12px] text-[#e5484d] font-normal">
            {state.fieldErrors.email}
          </p>
        )}
      </div>

      {/* Campo Contraseña */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-[#171717]"
          >
            Contraseña
          </label>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8f8f8f]">
            <Lock size={14} />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="one-time-code"
            autoCorrect="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            required
            placeholder="••••••••"
            aria-invalid={!!state?.fieldErrors?.password}
            className={`w-full rounded-[6px] border bg-white pl-9 pr-10 py-2 text-[13px] text-[#171717] placeholder:text-[#8f8f8f] transition-all focus:outline-none focus:ring-1 focus:ring-[#171717] focus:border-[#171717] ${
              state?.fieldErrors?.password
                ? 'border-[#e5484d] focus:border-[#e5484d] focus:ring-[#e5484d]'
                : 'border-[#ebebeb] hover:border-[#a8a8a8]'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8f8f8f] hover:text-[#171717] focus:outline-none p-1 transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {state?.fieldErrors?.password && (
          <p role="alert" className="mt-1 text-[12px] text-[#e5484d] font-normal">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {/* Botón de Entrada Principal estilo Vercel */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending || state?.success}
          className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#171717] hover:bg-black/85 active:scale-[0.98] text-white font-medium text-[13px] py-2 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending || state?.success ? (
            <>
              <Loader2 size={14} className="animate-spin text-white" />
              <span>{state?.success ? 'Ingresando al sistema...' : 'Verificando credenciales...'}</span>
            </>
          ) : (
            <span>Ingresar al Sistema</span>
          )}
        </button>
      </div>

      {/* Enlace secundario */}
      <div className="pt-2 text-center">
        <p className="text-[13px] text-[#666666]">
          ¿Nuevo colaborador?{' '}
          <Link
            href="/registro"
            className="font-medium text-[#171717] hover:underline underline-offset-4"
          >
            Crear cuenta de operador
          </Link>
        </p>
      </div>
    </form>
  )
}
