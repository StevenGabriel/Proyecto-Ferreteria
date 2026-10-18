# DESIGN.md — Sistema de Diseño C&C Ferretería

## 1. Dirección Visual
Estética **Industrial de Precisión**: inspirada en catálogos técnicos modernos (McMaster-Carr, Hilti, Linear) donde la estructura limpia, los datos tabulares y la respuesta táctil inmediata reemplazan a los adornos artificiales.

## 2. Tipografía
- **UI & Titulares (`--font-sans`):** `'Plus Jakarta Sans'`, `-apple-system`, `sans-serif`.
  - Titulares (`h1`, `h2`): Peso `700`/`800`, tracking `-0.025em`, `text-wrap: balance`.
- **Datos, Códigos y Moneda (`--font-mono`):** `'JetBrains Mono'`, `monospace`.
  - Obligatorio `font-variant-numeric: tabular-nums` en precios (`Bs.`), porcentajes, stock, NIT/CI, códigos SKU y fechas.

## 3. Tokens de Movimiento (Emil Kowalski Standard)
- `--ease-out`: `cubic-bezier(0.23, 1, 0.32, 1)` — Entradas de UI, dropdowns, popovers, modales, feedback táctil.
- `--ease-in-out`: `cubic-bezier(0.77, 0, 0.175, 1)` — Cambios de estado y desplazamientos en pantalla.
- `--ease-drawer`: `cubic-bezier(0.32, 0.72, 0, 1)` — Cajón de carrito de compras y paneles laterales.
- **Escala de duración:**
  - Press (`:active`): `120ms` (`scale(0.97)`)
  - Micro-interacción / Hover / Tooltip: `150ms–180ms`
  - Dropdown / Popover: `180ms–220ms` (desde `scale(0.96)` + `opacity: 0` con `transform-origin` en el botón disparador)
  - Modal / Drawer: `240ms–300ms`

## 4. Prohibiciones Estrictas (Craft Floor)
- Prohibido `transition-all` (declarar propiedades explícitas).
- Prohibido `scale(0)` como estado inicial de entrada.
- Prohibido usar texto con degradado o apilar múltiples colores neón sin función semántica.
- Prohibido colocar etiquetas "kicker" en mayúsculas sobre cada encabezado de sección.
