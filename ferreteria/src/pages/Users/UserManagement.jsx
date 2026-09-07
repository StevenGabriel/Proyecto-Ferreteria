import React, { useState, useEffect } from "react";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword
} from "../../services/api";

function UserManagement() {
  const { isCollapsed } = useSidebar();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Estado del formulario de creación
  const [formData, setFormData] = useState({
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
    ciNit: "",
    telefono: "",
    direccion: "",
    rol: "Vendedor",
    correo: ""
  });

  // Estado del formulario de edición
  const [editFormData, setEditFormData] = useState({
    nombre: "",
    primerApellido: "",
    segundoApellido: "",
    ciNit: "",
    telefono: "",
    direccion: "",
    rol: "Vendedor",
    correo: ""
  });

  // Estado de cambio de contraseña
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Toast flotante
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  // Cargar Empleados
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployees();
      setEmployees(data || []);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      setError("No se pudieron cargar los empleados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Manejar Registro de Nuevo Empleado con Invitación Automática
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!formData.nombre || !formData.primerApellido || !formData.correo || !formData.rol) {
      setModalError("Por favor completa los campos obligatorios (*).");
      return;
    }

    try {
      setModalLoading(true);
      const res = await createEmployee(formData);
      showToast(res.message || "Operador registrado. Se envió el correo de activación con sus credenciales.");
      setIsCreateModalOpen(false);
      setFormData({
        nombre: "",
        primerApellido: "",
        segundoApellido: "",
        ciNit: "",
        telefono: "",
        direccion: "",
        rol: "Vendedor",
        correo: ""
      });
      fetchEmployees();
    } catch (err) {
      console.error("Error al registrar operador:", err);
      setModalError(err.response?.data?.message || "Error al crear empleado.");
    } finally {
      setModalLoading(false);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (emp) => {
    setSelectedEmployee(emp);
    setEditFormData({
      nombre: emp.Persona?.Nombre || "",
      primerApellido: emp.Persona?.PrimerApellido || "",
      segundoApellido: emp.Persona?.SegundoApellido || "",
      ciNit: emp.Persona?.CI_NIT || "",
      telefono: emp.Persona?.Telefono || "",
      direccion: emp.Direccion || "",
      rol: emp.CuentaUsuario?.Rol || "Vendedor",
      correo: emp.CuentaUsuario?.Correo || ""
    });
    setModalError("");
    setIsEditModalOpen(true);
  };

  // Guardar Edición
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      setModalLoading(true);
      setModalError("");
      await updateEmployee(selectedEmployee.EmpleadoID, editFormData);
      showToast("Datos de empleado actualizados.");
      setIsEditModalOpen(false);
      fetchEmployees();
    } catch (err) {
      console.error("Error al editar:", err);
      setModalError(err.response?.data?.message || "Error al actualizar empleado.");
    } finally {
      setModalLoading(false);
    }
  };

  // Alternar Estado Activo / Inactivo
  const handleToggleStatus = async (emp) => {
    const action = emp.estado ? "suspender" : "activar";
    if (!window.confirm(`¿Estás seguro de ${action} el acceso de ${emp.Persona?.Nombre}?`)) return;

    try {
      const res = await toggleEmployeeStatus(emp.EmpleadoID);
      showToast(res.message);
      fetchEmployees();
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      showToast("No se pudo cambiar el estado.", "error");
    }
  };

  // Abrir Modal de Cambio de Contraseña
  const handleOpenPasswordModal = (emp) => {
    setSelectedEmployee(emp);
    setNewPassword("");
    setConfirmNewPassword("");
    setModalError("");
    setIsPasswordModalOpen(true);
  };

  // Guardar Nueva Contraseña
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    if (!newPassword || newPassword.length < 6) {
      setModalError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setModalError("Las contraseñas no coinciden.");
      return;
    }

    try {
      setModalLoading(true);
      await resetEmployeePassword(selectedEmployee.EmpleadoID, newPassword);
      showToast("Contraseña actualizada exitosamente.");
      setIsPasswordModalOpen(false);
    } catch (err) {
      console.error("Error al restablecer contraseña:", err);
      setModalError(err.response?.data?.message || "Error al actualizar la contraseña.");
    } finally {
      setModalLoading(false);
    }
  };

  // Usuario actualmente en sesión
  const [currentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cyc_user_session') || localStorage.getItem('cyc_client_session');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Filtrado de Empleados (Excluye al Administrador actual para evitar auto-bloqueos)
  const currentEmail = (currentUser?.Correo || "").toLowerCase();

  const filteredEmployees = employees
    .filter((emp) => {
      const empEmail = (emp.CuentaUsuario?.Correo || "").toLowerCase();
      // Ocultar al usuario en sesión de la lista de operadores subordinados
      if (currentEmail && empEmail === currentEmail) {
        return false;
      }
      return true;
    })
    .filter((emp) => {
      const fullName = `${emp.Persona?.Nombre || ""} ${emp.Persona?.PrimerApellido || ""} ${emp.Persona?.SegundoApellido || ""}`.toLowerCase();
      const email = (emp.CuentaUsuario?.Correo || "").toLowerCase();
      const ci = (emp.Persona?.CI_NIT || "").toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = fullName.includes(q) || email.includes(q) || ci.includes(q);
      const matchesRole = roleFilter === "ALL" || emp.CuentaUsuario?.Rol === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && emp.estado) ||
        (statusFilter === "INACTIVE" && !emp.estado);

      return matchesSearch && matchesRole && matchesStatus;
    });

  // Métricas rápidas
  const totalEmployees = employees.length;
  const adminCount = employees.filter(e => e.CuentaUsuario?.Rol === "Administrador").length;
  const salesCount = employees.filter(e => e.CuentaUsuario?.Rol === "Vendedor" || e.CuentaUsuario?.Rol === "Cajero").length;
  const activeCount = employees.filter(e => e.estado).length;

  // Renderizador de Badge de Rol (Limpio y Profesional)
  const renderRoleBadge = (rol) => {
    switch (rol) {
      case "Administrador":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-300 rounded-lg text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Administrador
          </span>
        );
      case "Vendedor":
      case "Cajero":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            Vendedor / Cajero
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            {rol || "Operador"}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      {/* Sidebar fijo con elemento activo */}
      <Sidebar activeItem="usuarios" />

      {/* Contenedor Principal con margen dinámico según estado colapsado */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          
          {/* Encabezado Principal */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                <span>SEGURIDAD Y CONTROL DE ACCESO</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Gestión de Usuarios y Roles
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Administración de cuentas de acceso, asignación de permisos e invitación de operadores
              </p>
            </div>

            <button
              onClick={() => {
                setModalError("");
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 text-xs flex items-center justify-center gap-2 transition-all active:scale-95 self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Registrar Nuevo Operador</span>
            </button>
          </div>

          {/* Tarjetas de Métricas de Usuarios con Iconos SVG Limpios */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Empleados */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Total Personal</p>
                <h3 className="text-2xl font-extrabold text-white mt-1">{totalEmployees}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Administradores */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Administradores</p>
                <h3 className="text-2xl font-extrabold text-purple-400 mt-1">{adminCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>

            {/* Vendedores / Cajeros */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Vendedores / Cajeros</p>
                <h3 className="text-2xl font-extrabold text-blue-400 mt-1">{salesCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* Operadores Activos */}
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs text-slate-400 font-semibold">Cuentas Activas</p>
                <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{activeCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre, correo o CI/NIT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Filtro por Rol */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl outline-none cursor-pointer hover:text-white"
              >
                <option value="ALL">Todos los Roles</option>
                <option value="Administrador">Administrador</option>
                <option value="Vendedor">Vendedor / Cajero</option>
              </select>

              {/* Filtro por Estado */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl outline-none cursor-pointer hover:text-white"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Suspendidos</option>
              </select>
            </div>
          </div>

          {/* Tabla de Empleados */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 font-semibold">Cargando operadores del sistema...</p>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400 mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-white">No se encontraron operadores</h3>
                <p className="text-xs text-slate-500">Prueba ajustando los filtros de búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-bold uppercase text-slate-400 tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Operador / Personal</th>
                      <th className="py-3.5 px-4">Rol en Sistema</th>
                      <th className="py-3.5 px-4">Correo Electrónico</th>
                      <th className="py-3.5 px-4">Teléfono</th>
                      <th className="py-3.5 px-4 text-center">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredEmployees.map((emp) => {
                      const fullName = `${emp.Persona?.Nombre || ""} ${emp.Persona?.PrimerApellido || ""} ${emp.Persona?.SegundoApellido || ""}`.trim();
                      const initial = emp.Persona?.Nombre ? emp.Persona.Nombre.charAt(0).toUpperCase() : "U";

                      return (
                        <tr key={emp.EmpleadoID} className="hover:bg-slate-800/30 transition-colors">
                          {/* Operador */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                {initial}
                              </div>
                              <div>
                                <p className="font-bold text-white text-xs">{fullName || "Sin nombre"}</p>
                                <p className="text-[10px] text-slate-500 font-mono">CI: {emp.Persona?.CI_NIT || "N/A"}</p>
                              </div>
                            </div>
                          </td>

                          {/* Rol */}
                          <td className="py-3.5 px-4">
                            {renderRoleBadge(emp.CuentaUsuario?.Rol)}
                          </td>

                          {/* Correo */}
                          <td className="py-3.5 px-4 font-mono text-cyan-400 text-[11px]">
                            {emp.CuentaUsuario?.Correo || "Sin correo"}
                          </td>

                          {/* Teléfono */}
                          <td className="py-3.5 px-4 text-slate-400">
                            {emp.Persona?.Telefono || "—"}
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4 text-center">
                            {emp.estado ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                Suspendido
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Editar */}
                              <button
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors"
                                title="Editar Operador"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>

                              {/* Botón Cambiar Contraseña */}
                              <button
                                onClick={() => handleOpenPasswordModal(emp)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 rounded-lg transition-colors"
                                title="Cambiar Contraseña"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                              </button>

                              {/* Botón Activar/Suspender */}
                              <button
                                onClick={() => handleToggleStatus(emp)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  emp.estado
                                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400"
                                }`}
                                title={emp.estado ? "Suspender Acceso" : "Activar Acceso"}
                              >
                                {emp.estado ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL 1: REGISTRAR NUEVO OPERADOR */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Registrar Nuevo Operador</h3>
                  <p className="text-xs text-slate-400">Crea el perfil del operador y envía la invitación de activación por correo</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Nombres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej. Oscar"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Primer Apellido *</label>
                  <input
                    type="text"
                    required
                    value={formData.primerApellido}
                    onChange={(e) => setFormData({ ...formData, primerApellido: e.target.value })}
                    placeholder="Ej. Claros"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Segundo Apellido, CI, Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Segundo Apellido</label>
                  <input
                    type="text"
                    value={formData.segundoApellido}
                    onChange={(e) => setFormData({ ...formData, segundoApellido: e.target.value })}
                    placeholder="Ej. Davalos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">CI / NIT</label>
                  <input
                    type="text"
                    value={formData.ciNit}
                    onChange={(e) => setFormData({ ...formData, ciNit: e.target.value })}
                    placeholder="Ej. 9895300"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Ej. 67524675"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Dirección Domiciliaria</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Ej. Av. Blanco Galindo Km 5, Cochabamba"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              {/* Correo y Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Correo Electrónico de Acceso *</label>
                  <input
                    type="email"
                    required
                    value={formData.correo}
                    onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                    placeholder="operador@ferreteria.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Rol en el Sistema *</label>
                  <select
                    value={formData.rol}
                    onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 cursor-pointer font-bold"
                  >
                    <option value="Administrador">Administrador (Acceso Total)</option>
                    <option value="Vendedor">Vendedor (Vendedor / Cajero)</option>
                  </select>
                </div>
              </div>

              {/* Notificación de Onboarding y Seguridad */}
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-start gap-3">
                <div className="w-5 h-5 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ℹ
                </div>
                <div className="text-[11px] text-slate-300 leading-relaxed">
                  <strong className="text-cyan-300 font-bold block mb-0.5">Invitación y Activación por Correo:</strong>
                  Se enviará un correo de bienvenida automático a la dirección ingresada con un enlace de activación seguro para que el operador configure su propia contraseña personal.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  {modalLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{modalLoading ? "Enviando Invitación..." : "Registrar y Enviar Invitación"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR OPERADOR */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-fade-in my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Editar Datos del Operador</h3>
                  <p className="text-xs text-slate-400">Modifica la información y rol asignado</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Nombres */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.nombre}
                    onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Primer Apellido *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.primerApellido}
                    onChange={(e) => setEditFormData({ ...editFormData, primerApellido: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Segundo Apellido, CI, Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Segundo Apellido</label>
                  <input
                    type="text"
                    value={editFormData.segundoApellido}
                    onChange={(e) => setEditFormData({ ...editFormData, segundoApellido: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">CI / NIT</label>
                  <input
                    type="text"
                    value={editFormData.ciNit}
                    onChange={(e) => setEditFormData({ ...editFormData, ciNit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editFormData.telefono}
                    onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Dirección Domiciliaria</label>
                <input
                  type="text"
                  value={editFormData.direccion}
                  onChange={(e) => setEditFormData({ ...editFormData, direccion: e.target.value })}
                  placeholder="Ej. Av. Blanco Galindo Km 5, Cochabamba"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              {/* Correo y Rol */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Correo de Acceso *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.correo}
                    onChange={(e) => setEditFormData({ ...editFormData, correo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Rol en el Sistema *</label>
                  <select
                    value={editFormData.rol}
                    onChange={(e) => setEditFormData({ ...editFormData, rol: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500 font-bold"
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Vendedor">Vendedor (Vendedor / Cajero)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20"
                >
                  {modalLoading ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CAMBIAR CONTRASEÑA DIRECTA */}
      {isPasswordModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Cambiar Contraseña</h3>
                  <p className="text-xs text-slate-400">
                    Operador: <strong className="text-white">{selectedEmployee.Persona?.Nombre}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-semibold mb-4">
                {modalError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Nueva Contraseña *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Confirmar Nueva Contraseña *</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  {modalLoading ? "Actualizando..." : "Actualizar Clave"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST FLOTANTE */}
      {toast.show && (
        <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3 backdrop-blur-md animate-slide-in">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold">
            ✓
          </div>
          <p className="text-xs font-bold text-white flex-1">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
