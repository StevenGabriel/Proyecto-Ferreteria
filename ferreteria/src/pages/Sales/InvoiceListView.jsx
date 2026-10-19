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
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
      showToast('La fecha de inicio no puede ser posterior a la fecha final.', 'error');
      return;
    }
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
    if (!voidReason.trim()) {
      showToast('Por favor especifica un motivo válido para la anulación.', 'error');
      return;
    }
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
    <div className="flex h-screen bg-[#0c0e12] font-sans text-zinc-100 overflow-hidden">
      {/* Toast Notificación */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3.5 rounded-xl shadow-2xl text-xs font-bold border bg-[#12151c] animate-toast-in flex items-center gap-2.5 ${
            toast.type === 'success'
              ? 'text-emerald-200 border-emerald-500/30'
              : toast.type === 'error'
              ? 'text-red-200 border-red-500/30'
              : 'text-amber-200 border-amber-500/30'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-400'
                : toast.type === 'error'
                ? 'bg-red-400'
                : 'bg-amber-400'
            }`}
          />
          <span className="text-zinc-100">{toast.message}</span>
        </div>
      )}

      {/* Barra Lateral */}
      <Sidebar />

      {/* Contenido Principal */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Topbar />

        <div className="p-4 sm:p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* 1. Cabecera Principal */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/80 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100" style={{ textWrap: 'balance' }}>
                    Listado de Facturas
                  </h1>
                  <p className="text-xs text-zinc-400 font-medium">
                    Consulta, reimpresión en hoja carta u 80mm térmico y anulación de comprobantes
                  </p>
                </div>
              </div>
            </div>

            {/* Estadísticas Rápidas */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-[#12151c] border border-zinc-800/80 text-xs">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Emitidas</span>
                <span className="text-emerald-400 font-extrabold font-mono tabular-nums text-sm">{countEmitidas}</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#12151c] border border-zinc-800/80 text-xs">
                <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Anuladas</span>
                <span className="text-red-400 font-extrabold font-mono tabular-nums text-sm">{countAnuladas}</span>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-[#12151c] border border-amber-500/30 text-xs">
                <span className="text-amber-400 block text-[10px] uppercase font-bold tracking-wider">Total Facturado</span>
                <span className="text-zinc-100 font-extrabold font-mono tabular-nums text-sm">Bs. {totalFacturado.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* 2. Barra de Filtros y Búsqueda */}
          <form onSubmit={handleSearchSubmit} className="p-4 bg-[#12151c] rounded-2xl border border-zinc-800/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Fecha Inicio */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Fecha Inicio:</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-500/60 transition-colors font-mono tabular-nums"
                />
              </div>

              {/* Fecha Fin */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Fecha Fin:</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-500/60 transition-colors font-mono tabular-nums"
                />
              </div>

              {/* Buscador */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Búsqueda rápida:</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Número de factura, Cliente, NIT/CI, CUF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/60 transition-colors font-medium"
                  />
                  <svg className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-300 mb-1">Estado:</label>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-amber-500/60 transition-colors font-semibold cursor-pointer"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="EMITIDA">Emitidas</option>
                  <option value="ANULADA">Anuladas</option>
                </select>
              </div>
            </div>

            {/* Botones de Filtro */}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800/80">
              <span className="text-xs text-zinc-400 font-medium">
                Mostrando <strong className="text-zinc-100 font-mono tabular-nums">{invoices.length}</strong> facturas encontradas
              </span>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 rounded-xl text-xs font-bold transition-colors duration-150 btn-press flex items-center gap-1.5 cursor-pointer"
                  title="Restablecer filtros"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Limpiar</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold shadow-sm transition-colors duration-150 btn-press flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
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
              <div className="p-16 text-center text-zinc-400 space-y-3 bg-[#12151c] rounded-2xl border border-zinc-800/80">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm font-bold text-zinc-200">Cargando listado de facturas...</p>
              </div>
            ) : currentInvoices.length === 0 ? (
              <div className="p-16 text-center text-zinc-400 space-y-2 bg-[#12151c] rounded-2xl border border-zinc-800/80">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-base font-bold text-zinc-200">No se encontraron facturas</p>
                <p className="text-xs text-zinc-500">Intente modificar los filtros de fecha o búsqueda</p>
              </div>
            ) : (
              currentInvoices.map((inv) => {
                const isVoided = inv.estado === 'Anulada';

                return (
                  <div
                    key={inv.id || inv.ventaID}
                    className={`p-4 rounded-2xl border transition-colors duration-150 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isVoided
                        ? 'bg-[#0c0e12]/70 border-red-900/30 opacity-75'
                        : 'bg-[#12151c] hover:border-zinc-700 border-zinc-800/80'
                    }`}
                  >
                    {/* Bloque Izquierdo: Metadatos de la Factura */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {/* Fila 1: Ver Detalle, ID, Factura Nro */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(inv)}
                          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span className="underline underline-offset-2">Ver Detalle</span>
                        </button>

                        <span className="text-zinc-500 font-mono tabular-nums text-xs">
                          ID: <strong className="text-zinc-300">{inv.facturaID || inv.ventaID}</strong>
                        </span>

                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/25 text-xs font-extrabold font-mono tabular-nums tracking-wide">
                          Factura Nro: {inv.numeroFactura}
                        </span>

                        {/* Badge de Estado */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            isVoided
                              ? 'bg-red-500/10 text-red-400 border-red-500/25'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          }`}
                        >
                          {inv.estado}
                        </span>
                      </div>

                      {/* Fila 2: Cliente y Sucursal */}
                      <div className="text-xs text-zinc-300 flex items-center gap-2 flex-wrap">
                        <div>
                          <span className="text-zinc-500 font-semibold">Cliente: </span>
                          <strong className="text-zinc-100 uppercase">{inv.cliente || 'CLIENTE GENERAL'}</strong>
                          {inv.nit && inv.nit !== '0' && (
                            <span className="font-mono tabular-nums text-zinc-400 ml-1">(NIT/CI: {inv.nit})</span>
                          )}
                        </div>
                        <span className="text-zinc-700">•</span>
                        <div className="text-[11px] text-zinc-400 font-medium font-mono tabular-nums">
                          Sucursal: <strong className="text-zinc-300">{inv.sucursal || '0'}</strong> | Punto Venta: <strong className="text-zinc-300">{inv.puntoVenta || '0'}</strong>
                        </div>
                      </div>

                      {/* Fila 3: Fecha de Emisión */}
                      <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                        <span>Fecha emisión: </span>
                        <span className="text-zinc-200 font-semibold">{inv.fechaEmision}</span>
                        {inv.empleado && (
                          <span className="text-zinc-500 ml-2 font-sans">• Emitido por: {inv.empleado}</span>
                        )}
                      </div>

                      {/* Fila 4: CUF (Código de Autorización) */}
                      <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-zinc-500">CUF:</span>
                        <span className="font-mono tabular-nums text-zinc-300 truncate max-w-xs sm:max-w-md md:max-w-lg select-all bg-[#0c0e12] px-1.5 py-0.5 rounded border border-zinc-800">
                          {inv.cuf}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCUF(inv.cuf)}
                          className="text-zinc-500 hover:text-amber-400 p-1 rounded hover:bg-zinc-800/60 transition-colors cursor-pointer"
                          title="Copiar CUF"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Bloque Central: Sector, Impuesto (13%) y Total */}
                    <div className="lg:w-48 text-left lg:text-right border-t lg:border-t-0 lg:border-l border-zinc-800/80 pt-3 lg:pt-0 lg:pl-4 space-y-0.5 flex-shrink-0">
                      <div className="text-[11px] text-zinc-400 font-medium font-mono tabular-nums">
                        Sector: <strong className="text-zinc-300">{inv.sector || 1}</strong>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                        Impuesto (13%): <strong className="text-zinc-300">Bs. {inv.impuesto.toFixed(2)}</strong>
                      </div>
                      <div className="text-base font-black text-zinc-100 font-mono tabular-nums pt-0.5">
                        <span className="text-xs text-zinc-400 mr-1 font-normal font-sans">Total:</span>
                        <span className="text-amber-400">Bs. {inv.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Bloque Derecho: Botones de Acción (Estrictamente los 3 solicitados) */}
                    <div className="flex flex-row lg:flex-col gap-2 flex-shrink-0 w-full lg:w-44 border-t lg:border-t-0 border-zinc-800/80 pt-3 lg:pt-0">
                      {/* 1. Imprimir Hoja Carta (PDF Oficial) */}
                      <button
                        type="button"
                        onClick={() => handlePrintLetter(inv)}
                        className="flex-1 lg:w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 btn-press cursor-pointer"
                        title="Imprimir o guardar en hoja carta / oficio PDF con formato oficial"
                      >
                        <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Imprimir</span>
                      </button>

                      {/* 2. Imprimir Ticket (Rollo Térmico 80mm) */}
                      <button
                        type="button"
                        onClick={() => handlePrintTicket(inv)}
                        className="flex-1 lg:w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 btn-press cursor-pointer"
                        title="Imprimir ticket para máquina de impresión por rollo térmico"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Imprimir Ticket</span>
                      </button>

                      {/* 3. Anular */}
                      {isVoided ? (
                        <div className="flex-1 lg:w-full py-2 px-3 bg-zinc-900 text-red-400/80 font-bold rounded-xl text-xs flex items-center justify-center gap-1 border border-red-500/20 cursor-not-allowed">
                          <span>✕ Anulada</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenVoidModal(inv)}
                          className="flex-1 lg:w-full py-2 px-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 btn-press cursor-pointer"
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
                className="px-3 py-1.5 rounded-lg bg-[#12151c] border border-zinc-800 text-xs font-bold text-zinc-300 disabled:opacity-40 hover:border-amber-500/50 transition-colors duration-150 btn-press cursor-pointer disabled:cursor-not-allowed"
              >
                ‹ Anterior
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono tabular-nums font-bold transition-colors duration-150 btn-press cursor-pointer ${
                    currentPage === page
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-[#12151c] text-zinc-400 border border-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-[#12151c] border border-zinc-800 text-xs font-bold text-zinc-300 disabled:opacity-40 hover:border-amber-500/50 transition-colors duration-150 btn-press cursor-pointer disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-modal-in">
            {/* Cabecera Modal */}
            <div className="flex justify-between items-start border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-zinc-100 flex items-center gap-2 font-mono tabular-nums">
                  <span>Factura No. {selectedInvoice.numeroFactura}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-sans font-extrabold uppercase ${
                      selectedInvoice.estado === 'Anulada'
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {selectedInvoice.estado}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono tabular-nums mt-0.5">
                  ID: {selectedInvoice.facturaID} • Fecha: {selectedInvoice.fechaEmision}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Metadatos Cliente */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#0c0e12] rounded-xl border border-zinc-800/80 text-xs">
              <div>
                <span className="text-zinc-500 block font-semibold">Razón Social / Cliente:</span>
                <span className="font-bold text-zinc-100 uppercase">{selectedInvoice.cliente}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold">NIT / Documento:</span>
                <span className="font-mono tabular-nums font-bold text-amber-400">{selectedInvoice.nit || '0'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold">Emisor:</span>
                <span className="text-zinc-300 font-medium">Casa Matriz (Cochabamba)</span>
              </div>
              <div>
                <span className="text-zinc-500 block font-semibold">Atendido por:</span>
                <span className="text-zinc-300 font-medium">{selectedInvoice.empleado}</span>
              </div>
            </div>

            {/* Tabla de Productos */}
            <div>
              <h4 className="text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wide">
                Detalle de Productos Facturados (<span className="font-mono tabular-nums">{selectedInvoice.itemsCount}</span>)
              </h4>
              <div className="border border-zinc-800/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0c0e12] text-zinc-400 border-b border-zinc-800/80 font-extrabold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unit</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {selectedInvoice.detalles && selectedInvoice.detalles.length > 0 ? (
                      selectedInvoice.detalles.map((dt, i) => (
                        <tr key={i} className="hover:bg-zinc-900/50 text-zinc-200 transition-colors">
                          <td className="py-2 px-3 font-mono tabular-nums text-amber-400 text-[11px]">{dt.codigo}</td>
                          <td className="py-2 px-3 font-semibold uppercase">{dt.nombre}</td>
                          <td className="py-2 px-3 text-center font-mono tabular-nums">{dt.cantidad.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums">Bs. {dt.precioUnitario.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-zinc-100">Bs. {dt.subtotal.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-zinc-500 text-xs">
                          Venta registrada como monto directo
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen de Importes */}
            <div className="flex justify-between items-center p-3.5 bg-[#0c0e12] rounded-xl border border-zinc-800/80 text-xs font-mono tabular-nums">
              <div className="space-y-0.5 text-zinc-400">
                <div>Base Crédito Fiscal: <strong className="text-zinc-100">Bs. {selectedInvoice.total.toFixed(2)}</strong></div>
                <div>Impuesto IVA (13%): <strong className="text-amber-400">Bs. {selectedInvoice.impuesto.toFixed(2)}</strong></div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 block uppercase font-sans font-bold tracking-wider">Total Facturado</span>
                <span className="text-xl font-black text-zinc-100">Bs. {selectedInvoice.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Botones del Modal */}
            <div className="flex gap-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 font-bold rounded-xl text-xs transition-colors duration-150 btn-press cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => handlePrintLetter(selectedInvoice)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 btn-press cursor-pointer"
              >
                <span>Imprimir Carta</span>
              </button>
              <button
                type="button"
                onClick={() => handlePrintTicket(selectedInvoice)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 btn-press cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12151c] border border-red-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-modal-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-100">
                  ¿Anular Factura No. <span className="font-mono tabular-nums">{selectedInvoice.numeroFactura}</span>?
                </h3>
                <p className="text-xs text-zinc-400">
                  Total: <strong className="text-zinc-100 font-mono tabular-nums">Bs. {selectedInvoice.total.toFixed(2)}</strong> • Cliente: {selectedInvoice.cliente}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#0c0e12] p-3 rounded-xl border border-zinc-800/80">
              Al anular esta factura, el comprobante cambiará a estado <strong className="text-red-400">Anulada</strong> y las unidades de los productos se restituirán automáticamente al inventario (Lotes / Kardex).
            </p>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Motivo de anulación:
              </label>
              <select
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-red-500/60 font-medium cursor-pointer transition-colors"
              >
                <option value="Error en datos del cliente o emisión">1. Error en datos del cliente / emisión</option>
                <option value="Devolución total de mercadería">2. Devolución total de mercadería</option>
                <option value="Factura duplicada o emitida por error">3. Factura duplicada o emitida por error</option>
                <option value="Cambio de método de pago">4. Cambio de método de pago</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                disabled={voidingLoading}
                onClick={() => setShowVoidModal(false)}
                className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 font-bold rounded-xl text-xs transition-colors duration-150 btn-press cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={voidingLoading}
                onClick={handleConfirmVoid}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors duration-150 btn-press cursor-pointer disabled:opacity-50"
              >
                {voidingLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Anulando...</span>
                  </>
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

