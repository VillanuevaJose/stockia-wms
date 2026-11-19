'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Camera, X } from '@/components/ui/icons'

interface PosCameraModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

function PosCameraModalContent({
  onClose,
  onScan,
}: {
  onClose: () => void
  onScan: (code: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let intervalId: NodeJS.Timeout | null = null

    navigator.mediaDevices
      ?.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        mediaStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }

        if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
          const detector = new (window as unknown as {
            BarcodeDetector: new (opts: unknown) => {
              detect: (el: unknown) => Promise<Array<{ rawValue: string }>>
            }
          }).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
          })

          intervalId = setInterval(async () => {
            if (
              videoRef.current &&
              videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
            ) {
              try {
                const codes = await detector.detect(videoRef.current)
                if (codes && codes.length > 0) {
                  const rawValue = codes[0].rawValue
                  if (rawValue) {
                    onScan(rawValue)
                    onClose()
                  }
                }
              } catch {
                // Frame capture skip
              }
            }
          }, 350)
        }
      })
      .catch((err) => {
        setCameraError(
          'No se pudo acceder a la cámara. Concede permisos de video en el navegador o usa la pistola de barras.'
        )
        console.warn('Camera error:', err)
      })

    return () => {
      active = false
      if (intervalId) clearInterval(intervalId)
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [onScan, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-white rounded-[10px] max-w-md w-full overflow-hidden border border-[#E7E5DF] shadow-2xl">
        <div className="p-4 bg-[#16201C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={16} />
            <h4 className="text-[14px] font-bold">Lector Óptico de Código de Barras</h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative bg-black rounded-[8px] overflow-hidden aspect-4/3 flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-56 h-32 border-2 border-emerald-400 rounded-[6px] relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500 animate-pulse" />
              </div>
              <span className="text-white text-[11px] font-sans mt-3 bg-black/60 px-2 py-0.5 rounded">
                Apunta la cámara a la etiqueta del producto
              </span>
            </div>
          </div>

          {cameraError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-[12px] rounded-[6px]">
              {cameraError}
            </div>
          )}

          <div className="pt-2 border-t border-[#E7E5DF]">
            <label className="block text-[11px] text-[#6B7A72] font-semibold mb-1 uppercase">
              O escribe el código de barras manualmente:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="manual-barcode-input"
                placeholder="Ej. 7750123456789"
                className="flex-1 px-3 py-1.5 text-[13px] border border-[#E7E5DF] rounded-[6px] focus:outline-none focus:border-[#16201C]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value
                    if (val) {
                      onScan(val)
                      onClose()
                    }
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(
                    'manual-barcode-input'
                  ) as HTMLInputElement | null
                  if (input?.value) {
                    onScan(input.value)
                    onClose()
                  }
                }}
                className="px-3 py-1.5 bg-[#16201C] text-white text-[12px] font-medium rounded-[6px]"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#FAFAF7] border-t border-[#E7E5DF] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-[13px] text-[#16201C] hover:bg-[#E7E5DF] rounded-[6px] font-medium transition-colors"
          >
            Cerrar Cámara
          </button>
        </div>
      </div>
    </div>
  )
}

export function PosCameraModal({ isOpen, onClose, onScan }: PosCameraModalProps) {
  if (!isOpen) return null
  return <PosCameraModalContent onClose={onClose} onScan={onScan} />
}
