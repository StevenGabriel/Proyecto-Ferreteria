import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import { getOnlineOrders } from '../../services/api';

function Sidebar({ activeItem }) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();

  // Obtener usuario autenticado y rol de sesión
  let currentUser = null;
  try {
    const saved = localStorage.getItem('cyc_user_session');
    currentUser = saved ? JSON.parse(saved) : null;
  } catch (e) {}

  const role = (currentUser?.Rol || '').toLowerCase();
  const isAdmin = role === 'administrador' || role === 'admin';

  // Inicializar el submenú de productos abierto si el elemento activo pertenece a él
  const isSubProductActive = ['productos-lista', 'productos-unidades', 'productos-categorias', 'productos-marcas', 'productos-almacenes', 'productos-ubicaciones'].includes(activeItem);
  const [isProductsOpen, setIsProductsOpen] = useState(isSubProductActive);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchPendingCount = async () => {
      try {
        const res = await getOnlineOrders({ estado: 'PENDIENTE' });
        if (isMounted && res && res.stats) {
          setPendingOrdersCount(res.stats.pendientes || 0);
        }
      } catch (e) {}
    };
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 25000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const toggleProducts = () => {
    setIsProductsOpen(!isProductsOpen);
  };

  const handleProductsClick = () => {
    if (isCollapsed) {
      toggleSidebar(); // Abrir sidebar primero
      setIsProductsOpen(true);
    } else {
      toggleProducts();
    }
  };

  return (
    <aside
      className={`bg-[#12151c] border-r border-zinc-800/90 flex flex-col justify-between h-screen fixed top-0 left-0 z-30 transition-[width] duration-220 ease-out-expo ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Cabecera: Logo y Botón de Toggle */}
        <div
          className={`p-4 border-b border-zinc-800/90 flex items-center justify-between gap-2 ${
            isCollapsed ? 'flex-col justify-center py-5' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-black text-zinc-950 text-sm tracking-tighter shadow-sm flex-shrink-0">
              C&C
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in whitespace-nowrap">
                <h1 className="font-bold text-sm tracking-tight text-zinc-100 leading-none">
                  Ferretería C&C
                </h1>
                <span className="font-mono text-[10px] text-amber-400 font-medium block mt-1">
                  {isAdmin ? 'PANEL ADMINISTRADOR' : 'PANEL OPERATIVO'}
                </span>
              </div>
            )}
          </div>

          {/* Botón para Contraer/Expandir */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            className="w-8 h-8 rounded-lg bg-[#0c0e12] hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors duration-160 ease-out-expo btn-press cursor-pointer"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-220 ease-out-expo ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Menú de Navegación */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {/* Opción: Inicio */}
          <Link
            to="/home"
            title="Inicio"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'inicio' || location.pathname === '/home' || location.pathname === '/dashboard'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Inicio</span>}
          </Link>

          {/* Opción: Gestión de Usuarios / Empleados (Exclusivo Administrador) */}
          {isAdmin && (
            <Link
              to="/usuarios"
              title="Gestión de usuarios"
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo ${
                isCollapsed ? 'justify-center px-0' : ''
              } ${
                activeItem === 'usuarios' || location.pathname === '/usuarios' || location.pathname === '/empleados'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Gestión de usuarios</span>}
            </Link>
          )}

          {/* Opción: Clientes (Directo para facturación y ventas) */}
          <Link
            to="/clientes"
            title="Clientes"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'clientes' || activeItem === 'contactos-clientes' || location.pathname === '/clientes'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Clientes</span>}
          </Link>

          {/* Opción: Facturación */}
          <Link
            to="/facturacion"
            title="Facturación"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'facturacion' || activeItem === 'facturas' || location.pathname.includes('factura')
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Facturación</span>}
          </Link>

          {/* Opción: Productos (Colapsable / Desplegable - Exclusivo Administrador) */}
          {isAdmin && (
            <div>
              <button
                onClick={handleProductsClick}
                title="Productos"
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo outline-none cursor-pointer ${
                  isCollapsed ? 'justify-center px-0' : ''
                } ${
                  isSubProductActive
                    ? 'text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Productos</span>}
                </div>
                {!isCollapsed && (
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-180 ease-out-expo ${isProductsOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Submenú de Productos */}
              {!isCollapsed && isProductsOpen && (
                <div className="pl-7 pr-1 py-1 space-y-1 border-l border-zinc-800 ml-5 mt-1 animate-fade-in">
                  <Link
                    to="/productsView"
                    className={`w-full text-left block py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo ${
                      activeItem === 'productos-lista'
                        ? 'text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                    }`}
                  >
                    Lista de productos
                  </Link>

                  <Link
                    to="/unidades"
                    className={`w-full text-left block py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo ${
                      activeItem === 'productos-unidades'
                        ? 'text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                    }`}
                  >
                    Unidades
                  </Link>

                  <Link
                    to="/categorias"
                    className={`w-full text-left block py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo ${
                      activeItem === 'productos-categorias'
                        ? 'text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                    }`}
                  >
                    Categorías
                  </Link>

                  <Link
                    to="/marcas"
                    className={`w-full text-left block py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo ${
                      activeItem === 'productos-marcas'
                        ? 'text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                    }`}
                  >
                    Marcas
                  </Link>

                  <Link
                    to="/almacenes"
                    className={`w-full text-left block py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo ${
                      activeItem === 'productos-almacenes'
                        ? 'text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                    }`}
                  >
                    Almacenes
                  </Link>

                  <Link
                    to="/locations"
                    className={`w-full text-left block py-1.5 px-3 rounded-lg text-xs font-medium transition-colors duration-160 ease-out-expo ${
                      activeItem === 'productos-ubicaciones'
                        ? 'text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20'
                        : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                    }`}
                  >
                    Ubicaciones
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Opción: Vender */}
          <Link
            to="/vender"
            title="Vender (Punto de Venta POS)"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'vender' || location.pathname === '/vender' || location.pathname === '/pos'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Vender (POS)</span>}
          </Link>

          {/* Opción: Pedidos Online (Recojo en Tienda) */}
          <Link
            to="/pedidos-online"
            title="Pedidos Online (Recojo en Tienda)"
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-160 ease-out-expo relative ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'pedidos-online' || location.pathname.includes('pedidos')
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Pedidos Online</span>}
            </div>
            {!isCollapsed && pendingOrdersCount > 0 && (
              <span className="bg-amber-500 text-zinc-950 font-mono tabular-nums font-bold text-[10px] px-2 py-0.5 rounded-md">
                {pendingOrdersCount}
              </span>
            )}
            {isCollapsed && pendingOrdersCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400"></span>
            )}
          </Link>
        </nav>
      </div>

      {/* Footer del Sidebar con perfil de operador */}
      <div className="p-3.5 border-t border-zinc-800/90">
        {(() => {
          let user = null;
          try {
            const saved = localStorage.getItem('cyc_user_session');
            user = saved ? JSON.parse(saved) : null;
          } catch (e) {}

          const fullName = user?.Nombre || (user ? 'Operador' : '');
          const role = user?.Rol || 'Operador';
          const parts = fullName.trim().split(' ').filter(Boolean);
          const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0]?.substring(0, 2).toUpperCase() || 'OP');
          const shortName = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : (fullName || 'Operador');

          return (
            <div
              className={`flex items-center gap-2.5 p-2 bg-[#0c0e12] border border-zinc-800/90 rounded-xl ${
                isCollapsed ? 'justify-center p-1.5' : ''
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs flex-shrink-0">
                {initials}
              </div>
              {!isCollapsed && (
                <div className="truncate animate-fade-in">
                  <p className="text-xs font-semibold text-zinc-100 truncate" title={fullName}>{shortName}</p>
                  <span className="font-mono text-[10px] text-zinc-400 uppercase block">
                    {role}
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </aside>
  );
}

export default Sidebar;
