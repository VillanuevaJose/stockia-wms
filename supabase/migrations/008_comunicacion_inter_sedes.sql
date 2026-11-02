-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 008_comunicacion_inter_sedes.sql: Tabla de Requerimientos y Comunicación entre Sedes
-- ==============================================================================

-- 1. TABLA: solicitud_traslado (Comunicación operativa entre sedes físicas)
CREATE TABLE IF NOT EXISTS public.solicitud_traslado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocio(id) ON DELETE CASCADE,
    sede_origen_id UUID NOT NULL REFERENCES public.almacen(id) ON DELETE CASCADE,
    sede_destino_id UUID NOT NULL REFERENCES public.almacen(id) ON DELETE CASCADE,
    producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL,
    cantidad NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    mensaje TEXT NOT NULL,
    respuesta TEXT,
    prioridad TEXT NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_TRANSITO', 'RECIBIDO', 'RECHAZADO')),
    usuario_emisor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    usuario_receptor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_respuesta TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_distintas_sedes CHECK (sede_origen_id <> sede_destino_id)
);

-- Índices de consulta de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_solicitud_traslado_negocio ON public.solicitud_traslado(negocio_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_traslado_estado ON public.solicitud_traslado(negocio_id, estado);
CREATE INDEX IF NOT EXISTS idx_solicitud_traslado_fecha ON public.solicitud_traslado(negocio_id, fecha_solicitud DESC);

-- Trigger automático para updated_at
DROP TRIGGER IF EXISTS trg_solicitud_traslado_updated_at ON public.solicitud_traslado;
CREATE TRIGGER trg_solicitud_traslado_updated_at
    BEFORE UPDATE ON public.solicitud_traslado
    FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp_updated_at();

-- 2. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.solicitud_traslado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitud_traslado_select" ON public.solicitud_traslado;
CREATE POLICY "solicitud_traslado_select" ON public.solicitud_traslado
    FOR SELECT TO authenticated
    USING (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "solicitud_traslado_insert" ON public.solicitud_traslado;
CREATE POLICY "solicitud_traslado_insert" ON public.solicitud_traslado
    FOR INSERT TO authenticated
    WITH CHECK (negocio_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "solicitud_traslado_update" ON public.solicitud_traslado;
CREATE POLICY "solicitud_traslado_update" ON public.solicitud_traslado
    FOR UPDATE TO authenticated
    USING (negocio_id = public.mi_negocio_id())
    WITH CHECK (negocio_id = public.mi_negocio_id());
