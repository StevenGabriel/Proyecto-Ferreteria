import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getProducts, deleteProduct, getLots, createLots } from "../../services/api";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";

function ProductView() {
  const { isCollapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenu, setActiveMenu] = useState("productos-lista");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Menú desplegable activo por fila
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal Ver Detalle de Producto
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);

  // Modal Historial de Existencias
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState(null);

  // Modal Eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Modal Stock de Apertura Multi-fila (Estilo Referencia ERP)
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockRows, setStockRows] = useState([]);

  // Toast & Sonido
  const [toastMessage, setToastMessage] = useState("");
  const [showToast, setShowToast] = useState(false);

  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playNote = (frequency, startTime, duration) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      const now = audioCtx.currentTime;
      playNote(523.25, now, 0.3);
      playNote(659.25, now + 0.08, 0.4);
    } catch (e) {
      console.warn("Audio Context bloqueado:", e);
    }
  };

  const fetchAllProducts = () => {
    getProducts()
      .then((data) => {
        setProducts(data);
        if (location.state && location.state.openStockModalFor) {
          const target = data.find((p) => p.ProductoID === location.state.openStockModalFor);
          if (target) {
            openStockModal(target);
          }
        }
      })
      .catch((err) => console.error("Error al obtener productos:", err));
  };

  useEffect(() => {
    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (location.state && location.state.message) {
      setToastMessage(location.state.message);
      setShowToast(true);
      playSuccessSound();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Handlers para Modales
  const openDetailModal = (product) => {
    setDetailProduct(product);
    setIsDetailModalOpen(true);
    setOpenMenuId(null);
  };

  // Estado para el historial de lotes
  const [productLotsHistory, setProductLotsHistory] = useState([]);

  const openHistoryModal = (product) => {
    setHistoryProduct(product);
    setIsHistoryModalOpen(true);
    setOpenMenuId(null);
    getLots(product.ProductoID)
      .then((data) => setProductLotsHistory(data))
      .catch((err) => console.error("Error al obtener historial de lotes:", err));
  };

  const openDeleteModal = (product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.ProductoID)
        .then(() => {
          setProducts(products.filter((p) => p.ProductoID !== productToDelete.ProductoID));
          setToastMessage("¡Producto eliminado con éxito!");
          setShowToast(true);
          playSuccessSound();
          setIsDeleteModalOpen(false);
          setProductToDelete(null);
        })
        .catch((err) => {
          console.error("Error al eliminar producto:", err);
          alert("Error al eliminar el producto.");
          setIsDeleteModalOpen(false);
        });
    }
  };

  // Abrir Modal de Stock de Apertura consultando Lotes existentes
  const openStockModal = (product) => {
    const hoy = new Date().toISOString().slice(0, 16);
    setStockProduct(product);
    setOpenMenuId(null);

    getLots(product.ProductoID)
      .then((existing) => {
        const mapped = existing.map((l) => ({
          id: l.LoteID,
          cantidad: l.Stock.toString(),
          costo: product.PrecioCompra ? product.PrecioCompra.toString() : "",
          fecha: l.fecha_creacion ? new Date(l.fecha_creacion).toISOString().slice(0, 16) : hoy,
          fechaVencimiento: l.FechaVencimiento ? l.FechaVencimiento.toString().slice(0, 10) : "",
          nota: l.NotaLote || l.NumeroLote || "Stock de apertura",
          isRegistered: true
        }));

        mapped.push({
          id: Date.now(),
          cantidad: "",
          costo: product.PrecioCompra ? product.PrecioCompra.toString() : "",
          fecha: hoy,
          fechaVencimiento: "",
          nota: "",
          isRegistered: false
        });

        setStockRows(mapped);
        setIsStockModalOpen(true);
      })
      .catch((err) => {
        console.error("Error al cargar lotes:", err);
        setStockRows([
          {
            id: Date.now(),
            cantidad: "",
            costo: product.PrecioCompra ? product.PrecioCompra.toString() : "",
            fecha: hoy,
            fechaVencimiento: "",
            nota: "Stock inicial de apertura",
            isRegistered: false
          }
        ]);
        setIsStockModalOpen(true);
      });
  };

  // Agregar nueva fila al modal de Stock de Apertura
  const addStockRow = () => {
    const hoy = new Date().toISOString().slice(0, 16);
    setStockRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        cantidad: "",
        costo: stockProduct?.PrecioCompra ? stockProduct.PrecioCompra.toString() : "",
        fecha: hoy,
        fechaVencimiento: "",
        nota: "",
        isRegistered: false
      }
    ]);
  };

  // Eliminar fila (solo permitida para las nuevas no guardadas)
  const removeStockRow = (id) => {
    setStockRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Actualizar campo de fila
  const handleStockRowChange = (id, field, value) => {
    setStockRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Guardar nuevos Lotes mediante API POST /lots
  const handleSaveStock = (e) => {
    e.preventDefault();

    const newRowsToSave = stockRows.filter(
      (r) => !r.isRegistered && parseFloat(r.cantidad) > 0
    );

    if (newRowsToSave.length === 0) {
      alert("Por favor ingresa al menos una nueva cantidad válida para agregar.");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);

    for (const r of newRowsToSave) {
      if (!r.fecha) {
        alert("La Fecha de Ingreso es obligatoria para registrar el stock.");
        return;
      }
      if (stockProduct.ManejaCaducidad) {
        if (!r.fechaVencimiento) {
          alert(`El producto "${stockProduct.Nombre}" está configurado con caducidad. Es obligatorio ingresar la Fecha de Caducidad para cada lote.`);
          return;
        }
        if (r.fechaVencimiento < todayStr) {
          alert(`La Fecha de Caducidad (${r.fechaVencimiento}) no puede ser anterior a la fecha actual (${todayStr}).`);
          return;
        }
      }
    }

    const payload = {
      ProductoID: stockProduct.ProductoID,
      lotes: newRowsToSave.map((r) => ({
        cantidad: parseFloat(r.cantidad),
        costo: parseFloat(r.costo || 0),
        fecha: r.fecha,
        FechaVencimiento: r.fechaVencimiento || null,
        nota: r.nota || "Stock de apertura"
      }))
    };

    createLots(payload)
      .then(() => {
        const totalCant = newRowsToSave.reduce((s, r) => s + parseFloat(r.cantidad), 0);
        setToastMessage(`¡Ingreso de stock (${totalCant} unidades) registrado con éxito!`);
        setShowToast(true);
        playSuccessSound();
        setIsStockModalOpen(false);
        fetchAllProducts();
      })
      .catch((err) => {
        console.error("Error al guardar lotes:", err);
        alert("Error al registrar los lotes de stock.");
      });
  };

  // Filtro local
  const filteredProducts = products.filter((product) => {
    const name = product.Nombre ? product.Nombre.toLowerCase() : "";
    const code = product.CodigoBarras ? product.CodigoBarras.toLowerCase() : "";
    const brand = product.Marca ? product.Marca.Nombre.toLowerCase() : "";
    const query = searchTerm.toLowerCase();
    return name.includes(query) || code.includes(query) || brand.includes(query);
  });

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentPageProducts = filteredProducts.slice(startIndex, endIndex);

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex" onClick={() => setOpenMenuId(null)}>
      <Sidebar activeItem={activeMenu} />

      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Gestión de Productos
              </h2>
              <p className="text-slate-400 text-sm mt-1">Administra el catálogo general, precios y stock de existencias.</p>
            </div>
            <Link
              to="/productReg"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-sm"
            >
              + Añadir Producto
            </Link>
          </div>

          {/* Controles de Búsqueda y Paginación */}
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
                <option value={100}>100</option>
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
                placeholder="Buscar por producto, marca o código..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Tabla de Productos */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="px-4 py-3 font-bold text-center">Foto</th>
                    <th className="px-4 py-3 font-bold">Acción</th>
                    <th className="px-4 py-3 font-bold">SKU / Código</th>
                    <th className="px-4 py-3 font-bold">Producto</th>
                    <th className="px-4 py-3 font-bold">Ubicación</th>
                    <th className="px-4 py-3 font-bold">Precio Compra</th>
                    <th className="px-4 py-3 font-bold">Precio Venta</th>
                    <th className="px-4 py-3 font-bold">Stock Actual</th>
                    <th className="px-4 py-3 font-bold">Categoría</th>
                    <th className="px-4 py-3 font-bold">Marca</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {currentPageProducts.length > 0 ? (
                    currentPageProducts.map((p) => {
                      const stockVal = p.Stock || 0;
                      const minLote = p.LoteMinimo || 5;
                      const isLow = stockVal > 0 && stockVal <= minLote;
                      const isOut = stockVal <= 0;

                      return (
                        <tr key={p.ProductoID} className="border-b border-slate-900/80 hover:bg-slate-900/30 transition-colors">
                          {/* Miniatura de Imagen */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {p.Imagen ? (
                              <img src={p.Imagen} alt={p.Nombre} className="w-9 h-9 object-cover rounded-lg mx-auto border border-slate-800 shadow" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                                <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </td>

                          {/* Botón de Acción Desplegable */}
                          <td className="px-4 py-3 relative whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === p.ProductoID ? null : p.ProductoID);
                              }}
                              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold rounded-lg text-xs flex items-center gap-1 transition-all"
                            >
                              Acciones ▾
                            </button>

                            {openMenuId === p.ProductoID && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-4 top-12 z-50 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 w-64 animate-fade-in text-xs"
                              >
                                <button
                                  onClick={() => openDetailModal(p)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-200 font-semibold flex items-center gap-2.5 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>Ver Ficha Técnica</span>
                                </button>

                                <Link
                                  to={`/productEdit/${p.ProductoID}`}
                                  className="w-full text-left block px-4 py-2 hover:bg-slate-800 text-slate-200 font-semibold flex items-center gap-2.5 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-blue-400 inline-block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span>Editar</span>
                                </Link>

                                <button
                                  onClick={() => openDeleteModal(p)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-800 text-rose-400 font-semibold flex items-center gap-2.5 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  <span>Borrar</span>
                                </button>

                                <hr className="border-slate-800 my-1" />

                                <button
                                  onClick={() => openStockModal(p)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-800 text-cyan-400 font-semibold flex items-center gap-2.5 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  <span>Agregar o editar el stock de apertura</span>
                                </button>

                                <button
                                  onClick={() => openHistoryModal(p)}
                                  className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 font-semibold flex items-center gap-2.5 transition-colors"
                                >
                                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Historial de existencias de productos</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* SKU */}
                          <td className="px-4 py-3 font-mono text-slate-400 whitespace-nowrap">
                            {p.CodigoBarras || <span className="text-slate-600 italic">S/N</span>}
                          </td>

                          {/* Nombre Producto */}
                          <td className="px-4 py-3 font-bold text-white max-w-xs truncate" title={p.Nombre}>
                            {p.Nombre}
                          </td>

                          {/* Ubicación */}
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {p.Ubicacion ? (
                              <span className="text-cyan-400 font-semibold">
                                {p.Ubicacion.Almacen ? `[${p.Ubicacion.Almacen.Nombre}] ` : ""}
                                {p.Ubicacion.Descripcion}
                              </span>
                            ) : (
                              <span className="text-slate-600 italic">Sin asignar</span>
                            )}
                          </td>

                          {/* Precio Compra */}
                          <td className="px-4 py-3 text-slate-300 font-semibold whitespace-nowrap">
                            Bs. {p.PrecioCompra ? parseFloat(p.PrecioCompra).toFixed(2) : "0.00"}
                          </td>

                          {/* Precios Venta */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-white font-bold">
                              Con Factura: <span className="text-cyan-400">Bs. {p.PrecioVenta ? parseFloat(p.PrecioVenta).toFixed(2) : (p.Precio ? parseFloat(p.Precio).toFixed(2) : "0.00")}</span>
                            </div>
                            {p.PrecioSinFactura && (
                              <div className="text-slate-400 text-[10px]">
                                Sin Factura: <span className="text-amber-400 font-bold">Bs. {parseFloat(p.PrecioSinFactura).toFixed(2)}</span>
                              </div>
                            )}
                          </td>

                          {/* Stock Actual */}
                          <td className="px-4 py-3 whitespace-nowrap font-extrabold">
                            {isOut ? (
                              <span className="text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                                Agotado (0 {p.Unidad ? p.Unidad.Nombre : ""})
                              </span>
                            ) : isLow ? (
                              <span className="text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                {stockVal} {p.Unidad ? p.Unidad.Nombre : ""} (Bajo)
                              </span>
                            ) : (
                              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                {stockVal} {p.Unidad ? p.Unidad.Nombre : ""}
                              </span>
                            )}
                          </td>

                          {/* Categoría */}
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-semibold">
                            {p.Categoria ? p.Categoria.Nombre : (p.Categorium ? p.Categorium.Nombre : <span className="text-slate-600 italic">S/C</span>)}
                          </td>

                          {/* Marca */}
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap font-semibold">
                            {p.Marca ? p.Marca.Nombre : <span className="text-slate-600 italic">S/M</span>}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" className="px-6 py-12 text-center text-slate-500 text-sm font-medium">
                        No se encontraron productos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginador */}
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

      {/* Modal Ver Ficha de Producto */}
      {isDetailModalOpen && detailProduct && (
        <div className="bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Ficha Técnica del Producto</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="flex gap-4 items-center">
              {detailProduct.Imagen ? (
                <img src={detailProduct.Imagen} alt={detailProduct.Nombre} className="w-20 h-20 object-cover rounded-xl border border-slate-800 shadow-md" />
              ) : (
                <div className="w-20 h-20 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-2xl">🖼️</div>
              )}
              <div>
                <h4 className="text-base font-extrabold text-white">{detailProduct.Nombre}</h4>
                <p className="text-xs text-slate-400 mt-0.5">SKU: <span className="font-mono text-cyan-400">{detailProduct.CodigoBarras || "Sin código"}</span></p>
                <p className="text-xs text-slate-400">Tipo Código: <span className="text-slate-200">{detailProduct.TipoCodigoBarras || "Code 128"}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div><span className="text-slate-500 font-bold block">Categoría:</span> <span className="text-slate-200 font-semibold">{detailProduct.Categoria?.Nombre || detailProduct.Categorium?.Nombre || "N/A"}</span></div>
              <div><span className="text-slate-500 font-bold block">Marca:</span> <span className="text-slate-200 font-semibold">{detailProduct.Marca?.Nombre || "N/A"}</span></div>
              <div><span className="text-slate-500 font-bold block">Unidad de Medida:</span> <span className="text-slate-200 font-semibold">{detailProduct.Unidad?.Nombre || "N/A"}</span></div>
              <div><span className="text-slate-500 font-bold block">Ubicación:</span> <span className="text-cyan-400 font-semibold">{detailProduct.Ubicacion ? `${detailProduct.Ubicacion.Almacen?.Nombre || ""} - ${detailProduct.Ubicacion.Descripcion}` : "N/A"}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-emerald-500/30">
              <div><span className="text-slate-500 font-bold block">Precio Compra (Costo):</span> <span className="text-slate-200 font-bold">Bs. {detailProduct.PrecioCompra ? parseFloat(detailProduct.PrecioCompra).toFixed(2) : "0.00"}</span></div>
              <div><span className="text-slate-500 font-bold block">Margen de Ganancia:</span> <span className="text-emerald-400 font-bold">{detailProduct.Margen ? `${detailProduct.Margen}%` : "N/A"}</span></div>
              <div><span className="text-slate-500 font-bold block">Precio Con Factura:</span> <span className="text-cyan-400 font-extrabold text-sm">Bs. {detailProduct.PrecioVenta ? parseFloat(detailProduct.PrecioVenta).toFixed(2) : (detailProduct.Precio ? parseFloat(detailProduct.Precio).toFixed(2) : "0.00")}</span></div>
              <div><span className="text-slate-500 font-bold block">Precio Sin Factura:</span> <span className="text-amber-400 font-extrabold text-sm">Bs. {detailProduct.PrecioSinFactura ? parseFloat(detailProduct.PrecioSinFactura).toFixed(2) : "N/A"}</span></div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2">
              <span className="text-slate-400 font-bold">Stock en Sistema: <span className="text-emerald-400 font-extrabold">{detailProduct.Stock || 0} {detailProduct.Unidad?.Nombre || ""}</span></span>
              <span className="text-slate-400 font-bold">Alerta Stock Mínimo: <span className="text-amber-400 font-extrabold">{detailProduct.LoteMinimo || 5}</span></span>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button onClick={() => setIsDetailModalOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Existencias de Productos (Estilo ERP Avanzado) */}
      {isHistoryModalOpen && historyProduct && (
        <div className="bg-slate-950/85 backdrop-blur-md fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-6xl w-full p-6 space-y-6 shadow-2xl my-8">
            {/* Header del Modal con Selector y Ubicación */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">Historial de existencias de productos</h3>
                <p className="text-xs text-cyan-400 font-semibold mt-1">
                  Ubicación: {historyProduct.Ubicacion ? `${historyProduct.Ubicacion.Almacen?.Nombre || ""} (${historyProduct.Ubicacion.Descripcion})` : "Sin Ubicación Asignada"}
                </p>
              </div>

              {/* Selector Rápido de Producto */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <label className="text-xs font-bold text-slate-400 whitespace-nowrap">Producto:</label>
                <select
                  value={historyProduct.ProductoID}
                  onChange={(e) => {
                    const selProd = products.find(p => p.ProductoID === parseInt(e.target.value));
                    if (selProd) openHistoryModal(selProd);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none focus:border-cyan-500 w-full md:w-72"
                >
                  {products.map((p) => (
                    <option key={p.ProductoID} value={p.ProductoID}>
                      {p.Nombre} ({p.CodigoBarras || `SKU-${p.ProductoID}`})
                    </option>
                  ))}
                </select>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg px-2">✕</button>
              </div>
            </div>

            {/* Tarjetas KPI de Resumen de Cantidades (3 Columnas ERP) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Columna 1: Cantidades En (Ingresos) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-emerald-500/20 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 border-b border-slate-800 pb-1.5 flex justify-between">
                  <span>Cantidades en</span>
                  <span>(Ingresos)</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stock de apertura:</span>
                    <span className="font-bold text-emerald-400">
                      {productLotsHistory.reduce((acc, curr) => acc + (curr.Stock || 0), 0).toFixed(2)} {historyProduct.Unidad?.Nombre || "pza(s)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Compra total:</span>
                    <span className="font-semibold text-slate-400">0.00 {historyProduct.Unidad?.Nombre || "pza(s)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total devolución venta:</span>
                    <span className="font-semibold text-slate-400">0.00 {historyProduct.Unidad?.Nombre || "pza(s)"}</span>
                  </div>
                </div>
              </div>

              {/* Columna 2: Cantidades Fuera (Salidas) */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-rose-500/20 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-400 border-b border-slate-800 pb-1.5 flex justify-between">
                  <span>Cantidades fuera</span>
                  <span>(Salidas)</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total vendido:</span>
                    <span className="font-semibold text-slate-400">0.00 {historyProduct.Unidad?.Nombre || "pza(s)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ajuste total de stock:</span>
                    <span className="font-semibold text-slate-400">0.00 {historyProduct.Unidad?.Nombre || "pza(s)"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total devolución compra:</span>
                    <span className="font-semibold text-slate-400">0.00 {historyProduct.Unidad?.Nombre || "pza(s)"}</span>
                  </div>
                </div>
              </div>

              {/* Columna 3: Totales (Stock Actual Balances) */}
              <div className="bg-gradient-to-br from-cyan-950/40 to-slate-950/80 p-4 rounded-xl border border-cyan-500/30 flex flex-col justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 border-b border-slate-800 pb-1.5">
                  Totales
                </h4>
                <div className="py-2 text-center">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Stock Actual Disponible</div>
                  <div className="text-2xl font-black text-cyan-300 mt-1">
                    {(historyProduct.Stock || 0).toFixed(2)} <span className="text-sm text-cyan-400 font-bold">{historyProduct.Unidad?.Nombre || "pza(s)"}</span>
                  </div>
                </div>
                <div className="text-[10px] text-cyan-400/70 text-center italic">Calculado en tiempo real</div>
              </div>
            </div>

            {/* Tabla de Movimientos y Auditoría de Inventario */}
            <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950 max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Cambio de cantidad</th>
                    <th className="px-4 py-3">Nueva cantidad</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Número de referencia / Nota</th>
                    <th className="px-4 py-3">Cliente / Proveedor</th>
                    <th className="px-4 py-3">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {productLotsHistory.length > 0 ? (
                    (() => {
                      let acumulado = 0;
                      return productLotsHistory.map((l) => {
                        const cambio = parseFloat(l.Stock || 0);
                        acumulado += cambio;

                        return (
                          <tr key={l.LoteID} className="hover:bg-slate-900/50 transition-colors">
                            {/* Tipo de movimiento */}
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-extrabold border border-emerald-500/30">
                                Stock de Apertura
                              </span>
                            </td>

                            {/* Cambio de cantidad (Delta) */}
                            <td className="px-4 py-3 font-extrabold text-emerald-400">
                              +{cambio.toFixed(2)}
                            </td>

                            {/* Nueva cantidad (Running total) */}
                            <td className="px-4 py-3 font-bold text-white">
                              {acumulado.toFixed(2)}
                            </td>

                            {/* Fecha */}
                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                              {l.fecha_creacion ? new Date(l.fecha_creacion).toLocaleString() : "Sin fecha"}
                            </td>

                            {/* Referencia / Nota */}
                            <td className="px-4 py-3 font-medium text-slate-300 max-w-xs truncate">
                              {l.NotaLote || l.NumeroLote || "Stock de apertura"}
                            </td>

                            {/* Cliente / Proveedor */}
                            <td className="px-4 py-3 text-slate-400 italic">
                              -
                            </td>

                            {/* Usuario Operador */}
                            <td className="px-4 py-3 text-slate-300 font-semibold whitespace-nowrap">
                              OSCAR EDGAR CLAROS DAVALOS
                            </td>
                          </tr>
                        );
                      });
                    })()
                  ) : (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-500 italic">
                        No hay movimientos de existencias registrados para este producto aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pie del Modal */}
            <div className="flex justify-between items-center pt-2">
              <div className="text-xs text-slate-400 font-semibold">
                Mostrando {productLotsHistory.length} registros de movimiento
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Añadir Stock de Apertura (Identico al ERP de los Papás con Tabla Verde y Botón Circular +) */}
      {isStockModalOpen && stockProduct && (
        <div className="bg-slate-950/80 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-7xl w-full p-6 space-y-5 shadow-2xl">
            {/* Header del Modal */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-extrabold text-white">Añadir stock de apertura</h3>
                <p className="text-xs text-cyan-400 font-semibold mt-1">
                  Ubicación: {stockProduct.Ubicacion ? `${stockProduct.Ubicacion.Almacen?.Nombre || ""} (${stockProduct.Ubicacion.Descripcion})` : "Sin Ubicación Asignada"}
                </p>
              </div>
              <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4">
              {/* Tabla Verde ERP con Filas Dinámicas */}
              <div className="border border-emerald-500/30 rounded-xl overflow-x-auto bg-slate-950">
                <table className="w-full text-xs text-left min-w-[900px]">
                  <thead className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3 min-w-[150px]">Nombre del producto</th>
                      <th className="px-4 py-3 min-w-[140px]">Cantidad restante</th>
                      <th className="px-4 py-3 min-w-[130px]">Costo unitario (antes de impuestos)</th>
                      <th className="px-4 py-3 min-w-[120px]">Subtotal (antes de impuestos)</th>
                      <th className="px-4 py-3 min-w-[160px]">Fecha Ingreso</th>
                      {Boolean(stockProduct.ManejaCaducidad) && (
                        <th className="px-4 py-3 min-w-[160px]">Fecha Caducidad</th>
                      )}
                      <th className="px-4 py-3 min-w-[240px]">Nota / Lote</th>
                      <th className="px-2 py-3 text-center min-w-[70px]">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {stockRows.map((row, idx) => {
                      const cant = parseFloat(row.cantidad) || 0;
                      const cst = parseFloat(row.costo) || 0;
                      const subtotal = (cant * cst).toFixed(2);

                      return (
                        <tr key={row.id} className={`transition-colors ${row.isRegistered ? 'bg-slate-950/60' : 'hover:bg-slate-900/50'}`}>
                          {/* Nombre del Producto */}
                          <td className="px-4 py-3 font-bold text-white max-w-xs truncate">
                            {stockProduct.Nombre}
                            {row.isRegistered && (
                              <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 font-extrabold rounded">
                                Registrado
                              </span>
                            )}
                          </td>

                          {/* Cantidad + Badge de Unidad */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                                value={row.cantidad}
                                disabled={row.isRegistered}
                                onChange={(e) => handleStockRowChange(row.id, "cantidad", e.target.value)}
                                className={`w-20 border rounded-lg px-2.5 py-1.5 text-xs font-extrabold outline-none ${
                                  row.isRegistered
                                    ? 'bg-slate-950 border-slate-800 text-emerald-500/80 cursor-not-allowed'
                                    : 'bg-slate-900 border-slate-800 text-emerald-400 focus:border-emerald-500'
                                }`}
                                required={!row.isRegistered}
                              />
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                                {stockProduct.Unidad?.Nombre || "pza(s)"}
                              </span>
                            </div>
                          </td>

                          {/* Costo Unitario */}
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={row.costo}
                              disabled={row.isRegistered}
                              onChange={(e) => handleStockRowChange(row.id, "costo", e.target.value)}
                              className={`w-24 border rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none ${
                                row.isRegistered
                                  ? 'bg-slate-950 border-slate-800 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-900 border-slate-800 text-white focus:border-cyan-500'
                              }`}
                            />
                          </td>

                          {/* Subtotal Calculado */}
                          <td className="px-4 py-3 font-extrabold text-cyan-400 text-sm whitespace-nowrap">
                            Bs. {subtotal}
                          </td>

                          {/* Fecha Ingreso */}
                          <td className="px-4 py-3">
                            <input
                              type="datetime-local"
                              value={row.fecha}
                              disabled={row.isRegistered}
                              required={!row.isRegistered}
                              onChange={(e) => handleStockRowChange(row.id, "fecha", e.target.value)}
                              className={`border rounded-lg px-2 py-1.5 text-xs outline-none w-full ${
                                row.isRegistered
                                  ? 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 focus:border-cyan-500'
                              }`}
                            />
                          </td>

                          {/* Fecha de Caducidad / Vencimiento (Solo si el producto maneja caducidad) */}
                          {Boolean(stockProduct.ManejaCaducidad) && (
                            <td className="px-4 py-3">
                              <input
                                type="date"
                                value={row.fechaVencimiento}
                                disabled={row.isRegistered}
                                required={!row.isRegistered}
                                min={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => handleStockRowChange(row.id, "fechaVencimiento", e.target.value)}
                                placeholder="YYYY-MM-DD"
                                className={`border rounded-lg px-2 py-1.5 text-xs outline-none w-full font-semibold ${
                                  row.isRegistered
                                    ? 'bg-slate-950 border-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 focus:border-cyan-500'
                                }`}
                              />
                            </td>
                          )}

                          {/* Nota / Observación */}
                          <td className="px-4 py-3">
                            <textarea
                              rows="2"
                              placeholder="Nota de apertura..."
                              value={row.nota}
                              disabled={row.isRegistered}
                              onChange={(e) => handleStockRowChange(row.id, "nota", e.target.value)}
                              className={`w-full border rounded-lg p-2 text-xs outline-none resize-y ${
                                row.isRegistered
                                  ? 'bg-slate-950 border-slate-800 text-slate-400 cursor-not-allowed'
                                  : 'bg-slate-900 border-slate-800 text-slate-300'
                              }`}
                            />
                          </td>

                          {/* Acciones: + para la última fila, ✕ para eliminar filas no guardadas */}
                          <td className="px-2 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {idx === stockRows.length - 1 && (
                                <button
                                  type="button"
                                  onClick={addStockRow}
                                  className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold flex items-center justify-center shadow-md shadow-blue-600/30 transition-transform active:scale-95"
                                  title="Agregar otra fila para ingresar nuevo stock"
                                >
                                  +
                                </button>
                              )}
                              {!row.isRegistered && stockRows.filter(r => !r.isRegistered).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeStockRow(row.id)}
                                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white font-bold flex items-center justify-center transition-colors text-xs"
                                  title="Quitar este renglón nuevo"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Importe Total en el Pie de la Tabla */}
                <div className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-center items-center">
                  <span className="text-xs font-extrabold text-slate-300">
                    Importe total:{" "}
                    <span className="text-emerald-400 text-sm ml-2">
                      Bs.{" "}
                      {stockRows
                        .reduce((sum, r) => sum + (parseFloat(r.cantidad) || 0) * (parseFloat(r.costo) || 0), 0)
                        .toFixed(2)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Botones de Acción al Pie del Modal */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition-all"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Cerrar
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
              ¿Deseas eliminar el producto <span className="font-bold text-white">"{productToDelete?.Nombre}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification flotante en la esquina superior derecha (Homologado) */}
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

export default ProductView;
