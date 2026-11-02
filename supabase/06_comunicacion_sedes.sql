-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 06_comunicacion_sedes.sql: Integración de 3 Sedes y Tabla de Comunicación Inter-Sedes
-- ==============================================================================

-- 0. FUNCIONES DE UTILIDAD PREVIAS (Garantiza ejecución autónoma)
CREATE OR REPLACE FUNCTION public.actualizar_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mi_negocio_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT negocio_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- 1. TABLA RELACIONAL: solicitud_traslado (Comunicación y pedidos inter-sedes)
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

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_solicitud_traslado_negocio ON public.solicitud_traslado(negocio_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_traslado_estado ON public.solicitud_traslado(negocio_id, estado);
CREATE INDEX IF NOT EXISTS idx_solicitud_traslado_fecha ON public.solicitud_traslado(negocio_id, fecha_solicitud DESC);

-- Trigger de updated_at
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

-- 3. ACTUALIZACIÓN DEL ONBOARDING: Crear 3 sedes automáticas por empresa
CREATE OR REPLACE FUNCTION public.registrar_negocio_y_admin(
    p_nombre_negocio TEXT,
    p_ruc TEXT DEFAULT NULL,
    p_nombre_completo TEXT DEFAULT 'Administrador',
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_negocio_id UUID;
    v_alm_central_id UUID;
    v_alm_norte_id UUID;
    v_alm_sur_id UUID;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No se proporcionó un ID de usuario válido ni existe sesión activa.';
    END IF;

    SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
    IF v_email IS NULL THEN
        RAISE EXCEPTION 'El usuario % no existe en auth.users.', v_user_id;
    END IF;

    -- 1. Crear la entidad del Negocio (Tenant)
    INSERT INTO public.negocio (nombre, ruc, email, activo)
    VALUES (
        TRIM(p_nombre_negocio),
        NULLIF(TRIM(p_ruc), ''),
        v_email,
        true
    ) RETURNING id INTO v_negocio_id;

    -- 2. Crear las 3 Sedes Oficiales Operativas
    -- Sede 1: Central Principal
    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Sede Central - Principal',
        'ALM-01',
        'Av. Javier Prado Este 4200, Lima',
        true,
        true
    ) RETURNING id INTO v_alm_central_id;

    -- Sede 2: Norte (Callao)
    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Sede Norte - Callao',
        'ALM-02',
        'Av. Elmer Faucett 2040, Callao',
        false,
        true
    ) RETURNING id INTO v_alm_norte_id;

    -- Sede 3: Sur (Lurín)
    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Sede Sur - Lurín',
        'ALM-03',
        'Km 32.5 Panamericana Sur, Lurín',
        false,
        true
    ) RETURNING id INTO v_alm_sur_id;

    -- 3. Asignar rol admin en usuarios vinculado a auth.users
    INSERT INTO public.usuarios (id, negocio_id, email, nombre_completo, rol, activo)
    VALUES (
        v_user_id,
        v_negocio_id,
        v_email,
        TRIM(p_nombre_completo),
        'admin',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        negocio_id = v_negocio_id,
        email = v_email,
        nombre_completo = TRIM(p_nombre_completo),
        rol = 'admin',
        activo = true,
        updated_at = now();

    RETURN jsonb_build_object(
        'success', true,
        'negocio_id', v_negocio_id,
        'usuario_id', v_user_id,
        'almacen_id', v_alm_central_id,
        'sedes', jsonb_build_array(v_alm_central_id, v_alm_norte_id, v_alm_sur_id)
    );
END;
$$;
