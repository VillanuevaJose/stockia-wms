import { createClient } from '../supabase/server'
import { withFastCache } from '../cache/fast-cache'

// ==========================================
// 1. INVENTARIO FÍSICO POR ALMACÉN
// ==========================================
export interface InventarioFisicoRow {
  id: string
  producto_id: string
  sku: string
  producto_nombre: string
  categoria: string
  almacen_nombre: string
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  valor_total: number
  estado: 'OPTIMO' | 'BAJO' | 'CRITICO'
}

export async function getInventarioFisico(): Promise<{
  inventario: InventarioFisicoRow[]
  totales: { totalArticulos: number; valorTotalSoles: number; articulosEnAlerta: number }
}> {
  return withFastCache('inventario-fisico', 20, async () => {
    const supabase = await createClient()

    const { data: invData, error } = await supabase
    .from('inventario')
    .select(`
      id,
      producto_id,
      stock_actual,
      almacen:almacen_id (nombre),
      producto:producto_id (id, sku, nombre, costo, precio_soles, stock_minimo, categoria:categoria_id (nombre))
    `)

  if (error || !invData || invData.length === 0) {
    // Si la tabla inventario aún no tiene filas, consultamos productos
    const { data: prods } = await supabase
      .from('productos')
      .select('id, sku, nombre, costo, precio_soles, stock, stock_minimo, categoria:categoria_id (nombre)')
      .eq('activo', true)

    const prodsAsInventario: InventarioFisicoRow[] = ((prods || []) as unknown as Array<{
      id: string
      sku?: string
      nombre: string
      costo?: number
      precio_soles?: number
      stock?: number
      stock_minimo?: number
      categoria?: { nombre?: string } | { nombre?: string }[]
    }>).map((p, idx: number) => {
      const stock = Number(p.stock) || 0
      const stockMin = Number(p.stock_minimo) || 0
      const costo = Number(p.costo) > 0 ? Number(p.costo) : Number(p.precio_soles) || 0
      const estado: InventarioFisicoRow['estado'] =
        stock <= 0 ? 'CRITICO' : stock <= stockMin ? 'BAJO' : 'OPTIMO'

      return {
        id: `inv-${p.id || idx}`,
        producto_id: p.id,
        sku: p.sku || '',
        producto_nombre: p.nombre,
        categoria: Array.isArray(p.categoria) ? p.categoria[0]?.nombre || 'General' : p.categoria?.nombre || 'General',
        almacen_nombre: 'Almacén Principal',
        stock_actual: stock,
        stock_minimo: stockMin,
        costo_unitario: costo,
        valor_total: Math.round(stock * costo * 100) / 100,
        estado,
      }
    })

    const valorTotal = prodsAsInventario.reduce((acc, cur) => acc + cur.valor_total, 0)
    const enAlerta = prodsAsInventario.filter((i) => i.estado !== 'OPTIMO').length

    return {
      inventario: prodsAsInventario,
      totales: {
        totalArticulos: prodsAsInventario.reduce((acc, cur) => acc + cur.stock_actual, 0),
        valorTotalSoles: Math.round(valorTotal * 100) / 100,
        articulosEnAlerta: enAlerta,
      },
    }
  }

  interface RawInventarioQueryRow {
    id: string
    producto_id: string
    stock_actual?: number
    producto?: {
      sku?: string
      nombre?: string
      stock_minimo?: number
      costo?: number
      categoria?: { nombre?: string } | { nombre?: string }[]
    } | {
      sku?: string
      nombre?: string
      stock_minimo?: number
      costo?: number
      categoria?: { nombre?: string } | { nombre?: string }[]
    }[]
    almacen?: { nombre?: string } | { nombre?: string }[]
  }

  const items: InventarioFisicoRow[] = (invData as unknown as RawInventarioQueryRow[]).map((row) => {
    const prod = Array.isArray(row.producto) ? row.producto[0] || {} : row.producto || {}
    const alm = Array.isArray(row.almacen) ? row.almacen[0] || {} : row.almacen || {}
    const cat = Array.isArray(prod.categoria) ? prod.categoria[0]?.nombre || 'General' : prod.categoria?.nombre || 'General'

    const stock = Number(row.stock_actual) || 0
    const stockMin = Number(prod.stock_minimo) || 5
    const costo = Number(prod.costo) || 10
    const estado: InventarioFisicoRow['estado'] =
      stock <= 0 ? 'CRITICO' : stock <= stockMin ? 'BAJO' : 'OPTIMO'

    return {
      id: row.id,
      producto_id: row.producto_id,
      sku: prod.sku || 'S/N',
      producto_nombre: prod.nombre || 'Producto',
      categoria: cat,
      almacen_nombre: alm.nombre || 'Almacén Central',
      stock_actual: stock,
      stock_minimo: stockMin,
      costo_unitario: costo,
      valor_total: Math.round(stock * costo * 100) / 100,
      estado,
    }
  })

    return {
      inventario: items,
      totales: {
        totalArticulos: items.reduce((acc, cur) => acc + cur.stock_actual, 0),
        valorTotalSoles: Math.round(items.reduce((acc, cur) => acc + cur.valor_total, 0) * 100) / 100,
        articulosEnAlerta: items.filter((i) => i.estado !== 'OPTIMO').length,
      },
    }
  })
}

