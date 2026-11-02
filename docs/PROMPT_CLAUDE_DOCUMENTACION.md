# PROMPT MAESTRO PARA CLAUDE: GENERACIÓN DE DOCUMENTACIÓN ACADÉMICA (PARTES 0 A 7)

Copia y pega todo el texto dentro del siguiente bloque en **Claude** (Claude 3.7 Sonnet o Claude 3.5 Sonnet) para que redacte el documento técnico completo de tu entrega universitaria con el máximo rigor y fidelidad a tu código:

---

```markdown
Actúa como Arquitecto de Software Senior y Docente Universitario de Ingeniería de Software. Tu tarea es redactar la documentación técnica y académica exhaustiva de un sistema web real denominado **"Stockia WMS"** (Sistema de Gestión de Almacén e Inventario Multi-Sede y Multi-Tenant).

Debes seguir con precisión milimétrica la estructura, reglas y tablas exigidas por la rúbrica oficial de la universidad ("ESQUEMA PRÁCTICO PARA DOCUMENTAR EL DESARROLLO DE UN SISTEMA WEB: Desde el análisis hasta la puesta en marcha"), abarcando desde la **Sección 0 hasta la Sección 7 (Desarrollo del sistema por módulos)**.

---

### CRITERIOS CENTRALES DE EVALUACIÓN Y FORMATO (RÚBRICA OBLIGATORIA)
1. **Claridad y reproducibilidad:** Un evaluador o estudiante debe poder replicar o comprender la construcción paso a paso únicamente con este documento.
2. **Cero código sin explicar:** Todo comando y fragmento de código debe llevar su explicación técnica de por qué se usa y qué resuelve.
3. **Seguridad y privacidad:** Ocultar tokens, claves de servicio (`service_role`), URLs privadas y contraseñas (usar formato `NEXT_PUBLIC_SUPABASE_ANON_KEY=********`).
4. **Formato obligatorio de procedimiento (Secciones 3, 4, 5 y 6):**
   Cada paso técnico debe estructurarse obligatoriamente en una tabla con los siguientes 10 campos:
   | Elemento | Qué debe contener |
   | :--- | :--- |
   | **Paso** | Nombre claro de la actividad técnica. |
   | **Objetivo** | Qué se desea conseguir en este paso. |
   | **Acción** | Qué se hizo y en qué orden secuencial. |
   | **Comando / código** | Comando de terminal o bloque de configuración exacto. |
   | **Explicación** | Qué hace internamente y por qué se usa. |
   | **Evidencia** | Instrucción exacta del pantallazo o resultado a adjuntar (ej: `[Captura: Terminal ejecutando npm run dev en puerto 3000]`). |
   | **Resultado esperado** | Qué debería ocurrir si todo está correcto. |
   | **Error frecuente** | Problema común encontrado (si aplica). |
   | **Solución** | Cómo se corrigió dicho problema. |
   | **Verificación** | Cómo se comprobó empíricamente que funciona. |

5. **Plantilla obligatoria para cada módulo (Sección 7):**
   Para CADA módulo implementado, debes utilizar de manera estricta y sin omitir ítems la siguiente estructura:
   - **7.x.1 Objetivo del módulo:** Finalidad funcional y operativa.
   - **7.x.2 Requerimiento que atiende:** Vínculo con el código de requerimiento funcional (RF-XX).
   - **7.x.3 Archivos creados o modificados:** Rutas relativas exactas de páginas, componentes y Server Actions.
   - **7.x.4 Diseño o captura de la interfaz:** Instrucción detallada de qué captura de pantalla colocar (elementos visuales, tablas, formularios, modales).
   - **7.x.5 Código principal:** Fragmentos limpios, reales y relevantes de código TypeScript / React / Server Actions / SQL.
   - **7.x.6 Explicación del código:** Desglose técnico de la lógica (manejo de estado, renderizado en servidor, llamadas asíncronas).
   - **7.x.7 Operaciones implementadas:** Crear (C), Listar (R), Buscar/Filtrar, Editar (U), Eliminar/Anular (D), o acciones transaccionales.
   - **7.x.8 Validaciones realizadas:** Esquemas de validación con Zod en servidor, restricciones de tipos TypeScript y restricciones de base de datos.
   - **7.x.9 Prueba del módulo:** Caso de prueba paso a paso para verificar el funcionamiento en el navegador.
   - **7.x.10 Errores encontrados y solución:** Problema técnico real que surgió en desarrollo y cómo se solucionó en el código.

---

### DATOS TÉCNICOS REALES DEL PROYECTO (EXTRACCIÓN DEL CÓDIGO FUENTE)
Usa estos datos exactos y verídicos del repositorio para que la documentación sea 100% auténtica:

- **Nombre del Sistema:** Stockia WMS (Warehouse Management System / SGA Ligero).
- **Stack Tecnológico:**
  - **Frontend:** Next.js 16.4.0 (App Router, Server Components y Server Actions), React 19.3.0, TypeScript 5.x.
  - **Estilos e Identidad:** Tailwind CSS v4, sistema visual editorial "cuaderno de bodega" (#FAFAF7 fondo papel, #16201C tinta, radios contenidos de 6px a 8px, tipografía Manrope + JetBrains Mono para SKUs y cifras).
  - **Backend & Base de Datos:** Supabase (PostgreSQL 15+, Supabase Auth con JWT, RLS nativo, funciones almacenadas PL/pgSQL transaccionales).
  - **Librería de Acceso a Datos:** `@supabase/ssr` versión 0.12.7 con segregación en `lib/supabase/server.ts` (cliente seguro por cookie) y `lib/supabase/admin.ts` (`service_role` restringido al backend).
  - **Validación:** Zod 4.6.7 (`lib/validations/auth.ts`, esquemas de productos, ventas y traslados).
  - **Middleware / Seguridad de Rutas:** Proxy nativo en `proxy.ts` con verificación en memoria de cookies (`auth-fast.ts`) para evitar latencia de red en cada petición.

- **Modelo de Base de Datos (18 tablas relacionales con UUID y aislamiento multi-tenant por `negocio_id`):**
  1. `negocio`: Tenancy empresarial, RUC de 11 dígitos, razón social.
  2. `usuarios`: Perfiles asociados a `auth.users`, roles ('admin', 'almacenero', 'vendedor'), sede asignada (`almacen_id`).
  3. `almacen`: Sedes físicas del negocio (ej. Sede Central Principal, Sede Norte Callao, Sede Sur Lurín).
  4. `categoria`: Familias de artículos (Herramientas, Abrasivos, Pinturas, EPP).
  5. `unidad_medida`: Unidades de cuantificación (Unidades, Metros, Kilos, Cajas).
  6. `productos`: Catálogo maestro con SKU único, código de barras, nombre, precio unitario de venta (`precio_venta` / `precio_soles`), costo ponderado y stock consolidado.
  7. `inventario`: Stock físico desacoplado por sede (`almacen_id`, `producto_id`, `stock_actual`, `ubicacion`).
  8. `movimiento_inventario`: Cabecera del Kardex transaccional (`tipo`: ENTRADA, SALIDA, TRASLADO, AJUSTE), usuario ejecutor, sede origen y sede destino.
  9. `detalle_movimiento`: Líneas de detalle del movimiento con cantidades y costos unitarios.
  10. `solicitud_traslado`: Módulo de comunicación y requisiciones inter-sedes (PENDIENTE, APROBADA, RECHAZADA, COMPLETADA).
  11. `proveedor`: Registro de proveedores para abastecimiento.
  12. `compra`: Órdenes de abastecimiento de mercadería con número de comprobante y total.
  13. `detalle_compra`: Desglose de productos comprados que alimentan automáticamente el Kardex de entrada.
  14. `cliente`: Clientes para venta en mostrador o mayoristas.
  15. `venta`: Comprobantes de salida por venta (POS) con serie, correlativo, subtotal, IGV y total.
  16. `detalle_venta`: Artículos vendidos que descuentan stock en tiempo real.
  17. `pago`: Transacciones de cobro (EFECTIVO, TARJETA, TRANSFERENCIA, CULQI) vinculado a la venta.
  18. `auditoria`: Registro de auditoría con triggers automáticos que capturan `datos_anteriores` y `datos_nuevos` en formato JSONB.

- **Módulos que componen el sistema (para la Sección 7):**
  - **Módulo 1:** Autenticación, Onboarding y Control de Acceso RBAC (`app/login/`, `app/registro/`, `proxy.ts`, `lib/supabase/auth-fast.ts`).
  - **Módulo 2:** Red de Sedes y Almacenes Físicos (`app/admin/almacenes/`, `lib/queries/sedes.ts`, `lib/actions/sedes.ts`).
  - **Módulo 3:** Catálogo de Productos y Categorías con Carga Masiva CSV (`app/admin/productos/`, `app/admin/categorias/`, `app/admin/editar/[id]/`, `productos_carga_masiva_20.csv`).
  - **Módulo 4:** Control de Inventario Físico por Sede y Alertas de Stock (`app/admin/inventario/`, tabla `inventario`).
  - **Módulo 5:** Kardex Transaccional y Transferencias Inter-Sedes con Bloqueo Pesimista (`app/admin/movimientos/`, procedimiento `registrar_movimiento` con `SELECT ... FOR UPDATE`).
  - **Módulo 6:** Compras y Abastecimiento de Mercadería (`app/admin/compras/`, `lib/actions/compras.ts`).
  - **Módulo 7:** Punto de Venta (POS) y Despacho de Mercadería (`app/admin/ventas/`, `app/vendedor/`, `lib/actions/ventas.ts`).
  - **Módulo 8:** Auditoría y Trazabilidad de Operaciones (`app/admin/auditoria/`, triggers PostgreSQL con deltas JSON).
  - **Módulo 9:** Reportes y Exportación a Microsoft Excel con BOM UTF-8 (`app/api/reportes/[tipo]/route.ts`).

- **Garantías de Concurrencia e Integridad Técnicas:**
  - Bloqueo de concurrencia a nivel de base de datos con `FOR UPDATE` para evitar condiciones de carrera y sobreventa.
  - Trigger `trg_bloquear_modificacion_directa_stock` que rechaza modificaciones directas sobre `inventario.stock_actual` fuera del procedimiento transaccional.
  - Aislamiento multi-tenant garantizado mediante RLS con la función `mi_negocio_id()`.

---

### ESTRUCTURA QUE DEBES REDACTAR COMPLETA (SECCIONES 0 A 7)

Redacta de manera profesional y detallada las siguientes secciones:

# PORTADA DEL DOCUMENTO
- Título: ESQUEMA PRÁCTICO PARA DOCUMENTAR EL DESARROLLO DE UN SISTEMA WEB: Desde el análisis hasta la puesta en marcha
- Sistema: Stockia WMS (Sistema de Gestión de Almacén e Inventario Multi-Sede)
- Integrantes: [Espacio para nombres de los estudiantes]
- Asignatura: Desarrollo de Sistemas Web / Ingeniería de Software
- Fecha: Noviembre 2026

## 0. Reglas de presentación
- Explicación de los principios de documentación aplicados.
- Especificación del formato de procedimiento (la tabla de 10 campos).
- Políticas de seguridad aplicadas (ocultamiento de credenciales, hashes de contraseña en Supabase Auth, tokens de sesión HttpOnly).

## 1. Presentación y análisis del proyecto
- **1.1 Nombre del sistema y nombre del grupo:** Stockia WMS.
- **1.2 Problema que resuelve:** Pérdida de trazabilidad por hojas de cálculo, desabastecimiento / sobrestock, falta de control en múltiples sedes físicas, ausencia de auditoría y mezcla indebida de roles.
- **1.3 Usuarios principales:** Administrador General, Almacenero/Jefe de Bodega, Vendedor/Cajero.
- **1.4 Objetivo general:** Diseñar, desarrollar e implementar una aplicación web moderna (WMS ligero) con arquitectura multi-sede y multi-tenant que garantice la integridad transaccional del stock y la segregación de funciones mediante RBAC y RLS.
- **1.5 Alcance (Qué incluye y qué no incluye):**
  - *Qué incluye:* Registro de empresa, gestión de 3 sedes oficiales, catálogo de productos con SKU y variantes, carga masiva CSV, control de inventario físico por sede, kardex de entradas/salidas/traslados con bloqueo pesimista `FOR UPDATE`, solicitudes inter-sedes, compras a proveedores, módulo de ventas POS con cálculo de impuestos y correlativo, auditoría con logs JSONB, exportación de reportes a Excel con BOM UTF-8 y seguridad RBAC en middleware.
  - *Qué no incluye:* Pasarela de pagos bancaria en producción real (se incluye sandbox/estructura Culqi), facturación electrónica conectada directamente con OSE/SUNAT en tiempo real, app móvil nativa en tiendas (se diseñó web responsive para dispositivos móviles desde 360px).
- **1.6 Requerimientos del Sistema:**
  - *Requerimientos Funcionales (RF01 al RF10):* Detallados con código, nombre y descripción.
  - *Requerimientos No Funcionales (RNF01 al RNF06):* Seguridad RLS, Rendimiento con Server Components (0ms de latencia de hidratación en vistas de solo lectura), Concurrencia transaccional ACID, Accesibilidad WCAG 2.1 AA, Responsive mobile-first, Integridad referencial estricta.
- **1.7 Roles de usuario:** Tabla completa (Rol | Funciones principales | Restricciones) para `admin`, `almacenero` y `vendedor`.

## 2. Diseño del sistema
- **2.1 Modelo Entidad-Relación:**
  - Diagrama Mermaid en bloque `erDiagram` con las 18 entidades y sus relaciones/cardinalidades exactas.
- **2.2 Diccionario de datos:**
  - Tablas formales completas con las columnas: `Campo` | `Tipo` | `PK/FK` | `Restricción` | `Descripción` para las entidades maestras (`negocio`, `usuarios`, `almacen`, `categoria`, `productos`, `inventario`, `movimiento_inventario`, `detalle_movimiento`, `compra`, `venta`, `solicitud_traslado`, `auditoria`).
- **2.3 Arquitectura del sistema y tecnologías utilizadas:**
  - Diagrama de flujo de arquitectura: `Usuario (Navegador) → Middleware Proxy (RBAC en memoria) → Next.js 16 Server Components / Server Actions → Supabase Client (@supabase/ssr) → PostgreSQL 15 (RLS + Funciones PL/pgSQL) → Respuestas / Exportaciones CSV`.
  - Cuadro comparativo y justificación de tecnologías (Next.js 16, React 19, Supabase, Tailwind CSS v4, Zod, TypeScript).

## 3. Preparación del entorno de desarrollo
Redactar cada paso con la **tabla de formato obligatorio (Paso, Objetivo, Acción, Comando/código, Explicación, Evidencia, Resultado esperado, Error frecuente, Solución, Verificación)**:
- Paso 3.1: Instalación de Node.js (LTS v20+) y gestor npm.
- Paso 3.2: Instalación de Git y configuración de identidad global (`git config`).
- Paso 3.3: Instalación y configuración de Visual Studio Code (con extensiones: ESLint, Tailwind CSS IntelliSense, Prettier, PostCSS).
- Paso 3.4: Creación de organización y proyecto en Supabase Cloud.
- Comandos de verificación ejecutados en terminal (`node -v`, `npm -v`, `git --version`).

## 4. Creación inicial del proyecto
Redactar con la **tabla de formato obligatorio**:
- Paso 4.1: Ejecución del comando de inicialización Next.js con App Router y TypeScript:
  `npx create-next-app@latest stockia-wms --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"`
