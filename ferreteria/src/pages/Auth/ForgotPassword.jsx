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
    <div className="min-h-screen w-full bg-[#0c0e12] text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Retícula técnica industrial sutil */}
      <div
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#3f3f46 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      ></div>
      <div className="absolute top-0 inset-x-0 h-px bg-zinc-800"></div>

      {/* Tarjeta Central */}
      <div className="w-full max-w-md bg-[#12151c] border border-zinc-800/90 rounded-2xl p-7 sm:p-9 shadow-2xl shadow-black/60 relative z-10 space-y-6 animate-modal-in">
        
        {/* Encabezado */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-black text-lg tracking-tighter shadow-sm transition-transform duration-160 ease-out-expo group-hover:scale-[1.03]">
                C&C
              </div>
              <div className="text-left">
                <span className="block text-xs font-extrabold text-zinc-100 tracking-tight leading-none">
                  FERRETERÍA C&C
                </span>
                <span className="block font-mono text-[10px] text-zinc-400 mt-0.5">
                  CASA Y CONSTRUCCIÓN
                </span>
              </div>
            </Link>
            <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
              SEGURIDAD
            </span>
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight [text-wrap:balance]">
              Recuperar contraseña
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Enviaremos un enlace temporal a tu correo registrado para restablecer tu clave.
            </p>
          </div>
        </div>

        {/* Estado 1: Correo Enviado con Éxito */}
        {successInfo ? (
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/30 rounded-xl flex items-center justify-center text-amber-400 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-zinc-100">Enlace de recuperación generado</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Enviamos las instrucciones de acceso a <br />
                <strong className="text-amber-400 font-mono">{correo}</strong>
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-400 text-[11px] font-mono tabular-nums mt-1">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Validez del enlace: 10 minutos</span>
              </div>
            </div>

            {/* Enlace directo para pruebas rápidas en entorno local */}
            {successInfo.simulationUrl && (
              <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                <p className="text-[11px] text-zinc-400 font-medium">Acceso directo de entorno local:</p>
                <a
                  href={successInfo.simulationUrl}
                  className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors duration-160 ease-out-expo btn-press"
                >
                  Abrir enlace de restablecimiento (10 min) →
                </a>
              </div>
            )}

            <div className="pt-1">
              <button
                onClick={() => setSuccessInfo(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors duration-160 ease-out-expo"
              >
                ¿No recibiste el correo? Intentar con otra dirección
              </button>
            </div>
          </div>
        ) : (
          /* Estado 2: Formulario de Solicitud */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2.5 animate-fade-in">
                <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Correo electrónico registrado
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder="ejemplo@ferreteria.com"
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
                />
              </div>
            </div>

            {/* Botón Enviar Enlace */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-bold rounded-xl transition-colors duration-160 ease-out-expo btn-press text-xs flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Generando enlace seguro...</span>
                </>
              ) : (
                <span>Enviar enlace de recuperación</span>
              )}
            </button>
          </form>
        )}

        {/* Enlace Volver al Login */}
        <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
          ¿Recordaste tu contraseña?{" "}
          <Link
            to="/login"
            className="text-amber-400 hover:text-amber-300 font-semibold ml-1 transition-colors duration-160 ease-out-expo"
          >
            Volver a iniciar sesión →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
