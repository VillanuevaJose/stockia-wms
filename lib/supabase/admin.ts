import { createClient } from '@supabase/supabase-js'

/**
 * Cliente administrativo de Supabase con Service Role Key.
 * EXCLUSIVO para ejecución en servidor (Server Actions / Route Handlers).
 * NUNCA exponer al cliente ni importar en componentes 'use client'.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Variables de entorno de Supabase Service Role faltantes en el servidor.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
