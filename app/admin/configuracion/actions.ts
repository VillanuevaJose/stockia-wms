'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

const configuracionSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  ruc: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^[0-9]{11}$/.test(val),
      'El RUC debe tener exactamente 11 dígitos numéricos'
    ),
  direccion: z.string().trim().max(200).optional(),
  telefono: z.string().trim().max(30).optional(),
  logo_url: z.string().trim().optional(),
})

export type ConfiguracionState = {
  success?: boolean
  error?: string
  fieldErrors?: Record<string, string>
}

export async function actualizarConfiguracionAction(
  prevState: ConfiguracionState | null,
  formData: FormData
): Promise<ConfiguracionState> {
  const rawData = {
    nombre: formData.get('nombre'),
    ruc: formData.get('ruc') ? String(formData.get('ruc')).trim() : undefined,
    direccion: formData.get('direccion') ? String(formData.get('direccion')).trim() : undefined,
    telefono: formData.get('telefono') ? String(formData.get('telefono')).trim() : undefined,
    logo_url: formData.get('logo_url') ? String(formData.get('logo_url')).trim() : undefined,
  }

  const validated = configuracionSchema.safeParse(rawData)
  if (!validated.success) {
    const fieldErrors: Record<string, string> = {}
    validated.error.issues.forEach((issue) => {
      if (issue.path[0]) {
        fieldErrors[issue.path[0].toString()] = issue.message
      }
    })
    return { success: false, error: 'Corrige los errores del formulario.', fieldErrors }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Sesión no iniciada.' }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario || usuario.rol !== 'admin') {
    return { success: false, error: 'Solo un Administrador puede modificar la configuración del negocio.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('negocio')
    .update({
      nombre: validated.data.nombre,
      ruc: validated.data.ruc || null,
      direccion: validated.data.direccion || null,
      telefono: validated.data.telefono || null,
      logo_url: validated.data.logo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', usuario.negocio_id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/configuracion')
  revalidatePath('/admin')
  return { success: true }
}
