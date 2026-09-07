import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';

function Sidebar({ activeItem }) {
  const { isCollapsed, toggleSidebar } = useSidebar();

  // Inicializar el submenú de productos abierto si el elemento activo pertenece a él
  const isSubProductActive = ['productos-lista', 'productos-unidades', 'productos-categorias', 'productos-marcas', 'productos-almacenes', 'productos-ubicaciones'].includes(activeItem);
  const [isProductsOpen, setIsProductsOpen] = useState(isSubProductActive);

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
      className={`bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen fixed top-0 left-0 z-30 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Cabecera: Logo y Botón de Toggle */}
        <div
          className={`p-5 border-b border-slate-800 flex items-center justify-between gap-2 transition-all duration-300 ${
            isCollapsed ? 'flex-col justify-center py-6' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-500/20 flex-shrink-0">
              C
            </div>
            {!isCollapsed && (
              <div className="animate-fade-in whitespace-nowrap">
                <h1 className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  C&C Ferretería
                </h1>
                <span className="text-[9px] text-cyan-400 font-semibold uppercase tracking-widest block">
                  Panel Operador
                </span>
              </div>
            )}
          </div>

          {/* Botón para Contraer/Expandir */}
          <button
            onClick={toggleSidebar}
            className={`text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/80 transition-all outline-none ${
              isCollapsed ? 'mt-2' : ''
            }`}
            title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>

        {/* Menú de Navegación */}
        <nav className="p-3 space-y-1">
          {/* Opción: Inicio */}
          <Link
            to="/dashboard"
            title="Inicio"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'inicio'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Inicio</span>}
          </Link>

          {/* Opción: Productos (Colapsable / Desplegable) */}
          <div>
            <button
              onClick={handleProductsClick}
              title="Productos"
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 outline-none ${
                isCollapsed ? 'justify-center px-0' : ''
              } ${
                isSubProductActive
                  ? 'text-cyan-400 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Productos</span>}
              </div>
              {!isCollapsed && (
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isProductsOpen ? 'transform rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* Submenú de Productos (solo visible si está expandido el sidebar y la sección está abierta) */}
            {!isCollapsed && isProductsOpen && (
              <div className="pl-9 pr-2 py-1 space-y-1 border-l border-slate-800/60 ml-6 mt-1 animate-fade-in">
                {/* Lista de productos */}
                <Link
                  to="/productsView"
                  className={`w-full text-left block py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    activeItem === 'productos-lista'
                      ? 'text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  Lista de productos
                </Link>

                {/* Unidades */}
                <Link
                  to="/unidades"
                  className={`w-full text-left block py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    activeItem === 'productos-unidades'
                      ? 'text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  Unidades
                </Link>

                {/* Categorías */}
                <Link
                  to="/categorias"
                  className={`w-full text-left block py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    activeItem === 'productos-categorias'
                      ? 'text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  Categorías
                </Link>

                {/* Marcas */}
                <Link
                  to="/marcas"
                  className={`w-full text-left block py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    activeItem === 'productos-marcas'
                      ? 'text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  Marcas
                </Link>

                {/* Almacenes */}
                <Link
                  to="/almacenes"
                  className={`w-full text-left block py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    activeItem === 'productos-almacenes'
                      ? 'text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  Almacenes
                </Link>

                {/* Ubicaciones */}
                <Link
                  to="/locations"
                  className={`w-full text-left block py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                    activeItem === 'productos-ubicaciones'
                      ? 'text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  Ubicaciones
                </Link>
              </div>
            )}
          </div>

          {/* Opción: Facturación SIAT */}
          <button
            title="Facturación SIAT"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-200 ${
              isCollapsed ? 'justify-center px-0' : ''
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Facturación SIAT</span>}
          </button>

          {/* Opción: Vender */}
          <Link
            to="/vender"
            title="Vender (Punto de Venta POS)"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'vender'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Vender</span>}
          </Link>

          {/* Opción: Gestión de Usuarios / Empleados (Objetivo 4) */}
          <Link
            to="/usuarios"
            title="Usuarios y Roles"
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isCollapsed ? 'justify-center px-0' : ''
            } ${
              activeItem === 'usuarios'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Usuarios y Roles</span>}
          </Link>
        </nav>
      </div>

      {/* Footer del Sidebar con perfil de operador */}
      <div className="p-4 border-t border-slate-800">
        {(() => {
          let user = null;
          try {
            const saved = localStorage.getItem('cyc_user_session');
            user = saved ? JSON.parse(saved) : null;
          } catch (e) {}

          const fullName = user?.Nombre || 'Oscar Edgar';
          const role = user?.Rol || 'Administrador';
          const parts = fullName.trim().split(' ').filter(Boolean);
          const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : (parts[0]?.substring(0, 2).toUpperCase() || 'OE');
          const shortName = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : fullName;

          return (
            <div
              className={`flex items-center gap-3 p-2 bg-slate-950/50 border border-slate-800/80 rounded-xl transition-all duration-300 ${
                isCollapsed ? 'justify-center p-1.5' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-extrabold flex-shrink-0">
                {initials}
              </div>
              {!isCollapsed && (
                <div className="truncate animate-fade-in">
                  <p className="text-xs font-bold text-white truncate" title={fullName}>{shortName}</p>
                  <span className="text-[9px] font-semibold text-cyan-400 uppercase tracking-widest">
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
