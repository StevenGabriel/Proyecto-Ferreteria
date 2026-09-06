import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { verifyResetToken, confirmPasswordReset } from "../../services/api";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmContrasena, setConfirmContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // 1. Validar el Token al cargar la página
  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setVerifying(false);
        setIsValidToken(false);
        setErrorMessage("No se proporcionó ningún token de restablecimiento.");
        return;
      }

      try {
        setVerifying(true);
        const res = await verifyResetToken(token);
        if (res.valid) {
          setIsValidToken(true);
          setUserEmail(res.email);
          setRemainingSeconds(res.remainingSeconds || 600);
        }
      } catch (err) {
        console.error("Error validando token:", err);
        setIsValidToken(false);
        const msg = err.response?.data?.message || "El enlace de restablecimiento es inválido o ha expirado.";
        setErrorMessage(msg);
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  // 2. Temporizador regresivo de los 10 minutos
  useEffect(() => {
    if (!isValidToken || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsValidToken(false);
          setErrorMessage("El tiempo de 10 minutos para cambiar la contraseña ha finalizado. Solicita un nuevo enlace.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isValidToken, remainingSeconds]);

  // Formatear segundos a MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // 3. Guardar la nueva contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!nuevaContrasena || !confirmContrasena) {
      setErrorMessage("Por favor completa los dos campos de contraseña.");
      return;
    }

    if (nuevaContrasena !== confirmContrasena) {
      setErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    if (nuevaContrasena.length < 6) {
      setErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      await confirmPasswordReset({ token, nuevaContrasena });
      setIsSuccess(true);
    } catch (err) {
      console.error("Error confirmando nueva contraseña:", err);
      const msg = err.response?.data?.message || "No se pudo actualizar la contraseña. El enlace puede haber caducado.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Resplandor ambiental de fondo */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
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
            Nueva Contraseña
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Establece tu nueva clave de acceso para <br />
            <span className="text-cyan-400 font-mono font-bold text-xs">{userEmail || "tu cuenta"}</span>
          </p>
        </div>

        {/* Estado 1: Verificando Token */}
        {verifying ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-semibold">Validando enlace de seguridad...</p>
          </div>
        ) : isSuccess ? (
          /* Estado 2: Cambio Exitoso */
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-3xl flex items-center justify-center text-emerald-400 text-3xl mx-auto shadow-xl shadow-emerald-500/10">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">¡Contraseña Actualizada!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tu clave ha sido cambiada correctamente. Ya puedes ingresar al sistema con tus nuevas credenciales.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-500/25 text-xs transition-all"
            >
              Iniciar Sesión →
            </Link>
          </div>
        ) : !isValidToken ? (
          /* Estado 3: Enlace Expirado o Inválido */
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-3xl flex items-center justify-center text-rose-400 text-3xl mx-auto shadow-xl shadow-rose-500/10">
              ⚠️
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-bold text-white">Enlace Expirado o Inválido</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {errorMessage || "Este enlace de recuperación ha caducado (validez de 10 minutos) o ya fue utilizado."}
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-500/25 text-xs transition-all"
            >
              Solicitar un Nuevo Enlace →
            </Link>
          </div>
        ) : (
          /* Estado 4: Formulario de Nueva Contraseña con Cronómetro */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Banner del Temporizador de 10 minutos */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-xs text-amber-400 font-bold">
              <span className="flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Tiempo restante:</span>
              </span>
              <span className="font-mono text-sm bg-slate-950/60 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                {formatTime(remainingSeconds)}
              </span>
            </div>

            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 font-semibold flex items-center gap-2.5 animate-fade-in">
                <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Nueva Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Nueva Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-10 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmContrasena}
                  onChange={(e) => setConfirmContrasena(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            {/* Medidor de Fuerza de Contraseña */}
            {nuevaContrasena && (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2 animate-fade-in text-[11px]">
                {(() => {
                  let score = 0;
                  const hasLen = nuevaContrasena.length >= 8;
                  const hasMix = /[a-z]/.test(nuevaContrasena) && /[A-Z]/.test(nuevaContrasena);
                  const hasNum = /\d/.test(nuevaContrasena);
                  const hasSpec = /[^A-Za-z0-9]/.test(nuevaContrasena);
                  if (hasLen) score++;
                  if (hasMix) score++;
                  if (hasNum) score++;
                  if (hasSpec) score++;

                  const labels = ["Débil", "Débil", "Media / Aceptable", "Fuerte", "Excelente / Segura"];
                  const colors = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-cyan-400"];

                  return (
                    <>
                      <div className="flex justify-between font-bold">
                        <span className="text-slate-400">Seguridad:</span>
                        <span className={score >= 3 ? "text-emerald-400" : score === 2 ? "text-amber-400" : "text-rose-400"}>
                          {labels[score]}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${score >= 1 ? colors[score] : 'bg-slate-800'}`}></div>
                        <div className={`h-full ${score >= 2 ? colors[score] : 'bg-slate-800'}`}></div>
                        <div className={`h-full ${score >= 3 ? colors[score] : 'bg-slate-800'}`}></div>
                        <div className={`h-full ${score >= 4 ? colors[score] : 'bg-slate-800'}`}></div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Botón Guardar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.99] text-xs flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando nueva contraseña...</span>
                </>
              ) : (
                <span>Confirmar y Cambiar Contraseña</span>
              )}
            </button>
          </form>
        )}

        {/* Enlace Volver */}
        <div className="pt-2 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <Link to="/login" className="text-slate-500 hover:text-slate-300 transition-colors">
            ← Volver al Inicio de Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
