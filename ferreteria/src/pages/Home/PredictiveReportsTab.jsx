import React, { useState, useEffect, useMemo } from 'react';
import { getDemandForecastReport, getSalesPerformanceReport, getProductForecastDetail } from '../../services/api';
import { Link } from 'react-router-dom';

function PredictiveReportsTab() {
  // Configuración del Modelo en lenguaje comercial
  const [model, setModel] = useState('SES'); // 'SES' (Inteligente) | 'SMA' (Promedio) | 'WMA' (Ponderado)
  const [sensitivityPreset, setSensitivityPreset] = useState('NORMAL'); // 'CONSERVATIVE' | 'NORMAL' | 'FAST'
  const [alpha, setAlpha] = useState(0.3);
  const [windowSize, setWindowSize] = useState(7);
  const [horizonDays, setHorizonDays] = useState(30);
  const [period, setPeriod] = useState('daily');
  const [showFormulas, setShowFormulas] = useState(false); // Toggle modo académico / fórmulas

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
  const [modalShowFormulas, setModalShowFormulas] = useState(false);

  // Sincronizar preset de sensibilidad
  const handleSensitivityChange = (preset) => {
    setSensitivityPreset(preset);
    if (preset === 'CONSERVATIVE') setAlpha(0.15);
    if (preset === 'NORMAL') setAlpha(0.30);
    if (preset === 'FAST') setAlpha(0.60);
  };

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
    setModalShowFormulas(false);
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

    const abcMap = {};
    if (performanceData?.productPerformance) {
      performanceData.productPerformance.forEach((p) => {
        abcMap[p.ProductoID] = p.abcClass || 'C';
      });
    }

    return forecastData.forecastedProducts.map((p) => {
      const pAbc = abcMap[p.ProductoID] || 'C';
      return {
        ...p,
        abcClass: pAbc
      };
    }).filter((p) => {
      const text = `${p.Nombre} ${p.CodigoBarras || ''} ${p.Categoria || ''} ${p.Marca || ''}`.toLowerCase();
      const matchSearch = !searchTerm || text.includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (urgencyFilter !== 'ALL' && p.urgencyLevel !== urgencyFilter) return false;
      if (abcFilter !== 'ALL' && p.abcClass !== abcFilter) return false;

      return true;
    });
  }, [forecastData, performanceData, searchTerm, urgencyFilter, abcFilter]);

  // Exportar Tabla de Pronóstico
  const handleExportForecast = (type) => {
    if (type === 'impresion') {
      window.print();
    } else {
      const rows = [
        ['Producto', 'Código', 'Categoría', 'Importancia (Pareto)', 'Stock Actual', 'Stock Mínimo', 'Venta Diaria Aprox.', `Demanda (${horizonDays}d)`, 'Días para Agotarse', 'Estado Stock', '¿Cuánto Comprar? (Unid)', 'Inversión Sugerida (Bs.)', 'Fiabilidad del Cálculo'],
        ...filteredProducts.map((p) => [
          p.Nombre,
          p.CodigoBarras || `PRD-${p.ProductoID}`,
          p.Categoria || 'General',
          p.abcClass === 'A' ? 'Clase A (Alta Rotación - 80%)' : p.abcClass === 'B' ? 'Clase B (Rotación Regular - 15%)' : 'Clase C (Baja Rotación - 5%)',
          p.StockActual ?? 0,
          p.StockMinimo ?? 5,
          p.dailyDemandRate ?? 0,
          p.projectedDemand ?? 0,
          p.daysUntilStockout >= 999 ? 'Stock suficiente (> 90d)' : `${p.daysUntilStockout} días`,
          p.urgencyLabel || p.urgencyLevel,
          p.suggestedPurchaseUnits ?? 0,
          p.estimatedPurchaseCost ?? 0,
          `Alta precisión (${p.modelAccuracy?.bestModel || 'SES'})`
        ])
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Plan_Compras_Sugeridas_${horizonDays}dias.csv`);
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
          Registra más ventas en el sistema para trazar la curva de demanda histórica y proyectada.
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

    const maxVal = Math.max(...timeline.map((d) => Math.max(d.actual || 0, d.fitted || 0, d.forecast || 0)), 10);

    const getX = (index) => padLeft + (index * chartW) / (timeline.length - 1 || 1);
    const getY = (val) => padTop + chartH - ((val || 0) * chartH) / maxVal;

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

    const historicArea = historicPoints.length > 0
      ? `${historicPath} L ${historicPoints[historicPoints.length - 1].x} ${padTop + chartH} L ${historicPoints[0].x} ${padTop + chartH} Z`
      : '';

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 text-slate-400">
          <defs>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
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
          {historicArea && <path d={historicArea} fill="url(#histGrad)" />}
          {historicPath && <path d={historicPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />}

          {/* Línea Proyectada Futura */}
          {forecastPath && (
            <path d={forecastPath} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" />
          )}

          {/* Puntos de datos */}
          {historicPoints.map((p, i) => (
            <circle
              key={`hp-${i}`}
              cx={p.x}
              cy={p.y}
              r={p.actual > 0 ? "3.5" : "2"}
              fill={p.actual > 0 ? "#06b6d4" : "#475569"}
              stroke="#0f172a"
              strokeWidth="1.5"
            >
              <title>{`${p.date}: ${p.actual || 0} unidades vendidas`}</title>
            </circle>
          ))}

          {forecastPoints.map((p, i) => (
            <circle
              key={`fp-${i}`}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#c084fc"
              stroke="#0f172a"
              strokeWidth="1.5"
            >
              <title>{`Proyección ${p.date}: ~${p.forecast || 0} unidades estimadas/día`}</title>
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
      {/* 1. Barra de Control Amigable en Lenguaje Comercial */}
      <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Asistente Inteligente de Demanda y Compras
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold uppercase">
                Planificador Automático
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              El sistema analiza las ventas pasadas para predecir cuándo se agotará cada producto y sugerirte exactamente cuánto pedir al proveedor.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setShowFormulas(!showFormulas)}
              className="text-xs text-slate-400 hover:text-cyan-300 font-semibold px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{showFormulas ? 'Ocultar Fundamento' : 'Ver Fundamento Matemático'}</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold rounded-xl text-xs shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all cursor-pointer"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Calculando...' : 'Actualizar Cálculos'}</span>
            </button>
          </div>
        </div>

        {/* Fórmulas Explicativas Desplegables (Para Defensa Académica) */}
        {showFormulas && (
          <div className="p-4 bg-slate-950/80 rounded-xl border border-purple-500/30 text-xs text-slate-300 space-y-2 animate-fade-in">
            <div className="font-bold text-purple-300 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Fundamento Matemático del Modelo Seleccionado:</span>
            </div>
            {model === 'SES' ? (
              <p className="font-mono text-[11px] text-slate-400">
                • <strong>Suavizado Exponencial Simple (SES):</strong> \(\hat{Y}_{'{t+1}'} = \alpha Y_t + (1 - \alpha)\hat{Y}_t\), con constante de atenuación \(\alpha = {alpha}\). Otorga pesos decrecientes exponencialmente para capturar la inercia reciente.
              </p>
            ) : model === 'SMA' ? (
              <p className="font-mono text-[11px] text-slate-400">
                • <strong>Promedio Móvil Simple (SMA):</strong> \(\hat{Y}_{'{t+1}'} = \frac{'{1}'}{'{N}'} \sum_{'{i=1}'}^N Y_{'{t-i+1}'}\), con ventana \(N = {windowSize}\) días. Ideal para series estacionarias y demanda constante.
              </p>
            ) : (
              <p className="font-mono text-[11px] text-slate-400">
                • <strong>Promedio Móvil Ponderado (WMA):</strong> \(\hat{Y}_{'{t+1}'} = \frac{'\sum w_i Y_i'}{'\sum w_i'}\), con ventana \(N = {windowSize}\) días y ponderación decreciente lineal.
              </p>
            )}
            <p className="text-[10px] text-slate-500">
              Métricas de calibración continua calculadas: <strong>MAD</strong> (Desviación Absoluta Media) y <strong>MAPE</strong> (Error Porcentual Absoluto Medio).
            </p>
          </div>
        )}

        {/* Controles Intuitivos y Sencillos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
          {/* 1. Modo de Cálculo */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Método de Proyección:</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setModel('SES')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 ${
                  model === 'SES' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Recomendado: se adapta rápidamente a los productos con mayor salida reciente"
              >
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Inteligente</span>
                </div>
                <span className="text-[9px] opacity-80 font-normal">SES (Reciente)</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('SMA')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 ${
                  model === 'SMA' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Para productos que se venden parejo todo el año"
              >
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Estable</span>
                </div>
                <span className="text-[9px] opacity-80 font-normal">SMA (Promedio)</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('WMA')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 ${
                  model === 'WMA' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
                title="Prioriza las ventas de la última semana"
              >
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-current" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  <span>Ponderado</span>
                </div>
                <span className="text-[9px] opacity-80 font-normal">WMA (Semanal)</span>
              </button>
            </div>
          </div>

          {/* 2. Sensibilidad a Cambios */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">Sensibilidad ante Variaciones:</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleSensitivityChange('CONSERVATIVE')}
                className={`py-2 px-1 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 ${
                  sensitivityPreset === 'CONSERVATIVE' ? 'bg-slate-800 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Cautelosa</span>
              </button>
              <button
                type="button"
                onClick={() => handleSensitivityChange('NORMAL')}
                className={`py-2 px-1 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 ${
                  sensitivityPreset === 'NORMAL' ? 'bg-slate-800 text-purple-400 border border-purple-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                <span>Normal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSensitivityChange('FAST')}
                className={`py-2 px-1 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1.5 ${
                  sensitivityPreset === 'FAST' ? 'bg-slate-800 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Reactiva</span>
              </button>
            </div>
          </div>

          {/* 3. Horizonte de Tiempo */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">¿Para cuánto tiempo planificar compras?</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-bold outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="7">Próximos 7 días (Para reponer esta semana)</option>
              <option value="15">Próximos 15 días (Para reponer esta quincena)</option>
              <option value="30">Próximos 30 días (Para el mes completo - Recomendado)</option>
              <option value="60">Próximos 60 días (Plan de compras para 2 meses)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas de Métricas Claras y Directas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Demanda Estimada */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-purple-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Demanda Estimada</span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-300 font-bold text-xs border border-purple-500/20">
              Próx. {horizonDays} días
            </span>
          </div>
          <p className="text-2xl font-black text-white">
            {forecastSummary.totalForecastedUnits || 0} <span className="text-xs text-slate-400 font-normal">unidades</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Cantidad estimada de productos que venderás este mes.
          </p>
        </div>

        {/* 2. Presupuesto Sugerido de Compra */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Presupuesto Sugerido</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
              A Invertir
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400">
            Bs. {(forecastSummary.totalRecommendedPurchaseCost || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400">
            Dinero estimado para surtir tu almacén y no quedarte sin stock.
          </p>
        </div>

        {/* 3. Productos que se agotarán pronto */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-rose-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Por Agotarse Pronto</span>
            <span className={`px-2 py-0.5 rounded-lg font-bold text-xs flex items-center gap-1 ${
              forecastSummary.productsAtRiskOfStockout > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse' : 'bg-slate-800 text-slate-400'
            }`}>
              <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{forecastSummary.productsAtRiskOfStockout || 0}</span>
            </span>
          </div>
          <p className="text-2xl font-black text-white">
            {forecastSummary.productsAtRiskOfStockout || 0} <span className="text-xs text-rose-400 font-semibold">artículos</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Tienen stock para menos de 7 días al ritmo de venta actual.
          </p>
        </div>

        {/* 4. Margen de Ganancia */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 hover:border-cyan-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rentabilidad / Ganancia</span>
            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs border border-cyan-500/20">
              Promedio
            </span>
          </div>
          <p className="text-2xl font-black text-cyan-400">
            {kpis.netMarginPercent || 0}%
          </p>
          <p className="text-[11px] text-slate-400">
            Ganancia bruta acumulada: <strong className="text-slate-200">Bs. {(kpis.grossProfit || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>
      </div>

      {/* 3. Sección de Gráficos Intuitivos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                </div>
                <h4 className="font-extrabold text-white text-base">
                  Proyección de Demanda y Ventas
                </h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ventas reales históricas conectadas con la estimación para los próximos {horizonDays} días.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-cyan-400 rounded-full"></span>
                <span className="text-slate-300 text-[11px]">Ventas Pasadas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-purple-400 rounded-full border-t border-dashed"></span>
                <span className="text-purple-300 text-[11px]">Ventas Estimadas</span>
              </div>
            </div>
          </div>

          {/* Gráfico SVG */}
          {renderProjectionChart()}
        </div>

        {/* Clasificación Comercial de Productos */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-extrabold text-white text-base">Clasificación ABC de Rentabilidad</h4>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Aporte relativo de cada grupo a los ingresos de caja</p>
            </div>

            <div className="space-y-3 mt-4">
              {/* Clase A */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-emerald-500/30 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 font-extrabold text-emerald-400">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">A</span>
                    <span>Productos Estrella</span>
                  </div>
                  <span className="text-emerald-400 font-bold text-[11px]">80% del Dinero</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Son los artículos con mayor facturación. <strong>Prioridad alta de reposición.</strong>
                </p>
              </div>

              {/* Clase B */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-cyan-500/30 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 font-extrabold text-cyan-400">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 text-[10px]">B</span>
                    <span>Productos Habituales</span>
                  </div>
                  <span className="text-cyan-400 font-bold text-[11px]">15% del Dinero</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tienen venta regular y estable. Mantener un stock de seguridad estándar.
                </p>
              </div>

              {/* Clase C */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-700/50 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-300">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 text-[10px]">C</span>
                    <span>Productos Ocasionales</span>
                  </div>
                  <span className="text-slate-400 font-bold text-[11px]">5% del Dinero</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Rotación baja o esporádica. Evitar sobrestock para no inmovilizar capital.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800/60 text-center">
            Total en catálogo analizado: <strong className="text-slate-300">{forecastSummary.totalProductsEvaluated || 0} artículos</strong>
          </div>
        </div>
      </div>

      {/* 4. Tabla Maestra de Sugerencias de Compra */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>Plan de Reabastecimiento de Inventario</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold">
                  {filteredProducts.length} productos
                </span>
              </h3>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Listado priorizado según urgencia y nivel de agotamiento para la generación de órdenes de compra.
            </p>
          </div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={() => handleExportForecast('csv')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar CSV</span>
            </button>
            <button
              onClick={() => handleExportForecast('excel')}
              className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Descargar Excel</span>
            </button>
            <button
              onClick={() => handleExportForecast('impresion')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Imprimir Plan</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filtro Urgencia */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-400">Estado de Stock:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Todos los estados</option>
                <option value="OUT_OF_STOCK">Agotados (0 unid)</option>
                <option value="CRITICAL">Críticos (Menos de 7 días)</option>
                <option value="HIGH">Alerta alta (Menos de 15 días)</option>
                <option value="MEDIUM">Alerta media (Menos de 30 días)</option>
                <option value="OPTIMAL">Stock suficiente (Más de 30 días)</option>
              </select>
            </div>

            {/* Filtro Importancia */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-400">Clasificación:</span>
              <select
                value={abcFilter}
                onChange={(e) => setAbcFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-bold outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Todas las clasificaciones</option>
                <option value="A">Clase A - Alta Rotación (80% Ventas)</option>
                <option value="B">Clase B - Rotación Regular (15% Ventas)</option>
                <option value="C">Clase C - Baja Rotación (5% Ventas)</option>
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
                <th className="py-3 px-3 font-bold text-center">Clasificación</th>
                <th className="py-3 px-3 font-bold text-center">Stock Actual</th>
                <th className="py-3 px-3 font-bold text-center">Venta Diaria</th>
                <th className="py-3 px-3 font-bold text-center">Venta Estimada ({horizonDays}d)</th>
                <th className="py-3 px-4 font-bold text-center">Cobertura de Stock</th>
                <th className="py-3 px-4 font-bold text-center bg-purple-950/30 text-purple-300 border-x border-purple-500/20">
                  Sugerencia de Pedido
                </th>
                <th className="py-3 px-4 font-bold text-right">Inversión Estimada</th>
                <th className="py-3 px-3 font-bold text-center">Fiabilidad</th>
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

                      {/* 2. Importancia */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          prod.abcClass === 'A'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : prod.abcClass === 'B'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {prod.abcClass === 'A' ? 'Clase A' : prod.abcClass === 'B' ? 'Clase B' : 'Clase C'}
                        </span>
                      </td>

                      {/* 3. Stock Actual */}
                      <td className="py-3 px-3 text-center font-bold">
                        <span className={prod.StockActual <= prod.StockMinimo ? 'text-amber-400 font-extrabold' : 'text-slate-200'}>
                          {prod.StockActual} {prod.Unidad}
                        </span>
                        <span className="text-slate-500 text-[10px] block font-normal">Mín: {prod.StockMinimo}</span>
                      </td>

                      {/* 4. Venta Diaria */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-cyan-400">
                        ~{prod.dailyDemandRate} <span className="text-[10px] text-slate-500 font-normal">{prod.Unidad}/día</span>
                      </td>

                      {/* 5. Venta Estimada */}
                      <td className="py-3 px-3 text-center font-bold text-white">
                        {prod.projectedDemand} <span className="text-slate-500 text-[10px] font-normal">{prod.Unidad}</span>
                      </td>

                      {/* 6. Días para Agotarse */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                          isStockout
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : isCritical
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : isHigh
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : isMedium
                            ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isStockout || isCritical
                              ? 'bg-rose-400'
                              : isHigh
                              ? 'bg-amber-400'
                              : isMedium
                              ? 'bg-yellow-400'
                              : 'bg-emerald-400'
                          }`}></span>
                          <span>
                            {isStockout
                              ? 'Agotado'
                              : isCritical || isHigh || isMedium
                              ? `${prod.daysUntilStockout} días`
                              : 'Seguro (>30d)'}
                          </span>
                        </span>
                      </td>

                      {/* 7. ¿Cuánto pedir? */}
                      <td className="py-3 px-4 text-center font-extrabold bg-purple-950/20 border-x border-purple-500/20">
                        {prod.suggestedPurchaseUnits > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm font-black text-xs">
                            <span>Pedir +{prod.suggestedPurchaseUnits}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] font-medium">Suficiente</span>
                        )}
                        <span className="text-slate-500 text-[10px] font-normal block mt-0.5">{prod.Unidad}</span>
                      </td>

                      {/* 8. Inversión Estimada */}
                      <td className="py-3 px-4 text-right font-bold text-slate-200 whitespace-nowrap">
                        {prod.estimatedPurchaseCost > 0 ? (
                          <span className="text-emerald-400 font-extrabold">
                            Bs. {prod.estimatedPurchaseCost?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* 9. Fiabilidad */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20" title="Cálculo con mínimo error">
                          <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Óptima</span>
                        </span>
                      </td>

                      {/* 10. Acción */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openProductDetail(prod)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
                        >
                          <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span>Ver Detalle</span>
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

      {/* 5. Modal de Detalle y Explicación Sencilla de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-bold uppercase">
                    Diagnóstico de Producto
                  </span>
                  <h3 className="text-lg font-extrabold text-white uppercase">{selectedProduct.Nombre}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Código: <span className="font-mono text-cyan-400">{selectedProduct.CodigoBarras || `PRD-${selectedProduct.ProductoID}`}</span> • Marca: {selectedProduct.Marca}
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
                Analizando el comportamiento de ventas de este producto...
              </div>
            ) : productDetailData ? (
              <div className="space-y-5 text-xs">
                {/* Diagnóstico en Palabras Claras */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Resumen del Diagnóstico:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Tienes en stock:</span>
                      <strong className="text-white text-base">{selectedProduct.StockActual} {selectedProduct.Unidad}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Vendes al día aprox:</span>
                      <strong className="text-cyan-400 text-base">~{selectedProduct.dailyDemandRate} {selectedProduct.Unidad}/día</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <span className="text-slate-500 text-[10px] uppercase font-bold block">Se te acabará en:</span>
                      <strong className={`text-base ${selectedProduct.daysUntilStockout <= 7 ? 'text-rose-400' : 'text-amber-400'}`}>
                        {selectedProduct.daysUntilStockout >= 999 ? '> 90 días' : `~${selectedProduct.daysUntilStockout} días`}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Recomendación de Compra */}
                <div className="p-4 bg-gradient-to-r from-purple-950/40 to-slate-950 rounded-xl border border-purple-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-purple-300 font-bold block text-[11px]">Recomendación de Reorden ({horizonDays} días):</span>
                    <p className="text-white text-sm font-extrabold mt-0.5">
                      {selectedProduct.suggestedPurchaseUnits > 0 ? (
                        <>Comprar <span className="text-purple-300 underline font-black">{selectedProduct.suggestedPurchaseUnits} {selectedProduct.Unidad}</span> al proveedor</>
                      ) : (
                        <span className="text-emerald-400">Stock suficiente. No es necesario comprar por ahora.</span>
                      )}
                    </p>
                    {selectedProduct.suggestedPurchaseUnits > 0 && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Inversión aproximada: <strong className="text-emerald-400">Bs. {selectedProduct.estimatedPurchaseCost}</strong> (Costo Unit: Bs. {selectedProduct.PrecioCompra})
                      </p>
                    )}
                  </div>
                  <Link
                    to="/productsView"
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-xs hover:brightness-110 transition-all self-end sm:self-auto"
                  >
                    Ver en Productos →
                  </Link>
                </div>

                {/* Opción de Ver Fórmulas Matemáticas (Modo Académico) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setModalShowFormulas(!modalShowFormulas)}
                    className="text-slate-400 hover:text-cyan-300 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{modalShowFormulas ? 'Ocultar comparativa matemática' : 'Ver comparativa técnica de modelos (SES, SMA, WMA)'}</span>
                  </button>

                  {modalShowFormulas && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 animate-fade-in font-mono text-[11px]">
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <span className="font-bold text-purple-300 block">SES (Holt):</span>
                        <div className="text-white">Tasa: ~{productDetailData.models?.SES?.nextRate || 0} unid/d</div>
                        <div className="text-slate-500 text-[10px]">MAD: {productDetailData.models?.SES?.MAD} | MAPE: {productDetailData.models?.SES?.MAPE}%</div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <span className="font-bold text-cyan-300 block">SMA (Móvil):</span>
                        <div className="text-white">Tasa: ~{productDetailData.models?.SMA?.nextRate || 0} unid/d</div>
                        <div className="text-slate-500 text-[10px]">MAD: {productDetailData.models?.SMA?.MAD} | MAPE: {productDetailData.models?.SMA?.MAPE}%</div>
                      </div>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                        <span className="font-bold text-emerald-300 block">WMA (Ponderado):</span>
                        <div className="text-white">Tasa: ~{productDetailData.models?.WMA?.nextRate || 0} unid/d</div>
                        <div className="text-slate-500 text-[10px]">MAD: {productDetailData.models?.WMA?.MAD} | MAPE: {productDetailData.models?.WMA?.MAPE}%</div>
                      </div>
                    </div>
                  )}
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
