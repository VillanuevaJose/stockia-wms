# Arquitectura de Base de Datos - WMS Ligero (Fase 2A)

Este directorio contiene los scripts DDL y DML para transformar el prototipo inicial en un **Sistema de Gestión de Almacén e Inventario (WMS / SGA)** con control de stock multi-almacén, kardex transaccional, trazabilidad de compras y ventas, pasarela de pagos (preparada para Culqi) y seguridad RBAC con RLS.

---

## 1. Orden Estricto de Migraciones (`supabase/migrations/`)

Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard) > **SQL Editor** > **New Query**, o ejecuta las migraciones numeradas en orden:

| Migración | Archivo | Propósito |
| :--- | :--- | :--- |
| **001** | [`001_esquema_inicial.sql`](./migrations/001_esquema_inicial.sql) | DDL maestro: enums, tablas del sistema, llaves foráneas, índices de búsqueda y tabla de auditoría con soporte dual. |
| **002** | [`002_trigger_crear_perfil.sql`](./migrations/002_trigger_crear_perfil.sql) | Trigger transaccional que enlaza automáticamente nuevos registros de `auth.users` con el perfil `public.usuarios`. |
| **003** | [`003_roles_y_permisos_rbac.sql`](./migrations/003_roles_y_permisos_rbac.sql) | Funciones de seguridad RBAC (`mi_negocio_id()`, `mi_rol()`, `es_admin()`). |
| **004** | [`004_politicas_rls.sql`](./migrations/004_politicas_rls.sql) | Políticas Row Level Security para aislamiento multi-tenant y restricción de perfiles de usuario. |
| **005** | [`005_funciones_kardex_movimientos.sql`](./migrations/005_funciones_kardex_movimientos.sql) | Procedimiento `registrar_movimiento` con bloqueo pesimista `FOR UPDATE` e integridad contra mutaciones directas de stock. |
| **006** | [`006_funciones_compras_y_ventas.sql`](./migrations/006_funciones_compras_y_ventas.sql) | Lógica transaccional de compras y punto de venta (POS) con generación de correlativos y pagos. |
| **007** | [`007_auditoria_sistema.sql`](./migrations/007_auditoria_sistema.sql) | Triggers de auditoría automática con captura de deltas JSON en tablas maestras. |
| **008** | [`008_comunicacion_inter_sedes.sql`](./migrations/008_comunicacion_inter_sedes.sql) | Módulo y tabla `solicitud_traslado` para requerimientos y comunicación formal entre sedes físicas. |
| **009** | [`009_asignacion_sedes_usuarios.sql`](./migrations/009_asignacion_sedes_usuarios.sql) | Asignación operativa de colaboradores a sedes físicas (`almacen_id`) por parte del Administrador. |
| **010** | [`010_semillas_y_catalogo_inicial.sql`](./migrations/010_semillas_y_catalogo_inicial.sql) | Semilla base: 1 empresa, 3 sedes físicas (Central, Norte, Sur), categorías y catálogo inicial con stock. |

---

## 2. Generación de Tipos TypeScript (`types/database.ts`)

Los tipos de TypeScript ya fueron generados y tipados estrictamente en [`types/database.ts`](../types/database.ts). 

Si deseas regenerarlos directamente desde la API de Supabase en el futuro una vez ejecutados los scripts SQL:
1. Inicia sesión en la CLI de Supabase con tu token personal:
   ```bash
   npx supabase login
   ```
2. Ejecuta la introspección del proyecto:
   ```bash
   npx supabase gen types typescript --project-id adyqyqjbqzhfhdajvkzz > types/database.ts
   ```

---

## 3. Diagrama Entidad-Relación (Mermaid `erDiagram`)

