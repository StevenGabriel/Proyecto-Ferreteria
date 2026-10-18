import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full text-center space-y-6 bg-[#12151c] border border-zinc-800/80 rounded-2xl p-8 sm:p-10 shadow-2xl animate-modal-in">
        {/* Número 404 Técnico */}
        <div className="select-none space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono tabular-nums font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            HTTP 404
          </div>
          <h1 className="text-7xl sm:text-8xl font-black tracking-tight text-zinc-100 font-mono tabular-nums">
            404
          </h1>
          <p className="text-base sm:text-lg font-bold text-zinc-200" style={{ textWrap: 'balance' }}>
            La ruta solicitada no existe o fue movida
          </p>
        </div>

        {/* Explicación amigable */}
        <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
          El enlace al que intentas acceder no se encuentra disponible en el sistema de C&C Ferretería — Casa y Construcción.
        </p>

        {/* Botones de Navegación Segura */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl border border-zinc-700 hover:border-zinc-600 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors duration-150 btn-press cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver atrás</span>
          </button>

          <Link
            to="/catalogo"
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-colors duration-150 btn-press"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span>Ir a la Tienda / Catálogo</span>
          </Link>
        </div>

        {/* Acceso Rápido Administrativo */}
        <div className="pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 flex items-center justify-center gap-2">
          <span>¿Eres operador o administrador?</span>
          <Link to="/login" className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFound;

