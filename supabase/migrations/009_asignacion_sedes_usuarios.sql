-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 009_asignacion_sedes_usuarios.sql: Asignación física de sedes operativas a colaboradores
-- ==============================================================================

-- 1. Agregar columna almacen_id a public.usuarios vinculando al maestro de sedes
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS almacen_id UUID REFERENCES public.almacen(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_almacen_id ON public.usuarios(almacen_id);

-- 2. Asegurar que las políticas de RLS permitan al Administrador actualizar rol y sede física
DROP POLICY IF EXISTS "usuarios_admin_update_sede_rol" ON public.usuarios;
CREATE POLICY "usuarios_admin_update_sede_rol" ON public.usuarios
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND rol = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND rol = 'admin'
        )
    );