// ==========================================
// 2. CATEGORÍAS
// ==========================================
export interface CategoriaDetailRow {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  productos_count: number
}

export async function getCategoriasList(): Promise<CategoriaDetailRow[]> {
  return withFastCache('categorias-list', 30, async () => {
    const supabase = await createClient()

    const { data: categorias } = await supabase
      .from('categoria')
      .select('id, nombre, descripcion, activo, productos:productos (id)')
      .order('nombre')

    if (!categorias || categorias.length === 0) {
      return []
    }

    interface RawCatDb {
      id: string
      nombre: string
      descripcion: string | null
      activo: boolean
      productos?: { id: string }[]
    }

    return (categorias as unknown as RawCatDb[]).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      descripcion: c.descripcion,
      activo: c.activo,
      productos_count: Array.isArray(c.productos) ? c.productos.length : 0,
    }))
  })
}

// ==========================================
// 3. VENTAS Y DESPACHOS
// ==========================================
export interface VentaRow {
  id: string
  numero_comprobante: string
  cliente_nombre: string
  vendedor_nombre: string
  total: number
  estado: 'PENDIENTE' | 'PAGADA' | 'ANULADA'
  fecha: string
}

export async function getVentasList(): Promise<VentaRow[]> {
  return withFastCache('ventas-list', 20, async () => {
    const supabase = await createClient()

    const { data: ventas } = await supabase
      .from('venta')
      .select(`
        id,
        numero_comprobante,
        total,
        estado,
        created_at,
        cliente:cliente_id (nombre),
        usuario:usuario_id (nombre_completo)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!ventas || ventas.length === 0) {
      return []
    }

    interface RawVentaDb {
      id: string
      numero_comprobante: string
      total: number
      estado: string
      created_at: string
      cliente?: { nombre?: string } | { nombre?: string }[]
      usuario?: { nombre_completo?: string } | { nombre_completo?: string }[]
    }

    return (ventas as unknown as RawVentaDb[]).map((v) => ({
      id: v.id,
      numero_comprobante: v.numero_comprobante,
      cliente_nombre: Array.isArray(v.cliente) ? v.cliente[0]?.nombre || 'Cliente General' : v.cliente?.nombre || 'Cliente General',
      vendedor_nombre: Array.isArray(v.usuario) ? v.usuario[0]?.nombre_completo || 'Vendedor' : v.usuario?.nombre_completo || 'Vendedor',
      total: Number(v.total) || 0,
      estado: v.estado as VentaRow['estado'],
      fecha: v.created_at,
    }))
  })
}

// ==========================================
// 4. COMPRAS Y PROVEEDORES
// ==========================================
export interface CompraRow {
  id: string
  numero_factura: string
  proveedor_nombre: string
  solicitante_nombre: string
  total: number
  estado: 'PENDIENTE' | 'RECIBIDA' | 'CANCELADA'
  fecha: string
}

export async function getComprasList(): Promise<CompraRow[]> {
  return withFastCache('compras-list', 20, async () => {
    const supabase = await createClient()

    const { data: compras } = await supabase
      .from('compra')
      .select(`
        id,
        numero_factura,
        total,
        estado,
        created_at,
        proveedor:proveedor_id (nombre),
        usuario:usuario_id (nombre_completo)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!compras || compras.length === 0) {
      return []
    }

    interface RawCompraDb {
      id: string
      numero_factura: string
      total: number
      estado: string
      created_at: string
      proveedor?: { nombre?: string } | { nombre?: string }[]
      usuario?: { nombre_completo?: string } | { nombre_completo?: string }[]
    }

    return (compras as unknown as RawCompraDb[]).map((c) => ({
      id: c.id,
      numero_factura: c.numero_factura,
      proveedor_nombre: Array.isArray(c.proveedor) ? c.proveedor[0]?.nombre || 'Proveedor Oficial' : c.proveedor?.nombre || 'Proveedor Oficial',
      solicitante_nombre: Array.isArray(c.usuario) ? c.usuario[0]?.nombre_completo || 'Encargado' : c.usuario?.nombre_completo || 'Encargado',
      total: Number(c.total) || 0,
      estado: c.estado as CompraRow['estado'],
      fecha: c.created_at,
    }))
  })
}

