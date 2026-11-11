'use client'

import { useState } from 'react'
import { Check } from '../ui/icons'
import { DEFAULT_DEMO_API_KEY } from '@/lib/auth/api-key'

export function ApiKeysManager() {
  const [copiedKey, setCopiedKey] = useState(false)
  const [copiedCurlGet, setCopiedCurlGet] = useState(false)
  const [copiedCurlPost, setCopiedCurlPost] = useState(false)

  const curlGetExample = `curl -X GET "http://localhost:3000/api/v1/inventario" \\
  -H "x-api-key: ${DEFAULT_DEMO_API_KEY}"`

  const curlPostExample = `curl -X POST "http://localhost:3000/api/v1/movimientos" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${DEFAULT_DEMO_API_KEY}" \\
  -d '{
    "tipo": "SALIDA",
    "motivo": "Despacho automatizado pedido web #4092",
    "items": [
      { "sku": "her-004", "cantidad": 2 }
    ]
  }'`

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Tarjeta de API Key Activa */}
      <div className="bg-white p-5 rounded-[8px] border border-[#E7E5DF] space-y-4">
        <div className="flex items-center justify-between border-b border-[#E7E5DF] pb-3">
          <div>
            <h3 className="text-[15px] font-bold text-[#16201C]">API Key Maestra B2B (Producción / Demo)</h3>
            <p className="text-[12px] text-[#6B7A72] mt-0.5">
              Utiliza esta clave en la cabecera HTTP <code className="bg-[#FAFAF7] px-1.5 py-0.5 rounded border border-[#E7E5DF] font-mono text-[11px]">x-api-key</code> para autenticar sistemas externos (Shopify, ERPs, apps móviles).
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#E8F5E9] text-[#2E7D32] border border-[#C8E6C9] rounded-[4px] text-[11px] font-bold">
            ACTIVA
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 font-mono text-[12px] bg-[#FAFAF7] border border-[#E7E5DF] px-3.5 py-2 rounded-[6px] text-[#16201C] select-all truncate">
            {DEFAULT_DEMO_API_KEY}
          </div>
          <button
            onClick={() => copyToClipboard(DEFAULT_DEMO_API_KEY, setCopiedKey)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-medium bg-[#16201C] hover:bg-[#2A3B34] text-white rounded-[6px] transition-colors cursor-pointer"
          >
            {copiedKey ? (
              <>
                <Check size={14} />
                <span>¡Copiada!</span>
              </>
            ) : (
              <span>Copiar API Key</span>
            )}
          </button>
        </div>
      </div>

      {/* Documentación de Endpoints REST */}
      <div className="space-y-4">
        <h3 className="text-[16px] font-bold text-[#16201C]">Endpoints REST Disponibles</h3>

        {/* Endpoint 1: GET /api/v1/inventario */}
        <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
          <div className="p-4 border-b border-[#E7E5DF] bg-[#FAFAF7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#2E7D32] text-white text-[11px] font-bold rounded-[4px] font-mono">
                GET
              </span>
              <code className="text-[13px] font-bold font-mono text-[#16201C]">/api/v1/inventario</code>
            </div>
            <span className="text-[11px] text-[#6B7A72]">Formato: JSON</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-[12px] text-[#6B7A72]">
              Retorna el catálogo maestro consolidado, precios en Soles, stocks en tiempo real y desglose por cada almacén y sede física.
            </p>
            <div className="relative">
              <pre className="bg-[#16201C] text-[#FAFAF7] p-3.5 rounded-[6px] text-[11px] font-mono overflow-x-auto">
                {curlGetExample}
              </pre>
              <button
                onClick={() => copyToClipboard(curlGetExample, setCopiedCurlGet)}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white rounded-[4px] transition-colors"
              >
                {copiedCurlGet ? '¡Copiado!' : 'Copiar cURL'}
              </button>
            </div>
          </div>
        </div>

        {/* Endpoint 2: POST /api/v1/movimientos */}
        <div className="bg-white rounded-[8px] border border-[#E7E5DF] overflow-hidden">
          <div className="p-4 border-b border-[#E7E5DF] bg-[#FAFAF7] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#1565C0] text-white text-[11px] font-bold rounded-[4px] font-mono">
                POST
              </span>
              <code className="text-[13px] font-bold font-mono text-[#16201C]">/api/v1/movimientos</code>
            </div>
            <span className="text-[11px] text-[#6B7A72]">Transaccional (RPC)</span>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-[12px] text-[#6B7A72]">
              Registra automáticamente salidas (despachos de pedidos e-commerce), entradas (recepción de compras) o ajustes físicos, actualizando el Kardex y stocks atómicamente.
            </p>
            <div className="relative">
              <pre className="bg-[#16201C] text-[#FAFAF7] p-3.5 rounded-[6px] text-[11px] font-mono overflow-x-auto">
                {curlPostExample}
              </pre>
              <button
                onClick={() => copyToClipboard(curlPostExample, setCopiedCurlPost)}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 text-[11px] font-medium bg-white/10 hover:bg-white/20 text-white rounded-[4px] transition-colors"
              >
                {copiedCurlPost ? '¡Copiado!' : 'Copiar cURL'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
