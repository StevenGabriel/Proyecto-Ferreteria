import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';
import { getProducts, getCriticalStock } from '../../services/api';

function Home() {
  const { isCollapsed } = useSidebar();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Datos para el gráfico de ventas últimos 30 días (representando la captura de pantalla)
  const salesData = [
    { date: '9 Jul 2026', val: 2000, desc: 'Ventas de mostrador' },
    { date: '10 Jul 2026', val: 3200, desc: 'Herramientas manuales' },
    { date: '11 Jul 2026', val: 2100, desc: 'Ventas de mostrador' },
    { date: '12 Jul 2026', val: 2300, desc: 'Fijaciones y tornillos' },
    { date: '13 Jul 2026', val: 4100, desc: 'Ferretería en general' },
    { date: '14 Jul 2026', val: 2500, desc: 'Tuberías y PVC' },
    { date: '15 Jul 2026', val: 3500, desc: 'Pinturas e insumos' },
    { date: '16 Jul 2026', val: 2900, desc: 'Material de plomería' },
    { date: '17 Jul 2026', val: 3016.92, desc: 'CASA Y CONSTRUCCION (BL0001)' }, // Pico indicado en tooltip
    { date: '18 Jul 2026', val: 2800, desc: 'Ventas de mostrador' },
    { date: '19 Jul 2026', val: 1000, desc: 'Ferretería en general' },
    { date: '20 Jul 2026', val: 4800, desc: 'Material de plomería' },
    { date: '21 Jul 2026', val: 4900, desc: 'Herramientas eléctricas' },
    { date: '22 Jul 2026', val: 4000, desc: 'Ventas de mostrador' },
    { date: '23 Jul 2026', val: 2000, desc: 'Ferretería en general' },
    { date: '24 Jul 2026', val: 3800, desc: 'Fijaciones y tornillos' },
    { date: '25 Jul 2026', val: 3500, desc: 'Pinturas e insumos' },
    { date: '26 Jul 2026', val: 1200, desc: 'Ventas de mostrador' },
    { date: '27 Jul 2026', val: 13200, desc: 'CASA Y CONSTRUCCION (BL0001)' }, // Gran pico del gráfico
    { date: '28 Jul 2026', val: 5000, desc: 'Herramientas eléctricas' },
    { date: '29 Jul 2026', val: 4200, desc: 'Ventas de mostrador' },
    { date: '30 Jul 2026', val: 3300, desc: 'Material de plomería' },
    { date: '31 Jul 2026', val: 2100, desc: 'Ferretería en general' },
    { date: '1 Aug 2026', val: 4100, desc: 'Herramientas eléctricas' },
    { date: '2 Aug 2026', val: 3800, desc: 'Material de construcción' },
    { date: '3 Aug 2026', val: 800, desc: 'Ventas de mostrador' },
    { date: '4 Aug 2026', val: 5100, desc: 'Fijaciones y tornillos' },
    { date: '5 Aug 2026', val: 6800, desc: 'CASA Y CONSTRUCCION (BL0001)' },
    { date: '6 Aug 2026', val: 3200, desc: 'Pinturas e insumos' },
    { date: '7 Aug 2026', val: 4900, desc: 'Herramientas manuales' }
  ];

  // Dimensiones del gráfico SVG
  const width = 1000;
  const height = 300;
  const paddingX = 50;
  const paddingY = 30;

  // Encontrar el valor máximo para escalar la altura del gráfico
  const maxVal = 15000; // Ajustado a 15k según captura

  // Calcular las coordenadas X e Y para cada punto
  const points = salesData.map((d, index) => {
    const x = paddingX + (index * (width - 2 * paddingX)) / (salesData.length - 1);
    const y = height - paddingY - (d.val * (height - 2 * paddingY)) / maxVal;
    return { x, y, ...d };
  });

  // Generar la cadena de comandos del path SVG (curva suave de tipo Bézier)
  const pathD = points.reduce((acc, p, index, arr) => {
    if (index === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[index - 1];
    // Puntos de control para la curva suavizada
    const cpX1 = prev.x + (p.x - prev.x) / 2;
    const cpY1 = prev.y;
    const cpX2 = prev.x + (p.x - prev.x) / 2;
    const cpY2 = p.y;
    return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p.x} ${p.y}`;
  }, '');

  // Path cerrado para el degradado inferior del gráfico
  const areaPathD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  // Obtener usuario autenticado
  const [currentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const userName = currentUser?.Nombre?.toUpperCase() || 'OSCAR EDGAR';

  // Alertas de stock reales desde la base de datos (Stock <= Stock Mínimo o Agotados)
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    setLoadingAlerts(true);
    getProducts()
      .then((data) => {
        const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        // Filtrar productos con stock <= LoteMinimo (o Agotados con Stock = 0)
        const lowStock = items.filter((p) => {
          const stock = parseInt(p.Stock || 0);
          const min = parseInt(p.LoteMinimo || 5);
          return stock <= min;
        });
        setCriticalProducts(lowStock);
      })
      .catch((err) => {
        console.error('Error al consultar productos:', err);
      })
      .finally(() => {
        setLoadingAlerts(false);
      });
  }, []);

  const filteredProducts = criticalProducts.filter((p) => {
    const text = `${p.Nombre} ${p.Codigo || ''} ${p.CodigoBarras || ''} ${p.Marca?.Nombre || ''}`.toLowerCase();
    return text.includes(tableSearch.toLowerCase());
  });

  const handleExport = (type) => {
    if (type === 'impresion') {
      window.print();
    } else {
      const rows = [
        ['Producto', 'Código', 'Stock Actual', 'Stock Mínimo', 'Estado'],
        ...filteredProducts.map((p) => [
          p.Nombre,
          p.Codigo || p.CodigoBarras || `PRD-${p.ProductoID}`,
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

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      {/* Sidebar Lateral Fijo */}
      <Sidebar activeItem="inicio" />

      {/* Área del Contenido Principal (con margen izquierdo para no tapar el sidebar) */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        {/* Barra Superior (Topbar) */}
        <Topbar />

        {/* Contenido Dinámico */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
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

          {/* Grilla de 8 Tarjetas de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Ventas totales */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ventas totales</span>
                <p className="text-xl font-extrabold text-white">Bs. 2,890.52</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Ventas Netas */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ventas Netas</span>
                <p className="text-xl font-extrabold text-white">Bs. -3,109.48</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Ventas por cobrar */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ventas por cobrar</span>
                <p className="text-xl font-extrabold text-white">Bs. 0.00</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Total de devolución de venta */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Devolución Venta</span>
                <p className="text-xl font-extrabold text-white">Bs. 0.00</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>

            {/* Compras totales */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Compras totales</span>
                <p className="text-xl font-extrabold text-white">Bs. 0.00</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
            </div>

            {/* Compra adecuada */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Compra adecuada</span>
                <p className="text-xl font-extrabold text-white">Bs. 0.00</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Total de devolución de compra */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Devolución Compra</span>
                <p className="text-xl font-extrabold text-white">Bs. 0.00</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>

            {/* Gastos */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between hover:border-cyan-500/30 transition-all">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Gastos</span>
                <p className="text-xl font-extrabold text-white">Bs. 6,000.00</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Gráfico de Ventas de últimos 30 días */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-6 relative">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Ventas últimos 30 días</h3>
            </div>

            {/* Gráfico SVG Reactivo */}
            <div className="relative">
              <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Definiciones para degradados */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Líneas de cuadrícula horizontales */}
                {[0, 2500, 5000, 7500, 10000, 12500, 15000].map((gridVal, i) => {
                  const y = height - paddingY - (gridVal * (height - 2 * paddingY)) / maxVal;
                  return (
                    <g key={gridVal}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={width - paddingX}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 4}
                        fill="#64748b"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="end"
                      >
                        {gridVal >= 1000 ? `${gridVal / 1000}k` : gridVal}
                      </text>
                    </g>
                  );
                })}

                {/* Área bajo la curva con degradado */}
                <path d={areaPathD} fill="url(#chartGradient)" />

                {/* Línea de la Curva */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth="3.5"
                  className="stroke-cyan-400"
                />

                {/* Gradiente para la línea */}
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>

                {/* Puntos y áreas interactivas sobre el gráfico */}
                {points.map((p, index) => (
                  <g key={index}>
                    {/* Punto visible */}
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
                    {/* Área invisible grande para detectar hover fácilmente */}
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
              </svg>

              {/* Tooltip flotante interactivo (Estilo premium inspirado en la captura) */}
              {hoveredIndex !== null && (
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
                    Bs. {points[hoveredIndex].val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <span className="text-[9px] text-cyan-400 font-semibold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 self-start">
                    {points[hoveredIndex].desc}
                  </span>
                </div>
              )}
            </div>

            {/* Etiquetas de fechas en el eje X */}
            <div className="flex justify-between text-[10px] text-slate-500 font-bold px-6 pt-2">
              <span>09 Jul 2026</span>
              <span>17 Jul 2026</span>
              <span>25 Jul 2026</span>
              <span>02 Ago 2026</span>
              <span>07 Ago 2026</span>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingAlerts ? (
                    <tr>
                      <td className="py-8 text-center text-slate-500">
                        <div className="inline-flex items-center gap-2 text-xs">
                          <div className="w-4 h-4 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                          <span>Consultando existencias de la base de datos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td className="py-8 text-center text-slate-400 text-xs">
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
                          <td className="py-3 px-4 text-slate-300 flex items-center justify-between gap-4">
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

                            <div className="flex items-center gap-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${
                                  isOutOfStock
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}
                              >
                                {isOutOfStock ? `Agotado (0 ${item.Unidad?.Abreviacion || item.Unidad?.Nombre || 'UNID'})` : `${stockVal} ${item.Unidad?.Abreviacion || item.Unidad?.Nombre || 'UNID'} (Bajo)`}
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
        </div>
      </main>
    </div>
  );
}

export default Home;
