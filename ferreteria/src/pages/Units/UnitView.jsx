import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getUnits, createUnit, updateUnit, deleteUnit } from "../../services/api";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";

function UnitView() {
  const { isCollapsed } = useSidebar();
  const [units, setUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState("productos-unidades");

  // Estados para el Modal de Confirmación de Eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);

  // Estados para el Modal de Agregar/Editar Unidad (Upsert)
  const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState("create"); // 'create' o 'edit'
  const [unitId, setUnitId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [formError, setFormError] = useState("");

  // Estados para Toast Notification
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Estados para Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Sintetizador de sonido con Web Audio API (Doble tono campana ascendente)
  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const playNote = (frequency, startTime, duration) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine'; // Tono puro
        oscillator.frequency.value = frequency;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05); // Suave aumento
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // Caída suave
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioCtx.currentTime;
      playNote(523.25, now, 0.3); // Nota C5
      playNote(659.25, now + 0.08, 0.4); // Nota E5
    } catch (e) {
      console.warn("Web Audio API no soportado o bloqueado:", e);
    }
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const loadUnits = () => {
    getUnits()
      .then((data) => {
        setUnits(data);
        console.log("Unidades recibidas:", data);
      })
      .catch((error) => {
        console.error("Error fetching units:", error);
      });
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const openDeleteModal = (unit) => {
    setUnitToDelete(unit);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (unitToDelete) {
      deleteUnit(unitToDelete.UnidadID)
        .then(() => {
          setUnits(units.filter((u) => u.UnidadID !== unitToDelete.UnidadID));
          setToastMessage("¡Unidad de medida eliminada con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsDeleteModalOpen(false);
          setUnitToDelete(null);
        })
        .catch((error) => {
          console.error("Error deleting unit:", error);
          alert("Error al eliminar la unidad de medida.");
          setIsDeleteModalOpen(false);
          setUnitToDelete(null);
        });
    }
  };

  const openUpsertModal = (mode, unit = null) => {
    setUpsertMode(mode);
    setFormError("");
    if (mode === "edit" && unit) {
      setUnitId(unit.UnidadID);
      setNombre(unit.Nombre);
      setDescripcion(unit.Descripcion || "");
    } else {
      setUnitId(null);
      setNombre("");
      setDescripcion("");
    }
    setIsUpsertModalOpen(true);
  };

  const handleUpsertSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFormError("El nombre de la unidad es obligatorio.");
      return;
    }

    const unitData = {
      Nombre: nombre,
      Descripcion: descripcion
    };

    if (upsertMode === "create") {
      createUnit(unitData)
        .then((newUnit) => {
          setUnits([...units, newUnit]);
          setToastMessage("¡Unidad registrada con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsUpsertModalOpen(false);
        })
        .catch((error) => {
          console.error("Error creating unit:", error);
          setFormError("Error al registrar la unidad de medida.");
        });
    } else {
      updateUnit(unitId, unitData)
        .then((updated) => {
          setUnits(units.map((u) => (u.UnidadID === unitId ? updated : u)));
          setToastMessage("¡Unidad actualizada con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsUpsertModalOpen(false);
        })
        .catch((error) => {
          console.error("Error updating unit:", error);
          setFormError("Error al actualizar la unidad de medida.");
        });
    }
  };

  // Filtrar unidades por término de búsqueda (nombre)
  const filteredUnits = units.filter((unit) => {
    const nombreVal = unit.Nombre ? unit.Nombre.toLowerCase() : "";
    const query = searchTerm.toLowerCase();
    return nombreVal.includes(query);
  });

  // Cálculos de Paginación
  const totalItems = filteredUnits.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageUnits = filteredUnits.slice(startIndex, endIndex);

  return (
    <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex">
      {/* Sidebar Lateral Fijo */}
      <Sidebar activeItem={activeMenu} />

      {/* Área del Contenido Principal */}
      <main className={`flex-1 transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-[#0c0e12] flex flex-col`}>
        {/* Barra Superior (Topbar) */}
        <Topbar />

        {/* Contenido Dinámico */}
        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado de la página */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100"
                style={{ textWrap: 'balance' }}
              >
                Gestión de Unidades
              </h1>
              <p className="text-zinc-400 text-sm mt-1 max-w-[65ch]">
                Administra las unidades de medida de los productos (caja, docena, kilo, metro) de la ferretería.
              </p>
            </div>
            <button
              onClick={() => openUpsertModal("create")}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-colors duration-150 btn-press active:scale-[0.97] text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Registrar Unidad
            </button>
          </div>

          {/* Buscador y Controles */}
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Selector de cantidad a mostrar */}
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 order-2 sm:order-1">
              <span>Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#0c0e12] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono tabular-nums text-xs font-bold outline-none focus:border-amber-500/60 cursor-pointer transition-colors duration-150"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entradas</span>
            </div>

            {/* Input de búsqueda local */}
            <div className="relative w-full sm:max-w-md order-1 sm:order-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por nombre de unidad..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-[#0c0e12] border border-zinc-800 rounded-lg focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 text-sm text-zinc-100 placeholder-zinc-500 transition-colors duration-150 outline-none"
              />
            </div>
          </div>

          {/* Tabla de Unidades */}
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-zinc-300">
                <thead className="text-xs uppercase bg-[#0c0e12] text-zinc-400 border-b border-zinc-800/80">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 font-semibold tracking-wider w-24">ID</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold tracking-wider">Unidad de Medida</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold tracking-wider">Descripción</th>
                    <th scope="col" className="px-6 py-3.5 font-semibold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {currentPageUnits.length > 0 ? (
                    currentPageUnits.map((unit) => (
                      <tr 
                        key={unit.UnidadID} 
                        className="hover:bg-zinc-800/30 transition-colors duration-150"
                      >
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono tabular-nums text-xs font-semibold">
                            #{unit.UnidadID}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-zinc-100 font-semibold">
                          {unit.Nombre}
                        </td>
                        <td className="px-6 py-3.5 text-zinc-400 max-w-xs truncate">
                          {unit.Descripcion ? unit.Descripcion : <span className="text-zinc-500 italic text-xs">Sin descripción</span>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                          <button
                            onClick={() => openUpsertModal("edit", unit)}
                            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500 hover:text-zinc-950 rounded-lg text-xs font-bold transition-colors duration-150 btn-press active:scale-[0.97]"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteModal(unit)}
                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-colors duration-150 btn-press active:scale-[0.97]"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-zinc-500 text-sm font-medium">
                        No se encontraron unidades registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de Tabla con Información y Paginador */}
            <div className="px-6 py-4 bg-[#0c0e12] border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Información de Entradas */}
              <div className="text-xs font-medium text-zinc-400">
                {totalItems > 0 ? (
                  <>
                    Mostrando <span className="font-mono tabular-nums font-bold text-amber-400">{startIndex + 1}</span> a <span className="font-mono tabular-nums font-bold text-amber-400">{endIndex}</span> de <span className="font-mono tabular-nums font-bold text-zinc-200">{totalItems}</span> entradas
                  </>
                ) : (
                  <span className="font-mono tabular-nums">Mostrando 0 a 0 de 0 entradas</span>
                )}
              </div>

              {/* Paginador Interactivo */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 btn-press active:scale-[0.97] ${
                      currentPage === 1
                        ? "bg-[#12151c] border border-zinc-800/60 text-zinc-600 cursor-not-allowed"
                        : "bg-[#12151c] border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700"
                    }`}
                  >
                    Anterior
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const shouldShow =
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    if (!shouldShow) {
                      if (page === 2 || page === totalPages - 1) {
                        return (
                          <span key={page} className="text-zinc-600 font-mono tabular-nums text-xs px-1 select-none">
                            ...
                          </span>
                        );
                      }
                      return null;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 rounded-lg font-mono tabular-nums text-xs font-bold transition-colors duration-150 btn-press active:scale-[0.97] ${
                          currentPage === page
                            ? "bg-amber-500 text-zinc-950"
                            : "bg-[#12151c] border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700"
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 btn-press active:scale-[0.97] ${
                      currentPage === totalPages
                        ? "bg-[#12151c] border border-zinc-800/60 text-zinc-600 cursor-not-allowed"
                        : "bg-[#12151c] border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700"
                    }`}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Confirmación de Eliminación */}
      {isDeleteModalOpen && (
        <div className="bg-black/75 fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-modal-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-100">¿Confirmar eliminación?</h3>
                <p className="text-zinc-400 text-xs">Esta acción no se puede revertir.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la unidad de medida <span className="font-bold text-zinc-100">"{unitToDelete?.Nombre}"</span> del catálogo de la ferretería?
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-300 font-semibold rounded-lg text-xs transition-colors duration-150 btn-press active:scale-[0.97]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors duration-150 btn-press active:scale-[0.97]"
              >
                Sí, eliminar unidad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Agregar/Editar Unidad (Upsert) */}
      {isUpsertModalOpen && (
        <div className="bg-black/75 fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-modal-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-100">
                  {upsertMode === "create" ? "Registrar Nueva Unidad" : "Editar Unidad"}
                </h3>
                <p className="text-zinc-400 text-xs">Completa los datos de la unidad de medida a continuación.</p>
              </div>
            </div>

            <form onSubmit={handleUpsertSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 font-semibold rounded-lg text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Nombre de la Unidad <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Kilo, Caja, Bolsa, Unidad, Docena..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0c0e12] border border-zinc-800 rounded-lg focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 text-sm text-zinc-100 placeholder-zinc-500 transition-colors duration-150 outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Descripción
                </label>
                <textarea
                  placeholder="Escribe detalles adicionales sobre esta unidad (ej. capacidad o empaque)..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows="3"
                  className="w-full px-3.5 py-2.5 bg-[#0c0e12] border border-zinc-800 rounded-lg focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 text-sm text-zinc-100 placeholder-zinc-500 transition-colors duration-150 outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUpsertModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 text-zinc-300 font-semibold rounded-lg text-xs transition-colors duration-150 btn-press active:scale-[0.97]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-colors duration-150 btn-press active:scale-[0.97]"
                >
                  {upsertMode === "create" ? "Registrar Unidad" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification flotante en la esquina superior derecha */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-[#12151c] border border-emerald-500/30 rounded-xl shadow-2xl p-4 flex items-center gap-3 animate-toast-in">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-100">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setShowToast(false)}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg transition-colors duration-150 outline-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default UnitView;
