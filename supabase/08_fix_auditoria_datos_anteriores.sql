-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 08_fix_auditoria_datos_anteriores.sql
-- Corrección definitiva para la columna datos_anteriores en tabla auditoria
-- y sincronización de columnas de pago y venta
-- ==============================================================================

-- 1. Agregar columna datos_anteriores a la tabla auditoria (para que el trigger no falle)
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS datos_anteriores JSONB;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS datos_previos JSONB;

-- Sincronizar datos si ya existen registros en auditoria
UPDATE public.auditoria 
SET datos_anteriores = COALESCE(datos_anteriores, datos_previos),
    datos_previos = COALESCE(datos_previos, datos_anteriores);

-- 2. Actualizar la función del trigger de auditoría para guardar en ambas columnas sin fallar
CREATE OR REPLACE FUNCTION public.auditar_cambios()
RETURNS TRIGGER AS $$
DECLARE
    v_usuario_id UUID;
    v_negocio_id UUID := NULL;
    v_datos_ant JSONB := NULL;
    v_datos_nuev JSONB := NULL;
    v_registro_id UUID := NULL;
BEGIN
    v_usuario_id := auth.uid();

    IF TG_OP = 'DELETE' THEN
        v_registro_id := OLD.id;
        v_datos_ant := to_jsonb(OLD);
        IF to_jsonb(OLD) ? 'negocio_id' THEN
            v_negocio_id := (OLD.negocio_id)::UUID;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        v_registro_id := NEW.id;
        v_datos_ant := to_jsonb(OLD);
        v_datos_nuev := to_jsonb(NEW);
        IF to_jsonb(NEW) ? 'negocio_id' THEN
            v_negocio_id := (NEW.negocio_id)::UUID;
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        v_registro_id := NEW.id;
        v_datos_nuev := to_jsonb(NEW);
        IF to_jsonb(NEW) ? 'negocio_id' THEN
            v_negocio_id := (NEW.negocio_id)::UUID;
        END IF;
    END IF;

    INSERT INTO public.auditoria (
        negocio_id,
        usuario_id,
        tabla,
        registro_id,
        accion,
        datos_anteriores,
        datos_previos,
        datos_nuevos
    ) VALUES (
        v_negocio_id,
        v_usuario_id,
        TG_TABLE_NAME,
        v_registro_id,
        TG_OP,
        v_datos_ant,
        v_datos_ant,
        v_datos_nuev
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Asegurar columnas de soporte en tabla pago y venta si hicieran falta
ALTER TABLE public.pago ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'PEN';
ALTER TABLE public.pago ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'COMPLETADO';
ALTER TABLE public.pago ADD COLUMN IF NOT EXISTS culqi_charge_id TEXT;
ALTER TABLE public.venta ADD COLUMN IF NOT EXISTS movimiento_id UUID REFERENCES public.movimiento_inventario(id) ON DELETE SET NULL;
