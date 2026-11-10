'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'
import { loginSchema, registroSchema } from '../validations/auth'
import { invalidateFastCache } from '../cache/fast-cache'

export type AuthState = {
  success?: boolean
  error?: string
  fieldErrors?: Record<string, string>
  message?: string
  requiresEmailConfirmation?: boolean
}

// Acción de inicio de sesión con validación Zod y Supabase Auth
export async function iniciarSesionAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const rawData = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  console.log('[DEBUG AUTH] email:', rawData.email, 'password length:', String(rawData.password || '').length)

  const validated = loginSchema.safeParse(rawData)

  if (!validated.success) {
    const fieldErrors: Record<string, string> = {}
    validated.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        fieldErrors[issue.path[0].toString()] = issue.message
      }
    })
    return {
      success: false,
      error: 'Por favor corrige los errores en el formulario.',
      fieldErrors,
    }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  })

  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  console.log('[DEBUG COOKIES AFTER LOGIN]', cookieStore.getAll().map((c) => c.name))

  if (error) {
    return {
      success: false,
      error: 'Credenciales inválidas. Verifica tu correo y contraseña.',
    }
  }

  // Direccionar al usuario según su rol asignado y verificar si está activo
  const { data: userAuth } = await supabase.auth.getUser()
  let targetPath = '/admin'
  if (userAuth?.user?.id) {
    const { data: perfil } = await supabase
      .from('usuarios')
      .select('rol, activo')
      .eq('id', userAuth.user.id)
      .single()

    if (perfil && perfil.activo === false) {
      await supabase.auth.signOut()
      return {
        success: false,
        error: 'Tu cuenta ha sido desactivada por el administrador de tu empresa.',
      }
    }

    if (perfil?.rol === 'vendedor') targetPath = '/vendedor'
    else if (perfil?.rol === 'almacenero') targetPath = '/almacenero'
  }

  redirect(targetPath)
}

// Acción de registro de nuevo usuario colaborador o negocio
export async function registrarUsuarioAction(
  prevState: AuthState | null,
  formData: FormData
): Promise<AuthState> {
  const rawData = {
    nombre_completo: formData.get('nombre_completo'),
    nombre_negocio: formData.get('nombre_negocio'),
    ruc: formData.get('ruc') ? String(formData.get('ruc')).trim() : undefined,
    email: formData.get('email'),
    password: formData.get('password'),
    confirmarPassword: formData.get('confirmarPassword'),
  }

  const validated = registroSchema.safeParse(rawData)

  if (!validated.success) {
    const fieldErrors: Record<string, string> = {}
    validated.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        fieldErrors[issue.path[0].toString()] = issue.message
      }
    })
    return {
      success: false,
      error: 'Revisa los campos del formulario.',
      fieldErrors,
    }
  }

  const supabase = await createClient()

  // Los nuevos usuarios se registran con rol operativo inicial ('vendedor')
  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        nombre_completo: validated.data.nombre_completo,
        nombre_negocio: validated.data.nombre_negocio,
        ruc: validated.data.ruc || null,
        rol: 'vendedor',
      },
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already in use')) {
      return {
        success: false,
        error: 'Este correo electrónico ya está registrado. Intenta iniciar sesión.',
      }
    }
    return {
      success: false,
      error: 'No se pudo completar el registro: ' + error.message,
    }
  }

  // En Supabase, si el correo ya existe con confirmación activa, identities viene vacío
  if (data.user?.identities && data.user.identities.length === 0) {
    return {
      success: false,
      error: 'Este correo ya se encuentra registrado. Intenta iniciar sesión.',
    }
  }

  // Cada nuevo registro crea su propia Empresa/Tenant y su cuenta de Administrador
  if (data.user?.id) {
    try {
      const adminClient = createAdminClient()

      const { error: rpcErr } = await adminClient.rpc('registrar_negocio_y_admin', {
        p_nombre_negocio: validated.data.nombre_negocio,
        p_ruc: validated.data.ruc || null,
        p_nombre_completo: validated.data.nombre_completo,
        p_user_id: data.user.id,
      })

      if (rpcErr) {
        console.error('[REGISTRO RPC ERROR]', rpcErr)
        return {
          success: false,
          error: 'Error al registrar la empresa: ' + rpcErr.message,
        }
      }

      await adminClient.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
        user_metadata: {
          nombre_completo: validated.data.nombre_completo,
          rol: 'admin',
          nombre_negocio: validated.data.nombre_negocio,
        },
      })

      invalidateFastCache('usuarios')
    } catch (dbErr) {
      console.error('[REGISTRO SERVER EXCEPTION]', dbErr)
      return {
        success: false,
        error: 'Error interno en la configuración inicial de la empresa.',
      }
    }
  }

  // Cuenta aprovisionada y confirmada con credenciales listas para ingresar
  if (data.user && !data.session) {
    return {
      success: true,
      requiresEmailConfirmation: true,
      message:
        '¡Registro exitoso! Tu cuenta ha sido creada como colaborador inicial con rol básico (Ventas / Sin sede asignada). El Administrador General asignará tu sede física y perfil operativo.',
    }
  }

  redirect('/vendedor')
}

// Acción para cerrar la sesión del usuario
export async function cerrarSesionAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
