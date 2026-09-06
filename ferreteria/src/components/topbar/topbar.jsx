import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function Topbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Obtener usuario autenticado de la sesión
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Escuchar cambios o clicks fuera del dropdown para cerrarlo
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Función para obtener la fecha actual del sistema formateada como DD/MM/YYYY
  const getFechaActual = () => {
    const hoy = new Date();
    const dd = String(hoy.getDate()).padStart(2, '0');
    const mm = String(hoy.getMonth() + 1).padStart(2, '0'); // Enero es 0
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

  const nombreCompleto = user?.Nombre || 'OSCAR EDGAR CLAROS DAVALOS';
  const userRole = user?.Rol || 'Administrador';
  const userEmail = user?.Correo || 'sclaros724@gmail.com';
  const initials = getInitials(nombreCompleto);

  // Cerrar Sesión
  const handleLogout = () => {
    localStorage.removeItem('cyc_user_session');
    localStorage.removeItem('cyc_client_session');
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-900 px-6 sm:px-8 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
      {/* Lado Izquierdo: Info de Sucursal y Estado */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Sucursal Central (C&C)
          </span>
        </div>
      </div>

      {/* Lado Derecho: Fecha, Notificaciones y Perfil */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Fecha Dinámica */}
        <div className="hidden sm:block px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 tracking-wider">
          📅 {getFechaActual()}
        </div>

        {/* Notificaciones */}
        <button
          title="22 Notificaciones operativas"
          className="relative w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center hover:border-cyan-500/50 hover:text-cyan-400 transition-all group"
        >
          <svg className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-slate-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded-full ring-2 ring-slate-950">
            22
          </span>
        </button>

        {/* Perfil del Operador con Dropdown Interactivo */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-900/80 border border-transparent hover:border-slate-800 transition-all cursor-pointer group outline-none"
          >
            <span className="text-xs font-bold text-slate-300 group-hover:text-cyan-400 transition-colors hidden lg:inline max-w-[200px] truncate">
              {nombreCompleto}
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center font-black text-slate-950 text-xs shadow-md shadow-cyan-400/20 group-hover:scale-105 transition-transform">
              {initials}
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-cyan-400' : ''}`}
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
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-800/80">
              {/* Encabezado del Perfil */}
              <div className="p-4 bg-slate-950/60">
                <p className="text-xs font-bold text-white truncate">{nombreCompleto}</p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{userEmail}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-extrabold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  {userRole}
                </div>
              </div>

              {/* Opciones de Navegación Rápida */}
              <div className="p-2 space-y-1">
                <Link
                  to="/"
                  onClick={() => setIsDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Ver Tienda / Catálogo</span>
                </Link>
              </div>

              {/* Botón Cerrar Sesión */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Cerrar Sesión</span>
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
