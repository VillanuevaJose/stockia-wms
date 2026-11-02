-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 005_funciones_kardex_movimientos.sql: Movimientos de inventario, Kardex y control de concurrencia
-- ==============================================================================

-- 1. FUNCIÓN TRANSACCIONAL: registrar_movimiento
-- Gestiona entradas, salidas, mermas, ajustes y transferencias entre sedes con bloqueo pesimista FOR UPDATE.
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

        -- C) TRANSFERENCIA ENTRE ALMACENES
        ELSIF p_tipo = 'TRANSFERENCIA' THEN
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

-- 2. CONTROL DE INTEGRIDAD: Impedir mutación de stock fuera de las funciones transaccionales
CREATE OR REPLACE FUNCTION public.verificar_mutacion_stock_permitida()
RETURNS TRIGGER AS $$
BEGIN
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
