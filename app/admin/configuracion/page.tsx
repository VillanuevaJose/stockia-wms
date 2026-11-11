import Link from 'next/link'
import { createClient } from '../../../lib/supabase/server'
import { ConfiguracionForm } from '../../../components/configuracion/ConfiguracionForm'
import { ApiKeysManager } from '../../../components/configuracion/ApiKeysManager'

export const dynamic = 'force-dynamic'

interface ConfiguracionPageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

export default async function ConfiguracionPage({ searchParams }: ConfiguracionPageProps) {
  const params = await searchParams
  const tab = params.tab || 'negocio'

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
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Configuración y Desarrolladores
            </h1>
            <p className="text-[13px] text-[#6B7A72] mt-1">
              Identidad fiscal, datos de contacto y credenciales de API para integración B2B.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#FAFAF7] p-1 rounded-[8px] border border-[#E7E5DF] self-start sm:self-auto">
            <Link
              href="/admin/configuracion?tab=negocio"
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                tab !== 'api'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Datos del Negocio
            </Link>
            <Link
              href="/admin/configuracion?tab=api"
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                tab === 'api'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              API B2B & Claves
            </Link>
          </div>
        </div>
      </div>

      {tab === 'api' ? (
        <ApiKeysManager />
      ) : (
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
      )}
    </div>
  )
}
