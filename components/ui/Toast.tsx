'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from './icons'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastMessage {
  id: string
  title: string
  description?: string
  type: ToastType
}

type ToastListener = (toast: ToastMessage) => void

const listeners: Set<ToastListener> = new Set()

export const toast = {
  success: (title: string, options?: { description?: string }) => {
    emit({ id: Math.random().toString(36).slice(2), title, description: options?.description, type: 'success' })
  },
  error: (title: string, options?: { description?: string }) => {
    emit({ id: Math.random().toString(36).slice(2), title, description: options?.description, type: 'error' })
  },
  warning: (title: string, options?: { description?: string }) => {
    emit({ id: Math.random().toString(36).slice(2), title, description: options?.description, type: 'warning' })
  },
  info: (title: string, options?: { description?: string }) => {
    emit({ id: Math.random().toString(36).slice(2), title, description: options?.description, type: 'info' })
  },
}

function emit(msg: ToastMessage) {
  listeners.forEach((listener) => listener(msg))
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handleToast: ToastListener = (newToast) => {
      setToasts((prev) => [...prev, newToast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id))
      }, 4000)
    }

    listeners.add(handleToast)
    return () => {
      listeners.delete(handleToast)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none font-sans"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex items-start gap-2.5 p-3 rounded-[6px] bg-white border border-[#E7E5DF] text-[#16201C] text-[13px] transition-all"
        >
          {item.type === 'success' && <CheckCircle2 className="text-[#2A7A4C] mt-0.5 shrink-0" size={15} />}
          {item.type === 'error' && <XCircle className="text-[#C93B3B] mt-0.5 shrink-0" size={15} />}
          {item.type === 'warning' && <AlertTriangle className="text-[#C97D1A] mt-0.5 shrink-0" size={15} />}
          {item.type === 'info' && <CheckCircle2 className="text-[#16201C] mt-0.5 shrink-0" size={15} />}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-[#16201C] text-[13px]">{item.title}</p>
            {item.description && <p className="text-[#6B7A72] text-[12px] mt-0.5 leading-normal">{item.description}</p>}
          </div>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== item.id))}
            className="text-[#6B7A72] hover:text-[#16201C] p-0.5 rounded-[4px] hover:bg-[#F4F3EF] transition-colors"
            aria-label="Cerrar notificación"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
