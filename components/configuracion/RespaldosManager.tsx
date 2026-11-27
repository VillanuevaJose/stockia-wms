'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  History,
  Loader2,
  ShieldCheck,
  Upload,
} from '../ui/icons'
import {
  generarSnapshotAutomaticoAction,
  verificarRespaldoJsonAction,
  type RespaldoHistorialItem,
  type VerificacionRespaldoResult,
} from '../../lib/actions/respaldos'

interface Props {
  historialInicial: RespaldoHistorialItem[]
  negocioId: string
}

type AutoBackupFreq = 'off' | '12h' | '24h'

const FREQ_EVENT = 'stockia-autobackup-freq-change'

function subscribeFreq(cb: () => void) {
  window.addEventListener('storage', cb)
  window.addEventListener(FREQ_EVENT, cb)
  return () => {
    window.removeEventListener('storage', cb)
    window.removeEventListener(FREQ_EVENT, cb)
  }
}

export function RespaldosManager({ historialInicial, negocioId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const autoCheckDoneRef = useRef(false)

  const storageKey = `stockia:autobackup:${negocioId || 'default'}`

  const getFreqSnapshot = useCallback((): AutoBackupFreq => {
    try {
      const val = window.localStorage.getItem(storageKey)
      if (val === '12h' || val === '24h' || val === 'off') return val
    } catch {
      // ignore
    }
    return '24h'
  }, [storageKey])

  const getServerFreq = useCallback((): AutoBackupFreq => '24h', [])

  const autoFreq = useSyncExternalStore(subscribeFreq, getFreqSnapshot, getServerFreq)

  const [isPending, startTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)
  const [verificacion, setVerificacion] = useState<VerificacionRespaldoResult | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const setAutoFreq = (freq: AutoBackupFreq) => {
    try {
      window.localStorage.setItem(storageKey, freq)
      window.dispatchEvent(new Event(FREQ_EVENT))
    } catch {
      // ignore
    }
  }

  // Disparo silencioso de respaldo automático según la frecuencia configurada
  useEffect(() => {
    if (autoCheckDoneRef.current || autoFreq === 'off' || !negocioId) return
    autoCheckDoneRef.current = true

    const ultimoAuto = historialInicial.find((h) => h.tipo === 'AUTOMATICO')
    const horasTranscurridas = ultimoAuto
      ? (Date.now() - new Date(ultimoAuto.fecha).getTime()) / (1000 * 60 * 60)
      : 999
    const umbralHoras = autoFreq === '12h' ? 12 : 24

    if (horasTranscurridas >= umbralHoras) {
      void generarSnapshotAutomaticoAction().then((res) => {
        if (res.success) {
          router.refresh()
        }
      })
    }
  }, [autoFreq, historialInicial, negocioId, router])

  const handleDescargarManual = async () => {
    setIsDownloading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/respaldos/export')
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setFeedback({
          type: 'error',
          message: body.error || 'No se pudo generar el respaldo manual.',
        })
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `stockia-respaldo-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setFeedback({
        type: 'success',
        message: 'Respaldo completo descargado y firmado con hash SHA-256.',
      })
      router.refresh()
    } catch {
      setFeedback({ type: 'error', message: 'Error de red al descargar el respaldo.' })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSnapshotAhora = () => {
    setFeedback(null)
    startTransition(async () => {
      const res = await generarSnapshotAutomaticoAction()
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Snapshot automático preventivo registrado correctamente en auditoría.',
        })
        router.refresh()
      } else {
        setFeedback({ type: 'error', message: res.error || 'No se pudo generar el snapshot.' })
      }
    })
  }

  const handleVerificarArchivo = async (file: File) => {
    setVerificacion(null)
    setFeedback(null)
    const texto = await file.text()
    startTransition(async () => {
      const res = await verificarRespaldoJsonAction(texto)
      setVerificacion(res)
    })
  }

  return (
    <div className="space-y-6 font-sans">
      {feedback && (
        <div
          role="status"
          className={`px-4 py-3 rounded-[8px] border text-[13px] flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-[#FAFAF7] border-[#2A7A4C] text-[#16201C]'
              : 'bg-[#FAFAF7] border-[#C93B3B] text-[#C93B3B]'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-[#2A7A4C] shrink-0" />
          ) : (
            <AlertTriangle size={16} className="text-[#C93B3B] shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Tarjetas de Respaldo Manual y Automático */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Manual */}
        <section className="bg-white rounded-[8px] border border-[#E7E5DF] p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-[#16201C]" />
              <h2 className="text-base font-bold text-[#16201C]">Respaldo Manual Portátil</h2>
            </div>
            <p className="text-xs text-[#6B7A72] leading-relaxed">
              Exporta en un solo archivo JSON toda la información aislada de tu empresa (productos, stock por sede, Kardex, compras, ventas, clientes y proveedores) sellada con firma criptográfica SHA-256.
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#E7E5DF]">
            <span className="text-[11px] text-[#6B7A72]">Formato: stockia-backup-v1 (.json)</span>
            <button
              type="button"
              onClick={handleDescargarManual}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#16201C] text-[#FAFAF7] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
            >
              {isDownloading && <Loader2 size={13} className="animate-spin" />}
              <span>{isDownloading ? 'Generando...' : 'Descargar Respaldo Ahora'}</span>
            </button>
          </div>
        </section>

        {/* Automático */}
        <section className="bg-white rounded-[8px] border border-[#E7E5DF] p-5 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <History size={16} className="text-[#C97D1A]" />
                <h2 className="text-base font-bold text-[#16201C]">Respaldo Automático Programado</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2A7A4C]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2A7A4C]" aria-hidden="true" />
                {autoFreq === 'off' ? 'Pausado' : `Activo (${autoFreq})`}
              </span>
            </div>
            <p className="text-xs text-[#6B7A72] leading-relaxed">
              Genera puntos de control automáticos en el historial inmutable de auditoría para verificar el estado del inventario y catálogo ante cambios masivos.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#E7E5DF]">
            <div
              role="group"
              aria-label="Frecuencia de respaldo automático"
              className="inline-flex items-center p-0.5 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF]"
            >
              {([
                { id: 'off', label: 'Desactivado' },
                { id: '12h', label: 'Cada 12h' },
                { id: '24h', label: 'Diario (24h)' },
              ] as const).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAutoFreq(opt.id)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-[4px] transition-colors ${
                    autoFreq === opt.id
                      ? 'bg-[#16201C] text-[#FAFAF7]'
                      : 'text-[#6B7A72] hover:text-[#16201C]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleSnapshotAhora}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] bg-white hover:bg-[#FAFAF7] text-xs font-semibold text-[#16201C] disabled:opacity-50"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              <span>Tomar Snapshot Ahora</span>
            </button>
          </div>
        </section>
      </div>

      {/* Verificador Criptográfico de Integridad (Dry-Run) */}
      <section className="bg-white rounded-[8px] border border-[#E7E5DF] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#2A7A4C]" />
              <h2 className="text-base font-bold text-[#16201C]">
                Verificador de Integridad SHA-256 (Vista Previa)
              </h2>
            </div>
            <p className="text-xs text-[#6B7A72] mt-0.5">
              Comprueba que un archivo `.json` descargado no fue manipulado y revisa cuántos registros contiene antes de usarlo.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleVerificarArchivo(file)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[6px] border border-[#E7E5DF] bg-[#FAFAF7] hover:border-[#16201C] text-xs font-semibold text-[#16201C]"
          >
            <Upload size={13} />
            <span>Validar Archivo .json</span>
          </button>
        </div>

        {verificacion && (
          <div
            className={`p-4 rounded-[6px] border text-xs space-y-2 ${
              verificacion.valid
                ? 'bg-[#FAFAF7] border-[#2A7A4C]'
                : 'bg-[#FAFAF7] border-[#C93B3B]'
            }`}
          >
            {verificacion.error ? (
              <p className="font-semibold text-[#C93B3B]">{verificacion.error}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-[#2A7A4C]">
                    Integridad SHA-256 verificada · Archivo auténtico
                  </span>
                  <span className="text-[#6B7A72]">
                    {verificacion.misma_empresa
                      ? 'Pertenece a tu empresa actual'
                      : 'Advertencia: pertenece a otra empresa'}
                  </span>
                </div>
                <p className="text-[#16201C] tabular-nums">
                  Empresa: <strong>{verificacion.negocio_nombre}</strong> · Fecha:{' '}
                  {verificacion.generated_at
                    ? new Date(verificacion.generated_at).toLocaleString('es-PE')
                    : '-'}
                </p>
                {verificacion.counts && (
                  <div className="flex flex-wrap gap-3 pt-1 text-[#6B7A72] tabular-nums">
                    {Object.entries(verificacion.counts).map(([k, v]) => (
                      <span key={k}>
                        <strong className="text-[#16201C]">{v}</strong> {k}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Historial de Respaldos */}
      <section className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFAF7] border-b border-[#E7E5DF] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#16201C]">Historial de Respaldos Registrados</h2>
          <span className="text-[11px] text-[#6B7A72] tabular-nums">
            {historialInicial.length} eventos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-[0.06em] font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Fecha y Hora</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Ejecutado por</th>
                <th className="py-2.5 px-3">Registros</th>
                <th className="py-2.5 px-3 text-right">Tamaño</th>
                <th className="py-2.5 px-3.5 text-right">Firma SHA-256</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C] tabular-nums">
              {historialInicial.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#6B7A72]">
                    Aún no hay respaldos registrados. Descarga tu primer respaldo manual arriba.
                  </td>
                </tr>
              ) : (
                historialInicial.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFAF7]">
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {new Date(item.fecha).toLocaleString('es-PE')}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.tipo === 'MANUAL' ? 'bg-[#16201C]' : 'bg-[#C97D1A]'
                          }`}
                        />
                        {item.tipo === 'MANUAL' ? 'Manual (.json)' : 'Automático'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#6B7A72]">{item.usuario_nombre}</td>
                    <td className="py-2.5 px-3 text-[#6B7A72]">
                      {item.counts.productos ?? 0} prod · {item.counts.inventario ?? 0} inv
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium">{item.tamano_kb} KB</td>
                    <td className="py-2.5 px-3.5 text-right text-[#6B7A72]">
                      {item.checksum_sha256 ? `${item.checksum_sha256.slice(0, 14)}...` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
