import React, { useState, useEffect } from "react";
import { getLocations, createLocation, updateLocation, deleteLocation, getWarehouses } from "../../services/api";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";

function LocationView() {
  const { isCollapsed } = useSidebar();
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState("productos-ubicaciones");

  // Modal Upsert Ubicación
  const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState("create"); // 'create' | 'edit'
  const [locationId, setLocationId] = useState(null);
  const [almacenId, setAlmacenId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [formError, setFormError] = useState("");

  // Modal Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

  // Toast
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playNote = (freq, start, duration) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };
      const now = audioCtx.currentTime;
      playNote(523.25, now, 0.3);
      playNote(659.25, now + 0.08, 0.4);
    } catch (e) {
      console.warn("Audio Context error:", e);
    }
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const loadData = async () => {
    try {
      const [lData, wData] = await Promise.all([getLocations(), getWarehouses()]);
      setLocations(lData);
      setWarehouses(wData);
      if (wData.length > 0 && !almacenId) {
        setAlmacenId(wData[0].AlmacenID.toString());
      }
    } catch (err) {
      console.error("Error al cargar ubicaciones/almacenes:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openUpsertModal = (mode, loc = null) => {
    setUpsertMode(mode);
    setFormError("");
    if (mode === "edit" && loc) {
      setLocationId(loc.UbicacionID);
      setAlmacenId(loc.AlmacenID ? loc.AlmacenID.toString() : (warehouses[0]?.AlmacenID?.toString() || ""));
      setDescripcion(loc.Descripcion || "");
    } else {
      setLocationId(null);
      setAlmacenId(warehouses[0]?.AlmacenID?.toString() || "");
      setDescripcion("");
    }
    setIsUpsertModalOpen(true);
  };

  const handleUpsertSubmit = (e) => {
    e.preventDefault();
    if (!almacenId) {
      setFormError("Debes seleccionar un almacén.");
      return;
    }
    if (!descripcion.trim()) {
      setFormError("La descripción del estante/pasillo es obligatoria.");
      return;
    }

    const data = { AlmacenID: parseInt(almacenId), Descripcion: descripcion };

    if (upsertMode === "create") {
      createLocation(data)
        .then((newLoc) => {
          setLocations([...locations, newLoc]);
          setToastMessage("¡Ubicación registrada con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsUpsertModalOpen(false);
          loadData();
        })
        .catch((err) => {
          console.error("Error al crear ubicación:", err);
          setFormError("Error al crear la ubicación.");
        });
    } else {
      updateLocation(locationId, data)
        .then((updated) => {
          setLocations(locations.map((l) => (l.UbicacionID === locationId ? updated : l)));
          setToastMessage("¡Ubicación actualizada con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsUpsertModalOpen(false);
          loadData();
        })
        .catch((err) => {
          console.error("Error al actualizar ubicación:", err);
          setFormError("Error al actualizar la ubicación.");
        });
    }
  };

  const openDeleteModal = (loc) => {
    setLocationToDelete(loc);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (locationToDelete) {
      deleteLocation(locationToDelete.UbicacionID)
        .then(() => {
          setLocations(locations.filter((l) => l.UbicacionID !== locationToDelete.UbicacionID));
          setToastMessage("¡Ubicación eliminada con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsDeleteModalOpen(false);
          setLocationToDelete(null);
        })
        .catch((err) => {
          console.error("Error al eliminar ubicación:", err);
          alert("Error al eliminar la ubicación.");
          setIsDeleteModalOpen(false);
        });
    }
  };

  const filteredLocations = locations.filter((loc) => {
    const desc = loc.Descripcion ? loc.Descripcion.toLowerCase() : "";
    const whName = loc.Almacen && loc.Almacen.Nombre ? loc.Almacen.Nombre.toLowerCase() : "";
    const query = searchTerm.toLowerCase();
    return desc.includes(query) || whName.includes(query);
  });

  const totalItems = filteredLocations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageLocations = filteredLocations.slice(startIndex, endIndex);

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      <Sidebar activeItem={activeMenu} />

      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Gestión de Ubicaciones
              </h2>
              <p className="text-slate-400 text-sm mt-1">Administra la posición de los estantes y pasillos dentro de cada depósito.</p>
            </div>
            <button
              onClick={() => openUpsertModal("create")}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Registrar Ubicación
            </button>
          </div>

          {/* Controles de Búsqueda */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <span>Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entradas</span>
            </div>

            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar por pasillo, estante o almacén..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Tabla de Ubicaciones */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-bold">Almacén Perteneciente</th>
                    <th className="px-6 py-4 font-bold">Descripción / Pasillo / Estante</th>
                    <th className="px-6 py-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {currentPageLocations.length > 0 ? (
                    currentPageLocations.map((loc) => (
                      <tr key={loc.UbicacionID} className="border-b border-slate-900/80 hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                          {loc.Almacen ? loc.Almacen.Nombre : "Sin Almacén"}
                        </td>
                        <td className="px-6 py-4 text-white font-semibold">
                          {loc.Descripcion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                          <button
                            onClick={() => openUpsertModal("edit", loc)}
                            className="px-3 py-1.5 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteModal(loc)}
                            className="px-3 py-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                        No se encontraron ubicaciones registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de Tabla */}
            <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-900/60 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400">
                Mostrando <span className="text-cyan-400">{totalItems > 0 ? startIndex + 1 : 0}</span> a <span className="text-cyan-400">{endIndex}</span> de {totalItems} entradas
              </div>
              {totalPages > 1 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Upsert Ubicación */}
      {isUpsertModalOpen && (
        <div className="bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {upsertMode === "create" ? "Registrar Nueva Ubicación" : "Editar Ubicación"}
            </h3>

            {formError && <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl">{formError}</div>}

            <form onSubmit={handleUpsertSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Almacén Perteneciente *</label>
                <select
                  value={almacenId}
                  onChange={(e) => setAlmacenId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50 cursor-pointer"
                  required
                >
                  <option value="" disabled>Seleccione un almacén...</option>
                  {warehouses.map((wh) => (
                    <option key={wh.AlmacenID} value={wh.AlmacenID.toString()} className="bg-slate-900 text-white font-semibold">
                      {wh.Nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Pasillo / Estante / Descripción *</label>
                <input
                  type="text"
                  placeholder="Ej. Pasillo 3, Estante B - Nivel 2..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsUpsertModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-xs">
                  {upsertMode === "create" ? "Registrar Ubicación" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Borrado */}
      {isDeleteModalOpen && (
        <div className="bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">¿Confirmar Eliminación?</h3>
            <p className="text-sm text-slate-300">
              ¿Deseas eliminar permanentemente la ubicación <span className="font-bold text-white">"{locationToDelete?.Descripcion}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl text-white text-xs font-bold animate-slide-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default LocationView;
