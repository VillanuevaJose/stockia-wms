'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'
import { invalidateFastCache } from '../../../lib/cache/fast-cache'

const crearUsuarioSchema = z.object({
  nombre_completo: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede exceder 80 caracteres'),
  email: z
    .string()
    .trim()
    .min(1, 'El correo institucional es requerido')
    .email('Ingresa un correo institucional válido'),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.trim().length === 0 || val.length >= 6, {
      message: 'La contraseña debe tener al menos 6 caracteres',
    }),
  rol: z.enum(['admin', 'almacenero', 'vendedor'], {
    message: 'El rol debe ser admin, almacenero o vendedor',
  }),
  almacen_id: z.string().uuid().nullable().optional(),
})

export type CrearUsuarioState = {
  success?: boolean
  error?: string
  fieldErrors?: Record<string, string>
  invited?: boolean
}

export async function crearUsuarioAction(
  prevState: CrearUsuarioState | null,
  formData: FormData
): Promise<CrearUsuarioState> {
  const rawAlmacenId = formData.get('almacen_id')
  const rawPassword = formData.get('password') ? String(formData.get('password')).trim() : ''

  const rawData = {
    nombre_completo: formData.get('nombre_completo'),
    email: formData.get('email'),
    password: rawPassword || undefined,
    rol: formData.get('rol'),
    almacen_id: rawAlmacenId && rawAlmacenId !== 'none' ? String(rawAlmacenId) : null,
  }

  const validated = crearUsuarioSchema.safeParse(rawData)
  if (!validated.success) {
    const fieldErrors: Record<string, string> = {}
    validated.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        fieldErrors[issue.path[0].toString()] = issue.message
      }
    })
    return { success: false, error: 'Corrige los errores del formulario.', fieldErrors }
  }

  // 1. Verificar caller con cliente de sesión
  const supabase = await createClient()
  const {
    data: { user: callerAuth },
  } = await supabase.auth.getUser()

  if (!callerAuth) {
    return { success: false, error: 'Sesión no iniciada o inválida.' }
  }

  // Obtener negocio_id y verificar rol admin
  const { data: callerUser, error: callerErr } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', callerAuth.id)
    .single()

  if (callerErr || !callerUser || callerUser.rol !== 'admin') {
    return { success: false, error: 'Acción no autorizada. Solo un Administrador puede crear usuarios.' }
  }

  const adminClient = createAdminClient()
  let newUserId = ''
  const isInvite = !rawPassword

  if (isInvite) {
    // Modo Invitación por Correo Oficial (Supabase Auth)
    const { data: inviteAuth, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
      validated.data.email,
      {
        data: {
          nombre_completo: validated.data.nombre_completo,
          rol: validated.data.rol,
          almacen_id: validated.data.almacen_id || null,
          negocio_id: callerUser.negocio_id,
        },
      }
    )

    if (inviteErr || !inviteAuth.user) {
      return {
        success: false,
        error: inviteErr?.message || 'No se pudo enviar la invitación por correo.',
      }
    }
    newUserId = inviteAuth.user.id
  } else {
    // Modo Provisión Manual Directa con Contraseña
    const { data: newUserAuth, error: createAuthErr } = await adminClient.auth.admin.createUser({
      email: validated.data.email,
      password: rawPassword,
      email_confirm: true,
      user_metadata: {
        nombre_completo: validated.data.nombre_completo,
        rol: validated.data.rol,
        almacen_id: validated.data.almacen_id || null,
        negocio_id: callerUser.negocio_id,
      },
    })

    if (createAuthErr || !newUserAuth.user) {
      return {
        success: false,
        error: createAuthErr?.message || 'No se pudo crear el usuario en el sistema de autenticación.',
      }
    }
    newUserId = newUserAuth.user.id
  }

  // 3. Insertar o actualizar registro en public.usuarios con el negocio_id del admin
  const userData: Record<string, unknown> = {
    id: newUserId,
    negocio_id: callerUser.negocio_id,
    email: validated.data.email,
    nombre_completo: validated.data.nombre_completo,
    rol: validated.data.rol,
    activo: true,
  }

  if (validated.data.almacen_id) {
    userData.almacen_id = validated.data.almacen_id
  }

  let { error: insertErr } = await adminClient.from('usuarios').upsert(userData)

  if (insertErr && insertErr.message.includes('almacen_id')) {
    delete userData.almacen_id
    const fallbackRes = await adminClient.from('usuarios').upsert(userData)
    insertErr = fallbackRes.error
  }

  if (insertErr) {
    await adminClient.auth.admin.deleteUser(newUserId)
    return {
      success: false,
      error: 'Error al registrar el perfil del colaborador: ' + insertErr.message,
    }
  }

  invalidateFastCache('usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true, invited: isInvite }
}

