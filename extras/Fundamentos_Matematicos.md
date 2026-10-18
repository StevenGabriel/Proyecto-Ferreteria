# Fundamentos Matemáticos — Módulo de Reportes y Análisis Predictivo
### Ferretería C&C · Sistema de Gestión

---

## Índice

1. [Modelos de Pronóstico de Demanda](#1-modelos-de-pronóstico-de-demanda)
   - 1.1 Promedio Móvil Simple (SMA)
   - 1.2 Promedio Móvil Ponderado (WMA)
   - 1.3 Suavizado Exponencial Simple (SES)
2. [Métricas de Error del Modelo](#2-métricas-de-error-del-modelo)
   - 2.1 MAD — Desviación Media Absoluta
   - 2.2 MSE y RMSE — Error Cuadrático Medio y su Raíz
   - 2.3 MAPE — Error Porcentual Absoluto Medio
3. [Clasificación ABC (Análisis de Pareto)](#3-clasificación-abc-análisis-de-pareto)
4. [Cálculo de Días hasta Quiebre de Stock](#4-cálculo-de-días-hasta-quiebre-de-stock)
5. [Sugerencia de Compra Inteligente](#5-sugerencia-de-compra-inteligente)
6. [Métricas Financieras Globales](#6-métricas-financieras-globales)
7. [Parámetros del Sistema y sus Rangos](#7-parámetros-del-sistema-y-sus-rangos)

---

## 1. Modelos de Pronóstico de Demanda

El sistema construye una **serie temporal diaria** de ventas por producto a lo largo de los últimos `H` días (por defecto `H = 60`). Cada elemento de la serie es:

$$Y_t = \text{unidades vendidas del producto en el día } t$$

Sobre esa serie se aplican los tres modelos siguientes.

---

### 1.1 Promedio Móvil Simple (SMA)
> Función `runSMA(series, window)` en [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L22-L47)

El SMA calcula la media aritmética de las últimas `k` observaciones para estimar la demanda del siguiente período.

$$\hat{Y}_{t+1} = \frac{1}{k} \sum_{i=1}^{k} Y_{t-i+1}$$

**Donde:**
- $\hat{Y}_{t+1}$ = pronóstico para el próximo día
- $k$ = tamaño de la ventana (configurable, por defecto `k = 7` días)
- $Y_{t-i+1}$ = venta real del día $i$ períodos atrás

**Propiedades:**
- Todos los días de la ventana tienen el **mismo peso** $\frac{1}{k}$.
- Suaviza fluctuaciones aleatorias; cuanto mayor sea `k`, más suave (y más lento reacciona a cambios).
- Si la serie tiene menos puntos que `k`, se ajusta automáticamente: $k = \min(\text{window},\ n)$.

**Implementación:**
```
Para t = k hasta n-1:
    forecasts[t] = sum(series[t-k] ... series[t-1]) / k

nextForecast = sum(series[n-k] ... series[n-1]) / k
```

---

### 1.2 Promedio Móvil Ponderado (WMA)
> Función `runWMA(series, window)` en [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L53-L81)

El WMA asigna **pesos linealmente decrecientes** hacia atrás en el tiempo, dando más importancia a los días más recientes.

$$\hat{Y}_{t+1} = \frac{\sum_{i=1}^{k} w_i \cdot Y_{t-i+1}}{\sum_{i=1}^{k} w_i}$$

**Donde:**
- $w_i = k - i + 1$ — el día más reciente $(i=1)$ recibe peso $k$; el más antiguo $(i=k)$ recibe peso $1$
- $\displaystyle\sum_{i=1}^{k} w_i = \frac{k(k+1)}{2}$ (suma de la serie aritmética)

**Ejemplo con $k = 3$:**

| Día | Ventas | Peso |
|-----|--------|------|
| Hace 1 día | $Y_{t}$ | 3 |
| Hace 2 días | $Y_{t-1}$ | 2 |
| Hace 3 días | $Y_{t-2}$ | 1 |

$$\hat{Y}_{t+1} = \frac{3\,Y_t + 2\,Y_{t-1} + 1\,Y_{t-2}}{6}$$

**Propiedades:**
- Reacciona más rápido que SMA ante cambios recientes.
- La suma de pesos $\frac{k(k+1)}{2}$ garantiza que siempre estén normalizados.

---

### 1.3 Suavizado Exponencial Simple (SES)
> Función `runSES(series, alpha)` en [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L87-L105)

El SES actualiza el pronóstico de forma recursiva ponderando el valor actual y el pronóstico anterior mediante el parámetro $\alpha$.

$$\hat{Y}_{t+1} = \alpha \cdot Y_t + (1 - \alpha) \cdot \hat{Y}_t$$

**Donde:**
- $\alpha \in (0,\ 1)$ = factor de suavizado (nivel de sensibilidad)
- $Y_t$ = venta real del día $t$
- $\hat{Y}_t$ = pronóstico generado para el día $t$

**Inicialización:**
$$\hat{Y}_1 = Y_1$$

**Expansión recursiva:**

Expandiendo la fórmula hacia atrás se obtiene:

$$\hat{Y}_{t+1} = \alpha \sum_{j=0}^{t-1} (1-\alpha)^j\, Y_{t-j} + (1-\alpha)^t\, Y_1$$

Esto demuestra que SES es equivalente a un promedio ponderado de *toda* la historia, con pesos que decaen exponencialmente hacia el pasado.

**Efecto de $\alpha$:**

| Valor de $\alpha$ | Sensibilidad | Preset en el sistema |
|---|---|---|
| 0.15 | Conservador — reacciona lento, suaviza mucho | `CONSERVATIVE` |
| 0.30 | Normal — equilibrio entre estabilidad y reactividad | `NORMAL` |
| 0.60 | Reactivo — sigue los picos con rapidez | `FAST` |

**Próximo pronóstico (horizonte +1):**
$$\hat{Y}_{n+1} = \alpha \cdot Y_n + (1 - \alpha) \cdot \hat{Y}_n$$

---

## 2. Métricas de Error del Modelo

> Función `computeMetrics(actuals, forecasts)` en [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L110-L145)

Estas métricas miden qué tan bien se ajusta cada modelo a los datos históricos reales. El sistema las calcula para los **tres modelos en paralelo** y selecciona automáticamente el que tenga el **menor MAD** como "mejor modelo sugerido".

---

### 2.1 MAD — Desviación Media Absoluta

$$\text{MAD} = \frac{1}{n} \sum_{t=1}^{n} |Y_t - \hat{Y}_t|$$

- Mide el error promedio en **unidades absolutas** (ej. "en promedio el modelo se equivoca 2.3 unidades/día").
- Es el criterio principal para seleccionar el mejor modelo entre SES, SMA y WMA.

---

### 2.2 MSE y RMSE — Error Cuadrático Medio y su Raíz

$$\text{MSE} = \frac{1}{n} \sum_{t=1}^{n} (Y_t - \hat{Y}_t)^2$$

$$\text{RMSE} = \sqrt{\text{MSE}}$$

- Penaliza errores grandes más que errores pequeños (por elevar al cuadrado).
- El RMSE está en las mismas unidades que la serie original, facilitando su interpretación.

---

### 2.3 MAPE — Error Porcentual Absoluto Medio

$$\text{MAPE} = \frac{100\%}{n} \sum_{t=1}^{n} \left| \frac{Y_t - \hat{Y}_t}{Y_t} \right| \qquad \text{(solo cuando } Y_t > 0\text{)}$$

- Expresa el error como **porcentaje** de la venta real.
- Se excluyen los días con $Y_t = 0$ para evitar divisiones por cero.
- Un MAPE < 20% se considera aceptable en series de demanda minorista.

---

## 3. Clasificación ABC (Análisis de Pareto)

> Endpoint `/reports/sales-performance` en [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L357-L386)

La **Clasificación ABC** (Regla 80-20 o Principio de Pareto) agrupa los productos según su contribución acumulada a los ingresos totales del período.

**Algoritmo — paso a paso:**

**Paso 1.** Calcular los ingresos totales de cada producto:
$$\text{Ingresos}_p = \sum_{t} \text{Subtotal}_{p,t}$$

**Paso 2.** Ordenar los productos de **mayor a menor ingreso**.

**Paso 3.** Calcular el porcentaje acumulado sobre el total de ingresos:
$$\text{PctAcum}_p = \frac{\displaystyle\sum_{j=1}^{p} \text{Ingresos}_j}{\text{IngresoTotal}} \times 100$$

**Paso 4.** Asignar clase:

| Clase | Criterio de corte | Interpretación |
|-------|-------------------|----------------|
| **A** | $\text{PctAcum} \leq 80\%$ | Alta rotación — generan el 80% de los ingresos |
| **B** | $80\% < \text{PctAcum} \leq 95\%$ | Rotación media — siguiente 15% de ingresos |
| **C** | $\text{PctAcum} > 95\%$ | Baja rotación — últimos 5% de ingresos |

> **Nota de implementación:** El primer producto (el de mayor ingreso) siempre recibe Clase A como caso borde, independientemente del porcentaje acumulado, para evitar el caso donde el primer producto supere sólo por sí mismo el 80%.

---

## 4. Cálculo de Días hasta Quiebre de Stock

> [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L579-L610)

Con la tasa de demanda diaria estimada $\hat{r}$ (unidades/día) y el stock actual $S$, se calcula cuántos días le quedan al producto antes de agotarse:

$$D_{\text{quiebre}} = \left\lfloor \frac{S}{\hat{r}} \right\rfloor$$

**Donde:**
- $S$ = stock actual (suma de todos los lotes activos del producto)
- $\hat{r}$ = `dailyDemandRate` = $\hat{Y}_{n+1}$ del modelo predictivo activo (unidades/día)

**Casos especiales:**

| Condición | Resultado |
|-----------|-----------|
| $\hat{r} \leq 0.001$ (sin ventas recientes) | $D_{\text{quiebre}} = 999$ (sin riesgo inmediato) |
| $S = 0$ | $D_{\text{quiebre}} = 0$ (ya agotado) |

**Niveles de urgencia:**

| Nivel | Condición | Color en UI |
|-------|-----------|-------------|
| `OUT_OF_STOCK` | $S = 0$ | Rojo |
| `CRITICAL` | $D_{\text{quiebre}} \leq 7$ días | Rojo |
| `HIGH` | $7 < D_{\text{quiebre}} \leq 15$ días | Ámbar |
| `MEDIUM` | $15 < D_{\text{quiebre}} \leq 30$ días | Amarillo |
| `OPTIMAL` | $D_{\text{quiebre}} > 30$ días | Verde |

---

## 5. Sugerencia de Compra Inteligente

> [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L612-L615)

El sistema calcula cuántas unidades comprar al proveedor para cubrir el horizonte de planificación más un colchón de seguridad.

**Paso 1 — Demanda proyectada en el horizonte $H$:**
$$D_H = \lceil \hat{r} \times H \rceil$$

**Paso 2 — Stock objetivo necesario:**
$$S_{\text{objetivo}} = D_H + S_{\text{mínimo}}$$

Donde $S_{\text{mínimo}}$ = lote mínimo del producto (campo `LoteMinimo`, por defecto 5 unidades).

**Paso 3 — Unidades a comprar:**
$$U_{\text{compra}} = \max\!\bigl(0,\ S_{\text{objetivo}} - S_{\text{actual}}\bigr)$$

Si el stock actual ya cubre la demanda proyectada, el resultado es 0 (no se recomienda compra).

**Paso 4 — Costo estimado de la compra:**
$$C_{\text{compra}} = U_{\text{compra}} \times P_{\text{compra}}$$

Donde $P_{\text{compra}}$ = precio de compra unitario del producto.

---

## 6. Métricas Financieras Globales

> Endpoint `/reports/sales-performance` en [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js#L388-L405)

Calculadas sobre el período seleccionado (por defecto los últimos 60 días):

| Métrica | Fórmula |
|---------|---------|
| **Ingresos Totales** | $\displaystyle\sum_{i} \text{Subtotal}_{i}$ |
| **Costo Total** | $\displaystyle\sum_{i} Q_i \times P_{\text{compra},i}$ |
| **Ganancia Bruta** | $\text{Ingresos} - \text{Costo}$ |
| **Margen Neto (%)** | $\dfrac{\text{Ganancia Bruta}}{\text{Ingresos}} \times 100$ |
| **Ticket Promedio** | $\dfrac{\text{Ingresos Totales}}{\text{N\° Transacciones}}$ |

**Margen por período (timeline):**
$$\text{Margen}_{\text{período}}(\%) = \frac{\text{GananciaBruta}_{\text{período}}}{\text{Ingresos}_{\text{período}}} \times 100$$

**Margen por producto:**
$$\text{Margen}_p(\%) = \frac{p.\text{gananciaBruta}}{p.\text{ingresosTotales}} \times 100$$

---

## 7. Parámetros del Sistema y sus Rangos

| Parámetro | Variable | Rango válido | Por defecto | Descripción |
|-----------|----------|-------------|-------------|-------------|
| Factor de suavizado | `alpha` ($\alpha$) | [0.05, 0.95] | 0.30 | Sensibilidad del modelo SES |
| Ventana móvil | `window` ($k$) | [3, 30] días | 7 días | Tamaño de ventana para SMA y WMA |
| Horizonte de proyección | `horizonDays` ($H$) | [7, 90] días | 30 días | Días hacia el futuro que se planifican |
| Historial analizado | `historyDays` | [14, 180] días | 60 días | Días de historial de ventas utilizados |

---

## Flujo General del Motor Predictivo

```
Historial de ventas (últimos 60 días)
             │
             ▼
   Serie temporal diaria por producto
   Y = [Y₁, Y₂, ..., Yₙ]
             │
      ┌──────┼──────┐
      ▼      ▼      ▼
   runSMA  runWMA  runSES
   (k=7)   (k=7)  (α=0.3)
      │      │      │
   fitted[] + nextForecast
      │      │      │
   MAD / RMSE / MAPE
             │
   Selección del mejor modelo
   (criterio: menor MAD)
             │
   dailyDemandRate = nextForecast
   del modelo activo seleccionado
             │
      ┌───────────────────┐
      ▼                   ▼
D_quiebre = ⌊S / r̂⌋    U_compra = max(0, ⌈r̂·H⌉ + Smin − S)
      │                   │
  Nivel de urgencia   Costo estimado de compra
  OUT_OF_STOCK        = U_compra × P_compra
  CRITICAL / HIGH
  MEDIUM / OPTIMAL
```

---

*Documento generado el 2026-09-10 a partir del código fuente de [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js).*
