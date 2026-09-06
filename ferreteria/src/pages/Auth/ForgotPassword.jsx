import React, { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../services/api";

function ForgotPassword() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessInfo(null);

    if (!correo.trim()) {
      setErrorMessage("Por favor ingresa tu correo electrónico.");
      return;
    }

    try {
      setLoading(true);
      const res = await requestPasswordReset(correo);
      setSuccessInfo(res);
    } catch (err) {
      console.error("Error al solicitar recuperación:", err);
      const msg = err.response?.data?.message || "No se pudo procesar la solicitud. Verifica el correo ingresado.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Resplandor ambiental */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>

      {/* Tarjeta Central */}
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 space-y-6">
        
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-2xl shadow-lg shadow-cyan-500/25 hover:scale-105 transition-transform mb-2"
          >
            C
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Recuperar Contraseña
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Te enviaremos un enlace seguro a tu correo para que puedas cambiar tu contraseña
          </p>
        </div>

        {/* Estado 1: Correo Enviado con Éxito */}
        {successInfo ? (
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-3xl flex items-center justify-center text-cyan-400 text-3xl mx-auto shadow-xl shadow-cyan-500/10">
              ✉️
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">¡Correo de Recuperación Enviado!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hemos generado un enlace de recuperación para <br />
                <strong className="text-cyan-400 font-mono">{correo}</strong>
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-bold mt-1">
                <span>⏳ El enlace tiene una validez de 10 minutos.</span>
              </div>
            </div>

            {/* Enlace directo para pruebas rápidas en entorno local */}
            {successInfo.simulationUrl && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-[11px] text-slate-400 font-semibold">Acceso directo para pruebas:</p>
                <a
                  href={successInfo.simulationUrl}
                  className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl shadow-lg shadow-cyan-500/25 text-xs transition-all"
                >
                  Abrir enlace de restablecimiento (10 min) →
                </a>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setSuccessInfo(null)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                ¿No recibiste el correo? Intentar con otro
              </button>
            </div>
          </div>
        ) : (
          /* Estado 2: Formulario de Solicitud */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 font-semibold flex items-center gap-2.5 animate-fade-in">
                <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Correo Electrónico Registrado
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@ferreteria.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Botón Enviar Enlace */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.99] text-xs flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Generando enlace seguro...</span>
                </>
              ) : (
                <span>Enviar Enlace de Recuperación (10 min)</span>
              )}
            </button>
          </form>
        )}

        {/* Enlace Volver al Login */}
        <div className="pt-2 border-t border-slate-800/80 text-center text-xs text-slate-400">
          ¿Recordaste tu contraseña?{" "}
          <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
            Volver a Iniciar Sesión →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
