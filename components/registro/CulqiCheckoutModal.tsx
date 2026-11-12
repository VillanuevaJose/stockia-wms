'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
} from '../ui/icons'

export interface CulqiCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (chargeId: string) => void
  nombreNegocio?: string
  email?: string
  monto?: number
}

// Validación de tarjeta mediante algoritmo de Luhn
export function checkLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length !== 16) return false
  let sum = 0
  let isEven = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10)
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    isEven = !isEven
  }
  return sum % 10 === 0
}

export function checkExpiry(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false
  const month = parseInt(match[1], 10)
  const year = parseInt(match[2], 10)
  if (month < 1 || month > 12) return false
  if (year < 25) return false
  return true
}

export function checkCvv(cvv: string): boolean {
  return /^\d{3,4}$/.test(cvv)
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16)
  const parts: string[] = []
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4))
  }
  return parts.join(' ')
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`
  }
  return digits
}

function formatCvv(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4)
}

export function CulqiCheckoutModal({
  isOpen,
  onClose,
  onSuccess,
  nombreNegocio = 'Mi Empresa',
  email = '',
  monto = 149.0,
}: CulqiCheckoutModalProps) {
  const [numeroTarjeta, setNumeroTarjeta] = useState('')
  const [titular, setTitular] = useState('')
  const [vencimiento, setVencimiento] = useState('')
  const [cvv, setCvv] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const cardInputRef = useRef<HTMLInputElement>(null)

  // Enfocar input de tarjeta al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        cardInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Cerrar con Escape si no está procesando
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isProcessing, onClose])

  if (!isOpen) return null

  const handleClose = () => {
    if (!isProcessing) {
      setError(null)
      setIsProcessing(false)
      setIsSuccess(false)
      onClose()
    }
  }

  // Rellenar automáticamente datos de prueba válidos para Culqi Sandbox
  const handleUsarTarjetaPrueba = () => {
    setNumeroTarjeta('4111 1111 1111 1111')
    setVencimiento('12/28')
    setCvv('123')
    setTitular(nombreNegocio ? nombreNegocio.toUpperCase() : 'ADMINISTRADOR STOCKIA')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const rawCard = numeroTarjeta.replace(/\s+/g, '')

    if (!rawCard) {
      setError('Por favor ingresa el número de tarjeta.')
      return
    }

    if (rawCard.length !== 16) {
      setError('El número de tarjeta debe tener 16 dígitos.')
      return
    }

    if (!checkLuhn(rawCard)) {
      setError('Número de tarjeta inválido (falla validación algoritmo de Luhn).')
      return
    }

    if (!titular.trim()) {
      setError('Ingresa el nombre del titular de la tarjeta.')
      return
    }

    if (!checkExpiry(vencimiento)) {
      setError('Fecha de vencimiento inválida. Formato MM/AA (año posterior a 2025).')
      return
    }

    if (!checkCvv(cvv)) {
      setError('El código CVV debe tener 3 o 4 dígitos numéricos.')
      return
    }

    setIsProcessing(true)

    try {
      // Simulación de latencia con la pasarela Culqi
      await new Promise((resolve) => setTimeout(resolve, 950))

      // Generación de identificador de cargo Culqi en ambiente sandbox
      const chargeId = `chr_test_${Date.now()}`
      setIsSuccess(true)

      // Breve pausa para feedback visual del cobro completado
      setTimeout(() => {
        onSuccess(chargeId)
      }, 600)
    } catch {
      setError('Ocurrió un error al procesar el pago con Culqi. Inténtalo de nuevo.')
      setIsProcessing(false)
    }
  }

  const cardDigits = numeroTarjeta.replace(/\D/g, '')
  const isLuhnValid = cardDigits.length === 16 && checkLuhn(cardDigits)
  const isVisa = cardDigits.startsWith('4')
  const isMastercard = /^5[1-5]/.test(cardDigits)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16201C]/50 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="culqi-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) {
          handleClose()
        }
      }}
    >
      <div className="relative w-full max-w-md bg-[#FAFAF7] border border-[#E7E5DF] rounded-[8px] shadow-2xl p-6 sm:p-7 text-[#16201C] overflow-hidden">
        {/* Encabezado y botón de cierre */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E7E5DF]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[#E7E5DF]/70 text-[#6B7A72] text-[10px] font-semibold tracking-wider uppercase mb-1.5 font-mono">
              <Lock size={10} className="text-[#6B7A72]" />
              <span>Culqi Checkout · Sandbox</span>
            </div>
            <h2 id="culqi-modal-title" className="text-lg font-semibold tracking-tight text-[#16201C]">
              Activación de Cuenta Empresa
            </h2>
            <p className="text-[12px] text-[#6B7A72] mt-0.5">
              Suscripción mensual al sistema WMS multi-almacén
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="Cerrar modal de pago"
            className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#E7E5DF]/60 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Resumen Editorial de Cobro */}
        <div className="my-4 p-3.5 bg-white rounded-[6px] border border-[#E7E5DF] text-[12px] space-y-1.5">
          <div className="flex justify-between items-center text-[#6B7A72]">
            <span>Empresa / Razón Social:</span>
            <span className="font-medium text-[#16201C] truncate max-w-[200px]">
              {nombreNegocio || 'Nueva Empresa'}
            </span>
          </div>
          {email && (
            <div className="flex justify-between items-center text-[#6B7A72]">
              <span>Correo de facturación:</span>
              <span className="font-medium text-[#16201C] truncate max-w-[200px]">{email}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-[#E7E5DF] font-medium text-[13px]">
            <span className="text-[#16201C]">Total a facturar:</span>
            <span className="text-[#16201C] font-semibold tabular-nums text-[14px]">
              S/ {monto.toFixed(2)} PEN
            </span>
          </div>
        </div>

        {/* Botón Rápido de Tarjeta de Prueba */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleUsarTarjetaPrueba}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-[12px] font-medium text-[#16201C] bg-[#FAFAF7] hover:bg-[#E7E5DF]/60 border border-[#E7E5DF] rounded-[6px] transition-colors cursor-pointer disabled:opacity-50"
          >
            <CreditCard size={14} className="text-[#E8A33D]" />
            <span>Usar tarjeta de prueba 4111...</span>
          </button>
        </div>

        {/* Alerta de error */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-2.5 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-800 text-[12px] flex items-center gap-2"
          >
            <AlertTriangle size={14} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Formulario de Pago */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          {/* Número de Tarjeta */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="culqi-card-number" className="text-[12px] font-medium text-[#16201C]">
                Número de Tarjeta
              </label>
              <div className="flex items-center gap-1.5 text-[11px] text-[#6B7A72]">
                {isVisa && <span className="font-semibold text-blue-700">VISA</span>}
                {isMastercard && <span className="font-semibold text-red-600">MASTERCARD</span>}
                {isLuhnValid && (
                  <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                    <CheckCircle2 size={12} /> Luhn OK
                  </span>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#6B7A72]">
                <CreditCard size={14} />
              </div>
              <input
                ref={cardInputRef}
                id="culqi-card-number"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                disabled={isProcessing}
                value={numeroTarjeta}
                onChange={(e) => setNumeroTarjeta(formatCardNumber(e.target.value))}
                placeholder="4111 1111 1111 1111"
                className="w-full rounded-[6px] border border-[#E7E5DF] bg-white pl-9 pr-3 py-2 text-[13px] text-[#16201C] font-mono tracking-wider placeholder:text-[#6B7A72]/60 focus:outline-none focus:ring-1 focus:ring-[#E8A33D] focus:border-[#E8A33D] disabled:bg-[#FAFAF7]"
              />
            </div>
          </div>

          {/* Nombre en la tarjeta */}
          <div>
            <label htmlFor="culqi-card-holder" className="block text-[12px] font-medium text-[#16201C] mb-1">
              Nombre del Titular
            </label>
            <input
              id="culqi-card-holder"
              type="text"
              autoComplete="cc-name"
              disabled={isProcessing}
              value={titular}
              onChange={(e) => setTitular(e.target.value.toUpperCase())}
              placeholder="JUAN PEREZ"
              className="w-full rounded-[6px] border border-[#E7E5DF] bg-white px-3 py-2 text-[13px] text-[#16201C] uppercase placeholder:text-[#6B7A72]/60 focus:outline-none focus:ring-1 focus:ring-[#E8A33D] focus:border-[#E8A33D] disabled:bg-[#FAFAF7]"
            />
          </div>

          {/* Vencimiento y CVV */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="culqi-card-expiry" className="block text-[12px] font-medium text-[#16201C] mb-1">
                Vencimiento (MM/AA)
              </label>
              <input
                id="culqi-card-expiry"
                type="text"
                inputMode="numeric"
                autoComplete="cc-exp"
                maxLength={5}
                disabled={isProcessing}
                value={vencimiento}
                onChange={(e) => setVencimiento(formatExpiry(e.target.value))}
                placeholder="12/28"
                className="w-full rounded-[6px] border border-[#E7E5DF] bg-white px-3 py-2 text-[13px] text-[#16201C] font-mono placeholder:text-[#6B7A72]/60 focus:outline-none focus:ring-1 focus:ring-[#E8A33D] focus:border-[#E8A33D] disabled:bg-[#FAFAF7]"
              />
            </div>
            <div>
              <label htmlFor="culqi-card-cvv" className="block text-[12px] font-medium text-[#16201C] mb-1">
                CVV
              </label>
              <input
                id="culqi-card-cvv"
                type="password"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                disabled={isProcessing}
                value={cvv}
                onChange={(e) => setCvv(formatCvv(e.target.value))}
                placeholder="123"
                className="w-full rounded-[6px] border border-[#E7E5DF] bg-white px-3 py-2 text-[13px] text-[#16201C] font-mono tracking-widest placeholder:text-[#6B7A72]/60 focus:outline-none focus:ring-1 focus:ring-[#E8A33D] focus:border-[#E8A33D] disabled:bg-[#FAFAF7]"
              />
            </div>
          </div>

          {/* Botón de Pago */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 rounded-[6px] bg-[#16201C] hover:bg-black/90 active:scale-[0.99] text-[#FAFAF7] font-medium text-[13px] py-2.5 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={14} className="animate-spin text-[#FAFAF7]" />
                  <span>{isSuccess ? '¡Pago aprobado!' : 'Procesando cargo en Culqi...'}</span>
                </>
              ) : (
                <>
                  <Lock size={14} className="text-[#E8A33D]" />
                  <span>Pagar S/ {monto.toFixed(2)} y Activar Empresa</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Garantía de Seguridad */}
        <div className="mt-4 pt-3 border-t border-[#E7E5DF] flex items-center justify-center gap-1.5 text-[11px] text-[#6B7A72]">
          <ShieldCheck size={13} className="text-[#6B7A72]" />
          <span>Transacción simulada de prueba para onboarding administrativo</span>
        </div>
      </div>
    </div>
  )
}
