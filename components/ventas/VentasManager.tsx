'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Eye, Printer, X, ShoppingCart, Plus } from '../ui/icons'
import type { VentaRow } from '@/lib/queries/operaciones'
import { obtenerDetalleVentaAction, type DetalleVentaCompleto } from '@/lib/actions/ventas'
import { SunatQrCode } from '@/lib/sunat/qr-sunat'

interface VentasManagerProps {
  ventas: VentaRow[]
}

export function VentasManager({ ventas }: VentasManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEstado, setSelectedEstado] = useState<'TODOS' | 'PAGADA' | 'PENDIENTE' | 'ANULADA'>('TODOS')
  const [selectedVenta, setSelectedVenta] = useState<DetalleVentaCompleto | null>(null)
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false)
  const [isPending, startTransition] = useTransition()

  // KPIs con cálculo estadístico y zona horaria de Perú (America/Lima)
  const ventasPagadas = ventas.filter((v) => v.estado === 'PAGADA')
  const totalMonto = ventasPagadas.reduce((acc, v) => acc + v.total, 0)
  const totalComprobantes = ventas.length
  const ticketPromedio = ventasPagadas.length > 0 ? totalMonto / ventasPagadas.length : 0

  const hoyLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
  const ventasHoy = ventas.filter((v) => {
    if (!v.fecha) return false
    const fechaLima = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(v.fecha))
    return fechaLima === hoyLima
  }).length

  // Filtrado reactivo
  const filteredVentas = ventas.filter((v) => {
    const matchesEstado = selectedEstado === 'TODOS' || v.estado === selectedEstado
    const searchLower = searchTerm.toLowerCase().trim()
    const matchesSearch =
      !searchLower ||
      v.numero_comprobante.toLowerCase().includes(searchLower) ||
      v.cliente_nombre.toLowerCase().includes(searchLower) ||
      v.vendedor_nombre.toLowerCase().includes(searchLower)
    return matchesEstado && matchesSearch
  })

  const abrirDetalle = (id: string) => {
    setIsLoadingDetalle(true)
    startTransition(async () => {
      const res = await obtenerDetalleVentaAction(id)
      if (res.success && res.venta) {
        setSelectedVenta(res.venta)
      } else {
        alert(res.error || 'No se pudo cargar el comprobante')
      }
      setIsLoadingDetalle(false)
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case 'PAGADA':
        return 'text-[#2E7D32] bg-[#E8F5E9] border-[#C8E6C9]'
      case 'PENDIENTE':
        return 'text-[#E8A33D] bg-[#FFF8E1] border-[#FFE082]'
      case 'ANULADA':
        return 'text-[#D32F2F] bg-[#FFEBEE] border-[#FFCDD2]'
      default:
        return 'text-[#6B7A72] bg-[#FAFAF7] border-[#E7E5DF]'
    }
  }

  return (
    <div className="space-y-6">
      {/* Resumen KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Total Recaudado</span>
          <p className="text-[20px] font-bold text-[#16201C] font-mono tabular-nums mt-1">
            S/ {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Comprobantes Totales</span>
          <p className="text-[20px] font-bold text-[#16201C] font-mono tabular-nums mt-1">{totalComprobantes}</p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Ticket Promedio</span>
          <p className="text-[20px] font-bold text-[#16201C] font-mono tabular-nums mt-1">
            S/ {ticketPromedio.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Ventas Hoy</span>
          <p className="text-[20px] font-bold text-[#2E7D32] font-mono tabular-nums mt-1">{ventasHoy}</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-[8px] border border-[#E7E5DF]">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A72]" />
          <input
            type="text"
            placeholder="Buscar por comprobante (B001-...), cliente o vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-[6px] border border-[#E7E5DF] focus:border-[#16201C] focus:outline-none bg-white text-[#16201C] placeholder:text-[#6B7A72]/60"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['TODOS', 'PAGADA', 'PENDIENTE', 'ANULADA'] as const).map((est) => (
            <button
              key={est}
              onClick={() => setSelectedEstado(est)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors cursor-pointer whitespace-nowrap ${
                selectedEstado === est
                  ? 'bg-[#16201C] text-white'
                  : 'bg-[#FAFAF7] hover:bg-[#E7E5DF] text-[#6B7A72]'
              }`}
            >
              {est === 'TODOS' ? 'Todos' : est.charAt(0) + est.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72] text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3.5">Comprobante</th>
                <th className="py-2.5 px-3.5">Cliente</th>
                <th className="py-2.5 px-3.5">Vendedor</th>
                <th className="py-2.5 px-3.5 text-right">Total</th>
                <th className="py-2.5 px-3.5 text-center">Estado</th>
                <th className="py-2.5 px-3.5 text-right">Fecha y Hora</th>
                <th className="py-2.5 px-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
              {filteredVentas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7A72]">
                    <ShoppingCart size={28} className="mx-auto mb-2 text-[#6B7A72]/40" />
                    <p className="text-[13px] font-medium text-[#16201C]">
                      {ventas.length === 0 ? 'No hay ventas registradas aún' : 'No se encontraron comprobantes'}
                    </p>
                    <p className="text-[12px] text-[#6B7A72] mt-0.5 mb-3">
                      {ventas.length === 0
                        ? 'Las ventas emitidas desde el Punto de Venta aparecerán reflejadas aquí.'
                        : 'Intenta ajustando el término de búsqueda o el filtro de estado.'}
                    </p>
                    {ventas.length === 0 && (
                      <Link
                        href="/vendedor"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#16201C] hover:bg-[#2A3B34] text-white text-[12px] font-medium"
                      >
                        <Plus size={13} />
                        <span>Emitir primera venta</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                filteredVentas.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAFAF7] transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-medium whitespace-nowrap">
                      {v.numero_comprobante}
                    </td>
                    <td className="py-2.5 px-3.5 max-w-xs truncate text-[#16201C]">
                      {v.cliente_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#6B7A72] whitespace-nowrap">
                      {v.vendedor_nombre}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-bold tabular-nums">
                      S/ {v.total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] border text-[11px] font-medium ${estadoBadge(v.estado)}`}>
                        {v.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-[12px] text-[#6B7A72] whitespace-nowrap tabular-nums">
                      {new Date(v.fecha).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => abrirDetalle(v.id)}
                        disabled={isLoadingDetalle && isPending}
                        title="Ver detalle y reimprimir ticket"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] font-medium text-[#16201C] bg-[#FAFAF7] hover:bg-[#E7E5DF] border border-[#E7E5DF] rounded-[4px] transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>Ticket</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Vista de Ticket Térmico 80mm */}
      {selectedVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #print-area, #print-area * { visibility: visible !important; }
              #print-area {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 80mm !important;
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                box-shadow: none !important;
              }
            }
          `}</style>
          <div className="bg-white rounded-[10px] border border-[#E7E5DF] shadow-xl w-full max-w-[420px] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-3.5 border-b border-[#E7E5DF] flex items-center justify-between bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-[#16201C]" />
                <span className="text-[13px] font-bold text-[#16201C]">
                  Comprobante {selectedVenta.numero_comprobante}
                </span>
              </div>
              <button
                onClick={() => setSelectedVenta(null)}
                className="text-[#6B7A72] hover:text-[#16201C] p-1 rounded hover:bg-[#E7E5DF] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido Imprimible / Ticket */}
            <div id="print-area" className="p-5 overflow-y-auto space-y-4 font-mono text-[12px] text-[#16201C]">
              {/* Encabezado Ticket */}
              <div className="text-center space-y-1 border-b border-dashed border-[#E7E5DF] pb-3">
                <p className="font-bold text-[14px]">STOCKIA WMS PERÚ</p>
                <p className="text-[11px] text-[#6B7A72]">{selectedVenta.almacen.nombre}</p>
                <p className="text-[11px] text-[#6B7A72]">R.U.C. 20601234567</p>
                <div className="pt-2">
                  <span className="font-bold border border-[#16201C] px-2 py-0.5 text-[11px]">
                    BOLETA ELECTRÓNICA: {selectedVenta.numero_comprobante}
                  </span>
                </div>
              </div>

              {/* Metadatos */}
              <div className="text-[11px] space-y-1 border-b border-dashed border-[#E7E5DF] pb-3">
                <p><span className="text-[#6B7A72]">Fecha:</span> {new Date(selectedVenta.fecha).toLocaleString('es-PE')}</p>
                <p><span className="text-[#6B7A72]">Cliente:</span> {selectedVenta.cliente.nombre}</p>
                {selectedVenta.cliente.documento && (
                  <p><span className="text-[#6B7A72]">Doc:</span> {selectedVenta.cliente.documento}</p>
                )}
                <p><span className="text-[#6B7A72]">Cajero:</span> {selectedVenta.vendedor.nombre}</p>
                <p><span className="text-[#6B7A72]">Estado:</span> {selectedVenta.estado}</p>
              </div>

              {/* Tabla de Items */}
              <div className="space-y-2 border-b border-dashed border-[#E7E5DF] pb-3">
                <div className="flex justify-between text-[10px] text-[#6B7A72] font-bold uppercase">
                  <span>Cant x Prod</span>
                  <span>Total</span>
                </div>
                {selectedVenta.items.length === 0 ? (
                  <p className="text-[11px] text-[#6B7A72] italic">Sin detalle registrado</p>
                ) : (
                  selectedVenta.items.map((item) => (
                    <div key={item.id} className="text-[11px]">
                      <div className="flex justify-between">
                        <span className="font-medium truncate max-w-[220px]">{item.nombre}</span>
                        <span className="tabular-nums font-bold">S/ {item.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-[#6B7A72]">
                        {item.cantidad} x S/ {item.precio_unitario.toFixed(2)} ({item.sku})
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totales */}
              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between text-[#6B7A72]">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">S/ {selectedVenta.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6B7A72]">
                  <span>I.G.V. (18%):</span>
                  <span className="tabular-nums">S/ {selectedVenta.impuesto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-[13px] border-t border-[#16201C] pt-1.5 mt-1">
                  <span>TOTAL A PAGAR:</span>
                  <span className="tabular-nums">S/ {selectedVenta.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Métodos de Pago */}
              {selectedVenta.pagos.length > 0 && (
                <div className="bg-[#FAFAF7] p-2.5 rounded-[4px] text-[10px] space-y-1">
                  <span className="font-bold text-[#6B7A72] uppercase tracking-wider block">Método de Cobro:</span>
                  {selectedVenta.pagos.map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span>{p.metodo} {p.referencia ? `(${p.referencia})` : ''}</span>
                      <span className="font-bold">S/ {p.monto.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Código QR y Metadatos SUNAT UBL 2.1 */}
              <div className="text-center space-y-2 pt-3 border-t border-dashed border-[#E7E5DF]">
                <div className="flex justify-center">
                  <SunatQrCode
                    value={`20601234567|${selectedVenta.serie.startsWith('F') ? '01' : '03'}|${selectedVenta.serie}|${String(selectedVenta.correlativo).padStart(8, '0')}|${selectedVenta.impuesto.toFixed(2)}|${selectedVenta.total.toFixed(2)}|${new Date(selectedVenta.fecha).toISOString().slice(0, 10)}|${(selectedVenta.cliente.documento || '').length === 11 ? '6' : '1'}|${selectedVenta.cliente.documento || '00000000'}`}
                    size={110}
                  />
                </div>
                <div className="text-[9px] text-[#6B7A72] leading-tight space-y-0.5">
                  <p className="font-bold text-[#16201C]">Representación impresa de la BOLETA ELECTRÓNICA</p>
                  <p>Autorizado mediante Resolución de Superintendencia SUNAT</p>
                  <p>Consulte la validez en: https://cpe.sunat.gob.pe</p>
                  <p className="font-mono text-[8px] text-[#6B7A72] pt-0.5 truncate">
                    Hash UBL 2.1: {selectedVenta.id}
                  </p>
                </div>
              </div>

              <p className="text-center text-[10px] text-[#6B7A72] pt-1">
                ¡Gracias por su compra!
              </p>
            </div>

            {/* Footer Modal con acciones */}
            <div className="p-3.5 border-t border-[#E7E5DF] bg-[#FAFAF7] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedVenta(null)}
                className="px-3 py-1.5 text-[12px] font-medium text-[#6B7A72] hover:text-[#16201C] rounded-[6px] transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <a
                href={`/api/comprobantes/${selectedVenta.id}/xml`}
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border border-[#E7E5DF] hover:border-[#16201C] bg-white text-[#16201C] rounded-[6px] transition-colors cursor-pointer"
              >
                <span>Descargar XML UBL 2.1</span>
              </a>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#16201C] hover:bg-[#2A3B34] text-white rounded-[6px] transition-colors cursor-pointer"
              >
                <Printer size={13} />
                <span>Reimprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
