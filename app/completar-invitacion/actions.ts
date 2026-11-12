'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
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
