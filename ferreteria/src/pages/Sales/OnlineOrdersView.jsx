import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';
import { getOnlineOrders, confirmOnlineOrder, cancelOnlineOrder } from '../../services/api';
import { generateInvoiceTicketPdf } from '../../utils/invoicePdfGenerator';
import { LOYALTY_TIERS } from '../../constants/loyalty';

// Función auxiliar para resolver el nivel de lealtad del cliente
const resolveClientLoyalty = (client, order) => {
  const tierKey = client?.NivelLealtad || '';
  let tier = LOYALTY_TIERS[tierKey];
  if (!tier) {
    const keyByValue = Object.keys(LOYALTY_TIERS).find(
      k => LOYALTY_TIERS[k].name.toLowerCase() === tierKey.toLowerCase() ||
           LOYALTY_TIERS[k].id.toLowerCase() === tierKey.toLowerCase()
    );
    if (keyByValue) tier = LOYALTY_TIERS[keyByValue];
  }

  if (!tier) {
    const origSubtotal = parseFloat(order?.Subtotal || 0);
    const origDesc = parseFloat(order?.Descuento || 0);
    const pct = origSubtotal > 0 && origDesc > 0
      ? Math.round((origDesc / origSubtotal) * 100)
      : (parseFloat(client?.DescuentoPorcentaje) || 0);

    if (pct >= 10) tier = LOYALTY_TIERS.Mayorista; // Diamante
    else if (pct >= 6) tier = LOYALTY_TIERS.Constructor; // Oro
    else if (pct >= 3) tier = LOYALTY_TIERS.Frecuente; // Plata
    else tier = LOYALTY_TIERS.Estandar; // Bronce
  }

  const discountPercent = client?.DescuentoPorcentaje !== undefined && parseFloat(client?.DescuentoPorcentaje) > 0
    ? parseFloat(client.DescuentoPorcentaje)
    : (tier?.discount || 0);

  return {
    ...tier,
    discountPercent
  };
};

