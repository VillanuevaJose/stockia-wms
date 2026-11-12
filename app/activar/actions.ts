'use server'

import { createAdminClient } from '../../lib/supabase/admin'

export interface ConsultaInvitacionResult {
  success: boolean
  error?: string
  datos?: {
    email: string
    nombre_completo: string
    rol: string
    empresa_nombre: string
    empresa_ruc?: string | null
    sede_nombre: string
    estado: 'pendiente' | 'activo' | 'inactivo'
    invited_at?: string | null
  }
}

// 1. Consultar si un correo tiene una invitación pendiente de aceptación
export async function consultarInvitacionAction(email: string): Promise<ConsultaInvitacionResult> {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Ingresa un correo electrónico válido.' }
  }

  const adminClient = createAdminClient()

  // Buscar en public.usuarios
  const { data: usuario, error: userErr } = await adminClient
    .from('usuarios')
    .select(`
      id,
      nombre_completo,
      email,
      rol,
      activo,
      negocio:negocio_id (nombre, ruc),
      almacen:almacen_id (nombre, codigo)
    `)
    .eq('email', cleanEmail)
    .maybeSingle()

  if (userErr || !usuario) {
    return {
      success: false,
      error: 'No se encontró ninguna invitación pendiente para este correo. Verifica que tu administrador te haya invitado.',
    }
  }

  // Verificar en Supabase Auth si aún no confirma su contraseña
  const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
  const authUser = authData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail)

  const isPending = Boolean(authUser?.invited_at && !authUser?.confirmed_at)

  // @ts-expect-error Supabase nested
  const empresaNombre = usuario.negocio?.nombre || 'Empresa Asociada'
  // @ts-expect-error Supabase nested
  const empresaRuc = usuario.negocio?.ruc || null
  // @ts-expect-error Supabase nested
  const sedeNombre = usuario.almacen?.nombre || 'Sede Principal'

  return {
    success: true,
    datos: {
      email: usuario.email,
      nombre_completo: usuario.nombre_completo,
      rol:
        usuario.rol === 'vendedor'
          ? 'Ventas y Mostrador (POS)'
          : usuario.rol === 'almacenero'
          ? 'Operador de Bodega y Almacén'
          : 'Administrador General',
      empresa_nombre: empresaNombre,
      empresa_ruc: empresaRuc,
      sede_nombre: sedeNombre,
      estado: isPending ? 'pendiente' : usuario.activo ? 'activo' : 'inactivo',
      invited_at: authUser?.invited_at || null,
    },
  }
}

// 2. Reenviar correo de invitación oficial
export async function reenviarInvitacionAction(email: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  const adminClient = createAdminClient()

  const { headers } = await import('next/headers')
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000')

  const { error } = await adminClient.auth.admin.inviteUserByEmail(cleanEmail, {
    redirectTo: `${siteUrl}/completar-invitacion`,
  })

  if (error) {
    return { success: false, error: 'Error al reenviar invitación: ' + error.message }
  }

  return { success: true, message: 'Invitación reenviada con éxito a ' + cleanEmail }
}

// 3. Obtener enlace directo de invitación (para que el admin pueda copiarlo y enviarlo)
export async function obtenerEnlaceInvitacionAction(email: string): Promise<{ success: boolean; link?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase()
  const adminClient = createAdminClient()

  const { headers } = await import('next/headers')
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000')

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email: cleanEmail,
    options: {
      redirectTo: `${siteUrl}/completar-invitacion`,
    },
  })

  if (error || !data?.properties?.action_link) {
    return { success: false, error: error?.message || 'No se pudo generar el enlace de invitación.' }
  }

  return { success: true, link: data.properties.action_link }
}
