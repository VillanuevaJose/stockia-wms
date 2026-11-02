-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 006_funciones_compras_y_ventas.sql: Lógica transaccional de compras, ventas y emisión de comprobantes
-- ==============================================================================

-- 1. FUNCIÓN TRANSACCIONAL: registrar_compra
-- Registra comprobante de compra, detalles, actualiza costo y genera entrada física mediante registrar_movimiento.
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


-- 2. FUNCIÓN TRANSACCIONAL: registrar_venta
-- Registra comprobante de venta, cobra pago y descuenta stock con bloqueo estricto FOR UPDATE.
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
