'use client'

import { useActionState, useState, useMemo, useRef, startTransition } from 'react'
import Link from 'next/link'
import { registrarUsuarioAction, type AuthState } from '../../lib/actions/auth'
import { Alert } from '../../components/ui'
import {
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Check,
  Building2,
  CreditCard,
} from '../../components/ui/icons'
import { CulqiCheckoutModal } from '../../components/registro/CulqiCheckoutModal'

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
      return { score: 1, label: 'Débil', color: 'bg-rose-500' }
    case 2:
      return { score: 2, label: 'Básica', color: 'bg-amber-500' }
    case 3:
      return { score: 3, label: 'Buena', color: 'bg-amber-400' }
    case 4:
      return { score: 4, label: 'Excelente', color: 'bg-emerald-500' }
    default:
      return { score: 0, label: '', color: 'bg-zinc-200' }
  }
}

export function RegistroForm() {
  const [state, formAction, isPending] = useActionState<AuthState | null, FormData>(
    registrarUsuarioAction,
    null
  )
  const formRef = useRef<HTMLFormElement>(null)

  const [nombreNegocio, setNombreNegocio] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Estados de integración con Culqi
  const [isCulqiModalOpen, setIsCulqiModalOpen] = useState(false)
  const [culqiChargeId, setCulqiChargeId] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)

  const strength = useMemo(() => evaluatePassword(password), [password])
  const passwordsMatch = useMemo(() => {
    return password.length > 0 && confirmPassword.length > 0 && password === confirmPassword
  }, [password, confirmPassword])

  // Interceptar envío para requerir pago simulado de Culqi antes de crear la empresa
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (culqiChargeId) {
      return
    }

    e.preventDefault()
    setClientError(null)

    const form = formRef.current
    if (!form) return

    const formData = new FormData(form)
    const nombre = String(formData.get('nombre_completo') || '').trim()
    const negocio = String(formData.get('nombre_negocio') || '').trim()
    const ruc = String(formData.get('ruc') || '').trim()
    const correo = String(formData.get('email') || '').trim()

    if (!nombre) {
      setClientError('Por favor ingresa tu nombre y apellidos.')
      return
    }
    if (!negocio) {
      setClientError('Por favor ingresa el nombre de la empresa o negocio.')
      return
    }
    if (ruc && !/^[0-9]{11}$/.test(ruc)) {
      setClientError('El RUC debe tener exactamente 11 dígitos numéricos.')
      return
    }
    if (!correo || !correo.includes('@')) {
      setClientError('Ingresa un correo institucional válido.')
      return
    }
    if (password.length < 8) {
      setClientError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setClientError('Las contraseñas no coinciden.')
      return
    }

    // Guardar referencias para el modal y abrir checkout
    setNombreNegocio(negocio)
    setEmail(correo)
    setIsCulqiModalOpen(true)
  }

  // Al aprobar el pago en Culqi Checkout, completar el registro con culqi_charge_id
  const handlePaymentSuccess = (chargeId: string) => {
    setCulqiChargeId(chargeId)
    setIsCulqiModalOpen(false)

    if (formRef.current) {
      const formData = new FormData(formRef.current)
      formData.set('culqi_charge_id', chargeId)
      startTransition(() => {
        formAction(formData)
      })
    }
  }

  // Estado tras registro exitoso
  if (state?.requiresEmailConfirmation) {
    return (
      <div className="space-y-4">
        <Alert variant="success" title="¡Empresa y Administrador Registrados!">
          {state.message}
        </Alert>

        <div className="rounded-[6px] bg-[#fafafa] border border-[#ebebeb] p-4 text-[13px] text-[#666666] space-y-2">
          <div className="flex items-center gap-2 font-medium text-[#171717]">
            <CheckCircle2 size={16} className="text-[#297a3a]" />
            <span>Estado de tu cuenta:</span>
          </div>
          <p>1. Tu empresa y 3 sedes operativas han sido configuradas.</p>
          <p>2. Rol asignado: <strong>Administrador General</strong>.</p>
          <p>3. Pago de activación verificado vía pasarela Culqi.</p>
          <p>4. Inicia sesión para acceder a tu panel de administración.</p>
        </div>

        <Link href="/login" className="block pt-2">
          <button
            type="button"
            className="w-full inline-flex items-center justify-center rounded-[6px] bg-[#171717] hover:bg-black/85 text-white font-medium text-[13px] py-2 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all cursor-pointer"
          >
            Iniciar Sesión
          </button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={handleFormSubmit}
        className="space-y-3.5"
        noValidate
      >
        <input type="hidden" name="culqi_charge_id" value={culqiChargeId} />

        {clientError && (
          <Alert variant="error" title="Revisa los campos requeridos">
            {clientError}
          </Alert>
        )}

        {state?.error && (
          <Alert variant="error" title="No se pudo procesar el registro">
            {state.error}
          </Alert>
        )}

        {/* Badge de pago aprobado si ya se procesó */}
        {culqiChargeId && (
          <div className="p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              <span>
                Pago simulado aprobado:{' '}
                <strong className="font-mono text-[11px]">{culqiChargeId}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Nombre Completo */}
        <div>
          <label
            htmlFor="nombre_completo"
            className="block text-[13px] font-medium text-[#171717] mb-1.5"
          >
            Nombre y Apellidos del Administrador
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8f8f8f]">
              <Users size={14} />
            </div>
            <input
              id="nombre_completo"
              name="nombre_completo"
              type="text"
              autoComplete="name"
              required
              autoFocus
              placeholder="Mateo Mesa"
              aria-invalid={!!state?.fieldErrors?.nombre_completo}
              className={`w-full rounded-[6px] border bg-white pl-9 pr-3.5 py-2 text-[13px] text-[#171717] placeholder:text-[#8f8f8f] transition-all focus:outline-none focus:ring-1 focus:ring-[#171717] focus:border-[#171717] ${
                state?.fieldErrors?.nombre_completo
                  ? 'border-[#e5484d] focus:border-[#e5484d] focus:ring-[#e5484d]'
                  : 'border-[#ebebeb] hover:border-[#a8a8a8]'
              }`}
            />
          </div>
          {state?.fieldErrors?.nombre_completo && (
            <p role="alert" className="mt-1 text-[12px] text-[#e5484d] font-normal">
              {state.fieldErrors.nombre_completo}
            </p>
          )}
        </div>

        {/* Nombre del Negocio / Almacén */}
        <div>
          <label
            htmlFor="nombre_negocio"
            className="block text-[13px] font-medium text-[#171717] mb-1.5"
          >
            Nombre de la Empresa o Negocio
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8f8f8f]">
              <Building2 size={14} />
            </div>
            <input
              id="nombre_negocio"
              name="nombre_negocio"
              type="text"
              autoComplete="organization"
              required
              placeholder="Distribuidora Central S.A.C."
              onChange={(e) => setNombreNegocio(e.target.value)}
              aria-invalid={!!state?.fieldErrors?.nombre_negocio}
              className={`w-full rounded-[6px] border bg-white pl-9 pr-3.5 py-2 text-[13px] text-[#171717] placeholder:text-[#8f8f8f] transition-all focus:outline-none focus:ring-1 focus:ring-[#171717] focus:border-[#171717] ${
                state?.fieldErrors?.nombre_negocio
                  ? 'border-[#e5484d] focus:border-[#e5484d] focus:ring-[#e5484d]'
                  : 'border-[#ebebeb] hover:border-[#a8a8a8]'
              }`}
            />
          </div>
          {state?.fieldErrors?.nombre_negocio && (
            <p role="alert" className="mt-1 text-[12px] text-[#e5484d] font-normal">
              {state.fieldErrors.nombre_negocio}
            </p>
          )}
        </div>

        {/* RUC (Opcional) */}
        <div>
          <label
            htmlFor="ruc"
            className="block text-[13px] font-medium text-[#171717] mb-1.5"
          >
            RUC <span className="text-[#8f8f8f] font-normal">(Opcional, 11 dígitos)</span>
          </label>
          <input
            id="ruc"
            name="ruc"
            type="text"
            inputMode="numeric"
            maxLength={11}
            placeholder="20123456789"
            aria-invalid={!!state?.fieldErrors?.ruc}
            className={`w-full rounded-[6px] border bg-white px-3.5 py-2 text-[13px] text-[#171717] placeholder:text-[#8f8f8f] tabular-nums transition-all focus:outline-none focus:ring-1 focus:ring-[#171717] focus:border-[#171717] ${
              state?.fieldErrors?.ruc
                ? 'border-[#e5484d] focus:border-[#e5484d] focus:ring-[#e5484d]'
                : 'border-[#ebebeb] hover:border-[#a8a8a8]'
            }`}
          />
          {state?.fieldErrors?.ruc && (
            <p role="alert" className="mt-1 text-[12px] text-[#e5484d] font-normal">
              {state.fieldErrors.ruc}
            </p>
          )}
        </div>

        {/* Correo Electrónico */}
        <div>
          <label
            htmlFor="email"
            className="block text-[13px] font-medium text-[#171717] mb-1.5"
          >
            Correo institucional del Administrador
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8f8f8f]">
              <Mail size={14} />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@tuempresa.com"
              onChange={(e) => setEmail(e.target.value)}
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

        {/* Contraseña */}
        <div>
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-[#171717] mb-1.5"
          >
            Contraseña de acceso
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8f8f8f]">
              <Lock size={14} />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
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

          {/* Micro-barras de fortaleza */}
          {password.length > 0 && (
            <div className="mt-2" aria-live="polite">
              <div className="flex items-center justify-between text-[11px] text-[#8f8f8f] mb-1">
                <span>Seguridad:</span>
                <span className="font-medium text-[#171717]">{strength.label}</span>
              </div>
              <div className="h-1 w-full bg-[#ebebeb] rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 transition-all duration-300 ${
                      strength.score >= step ? strength.color : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
          {state?.fieldErrors?.password && (
            <p role="alert" className="mt-1 text-[12px] text-[#e5484d] font-normal">
              {state.fieldErrors.password}
            </p>
          )}
        </div>

        {/* Confirmar Contraseña */}
        <div>
          <label
            htmlFor="confirmarPassword"
            className="block text-[13px] font-medium text-[#171717] mb-1.5"
          >
            Confirmar contraseña
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#8f8f8f]">
              <Lock size={14} />
            </div>
            <input
              id="confirmarPassword"
              name="confirmarPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              aria-invalid={!!state?.fieldErrors?.confirmarPassword}
              className={`w-full rounded-[6px] border bg-white pl-9 pr-10 py-2 text-[13px] text-[#171717] placeholder:text-[#8f8f8f] transition-all focus:outline-none focus:ring-1 focus:ring-[#171717] focus:border-[#171717] ${
                state?.fieldErrors?.confirmarPassword
                  ? 'border-[#e5484d] focus:border-[#e5484d] focus:ring-[#e5484d]'
                  : 'border-[#ebebeb] hover:border-[#a8a8a8]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#8f8f8f] hover:text-[#171717] focus:outline-none p-1 transition-colors"
              aria-label={showConfirmPassword ? 'Ocultar confirmación' : 'Mostrar confirmación'}
            >
              {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {confirmPassword.length > 0 && (
            <div className="mt-1 text-[12px]">
              {passwordsMatch ? (
                <span className="text-[#297a3a] flex items-center gap-1 font-medium">
                  <Check size={12} /> Las contraseñas coinciden
                </span>
              ) : (
                <span className="text-[#d97706]">Las contraseñas no coinciden</span>
              )}
            </div>
          )}
          {state?.fieldErrors?.confirmarPassword && (
            <p role="alert" className="mt-1 text-[12px] text-[#e5484d] font-normal">
              {state.fieldErrors.confirmarPassword}
            </p>
          )}
        </div>

        {/* Botón de Enviar / Pagar */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#171717] hover:bg-black/85 active:scale-[0.98] text-white font-medium text-[13px] py-2.5 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin text-white" />
                <span>Activando empresa y cuenta de Administrador...</span>
              </>
            ) : culqiChargeId ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Completar Activación de Empresa</span>
              </>
            ) : (
              <>
                <CreditCard size={14} className="text-[#E8A33D]" />
                <span>Proceder al Pago y Activación (Culqi)</span>
              </>
            )}
          </button>
        </div>

        {/* Enlace a Login */}
        <div className="pt-2 text-center">
          <p className="text-[13px] text-[#666666]">
            ¿Ya tienes cuenta autorizada?{' '}
            <Link
              href="/login"
              className="font-medium text-[#171717] hover:underline underline-offset-4"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </form>

      {/* Modal Checkout Culqi Simulado */}
      <CulqiCheckoutModal
        isOpen={isCulqiModalOpen}
        onClose={() => setIsCulqiModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        nombreNegocio={nombreNegocio}
        email={email}
        monto={149.0}
      />
    </>
  )
}
