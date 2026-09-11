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
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      {/* Sidebar Lateral Fijo */}
      <Sidebar activeItem="inicio" />

      {/* Área del Contenido Principal (con margen izquierdo para no tapar el sidebar) */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        {/* Barra Superior (Topbar) */}
        <Topbar />

        {/* Contenido Dinámico con ancho completo idéntico a Clientes */}
        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Banner de Bienvenida */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Bienvenido {userName}
              </h2>
              <p className="text-slate-400 text-sm mt-1">Este es el estado operativo de tu ferretería para el día de hoy.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl hover:border-cyan-500/50 hover:text-cyan-400 transition-all font-semibold text-xs text-slate-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtrar por fecha
            </button>
          </div>

          {/* Conmutador de Pestañas Principales (Dashboard Operativo vs Reportes Predictivos) */}
          <div className="flex flex-wrap bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 gap-2 self-start">
            <button
              type="button"
              onClick={() => setMainTab('DASHBOARD')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                mainTab === 'DASHBOARD'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Panel Operativo & Alertas</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('PREDICTIVE')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
                mainTab === 'PREDICTIVE'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span>Reportes & Análisis Predictivo</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-400/20 text-purple-200 font-black border border-purple-400/30">
                IA & Stats
              </span>
            </button>
          </div>

          {mainTab === 'PREDICTIVE' ? (
            <PredictiveReportsTab />
          ) : (
            <>
              {/* Grilla de 4 Tarjetas de Métricas Operativas 100% Reales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Ventas Totales */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ventas Totales</span>
                    <p className="text-2xl font-black text-white">
                      Bs. {salesKPIs.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[11px] text-emerald-400 font-semibold">
                      Margen Ganancia: {salesKPIs.netMarginPercent ?? 0}%
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* 2. Transacciones / Tickets */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-purple-500/30 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Transacciones</span>
                    <p className="text-2xl font-black text-white">
                      {salesKPIs.totalTransactions ?? 0} <span className="text-sm font-normal text-slate-400">tickets</span>
                    </p>
                    <p className="text-[11px] text-purple-300 font-semibold">
                      Ticket Promedio: Bs. {salesKPIs.averageTicket?.toFixed(2) ?? '0.00'}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>

                {/* 3. Alertas de Stock Bajo */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-amber-500/30 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Alertas de Stock</span>
                    <p className="text-2xl font-black text-amber-400">
                      {criticalProducts.length} <span className="text-sm font-normal text-slate-400">artículos</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Stock actual ≤ Stock Mínimo
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                {/* 4. Alertas de Lotes por Vencer / Vencidos (FEFO) */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-rose-500/30 transition-all">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Caducidad Lotes</span>
                    <p className="text-2xl font-black text-rose-400">
                      {filteredExpiringLots.filter(l => l.status === 'EXPIRED' || l.status === 'EXPIRING_SOON').length} <span className="text-sm font-normal text-slate-400">lotes</span>
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Vencidos o por vencer pronto
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Gráfico Dinámico de Ventas Reales */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-6 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Historial de Ventas Diarias</h3>
                      <p className="text-xs text-slate-400">Ingresos reales registrados en caja por día de operación</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span className="text-xs font-semibold text-slate-300">Ingresos (Bs.)</span>
                  </div>
                </div>

                {/* Gráfico SVG Reactivo con datos reales */}
                <div className="relative">
                  {loadingSales ? (
                    <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                      Cargando histórico de ventas...
                    </div>
                  ) : points.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
                      No hay ventas registradas aún.
                    </div>
                  ) : (
                    <>
                      <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-80 overflow-visible select-none">
                        <defs>
                          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#06b6d4" />
                            <stop offset="50%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#06b6d4" />
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
                                stroke="#1e293b"
                                strokeDasharray="4 4"
                              />
                              <text
                                x={padLeft - 10}
                                y={y + 4}
                                fill="#64748b"
                                fontSize="11"
                                fontWeight="bold"
                                textAnchor="end"
                                className="font-mono"
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
                            stroke="url(#lineGradient)"
                            strokeWidth="3.5"
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
                              r={hoveredIndex === index ? 6 : 3.5}
                              className={`${
                                hoveredIndex === index
                                  ? 'fill-cyan-400 stroke-slate-950 stroke-[3px]'
                                  : 'fill-cyan-500/80'
                              } transition-all duration-150 cursor-pointer`}
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

                        {/* Etiquetas Eje X dentro del SVG perfectamente alineadas con los puntos */}
                        {points
                          .filter((_, i) => i % Math.ceil(points.length / 8) === 0 || i === points.length - 1)
                          .map((p, i) => (
                            <text
                              key={i}
                              x={p.x}
                              y={chartHeight - 10}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#94a3b8"
                              className="font-mono font-medium"
                            >
                              {p.date ? p.date.slice(5) : ''}
                            </text>
                          ))}
                      </svg>

                      {/* Tooltip flotante interactivo */}
                      {hoveredIndex !== null && points[hoveredIndex] && (
                        <div
                          className="absolute bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-150 z-30 flex flex-col gap-1.5"
                          style={{
                            left: `${points[hoveredIndex].x + 10}px`,
                            top: `${points[hoveredIndex].y - 90}px`,
                            transform: 'translateX(-50%)',
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                              {points[hoveredIndex].date}
                            </span>
                          </div>
                          <div className="font-extrabold text-sm text-white">
                            Bs. {points[hoveredIndex].val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <span className="text-[9px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 self-start">
                            {points[hoveredIndex].desc}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

          {/* ========================================================================= */}
          {/* TABLA: ALERTA DE STOCK DEL PRODUCTO (EXACTO A LA FOTO ERP)               */}
          {/* ========================================================================= */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            {/* Cabecera con Título e Icono de Información */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  Alerta de stock del producto
                  <span
                    className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-black inline-flex items-center justify-center cursor-help"
                    title="Listado de productos con existencias por debajo del umbral mínimo configurado"
                  >
                    i
                  </span>
                </h3>
              </div>

              {/* Botones de Exportación / Herramientas según foto */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a Excel
                </button>
                <button
                  onClick={() => handleExport('impresion')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Impresión
                </button>
                <button
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Visibilidad de columna
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar a PDF
                </button>
              </div>
            </div>

            {/* Tabla con Filas Cebra */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/30">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-bold">
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4">Stock Actual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingAlerts ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                          <span>Consultando existencias de la base de datos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-400 text-xs">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
                          className={`group hover:bg-slate-800/50 transition-colors ${
                            index % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                          }`}
                        >
                          {/* 1. Columna: Producto */}
                          <td className="py-3 px-4 text-slate-300">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isOutOfStock ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                                }`}
                                title={isOutOfStock ? 'Producto Agotado' : 'Stock Bajo'}
                              ></span>
                              <div>
                                <span className="font-bold text-slate-200 uppercase tracking-wide">
                                  {item.Nombre}
                                </span>
                                <span className="text-slate-500 text-xs ml-1.5 font-mono">
                                  ({item.Codigo || item.CodigoBarras || `PRD-${item.ProductoID}`})
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Columna: Ubicación */}
                          <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                            {item.Ubicacion ? (
                              <span className="text-cyan-400 font-semibold">
                                {item.Ubicacion.Almacen ? `[${item.Ubicacion.Almacen.Nombre}] ` : ''}
                                {item.Ubicacion.Descripcion || item.Ubicacion.Nombre}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">Sin asignar</span>
                            )}
                          </td>

                          {/* 3. Columna: Stock Actual */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-between sm:justify-start gap-3">
                              <span
                                className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                                  isOutOfStock
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}
                              >
                                {isOutOfStock
                                  ? `Agotado (0 ${item.Unidad?.Abreviacion || item.Unidad?.Nombre || 'UNID'})`
                                  : `${stockVal} ${item.Unidad?.Abreviacion || item.Unidad?.Nombre || 'UNID'} (Bajo)`}
                              </span>
                              <Link
                                to="/productsView"
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity font-semibold"
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 font-medium">
              <div>
                Mostrando {filteredProducts.length > 0 ? 1 : 0} a {filteredProducts.length} de {criticalProducts.length} entrada{criticalProducts.length === 1 ? '' : 's'}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg opacity-40 cursor-not-allowed transition-all text-xs"
                >
                  Anterior
                </button>
                <button className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold rounded-lg text-xs">
                  1
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg opacity-40 cursor-not-allowed transition-all text-xs"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* TABLA 2: ALERTAS DE CADUCIDAD Y VENCIMIENTO DE LOTES (MOTOR FEFO)         */}
          {/* ========================================================================= */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-5">
            {/* Cabecera de la Sección */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-lg shadow-inner">
                  ⏰
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white tracking-wide flex items-center gap-2">
                    <span>Alertas de Caducidad y Vencimiento de Lotes (Motor FEFO)</span>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-mono">
                      {filteredExpiringLots.length} lotes
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Monitoreo de productos perecederos (Pinturas, Químicos, Siliconas, Pegamentos) para priorizar su venta.
                  </p>
                </div>
              </div>

              <Link
                to="/productsView"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all self-start md:self-auto"
              >
                <span>Ver Lista de Productos & Lotes →</span>
              </Link>
            </div>

            {/* Controles de Búsqueda, Filtro y Exportación */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              {/* Filtro por Estado de Vencimiento */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-400">Filtrar:</span>
                <select
                  value={expiringFilter}
                  onChange={(e) => setExpiringFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-bold outline-none focus:border-amber-500/50 cursor-pointer"
                >
                  <option value="ALL">Todos los lotes con caducidad</option>
                  <option value="EXPIRED">Lotes Vencidos</option>
                  <option value="EXPIRING_SOON">Críticos (Menos de 30 días)</option>
                  <option value="WARNING">Alerta preventiva (Menos de 60 días)</option>
                  <option value="OPTIMAL">Vigentes (Más de 60 días)</option>
                  <option value="CRITICAL_ALL">Vencidos + Críticos</option>
                </select>
              </div>

              {/* Botones de Exportación */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleExportExpiring('csv')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a CSV
                </button>
                <button
                  onClick={() => handleExportExpiring('excel')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a Excel
                </button>
                <button
                  onClick={() => handleExportExpiring('impresion')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Impresión
                </button>
                <button
                  onClick={() => handleExportExpiring('pdf')}
                  className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar a PDF
                </button>
              </div>

              {/* Buscador de Lotes */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar lote, producto..."
                  value={expiringSearch}
                  onChange={(e) => setExpiringSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl focus:border-amber-500/50 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            {/* Tabla de Lotes FEFO */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-900/30">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px] font-bold whitespace-nowrap">
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Lote #</th>
                    <th className="py-3 px-4">Fecha Caducidad</th>
                    <th className="py-3 px-4">Estado / Semáforo</th>
                    <th className="py-3 px-4">Stock Lote</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingExpiring ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                          <span>Consultando caducidad de lotes...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredExpiringLots.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
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
                          className={`group hover:bg-slate-800/50 transition-colors ${
                            index % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                          }`}
                        >
                          {/* 1. Producto */}
                          <td className="py-3 px-4 text-slate-300">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isExpired
                                    ? 'bg-rose-500 animate-pulse'
                                    : isSoon
                                    ? 'bg-amber-500 animate-pulse'
                                    : isWarning
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                                }`}
                              ></span>
                              <div>
                                <span className="font-bold text-slate-200 uppercase tracking-wide block">
                                  {lot.ProductoNombre}
                                </span>
                                <span className="text-slate-500 text-[11px] font-mono">
                                  {lot.CodigoBarras || `PRD-${lot.ProductoID}`} • {lot.Marca || 'General'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 2. Lote # */}
                          <td className="py-3 px-4 text-slate-300 font-mono font-semibold whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                              {lot.NotaLote || `LOTE-${lot.LoteID}`}
                            </span>
                          </td>

                          {/* 3. Fecha Caducidad */}
                          <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                            {lot.FechaVencimiento || '—'}
                          </td>

                          {/* 4. Estado / Semáforo */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border ${
                                isExpired
                                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                  : isSoon
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : isWarning
                                  ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
                                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              }`}
                            >
                              {isExpired
                                ? `🔴 Vencido (${Math.abs(lot.daysRemaining)}d)`
                                : isSoon
                                ? `🟠 Crítico (${lot.daysRemaining} días)`
                                : isWarning
                                ? `🟡 Alerta (${lot.daysRemaining} días)`
                                : `🟢 Vigente (${lot.daysRemaining} días)`}
                            </span>
                          </td>

                          {/* 5. Stock Lote */}
                          <td className="py-3 px-4 font-bold text-slate-200 whitespace-nowrap">
                            {lot.Stock} <span className="text-slate-500 text-[11px] font-normal">{lot.Unidad || 'UNID'}</span>
                          </td>

                          {/* 6. Acción */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {isExpired && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDismissExpiredLot(e, lot.LoteID)}
                                  title="Descartar este lote de la alerta"
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-bold transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <span>✕ Descartar lote</span>
                                </button>
                              )}
                              <Link
                                to="/productsView"
                                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold hover:underline"
                              >
                                Ver en Productos →
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400 font-medium">
              <div>
                Mostrando {filteredExpiringLots.length > 0 ? 1 : 0} a {filteredExpiringLots.length} de {expiringLots.length} lote{expiringLots.length === 1 ? '' : 's'} registrado{expiringLots.length === 1 ? '' : 's'}
              </div>
              <div className="flex items-center gap-1">
                <button
                  disabled
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg opacity-40 cursor-not-allowed transition-all text-xs"
                >
                  Anterior
                </button>
                <button className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold rounded-lg text-xs">
                  1
                </button>
                <button
                  disabled
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg opacity-40 cursor-not-allowed transition-all text-xs"
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
