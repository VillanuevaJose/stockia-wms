-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 003_roles_y_permisos_rbac.sql: Funciones de Control de Acceso Basado en Roles (RBAC)
-- ==============================================================================

-- 1. Función para obtener el negocio_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.mi_negocio_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT negocio_id FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Función para obtener el rol del usuario autenticado
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT rol::TEXT FROM public.usuarios WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Funciones booleanas de verificación de rol
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = auth.uid() AND rol = 'admin' AND activo = true
    );
$$;

CREATE OR REPLACE FUNCTION public.es_almacenero_o_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = auth.uid() AND rol IN ('admin', 'almacenero') AND activo = true
    );
$$;

-- 4. Trigger para garantizar que siempre exista al menos un admin activo
CREATE OR REPLACE FUNCTION public.proteger_ultimo_admin()
RETURNS TRIGGER AS $$
DECLARE
    v_admins_restantes INTEGER;
BEGIN
    IF OLD.rol = 'admin' AND (NEW.rol <> 'admin' OR NEW.activo = false) THEN
        SELECT COUNT(*) INTO v_admins_restantes
        FROM public.usuarios
        WHERE negocio_id = OLD.negocio_id AND rol = 'admin' AND activo = true AND id <> OLD.id;

        IF v_admins_restantes = 0 THEN
            RAISE EXCEPTION 'Operación denegada: Debe existir al menos un Administrador activo en el sistema.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_proteger_ultimo_admin ON public.usuarios;
CREATE TRIGGER trg_proteger_ultimo_admin
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.proteger_ultimo_admin();
