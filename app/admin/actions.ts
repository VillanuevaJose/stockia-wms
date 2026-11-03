'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../../lib/supabase/server'
import { invalidateFastCache } from '../../lib/cache/fast-cache'
import { z } from 'zod'

const productoSchema = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  sku: z.string().trim().min(1, 'El código SKU es obligatorio'),
  codigo_barras: z.string().trim().optional().nullable(),
  descripcion: z.string().trim().optional().nullable(),
  categoria_id: z.string().optional().nullable(),
  unidad_medida_id: z.string().optional().nullable(),
  costo: z.coerce.number().min(0, 'El costo no puede ser negativo'),
  precio_venta: z.coerce.number().min(0, 'El precio de venta no puede ser negativo'),
  stock_minimo: z.coerce.number().min(0, 'El stock mínimo no puede ser negativo'),
  almacen_id: z.string().optional().nullable(),
  stock_inicial: z.coerce.number().min(0, 'El stock inicial no puede ser negativo').default(0),
})

export type FormState = {
  success?: boolean
  error?: string
  fieldErrors?: Record<string, string>
  message?: string
}

// 1. Acción para CREAR un producto y asegurar su stock inmediato en inventario y productos
export async function agregarProducto(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  const raw = {
    nombre: formData.get('nombre'),
    sku: formData.get('sku'),
    codigo_barras: formData.get('codigo_barras') || null,
    descripcion: formData.get('descripcion') || null,
    categoria_id: formData.get('categoria_id') || null,
    unidad_medida_id: formData.get('unidad_medida_id') || null,
    costo: formData.get('costo'),
    precio_venta: formData.get('precio_venta'),
    stock_minimo: formData.get('stock_minimo') || 0,
    almacen_id: formData.get('almacen_id') || null,
    stock_inicial: formData.get('stock_inicial') || 0,
  }

  const validated = productoSchema.safeParse(raw)

  if (!validated.success) {
    const fieldErrors: Record<string, string> = {}
    validated.error.issues.forEach((issue) => {
      if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message
    })
    return { success: false, error: 'Revisa los campos requeridos.', fieldErrors }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión expirada.' }

  // Obtener negocio del usuario
  const { data: usuarioPerfil } = await supabase
    .from('usuarios')
    .select('negocio_id, almacen_id')
    .eq('id', user.id)
    .single()

  let negocioId = usuarioPerfil?.negocio_id
  if (!negocioId) {
    const { data: primerNegocio } = await supabase
      .from('negocio')
      .select('id')
      .limit(1)
      .single()
    negocioId = primerNegocio?.id
  }

  // Resolver almacén destino si no viene en el form
  let almacenId = validated.data.almacen_id || usuarioPerfil?.almacen_id
  if (!almacenId && negocioId) {
    const { data: alm } = await supabase
      .from('almacen')
      .select('id')
      .eq('negocio_id', negocioId)
      .eq('es_principal', true)
      .limit(1)
      .single()
    almacenId = alm?.id
  }

  const stockInicial = validated.data.stock_inicial

  // 1. Insertar el producto con su stock directo en la tabla productos
  const { data: nuevoProducto, error: prodError } = await supabase
    .from('productos')
    .insert([
      {
        negocio_id: negocioId,
        nombre: validated.data.nombre,
        sku: validated.data.sku,
        codigo_barras: validated.data.codigo_barras,
        descripcion: validated.data.descripcion,
        categoria_id: validated.data.categoria_id || null,
        unidad_medida_id: validated.data.unidad_medida_id || null,
        costo: validated.data.costo,
        precio_venta: validated.data.precio_venta,
        precio_soles: validated.data.precio_venta,
        stock_minimo: validated.data.stock_minimo,
        stock: stockInicial,
        activo: true,
      },
    ])
    .select('id')
    .single()

  if (prodError) {
    if (prodError.message.includes('uq_productos_negocio_sku')) {
      return { success: false, error: 'El código SKU ya está registrado en este negocio.' }
    }
    return { success: false, error: 'Error al registrar producto: ' + prodError.message }
  }

  // 2. Si hay almacén, asegurar el registro directo en la tabla inventario físico
  if (almacenId && nuevoProducto?.id) {
    await supabase.from('inventario').upsert([
      {
        almacen_id: almacenId,
        producto_id: nuevoProducto.id,
        stock_actual: stockInicial,
      },
    ], { onConflict: 'almacen_id,producto_id' })
  }

  invalidateFastCache()
  revalidatePath('/admin')
  revalidatePath('/admin/productos')
  revalidatePath('/admin/inventario')
  return { success: true, message: 'Producto registrado correctamente.' }
}

// 2. Acción para EDITAR datos maestros de un producto
export async function editarProducto(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  const id = formData.get('id') as string
  if (!id) return { success: false, error: 'Identificador de producto no encontrado.' }

  const raw = {
    id,
    nombre: formData.get('nombre'),
    sku: formData.get('sku'),
    codigo_barras: formData.get('codigo_barras') || null,
    descripcion: formData.get('descripcion') || null,
    categoria_id: formData.get('categoria_id') || null,
    unidad_medida_id: formData.get('unidad_medida_id') || null,
    costo: formData.get('costo'),
    precio_venta: formData.get('precio_venta'),
    stock_minimo: formData.get('stock_minimo') || 0,
  }

  const validated = productoSchema.safeParse(raw)

  if (!validated.success) {
    const fieldErrors: Record<string, string> = {}
    validated.error.issues.forEach((issue) => {
      if (issue.path[0]) fieldErrors[issue.path[0].toString()] = issue.message
    })
    return { success: false, error: 'Revisa los campos.', fieldErrors }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('productos')
    .update({
      nombre: validated.data.nombre,
      sku: validated.data.sku,
      codigo_barras: validated.data.codigo_barras,
      descripcion: validated.data.descripcion,
      categoria_id: validated.data.categoria_id || null,
      unidad_medida_id: validated.data.unidad_medida_id || null,
      costo: validated.data.costo,
      precio_venta: validated.data.precio_venta,
      precio_soles: validated.data.precio_venta,
      stock_minimo: validated.data.stock_minimo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: 'No se pudo actualizar el producto: ' + error.message }
  }

  invalidateFastCache()
  revalidatePath('/admin')
  revalidatePath('/admin/productos')
  revalidatePath('/admin/inventario')
  return { success: true, message: 'Producto actualizado exitosamente.' }
}

// 3. Acción para DESACTIVAR un producto (Borrado lógico / Soft Delete)
export async function desactivarProducto(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const id = formData.get('id') as string

  if (!id) return

  const { error } = await supabase
    .from('productos')
    .update({ activo: false, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error al desactivar producto:', error.message)
    return
  }

  invalidateFastCache()
  revalidatePath('/admin')
  revalidatePath('/admin/productos')
  revalidatePath('/admin/inventario')
}

export async function eliminarProducto(formData: FormData): Promise<void> {
  return desactivarProducto(formData)
}

export interface ProductoImportItem {
  nombre: string
  precio_venta: number
  stock_inicial: number
  costo?: number
  codigo_barras?: string
  sku?: string
}

export async function importarProductosMasivoAction(
  items: ProductoImportItem[],
  almacenId?: string
): Promise<{ success: boolean; agregados: number; error?: string }> {
  if (!items || items.length === 0) {
    return { success: false, agregados: 0, error: 'No hay filas válidas para importar.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sesión no activa.', agregados: 0 }

  const { data: usuarioPerfil } = await supabase
    .from('usuarios')
    .select('negocio_id, almacen_id')
    .eq('id', user.id)
    .single()

  let negocioId = usuarioPerfil?.negocio_id
  if (!negocioId) {
    const { data: primerNegocio } = await supabase
      .from('negocio')
      .select('id')
      .limit(1)
      .single()
    negocioId = primerNegocio?.id
  }

  if (!negocioId) {
    return { success: false, error: 'No se encontró negocio activo.', agregados: 0 }
  }

  let targetAlmacenId = almacenId || usuarioPerfil?.almacen_id
  if (!targetAlmacenId) {
    const { data: alm } = await supabase
      .from('almacen')
      .select('id')
      .eq('negocio_id', negocioId)
      .eq('es_principal', true)
      .limit(1)
      .single()
    targetAlmacenId = alm?.id
  }

  let agregados = 0
  const timeSuffix = Date.now().toString().slice(-4)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const nombre = item.nombre.trim()
    const precio = Number(item.precio_venta) || 0
    const stock = Number(item.stock_inicial) || 0
    const costo = Number(item.costo) || 0
    const codigoBarras = item.codigo_barras?.trim() || null
    const sku = item.sku?.trim() || `SKU-${timeSuffix}-${i + 1}`

    if (!nombre || precio <= 0) continue

    const { data: nuevo, error: errInsert } = await supabase
      .from('productos')
      .insert([
        {
          negocio_id: negocioId,
          nombre,
          sku,
          codigo_barras: codigoBarras,
          costo,
          precio_venta: precio,
          precio_soles: precio,
          stock,
          stock_minimo: 3,
          activo: true,
        },
      ])
      .select('id')
      .single()

    if (errInsert || !nuevo?.id) continue

    agregados++

    if (targetAlmacenId) {
      await supabase.from('inventario').upsert([
        {
          almacen_id: targetAlmacenId,
          producto_id: nuevo.id,
          stock_actual: stock,
        },
      ], { onConflict: 'almacen_id,producto_id' })
    }
  }

  invalidateFastCache()
  revalidatePath('/admin')
  revalidatePath('/admin/productos')
  revalidatePath('/admin/inventario')

  return {
    success: agregados > 0,
    agregados,
    error:
      agregados === 0
        ? 'No se pudo guardar ninguna fila (revisa que los SKU no estén duplicados).'
        : undefined,
  }
}