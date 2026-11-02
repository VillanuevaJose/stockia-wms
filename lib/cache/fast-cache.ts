// Cache en memoria para respuestas de lectura de alta frecuencia (elimina latencia de red en navegación)
const memoryCache = new Map<string, { data: unknown; expiry: number }>()

export async function withFastCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now()
  const cached = memoryCache.get(key)

  if (cached && cached.expiry > now) {
    return cached.data as T
  }

  const freshData = await fetcher()
  memoryCache.set(key, {
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
    if (key.startsWith(prefix)) {
      memoryCache.delete(key)
    }
  }
}
