import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const DEFAULT_DEMO_API_KEY = 'stk_live_stockia_b2b_demo_secret_2026'

export interface ApiKeyValidationResult {
  valid: boolean
  negocio_id?: string
  nombre_clave?: string
  error?: string
}

export async function validateApiKey(request: NextRequest): Promise<ApiKeyValidationResult> {
  const authHeader = request.headers.get('authorization')
  const xApiKey = request.headers.get('x-api-key')

  const rawKey = xApiKey || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null)

  if (!rawKey) {
    return {
      valid: false,
      error: 'Cabecera de autenticación faltante. Envíe "x-api-key" o "Authorization: Bearer <key>".',
    }
  }

  const adminClient = createAdminClient()

  // 1. Obtener negocio principal
  const { data: negocio } = await adminClient
    .from('negocio')
    .select('id, nombre')
    .eq('activo', true)
    .limit(1)
    .single()

  if (!negocio) {
    return { valid: false, error: 'No se encontró un negocio activo en el sistema.' }
  }

  // 2. Verificar clave maestra de demostración/desarrollo
  if (rawKey === DEFAULT_DEMO_API_KEY) {
    return {
      valid: true,
      negocio_id: negocio.id,
      nombre_clave: 'Master B2B Demo Key',
    }
  }

  // 3. Verificar claves dinámicas registradas en auditoría
  const { data: keysDb } = await adminClient
    .from('auditoria')
    .select('datos_nuevos')
    .eq('tabla', 'api_key')
    .eq('accion', 'CREAR_API_KEY')
    .order('created_at', { ascending: false })

  if (keysDb && keysDb.length > 0) {
    for (const row of keysDb) {
      const payload = row.datos_nuevos as { api_key?: string; nombre?: string; activo?: boolean }
      if (payload && payload.api_key === rawKey && payload.activo !== false) {
        return {
          valid: true,
          negocio_id: negocio.id,
          nombre_clave: payload.nombre || 'Clave B2B Dinámica',
        }
      }
    }
  }

  return {
    valid: false,
    error: 'API Key inválida, inactiva o revocada.',
  }
}
