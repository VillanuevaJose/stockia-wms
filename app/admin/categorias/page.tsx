import { getCategoriasList } from '../../../lib/queries/operaciones'
import { CategoriasManager } from '../../../components/maestros/CategoriasManager'

export const dynamic = 'force-dynamic'

export default async function CategoriasPage() {
  const categorias = await getCategoriasList()

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Categorías
          </h1>
          <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
            {categorias.length} {categorias.length === 1 ? 'familia' : 'familias'}
          </span>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Estructuración y segmentación del catálogo de artículos del almacén.
        </p>
      </div>

      <CategoriasManager categorias={categorias} />
    </div>
  )
}
