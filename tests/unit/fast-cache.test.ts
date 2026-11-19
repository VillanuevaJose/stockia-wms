import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withFastCache, invalidateFastCache } from '@/lib/cache/fast-cache'

describe('Multi-Tenant Fast Cache', () => {
  beforeEach(() => {
    invalidateFastCache()
  })

  it('guarda en caché el resultado y evita llamadas redundantes al fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue({ stock: 50 })

    const res1 = await withFastCache<{ stock: number }>('item-123', 60, fetcher, 'tenant-alpha')
    const res2 = await withFastCache<{ stock: number }>('item-123', 60, fetcher, 'tenant-alpha')

    expect(res1).toEqual({ stock: 50 })
    expect(res2).toEqual({ stock: 50 })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('mantiene estricto aislamiento entre tenants (no fuga datos entre empresas)', async () => {
    interface EmpresaData {
      empresa: string
      ingresos: number
    }
    const fetcherAlpha = vi.fn().mockResolvedValue({ empresa: 'Alpha SAC', ingresos: 10000 })
    const fetcherBeta = vi.fn().mockResolvedValue({ empresa: 'Beta SAC', ingresos: 500 })

    const dataAlpha = await withFastCache<EmpresaData>('kpi-ventas', 60, fetcherAlpha, 'tenant-alpha')
    const dataBeta = await withFastCache<EmpresaData>('kpi-ventas', 60, fetcherBeta, 'tenant-beta')

    expect(dataAlpha.empresa).toBe('Alpha SAC')
    expect(dataBeta.empresa).toBe('Beta SAC')
    expect(fetcherAlpha).toHaveBeenCalledTimes(1)
    expect(fetcherBeta).toHaveBeenCalledTimes(1)
  })

  it('invalida el caché cuando se ejecuta invalidateFastCache', async () => {
    const fetcher = vi.fn().mockResolvedValue({ count: 1 })

    await withFastCache<{ count: number }>('counter', 60, fetcher, 'tenant-test')
    invalidateFastCache('counter')

    await withFastCache<{ count: number }>('counter', 60, fetcher, 'tenant-test')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
