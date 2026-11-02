-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 02_funciones.sql: Lógica transaccional, control de concurrencia y auditoría
-- ==============================================================================

-- ==============================================================================
-- 1. FUNCIÓN TRANSACCIONAL: registrar_movimiento
-- Gestiona entradas, salidas, mermas, ajustes y traslados con bloqueo de fila.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.registrar_movimiento(
    p_negocio_id UUID,
    p_usuario_id UUID,
    p_tipo public.tipo_movimiento,
    p_motivo TEXT,
    p_almacen_origen_id UUID DEFAULT NULL,
    p_almacen_destino_id UUID DEFAULT NULL,
    p_detalles JSONB DEFAULT '[]'::JSONB,
    p_referencia_tipo TEXT DEFAULT NULL,
    p_referencia_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_movimiento_id UUID;
    v_item RECORD;
    v_producto_id UUID;
    v_cantidad NUMERIC(12, 2);
    v_costo_unitario NUMERIC(12, 2);
    v_stock_actual NUMERIC(12, 2);
    v_prod_nombre TEXT;
BEGIN
    -- 1. Validaciones generales de parámetros
    IF jsonb_array_length(p_detalles) = 0 THEN
        RAISE EXCEPTION 'El movimiento debe contener al menos un detalle de producto.';
    END IF;

    IF p_tipo = 'SALIDA' AND p_almacen_origen_id IS NULL THEN
        RAISE EXCEPTION 'Para un movimiento de SALIDA se debe especificar el almacén de origen.';
    END IF;

    IF p_tipo = 'ENTRADA' AND p_almacen_destino_id IS NULL THEN
        RAISE EXCEPTION 'Para un movimiento de ENTRADA se debe especificar el almacén de destino.';
    END IF;

    IF p_tipo = 'TRANSFERENCIA' THEN
        IF p_almacen_origen_id IS NULL OR p_almacen_destino_id IS NULL THEN
            RAISE EXCEPTION 'Para una TRANSFERENCIA se requieren almacén origen y destino.';
        END IF;
        IF p_almacen_origen_id = p_almacen_destino_id THEN
            RAISE EXCEPTION 'El almacén de origen y destino no pueden ser el mismo.';
        END IF;
    END IF;

    -- 2. Habilitar bandera de sesión transaccional para permitir mutación de stock
    PERFORM set_config('app.allow_inventory_update', 'true', true);

    -- 3. Crear cabecera del movimiento de inventario
    INSERT INTO public.movimiento_inventario (
        negocio_id,
        tipo,
        motivo,
        usuario_id,
        almacen_origen_id,
        almacen_destino_id,
        referencia_tipo,
        referencia_id,
        fecha
    ) VALUES (
        p_negocio_id,
        p_tipo,
        p_motivo,
        p_usuario_id,
        p_almacen_origen_id,
        p_almacen_destino_id,
        p_referencia_tipo,
        p_referencia_id,
        now()
    ) RETURNING id INTO v_movimiento_id;

    -- 4. Procesar cada producto del movimiento con bloqueo FOR UPDATE
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_detalles) AS x(
        producto_id UUID,
        cantidad NUMERIC,
        costo_unitario NUMERIC
    )
    LOOP
        v_producto_id := v_item.producto_id;
        v_cantidad := v_item.cantidad;
        v_costo_unitario := COALESCE(v_item.costo_unitario, 0);

        IF v_cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad para el producto % debe ser estrictamente mayor a cero.', v_producto_id;
        END IF;

        -- Obtener nombre del producto para mensajes claros de error
        SELECT nombre INTO v_prod_nombre FROM public.productos WHERE id = v_producto_id;
        IF v_prod_nombre IS NULL THEN
            RAISE EXCEPTION 'El producto con ID % no existe en la base de datos.', v_producto_id;
        END IF;

        -- Registrar línea en detalle_movimiento
        INSERT INTO public.detalle_movimiento (
            movimiento_id,
            producto_id,
            cantidad,
            costo_unitario
        ) VALUES (
            v_movimiento_id,
            v_producto_id,
            v_cantidad,
            v_costo_unitario
        );

        -- LÓGICA POR TIPO DE MOVIMIENTO:
        
        -- A) SALIDA
        IF p_tipo = 'SALIDA' THEN
            -- Bloqueo pesimista de fila en el inventario origen
            SELECT stock_actual INTO v_stock_actual
            FROM public.inventario
            WHERE almacen_id = p_almacen_origen_id AND producto_id = v_producto_id
            FOR UPDATE;

            IF v_stock_actual IS NULL OR v_stock_actual < v_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para "%" (ID: %). Disponible: %, Requerido: %',
                    v_prod_nombre, v_producto_id, COALESCE(v_stock_actual, 0), v_cantidad;
            END IF;

            UPDATE public.inventario
            SET stock_actual = stock_actual - v_cantidad,
                updated_at = now()
            WHERE almacen_id = p_almacen_origen_id AND producto_id = v_producto_id;

        -- B) ENTRADA
        ELSIF p_tipo = 'ENTRADA' THEN
            -- Asegurar existencia de registro en inventario
            INSERT INTO public.inventario (almacen_id, producto_id, stock_actual)
            VALUES (p_almacen_destino_id, v_producto_id, 0)
            ON CONFLICT (almacen_id, producto_id) DO NOTHING;

            -- Bloquear fila antes de incrementar
            PERFORM stock_actual
            FROM public.inventario
            WHERE almacen_id = p_almacen_destino_id AND producto_id = v_producto_id
            FOR UPDATE;

            UPDATE public.inventario
            SET stock_actual = stock_actual + v_cantidad,
                updated_at = now()
            WHERE almacen_id = p_almacen_destino_id AND producto_id = v_producto_id;

        -- C) TRANSFERENCIA ENTRE ALMACENES
        ELSIF p_tipo = 'TRANSFERENCIA' THEN
            -- 1. Descontar de origen con bloqueo
            SELECT stock_actual INTO v_stock_actual
            FROM public.inventario
            WHERE almacen_id = p_almacen_origen_id AND producto_id = v_producto_id
            FOR UPDATE;

            IF v_stock_actual IS NULL OR v_stock_actual < v_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para traslado de "%". Disponible en origen: %, Solicitado: %',
                    v_prod_nombre, COALESCE(v_stock_actual, 0), v_cantidad;
            END IF;

            UPDATE public.inventario
            SET stock_actual = stock_actual - v_cantidad,
                updated_at = now()
            WHERE almacen_id = p_almacen_origen_id AND producto_id = v_producto_id;

            -- 2. Incrementar en destino con inserción si no existe
            INSERT INTO public.inventario (almacen_id, producto_id, stock_actual)
            VALUES (p_almacen_destino_id, v_producto_id, 0)
            ON CONFLICT (almacen_id, producto_id) DO NOTHING;

            PERFORM stock_actual
            FROM public.inventario
            WHERE almacen_id = p_almacen_destino_id AND producto_id = v_producto_id
            FOR UPDATE;

            UPDATE public.inventario
            SET stock_actual = stock_actual + v_cantidad,
                updated_at = now()
            WHERE almacen_id = p_almacen_destino_id AND producto_id = v_producto_id;

        -- D) AJUSTE DE INVENTARIO
        ELSIF p_tipo = 'AJUSTE' THEN
            IF p_almacen_destino_id IS NOT NULL THEN
                -- Ajuste positivo (sobrante)
                INSERT INTO public.inventario (almacen_id, producto_id, stock_actual)
                VALUES (p_almacen_destino_id, v_producto_id, 0)
                ON CONFLICT (almacen_id, producto_id) DO NOTHING;

                PERFORM stock_actual
                FROM public.inventario
                WHERE almacen_id = p_almacen_destino_id AND producto_id = v_producto_id
                FOR UPDATE;

                UPDATE public.inventario
                SET stock_actual = stock_actual + v_cantidad,
                    updated_at = now()
                WHERE almacen_id = p_almacen_destino_id AND producto_id = v_producto_id;
            ELSE
                -- Ajuste negativo (merma/pérdida)
                SELECT stock_actual INTO v_stock_actual
                FROM public.inventario
                WHERE almacen_id = p_almacen_origen_id AND producto_id = v_producto_id
                FOR UPDATE;

                IF v_stock_actual IS NULL OR v_stock_actual < v_cantidad THEN
                    RAISE EXCEPTION 'No se puede ajustar por pérdida: stock disponible de "%" (%) es inferior al ajuste (%)',
                        v_prod_nombre, COALESCE(v_stock_actual, 0), v_cantidad;
                END IF;

                UPDATE public.inventario
                SET stock_actual = stock_actual - v_cantidad,
                    updated_at = now()
                WHERE almacen_id = p_almacen_origen_id AND producto_id = v_producto_id;
            END IF;
        END IF;

        -- Sincronizar el campo legado 'stock' en la tabla 'productos' para retrocompatibilidad
        UPDATE public.productos
        SET stock = (
            SELECT COALESCE(SUM(stock_actual), 0)
            FROM public.inventario
            WHERE producto_id = v_producto_id
        ),
        updated_at = now()
        WHERE id = v_producto_id;

    END LOOP;

    RETURN v_movimiento_id;
