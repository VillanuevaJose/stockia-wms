-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 04_seed.sql: DATOS DE DEMOSTRACIÓN (OPCIONAL / SOLO DEMO)
-- ADVERTENCIA: NO EJECUTAR EN AMBIENTES DE PRODUCCIÓN PARA CLIENTE FINAL.
-- ==============================================================================

DO $$
DECLARE
    v_negocio_id UUID;
    v_alm_lurin_id UUID;
    v_alm_callao_id UUID;
    
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

    -- Variables para iteración de productos
    v_prod_id UUID;
BEGIN
    -- 1. NEGOCIO
    INSERT INTO public.negocio (nombre, ruc, direccion, telefono, email, activo)
    VALUES (
        'Ferretería e Industrial del Norte S.A.C.',
        '20608912345',
        'Av. Argentina 2450, Lima Industrial',
        '01-512-8900',
        'contacto@ferreterianorte.com.pe',
        true
    )
    ON CONFLICT (ruc) DO UPDATE
    SET nombre = EXCLUDED.nombre
    RETURNING id INTO v_negocio_id;

    -- 2. ALMACENES (1 Principal, 1 Secundario)
    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Almacén Principal Lurín',
        'ALM-LUR',
        'Km 32.5 Panamericana Sur, Lurín',
        true,
        true
    )
    ON CONFLICT (negocio_id, nombre) DO UPDATE
    SET codigo = EXCLUDED.codigo
    RETURNING id INTO v_alm_lurin_id;

    INSERT INTO public.almacen (negocio_id, nombre, codigo, direccion, es_principal, activo)
    VALUES (
        v_negocio_id,
        'Almacén Secundario Callao',
        'ALM-CAL',
        'Av. Néstor Gambetta 1020, Callao',
        false,
        true
    )
    ON CONFLICT (negocio_id, nombre) DO UPDATE
    SET codigo = EXCLUDED.codigo
    RETURNING id INTO v_alm_callao_id;

    -- 3. CATEGORÍAS (5 Categorías representativas)
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

    -- 5. CATÁLOGO DE 15 PRODUCTOS CON STOCK E INVENTARIO POR ALMACÉN
    -- Activar temporalmente la bandera para inserción de semilla
    PERFORM set_config('app.allow_inventory_update', 'true', true);

    -- Helper anidado: función interna para insertar y poblar inventario
    -- Producto 1
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_herramientas, v_und_unidad, 'HER-001', '7751234000018', 'Martillo de Carpintero 16oz', 'Martillo tubular de uña curva mango engomado antideslizante', 15.00, 28.50, 28.50, 5, 45)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 30, 'Pasillo A - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 30;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 15, 'Rack 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 15;

    -- Producto 2
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_herramientas, v_und_unidad, 'HER-002', '7751234000025', 'Alicate Universal 8" Aislado 1000V', 'Alicate para electricista con filos templados por inducción', 18.00, 34.00, 34.00, 5, 32)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 20, 'Pasillo A - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 20;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 12, 'Rack 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 12;

    -- Producto 3
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_herramientas, v_und_caja, 'HER-003', '7751234000032', 'Juego de Destornilladores Pro x 6 Und', '3 planos y 3 punta estrella con puntas magnéticas pavonadas', 25.00, 48.00, 48.00, 4, 25)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 15, 'Pasillo A - Estante 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 15;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 10, 'Rack 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 10;

    -- Producto 4
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_epp, v_und_unidad, 'EPP-001', '7751234000049', 'Casco de Seguridad Jockey Blanco ANSI Z89.1', 'Casco dieléctrico de alta densidad con arnés de 4 puntas ratchet', 12.00, 22.00, 22.00, 10, 80)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 50, 'Pasillo B - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 50;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 30, 'Rack 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 30;

    -- Producto 5
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_epp, v_und_par, 'EPP-002', '7751234000056', 'Guantes Nitrilo Anticorte Nivel 5 Talla L', 'Guantes con fibra de vidrio y recubrimiento microporoso de nitrilo', 9.50, 18.00, 18.00, 15, 120)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 80, 'Pasillo B - Estante 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 80;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 40, 'Rack 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 40;

    -- Producto 6
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_epp, v_und_unidad, 'EPP-003', '7751234000063', 'Lentes de Seguridad Antiempañantes Claros', 'Protección balística UV400 contra impactos y partículas voladoras', 4.80, 10.50, 10.50, 20, 150)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 100, 'Pasillo B - Estante 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 100;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 50, 'Rack 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 50;

    -- Producto 7
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_electricos, v_und_caja, 'ELE-001', '7751234000070', 'Cable Mellizo 2x14 AWG Cobre 100 Metros', 'Conductor de cobre flexible para instalaciones de baja tensión', 110.00, 165.00, 165.00, 3, 22)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 14, 'Pasillo C - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 14;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 8, 'Rack 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 8;

    -- Producto 8
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_electricos, v_und_unidad, 'ELE-002', '7751234000087', 'Tomacorriente Doble con Puesta a Tierra 16A', 'Módulo de empotrar con placa blanca de polipropileno ignífugo', 7.20, 14.50, 14.50, 10, 95)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 60, 'Pasillo C - Estante 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 60;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 35, 'Rack 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 35;

    -- Producto 9
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_electricos, v_und_unidad, 'ELE-003', '7751234000094', 'Interruptor Termomagnético Bipolar 2x20A', 'Llave térmica de riel DIN 10kA curva C para tableros residenciales', 28.00, 45.00, 45.00, 6, 40)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 25, 'Pasillo C - Estante 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 25;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 15, 'Rack 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 15;

    -- Producto 10
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_pinturas, v_und_galon, 'PIN-001', '7751234000100', 'Esmalte Sintético Negro Brillante 1 Galón', 'Pintura anticorrosiva de secado rápido para estructuras metálicas', 38.00, 62.00, 62.00, 4, 30)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 20, 'Zona Líquidos 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 20;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 10, 'Zona Química') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 10;

    -- Producto 11
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_pinturas, v_und_galon, 'PIN-002', '7751234000117', 'Pintura Látex Lavable Blanco Humo 1 Galón', 'Pintura antihongos de alta cobertura y lavabilidad para interiores', 32.00, 54.00, 54.00, 6, 42)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 28, 'Zona Líquidos 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 28;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 14, 'Zona Química') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 14;

    -- Producto 12
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_pinturas, v_und_galon, 'PIN-003', '7751234000124', 'Thinner Estándar Extra Diluyente 1 Galón', 'Solvente refinado para limpieza de herramientas y dilución de esmaltes', 18.00, 30.00, 30.00, 5, 35)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 25, 'Zona Líquidos 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 25;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 10, 'Zona Química') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 10;

    -- Producto 13
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_fijaciones, v_und_caja, 'FIJ-001', '7751234000131', 'Tornillo Autoperforante Drywall 6x1" x 1000 Und', 'Tornillos negros fosfatados punta fina para placa de yeso', 24.00, 42.00, 42.00, 4, 50)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 35, 'Pasillo D - Estante 1') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 35;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 15, 'Rack 4') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 15;

    -- Producto 14
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_fijaciones, v_und_caja, 'FIJ-002', '7751234000148', 'Tarugo Plástico Gris 6mm x 500 Und', 'Tarugos universales con aletas antigiro para mampostería y ladrillo', 8.50, 16.00, 16.00, 8, 65)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 45, 'Pasillo D - Estante 2') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 45;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 20, 'Rack 4') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 20;

    -- Producto 15
    INSERT INTO public.productos (negocio_id, categoria_id, unidad_medida_id, sku, codigo_barras, nombre, descripcion, costo, precio_venta, precio_soles, stock_minimo, stock)
    VALUES (v_negocio_id, v_cat_fijaciones, v_und_kilo, 'FIJ-003', '7751234000155', 'Clavos con Cabeza 2 1/2" para Madera x 1 Kg', 'Clavos de acero pulido para carpintería estructural y encofrados', 4.20, 8.00, 8.00, 12, 110)
    ON CONFLICT (negocio_id, sku) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id INTO v_prod_id;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_lurin_id, v_prod_id, 70, 'Pasillo D - Estante 3') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 70;
    INSERT INTO public.inventario (almacen_id, producto_id, stock_actual, ubicacion) VALUES (v_alm_callao_id, v_prod_id, 40, 'Rack 4') ON CONFLICT (almacen_id, producto_id) DO UPDATE SET stock_actual = 40;

    -- 6. PROVEEDORES (3 Proveedores)
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

    INSERT INTO public.proveedor (negocio_id, ruc, razon_social, contacto_nombre, telefono, email, direccion)
    VALUES (
        v_negocio_id,
        '20100123453',
        'Indeco S.A. - Cables y Conductores',
        'Carlos Benavides',
        '01-614-7200',
        'comercial@indeco.com.pe',
        'Av. Colonial 2050, Cercado de Lima'
    ) ON CONFLICT (negocio_id, ruc) DO NOTHING;

    -- 7. CLIENTES (3 Clientes)
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

    INSERT INTO public.cliente (negocio_id, tipo_documento, numero_documento, nombre_o_razon_social, telefono, email, direccion)
    VALUES (
        v_negocio_id,
        'RUC',
        '20549123401',
        'Constructora e Inmobiliaria Horizonte S.A.C.',
        '01-344-9876',
        'compras@horizonteconstruye.com',
        'Av. Javier Prado Este 2850, San Borja'
    ) ON CONFLICT (negocio_id, tipo_documento, numero_documento) DO NOTHING;

    INSERT INTO public.cliente (negocio_id, tipo_documento, numero_documento, nombre_o_razon_social, telefono, email, direccion)
    VALUES (
        v_negocio_id,
        'RUC',
        '20601928374',
        'Servicios Eléctricos San Martín E.I.R.L.',
        '994-321-876',
        'proyectos@sanmartinelectrico.pe',
        'Jr. Junín 142, Magdalena del Mar'
    ) ON CONFLICT (negocio_id, tipo_documento, numero_documento) DO NOTHING;

END $$;
