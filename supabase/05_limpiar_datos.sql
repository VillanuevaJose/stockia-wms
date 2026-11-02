-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ALMACÉN E INVENTARIO (WMS LIGERO)
-- 05_limpiar_datos.sql: Vaciado completo de tablas para entrega a cliente en producción
-- ADVERTENCIA: NO EJECUTAR AUTOMÁTICAMENTE. ESTE SCRIPT BORRA TODOS LOS DATOS.
-- ==============================================================================

BEGIN;

-- Desactivar temporalmente triggers de auditoría e inventario durante el vaciado
SET LOCAL session_replication_role = 'replica';

-- Truncar todas las tablas operativas, de catálogo, transaccionales y de negocio
TRUNCATE TABLE
    public.pago,
    public.detalle_venta,
    public.venta,
    public.detalle_compra,
    public.compra,
    public.detalle_movimiento,
    public.movimiento_inventario,
    public.inventario,
    public.productos,
    public.cliente,
    public.proveedor,
    public.almacen,
    public.categoria,
    public.unidad_medida,
    public.auditoria,
    public.usuarios,
    public.negocio
RESTART IDENTITY CASCADE;

-- Restaurar el rol normal de sesión
SET LOCAL session_replication_role = 'origin';

COMMIT;

-- ==============================================================================
-- NOTA IMPORTANTE:
-- Al ejecutar este script, la estructura de tablas, tipos ENUM, triggers, funciones
-- transaccionales y políticas RLS quedan 100% intactas y listas para que el cliente
-- registre su primer negocio desde la pantalla /registro.
-- ==============================================================================
