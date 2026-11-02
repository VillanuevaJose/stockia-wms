'use client'

import { useState, useTransition } from 'react'
import {
  Mail,
  Truck,
  ArrowRight,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  History,
  Building2,
  ShieldCheck,
  Trash2,
  Warehouse,
} from '../ui/icons'
import {
  crearSolicitudSedesAction,
  responderSolicitudSedesAction,
  anularSolicitudSedesAction,
} from '../../lib/actions/sedes'
import type { SolicitudSedeRow } from '../../lib/queries/sedes'
import type { AlmacenDetailRow } from '../../lib/queries/operaciones'

interface Props {
  almacenes: AlmacenDetailRow[]
  historial: SolicitudSedeRow[]
  productos: { id: string; nombre: string; sku: string }[]
  userAlmacenId?: string | null
  userRol?: 'admin' | 'almacenero' | 'vendedor'
}

export function ComunicacionSedesManager({
  almacenes,
  historial,
  productos,
  userAlmacenId,
  userRol = 'admin',
}: Props) {
  const esAdminReal = userRol === 'admin'
  const userSedeAsignada = userAlmacenId ? almacenes.find((a) => a.id === userAlmacenId) : null

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'comunicacion' | 'sedes'>('comunicacion')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sede activa desde la que se opera en pantalla (si no es admin, fijada a su sede asignada)
  const [sedeActivaId, setSedeActivaId] = useState<string>(
    esAdminReal ? 'TODAS' : userAlmacenId || almacenes[0]?.id || 'TODAS'
  )

  // Form states para emitir nueva solicitud
  const sedeOrigenInicial = userAlmacenId
    ? userAlmacenId
    : sedeActivaId !== 'TODAS'
    ? sedeActivaId
    : almacenes[0]?.id || ''

  const [sedeOrigenId, setSedeOrigenId] = useState(sedeOrigenInicial)
  const destinoInicial = almacenes.find((a) => a.id !== sedeOrigenInicial)?.id || almacenes[1]?.id || ''
  const [sedeDestinoId, setSedeDestinoId] = useState(destinoInicial)

  const [productoId, setProductoId] = useState(productos[0]?.id || '')
  const [cantidad, setCantidad] = useState(10)
  const [prioridad, setPrioridad] = useState<'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'>('MEDIA')
  const [mensaje, setMensaje] = useState('')

  const handleOpenCrearDrawer = () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    // Determinar la sede emisora: fijada a la sede asignada del usuario o a la perspectiva activa
    const origen = userAlmacenId
      ? userAlmacenId
      : sedeActivaId !== 'TODAS'
      ? sedeActivaId
      : almacenes[0]?.id || ''

    setSedeOrigenId(origen)

    // Sede receptora automáticamente distinta
    const destinosValidos = almacenes.filter((a) => a.id !== origen)
    setSedeDestinoId(destinosValidos[0]?.id || '')
    setDrawerOpen(true)
  }

  // Responder modal state
  const [respondingItem, setRespondingItem] = useState<SolicitudSedeRow | null>(null)
  const [nuevoEstado, setNuevoEstado] = useState<'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO'>('EN_TRANSITO')
  const [respuestaTexto, setRespuestaTexto] = useState('')

  const handleCrearSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (sedeOrigenId === sedeDestinoId) {
      setErrorMsg('La sede emisora y receptora deben ser distintas.')
      return
    }

    if (!mensaje.trim() || mensaje.trim().length < 5) {
      setErrorMsg('El mensaje o motivo de comunicación debe tener al menos 5 caracteres.')
      return
    }

    startTransition(async () => {
      const res = await crearSolicitudSedesAction({
        sede_origen_id: sedeOrigenId,
        sede_destino_id: sedeDestinoId,
        producto_id: productoId || undefined,
        cantidad,
        prioridad,
        mensaje: mensaje.trim(),
      })

      if (res.success) {
        setSuccessMsg('Requerimiento emitido exitosamente. Queda a la espera de atención por la sede de destino.')
        setMensaje('')
        setDrawerOpen(false)
      } else {
        setErrorMsg(res.error || 'Error al emitir comunicación entre sedes.')
      }
    })
  }

  const handleResponderSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!respondingItem) return
    setErrorMsg(null)

    startTransition(async () => {
      const res = await responderSolicitudSedesAction({
        solicitud_id: respondingItem.id,
        nuevo_estado: nuevoEstado,
        respuesta: respuestaTexto.trim() || 'Estado actualizado por la sede autorizada.',
      })

      if (res.success) {
        setSuccessMsg(
          nuevoEstado === 'EN_TRANSITO'
            ? 'Carga despachada en camión. Sede de destino notificada.'
            : nuevoEstado === 'RECIBIDO'
            ? 'Recepción confirmada e ingresada a stock.'
            : 'Solicitud rechazada.'
        )
        setRespondingItem(null)
        setRespuestaTexto('')
      } else {
        setErrorMsg(res.error || 'No se pudo actualizar la respuesta.')
      }
    })
  }

  const handleAnular = (id: string) => {
    if (!confirm('¿Deseas anular esta solicitud? Esta acción la retirará del flujo.')) return
    setErrorMsg(null)
    setSuccessMsg(null)
    startTransition(async () => {
      const res = await anularSolicitudSedesAction(id)
      if (res.success) {
        setSuccessMsg('Solicitud anulada y retirada correctamente.')
      } else {
        setErrorMsg(res.error || 'No se pudo anular la solicitud.')
      }
    })
  }

  const pendientesCount = historial.filter((h) => h.estado === 'PENDIENTE').length
  const enTransitoCount = historial.filter((h) => h.estado === 'EN_TRANSITO').length

  const sedeActivaObj = almacenes.find((a) => a.id === sedeActivaId)

  return (
    <div className="space-y-6">
      {/* Selector de perspectiva y pestañas */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E7E5DF] pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('comunicacion')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors cursor-pointer ${
              activeTab === 'comunicacion'
                ? 'bg-[#16201C] text-white'
                : 'bg-white text-[#6B7A72] hover:text-[#16201C] border border-[#E7E5DF]'
            }`}
          >
            <History size={14} />
            <span>Historial y Comunicación ({historial.length})</span>
            {enTransitoCount > 0 && (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {enTransitoCount} en ruta
              </span>
            )}
            {pendientesCount > 0 && <span className="w-2 h-2 rounded-full bg-[#E57373]" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sedes')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors cursor-pointer ${
              activeTab === 'sedes'
                ? 'bg-[#16201C] text-white'
                : 'bg-white text-[#6B7A72] hover:text-[#16201C] border border-[#E7E5DF]'
            }`}
          >
            <Building2 size={14} />
            <span>Directorio de Sedes ({almacenes.length})</span>
          </button>
        </div>

        {/* Selector de Perspectiva de Sede */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {!esAdminReal && userSedeAsignada ? (
            <div className="flex items-center gap-2 bg-[#FAFAF7] px-3 py-1 rounded-[6px] border border-[#E7E5DF] text-[12px]">
              <span className="w-2 h-2 rounded-full bg-[#2E7D32]" />
              <span className="text-[#6B7A72] font-medium whitespace-nowrap">Tu Sede Asignada:</span>
              <span className="font-bold text-[#16201C]">{userSedeAsignada.nombre}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#FAFAF7] px-2.5 py-1 rounded-[6px] border border-[#E7E5DF] text-[12px]">
              <span className="text-[#6B7A72] font-medium whitespace-nowrap">Perspectiva:</span>
              <select
                value={sedeActivaId}
                onChange={(e) => setSedeActivaId(e.target.value)}
                className="bg-transparent font-semibold text-[#16201C] focus:outline-none cursor-pointer text-[12px]"
              >
                <option value="TODAS">Vista General (Super-Admin)</option>
                {almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenCrearDrawer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Emitir Solicitud</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-800 text-[13px] flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[13px] flex items-center gap-2">
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PESTAÑA 1: COMUNICACIÓN E HISTORIAL CON SEGREGACIÓN */}
      {activeTab === 'comunicacion' && (
        <div className="space-y-4">
          {/* Banner explicativo del control de roles */}
          <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] flex items-center justify-between text-[12px] text-[#6B7A72]">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-[#2E7D32]" />
              <span>
                <strong>Segregación de funciones activa:</strong>{' '}
                {sedeActivaId === 'TODAS'
                  ? 'Como Super-Admin puedes auditar el flujo completo de las 3 sedes.'
                  : `Estás conectado como encargado de ${sedeActivaObj?.nombre}. Solo puedes atender pedidos dirigidos a tu sede y confirmar llegadas de camión.`}
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#16201C] hidden md:inline">
              ISO / WMS Control
            </span>
          </div>

          {/* Feed de historial */}
          {historial.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-[8px] border border-dashed border-[#E7E5DF]">
              <Mail size={32} className="mx-auto text-[#6B7A72] mb-2 opacity-60" />
              <h3 className="font-semibold text-[#16201C] text-[15px]">Sin solicitudes registradas</h3>
              <p className="text-[13px] text-[#6B7A72] max-w-md mx-auto mt-1">
                Usa el botón &quot;Emitir Solicitud&quot; para enviar un pedido formal de mercadería entre sedes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historial.map((item) => {
                const esEmisor = sedeActivaId === item.sede_origen?.id
                const esReceptor = sedeActivaId === item.sede_destino?.id
                const esAdmin = sedeActivaId === 'TODAS'

                // Reglas de negocio para autorización de respuesta
                const puedeDespachar =
                  item.estado === 'PENDIENTE' && (esReceptor || esAdmin)
                const puedeConfirmarRecepcion =
                  item.estado === 'EN_TRANSITO' && (esEmisor || esAdmin)

                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 bg-white rounded-[8px] border border-[#E7E5DF] hover:border-[#16201C] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5DF] pb-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap text-[13px]">
                        <span className="font-semibold text-[#16201C] bg-[#FAFAF7] px-2.5 py-1 rounded-[4px] border border-[#E7E5DF]">
                          {item.sede_origen?.nombre || 'Sede Emisora'}
                        </span>
                        <ArrowRight size={14} className="text-[#6B7A72]" />
                        <span className="font-semibold text-[#16201C] bg-[#FAFAF7] px-2.5 py-1 rounded-[4px] border border-[#E7E5DF]">
                          {item.sede_destino?.nombre || 'Sede Receptora'}
                        </span>

                        {item.prioridad === 'URGENTE' && (
                          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200">
                            URGENTE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px] ${
                            item.estado === 'PENDIENTE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : item.estado === 'EN_TRANSITO'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.estado === 'RECIBIDO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                          }`}
                        >
                          {item.estado === 'PENDIENTE'
                            ? 'PENDIENTE DE DESPACHO'
                            : item.estado === 'EN_TRANSITO'
                            ? 'EN TRÁNSITO (CAMIÓN EN RUTA)'
                            : item.estado === 'RECIBIDO'
                            ? 'MERCADERÍA RECIBIDA'
                            : 'RECHAZADO'}
                        </span>
                        <span className="text-[11px] font-mono text-[#6B7A72]">
                          {new Date(item.fecha_solicitud).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Contenido del mensaje */}
                    <div className="space-y-2 text-[13px]">
                      <p className="text-[#16201C] font-medium leading-relaxed">
                        &ldquo;{item.mensaje}&rdquo;
                      </p>

                      {item.producto && (
                        <div className="inline-flex items-center gap-2 text-[12px] bg-[#FAFAF7] px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] text-[#6B7A72]">
                          <span className="font-medium text-[#16201C]">{item.producto.nombre}</span>
                          <span>·</span>
                          <span className="font-mono text-[11px]">SKU: {item.producto.sku}</span>
                          <span>·</span>
                          <span className="font-mono font-semibold text-[#16201C]">
                            Cant: {item.cantidad}
                          </span>
                        </div>
                      )}

                      {/* Respuesta y Trazabilidad */}
                      {item.respuesta && (
                        <div className="mt-3 p-3 rounded-[6px] bg-[#FAFAF7] border-l-2 border-[#16201C] text-[12px] text-[#6B7A72]">
                          <strong className="text-[#16201C] block mb-0.5">
                            Atención de la Sede Receptora:
                          </strong>
                          <p>{item.respuesta}</p>
                        </div>
                      )}
                    </div>

                    {/* Barra de acción con Segregación Estricta */}
                    <div className="mt-4 pt-3 border-t border-[#E7E5DF] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px]">
                      <span className="text-[#6B7A72] font-mono text-[11px]">
                        Emisor: {item.usuario_emisor?.nombre_completo || 'Administrador'}
                      </span>

                      {/* 1. ESTADO PENDIENTE */}
                      {item.estado === 'PENDIENTE' && (
                        <div>
                          {puedeDespachar ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRespondingItem(item)
                                setNuevoEstado('EN_TRANSITO')
                                setRespuestaTexto('Despachado en transporte hacia la sede solicitante.')
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium transition-colors cursor-pointer"
                            >
                              <Truck size={14} />
                              <span>Atender y Despachar a {item.sede_origen?.nombre}</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="inline-flex items-center gap-1.5 text-[12px] text-[#B45309] bg-amber-50 px-2.5 py-1 rounded-[4px] border border-amber-200">
                                <History size={13} />
                                <span>
                                  Esperando despacho de {item.sede_destino?.nombre} (No autorizada auto-aprobación)
                                </span>
                              </div>

                              {(esEmisor || esAdmin) && (
                                <button
                                  type="button"
                                  onClick={() => handleAnular(item.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                                  title="Anular requerimiento si ya no es necesario"
                                >
                                  <Trash2 size={12} />
                                  <span>Anular Solicitud</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. ESTADO EN TRÁNSITO */}
                      {item.estado === 'EN_TRANSITO' && (
                        <div>
                          {puedeConfirmarRecepcion ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRespondingItem(item)
                                setNuevoEstado('RECIBIDO')
                                setRespuestaTexto('Mercadería física recibida en almacén y cotejada en estante.')
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-[12px] font-medium transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={14} />
                              <span>Confirmar Recepción de Carga</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-[12px] text-[#1E40AF] bg-blue-50 px-2.5 py-1 rounded-[4px] border border-blue-200">
                              <Truck size={13} />
                              <span>Carga en ruta hacia {item.sede_origen?.nombre}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. ESTADO RECIBIDO */}
                      {item.estado === 'RECIBIDO' && (
                        <div className="inline-flex items-center gap-1.5 text-[12px] text-[#2E7D32] font-medium">
                          <CheckCircle2 size={14} />
                          <span>Ciclo de abastecimiento completado</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: DIRECTORIO DE LAS 3 SEDES */}
      {activeTab === 'sedes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {almacenes.map((alm) => (
            <div
              key={alm.id}
              className={`p-5 bg-white rounded-[8px] border transition-colors flex flex-col justify-between ${
                sedeActivaId === alm.id ? 'border-[#16201C] ring-1 ring-[#16201C]' : 'border-[#E7E5DF]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[#16201C] text-[15px]">{alm.nombre}</h3>
                    <span className="text-[11px] font-mono text-[#6B7A72]">
                      Código: {alm.codigo || 'S/C'}
                    </span>
                  </div>

                  {alm.es_principal && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-[4px] bg-[#FAFAF7] text-[#16201C] border border-[#E7E5DF]">
                      Sede Matriz
                    </span>
                  )}
                </div>

                <div className="text-[12px] text-[#6B7A72] space-y-1 mt-2 bg-[#FAFAF7] p-3 rounded-[6px] border border-[#E7E5DF]">
                  <p>
                    <strong className="text-[#16201C]">Dirección:</strong>{' '}
                    {alm.direccion || 'Av. Industrial / Almacenes Centrales'}
                  </p>
                  <p>
                    <strong className="text-[#16201C]">Operatividad:</strong> Custodia, recepción y transferencia
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E7E5DF] flex items-center justify-between text-[11px] text-[#6B7A72]">
                <span className="flex items-center gap-1.5 text-[#2E7D32] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]" />
                  En Línea y Conectada
                </span>
                <span className="font-mono">ID: {alm.id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DRAWER NUEVA SOLICITUD */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-[#E7E5DF] flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5DF]">
                <div>
                  <h2 className="text-[16px] font-bold text-[#16201C]">Emitir Requerimiento entre Sedes</h2>
                  <p className="text-[12px] text-[#6B7A72]">
                    Envía un pedido formal para que la otra sede prepare el despacho.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-[#6B7A72] hover:text-[#16201C] rounded-[4px] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form id="solicitud-form" onSubmit={handleCrearSubmit} className="space-y-4 mt-4">
                {/* 1. Sede Emisora (Tu Sede) - FIJA si el colaborador tiene sede asignada */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-semibold text-[#16201C]">
                      Sede Solicitante (Tu Sede Emisora)
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Sede Emisora Fija
                    </span>
                  </div>

                  {/* Sede emisora fija: nunca editable en el formulario para evitar confusiones */}
                  <div className="p-3 bg-[#FAFAF7] border border-[#E7E5DF] rounded-[6px] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[4px] bg-[#E7E5DF] flex items-center justify-center text-[#16201C]">
                        <Warehouse size={16} />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[#16201C]">
                          {almacenes.find((a) => a.id === sedeOrigenId)?.nombre || 'Sede Central'}
                        </p>
                        <p className="text-[11px] text-[#6B7A72] font-mono">
                          Código: {almacenes.find((a) => a.id === sedeOrigenId)?.codigo || 'ALM-01'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-[#6B7A72] italic">Emisor del requerimiento</span>
                  </div>
                </div>

                {/* 2. Sede Destino / Proveedora - SOLO MUESTRA LAS OTRAS SEDES */}
                <div>
                  <label className="block text-[12px] font-semibold text-[#16201C] mb-1.5">
                    Sede Proveedora (¿A qué sede le solicitas?)
                  </label>
                  <select
                    value={sedeDestinoId}
                    onChange={(e) => setSedeDestinoId(e.target.value)}
                    required
                    className="w-full rounded-[6px] border border-[#16201C] px-3 py-2 text-[13px] text-[#16201C] bg-white focus:outline-none focus:ring-1 focus:ring-[#16201C] font-medium"
                  >
                    {almacenes
                      .filter((a) => a.id !== sedeOrigenId)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} ({a.codigo || 'Sede'})
                        </option>
                      ))}
                  </select>
                  <p className="text-[11px] text-[#6B7A72] mt-1">
                    Solo puedes solicitar a sedes distintas a la tuya (se excluye automáticamente tu sede emisora).
                  </p>
                </div>

                {/* Producto y Cantidad */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                      Artículo a Reponer (Opcional)
                    </label>
                    <select
                      value={productoId}
                      onChange={(e) => setProductoId(e.target.value)}
                      className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-2 text-[13px] text-[#16201C] bg-white focus:outline-none focus:border-[#16201C]"
                    >
                      <option value="">-- Requerimiento General --</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={cantidad}
                      onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-2 text-[13px] text-[#16201C] font-mono focus:outline-none focus:border-[#16201C]"
                    />
                  </div>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Nivel de Prioridad
                  </label>
                  <select
                    value={prioridad}
                    onChange={(e) =>
                      setPrioridad(e.target.value as 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE')
                    }
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-2 text-[13px] text-[#16201C] bg-white focus:outline-none focus:border-[#16201C]"
                  >
                    <option value="BAJA">Baja - Notificación ordinaria</option>
                    <option value="MEDIA">Media - Despacho programado</option>
                    <option value="ALTA">Alta - Stock en nivel crítico</option>
                    <option value="URGENTE">Urgente - Pedido inmediato para cliente</option>
                  </select>
                </div>

                {/* Mensaje */}
                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Mensaje / Justificación de la Solicitud
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    placeholder="Ej. Solicitamos 15 taladros para entrega a cliente en mostrador esta tarde..."
                    className="w-full rounded-[6px] border border-[#E7E5DF] p-3 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-[#E7E5DF] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-[6px] border border-[#E7E5DF] text-[13px] font-medium text-[#6B7A72] hover:text-[#16201C] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="solicitud-form"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-50 cursor-pointer"
              >
                {isPending && <Loader2 size={14} className="animate-spin" />}
                <span>Transmitir Solicitud</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESPONDER / DESPACHAR */}
      {respondingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-[8px] border border-[#E7E5DF] shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7E5DF] pb-3">
              <div>
                <h3 className="font-bold text-[#16201C] text-[15px]">
                  {nuevoEstado === 'EN_TRANSITO'
                    ? 'Atender y Despachar Pedido'
                    : nuevoEstado === 'RECIBIDO'
                    ? 'Confirmar Llegada de Mercadería'
                    : 'Actualizar Estado de la Solicitud'}
                </h3>
                <p className="text-[12px] text-[#6B7A72]">
                  {nuevoEstado === 'EN_TRANSITO'
                    ? `Preparando salida desde ${respondingItem.sede_destino?.nombre}`
                    : `Ingresando a stock de ${respondingItem.sede_origen?.nombre}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRespondingItem(null)}
                className="text-[#6B7A72] hover:text-[#16201C] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleResponderSubmit} className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  Acción a Registrar
                </label>
                <select
                  value={nuevoEstado}
                  onChange={(e) =>
                    setNuevoEstado(e.target.value as 'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO')
                  }
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-2 text-[13px] text-[#16201C] bg-white focus:outline-none focus:border-[#16201C]"
                >
                  <option value="EN_TRANSITO">EN TRÁNSITO - Carga despachada en camión</option>
                  <option value="RECIBIDO">RECIBIDO - Mercadería ingresada y verificada</option>
                  <option value="RECHAZADO">RECHAZADO - Sin stock o no procede</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  Observaciones / Hoja de Despacho
                </label>
                <textarea
                  rows={3}
                  required
                  value={respuestaTexto}
                  onChange={(e) => setRespuestaTexto(e.target.value)}
                  placeholder="Detalla transporte, bultos o estado de recepción..."
                  className="w-full rounded-[6px] border border-[#E7E5DF] p-2.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRespondingItem(null)}
                  className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] text-[12px] font-medium text-[#6B7A72] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] text-white text-[12px] font-medium cursor-pointer"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  <span>Guardar y Notificar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
