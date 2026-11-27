import { getEntregaPublicaData } from '@/lib/actions/epod'
import { EntregaPublicaClient } from '@/components/maestros/FirmaTactilCanvas'

export const dynamic = 'force-dynamic'

interface EntregaPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ t?: string }>
}

export default async function EntregaPublicaPage({ params, searchParams }: EntregaPageProps) {
  const { id } = await params
  const { t } = await searchParams

  const data = await getEntregaPublicaData(id, t || '')

  return <EntregaPublicaClient solicitudId={id} token={t || ''} data={data} />
}
