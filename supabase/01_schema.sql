-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 01_schema.sql: Esquema DDL idempotente, tablas, relaciones, restricciones e índices
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TIPOS ENUMERADOS IDEMPOTENTES
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
        CREATE TYPE public.rol_usuario AS ENUM ('admin', 'almacenero', 'vendedor');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_movimiento') THEN
        CREATE TYPE public.tipo_movimiento AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'TRANSFERENCIA');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_compra') THEN
        CREATE TYPE public.estado_compra AS ENUM ('PENDIENTE', 'RECIBIDA', 'CANCELADA');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_venta') THEN
        CREATE TYPE public.estado_venta AS ENUM ('PENDIENTE', 'PAGADA', 'ANULADA');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metodo_pago') THEN
        CREATE TYPE public.metodo_pago AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CULQI', 'OTRO');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_pago') THEN
        CREATE TYPE public.estado_pago AS ENUM ('PENDIENTE', 'COMPLETADO', 'FALLIDO', 'REEMBOLSADO');
    END IF;
END $$;

-- 3. FUNCIÓN DE UTILIDAD: ACTUALIZACIÓN AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION public.actualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TABLA: negocio (Empresa / Tenant principal)
CREATE TABLE IF NOT EXISTS public.negocio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    ruc TEXT UNIQUE,
    direccion TEXT,
    telefono TEXT,
    email TEXT,
    logo_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at en negocio
DROP TRIGGER IF EXISTS trg_negocio_updated_at ON public.negocio;
CREATE TRIGGER trg_negocio_updated_at
    BEFORE UPDATE ON public.negocio
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 5. TABLA: usuarios (Vinculada 1:1 con auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    negocio_id UUID REFERENCES public.negocio(id) ON DELETE RESTRICT,
    email TEXT NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol public.rol_usuario NOT NULL DEFAULT 'vendedor',
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 6. TABLA: categoria (Categorías de productos)
CREATE TABLE IF NOT EXISTS public.categoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_categoria_negocio_nombre UNIQUE (negocio_id, nombre)
);

DROP TRIGGER IF EXISTS trg_categoria_updated_at ON public.categoria;
CREATE TRIGGER trg_categoria_updated_at
    BEFORE UPDATE ON public.categoria
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 7. TABLA: unidad_medida (Unidades de embalaje y despacho)
CREATE TABLE IF NOT EXISTS public.unidad_medida (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL, -- ej. UND, KG, MTR, LT, CJ
    nombre TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_unidad_negocio_codigo UNIQUE (negocio_id, codigo)
);

DROP TRIGGER IF EXISTS trg_unidad_medida_updated_at ON public.unidad_medida;
CREATE TRIGGER trg_unidad_medida_updated_at
    BEFORE UPDATE ON public.unidad_medida
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 8. TABLA: almacen (Sedes o bodegas físicas)
CREATE TABLE IF NOT EXISTS public.almacen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    codigo TEXT, -- ej. ALM-01
    direccion TEXT,
    es_principal BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_almacen_negocio_nombre UNIQUE (negocio_id, nombre)
);

DROP TRIGGER IF EXISTS trg_almacen_updated_at ON public.almacen;
CREATE TRIGGER trg_almacen_updated_at
    BEFORE UPDATE ON public.almacen
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 9. TABLA: productos (Conserva columnas originales usadas por el código + nuevas de WMS)
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    precio_soles NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (precio_soles >= 0),
    stock NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock >= 0),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migración aditiva de columnas para extender la tabla productos existente
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS negocio_id UUID REFERENCES public.negocio(id) ON DELETE CASCADE;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categoria(id) ON DELETE SET NULL;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS unidad_medida_id UUID REFERENCES public.unidad_medida(id) ON DELETE RESTRICT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS codigo_barras TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS costo NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo >= 0);
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS precio_venta NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (precio_venta >= 0);
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0);
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS imagen_url TEXT;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Sincronizar precio_soles y precio_venta bidireccionalmente para no romper código previo
CREATE OR REPLACE FUNCTION public.sync_producto_precios()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el código actual inserta o edita precio_soles, actualizamos precio_venta
    IF NEW.precio_soles IS DISTINCT FROM OLD.precio_soles OR OLD.precio_venta IS NULL THEN
        NEW.precio_venta = NEW.precio_soles;
    ELSIF NEW.precio_venta IS DISTINCT FROM OLD.precio_venta THEN
        NEW.precio_soles = NEW.precio_venta;
    END IF;
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_producto_precios ON public.productos;
CREATE TRIGGER trg_sync_producto_precios
    BEFORE INSERT OR UPDATE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION public.sync_producto_precios();

