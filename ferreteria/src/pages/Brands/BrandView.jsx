import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getBrands, createBrand, updateBrand, deleteBrand } from "../../services/api";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";

function BrandView() {
    const { isCollapsed } = useSidebar();
    const [brands, setBrands] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeMenu, setActiveMenu] = useState("productos-marcas");

    // Estados para Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Estados para el Modal de Confirmación de Eliminación
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [brandToDelete, setBrandToDelete] = useState(null);

    // Estados para el Modal de Agregar/Editar Marca (Upsert)
    const [isUpsertModalOpen, setIsUpsertModalOpen] = useState(false);
    const [upsertMode, setUpsertMode] = useState("create"); // 'create' o 'edit'
    const [brandId, setBrandId] = useState(null);
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [formError, setFormError] = useState("");

    // Estados para Toast Notification
    const [toastMessage, setToastMessage] = useState("");
    const [showToast, setShowToast] = useState(false);

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

    const loadBrands = () => {
        getBrands()
            .then((data) => {
                setBrands(data);
                console.log("Marcas recibidas:", data);
            })
            .catch((error) => {
                console.error("Error fetching brands:", error);
            });
    };

    useEffect(() => {
        loadBrands();
    }, []);

    const openDeleteModal = (brand) => {
        setBrandToDelete(brand);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (brandToDelete) {
            deleteBrand(brandToDelete.MarcaID)
                .then(() => {
                    setBrands(brands.filter((b) => b.MarcaID !== brandToDelete.MarcaID));
                    setToastMessage("¡Marca eliminada con éxito!");
                    setShowToast(true);
                    playSuccessSound();
                    setIsDeleteModalOpen(false);
                    setBrandToDelete(null);
                })
                .catch((error) => {
                    console.error("Error deleting brand:", error);
                    alert("Error al eliminar la marca.");
                    setIsDeleteModalOpen(false);
                    setBrandToDelete(null);
                });
        }
    };

    const openUpsertModal = (mode, brand = null) => {
        setUpsertMode(mode);
        setFormError("");
        if (mode === "edit" && brand) {
            setBrandId(brand.MarcaID);
            setNombre(brand.Nombre);
            setDescripcion(brand.Descripcion || "");
        } else {
            setBrandId(null);
            setNombre("");
            setDescripcion("");
        }
        setIsUpsertModalOpen(true);
    };

    const handleUpsertSubmit = (e) => {
        e.preventDefault();
        if (!nombre.trim()) {
            setFormError("El nombre de la marca es obligatorio.");
            return;
        }

        const brandData = {
            Nombre: nombre,
            Descripcion: descripcion
        };

        if (upsertMode === "create") {
            createBrand(brandData)
                .then((newBrand) => {
                    setBrands([...brands, newBrand]);
                    setToastMessage("¡Marca registrada con éxito!");
                    setShowToast(true);
                    playSuccessSound();
                    setIsUpsertModalOpen(false);
                })
                .catch((error) => {
                    console.error("Error creating brand:", error);
                    setFormError("Error al registrar la marca.");
                });
        } else {
            updateBrand(brandId, brandData)
                .then((updated) => {
                    setBrands(brands.map((b) => (b.MarcaID === brandId ? updated : b)));
                    setToastMessage("¡Marca actualizada con éxito!");
                    setShowToast(true);
                    playSuccessSound();
                    setIsUpsertModalOpen(false);
                })
                .catch((error) => {
                    console.error("Error updating brand:", error);
                    setFormError("Error al actualizar la marca.");
                });
        }
    };

    // Filtrar marcas por término de búsqueda (nombre)
    const filteredBrands = brands.filter((brand) => {
        const nombreVal = brand.Nombre ? brand.Nombre.toLowerCase() : "";
        const query = searchTerm.toLowerCase();
        return nombreVal.includes(query);
    });

    // Cálculos de Paginación
    const totalItems = filteredBrands.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentPageBrands = filteredBrands.slice(startIndex, endIndex);

    return (
        <div className="bg-slate-950 text-white min-h-screen font-sans flex">
            {/* Sidebar Lateral Fijo */}
            <Sidebar activeItem={activeMenu} />

            {/* Área del Contenido Principal */}
            <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
                {/* Barra Superior (Topbar) */}
                <Topbar />

                {/* Contenido Dinámico */}
                <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
                    {/* Encabezado de la página */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                Gestión de Marcas
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">Administra las marcas de los productos en tu catálogo general.</p>
                        </div>
                        <button
                            onClick={() => openUpsertModal("create")}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Registrar Marca
                        </button>
                    </div>

                    {/* Buscador y Controles */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                        {/* Selector de cantidad a mostrar (Estilo de referencia) */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 order-2 sm:order-1">
                            <span>Mostrar</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-bold outline-none focus:border-cyan-500/50 cursor-pointer transition-all"
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
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar por nombre de marca..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm text-white placeholder-slate-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Tabla de Marcas Estilizada en Cristal */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-300">
                                <thead className="text-xs uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 font-bold tracking-wider">Nombre de la Marca</th>
                                        <th scope="col" className="px-6 py-4 font-bold tracking-wider">Descripción</th>
                                        <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900/60">
                                    {currentPageBrands.length > 0 ? (
                                        currentPageBrands.map((brand) => (
                                            <tr
                                                key={brand.MarcaID}
                                                className="border-b border-slate-900/80 hover:bg-slate-900/30 transition-colors duration-150"
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                                                    {brand.Nombre}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                                                    {brand.Descripcion ? brand.Descripcion : <span className="text-slate-600 italic text-xs">Sin descripción</span>}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-2">
                                                    <button
                                                        onClick={() => openUpsertModal("edit", brand)}
                                                        className="px-3 py-1.5 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => openDeleteModal(brand)}
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
                                                No se encontraron marcas registradas.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pie de Tabla con Información y Paginador */}
                        <div className="px-6 py-4 bg-slate-900/40 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Información de Entradas */}
                            <div className="text-xs font-bold text-slate-400">
                                {totalItems > 0 ? (
                                    <>
                                        Mostrando <span className="text-cyan-400">{startIndex + 1}</span> a <span className="text-cyan-400">{endIndex}</span> de <span className="text-slate-300">{totalItems}</span> entradas
                                    </>
                                ) : (
                                    "Mostrando 0 a 0 de 0 entradas"
                                )}
                            </div>

                            {/* Paginador Interactivo */}
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-150 ${
                                            currentPage === 1
                                                ? "bg-slate-950/40 border border-slate-900 text-slate-600 cursor-not-allowed"
                                                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850"
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
                                                    <span key={page} className="text-slate-600 text-xs px-1 select-none">
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
                                                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-150 ${
                                                    currentPage === page
                                                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                                                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-150 ${
                                            currentPage === totalPages
                                                ? "bg-slate-950/40 border border-slate-900 text-slate-600 cursor-not-allowed"
                                                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850"
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
                <div className="bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-in">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white">¿Confirmar Eliminación?</h3>
                                <p className="text-slate-400 text-xs mt-0.5">Esta acción no se puede revertir.</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed">
                            ¿Estás seguro de que deseas eliminar permanentemente la marca <span className="font-bold text-white">"{brandToDelete?.Nombre}"</span> del catálogo de la ferretería?
                        </p>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300 font-semibold rounded-xl text-xs transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/20 transition-all"
                            >
                                Sí, eliminar marca
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Agregar/Editar Marca (Upsert) */}
            {isUpsertModalOpen && (
                <div className="bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl animate-scale-in">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white">
                                    {upsertMode === "create" ? "Registrar Nueva Marca" : "Editar Marca"}
                                </h3>
                                <p className="text-slate-400 text-xs mt-0.5">Completa los datos de la marca a continuación.</p>
                            </div>
                        </div>

                        <form onSubmit={handleUpsertSubmit} className="space-y-5">
                            {formError && (
                                <div className="p-3.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 font-bold rounded-xl text-xs">
                                    {formError}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                    Nombre de la Marca <span className="text-cyan-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Escribe el nombre de la marca"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm text-white placeholder-slate-600 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                    Descripción (Opcional)
                                </label>
                                <textarea
                                    placeholder="Escribe detalles adicionales sobre el fabricante..."
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 text-sm text-white placeholder-slate-600 transition-all outline-none resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsUpsertModalOpen(false)}
                                    className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300 font-semibold rounded-xl text-xs transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition-all"
                                >
                                    {upsertMode === "create" ? "Registrar Marca" : "Guardar Cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast Notification flotante en la esquina superior derecha */}
            {showToast && (
                <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-slate-900/90 border border-emerald-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3 backdrop-blur-md animate-slide-in">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operación Exitosa</h4>
                        <p className="text-sm font-semibold text-white mt-0.5">{toastMessage}</p>
                    </div>
                    <button
                        onClick={() => setShowToast(false)}
                        className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors outline-none"
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

export default BrandView;
