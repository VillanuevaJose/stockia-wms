# Stockia · Sistema de Gestión de Almacén e Inventario (WMS)

**Stockia** es un sistema SaaS multi-tenant de gestión de almacenes, control de inventario físico en tiempo real, trazabilidad por Kárdex valorizado, compras a proveedores y punto de venta (POS) para mostrador. Desarrollado con Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4 y Supabase (PostgreSQL transaccional con RLS estricto).

---

## 1. Requisitos Previos

- **Node.js**: Versión 20.x o superior (recomendado Node 22 o 24 LTS).
- **Gestor de paquetes**: `npm` v10+ (o `pnpm` / `bun`).
- **Base de Datos**: Proyecto en [Supabase](https://supabase.com).

---

## 2. Variables de Entorno

Copia la plantilla `.env.example` como `.env.local` y configura tus credenciales:

```bash
cp .env.example .env.local
```

### Variables requeridas:
- `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima pública del proyecto.
- `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de administración (usada estrictamente en servidor para aprovisionar subusuarios y sincronizar perfiles con RBAC).

### Variables opcionales (Pasarela Culqi):
- `NEXT_PUBLIC_CULQI_PUBLIC_KEY`: Llave pública de Culqi.
- `CULQI_SECRET_KEY`: Llave secreta de Culqi.
*(Si estas dos variables no se configuran, la pasarela Culqi se mantendrá oculta automáticamente sin arrojar errores).*

---

## 3. Configuración de Base de Datos en Supabase

En el **SQL Editor** de tu proyecto Supabase, ejecuta los scripts ubicados en la carpeta `supabase/` en el siguiente orden estricto:

1. **`supabase/01_schema.sql`**: Crea las 17 tablas estándar con claves UUID, índices optimizados y restricciones de integridad.
2. **`supabase/02_funciones.sql`**: Despliega las funciones transaccionales con bloqueo pesimista `FOR UPDATE` (`registrar_movimiento`, `registrar_compra`, `registrar_venta`, `registrar_negocio_y_admin`).
3. **`supabase/03_rls.sql`**: Activa la seguridad a nivel de filas (Row Level Security) garantizando el aislamiento absoluto entre empresas.
4. **`supabase/04_seed.sql`** *(OPCIONAL / SOLO DEMO)*: Datos sintéticos para pruebas iniciales si deseas explorar la app con registros de ejemplo.
5. **`supabase/05_limpiar_datos.sql`**: Script de `TRUNCATE CASCADE` para vaciar todas las tablas de datos y dejar la base de datos limpia al 100% para entregar a un cliente real.

---

## 4. Instalación y Ejecución

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Compilación para producción
npm run build
npm run start
```

La aplicación estará accesible en `http://localhost:3000`.

---

## 5. Puesta en Marcha: Primer Usuario y Negocio

1. Dirígete a la ruta `/registro`.
2. Completa los datos iniciales:
   - **Nombre y Apellidos**: Nombre del administrador o dueño.
   - **Nombre de la Empresa o Almacén**: Nombre del negocio (ej. "Comercializadora Andina S.A.C.").
   - **RUC** *(Opcional)*: 11 dígitos numéricos.
   - **Correo corporativo** y **Contraseña**.
3. Al enviar el formulario, el sistema ejecuta de forma atómica:
   - Crea el usuario en Supabase Auth.
   - Crea la entidad `negocio` (tenant).
   - Genera el primer almacén `Principal` (ALM-01).
   - Registra al usuario con rol `admin` en `public.usuarios`.
   - Inicializa las unidades de medida base (UND, KG, MTR, LT, CJ) y la categoría "General".
4. Ingresarás directamente a `/admin`.

---

## 6. Gestión de Roles y Permisos (RBAC)

El sistema soporta 3 perfiles operativos:

| Rol | Privilegios y Rutas Permitidas |
| :--- | :--- |
| **Administrador (`admin`)** | Acceso irrestricto: catálogo, inventario, compras, ventas, usuarios, sedes, configuración y auditoría. |
| **Jefe de Almacén (`almacenero`)** | Operaciones de custodia: Inventario físico, Kardex de movimientos, compras a proveedores y catálogo de productos. |
| **Vendedor (`vendedor`)** | Operaciones de mostrador: Punto de Venta (POS) `/vendedor`, consulta de stock y catálogo de productos en solo lectura. |

### Cómo crear cuentas para el personal:
Desde `/admin/usuarios`, el administrador hace clic en **"Nuevo Colaborador"**, ingresa los datos del operador, selecciona su rol (`almacenero` o `vendedor`) y asigna una contraseña temporal.

---

## 7. Guía de Pruebas Manuales Paso a Paso

Para comprobar la operatividad completa de extremo a extremo:

1. **Creación de Producto**:
   - Ingresa a `/admin/productos` y presiona **"Nuevo Producto"**.
   - Ingresa Nombre, SKU único, Costo (ej. S/ 20.00), Precio de Venta (ej. S/ 35.00) y Stock Inicial (ej. 10 unidades).
   - Verifica que el producto aparezca en la tabla y que el stock inicial se refleje en `/admin/inventario`.
2. **Recepción de Compra (Abastecimiento)**:
   - Ve a `/admin/compras` y abre **"Nueva Orden de Compra"**.
   - Selecciona o escribe un nuevo proveedor, ingresa N° de Factura, agrega el producto y confirma.
   - Verifica que se genere una `ENTRADA` automática en `/admin/movimientos` (Kardex) y suba el stock.
3. **Punto de Venta (Venta en Mostrador)**:
   - Dirígete a `/vendedor` (o accede desde el menú lateral).
   - Busca el producto por nombre o SKU y presiona "+".
   - Selecciona método de pago (Efectivo o Yape/Plin) y pulsa **"Registrar Venta"**.
   - Confirma la emisión del comprobante (B001) y verifica que el stock disponible haya disminuido en tiempo real.
4. **Trazabilidad en Kardex**:
   - Revisa `/admin/movimientos` y filtra por "SALIDA" o "ENTRADA" para auditar cada transacción.
5. **Exportación de Reportes**:
   - En `/admin/inventario`, haz clic en **"Exportar CSV"**. Descarga y abre el archivo en Excel para validar el formato y valorización.

---

## 8. Despliegue en Producción

El proyecto está preparado para desplegarse con un clic en **Vercel**:
1. Conecta tu repositorio de GitHub a Vercel.
2. Agrega las variables de entorno de producción (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Despliega con el framework preset `Next.js`.
