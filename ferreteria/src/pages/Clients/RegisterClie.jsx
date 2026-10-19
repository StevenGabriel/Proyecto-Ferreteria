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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredClientInfo, setRegisteredClientInfo] = useState(null);

  // Cálculo de Seguridad de la Contraseña
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return { score: 0, label: "Sin ingresar", color: "bg-zinc-800", percent: 0, textClass: "text-zinc-500" };

    const hasMinLength = pass.length >= 8;
    const hasMixedCase = /[a-z]/.test(pass) && /[A-Z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);

    if (hasMinLength) score++;
    if (hasMixedCase) score++;
    if (hasNumbers) score++;
    if (hasSpecial) score++;

    if (pass.length < 6) {
      return { score: 1, label: "Muy débil (mín. 6 car.)", color: "bg-rose-600", percent: 20, textClass: "text-rose-400" };
    }
    if (score === 1) return { score: 1, label: "Débil", color: "bg-rose-500", percent: 35, textClass: "text-rose-400" };
    if (score === 2) return { score: 2, label: "Aceptable", color: "bg-amber-500", percent: 60, textClass: "text-amber-400" };
    if (score === 3) return { score: 3, label: "Fuerte", color: "bg-emerald-500", percent: 85, textClass: "text-emerald-400" };
    return { score: 4, label: "Excelente / Segura", color: "bg-emerald-400", percent: 100, textClass: "text-emerald-400" };
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo.trim())) {
      setErrorMessage("Por favor ingresa un correo electrónico válido (ej. usuario@dominio.com).");
      return;
    }

    if (telefono.trim() && !/^[0-9+ -]{7,15}$/.test(telefono.trim())) {
      setErrorMessage("El número de teléfono o celular debe tener al menos 7 dígitos válidos.");
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

      setRegisteredClientInfo({
        nombreCompleto: `${nombre.trim()} ${primerApellido.trim()} ${segundoApellido.trim()}`.trim(),
        correo: correo.trim().toLowerCase(),
        ciNit: ciNit.trim() || "No especificado"
      });
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error al registrar cliente:", err);
      const msg = err.response?.data?.message || "Error al procesar el registro.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0c0e12] text-zinc-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Retícula técnica industrial sutil */}
      <div
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#3f3f46 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      ></div>
      <div className="absolute top-0 inset-x-0 h-px bg-zinc-800"></div>

      {/* Tarjeta Central de Registro */}
      <div className="w-full max-w-xl bg-[#12151c] border border-zinc-800/90 rounded-2xl p-6 sm:p-9 shadow-2xl shadow-black/60 relative z-10 space-y-6 my-6 animate-modal-in">
        
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
              REGISTRO DE CLIENTE
            </span>
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight [text-wrap:balance]">
              Crear cuenta de cliente
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Regístrate para realizar pedidos en línea, emitir facturas con tu NIT y consultar tu historial.
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
        <form onSubmit={handleRegister} className="space-y-4">
          
          {/* Nombres y Apellidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Juan Carlos"
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Primer apellido *</label>
              <input
                type="text"
                required
                value={primerApellido}
                onChange={(e) => setPrimerApellido(e.target.value)}
                placeholder="Ej. Pérez"
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Segundo apellido</label>
              <input
                type="text"
                value={segundoApellido}
                onChange={(e) => setSegundoApellido(e.target.value)}
                placeholder="Ej. Mamani"
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">CI / NIT</label>
              <input
                type="text"
                value={ciNit}
                onChange={(e) => setCiNit(e.target.value)}
                placeholder="Ej. 8472910"
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono tabular-nums text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Teléfono / Celular</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 70712345"
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs font-mono tabular-nums text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
              />
            </div>
          </div>

          {/* Correo Electrónico */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Correo electrónico *</label>
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
                placeholder="cliente@ejemplo.com"
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
              />
            </div>
          </div>

          {/* Contraseña y Confirmación con Barra de Seguridad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Contraseña *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors duration-160 ease-out-expo"
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

            {/* Confirmar Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Confirmar contraseña *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmContrasena}
                  onChange={(e) => setConfirmContrasena(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/80 transition-colors duration-160 ease-out-expo"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors duration-160 ease-out-expo"
                  aria-label={showConfirmPassword ? "Ocultar confirmación" : "Mostrar confirmación"}
                >
                  {showConfirmPassword ? (
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
          </div>

          {/* BARRA INTERACTIVA DE FUERZA DE CONTRASEÑA */}
          {contrasena && (
            <div className="p-3.5 bg-[#0c0e12] border border-zinc-800/90 rounded-xl space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-semibold">Nivel de seguridad:</span>
                <span className={`font-bold ${strength.textClass}`}>
                  {strength.label}
                </span>
              </div>

              {/* Barra de progreso visual dividida en 4 segmentos */}
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                <div className={`h-full transition-colors duration-180 ease-out-expo ${strength.score >= 1 ? strength.color : 'bg-zinc-800'}`}></div>
                <div className={`h-full transition-colors duration-180 ease-out-expo ${strength.score >= 2 ? strength.color : 'bg-zinc-800'}`}></div>
                <div className={`h-full transition-colors duration-180 ease-out-expo ${strength.score >= 3 ? strength.color : 'bg-zinc-800'}`}></div>
                <div className={`h-full transition-colors duration-180 ease-out-expo ${strength.score >= 4 ? strength.color : 'bg-zinc-800'}`}></div>
              </div>

              {/* Checklist de Requisitos de Seguridad */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                <div className={`flex items-center gap-1.5 transition-colors duration-160 ${reqs.length ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                  <span>{reqs.length ? '✓' : '·'}</span>
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors duration-160 ${reqs.mixed ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                  <span>{reqs.mixed ? '✓' : '·'}</span>
                  <span>Mayúsculas y minúsculas</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors duration-160 ${reqs.number ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                  <span>{reqs.number ? '✓' : '·'}</span>
                  <span>Al menos un número (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 transition-colors duration-160 ${reqs.special ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                  <span>{reqs.special ? '✓' : '·'}</span>
                  <span>Símbolo (@, #, $, %, etc.)</span>
                </div>
              </div>

              {/* Estado de coincidencia de contraseñas */}
              {confirmContrasena && (
                <div className="pt-2 border-t border-zinc-800/80 text-[11px] flex items-center gap-1.5">
                  {passwordsMatch ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span>✓</span> Las contraseñas coinciden
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
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
            className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-bold rounded-xl transition-colors duration-160 ease-out-expo btn-press text-xs flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Creando cuenta de cliente...</span>
              </>
            ) : (
              <>
                <span>Completar registro</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Enlace a Login */}
        <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
          <div>
            ¿Ya tienes una cuenta?{" "}
            <Link
              to="/login"
              className="text-amber-400 hover:text-amber-300 font-semibold ml-1 transition-colors duration-160 ease-out-expo"
            >
              Inicia sesión →
            </Link>
          </div>
          <Link
            to="/"
            className="text-zinc-500 hover:text-zinc-300 font-medium transition-colors duration-160 ease-out-expo"
          >
            ← Volver a la tienda
          </Link>
        </div>
      </div>

      {/* MODAL DE ÉXITO EN EL REGISTRO */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 animate-fade-in">
          <div className="w-full max-w-md bg-[#12151c] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/70 text-center space-y-5 relative animate-modal-in">
            
            {/* Icono de Éxito */}
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Títulos */}
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-md inline-block">
                CUENTA CREADA
              </span>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight [text-wrap:balance]">
                Bienvenido a Ferretería C&C
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tu perfil de cliente ya está activo y listo para realizar pedidos y cotizaciones.
              </p>
            </div>

            {/* Ficha Resumen de la Cuenta */}
            {registeredClientInfo && (
              <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 text-left space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Cliente:</span>
                  <span className="font-semibold text-zinc-100 truncate max-w-[210px]">
                    {registeredClientInfo.nombreCompleto}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Correo:</span>
                  <span className="font-mono text-amber-400 truncate max-w-[210px]">
                    {registeredClientInfo.correo}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">CI / NIT:</span>
                  <span className="font-mono tabular-nums text-zinc-300">
                    {registeredClientInfo.ciNit}
                  </span>
                </div>
              </div>
            )}

            {/* Botón de Acción Principal */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-colors duration-160 ease-out-expo btn-press text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continuar al inicio de sesión</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RegisterClie;