-- Restricción única de SKU por negocio (si SKU está definido)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_productos_negocio_sku'
    ) THEN
        ALTER TABLE public.productos ADD CONSTRAINT uq_productos_negocio_sku UNIQUE (negocio_id, sku);
    END IF;
END $$;

-- 10. TABLA: inventario (Stock físico real por almacén y producto)
CREATE TABLE IF NOT EXISTS public.inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    almacen_id UUID NOT NULL REFERENCES public.almacen(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    stock_actual NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    ubicacion TEXT, -- Pasillo, estantería o casillero
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_inventario_almacen_producto UNIQUE (almacen_id, producto_id)
);

DROP TRIGGER IF EXISTS trg_inventario_updated_at ON public.inventario;
CREATE TRIGGER trg_inventario_updated_at
    BEFORE UPDATE ON public.inventario
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 11. TABLA: movimiento_inventario (Cabecera de kardex / movimientos)
CREATE TABLE IF NOT EXISTS public.movimiento_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE RESTRICT,
    tipo public.tipo_movimiento NOT NULL,
    motivo TEXT NOT NULL,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    almacen_origen_id UUID REFERENCES public.almacen(id) ON DELETE RESTRICT,
    almacen_destino_id UUID REFERENCES public.almacen(id) ON DELETE RESTRICT,
    referencia_tipo TEXT, -- ej: 'COMPRA', 'VENTA', 'AJUSTE_MANUAL', 'INVENTARIO_INICIAL'
    referencia_id UUID,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_movimiento_almacenes CHECK (
        (tipo = 'TRANSFERENCIA' AND almacen_origen_id IS NOT NULL AND almacen_destino_id IS NOT NULL AND almacen_origen_id <> almacen_destino_id)
        OR (tipo = 'ENTRADA' AND almacen_destino_id IS NOT NULL)
        OR (tipo = 'SALIDA' AND almacen_origen_id IS NOT NULL)
        OR (tipo = 'AJUSTE' AND (almacen_origen_id IS NOT NULL OR almacen_destino_id IS NOT NULL))
    )
);

-- 12. TABLA: detalle_movimiento (Líneas de movimiento por producto)
CREATE TABLE IF NOT EXISTS public.detalle_movimiento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movimiento_id UUID NOT NULL REFERENCES public.movimiento_inventario(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. TABLA: proveedor (Catálogo de proveedores)
CREATE TABLE IF NOT EXISTS public.proveedor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE CASCADE,
    ruc TEXT,
    razon_social TEXT NOT NULL,
    contacto_nombre TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_proveedor_negocio_ruc UNIQUE (negocio_id, ruc)
);

