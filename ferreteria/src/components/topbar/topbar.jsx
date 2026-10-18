import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getInventorySummary, getExpiringLots, getCriticalStock } from '../../services/api';

function Topbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState('ALL'); // 'ALL' | 'EXPIRING' | 'STOCK'

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Alertas dinámicas
  const [expiringLots, setExpiringLots] = useState([]);
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Alertas descartadas por el usuario (persistencia local)
  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Descartar una notificación individual
  const handleDismissNotif = (e, notifKey) => {
    e.stopPropagation();
    setDismissedNotifIds((prev) => {
      const updated = [...new Set([...prev, notifKey])];
      try {
        localStorage.setItem('cyc_dismissed_notifications', JSON.stringify(updated));
      } catch (err) {
        console.warn('Error guardando notificaciones descartadas:', err);
      }
      return updated;
    });
  };

  // Marcar todas como leídas / descartar todas
  const handleDismissAll = () => {
    const allKeys = [
      ...expiringLots.map((l) => `lot-${l.LoteID}`),
      ...criticalProducts.map((p) => `prod-${p.ProductoID}`)
    ];
    setDismissedNotifIds((prev) => {
      const updated = [...new Set([...prev, ...allKeys])];
      try {
        localStorage.setItem('cyc_dismissed_notifications', JSON.stringify(updated));
      } catch (err) {
        console.warn('Error guardando notificaciones descartadas:', err);
      }
      return updated;
    });
  };

  // Restablecer todas las notificaciones descartadas
  const handleRestoreDismissed = () => {
    setDismissedNotifIds([]);
    try {
      localStorage.removeItem('cyc_dismissed_notifications');
    } catch (err) {
      console.warn('Error limpiando notificaciones descartadas:', err);
    }
  };

  // Obtener usuario autenticado de la sesión
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Cargar notificaciones reales de la base de datos
  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const [expLots, critProds] = await Promise.all([
        getExpiringLots('URGENT').catch(() => []),
        getCriticalStock('CRITICAL_ONLY').catch(() => [])
      ]);

      setExpiringLots(Array.isArray(expLots) ? expLots : []);
      setCriticalProducts(Array.isArray(critProds) ? critProds : []);
    } catch (e) {
      console.warn('Error al cargar notificaciones en Topbar:', e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresco periódico cada 60 segundos
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Escuchar clicks fuera de los dropdowns para cerrarlos
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función para obtener la fecha actual del sistema formateada como DD/MM/YYYY
  const getFechaActual = () => {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const yyyy = hoy.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Calcular iniciales del nombre
  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || 'OP';
  };

  const nombreCompleto = user?.Nombre || (user ? 'Operador' : '');
  const userRole = user?.Rol || 'Operador';
  const userEmail = user?.Correo || '';
  const initials = user ? getInitials(nombreCompleto) : 'OP';

  const activeExpiringLots = expiringLots.filter((l) => {
    if (dismissedNotifIds.includes(`lot-${l.LoteID}`)) return false;
    // Auto-desaparición tras 7 días de vencido
    if (l.status === 'EXPIRED' && l.daysRemaining !== undefined && l.daysRemaining < -7) return false;
    return true;
  });
  const activeCriticalProducts = criticalProducts.filter((p) => !dismissedNotifIds.includes(`prod-${p.ProductoID}`));
  const activeAlertsCount = activeExpiringLots.length + activeCriticalProducts.length;

  // Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem('cyc_user_session');
    localStorage.removeItem('cyc_client_session');
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-zinc-800/90 px-6 sm:px-8 flex justify-between items-center bg-[#0c0e12]/90 backdrop-blur-md sticky top-0 z-30">
      {/* Lado Izquierdo: Info de Sucursal y Estado */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold text-zinc-300 tracking-tight">
            Sucursal Central — C&C Casa y Construcción
          </span>
        </div>
      </div>

      {/* Lado Derecho: Fecha, Notificaciones y Perfil */}
      <div className="flex items-center gap-3.5 sm:gap-5">
        {/* Fecha Dinámica */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#12151c] border border-zinc-800/90 text-xs font-mono tabular-nums font-medium text-zinc-300">
          <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{getFechaActual()}</span>
        </div>

        {/* Notificaciones Interactivas */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (!isNotifOpen) fetchNotifications();
            }}
            title={`${activeAlertsCount} Alertas pendientes`}
            className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-colors duration-160 ease-out-expo btn-press cursor-pointer ${
              isNotifOpen
                ? 'bg-zinc-800 border-amber-500/60 text-amber-400'
                : 'bg-[#12151c] border-zinc-800/90 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>

            {activeAlertsCount > 0 ? (
              <span className={`absolute -top-1.5 -right-1.5 font-mono tabular-nums font-bold text-[10px] px-1.5 py-0.2 rounded-md ring-2 ring-[#0c0e12] ${
                activeExpiringLots.some((l) => l.status === 'EXPIRED') || activeCriticalProducts.some((p) => p.Stock === 0)
                  ? 'bg-rose-500 text-white'
                  : 'bg-amber-500 text-zinc-950'
              }`}>
                {activeAlertsCount}
              </span>
            ) : (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-[#0c0e12]"></span>
            )}
          </button>

          {/* Menú Desplegable de Notificaciones */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#12151c] border border-zinc-800 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-50 origin-top-right animate-popover-in divide-y divide-zinc-800/90">
              {/* Encabezado */}
              <div className="p-3.5 bg-[#0c0e12] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-100">Centro de alertas</span>
                  <span className={`px-2 py-0.5 rounded-md font-mono tabular-nums text-[10px] font-semibold border ${
                    activeAlertsCount > 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  }`}>
                    {activeAlertsCount} {activeAlertsCount === 1 ? 'activa' : 'activas'}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  {activeAlertsCount > 0 && (
                    <button
                      onClick={handleDismissAll}
                      title="Marcar todas como leídas"
                      className="text-[11px] text-zinc-400 hover:text-amber-400 font-medium flex items-center gap-1 cursor-pointer transition-colors duration-160 ease-out-expo"
                    >
                      <span>✓ Marcar todas</span>
                    </button>
                  )}
                  <button
                    onClick={fetchNotifications}
                    disabled={loadingNotifs}
                    title="Actualizar alertas"
                    className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md hover:bg-zinc-800 cursor-pointer transition-colors duration-160 ease-out-expo"
                  >
                    <svg className={`w-3.5 h-3.5 ${loadingNotifs ? 'animate-spin text-amber-400' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Tabs de Filtro */}
              <div className="flex bg-[#0c0e12]/60 p-1.5 gap-1 text-[11px] font-semibold">
                <button
                  onClick={() => setActiveNotifTab('ALL')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-colors duration-160 ease-out-expo cursor-pointer ${
                    activeNotifTab === 'ALL'
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Todas (<span className="font-mono tabular-nums">{activeAlertsCount}</span>)
                </button>
                <button
                  onClick={() => setActiveNotifTab('EXPIRING')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-colors duration-160 ease-out-expo flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeNotifTab === 'EXPIRING'
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>FEFO</span>
                  <span className="font-mono tabular-nums text-[10px] px-1.5 rounded bg-zinc-900">{activeExpiringLots.length}</span>
                </button>
                <button
                  onClick={() => setActiveNotifTab('STOCK')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-colors duration-160 ease-out-expo flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeNotifTab === 'STOCK'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Stock</span>
                  <span className="font-mono tabular-nums text-[10px] px-1.5 rounded bg-zinc-900">{activeCriticalProducts.length}</span>
                </button>
              </div>

              {/* Lista de Alertas */}
              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800/70">
                {activeAlertsCount === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mx-auto">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="font-semibold text-zinc-200">Operación al día</p>
                    <p className="text-[11px] text-zinc-500">
                      {dismissedNotifIds.length > 0
                        ? 'Has descartado las notificaciones activas.'
                        : 'No hay lotes vencidos ni productos con stock crítico.'}
                    </p>
                    {dismissedNotifIds.length > 0 && (
                      <button
                        onClick={handleRestoreDismissed}
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold mt-1 cursor-pointer transition-colors duration-160 ease-out-expo"
                      >
                        ↺ Restablecer alertas (<span className="font-mono tabular-nums">{dismissedNotifIds.length}</span>)
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Alertas de Vencimiento */}
                    {(activeNotifTab === 'ALL' || activeNotifTab === 'EXPIRING') &&
                      activeExpiringLots.map((lot) => {
                        const isExpired = lot.status === 'EXPIRED';
                        return (
                          <div
                            key={`lot-${lot.LoteID}`}
                            className="p-3 hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo flex items-start gap-2.5 text-xs group relative"
                          >
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              isExpired ? 'bg-rose-500' : 'bg-amber-400'
                            }`}></span>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-zinc-100 truncate">
                                  {lot.ProductoNombre}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isExpired
                                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  }`}>
                                    {isExpired ? 'Vencido' : `${lot.daysRemaining}d`}
                                  </span>
                                  <button
                                    onClick={(e) => handleDismissNotif(e, `lot-${lot.LoteID}`)}
                                    title="Descartar esta alerta"
                                    className="text-zinc-500 hover:text-rose-400 p-0.5 rounded hover:bg-zinc-800 transition-colors duration-160 ease-out-expo cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                <span className="font-mono">{lot.NotaLote || `LOTE-${lot.LoteID}`}</span> • Stock: <strong className="font-mono tabular-nums text-zinc-200">{lot.Stock} {lot.Unidad || 'UNID'}</strong>
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono tabular-nums">
                                Vence: {lot.FechaVencimiento || '—'}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                    {/* Alertas de Stock Bajo / Agotado */}
                    {(activeNotifTab === 'ALL' || activeNotifTab === 'STOCK') &&
                      activeCriticalProducts.map((prod) => {
                        const isOutOfStock = (prod.Stock || 0) === 0;
                        return (
                          <div
                            key={`prod-${prod.ProductoID}`}
                            className="p-3 hover:bg-zinc-800/40 transition-colors duration-160 ease-out-expo flex items-start gap-2.5 text-xs group relative"
                          >
                            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                              isOutOfStock ? 'bg-rose-500' : 'bg-amber-400'
                            }`}></span>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-zinc-100 truncate">
                                  {prod.Nombre}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className={`font-mono tabular-nums text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                    isOutOfStock
                                      ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  }`}>
                                    {isOutOfStock ? 'Agotado' : `Stock: ${prod.Stock}`}
                                  </span>
                                  <button
                                    onClick={(e) => handleDismissNotif(e, `prod-${prod.ProductoID}`)}
                                    title="Descartar esta alerta"
                                    className="text-zinc-500 hover:text-rose-400 p-0.5 rounded hover:bg-zinc-800 transition-colors duration-160 ease-out-expo cursor-pointer"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-zinc-400">
                                SKU: <span className="font-mono text-amber-400">{prod.Codigo || prod.CodigoBarras || `PRD-${prod.ProductoID}`}</span> • Mín: <span className="font-mono tabular-nums">{prod.StockMinimo || prod.LoteMinimo || 5}</span>
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>

              {/* Pie con Acceso Directo a Inventario */}
              <div className="p-2.5 bg-[#0c0e12] flex items-center justify-between text-xs">
                <Link
                  to="/productsView"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors duration-160 ease-out-expo"
                >
                  <span>Ver inventario y lotes →</span>
                </Link>
                <Link
                  to="/home"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors duration-160 ease-out-expo"
                >
                  Panel principal
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Perfil del Operador con Dropdown Interactivo */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[#12151c] border border-transparent hover:border-zinc-800 transition-colors duration-160 ease-out-expo cursor-pointer group outline-none"
          >
            <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 transition-colors duration-160 hidden lg:inline max-w-[200px] truncate">
              {nombreCompleto}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-bold text-zinc-950 text-xs">
              {initials}
            </div>
            <svg
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-180 ease-out-expo ${isDropdownOpen ? 'rotate-180 text-amber-400' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Menú Desplegable (Dropdown) */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#12151c] border border-zinc-800 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden z-50 origin-top-right animate-popover-in divide-y divide-zinc-800/90">
              {/* Encabezado del Perfil */}
              <div className="p-4 bg-[#0c0e12]">
                <p className="text-xs font-bold text-zinc-100 truncate">{nombreCompleto}</p>
                <p className="font-mono text-[11px] text-zinc-400 truncate mt-0.5">{userEmail}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono text-[10px] font-semibold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  {userRole}
                </div>
              </div>

              {/* Botón Cerrar Sesión */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors duration-160 ease-out-expo cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Topbar;

