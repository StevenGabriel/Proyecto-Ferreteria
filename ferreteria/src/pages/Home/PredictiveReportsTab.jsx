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
  const [showGuide, setShowGuide] = useState(false); // Toggle guía de uso

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
        <div className="h-80 flex items-center justify-center text-slate-500 text-xs">
          Registra más ventas en el sistema para trazar la curva de demanda histórica y proyectada.
        </div>
      );
    }

    const svgWidth = 860;
    const svgHeight = 320;
    const padLeft = 45;
    const padRight = 35;
    const padTop = 32;
    const padBottom = 40;

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

    // Promedio histórico de días con venta > 0
    const historicActuals = historicPoints.map(p => p.actual || 0).filter(v => v > 0);
    const avgVal = historicActuals.length > 0
      ? historicActuals.reduce((a, b) => a + b, 0) / historicActuals.length
      : 0;
    const avgY = getY(avgVal);

    // Top picos históricos filtrando los que estén demasiado pegados en X para evitar solapamiento
    const sortedPeaks = [...historicPoints]
      .filter(p => (p.actual || 0) > 0)
      .sort((a, b) => (b.actual || 0) - (a.actual || 0));

    const topPeaks = [];
    for (const peak of sortedPeaks) {
      if (topPeaks.length >= 3) break;
      const isTooClose = topPeaks.some(p => Math.abs(p.x - peak.x) < 35);
      if (!isTooClose) {
        topPeaks.push(peak);
      }
    }

    // Línea divisora HOY — buscar el índice donde empieza el forecast
    const todayIdx = timeline.findIndex(d => d.type === 'FORECAST');
    const todayX = todayIdx >= 0 ? getX(todayIdx) : (lastHistoricPoint?.x || null);

    return (
      <div className="w-full overflow-x-auto relative">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-80 text-zinc-400 select-none">
          <defs>
            <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="foreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Zona de proyección sombreada */}
          {todayX && (
            <rect
              x={todayX}
              y={padTop}
              width={svgWidth - padRight - todayX}
              height={chartH}
              fill="#f59e0b"
              fillOpacity="0.05"
              rx="4"
            />
          )}

          {/* Líneas Guía Horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
            const y = padTop + chartH - p * chartH;
            const val = Math.round(p * maxVal);
            return (
              <g key={i}>
                <line x1={padLeft} y1={y} x2={svgWidth - padRight} y2={y} stroke="#27272a" strokeDasharray="3 3" />
                <text x={padLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#a1a1aa" className="font-mono tabular-nums font-medium">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Línea de Promedio Histórico */}
          {avgVal > 0 && (
            <g>
              <line
                x1={padLeft} y1={avgY}
                x2={svgWidth - padRight} y2={avgY}
                stroke="#71717a"
                strokeDasharray="6 4"
                strokeOpacity="0.85"
                strokeWidth="1.5"
              />
              <rect x={padLeft + 4} y={avgY - 12} width={108} height={18} rx="4" fill="#0c0e12" stroke="#3f3f46" strokeWidth="1" />
              <text x={padLeft + 10} y={avgY} fontSize="10" fill="#d4d4d8" fontWeight="bold" dominantBaseline="middle" className="font-mono tabular-nums">
                Prom: {Math.round(avgVal)} un/día
              </text>
            </g>
          )}

          {/* Área y Línea Histórica */}
          {historicArea && <path d={historicArea} fill="url(#histGrad)" />}
          {historicPath && <path d={historicPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

          {/* Línea Proyectada Futura */}
          {forecastPath && (
            <path d={forecastPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Puntos de datos históricos */}
          {historicPoints.map((p, i) => (
            <circle
              key={`hp-${i}`}
              cx={p.x}
              cy={p.y}
              r={p.actual > 0 ? "3.5" : "2.5"}
              fill={p.actual > 0 ? "#10b981" : "#52525b"}
              stroke="#0c0e12"
              strokeWidth="2"
              className="transition-transform duration-150 ease-out-expo hover:scale-125 cursor-pointer"
            >
              <title>{`Fecha: ${p.date}\nVentas reales: ${p.actual || 0} unidades`}</title>
            </circle>
          ))}

          {/* Puntos de proyección */}
          {forecastPoints.map((p, i) => (
            <circle
              key={`fp-${i}`}
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="#f59e0b"
              stroke="#0c0e12"
              strokeWidth="2"
              className="transition-transform duration-150 ease-out-expo hover:scale-125 cursor-pointer"
            >
              <title>{`Fecha: ${p.date}\nDemanda estimada: ~${p.forecast || 0} unidades/día`}</title>
            </circle>
          ))}

          {/* Etiquetas de los picos más altos */}
          {topPeaks.map((p, i) => {
            const labelY = p.y - 14;
            const safeY = Math.max(padTop + 14, labelY);
            return (
              <g key={`peak-${i}`}>
                <rect
                  x={p.x - 20}
                  y={safeY - 12}
                  width={40}
                  height={17}
                  rx="4"
                  fill="#0c0e12"
                  stroke="#10b981"
                  strokeOpacity="0.7"
                  strokeWidth="1"
                />
                <text
                  x={p.x}
                  y={safeY - 1}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#34d399"
                  fontWeight="bold"
                  className="font-mono tabular-nums"
                >
                  {p.actual} un
                </text>
              </g>
            );
          })}

          {/* Línea vertical HOY */}
          {todayX && (
            <g>
              <line
                x1={todayX} y1={padTop}
                x2={todayX} y2={padTop + chartH}
                stroke="#a1a1aa"
                strokeDasharray="4 3"
                strokeWidth="1.5"
                strokeOpacity="0.8"
              />
              <rect x={todayX - 22} y={padTop - 4} width={44} height={18} rx="4" fill="#0c0e12" stroke="#f59e0b" strokeWidth="1" />
              <text x={todayX} y={padTop + 8} textAnchor="middle" fontSize="10" fill="#fbbf24" fontWeight="bold" className="font-mono">
                HOY
              </text>
            </g>
          )}

          {/* Etiquetas Eje X */}
          {timeline.filter((_, i) => i % Math.ceil(timeline.length / 8) === 0 || i === timeline.length - 1).map((d, i) => {
            const idx = timeline.indexOf(d);
            const x = getX(idx);
            return (
              <text key={i} x={x} y={svgHeight - 12} textAnchor="middle" fontSize="11" fill="#a1a1aa" className="font-mono tabular-nums font-medium">
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
    <div className="space-y-6 animate-fade-in">

      {/* 0. Panel de Ayuda / Guía de Uso */}
      <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowGuide(v => !v)}
          className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-100">Guía de interpretación del motor predictivo</p>
              <p className="text-xs text-zinc-400">Cómo elegir entre Suavizamiento Exponencial (SES), Promedio Móvil (SMA) y Ponderado (WMA)</p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition-transform duration-180 ease-out-expo flex-shrink-0 ${showGuide ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showGuide && (
          <div className="px-5 pb-5 pt-3 border-t border-zinc-800/80 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* SES */}
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <p className="text-xs font-bold text-zinc-100">Inteligente <span className="text-zinc-500 font-mono font-normal">(SES)</span></p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Pondera exponencialmente las ventas recientes. Recomendado cuando un insumo presenta cambios rápidos de rotación.
                </p>
              </div>
              {/* SMA */}
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                  <p className="text-xs font-bold text-zinc-100">Promedio Estable <span className="text-zinc-500 font-mono font-normal">(SMA)</span></p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Calcula la media aritmética de la ventana histórica. Ideal para ferretería básica de demanda constante.
                </p>
              </div>
              {/* WMA */}
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-300 flex-shrink-0"></span>
                  <p className="text-xs font-bold text-zinc-100">Ponderado <span className="text-zinc-500 font-mono font-normal">(WMA)</span></p>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Asigna mayor peso lineal a los últimos días sin descartar la tendencia base de la semana.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Barra de Control en Lenguaje Comercial */}
      <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
                Planificador de Demanda y Reabastecimiento
              </h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
                CÁLCULO AUTOMÁTICO
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Proyección matemática sobre el historial real de ventas para anticipar quiebres de stock y dimensionar compras.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <button
              onClick={loadData}
              disabled={loading}
              title="Recargar datos del servidor"
              className="flex items-center gap-2 px-3.5 py-2 bg-[#0c0e12] hover:bg-zinc-800 text-amber-400 border border-zinc-800 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo btn-press cursor-pointer"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Recalculando...' : 'Actualizar cálculo'}</span>
            </button>
          </div>
        </div>

        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-xs">
          {/* 1. Modo de Cálculo */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 block">Método de proyección</label>
            <div className="grid grid-cols-3 gap-1 bg-[#0c0e12] p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setModel('SES')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  model === 'SES' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Inteligente</span>
                <span className="font-mono text-[9px] opacity-80 font-normal">SES</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('SMA')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  model === 'SMA' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Estable</span>
                <span className="font-mono text-[9px] opacity-80 font-normal">SMA</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('WMA')}
                className={`py-2 px-1.5 rounded-lg font-bold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                  model === 'WMA' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Ponderado</span>
                <span className="font-mono text-[9px] opacity-80 font-normal">WMA</span>
              </button>
            </div>
          </div>

          {/* 2. Sensibilidad a Cambios */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 block">Sensibilidad ante variaciones</label>
            <div className="grid grid-cols-3 gap-1 bg-[#0c0e12] p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => handleSensitivityChange('CONSERVATIVE')}
                className={`py-2 px-1 rounded-lg font-semibold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex items-center justify-center gap-1.5 cursor-pointer ${
                  sensitivityPreset === 'CONSERVATIVE'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Conservadora</span>
              </button>
              <button
                type="button"
                onClick={() => handleSensitivityChange('NORMAL')}
                className={`py-2 px-1 rounded-lg font-semibold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex items-center justify-center gap-1.5 cursor-pointer ${
                  sensitivityPreset === 'NORMAL'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Normal</span>
              </button>
              <button
                type="button"
                onClick={() => handleSensitivityChange('FAST')}
                className={`py-2 px-1 rounded-lg font-semibold text-[11px] transition-colors duration-160 ease-out-expo btn-press flex items-center justify-center gap-1.5 cursor-pointer ${
                  sensitivityPreset === 'FAST'
                    ? 'bg-zinc-800 text-amber-400 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span>Reactiva</span>
              </button>
            </div>
          </div>

          {/* 3. Horizonte de Tiempo */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 block">Horizonte de planificación</label>
            <select
              value={horizonDays}
              onChange={(e) => setHorizonDays(parseInt(e.target.value))}
              className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-200 font-semibold outline-none focus:border-amber-500/70 transition-colors duration-160 ease-out-expo cursor-pointer"
            >
              <option value="7">Próximos 7 días (Reposición semanal)</option>
              <option value="15">Próximos 15 días (Reposición quincenal)</option>
              <option value="30">Próximos 30 días (Mes completo — Recomendado)</option>
              <option value="60">Próximos 60 días (Plan bimestral)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Cuatro Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Demanda Estimada */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Demanda proyectada</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono tabular-nums font-semibold text-[10px] border border-amber-500/25">
              {horizonDays} días
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-zinc-100">
            {forecastSummary.totalForecastedUnits || 0} <span className="text-xs font-sans text-zinc-400 font-normal">unidades</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Volumen total estimado de salida en el horizonte elegido.
          </p>
        </div>

        {/* 2. Presupuesto Sugerido de Compra */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Presupuesto sugerido</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-semibold border border-emerald-500/25">
              REORDEN
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-emerald-400">
            Bs. {(forecastSummary.totalRecommendedPurchaseCost || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-zinc-400">
            Inversión estimada para cubrir faltantes y stock de seguridad.
          </p>
        </div>

        {/* 3. Productos que se agotarán pronto */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Riesgo de quiebre</span>
            <span className={`px-2 py-0.5 rounded-md font-mono tabular-nums font-bold text-[10px] flex items-center gap-1 ${
              forecastSummary.productsAtRiskOfStockout > 0
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              <span>{forecastSummary.productsAtRiskOfStockout || 0}</span>
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-rose-400">
            {forecastSummary.productsAtRiskOfStockout || 0} <span className="text-xs font-sans text-zinc-400 font-normal">artículos</span>
          </p>
          <p className="text-[11px] text-zinc-400">
            Cobertura inferior a 7 días al ritmo de venta actual.
          </p>
        </div>

        {/* 4. Margen de Ganancia */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">Rentabilidad bruta</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[10px] font-semibold border border-zinc-700">
              PROMEDIO
            </span>
          </div>
          <p className="text-2xl font-mono tabular-nums font-bold text-amber-400">
            {kpis.netMarginPercent || 0}%
          </p>
          <p className="text-[11px] text-zinc-400">
            Utilidad acumulada: <strong className="font-mono tabular-nums text-zinc-200">Bs. {(kpis.grossProfit || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</strong>
          </p>
        </div>
      </div>

      {/* 3. Sección de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gráfico Principal */}
        <div className="lg:col-span-2 bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800/80 pb-3.5">
            <div>
              <h4 className="font-bold text-zinc-100 text-base">
                Curva Histórica y Proyección de Demanda
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Unidades vendidas conectadas con la proyección de los próximos {horizonDays} días.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-emerald-400 rounded-full"></span>
                <span className="text-zinc-300 text-[11px]">Ventas reales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-amber-400 rounded-full"></span>
                <span className="text-amber-300 text-[11px]">Proyección ({model})</span>
              </div>
            </div>
          </div>

          {renderProjectionChart()}
        </div>

        {/* Clasificación Comercial ABC */}
        <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-zinc-800/80 pb-3.5">
              <h4 className="font-bold text-zinc-100 text-base">Clasificación Pareto (ABC)</h4>
              <p className="text-xs text-zinc-400 mt-0.5">Aporte relativo de cada grupo a la facturación</p>
            </div>

            <div className="space-y-3 mt-4">
              {/* Clase A */}
              <div className="p-3 bg-[#0c0e12] rounded-xl border border-emerald-500/25 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">A</span>
                    <span>Alta Rotación</span>
                  </div>
                  <span className="font-mono tabular-nums text-emerald-400 font-bold text-[11px]">80% ingresos</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Artículos críticos de facturación. Prioridad máxima de reposición.
                </p>
              </div>

              {/* Clase B */}
              <div className="p-3 bg-[#0c0e12] rounded-xl border border-amber-500/25 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] border border-amber-500/30">B</span>
                    <span>Rotación Regular</span>
                  </div>
                  <span className="font-mono tabular-nums text-amber-400 font-bold text-[11px]">15% ingresos</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Salida constante. Mantener stock de seguridad estándar.
                </p>
              </div>

              {/* Clase C */}
              <div className="p-3 bg-[#0c0e12] rounded-xl border border-zinc-800 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2 font-bold text-zinc-300">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] border border-zinc-700">C</span>
                    <span>Rotación Ocasional</span>
                  </div>
                  <span className="font-mono tabular-nums text-zinc-400 font-bold text-[11px]">5% ingresos</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Demanda esporádica. Evitar sobrecompra para no inmovilizar capital.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <span>Catálogo evaluado:</span>
            <strong className="font-mono tabular-nums text-zinc-200">{forecastSummary.totalProductsEvaluated || 0} artículos</strong>
          </div>
        </div>
      </div>

      {/* 4. Tabla Maestra de Sugerencias de Compra */}
      <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>Plan de Reabastecimiento Sugerido</span>
                <span className="font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 font-semibold">
                  {filteredProducts.length} productos
                </span>
              </h3>
            </div>
            <p className="text-zinc-400 text-xs mt-1">
              Ordenado por urgencia de cobertura para generación de órdenes de compra a proveedores.
            </p>
          </div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-1.5 self-start lg:self-auto">
            <button
              onClick={() => handleExportForecast('csv')}
              className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-800 transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
            >
              <span>Exportar CSV</span>
            </button>
            <button
              onClick={() => handleExportForecast('excel')}
              className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-emerald-400 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
            >
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={() => handleExportForecast('impresion')}
              className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-800 transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
            >
              <span>Imprimir Plan</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-400">Urgencia:</span>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs font-semibold outline-none focus:border-amber-500/70 cursor-pointer"
              >
                <option value="ALL">Todos los estados</option>
                <option value="OUT_OF_STOCK">Agotados (0 unid)</option>
                <option value="CRITICAL">Críticos (menos de 7 días)</option>
                <option value="HIGH">Alerta alta (menos de 15 días)</option>
                <option value="MEDIUM">Alerta media (menos de 30 días)</option>
                <option value="OPTIMAL">Stock suficiente (&gt; 30 días)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-400">Pareto:</span>
              <select
                value={abcFilter}
                onChange={(e) => setAbcFilter(e.target.value)}
                className="bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs font-semibold outline-none focus:border-amber-500/70 cursor-pointer"
              >
                <option value="ALL">Todas las clases</option>
                <option value="A">Clase A — Alta rotación</option>
                <option value="B">Clase B — Rotación regular</option>
                <option value="C">Clase C — Baja rotación</option>
              </select>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              placeholder="Buscar producto o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/70 transition-colors duration-160 ease-out-expo"
            />
            <svg className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800/90 bg-[#0c0e12]">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/80 text-zinc-400 text-[11px] font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-3 text-center">ABC</th>
                <th className="py-3 px-3 text-center">Stock actual</th>
                <th className="py-3 px-3 text-center">Venta diaria</th>
                <th className="py-3 px-3 text-center">Demanda ({horizonDays}d)</th>
                <th className="py-3 px-4 text-center">Cobertura</th>
                <th className="py-3 px-4 text-center bg-amber-500/5 text-amber-400 border-x border-amber-500/20">
                  Sugerido a pedir
                </th>
                <th className="py-3 px-4 text-right">Inversión est.</th>
                <th className="py-3 px-3 text-center">Ajuste</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-zinc-500 text-xs">
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
                    <tr key={prod.ProductoID} className="hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-zinc-100 truncate">{prod.Nombre}</div>
                        <div className="text-[11px] text-zinc-500 font-mono tabular-nums">
                          {prod.CodigoBarras || `PRD-${prod.ProductoID}`} • {prod.Marca}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          prod.abcClass === 'A'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : prod.abcClass === 'B'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          Clase {prod.abcClass}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold">
                        <span className={prod.StockActual <= prod.StockMinimo ? 'text-amber-400 font-bold' : 'text-zinc-200'}>
                          {prod.StockActual} {prod.Unidad}
                        </span>
                        <span className="text-zinc-500 text-[10px] block font-normal">Mín: {prod.StockMinimo}</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-zinc-200">
                        ~{prod.dailyDemandRate} <span className="text-[10px] text-zinc-500 font-sans font-normal">{prod.Unidad}/d</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-zinc-100">
                        {prod.projectedDemand} <span className="text-zinc-500 text-[10px] font-sans font-normal">{prod.Unidad}</span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono tabular-nums text-[10px] font-bold uppercase border ${
                          isStockout || isCritical
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : isHigh || isMedium
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isStockout || isCritical
                              ? 'bg-rose-400'
                              : isHigh || isMedium
                                ? 'bg-amber-400'
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

                      <td className="py-3 px-4 text-center font-mono tabular-nums font-bold bg-amber-500/5 border-x border-amber-500/15">
                        {prod.suggestedPurchaseUnits > 0 ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/35 font-bold text-xs">
                            <span>+{prod.suggestedPurchaseUnits}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 font-sans text-[11px] font-medium">Cubierto</span>
                        )}
                        <span className="text-zinc-500 font-sans text-[10px] font-normal block mt-0.5">{prod.Unidad}</span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-zinc-200 whitespace-nowrap">
                        {prod.estimatedPurchaseCost > 0 ? (
                          <span className="text-emerald-400">
                            Bs. {prod.estimatedPurchaseCost?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                          <span>{prod.modelAccuracy?.bestModel || model}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openProductDetail(prod)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 rounded-lg text-[11px] font-semibold transition-colors duration-160 ease-out-expo btn-press cursor-pointer ml-auto"
                        >
                          Diagnóstico
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

      {/* 5. Modal de Diagnóstico de Producto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl shadow-black/70 animate-modal-in">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded font-mono text-[10px] font-semibold uppercase">
                    DIAGNÓSTICO DE DEMANDA
                  </span>
                  <h3 className="text-base font-bold text-zinc-100">{selectedProduct.Nombre}</h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  SKU: <span className="font-mono text-amber-400">{selectedProduct.CodigoBarras || `PRD-${selectedProduct.ProductoID}`}</span> • Marca: {selectedProduct.Marca}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-zinc-400 hover:text-zinc-100 font-bold text-base cursor-pointer p-1 rounded-lg hover:bg-zinc-800 transition-colors duration-160 ease-out-expo"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-zinc-400 text-xs">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Analizando series históricas del producto...
              </div>
            ) : productDetailData ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-[#0c0e12] rounded-xl border border-zinc-800/90 space-y-2">
                  <div className="font-bold text-zinc-200 text-xs">Resumen operativo:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-[#12151c] p-3 rounded-lg border border-zinc-800/80">
                      <span className="text-zinc-400 text-[10px] font-semibold block">Stock disponible</span>
                      <strong className="font-mono tabular-nums text-zinc-100 text-base">{selectedProduct.StockActual} {selectedProduct.Unidad}</strong>
                    </div>
                    <div className="bg-[#12151c] p-3 rounded-lg border border-zinc-800/80">
                      <span className="text-zinc-400 text-[10px] font-semibold block">Tasa de salida diaria</span>
                      <strong className="font-mono tabular-nums text-amber-400 text-base">~{selectedProduct.dailyDemandRate} {selectedProduct.Unidad}/día</strong>
                    </div>
                    <div className="bg-[#12151c] p-3 rounded-lg border border-zinc-800/80">
                      <span className="text-zinc-400 text-[10px] font-semibold block">Autonomía estimada</span>
                      <strong className={`font-mono tabular-nums text-base ${selectedProduct.daysUntilStockout <= 7 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {selectedProduct.daysUntilStockout >= 999 ? '> 90 días' : `~${selectedProduct.daysUntilStockout} días`}
                      </strong>
                    </div>
                  </div>
                </div>

                {productDetailData?.models && (
                  <div className="p-4 bg-[#0c0e12] rounded-xl border border-zinc-800/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 text-xs">Comparativa matemática de error retrospectivo</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-semibold">
                        CALIBRADO
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-zinc-800">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-zinc-900 text-zinc-400 font-semibold border-b border-zinc-800">
                          <tr>
                            <th className="py-2 px-3">Modelo</th>
                            <th className="py-2 px-3 text-center">Tasa proyectada</th>
                            <th className="py-2 px-3 text-center">MAD</th>
                            <th className="py-2 px-3 text-center">RMSE</th>
                            <th className="py-2 px-3 text-center">MAPE</th>
                            <th className="py-2 px-3 text-center">Selección</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/70">
                          {[
                            { key: 'SES', label: 'Suavizamiento Exponencial (SES)' },
                            { key: 'SMA', label: 'Promedio Móvil Simple (SMA)' },
                            { key: 'WMA', label: 'Promedio Móvil Ponderado (WMA)' }
                          ].map(({ key, label }) => {
                            const mData = productDetailData.models[key] || {};
                            const isBest = selectedProduct.modelAccuracy?.bestModel === key;
                            const isActive = model === key;

                            return (
                              <tr key={key} className={isBest ? 'bg-emerald-500/5' : ''}>
                                <td className="py-2 px-3 font-semibold text-zinc-200">
                                  {label} {isActive && <span className="text-[10px] text-amber-400 font-mono">(Activo)</span>}
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums font-bold text-zinc-100">
                                  ~{mData.nextRate ?? mData.rate ?? 0} {selectedProduct.Unidad}/d
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums text-zinc-300">
                                  ±{mData.MAD ?? 0}
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums text-zinc-400">
                                  {mData.RMSE ?? 0}
                                </td>
                                <td className="py-2 px-3 text-center font-mono tabular-nums text-zinc-300">
                                  {mData.MAPE ?? 0}%
                                </td>
                                <td className="py-2 px-3 text-center">
                                  {isBest ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/30">
                                      ★ Óptimo
                                    </span>
                                  ) : (
                                    <span className="text-zinc-500 text-[10px]">Válido</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-[#0c0e12] rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-amber-400 font-semibold block text-[11px]">Sugerencia de orden de compra ({horizonDays} días):</span>
                    <p className="text-zinc-100 text-sm font-bold mt-0.5">
                      {selectedProduct.suggestedPurchaseUnits > 0 ? (
                        <>Solicitar <span className="font-mono tabular-nums text-amber-400 underline">{selectedProduct.suggestedPurchaseUnits} {selectedProduct.Unidad}</span> a proveedor</>
                      ) : (
                        <span className="text-emerald-400">Stock suficiente para cubrir el horizonte seleccionado.</span>
                      )}
                    </p>
                    {selectedProduct.suggestedPurchaseUnits > 0 && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 font-mono tabular-nums">
                        Inversión estimada: <strong className="text-emerald-400">Bs. {selectedProduct.estimatedPurchaseCost}</strong> (Costo unit.: Bs. {selectedProduct.PrecioCompra})
                      </p>
                    )}
                  </div>
                  <Link
                    to="/productsView"
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors duration-160 ease-out-expo btn-press self-end sm:self-auto"
                  >
                    Ir a inventario →
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
