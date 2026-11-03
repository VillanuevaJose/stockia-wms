-- ==============================================================================
-- 011_categorias_adicionales.sql
-- Categorías adicionales reales para un entorno de ferretería / almacén industrial
-- Complementa las 5 categorías base de la migración 010
-- ==============================================================================

DO $$
DECLARE
    v_negocio_id UUID;
BEGIN
    -- Obtener el negocio existente
    SELECT id INTO v_negocio_id FROM public.negocio LIMIT 1;

    IF v_negocio_id IS NULL THEN
        RAISE NOTICE 'No se encontró negocio. Ejecute primero la semilla base (010).';
        RETURN;
    END IF;

    -- ── Plomería y Gasfitería ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Plomería y Gasfitería', 'Tuberías PVC/CPVC, válvulas, llaves de paso, pegamentos y accesorios sanitarios')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Herramientas Eléctricas ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Herramientas Eléctricas', 'Taladros, amoladoras, rotomartillos, sierras circulares y caladoras profesionales')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Construcción y Acabados ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Construcción y Acabados', 'Cemento, yeso, masilla, fragua, porcelanato, cerámicos y materiales de obra gruesa y fina')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Iluminación ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Iluminación', 'Focos LED, fluorescentes, reflectores, luminarias de panel, cintas LED y accesorios de alumbrado')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Cerrajería y Seguridad ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Cerrajería y Seguridad', 'Candados, cerraduras, bisagras, picaportes, cerrojos y sistemas de seguridad para puertas')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Adhesivos y Selladores ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Adhesivos y Selladores', 'Silicona, pegamento epóxico, cinta de teflón, cinta aislante, cola sintética y selladores de poliuretano')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Jardinería y Exteriores ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Jardinería y Exteriores', 'Mangueras, aspersores, tijeras de podar, rastrillos, palas y herramientas de jardín')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Abrasivos y Discos ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Abrasivos y Discos', 'Discos de corte, discos de desbaste, lijas al agua, lijas de banda y piedras de afilar')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Soldadura ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Soldadura', 'Electrodos, máquinas de soldar, caretas, estaño, fundentes y accesorios para soldadura')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Medición y Trazo ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Medición y Trazo', 'Cintas métricas, niveles, escuadras, flexómetros, calibradores y niveles láser')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Limpieza Industrial ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Limpieza Industrial', 'Desengrasantes, limpiadores multiuso, escobas industriales, trapeadores y paños absorbentes')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Ferretería General ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Ferretería General', 'Cadenas, alambres, ganchos, poleas, cuerdas, cintas de amarre y accesorios varios')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Bombas y Motores ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Bombas y Motores', 'Bombas de agua, motobombas, electrobombas sumergibles y motores eléctricos monofásicos y trifásicos')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Automotriz ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Automotriz', 'Aceites, lubricantes, filtros, gatas hidráulicas, llaves de rueda y accesorios para vehículos')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    -- ── Almacenamiento y Organización ──
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Almacenamiento y Organización', 'Estanterías metálicas, cajas organizadoras, gabinetes, racks de almacén y contenedores industriales')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

    RAISE NOTICE '15 categorías adicionales insertadas correctamente para negocio %', v_negocio_id;
END $$;