export async function toggleUsuarioActivoAction(usuarioId: string, nuevoEstado: boolean) {
  const supabase = await createClient()
  const {
    data: { user: callerAuth },
  } = await supabase.auth.getUser()

  if (!callerAuth) {
    return { success: false, error: 'No autenticado.' }
  }

  // Verificar admin
  const { data: callerUser } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', callerAuth.id)
    .single()

  if (!callerUser || callerUser.rol !== 'admin') {
    return { success: false, error: 'Acceso denegado.' }
  }

  // Prevenir que el admin se inactive a sí mismo
  if (callerAuth.id === usuarioId) {
    return { success: false, error: 'No puedes desactivar tu propio usuario administrador.' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('usuarios')
    .update({ activo: nuevoEstado, updated_at: new Date().toISOString() })
    .eq('id', usuarioId)
    .eq('negocio_id', callerUser.negocio_id)

  if (error) {
    return { success: false, error: error.message }
  }

  // Revocar o restaurar acceso en Supabase Auth de forma inmediata
  try {
    await adminClient.auth.admin.updateUserById(usuarioId, {
      ban_duration: nuevoEstado ? 'none' : '876000h',
    })
  } catch (banErr) {
    console.warn('[AUTH BAN SYNC NOTICE]', banErr)
  }

  invalidateFastCache('usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function actualizarRolYSedeUsuarioAction(
  usuarioId: string,
  nuevoRol: 'admin' | 'almacenero' | 'vendedor',
  nuevoAlmacenId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user: callerAuth },
  } = await supabase.auth.getUser()

  if (!callerAuth) {
    return { success: false, error: 'No autenticado.' }
  }

  // Verificar que quien realiza el cambio sea administrador
  const { data: callerUser } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', callerAuth.id)
    .single()

  if (!callerUser || callerUser.rol !== 'admin') {
    return { success: false, error: 'Acceso denegado. Solo un administrador puede modificar roles y sedes.' }
  }

  // Prevenir que el admin pierda su rol por accidente
  if (callerAuth.id === usuarioId && nuevoRol !== 'admin') {
    return { success: false, error: 'No puedes revocar tu propio rol de administrador.' }
  }

  const adminClient = createAdminClient()

  const updateData: Record<string, unknown> = {
    rol: nuevoRol,
    almacen_id: nuevoAlmacenId || null,
    updated_at: new Date().toISOString(),
  }

  let { error: updateErr } = await adminClient
    .from('usuarios')
    .update(updateData)
    .eq('id', usuarioId)
    .eq('negocio_id', callerUser.negocio_id)

  if (updateErr && updateErr.message.includes('almacen_id')) {
    // Si la migración de columna aún no se ejecutó en SQL Editor, actualizar solo el rol
    const fallbackRes = await adminClient
      .from('usuarios')
      .update({ rol: nuevoRol, updated_at: new Date().toISOString() })
      .eq('id', usuarioId)
      .eq('negocio_id', callerUser.negocio_id)
    updateErr = fallbackRes.error
  }

  if (updateErr) {
    return { success: false, error: updateErr.message }
  }

  // Sincronizar user_metadata en auth.users
  await adminClient.auth.admin.updateUserById(usuarioId, {
    user_metadata: {
      rol: nuevoRol,
      almacen_id: nuevoAlmacenId || null,
    },
  })

  invalidateFastCache('usuarios')
  revalidatePath('/admin/usuarios')
  return { success: true }
}
