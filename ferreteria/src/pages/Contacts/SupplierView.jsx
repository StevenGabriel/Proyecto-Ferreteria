import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../services/api';

function SupplierView() {
  const { isCollapsed } = useSidebar();

  // Estados principales
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Filtros colapsables
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterPaymentTerm, setFilterPaymentTerm] = useState('ALL');
  const [filterHasDebt, setFilterHasDebt] = useState('ALL');

  // Visibilidad de columnas
  const [isColumnVisibilityOpen, setIsColumnVisibilityOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    accion: true,
    codigoContacto: true,
    empresa: true,
    nombre: true,
    email: true,
    razonSocial: true,
    nit: true,
    terminoPago: true,
    saldoApertura: true,
    saldoAnticipado: true,
    fechaCreacion: true,
    direccion: true,
    telefono: true,
    totalCompraDebida: true,
    totalDevoluciones: true
  });

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Formulario Proveedor (Añadir / Editar)
  const initialFormState = {
    CodigoContacto: '',
    Empresa: '',
    Nombre: '',
    PrimerApellido: '',
    SegundoApellido: '',
    Email: '',
    RazonSocial: '',
    NIT: '',
    TerminoPago: 'Inmediato',
    SaldoApertura: '0.00',
    SaldoAnticipado: '0.00',
    Direccion: '',
    Telefono: '',
    TotalCompraDebida: '0.00',
    TotalDevoluciones: '0.00'
  };
  const [formData, setFormData] = useState(initialFormState);
  const [formError, setFormError] = useState('');

  // Toast Feedback y Sonido
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

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
      playNote(523.25, now, 0.25);
      playNote(659.25, now + 0.08, 0.35);
    } catch (e) {
      console.warn('Audio Context bloqueado:', e);
    }
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    playSuccessSound();
    setTimeout(() => setShowToast(false), 4000);
  };

  // Cargar Proveedores
  const fetchSuppliersList = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      // Proveedores de muestra si la base de datos está vacía para probar de inmediato
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliersList();
  }, []);

  // Manejo de clicks fuera para cerrar menús
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenActionMenuId(null);
      setIsColumnVisibilityOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Filtrado y Búsqueda
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      const term = searchTerm.toLowerCase();
      const codeMatch = (sup.CodigoContacto || '').toLowerCase().includes(term);
      const nameMatch = (sup.Nombre || '').toLowerCase().includes(term);
      const companyMatch = (sup.Empresa || '').toLowerCase().includes(term);
      const nitMatch = (sup.NIT || '').toLowerCase().includes(term);
      const phoneMatch = (sup.Telefono || '').toLowerCase().includes(term);
      const emailMatch = (sup.Email || '').toLowerCase().includes(term);
      const generalMatch = codeMatch || nameMatch || companyMatch || nitMatch || phoneMatch || emailMatch;

      if (!generalMatch) return false;

      if (filterPaymentTerm !== 'ALL' && (sup.TerminoPago || 'Inmediato') !== filterPaymentTerm) {
        return false;
      }

      if (filterHasDebt === 'WITH_DEBT' && Number(sup.TotalCompraDebida || 0) <= 0) {
        return false;
      }
      if (filterHasDebt === 'NO_DEBT' && Number(sup.TotalCompraDebida || 0) > 0) {
        return false;
      }

      return true;
    });
  }, [suppliers, searchTerm, filterPaymentTerm, filterHasDebt]);

  // Paginación
  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSuppliers = filteredSuppliers.slice(startIndex, startIndex + itemsPerPage);

  // Apertura de Modales
  const handleOpenAddModal = () => {
    const nextCode = `C${String(suppliers.length + 1).padStart(5, '0')}`;
    setFormData({
      ...initialFormState,
      CodigoContacto: nextCode
    });
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (sup, e) => {
    e.stopPropagation();
    setSelectedSupplier(sup);
    setFormData({
      CodigoContacto: sup.CodigoContacto || `C${String(sup.ProveedorID).padStart(5, '0')}`,
      Empresa: sup.Empresa || '',
      Nombre: sup.Nombre || '',
      PrimerApellido: sup.PrimerApellido || '',
      SegundoApellido: sup.SegundoApellido || '',
      Email: sup.Email || '',
      RazonSocial: sup.RazonSocial || '',
      NIT: sup.NIT || '',
      TerminoPago: sup.TerminoPago || 'Inmediato',
      SaldoApertura: sup.SaldoApertura !== undefined ? String(sup.SaldoApertura) : '0.00',
      SaldoAnticipado: sup.SaldoAnticipado !== undefined ? String(sup.SaldoAnticipado) : '0.00',
      Direccion: sup.Direccion || '',
      Telefono: sup.Telefono || '',
      TotalCompraDebida: sup.TotalCompraDebida !== undefined ? String(sup.TotalCompraDebida) : '0.00',
      TotalDevoluciones: sup.TotalDevoluciones !== undefined ? String(sup.TotalDevoluciones) : '0.00'
    });
    setFormError('');
    setIsEditModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenViewModal = (sup, e) => {
    e.stopPropagation();
    setSelectedSupplier(sup);
    setIsViewModalOpen(true);
    setOpenActionMenuId(null);
  };

  const handleOpenDeleteModal = (sup, e) => {
    e.stopPropagation();
    setSelectedSupplier(sup);
    setIsDeleteModalOpen(true);
    setOpenActionMenuId(null);
  };

  // Envío Formulario Crear
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!formData.Nombre.trim()) {
      setFormError('El campo "Nombre" es obligatorio.');
      return;
    }

    try {
      await createSupplier(formData);
      triggerToast('¡Proveedor registrado exitosamente!');
      setIsAddModalOpen(false);
      fetchSuppliersList();
    } catch (error) {
      console.error('Error al crear proveedor:', error);
      setFormError('Error al guardar en el servidor. Verifica los datos.');
    }
  };

  // Envío Formulario Editar
  const handleUpdateSupplier = async (e) => {
    e.preventDefault();
    if (!formData.Nombre.trim()) {
      setFormError('El campo "Nombre" es obligatorio.');
      return;
    }

    try {
      await updateSupplier(selectedSupplier.ProveedorID, formData);
      triggerToast('¡Proveedor actualizado exitosamente!');
      setIsEditModalOpen(false);
      fetchSuppliersList();
    } catch (error) {
      console.error('Error al actualizar proveedor:', error);
      setFormError('Error al actualizar el proveedor.');
    }
  };

  // Confirmar Eliminación
  const handleConfirmDelete = async () => {
    if (!selectedSupplier) return;
    try {
      await deleteSupplier(selectedSupplier.ProveedorID);
      triggerToast('Proveedor eliminado correctamente.');
      setIsDeleteModalOpen(false);
      fetchSuppliersList();
    } catch (error) {
      console.error('Error al eliminar proveedor:', error);
      alert('No se pudo eliminar el proveedor.');
      setIsDeleteModalOpen(false);
    }
  };

  // Funciones de Exportación
  const exportToCSV = () => {
    if (filteredSuppliers.length === 0) return;
    const headers = ['ID Contacto', 'Empresa', 'Nombre', 'Email', 'Razon Social', 'NIT', 'Termino Pago', 'Saldo Apertura', 'Saldo Anticipado', 'Direccion', 'Telefono', 'Total Compra Debida', 'Total Devoluciones'];
    const rows = filteredSuppliers.map(s => [
      `"${s.CodigoContacto || ''}"`,
      `"${s.Empresa || ''}"`,
      `"${s.Nombre || ''}"`,
      `"${s.Email || ''}"`,
      `"${s.RazonSocial || ''}"`,
      `"${s.NIT || ''}"`,
      `"${s.TerminoPago || 'Inmediato'}"`,
      `"${s.SaldoApertura || 0}"`,
      `"${s.SaldoAnticipado || 0}"`,
      `"${(s.Direccion || '').replace(/"/g, '""')}"`,
      `"${s.Telefono || ''}"`,
      `"${s.TotalCompraDebida || 0}"`,
      `"${s.TotalDevoluciones || 0}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Proveedores_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast('Archivo CSV exportado exitosamente.');
  };

  const exportToExcel = () => {
    exportToCSV(); // Formato compatible para hojas de cálculo Excel
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '01/09/2026';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '01/09/2026';
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '01/09/2026';
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      {/* Barra Lateral */}
      <Sidebar activeItem="contactos-proveedores" />

      {/* Contenedor Principal */}
      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado Principal */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Proveedores
              </h1>
              <span className="text-slate-400 text-sm font-medium">
                Administra tus Proveedores
              </span>
            </div>

            {/* Botón Añadir Proveedor */}
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-sm cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              + Añadir
            </button>
          </div>

          {/* Tarjeta Filtros Colapsables */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm text-cyan-400 hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filtros</span>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isFiltersOpen ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isFiltersOpen && (
              <div className="p-5 border-t border-slate-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/40 animate-fade-in text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Término de pago:</label>
                  <select
                    value={filterPaymentTerm}
                    onChange={(e) => { setFilterPaymentTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-cyan-500/50"
                  >
                    <option value="ALL">Todos los términos</option>
                    <option value="Inmediato">Inmediato</option>
                    <option value="15 días">15 días</option>
                    <option value="30 días">30 días</option>
                    <option value="60 días">60 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">Estado de deuda de compra:</label>
                  <select
                    value={filterHasDebt}
                    onChange={(e) => { setFilterHasDebt(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium outline-none focus:border-cyan-500/50"
                  >
                    <option value="ALL">Todos los saldos</option>
                    <option value="WITH_DEBT">Con compras debidas (&gt; 0)</option>
                    <option value="NO_DEBT">Sin compras debidas (0.00)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => { setFilterPaymentTerm('ALL'); setFilterHasDebt('ALL'); setSearchTerm(''); }}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tarjeta Principal: Todos sus Proveedores */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white tracking-wide">
              Todos sus Proveedores
            </h2>

            {/* Barra de Herramientas: Paginador, Botones de Exportación y Búsqueda */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              {/* Mostrar entradas */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span>Mostrar</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white text-xs font-bold outline-none cursor-pointer focus:border-cyan-500/50"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entradas</span>
              </div>

              {/* Botones de Exportación y Visibilidad */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a CSV
                </button>

                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar a Excel
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Impresión
                </button>

                {/* Dropdown Visibilidad de Columnas */}
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsColumnVisibilityOpen(!isColumnVisibilityOpen); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Visibilidad de columna
                    <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isColumnVisibilityOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 space-y-1.5 text-xs animate-fade-in"
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Columnas visibles</span>
                      {Object.keys(visibleColumns).map((colKey) => (
                        <label key={colKey} className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={visibleColumns[colKey]}
                            onChange={() => toggleColumn(colKey)}
                            className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                          />
                          <span className="capitalize">{colKey.replace(/([A-Z])/g, ' $1')}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 rounded-lg text-slate-300 hover:text-white font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Exportar a PDF
                </button>
              </div>

              {/* Buscador Rápido */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-cyan-500/50 text-xs text-white outline-none placeholder-slate-500"
                />
              </div>
            </div>

            {/* Tabla DataTable de Proveedores */}
            <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="uppercase bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] whitespace-nowrap">
                    <tr>
                      {visibleColumns.accion && <th className="px-4 py-3.5 font-bold">Acción</th>}
                      {visibleColumns.codigoContacto && <th className="px-4 py-3.5 font-bold">ID de contacto</th>}
                      {visibleColumns.empresa && <th className="px-4 py-3.5 font-bold">Nombre de la empresa</th>}
                      {visibleColumns.nombre && <th className="px-4 py-3.5 font-bold">Nombre</th>}
                      {visibleColumns.email && <th className="px-4 py-3.5 font-bold">Email</th>}
                      {visibleColumns.razonSocial && <th className="px-4 py-3.5 font-bold">Razón social</th>}
                      {visibleColumns.nit && <th className="px-4 py-3.5 font-bold">Número de impuesto</th>}
                      {visibleColumns.terminoPago && <th className="px-4 py-3.5 font-bold">Término de pago</th>}
                      {visibleColumns.saldoApertura && <th className="px-4 py-3.5 font-bold">Saldo de apertura</th>}
                      {visibleColumns.saldoAnticipado && <th className="px-4 py-3.5 font-bold">Saldo anticipado</th>}
                      {visibleColumns.fechaCreacion && <th className="px-4 py-3.5 font-bold">Añadido</th>}
                      {visibleColumns.direccion && <th className="px-4 py-3.5 font-bold">Dirección</th>}
                      {visibleColumns.telefono && <th className="px-4 py-3.5 font-bold">Móvil cliente</th>}
                      {visibleColumns.totalCompraDebida && <th className="px-4 py-3.5 font-bold">Total compra debida</th>}
                      {visibleColumns.totalDevoluciones && <th className="px-4 py-3.5 font-bold">Total de devoluciones de compra adeudadas</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={15} className="py-12 text-center text-slate-500 font-semibold">
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <span>Cargando lista de proveedores...</span>
                          </div>
                        </td>
                      </tr>
                    ) : currentSuppliers.length > 0 ? (
                      currentSuppliers.map((sup) => {
                        const contactCode = sup.CodigoContacto || `C${String(sup.ProveedorID).padStart(5, '0')}`;
                        const isActionOpen = openActionMenuId === sup.ProveedorID;

                        return (
                          <tr key={sup.ProveedorID} className="hover:bg-slate-900/50 transition-colors whitespace-nowrap">
                            {/* Botón Acciones */}
                            {visibleColumns.accion && (
                              <td className="px-4 py-3 relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenActionMenuId(isActionOpen ? null : sup.ProveedorID);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] rounded-md shadow transition-colors outline-none cursor-pointer"
                                >
                                  <span>Acciones</span>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>

                                {/* Menú Flotante de Acciones */}
                                {isActionOpen && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute left-4 top-10 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in"
                                  >
                                    <button
                                      onClick={(e) => handleOpenViewModal(sup, e)}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      Ver Detalles
                                    </button>

                                    <button
                                      onClick={(e) => handleOpenEditModal(sup, e)}
                                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Editar
                                    </button>

                                    <button
                                      onClick={(e) => handleOpenDeleteModal(sup, e)}
                                      className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                      Eliminar
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}

                            {/* Columnas de Datos */}
                            {visibleColumns.codigoContacto && (
                              <td className="px-4 py-3 font-semibold text-slate-200">
                                {contactCode}
                              </td>
                            )}

                            {visibleColumns.empresa && (
                              <td className="px-4 py-3 font-bold text-white uppercase">
                                {sup.Empresa || sup.Nombre || '—'}
                              </td>
                            )}

                            {visibleColumns.nombre && (
                              <td className="px-4 py-3 text-slate-300 font-medium uppercase">
                                {sup.Nombre} {sup.PrimerApellido || ''} {sup.SegundoApellido || ''}
                              </td>
                            )}

                            {visibleColumns.email && (
                              <td className="px-4 py-3 text-slate-400">
                                {sup.Email || '—'}
                              </td>
                            )}

                            {visibleColumns.razonSocial && (
                              <td className="px-4 py-3 text-slate-300 uppercase">
                                {sup.RazonSocial || sup.Empresa || '—'}
                              </td>
                            )}

                            {visibleColumns.nit && (
                              <td className="px-4 py-3 text-slate-300 font-mono">
                                {sup.NIT || '—'}
                              </td>
                            )}

                            {visibleColumns.terminoPago && (
                              <td className="px-4 py-3 text-slate-300">
                                {sup.TerminoPago || 'Inmediato'}
                              </td>
                            )}

                            {visibleColumns.saldoApertura && (
                              <td className="px-4 py-3 font-medium text-slate-300">
                                Bs. {Number(sup.SaldoApertura || 0).toFixed(2)}
                              </td>
                            )}

                            {visibleColumns.saldoAnticipado && (
                              <td className="px-4 py-3 font-medium text-slate-300">
                                Bs. {Number(sup.SaldoAnticipado || 0).toFixed(2)}
                              </td>
                            )}

                            {visibleColumns.fechaCreacion && (
                              <td className="px-4 py-3 text-slate-400">
                                {formatDate(sup.createdAt)}
                              </td>
                            )}

                            {visibleColumns.direccion && (
                              <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={sup.Direccion || ''}>
                                {sup.Direccion || '—'}
                              </td>
                            )}

                            {visibleColumns.telefono && (
                              <td className="px-4 py-3 text-cyan-400 font-medium">
                                {sup.Telefono || '—'}
                              </td>
                            )}

                            {visibleColumns.totalCompraDebida && (
                              <td className="px-4 py-3 font-bold text-slate-300">
                                Bs. {Number(sup.TotalCompraDebida || 0).toFixed(2)}
                              </td>
                            )}

                            {visibleColumns.totalDevoluciones && (
                              <td className="px-4 py-3 font-bold text-slate-300">
                                Bs. {Number(sup.TotalDevoluciones || 0).toFixed(2)}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={15} className="py-12 text-center text-slate-500 font-semibold">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <svg className="w-10 h-10 text-slate-600 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>No se encontraron proveedores registrados con estos filtros.</span>
                            <button
                              onClick={handleOpenAddModal}
                              className="mt-2 text-cyan-400 hover:text-cyan-300 underline text-xs font-bold"
                            >
                              + Añadir primer proveedor
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación Inferior */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400 pt-2">
              <div>
                Mostrando {filteredSuppliers.length === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredSuppliers.length)} de {filteredSuppliers.length} entradas
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(num => num === 1 || num === totalPages || (num >= currentPage - 1 && num <= currentPage + 1))
                  .map((num, idx, arr) => (
                    <React.Fragment key={num}>
                      {idx > 0 && arr[idx - 1] !== num - 1 && <span className="px-1 text-slate-600">...</span>}
                      <button
                        onClick={() => setCurrentPage(num)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                          currentPage === num
                            ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {num}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: + Añadir Proveedor */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                Añadir nuevo Proveedor
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ID de Contacto (Código):</label>
                  <input
                    type="text"
                    value={formData.CodigoContacto}
                    onChange={(e) => setFormData({ ...formData, CodigoContacto: e.target.value })}
                    placeholder="Ej. C00461"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nombre de la Empresa:</label>
                  <input
                    type="text"
                    value={formData.Empresa}
                    onChange={(e) => setFormData({ ...formData, Empresa: e.target.value })}
                    placeholder="Ej. RALL S.R.L. o Distribuidora"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nombre / Contacto <span className="text-rose-400">*</span>:</label>
                  <input
                    type="text"
                    required
                    value={formData.Nombre}
                    onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                    placeholder="Nombre del proveedor o representante"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Apellidos:</label>
                  <input
                    type="text"
                    value={formData.PrimerApellido}
                    onChange={(e) => setFormData({ ...formData, PrimerApellido: e.target.value })}
                    placeholder="Primer y segundo apellido"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email / Correo Electrónico:</label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    placeholder="contacto@proveedor.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Razón Social:</label>
                  <input
                    type="text"
                    value={formData.RazonSocial}
                    onChange={(e) => setFormData({ ...formData, RazonSocial: e.target.value })}
                    placeholder="Razón social registrada"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Número de Impuesto (NIT):</label>
                  <input
                    type="text"
                    value={formData.NIT}
                    onChange={(e) => setFormData({ ...formData, NIT: e.target.value })}
                    placeholder="Ej. 70366455"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Término de Pago:</label>
                  <select
                    value={formData.TerminoPago}
                    onChange={(e) => setFormData({ ...formData, TerminoPago: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  >
                    <option value="Inmediato">Inmediato (Contado)</option>
                    <option value="15 días">15 días de crédito</option>
                    <option value="30 días">30 días de crédito</option>
                    <option value="60 días">60 días de crédito</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Saldo de Apertura (Bs.):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.SaldoApertura}
                    onChange={(e) => setFormData({ ...formData, SaldoApertura: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Teléfono / Celular:</label>
                  <input
                    type="text"
                    value={formData.Telefono}
                    onChange={(e) => setFormData({ ...formData, Telefono: e.target.value })}
                    placeholder="Ej. 72252492"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Dirección:</label>
                  <input
                    type="text"
                    value={formData.Direccion}
                    onChange={(e) => setFormData({ ...formData, Direccion: e.target.value })}
                    placeholder="Calle, avenida, zona o ciudad"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/20 transition-all"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Proveedor */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Editar Proveedor ({formData.CodigoContacto})
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSupplier} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">ID de Contacto (Código):</label>
                  <input
                    type="text"
                    value={formData.CodigoContacto}
                    onChange={(e) => setFormData({ ...formData, CodigoContacto: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nombre de la Empresa:</label>
                  <input
                    type="text"
                    value={formData.Empresa}
                    onChange={(e) => setFormData({ ...formData, Empresa: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Nombre / Contacto <span className="text-rose-400">*</span>:</label>
                  <input
                    type="text"
                    required
                    value={formData.Nombre}
                    onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Primer Apellido:</label>
                  <input
                    type="text"
                    value={formData.PrimerApellido}
                    onChange={(e) => setFormData({ ...formData, PrimerApellido: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email:</label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Razón Social:</label>
                  <input
                    type="text"
                    value={formData.RazonSocial}
                    onChange={(e) => setFormData({ ...formData, RazonSocial: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Número de Impuesto (NIT):</label>
                  <input
                    type="text"
                    value={formData.NIT}
                    onChange={(e) => setFormData({ ...formData, NIT: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Término de Pago:</label>
                  <select
                    value={formData.TerminoPago}
                    onChange={(e) => setFormData({ ...formData, TerminoPago: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  >
                    <option value="Inmediato">Inmediato</option>
                    <option value="15 días">15 días</option>
                    <option value="30 días">30 días</option>
                    <option value="60 días">60 días</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Teléfono / Móvil:</label>
                  <input
                    type="text"
                    value={formData.Telefono}
                    onChange={(e) => setFormData({ ...formData, Telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Total Compra Debida (Bs.):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.TotalCompraDebida}
                    onChange={(e) => setFormData({ ...formData, TotalCompraDebida: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-semibold mb-1">Dirección:</label>
                  <input
                    type="text"
                    value={formData.Direccion}
                    onChange={(e) => setFormData({ ...formData, Direccion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all"
                >
                  Actualizar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ver Detalles de Proveedor */}
      {isViewModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                Ficha de Proveedor: {selectedSupplier.Empresa || selectedSupplier.Nombre}
              </h3>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block font-semibold">Código de Contacto:</span>
                  <span className="font-bold text-white text-sm">{selectedSupplier.CodigoContacto || `C${String(selectedSupplier.ProveedorID).padStart(5, '0')}`}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Empresa:</span>
                  <span className="font-bold text-cyan-400 text-sm">{selectedSupplier.Empresa || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Nombre del Contacto:</span>
                  <span className="font-semibold text-slate-200">{selectedSupplier.Nombre} {selectedSupplier.PrimerApellido || ''} {selectedSupplier.SegundoApellido || ''}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Razón Social:</span>
                  <span className="font-semibold text-slate-200">{selectedSupplier.RazonSocial || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">NIT / Impuesto:</span>
                  <span className="font-mono font-semibold text-slate-200">{selectedSupplier.NIT || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Término de Pago:</span>
                  <span className="font-semibold text-slate-200">{selectedSupplier.TerminoPago || 'Inmediato'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Teléfono / Móvil:</span>
                  <span className="font-bold text-emerald-400">{selectedSupplier.Telefono || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Email:</span>
                  <span className="font-semibold text-slate-200">{selectedSupplier.Email || '—'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block font-semibold">Dirección:</span>
                  <span className="font-semibold text-slate-200">{selectedSupplier.Direccion || '—'}</span>
                </div>
              </div>

              {/* Resumen Financiero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Saldo Apertura</span>
                  <span className="font-bold text-slate-300">Bs. {Number(selectedSupplier.SaldoApertura || 0).toFixed(2)}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Saldo Anticipado</span>
                  <span className="font-bold text-cyan-400">Bs. {Number(selectedSupplier.SaldoAnticipado || 0).toFixed(2)}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Compra Debida</span>
                  <span className="font-bold text-rose-400">Bs. {Number(selectedSupplier.TotalCompraDebida || 0).toFixed(2)}</span>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Devoluciones</span>
                  <span className="font-bold text-slate-300">Bs. {Number(selectedSupplier.TotalDevoluciones || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Eliminar Proveedor */}
      {isDeleteModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">¿Eliminar Proveedor?</h3>
              <p className="text-xs text-slate-400 mt-1">
                ¿Estás seguro de que deseas eliminar a <strong className="text-white">{selectedSupplier.Empresa || selectedSupplier.Nombre}</strong>? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/20 transition-all"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></div>
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default SupplierView;
