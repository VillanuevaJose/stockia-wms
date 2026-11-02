-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 007_auditoria_sistema.sql: Trazabilidad, logs de cambios y triggers automáticos
-- ==============================================================================

-- 1. Asegurar columnas de soporte en tabla auditoria para retrocompatibilidad total
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS datos_anteriores JSONB;
ALTER TABLE public.auditoria ADD COLUMN IF NOT EXISTS datos_previos JSONB;

-- Sincronizar datos si ya existen registros
UPDATE public.auditoria 
SET datos_anteriores = COALESCE(datos_anteriores, datos_previos),
    datos_previos = COALESCE(datos_previos, datos_anteriores);

-- 2. Función del trigger de auditoría con soporte dual para datos_anteriores y datos_previos
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

-- 3. Triggers en tablas maestras y transaccionales
DROP TRIGGER IF EXISTS trg_auditoria_productos ON public.productos;
CREATE TRIGGER trg_auditoria_productos
    AFTER INSERT OR UPDATE OR DELETE ON public.productos
    FOR EACH ROW EXECUTE FUNCTION public.auditar_cambios();

DROP TRIGGER IF EXISTS trg_auditoria_inventario ON public.inventario;
CREATE TRIGGER trg_auditoria_inventario
    AFTER UPDATE OR DELETE ON public.inventario
    FOR EACH ROW EXECUTE FUNCTION public.auditar_cambios();

DROP TRIGGER IF EXISTS trg_auditoria_venta ON public.venta;
CREATE TRIGGER trg_auditoria_venta
    AFTER INSERT OR UPDATE OR DELETE ON public.venta
    FOR EACH ROW EXECUTE FUNCTION public.auditar_cambios();

DROP TRIGGER IF EXISTS trg_auditoria_compra ON public.compra;
CREATE TRIGGER trg_auditoria_compra
    AFTER INSERT OR UPDATE OR DELETE ON public.compra
    FOR EACH ROW EXECUTE FUNCTION public.auditar_cambios();
