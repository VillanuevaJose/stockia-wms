-- ==============================================================================
-- FASE 1: Esquema de Usuarios y Sincronización con Supabase Auth
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Crear tabla pública de usuarios vinculada a auth.users
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre_completo TEXT,
    rol TEXT NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin', 'almacenero', 'vendedor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad (RLS):
-- Los usuarios pueden leer su propio perfil
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.usuarios;
CREATE POLICY "Los usuarios pueden ver su propio perfil" 
ON public.usuarios FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- Los administradores pueden ver todos los perfiles
DROP POLICY IF EXISTS "Admins pueden ver todos los usuarios" ON public.usuarios;
CREATE POLICY "Admins pueden ver todos los usuarios" 
ON public.usuarios FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- Los administradores pueden actualizar roles
DROP POLICY IF EXISTS "Admins pueden actualizar perfiles" ON public.usuarios;
CREATE POLICY "Admins pueden actualizar perfiles" 
ON public.usuarios FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios 
    WHERE id = auth.uid() AND rol = 'admin'
  )
);

-- 4. Función Trigger para sincronizar automáticamente auth.users con public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre_completo, rol)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre_completo', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'rol', 'vendedor')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        nombre_completo = EXCLUDED.nombre_completo,
        email = EXCLUDED.email,
        updated_at = now();
    RETURN new;
END;
$$;

-- 5. Vincular el Trigger al evento AFTER INSERT en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
