-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 03_rls.sql: Seguridad a nivel de fila (Row Level Security), aislamiento por negocio y RBAC
-- ==============================================================================

-- 1. FUNCIONES AUXILIARES DE CONTEXTO DE USUARIO (Optimizadas y seguras)
CREATE OR REPLACE FUNCTION public.mi_negocio_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT negocio_id FROM public.usuarios
    WHERE id = auth.uid() AND activo = true
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS public.rol_usuario
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol FROM public.usuarios
    WHERE id = auth.uid() AND activo = true
    LIMIT 1;
$$;

-- 2. ELIMINAR POLÍTICAS ABIERTAS DE PRUEBA PREVIAS
DROP POLICY IF EXISTS "productos_todo" ON public.productos;
DROP POLICY IF EXISTS "Permitir todo a productos" ON public.productos;
DROP POLICY IF EXISTS "Enable all access for all users" ON public.productos;
DROP POLICY IF EXISTS "Public read access" ON public.productos;

-- 3. ACTIVAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
ALTER TABLE public.negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidad_medida ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimiento_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_movimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalle_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. POLÍTICAS: negocio
-- ==============================================================================
DROP POLICY IF EXISTS "negocio_select" ON public.negocio;
CREATE POLICY "negocio_select" ON public.negocio
    FOR SELECT TO authenticated
    USING (id = public.mi_negocio_id());

DROP POLICY IF EXISTS "negocio_update_admin" ON public.negocio;
CREATE POLICY "negocio_update_admin" ON public.negocio
    FOR UPDATE TO authenticated
    USING (id = public.mi_negocio_id() AND public.mi_rol() = 'admin')
    WITH CHECK (id = public.mi_negocio_id() AND public.mi_rol() = 'admin');

-- ==============================================================================
-- 5. POLÍTICAS: usuarios
-- ==============================================================================
DROP POLICY IF EXISTS "usuarios_select_mismo_negocio" ON public.usuarios;
CREATE POLICY "usuarios_select_mismo_negocio" ON public.usuarios
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id() OR id = auth.uid());

DROP POLICY IF EXISTS "usuarios_admin_all" ON public.usuarios;
CREATE POLICY "usuarios_admin_all" ON public.usuarios
    FOR ALL TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin')
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin');

-- ==============================================================================
-- 6. POLÍTICAS: categoria, unidad_medida, almacen
-- ==============================================================================
-- categoria
DROP POLICY IF EXISTS "categoria_select" ON public.categoria;
CREATE POLICY "categoria_select" ON public.categoria
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "categoria_write_admin_almacenero" ON public.categoria;
CREATE POLICY "categoria_write_admin_almacenero" ON public.categoria
    FOR ALL TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'))
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

-- unidad_medida
DROP POLICY IF EXISTS "unidad_medida_select" ON public.unidad_medida;
CREATE POLICY "unidad_medida_select" ON public.unidad_medida
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "unidad_medida_write_admin_almacenero" ON public.unidad_medida;
CREATE POLICY "unidad_medida_write_admin_almacenero" ON public.unidad_medida
    FOR ALL TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'))
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

-- almacen
DROP POLICY IF EXISTS "almacen_select" ON public.almacen;
CREATE POLICY "almacen_select" ON public.almacen
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "almacen_write_admin" ON public.almacen;
CREATE POLICY "almacen_write_admin" ON public.almacen
    FOR ALL TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin')
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin');

-- ==============================================================================
-- 7. POLÍTICAS: productos
-- ==============================================================================
-- Todos los roles autenticados pueden consultar productos de su negocio
DROP POLICY IF EXISTS "productos_select_negocio" ON public.productos;
CREATE POLICY "productos_select_negocio" ON public.productos
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

-- Administrador y almacenero pueden crear, modificar y dar de baja productos
DROP POLICY IF EXISTS "productos_write_admin_almacenero" ON public.productos;
CREATE POLICY "productos_write_admin_almacenero" ON public.productos
    FOR INSERT TO authenticated
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