// ==========================================
// 5. ALMACENES Y SEDES
// ==========================================
export interface AlmacenDetailRow {
  id: string
  nombre: string
  codigo: string | null
  direccion: string | null
  es_principal: boolean
  activo: boolean
}

export async function getAlmacenesList(): Promise<AlmacenDetailRow[]> {
  return withFastCache('almacenes-list', 30, async () => {
    const supabase = await createClient()

    const { data: almacenes } = await supabase
      .from('almacen')
      .select('id, nombre, codigo, direccion, es_principal, activo')
      .order('es_principal', { ascending: false })

    if (!almacenes || almacenes.length === 0) {
      return []
    }

    return almacenes
  })
}

// ==========================================
// 6. USUARIOS Y ROLES
// ==========================================
export interface UsuarioRow {
  id: string
  nombre_completo: string
  email: string
  rol: 'admin' | 'almacenero' | 'vendedor'
  activo: boolean
  created_at: string
  almacen_id?: string | null
  almacen?: {
    id: string
    nombre: string
    codigo: string | null
  } | null
}

export async function getUsuariosList(): Promise<UsuarioRow[]> {
  return withFastCache('usuarios-list', 15, async () => {
    const supabase = await createClient()

    try {
      const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('id, nombre_completo, email, rol, activo, created_at, almacen_id, almacen:almacen_id(id, nombre, codigo)')
        .order('created_at', { ascending: false })

      if (!error && usuarios) {
        return (usuarios as unknown as Array<{
          id: string
          nombre_completo: string
          email: string
          rol: 'admin' | 'almacenero' | 'vendedor'
          activo: boolean
          created_at: string
          almacen_id?: string | null
          almacen?: { id: string; nombre: string; codigo: string | null } | { id: string; nombre: string; codigo: string | null }[] | null
        }>).map((u) => ({
          ...u,
          almacen: Array.isArray(u.almacen) ? u.almacen[0] || null : u.almacen || null,
        })) as UsuarioRow[]
      }
    } catch {
      // Fallback si la migración de columna aún no se ejecutó
    }

    const { data: fallbackUsuarios } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, email, rol, activo, created_at')
      .order('created_at', { ascending: false })

    return (fallbackUsuarios || []) as UsuarioRow[]
  })
}

// ==========================================
// 7. AUDITORÍA DEL SISTEMA
// ==========================================
export interface AuditoriaRow {
  id: string
  tabla: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  registro_id: string
  usuario_nombre: string
  created_at: string
}

export async function getAuditoriaList(): Promise<AuditoriaRow[]> {
  return withFastCache('auditoria-list', 20, async () => {
    const supabase = await createClient()

    const { data: auditoria } = await supabase
      .from('auditoria')
      .select(`
        id,
        tabla,
        accion,
        registro_id,
        created_at,
        usuario:usuario_id (nombre_completo)
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!auditoria || auditoria.length === 0) {
      return []
    }

    interface RawAuditoriaDb {
      id: string
      tabla: string
      accion: string
      registro_id: string
      created_at: string
      usuario?: { nombre_completo?: string } | { nombre_completo?: string }[]
    }

    return (auditoria as unknown as RawAuditoriaDb[]).map((a) => ({
      id: a.id,
      tabla: a.tabla,
      accion: a.accion as AuditoriaRow['accion'],
      registro_id: a.registro_id,
      usuario_nombre: Array.isArray(a.usuario) ? a.usuario[0]?.nombre_completo || 'Sistema' : a.usuario?.nombre_completo || 'Sistema',
      created_at: a.created_at,
    }))
  })
}
