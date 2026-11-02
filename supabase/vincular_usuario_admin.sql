-- ==============================================================================
-- SCRIPT DE VINCULACIÓN: Asignar rol 'admin' y Negocio Demo a Mateo Mesa
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- (NO ejecutado automáticamente por el asistente)
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID;
    v_negocio_id UUID;
    v_email TEXT := 'mateo.mesa@gmail.com';
BEGIN
    -- 1. Localizar el ID de usuario en auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_email
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'El usuario % no existe en auth.users. Ejecuta primero npm run seed:usuario.', v_email;
    END IF;

    -- 2. Localizar el negocio de demostración creado por 04_seed.sql
    SELECT id INTO v_negocio_id
    FROM public.negocio
    WHERE ruc = '20608912345'
    LIMIT 1;

    -- Si no existe por RUC, tomar el primer negocio disponible
    IF v_negocio_id IS NULL THEN
        SELECT id INTO v_negocio_id
        FROM public.negocio
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    IF v_negocio_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ningún negocio registrado. Ejecuta primero 01_schema.sql y 04_seed.sql.';
    END IF;

    -- 3. Insertar o actualizar la fila en public.usuarios con rol 'admin'
    INSERT INTO public.usuarios (
        id,
        negocio_id,
        email,
        nombre_completo,
        rol,
        activo
    ) VALUES (
        v_user_id,
        v_negocio_id,
        v_email,
        'Mesa Mateo',
        'admin',
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET
        negocio_id = EXCLUDED.negocio_id,
        nombre_completo = EXCLUDED.nombre_completo,
        rol = 'admin',
        activo = true,
        updated_at = now();

    -- 4. Actualizar metadata en auth.users para sincronía completa
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_build_object(
        'nombre_completo', 'Mesa Mateo',
        'rol', 'admin',
        'negocio_id', v_negocio_id
    )
    WHERE id = v_user_id;

    RAISE NOTICE 'Éxito: Usuario % vinculado como ADMIN al negocio ID %.', v_email, v_negocio_id;
END $$;