END;
$$;


-- ==============================================================================
-- 2. FUNCIÓN TRANSACCIONAL: registrar_compra
-- Registra comprobante de compra, detalles, actualiza costo y genera entrada física.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.registrar_compra(
    p_negocio_id UUID,
    p_usuario_id UUID,
    p_proveedor_id UUID,
    p_almacen_destino_id UUID,
    p_numero_comprobante TEXT,
    p_detalles JSONB, -- Array de [{ producto_id, cantidad, costo_unitario }]
    p_notas TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_compra_id UUID;
    v_movimiento_id UUID;
    v_total NUMERIC(12, 2) := 0;
    v_item RECORD;
    v_subtotal NUMERIC(12, 2);
BEGIN
    IF jsonb_array_length(p_detalles) = 0 THEN
        RAISE EXCEPTION 'La compra debe incluir al menos un producto.';
    END IF;

    -- Calcular monto total de la compra
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_detalles) AS x(
        producto_id UUID,
        cantidad NUMERIC,
        costo_unitario NUMERIC
    )
    LOOP
        v_subtotal := v_item.cantidad * v_item.costo_unitario;
        v_total := v_total + v_subtotal;
    END LOOP;

    -- Insertar comprobante de compra
    INSERT INTO public.compra (
        negocio_id,
        proveedor_id,
        almacen_destino_id,
        usuario_id,
        numero_comprobante,
        fecha_emision,
        estado,
        total,
        notas
    ) VALUES (
        p_negocio_id,
        p_proveedor_id,
        p_almacen_destino_id,
        p_usuario_id,
        p_numero_comprobante,
        now(),
        'RECIBIDA',
        v_total,
        p_notas
    ) RETURNING id INTO v_compra_id;

    -- Insertar líneas de detalle de compra
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_detalles) AS x(
        producto_id UUID,
        cantidad NUMERIC,
        costo_unitario NUMERIC
    )
    LOOP
        INSERT INTO public.detalle_compra (
            compra_id,
            producto_id,
            cantidad,
            costo_unitario,
            subtotal
        ) VALUES (
            v_compra_id,
            v_item.producto_id,
            v_item.cantidad,
            v_item.costo_unitario,
            (v_item.cantidad * v_item.costo_unitario)
        );

        -- Actualizar costo más reciente en el maestro de productos
        UPDATE public.productos
        SET costo = v_item.costo_unitario,
            updated_at = now()
        WHERE id = v_item.producto_id;
    END LOOP;

    -- Ejecutar ingreso físico a inventario mediante registrar_movimiento
    v_movimiento_id := public.registrar_movimiento(
        p_negocio_id         := p_negocio_id,
        p_usuario_id         := p_usuario_id,
        p_tipo               := 'ENTRADA',
        p_motivo             := 'Recepción de compra Comprobante: ' || p_numero_comprobante,
        p_almacen_destino_id := p_almacen_destino_id,
        p_detalles           := p_detalles,
        p_referencia_tipo    := 'COMPRA',
        p_referencia_id      := v_compra_id
    );

    -- Enlazar ID de movimiento a la compra
    UPDATE public.compra
    SET movimiento_id = v_movimiento_id
    WHERE id = v_compra_id;

    RETURN v_compra_id;
