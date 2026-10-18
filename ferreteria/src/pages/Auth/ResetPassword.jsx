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

  const [tokenType, setTokenType] = useState("RESET_PASSWORD");
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
        setErrorMessage("No se proporcionó ningún token de restablecimiento o activación.");
        return;
      }

      try {
        setVerifying(true);
        const res = await verifyResetToken(token);
        if (res.valid) {
          setIsValidToken(true);
          setUserEmail(res.email);
          setRemainingSeconds(res.remainingSeconds || 600);
          if (res.type) setTokenType(res.type);
        }
      } catch (err) {
        console.error("Error validando token:", err);
        setIsValidToken(false);
        const msg = err.response?.data?.message || "El enlace de seguridad es inválido o ha expirado.";
        setErrorMessage(msg);
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  // 2. Temporizador regresivo
  useEffect(() => {
    if (!isValidToken || remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsValidToken(false);
          setErrorMessage("El tiempo de validez del enlace ha finalizado. Solicita un nuevo enlace.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isValidToken, remainingSeconds]);

  // Formatear segundos a HH:MM:SS o MM:SS
  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}h ${String(mins).padStart(2, '0')}m`;
    }
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

  const isInvitation = tokenType === "INVITATION";

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
              {isInvitation ? "ACTIVACIÓN" : "CLAVE NUEVA"}
            </span>
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight [text-wrap:balance]">
              {isInvitation ? "Activar cuenta de operador" : "Establecer nueva contraseña"}
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              {isInvitation
                ? "Configura tu clave personal para activar el perfil asociado a "
                : "Define una nueva clave de acceso para "}
              <span className="text-amber-400 font-mono font-semibold">{userEmail || "tu cuenta"}</span>
            </p>
          </div>
        </div>

        {/* Estado 1: Verificando Token */}
        {verifying ? (
          <div className="py-10 text-center space-y-3">
            <div className="inline-block w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-zinc-400 font-medium">Validando token de seguridad...</p>
          </div>
        ) : isSuccess ? (
          /* Estado 2: Cambio Exitoso */
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-400 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-zinc-100">
                {isInvitation ? "Cuenta activada correctamente" : "Contraseña actualizada"}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {isInvitation
                  ? "Tu cuenta de operador ha sido activada y tu clave ha quedado registrada."
                  : "Tu clave de acceso ha sido actualizada. Ya puedes ingresar con tus nuevas credenciales."}
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors duration-160 ease-out-expo btn-press"
            >
              Ir a iniciar sesión →
            </Link>
          </div>
        ) : !isValidToken ? (
          /* Estado 3: Enlace Expirado o Inválido */
          <div className="space-y-5 text-center animate-fade-in py-2">
            <div className="w-12 h-12 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center justify-center text-rose-400 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-zinc-100">Enlace expirado o inválido</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {errorMessage || "Este enlace de seguridad ha caducado o ya fue utilizado."}
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-colors duration-160 ease-out-expo btn-press"
            >
              Solicitar nuevo enlace →
            </Link>
          </div>
        ) : (
          /* Estado 4: Formulario de Nueva Contraseña con Cronómetro */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Banner del Temporizador con números tabulares */}
            <div className="p-3 bg-[#0c0e12] border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-zinc-300 font-medium">
                <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Vigencia del token:</span>
              </span>
              <span className="font-mono tabular-nums text-xs font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/25 text-amber-400">
                {formatTime(remainingSeconds)}
              </span>
            </div>

            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-300 font-medium flex items-center gap-2.5 animate-fade-in">
                <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Nueva Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Nueva contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={nuevaContrasena}
                  onChange={(e) => setNuevaContrasena(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors duration-160 ease-out-expo"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 block">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmContrasena}
                  onChange={(e) => setConfirmContrasena(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
                />
              </div>
            </div>

            {/* Medidor de Fuerza de Contraseña */}
            {nuevaContrasena && (
              <div className="p-3 bg-[#0c0e12] border border-zinc-800/90 rounded-xl space-y-2 animate-fade-in text-[11px]">
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

                  const labels = ["Débil", "Débil", "Aceptable", "Fuerte", "Excelente / Segura"];
                  const colors = ["bg-rose-500", "bg-rose-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-400"];

                  return (
                    <>
                      <div className="flex justify-between font-semibold">
                        <span className="text-zinc-400">Seguridad:</span>
                        <span className={score >= 3 ? "text-emerald-400" : score === 2 ? "text-amber-400" : "text-rose-400"}>
                          {labels[score]}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div className={`h-full transition-colors duration-180 ease-out-expo ${score >= 1 ? colors[score] : 'bg-zinc-800'}`}></div>
                        <div className={`h-full transition-colors duration-180 ease-out-expo ${score >= 2 ? colors[score] : 'bg-zinc-800'}`}></div>
                        <div className={`h-full transition-colors duration-180 ease-out-expo ${score >= 3 ? colors[score] : 'bg-zinc-800'}`}></div>
                        <div className={`h-full transition-colors duration-180 ease-out-expo ${score >= 4 ? colors[score] : 'bg-zinc-800'}`}></div>
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
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-bold rounded-xl transition-colors duration-160 ease-out-expo btn-press text-xs flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>Guardando nueva contraseña...</span>
                </>
              ) : (
                <span>Confirmar y guardar contraseña</span>
              )}
            </button>
          </form>
        )}

        {/* Enlace Volver */}
        <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-400">
          <Link
            to="/login"
            className="text-zinc-500 hover:text-zinc-300 font-medium transition-colors duration-160 ease-out-expo"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
