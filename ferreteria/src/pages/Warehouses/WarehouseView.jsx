import React, { useState, useEffect } from "react";
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from "../../services/api";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";

function WarehouseView() {
  const { isCollapsed } = useSidebar();
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState("productos-almacenes");

  // Modal Upsert
  const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState("create"); // 'create' | 'edit'
  const [warehouseId, setWarehouseId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [formError, setFormError] = useState("");

  // Modal Delete
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState(null);

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

  const loadWarehouses = () => {
    getWarehouses()
      .then((data) => setWarehouses(data))
      .catch((err) => console.error("Error al cargar almacenes:", err));
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const openUpsertModal = (mode, wh = null) => {
    setUpsertMode(mode);
    setFormError("");
    if (mode === "edit" && wh) {
      setWarehouseId(wh.AlmacenID);
      setNombre(wh.Nombre);
      setDireccion(wh.Direccion || "");
      setTelefono(wh.Telefono || "");
    } else {
      setWarehouseId(null);
      setNombre("");
      setDireccion("");
      setTelefono("");
    }
    setIsUpsertModalOpen(true);
  };

  const handleUpsertSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setFormError("El nombre del almacén es obligatorio.");
      return;
    }

    const data = { Nombre: nombre, Direccion: direccion, Telefono: telefono };

    if (upsertMode === "create") {
      createWarehouse(data)
        .then((newWh) => {
          setWarehouses([...warehouses, newWh]);
          setToastMessage("¡Almacén registrado con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsUpsertModalOpen(false);
        })
        .catch((err) => {
          console.error("Error al crear almacén:", err);
          setFormError("Error al crear el almacén.");
        });
    } else {
      updateWarehouse(warehouseId, data)
        .then((updated) => {
          setWarehouses(warehouses.map((w) => (w.AlmacenID === warehouseId ? updated : w)));
          setToastMessage("¡Almacén actualizado con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsUpsertModalOpen(false);
        })
        .catch((err) => {
          console.error("Error al actualizar almacén:", err);
          setFormError("Error al actualizar el almacén.");
        });
    }
  };

  const openDeleteModal = (wh) => {
    setWarehouseToDelete(wh);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (warehouseToDelete) {
      deleteWarehouse(warehouseToDelete.AlmacenID)
        .then(() => {
          setWarehouses(warehouses.filter((w) => w.AlmacenID !== warehouseToDelete.AlmacenID));
          setToastMessage("¡Almacén eliminado con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsDeleteModalOpen(false);
          setWarehouseToDelete(null);
        })
        .catch((err) => {
          console.error("Error al eliminar almacén:", err);
          alert("Error al eliminar el almacén.");
          setIsDeleteModalOpen(false);
        });
    }
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const n = wh.Nombre ? wh.Nombre.toLowerCase() : "";
    const d = wh.Direccion ? wh.Direccion.toLowerCase() : "";
    const query = searchTerm.toLowerCase();
    return n.includes(query) || d.includes(query);
  });

  const totalItems = filteredWarehouses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageWarehouses = filteredWarehouses.slice(startIndex, endIndex);

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
                Gestión de Almacenes
              </h2>
              <p className="text-slate-400 text-sm mt-1">Administra los depósitos físicos principales de la ferretería.</p>
            </div>
            <button
              onClick={() => openUpsertModal("create")}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Registrar Almacén
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
                placeholder="Buscar almacén por nombre o dirección..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm text-white placeholder-slate-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Tabla de Almacenes */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-bold">Nombre del Almacén</th>
                    <th className="px-6 py-4 font-bold">Dirección</th>
                    <th className="px-6 py-4 font-bold">Teléfono</th>
                    <th className="px-6 py-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {currentPageWarehouses.length > 0 ? (
                    currentPageWarehouses.map((wh) => (
                      <tr key={wh.AlmacenID} className="border-b border-slate-900/80 hover:bg-slate-900/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                          {wh.Nombre}
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {wh.Direccion || <span className="text-slate-600 italic text-xs">Sin dirección</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          {wh.Telefono || <span className="text-slate-600 italic text-xs">Sin teléfono</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                          <button
                            onClick={() => openUpsertModal("edit", wh)}
                            className="px-3 py-1.5 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteModal(wh)}
                            className="px-3 py-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                        No se encontraron almacenes registrados.
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

      {/* Modal Upsert Almacén */}
      {isUpsertModalOpen && (
        <div className="bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {upsertMode === "create" ? "Registrar Nuevo Almacén" : "Editar Almacén"}
            </h3>

            {formError && <div className="p-3 bg-rose-600/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl">{formError}</div>}

            <form onSubmit={handleUpsertSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Nombre del Almacén *</label>
                <input
                  type="text"
                  placeholder="Ej. Almacén Central, Depósito 2..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Dirección</label>
                <input
                  type="text"
                  placeholder="Ej. Av. Blanco Galindo Km 3..."
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej. 44556677"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsUpsertModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl text-xs">
                  {upsertMode === "create" ? "Registrar Almacén" : "Guardar Cambios"}
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
              ¿Deseas eliminar permanentemente el almacén <span className="font-bold text-white">"{warehouseToDelete?.Nombre}"</span>?
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

export default WarehouseView;
