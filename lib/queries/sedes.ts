import { createClient } from '../supabase/server'
import { createAdminClient } from '../supabase/admin'

export interface SolicitudSedeRow {
  id: string
  negocio_id: string
  sede_origen: {
    id: string
    nombre: string
    codigo: string | null
  }
  sede_destino: {
    id: string
    nombre: string
    codigo: string | null
  }
  producto: {
    id: string
    nombre: string
    sku: string
  } | null
  cantidad: number
  mensaje: string
  respuesta: string | null
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'
  estado: 'PENDIENTE' | 'APROBADO' | 'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO'
  usuario_emisor?: {
    nombre_completo: string
    email: string
  } | null
  fecha_solicitud: string
  fecha_respuesta: string | null
}

interface DbSolicitudRow {
  id: string
  negocio_id: string
  cantidad: number
  mensaje: string
  respuesta: string | null
  prioridad: 'BAJA' | 'MEDIA' | 'ALTA' | 'URGENTE'
  estado: 'PENDIENTE' | 'APROBADO' | 'EN_TRANSITO' | 'RECIBIDO' | 'RECHAZADO'
  fecha_solicitud: string
  fecha_respuesta: string | null
  sede_origen?: { id: string; nombre: string; codigo: string | null } | null
  sede_destino?: { id: string; nombre: string; codigo: string | null } | null
  producto?: { id: string; nombre: string; sku: string } | null
  emisor?: { nombre_completo: string; email: string } | null
}

export async function getHistorialComunicacionSedes(): Promise<SolicitudSedeRow[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: perfil } = await supabase
      .from('usuarios')
      .select('negocio_id')
      .eq('id', user.id)
      .single()

    if (!perfil?.negocio_id) return []

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('solicitud_traslado')
      .select(`
        id,
        negocio_id,
        cantidad,
        mensaje,
        respuesta,
        prioridad,
        estado,
        fecha_solicitud,
        fecha_respuesta,
        sede_origen:almacen!solicitud_traslado_sede_origen_id_fkey(id, nombre, codigo),
        sede_destino:almacen!solicitud_traslado_sede_destino_id_fkey(id, nombre, codigo),
        producto:productos(id, nombre, sku),
        emisor:usuarios!solicitud_traslado_usuario_emisor_id_fkey(nombre_completo, email)
      `)
      .eq('negocio_id', perfil.negocio_id)
      .order('fecha_solicitud', { ascending: false })

    if (error) {
      // Si la tabla no ha sido corrida aún en Supabase SQL Editor
      console.warn('[COMUNICACION SEDES NOTICE]', error.message)
      return []
    }

    const rows = (data || []) as unknown as DbSolicitudRow[]
    return rows.map((row) => ({
      id: row.id,
      negocio_id: row.negocio_id,
      sede_origen: row.sede_origen || { id: '', nombre: 'Sede Emisora', codigo: null },
      sede_destino: row.sede_destino || { id: '', nombre: 'Sede Receptora', codigo: null },
      producto: row.producto ? { id: row.producto.id, nombre: row.producto.nombre, sku: row.producto.sku } : null,
      cantidad: Number(row.cantidad) || 1,
      mensaje: row.mensaje,
      respuesta: row.respuesta,
      prioridad: row.prioridad,
      estado: row.estado,
      usuario_emisor: row.emisor,
      fecha_solicitud: row.fecha_solicitud,
      fecha_respuesta: row.fecha_respuesta,
    }))
  } catch (err) {
    console.warn('[GET HISTORIAL SEDES EXCEPTION]', err)
    return []
  }
}