DROP TRIGGER IF EXISTS trg_proveedor_updated_at ON public.proveedor;
CREATE TRIGGER trg_proveedor_updated_at
    BEFORE UPDATE ON public.proveedor
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 14. TABLA: compra (Ingresos de mercancía y aprovisionamiento)
CREATE TABLE IF NOT EXISTS public.compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE RESTRICT,
    proveedor_id UUID NOT NULL REFERENCES public.proveedor(id) ON DELETE RESTRICT,
    almacen_destino_id UUID NOT NULL REFERENCES public.almacen(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    numero_comprobante TEXT NOT NULL,
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado public.estado_compra NOT NULL DEFAULT 'RECIBIDA',
    total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    notas TEXT,
    movimiento_id UUID REFERENCES public.movimiento_inventario(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_compra_updated_at ON public.compra;
CREATE TRIGGER trg_compra_updated_at
    BEFORE UPDATE ON public.compra
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 15. TABLA: detalle_compra
CREATE TABLE IF NOT EXISTS public.detalle_compra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES public.compra(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    costo_unitario NUMERIC(12, 2) NOT NULL CHECK (costo_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. TABLA: cliente (Cartera de clientes para ventas)
CREATE TABLE IF NOT EXISTS public.cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE CASCADE,
    tipo_documento TEXT NOT NULL DEFAULT 'DNI', -- DNI, RUC, CE, PASAPORTE
    numero_documento TEXT,
    nombre_o_razon_social TEXT NOT NULL,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cliente_negocio_doc UNIQUE (negocio_id, tipo_documento, numero_documento)
);

DROP TRIGGER IF EXISTS trg_cliente_updated_at ON public.cliente;
CREATE TRIGGER trg_cliente_updated_at
    BEFORE UPDATE ON public.cliente
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 17. TABLA: venta (Comprobantes de salida por venta)
CREATE TABLE IF NOT EXISTS public.venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES public.cliente(id) ON DELETE RESTRICT,
    almacen_origen_id UUID NOT NULL REFERENCES public.almacen(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
    serie TEXT NOT NULL DEFAULT 'B001',
    correlativo INTEGER NOT NULL,
    fecha_emision TIMESTAMPTZ NOT NULL DEFAULT now(),
    estado public.estado_venta NOT NULL DEFAULT 'PAGADA',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    impuesto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (impuesto >= 0),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    movimiento_id UUID REFERENCES public.movimiento_inventario(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_venta_negocio_serie_correlativo UNIQUE (negocio_id, serie, correlativo)
);

DROP TRIGGER IF EXISTS trg_venta_updated_at ON public.venta;
CREATE TRIGGER trg_venta_updated_at
    BEFORE UPDATE ON public.venta
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 18. TABLA: detalle_venta
CREATE TABLE IF NOT EXISTS public.detalle_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES public.venta(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12, 2) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. TABLA: pago (Registro de cobros y pasarelas de pago, preparado para Culqi)
CREATE TABLE IF NOT EXISTS public.pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE RESTRICT,
    venta_id UUID NOT NULL REFERENCES public.venta(id) ON DELETE CASCADE,
    metodo public.metodo_pago NOT NULL DEFAULT 'EFECTIVO',
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    moneda TEXT NOT NULL DEFAULT 'PEN',
    estado public.estado_pago NOT NULL DEFAULT 'COMPLETADO',
    culqi_charge_id TEXT, -- ID de cargo retornado por Culqi en Fase 3
    referencia TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_pago_updated_at ON public.pago;
CREATE TRIGGER trg_pago_updated_at
    BEFORE UPDATE ON public.pago
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 20. TABLA: auditoria (Bitácora inmutable de operaciones sensibles)
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID REFERENCES public.negocio(id) ON DELETE SET NULL,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tabla TEXT NOT NULL,
    registro_id UUID,
    accion TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 21. ÍNDICES DE ALTO RENDIMIENTO (Claves foráneas y búsquedas recurrentes)
CREATE INDEX IF NOT EXISTS idx_usuarios_negocio_id ON public.usuarios(negocio_id);
CREATE INDEX IF NOT EXISTS idx_categoria_negocio_id ON public.categoria(negocio_id);
CREATE INDEX IF NOT EXISTS idx_unidad_medida_negocio_id ON public.unidad_medida(negocio_id);
CREATE INDEX IF NOT EXISTS idx_almacen_negocio_id ON public.almacen(negocio_id);

CREATE INDEX IF NOT EXISTS idx_productos_negocio_id ON public.productos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON public.productos(negocio_id, sku);
CREATE INDEX IF NOT EXISTS idx_productos_codigo_barras ON public.productos(negocio_id, codigo_barras);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos(negocio_id, nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria_id ON public.productos(categoria_id);

CREATE INDEX IF NOT EXISTS idx_inventario_almacen_id ON public.inventario(almacen_id);
CREATE INDEX IF NOT EXISTS idx_inventario_producto_id ON public.inventario(producto_id);

CREATE INDEX IF NOT EXISTS idx_movimientos_negocio_fecha ON public.movimiento_inventario(negocio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario ON public.movimiento_inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_detalle_movimiento_mov ON public.detalle_movimiento(movimiento_id);
CREATE INDEX IF NOT EXISTS idx_detalle_movimiento_prod ON public.detalle_movimiento(producto_id);

CREATE INDEX IF NOT EXISTS idx_compras_negocio_fecha ON public.compra(negocio_id, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON public.compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_detalle_compra_compra ON public.detalle_compra(compra_id);

CREATE INDEX IF NOT EXISTS idx_ventas_negocio_fecha ON public.venta(negocio_id, fecha_emision DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.venta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_venta ON public.detalle_venta(venta_id);

CREATE INDEX IF NOT EXISTS idx_pago_venta_id ON public.pago(venta_id);
CREATE INDEX IF NOT EXISTS idx_pago_culqi_charge ON public.pago(culqi_charge_id) WHERE culqi_charge_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auditoria_tabla_registro ON public.auditoria(tabla, registro_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(created_at DESC);

-- ==============================================================================
-- 22. MIGRACIÓN Y SINCRONIZACIÓN AUTOMÁTICA DE DATOS EXISTENTES
-- ==============================================================================
DO $$
DECLARE
    v_negocio_id UUID;
    v_almacen_id UUID;
    v_prod RECORD;
BEGIN
    -- 1. Asegurar la existencia de al menos un negocio por defecto
    SELECT id INTO v_negocio_id FROM public.negocio ORDER BY created_at ASC LIMIT 1;
    IF v_negocio_id IS NULL THEN
        INSERT INTO public.negocio (nombre, ruc, direccion, telefono)
        VALUES ('Negocio Principal', '20100000001', 'Av. Central 123, Lima', '01-444-5555')
        RETURNING id INTO v_negocio_id;
    END IF;

    -- 2. Asegurar la existencia del Almacén Principal por defecto
    SELECT id INTO v_almacen_id FROM public.almacen WHERE negocio_id = v_negocio_id AND es_principal = true LIMIT 1;
    IF v_almacen_id IS NULL THEN
        SELECT id INTO v_almacen_id FROM public.almacen WHERE negocio_id = v_negocio_id LIMIT 1;
    END IF;

    IF v_almacen_id IS NULL THEN
        INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal)
        VALUES (v_negocio_id, 'Almacén Principal', 'ALM-01', 'Sede Central', true)
        RETURNING id INTO v_almacen_id;
    END IF;

    -- 3. Asignar negocio_id a productos huérfanos preexistentes
    UPDATE public.productos
    SET negocio_id = v_negocio_id
    WHERE negocio_id IS NULL;

    -- Sincronizar precio_venta desde precio_soles si está en cero
    UPDATE public.productos
    SET precio_venta = precio_soles
    WHERE precio_venta = 0 AND precio_soles > 0;

    -- 4. Migrar el stock existente en 'productos' hacia la tabla 'inventario'
    FOR v_prod IN SELECT id, stock FROM public.productos LOOP
        INSERT INTO public.inventario (almacen_id, producto_id, stock_actual)
        VALUES (v_almacen_id, v_prod.id, COALESCE(v_prod.stock, 0))
        ON CONFLICT (almacen_id, producto_id)
        DO NOTHING;
    END LOOP;

    -- 5. Asignar negocio_id a usuarios huérfanos existentes
    UPDATE public.usuarios
    SET negocio_id = v_negocio_id
    WHERE negocio_id IS NULL;

END $$;
