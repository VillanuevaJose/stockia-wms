'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../../../lib/supabase/server'
import { createAdminClient } from '../../../lib/supabase/admin'

const proveedorSchema = z.object({
  razon_social: z.string().trim().min(2, 'La razón social debe tener al menos 2 caracteres'),
  ruc: z
    .string()
    .trim()
    .refine((val) => val === '' || /^\d{11}$/.test(val), {
      message: 'El RUC debe tener exactamente 11 dígitos numéricos',
    })
    .optional()
    .nullable(),
  contacto_nombre: z.string().trim().optional().nullable(),
  telefono: z.string().trim().optional().nullable(),
  email: z
    .string()
    .trim()
    .refine((val) => val === '' || z.string().email().safeParse(val).success, {
      message: 'Ingresa un correo electrónico válido',
    })
    .optional()
    .nullable(),
  direccion: z.string().trim().optional().nullable(),
})

export type ProveedorResult = {
  success: boolean
  error?: string
  proveedor_id?: string
}

export async function crearProveedorAction(
  data: z.infer<typeof proveedorSchema>
): Promise<ProveedorResult> {
  const validated = proveedorSchema.safeParse(data)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Datos del proveedor inválidos.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida o expirada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return { success: false, error: 'Usuario no asignado a ningún negocio.' }
  }

  const adminClient = createAdminClient()
  const rucVal = validated.data.ruc?.trim() || null

  if (rucVal) {
    const { data: existing } = await adminClient
      .from('proveedor')
      .select('id')
      .eq('negocio_id', usuario.negocio_id)
      .eq('ruc', rucVal)
      .maybeSingle()

    if (existing) {
      return { success: false, error: `Ya existe un proveedor registrado con el RUC ${rucVal}.` }
    }
  }

  const { data: row, error } = await adminClient
    .from('proveedor')
    .insert({
      negocio_id: usuario.negocio_id,
      razon_social: validated.data.razon_social.trim(),
      ruc: rucVal,
      contacto_nombre: validated.data.contacto_nombre?.trim() || null,
      telefono: validated.data.telefono?.trim() || null,
      email: validated.data.email?.trim() || null,
      direccion: validated.data.direccion?.trim() || null,
      activo: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[CREAR PROVEEDOR ERROR]', error.message)
    return { success: false, error: 'Error al registrar el proveedor: ' + error.message }
  }

  revalidatePath('/admin/proveedores')
  revalidatePath('/admin/compras')
  return { success: true, proveedor_id: row.id }
}

export async function editarProveedorAction(
  id: string,
  data: z.infer<typeof proveedorSchema>
): Promise<ProveedorResult> {
  const validated = proveedorSchema.safeParse(data)
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message || 'Datos del proveedor inválidos.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida o expirada.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return { success: false, error: 'Usuario no asignado a ningún negocio.' }
  }

  const adminClient = createAdminClient()
  const rucVal = validated.data.ruc?.trim() || null

  if (rucVal) {
    const { data: existing } = await adminClient
      .from('proveedor')
      .select('id')
      .eq('negocio_id', usuario.negocio_id)
      .eq('ruc', rucVal)
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return { success: false, error: `Ya existe otro proveedor registrado con el RUC ${rucVal}.` }
    }
  }

  const { error } = await adminClient
    .from('proveedor')
    .update({
      razon_social: validated.data.razon_social.trim(),
      ruc: rucVal,
      contacto_nombre: validated.data.contacto_nombre?.trim() || null,
      telefono: validated.data.telefono?.trim() || null,
      email: validated.data.email?.trim() || null,
      direccion: validated.data.direccion?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('negocio_id', usuario.negocio_id)

  if (error) {
    console.error('[EDITAR PROVEEDOR ERROR]', error.message)
    return { success: false, error: 'Error al actualizar el proveedor: ' + error.message }
  }

  revalidatePath('/admin/proveedores')
  revalidatePath('/admin/compras')
  return { success: true, proveedor_id: id }
}

export async function toggleProveedorActivoAction(
  id: string,
  activo: boolean
): Promise<ProveedorResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id) {
    return { success: false, error: 'No autorizado.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('proveedor')
    .update({
      activo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('negocio_id', usuario.negocio_id)

  if (error) {
    return { success: false, error: 'Error al cambiar estado: ' + error.message }
  }

  revalidatePath('/admin/proveedores')
  revalidatePath('/admin/compras')
  return { success: true }
}
