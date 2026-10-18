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
    <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex">
      <Sidebar activeItem={activeMenu} />

      <main className={`flex-1 transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-[#0c0e12] flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-100"
                style={{ textWrap: 'balance' }}
              >
                Gestión de Almacenes
              </h1>
              <p className="text-zinc-400 text-sm mt-1 max-w-[65ch]">
                Administra los depósitos físicos y sucursales operativas de la ferretería.
              </p>
            </div>
            <button
              onClick={() => openUpsertModal("create")}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-colors duration-150 btn-press active:scale-[0.97] text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Registrar Almacén
            </button>
          </div>

          {/* Controles de Búsqueda */}
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 order-2 sm:order-1">
              <span>Mostrar</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-[#0c0e12] border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 font-mono tabular-nums text-xs font-bold outline-none focus:border-amber-500/60 cursor-pointer transition-colors duration-150"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entradas</span>
            </div>

            <div className="relative w-full sm:max-w-md order-1 sm:order-2">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Buscar almacén por nombre o dirección..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-[#0c0e12] border border-zinc-800 rounded-lg focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 text-sm text-zinc-100 placeholder-zinc-500 transition-colors duration-150 outline-none"
              />
            </div>
          </div>

          {/* Tabla de Almacenes */}
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-zinc-300">
                <thead className="text-xs uppercase bg-[#0c0e12] text-zinc-400 border-b border-zinc-800/80">
                  <tr>
                    <th className="px-6 py-3.5 font-semibold tracking-wider w-24">ID</th>
                    <th className="px-6 py-3.5 font-semibold tracking-wider">Nombre del Almacén</th>
                    <th className="px-6 py-3.5 font-semibold tracking-wider">Dirección</th>
                    <th className="px-6 py-3.5 font-semibold tracking-wider">Teléfono</th>
                    <th className="px-6 py-3.5 font-semibold tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {currentPageWarehouses.length > 0 ? (
                    currentPageWarehouses.map((wh) => (
                      <tr key={wh.AlmacenID} className="hover:bg-zinc-800/30 transition-colors duration-150">
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono tabular-nums text-xs font-semibold">
                            #{wh.AlmacenID}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-zinc-100 font-semibold">
                          {wh.Nombre}
                        </td>
                        <td className="px-6 py-3.5 text-zinc-400">
                          {wh.Direccion || <span className="text-zinc-500 italic text-xs">Sin dirección</span>}
                        </td>
                        <td className="px-6 py-3.5 text-zinc-300 font-mono tabular-nums">
                          {wh.Telefono || <span className="text-zinc-500 font-sans italic text-xs">Sin teléfono</span>}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                          <button
                            onClick={() => openUpsertModal("edit", wh)}
                            className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500 hover:text-zinc-950 rounded-lg text-xs font-bold transition-colors duration-150 btn-press active:scale-[0.97]"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => openDeleteModal(wh)}
                            className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white rounded-lg text-xs font-bold transition-colors duration-150 btn-press active:scale-[0.97]"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 text-sm font-medium">
                        No se encontraron almacenes registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie de Tabla */}
            <div className="px-6 py-4 bg-[#0c0e12] border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-medium text-zinc-400">
                Mostrando <span className="font-mono tabular-nums font-bold text-amber-400">{totalItems > 0 ? startIndex + 1 : 0}</span> a <span className="font-mono tabular-nums font-bold text-amber-400">{endIndex}</span> de <span className="font-mono tabular-nums font-bold text-zinc-200">{totalItems}</span> entradas
              </div>
              {totalPages > 1 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-[#12151c] border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 btn-press active:scale-[0.97]"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-[#12151c] border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 btn-press active:scale-[0.97]"
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
        <div className="bg-black/75 fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-modal-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-100">
                  {upsertMode === "create" ? "Registrar Nuevo Almacén" : "Editar Almacén"}
                </h3>
                <p className="text-zinc-400 text-xs">Completa los datos operativos del almacén.</p>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleUpsertSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Nombre del Almacén <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Almacén Central, Depósito 2..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0c0e12] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-colors duration-150"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Dirección</label>
                <input
                  type="text"
                  placeholder="Ej. Av. Blanco Galindo Km 3..."
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0c0e12] border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-colors duration-150"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">Teléfono</label>
                <input
                  type="text"
                  placeholder="Ej. 44556677"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0c0e12] border border-zinc-800 rounded-lg text-sm text-zinc-100 font-mono tabular-nums placeholder-zinc-500 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 transition-colors duration-150"
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
                  {upsertMode === "create" ? "Registrar Almacén" : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Borrado */}
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
              ¿Deseas eliminar permanentemente el almacén <span className="font-bold text-zinc-100">"{warehouseToDelete?.Nombre}"</span>?
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
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-[#12151c] border border-emerald-500/30 rounded-xl p-4 shadow-2xl flex items-center gap-3 animate-toast-in">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="flex-1 text-zinc-100 text-sm font-semibold">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}

export default WarehouseView;
