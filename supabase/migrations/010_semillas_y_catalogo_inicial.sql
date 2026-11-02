-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 010_semillas_y_catalogo_inicial.sql: Semilla base del negocio, 3 sedes, categorías y catálogo inicial
-- ==============================================================================

DO $$
DECLARE
    v_negocio_id UUID;
    v_alm_central_id UUID;
    v_alm_norte_id UUID;
    v_alm_sur_id UUID;
    
    -- IDs de Categorías
    v_cat_herramientas UUID;
    v_cat_epp UUID;
    v_cat_electricos UUID;
    v_cat_pinturas UUID;
    v_cat_fijaciones UUID;
    
    -- IDs de Unidades
    v_und_unidad UUID;
    v_und_par UUID;
    v_und_caja UUID;
    v_und_kilo UUID;
    v_und_galon UUID;

    v_prod_id UUID;
BEGIN
    -- 1. NEGOCIO PRINCIPAL
    INSERT INTO public.negocio (nombre, ruc, direccion, telefono, email, activo)
    VALUES (
        'Stockia Logística & Ferretería Industrial S.A.C.',
        '20608912345',
        'Av. Javier Prado Este 4200, Lima',
        '01-512-8900',
        'contacto@stockia.pe',
        true
    )
    ON CONFLICT (ruc) DO UPDATE
    SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_negocio_id;

    -- 2. ALMACENES Y SEDES OFICIALES (Central, Norte Callao, Sur Lurín)
    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Sede Central - Principal',
        'ALM-01',
        'Av. Javier Prado Este 4200, Lima',
        true,
        true
    )
    ON CONFLICT (negocio_id, nombre) DO UPDATE
    SET codigo = EXCLUDED.codigo
    RETURNING id INTO v_alm_central_id;

    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Sede Norte - Callao',
        'ALM-02',
        'Av. Elmer Faucett 2040, Callao',
        false,
        true
    )
    ON CONFLICT (negocio_id, nombre) DO UPDATE
    SET codigo = EXCLUDED.codigo
    RETURNING id INTO v_alm_norte_id;

    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Sede Sur - Lurín',
        'ALM-03',
        'Km 32.5 Panamericana Sur, Lurín',
        false,
        true
    )
    ON CONFLICT (negocio_id, nombre) DO UPDATE
    SET codigo = EXCLUDED.codigo
    RETURNING id INTO v_alm_sur_id;

    -- 3. CATEGORÍAS REPRESENTATIVAS
    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Herramientas Manuales', 'Herramientas de mano de uso profesional y mecánico')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
    RETURNING id INTO v_cat_herramientas;

    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Equipos de Protección Personal (EPP)', 'Protección craneana, visual, dérmica y respiratoria')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
    RETURNING id INTO v_cat_epp;

    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Materiales Eléctricos', 'Cables, tomacorrientes y protecciones termomagnéticas')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
    RETURNING id INTO v_cat_electricos;

    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Pinturas y Recubrimientos', 'Esmaltes industriales, látex y solventes de acabado')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
    RETURNING id INTO v_cat_pinturas;

    INSERT INTO public.categoria (negocio_id, nombre, descripcion)
    VALUES (v_negocio_id, 'Fijaciones y Tornillería', 'Tornillos autoperforantes, tarugos y clavos de construcción')
    ON CONFLICT (negocio_id, nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion
    RETURNING id INTO v_cat_fijaciones;

    -- 4. UNIDADES DE MEDIDA
    INSERT INTO public.unidad_medida (negocio_id, codigo, nombre)
    VALUES (v_negocio_id, 'UND', 'Unidad')
    ON CONFLICT (negocio_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_und_unidad;

    INSERT INTO public.unidad_medida (negocio_id, codigo, nombre)
    VALUES (v_negocio_id, 'PAR', 'Par')
    ON CONFLICT (negocio_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_und_par;

    INSERT INTO public.unidad_medida (negocio_id, codigo, nombre)
    VALUES (v_negocio_id, 'CJ', 'Caja')
    ON CONFLICT (negocio_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_und_caja;

    INSERT INTO public.unidad_medida (negocio_id, codigo, nombre)
    VALUES (v_negocio_id, 'KG', 'Kilogramo')
    ON CONFLICT (negocio_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_und_kilo;

    INSERT INTO public.unidad_medida (negocio_id, codigo, nombre)
    VALUES (v_negocio_id, 'GL', 'Galón')
    ON CONFLICT (negocio_id, codigo) DO UPDATE SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_und_galon;

    -- 5. CATÁLOGO INICIAL DE PRODUCTOS E INVENTARIO
    PERFORM set_config('app.allow_inventory_update', 'true', true);

    -- Producto 1: Martillo
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_herramientas, v_und_unidad, 'HER-001', '7751234000018', 'Martillo de Carpintero 16oz', 'Martillo tubular de uña curva mango engomado antideslizante', 15.00, 28.50, 28.50, 5, 45)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_central_id, v_prod_id, 30, 'Pasillo A - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 30;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_norte_id, v_prod_id, 15, 'Rack 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 15;

    -- Producto 2: Alicate
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_herramientas, v_und_unidad, 'HER-002', '7751234000025', 'Alicate Universal 8" Aislado 1000V', 'Alicate para electricista con filos templados por inducción', 18.00, 34.00, 34.00, 5, 32)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_central_id, v_prod_id, 20, 'Pasillo A - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 20;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_norte_id, v_prod_id, 12, 'Rack 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 12;

    -- Producto 3: Casco
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_epp, v_und_unidad, 'EPP-001', '7751234000049', 'Casco de Seguridad Jockey Blanco ANSI Z89.1', 'Casco dieléctrico de alta densidad con arnés de 4 puntas ratchet', 12.00, 22.00, 22.00, 10, 80)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_central_id, v_prod_id, 50, 'Pasillo B - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 50;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_norte_id, v_prod_id, 30, 'Rack 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 30;

    -- 6. PROVEEDORES BASE
    INSERT INTO public.proveedor (negocio_id, ruc, razon_social, contacto_nombre, telefono, email, direccion)
    VALUES (
        v_negocio_id,
        '20100123451',
        'Corporación Aceros Arequipa S.A.',
        'Ing. Juan Mendoza',
        '01-517-1800',
        'ventas@acerosarequipa.com',
        'Av. Enrique Meiggs 297, Callao'
    ) ON CONFLICT (negocio_id, ruc) DO NOTHING;

    INSERT INTO public.proveedor (negocio_id, ruc, razon_social, contacto_nombre, telefono, email, direccion)
    VALUES (
        v_negocio_id,
        '20100123452',
        '3M Perú S.A.',
        'Lic. Claudia Salazar',
        '01-224-0388',
        'atencion@3mperu.com',
        'Av. Canaval y Moreyra 641, San Isidro'
    ) ON CONFLICT (negocio_id, ruc) DO NOTHING;

    -- 7. CLIENTES BASE
    INSERT INTO public.cliente (negocio_id, tipo_documento, numero_documento, nombre_o_razon_social, telefono, email, direccion)
    VALUES (
        v_negocio_id,
        'DNI',
        '45892341',
        'Carlos Eduardo Ramírez Silva',
        '987-654-321',
        'carlos.ramirez@gmail.com',
        'Calle Los Álamos 452, Santiago de Surco'
    ) ON CONFLICT (negocio_id, tipo_documento, numero_documento) DO NOTHING;

END $$;
