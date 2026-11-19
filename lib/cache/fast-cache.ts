import { createClient } from '../supabase/server'

// Cache en memoria aislado por Tenant (elimina latencia de red sin fugar datos entre empresas)
const memoryCache = new Map<string, { data: unknown; expiry: number }>()

export async function withFastCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
  explicitTenantId?: string
): Promise<T> {
  let tenantId = explicitTenantId
  if (!tenantId) {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      tenantId = (user?.user_metadata?.negocio_id as string) || user?.id || 'public'
    } catch {
      tenantId = 'public'
    }
  }

  const scopedKey = `${tenantId}:${key}`
  const now = Date.now()
  const cached = memoryCache.get(scopedKey)

  if (cached && cached.expiry > now) {
    return cached.data as T
  }

  const freshData = await fetcher()
  memoryCache.set(scopedKey, {
    data: freshData,
    expiry: now + ttlSeconds * 1000,
  })

  return freshData
}

export function invalidateFastCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear()
    return
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(prefix)) {
      memoryCache.delete(key)
    }
  }
}
