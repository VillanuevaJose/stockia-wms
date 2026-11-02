# WMS Almacén Central — Design Spine & Brief

**Superficie:** Sistema WMS de Gestión de Almacén e Inventario (Next.js 16 + React 19 + Tailwind v4 + Supabase).
**Dirección visual:** **Cuaderno de bodega editorial** con disciplina Vercel/Linear (monocromo, bordes de 1px, espacio generoso, densidad en tablas) pero con identidad propia y cálida, como un libro de operaciones impreso con maestría, sin clichés de SaaS genérico de IA.

---

## 1. Audiencia y Propósito
- **Audiencia:** Jefes de almacén, operadores logísticos, personal de despacho y ventas que pasan turnos completos operando el sistema.
- **Propósito:** Registro y control de existencias, trazabilidad de kardex en soles y operaciones con densidad informativa, alta legibilidad y cero fatiga visual.

---

## 2. Tipografía Oficial
- **Tipografía Unificada:** Manrope vía `next/font/google` (`--font-sans`) como fuente única para todo el proyecto (títulos, cifras, interfaz, login y registro).
- **Títulos:** Manrope 600-700, letter-spacing -0.02em, interlineado 1.15.
- **Texto y Tablas:** Manrope 400-500, 13-14px con espacio generoso y descansado.
- **Cifras Grandes (KPIs):** Manrope 600-700 con `font-variant-numeric: tabular-nums`.
- **Etiquetas en Mayúsculas:** Manrope 600, 11-12px, tracking +0.06em.
- **SKU y Códigos:** JetBrains Mono discreta (`--font-mono`) reservada exclusivamente para códigos de inventario.

---

## 3. Paleta Cromática y Tokens (@theme)
- **Fondo Papel Cálido:** `#FAFAF7` (canvas principal).
- **Superficies:** `#FFFFFF` (paneles, tablas, drawers).
- **Texto Tinta:** `#16201C` (casi negro profundo y cálido).
- **Texto Secundario:** `#6B7A72` (gris cálido con contraste superior a 4.5:1).
- **Líneas y Divisores:** `#E7E5DF` (bordes estructurales de 1px).
- **Botón Primario:** Tinta `#16201C` con texto claro `#FAFAF7`.
- **Acento Único:** Ámbar `#E8A33D` con presupuesto estricto (foco de inputs, selección activa, marca).
- **Semáforo de Stock:** Exclusivamente punto de color (`w-1.5 h-1.5 rounded-full`) + texto, NUNCA píldoras rellenas:
  - Normal/OK: `#2A7A4C`
  - Bajo mínimo: `#C97D1A`
  - Agotado: `#C93B3B`

---

## 4. Radios y Composición
- **Radio Máximo:** 6px en botones e inputs; 8px en paneles exteriores. Prohibido `rounded-xl` y `rounded-2xl`.
- **Prohibido:** Gradientes decorativos, glassmorphism, blur, sombras pesadas, emojis, iconos en cajas de color, tarjetas dentro de tarjetas, badges de píldora saturados.
- **Layout:** Sidebar angosta (220px) solo texto con indicador de línea fina; topbar mínima con Ctrl+K; layout editorial asimétrico (columna principal ancha + columna lateral estrecha).
