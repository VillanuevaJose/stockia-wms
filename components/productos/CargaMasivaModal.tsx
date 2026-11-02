'use client'

import React, { useState, useTransition } from 'react'
import { X, Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from '../ui/icons'
import { importarProductosMasivoAction, type ProductoImportItem } from '../../app/admin/actions'

interface AlmacenItem {
  id: string
  nombre: string
  codigo: string | null
  es_principal: boolean
}

interface Props {
  isOpen: boolean
  onClose: () => void
  almacenes: AlmacenItem[]
}

interface ParsedRow extends ProductoImportItem {
  isValid: boolean
  error?: string
}

export function CargaMasivaModal({ isOpen, onClose, almacenes }: Props) {
  const [rawText, setRawText] = useState('')
  const [selectedAlmacenId, setSelectedAlmacenId] = useState<string>(
    almacenes.find((a) => a.es_principal)?.id || almacenes[0]?.id || ''
  )
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isPending, startTransition] = useTransition()
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  if (!isOpen) return null

  const parseInput = (text: string) => {
    setRawText(text)
    setStatusMsg(null)
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

    const rows: ParsedRow[] = lines.map((line, idx) => {
      // Separador: tabulaciones (Excel) o comas (CSV)
      const parts = line.includes('\t') ? line.split('\t') : line.split(',')

      if (parts.length < 2) {
        return {
          nombre: line,
          precio_venta: 0,
          stock_inicial: 0,
          isValid: false,
          error: 'Faltan campos (mínimo: Nombre, Precio)',
        }
      }

      const nombre = parts[0]?.trim() || ''
      const precio = parseFloat(parts[1]?.replace(/[^\d.-]/g, '') || '0')
      const stock = parts[2] ? parseFloat(parts[2]?.replace(/[^\d.-]/g, '') || '0') : 0
      const costo = parts[3] ? parseFloat(parts[3]?.replace(/[^\d.-]/g, '') || '0') : 0
      const codigo = parts[4]?.trim() || undefined

      const isValid = Boolean(nombre.length >= 2 && !isNaN(precio) && precio > 0)
      let error = undefined
      if (!isValid) {
        if (nombre.length < 2) error = 'Nombre demasiado corto'
        else if (isNaN(precio) || precio <= 0) error = 'Precio inválido'
      }

      return {
        nombre,
        precio_venta: isNaN(precio) ? 0 : precio,
        stock_inicial: isNaN(stock) || stock < 0 ? 0 : stock,
        costo: isNaN(costo) || costo < 0 ? 0 : costo,
        codigo_barras: codigo,
        sku: `IMP-${Date.now().toString().slice(-4)}-${idx + 1}`,
        isValid,
        error,
      }
    })

    setParsedRows(rows)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        parseInput(reader.result)
      }
    }
    reader.readAsText(file)
  }

  const loadExample = () => {
    const example = [
      'Disco de Corte Metal 4 1/2 DeWalt\t6.50\t100\t3.80\t7751234001015',
      'Broca para Concreto 1/4 Bosch\t12.00\t45\t7.20\t7751234001022',
      'Huincha Métrica 5m Stanley con Freno\t24.50\t30\t14.00\t7751234001039',
      'Llave Francesa 10 Cromada Bahco\t58.00\t20\t36.00\t7751234001046',
      'Cinta Aislante 3M Temflex 1700 Negra\t5.50\t150\t2.80\t7751234001053',
      'Silicón Acético Transparente Sika 280ml\t18.50\t40\t11.20\t7751234001060',
      'Soldadura 6011 1/8 Oerlikon x 1 Kg\t22.00\t50\t14.50\t7751234001077',
      'Candado de Bronce 50mm Yale con 3 Llaves\t38.00\t25\t23.00\t7751234001084',
      'Nivel de Mano de Aluminio 24 Stanley\t42.00\t15\t26.50\t7751234001091',
      'Mascarilla Respirador Doble Vía 3M 6200\t95.00\t18\t62.00\t7751234001107',
      'Espátula de Acero Inoxidable 3 Truper\t9.50\t60\t5.00\t7751234001114',
      'Rodillo Antigota 9 con Mango Atlas\t16.00\t35\t9.80\t7751234001121',
      'Lija de Agua Grano 120 Norton x 10 Hojas\t15.00\t80\t8.50\t7751234001138',
      'Sierra Copa Bimetálica 1 1/2 Starrett\t48.00\t12\t31.00\t7751234001145',
      'Extensión Eléctrica Uso Rudo 10m 3x16 AWG\t45.00\t22\t28.00\t7751234001152',
      'Bota de Seguridad con Punta de Acero Talla 42\t115.00\t14\t78.00\t7751234001169',
      'Alicate de Presión 10 Mordaza Curva Irwin\t46.00\t20\t29.50\t7751234001176',
      'Grasa Multiuso Litio MP-2 Vistony 1 Lb\t16.50\t40\t10.20\t7751234001183',
      'Manguera para Jardín Reforzada 1/2 x 15m\t52.00\t16\t33.00\t7751234001190',
      'Juego de Llaves Allen 9 Piezas Métricas Truper\t28.00\t30\t16.50\t7751234001206',
    ].join('\n')
    parseInput(example)
  }

  const handleProcesar = () => {
    const validos = parsedRows.filter((r) => r.isValid)
    if (validos.length === 0) {
      setStatusMsg({ type: 'err', text: 'No hay filas válidas para guardar.' })
      return
    }

    startTransition(async () => {
      const res = await importarProductosMasivoAction(validos, selectedAlmacenId)
      if (res.success) {
        setStatusMsg({
          type: 'ok',
          text: `¡Éxito! Se importaron ${res.agregados} productos e ingresaron a inventario.`,
        })
        setTimeout(() => {
          onClose()
          setRawText('')
          setParsedRows([])
        }, 1200)
      } else {
        setStatusMsg({ type: 'err', text: res.error || 'Error al procesar la carga.' })
      }
    })
  }

  const validCount = parsedRows.filter((r) => r.isValid).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="bg-white rounded-[10px] max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#E7E5DF] shadow-2xl overflow-hidden">
        {/* Encabezado */}
        <div className="p-4 bg-[#16201C] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-[#E8A33D]" />
            <div>
              <h3 className="text-[15px] font-bold">Carga Masiva de Catálogo e Inventario</h3>
              <p className="text-[11px] text-gray-300">
                Pega filas directamente desde Excel o importa un archivo CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-[13px]">
          {/* Instrucciones y Formato */}
          <div className="p-3 bg-[#FAFAF7] border border-[#E7E5DF] rounded-[6px] space-y-1 text-[#6B7A72]">
            <p className="text-[#16201C] font-semibold">Formato esperado por cada línea:</p>
            <p className="font-mono text-[11px] text-[#16201C]">
              Nombre, Precio, Stock, Costo (opcional), Código de barras (opcional)
            </p>
            <p className="text-[11px]">
              Acepta separación por comas (CSV) o por tabulaciones (copiar y pegar celdas de Excel).
            </p>
          </div>

          {/* Sede Destino del Stock Inicial */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16201C] mb-1">
              Sede donde ingresará el stock inicial:
            </label>
            <select
              value={selectedAlmacenId}
              onChange={(e) => setSelectedAlmacenId(e.target.value)}
              className="w-full px-3 py-2 text-[13px] border border-[#E7E5DF] rounded-[6px] bg-white text-[#16201C] focus:outline-none focus:border-[#16201C]"
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} {a.es_principal ? '(Sede Principal)' : `(${a.codigo || 'Sede'})`}
                </option>
              ))}
            </select>
          </div>

          {/* Área de texto */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[12px] font-semibold text-[#16201C]">
                Pega tus datos aquí:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadExample}
                  className="text-[11px] font-medium text-[#2E7D32] hover:underline cursor-pointer"
                >
                  Cargar Ejemplo
                </button>
                <label className="text-[11px] font-medium text-[#16201C] hover:underline cursor-pointer flex items-center gap-1">
                  <Upload size={12} />
                  <span>Subir CSV</span>
                  <input
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain,*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => parseInput(e.target.value)}
              placeholder="Pega las celdas de Excel o texto CSV aquí..."
              className="w-full p-3 font-mono text-[12px] border border-[#E7E5DF] rounded-[6px] focus:outline-none focus:border-[#16201C] bg-[#FAFAF7]"
            />
          </div>

          {/* Feedback de estado */}
          {statusMsg && (
            <div
              className={`p-3 rounded-[6px] text-[13px] flex items-center gap-2 ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMsg.type === 'ok' ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertTriangle size={16} className="text-rose-600" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Previsualización en Vivo */}
          {parsedRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7A72]">
                  Previsualización ({validCount} de {parsedRows.length} filas válidas)
                </span>
              </div>

              <div className="border border-[#E7E5DF] rounded-[6px] overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[12px] border-collapse">
                  <thead className="bg-[#FAFAF7] border-b border-[#E7E5DF] text-[#6B7A72]">
                    <tr>
                      <th className="py-1.5 px-2.5">Producto</th>
                      <th className="py-1.5 px-2.5 text-right">Precio</th>
                      <th className="py-1.5 px-2.5 text-right">Stock</th>
                      <th className="py-1.5 px-2.5 text-right">Costo</th>
                      <th className="py-1.5 px-2.5">Código</th>
                      <th className="py-1.5 px-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5DF]">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-[#FAFAF7]' : 'bg-rose-50/40'}>
                        <td className="py-1.5 px-2.5 font-medium text-[#16201C] truncate max-w-[160px]">
                          {r.nombre}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                          S/ {r.precio_venta.toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums">
                          {r.stock_inicial}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono text-[#6B7A72] tabular-nums">
                          S/ {r.costo ? r.costo.toFixed(2) : '0.00'}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-[11px] text-[#6B7A72]">
                          {r.codigo_barras || 'Auto-SKU'}
                        </td>
                        <td className="py-1.5 px-2.5 text-center">
                          {r.isValid ? (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                              Válido
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded" title={r.error}>
                              Error
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#FAFAF7] border-t border-[#E7E5DF] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium text-[#16201C] hover:bg-[#E7E5DF] rounded-[6px] transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isPending || validCount === 0}
            onClick={handleProcesar}
            className="px-5 py-2 text-[13px] font-medium bg-[#16201C] hover:bg-[#2A3B34] text-white rounded-[6px] disabled:opacity-40 transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Guardando {validCount} productos...</span>
              </>
            ) : (
              <span>Procesar e Importar {validCount > 0 ? `(${validCount})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
