'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { KeyRound, Trash2, X } from '../ui/icons'

interface ContextMenuState {
  href: string
  title: string
  x: number
  y: number
}

interface SidebarShortcutModalProps {
  contextMenu: ContextMenuState | null
  onCloseContextMenu: () => void
  recordingItem: { href: string; title: string } | null
  onOpenRecorder: (item: { href: string; title: string }) => void
  onCloseRecorder: () => void
  shortcuts: Record<string, string>
  allItems: Array<{ href: string; title: string }>
  onSaveShortcut: (href: string, combo: string) => void
  onRemoveShortcut: (href: string) => void
}

const RESERVED_SYSTEM_COMBOS = new Set([
  'Ctrl+K',
  'Ctrl+C',
  'Ctrl+V',
  'Ctrl+X',
  'Ctrl+A',
  'Ctrl+Z',
  'Ctrl+Y',
  'Ctrl+R',
  'Ctrl+W',
  'Ctrl+T',
])

export function formatKeyEventToCombo(e: KeyboardEvent): string | null {
  const key = e.key
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')

  if (parts.length === 0) return null

  const normalizedKey = key.length === 1 ? key.toUpperCase() : key
  parts.push(normalizedKey)
  return parts.join('+')
}

export function SidebarShortcutControls({
  contextMenu,
  onCloseContextMenu,
  recordingItem,
  onOpenRecorder,
  onCloseRecorder,
  shortcuts,
  allItems,
  onSaveShortcut,
  onRemoveShortcut,
}: SidebarShortcutModalProps) {
  const [capturedCombo, setCapturedCombo] = useState<string | null>(null)
  const [recorderError, setRecorderError] = useState<string | null>(null)

  // Cerrar menú contextual al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!contextMenu) return
    const close = () => onCloseContextMenu()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseContextMenu()
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [contextMenu, onCloseContextMenu])

  // Captura en vivo de combinación de 2 teclas cuando el modal está abierto
  useEffect(() => {
    if (!recordingItem) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCloseRecorder()
        return
      }

      e.preventDefault()
      e.stopPropagation()

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return
      }

      const combo = formatKeyEventToCombo(e)
      if (!combo) {
        setRecorderError('Presiona 2 teclas combinadas: Ctrl, Alt o Shift + una letra/número (ej. Ctrl + Q).')
        setCapturedCombo(null)
        return
      }

      if (RESERVED_SYSTEM_COMBOS.has(combo)) {
        setRecorderError(`"${combo}" está reservado por el sistema o buscador rápido. Elige otra combinación.`)
        setCapturedCombo(null)
        return
      }

      setRecorderError(null)
      setCapturedCombo(combo)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recordingItem, onCloseRecorder])

  if (typeof document === 'undefined') return null

  const currentComboForItem = recordingItem ? shortcuts[recordingItem.href] : undefined
  const activeComboToShow = capturedCombo ?? currentComboForItem ?? null
  const conflictTarget = capturedCombo
    ? allItems.find((i) => i.href !== recordingItem?.href && shortcuts[i.href] === capturedCombo)
    : undefined

  return (
    <>
      {/* Menú contextual con clic derecho */}
      {contextMenu &&
        createPortal(
          <div
            role="menu"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 230),
              top: Math.min(contextMenu.y, window.innerHeight - 130),
            }}
            onClick={(e) => e.stopPropagation()}
            className="fixed z-50 w-56 bg-white rounded-[8px] border border-[#E7E5DF] shadow-lg py-1.5 font-sans text-xs"
          >
            <div className="px-3 py-1.5 border-b border-[#F0EEEA] text-[11px] font-semibold text-[#6B7A72] truncate">
              {contextMenu.title}
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const target = { href: contextMenu.href, title: contextMenu.title }
                onCloseContextMenu()
                setCapturedCombo(null)
                setRecorderError(null)
                onOpenRecorder(target)
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FAFAF7] text-[#16201C] font-medium flex items-center justify-between gap-2"
            >
              <span className="inline-flex items-center gap-2">
                <KeyRound size={13} className="text-[#C97D1A]" />
                {shortcuts[contextMenu.href] ? 'Cambiar atajo de teclas' : 'Asignar atajo (2 teclas)'}
              </span>
              {shortcuts[contextMenu.href] && (
                <span className="text-[10px] font-semibold text-[#6B7A72]">
                  {shortcuts[contextMenu.href]}
                </span>
              )}
            </button>

            {shortcuts[contextMenu.href] && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onRemoveShortcut(contextMenu.href)
                  onCloseContextMenu()
                }}
                className="w-full text-left px-3 py-2 hover:bg-[#FAFAF7] text-[#C93B3B] font-medium flex items-center gap-2"
              >
                <Trash2 size={13} />
                Quitar atajo asignado
              </button>
            )}
          </div>,
          document.body
        )}

      {/* Modal grabador de combinación de 2 teclas */}
      {recordingItem &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Configurar atajo de teclado"
            onClick={onCloseRecorder}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16201C]/40 font-sans"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-[8px] border border-[#E7E5DF] p-5 space-y-4 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#16201C]">
                    Atajo rápido: {recordingItem.title}
                  </h2>
                  <p className="text-xs text-[#6B7A72] mt-0.5">
                    Presiona una combinación de 2 teclas (ej. Ctrl + Q o Alt + P).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseRecorder}
                  aria-label="Cerrar configurador de atajo"
                  className="p-1 text-[#6B7A72] hover:text-[#16201C] rounded-[4px]"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-4 rounded-[8px] border border-dashed border-[#E8A33D] bg-[#FAFAF7] text-center space-y-1">
                <span className="text-[11px] uppercase tracking-[0.05em] text-[#6B7A72] font-semibold block">
                  {capturedCombo ? 'Nueva combinación capturada' : 'Esperando teclas...'}
                </span>
                <div className="text-lg font-bold text-[#16201C] py-1">
                  {activeComboToShow || 'Presiona Ctrl / Alt + Tecla'}
                </div>
              </div>

              {recorderError && (
                <p role="alert" className="text-xs text-[#C93B3B] font-medium">
                  {recorderError}
                </p>
              )}

              {conflictTarget && !recorderError && (
                <p className="text-xs text-[#C97D1A] font-medium">
                  Aviso: &ldquo;{capturedCombo}&rdquo; está actualmente en &ldquo;{conflictTarget.title}&rdquo;. Al guardar se reasignará aquí.
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E7E5DF]">
                {currentComboForItem ? (
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveShortcut(recordingItem.href)
                      setCapturedCombo(null)
                      onCloseRecorder()
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold text-[#C93B3B] hover:bg-[#FAFAF7] rounded-[6px]"
                  >
                    Quitar atajo
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onCloseRecorder}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E7E5DF] rounded-[6px] text-[#16201C] hover:bg-[#FAFAF7]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!capturedCombo || Boolean(recorderError)}
                    onClick={() => {
                      if (!capturedCombo) return
                      onSaveShortcut(recordingItem.href, capturedCombo)
                      setCapturedCombo(null)
                      onCloseRecorder()
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#16201C] text-[#FAFAF7] rounded-[6px] hover:opacity-90 disabled:opacity-40"
                  >
                    Guardar atajo
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
