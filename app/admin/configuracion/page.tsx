import Link from 'next/link'
import { createClient } from '../../../lib/supabase/server'
import { ConfiguracionForm } from '../../../components/configuracion/ConfiguracionForm'
import { ApiKeysManager } from '../../../components/configuracion/ApiKeysManager'
import { RespaldosManager } from '../../../components/configuracion/RespaldosManager'
import { getHistorialRespaldosAction } from '../../../lib/actions/respaldos'

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

  const [{ data: negocio }, historialRespaldos] = await Promise.all([
    supabase
      .from('negocio')
      .select('id, nombre, ruc, direccion, telefono, email, logo_url')
      .eq('id', usuario?.negocio_id || '')
      .single(),
    tab === 'respaldos' ? getHistorialRespaldosAction() : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-[#E7E5DF] pb-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-[#16201C] leading-[1.15]">
              Configuración y Continuidad
            </h1>
            <p className="text-[13px] text-[#6B7A72] mt-1">
              Identidad fiscal, credenciales de API y respaldos manuales o automáticos con firma SHA-256.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 bg-[#FAFAF7] p-1 rounded-[8px] border border-[#E7E5DF] self-start sm:self-auto">
            <Link
              href="/admin/configuracion?tab=negocio"
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                tab === 'negocio'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Datos del Negocio
            </Link>
            <Link
              href="/admin/configuracion?tab=respaldos"
              className={`px-3 py-1.5 text-[12px] font-medium rounded-[6px] transition-colors ${
                tab === 'respaldos'
                  ? 'bg-[#16201C] text-white shadow-sm'
                  : 'text-[#6B7A72] hover:text-[#16201C]'
              }`}
            >
              Respaldos
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
      ) : tab === 'respaldos' ? (
        <RespaldosManager
          historialInicial={historialRespaldos}
          negocioId={usuario?.negocio_id || ''}
        />
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
