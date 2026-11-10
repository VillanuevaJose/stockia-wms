import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { ProveedoresManager } from '../../../components/proveedores/ProveedoresManager'

export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('rol, activo')
    .eq('id', user.id)
    .single()

  if (!usuario || !usuario.activo) {
    redirect('/login')
  }

  const { data: proveedores } = await supabase
    .from('proveedor')
    .select('id, ruc, razon_social, contacto_nombre, telefono, email, direccion, activo, created_at')
    .order('razon_social', { ascending: true })

  const list = (proveedores || []).map((p) => ({
    id: p.id,
    ruc: p.ruc,
    razon_social: p.razon_social,
    contacto_nombre: p.contacto_nombre,
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    activo: Boolean(p.activo),
    created_at: p.created_at,
  }))

  return (
    <div className="space-y-6">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
            Directorio de Proveedores
          </h1>
          <span className="font-mono text-[12px] text-[#6B7A72] tabular-nums">
            {list.length} {list.length === 1 ? 'proveedor' : 'proveedores'}
          </span>
        </div>
        <p className="text-[13px] text-[#6B7A72] mt-1">
          Padrón oficial de empresas proveedoras de mercadería, datos fiscales SUNAT y canales de contacto comercial.
        </p>
      </div>

      <ProveedoresManager proveedores={list} />
    </div>
  )
}
