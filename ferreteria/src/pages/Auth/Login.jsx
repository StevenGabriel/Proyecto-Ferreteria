import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/api";

function Login() {
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!correo.trim() || !contrasena) {
      setErrorMessage("Por favor ingresa tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      const res = await loginUser({ correo, contrasena });

      // Guardar sesión en LocalStorage
      if (res && res.user) {
        localStorage.setItem("cyc_user_session", JSON.stringify(res.user));

        // Enrutamiento inteligente según el rol del usuario
        const role = (res.user.Rol || "").toLowerCase();
        if (role === "cliente") {
          // Clientes van al catálogo de compras
          navigate("/");
        } else {
          // Administradores, Vendedores, Cajeros y Operadores van a la página de inicio
          navigate("/home");
        }
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      const msg = err.response?.data?.message || "Correo o contraseña incorrectos.";
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

      {/* Tarjeta Central de Login Universal */}
      <div className="w-full max-w-md bg-[#12151c] border border-zinc-800/90 rounded-2xl p-7 sm:p-9 shadow-2xl shadow-black/60 relative z-10 space-y-6 animate-modal-in">
        
        {/* Encabezado Institucional */}
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
              ACCESO SEGURO
            </span>
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight [text-wrap:balance]">
              Iniciar sesión
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Ingresa tus credenciales para acceder al catálogo o panel operativo.
            </p>
          </div>
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

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Correo Electrónico */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Correo electrónico
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
                placeholder="nombre@empresa.com"
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-300">
                Contraseña
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors duration-160 ease-out-expo"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                placeholder="••••••••••••"
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

          {/* Botón Ingresar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-bold rounded-xl transition-colors duration-160 ease-out-expo btn-press text-xs flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Ingresar al sistema</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Enlaces de Registro y Volver */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
          <div>
            ¿Cliente nuevo?{" "}
            <Link
              to="/registerClie"
              className="text-amber-400 hover:text-amber-300 font-semibold ml-1 transition-colors duration-160 ease-out-expo"
            >
              Crear cuenta →
            </Link>
          </div>
          <Link
            to="/"
            className="text-zinc-500 hover:text-zinc-300 font-medium transition-colors duration-160 ease-out-expo"
          >
            ← Catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
