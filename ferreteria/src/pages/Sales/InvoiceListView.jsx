import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';
import { getInvoices, voidInvoice } from '../../services/api';
import { generateInvoicePdf, generateInvoiceTicketPdf } from '../../utils/invoicePdfGenerator';

function InvoiceListView() {
  const { isCollapsed } = useSidebar();

  // Estados de datos
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('ALL');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modales
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('Error en emisión de datos');
  const [voidingLoading, setVoidingLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 3500);
  };

  // Cargar facturas desde backend
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fechaInicio) params.fechaInicio = fechaInicio;
      if (fechaFin) params.fechaFin = fechaFin;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      if (filterEstado !== 'ALL') params.estado = filterEstado;

      const data = await getInvoices(params);
      if (data && Array.isArray(data.facturas)) {
        setInvoices(data.facturas);
      } else if (Array.isArray(data)) {
        setInvoices(data);
      }
    } catch (err) {
      console.error('Error al cargar facturas:', err);
      showToast('No se pudieron cargar las facturas del servidor.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInvoices();
  };

  const handleResetFilters = () => {
    setFechaInicio('');
    setFechaFin('');
    setSearchTerm('');
    setFilterEstado('ALL');
    setCurrentPage(1);
    setTimeout(() => {
      getInvoices().then((data) => {
        if (data && Array.isArray(data.facturas)) setInvoices(data.facturas);
      });
    }, 50);
  };

  // Acciones: Imprimir Hoja Carta (PDF Oficial)
  const handlePrintLetter = async (inv) => {
    try {
      showToast(`Generando Factura Carta No. ${inv.numeroFactura}...`, 'info');
      await generateInvoicePdf({
        ...inv,
        id: inv.numeroFactura,
        time: inv.fechaEmision,
        isInvoice: true
      }, { openInTab: true, download: false });
      showToast('Documento PDF abierto para impresión', 'success');
    } catch (err) {
      console.error('Error al imprimir factura carta:', err);
      showToast('Error al generar la factura en PDF', 'error');
    }
  };

  // Acciones: Imprimir Ticket Térmico 80mm
  const handlePrintTicket = async (inv) => {
    try {
      showToast(`Generando Ticket Térmico No. ${inv.numeroFactura}...`, 'info');
      await generateInvoiceTicketPdf({
        ...inv,
        id: inv.numeroFactura,
        time: inv.fechaEmision,
        isInvoice: true
      }, { openInTab: true, download: false });
      showToast('Ticket térmico generado para impresión', 'success');
    } catch (err) {
      console.error('Error al imprimir ticket:', err);
      showToast('Error al generar el ticket térmico', 'error');
    }
  };

  // Acciones: Abrir modal para anular factura
  const handleOpenVoidModal = (inv) => {
    setSelectedInvoice(inv);
    setVoidReason('Error en datos del cliente o emisión');
    setShowVoidModal(true);
  };

  // Confirmar Anulación
  const handleConfirmVoid = async () => {
    if (!selectedInvoice) return;
    setVoidingLoading(true);
    try {
      await voidInvoice(selectedInvoice.ventaID, { motivo: voidReason });
      showToast(`Factura No. ${selectedInvoice.numeroFactura} anulada exitosamente`, 'success');
      setShowVoidModal(false);
      fetchInvoices();
    } catch (err) {
      console.error('Error al anular factura:', err);
      showToast('No se pudo anular la factura', 'error');
    } finally {
      setVoidingLoading(false);
    }
  };

  // Ver detalles completos
  const handleViewDetails = (inv) => {
    setSelectedInvoice(inv);
    setShowDetailModal(true);
  };

  // Copiar CUF al portapapeles
  const handleCopyCUF = (cuf) => {
    navigator.clipboard.writeText(cuf);
    showToast('Código de Autorización (CUF) copiado al portapapeles', 'success');
  };

  // Totales y estadísticas
  const totalFacturado = useMemo(() => {
    return invoices
      .filter((inv) => inv.estado === 'Emitida')
      .reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [invoices]);

  const totalImpuesto = useMemo(() => {
    return totalFacturado * 0.13;
  }, [totalFacturado]);

  const countEmitidas = useMemo(() => {
    return invoices.filter((inv) => inv.estado === 'Emitida').length;
  }, [invoices]);

  const countAnuladas = useMemo(() => {
    return invoices.filter((inv) => inv.estado === 'Anulada').length;
  }, [invoices]);

  // Paginación
  const totalPages = Math.ceil(invoices.length / itemsPerPage) || 1;
  const currentInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return invoices.slice(start, start + itemsPerPage);
  }, [invoices, currentPage, itemsPerPage]);

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Toast Notificación */}
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold border transition-all duration-300 animate-slide-in-right flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
              : toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-300 border-rose-500/50 shadow-rose-950/50'
              : 'bg-cyan-950/95 text-cyan-300 border-cyan-500/50 shadow-cyan-950/50'
          }`}
        >
          <span>
            {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Barra Lateral */}
      <Sidebar />

      {/* Contenido Principal */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Topbar />

        <div className="p-4 sm:p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* 1. Cabecera Principal */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Listado de Facturas
                  </h1>
                  <p className="text-xs text-slate-400 font-medium">
                    Consulta, reimpresión en hoja carta u 80mm térmico y anulación de comprobantes
                  </p>
                </div>
              </div>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Emitidas</span>
                <span className="text-emerald-400 font-black font-mono text-sm">{countEmitidas}</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Anuladas</span>
                <span className="text-rose-400 font-black font-mono text-sm">{countAnuladas}</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-950/80 to-cyan-950/80 border border-cyan-500/40 text-xs">
                <span className="text-cyan-300 block text-[10px] uppercase font-bold">Total Facturado</span>
                <span className="text-white font-black font-mono text-sm">Bs. {totalFacturado.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 2. Barra de Filtros y Búsqueda */}
          <form onSubmit={handleSearchSubmit} className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800/80 space-y-3 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Fecha Inicio */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Fecha Inicio:</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 transition-all font-mono"
                />
              </div>

              {/* Fecha Fin */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Fecha Fin:</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 transition-all font-mono"
                />
              </div>

              {/* Buscador */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Búsqueda rápida:</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Número de factura, Cliente, NIT/CI, CUF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition-all font-medium"
                  />
                  <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Estado:</label>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400 transition-all font-semibold"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="EMITIDA">Emitidas</option>
                  <option value="ANULADA">Anuladas</option>
                </select>
              </div>
            </div>

            {/* Botones de Filtro */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-400 font-medium">
                Mostrando <strong className="text-white">{invoices.length}</strong> facturas encontradas
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Limpiar</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Buscar</span>
                </button>
              </div>
            </div>
          </form>

          {/* 3. Listado de Facturas (Cards en Formato Exacto) */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-16 text-center text-slate-400 space-y-3 bg-slate-900/40 rounded-2xl border border-slate-800">
                <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-bold text-slate-200">Cargando listado de facturas...</p>
              </div>
            ) : currentInvoices.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2 bg-slate-900/40 rounded-2xl border border-slate-800">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-xl text-slate-500">
                  📄
                </div>
                <p className="text-base font-bold text-slate-300">No se encontraron facturas</p>
                <p className="text-xs text-slate-500">Intente modificar los filtros de fecha o búsqueda</p>
              </div>
            ) : (
              currentInvoices.map((inv) => {
                const isVoided = inv.estado === 'Anulada';

                return (
                  <div
                    key={inv.id || inv.ventaID}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isVoided
                        ? 'bg-slate-950/60 border-rose-900/30 opacity-75'
                        : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/90 shadow-lg'
                    }`}
                  >
                    {/* Bloque Izquierdo: Metadatos de la Factura */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {/* Fila 1: Ver Detalle, ID, Factura Nro */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(inv)}
                          className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>👁️</span>
                          <span className="underline">Ver Detalle</span>
                        </button>

                        <span className="text-slate-500 font-mono text-xs">
                          ID: <strong className="text-slate-300">{inv.facturaID || inv.ventaID}</strong>
                        </span>

                        <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-extrabold font-mono tracking-wide">
                          Factura Nro: {inv.numeroFactura}
                        </span>

                        {/* Badge de Estado */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            isVoided
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {inv.estado}
                        </span>
                      </div>

                      {/* Fila 2: Cliente y Sucursal */}
                      <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                        <div>
                          <span className="text-slate-500 font-semibold">Cliente: </span>
                          <strong className="text-white uppercase">{inv.cliente || 'CLIENTE GENERAL'}</strong>
                          {inv.nit && inv.nit !== '0' && (
                            <span className="font-mono text-slate-400 ml-1">(NIT/CI: {inv.nit})</span>
                          )}
                        </div>
                        <span className="text-slate-600">•</span>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Sucursal: <strong className="text-slate-300">{inv.sucursal || '0'}</strong> | Punto Venta: <strong className="text-slate-300">{inv.puntoVenta || '0'}</strong>
                        </div>
                      </div>

                      {/* Fila 3: Fecha de Emisión */}
                      <div className="text-[11px] text-slate-400 font-mono">
                        <span>Fecha emisión: </span>
                        <span className="text-slate-200 font-semibold">{inv.fechaEmision}</span>
                        {inv.empleado && (
                          <span className="text-slate-500 ml-2">• Emitido por: {inv.empleado}</span>
                        )}
                      </div>

                      {/* Fila 4: CUF (Código de Autorización) */}
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-500">CUF:</span>
                        <span className="font-mono text-slate-300 truncate max-w-xs sm:max-w-md md:max-w-lg select-all bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {inv.cuf}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCUF(inv.cuf)}
                          className="text-slate-500 hover:text-cyan-400 p-0.5 transition-colors cursor-pointer"
                          title="Copiar CUF"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Bloque Central: Sector, Impuesto (13%) y Total */}
                    <div className="lg:w-48 text-left lg:text-right border-t lg:border-t-0 lg:border-l border-slate-800/80 pt-3 lg:pt-0 lg:pl-4 space-y-0.5 flex-shrink-0">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Sector: <strong className="text-slate-300">{inv.sector || 1}</strong>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Impuesto (13%): <strong className="text-slate-300">Bs. {inv.impuesto.toFixed(2)}</strong>
                      </div>
                      <div className="text-base font-black text-white font-mono pt-0.5">
                        <span className="text-xs text-slate-400 mr-1 font-normal">Total:</span>
                        <span className="text-cyan-400">Bs. {inv.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Bloque Derecho: Botones de Acción (Estrictamente los 3 solicitados) */}
                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0 w-full lg:w-44 border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0">
                      {/* 1. Imprimir Hoja Carta (PDF Oficial) */}
                      <button
                        type="button"
                        onClick={() => handlePrintLetter(inv)}
                        className="flex-1 lg:w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                        title="Imprimir o guardar en hoja carta / oficio PDF con formato oficial"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Imprimir</span>
                      </button>

                      {/* 2. Imprimir Ticket (Rollo Térmico 80mm) */}
                      <button
                        type="button"
                        onClick={() => handlePrintTicket(inv)}
                        className="flex-1 lg:w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        title="Imprimir ticket para máquina de impresión por rollo térmico"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Imprimir Ticket</span>
                      </button>

                      {/* 3. Anular */}
                      {isVoided ? (
                        <div className="flex-1 lg:w-full py-2 px-3 bg-slate-800 text-rose-400/80 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-rose-500/20 cursor-not-allowed">
                          <span>✕ Anulada</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenVoidModal(inv)}
                          className="flex-1 lg:w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                          title="Anular esta factura y restituir inventario"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Anular</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-4">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 hover:border-cyan-500 cursor-pointer disabled:cursor-not-allowed"
              >
                ‹ Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === page
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 disabled:opacity-40 hover:border-cyan-500 cursor-pointer disabled:cursor-not-allowed"
              >
                Siguiente ›
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: VER DETALLES DE LA FACTURA                                         */}
      {/* ========================================================================= */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Cabecera Modal */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span>Factura No. {selectedInvoice.numeroFactura}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      selectedInvoice.estado === 'Anulada'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {selectedInvoice.estado}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  ID: {selectedInvoice.facturaID} • Fecha: {selectedInvoice.fechaEmision}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Metadatos Cliente */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block font-semibold">Razón Social / Cliente:</span>
                <span className="font-bold text-white uppercase">{selectedInvoice.cliente}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">NIT / Documento:</span>
                <span className="font-mono font-bold text-cyan-400">{selectedInvoice.nit || '0'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Emisor:</span>
                <span className="text-slate-300 font-medium">Casa Matriz (Cochabamba)</span>
              </div>
              <div>
                <span className="text-slate-500 block font-semibold">Atendido por:</span>
                <span className="text-slate-300 font-medium">{selectedInvoice.empleado}</span>
              </div>
            </div>

            {/* Tabla de Productos */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">
                Detalle de Productos Facturados ({selectedInvoice.itemsCount})
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-extrabold uppercase text-[10px]">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3">Descripción</th>
                      <th className="py-2 px-3 text-center">Cant.</th>
                      <th className="py-2 px-3 text-right">P. Unit</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {selectedInvoice.detalles && selectedInvoice.detalles.length > 0 ? (
                      selectedInvoice.detalles.map((dt, i) => (
                        <tr key={i} className="hover:bg-slate-800/30 text-slate-200">
                          <td className="py-2 px-3 font-mono text-cyan-400 text-[11px]">{dt.codigo}</td>
                          <td className="py-2 px-3 font-semibold uppercase">{dt.nombre}</td>
                          <td className="py-2 px-3 text-center font-mono">{dt.cantidad.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono">Bs. {dt.precioUnitario.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-white">Bs. {dt.subtotal.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-slate-500 text-xs">
                          Venta registrada como monto directo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen de Importes */}
            <div className="flex justify-between items-center p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono">
              <div className="space-y-0.5 text-slate-400">
                <div>Base Crédito Fiscal: <strong className="text-white">Bs. {selectedInvoice.total.toFixed(2)}</strong></div>
                <div>Impuesto IVA (13%): <strong className="text-cyan-400">Bs. {selectedInvoice.impuesto.toFixed(2)}</strong></div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block uppercase font-sans font-bold">Total Facturado</span>
                <span className="text-xl font-black text-white">Bs. {selectedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Botones del Modal */}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => handlePrintLetter(selectedInvoice)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Imprimir Carta</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintTicket(selectedInvoice)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ANULACIÓN DE FACTURA                                               */}
      {/* ========================================================================= */}
      {showVoidModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-rose-900/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xl font-bold flex-shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  ¿Anular Factura No. {selectedInvoice.numeroFactura}?
                </h3>
                <p className="text-xs text-slate-400">
                  Total: <strong className="text-white font-mono">Bs. {selectedInvoice.total.toFixed(2)}</strong> • Cliente: {selectedInvoice.cliente}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Al anular esta factura, el comprobante cambiará a estado <strong>Anulada</strong> y las unidades de los productos se restituirán automáticamente al inventario (Lotes / Kardex).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Motivo de anulación:
              </label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 font-medium"
              >
                <option value="Error en datos del cliente o emisión">1. Error en datos del cliente / emisión</option>
                <option value="Devolución total de mercadería">2. Devolución total de mercadería</option>
                <option value="Factura duplicada o emitida por error">3. Factura duplicada o emitida por error</option>
                <option value="Cambio de método de pago">4. Cambio de método de pago</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={voidingLoading}
                onClick={() => setShowVoidModal(false)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={voidingLoading}
                onClick={handleConfirmVoid}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {voidingLoading ? (
                  <span className="animate-spin text-sm">⏳</span>
                ) : (
                  <span>Confirmar Anulación</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InvoiceListView;
