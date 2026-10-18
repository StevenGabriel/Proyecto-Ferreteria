import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';
import {
  getInventorySummary,
  getCriticalStock,
  getExpiringLots,
  getKardex,
  recordInventoryAdjustment,
  getProducts
} from '../../services/api';

function InventoryControl() {
  const { isCollapsed } = useSidebar();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'expiration' | 'kardex'

  // Datos
  const [summary, setSummary] = useState(null);
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [expiringLots, setExpiringLots] = useState([]);
  const [kardexList, setKardexList] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de Stock
  const [stockFilter, setStockFilter] = useState('ALL');
  const [stockSearch, setStockSearch] = useState('');

  // Filtros de Vencimiento
  const [expFilter, setExpFilter] = useState('ALL');
  const [expSearch, setExpSearch] = useState('');

  // Filtros de Kardex
  const [kardexTypeFilter, setKardexTypeFilter] = useState('ALL');
  const [kardexSearch, setKardexSearch] = useState('');

  // Modal de Ajuste Manual
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const [adjustForm, setAdjustForm] = useState({
    ProductoID: '',
    tipoAjuste: 'AJUSTE_INGRESO',
    cantidad: 1,
    motivo: '',
    documentoReferencia: 'AJUSTE-MANUAL',
    usuarioResponsable: ''
  });

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  // Cargar usuario en sesión
  const [currentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const userName = currentUser?.Nombre || 'Administrador';

  // Cargar Resumen y Datos Iniciales
  const loadData = async () => {
    try {
      setLoading(true);
      const [sumData, critData, expData, kardData, prodsData] = await Promise.all([
        getInventorySummary().catch(() => null),
        getCriticalStock(stockFilter, stockSearch).catch(() => []),
        getExpiringLots(expFilter, expSearch).catch(() => []),
        getKardex().catch(() => []),
        getProducts().catch(() => [])
      ]);

      setSummary(sumData);
      setCriticalProducts(critData || []);
      setExpiringLots(expData || []);
      setKardexList(kardData || []);
      setAllProducts(prodsData || []);
    } catch (err) {
      console.error('Error cargando inventario:', err);
      showToast('Error al cargar datos de inventario', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recargar según filtros de Stock
  useEffect(() => {
    const fetchStock = async () => {
      try {
        const data = await getCriticalStock(stockFilter, stockSearch);
        setCriticalProducts(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStock();
  }, [stockFilter, stockSearch]);

  // Recargar según filtros de Caducidad
  useEffect(() => {
    const fetchExp = async () => {
      try {
        const data = await getExpiringLots(expFilter, expSearch);
        setExpiringLots(data || []);
      } catch (e) {
        console.error(e);
      }
    };
    fetchExp();
  }, [expFilter, expSearch]);

  // Manejar Registro de Ajuste Manual
  const handleOpenAdjust = (prod = null) => {
    setAdjustForm({
      ProductoID: prod ? prod.ProductoID : (allProducts[0]?.ProductoID || ''),
      tipoAjuste: 'AJUSTE_INGRESO',
      cantidad: 1,
      motivo: prod ? `Reposición de stock para ${prod.Nombre}` : 'Ajuste de inventario',
      documentoReferencia: 'AJUSTE-MANUAL',
      usuarioResponsable: userName
    });
    setAdjustError('');
    setIsAdjustModalOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setAdjustError('');

    if (!adjustForm.ProductoID || !adjustForm.cantidad || adjustForm.cantidad <= 0) {
      setAdjustError('Por favor selecciona un producto e ingresa una cantidad válida (> 0).');
      return;
    }

    try {
      setAdjustLoading(true);
      const res = await recordInventoryAdjustment({
        ...adjustForm,
        usuarioResponsable: userName
      });
      showToast(res.message || 'Ajuste de inventario registrado con éxito.');
      setIsAdjustModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error registrando ajuste:', err);
      setAdjustError(err.response?.data?.message || 'Error al procesar el ajuste de inventario.');
    } finally {
      setAdjustLoading(false);
    }
  };

  // Filtrado de Kardex
  const filteredKardex = kardexList.filter((k) => {
    const matchesType = kardexTypeFilter === 'ALL' || k.TipoMovimiento === kardexTypeFilter;
    const q = kardexSearch.toLowerCase();
    const matchesSearch =
      !kardexSearch ||
      (k.Producto?.Nombre && k.Producto.Nombre.toLowerCase().includes(q)) ||
      (k.Producto?.CodigoBarras && k.Producto.CodigoBarras.toLowerCase().includes(q)) ||
      (k.DocumentoReferencia && k.DocumentoReferencia.toLowerCase().includes(q)) ||
      (k.Motivo && k.Motivo.toLowerCase().includes(q)) ||
      (k.UsuarioResponsable && k.UsuarioResponsable.toLowerCase().includes(q));

    return matchesType && matchesSearch;
  });

  return (
    <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex">
      {/* Sidebar fijo */}
      <Sidebar activeItem="inventario" />

      {/* Contenedor Principal */}
      <main className={`flex-1 transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-[#0c0e12] flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Control de Inventario y Alertas
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-1 max-w-[65ch]">
                Semáforo de existencias críticas, caducidad de lotes FEFO y trazabilidad de movimientos Kardex
              </p>
            </div>

            <button
              onClick={() => handleOpenAdjust()}
              className="btn-press px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.97] self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Registrar Ajuste / Movimiento</span>
            </button>
          </div>

          {/* Tarjetas de Métricas de Resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Productos */}
            <div className="bg-[#12151c] border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-semibold">Total Ítems en Catálogo</p>
                <h3 className="text-2xl font-extrabold text-zinc-100 font-mono tabular-nums mt-1">
                  {summary?.stock?.totalProducts || 0}
                </h3>
                <span className="text-[11px] text-zinc-400 font-medium">Productos registrados</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>

            {/* Agotados */}
            <div className="bg-[#12151c] border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-semibold">Productos Agotados (Stock 0)</p>
                <h3 className="text-2xl font-extrabold text-red-400 font-mono tabular-nums mt-1">
                  {summary?.stock?.outOfStockCount || 0}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-red-400 font-semibold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  Requieren compra urgente
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Stock Bajo / Crítico */}
            <div className="bg-[#12151c] border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-semibold">Stock Crítico (≤ Mínimo)</p>
                <h3 className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-1">
                  {summary?.stock?.lowStockCount || 0}
                </h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 font-semibold mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Por agotarse
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Lotes Vencidos / Por Vencer */}
            <div className="bg-[#12151c] border border-zinc-800/80 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-semibold">Lotes por Vencer / Vencidos</p>
                <h3 className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-1">
                  {(summary?.expiration?.expiredLotsCount || 0) + (summary?.expiration?.expiringSoonCount || 0)}
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono tabular-nums font-medium">
                  <span className="text-red-400 font-semibold">{summary?.expiration?.expiredLotsCount || 0}</span> Vencidos •{' '}
                  <span className="text-amber-400 font-semibold">{summary?.expiration?.expiringSoonCount || 0}</span> &lt; 30d
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
            <button
              onClick={() => setActiveTab('stock')}
              className={`btn-press px-4 py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-2 ${
                activeTab === 'stock'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#12151c] border border-transparent hover:border-zinc-800/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Monitor de Stock y Alertas</span>
              <span className={`font-mono tabular-nums px-1.5 py-0.5 rounded text-[11px] ${
                activeTab === 'stock' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {criticalProducts.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('expiration')}
              className={`btn-press px-4 py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-2 ${
                activeTab === 'expiration'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#12151c] border border-transparent hover:border-zinc-800/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Semáforo de Caducidad FEFO</span>
              <span className={`font-mono tabular-nums px-1.5 py-0.5 rounded text-[11px] ${
                activeTab === 'expiration' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {expiringLots.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('kardex')}
              className={`btn-press px-4 py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-2 ${
                activeTab === 'kardex'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#12151c] border border-transparent hover:border-zinc-800/80'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Kardex de Movimientos</span>
              <span className={`font-mono tabular-nums px-1.5 py-0.5 rounded text-[11px] ${
                activeTab === 'kardex' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'
              }`}>
                {filteredKardex.length}
              </span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* PESTAÑA 1: MONITOR DE STOCK CRÍTICO                      */}
          {/* ======================================================== */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre, código SKU o categoría..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 transition-colors duration-150"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => setStockFilter('ALL')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      stockFilter === 'ALL'
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <span>Todos</span>
                    <span className="font-mono tabular-nums">({summary?.stock?.totalProducts || 0})</span>
                  </button>

                  <button
                    onClick={() => setStockFilter('OUT_OF_STOCK')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      stockFilter === 'OUT_OF_STOCK'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'text-zinc-400 hover:text-red-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>Agotados</span>
                    <span className="font-mono tabular-nums">({summary?.stock?.outOfStockCount || 0})</span>
                  </button>

                  <button
                    onClick={() => setStockFilter('LOW_STOCK')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      stockFilter === 'LOW_STOCK'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-zinc-400 hover:text-amber-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Stock Crítico</span>
                    <span className="font-mono tabular-nums">({summary?.stock?.lowStockCount || 0})</span>
                  </button>

                  <button
                    onClick={() => setStockFilter('OPTIMAL')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      stockFilter === 'OPTIMAL'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-emerald-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Óptimos</span>
                    <span className="font-mono tabular-nums">({summary?.stock?.optimalStockCount || 0})</span>
                  </button>
                </div>
              </div>

              {/* Tabla de Productos y Semáforo */}
              <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl overflow-hidden">
                {loading ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-zinc-400 font-semibold">Analizando existencias y niveles de stock...</p>
                  </div>
                ) : criticalProducts.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#0c0e12] border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100">No se encontraron productos con el filtro seleccionado</h3>
                    <p className="text-xs text-zinc-400">Prueba cambiando los filtros o el término de búsqueda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-[#0c0e12] text-[11px] font-bold uppercase text-zinc-400 tracking-wider border-b border-zinc-800">
                        <tr>
                          <th className="py-3.5 px-4">Producto</th>
                          <th className="py-3.5 px-4">Categoría / Marca</th>
                          <th className="py-3.5 px-4 text-center">Stock Actual</th>
                          <th className="py-3.5 px-4 text-center">Stock Mínimo</th>
                          <th className="py-3.5 px-4">Nivel y Semáforo</th>
                          <th className="py-3.5 px-4 text-right">Reposición Sugerida</th>
                          <th className="py-3.5 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {criticalProducts.map((prod) => {
                          const percent = Math.min(100, Math.round((prod.Stock / (prod.StockMinimo || 5)) * 100));
                          const isOut = prod.status === 'OUT_OF_STOCK';
                          const isLow = prod.status === 'LOW_STOCK';
                          const statusTextColor = isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400';
                          const statusDotColor = isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-400';
                          const statusBarColor = isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500';

                          return (
                            <tr key={prod.ProductoID} className="hover:bg-zinc-800/30 transition-colors duration-150">
                              {/* Producto */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  {prod.Imagen ? (
                                    <img
                                      src={`http://localhost:3000${prod.Imagen}`}
                                      alt={prod.Nombre}
                                      className="w-10 h-10 object-cover rounded-xl border border-zinc-800 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-[#0c0e12] border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                      </svg>
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-zinc-100 text-xs">{prod.Nombre}</p>
                                    <p className="text-[11px] text-amber-400/90 font-mono tabular-nums">
                                      SKU: {prod.CodigoBarras || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Categoría / Marca */}
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-zinc-300">{prod.Categoria?.Nombre || 'General'}</p>
                                <p className="text-[11px] text-zinc-400">{prod.Marca?.Nombre || 'Sin Marca'}</p>
                              </td>

                              {/* Stock Actual */}
                              <td className="py-3.5 px-4 text-center">
                                <span className={`font-mono tabular-nums font-extrabold text-sm ${statusTextColor}`}>
                                  {prod.Stock} {prod.Unidad?.Nombre || 'unid'}
                                </span>
                              </td>

                              {/* Stock Mínimo */}
                              <td className="py-3.5 px-4 text-center font-mono tabular-nums text-zinc-400 font-bold">
                                {prod.StockMinimo} {prod.Unidad?.Nombre || 'unid'}
                              </td>

                              {/* Barra de Nivel y Semáforo */}
                              <td className="py-3.5 px-4 w-48">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span className={`inline-flex items-center gap-1.5 ${statusTextColor}`}>
                                      <span className={`w-2 h-2 rounded-full ${statusDotColor}`}></span>
                                      {prod.statusLabel}
                                    </span>
                                    <span className="text-zinc-400 font-mono tabular-nums">{percent}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-[#0c0e12] rounded-full overflow-hidden border border-zinc-800">
                                    <div
                                      className={`h-full ${statusBarColor} transition-[width] duration-200 ease-out-expo`}
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              {/* Reposición sugerida */}
                              <td className="py-3.5 px-4 text-right">
                                {prod.deficit > 0 ? (
                                  <span className="font-mono tabular-nums text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/25">
                                    Pedir +{prod.deficit} unid.
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Abastecido
                                  </span>
                                )}
                              </td>

                              {/* Acción */}
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleOpenAdjust(prod)}
                                  className="btn-press px-3 py-1.5 bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-amber-400 border border-zinc-700 hover:border-amber-500 rounded-lg text-xs font-bold transition-colors duration-150 active:scale-[0.97]"
                                  title="Ajustar o Reponer Stock"
                                >
                                  + Reponer
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 2: SEMÁFORO DE CADUCIDAD DE LOTES                 */}
          {/* ======================================================== */}
          {activeTab === 'expiration' && (
            <div className="space-y-4">
              {/* Barra de Filtros */}
              <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por producto químico, pintura, silicona o código de lote..."
                    value={expSearch}
                    onChange={(e) => setExpSearch(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 transition-colors duration-150"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => setExpFilter('ALL')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      expFilter === 'ALL'
                        ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <span>Todos los Lotes</span>
                    <span className="font-mono tabular-nums">({expiringLots.length})</span>
                  </button>

                  <button
                    onClick={() => setExpFilter('EXPIRED')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      expFilter === 'EXPIRED'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'text-zinc-400 hover:text-red-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>Vencidos</span>
                    <span className="font-mono tabular-nums">({summary?.expiration?.expiredLotsCount || 0})</span>
                  </button>

                  <button
                    onClick={() => setExpFilter('EXPIRING_SOON')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      expFilter === 'EXPIRING_SOON'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'text-zinc-400 hover:text-amber-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Vencen pronto (≤ 60d)</span>
                  </button>

                  <button
                    onClick={() => setExpFilter('OPTIMAL')}
                    className={`btn-press px-3 py-1.5 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97] flex items-center gap-1.5 ${
                      expFilter === 'OPTIMAL'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-zinc-400 hover:text-emerald-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Vigentes (&gt; 60d)</span>
                  </button>
                </div>
              </div>

              {/* Tabla de Lotes con Semáforo Temporal */}
              <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl overflow-hidden">
                {loading ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-zinc-400 font-semibold">Calculando fechas de vencimiento FEFO...</p>
                  </div>
                ) : expiringLots.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#0c0e12] border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100">No hay lotes con este estado de caducidad</h3>
                    <p className="text-xs text-zinc-400">Todos tus productos químicos y pinturas están en condiciones óptimas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-[#0c0e12] text-[11px] font-bold uppercase text-zinc-400 tracking-wider border-b border-zinc-800">
                        <tr>
                          <th className="py-3.5 px-4">Producto & Lote</th>
                          <th className="py-3.5 px-4">Categoría</th>
                          <th className="py-3.5 px-4 text-center">Stock del Lote</th>
                          <th className="py-3.5 px-4 text-center">Fecha de Caducidad</th>
                          <th className="py-3.5 px-4 text-center">Días Restantes</th>
                          <th className="py-3.5 px-4 text-center">Estado FEFO</th>
                          <th className="py-3.5 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {expiringLots.map((lote) => (
                          <tr key={lote.LoteID} className="hover:bg-zinc-800/30 transition-colors duration-150">
                            {/* Producto & Lote */}
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-zinc-100 text-xs">{lote.ProductoNombre}</p>
                              <p className="text-[11px] text-amber-400 font-mono tabular-nums">{lote.NotaLote}</p>
                            </td>

                            {/* Categoría */}
                            <td className="py-3.5 px-4 font-semibold text-zinc-300">
                              {lote.Categoria}
                            </td>

                            {/* Stock del Lote */}
                            <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold text-zinc-100">
                              {lote.Stock} {lote.Unidad}
                            </td>

                            {/* Fecha Vencimiento */}
                            <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold text-zinc-200">
                              {lote.FechaVencimiento}
                            </td>

                            {/* Días Restantes */}
                            <td className="py-3.5 px-4 text-center">
                              {lote.daysRemaining <= 0 ? (
                                <span className="font-mono tabular-nums text-xs font-extrabold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/25">
                                  Caducó hace {Math.abs(lote.daysRemaining)} días
                                </span>
                              ) : (
                                <span className={`font-mono tabular-nums text-xs font-bold ${
                                  lote.daysRemaining <= 30
                                    ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25'
                                    : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/25'
                                } px-2.5 py-1 rounded-lg`}>
                                  Quedan {lote.daysRemaining} días
                                </span>
                              )}
                            </td>

                            {/* Estado Semáforo */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                lote.status === 'EXPIRED'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/25'
                                  : lote.status === 'EXPIRING_SOON'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  lote.status === 'EXPIRED' ? 'bg-red-500' : lote.status === 'EXPIRING_SOON' ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}></span>
                                {lote.statusLabel}
                              </span>
                            </td>

                            {/* Acción */}
                            <td className="py-3.5 px-4 text-right">
                              {lote.status === 'EXPIRED' ? (
                                <button
                                  onClick={() => {
                                    setAdjustForm({
                                      ProductoID: lote.ProductoID,
                                      LoteID: lote.LoteID,
                                      tipoAjuste: 'BAJA_VENCIMIENTO',
                                      cantidad: lote.Stock,
                                      motivo: `Baja por caducidad FEFO (Venció el ${lote.FechaVencimiento})`,
                                      documentoReferencia: `BAJA-LOTE-${lote.LoteID}`,
                                      usuarioResponsable: userName
                                    });
                                    setIsAdjustModalOpen(true);
                                  }}
                                  className="btn-press px-3 py-1.5 bg-red-500/15 hover:bg-red-600 text-red-400 hover:text-zinc-100 rounded-lg text-xs font-bold transition-colors duration-150 active:scale-[0.97] border border-red-500/30"
                                >
                                  Dar de Baja
                                </button>
                              ) : (
                                <span className="text-[11px] text-amber-400/90 font-mono tabular-nums font-semibold">
                                  Prioridad FEFO
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* PESTAÑA 3: KARDEX DE MOVIMIENTOS                         */}
          {/* ======================================================== */}
          {activeTab === 'kardex' && (
            <div className="space-y-4">
              {/* Filtros de Kardex */}
              <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por producto, documento de referencia, motivo o responsable..."
                    value={kardexSearch}
                    onChange={(e) => setKardexSearch(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500 transition-colors duration-150"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={kardexTypeFilter}
                    onChange={(e) => setKardexTypeFilter(e.target.value)}
                    className="bg-[#0c0e12] border border-zinc-800 focus:border-amber-500 text-zinc-300 text-xs font-bold px-3.5 py-2 rounded-xl outline-none cursor-pointer hover:text-zinc-100 transition-colors duration-150"
                  >
                    <option value="ALL">Todos los Movimientos</option>
                    <option value="ENTRADA_COMPRA">Entradas por Compra</option>
                    <option value="SALIDA_VENTA">Salidas por Venta</option>
                    <option value="AJUSTE_INGRESO">Ajustes de Ingreso</option>
                    <option value="AJUSTE_MERMA">Ajustes de Merma / Daño</option>
                    <option value="BAJA_VENCIMIENTO">Bajas por Vencimiento</option>
                  </select>
                </div>
              </div>

              {/* Tabla Kardex */}
              <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl overflow-hidden">
                {filteredKardex.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-xl bg-[#0c0e12] border border-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-100">No se registran movimientos en el Kardex</h3>
                    <p className="text-xs text-zinc-400">Los movimientos de ventas, compras y ajustes se registrarán automáticamente.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-[#0c0e12] text-[11px] font-bold uppercase text-zinc-400 tracking-wider border-b border-zinc-800">
                        <tr>
                          <th className="py-3.5 px-4">Fecha & Hora</th>
                          <th className="py-3.5 px-4">Producto</th>
                          <th className="py-3.5 px-4">Tipo de Movimiento</th>
                          <th className="py-3.5 px-4 text-center">Cantidad</th>
                          <th className="py-3.5 px-4 text-center">Saldo Stock</th>
                          <th className="py-3.5 px-4">Documento / Motivo</th>
                          <th className="py-3.5 px-4 text-right">Responsable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/70">
                        {filteredKardex.map((mov) => {
                          const isPositive = mov.Cantidad > 0;
                          return (
                            <tr key={mov.MovimientoID} className="hover:bg-zinc-800/30 transition-colors duration-150">
                              {/* Fecha */}
                              <td className="py-3.5 px-4 font-mono tabular-nums text-[11px] text-zinc-400">
                                {new Date(mov.fecha).toLocaleString()}
                              </td>

                              {/* Producto */}
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-zinc-100 text-xs">{mov.Producto?.Nombre || 'Producto'}</p>
                                <p className="text-[11px] text-amber-400/90 font-mono tabular-nums">
                                  SKU: {mov.Producto?.CodigoBarras || 'N/A'}
                                </p>
                              </td>

                              {/* Tipo */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  isPositive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/25'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-red-500'}`}></span>
                                  {mov.TipoMovimiento.replace('_', ' ')}
                                </span>
                              </td>

                              {/* Cantidad */}
                              <td className="py-3.5 px-4 text-center font-mono tabular-nums font-extrabold text-sm">
                                <span className={isPositive ? 'text-emerald-400' : 'text-red-400'}>
                                  {isPositive ? `+${mov.Cantidad}` : mov.Cantidad}
                                </span>
                              </td>

                              {/* Stock Ant -> Nuevo */}
                              <td className="py-3.5 px-4 text-center font-mono tabular-nums text-xs">
                                <span className="text-zinc-400">{mov.StockAnterior}</span>
                                <span className="text-amber-400 mx-1.5">→</span>
                                <span className="text-zinc-100 font-bold">{mov.StockNuevo}</span>
                              </td>

                              {/* Documento / Motivo */}
                              <td className="py-3.5 px-4">
                                <p className="font-mono tabular-nums font-bold text-zinc-200 text-[11px]">
                                  {mov.DocumentoReferencia || '—'}
                                </p>
                                <p className="text-[11px] text-zinc-400 truncate max-w-xs">{mov.Motivo || 'Sin motivo'}</p>
                              </td>

                              {/* Responsable */}
                              <td className="py-3.5 px-4 text-right font-semibold text-zinc-300">
                                {mov.UsuarioResponsable || 'Sistema'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: REGISTRAR AJUSTE MANUAL DE INVENTARIO */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-[#12151c] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative animate-modal-in my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-100">Registrar Movimiento / Ajuste</h3>
                  <p className="text-xs text-zinc-400">Actualiza existencias y genera asiento trazable en el Kardex</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="btn-press text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors duration-150 active:scale-[0.97]"
                aria-label="Cerrar modal"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-semibold mb-4">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Seleccionar Producto */}
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">Producto a Ajustar *</label>
                <select
                  value={adjustForm.ProductoID}
                  onChange={(e) => setAdjustForm({ ...adjustForm, ProductoID: e.target.value })}
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-amber-500 font-bold cursor-pointer transition-colors duration-150"
                >
                  <option value="">-- Selecciona un Producto --</option>
                  {allProducts.map((p) => (
                    <option key={p.ProductoID} value={p.ProductoID}>
                      {p.Nombre} (Stock actual: {p.Stock || 0} {p.Unidad?.Nombre || 'unid'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipo de Ajuste */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">Tipo de Movimiento *</label>
                  <select
                    value={adjustForm.tipoAjuste}
                    onChange={(e) => setAdjustForm({ ...adjustForm, tipoAjuste: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-amber-500 font-bold cursor-pointer transition-colors duration-150"
                  >
                    <option value="AJUSTE_INGRESO">Entrada / Ingreso de Stock</option>
                    <option value="ENTRADA_COMPRA">Compra a Proveedor</option>
                    <option value="AJUSTE_MERMA">Merma / Daño de Producto</option>
                    <option value="BAJA_VENCIMIENTO">Baja por Caducidad FEFO</option>
                    <option value="SALIDA_VENTA">Salida Manual</option>
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="text-xs font-bold text-zinc-300 block mb-1.5">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustForm.cantidad}
                    onChange={(e) => setAdjustForm({ ...adjustForm, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-amber-500 font-mono tabular-nums font-bold transition-colors duration-150"
                  />
                </div>
              </div>

              {/* Documento de Referencia */}
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">Documento / N° de Referencia</label>
                <input
                  type="text"
                  value={adjustForm.documentoReferencia}
                  onChange={(e) => setAdjustForm({ ...adjustForm, documentoReferencia: e.target.value })}
                  placeholder="Ej. FAC-COMPRA-102, MERMA-ROTURA-22"
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-mono tabular-nums outline-none focus:border-amber-500 transition-colors duration-150"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">Motivo o Justificación del Ajuste</label>
                <textarea
                  rows="2"
                  value={adjustForm.motivo}
                  onChange={(e) => setAdjustForm({ ...adjustForm, motivo: e.target.value })}
                  placeholder="Explica brevemente por qué se realiza este ajuste..."
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-100 outline-none focus:border-amber-500 resize-none transition-colors duration-150"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="btn-press px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors duration-150 active:scale-[0.97]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="btn-press px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors duration-150 active:scale-[0.97] disabled:opacity-50"
                >
                  {adjustLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{adjustLoading ? 'Guardando...' : 'Registrar en Kardex'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Flotante */}
      {toast.show && (
        <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-[#12151c] border border-zinc-800/80 rounded-xl shadow-2xl p-4 flex items-center gap-3 animate-toast-in">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            toast.type === 'error'
              ? 'bg-red-500/10 border border-red-500/25 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
          }`}>
            {toast.type === 'error' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <p className="text-xs font-bold text-zinc-100 flex-1">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default InventoryControl;
