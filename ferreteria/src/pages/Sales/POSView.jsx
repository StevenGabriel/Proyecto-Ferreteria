import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, getCategories, getBrands } from '../../services/api';

function POSView() {
  const navigate = useNavigate();

  // Estados de datos
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros del catálogo derecho
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [gridSearch, setGridSearch] = useState('');
  const [showCategoryFilterModal, setShowCategoryFilterModal] = useState(false);
  const [showBrandFilterModal, setShowBrandFilterModal] = useState(false);

  // Carrito de ventas (Ticket izquierdo)
  const [cart, setCart] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef(null);

  // Cliente seleccionado
  const [clients, setClients] = useState([
    { id: 1, name: 'Cliente General (Sin Factura)', nit: '0', phone: '-' },
    { id: 2, name: 'Constructora Los Andes S.R.L.', nit: '4839201018', phone: '76543210' },
    { id: 3, name: 'Carlos Mendoza Ramos', nit: '5948302', phone: '68920192' },
    { id: 4, name: 'Ingeniería & Proyectos C&C', nit: '1029384019', phone: '71239847' }
  ]);
  const [selectedClient, setSelectedClient] = useState(clients[0]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({ name: '', nit: '', phone: '', email: '' });

  // Descuentos y recargos
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);

  // Modales de cobro y utilidades
  const [showCashModal, setShowCashModal] = useState(false);
  const [showMultiPayModal, setShowMultiPayModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);

  // Cobro en efectivo
  const [receivedCash, setReceivedCash] = useState('');
  const [emitInvoice, setEmitInvoice] = useState(true);
  const [lastSaleReceipt, setLastSaleReceipt] = useState(null);
  const [recentSales, setRecentSales] = useState([
    { id: 'VNT-10024', client: 'Carlos Mendoza Ramos', total: 145.00, items: 3, time: '07/09/2026 00:15', status: 'COMPLETADA' },
    { id: 'VNT-10023', client: 'Cliente General', total: 38.03, items: 1, time: '06/09/2026 23:40', status: 'COMPLETADA' },
    { id: 'VNT-10022', client: 'Constructora Los Andes', total: 450.00, items: 8, time: '06/09/2026 22:10', status: 'COMPLETADA' }
  ]);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Sonido de Beep para lector de código de barras
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio context error:', e);
    }
  };

  // Sonido de Caja Registradora
  const playCashSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((n, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = n;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.08);
        osc.stop(audioCtx.currentTime + i * 0.08 + 0.2);
      });
    } catch (e) {
      console.warn('Audio context error:', e);
    }
  };

  // Cargar productos, categorías y marcas
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pData, cData, bData] = await Promise.all([
          getProducts(),
          getCategories(),
          getBrands()
        ]);
        setProducts(Array.isArray(pData) ? pData : []);
        setCategories(Array.isArray(cData) ? cData : []);
        setBrands(Array.isArray(bData) ? bData : []);
      } catch (err) {
        console.error('Error cargando catálogo POS:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Hora en vivo
  const [currentDateTime, setCurrentDateTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const formatted = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      setCurrentDateTime(formatted);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Mantener foco en el buscador de códigos de barras
  useEffect(() => {
    if (barcodeInputRef.current && !showCashModal && !showNewClientModal && !showReceiptModal) {
      barcodeInputRef.current.focus();
    }
  }, [showCashModal, showNewClientModal, showReceiptModal]);

  // Agregar producto al carrito
  const addToCart = (product) => {
    const stockAvailable = parseInt(product.Stock || 0);
    if (stockAvailable <= 0) {
      showToast(`¡El producto "${product.Nombre}" se encuentra AGOTADO!`, 'error');
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.ProductoID === product.ProductoID);
      if (existing) {
        if (existing.quantity >= stockAvailable) {
          showToast(`Stock máximo disponible alcanzado (${stockAvailable} unidades)`, 'error');
          return prevCart;
        }
        return prevCart.map((item) =>
          item.ProductoID === product.ProductoID
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price }
            : item
        );
      } else {
        const price = parseFloat(product.PrecioVenta || product.Precio || 0);
        return [
          ...prevCart,
          {
            ProductoID: product.ProductoID,
            name: product.Nombre,
            code: product.Codigo || product.CodigoBarras || `PRD-${product.ProductoID}`,
            price: price,
            unit: product.Unidad?.Abreviacion || product.Unidad?.Nombre || 'PZA',
            quantity: 1,
            maxStock: stockAvailable,
            subtotal: price,
            image: product.Imagen
          }
        ];
      }
    });

    playBeep();
    showToast(`"${product.Nombre}" añadido al ticket`);
  };

  // Buscar por escáner de código de barras
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const term = barcodeInput.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.CodigoBarras && p.CodigoBarras.toLowerCase() === term) ||
        (p.Codigo && p.Codigo.toLowerCase() === term) ||
        p.Nombre.toLowerCase().includes(term)
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      showToast(`No se encontró ningún producto con el código "${barcodeInput}"`, 'error');
    }
  };

  // Modificar cantidad en el ticket
  const updateQuantity = (productoId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.ProductoID === productoId) {
            const newQty = item.quantity + delta;
            if (newQty > item.maxStock) {
              showToast(`Límite de existencia alcanzado (${item.maxStock} unidades)`, 'error');
              return item;
            }
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty, subtotal: newQty * item.price };
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Eliminar producto del ticket
  const removeFromCart = (productoId) => {
    setCart((prev) => prev.filter((item) => item.ProductoID !== productoId));
    showToast('Producto removido del ticket', 'info');
  };

  // Vaciar ticket
  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('¿Deseas cancelar y vaciar el ticket de venta actual?')) {
      setCart([]);
      setDiscount(0);
      setTax(0);
      setShipping(0);
      showToast('Venta cancelada y ticket vaciado', 'info');
    }
  };

  // Cálculos de Totales
  const subtotalProducts = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const finalTotal = Math.max(0, subtotalProducts - discount + tax + shipping);

  // Apertura de Modal de Cobro Rápido en Efectivo
  const openCashPayment = () => {
    if (cart.length === 0) {
      showToast('Agrega al menos un producto al ticket antes de cobrar', 'error');
      return;
    }
    setReceivedCash(finalTotal.toFixed(2));
    setShowCashModal(true);
  };

  // Confirmar Cobro
  const confirmSale = () => {
    const cashNum = parseFloat(receivedCash) || 0;
    if (cashNum < finalTotal) {
      showToast('El monto en efectivo ingresado es menor al total a pagar', 'error');
      return;
    }

    playCashSound();

    const newSale = {
      id: `VNT-${Math.floor(10000 + Math.random() * 90000)}`,
      client: selectedClient.name,
      nit: selectedClient.nit,
      items: [...cart],
      totalItemsCount: totalQuantity,
      subtotal: subtotalProducts,
      discount,
      tax,
      shipping,
      total: finalTotal,
      cashReceived: cashNum,
      change: cashNum - finalTotal,
      time: currentDateTime,
      paymentMethod: 'EFECTIVO',
      isInvoice: emitInvoice
    };

    setLastSaleReceipt(newSale);
    setRecentSales((prev) => [newSale, ...prev]);

    // Reducir stock local inmediato
    setProducts((prev) =>
      prev.map((p) => {
        const inCart = cart.find((item) => item.ProductoID === p.ProductoID);
        if (inCart) {
          return { ...p, Stock: Math.max(0, (p.Stock || 0) - inCart.quantity) };
        }
        return p;
      })
    );

    setShowCashModal(false);
    setShowReceiptModal(true);
    setCart([]);
    setDiscount(0);
    setTax(0);
    setShipping(0);
    showToast('¡Venta completada y stock descontado con éxito!', 'success');
  };

  // Crear Cliente Rápido
  const handleCreateClient = (e) => {
    e.preventDefault();
    if (!newClientForm.name.trim()) {
      showToast('Por favor introduce el nombre del cliente', 'error');
      return;
    }

    const created = {
      id: clients.length + 1,
      name: newClientForm.name.trim(),
      nit: newClientForm.nit.trim() || '0',
      phone: newClientForm.phone.trim() || '-',
      email: newClientForm.email.trim() || '-'
    };

    setClients((prev) => [...prev, created]);
    setSelectedClient(created);
    setShowNewClientModal(false);
    setNewClientForm({ name: '', nit: '', phone: '', email: '' });
    showToast(`Cliente "${created.name}" registrado y seleccionado`, 'success');
  };

  // Filtro de productos en el grid derecho
  const filteredGridProducts = products.filter((p) => {
    const matchCategory = selectedCategory === 'ALL' || (p.Categoria && (p.Categoria.CategoriaID === selectedCategory || p.Categoria.Nombre === selectedCategory));
    const matchBrand = selectedBrand === 'ALL' || (p.Marca && (p.Marca.MarcaID === selectedBrand || p.Marca.Nombre === selectedBrand));
    const matchSearch =
      !gridSearch ||
      p.Nombre.toLowerCase().includes(gridSearch.toLowerCase()) ||
      (p.Codigo && p.Codigo.toLowerCase().includes(gridSearch.toLowerCase())) ||
      (p.CodigoBarras && p.CodigoBarras.toLowerCase().includes(gridSearch.toLowerCase()));
    return matchCategory && matchBrand && matchSearch;
  });

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex flex-col select-none overflow-hidden h-screen">
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR DE ENCABEZADO POS (ESTILO FOTO ERP)                     */}
      {/* ========================================================================= */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-md flex-shrink-0 z-20">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-700"
            title="Salir del Punto de Venta y volver al Panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Salir del POS</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Ubicación:</span>
            <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
              CASA Y CONSTRUCCION (SUCURSAL CENTRAL)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700 text-xs font-mono font-bold text-slate-300">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{currentDateTime}</span>
          </div>
        </div>

        {/* Herramientas de la cabecera derecha */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCalculatorModal(true)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-700"
            title="Calculadora de mostrador"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </button>

          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all border border-slate-700"
            title="Pantalla Completa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-bold transition-all ml-2"
          >
            <span>+</span>
            <span>Agregar gasto</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CUERPO PRINCIPAL DIVIDIDO EN 2 PANELES: TICKET (IZQ) Y CATÁLOGO (DER) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ======================================================================= */}
        {/* PANEL IZQUIERDO: TICKET / MOSTRADOR DE COBRO                           */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[48%] xl:w-[45%] bg-slate-900/60 border-r border-slate-800 flex flex-col justify-between overflow-hidden">
          {/* Fila 1: Selector de Cliente */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/40 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <select
                value={selectedClient.id}
                onChange={(e) => {
                  const target = clients.find((c) => c.id === parseInt(e.target.value));
                  if (target) setSelectedClient(target);
                }}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nit !== '0' ? `(NIT: ${c.nit})` : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowNewClientModal(true)}
                className="w-8 h-8 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-base transition-all"
                title="Registrar nuevo cliente rápido"
              >
                +
              </button>
            </div>

            {/* Fila 2: Buscador / Escáner de Código de Barras */}
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Introduzca el nombre del producto / SKU / código de barras de escaneo..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium transition-all"
                />
                <svg className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button
                type="submit"
                className="w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center font-bold text-sm transition-all"
                title="Buscar o añadir"
              >
                +
              </button>
            </form>
          </div>

          {/* Tabla de Productos en Ticket */}
          <div className="flex-1 overflow-y-auto p-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-bold">
                  <th className="pb-2 pl-2">Producto ⓘ</th>
                  <th className="pb-2 text-center w-28">Cantidad</th>
                  <th className="pb-2 text-right w-24">Subtotal</th>
                  <th className="pb-2 text-center w-10">✖</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-medium">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-16 text-center text-slate-500">
                      <div className="w-12 h-12 rounded-full bg-slate-800/40 border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto mb-3">
                        <svg className="w-6 h-6 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-xs font-semibold text-slate-400">El ticket de venta está vacío</p>
                      <p className="text-[11px] text-slate-600 mt-1">Escanea un código de barras o pulsa un producto del catálogo</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.ProductoID} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 pl-2">
                        <div className="font-bold text-slate-200 uppercase leading-tight truncate max-w-[180px] sm:max-w-[220px]">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-cyan-400">{item.code}</span>
                          <span>•</span>
                          <span>Bs. {item.price.toFixed(2)} c/u</span>
                        </div>
                      </td>

                      {/* Contador de Cantidad */}
                      <td className="py-2.5 text-center">
                        <div className="inline-flex items-center border border-slate-700 bg-slate-950 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.ProductoID, -1)}
                            className="px-2 py-1 hover:bg-slate-800 text-slate-300 font-black transition-colors"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-white min-w-[24px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.ProductoID, 1)}
                            className="px-2 py-1 hover:bg-slate-800 text-slate-300 font-black transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Subtotal del item */}
                      <td className="py-2.5 text-right font-extrabold text-slate-200">
                        Bs. {item.subtotal.toFixed(2)}
                      </td>

                      {/* Botón Borrar fila */}
                      <td className="py-2.5 text-center">
                        <button
                          onClick={() => removeFromCart(item.ProductoID)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Quitar del ticket"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subtotales y Modificadores del Ticket */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-400 font-semibold">
              <span>Productos: {totalQuantity.toFixed(2)}</span>
              <span className="text-sm font-bold text-white">Subtotal: Bs. {subtotalProducts.toFixed(2)}</span>
            </div>

            {/* Modificadores: Descuento, Impuesto, Transporte */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
              <button
                onClick={() => {
                  const val = prompt('Ingresar Descuento (-):', discount.toString());
                  if (val !== null) setDiscount(parseFloat(val) || 0);
                }}
                className="flex items-center justify-between px-2 py-1 bg-slate-800 rounded border border-slate-700 hover:border-slate-600 text-slate-300"
              >
                <span>Descuento (-):</span>
                <b className="text-rose-400">Bs. {discount.toFixed(2)} ✎</b>
              </button>

              <button
                onClick={() => {
                  const val = prompt('Ingresar Impuesto del pedido (+):', tax.toString());
                  if (val !== null) setTax(parseFloat(val) || 0);
                }}
                className="flex items-center justify-between px-2 py-1 bg-slate-800 rounded border border-slate-700 hover:border-slate-600 text-slate-300"
              >
                <span>Impuesto (+):</span>
                <b className="text-cyan-400">Bs. {tax.toFixed(2)} ✎</b>
              </button>

              <button
                onClick={() => {
                  const val = prompt('Ingresar Transporte / Flete (+):', shipping.toString());
                  if (val !== null) setShipping(parseFloat(val) || 0);
                }}
                className="flex items-center justify-between px-2 py-1 bg-slate-800 rounded border border-slate-700 hover:border-slate-600 text-slate-300"
              >
                <span>Transporte (+):</span>
                <b className="text-amber-400">Bs. {shipping.toFixed(2)} ✎</b>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL DERECHO: CATÁLOGO TÁCTIL Y GALERÍA DE PRODUCTOS                   */}
        {/* ======================================================================= */}
        <div className="flex-1 bg-slate-950 flex flex-col justify-between overflow-hidden">
          {/* Botones de Categorías y Marcas Superiores */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/30 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1">
              {/* Botón Filtro de Categoría */}
              <button
                onClick={() => setShowCategoryFilterModal(true)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedCategory !== 'ALL'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-purple-600/80 hover:bg-purple-600 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Categoría {selectedCategory !== 'ALL' ? `(${selectedCategory})` : ''}</span>
              </button>

              {/* Botón Filtro de Marcas */}
              <button
                onClick={() => setShowBrandFilterModal(true)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedBrand !== 'ALL'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-blue-600/80 hover:bg-blue-600 text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Marcas {selectedBrand !== 'ALL' ? `(${selectedBrand})` : ''}</span>
              </button>

              {(selectedCategory !== 'ALL' || selectedBrand !== 'ALL') && (
                <button
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSelectedBrand('ALL');
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20"
                >
                  ✕ Quitar filtros
                </button>
              )}
            </div>

            {/* Buscador de Grid */}
            <div className="relative w-48 sm:w-64">
              <input
                type="text"
                placeholder="Filtrar catálogo..."
                value={gridSearch}
                onChange={(e) => setGridSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-2.5 top-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Grilla Táctil de Productos (Tarjetas como la foto ERP) */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                <span className="text-xs font-semibold">Cargando inventario táctil...</span>
              </div>
            ) : filteredGridProducts.length === 0 ? (
              <div className="py-24 text-center text-slate-500">
                <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-slate-400">No hay productos que coincidan con la búsqueda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-3">
                {filteredGridProducts.map((p) => {
                  const stock = parseInt(p.Stock || 0);
                  const isOut = stock <= 0;
                  const price = parseFloat(p.PrecioVenta || p.Precio || 0);

                  return (
                    <div
                      key={p.ProductoID}
                      onClick={() => !isOut && addToCart(p)}
                      className={`group bg-slate-900/70 border rounded-2xl p-3 flex flex-col items-center justify-between text-center transition-all relative overflow-hidden ${
                        isOut
                          ? 'border-rose-500/30 opacity-60 cursor-not-allowed'
                          : 'border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 cursor-pointer shadow-md hover:shadow-cyan-500/10'
                      }`}
                    >
                      {/* Imagen o Icono del Producto */}
                      <div className="w-20 h-20 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center p-1 mb-2 overflow-hidden flex-shrink-0">
                        {p.Imagen ? (
                          <img src={p.Imagen} alt={p.Nombre} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                        ) : (
                          <svg className="w-8 h-8 text-cyan-400/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        )}
                      </div>

                      {/* Nombre y SKU */}
                      <div className="w-full space-y-1">
                        <p className="text-[11px] font-extrabold text-slate-200 uppercase line-clamp-2 leading-tight">
                          {p.Nombre}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          ({p.Codigo || p.CodigoBarras || `PRD-${p.ProductoID}`})
                        </p>
                      </div>

                      {/* Precio y Stock */}
                      <div className="w-full mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-cyan-400">
                          Bs. {price.toFixed(2)}
                        </span>

                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : stock <= (p.LoteMinimo || 5)
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isOut ? 'Agotado' : `(${stock.toFixed(2)} ud)`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BARRA INFERIOR DE COBRO RÁPIDO POS (ESTILO EXACTO A LA FOTO ERP)       */}
      {/* ========================================================================= */}
      <footer className="bg-slate-900 border-t border-slate-800 p-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xl flex-shrink-0 z-20">
        {/* Acciones Rápidas Izquierda */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => showToast('Venta guardada en borrador', 'info')}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold border border-slate-700 transition-all"
          >
            <span>📝</span>
            <span>Borrador</span>
          </button>

          <button
            onClick={() => showToast('Cotización generada', 'info')}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold border border-slate-700 transition-all"
          >
            <span>✏️</span>
            <span>Cotización</span>
          </button>

          <button
            onClick={() => showToast('Venta suspendida / puesta en espera', 'info')}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold border border-slate-700 transition-all"
          >
            <span>⏸</span>
            <span>Suspender</span>
          </button>

          <button
            onClick={() => showToast('Modalidad crédito seleccionada', 'info')}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold border border-slate-700 transition-all"
          >
            <span>✔</span>
            <span>Venta a crédito</span>
          </button>

          <button
            onClick={() => showToast('Terminal de Tarjeta lista', 'info')}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold border border-slate-700 transition-all"
          >
            <span>💳</span>
            <span>Tarjeta</span>
          </button>
        </div>

        {/* Botones de Cobro y Total Destacado */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (cart.length === 0) return showToast('Agrega productos al ticket', 'error');
              setShowMultiPayModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20 transition-all"
          >
            Pago múltiple
          </button>

          <button
            onClick={openCashPayment}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all animate-pulse"
          >
            <span>💵</span>
            <span>Efectivo</span>
          </button>

          <button
            onClick={clearCart}
            className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl font-bold text-xs transition-all"
          >
            Cancelar
          </button>

          {/* Gran Total Visual */}
          <div className="bg-slate-950 px-5 py-2 rounded-xl border border-slate-800 text-right">
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wider">Total a Pagar</span>
            <span className="text-xl font-black text-cyan-400 tracking-tight">
              Bs. {finalTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Acciones Derecha */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              if (!lastSaleReceipt) return showToast('No hay ventas previas en esta sesión', 'error');
              setShowReceiptModal(true);
            }}
            className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all shadow-md"
          >
            Facturar última venta
          </button>

          <button
            onClick={() => setShowRecentSalesModal(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md"
          >
            Transacciones Recientes
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. MODAL: COBRO EN EFECTIVO CON CALCULADORA DE CAMBIO / VUELTO            */}
      {/* ========================================================================= */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  Bs
                </div>
                <h3 className="font-extrabold text-white text-base">Cobro Rápido en Efectivo</h3>
              </div>
              <button onClick={() => setShowCashModal(false)} className="text-slate-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            {/* Gran Cuadro de Total */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total de la Venta</span>
              <p className="text-3xl font-black text-cyan-400 mt-1">Bs. {finalTotal.toFixed(2)}</p>
            </div>

            {/* Botones de Billetes Rápidos */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Billetes Rápidos:</label>
              <div className="grid grid-cols-6 gap-1.5">
                {[10, 20, 50, 100, 200].map((bill) => (
                  <button
                    key={bill}
                    type="button"
                    onClick={() => setReceivedCash(bill.toString())}
                    className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs border border-slate-700 transition-all"
                  >
                    {bill}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReceivedCash(finalTotal.toFixed(2))}
                  className="py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition-all"
                >
                  Exacto
                </button>
              </div>
            </div>

            {/* Input de Monto Recibido y Cambio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Monto Recibido (Bs.):</label>
                <input
                  type="number"
                  step="0.10"
                  value={receivedCash}
                  onChange={(e) => setReceivedCash(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-black text-white focus:outline-none focus:border-cyan-400"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Cambio / Vuelto:</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-lg font-black text-emerald-400">
                  Bs. {Math.max(0, (parseFloat(receivedCash) || 0) - finalTotal).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Opción Factura SIAT */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-white block">Emitir Factura Electrónica SIAT</span>
                <span className="text-slate-500 text-[11px]">A nombre de: {selectedClient.name} (NIT: {selectedClient.nit})</span>
              </div>
              <input
                type="checkbox"
                checked={emitInvoice}
                onChange={(e) => setEmitInvoice(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Botón de Confirmación */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowCashModal(false)}
                className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
              >
                Volver
              </button>
              <button
                onClick={confirmSale}
                className="w-2/3 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black rounded-xl text-sm shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>✓</span>
                <span>Confirmar Venta e Imprimir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: RECIBO / TICKET TÉRMICO DE LA VENTA                             */}
      {/* ========================================================================= */}
      {showReceiptModal && lastSaleReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h2 className="font-extrabold text-base tracking-wider uppercase">Ferretería C&C</h2>
              <p className="text-[10px] text-slate-600">CASA Y CONSTRUCCION S.R.L.</p>
              <p className="text-[10px] text-slate-600">NIT: 102839029 • Sucursal Central</p>
              <p className="text-[10px] text-slate-500 mt-1">{lastSaleReceipt.time}</p>
            </div>

            <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
              <p><b>Ticket:</b> {lastSaleReceipt.id}</p>
              <p><b>Cliente:</b> {lastSaleReceipt.client}</p>
              <p><b>NIT/CI:</b> {lastSaleReceipt.nit}</p>
              <p><b>Tipo:</b> {lastSaleReceipt.isInvoice ? 'Factura SIAT Oficial' : 'Recibo de Mostrador'}</p>
            </div>

            {/* Detalle de Artículos */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-3">
              {lastSaleReceipt.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[11px]">
                  <span className="truncate max-w-[180px]">{it.quantity}x {it.name}</span>
                  <span className="font-bold">Bs. {it.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totales */}
            <div className="space-y-1 pt-1 font-bold text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>Bs. {lastSaleReceipt.subtotal.toFixed(2)}</span>
              </div>
              {lastSaleReceipt.discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Descuento:</span>
                  <span>-Bs. {lastSaleReceipt.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black border-t border-slate-900 pt-1">
                <span>TOTAL:</span>
                <span>Bs. {lastSaleReceipt.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                <span>Efectivo Recibido:</span>
                <span>Bs. {lastSaleReceipt.cashReceived.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>Cambio:</span>
                <span>Bs. {lastSaleReceipt.change.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-dashed border-slate-300">
              <p>¡Gracias por su preferencia!</p>
              <p>Conserve este comprobante</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="w-1/2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="w-1/2 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL: REGISTRAR NUEVO CLIENTE RÁPIDO                                  */}
      {/* ========================================================================= */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleCreateClient} className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>👤</span>
                <span>Nuevo Cliente Rápido</span>
              </h3>
              <button type="button" onClick={() => setShowNewClientModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Nombre Completo o Razón Social *</label>
              <input
                type="text"
                required
                value={newClientForm.name}
                onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="Ej. Juan Pérez / Empresa S.A."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">CI / NIT</label>
                <input
                  type="text"
                  value={newClientForm.nit}
                  onChange={(e) => setNewClientForm({ ...newClientForm, nit: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  placeholder="0 para sin NIT"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Teléfono / Celular</label>
                <input
                  type="text"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  placeholder="70000000"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewClientModal(false)}
                className="w-1/2 py-2.5 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="w-1/2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: FILTRAR POR CATEGORÍA                                           */}
      {/* ========================================================================= */}
      {showCategoryFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base">Seleccionar Categoría</h3>
              <button onClick={() => setShowCategoryFilterModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setShowCategoryFilterModal(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold text-left border transition-all ${
                  selectedCategory === 'ALL'
                    ? 'bg-purple-600 text-white border-purple-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                ⊞ Todas las categorías
              </button>
              {categories.map((c) => (
                <button
                  key={c.CategoriaID}
                  onClick={() => {
                    setSelectedCategory(c.Nombre);
                    setShowCategoryFilterModal(false);
                  }}
                  className={`p-3 rounded-xl text-xs font-bold text-left border transition-all truncate ${
                    selectedCategory === c.Nombre
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {c.Nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: FILTRAR POR MARCA                                               */}
      {/* ========================================================================= */}
      {showBrandFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base">Seleccionar Marca</h3>
              <button onClick={() => setShowBrandFilterModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedBrand('ALL');
                  setShowBrandFilterModal(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold text-left border transition-all ${
                  selectedBrand === 'ALL'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                🏷 Todas las marcas
              </button>
              {brands.map((b) => (
                <button
                  key={b.MarcaID}
                  onClick={() => {
                    setSelectedBrand(b.Nombre);
                    setShowBrandFilterModal(false);
                  }}
                  className={`p-3 rounded-xl text-xs font-bold text-left border transition-all truncate ${
                    selectedBrand === b.Nombre
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {b.Nombre}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: TRANSACCIONES RECIENTES                                         */}
      {/* ========================================================================= */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>🟣</span>
                <span>Transacciones Recientes de la Sesión</span>
              </h3>
              <button onClick={() => setShowRecentSalesModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
              {recentSales.map((s, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-cyan-400">{s.id}</span>
                    <p className="font-bold text-white mt-0.5">{s.client}</p>
                    <span className="text-[10px] text-slate-500">{s.time}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-400 block">Bs. {s.total.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400">{s.items} productos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOAST FLOTANTE DE NOTIFICACIONES                                          */}
      {/* ========================================================================= */}
      {toast.show && (
        <div
          className={`fixed bottom-16 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-bold animate-fade-in flex items-center gap-2 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500 text-rose-300'
              : toast.type === 'info'
              ? 'bg-blue-950/90 border-blue-500 text-blue-300'
              : 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
          }`}
        >
          <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default POSView;

