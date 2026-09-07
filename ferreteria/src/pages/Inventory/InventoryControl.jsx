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
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      {/* Sidebar fijo */}
      <Sidebar activeItem="inventario" />

      {/* Contenedor Principal */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                <span>CONTROL OPERATIVO • OBJETIVO 2</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Control de Inventario y Alertas
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Semáforo de existencias críticas, caducidad de lotes y trazabilidad de movimientos Kardex
              </p>
            </div>

            <button
              onClick={() => handleOpenAdjust()}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 text-xs flex items-center justify-center gap-2 transition-all active:scale-95 self-start sm:self-auto"
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
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Total Ítems en Catálogo</p>
                <h3 className="text-2xl font-extrabold text-white mt-1">{summary?.stock?.totalProducts || 0}</h3>
                <span className="text-[10px] text-slate-500 font-medium">Productos registrados</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>

            {/* Agotados */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Productos Agotados (Stock 0)</p>
                <h3 className="text-2xl font-extrabold text-rose-400 mt-1">{summary?.stock?.outOfStockCount || 0}</h3>
                <span className="text-[10px] text-rose-400/80 font-bold">🔴 Requieren compra urgente</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Stock Bajo / Crítico */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Stock Crítico (≤ Mínimo)</p>
                <h3 className="text-2xl font-extrabold text-amber-400 mt-1">{summary?.stock?.lowStockCount || 0}</h3>
                <span className="text-[10px] text-amber-400/80 font-bold">🟡 Por agotarse</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Lotes Vencidos / Por Vencer */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Lotes por Vencer / Vencidos</p>
                <h3 className="text-2xl font-extrabold text-purple-400 mt-1">
                  {(summary?.expiration?.expiredLotsCount || 0) + (summary?.expiration?.expiringSoonCount || 0)}
                </h3>
                <span className="text-[10px] text-purple-400/80 font-bold">
                  {summary?.expiration?.expiredLotsCount || 0} Vencidos • {summary?.expiration?.expiringSoonCount || 0} &lt; 30 días
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'stock'
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>1. Monitor de Stock y Alertas ({criticalProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('expiration')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'expiration'
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>2. Semáforo de Caducidad de Lotes ({expiringLots.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('kardex')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'kardex'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>3. Kardex de Movimientos ({filteredKardex.length})</span>
            </button>
          </div>

          {/* ======================================================== */}
          {/* PESTAÑA 1: MONITOR DE STOCK CRÍTICO                      */}
          {/* ======================================================== */}
          {activeTab === 'stock' && (
            <div className="space-y-4">
              {/* Barra de Filtros y Búsqueda */}
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar producto por nombre, código de barras o categoría..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => setStockFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      stockFilter === 'ALL'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos ({summary?.stock?.totalProducts || 0})
                  </button>

                  <button
                    onClick={() => setStockFilter('OUT_OF_STOCK')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      stockFilter === 'OUT_OF_STOCK'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    🔴 Agotados ({summary?.stock?.outOfStockCount || 0})
                  </button>

                  <button
                    onClick={() => setStockFilter('LOW_STOCK')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      stockFilter === 'LOW_STOCK'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    🟡 Stock Crítico ({summary?.stock?.lowStockCount || 0})
                  </button>

                  <button
                    onClick={() => setStockFilter('OPTIMAL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      stockFilter === 'OPTIMAL'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    🟢 Óptimos ({summary?.stock?.optimalStockCount || 0})
                  </button>
                </div>
              </div>

              {/* Tabla de Productos y Semáforo */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 font-semibold">Analizando existencias y niveles de stock...</p>
                  </div>
                ) : criticalProducts.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto">
                      ✓
                    </div>
                    <h3 className="text-sm font-bold text-white">No se encontraron productos con el filtro seleccionado</h3>
                    <p className="text-xs text-slate-500">Prueba cambiando los filtros o el término de búsqueda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-800">
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
                      <tbody className="divide-y divide-slate-800/60">
                        {criticalProducts.map((prod) => {
                          const percent = Math.min(100, Math.round((prod.Stock / (prod.StockMinimo || 5)) * 100));
                          return (
                            <tr key={prod.ProductoID} className="hover:bg-slate-800/30 transition-colors">
                              {/* Producto */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  {prod.Imagen ? (
                                    <img
                                      src={`http://localhost:3000${prod.Imagen}`}
                                      alt={prod.Nombre}
                                      className="w-10 h-10 object-cover rounded-xl border border-slate-800 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold shrink-0">
                                      📦
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-white text-xs">{prod.Nombre}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">Cód: {prod.CodigoBarras || 'N/A'}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Categoría / Marca */}
                              <td className="py-3.5 px-4">
                                <p className="font-semibold text-slate-300">{prod.Categoria?.Nombre || 'General'}</p>
                                <p className="text-[10px] text-slate-500">{prod.Marca?.Nombre || 'Sin Marca'}</p>
                              </td>

                              {/* Stock Actual */}
                              <td className="py-3.5 px-4 text-center">
                                <span className={`font-mono font-extrabold text-sm ${
                                  prod.status === 'OUT_OF_STOCK' ? 'text-rose-400' : prod.status === 'LOW_STOCK' ? 'text-amber-400' : 'text-emerald-400'
                                }`}>
                                  {prod.Stock} {prod.Unidad?.Nombre || 'unid'}
                                </span>
                              </td>

                              {/* Stock Mínimo */}
                              <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-bold">
                                {prod.StockMinimo} {prod.Unidad?.Nombre || 'unid'}
                              </td>

                              {/* Barra de Nivel y Semáforo */}
                              <td className="py-3.5 px-4 w-44">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className={`inline-flex items-center gap-1 text-${prod.color}-400`}>
                                      <span className={`w-1.5 h-1.5 rounded-full bg-${prod.color}-400 ${prod.status === 'OUT_OF_STOCK' ? 'animate-ping' : ''}`}></span>
                                      {prod.statusLabel}
                                    </span>
                                    <span className="text-slate-500">{percent}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                    <div
                                      className={`h-full bg-${prod.color}-500 transition-all duration-300`}
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>

                              {/* Reposición sugerida */}
                              <td className="py-3.5 px-4 text-right">
                                {prod.deficit > 0 ? (
                                  <span className="font-mono text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                                    Pedir +{prod.deficit} unid.
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-emerald-400 font-semibold">
                                    ✓ Abastecido
                                  </span>
                                )}
                              </td>

                              {/* Acción */}
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={() => handleOpenAdjust(prod)}
                                  className="px-3 py-1.5 bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 rounded-lg text-xs font-bold transition-all"
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
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por producto químico, pintura, silicona o lote..."
                    value={expSearch}
                    onChange={(e) => setExpSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => setExpFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      expFilter === 'ALL'
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todos los Lotes ({expiringLots.length})
                  </button>

                  <button
                    onClick={() => setExpFilter('EXPIRED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      expFilter === 'EXPIRED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    🔴 Vencidos ({summary?.expiration?.expiredLotsCount || 0})
                  </button>

                  <button
                    onClick={() => setExpFilter('EXPIRING_SOON')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      expFilter === 'EXPIRING_SOON'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    🟡 Vencen pronto (≤ 60 días)
                  </button>

                  <button
                    onClick={() => setExpFilter('OPTIMAL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      expFilter === 'OPTIMAL'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    🟢 Vigentes (&gt; 60 días)
                  </button>
                </div>
              </div>

              {/* Tabla de Lotes con Semáforo Temporal */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400 font-semibold">Calculando fechas de vencimiento...</p>
                  </div>
                ) : expiringLots.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto">
                      ✓
                    </div>
                    <h3 className="text-sm font-bold text-white">No hay lotes con este estado de caducidad</h3>
                    <p className="text-xs text-slate-500">Todos tus productos químicos y pinturas están en condiciones óptimas.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3.5 px-4">Producto & Lote</th>
                          <th className="py-3.5 px-4">Categoría</th>
                          <th className="py-3.5 px-4 text-center">Stock del Lote</th>
                          <th className="py-3.5 px-4 text-center">Fecha de Caducidad</th>
                          <th className="py-3.5 px-4 text-center">Días Restantes</th>
                          <th className="py-3.5 px-4 text-center">Estado Semáforo</th>
                          <th className="py-3.5 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {expiringLots.map((lote) => (
                          <tr key={lote.LoteID} className="hover:bg-slate-800/30 transition-colors">
                            {/* Producto & Lote */}
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-white text-xs">{lote.ProductoNombre}</p>
                              <p className="text-[10px] text-cyan-400 font-mono">{lote.NotaLote}</p>
                            </td>

                            {/* Categoría */}
                            <td className="py-3.5 px-4 font-semibold text-slate-300">
                              {lote.Categoria}
                            </td>

                            {/* Stock del Lote */}
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                              {lote.Stock} {lote.Unidad}
                            </td>

                            {/* Fecha Vencimiento */}
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                              {lote.FechaVencimiento}
                            </td>

                            {/* Días Restantes */}
                            <td className="py-3.5 px-4 text-center">
                              {lote.daysRemaining <= 0 ? (
                                <span className="font-mono text-xs font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/30">
                                  Caducó hace {Math.abs(lote.daysRemaining)} días
                                </span>
                              ) : (
                                <span className={`font-mono text-xs font-bold ${
                                  lote.daysRemaining <= 30 ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                } px-2 py-0.5 rounded-lg`}>
                                  Quedan {lote.daysRemaining} días
                                </span>
                              )}
                            </td>

                            {/* Estado Semáforo */}
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                lote.status === 'EXPIRED'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  : lote.status === 'EXPIRING_SOON'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  lote.status === 'EXPIRED' ? 'bg-rose-400 animate-ping' : lote.status === 'EXPIRING_SOON' ? 'bg-amber-400' : 'bg-emerald-400'
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
                                      motivo: `Baja por caducidad (Venció el ${lote.FechaVencimiento})`,
                                      documentoReferencia: `BAJA-LOTE-${lote.LoteID}`,
                                      usuarioResponsable: userName
                                    });
                                    setIsAdjustModalOpen(true);
                                  }}
                                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-rose-500/30"
                                >
                                  Dar de Baja
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-mono">
                                  Prioridad FIFO
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
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por producto, documento de referencia, motivo o responsable..."
                    value={kardexSearch}
                    onChange={(e) => setKardexSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={kardexTypeFilter}
                    onChange={(e) => setKardexTypeFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl outline-none cursor-pointer hover:text-white"
                  >
                    <option value="ALL">Todos los Movimientos</option>
                    <option value="ENTRADA_COMPRA">📥 Entradas por Compra</option>
                    <option value="SALIDA_VENTA">📤 Salidas por Venta</option>
                    <option value="AJUSTE_INGRESO">⚙️ Ajustes de Ingreso</option>
                    <option value="AJUSTE_MERMA">📉 Ajustes de Merma / Daño</option>
                    <option value="BAJA_VENCIMIENTO">🗑️ Bajas por Vencimiento</option>
                  </select>
                </div>
              </div>

              {/* Tabla Kardex */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {filteredKardex.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto">
                      📜
                    </div>
                    <h3 className="text-sm font-bold text-white">No se registran movimientos en el Kardex</h3>
                    <p className="text-xs text-slate-500">Los movimientos de ventas, compras y ajustes se registrarán automáticamente.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3.5 px-4">Fecha & Hora</th>
                          <th className="py-3.5 px-4">Producto</th>
                          <th className="py-3.5 px-4">Tipo de Movimiento</th>
                          <th className="py-3.5 px-4 text-center">Cantidad</th>
                          <th className="py-3.5 px-4 text-center">Stock: Ant ➡️ Nuevo</th>
                          <th className="py-3.5 px-4">Documento / Motivo</th>
                          <th className="py-3.5 px-4 text-right">Responsable</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredKardex.map((mov) => {
                          const isPositive = mov.Cantidad > 0;
                          return (
                            <tr key={mov.MovimientoID} className="hover:bg-slate-800/30 transition-colors">
                              {/* Fecha */}
                              <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                                {new Date(mov.fecha).toLocaleString()}
                              </td>

                              {/* Producto */}
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-white text-xs">{mov.Producto?.Nombre || 'Producto'}</p>
                                <p className="text-[10px] text-slate-500 font-mono">Cód: {mov.Producto?.CodigoBarras || 'N/A'}</p>
                              </td>

                              {/* Tipo */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  isPositive
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {isPositive ? '📥' : '📤'} {mov.TipoMovimiento.replace('_', ' ')}
                                </span>
                              </td>

                              {/* Cantidad */}
                              <td className="py-3.5 px-4 text-center font-mono font-extrabold">
                                <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                                  {isPositive ? `+${mov.Cantidad}` : mov.Cantidad}
                                </span>
                              </td>

                              {/* Stock Ant -> Nuevo */}
                              <td className="py-3.5 px-4 text-center font-mono text-xs">
                                <span className="text-slate-500">{mov.StockAnterior}</span>
                                <span className="text-cyan-400 mx-1.5">➔</span>
                                <span className="text-white font-bold">{mov.StockNuevo}</span>
                              </td>

                              {/* Documento / Motivo */}
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-slate-200 text-[11px]">{mov.DocumentoReferencia || '—'}</p>
                                <p className="text-[10px] text-slate-500 truncate max-w-xs">{mov.Motivo || 'Sin motivo'}</p>
                              </td>

                              {/* Responsable */}
                              <td className="py-3.5 px-4 text-right font-semibold text-slate-300">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  ⚙️
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Registrar Movimiento / Ajuste</h3>
                  <p className="text-xs text-slate-400">Actualiza existencias y genera registro en el Kardex</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold mb-4">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              {/* Seleccionar Producto */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Producto a Ajustar *</label>
                <select
                  value={adjustForm.ProductoID}
                  onChange={(e) => setAdjustForm({ ...adjustForm, ProductoID: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-bold cursor-pointer"
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
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tipo de Movimiento *</label>
                  <select
                    value={adjustForm.tipoAjuste}
                    onChange={(e) => setAdjustForm({ ...adjustForm, tipoAjuste: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-bold cursor-pointer"
                  >
                    <option value="AJUSTE_INGRESO">📥 Entrada / Ingreso de Stock</option>
                    <option value="ENTRADA_COMPRA">📦 Compra a Proveedor</option>
                    <option value="AJUSTE_MERMA">📉 Merma / Daño de Producto</option>
                    <option value="BAJA_VENCIMIENTO">🗑️ Baja por Caducidad</option>
                    <option value="SALIDA_VENTA">📤 Salida Manual</option>
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustForm.cantidad}
                    onChange={(e) => setAdjustForm({ ...adjustForm, cantidad: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Documento de Referencia */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Documento / N° de Referencia</label>
                <input
                  type="text"
                  value={adjustForm.documentoReferencia}
                  onChange={(e) => setAdjustForm({ ...adjustForm, documentoReferencia: e.target.value })}
                  placeholder="Ej. FAC-COMPRA-102, MERMA-ROTURA-22"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Motivo o Justificación del Ajuste</label>
                <textarea
                  rows="2"
                  value={adjustForm.motivo}
                  onChange={(e) => setAdjustForm({ ...adjustForm, motivo: e.target.value })}
                  placeholder="Explica brevemente por qué se realiza este ajuste..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  {adjustLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
        <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3 backdrop-blur-md animate-slide-in">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
            ✓
          </div>
          <p className="text-xs font-bold text-white flex-1">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default InventoryControl;
