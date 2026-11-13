import type { Metadata } from 'next'
import { createClient } from '../../lib/supabase/server'
import { CompletarInvitacionPortal } from './CompletarInvitacionPortal'
import type { PerfilInvitado } from './actions'

export const metadata: Metadata = {
  title: 'Configurar Cuenta de Colaborador | Stockia WMS',
  description: 'Establece tu contraseña personal para acceder al entorno corporativo en Stockia.',
}

export default async function CompletarInvitacionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let initialPerfil: PerfilInvitado | null = null

  if (user) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select(`
        id,
        nombre_completo,
        email,
        rol,
        negocio:negocio_id (nombre, ruc),
        almacen:almacen_id (nombre, codigo)
      `)
      .eq('id', user.id)
      .maybeSingle()

    if (perfil) {
      // @ts-expect-error Supabase nested
      const empresaNombre = perfil.negocio?.nombre || 'Empresa Asociada'
      // @ts-expect-error Supabase nested
      const empresaRuc = perfil.negocio?.ruc || null
      // @ts-expect-error Supabase nested
      const sedeNombre = perfil.almacen?.nombre || 'Sede Central'
      // @ts-expect-error Supabase nested
      const sedeCodigo = perfil.almacen?.codigo || null

      initialPerfil = {
        id: perfil.id,
        nombre_completo: perfil.nombre_completo || user.email || 'Colaborador',
        email: perfil.email || user.email || '',
        rol: perfil.rol,
        empresaNombre,
        empresaRuc,
        sedeNombre,
        sedeCodigo,
      }
    }
  }

  // Si no hay sesión en SSR (ej. token en hash fragment del navegador),
  // el portal cliente captura el token y extrae los datos sin rebotar a /login
  return <CompletarInvitacionPortal initialPerfil={initialPerfil} />
}
