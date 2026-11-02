import { getUsuariosList, getAlmacenesList } from '../../../lib/queries/operaciones'
import { createClient } from '../../../lib/supabase/server'
import { UsuariosManager } from '../../../components/usuarios/UsuariosManager'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const [usuarios, almacenes] = await Promise.all([
    getUsuariosList(),
    getAlmacenesList(),
  ])
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Usuarios y Asignación de Sedes
          </h1>
          <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
            {usuarios.length} {usuarios.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}
          </span>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Panel de administración central: gestiona roles operativos (RBAC) y asignación física de sedes para cada colaborador.
        </p>
      </div>

      <UsuariosManager usuarios={usuarios} almacenes={almacenes} currentUserId={user?.id} />
    </div>
  )
}