- Paso 4.2: Estructura inicial de carpetas y explicación de archivos raíz (`package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`).
- Paso 4.3: Primera ejecución local con Turbopack (`npm run dev`) y comprobación en `http://localhost:3000`.

## 5. Git y GitHub
Redactar con la **tabla de formato obligatorio**:
- Paso 5.1: Inicialización del repositorio local y configuración de `.gitignore` para salvaguardar `.env.local` y `node_modules`.
- Paso 5.2: Creación del primer commit estructurado (`git add .`, `git commit -m "feat: arquitectura base WMS multi-sede"`).
- Paso 5.3: Vinculación con repositorio remoto en GitHub (`git branch -M main`, `git remote add origin https://github.com/...`, `git push -u origin main`).
- Paso 5.4: Estrategia de commits semánticos y enlace al repositorio.

## 6. Base de datos en Supabase
Redactar con la **tabla de formato obligatorio**:
- Paso 6.1: Creación del proyecto en Supabase Dashboard y selección de región.
- Paso 6.2: Ejecución secuencial del esquema DDL en SQL Editor (tablas, UUIDs, llaves foráneas `ON DELETE CASCADE / RESTRICT` y restricciones `CHECK`).
- Paso 6.3: Implementación de funciones transaccionales PL/pgSQL (`registrar_movimiento`, `registrar_negocio_y_admin`) con bloqueo pesimista `SELECT ... FOR UPDATE`.
- Paso 6.4: Configuración de políticas de seguridad a nivel de fila (Row Level Security - RLS) para aislamiento multi-tenant estricto.
- Paso 6.5: Creación del archivo de variables de entorno `.env.local` conectando `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sin exponer credenciales secretas).

## 7. Desarrollo del sistema por módulos
Redactar de forma exhaustiva CADA UNO de los módulos del proyecto utilizando estrictamente la **Plantilla de 10 puntos**:
- **7.1 Módulo 1: Autenticación, Onboarding y Control de Acceso RBAC**
  - Atiende: RF-01, RF-02.
  - Archivos: `app/login/page.tsx`, `app/registro/page.tsx`, `proxy.ts`, `lib/supabase/server.ts`, `lib/validations/auth.ts`.
  - Código real de validación con Zod y Server Action de autenticación con Supabase.
  - Explicación de cómo el middleware `proxy.ts` inspecciona cookies y protege rutas `/admin`, `/almacenero`, `/vendedor`.
- **7.2 Módulo 2: Red de Sedes y Almacenes Físicos**
  - Atiende: RF-03.
  - Archivos: `app/admin/almacenes/page.tsx`, `lib/queries/sedes.ts`, `lib/actions/sedes.ts`.
  - Gestión de sedes: Central Principal, Norte Callao, Sur Lurín; asignación de responsables y estado operativo.
- **7.3 Módulo 3: Catálogo de Productos y Categorías con Carga Masiva CSV**
  - Atiende: RF-04, RF-05.
  - Archivos: `app/admin/productos/page.tsx`, `app/admin/categorias/page.tsx`, `app/admin/editar/[id]/page.tsx`, `productos_carga_masiva_20.csv`.
  - Código de Server Action para inserción y actualización con resolución asíncrona de `params` (`await params`).
  - Lógica del parser de carga masiva CSV para productos de ferretería con SKU y precios unitarios.
- **7.4 Módulo 4: Control de Inventario Físico por Sede y Alertas de Stock**
  - Atiende: RF-06.
  - Archivos: `app/admin/inventario/page.tsx`, tabla `inventario`.
  - Visualización del stock por almacén con semáforos de advertencia (stock crítico, óptimo, sobrestock).
- **7.5 Módulo 5: Kardex Transaccional y Transferencias Inter-Sedes**
  - Atiende: RF-07, RF-08.
  - Archivos: `app/admin/movimientos/page.tsx`, `solicitud_traslado`, procedimiento `registrar_movimiento`.
  - Explicación del bloqueo pesimista `FOR UPDATE` en PostgreSQL para impedir condiciones de carrera.
  - Flujo de solicitudes de traslado entre almacenes (solicitud, aprobación, despacho y recepción).
- **7.6 Módulo 6: Compras y Abastecimiento de Mercadería**
  - Atiende: RF-09.
  - Archivos: `app/admin/compras/page.tsx`, `lib/actions/compras.ts`.
  - Registro de orden de compra a proveedor que dispara automáticamente una entrada al inventario físico en el almacén de destino.
- **7.7 Módulo 7: Punto de Venta (POS) y Despacho de Mercadería**
  - Atiende: RF-10.
  - Archivos: `app/admin/ventas/page.tsx`, `app/vendedor/page.tsx`, `lib/actions/ventas.ts`.
  - Selección de productos, validación de stock disponible antes de vender, cálculo de IGV, registro de venta y emisión de número de comprobante correlativo.
- **7.8 Módulo 8: Auditoría y Trazabilidad de Operaciones**
  - Atiende: RNF-01, RNF-02.
  - Archivos: `app/admin/auditoria/page.tsx`, tabla `auditoria`.
  - Triggers automáticos en base de datos que almacenan los cambios históricos en formato JSONB (`datos_anteriores` vs `datos_nuevos`).
- **7.9 Módulo 9: Reportes y Exportación a Microsoft Excel con BOM UTF-8**
  - Atiende: RF-11.
  - Archivos: `app/api/reportes/[tipo]/route.ts`.
  - Generación de reportes de inventario, movimientos y ventas con inyección de byte order mark `\uFEFF` para garantizar compatibilidad con tildes y caracteres especiales en Excel.

---

### REGLA DE SALIDA
Genera el documento en formato Markdown académico limpio, exhaustivo y estructurado, listo para ser convertido a PDF o Word. No uses abreviaciones como `// ... resto del código`. Proporciona código representativo, tablas completas con datos reales y placeholders exactos `[Captura: ...]` para que el estudiante inserte sus capturas de pantalla.
```

---
