import { createClient } from '../../../lib/supabase/server'
import { ConfiguracionForm } from '../../../components/configuracion/ConfiguracionForm'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id')
    .eq('id', user?.id || '')
    .single()

  const { data: negocio } = await supabase
    .from('negocio')
    .select('id, nombre, ruc, direccion, telefono, email, logo_url')
    .eq('id', usuario?.negocio_id || '')
    .single()

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
          Configuración del Negocio
        </h1>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Identidad fiscal, datos de contacto y membrete de comprobantes para tu almacén.
        </p>
      </div>

      <ConfiguracionForm
        negocio={
          negocio || {
            id: '',
            nombre: 'Mi Almacén',
            ruc: null,
            direccion: null,
            telefono: null,
            email: user?.email || null,
            logo_url: null,
          }
        }
      />
    </div>
  )
}
