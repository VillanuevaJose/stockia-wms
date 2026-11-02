import { getAlmacenesList } from '../../../lib/queries/operaciones'
import { getHistorialComunicacionSedes } from '../../../lib/queries/sedes'
import { createClient } from '../../../lib/supabase/server'
import { ComunicacionSedesManager } from '../../../components/maestros/ComunicacionSedesManager'

export const dynamic = 'force-dynamic'

export default async function AlmacenesPage() {
  const [almacenes, historial] = await Promise.all([
    getAlmacenesList(),
    getHistorialComunicacionSedes(),
  ])

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userAlmacenId: string | null = null
  let userRol: 'admin' | 'almacenero' | 'vendedor' = 'vendedor'

  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, almacen_id')
      .eq('id', user.id)
      .maybeSingle()

    userAlmacenId = perfil?.almacen_id || (user.user_metadata?.almacen_id as string) || null
    userRol = ((perfil?.rol || user.user_metadata?.rol || 'vendedor') as 'admin' | 'almacenero' | 'vendedor')
  }

  const { data: productos } = await supabase
    .from('productos')
    .select('id, nombre, sku')
    .eq('activo', true)
    .order('nombre')

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Sedes, Logística e Intercomunicación
          </h1>
          <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
            {almacenes.length} {almacenes.length === 1 ? 'sede conectada' : 'sedes conectadas'}
          </span>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Panel de control de sedes físicas oficiales, órdenes de abastecimiento e historial de comunicación inter-sedes.
        </p>
      </div>

      <ComunicacionSedesManager
        almacenes={almacenes}
        historial={historial}
        productos={productos || []}
        userAlmacenId={userAlmacenId}
        userRol={userRol}
      />
    </div>
  )
}
