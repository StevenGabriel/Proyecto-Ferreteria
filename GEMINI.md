# Reglas de Diseño, Gusto Estético y Animación (Emil Kowalski + Impeccable + Taste Skill)

Este proyecto utiliza tres sistemas complementarios de diseño y movimiento ubicados en `.agents/skills/`:
- **Emil Kowalski Design Engineering** (`emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `animation-performance`)
- **Impeccable Design** (`impeccable` + `PRODUCT.md` + `DESIGN.md`)
- **Taste Skill & Redesign** (`taste-skill`, `redesign-skill`)

Cada vez que se cree, edite o audite cualquier componente de interfaz en `ferreteria/src/`, se DEBEN cumplir estrictamente las siguientes reglas:

---

## 1. Reglas Anti-Slop Visual (Impeccable + Taste Skill)

1. **Prohibido el cliché "SaaS Cyberpunk / IA Genérica":**
   - **NO** usar degradados genéricos `from-cyan-500 to-blue-600` o `purple-500` a `indigo-600` como decoración por defecto.
   - **NO** usar texto con degradado (`bg-clip-text text-transparent`). El énfasis se logra con peso tipográfico, escala o contraste limpio.
   - **NO** anidar tarjetas dentro de tarjetas (*cards-in-cards*) ni abusar de `backdrop-blur` con bordes brillantes en cada caja. Declara la elevación una sola vez (o borde sutil `1px` o sombra con offset, nunca un halo borroso sin dirección).
   - **NO** colocar un "eyebrow / kicker" en mayúsculas pequeñas con `tracking-widest` encima de cada título (`h1`/`h2`/`h3`). Deja que el titular hable por sí mismo.
   - **NO** usar bordes laterales gruesos de alerta (`border-l-4`) salvo en notificaciones técnicas puntuales donde sea estrictamente funcional.

2. **Identidad de Marca Real (C&C Ferretería — Casa y Construcción):**
   - **Superficies:** Preferir neutros cálidos o grafito técnico (`zinc` / `stone` / carbón `#0c0e12`, `#14171f`) en lugar de azules saturados espaciales, o superficies claras de alto contraste cuando la escena de uso lo pida.
   - **Acento con propósito:** Usar un solo color de acento primario con carácter ferretero/industrial (ámbar/cobre industrial `#f59e0b` / `#ea580c` o azul acero técnico sobrio sin neón) y reservar el verde/ámbar/rojo semántico exclusivamente para estados reales (Stock OK, Stock Crítico, Lote Vencido FEFO).

3. **Tipografía e Información Numérica:**
   - **Fuentes del sistema:** Prohibido dejar `Arial`, `Inter` o el `sans-serif` por defecto del navegador. Usar `Plus Jakarta Sans` (`font-sans`) para interfaz/titulares y `JetBrains Mono` (`font-mono`) para códigos SKU, NIT, CI, números de factura, precios (`Bs.`), conteos de stock y fechas FEFO.
   - **Números tabulares obligatorios:** Todo precio, stock, porcentaje, KPI o tabla debe incluir `tabular-nums` (`font-variant-numeric: tabular-nums`) para que las cifras se alineen verticalmente al milímetro.
   - **Jerarquía:** Usar `text-wrap: balance` en títulos y `60–75ch` máximo en párrafos descriptivos.

---

## 2. Reglas de Animación y Micro-interacciones (Emil Kowalski)

Antes de escribir cualquier animación o transición, aplica la secuencia de decisión de Emil Kowalski:

1. **Frecuencia de uso vs. Animación:**
   - Acciones repetidas decenas o cientos de veces al día (búsqueda por teclado en POS, navegación entre filas, atajos `Esc`/`Enter`): **cero animación** o instantáneas (`<100ms`).
   - Acciones ocasionales (abrir carrito lateral, modal de Vista Rápida, modal de Checkout, dropdown de usuario, toasts): **animación con propósito espacial**.

2. **Propiedades y Curvas Permitidas:**
   - **Prohibido `transition-all`:** Especifica siempre las propiedades exactas (`transition-[transform,opacity]`, `transition-colors`, `transition-transform`). Animar solo `transform` y `opacity` siempre que sea posible.
   - **Prohibido `ease-in` en entradas de UI:** `ease-in` arranca lento y hace que la interfaz se sienta torpe. Usa siempre curvas personalizadas `ease-out` fuertes:
     - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` (`ease-out-expo` en Tailwind) para entradas, dropdowns, modales y feedback.
     - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` para elementos que se mueven o cambian de posición dentro de la pantalla.
     - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` para cajones laterales (Carrito de compras, paneles deslizables).
   - **Duraciones estrictas (< 300ms en UI):**
     - Presión de botones (`:active`): `100ms–160ms` con `active:scale-[0.97]`.
     - Dropdowns, popovers, tooltips: `150ms–200ms`.
     - Modales y cajones (drawers): `200ms–320ms`.

3. **Física Realista:**
   - **Nunca animar desde `scale(0)`:** Nada en el mundo real aparece de la nada. Los modales y popovers deben iniciar en `scale(0.95)` o `scale(0.96)` combinado con `opacity: 0`.
   - **Origen espacial (`transform-origin`):** Los menús desplegables y popovers deben escalar desde su disparador (`origin-top-right`, `origin-top-left`, etc.), nunca desde el centro por defecto salvo que sea un modal centrado.
   - **Accesibilidad de movimiento:** Respetar siempre `@media (prefers-reduced-motion: reduce)`.
