import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/api";

function RegisterClie() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [primerApellido, setPrimerApellido] = useState("");
  const [segundoApellido, setSegundoApellido] = useState("");
  const [ciNit, setCiNit] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmContrasena, setConfirmContrasena] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Cálculo de Seguridad de la Contraseña
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: "Sin ingresar", color: "bg-slate-700", percent: 0, textClass: "text-slate-500" };

    const hasMinLength = pass.length >= 8;
    const hasMixedCase = /[a-z]/.test(pass) && /[A-Z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);

    if (hasMinLength) score++;
    if (hasMixedCase) score++;
    if (hasNumbers) score++;
    if (hasSpecial) score++;

    if (pass.length < 6) {
      return { score: 1, label: "Muy Débil (Mín. 6 car.)", color: "bg-rose-600", percent: 20, textClass: "text-rose-500" };
    }
    if (score === 1) return { score: 1, label: "Débil", color: "bg-rose-500", percent: 35, textClass: "text-rose-400" };
    if (score === 2) return { score: 2, label: "Media / Aceptable", color: "bg-amber-500", percent: 60, textClass: "text-amber-400" };
    if (score === 3) return { score: 3, label: "Fuerte", color: "bg-emerald-500", percent: 85, textClass: "text-emerald-400" };
    return { score: 4, label: "Excelente / Muy Segura", color: "bg-gradient-to-r from-emerald-400 to-cyan-400", percent: 100, textClass: "text-cyan-400" };
  };

  const strength = getPasswordStrength(contrasena);

  // Validación de requisitos individuales
  const reqs = {
    length: contrasena.length >= 8,
    mixed: /[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena),
    number: /\d/.test(contrasena),
    special: /[^A-Za-z0-9]/.test(contrasena)
  };

  const passwordsMatch = contrasena && confirmContrasena && contrasena === confirmContrasena;

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!nombre.trim() || !primerApellido.trim() || !correo.trim() || !contrasena) {
      setErrorMessage("Por favor completa todos los campos requeridos (*).");
      return;
    }

    if (contrasena.length < 6) {
      setErrorMessage("La contraseña debe tener un mínimo de 6 caracteres.");
      return;
    }

    if (contrasena !== confirmContrasena) {
      setErrorMessage("Las contraseñas ingresadas no coinciden.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        nombre: nombre.trim(),
        primerApellido: primerApellido.trim(),
        segundoApellido: segundoApellido.trim() || null,
        ciNit: ciNit.trim() || null,
        telefono: telefono.trim() || null,
        correo: correo.trim().toLowerCase(),
        contrasena
      };

      const res = await registerUser(payload);
      if (res && res.user) {
        localStorage.setItem("cyc_user_session", JSON.stringify(res.user));
      }

      alert("¡Cuenta de cliente creada exitosamente! Bienvenido a C&C Ferretería.");
      navigate("/login");
    } catch (err) {
      console.error("Error al registrar cliente:", err);
      const msg = err.response?.data?.message || "Error al procesar el registro.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Efectos de resplandor ambiental */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>

      {/* Tarjeta Central de Registro */}
      <div className="w-full max-w-xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-6 my-8">
        
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <Link
            to="/"
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-2xl shadow-lg shadow-cyan-500/25 hover:scale-105 transition-transform mb-2"
          >
            C
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Crear Cuenta de Cliente
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Regístrate para realizar pedidos, cotizaciones y seguimiento de compras <br />
            <span className="text-cyan-400 font-bold uppercase tracking-wider text-[10px]">C&C CASA Y CONSTRUCCIÓN</span>
          </p>
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

        {/* Formulario */}
        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Carlos"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Primer Apellido *</label>
              <input
                type="text"
                required
                value={primerApellido}
                onChange={(e) => setPrimerApellido(e.target.value)}
                placeholder="Ej. Perez"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Segundo Apellido</label>
              <input
                type="text"
                value={segundoApellido}
                onChange={(e) => setSegundoApellido(e.target.value)}
                placeholder="Ej. Mamani"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">CI / NIT</label>
              <input
                type="text"
                value={ciNit}
                onChange={(e) => setCiNit(e.target.value)}
                placeholder="Ej. 8472910"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Teléfono / Celular</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 70712345"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Correo Electrónico */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Correo Electrónico *</label>
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
                placeholder="cliente@ejemplo.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Contraseña y Confirmación con Barra de Seguridad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contraseña */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
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

            {/* Confirmar Contraseña */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Confirmar Contraseña *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmContrasena}
                  onChange={(e) => setConfirmContrasena(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? (
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
          </div>

          {/* BARRA INTERACTIVA DE FUERZA DE CONTRASEÑA */}
          {contrasena && (
            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">Nivel de Seguridad:</span>
                <span className={`font-extrabold ${strength.textClass}`}>
                  {strength.label}
                </span>
              </div>

              {/* Barra de progreso visual dividida en 4 segmentos */}
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-slate-800'}`}></div>
                <div className={`h-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-slate-800'}`}></div>
                <div className={`h-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-slate-800'}`}></div>
                <div className={`h-full transition-all duration-300 ${strength.score >= 4 ? strength.color : 'bg-slate-800'}`}></div>
              </div>

              {/* Checklist de Requisitos de Seguridad */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                <div className={`flex items-center gap-1.5 ${reqs.length ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <span>{reqs.length ? '✓' : '○'}</span>
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 ${reqs.mixed ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <span>{reqs.mixed ? '✓' : '○'}</span>
                  <span>Mayúsculas y minúsculas</span>
                </div>
                <div className={`flex items-center gap-1.5 ${reqs.number ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <span>{reqs.number ? '✓' : '○'}</span>
                  <span>Al menos un número (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${reqs.special ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <span>{reqs.special ? '✓' : '○'}</span>
                  <span>Símbolo (@, #, $, %, etc.)</span>
                </div>
              </div>

              {/* Estado de coincidencia de contraseñas */}
              {confirmContrasena && (
                <div className="pt-1.5 border-t border-slate-800/80 text-[11px] flex items-center gap-1.5">
                  {passwordsMatch ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <span>✓</span> Las contraseñas coinciden
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <span>✕</span> Las contraseñas no coinciden
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botón Registrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg shadow-cyan-500/25 transition-all active:scale-[0.99] text-xs flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creando cuenta segura...</span>
              </>
            ) : (
              <span>Completar Registro</span>
            )}
          </button>
        </form>

        {/* Enlace a Login */}
        <div className="pt-2 border-t border-slate-800/80 text-center text-xs text-slate-400 space-y-2">
          <div>
            ¿Ya tienes una cuenta?{" "}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
              Inicia sesión aquí →
            </Link>
          </div>
          <div>
            <Link to="/" className="text-slate-500 hover:text-slate-300 transition-colors">
              ← Volver a la Tienda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterClie;
