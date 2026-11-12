'use client'

import { useState, useTransition } from 'react'
import { Plus, X, Loader2, Users, AlertTriangle, Edit, Warehouse, CheckCircle2 } from '../ui/icons'
import { toast } from '../ui/Toast'
import {
  crearUsuarioAction,
  toggleUsuarioActivoAction,
  actualizarRolYSedeUsuarioAction,
} from '../../app/admin/usuarios/actions'
import { obtenerEnlaceInvitacionAction } from '../../app/activar/actions'
import type { UsuarioRow, AlmacenDetailRow } from '../../lib/queries/operaciones'

interface Props {
  usuarios: UsuarioRow[]
  almacenes?: AlmacenDetailRow[]
  currentUserId?: string
}

export function UsuariosManager({ usuarios, almacenes = [], currentUserId }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UsuarioRow | null>(null)
  const [selectedRol, setSelectedRol] = useState<'admin' | 'almacenero' | 'vendedor'>('vendedor')
  const [selectedAlmacenId, setSelectedAlmacenId] = useState<string>('none')

  const [isPendingToggle, startTransitionToggle] = useTransition()
  const [isPendingCreate, startTransitionCreate] = useTransition()
  const [isPendingAssign, startTransitionAssign] = useTransition()

  const [toggleError, setToggleError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [copiandoEmail, setCopiandoEmail] = useState<string | null>(null)

  const handleCopiarEnlace = async (email: string) => {
    setCopiandoEmail(email)
    try {
      const res = await obtenerEnlaceInvitacionAction(email)
      if (res.success && res.link) {
        await navigator.clipboard.writeText(res.link)
        toast.success('Enlace de invitación copiado al portapapeles.')
      } else {
        toast.error(res.error || 'No se pudo obtener el enlace de invitación.')
      }
    } catch {
      toast.error('Error al copiar el enlace.')
    } finally {
      setCopiandoEmail(null)
    }
  }

  const handleToggle = (usuarioId: string, actual: boolean) => {
    setToggleError(null)
    startTransitionToggle(async () => {
      const res = await toggleUsuarioActivoAction(usuarioId, !actual)
      if (!res.success && res.error) {
        setToggleError(res.error)
      }
    })
  }

  const handleOpenAssignModal = (u: UsuarioRow) => {
    setEditingUser(u)
    setSelectedRol(u.rol)
    setSelectedAlmacenId(u.almacen_id || 'none')
    setAssignError(null)
    setAssignSuccess(false)
  }

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setAssignError(null)
    setAssignSuccess(false)

    startTransitionAssign(async () => {
      const almacenId = selectedAlmacenId === 'none' ? null : selectedAlmacenId
      const res = await actualizarRolYSedeUsuarioAction(editingUser.id, selectedRol, almacenId)

      if (res.success) {
        setAssignSuccess(true)
        setTimeout(() => {
          setEditingUser(null)
          setAssignSuccess(false)
        }, 800)
      } else {
        setAssignError(res.error || 'Error al actualizar el rol y sede del usuario.')
      }
    })
  }

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreateError(null)
    setFieldErrors({})
    const formData = new FormData(e.currentTarget)

    startTransitionCreate(async () => {
      const res = await crearUsuarioAction(null, formData)
      if (res.success) {
        setDrawerOpen(false)
      } else {
        setCreateError(res.error || 'Error al crear usuario.')
        if (res.fieldErrors) setFieldErrors(res.fieldErrors)
      }
    })
  }

  const rolLabel: Record<string, string> = {
    admin: 'Administrador General',
    almacenero: 'Jefe de Almacén',
    vendedor: 'Ventas y Mostrador',
  }

  return (
    <div className="space-y-4">
      {/* Barra de acciones superior */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B7A72]">
          Gestión de equipo y sedes (RBAC). Invita a tus colaboradores por correo corporativo o personal para que activen su acceso a la sede asignada.
        </p>

        <button
          type="button"
          onClick={() => {
            setCreateError(null)
            setFieldErrors({})
            setDrawerOpen(true)
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer"
        >
          <Plus size={14} />
          <span>Invitar Colaborador</span>
        </button>
      </div>

      {toggleError && (
        <div className="p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[13px] text-[#C53030] flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{toggleError}</span>
        </div>
      )}

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Colaborador</th>
                <th className="py-2.5 px-3.5">Correo Institucional</th>
                <th className="py-2.5 px-3.5">Sede Asignada</th>
                <th className="py-2.5 px-3.5 text-center">Rol</th>
                <th className="py-2.5 px-3.5 text-center">Estado</th>
                <th className="py-2.5 px-3.5 text-right">Fecha Registro</th>
                <th className="py-2.5 px-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7A72]">
                    <Users size={28} className="mx-auto mb-2 text-[#6B7A72]/50" />
                    <p className="text-[13px] font-medium text-[#16201C]">No hay usuarios colaboradores registrados</p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5">
                      Crea cuentas de almacenero o vendedor para que tu equipo opere el sistema.
                    </p>
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => {
                  const isSelf = u.id === currentUserId
                  return (
                    <tr key={u.id} className="hover:bg-[#FAFAF7] transition-colors">
                      <td className="py-2.5 px-3.5 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-[4px] bg-[#E7E5DF] flex items-center justify-center text-[10px] font-bold text-[#16201C]">
                            {u.nombre_completo.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{u.nombre_completo}</span>
                          {isSelf && (
                            <span className="text-[10px] text-[#6B7A72] bg-[#FAFAF7] border border-[#E7E5DF] px-1.5 py-0.2 rounded-[4px]">
                              Tú
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 font-mono text-[12px] text-[#6B7A72] whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {u.almacen?.nombre ? (
                          <div className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#16201C] bg-[#FAFAF7] border border-[#E7E5DF] px-2.5 py-1 rounded-[5px]">
                            <Warehouse size={13} className="text-[#2E7D32]" />
                            <span>{u.almacen.nombre}</span>
                          </div>
                        ) : u.rol === 'admin' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            Acceso Global Multi-Sede
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Sin sede asignada</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`text-[12px] font-medium ${
                            u.rol === 'admin'
                              ? 'text-purple-700'
                              : u.rol === 'almacenero'
                              ? 'text-emerald-700'
                              : 'text-[#16201C]'
                          }`}
                        >
                          {rolLabel[u.rol] || u.rol}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {u.is_pending ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-[4px]"
                            title="Invitación enviada por correo. El colaborador aún no ha definido su contraseña."
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Pendiente</span>
                          </span>
                        ) : !u.activo ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#6B7A72] bg-[#FAFAF7] border border-[#E7E5DF] px-2 py-0.5 rounded-[4px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D32F2F]" />
                            <span>Inactivo</span>
                          </span>
                        ) : (
                          (() => {
                            const isOnline = u.last_sign_in_at
                              ? Date.now() - new Date(u.last_sign_in_at).getTime() < 15 * 60 * 1000
                              : false
                            return isOnline ? (
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-[4px]"
                                title="Sesión activa en el sistema"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>En línea</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#16201C] bg-[#FAFAF7] border border-[#E7E5DF] px-2 py-0.5 rounded-[4px]"
                                title={
                                  u.last_sign_in_at
                                    ? `Último acceso: ${new Date(u.last_sign_in_at).toLocaleString('es-PE', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                      })}`
                                    : 'Sin registros de sesión'
                                }
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6B7A72]" />
                                <span>Desconectado</span>
                              </span>
                            )
                          })()
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-right font-mono text-[11px] text-[#16201C] tabular-nums whitespace-nowrap">
                        <div>
                          {new Date(u.created_at).toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-[#6B7A72]">
                          {new Date(u.created_at).toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          {u.is_pending && (
                            <button
                              type="button"
                              disabled={copiandoEmail === u.email}
                              onClick={() => handleCopiarEnlace(u.email)}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-[5px] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                              title="Copiar enlace de activación directa para compartirlo con el colaborador"
                            >
                              {copiandoEmail === u.email && (
                                <Loader2 size={11} className="animate-spin" />
                              )}
                              <span>Copiar Enlace</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(u)}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#16201C] hover:bg-[#16201C] hover:text-white bg-white border border-[#E7E5DF] px-2.5 py-1 rounded-[5px] transition-all cursor-pointer shadow-2xs"
                            title="Asignar Sede y Rol"
                          >
                            <Edit size={12} />
                            <span>Asignar Sede</span>
                          </button>

                          {!isSelf && u.rol !== 'admin' ? (
                            <button
                              type="button"
                              disabled={isPendingToggle}
                              onClick={() => handleToggle(u.id, u.activo)}
                              className="text-[12px] text-[#6B7A72] hover:text-[#16201C] underline underline-offset-2 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#6B7A72]/50 italic">Inmutable</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Asignar Sede y Rol */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-[8px] shadow-2xl border border-[#E7E5DF] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#E7E5DF] bg-[#FAFAF7]">
              <div>
                <h3 className="text-[15px] font-bold text-[#16201C]">
                  Asignar Sede y Rol Operativo
                </h3>
                <p className="text-[12px] text-[#6B7A72]">
                  {editingUser.nombre_completo} ({editingUser.email})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#E7E5DF]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-5 space-y-4">
              {assignError && (
                <div className="p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[12px] text-[#C53030] flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{assignError}</span>
                </div>
              )}

              {assignSuccess && (
                <div className="p-3 rounded-[6px] bg-[#F0FDF4] border border-[#BBF7D0] text-[12px] text-[#166534] flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  <span>¡Sede y rol actualizados exitosamente!</span>
                </div>
              )}

              {/* Selector de Rol */}
              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  Rol del Colaborador
                </label>
                <select
                  value={selectedRol}
                  onChange={(e) => setSelectedRol(e.target.value as 'admin' | 'almacenero' | 'vendedor')}
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] bg-white focus:outline-none focus:border-[#16201C]"
                >
                  <option value="vendedor">Ventas y Mostrador (punto de venta y consulta)</option>
                  <option value="almacenero">Jefe de Almacén (inventario, movimientos, compras)</option>
                  <option value="admin">Administrador General (gestión global de sedes)</option>
                </select>
                <p className="text-[11px] text-[#6B7A72] mt-1">
                  Define el nivel de autorización en el sistema (RBAC).
                </p>
              </div>

              {/* Selector de Sede */}
              <div>
                <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                  Sede Operativa Asignada
                </label>
                <select
                  value={selectedAlmacenId}
                  onChange={(e) => setSelectedAlmacenId(e.target.value)}
                  className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] bg-white focus:outline-none focus:border-[#16201C]"
                >
                  <option value="none">Sin sede asignada (Acceso pendiente)</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.codigo ? `(${a.codigo})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-[#6B7A72] mt-1">
                  El colaborador operará exclusivamente sobre el inventario y traslados de esta sede.
                </p>
              </div>

              <div className="pt-3 border-t border-[#E7E5DF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] text-[13px] text-[#16201C] hover:bg-[#FAFAF7]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPendingAssign}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-50"
                >
                  {isPendingAssign && <Loader2 size={13} className="animate-spin" />}
                  <span>Guardar Asignación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer para Crear Usuario */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-xl border-l border-[#E7E5DF] flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E5DF]">
                <div>
                  <h2 className="text-[16px] font-bold text-[#16201C]">Invitar Colaborador</h2>
                  <p className="text-[12px] text-[#6B7A72]">
                    El colaborador recibirá un correo con el enlace para crear su contraseña y acceder a su sede.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 rounded-[4px] text-[#6B7A72] hover:text-[#16201C] hover:bg-[#FAFAF7]"
                >
                  <X size={16} />
                </button>
              </div>

              {createError && (
                <div className="mt-4 p-3 rounded-[6px] bg-[#FFF5F5] border border-[#FFD6D6] text-[12px] text-[#C53030]">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} id="crear-usuario-form" className="mt-5 space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Nombre y Apellidos
                  </label>
                  <input
                    name="nombre_completo"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    required
                    placeholder="Carlos Mendoza"
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                  {fieldErrors.nombre_completo && (
                    <p className="text-[11px] text-[#D32F2F] mt-1">{fieldErrors.nombre_completo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Correo del Colaborador
                  </label>
                  <input
                    name="email"
                    type="email"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    required
                    placeholder="carlos.mendoza@empresa.com"
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                  {fieldErrors.email && (
                    <p className="text-[11px] text-[#D32F2F] mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Rol Operativo
                  </label>
                  <select
                    name="rol"
                    defaultValue="vendedor"
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C] bg-white"
                  >
                    <option value="vendedor">Ventas y Mostrador (punto de venta y consulta)</option>
                    <option value="almacenero">Jefe de Almacén (inventario, movimientos, compras)</option>
                    <option value="admin">Administrador General (gestión global de sedes)</option>
                  </select>
                  {fieldErrors.rol && (
                    <p className="text-[11px] text-[#D32F2F] mt-1">{fieldErrors.rol}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[#16201C] mb-1">
                    Sede Operativa Asignada
                  </label>
                  <select
                    name="almacen_id"
                    defaultValue="none"
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C] bg-white"
                  >
                    <option value="none">Sin sede asignada (Acceso pendiente)</option>
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} {a.codigo ? `(${a.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-[#E7E5DF]/70">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[12px] font-medium text-[#16201C]">
                      Contraseña Provisional (Opcional)
                    </label>
                    <span className="text-[11px] text-[#6B7A72]">
                      Vacío = Envío de invitación
                    </span>
                  </div>
                  <input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Dejar vacío para invitar por correo (recomendado)"
                    className="w-full rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                  {fieldErrors.password && (
                    <p className="text-[11px] text-[#D32F2F] mt-1">{fieldErrors.password}</p>
                  )}
                  <p className="text-[11px] text-[#6B7A72] mt-1 leading-relaxed">
                    Si se deja vacío, el sistema enviará un correo con el token seguro para que el colaborador cree su propia contraseña.
                  </p>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-[#E7E5DF] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] text-[13px] text-[#16201C] hover:bg-[#FAFAF7]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="crear-usuario-form"
                disabled={isPendingCreate}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium disabled:opacity-50"
              >
                {isPendingCreate && <Loader2 size={13} className="animate-spin" />}
                <span>Enviar Invitación / Guardar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