END;
$$;


-- ==============================================================================
-- 3. FUNCIÓN TRANSACCIONAL: registrar_venta
-- Registra comprobante de venta, cobra pago y descuenta stock con bloqueo estricto.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.registrar_venta(
    p_negocio_id UUID,
    p_usuario_id UUID,
    p_cliente_id UUID,
    p_almacen_origen_id UUID,
    p_serie TEXT, -- ej. 'B001', 'F001'
    p_detalles JSONB, -- Array de [{ producto_id, cantidad, precio_unitario }]
    p_metodo_pago public.metodo_pago DEFAULT 'EFECTIVO',
    p_culqi_charge_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_venta_id UUID;
    v_movimiento_id UUID;
    v_correlativo INTEGER;
    v_item RECORD;
    v_total NUMERIC(12, 2) := 0;
    v_subtotal NUMERIC(12, 2) := 0;
    v_impuesto NUMERIC(12, 2) := 0;
    v_linea_subtotal NUMERIC(12, 2);
    v_detalles_movimiento JSONB := '[]'::JSONB;
BEGIN
    IF jsonb_array_length(p_detalles) = 0 THEN
        RAISE EXCEPTION 'La venta debe contener al menos un producto.';
    END IF;

    -- 1. Generar correlativo incremental seguro por negocio y serie
    SELECT COALESCE(MAX(correlativo), 0) + 1
    INTO v_correlativo
    FROM public.venta
    WHERE negocio_id = p_negocio_id AND serie = p_serie;

    -- 2. Calcular montos e imponible (IGV 18%)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_detalles) AS x(
        producto_id UUID,
        cantidad NUMERIC,
        precio_unitario NUMERIC
    )
    LOOP
        v_linea_subtotal := v_item.cantidad * v_item.precio_unitario;
        v_total := v_total + v_linea_subtotal;

        -- Construir payload para registrar_movimiento (SALIDA)
        v_detalles_movimiento := v_detalles_movimiento || jsonb_build_object(
            'producto_id', v_item.producto_id,
            'cantidad', v_item.cantidad,
            'costo_unitario', 0
        );
    END LOOP;

    v_subtotal := ROUND(v_total / 1.18, 2);
    v_impuesto := v_total - v_subtotal;

    -- 3. Crear cabecera de la venta
    INSERT INTO public.venta (
        negocio_id,
        cliente_id,
        almacen_origen_id,
        usuario_id,
        serie,
        correlativo,
        fecha_emision,
        estado,
        subtotal,
        impuesto,
        total
    ) VALUES (
        p_negocio_id,
        p_cliente_id,
        p_almacen_origen_id,
        p_usuario_id,
        p_serie,
        v_correlativo,
        now(),
        'PAGADA',
        v_subtotal,
        v_impuesto,
        v_total
    ) RETURNING id INTO v_venta_id;

    -- 4. Insertar líneas de detalle de venta
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_detalles) AS x(
        producto_id UUID,
        cantidad NUMERIC,
        precio_unitario NUMERIC
    )
    LOOP
        INSERT INTO public.detalle_venta (
            venta_id,
            producto_id,
            cantidad,
            precio_unitario,
            subtotal
        ) VALUES (
            v_venta_id,
            v_item.producto_id,
            v_item.cantidad,
            v_item.precio_unitario,
            (v_item.cantidad * v_item.precio_unitario)
        );
    END LOOP;

    -- 5. Registrar SALIDA de stock en inventario (verificando y bloqueando existencias)
    v_movimiento_id := public.registrar_movimiento(
        p_negocio_id        := p_negocio_id,
        p_usuario_id        := p_usuario_id,
        p_tipo              := 'SALIDA',
        p_motivo            := 'Despacho por Venta: ' || p_serie || '-' || LPAD(v_correlativo::TEXT, 8, '0'),
        p_almacen_origen_id := p_almacen_origen_id,
        p_detalles          := v_detalles_movimiento,
        p_referencia_tipo   := 'VENTA',
        p_referencia_id     := v_venta_id
    );

    UPDATE public.venta
    SET movimiento_id = v_movimiento_id
    WHERE id = v_venta_id;

    -- 6. Registrar pago
    INSERT INTO public.pago (
        negocio_id,
        venta_id,
        metodo,
        monto,
        moneda,
        estado,
        culqi_charge_id,
        referencia
    ) VALUES (
        p_negocio_id,
        v_venta_id,
        p_metodo_pago,
        v_total,
        'PEN',
        'COMPLETADO',
        p_culqi_charge_id,
        'Pago de ' || p_serie || '-' || LPAD(v_correlativo::TEXT, 8, '0')
    );

    RETURN jsonb_build_object(
        'venta_id', v_venta_id,
        'serie', p_serie,
        'correlativo', v_correlativo,
        'total', v_total,
        'movimiento_id', v_movimiento_id
    );
