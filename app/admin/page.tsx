import { getDashboardData } from '../../lib/queries/dashboard'
import { InteractiveDashboardGrid } from '../../components/dashboard/InteractiveDashboardGrid'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const data = await getDashboardData()

  const hoyTexto = new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Lima',
  }).format(new Date())
  const fechaCapitalizada = hoyTexto.charAt(0).toUpperCase() + hoyTexto.slice(1)

  return (
    <InteractiveDashboardGrid
      data={data}
      fechaCapitalizada={fechaCapitalizada}
    />
  )
}