```mermaid
erDiagram
    NEGOCIO ||--o{ USUARIOS : "emplea"
    NEGOCIO ||--o{ ALMACEN : "posee"
    NEGOCIO ||--o{ CATEGORIA : "clasifica"
    NEGOCIO ||--o{ UNIDAD_MEDIDA : "define"
    NEGOCIO ||--o{ PRODUCTOS : "comercializa"
    NEGOCIO ||--o{ PROVEEDOR : "registra"
    NEGOCIO ||--o{ CLIENTE : "atiende"
    NEGOCIO ||--o{ MOVIMIENTO_INVENTARIO : "audita"
    NEGOCIO ||--o{ COMPRA : "adquiere"
    NEGOCIO ||--o{ VENTA : "factura"

    CATEGORIA ||--o{ PRODUCTOS : "agrupa"
    UNIDAD_MEDIDA ||--o{ PRODUCTOS : "cuantifica"

    PRODUCTOS ||--o{ INVENTARIO : "registrado_en"
    ALMACEN ||--o{ INVENTARIO : "alberga"

    USUARIOS ||--o{ MOVIMIENTO_INVENTARIO : "ejecuta"
    ALMACEN ||--o{ MOVIMIENTO_INVENTARIO : "origen_de"
    ALMACEN ||--o{ MOVIMIENTO_INVENTARIO : "destino_de"
    MOVIMIENTO_INVENTARIO ||--|{ DETALLE_MOVIMIENTO : "desglosa"
    PRODUCTOS ||--o{ DETALLE_MOVIMIENTO : "incluido_en"

    PROVEEDOR ||--o{ COMPRA : "abastece"
    ALMACEN ||--o{ COMPRA : "recibe"
    USUARIOS ||--o{ COMPRA : "registra"
    COMPRA ||--|{ DETALLE_COMPRA : "contiene"
    PRODUCTOS ||--o{ DETALLE_COMPRA : "comprado_en"
    COMPRA ||--o| MOVIMIENTO_INVENTARIO : "genera_entrada"

    CLIENTE ||--o{ VENTA : "compra"
    ALMACEN ||--o{ VENTA : "despacha"
    USUARIOS ||--o{ VENTA : "emite"
    VENTA ||--|{ DETALLE_VENTA : "contiene"
    PRODUCTOS ||--o{ DETALLE_VENTA : "vendido_en"
    VENTA ||--o| MOVIMIENTO_INVENTARIO : "genera_salida"

    VENTA ||--o{ PAGO : "cobra"

    NEGOCIO {
        uuid id PK
        string nombre
        string ruc UK
        string direccion
        string telefono
        boolean activo
    }

    USUARIOS {
        uuid id PK "auth.users"
        uuid negocio_id FK
        string email
        string nombre_completo
        rol_usuario rol
        boolean activo
    }

    ALMACEN {
        uuid id PK
        uuid negocio_id FK
        string nombre
        string codigo
        boolean es_principal
    }

    PRODUCTOS {
        uuid id PK
        uuid negocio_id FK
        uuid categoria_id FK
        uuid unidad_medida_id FK
        string sku UK
        string codigo_barras
        string nombre
        numeric costo
        numeric precio_venta
        numeric precio_soles "compatibilidad"
        numeric stock "suma_almacenes"
    }

    INVENTARIO {
        uuid id PK
        uuid almacen_id FK
        uuid producto_id FK
        numeric stock_actual
        string ubicacion
    }

    MOVIMIENTO_INVENTARIO {
        uuid id PK
        uuid negocio_id FK
        tipo_movimiento tipo
        string motivo
        uuid usuario_id FK
        uuid almacen_origen_id FK
        uuid almacen_destino_id FK
        string referencia_tipo
        uuid referencia_id
        timestamptz fecha
    }

    DETALLE_MOVIMIENTO {
        uuid id PK
        uuid movimiento_id FK
        uuid producto_id FK
        numeric cantidad
        numeric costo_unitario
    }

    COMPRA {
        uuid id PK
        uuid negocio_id FK
        uuid proveedor_id FK
        uuid almacen_destino_id FK
        string numero_comprobante
        numeric total
        uuid movimiento_id FK
    }

    VENTA {
        uuid id PK
        uuid negocio_id FK
        uuid cliente_id FK
        uuid almacen_origen_id FK
        string serie
        integer correlativo
        numeric subtotal
        numeric impuesto
        numeric total
        uuid movimiento_id FK
    }

    PAGO {
        uuid id PK
        uuid negocio_id FK
        uuid venta_id FK
        metodo_pago metodo
        numeric monto
        string culqi_charge_id
    }

    AUDITORIA {
        uuid id PK
        uuid negocio_id FK
        uuid usuario_id FK
        string tabla
        uuid registro_id
        string accion
        jsonb datos_anteriores
        jsonb datos_nuevos
    }
```

---

## 4. Garantías de Concurrencia e Integridad del Kardex

1. **Prevención de condiciones de carrera:** Al procesar movimientos de salida o traslados, `registrar_movimiento` aplica `SELECT stock_actual ... FOR UPDATE` sobre la tabla `inventario`. Esto bloquea la fila a nivel de transacción PostgreSQL, evitando que dos ventas o despachos concurrentes sobrevenda stock físico.
2. **Imposibilidad de stock negativo:** Si la cantidad requerida supera el `stock_actual` bloqueado, se lanza una excepción inmediata que revierte (`ROLLBACK`) toda la transacción.
3. **Bloqueo contra edición manual:** El trigger `trg_bloquear_modificacion_directa_stock` rechaza cualquier `UPDATE` directo a la columna `stock_actual` de `inventario` si no proviene de las funciones transaccionales autorizadas.
