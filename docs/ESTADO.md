# Estado del Proyecto WMS
- Sistema: Next.js 16.4 (Turbopack) + React 19 + Supabase SSR multi-tenant con RLS.
- Arquitectura: 18 tablas UUID en PostgreSQL con funciones transaccionales (bloqueo FOR UPDATE).
- Sedes y Logística: Ciclo completo inter-sedes (despacho salida, camión en ruta, recepción entrada) y Guía de Traslado interna imprimible.
- Proveedores: Directorio maestro (/admin/proveedores) con RUC SUNAT, contactos, drawer de alta/edición y estado activo/inactivo.
- Módulos 100% operativos: Productos, Inventario físico (toma de conteo y mermas), Kardex, Compras, POS, Proveedores y Sedes.
- Usuarios: Modelo SaaS B2B con invitación oficial por correo (Supabase Auth), baja inmediata y alta de empresa aislada.
- Reportes: Motor nativo OpenXML (.xlsx) sin dependencias con gráficos DrawingML, fórmulas y resumen + fallback CSV.
- Identidad visual: Cuaderno de bodega editorial (Manrope, papel #FAFAF7, tinta #16201C, radios max 6px/8px).
- Verificación: Auditoría total completada; `npm run build` y `npm run lint` limpios (0 errores, 0 warnings).
