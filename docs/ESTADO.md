# Estado del Proyecto WMS
- Sistema: Next.js 16.4 (Turbopack) + React 19 + Supabase SSR multi-tenant con RLS.
- Arquitectura: 18 tablas UUID en PostgreSQL con funciones transaccionales (bloqueo FOR UPDATE).
- Onboarding: Registro de negocio, 3 sedes operativas y admin mediante `registrar_negocio_y_admin`.
- Sedes: Red oficial de 3 sedes (Central, Norte Callao, Sur Lurín) con módulo de comunicación e historial.
- Módulos 100% operativos: Productos, Inventario físico, Kardex, Compras, POS, Categorías y Sedes.
- Usuarios: RBAC completo en `proxy.ts` (admin, almacenero, vendedor) y aprovisionamiento seguro.
- Reportes: Descargas CSV UTF-8 con BOM para Excel de inventario, movimientos y ventas.
- Identidad visual: Cuaderno de bodega editorial (Manrope, papel #FAFAF7, tinta #16201C, radios max 6px/8px).
- Verificación: `npm run build`, `npx tsc --noEmit` y `npm run lint` limpios (0 errores).
