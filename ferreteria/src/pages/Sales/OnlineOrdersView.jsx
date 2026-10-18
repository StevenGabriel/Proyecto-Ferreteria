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
    <div className="flex h-screen bg-[#0c0e12] font-sans text-zinc-100 overflow-hidden selection:bg-amber-500/30 selection:text-amber-200">
      {/* Barra Lateral Navegación */}
      <Sidebar />

      {/* Contenedor Principal */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Topbar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* 1. Header Principal Formal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 tracking-tight text-balance">
                    Despacho de Pedidos Online
                  </h1>
                  {stats.pendientes > 0 && (
                    <span className="text-xs font-mono tabular-nums font-bold px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>{stats.pendientes} en cola</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Verificación de transferencias QR Simple, entrega de materiales en mostrador y emisión de comprobantes SIAT.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={fetchOrders}
                disabled={loading}
                className="btn-press px-4 py-2 bg-[#12151c] hover:bg-zinc-800/90 text-zinc-200 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Sincronizar cola</span>
              </button>
            </div>
          </div>

          {/* 2. Tarjetas de Estadísticas KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pendientes de Entrega */}
            <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Por Entregar (Cola)</p>
                <p className="text-2xl font-black text-zinc-100 mt-1 font-mono tabular-nums">{stats.pendientes}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Esperando verificación en tienda</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Total por Cobrar en Pendientes */}
            <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Importe en Cola QR</p>
                <p className="text-2xl font-black text-amber-400 mt-1 font-mono tabular-nums">Bs. {stats.totalPendientesMonto.toFixed(2)}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">En pedidos pendientes por retirar</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Completados */}
            <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Entregados con Éxito</p>
                <p className="text-2xl font-black text-zinc-100 mt-1 font-mono tabular-nums">{stats.completados}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Pagos verificados y facturados</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            {/* Cancelados */}
            <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cancelados / No Retirados</p>
                <p className="text-2xl font-black text-zinc-300 mt-1 font-mono tabular-nums">{stats.cancelados}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">Sin impacto en inventario</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </div>

          {/* 3. Filtros y Búsqueda */}
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Pestañas de Estado */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setStatusFilter('PENDIENTE')}
                className={`btn-press px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  statusFilter === 'PENDIENTE'
                    ? 'bg-amber-500 text-zinc-950 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'PENDIENTE' ? 'bg-zinc-950' : 'bg-amber-400'}`}></span>
                <span>Pendientes</span>
                <span className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded ${statusFilter === 'PENDIENTE' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                  {stats.pendientes}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('COMPLETADO')}
                className={`btn-press px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  statusFilter === 'COMPLETADO'
                    ? 'bg-emerald-500 text-zinc-950 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'COMPLETADO' ? 'bg-zinc-950' : 'bg-emerald-400'}`}></span>
                <span>Completados</span>
                <span className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded ${statusFilter === 'COMPLETADO' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                  {stats.completados}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('CANCELADO')}
                className={`btn-press px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  statusFilter === 'CANCELADO'
                    ? 'bg-red-500 text-white font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'CANCELADO' ? 'bg-white' : 'bg-red-400'}`}></span>
                <span>Cancelados</span>
                <span className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded ${statusFilter === 'CANCELADO' ? 'bg-black/20 text-white' : 'bg-zinc-800 text-zinc-300'}`}>
                  {stats.cancelados}
                </span>
              </button>

              <button
                onClick={() => setStatusFilter('TODOS')}
                className={`btn-press px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  statusFilter === 'TODOS'
                    ? 'bg-zinc-200 text-zinc-950 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <span>Todos</span>
                <span className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded ${statusFilter === 'TODOS' ? 'bg-zinc-950/15 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                  {stats.total}
                </span>
              </button>
            </div>

            {/* Input de Búsqueda Rápida */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar por código, cliente o NIT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors duration-100 font-medium"
              />
              <svg className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 4. Lista de Pedidos Online */}
          {loading ? (
            <div className="p-16 text-center bg-[#12151c] border border-zinc-800/80 rounded-2xl space-y-3">
              <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-zinc-400">Cargando cola de pedidos online...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-16 text-center bg-[#12151c] border border-zinc-800/80 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-zinc-200">No hay pedidos en este estado</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {statusFilter === 'PENDIENTE'
                  ? 'Actualmente no hay pedidos pendientes en mostrador. Todo se encuentra al día.'
                  : 'No se encontraron registros que coincidan con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isPending = order.EstadoPedido === 'PENDIENTE';
                const isCompleted = order.EstadoPedido === 'COMPLETADO';
                const isCancelled = order.EstadoPedido === 'CANCELADO';

                const totalItemsCount = (order.Detalles || []).reduce((acc, dt) => acc + (dt.Cantidad || 1), 0);

                return (
                  <div
                    key={order.PedidoID}
                    className={`bg-[#12151c] border rounded-2xl p-4 sm:p-5 transition-colors duration-150 ${
                      isPending
                        ? 'border-amber-500/35 hover:border-amber-500/60'
                        : isCompleted
                        ? 'border-emerald-500/25 hover:border-emerald-500/45'
                        : 'border-zinc-800/80 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Información Principal del Pedido */}
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono tabular-nums text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                            #{order.CodigoPedido}
                          </span>

                          {/* Estado */}
                          {isPending && (
                            <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              Pendiente de Verificación y Entrega
                            </span>
                          )}
                          {isCompleted && (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              Entregado en Mostrador
                            </span>
                          )}
                          {isCancelled && (
                            <span className="bg-red-500/10 text-red-400 border border-red-500/25 text-[11px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                              Cancelado
                            </span>
                          )}

                          <span className="text-xs font-mono tabular-nums text-zinc-500">
                            • {new Date(order.FechaPedido).toLocaleString('es-BO')}
                          </span>
                        </div>

                        {/* Datos del Cliente y Teléfono */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-zinc-500">Cliente: </span>
                            <strong className="text-zinc-100 truncate">{order.ClienteNombre}</strong>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <span className="text-zinc-500">NIT/C.I.: </span>
                            <span className="font-mono tabular-nums text-zinc-300">{order.NIT_CI || '0'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-zinc-500">Contacto: </span>
                            {order.Telefono ? (
                              <a
                                href={`https://wa.me/591${order.Telefono.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 font-mono tabular-nums font-bold hover:underline inline-flex items-center gap-1"
                              >
                                <span>{order.Telefono}</span>
                              </a>
                            ) : (
                              <span className="text-zinc-500">No especificado</span>
                            )}
                          </div>
                        </div>

                        {/* Resumen de Productos Pedidos */}
                        <div className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl p-3 text-xs text-zinc-300 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800/70 pb-1.5">
                            <span>Ítems solicitados (<strong className="font-mono tabular-nums text-zinc-200">{totalItemsCount}</strong> unid.):</span>
                            <span className="text-amber-400 font-bold">Transferencia QR Simple</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {(order.Detalles || []).map((dt, idx) => (
                              <span key={idx} className="bg-[#12151c] border border-zinc-800 px-2.5 py-1 rounded-lg text-[11px] text-zinc-200">
                                <strong className="font-mono tabular-nums text-amber-400">{dt.Cantidad}×</strong> {dt.Producto?.Nombre || `Ítem #${dt.ProductoID}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Monto y Botones de Acción */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-800/80">
                        <div className="text-left lg:text-right">
                          <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Importe Total</p>
                          <p className="text-xl sm:text-2xl font-black text-amber-400 font-mono tabular-nums">
                            Bs. {parseFloat(order.Total || 0).toFixed(2)}
                          </p>
                          {order.RequiereFactura && (
                            <span className="inline-block mt-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded font-bold">
                              Factura SIAT Solicitada
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => handleOpenReview(order)}
                                className="btn-press px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Verificar y Entregar</span>
                              </button>

                              <button
                                onClick={() => handleOpenCancel(order)}
                                title="Cancelar Pedido"
                                className="btn-press px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenReview(order)}
                              className="btn-press px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative max-h-[95vh] overflow-y-auto animate-modal-in">
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-zinc-100 flex items-center gap-2">
                    <span className="font-mono tabular-nums">Pedido #{selectedOrder.CodigoPedido}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      selectedOrder.EstadoPedido === 'PENDIENTE'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                        : selectedOrder.EstadoPedido === 'COMPLETADO'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border-red-500/30'
                    }`}>
                      {selectedOrder.EstadoPedido}
                    </span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mt-0.5">
                    <span className="font-mono tabular-nums">{new Date(selectedOrder.FechaPedido).toLocaleString('es-BO')}</span>
                    <span>•</span>
                    <span className="text-zinc-300">Cliente: <strong className="text-zinc-100">{selectedOrder.ClienteNombre}</strong></span>
                    {clientLoyalty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-400 border-amber-500/25">
                        Nivel {clientLoyalty.name} {clientLoyalty.discountPercent > 0 ? `(${clientLoyalty.discountPercent}% Dcto.)` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* PROTOCOLO DE VERIFICACIÓN QR YAPE */}
            {selectedOrder.EstadoPedido === 'PENDIENTE' && (
              <div className="p-4 rounded-xl bg-[#0c0e12] border border-amber-500/25 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Protocolo de Verificación de Pago (Transferencia QR Simple / Yape / BCP)</span>
                </div>
                <div className="space-y-1 text-zinc-300 pl-6 text-[11px]">
                  <p>1. Solicite al cliente el <strong>comprobante de transferencia bancaria</strong> en su dispositivo móvil.</p>
                  <p>2. Compruebe que el importe transferido corresponda a <strong className="font-mono tabular-nums text-zinc-100">Bs. {parseFloat(selectedOrder.Total).toFixed(2)}</strong>.</p>
                  <p>3. Confirme en el extracto de la ferretería que el abono fue acreditado antes de despachar el material.</p>
                </div>
              </div>
            )}

            {/* Tabla de Productos Solicitados con Precios Dinámicos (Con vs Sin Factura) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Materiales a Entregar
                </h4>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                  issueInvoice 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25' 
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/25'
                }`}>
                  Modalidad: {issueInvoice ? 'Con Factura SIAT (13% IVA)' : 'Sin Factura (Nota de Venta)'}
                </span>
              </div>

              <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-[#0c0e12]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 font-bold border-b border-zinc-800">
                    <tr>
                      <th className="p-2.5">Producto</th>
                      <th className="p-2.5 text-center">Cant.</th>
                      <th className="p-2.5 text-right">
                        <span>P. Unit. </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 ${
                          issueInvoice ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          {issueInvoice ? 'Facturado' : 'Sin Fac.'}
                        </span>
                      </th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {dynamicItems.map((dt, idx) => (
                      <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-2.5">
                          <p className="font-bold text-zinc-100">{dt.Producto?.Nombre || `Producto #${dt.ProductoID}`}</p>
                          <span className="text-[10px] font-mono tabular-nums text-zinc-500">
                            Unidad: {dt.Producto?.Unidad?.Nombre || 'Pza'} • SKU: {dt.Producto?.CodigoBarras || 'S/C'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center font-bold text-amber-400 font-mono tabular-nums">
                          {dt.cant}
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums">
                          <span className="font-bold text-zinc-100">Bs. {dt.activeUnitPrice.toFixed(2)}</span>
                          {!issueInvoice && dt.precioConFactura > dt.activeUnitPrice && (
                            <span className="block text-[10px] text-zinc-500 line-through">
                              Bs. {dt.precioConFactura.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-right font-bold text-zinc-100 font-mono tabular-nums">
                          Bs. {dt.activeSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totales Dinámicos y Comparación */}
              <div className="bg-[#0c0e12] p-4 rounded-xl border border-zinc-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal ({issueInvoice ? 'Tarifa con Factura' : 'Tarifa sin Factura'}):</span>
                  <span className="font-mono tabular-nums text-zinc-200 font-bold">Bs. {activeSubtotalSum.toFixed(2)}</span>
                </div>

                {activeLoyaltyDiscount > 0 && (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Descuento Lealtad ({clientLoyalty.name} — {clientLoyalty.discountPercent}%):</span>
                    <span className="font-mono tabular-nums">-Bs. {activeLoyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-zinc-800 font-black">
                  <div>
                    <span className="text-zinc-100 text-sm block">
                      {issueInvoice ? 'Total Factura Fiscal (SIAT):' : 'Total Nota de Venta (Sin Factura):'}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      {issueInvoice ? 'Genera crédito fiscal IVA (13%)' : 'Comprobante interno de entrega en mostrador'}
                    </span>
                  </div>
                  <span className="text-amber-400 text-lg font-mono tabular-nums">
                    Bs. {activeFinalTotal.toFixed(2)}
                  </span>
                </div>

                {/* Comparación con el monto QR inicial */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Importe abonado inicialmente por QR:</span>
                  <span className="font-mono tabular-nums font-bold text-zinc-200">Bs. {parseFloat(selectedOrder.Total || 0).toFixed(2)}</span>
                </div>

                {!issueInvoice && parseFloat(selectedOrder.Total || 0) > activeFinalTotal && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-300 flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <strong>Ajuste por Modalidad Sin Factura:</strong> El importe neto sin IVA es <strong className="text-zinc-100 font-mono tabular-nums">Bs. {activeFinalTotal.toFixed(2)}</strong>.
                      <span className="block text-zinc-100 font-mono tabular-nums font-bold mt-0.5">
                        Diferencia a reintegrar al cliente en mostrador: Bs. {(parseFloat(selectedOrder.Total || 0) - activeFinalTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Opciones de Facturación al Entregar (solo si está PENDIENTE) */}
            {selectedOrder.EstadoPedido === 'PENDIENTE' && (
              <div className="p-4 rounded-xl bg-[#0c0e12] border border-zinc-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Documento de Salida: {issueInvoice ? 'Factura Computarizada SIAT' : 'Nota de Venta (Sin Factura)'}</span>
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {issueInvoice
                        ? 'Se aplicará tarifa facturada y se emitirá factura fiscal.'
                        : 'Se aplicará tarifa sin factura (13% de descuento tributario).'}
                    </p>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer bg-[#12151c] border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl self-start sm:self-auto transition-colors">
                    <input
                      type="checkbox"
                      checked={issueInvoice}
                      onChange={(e) => setIssueInvoice(e.target.checked)}
                      className="w-4 h-4 rounded border-zinc-700 bg-[#0c0e12] cursor-pointer accent-amber-500"
                    />
                    <span className={`text-xs font-bold select-none ${issueInvoice ? 'text-amber-400' : 'text-zinc-400'}`}>
                      Emitir Factura SIAT (13% IVA)
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      {issueInvoice ? 'Razón Social / Nombre en Factura' : 'Nombre del Cliente (Recibo)'}
                    </label>
                    <input
                      type="text"
                      value={billingName}
                      onChange={(e) => setBillingName(e.target.value)}
                      placeholder="Nombre o Razón Social"
                      className="w-full bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                      {issueInvoice ? 'NIT / CI para Facturación' : 'C.I. / NIT (Opcional)'}
                    </label>
                    <input
                      type="text"
                      value={billingNit}
                      onChange={(e) => setBillingNit(e.target.value)}
                      placeholder="0 para Sin Factura"
                      className="w-full bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="btn-press px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cerrar
              </button>

              {selectedOrder.EstadoPedido === 'PENDIENTE' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleConfirmPickup}
                  className="btn-press px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Confirmando despacho...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-mono tabular-nums">Confirmar {issueInvoice ? 'Factura' : 'Entrega'} (Bs. {activeFinalTotal.toFixed(2)})</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative animate-modal-in">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-zinc-100">¿Cancelar Pedido #{selectedOrder.CodigoPedido}?</h3>
              <p className="text-xs text-zinc-400">
                El pedido quedará anulado sin descontar inventario ni generar débito fiscal.
              </p>
            </div>

            <div className="text-xs space-y-1.5 text-left">
              <label className="block font-bold text-zinc-300">Motivo de la anulación:</label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Especifique el motivo..."
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-press px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelOrder}
                className="btn-press px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Cancelando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL POPUP DE ÉXITO E IMPRESIÓN DE RECIBO / FACTURA */}
      {showReceiptModal && lastSaleReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div
            id="printable-receipt-online"
            className="bg-white text-zinc-900 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 font-sans text-xs max-h-[95vh] overflow-y-auto relative border border-zinc-200 animate-modal-in"
          >
            {/* Header / Botón Cerrar */}
            <div className="flex items-center justify-between no-print border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-base font-bold">
                  ✓
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900">
                    {lastSaleReceipt.isInvoice ? 'Factura Oficial Emitida' : 'Recibo Oficial de Entrega'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-mono tabular-nums">Pedido #{lastSaleReceipt.codigoPedido} despachado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 1. Cabecera Empresa */}
            <div className="text-center space-y-0.5 border-b border-zinc-300 pb-3">
              <h2 className="font-extrabold text-base tracking-wider uppercase text-black">CASA Y CONSTRUCCIÓN</h2>
              <p className="text-[10px] text-zinc-600 font-medium">AV. BEIJING Y AV. TADEO HAENKE, COCHABAMBA, BOLIVIA</p>
              <p className="text-[10px] text-zinc-600 font-mono tabular-nums font-medium">NIT: 1028394021 • Teléfono: 78221469</p>
              <h3 className="font-bold text-sm text-black pt-1 uppercase">
                {lastSaleReceipt.isInvoice ? 'Factura Computarizada SIAT (13% IVA)' : 'Recibo / Nota de Entrega Oficial'}
              </h3>
            </div>

            {/* 2. Metadatos: Factura / Recibo No, Cliente, Fecha */}
            <div className="flex justify-between items-start text-[11px] pb-2 border-b border-zinc-300 text-zinc-800">
              <div className="space-y-0.5">
                <p className="font-bold text-black text-xs">
                  {lastSaleReceipt.isInvoice ? 'Factura Nro.:' : 'Recibo Nro.:'} <span className="font-mono tabular-nums font-bold">{lastSaleReceipt.id}</span>
                </p>
                <p>
                  <span className="font-semibold">Pedido Ref.:</span> <span className="font-mono tabular-nums text-zinc-900 font-bold">#{lastSaleReceipt.codigoPedido}</span>
                </p>
                <p>
                  <span className="font-semibold">Cliente:</span> {lastSaleReceipt.cliente || 'CLIENTE GENERAL'}
                  {lastSaleReceipt.nit && lastSaleReceipt.nit !== '0' ? ` (NIT/CI: ${lastSaleReceipt.nit})` : ''}
                </p>
              </div>
              <div className="text-right font-mono tabular-nums text-[11px]">
                <p><span className="font-semibold">Fecha:</span> {lastSaleReceipt.time}</p>
                <p className="text-zinc-500 text-[10px] font-sans">Operador: {lastSaleReceipt.empleado}</p>
                {lastSaleReceipt.isInvoice ? (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-sans font-bold rounded">
                    Factura Electrónica SIAT
                  </span>
                ) : (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-sans font-bold rounded">
                    Nota de Venta (Sin Factura)
                  </span>
                )}
              </div>
            </div>

            {/* 3. Tabla de Productos */}
            <table className="w-full text-left text-[11px] border-collapse my-2">
              <thead>
                <tr className="border-t border-b border-zinc-900 font-bold text-black text-[11px]">
                  <th className="py-1.5 text-left">Producto</th>
                  <th className="py-1.5 text-center w-24">Cantidad</th>
                  <th className="py-1.5 text-right w-24">P. Unit.</th>
                  <th className="py-1.5 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {(lastSaleReceipt.items || []).map((it, idx) => (
                  <tr key={idx} className="text-zinc-800">
                    <td className="py-1.5 pr-2 uppercase font-medium">{it.name || it.producto}</td>
                    <td className="py-1.5 text-center font-mono tabular-nums">
                      {it.quantity} {it.unit || 'PZA'}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      Bs. {parseFloat(it.price || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums font-semibold text-black">
                      Bs. {parseFloat(it.subtotal || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 4. Resumen de Pagos y Totales */}
            <div className="border-t border-zinc-400 pt-2 grid grid-cols-2 gap-4 text-[11px]">
              {/* Izquierda: Pagos */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-700">
                  <span>{lastSaleReceipt.paymentMethod || 'QR Simple'}</span>
                  <span className="font-mono tabular-nums font-semibold">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-black border-t border-zinc-300 pt-1">
                  <span>Total Liquidado</span>
                  <span className="font-mono tabular-nums text-xs">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
                {lastSaleReceipt.isInvoice && (
                  <div className="text-[10px] text-zinc-500 pt-1">
                    Base Crédito Fiscal IVA (13%): <strong className="text-zinc-800 font-mono tabular-nums">Bs. {lastSaleReceipt.total.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {/* Derecha: Subtotal y Total */}
              <div className="space-y-1 text-right">
                <div className="flex justify-between text-zinc-700">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-mono tabular-nums">Bs. {lastSaleReceipt.subtotal.toFixed(2)}</span>
                </div>
                {lastSaleReceipt.discount > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Descuento Lealtad:</span>
                    <span className="font-mono tabular-nums">-Bs. {lastSaleReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-black border-t border-black pt-1 text-xs">
                  <span>Total a Pagar:</span>
                  <span className="font-mono tabular-nums font-black text-emerald-700 text-sm">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botones de Acción en Pantalla (ocultos al imprimir) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 no-print border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="btn-press py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs transition-colors text-center"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => handleDownloadReceiptPdf(lastSaleReceipt.isInvoice)}
                className="btn-press py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{lastSaleReceipt.isInvoice ? 'Descargar PDF' : 'Recibo PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="btn-press py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
        <div className="fixed bottom-6 right-6 z-50 animate-toast-in">
          <div className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-bold border flex items-center gap-2.5 ${
            toast.type === 'success'
              ? 'bg-[#12151c] border-emerald-500/40 text-emerald-400'
              : toast.type === 'error'
              ? 'bg-[#12151c] border-red-500/40 text-red-400'
              : 'bg-[#12151c] border-amber-500/40 text-amber-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default OnlineOrdersView;