END;
$$;


-- ==============================================================================
-- 4. CONTROL DE INTEGRIDAD: Impedir mutación de stock fuera de las funciones
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.verificar_mutacion_stock_permitida()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la bandera de sesión no está activa y el stock cambia, bloquear la operación
    IF current_setting('app.allow_inventory_update', true) IS DISTINCT FROM 'true' THEN
        IF OLD.stock_actual IS DISTINCT FROM NEW.stock_actual THEN
            RAISE EXCEPTION 'Operación denegada: El stock de inventario no puede modificarse directamente. Utilice registrar_movimiento(), registrar_compra() o registrar_venta().';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bloquear_modificacion_directa_stock ON public.inventario;
CREATE TRIGGER trg_bloquear_modificacion_directa_stock
    BEFORE UPDATE ON public.inventario
    FOR EACH ROW EXECUTE FUNCTION public.verificar_mutacion_stock_permitida();


-- ==============================================================================
-- 5. TRIGGER DE AUDITORÍA: Registro de cambios sensibles
-- ==============================================================================
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
        datos_nuevos
    ) VALUES (
        v_negocio_id,
        v_usuario_id,
        TG_TABLE_NAME,
        v_registro_id,
        TG_OP,
        v_datos_ant,
        v_datos_nuev
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adjuntar auditoría a tablas sensibles del negocio
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


-- ==============================================================================
-- 6. FUNCIÓN DE ONBOARDING: registrar_negocio_y_admin
-- Crea negocio, almacén Principal y vincula auth.uid() como admin en public.usuarios.
-- ==============================================================================
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

    -- 4. Sembrar unidades de medida estándar para uso inmediato
    INSERT INTO public.unidad_medida (negocio_id, codigo, nombre) VALUES
        (v_negocio_id, 'UND', 'Unidad'),
        (v_negocio_id, 'KG', 'Kilogramo'),
        (v_negocio_id, 'MTR', 'Metro'),
        (v_negocio_id, 'LT', 'Litro'),
        (v_negocio_id, 'CJ', 'Caja')
    ON CONFLICT (negocio_id, codigo) DO NOTHING;

    -- 5. Sembrar categoría base
    INSERT INTO public.categoria (negocio_id, nombre, descripcion) VALUES
        (v_negocio_id, 'General', 'Artículos varios')
    ON CONFLICT (negocio_id, nombre) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'negocio_id', v_negocio_id,
        'almacen_id', v_alm_central_id,
        'sedes', jsonb_build_array(v_alm_central_id, v_alm_norte_id, v_alm_sur_id),
        'usuario_id', v_user_id
    );
END;
$$;
