import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { AppLayoutClient } from '../../components/layout/AppLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Consultar perfil en public.usuarios o fallback a user_metadata
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre_completo, rol')
    .eq('id', user.id)
    .maybeSingle()

  const nombreCompleto =
    perfil?.nombre_completo ||
    (user.user_metadata?.nombre_completo as string) ||
    user.email?.split('@')[0] ||
    'Colaborador'

  const rol = (perfil?.rol || (user.user_metadata?.rol as string) || 'admin') as
    | 'admin'
    | 'almacenero'
    | 'vendedor'

  const email = user.email || ''

  return (
    <AppLayoutClient
      userName={nombreCompleto}
      userRole={rol}
      userEmail={email}
    >
      {children}
    </AppLayoutClient>
  )
}
