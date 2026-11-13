'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'
import { invalidateFastCache } from '../../lib/cache/fast-cache'
import { z } from 'zod'

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres.')
      .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
      .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula.')
      .regex(/[0-9]/, 'Debe incluir al menos un número.'),
    confirmarPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmarPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmarPassword'],
  })

export type FormState = {
  success?: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

export type PerfilInvitado = {
  id: string
  nombre_completo: string
  email: string
  rol: string
  empresaNombre: string
  empresaRuc: string | null
  sedeNombre: string
  sedeCodigo: string | null
}

export async function obtenerDatosInvitacionAction(): Promise<{
  success: boolean
  perfil?: PerfilInvitado
  error?: string
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No hay sesión de invitación activa.' }
  }

  const { data: perfil, error } = await supabase
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

  if (error || !perfil) {
    return { success: false, error: 'No se encontró la ficha del colaborador.' }
  }

  // @ts-expect-error Supabase nested
  const empresaNombre = perfil?.negocio?.nombre || 'Empresa Asociada'
  // @ts-expect-error Supabase nested
  const empresaRuc = perfil?.negocio?.ruc || null
  // @ts-expect-error Supabase nested
  const sedeNombre = perfil?.almacen?.nombre || 'Sede Central'
  // @ts-expect-error Supabase nested
  const sedeCodigo = perfil?.almacen?.codigo || null

  return {
    success: true,
    perfil: {
      id: perfil.id,
      nombre_completo: perfil.nombre_completo || user.email || 'Colaborador',
      email: perfil.email || user.email || '',
      rol: perfil.rol,
      empresaNombre,
      empresaRuc,
      sedeNombre,
      sedeCodigo,
    },
  }
}

export async function completarInvitacionAction(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  const rawData = {
    password: formData.get('password'),
    confirmarPassword: formData.get('confirmarPassword'),
  }

  const validated = passwordSchema.safeParse(rawData)
  if (!validated.success) {
    const fieldErrors: Record<string, string> = {}
    validated.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        fieldErrors[issue.path[0].toString()] = issue.message
      }
    })
    return {
      success: false,
      error: 'Por favor corrige los requisitos de tu contraseña.',
      fieldErrors,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: 'La sesión de invitación ha expirado o no es válida. Solicita una nueva invitación.',
    }
  }

  // 1. Actualizar contraseña del usuario en Supabase Auth
  const { error: updateErr } = await supabase.auth.updateUser({
    password: validated.data.password,
  })

  if (updateErr) {
    return {
      success: false,
      error: 'No se pudo establecer la contraseña: ' + updateErr.message,
    }
  }

  // 2. Activar usuario en la tabla public.usuarios
  await supabase
    .from('usuarios')
    .update({ activo: true })
    .eq('id', user.id)

  try {
    const adminClient = createAdminClient()
    await adminClient.auth.admin.updateUserById(user.id, {
      user_metadata: {
        password_set: true,
        invitacion_pendiente: false,
      },
    })
  } catch (err) {
    console.warn('[UPDATE USER METADATA WARNING]', err)
  }

  invalidateFastCache('usuarios')
  invalidateFastCache('usuarios-list')

  // 3. Consultar rol para redirigir
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single()

  const targetPath =
    perfil?.rol === 'vendedor'
      ? '/vendedor'
      : perfil?.rol === 'almacenero'
      ? '/almacenero'
      : '/admin'

  redirect(targetPath)
}
