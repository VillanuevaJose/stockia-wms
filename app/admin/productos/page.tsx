import { Suspense } from 'react'
import {
  getProductos,
  getCategorias,
  getUnidadesMedida,
  getAlmacenes,
} from '../../../lib/queries/productos'
import { ProductosClient } from '../../../components/productos/ProductosClient'
import { ProductosSkeleton } from '../../../components/productos/ProductosSkeleton'

interface ProductosPageProps {
  searchParams: Promise<{
    q?: string
    categoria_id?: string
    stock_bajo?: string
    page?: string
  }>
}

export const dynamic = 'force-dynamic'
export default async function ProductosPage({ searchParams }: ProductosPageProps) {
  const resolvedParams = await searchParams

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1
  const q = resolvedParams.q || ''
  const categoria_id = resolvedParams.categoria_id || undefined
  const stock_bajo = resolvedParams.stock_bajo === 'true'

  // Consultar en paralelo datos de catálogo y selectores
  const [productosData, categorias, unidades, almacenes] = await Promise.all([
    getProductos({
      page,
      q,
      categoria_id,
      stock_bajo,
      activo: true,
      pageSize: 15,
    }),
    getCategorias(),
    getUnidadesMedida(),
    getAlmacenes(),
  ])

  return (
    <div className="space-y-6 ops-fade-in font-sans">
      {/* Encabezado Editorial en Manrope */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 border-b border-[#E7E5DF] pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-[-0.02em] leading-[1.15] text-[#16201C]">
            Catálogo Maestro de Existencias
          </h1>
          <p className="text-[13px] text-[#6B7A72] mt-1 font-medium">
            Registro unificado de artículos, precios oficiales, costo y existencias consolidadas.
          </p>
        </div>

        <div className="text-[12px] font-sans text-[#6B7A72] bg-white px-3 py-1 rounded-[6px] border border-[#E7E5DF] self-start sm:self-auto tabular-nums">
          Total artículos: <span className="font-semibold text-[#16201C]">{productosData.total}</span>
        </div>
      </div>

      {/* Contenido con Suspense */}
      <Suspense fallback={<ProductosSkeleton />}>
        <ProductosClient
          productos={productosData.productos}
          total={productosData.total}
          page={page}
          pageSize={15}
          totalPages={productosData.totalPages}
          categorias={categorias}
          unidades={unidades}
          almacenes={almacenes}
        />
      </Suspense>
    </div>
  )
}
