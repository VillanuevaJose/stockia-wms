'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { X } from '../ui/icons'

interface BarcodeScannerProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const hasScannedRef = useRef(false)

  const stopScanner = useCallback(async () => {
    try {
      const scanner = html5QrCodeRef.current
      if (scanner) {
        const state = scanner.getState()
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
          await scanner.stop()
        }
        scanner.clear()
        html5QrCodeRef.current = null
      }
    } catch {
      // Ignorar errores de limpieza
    }
  }, [])

  const handleClose = useCallback(() => {
    stopScanner()
    onClose()
  }, [stopScanner, onClose])

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    hasScannedRef.current = false
    setError(null)
    setIsStarting(true)

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')

        if (cancelled) return

        const scannerId = 'barcode-scanner-region'
        const scanner = new Html5Qrcode(scannerId)
        html5QrCodeRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.5,
            disableFlip: false,
          },
          (decodedText) => {
            if (hasScannedRef.current) return
            hasScannedRef.current = true
            onScan(decodedText)
            stopScanner()
            onClose()
          },
          () => {
            // Escaneo en progreso, sin resultado aún
          }
        )

        if (cancelled) {
          await stopScanner()
          return
        }

        setIsStarting(false)
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes('Permission') || msg.includes('NotAllowed')) {
            setError('Permiso de cámara denegado. Habilítalo en la configuración del navegador.')
          } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
            setError('No se detectó ninguna cámara en este dispositivo.')
          } else {
            setError('No se pudo iniciar la cámara: ' + msg)
          }
          setIsStarting(false)
        }
      }
    }

    // Pequeño delay para que el DOM esté montado
    const timer = setTimeout(startScanner, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
      stopScanner()
    }
  }, [isOpen, onScan, onClose, stopScanner])

  // ESC para cerrar
  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Cabecera */}
        <div className="flex items-center justify-between p-3 border-b border-[#E7E5DF]">
          <div>
            <h3 className="text-sm font-bold text-[#16201C]">Escáner de Código de Barras</h3>
            <p className="text-[11px] text-[#6B7A72]">Acerca el código de barras a la cámara</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded text-[#6B7A72] hover:text-[#16201C] hover:bg-[#F4F3EF] transition-colors"
            aria-label="Cerrar escáner"
          >
            <X size={16} />
          </button>
        </div>

        {/* Visor de cámara */}
        <div className="relative bg-black" style={{ minHeight: 260 }}>
          <div id="barcode-scanner-region" ref={scannerRef} className="w-full" />

          {isStarting && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Iniciando cámara…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-center bg-white/95 rounded-lg p-4 mx-2">
                <p className="text-xs text-[#C93B3B] font-medium">{error}</p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 px-3 py-1 text-xs rounded bg-[#16201C] text-white hover:bg-black transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="p-3 border-t border-[#E7E5DF] bg-[#FAFAF7]">
          <p className="text-[11px] text-[#6B7A72] text-center">
            Compatible con EAN-13, EAN-8, UPC-A, Code 128 y QR
          </p>
        </div>
      </div>
    </div>
  )
}
