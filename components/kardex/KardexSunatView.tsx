'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Filter, Boxes } from '../ui/icons'
import type { KardexSunatData } from '@/lib/queries/kardex-sunat'

interface KardexSunatViewProps {
  data: KardexSunatData | null
  productos: Array<{ id: string; nombre: string; sku: string; stock: number }>
  almacenes: Array<{ id: string; nombre: string }>
  selectedProductoId: string
  selectedAlmacenId: string
}

export function KardexSunatView({
  data,
  productos,
  almacenes,
  selectedProductoId,
  selectedAlmacenId,
}: KardexSunatViewProps) {
  const router = useRouter()
  const [prodId, setProdId] = useState(selectedProductoId)
  const [almId, setAlmId] = useState(selectedAlmacenId)

  const handleFilterChange = (newProd: string, newAlm: string) => {
    setProdId(newProd)
    setAlmId(newAlm)
    router.push(`/admin/movimientos?tab=sunat-13-1&productoId=${newProd}&almacenId=${newAlm}`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Selector de Producto y Almacén */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-[#6B7A72]" />
            <span className="text-[12px] font-semibold text-[#16201C] uppercase tracking-wider">Existencia:</span>
          </div>
          <select
            value={prodId}
            onChange={(e) => handleFilterChange(e.target.value, almId)}
            className="text-[13px] rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 bg-white text-[#16201C] focus:border-[#16201C] focus:outline-none min-w-[240px]"
          >
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.sku}] {p.nombre} (Stock: {p.stock})
              </option>
            ))}
          </select>

          <select
            value={almId}
            onChange={(e) => handleFilterChange(prodId, e.target.value)}
            className="text-[13px] rounded-[6px] border border-[#E7E5DF] px-3 py-1.5 bg-white text-[#16201C] focus:border-[#16201C] focus:outline-none"
          >
            <option value="TODOS">Todas las Sedes (Consolidado)</option>
            {almacenes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-[#16201C] hover:bg-[#2A3B34] text-white rounded-[6px] transition-colors cursor-pointer"
        >
          <Printer size={14} />
          <span>Imprimir Formato 13.1</span>
        </button>
      </div>

      {!data ? (
        <div className="bg-white rounded-[8px] border border-[#E7E5DF] p-12 text-center text-[#6B7A72]">
          <Boxes size={32} className="mx-auto mb-2 text-[#6B7A72]/40" />
          <p className="text-[13px] font-medium text-[#16201C]">No hay datos para la existencia seleccionada</p>
          <p className="text-[12px] text-[#6B7A72] mt-0.5">
            Selecciona un producto del catálogo que registre movimientos transaccionales.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Ficha Tributaria Oficial Formato 13.1 SUNAT */}
          <div className="bg-white p-5 rounded-[8px] border border-[#E7E5DF] space-y-3 font-mono text-[12px] text-[#16201C]">
            <div className="border-b border-[#E7E5DF] pb-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7A72] block">
                RESOLUCIÓN DE SUPERINTENDENCIA N° 234-2006/SUNAT
              </span>
              <h2 className="text-[15px] font-bold text-[#16201C]">
                FORMATO 13.1: REGISTRO DE INVENTARIO PERMANENTE VALORIZADO - DETALLE DEL INVENTARIO VALORIZADO
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1.5 gap-x-6 text-[12px]">
              <div>
                <span className="text-[#6B7A72]">PERÍODO: </span>
                <span className="font-bold">{data.periodo}</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">ESTABLECIMIENTO: </span>
                <span className="font-bold">{data.almacen_nombre}</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">R.U.C.: </span>
                <span className="font-bold">20601234567</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">CÓDIGO DE LA EXISTENCIA: </span>
                <span className="font-bold">{data.producto.sku}</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">APELLIDOS Y NOMBRES O RAZÓN SOCIAL: </span>
                <span className="font-bold">STOCKIA LOGÍSTICA PERÚ S.A.C.</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">TIPO DE EXISTENCIA: </span>
                <span className="font-bold">{data.producto.tipo_existencia}</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">DESCRIPCIÓN: </span>
                <span className="font-bold">{data.producto.nombre}</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">CÓDIGO DE LA UNIDAD DE MEDIDA: </span>
                <span className="font-bold">{data.producto.unidad_medida}</span>
              </div>
              <div>
                <span className="text-[#6B7A72]">MÉTODO DE VALUACIÓN: </span>
                <span className="font-bold text-[#2E7D32]">1 - COSTO PROMEDIO PONDERADO (CPP)</span>
              </div>
            </div>
          </div>

          {/* Tarjetas de Resumen Valorizado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Saldo Físico Final</span>
              <p className="text-[20px] font-bold text-[#16201C] font-mono tabular-nums mt-1">
                {data.totales.saldo_final_cant} UND
              </p>
            </div>
            <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Costo Promedio (CPP)</span>
              <p className="text-[20px] font-bold text-[#2E7D32] font-mono tabular-nums mt-1">
                S/ {data.totales.costo_promedio_actual.toFixed(2)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Valor Total de Inventario</span>
              <p className="text-[20px] font-bold text-[#16201C] font-mono tabular-nums mt-1">
                S/ {data.totales.saldo_final_valor.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white p-4 rounded-[8px] border border-[#E7E5DF]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">Movimientos Registrados</span>
              <p className="text-[20px] font-bold text-[#16201C] font-mono tabular-nums mt-1">
                {data.filas.length}
              </p>
            </div>
          </div>

          {/* Tabla de 24 Columnas Formal SUNAT Formato 13.1 */}
          <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr className="bg-[#16201C] text-white text-center font-bold divide-x divide-[#2A3B34]">
                    <th colSpan={5} className="py-2 px-2 uppercase tracking-wider">
                      Documento de Traslado / Comprobante
                    </th>
                    <th colSpan={3} className="py-2 px-2 uppercase tracking-wider bg-[#2E7D32]/80">
                      Entradas
                    </th>
                    <th colSpan={3} className="py-2 px-2 uppercase tracking-wider bg-[#D32F2F]/80">
                      Salidas
                    </th>
                    <th colSpan={3} className="py-2 px-2 uppercase tracking-wider bg-[#1565C0]/80">
                      Saldo Final
                    </th>
                  </tr>
                  <tr className="bg-[#FAFAF7] text-[#6B7A72] border-b border-[#E7E5DF] text-[10px] uppercase font-bold divide-x divide-[#E7E5DF]">
                    <th className="py-2 px-2 whitespace-nowrap">Fecha</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap">Tipo</th>
                    <th className="py-2 px-1 text-center whitespace-nowrap">Serie</th>
                    <th className="py-2 px-1.5 text-center whitespace-nowrap">Número</th>
                    <th className="py-2 px-1.5 text-center whitespace-nowrap">Tipo Op.</th>

                    <th className="py-2 px-2 text-right whitespace-nowrap">Cant.</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">C. Unit.</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">C. Total</th>

                    <th className="py-2 px-2 text-right whitespace-nowrap">Cant.</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">C. Unit.</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">C. Total</th>

                    <th className="py-2 px-2 text-right whitespace-nowrap">Cant.</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">C. Prom.</th>
                    <th className="py-2 px-2 text-right whitespace-nowrap">C. Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5DF] text-[#16201C]">
                  {data.filas.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-8 text-center text-[#6B7A72] font-sans">
                        No se registran movimientos valorizados en este período para el producto seleccionado.
                      </td>
                    </tr>
                  ) : (
                    data.filas.map((f) => (
                      <tr key={f.id} className="hover:bg-[#FAFAF7] transition-colors divide-x divide-[#E7E5DF]">
                        <td className="py-1.5 px-2 whitespace-nowrap">
                          {new Date(f.fecha).toLocaleDateString('es-PE')}
                        </td>
                        <td className="py-1.5 px-1 text-center" title={f.tipo_comprobante_desc}>
                          {f.tipo_comprobante}
                        </td>
                        <td className="py-1.5 px-1 text-center">{f.serie_comprobante}</td>
                        <td className="py-1.5 px-1.5 text-center">{f.numero_comprobante}</td>
                        <td className="py-1.5 px-1.5 text-center" title={f.tipo_operacion_desc}>
                          {f.tipo_operacion}
                        </td>

                        {/* Entradas */}
                        <td className="py-1.5 px-2 text-right tabular-nums text-[#2E7D32]">
                          {f.entrada_cantidad > 0 ? f.entrada_cantidad : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums">
                          {f.entrada_costo_unitario > 0 ? f.entrada_costo_unitario.toFixed(2) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums font-medium text-[#2E7D32]">
                          {f.entrada_costo_total > 0 ? f.entrada_costo_total.toFixed(2) : '-'}
                        </td>

                        {/* Salidas */}
                        <td className="py-1.5 px-2 text-right tabular-nums text-[#D32F2F]">
                          {f.salida_cantidad > 0 ? f.salida_cantidad : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums">
                          {f.salida_costo_unitario > 0 ? f.salida_costo_unitario.toFixed(2) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums font-medium text-[#D32F2F]">
                          {f.salida_costo_total > 0 ? f.salida_costo_total.toFixed(2) : '-'}
                        </td>

                        {/* Saldo Final */}
                        <td className="py-1.5 px-2 text-right tabular-nums font-bold">
                          {f.saldo_cantidad}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums font-medium text-[#1565C0]">
                          {f.saldo_costo_unitario.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums font-bold bg-[#FAFAF7]">
                          S/ {f.saldo_costo_total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {data.filas.length > 0 && (
                  <tfoot className="bg-[#FAFAF7] font-bold border-t-2 border-[#16201C] divide-x divide-[#E7E5DF]">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-2 text-center uppercase tracking-wider text-[10px]">
                        Totales Acumulados
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-[#2E7D32]">
                        {data.totales.total_entradas_cant}
                      </td>
                      <td className="py-2.5 px-2 text-right">-</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-[#2E7D32]">
                        S/ {data.totales.total_entradas_valor.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-[#D32F2F]">
                        {data.totales.total_salidas_cant}
                      </td>
                      <td className="py-2.5 px-2 text-right">-</td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-[#D32F2F]">
                        S/ {data.totales.total_salidas_valor.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-bold">
                        {data.totales.saldo_final_cant}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums text-[#1565C0]">
                        S/ {data.totales.costo_promedio_actual.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-2 text-right tabular-nums font-bold bg-white text-[#16201C]">
                        S/ {data.totales.saldo_final_valor.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