DROP POLICY IF EXISTS "productos_update_admin_almacenero" ON public.productos;
CREATE POLICY "productos_update_admin_almacenero" ON public.productos
    FOR UPDATE TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'))
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

DROP POLICY IF EXISTS "productos_delete_admin" ON public.productos;
CREATE POLICY "productos_delete_admin" ON public.productos
    FOR DELETE TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin');

-- ==============================================================================
-- 8. POLÍTICAS: inventario
-- ==============================================================================
DROP POLICY IF EXISTS "inventario_select" ON public.inventario;
CREATE POLICY "inventario_select" ON public.inventario
    FOR SELECT TO authenticated
    USING (
        almacen_id IN (
            SELECT id FROM public.almacen WHERE negocio_id = public.mi_negocio_id()
        )
    );

DROP POLICY IF EXISTS "inventario_write_admin_almacenero" ON public.inventario;
CREATE POLICY "inventario_write_admin_almacenero" ON public.inventario
    FOR ALL TO authenticated
    USING (
        public.mi_rol() IN ('admin', 'almacenero') AND
        almacen_id IN (SELECT id FROM public.almacen WHERE negocio_id = public.mi_negocio_id())
    )
    WITH CHECK (
        public.mi_rol() IN ('admin', 'almacenero') AND
        almacen_id IN (SELECT id FROM public.almacen WHERE negocio_id = public.mi_negocio_id())
    );

-- ==============================================================================
-- 9. POLÍTICAS: movimiento_inventario y detalle_movimiento
-- ==============================================================================
DROP POLICY IF EXISTS "movimiento_select" ON public.movimiento_inventario;
CREATE POLICY "movimiento_select" ON public.movimiento_inventario
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "movimiento_insert" ON public.movimiento_inventario;
CREATE POLICY "movimiento_insert" ON public.movimiento_inventario
    FOR INSERT TO authenticated
    WITH CHECK (
        negocio_id = public.mi_negocio_id() AND
        (public.mi_rol() IN ('admin', 'almacenero') OR (public.mi_rol() = 'vendedor' AND tipo = 'SALIDA'))
    );

DROP POLICY IF EXISTS "detalle_movimiento_select" ON public.detalle_movimiento;
CREATE POLICY "detalle_movimiento_select" ON public.detalle_movimiento
    FOR SELECT TO authenticated
    USING (
        movimiento_id IN (
            SELECT id FROM public.movimiento_inventario WHERE negocio_id = public.mi_negocio_id()
        )
    );

DROP POLICY IF EXISTS "detalle_movimiento_insert" ON public.detalle_movimiento;
CREATE POLICY "detalle_movimiento_insert" ON public.detalle_movimiento
    FOR INSERT TO authenticated
    WITH CHECK (
        movimiento_id IN (
            SELECT id FROM public.movimiento_inventario WHERE negocio_id = public.mi_negocio_id()
        )
    );

-- ==============================================================================
-- 10. POLÍTICAS: proveedor, compra, detalle_compra (Solo admin y almacenero)
-- ==============================================================================
-- proveedor
DROP POLICY IF EXISTS "proveedor_select" ON public.proveedor;
CREATE POLICY "proveedor_select" ON public.proveedor
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

DROP POLICY IF EXISTS "proveedor_write" ON public.proveedor;
CREATE POLICY "proveedor_write" ON public.proveedor
    FOR ALL TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'))
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

-- compra
DROP POLICY IF EXISTS "compra_select" ON public.compra;
CREATE POLICY "compra_select" ON public.compra
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

DROP POLICY IF EXISTS "compra_write" ON public.compra;
CREATE POLICY "compra_write" ON public.compra
    FOR ALL TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'))
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'almacenero'));

