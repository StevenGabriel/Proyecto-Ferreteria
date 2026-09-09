import React, { useState, useEffect, useMemo } from 'react';
import { getDemandForecastReport, getSalesPerformanceReport, getProductForecastDetail } from '../../services/api';
import { Link } from 'react-router-dom';

function PredictiveReportsTab() {
  // Configuración del Modelo
  const [model, setModel] = useState('SES'); // 'SES' | 'SMA' | 'WMA'
  const [alpha, setAlpha] = useState(0.3);
  const [windowSize, setWindowSize] = useState(7);
  const [horizonDays, setHorizonDays] = useState(30);
  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'

  // Datos
  const [forecastData, setForecastData] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros de Tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [abcFilter, setAbcFilter] = useState('ALL');

  // Modal de Detalle de Producto / Calibración
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productDetailData, setProductDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Cargar datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [fData, pData] = await Promise.all([
        getDemandForecastReport({
          model,
          alpha,
          window: windowSize,
          horizonDays
        }),
        getSalesPerformanceReport({
          period
        })
      ]);

      setForecastData(fData);
      setPerformanceData(pData);
    } catch (error) {
      console.error('Error al cargar datos predictivos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [model, alpha, windowSize, horizonDays, period]);

  // Cargar detalle de producto para modal
  const openProductDetail = async (prod) => {
    setSelectedProduct(prod);
    setLoadingDetail(true);
    try {
      const data = await getProductForecastDetail(prod.ProductoID, {
        alpha,
        window: windowSize,
        horizonDays
      });
      setProductDetailData(data);
    } catch (e) {
      console.error('Error al cargar detalle de producto:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Filtrado de productos en la tabla
  const filteredProducts = useMemo(() => {
    if (!forecastData?.forecastedProducts) return [];

    // Mapear clase ABC desde performanceData si está disponible
    const abcMap = {};
    if (performanceData?.productPerformance) {
      performanceData.productPerformance.forEach((p) => {
        abcMap[p.ProductoID] = p.abcClass || 'C';
      });
    }

    return forecastData.forecastedProducts.filter((p) => {
      const pAbc = abcMap[p.ProductoID] || 'C';
      p.abcClass = pAbc;

      // Filtro de Búsqueda
      const text = `${p.Nombre} ${p.CodigoBarras || ''} ${p.Categoria || ''} ${p.Marca || ''}`.toLowerCase();
      const matchSearch = !searchTerm || text.includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      // Filtro de Urgencia
      if (urgencyFilter !== 'ALL' && p.urgencyLevel !== urgencyFilter) {
        return false;
      }

      // Filtro ABC
      if (abcFilter !== 'ALL' && pAbc !== abcFilter) {
        return false;
      }

      return true;
    });
  }, [forecastData, performanceData, searchTerm, urgencyFilter, abcFilter]);

  // Exportar Tabla de Pronóstico
  const handleExportForecast = (type) => {
    if (type === 'impresion') {
      window.print();
    } else {
      const rows = [
        ['Producto', 'Código', 'Categoría', 'Clase ABC', 'Stock Actual', 'Stock Mínimo', 'Demanda Diaria', `Demanda (${horizonDays}d)`, 'Días de Stock', 'Urgencia', 'Sugerencia de Compra (Unid)', 'Presupuesto Estimado (Bs.)', 'Mejor Modelo'],
        ...filteredProducts.map((p) => [
          p.Nombre,
          p.CodigoBarras || `PRD-${p.ProductoID}`,
          p.Categoria || 'General',
          p.abcClass || 'C',
          p.StockActual ?? 0,
          p.StockMinimo ?? 5,
          p.dailyDemandRate ?? 0,
          p.projectedDemand ?? 0,
          p.daysUntilStockout >= 999 ? '> 90d' : `${p.daysUntilStockout}d`,
          p.urgencyLabel || p.urgencyLevel,
          p.suggestedPurchaseUnits ?? 0,
          p.estimatedPurchaseCost ?? 0,
          p.modelAccuracy?.bestModel || 'SES'
        ])
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Reporte_Pronostico_Demanda_${model}_${horizonDays}d.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Renderizador SVG de Gráfico de Proyección Temporal
  const renderProjectionChart = () => {
    const timeline = forecastData?.globalTimeline || [];
    if (timeline.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
          No hay suficientes datos históricos de ventas para trazar la curva de proyección.
        </div>
      );
    }

    const svgWidth = 800;
    const svgHeight = 240;
    const padLeft = 40;
    const padRight = 30;
    const padTop = 20;
    const padBottom = 35;

    const chartW = svgWidth - padLeft - padRight;
    const chartH = svgHeight - padTop - padBottom;

    // Calcular máximo valor
    const maxVal = Math.max(...timeline.map((d) => Math.max(d.actual || 0, d.fitted || 0, d.forecast || 0)), 10);

    const getX = (index) => padLeft + (index * chartW) / (timeline.length - 1 || 1);
    const getY = (val) => padTop + chartH - ((val || 0) * chartH) / maxVal;

    // Puntos históricos
    const historicPoints = [];
    const forecastPoints = [];

    let lastHistoricPoint = null;

    timeline.forEach((d, idx) => {
      const x = getX(idx);
      if (d.type === 'HISTORIC') {
        const y = getY(d.actual || 0);
        historicPoints.push({ x, y, ...d });
        lastHistoricPoint = { x, y: getY(d.fitted || d.actual || 0) };
      } else {
        if (forecastPoints.length === 0 && lastHistoricPoint) {
          forecastPoints.push(lastHistoricPoint);
        }
        const y = getY(d.forecast || 0);
        forecastPoints.push({ x, y, ...d });
      }
    });

    const createPath = (points) => {
      if (points.length === 0) return '';
      return points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
    };

    const historicPath = createPath(historicPoints);
    const forecastPath = createPath(forecastPoints);

    // Área histórica sombreada
    const historicArea = historicPoints.length > 0
      ? `${historicPath} L ${historicPoints[historicPoints.length - 1].x} ${padTop + chartH} L ${historicPoints[0].x} ${padTop + chartH} Z`
      : '';

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 text-slate-400">
          <defs>
            <linearGradient id="historicAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas Guía Horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padTop + chartH - p * chartH;
            const val = Math.round(p * maxVal);
            return (
              <g key={i}>
                <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.5" />
                <text x={padLeft - 8} y={y + 4} textAnchor="end" fontSize="9" fill="#94a3b8" className="font-mono">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Área y Línea Histórica */}
          {historicArea && <path d={historicArea} fill="url(#historicAreaGrad)" />}
          {historicPath && <path d={historicPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Línea Proyectada Futura (Punteada Violeta) */}
          {forecastPath && (
            <path d={forecastPath} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
          )}

          {/* Puntos de datos */}
          {historicPoints.map((p, i) => (
            <circle
              key={`h-${i}`}
              cx={p.x}
              cy={p.y}
              r={p.actual > 0 ? "3.5" : "2"}
              fill={p.actual > 0 ? "#06b6d4" : "#475569"}
              stroke="#0f172a"
              strokeWidth="1.5"
            >
              <title>{`${p.date}: ${p.actual || 0} unid vendidas`}</title>
            </circle>
          ))}

          {forecastPoints.map((p, i) => (
            <circle
              key={`f-${i}`}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#c084fc"
              stroke="#0f172a"
              strokeWidth="1.5"
            >
              <title>{`Proyección ${p.date}: ~${p.forecast || 0} unid/día`}</title>
            </circle>
          ))}

          {/* Etiquetas Eje X */}
          {timeline.filter((_, i) => i % Math.ceil(timeline.length / 8) === 0 || i === timeline.length - 1).map((d, i) => {
            const idx = timeline.indexOf(d);
            const x = getX(idx);
            return (
              <text key={i} x={x} y={svgHeight - 10} textAnchor="middle" fontSize="9" fill="#94a3b8" className="font-mono">
                {d.date ? d.date.slice(5) : ''}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  const kpis = performanceData?.kpis || {};
  const forecastSummary = forecastData?.summary || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Barra de Control de Parámetros del Modelo */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Motor de Análisis Predictivo de Demanda
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold uppercase">
                Machine Analytics
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Modelos estadísticos basados en series de tiempo para proyectar la demanda futura y optimizar órdenes de compra.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer self-start lg:self-auto"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'Calculando...' : 'Recalcular Modelos'}</span>
          </button>
        </div>

        {/* Parámetros Interactivos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs">
          {/* Selector de Modelo */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Algoritmo Predictivo:</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setModel('SES')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
                  model === 'SES' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Suavizado Exponencial Simple"
              >
                SES (Holt)
              </button>
              <button
                type="button"
                onClick={() => setModel('SMA')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
                  model === 'SMA' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Promedio Móvil Simple"
              >
                SMA Móvil
              </button>
              <button
                type="button"
                onClick={() => setModel('WMA')}
                className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all ${
                  model === 'WMA' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Promedio Móvil Ponderado"
              >
                WMA Ponder.
              </button>
            </div>
          </div>

          {/* Parámetro Específico (Alpha o Ventana) */}
          <div className="space-y-1.5">
            {model === 'SES' ? (
              <>
                <div className="flex justify-between font-bold text-slate-300">
                  <span>Factor de Suavizado (α):</span>
                  <span className="text-purple-400 font-mono">{alpha}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.95"
                  step="0.05"
                  value={alpha}
                  onChange={(e) => setAlpha(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">
                  {alpha <= 0.2 ? 'Alta suavidad (lento)' : alpha >= 0.6 ? 'Alta reactividad (rápido)' : 'Equilibrado'}
                </span>
              </>
            ) : (
              <>
                <div className="flex justify-between font-bold text-slate-300">
                  <span>Ventana Móvil (N días):</span>
                  <span className="text-cyan-400 font-mono">{windowSize} días</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="21"
                  step="1"
                  value={windowSize}
                  onChange={(e) => setWindowSize(parseInt(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500 block">Promedia los últimos {windowSize} periodos</span>
              </>
            )}
          </div>

          {/* Horizonte de Proyección */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Horizonte de Demanda:</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="7">Próximos 7 días (1 semana)</option>
              <option value="15">Próximos 15 días (Quincena)</option>
              <option value="30">Próximos 30 días (1 mes estándar)</option>
              <option value="60">Próximos 60 días (Bimestre)</option>
            </select>
          </div>

          {/* Agrupación Histórica */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Granularidad Histórica:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="daily">📅 Diario (Día por día)</option>
              <option value="weekly">📊 Semanal (Por semanas)</option>
              <option value="monthly">📆 Mensual (Por meses)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas de Métricas Predictivas (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Demanda Total Proyectada */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demanda Proyectada</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 font-mono text-xs">
              {horizonDays} días
            </span>
          </div>
          <p className="text-2xl font-black text-white">
            {forecastSummary.totalForecastedUnits || 0} <span className="text-xs text-slate-400 font-normal">unidades</span>
          </p>
          <p className="text-[11px] text-purple-400/90 font-medium">
            Estimación global de consumo con modelo {model}
          </p>
        </div>

        {/* 2. Presupuesto Recomendado de Compra */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presupuesto de Compra</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 font-bold text-xs">
              Sugerido
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            Bs. {(forecastSummary.totalRecommendedPurchaseCost || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400">
            Para cubrir demanda proyectada + stock de seguridad
          </p>
        </div>

        {/* 3. Productos en Riesgo de Quiebre */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-rose-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Riesgo de Quiebre</span>
            <span className={`p-2 rounded-xl font-bold text-xs ${
              forecastSummary.productsAtRiskOfStockout > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              ⚠️ {forecastSummary.productsAtRiskOfStockout || 0}
            </span>
          </div>
          <p className="text-2xl font-black text-white">
            {forecastSummary.productsAtRiskOfStockout || 0} <span className="text-xs text-rose-400 font-semibold">críticos</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Productos con stock estimado para menos de 7 días
          </p>
        </div>

        {/* 4. Margen Bruto y Rentabilidad Global */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Margen Bruto de Ventas</span>
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 font-mono text-xs">
              Histórico
            </span>
          </div>
          <p className="text-2xl font-black text-cyan-400">
            {kpis.netMarginPercent || 0}%
          </p>
          <p className="text-[11px] text-slate-400">
            Ganancia bruta: <strong className="text-slate-200">Bs. {(kpis.grossProfit || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>
      </div>

      {/* 3. Sección de Gráficos: Curva de Proyección Temporal + Clasificación ABC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal: Línea Histórica vs Proyección Futura */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/60 pb-3">
            <div>
              <h4 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>📈 Curva de Proyección de Demanda</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-cyan-500/20">
                  {model} ({horizonDays}d)
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Ventas reales observadas conectadas con la trayectoria pronosticada.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-cyan-400 rounded-full"></span>
                <span className="text-slate-300 text-[11px]">Real</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-purple-400 rounded-full border-t border-dashed"></span>
                <span className="text-purple-300 text-[11px]">Proyectado</span>
              </div>
            </div>
          </div>

          {/* Gráfico SVG */}
          {renderProjectionChart()}
        </div>

        {/* Gráfico Secundario: Distribución Pareto ABC */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800/60 pb-3">
              <h4 className="font-extrabold text-white text-base">Clasificación Pareto ABC</h4>
              <p className="text-xs text-slate-400 mt-0.5">Contribución de productos a los ingresos</p>
            </div>

            <div className="space-y-4 mt-5">
              {/* Clase A */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-emerald-500/30 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Clase A (Alta Rotación)
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">~80% Ventas</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Productos prioritarios. Requieren monitoreo continuo para no sufrir desabastecimiento.
                </p>
              </div>

              {/* Clase B */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-cyan-500/30 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-cyan-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Clase B (Rotación Media)
                  </span>
                  <span className="font-mono text-cyan-400 font-bold">~15% Ventas</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Productos secundarios. Reorden regular con nivel de inventario controlado.
                </p>
              </div>

              {/* Clase C */}
              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-700/50 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    Clase C (Baja Rotación)
                  </span>
                  <span className="font-mono text-slate-400 font-bold">~5% Ventas</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Productos de bajo movimiento. Evitar exceso de existencias para no inmovilizar capital.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-800/60 text-center">
            Total de productos evaluados: <strong className="text-slate-300">{forecastSummary.totalProductsEvaluated || 0}</strong>
          </div>
        </div>
      </div>

      {/* 4. Tabla Maestra de Pronóstico de Demanda y Sugerencias de Compra */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span>📋 Tabla de Pronóstico y Órdenes de Reabastecimiento</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                {filteredProducts.length} productos
              </span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Anticipación de demanda, estimación de días de stock y cálculo de unidades necesarias a pedir.
            </p>
          </div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={() => handleExportForecast('csv')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              📥 CSV
            </button>
            <button
              onClick={() => handleExportForecast('excel')}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              📊 Excel
            </button>
            <button
              onClick={() => handleExportForecast('impresion')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              🖨️ Imprimir
            </button>
          </div>
        </div>

        {/* Filtros de Tabla */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filtro Urgencia */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-400">Urgencia:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Todas las alertas</option>
                <option value="OUT_OF_STOCK">🔴 Agotados (0 unid)</option>
                <option value="CRITICAL">🔴 Críticos (&lt; 7 días)</option>
                <option value="HIGH">🟠 Alerta Alta (&lt; 15 días)</option>
                <option value="MEDIUM">🟡 Alerta Media (&lt; 30 días)</option>
                <option value="OPTIMAL">🟢 Óptimo (&gt; 30 días)</option>
              </select>
            </div>

            {/* Filtro ABC */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-400">Clase:</span>
              <select
                value={abcFilter}
                onChange={(e) => setAbcFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Todas (A, B, C)</option>
                <option value="A">🟢 Clase A (80% Ventas)</option>
                <option value="B">🔵 Clase B (15% Ventas)</option>
                <option value="C">⚪ Clase C (5% Ventas)</option>
              </select>
            </div>
          </div>

          {/* Buscador */}
          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Buscar producto o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-all"
            />
            <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Producto</th>
                <th className="py-3 px-3 font-bold text-center">Clase ABC</th>
                <th className="py-3 px-3 font-bold text-center">Stock Actual</th>
                <th className="py-3 px-3 font-bold text-center">Tasa Diaria</th>
                <th className="py-3 px-3 font-bold text-center">Demanda ({horizonDays}d)</th>
                <th className="py-3 px-4 font-bold text-center">Días de Stock</th>
                <th className="py-3 px-4 font-bold text-center bg-purple-950/30 text-purple-300 border-x border-purple-500/20">
                  Sugerencia Compra
                </th>
                <th className="py-3 px-4 font-bold text-right">Presupuesto</th>
                <th className="py-3 px-3 font-bold text-center">Precisión</th>
                <th className="py-3 px-4 font-bold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-500 text-xs">
                    No se encontraron productos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isStockout = prod.urgencyLevel === 'OUT_OF_STOCK';
                  const isCritical = prod.urgencyLevel === 'CRITICAL';
                  const isHigh = prod.urgencyLevel === 'HIGH';
                  const isMedium = prod.urgencyLevel === 'MEDIUM';

                  return (
                    <tr key={prod.ProductoID} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Producto */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-white uppercase truncate">{prod.Nombre}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {prod.CodigoBarras || `PRD-${prod.ProductoID}`} • {prod.Marca}
                        </div>
                      </td>

                      {/* 2. Clase ABC */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          prod.abcClass === 'A'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : prod.abcClass === 'B'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {prod.abcClass || 'C'}
                        </span>
                      </td>

                      {/* 3. Stock Actual */}
                      <td className="py-3 px-3 text-center font-bold">
                        <span className={prod.StockActual <= prod.StockMinimo ? 'text-amber-400' : 'text-slate-200'}>
                          {prod.StockActual}
                        </span>
                        <span className="text-slate-500 text-[10px] block font-normal">Mín: {prod.StockMinimo}</span>
                      </td>

                      {/* 4. Tasa Diaria */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-cyan-400">
                        {prod.dailyDemandRate} <span className="text-[10px] text-slate-500 font-normal">/día</span>
                      </td>

                      {/* 5. Demanda Proyectada */}
                      <td className="py-3 px-3 text-center font-bold text-white">
                        {prod.projectedDemand} <span className="text-slate-500 text-[10px] font-normal">{prod.Unidad}</span>
                      </td>

                      {/* 6. Días de Stock */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                          isStockout
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : isCritical
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : isHigh
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : isMedium
                            ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {prod.daysUntilStockout >= 999 ? '🟢 > 90 días' : prod.urgencyLabel}
                        </span>
                      </td>

                      {/* 7. Sugerencia Compra */}
                      <td className="py-3 px-4 text-center font-extrabold bg-purple-950/20 border-x border-purple-500/20">
                        <span className={prod.suggestedPurchaseUnits > 0 ? 'text-purple-300 text-sm' : 'text-slate-500'}>
                          {prod.suggestedPurchaseUnits > 0 ? `+${prod.suggestedPurchaseUnits}` : '0'}
                        </span>
                        <span className="text-slate-500 text-[10px] font-normal block">{prod.Unidad}</span>
                      </td>

                      {/* 8. Presupuesto */}
                      <td className="py-3 px-4 text-right font-bold text-slate-200 whitespace-nowrap">
                        Bs. {prod.estimatedPurchaseCost?.toFixed(2) || '0.00'}
                      </td>

                      {/* 9. Precisión */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {prod.modelAccuracy?.bestModel} ({prod.modelAccuracy?.MAPE || 0}%)
                        </span>
                      </td>

                      {/* 10. Acción */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openProductDetail(prod)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        >
                          🔬 Analizar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal de Comparación Multi-Modelo de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-bold uppercase">
                    Calibración & Comparativa
                  </span>
                  <h3 className="text-lg font-extrabold text-white uppercase">{selectedProduct.Nombre}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Código: <span className="font-mono text-cyan-400">{selectedProduct.CodigoBarras || `PRD-${selectedProduct.ProductoID}`}</span> • Stock Actual: {selectedProduct.StockActual} {selectedProduct.Unidad}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-slate-400 hover:text-white font-bold text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <svg className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Calculando modelos de predicción y métricas de error para este producto...
              </div>
            ) : productDetailData ? (
              <div className="space-y-5">
                {/* Comparación de los 3 Modelos en Tarjetas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* SES */}
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    model === 'SES' ? 'bg-purple-950/30 border-purple-500/50' : 'bg-slate-950/60 border-slate-800'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-purple-300">Suavizado Exponencial (SES)</span>
                      {selectedProduct.modelAccuracy?.bestModel === 'SES' && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-400 text-slate-950 rounded uppercase">
                          Óptimo
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-black text-white">
                      {productDetailData.models?.SES?.nextRate || 0} <span className="text-xs text-slate-400 font-normal">unid/día</span>
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                      <div>MAD: {productDetailData.models?.SES?.MAD}</div>
                      <div>MAPE: {productDetailData.models?.SES?.MAPE}%</div>
                    </div>
                  </div>

                  {/* SMA */}
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    model === 'SMA' ? 'bg-cyan-950/30 border-cyan-500/50' : 'bg-slate-950/60 border-slate-800'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-cyan-300">Promedio Móvil Simple (SMA)</span>
                      {selectedProduct.modelAccuracy?.bestModel === 'SMA' && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-400 text-slate-950 rounded uppercase">
                          Óptimo
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-black text-white">
                      {productDetailData.models?.SMA?.nextRate || 0} <span className="text-xs text-slate-400 font-normal">unid/día</span>
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                      <div>MAD: {productDetailData.models?.SMA?.MAD}</div>
                      <div>MAPE: {productDetailData.models?.SMA?.MAPE}%</div>
                    </div>
                  </div>

                  {/* WMA */}
                  <div className={`p-4 rounded-xl border space-y-2 ${
                    model === 'WMA' ? 'bg-emerald-950/30 border-emerald-500/50' : 'bg-slate-950/60 border-slate-800'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-emerald-300">Promedio Ponderado (WMA)</span>
                      {selectedProduct.modelAccuracy?.bestModel === 'WMA' && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-400 text-slate-950 rounded uppercase">
                          Óptimo
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-black text-white">
                      {productDetailData.models?.WMA?.nextRate || 0} <span className="text-xs text-slate-400 font-normal">unid/día</span>
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                      <div>MAD: {productDetailData.models?.WMA?.MAD}</div>
                      <div>MAPE: {productDetailData.models?.WMA?.MAPE}%</div>
                    </div>
                  </div>
                </div>

                {/* Resumen de Recomendación */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block">Sugerencia de Reabastecimiento ({horizonDays} días):</span>
                    <strong className="text-sm text-purple-300">
                      Pedir {selectedProduct.suggestedPurchaseUnits} {selectedProduct.Unidad}
                    </strong>
                    <span className="text-slate-500 text-[11px] ml-2">
                      (Presupuesto aprox. Bs. {selectedProduct.estimatedPurchaseCost})
                    </span>
                  </div>
                  <Link
                    to="/productsView"
                    onClick={() => setSelectedProduct(null)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all"
                  >
                    Gestionar en Productos →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictiveReportsTab;
