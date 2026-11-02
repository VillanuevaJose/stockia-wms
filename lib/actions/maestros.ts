'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'

const categoriaSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().trim().optional(),
})

export async function crearCategoriaAction(prevState: unknown, formData: FormData) {
  const nombre = formData.get('nombre')
  const descripcion = formData.get('descripcion')

  const validated = categoriaSchema.safeParse({ nombre, descripcion })
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id || usuario.rol === 'vendedor') {
    return { success: false, error: 'Acceso denegado.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('categoria').insert({
    negocio_id: usuario.negocio_id,
    nombre: validated.data.nombre,
    descripcion: validated.data.descripcion || null,
    activo: true,
  })

  if (error) {
    if (error.message.includes('uq_categoria_negocio_nombre')) {
      return { success: false, error: 'Ya existe una categoría con ese nombre en tu negocio.' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/categorias')
  revalidatePath('/admin/productos')
  return { success: true }
}

const almacenSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  codigo: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
})

export async function crearAlmacenAction(prevState: unknown, formData: FormData) {
  const nombre = formData.get('nombre')
  const codigo = formData.get('codigo')
  const direccion = formData.get('direccion')

  const validated = almacenSchema.safeParse({ nombre, codigo, direccion })
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0]?.message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no válida.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('negocio_id, rol')
    .eq('id', user.id)
    .single()

  if (!usuario?.negocio_id || usuario.rol !== 'admin') {
    return { success: false, error: 'Solo administradores pueden crear sedes y almacenes.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('almacen').insert({
    negocio_id: usuario.negocio_id,
    nombre: validated.data.nombre,
    codigo: validated.data.codigo || null,
    direccion: validated.data.direccion || null,
    es_principal: false,
    activo: true,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/almacenes')
  revalidatePath('/admin/inventario')
  return { success: true }
}
