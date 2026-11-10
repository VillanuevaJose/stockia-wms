'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  Building2,
  Search,
  Plus,
  Edit,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  ShieldCheck,
} from '../ui/icons'
import {
  crearProveedorAction,
  editarProveedorAction,
  toggleProveedorActivoAction,
} from '../../app/admin/proveedores/actions'

export interface ProveedorItem {
  id: string
  ruc: string | null
  razon_social: string
  contacto_nombre: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  activo: boolean
  created_at: string
}

interface Props {
  proveedores: ProveedorItem[]
}

export function ProveedoresManager({ proveedores }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivo, setFilterActivo] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ProveedorItem | null>(null)

  const [formRuc, setFormRuc] = useState('')
  const [formRazonSocial, setFormRazonSocial] = useState('')
  const [formContacto, setFormContacto] = useState('')
  const [formTelefono, setFormTelefono] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formDireccion, setFormDireccion] = useState('')

  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openNuevoDrawer = () => {
    setEditingItem(null)
    setFormRuc('')
    setFormRazonSocial('')
    setFormContacto('')
    setFormTelefono('')
    setFormEmail('')
    setFormDireccion('')
    setErrorMsg(null)
    setDrawerOpen(true)
  }

  const openEditarDrawer = (item: ProveedorItem) => {
    setEditingItem(item)
    setFormRuc(item.ruc || '')
    setFormRazonSocial(item.razon_social)
    setFormContacto(item.contacto_nombre || '')
    setFormTelefono(item.telefono || '')
    setFormEmail(item.email || '')
    setFormDireccion(item.direccion || '')
    setErrorMsg(null)
    setDrawerOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!formRazonSocial.trim()) {
      setErrorMsg('La razón social es obligatoria.')
      return
    }

    if (formRuc.trim() && !/^\d{11}$/.test(formRuc.trim())) {
      setErrorMsg('El RUC debe tener exactamente 11 dígitos numéricos.')
      return
    }

    startTransition(async () => {
      const payload = {
        razon_social: formRazonSocial.trim(),
        ruc: formRuc.trim() || null,
        contacto_nombre: formContacto.trim() || null,
        telefono: formTelefono.trim() || null,
        email: formEmail.trim() || null,
        direccion: formDireccion.trim() || null,
      }

      if (editingItem) {
        const res = await editarProveedorAction(editingItem.id, payload)
        if (res.success) {
          setSuccessMsg(`Proveedor "${payload.razon_social}" actualizado correctamente.`)
          setDrawerOpen(false)
        } else {
          setErrorMsg(res.error || 'Error al actualizar el proveedor.')
        }
      } else {
        const res = await crearProveedorAction(payload)
        if (res.success) {
          setSuccessMsg(`Proveedor "${payload.razon_social}" registrado en el directorio.`)
          setDrawerOpen(false)
        } else {
          setErrorMsg(res.error || 'Error al crear el proveedor.')
        }
      }
    })
  }

  const handleToggleActivo = (item: ProveedorItem) => {
    const nuevoEstado = !item.activo
    setErrorMsg(null)
    setSuccessMsg(null)

    startTransition(async () => {
      const res = await toggleProveedorActivoAction(item.id, nuevoEstado)
      if (res.success) {
        setSuccessMsg(
          nuevoEstado
            ? `Proveedor "${item.razon_social}" reactivado para compras.`
            : `Proveedor "${item.razon_social}" deshabilitado del flujo de compras.`
        )
      } else {
        setErrorMsg(res.error || 'No se pudo cambiar el estado del proveedor.')
      }
    })
  }

  const filtered = useMemo(() => {
    return proveedores.filter((p) => {
      if (filterActivo === 'ACTIVOS' && !p.activo) return false
      if (filterActivo === 'INACTIVOS' && p.activo) return false

      if (!searchTerm) return true
      const q = searchTerm.toLowerCase().trim()
      return (
        p.razon_social.toLowerCase().includes(q) ||
        (p.ruc && p.ruc.includes(q)) ||
        (p.contacto_nombre && p.contacto_nombre.toLowerCase().includes(q))
      )
    })
  }, [proveedores, filterActivo, searchTerm])

  const totalProveedores = proveedores.length
  const totalActivos = proveedores.filter((p) => p.activo).length
  const totalConRuc = proveedores.filter((p) => p.ruc).length

  return (
    <div className="space-y-6">
      {/* Indicadores Top */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-white rounded-[6px] border border-[#E7E5DF]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7A72] block">
            Directorio Total
          </span>
          <span className="text-[20px] font-bold text-[#16201C] tabular-nums mt-0.5 block">
            {totalProveedores}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-[6px] border border-[#E7E5DF]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7A72] block">
            Habilitados para Órdenes
          </span>
          <span className="text-[20px] font-bold text-[#2E7D32] tabular-nums mt-0.5 block">
            {totalActivos}
          </span>
        </div>
        <div className="p-3.5 bg-white rounded-[6px] border border-[#E7E5DF]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#6B7A72] block">
            Con RUC Formal Registrado
          </span>
          <span className="text-[20px] font-bold text-[#16201C] tabular-nums mt-0.5 block">
            {totalConRuc}
          </span>
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

      {/* Controles de Búsqueda y Botón Nuevo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A72]"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por RUC, razón social o contacto..."
              className="w-full pl-9 pr-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] text-[13px] text-[#16201C] placeholder:text-[#6B7A72] focus:outline-none focus:border-[#16201C]"
            />
          </div>

          <div className="flex items-center rounded-[6px] border border-[#E7E5DF] bg-white p-0.5 text-[12px]">
            <button
              type="button"
              onClick={() => setFilterActivo('TODOS')}
              className={`px-2 py-1 rounded-[4px] font-medium transition-colors cursor-pointer ${
                filterActivo === 'TODOS'
                  ? 'bg-[#16201C] text-white'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterActivo('ACTIVOS')}
              className={`px-2 py-1 rounded-[4px] font-medium transition-colors cursor-pointer ${
                filterActivo === 'ACTIVOS'
                  ? 'bg-[#16201C] text-white'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setFilterActivo('INACTIVOS')}
              className={`px-2 py-1 rounded-[4px] font-medium transition-colors cursor-pointer ${
                filterActivo === 'INACTIVOS'
                  ? 'bg-[#16201C] text-white'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Inactivos
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={openNuevoDrawer}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus size={14} />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* Tabla Editorial de Proveedores */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 size={32} className="mx-auto text-[#6B7A72] mb-2 opacity-50" />
            <h3 className="font-semibold text-[#16201C] text-[15px]">Sin proveedores encontrados</h3>
            <p className="text-[13px] text-[#6B7A72] max-w-sm mx-auto mt-1">
              No hay empresas registradas que coincidan con el criterio seleccionado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#E7E5DF] bg-[#FAFAF7] text-[11px] font-mono text-[#6B7A72] uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Razón Social / Empresa</th>
                  <th className="py-2.5 px-3.5">RUC</th>
                  <th className="py-2.5 px-3.5">Contacto Principal</th>
                  <th className="py-2.5 px-3.5">Canal de Contacto</th>
                  <th className="py-2.5 px-3.5">Dirección</th>
                  <th className="py-2.5 px-3.5 text-center">Estado</th>
                  <th className="py-2.5 px-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5DF]">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-[#16201C]">{item.razon_social}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[12px] tabular-nums text-[#16201C]">
                      {item.ruc ? item.ruc : <span className="text-[#6B7A72] italic">Sin RUC</span>}
                    </td>
                    <td className="py-3 px-3.5 text-[#16201C]">
                      {item.contacto_nombre ? (
                        item.contacto_nombre
                      ) : (
                        <span className="text-[#6B7A72] text-[12px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="space-y-0.5 text-[12px]">
                        {item.telefono && (
                          <div className="flex items-center gap-1 text-[#16201C] font-mono">
                            <Phone size={11} className="text-[#6B7A72]" />
                            <span>{item.telefono}</span>
                          </div>
                        )}
                        {item.email && (
                          <div className="flex items-center gap-1 text-[#6B7A72]">
                            <Mail size={11} className="text-[#6B7A72]" />
                            <span className="truncate max-w-[160px]">{item.email}</span>
                          </div>
                        )}
                        {!item.telefono && !item.email && (
                          <span className="text-[#6B7A72] text-[12px]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-[12px] text-[#6B7A72] max-w-[200px] truncate">
                      {item.direccion || '—'}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-medium ${
                          item.activo
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}
                      >
                        {item.activo ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditarDrawer(item)}
                          className="p-1 rounded hover:bg-[#E7E5DF] text-[#16201C] transition-colors cursor-pointer"
                          title="Editar información"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(item)}
                          disabled={isPending}
                          className={`px-2 py-1 rounded-[4px] text-[11px] font-medium transition-colors cursor-pointer border ${
                            item.activo
                              ? 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {item.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Drawer para Crear / Editar */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity"
            onClick={() => !isPending && setDrawerOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#FAFAF7] h-full shadow-2xl flex flex-col z-10 border-l border-[#E7E5DF]">
            {/* Header del Drawer */}
            <div className="p-4 border-b border-[#E7E5DF] flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-[#16201C]" />
                <h3 className="font-bold text-[#16201C] text-[15px]">
                  {editingItem ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                disabled={isPending}
                className="p-1 rounded text-[#6B7A72] hover:text-[#16201C] hover:bg-[#E7E5DF] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#16201C] mb-1">
                  Razón Social o Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  value={formRazonSocial}
                  onChange={(e) => setFormRazonSocial(e.target.value)}
                  placeholder="Ej. Distribuidora Mayorista Los Andes S.A.C."
                  className="w-full px-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#16201C] mb-1">
                  RUC (11 dígitos para facturación)
                </label>
                <input
                  type="text"
                  maxLength={11}
                  value={formRuc}
                  onChange={(e) => setFormRuc(e.target.value.replace(/\D/g, ''))}
                  placeholder="20123456789"
                  className="w-full px-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] text-[13px] font-mono tabular-nums text-[#16201C] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#16201C] mb-1">
                  Persona de Contacto / Asesor
                </label>
                <input
                  type="text"
                  value={formContacto}
                  onChange={(e) => setFormContacto(e.target.value)}
                  placeholder="Ej. Carlos Mendoza (Ventas)"
                  className="w-full px-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#16201C] mb-1">
                    Teléfono / Celular
                  </label>
                  <input
                    type="text"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    placeholder="999 888 777"
                    className="w-full px-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] text-[13px] font-mono text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#16201C] mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="ventas@proveedor.pe"
                    className="w-full px-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#16201C] mb-1">
                  Dirección o Sede Fiscal
                </label>
                <textarea
                  rows={2}
                  value={formDireccion}
                  onChange={(e) => setFormDireccion(e.target.value)}
                  placeholder="Av. Industrial 450, Urb. Vulcano, Ate, Lima"
                  className="w-full px-3 py-1.5 rounded-[6px] bg-white border border-[#E7E5DF] text-[13px] text-[#16201C] focus:outline-none focus:border-[#16201C]"
                />
              </div>

              <div className="pt-2">
                <div className="p-3 rounded-[6px] bg-[#FAFAF7] border border-[#E7E5DF] flex items-center gap-2 text-[12px] text-[#6B7A72]">
                  <ShieldCheck size={14} className="text-[#2E7D32]" />
                  <span>
                    El proveedor estará disponible de inmediato en el módulo de Compras para ingreso de
                    comprobantes.
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E7E5DF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-[6px] border border-[#E7E5DF] text-[13px] font-medium text-[#6B7A72] hover:text-[#16201C] bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingItem ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
