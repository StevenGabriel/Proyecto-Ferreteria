import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';
import { getProducts, getCriticalStock, getExpiringLots, getSalesPerformanceReport } from '../../services/api';
import PredictiveReportsTab from './PredictiveReportsTab';

function Home() {
  const { isCollapsed } = useSidebar();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [mainTab, setMainTab] = useState('DASHBOARD'); // 'DASHBOARD' | 'PREDICTIVE'

  // Datos reales de ventas desde la BD
  const [salesKPIs, setSalesKPIs] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    grossProfit: 0,
    netMarginPercent: 0,
    averageTicket: 0,
    totalUnitsSold: 0
  });
  const [salesTimeline, setSalesTimeline] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);

  // Obtener usuario autenticado
  const [currentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const userName = currentUser?.Nombre?.toUpperCase() || (currentUser ? 'OPERADOR' : '');

  // 1. Alertas de stock reales (Stock <= Stock Mínimo o Agotados)
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [tableSearch, setTableSearch] = useState('');

  // 2. Alertas de caducidad de lotes (FEFO)
  const [expiringLots, setExpiringLots] = useState([]);
  const [loadingExpiring, setLoadingExpiring] = useState(true);
  const [expiringSearch, setExpiringSearch] = useState('');
  const [expiringFilter, setExpiringFilter] = useState('ALL');

  // Lotes vencidos descartados manualmente por el usuario
  const [dismissedExpiredLots, setDismissedExpiredLots] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_dismissed_expired_lots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleDismissExpiredLot = (e, loteId) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedExpiredLots((prev) => {
      const next = [...new Set([...prev, loteId])];
      try {
        localStorage.setItem('cyc_dismissed_expired_lots', JSON.stringify(next));
      } catch (err) {
        console.warn('Error guardando lotes descartados:', err);
      }
      return next;
    });
  };

  useEffect(() => {
    setLoadingAlerts(true);
    setLoadingExpiring(true);
    setLoadingSales(true);

    getSalesPerformanceReport({ period: 'daily' })
      .then((data) => {
        if (data?.kpis) {
          setSalesKPIs(data.kpis);
        }
        if (Array.isArray(data?.timeline)) {
          setSalesTimeline(data.timeline);
        }
      })
      .catch((err) => console.warn('Error al consultar desempeño de ventas:', err))
      .finally(() => setLoadingSales(false));

    getProducts()
      .then((data) => {
        const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        const lowStock = items.filter((p) => {
          const stock = parseInt(p.Stock || 0);
          const min = parseInt(p.LoteMinimo || 5);
          return stock <= min;
        });
        setCriticalProducts(lowStock);
      })
      .catch((err) => console.error('Error al consultar productos:', err))
      .finally(() => setLoadingAlerts(false));

    getExpiringLots('ALL')
      .then((data) => {
        setExpiringLots(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.warn('Error al consultar lotes con vencimiento:', err))
      .finally(() => setLoadingExpiring(false));
  }, []);

  // Dimensiones y cálculo dinámico del gráfico SVG de ventas reales
  const chartWidth = 1100;
  const chartHeight = 320;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 40;

  const validTimeline = salesTimeline.length > 0 ? salesTimeline : [
    { periodKey: 'Inicio', totalRevenue: 0, ordersCount: 0 },
    { periodKey: 'Hoy', totalRevenue: 0, ordersCount: 0 }
  ];

  const maxRevenueVal = Math.max(...validTimeline.map(d => d.totalRevenue || 0), 1000);
  const chartPlotW = chartWidth - padLeft - padRight;
  const chartPlotH = chartHeight - padTop - padBottom;

  const points = validTimeline.map((d, index) => {
    const x = padLeft + (index * chartPlotW) / (validTimeline.length - 1 || 1);
    const y = padTop + chartPlotH - ((d.totalRevenue || 0) * chartPlotH) / maxRevenueVal;
    return {
      x,
      y,
      date: d.periodKey,
      val: d.totalRevenue || 0,
      orders: d.ordersCount || 0,
      units: d.unitsSold || 0,
      desc: `${d.ordersCount || 0} tickets • ${d.unitsSold || 0} unidades`
    };
  });

  const pathD = points.reduce((acc, p, index, arr) => {
    if (index === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[index - 1];
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

  const areaPathD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padTop + chartPlotH} L ${points[0].x} ${padTop + chartPlotH} Z`
    : '';

  const filteredProducts = criticalProducts.filter((p) => {
    const text = `${p.Nombre} ${p.Codigo || ''} ${p.CodigoBarras || ''} ${p.Marca?.Nombre || ''}`.toLowerCase();
    return text.includes(tableSearch.toLowerCase());
  });

  const filteredExpiringLots = useMemo(() => {
    return expiringLots.filter((lot) => {
      // 1. Auto-desaparición tras 7 días de vencido
      if (lot.status === 'EXPIRED' && lot.daysRemaining !== undefined && lot.daysRemaining < -7) {
        return false;
      }

      // 2. Lotes descartados manualmente por el usuario
      if (dismissedExpiredLots.includes(lot.LoteID)) {
        return false;
      }

      const text = `${lot.ProductoNombre || ''} ${lot.CodigoBarras || ''} ${lot.NotaLote || ''} ${lot.Marca || ''}`.toLowerCase();
      const matchSearch = !expiringSearch || text.includes(expiringSearch.toLowerCase());
      if (!matchSearch) return false;

      if (expiringFilter === 'EXPIRED') return lot.status === 'EXPIRED';
      if (expiringFilter === 'EXPIRING_SOON') return lot.status === 'EXPIRING_SOON';
      if (expiringFilter === 'WARNING') return lot.status === 'WARNING';
      if (expiringFilter === 'OPTIMAL') return lot.status === 'OPTIMAL';
      if (expiringFilter === 'CRITICAL_ALL') return lot.status === 'EXPIRED' || lot.status === 'EXPIRING_SOON';

      return true;
    });
  }, [expiringLots, expiringSearch, expiringFilter, dismissedExpiredLots]);

  const handleExport = (type) => {
    if (type === 'impresion') {
      window.print();
    } else {
      const rows = [
        ['Producto', 'Código', 'Ubicación', 'Stock Actual', 'Stock Mínimo', 'Estado'],
        ...filteredProducts.map((p) => [
          p.Nombre,
          p.Codigo || p.CodigoBarras || `PRD-${p.ProductoID}`,
          p.Ubicacion ? `${p.Ubicacion.Almacen ? `[${p.Ubicacion.Almacen.Nombre}] ` : ''}${p.Ubicacion.Descripcion || p.Ubicacion.Nombre || ''}` : 'Sin asignar',
          p.Stock ?? 0,
          p.LoteMinimo ?? 5,
          (p.Stock || 0) <= 0 ? 'Agotado' : 'Stock Bajo'
        ])
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Alerta_Stock_Ferreteria_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleExportExpiring = (type) => {
    if (type === 'impresion') {
      window.print();
    } else {
      const rows = [
        ['Producto', 'Código', 'Lote', 'Fecha Caducidad', 'Días Restantes', 'Estado', 'Stock Lote'],
        ...filteredExpiringLots.map((l) => [
          l.ProductoNombre,
          l.CodigoBarras || `PRD-${l.ProductoID}`,
          l.NotaLote || `LOTE-${l.LoteID}`,
          l.FechaVencimiento || '—',
          l.daysRemaining ?? '—',
          l.statusLabel || '—',
          `${l.Stock} ${l.Unidad || 'UNID'}`
        ])
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Alerta_Caducidad_Lotes_FEFO_${type}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex selection:bg-amber-500 selection:text-zinc-950">
      {/* Sidebar Lateral Fijo */}
      <Sidebar activeItem="inicio" />

      {/* Área del Contenido Principal */}
      <main className={`flex-1 transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-[#0c0e12] flex flex-col`}>
        {/* Barra Superior (Topbar) */}
        <Topbar />

        {/* Contenido Dinámico */}
        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Banner de Bienvenida */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 [text-wrap:balance]">
                Panel de control {userName ? `— ${userName}` : ''}
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                Estado operativo en tiempo real de caja, inventario y vencimiento de lotes FEFO.
              </p>
            </div>
            <button className="flex items-center gap-2 px-3.5 py-2 bg-[#12151c] border border-zinc-800/90 rounded-xl hover:border-amber-500/50 hover:text-amber-400 transition-colors duration-160 ease-out-expo btn-press font-semibold text-xs text-zinc-300 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filtrar por fecha</span>
            </button>
          </div>

          {/* Conmutador de Pestañas Principales (Dashboard Operativo vs Reportes Predictivos) */}
          <div className="flex flex-wrap bg-[#12151c] p-1 rounded-xl border border-zinc-800/90 gap-1.5 self-start">
            <button
              type="button"
              onClick={() => setMainTab('DASHBOARD')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-colors duration-160 ease-out-expo btn-press cursor-pointer ${
                mainTab === 'DASHBOARD'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Panel Operativo y Alertas</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('PREDICTIVE')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-colors duration-160 ease-out-expo btn-press cursor-pointer ${
                mainTab === 'PREDICTIVE'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span>Pronóstico de Demanda y Compras</span>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                mainTab === 'PREDICTIVE'
                  ? 'bg-zinc-950/20 text-zinc-950 border-zinc-950/30'
                  : 'bg-zinc-900 text-amber-400 border-zinc-800'
              }`}>
                SES / SMA / WMA
              </span>
            </button>
          </div>

          {mainTab === 'PREDICTIVE' ? (
            <PredictiveReportsTab />
          ) : (
            <>
              {/* Grilla de 4 Tarjetas de Métricas Operativas 100% Reales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Ventas Totales */}
                <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 flex items-center justify-between hover:border-zinc-700 transition-colors duration-160 ease-out-expo">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-400 block">Ventas totales</span>
                    <p className="text-2xl font-mono tabular-nums font-bold text-zinc-100">
                      Bs. {salesKPIs.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-emerald-400 font-mono tabular-nums font-semibold">
                      Margen neto: {salesKPIs.netMarginPercent ?? 0}%
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* 2. Transacciones / Tickets */}
                <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 flex items-center justify-between hover:border-zinc-700 transition-colors duration-160 ease-out-expo">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-400 block">Transacciones</span>
                    <p className="text-2xl font-mono tabular-nums font-bold text-zinc-100">
                      {salesKPIs.totalTransactions ?? 0} <span className="text-xs font-sans font-normal text-zinc-400">tickets</span>
                    </p>
                    <p className="text-[11px] text-zinc-300 font-mono tabular-nums font-medium">
                      Ticket prom.: Bs. {salesKPIs.averageTicket?.toFixed(2) ?? '0.00'}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-zinc-800/70 border border-zinc-700/80 flex items-center justify-center text-zinc-300 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>

                {/* 3. Alertas de Stock Bajo */}
                <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 flex items-center justify-between hover:border-amber-500/30 transition-colors duration-160 ease-out-expo">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-400 block">Alertas de stock</span>
                    <p className="text-2xl font-mono tabular-nums font-bold text-amber-400">
                      {criticalProducts.length} <span className="text-xs font-sans font-normal text-zinc-400">artículos</span>
                    </p>
                    <p className="text-[11px] text-zinc-400 font-medium">
                      Stock actual ≤ mínimo
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                {/* 4. Alertas de Lotes por Vencer / Vencidos (FEFO) */}
                <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-5 flex items-center justify-between hover:border-rose-500/30 transition-colors duration-160 ease-out-expo">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-zinc-400 block">Caducidad de lotes</span>
                    <p className="text-2xl font-mono tabular-nums font-bold text-rose-400">
                      {filteredExpiringLots.filter(l => l.status === 'EXPIRED' || l.status === 'EXPIRING_SOON').length} <span className="text-xs font-sans font-normal text-zinc-400">lotes</span>
                    </p>
                    <p className="text-[11px] text-zinc-400 font-medium">
                      Vencidos o próximos a vencer
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Gráfico Dinámico de Ventas Reales */}
              <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-6 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800/80 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">Historial de ventas diarias</h3>
                      <p className="text-xs text-zinc-400">Ingresos reales registrados en caja por día de operación</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-xs font-medium text-zinc-300">Ingresos (Bs.)</span>
                  </div>
                </div>

                {/* Gráfico SVG Reactivo con datos reales */}
                <div className="relative">
                  {loadingSales ? (
                    <div className="h-64 flex items-center justify-center text-zinc-500 text-xs">
                      Cargando histórico de ventas...
                    </div>
                  ) : points.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-zinc-500 text-xs">
                      No hay ventas registradas aún.
                    </div>
                  ) : (
                    <>
                      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-80 overflow-visible select-none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.26" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Líneas de cuadrícula horizontales */}
                        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                          const gridVal = p * maxRevenueVal;
                          const y = padTop + chartPlotH - p * chartPlotH;
                          return (
                            <g key={i}>
                              <line
                                x1={padLeft}
                                y1={y}
                                x2={chartWidth - padRight}
                                y2={y}
                                stroke="#27272a"
                                strokeDasharray="4 4"
                              />
                              <text
                                x={padLeft - 10}
                                y={y + 4}
                                fill="#a1a1aa"
                                fontSize="11"
                                fontWeight="600"
                                textAnchor="end"
                                className="font-mono tabular-nums"
                              >
                                {gridVal >= 1000 ? `${(gridVal / 1000).toFixed(1)}k` : Math.round(gridVal)}
                              </text>
                            </g>
                          );
                        })}

                        {/* Área bajo la curva */}
                        {areaPathD && <path d={areaPathD} fill="url(#chartGradient)" />}

                        {/* Línea de la Curva */}
                        {pathD && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="2.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        )}

                        {/* Puntos y áreas interactivas */}
                        {points.map((p, index) => (
                          <g key={index}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r={hoveredIndex === index ? 5.5 : 3.5}
                              className={`${
                                hoveredIndex === index
                                  ? 'fill-amber-400 stroke-[#0c0e12] stroke-[2.5px]'
                                  : 'fill-amber-500'
                              } transition-[r,fill] duration-150 ease-out-expo cursor-pointer`}
                              onMouseEnter={() => setHoveredIndex(index)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="16"
                              fill="transparent"
                              className="cursor-pointer"
                              onMouseEnter={() => setHoveredIndex(index)}
                              onMouseLeave={() => setHoveredIndex(null)}
                            />
                          </g>
                        ))}

                        {/* Etiquetas Eje X dentro del SVG */}
                        {points
                          .filter((_, i) => i % Math.ceil(points.length / 8) === 0 || i === points.length - 1)
                          .map((p, i) => (
                            <text
                              key={i}
                              x={p.x}
                              y={chartHeight - 10}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#a1a1aa"
                              className="font-mono tabular-nums font-medium"
                            >
                              {p.date ? p.date.slice(5) : ''}
                            </text>
                          ))}
                      </svg>

                      {/* Tooltip flotante interactivo */}
                      {hoveredIndex !== null && points[hoveredIndex] && (
                        <div
                          className="absolute bg-[#0c0e12] border border-zinc-700 rounded-xl p-3 shadow-2xl pointer-events-none z-30 flex flex-col gap-1 animate-fade-in"
                          style={{
                            left: `${points[hoveredIndex].x + 10}px`,
                            top: `${points[hoveredIndex].y - 90}px`,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span className="font-mono tabular-nums text-[10px] text-zinc-400 font-semibold">
                              {points[hoveredIndex].date}
                            </span>
                          </div>
                          <div className="font-mono tabular-nums font-bold text-sm text-zinc-100">
                            Bs. {points[hoveredIndex].val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="font-mono tabular-nums text-[10px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 self-start">
                            {points[hoveredIndex].desc}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

          {/* ========================================================================= */}
          {/* TABLA: ALERTA DE STOCK DEL PRODUCTO                                       */}
          {/* ========================================================================= */}
          <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-4">
            {/* Cabecera con Título e Icono de Información */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-100 text-base flex items-center gap-2">
                  Alerta de stock de productos
                  <span
                    className="w-4 h-4 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold inline-flex items-center justify-center cursor-help border border-zinc-700"
                    title="Listado de productos con existencias por debajo del umbral mínimo configurado"
                  >
                    i
                  </span>
                </h3>
              </div>

              {/* Botones de Exportación / Herramientas */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar Excel
                </button>
                <button
                  onClick={() => handleExport('impresion')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Impresión
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar PDF
                </button>
              </div>
            </div>

            {/* Tabla con Filas Cebra */}
            <div className="border border-zinc-800/90 rounded-xl overflow-hidden bg-[#0c0e12]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-[11px] font-semibold">
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4">Stock actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {loadingAlerts ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-zinc-500">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                          <span>Consultando existencias de la base de datos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-zinc-400 text-xs">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {tableSearch ? 'No se encontraron productos coincidentes con la búsqueda.' : 'No se registran productos con stock bajo o agotado actualmente.'}
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((item, index) => {
                      const stockVal = item.Stock ?? item.currentStock ?? 0;
                      const isOutOfStock = stockVal === 0;
                      return (
                        <tr
                          key={item.ProductoID || index}
                          className={`group hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo ${
                            index % 2 === 0 ? 'bg-zinc-900/20' : 'bg-transparent'
                          }`}
                        >
                          {/* 1. Columna: Producto */}
                          <td className="py-3 px-4 text-zinc-300">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isOutOfStock ? 'bg-rose-500' : 'bg-amber-400'
                                }`}
                                title={isOutOfStock ? 'Producto Agotado' : 'Stock Bajo'}
                              ></span>
                              <div>
                                <span className="font-semibold text-zinc-100">
                                  {item.Nombre}
                                </span>
                                <span className="text-zinc-500 text-xs ml-2 font-mono tabular-nums">
                                  ({item.Codigo || item.CodigoBarras || `PRD-${item.ProductoID}`})
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Columna: Ubicación */}
                          <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                            {item.Ubicacion ? (
                              <span className="text-zinc-200 font-medium">
                                {item.Ubicacion.Almacen ? <span className="font-mono text-amber-400 mr-1">[{item.Ubicacion.Almacen.Nombre}]</span> : ''}
                                {item.Ubicacion.Descripcion || item.Ubicacion.Nombre}
                              </span>
                            ) : (
                              <span className="text-zinc-600 italic">Sin asignar</span>
                            )}
                          </td>

                          {/* 3. Columna: Stock Actual */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                              <span
                                className={`px-2.5 py-0.5 rounded-md font-mono tabular-nums text-[10px] font-bold border ${
                                  isOutOfStock
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                }`}
                              >
                                {isOutOfStock
                                  ? `AGOTADO (0 ${item.Unidad?.Abreviacion || item.Unidad?.Nombre || 'UNID'})`
                                  : `${stockVal} ${item.Unidad?.Abreviacion || item.Unidad?.Nombre || 'UNID'} (BAJO)`}
                              </span>
                              <Link
                                to="/productsView"
                                className="text-[11px] text-amber-400 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity duration-160 ease-out-expo font-semibold"
                              >
                                Ver en productos →
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de Tabla con Contador y Paginación Dinámica */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-zinc-400 font-medium">
              <div className="font-mono tabular-nums text-[11px]">
                Mostrando {filteredProducts.length > 0 ? 1 : 0} a {filteredProducts.length} de {criticalProducts.length} registro{criticalProducts.length === 1 ? '' : 's'}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled
                  className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg opacity-40 cursor-not-allowed text-xs"
                >
                  Anterior
                </button>
                <button className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/35 text-amber-400 font-mono tabular-nums font-bold rounded-lg text-xs">
                  1
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg opacity-40 cursor-not-allowed text-xs"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABLA 2: ALERTAS DE CADUCIDAD Y VENCIMIENTO DE LOTES (MOTOR FEFO)         */}
          {/* ========================================================================= */}
          <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 space-y-5">
            {/* Cabecera de la Sección */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <span>Control de Caducidad y Lotes (Motor FEFO)</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded-md text-[10px] font-mono tabular-nums font-semibold">
                      {filteredExpiringLots.length} lotes
                    </span>
                  </h3>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Monitoreo de insumos perecederos (pinturas, químicos, selladores y adhesivos) para priorizar su salida en mostrador.
                  </p>
                </div>
              </div>

              <Link
                to="/productsView"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0c0e12] hover:bg-zinc-800 text-amber-400 border border-zinc-800 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo btn-press self-start md:self-auto"
              >
                <span>Ver inventario y lotes →</span>
              </Link>
            </div>

            {/* Controles de Búsqueda, Filtro y Exportación */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              {/* Filtro por Estado de Vencimiento */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-zinc-400">Filtrar:</span>
                <select
                  value={expiringFilter}
                  onChange={(e) => setExpiringFilter(e.target.value)}
                  className="bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-200 text-xs font-semibold outline-none focus:border-amber-500/70 transition-colors duration-160 ease-out-expo cursor-pointer"
                >
                  <option value="ALL">Todos los lotes con caducidad</option>
                  <option value="EXPIRED">Lotes vencidos</option>
                  <option value="EXPIRING_SOON">Críticos (menos de 30 días)</option>
                  <option value="WARNING">Alerta preventiva (menos de 60 días)</option>
                  <option value="OPTIMAL">Vigentes (más de 60 días)</option>
                  <option value="CRITICAL_ALL">Vencidos + Críticos</option>
                </select>
              </div>

              {/* Botones de Exportación */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleExportExpiring('csv')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar CSV
                </button>
                <button
                  onClick={() => handleExportExpiring('excel')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar Excel
                </button>
                <button
                  onClick={() => handleExportExpiring('impresion')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Impresión
                </button>
                <button
                  onClick={() => handleExportExpiring('pdf')}
                  className="px-3 py-1.5 bg-[#0c0e12] hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar PDF
                </button>
              </div>

              {/* Buscador de Lotes */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar lote, producto..."
                  value={expiringSearch}
                  onChange={(e) => setExpiringSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-xl focus:border-amber-500/70 transition-colors duration-160 ease-out-expo text-xs text-zinc-100 placeholder-zinc-500 outline-none"
                />
              </div>
            </div>

            {/* Tabla de Lotes FEFO */}
            <div className="border border-zinc-800/90 rounded-xl overflow-hidden bg-[#0c0e12]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800 text-[11px] font-semibold whitespace-nowrap">
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Lote #</th>
                    <th className="py-3 px-4">Fecha caducidad</th>
                    <th className="py-3 px-4">Estado FEFO</th>
                    <th className="py-3 px-4">Stock lote</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70">
                  {loadingExpiring ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-zinc-500">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                          <span>Consultando caducidad de lotes...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredExpiringLots.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-zinc-400 text-xs">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        {expiringSearch ? 'No se encontraron lotes coincidentes con la búsqueda.' : 'No se registran productos vencidos ni en riesgo crítico de caducidad.'}
                      </td>
                    </tr>
                  ) : (
                    filteredExpiringLots.map((lot, index) => {
                      const isExpired = lot.status === 'EXPIRED';
                      const isSoon = lot.status === 'EXPIRING_SOON';
                      const isWarning = lot.status === 'WARNING';
                      return (
                        <tr
                          key={lot.LoteID || index}
                          className={`group hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo ${
                            index % 2 === 0 ? 'bg-zinc-900/20' : 'bg-transparent'
                          }`}
                        >
                          {/* 1. Producto */}
                          <td className="py-3 px-4 text-zinc-300">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isExpired
                                    ? 'bg-rose-500'
                                    : isSoon
                                    ? 'bg-amber-500'
                                    : isWarning
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                              ></span>
                              <div>
                                <span className="font-semibold text-zinc-100 block">
                                  {lot.ProductoNombre}
                                </span>
                                <span className="text-zinc-500 text-[11px] font-mono tabular-nums">
                                  {lot.CodigoBarras || `PRD-${lot.ProductoID}`} • {lot.Marca || 'General'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Lote # */}
                          <td className="py-3 px-4 text-zinc-300 font-mono tabular-nums font-medium whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-[11px]">
                              {lot.NotaLote || `LOTE-${lot.LoteID}`}
                            </span>
                          </td>

                          {/* 3. Fecha Caducidad */}
                          <td className="py-3 px-4 font-mono tabular-nums font-semibold text-zinc-100 whitespace-nowrap">
                            {lot.FechaVencimiento || '—'}
                          </td>

                          {/* 4. Estado / Semáforo */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-mono tabular-nums text-[10px] font-bold uppercase border ${
                                isExpired
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : isSoon
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : isWarning
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isExpired
                                    ? 'bg-rose-400'
                                    : isSoon || isWarning
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                              ></span>
                              <span>
                                {isExpired
                                  ? `Vencido (${Math.abs(lot.daysRemaining)}d)`
                                  : isSoon
                                  ? `Crítico (${lot.daysRemaining}d)`
                                  : isWarning
                                  ? `Preventivo (${lot.daysRemaining}d)`
                                  : `Vigente (${lot.daysRemaining}d)`}
                              </span>
                            </span>
                          </td>

                          {/* 5. Stock Lote */}
                          <td className="py-3 px-4 font-mono tabular-nums font-semibold text-zinc-200 whitespace-nowrap">
                            {lot.Stock} <span className="text-zinc-500 font-sans text-[11px] font-normal">{lot.Unidad || 'UNID'}</span>
                          </td>

                          {/* 6. Acción */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {isExpired && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDismissExpiredLot(e, lot.LoteID)}
                                  title="Descartar este lote de la alerta"
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 font-semibold transition-colors duration-160 ease-out-expo btn-press flex items-center gap-1 cursor-pointer"
                                >
                                  <span>✕ Descartar</span>
                                </button>
                              )}
                              <Link
                                to="/productsView"
                                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors duration-160 ease-out-expo"
                              >
                                Ver producto →
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de Tabla con Contador */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-zinc-400 font-medium">
              <div className="font-mono tabular-nums text-[11px]">
                Mostrando {filteredExpiringLots.length > 0 ? 1 : 0} a {filteredExpiringLots.length} de {expiringLots.length} lote{expiringLots.length === 1 ? '' : 's'} registrado{expiringLots.length === 1 ? '' : 's'}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled
                  className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg opacity-40 cursor-not-allowed text-xs"
                >
                  Anterior
                </button>
                <button className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/35 text-amber-400 font-mono tabular-nums font-bold rounded-lg text-xs">
                  1
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-lg opacity-40 cursor-not-allowed text-xs"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;
