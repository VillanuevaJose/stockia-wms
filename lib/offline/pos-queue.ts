export interface OfflineSaleEntry {
  idempotency_key: string
  created_at: string
  almacen_id?: string
  metodo_pago: 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CULQI' | 'OTRO'
  items: Array<{ producto_id: string; cantidad: number; nombre?: string }>
  total_estimado: number
  vuelto?: number
  culqi_charge_id?: string | null
  estado: 'PENDIENTE' | 'ERROR'
  ultimo_error?: string
}

export interface CachedPosProduct {
  id: string
  sku: string
  codigo_barras: string | null
  nombre: string
  precio: number
  stock: number
  unidad: string
}

const DB_NAME = 'stockia-pos-offline'
const DB_VERSION = 1
const STORE_QUEUE = 'ventas_pendientes'
const STORE_CATALOG = 'catalogo_cache'

function openPosDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB no disponible'))
      return
    }
    const req = window.indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'idempotency_key' })
      }
      if (!db.objectStoreNames.contains(STORE_CATALOG)) {
        db.createObjectStore(STORE_CATALOG, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('Error abriendo IndexedDB'))
  })
}

export async function saveCatalogSnapshot(items: CachedPosProduct[]): Promise<void> {
  try {
    const db = await openPosDb()
    const tx = db.transaction(STORE_CATALOG, 'readwrite')
    const store = tx.objectStore(STORE_CATALOG)
    store.clear()
    for (const item of items) {
      store.put(item)
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // Ignorar silenciosamente en entornos sin IndexedDB
  }
}

export async function loadCatalogSnapshot(): Promise<CachedPosProduct[]> {
  try {
    const db = await openPosDb()
    const tx = db.transaction(STORE_CATALOG, 'readonly')
    const store = tx.objectStore(STORE_CATALOG)
    const req = store.getAll()
    const res = await new Promise<CachedPosProduct[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result || []) as CachedPosProduct[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return res
  } catch {
    return []
  }
}

export async function enqueueOfflineSale(entry: OfflineSaleEntry): Promise<void> {
  const db = await openPosDb()
  const tx = db.transaction(STORE_QUEUE, 'readwrite')
  tx.objectStore(STORE_QUEUE).put(entry)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function getOfflineSalesQueue(): Promise<OfflineSaleEntry[]> {
  try {
    const db = await openPosDb()
    const tx = db.transaction(STORE_QUEUE, 'readonly')
    const req = tx.objectStore(STORE_QUEUE).getAll()
    const rows = await new Promise<OfflineSaleEntry[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result || []) as OfflineSaleEntry[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
  } catch {
    return []
  }
}

export async function removeOfflineSale(idempotencyKey: string): Promise<void> {
  try {
    const db = await openPosDb()
    const tx = db.transaction(STORE_QUEUE, 'readwrite')
    tx.objectStore(STORE_QUEUE).delete(idempotencyKey)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function markOfflineSaleError(
  idempotencyKey: string,
  errorMsg: string
): Promise<void> {
  try {
    const db = await openPosDb()
    const tx = db.transaction(STORE_QUEUE, 'readwrite')
    const store = tx.objectStore(STORE_QUEUE)
    const existing = await new Promise<OfflineSaleEntry | undefined>((resolve) => {
      const req = store.get(idempotencyKey)
      req.onsuccess = () => resolve(req.result as OfflineSaleEntry | undefined)
      req.onerror = () => resolve(undefined)
    })
    if (existing) {
      store.put({
        ...existing,
        estado: 'ERROR',
        ultimo_error: errorMsg,
      })
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    // ignore
  }
}