-- detalle_compra
DROP POLICY IF EXISTS "detalle_compra_select" ON public.detalle_compra;
CREATE POLICY "detalle_compra_select" ON public.detalle_compra
    FOR SELECT TO authenticated
    USING (
        compra_id IN (
            SELECT id FROM public.compra WHERE negocio_id = public.mi_negocio_id()
        ) AND public.mi_rol() IN ('admin', 'almacenero')
    );

DROP POLICY IF EXISTS "detalle_compra_write" ON public.detalle_compra;
CREATE POLICY "detalle_compra_write" ON public.detalle_compra
    FOR ALL TO authenticated
    USING (
        compra_id IN (
            SELECT id FROM public.compra WHERE negocio_id = public.mi_negocio_id()
        ) AND public.mi_rol() IN ('admin', 'almacenero')
    )
    WITH CHECK (
        compra_id IN (
            SELECT id FROM public.compra WHERE negocio_id = public.mi_negocio_id()
        ) AND public.mi_rol() IN ('admin', 'almacenero')
    );

-- ==============================================================================
-- 11. POLÍTICAS: cliente
-- ==============================================================================
DROP POLICY IF EXISTS "cliente_select" ON public.cliente;
CREATE POLICY "cliente_select" ON public.cliente
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "cliente_insert_update" ON public.cliente;
CREATE POLICY "cliente_insert_update" ON public.cliente
    FOR INSERT TO authenticated
    WITH CHECK (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "cliente_update" ON public.cliente;
CREATE POLICY "cliente_update" ON public.cliente
    FOR UPDATE TO authenticated
    USING (negocio_id = public.mi_negocio_id())
    WITH CHECK (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "cliente_delete_admin" ON public.cliente;
CREATE POLICY "cliente_delete_admin" ON public.cliente
    FOR DELETE TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin');

-- ==============================================================================
-- 12. POLÍTICAS: venta, detalle_venta, pago (Admin y Vendedor)
-- ==============================================================================
-- venta
DROP POLICY IF EXISTS "venta_select" ON public.venta;
CREATE POLICY "venta_select" ON public.venta
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "venta_insert" ON public.venta;
CREATE POLICY "venta_insert" ON public.venta
    FOR INSERT TO authenticated
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'vendedor'));

DROP POLICY IF EXISTS "venta_modify_admin" ON public.venta;
CREATE POLICY "venta_modify_admin" ON public.venta
    FOR UPDATE TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin')
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin');

-- detalle_venta
DROP POLICY IF EXISTS "detalle_venta_select" ON public.detalle_venta;
CREATE POLICY "detalle_venta_select" ON public.detalle_venta
    FOR SELECT TO authenticated
    USING (
        venta_id IN (
            SELECT id FROM public.venta WHERE negocio_id = public.mi_negocio_id()
        )
    );

DROP POLICY IF EXISTS "detalle_venta_insert" ON public.detalle_venta;
CREATE POLICY "detalle_venta_insert" ON public.detalle_venta
    FOR INSERT TO authenticated
    WITH CHECK (
        venta_id IN (
            SELECT id FROM public.venta WHERE negocio_id = public.mi_negocio_id()
        ) AND public.mi_rol() IN ('admin', 'vendedor')
    );

-- pago
DROP POLICY IF EXISTS "pago_select" ON public.pago;
CREATE POLICY "pago_select" ON public.pago
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "pago_insert" ON public.pago;
CREATE POLICY "pago_insert" ON public.pago
    FOR INSERT TO authenticated
    WITH CHECK (negocio_id = public.mi_negocio_id() AND public.mi_rol() IN ('admin', 'vendedor'));

-- ==============================================================================
-- 13. POLÍTICAS: auditoria (Solo lectura para Admin, inmutable)
-- ==============================================================================
DROP POLICY IF EXISTS "auditoria_select_admin" ON public.auditoria;
CREATE POLICY "auditoria_select_admin" ON public.auditoria
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id() AND public.mi_rol() = 'admin');