function OnlineOrdersView() {
  const { isCollapsed } = useSidebar();

  // Usuario en sesión
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_user_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { EmpleadoID: 6, Nombre: 'Oscar Edgar Claros', Rol: 'Administrador' };
  });

  // Estados de datos
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ pendientes: 0, completados: 0, cancelados: 0, total: 0, totalPendientesMonto: 0 });
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('PENDIENTE'); // 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO' | 'TODOS'
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Cliente no se presentó a retirar en mostrador');
  const [actionLoading, setActionLoading] = useState(false);

  // Modal Popup de Éxito / Impresión de Comprobante (estilo POS)
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState(null);

  // Opciones de facturación al confirmar entrega
  const [issueInvoice, setIssueInvoice] = useState(false);
  const [billingNit, setBillingNit] = useState('');
  const [billingName, setBillingName] = useState('');

  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
  };

  // Cargar pedidos online
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'TODOS') params.estado = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await getOnlineOrders(params);
      if (res && res.orders) {
        setOrders(res.orders);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      console.error('Error al cargar pedidos online:', err);
      showToast('Error al conectar con el servidor para obtener pedidos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    // Auto-refresco cada 30 segundos para alertar nuevos pedidos entrantes
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [statusFilter, searchTerm]);

  // Información de Lealtad del Cliente del pedido seleccionado
  const clientLoyalty = useMemo(() => {
    if (!selectedOrder) return { name: 'Bronce', badge: '🥉 Bronce', discount: 0, discountPercent: 0 };
    return resolveClientLoyalty(selectedOrder.Cliente, selectedOrder);
  }, [selectedOrder]);

  // Cálculo Dinámico de Productos según Modalidad (Con Factura vs Sin Factura)
  const dynamicItems = useMemo(() => {
    if (!selectedOrder || !selectedOrder.Detalles) return [];
    return selectedOrder.Detalles.map(dt => {
      const prod = dt.Producto || {};
      const precioConFactura = parseFloat(prod.PrecioVenta || dt.PrecioUnitario || 0);
      const precioSinFactura = parseFloat(
        prod.PrecioSinFactura && parseFloat(prod.PrecioSinFactura) > 0
          ? prod.PrecioSinFactura
          : (precioConFactura * 0.87)
      );

      const activeUnitPrice = issueInvoice ? precioConFactura : precioSinFactura;
      const cant = parseInt(dt.Cantidad || 1);
      const activeSubtotal = activeUnitPrice * cant;

      return {
        ...dt,
        precioConFactura,
        precioSinFactura,
        activeUnitPrice,
        activeSubtotal,
        cant
      };
    });
  }, [selectedOrder, issueInvoice]);

  const activeSubtotalSum = useMemo(() => {
    return dynamicItems.reduce((acc, it) => acc + it.activeSubtotal, 0);
  }, [dynamicItems]);

  const activeLoyaltyDiscount = useMemo(() => {
    const pct = clientLoyalty?.discountPercent || 0;
    return pct > 0 ? (activeSubtotalSum * pct) / 100 : 0;
  }, [activeSubtotalSum, clientLoyalty]);

  const activeFinalTotal = useMemo(() => {
    return Math.max(0, activeSubtotalSum - activeLoyaltyDiscount);
  }, [activeSubtotalSum, activeLoyaltyDiscount]);

  // Abrir modal de revisión y entrega
  const handleOpenReview = (order) => {
    setSelectedOrder(order);
    setIssueInvoice(!!order.RequiereFactura);
    setBillingNit(order.NIT_CI && order.NIT_CI !== '0' ? order.NIT_CI : '');
    setBillingName(order.ClienteNombre || '');
    setShowReviewModal(true);
  };

  // Abrir modal de cancelación
  const handleOpenCancel = (order) => {
    setSelectedOrder(order);
    setCancelReason('Cliente no se presentó o no realizó el pago por QR');
    setShowCancelModal(true);
  };

  // Ejecutar Confirmación y Entrega
  const handleConfirmPickup = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const payload = {
        empleadoID: currentUser?.EmpleadoID || 6,
        isInvoice: issueInvoice,
        nit: billingNit.trim() || '0',
        razonSocial: billingName.trim() || selectedOrder.ClienteNombre,
        total: activeFinalTotal,
        subtotal: activeSubtotalSum,
        descuento: activeLoyaltyDiscount,
        items: dynamicItems.map(it => ({
          ProductoID: it.ProductoID,
          Cantidad: it.cant,
          PrecioUnitario: it.activeUnitPrice,
          Subtotal: it.activeSubtotal
        }))
      };

      const res = await confirmOnlineOrder(selectedOrder.PedidoID, payload);
      showToast(`¡Pedido ${selectedOrder.CodigoPedido} entregado con éxito!`, 'success');

      // Cerrar modal de revisión
      setShowReviewModal(false);

      // Guardar datos para el Popup de Impresión de Recibo / Factura (tipo POS)
      const receiptData = {
        id: res?.sale?.ticketID || `${issueInvoice ? 'FAC' : 'REC'}-${res?.sale?.VentaID || selectedOrder.CodigoPedido}`,
        numeroFactura: res?.sale?.VentaID || selectedOrder.CodigoPedido,
        codigoPedido: selectedOrder.CodigoPedido,
        time: new Date().toLocaleString('es-BO'),
        nit: payload.nit,
        cliente: payload.razonSocial,
        subtotal: activeSubtotalSum,
        discount: activeLoyaltyDiscount,
        total: activeFinalTotal,
        isInvoice: !!issueInvoice,
        paymentMethod: 'Transferencia QR Simple (Yape / BCP)',
        empleado: currentUser?.Nombre || 'Cajero Mostrador',
        items: dynamicItems.map(dt => ({
          name: dt.Producto?.Nombre || `Producto #${dt.ProductoID}`,
          producto: dt.Producto?.Nombre || `Producto #${dt.ProductoID}`,
          quantity: dt.cant,
          unit: dt.Producto?.Unidad?.Nombre || 'PZA',
          price: dt.activeUnitPrice,
          subtotal: dt.activeSubtotal
        }))
      };

      setLastSaleReceipt(receiptData);
      setShowReceiptModal(true);

      fetchOrders();
    } catch (err) {
      console.error('Error al confirmar pedido online:', err);
      const msg = err.response?.data?.message || err.message || 'Error al procesar la entrega.';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Descargar Comprobante PDF (Factura o Recibo)
  const handleDownloadReceiptPdf = async (customIsInvoice = null) => {
    if (!lastSaleReceipt) return;
    try {
      const isInv = customIsInvoice !== null ? customIsInvoice : lastSaleReceipt.isInvoice;
      await generateInvoiceTicketPdf({
        ...lastSaleReceipt,
        isInvoice: isInv
      }, { openInTab: false, download: true });
      showToast(`Descargando ${isInv ? 'Factura SIAT' : 'Recibo Oficial'} en PDF...`, 'success');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      showToast('Error al generar el documento PDF.', 'error');
    }
  };

  // Ejecutar Cancelación
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await cancelOnlineOrder(selectedOrder.PedidoID, { motivo: cancelReason.trim() });
      showToast(`Pedido ${selectedOrder.CodigoPedido} cancelado correctamente.`, 'info');
      setShowCancelModal(false);
      fetchOrders();
    } catch (err) {
      console.error('Error al cancelar pedido:', err);
      showToast('Error al cancelar el pedido.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrado local adicional para rapidez
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchStatus = statusFilter === 'TODOS' || o.EstadoPedido === statusFilter;
      const matchSearch = !searchTerm.trim() ||
        o.CodigoPedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.ClienteNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.NIT_CI?.includes(searchTerm) ||
        o.Telefono?.includes(searchTerm);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, searchTerm]);

  return (
    <div className="flex h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden">
      {/* Barra Lateral Navegación */}
      <Sidebar />

      {/* Contenedor Principal */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Topbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* 1. Header Principal Formal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
            <div>
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Pedidos Online — Mostrador
                    </h1>
                    {stats.pendientes > 0 && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span>{stats.pendientes} en cola</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Verificación de transferencias QR Simple (Yape / BCP), entrega de materiales y emisión de comprobantes oficiales.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchOrders}
                disabled={loading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* 2. Tarjetas de Estadísticas KPI Corporativas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pendientes de Entrega */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 shadow-lg shadow-amber-500/5 relative overflow-hidden flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Por Entregar (Cola)</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">{stats.pendientes}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Esperando verificación en tienda</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Total por Cobrar en Pendientes */}
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 shadow-lg shadow-cyan-500/5 relative overflow-hidden flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Monto en Cola QR</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">Bs. {stats.totalPendientesMonto.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">En pedidos pendientes con QR</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Completados */}
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 shadow-lg shadow-emerald-500/5 relative overflow-hidden flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Entregados con Éxito</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">{stats.completados}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Pagos verificados y facturados</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Cancelados */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg relative overflow-hidden flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cancelados / No Retirados</p>
                <p className="text-2xl font-black text-slate-300 mt-1 font-mono">{stats.cancelados}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Sin impacto en inventario</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>

          {/* 3. Filtros y Búsqueda */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            {/* Pestañas de Estado */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter('PENDIENTE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  statusFilter === 'PENDIENTE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Pendientes ({stats.pendientes})</span>
              </button>

              <button
                onClick={() => setStatusFilter('COMPLETADO')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  statusFilter === 'COMPLETADO'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Completados ({stats.completados})</span>
              </button>

              <button
                onClick={() => setStatusFilter('CANCELADO')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  statusFilter === 'CANCELADO'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>Cancelados ({stats.cancelados})</span>
              </button>

              <button
                onClick={() => setStatusFilter('TODOS')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  statusFilter === 'TODOS'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Todos ({stats.total})</span>
              </button>
            </div>

            {/* Input de Búsqueda Rápida */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar por código, cliente o NIT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium"
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 4. Lista de Pedidos Online */}
          {loading ? (
            <div className="p-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <div className="w-9 h-9 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-400">Cargando cola de pedidos online...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-16 text-center bg-slate-900/40 border border-slate-800 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white">No hay pedidos en este estado</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {statusFilter === 'PENDIENTE'
                  ? 'Actualmente no hay pedidos pendientes en mostrador. Todo se encuentra al día.'
                  : 'No se encontraron registros que coincidan con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredOrders.map((order) => {
                const isPending = order.EstadoPedido === 'PENDIENTE';
                const isCompleted = order.EstadoPedido === 'COMPLETADO';
                const isCancelled = order.EstadoPedido === 'CANCELADO';

                const totalItemsCount = (order.Detalles || []).reduce((acc, dt) => acc + (dt.Cantidad || 1), 0);

                return (
                  <div
                    key={order.PedidoID}
                    className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 transition-all shadow-md hover:border-cyan-500/40 ${
                      isPending
                        ? 'border-amber-500/40 bg-gradient-to-r from-amber-950/15 via-slate-900 to-slate-900'
                        : isCompleted
                        ? 'border-emerald-500/20'
                        : 'border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Información Principal del Pedido */}
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-sm font-black text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2.5 py-0.5 rounded-xl">
                            #{order.CodigoPedido}
                          </span>

                          {/* Estado */}
                          {isPending && (
                            <span className="bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              Pendiente de Verificación y Entrega
                            </span>
                          )}
                          {isCompleted && (
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                              <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Entregado en Mostrador
                            </span>
                          )}
                          {isCancelled && (
                            <span className="bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
                              <svg className="w-3 h-3 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancelado
                            </span>
                          )}

                          <span className="text-xs text-slate-500">
                            • {new Date(order.FechaPedido).toLocaleString('es-BO')}
                          </span>
                        </div>

                        {/* Datos del Cliente y Teléfono */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-slate-400">Cliente: </span>
                            <strong className="text-white truncate">{order.ClienteNombre}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <span className="text-slate-400">NIT/C.I.: </span>
                            <span className="font-mono text-slate-300">{order.NIT_CI || '0'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-slate-400">Teléfono: </span>
                            {order.Telefono ? (
                              <a
                                href={`https://wa.me/591${order.Telefono.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <span>{order.Telefono}</span>
                              </a>
                            ) : (
                              <span className="text-slate-500">No especificado</span>
                            )}
                          </div>
                        </div>

                        {/* Resumen de Productos Pedidos */}
                        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-300 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1">
                            <span>Artículos solicitados ({totalItemsCount} unid.):</span>
                            <span className="text-cyan-400 font-bold">Transferencia QR (Yape)</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            {(order.Detalles || []).map((dt, idx) => (
                              <span key={idx} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg text-[11px] text-slate-200">
                                <strong>{dt.Cantidad}x</strong> {dt.Producto?.Nombre || `Item #${dt.ProductoID}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Monto y Botones de Acción */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                        <div className="text-left lg:text-right">
                          <p className="text-[11px] text-slate-400 font-medium">Total a Cobrar:</p>
                          <p className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
                            Bs. {parseFloat(order.Total || 0).toFixed(2)}
                          </p>
                          {order.RequiereFactura && (
                            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.2 rounded font-bold">
                              Factura SIAT Solicitada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleOpenReview(order)}
                                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Revisar y Entregar</span>
                              </button>

                              <button
                                onClick={() => handleOpenCancel(order)}
                                title="Cancelar Pedido"
                                className="px-3 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs transition-colors active:scale-95 cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenReview(order)}
                              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>Ver Detalles</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* 5. MODAL DE REVISIÓN, VERIFICACIÓN Y ENTREGA FORMAL */}
      {showReviewModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative max-h-[95vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    Pedido #{selectedOrder.CodigoPedido}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedOrder.EstadoPedido === 'PENDIENTE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : selectedOrder.EstadoPedido === 'COMPLETADO'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {selectedOrder.EstadoPedido}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>Fecha: {new Date(selectedOrder.FechaPedido).toLocaleString('es-BO')}</span>
                    <span>•</span>
                    <span className="text-slate-300">Cliente: <strong className="text-white">{selectedOrder.ClienteNombre}</strong></span>
                    {clientLoyalty && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${clientLoyalty.textClass || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'}`}>
                        {clientLoyalty.name} {clientLoyalty.discountPercent > 0 ? `(${clientLoyalty.discountPercent}% Dcto)` : '(Cliente Estándar)'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* PROTOCOLO DE VERIFICACIÓN QR YAPE */}
            {selectedOrder.EstadoPedido === 'PENDIENTE' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-900 border border-cyan-500/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Protocolo de Verificación de Pago (Transferencia QR Yape / BCP)</span>
                </div>
                <div className="space-y-1.5 text-slate-300 pl-6 text-[11px]">
                  <p>1. Solicite al cliente que muestre el <strong>comprobante de transferencia digital</strong> en su teléfono.</p>
                  <p>2. Compruebe que el monto transferido inicialmente corresponda a <strong>Bs. {parseFloat(selectedOrder.Total).toFixed(2)}</strong>.</p>
                  <p>3. Verifique en su aplicación bancaria o notificación de Yape que el dinero ingresó a la cuenta de la ferretería.</p>
                </div>
              </div>
            )}

            {/* Tabla de Productos Solicitados con Precios Dinámicos (Con vs Sin Factura) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Materiales a Entregar al Cliente:
                </h4>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  issueInvoice 
                    ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' 
                    : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                }`}>
                  Modo: {issueInvoice ? 'Precios Con Factura SIAT (13% IVA)' : 'Precios Sin Factura (Recibo)'}
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5 text-center">Cant.</th>
                      <th className="p-2.5 text-right">
                        <span>P. Unit. </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ml-1 ${
                          issueInvoice ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {issueInvoice ? 'Con Fac.' : 'Sin Fac.'}
                        </span>
                      </th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60 text-slate-200">
                    {dynamicItems.map((dt, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5">
                          <p className="font-bold text-white">{dt.Producto?.Nombre || `Producto #${dt.ProductoID}`}</p>
                          <span className="text-[10px] text-slate-400">
                            Unidad: {dt.Producto?.Unidad?.Nombre || 'Pza'} • Código: {dt.Producto?.CodigoBarras || 'S/C'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-cyan-300 font-mono">
                          {dt.cant}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          <span className="font-bold text-white">Bs. {dt.activeUnitPrice.toFixed(2)}</span>
                          {!issueInvoice && dt.precioConFactura > dt.activeUnitPrice && (
                            <span className="block text-[9px] text-slate-500 line-through">
                              Bs. {dt.precioConFactura.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-bold text-white font-mono">
                          Bs. {dt.activeSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales Dinámicos y Comparación */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal ({issueInvoice ? 'Precios con Factura' : 'Precios Sin Factura'}):</span>
                  <span className="font-mono text-slate-200 font-bold">Bs. {activeSubtotalSum.toFixed(2)}</span>
                </div>

                {activeLoyaltyDiscount > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Descuento Lealtad ({clientLoyalty.name} - {clientLoyalty.discountPercent}%):</span>
                    <span className="font-mono">-Bs. {activeLoyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-800 font-black">
                  <div>
                    <span className="text-white text-sm block">
                      {issueInvoice ? 'Total Factura Oficial (SIAT):' : 'Total Recibo Oficial (Sin Factura):'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {issueInvoice ? 'Genera crédito fiscal IVA' : 'Documento interno de entrega en mostrador'}
                    </span>
                  </div>
                  <span className="text-cyan-400 text-lg font-mono">
                    Bs. {activeFinalTotal.toFixed(2)}
                  </span>
                </div>

                {/* Comparación con el monto QR inicial */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Monto transferido inicialmente por cliente:</span>
                  <span className="font-mono font-bold text-purple-300">Bs. {parseFloat(selectedOrder.Total || 0).toFixed(2)}</span>
                </div>

                {!issueInvoice && parseFloat(selectedOrder.Total || 0) > activeFinalTotal && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <strong>Modalidad Sin Factura:</strong> El precio sin IVA es de <strong className="text-white">Bs. {activeFinalTotal.toFixed(2)}</strong> (menor a los Bs. {parseFloat(selectedOrder.Total || 0).toFixed(2)} de lista).
                      <span className="block text-white font-bold mt-0.5">
                        Diferencia a devolver al cliente en mostrador: Bs. {(parseFloat(selectedOrder.Total || 0) - activeFinalTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Opciones de Facturación al Entregar (solo si está PENDIENTE) */}
            {selectedOrder.EstadoPedido === 'PENDIENTE' && (
              <div className={`p-4 rounded-2xl border transition-all ${
                issueInvoice
                  ? 'bg-slate-950 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                  : 'bg-slate-950 border-amber-500/30 shadow-lg shadow-amber-500/5'
              } space-y-3`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Comprobante: {issueInvoice ? 'Factura Computarizada SIAT' : 'Recibo / Nota de Venta (Sin Factura)'}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {issueInvoice
                        ? 'Se aplicará el precio facturado y se generará la factura electrónica oficial.'
                        : 'Se aplicará el precio sin factura (con descuento tributario del 13%).'}
                    </p>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-slate-900 border border-slate-700/80 hover:border-slate-600 px-3 py-1.5 rounded-xl self-start sm:self-auto transition-colors">
                    <input
                      type="checkbox"
                      checked={issueInvoice}
                      onChange={(e) => setIssueInvoice(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 text-cyan-500 bg-slate-950 cursor-pointer accent-cyan-500"
                    />
                    <span className={`text-xs font-bold select-none ${issueInvoice ? 'text-cyan-400' : 'text-slate-400'}`}>
                      {issueInvoice ? '✓ Emitir con Factura (13% IVA)' : 'Emitir Factura SIAT (13% IVA)'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {issueInvoice ? 'Razón Social / Nombre en Factura:' : 'Nombre del Cliente (Recibo):'}
                    </label>
                    <input
                      type="text"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="Nombre o Razón Social"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      {issueInvoice ? 'NIT / CI para Facturación:' : 'C.I. / NIT (Opcional):'}
                    </label>
                    <input
                      type="text"
                      value={billingNit}
                      onChange={(e) => setBillingNit(e.target.value)}
                      placeholder="0 para Sin Factura"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-tight">
                  Al confirmar, se descontará automáticamente el inventario físico de los lotes por FIFO, se registrará la venta en el sistema y se generará el documento oficial ({issueInvoice ? 'Factura SIAT' : 'Recibo'}).
                </p>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              {selectedOrder.EstadoPedido === 'PENDIENTE' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmPickup}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black rounded-xl text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirmando y descontando inventario...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Confirmar {issueInvoice ? 'Factura' : 'Recibo'} (Bs. {activeFinalTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE CANCELACIÓN DE PEDIDO */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">¿Cancelar Pedido #{selectedOrder.CodigoPedido}?</h3>
              <p className="text-xs text-slate-400">
                El pedido será marcado como cancelado. No se descontará stock ni se generará débito fiscal.
              </p>
            </div>

            <div className="text-xs space-y-1 text-left">
              <label className="block font-bold text-slate-300">Motivo de la cancelación:</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Especifique el motivo..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL POPUP DE ÉXITO E IMPRESIÓN DE RECIBO / FACTURA (ESTILO POS) */}
      {showReceiptModal && lastSaleReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div
            id="printable-receipt-online"
            className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 font-sans text-xs max-h-[95vh] overflow-y-auto relative border border-slate-200"
          >
            {/* Header / Botón Cerrar */}
            <div className="flex items-center justify-between no-print border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold">
                  ✓
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    {lastSaleReceipt.isInvoice ? 'Factura Oficial Generada' : 'Recibo de Venta Oficial'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Pedido online {lastSaleReceipt.codigoPedido} procesado correctamente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 1. Cabecera Empresa */}
            <div className="text-center space-y-0.5 border-b border-slate-300 pb-3">
              <h2 className="font-extrabold text-base tracking-wider uppercase text-black">CASA Y CONSTRUCCION</h2>
              <p className="text-[10px] text-slate-600 font-medium">AV. BEIJING Y AV. TADEO HAENKE, COCHABAMBA, BOLIVIA</p>
              <p className="text-[10px] text-slate-600 font-medium">NIT: 1028394021 • Teléfono: 78221469</p>
              <h3 className="font-bold text-sm text-black pt-1 uppercase">
                {lastSaleReceipt.isInvoice ? 'Factura Computarizada SIAT (13% IVA)' : 'Recibo / Nota de Venta Oficial'}
              </h3>
            </div>

            {/* 2. Metadatos: Factura / Recibo No, Cliente, Fecha */}
            <div className="flex justify-between items-start text-[11px] pb-2 border-b border-slate-300 text-slate-800">
              <div className="space-y-0.5">
                <p className="font-bold text-black text-xs">
                  {lastSaleReceipt.isInvoice ? 'Factura Nro.:' : 'Recibo Nro.:'} <span className="font-mono font-bold">{lastSaleReceipt.id}</span>
                </p>
                <p>
                  <span className="font-semibold">Pedido Ref.:</span> <span className="font-mono text-cyan-800 font-bold">{lastSaleReceipt.codigoPedido}</span>
                </p>
                <p>
                  <span className="font-semibold">Cliente:</span> {lastSaleReceipt.cliente || 'CLIENTE GENERAL'}
                  {lastSaleReceipt.nit && lastSaleReceipt.nit !== '0' ? ` (NIT/CI: ${lastSaleReceipt.nit})` : ''}
                </p>
              </div>
              <div className="text-right font-mono text-[11px]">
                <p><span className="font-semibold">Fecha:</span> {lastSaleReceipt.time}</p>
                <p className="text-slate-500 text-[10px]">Cajero: {lastSaleReceipt.empleado}</p>
                {lastSaleReceipt.isInvoice ? (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                    Factura Electrónica SIAT
                  </span>
                ) : (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-full">
                    Venta Sin Factura (Recibo)
                  </span>
                )}
              </div>
            </div>

            {/* 3. Tabla de Productos */}
            <table className="w-full text-left text-[11px] border-collapse my-2">
              <thead>
                <tr className="border-t border-b border-slate-900 font-bold text-black text-[11px]">
                  <th className="py-1.5 text-left">Producto</th>
                  <th className="py-1.5 text-center w-24">Cantidad</th>
                  <th className="py-1.5 text-right w-24">P. Unit.</th>
                  <th className="py-1.5 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(lastSaleReceipt.items || []).map((it, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-1.5 pr-2 uppercase font-medium">{it.name || it.producto}</td>
                    <td className="py-1.5 text-center font-mono">
                      {it.quantity} {it.unit || 'PZA'}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      Bs. {parseFloat(it.price || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right font-mono font-semibold text-black">
                      Bs. {parseFloat(it.subtotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 4. Resumen de Pagos y Totales */}
            <div className="border-t border-slate-400 pt-2 grid grid-cols-2 gap-4 text-[11px]">
              {/* Izquierda: Pagos */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-700">
                  <span>{lastSaleReceipt.paymentMethod || 'QR Simple Yape'}</span>
                  <span className="font-mono font-semibold">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-black border-t border-slate-300 pt-1">
                  <span>Total Liquidado</span>
                  <span className="font-mono text-xs">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
                {lastSaleReceipt.isInvoice && (
                  <div className="text-[10px] text-slate-500 pt-1">
                    Base Crédito Fiscal IVA (13%): <strong className="text-slate-800">Bs. {lastSaleReceipt.total.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {/* Derecha: Subtotal y Total */}
              <div className="space-y-1 text-right">
                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-mono">Bs. {lastSaleReceipt.subtotal.toFixed(2)}</span>
                </div>
                {lastSaleReceipt.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Descuento Lealtad:</span>
                    <span className="font-mono">-Bs. {lastSaleReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-black border-t border-black pt-1 text-xs">
                  <span>Total a Pagar:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botones de Acción en Pantalla (ocultos al imprimir) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 no-print border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors text-center"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => handleDownloadReceiptPdf(lastSaleReceipt.isInvoice)}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{lastSaleReceipt.isInvoice ? 'Descargar Factura (PDF)' : 'Descargar Recibo (PDF)'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>{lastSaleReceipt.isInvoice ? 'Imprimir Factura' : 'Imprimir Recibo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS para Impresión exacta del Recibo */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt-online, #printable-receipt-online * {
            visibility: visible !important;
          }
          #printable-receipt-online {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold border flex items-center gap-2.5 ${
            toast.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-950 border-rose-500/50 text-rose-200'
              : 'bg-cyan-950 border-cyan-500/50 text-cyan-200'
          }`}>
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnlineOrdersView;
