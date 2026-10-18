# Guía y Manual de Usuario: Vista de Reportes y Análisis Predictivo
### Ferretería C&C · Sistema de Gestión de Inventario

---

## 📋 Índice
1. [¿Para qué sirve esta vista?](#1-para-qué-sirve-esta-vista)
2. [Barra de Control y Configuración](#2-barra-de-control-y-configuración)
   - 2.1 Métodos de Proyección (SES, SMA, WMA)
   - 2.2 Sensibilidad ante Variaciones (Cautelosa, Normal, Reactiva)
   - 2.3 Período de Planificación de Compras
3. [Tarjetas Principales de Resumen (KPIs)](#3-tarjetas-principales-de-resumen-kpis)
4. [Gráfico de Proyección de Demanda y Ventas](#4-gráfico-de-proyección-de-demanda-y-ventas)
   - 4.1 ¿Qué representan las líneas y colores?
   - 4.2 Significado de las etiquetas (`Prom: 12 un/día`, `24 un`, `HOY`)
5. [Clasificación ABC de Rentabilidad (Pareto)](#5-clasificación-abc-de-rentabilidad-pareto)
6. [Tabla del Plan de Reabastecimiento de Inventario](#6-tabla-del-plan-de-reabastecimiento-de-inventario)
   - 6.1 Explicación columna por columna
   - 6.2 Semáforo de Cobertura de Stock (Rojo, Amarillo, Verde)
7. [Diagnóstico y Precisión Matemática de un Producto ("Ver Detalle")](#7-diagnóstico-y-precisión-matemática-de-un-producto-ver-detalle)
   - 7.1 ¿Qué significa que un modelo esté "bien ajustado"?
   - 7.2 Métricas de Error: MAD, RMSE y MAPE
   - 7.3 Diferencia con las Matrices de Confusión

---

## 1. ¿Para qué sirve esta vista?

El **Módulo de Reportes y Análisis Predictivo** tiene un objetivo comercial central:
> **Evitar que te quedes sin productos para vender (quiebres de stock) y al mismo tiempo evitar comprar mercadería de más que inmovilice tu capital.**

El sistema analiza automáticamente el historial de ventas pasadas de cada artículo para:
1. Calcular el ritmo diario de venta de cada producto.
2. Estimar cuántos días te durará el stock que tienes en tienda hoy.
3. Decirte con exactitud **cuántas unidades pedir al proveedor** y **cuánto dinero necesitas invertir**.

---

## 2. Barra de Control y Configuración

Ubicada en la parte superior de la página, te permite personalizar cómo calcula el sistema:

### 2.1 Métodos de Proyección

* **🟣 Inteligente (SES - Suavizado Exponencial Simple):** *(Recomendado)*  
  Aprende con rapidez de las ventas más recientes. Si un producto empezó a venderse más esta semana, el modelo se adapta de inmediato.
* **🔵 Promedio Estable (SMA - Promedio Móvil Simple):**  
  Calcula la media de los últimos días. Es ideal para artículos con ventas constantes y parejas (ej. clavos o tornillos).
* **🟡 Ponderado (WMA - Promedio Móvil Ponderado):**  
  Punto intermedio: le da mayor peso a los días recientes pero sin ignorar los anteriores.

---

### 2.2 Sensibilidad ante Variaciones

Controla la rapidez con la que el sistema reacciona ante un pico o una caída repentina de ventas.

#### 💡 Ejemplo Práctico:
> *Vendes normalmente 2 baldes de pintura al día. Ayer vino un cliente y compró 20 baldes juntos.*

* **🔵 Cautelosa ($\alpha = 0.15$):**  
  Asume que fue una casualidad única. Aumenta muy poco la proyección para no arriesgar compras innecesarias.
* **🟣 Normal ($\alpha = 0.30$):** *(Por defecto)*  
  Equilibrio prudente. Sube la proyección de forma moderada por si la demanda sigue subiendo.
* **🟡 Reactiva ($\alpha = 0.60$):**  
  Asume que la pintura entró en temporada alta. Sube fuerte la recomendación de compra para no quedarse sin stock bajo ninguna circunstancia.

---

### 2.3 Período de Planificación de Compras
* **Próximos 30 días:** *(Recomendado)* Planifica las compras para cubrir todo el mes.
* **Próximos 15 días:** Ideal para pedidos quincenales o proveedores con entrega rápida.
* **Próximos 7 días:** Para compras semanales de alta rotación.

---

## 3. Tarjetas Principales de Resumen (KPIs)

| Tarjeta | ¿Qué dato muestra? | ¿Cómo interpretarlo? |
| :--- | :--- | :--- |
| **DEMANDA ESTIMADA** | `470 unidades` | Total de artículos de todos los tipos que el sistema espera que vendas en el período seleccionado. |
| **PRESUPUESTO SUGERIDO** | `Bs. 18.432,95` | La cantidad de dinero que necesitas para hacer los pedidos de reposición sugeridos al proveedor. |
| **POR AGOTARSE PRONTO** | `1 artículo` | Cantidad de productos en situación crítica (tienen stock para menos de 7 días). |
| **RENTABILIDAD / GANANCIA** | `27.81%` | De cada 100 Bs. vendidos, 27.81 Bs. son margen de ganancia bruta neta sobre el costo de compra. |

---

## 4. Gráfico de Proyección de Demanda y Ventas

### 4.1 ¿Qué representan las líneas y colores?
* **Línea Celeste Sólida (con picos en zigzag):** Ventas reales ocurridas día a día en el pasado.
* **Línea Morada Punteada (con área sombreada suave):** Estimación futura calculada por el modelo predictivo para los próximos 30 días.
* **Puntos Interactivos:** Al pasar el cursor por encima de cualquier punto, verás la fecha exacta y las unidades vendidas o estimadas.

### 4.2 Significado de las Etiquetas del Gráfico
* **🟡 `Prom: 12 un/día`:** Es el promedio de venta diaria general de la tienda. Sirve como nivel de referencia: los picos por encima de esta línea fueron días con ventas extraordinarias.
* **🔷 `24 un` / `23 un`:** Resalta automáticamente los días récord donde hubo mayor venta de productos en la historia de la tienda.
* **⬜ `HOY`:** Línea divisoria vertical que separa el pasado real (izquierda) de la proyección futura (derecha).

---

## 5. Clasificación ABC de Rentabilidad (Pareto)

Agrupa los artículos según el dinero que aportan a la caja de la ferretería:

* **🟢 Clase A (Productos Estrella — 80% de los ingresos):**  
  Son los productos más importantes del negocio. Nunca deben quedarse sin stock.
* **🔵 Clase B (Productos Habituales — 15% de los ingresos):**  
  Tienen ventas regulares y estables. Requieren un stock de seguridad estándar.
* **⚪ Clase C (Productos Ocasionales — 5% de los ingresos):**  
  Ventas esporádicas. Conviene tener poco stock para no tener dinero estancado.

---

## 6. Tabla del Plan de Reabastecimiento de Inventario

La tabla principal muestra los productos ordenados **del más urgente al menos urgente**:

### 6.1 Columnas Explicadas
1. **PRODUCTO:** Nombre, código y marca del artículo.
2. **CLASIFICACIÓN:** Etiqueta ABC (Clase A, B o C).
3. **STOCK ACTUAL:** Cantidad física que tienes en tienda hoy y el mínimo de seguridad.
4. **VENTA DIARIA:** Ritmo promedio de venta por día (ej. `~1.65 piezas/día`).
5. **VENTA ESTIMADA (30D):** Total de unidades que se proyecta vender en el mes.
6. **COBERTURA DE STOCK:** Cuántos días te durará tu stock actual antes de que se agote por completo.
7. **SUGERENCIA DE PEDIDO:** La cantidad exacta de unidades que debes pedir al proveedor (ej. `Pedir +42`). Si dice `Suficiente`, no necesitas comprar.
8. **INVERSIÓN ESTIMADA:** El costo total en Bolivianos de esa compra.
9. **FIABILIDAD:** Nivel de precisión del cálculo (Óptima = error mínimo).
10. **ACCIÓN ("Ver Detalle"):** Abre el diagnóstico técnico individual del producto.

### 6.2 Semáforo de Cobertura de Stock

| Color del Indicador | Estado | Significado y Acción Requerida |
| :---: | :---: | :--- |
| 🔴 **Rojo** | `Agotado` o `≤ 7 días` | **URGENTE:** Se acabará esta misma semana. Hacer pedido inmediato. |
| 🟡 **Amarillo / Ámbar** | `8 a 30 días` | **ALERTA:** Queda stock para 2 a 4 semanas. Planificar pedido pronto. |
| 🟢 **Verde** | `Seguro (> 30d)` | **ÓPTIMO:** Tienes stock suficiente para todo el mes. No requiere compra. |

---

## 7. Diagnóstico y Precisión Matemática ("Ver Detalle")

Al hacer clic en **"Ver Detalle"** en cualquier producto, se abre una ventana con su diagnóstico específico:

### 7.1 ¿Qué significa que un modelo esté "Bien Ajustado"?
Significa que la fórmula matemática **describe fielmente el comportamiento real de tus ventas**. El sistema comprueba esto simulando predicciones sobre el pasado y midiendo cuánto se desvió de lo que realmente ocurrió. Si la diferencia es casi nula, el modelo está **bien ajustado** y sus pronósticos son de alta confianza.

### 7.2 Métricas de Error (MAD, RMSE, MAPE)

| Métrica | Nombre Completo | ¿Qué mide en lenguaje sencillo? | ¿Cómo saber si es bueno? |
| :--- | :--- | :--- | :--- |
| **MAD** | Desviación Media Absoluta | En promedio, **¿por cuántas unidades al día se equivocó el modelo?** (ej. $\pm 0.12$ unid). | Cuanto más cercano a 0, mejor. |
| **RMSE** | Raíz del Error Cuadrático Medio | Igual que el MAD, pero penaliza con mayor severidad los fallos en días con picos inesperados. | Cuanto más bajo, mejor. |
| **MAPE** | Error Porcentual Absoluto Medio | El **porcentaje de error** promedio del modelo frente a las ventas reales. | Menor al 10-15% es excelente exactitud. |
| **★ Menor Error** | Mejor Modelo Seleccionado | Destaca automáticamente cuál de los 3 métodos (SES, SMA o WMA) tuvo el menor error en ese producto. | Criterio de selección del sistema. |

### 7.3 Diferencia con los Diagramas o Matrices de Confusión
* **Matriz de Confusión:** Se usa para clasificar cosas en **categorías o Sí/No** (ej: *¿Es fraude o no?*, *¿Es spam o no?*).
* **Métricas de Error (MAD/RMSE/MAPE):** Se usan en nuestro sistema para predecir **cantidades numéricas continuas** (ej: *¿Cuántos alicates venderemos?*). Ambos métodos evalúan la calidad de un modelo, pero cada uno para su tipo de problema.

---

*Documento generado para el equipo de Ferretería C&C — Sistema de Gestión e Inteligencia Comercial.*
