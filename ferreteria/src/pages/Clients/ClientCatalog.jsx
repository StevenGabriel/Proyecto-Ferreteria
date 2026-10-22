import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, getCategories, getBrands, createOnlineOrder } from '../../services/api';
import { generateInvoiceTicketPdf } from '../../utils/invoicePdfGenerator';
import QRCode from 'qrcode';
import { LOYALTY_TIERS } from '../../constants/loyalty';
import ChatbotWidget from '../../components/chatbot/ChatbotWidget';

function ClientCatalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros, Búsqueda y Paginación
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('default');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Carrito de compras (con persistencia en LocalStorage)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_client_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quantities, setQuantities] = useState({}); // Mapa de cantidades por ProductoID en el grid

  // Modal de Vista Rápida (Quick View)
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  // Modal de Requerimiento de Inicio de Sesión para Carrito
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Estados de Checkout y Venta Online Real
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSuccessOrderModal, setShowSuccessOrderModal] = useState(false);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Formulario de Checkout Online
  const [checkoutName, setCheckoutName] = useState('');
  const [checkoutNit, setCheckoutNit] = useState('');
  const [checkoutPhone, setCheckoutPhone] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [deliveryType, setDeliveryType] = useState('RECOJO'); // 'RECOJO' | 'DOMICILIO'
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('QR'); // 'QR' | 'CONTRA_ENTREGA' | 'TRANSFERENCIA'

  // Sesión de Usuario y Menú Desplegable
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cyc_user_session') || localStorage.getItem('cyc_client_session');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Auto-cargar datos del cliente desde su cuenta registrada (NIT, Teléfono, Nombre)
  useEffect(() => {
    if (currentUser) {
      const registeredName = currentUser.Nombre || currentUser.nombre || currentUser.RazonSocial || '';
      const registeredNit = currentUser.CI_NIT || currentUser.ciNit || currentUser.NIT || currentUser.nit || currentUser.ci || '';
      const registeredPhone = currentUser.Telefono || currentUser.telefono || currentUser.phone || '';

      if (registeredName) setCheckoutName(registeredName);
      if (registeredNit && registeredNit !== '0') setCheckoutNit(registeredNit);
      if (registeredPhone) setCheckoutPhone(registeredPhone);
    }
  }, [currentUser]);

  // Cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem('cyc_user_session');
    localStorage.removeItem('cyc_client_session');
    setCurrentUser(null);
    setIsUserMenuOpen(false);
    setToastMessage("Has cerrado sesión exitosamente.");
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Toast flotante
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Efecto de sonido sintetizado para feedback al agregar al carrito
  const playCartSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn("Audio Context no soportado", e);
    }
  };

  // Carga inicial de datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodsRes, catsRes, brandsRes] = await Promise.allSettled([
          getProducts(),
          getCategories(),
          getBrands()
        ]);
        if (prodsRes.status === 'fulfilled' && Array.isArray(prodsRes.value)) {
          setProducts(prodsRes.value);
        }
        if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value)) {
          setCategories(catsRes.value);
        }
        if (brandsRes.status === 'fulfilled' && Array.isArray(brandsRes.value)) {
          setBrands(brandsRes.value);
        }
      } catch (err) {
        console.error("Error al cargar el catálogo de productos:", err);
        setError("No se pudieron cargar los productos en este momento.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Persistir carrito en LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('cyc_client_cart', JSON.stringify(cart));
    } catch (e) {
      console.error("Error guardando el carrito:", e);
    }
  }, [cart]);

  // Manejo de cantidades en el grid
  const getItemQuantity = (productId) => quantities[productId] || 1;

  const setItemQuantity = (productId, qty, maxStock = null) => {
    let validQty = Math.max(1, parseInt(qty) || 1);
    if (maxStock !== null && maxStock !== undefined && validQty > maxStock) {
      validQty = Math.max(1, maxStock);
      setToastMessage(`Stock máximo disponible alcanzado (${maxStock} unid.)`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }
    setQuantities(prev => ({ ...prev, [productId]: validQty }));
  };

  // Agregar producto al carrito
  const addToCart = (product, customQty = null) => {
    // Si no ha iniciado sesión, bloquear acción y abrir modal de login/registro
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const qtyToAdd = customQty !== null ? customQty : getItemQuantity(product.ProductoID);
    const availableStock = product.Stock || 0;

    if (availableStock <= 0) {
      setToastMessage(`"${product.Nombre}" se encuentra actualmente agotado.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      return;
    }

    let reachedLimit = false;
    let actualAdded = qtyToAdd;

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.ProductoID === product.ProductoID);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const currentInCart = updated[existingIndex].quantity;
        const proposedTotal = currentInCart + qtyToAdd;

        if (proposedTotal > availableStock) {
          reachedLimit = true;
          actualAdded = Math.max(0, availableStock - currentInCart);
          updated[existingIndex].quantity = availableStock;
        } else {
          updated[existingIndex].quantity = proposedTotal;
        }
        return updated;
      } else {
        const initialQty = Math.min(qtyToAdd, availableStock);
        if (qtyToAdd > availableStock) {
          reachedLimit = true;
          actualAdded = initialQty;
        }
        return [...prevCart, { product, quantity: initialQty }];
      }
    });

    playCartSound();
    if (reachedLimit) {
      setToastMessage(`Has alcanzado el límite disponible para "${product.Nombre}" (máx. ${availableStock} unid.)`);
    } else {
      setToastMessage(`¡${product.Nombre} (${actualAdded} unid) añadido al carrito!`);
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Modificar cantidad dentro del carrito
  const updateCartQuantity = (productId, delta) => {
    let reachedLimit = false;

    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.product.ProductoID === productId) {
            const availableStock = item.product.Stock || 0;
            const newQty = item.quantity + delta;

            if (delta > 0 && newQty > availableStock) {
              reachedLimit = true;
              return { ...item, quantity: availableStock };
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });

    if (reachedLimit) {
      setToastMessage(`No puedes agregar más unidades del stock disponible.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }
  };

  // Remover ítem del carrito
  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product.ProductoID !== productId));
  };

  // Vaciar carrito
  const clearCart = () => {
    if (window.confirm("¿Deseas vaciar todos los productos de tu carrito?")) {
      setCart([]);
    }
  };

  // Determinar nivel de lealtad y descuento del usuario conectado
  const userLoyaltyTierKey = currentUser?.NivelLealtad || 'Estandar';
  const userTierInfo = LOYALTY_TIERS[userLoyaltyTierKey] || LOYALTY_TIERS.Estandar;
  const userDiscountPercent = (currentUser?.DescuentoPorcentaje !== undefined && currentUser?.DescuentoPorcentaje !== null && parseFloat(currentUser.DescuentoPorcentaje) > 0)
    ? parseFloat(currentUser.DescuentoPorcentaje)
    : (userTierInfo?.discount || 0);

  // Cálculo de totales del carrito
  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => {
    const price = parseFloat(item.product.PrecioVenta || 0);
    return acc + price * item.quantity;
  }, 0);
  const cartLoyaltyDiscount = userDiscountPercent > 0 ? (cartSubtotal * userDiscountPercent) / 100 : 0;
  const cartFinalTotal = Math.max(0, cartSubtotal - cartLoyaltyDiscount);
  const cartTotalPrice = cartFinalTotal;

  // Efecto para generar el Código QR dinámico al abrir el modal o cambiar el método a QR
  useEffect(() => {
    if (showCheckoutModal && checkoutPaymentMethod === 'QR' && cartFinalTotal > 0) {
      const qrPayload = `BOLIVIA-PAGOSIMPLE|EMPRESA:CYC FERRETERIA|MONTO:${cartFinalTotal.toFixed(2)}|REF:PEDIDO-ONLINE|FECHA:${new Date().toISOString()}`;
      QRCode.toDataURL(qrPayload, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error("Error generando código QR:", err));
    }
  }, [showCheckoutModal, checkoutPaymentMethod, cartFinalTotal]);

  // Abrir Modal de Checkout Online Real
  const handleOpenCheckoutModal = () => {
    if (cart.length === 0) {
      setToastMessage("Tu carrito está vacío. Agrega productos antes de pagar.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const registeredName = currentUser.Nombre || currentUser.nombre || currentUser.RazonSocial || '';
    const registeredNit = currentUser.CI_NIT || currentUser.ciNit || currentUser.NIT || currentUser.nit || currentUser.ci || '';
    const registeredPhone = currentUser.Telefono || currentUser.telefono || currentUser.phone || '';

    setCheckoutName(registeredName);
    setCheckoutNit(registeredNit && registeredNit !== '0' ? registeredNit : '');
    setCheckoutPhone(registeredPhone);
    setDeliveryType('RECOJO');
    setShowCheckoutModal(true);
  };

  // Procesar Compra Real con Descuento Inmediato de Stock en Base de Datos (MSSQL)
  const handleConfirmOrder = async (e) => {
    if (e) e.preventDefault();
    if (cart.length === 0) return;
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (!checkoutName.trim()) {
      setToastMessage("Por favor ingresa tu Nombre o Razón Social.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      return;
    }

    if (!checkoutPhone.trim() || !/^[0-9+ -]{7,15}$/.test(checkoutPhone.trim())) {
      setToastMessage("Por favor ingresa un número de teléfono o celular válido (mínimo 7 dígitos).");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      return;
    }

    if (cart.some(it => !it.quantity || it.quantity <= 0)) {
      setToastMessage("Uno o más productos en el carrito tienen una cantidad inválida.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
      return;
    }

    setProcessingOrder(true);
    try {
      const itemsPayload = cart.map(item => ({
        ProductoID: item.product.ProductoID,
        Cantidad: item.quantity,
        PrecioUnitario: parseFloat(item.product.PrecioVenta || 0)
      }));

      const pickupAddress = 'Recojo en mostrador central C&C Ferretería (Av. Beijing y Av. Tadeo Haenke)';
      const hasNit = checkoutNit.trim() !== '' && checkoutNit.trim() !== '0';

      const orderPayload = {
        clienteID: currentUser?.ClienteID || currentUser?.id || null,
        clienteNombre: checkoutName.trim(),
        telefono: checkoutPhone.trim() || null,
        nit: checkoutNit.trim() || '0',
        tipoDocumento: checkoutNit.trim().length > 8 ? 'NIT' : 'CI',
        descuento: cartLoyaltyDiscount,
        requiereFactura: hasNit,
        notas: 'Recojo en mostrador central',
        items: itemsPayload
      };

      const response = await createOnlineOrder(orderPayload);
      const orderResult = response?.order || {};

      // Estructurar datos de la reserva online completada para la pantalla de confirmación
      const completedData = {
        orderId: orderResult.CodigoPedido || `PED-${orderResult.PedidoID || '0000'}`,
        pedidoId: orderResult.PedidoID,
        date: new Date().toLocaleString('es-BO'),
        clientName: checkoutName.trim(),
        nit: checkoutNit.trim() || '0',
        telefono: checkoutPhone.trim() || 'No especificado',
        total: cartFinalTotal,
        subtotal: cartSubtotal,
        discount: cartLoyaltyDiscount,
        paymentMethod: 'Yape / QR Simple Bolivia',
        deliveryType: 'RECOJO',
        address: pickupAddress,
        notes: 'Recojo en mostrador central (Av. Beijing y Av. Tadeo Haenke)',
        isInvoice: hasNit,
        isPreOrder: true,
        items: cart.map(it => ({
          nombre: it.product.Nombre,
          cantidad: it.quantity,
          unidad: it.product.Unidad?.Nombre || 'Pza',
          precio: parseFloat(it.product.PrecioVenta || 0),
          subtotal: it.quantity * parseFloat(it.product.PrecioVenta || 0)
        }))
      };

      setCompletedOrderData(completedData);

      // Limpiar carrito tras registrar la reserva
      setCart([]);
      localStorage.removeItem('cyc_client_cart');
      setIsCartOpen(false);
      setShowCheckoutModal(false);
      setShowSuccessOrderModal(true);

    } catch (err) {
      console.error("Error al procesar la reserva del pedido online:", err);
      const errMsg = err.response?.data?.message || err.message || "Error al procesar el pedido en el servidor.";
      setToastMessage(errMsg);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setProcessingOrder(false);
    }
  };

  // Descargar Comprobante de Reserva de Pedido PDF
  const handleDownloadTicketPdf = async () => {
    if (!completedOrderData) return;
    try {
      await generateInvoiceTicketPdf({
        id: completedOrderData.orderId,
        numeroFactura: completedOrderData.orderId,
        time: completedOrderData.date,
        nit: completedOrderData.nit,
        cliente: completedOrderData.clientName,
        subtotal: completedOrderData.subtotal,
        discount: completedOrderData.discount,
        total: completedOrderData.total,
        isInvoice: false,
        isPreOrder: true,
        items: completedOrderData.items.map(it => ({
          nombre: it.nombre,
          cantidad: it.cantidad,
          precio: it.precio,
          subtotal: it.subtotal
        }))
      }, { openInTab: false, download: true });
    } catch (e) {
      console.error("Error al descargar comprobante PDF:", e);
      setToastMessage("Error al generar el comprobante de reserva en PDF.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Notificar o coordinar retiro por WhatsApp con el número de reserva oficial
  const handleNotifyWhatsApp = () => {
    if (!completedOrderData) return;
    let msg = `🛒 *HOLA C&C FERRETERÍA, ACABO DE RESERVAR MI PEDIDO ONLINE CON PAGO QR*\n\n`;
    msg += `🔖 *N° de Reserva:* ${completedOrderData.orderId}\n`;
    msg += `👤 *Cliente:* ${completedOrderData.clientName}\n`;
    msg += `📱 *Teléfono:* ${completedOrderData.telefono}\n`;
    msg += `📄 *NIT/C.I.:* ${completedOrderData.nit}\n`;
    msg += `💰 *Total a Cobrar con QR:* Bs. ${completedOrderData.total.toFixed(2)}\n`;
    msg += `📱 *Método de Pago:* Pago QR Simple (Yape)\n`;
    msg += `🏬 *Modalidad:* Recojo en mostrador central (Beijing y Tadeo Haenke)\n\n`;
    msg += `📦 *Productos Reservados:*\n`;
    completedOrderData.items.forEach((it, idx) => {
      msg += `  ${idx + 1}. ${it.nombre} (${it.cantidad} unid.) = Bs. ${it.subtotal.toFixed(2)}\n`;
    });
    msg += `\n_Tengo listo mi comprobante de transferencia Yape. Pasaré por el mostrador a verificar el pago, retirar los productos y recibir mi factura/recibo oficial._`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/59167524675?text=${encoded}`, '_blank');
  };

  // Filtrado y Ordenamiento de Productos
  const filteredProducts = products.filter(product => {
    const matchesSearch =
      (product.Nombre && product.Nombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.CodigoBarras && product.CodigoBarras.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.Marca && product.Marca.Nombre.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || product.CategoriaID === parseInt(selectedCategory);

    const matchesBrand =
      selectedBrand === 'ALL' || product.MarcaID === parseInt(selectedBrand);

    return matchesSearch && matchesCategory && matchesBrand;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOrder === 'price_asc') {
      return parseFloat(a.PrecioVenta || 0) - parseFloat(b.PrecioVenta || 0);
    }
    if (sortOrder === 'price_desc') {
      return parseFloat(b.PrecioVenta || 0) - parseFloat(a.PrecioVenta || 0);
    }
    if (sortOrder === 'name_asc') {
      return (a.Nombre || '').localeCompare(b.Nombre || '');
    }
    if (sortOrder === 'name_desc') {
      return (b.Nombre || '').localeCompare(a.Nombre || '');
    }
    return 0; // default
  });

  // Cálculos de Paginación para el Catálogo Público
  const totalItems = sortedProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  // Resetear a la página 1 cuando cambia cualquier filtro, búsqueda o cantidad por página
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, sortOrder, itemsPerPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    const catalogElement = document.getElementById('catalog-products-section');
    if (catalogElement) {
      catalogElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-100">
      
      {/* 1. BARRA SUPERIOR / HEADER PRINCIPAL */}
      <header className="bg-[#0c0e12]/95 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Marca */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-extrabold text-lg tracking-tighter shadow-sm transition-transform duration-160 ease-out-expo group-hover:scale-[1.03] group-active:scale-[0.97]">
                C&C
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-zinc-100 group-hover:text-amber-400 transition-colors duration-160 ease-out-expo block leading-tight">
                  C&C Ferretería
                </span>
                <span className="text-[11px] text-zinc-400 font-medium block leading-tight">
                  Casa y Construcción
                </span>
              </div>
            </Link>

            {/* Botón Carrito en Mobile */}
            <button
              onClick={() => {
                if (!currentUser) {
                  setShowAuthModal(true);
                  return;
                }
                setIsCartOpen(true);
              }}
              className="md:hidden relative px-3 py-2 bg-zinc-900 text-amber-400 rounded-xl border border-zinc-800 flex items-center gap-1.5 btn-press"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartTotalItems > 0 && (
                <span className="bg-amber-500 text-zinc-950 font-mono font-bold tabular-nums text-xs px-1.5 py-0.5 rounded-md">
                  {cartTotalItems}
                </span>
              )}
            </button>
          </div>

          {/* Barra de Búsqueda Central con Selector de Categoría integrado */}
          <div className="w-full md:max-w-2xl flex items-center bg-[#12151c] border border-zinc-800 rounded-xl overflow-hidden focus-within:border-amber-500/70 transition-colors duration-160 ease-out-expo">
            {/* Dropdown de Categoría integrado */}
            <div className="hidden sm:block border-r border-zinc-800 bg-zinc-900/70">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-zinc-300 text-xs font-semibold px-3.5 py-2.5 outline-none cursor-pointer hover:text-zinc-100 transition-colors duration-160"
              >
                <option value="ALL" className="bg-zinc-900 text-zinc-100">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat.CategoriaID} value={cat.CategoriaID} className="bg-zinc-900 text-zinc-100">
                    {cat.Nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Input de Búsqueda */}
            <input
              type="text"
              placeholder="Buscar por herramienta, material, marca o código SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none"
            />

            {/* Botón Buscar / Lupa */}
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-3 py-2.5 text-zinc-500 hover:text-zinc-200 transition-colors duration-160"
                title="Limpiar búsqueda"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
            <button
              type="button"
              className="px-4 py-2.5 bg-zinc-800/80 hover:bg-amber-500 hover:text-zinc-950 text-zinc-300 font-semibold transition-colors duration-160 ease-out-expo"
              aria-label="Buscar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Acciones del Menú Superior: Login y Carrito */}
          <div className="hidden md:flex items-center gap-3">
            {/* Iniciar Sesión / Registrarse o Perfil de Usuario Logueado */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-[#12151c] hover:bg-zinc-800/90 border border-zinc-800 hover:border-zinc-700 rounded-xl btn-press"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center">
                    {currentUser.Nombre ? currentUser.Nombre.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-zinc-100 max-w-[130px] truncate leading-none">
                        {currentUser.Nombre || currentUser.Correo}
                      </p>
                      {userTierInfo && userDiscountPercent > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold tabular-nums rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {userTierInfo.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium leading-none block mt-0.5 tabular-nums">
                      {currentUser.Rol || 'Cliente'} {userDiscountPercent > 0 && `· ${userDiscountPercent}% dto.`}
                    </span>
                  </div>
                  <svg className={`w-3.5 h-3.5 text-zinc-400 ml-0.5 transition-transform duration-160 ease-out-expo ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown flotante del usuario (Origin-aware: origin-top-right + animate-popover-in) */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-[#14171f] border border-zinc-800 rounded-2xl shadow-2xl p-3 z-50 origin-top-right animate-popover-in space-y-2">
                    <div className="px-3 py-2.5 bg-[#0c0e12] rounded-xl border border-zinc-800/80 space-y-1.5">
                      <p className="text-xs font-bold text-zinc-100 truncate">{currentUser.Nombre || "Usuario"}</p>
                      <p className="text-[11px] text-zinc-400 truncate font-mono">{currentUser.Correo}</p>
                      <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800/80">
                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-semibold text-zinc-300">
                          {currentUser.Rol || "Cliente"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums border ${userTierInfo.textClass || 'text-amber-300 bg-amber-500/10 border-amber-500/30'}`}>
                          {userTierInfo.badge} ({userDiscountPercent}% OFF)
                        </span>
                      </div>
                    </div>

                    {/* Si es Administrador, acceso directo al Dashboard */}
                    {currentUser.Rol === 'Administrador' && (
                      <Link
                        to="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-amber-400 hover:bg-zinc-800/60 rounded-xl transition-colors duration-160"
                      >
                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Panel de Administración</span>
                      </Link>
                    )}

                    <div className="pt-1 border-t border-zinc-800/80">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors duration-160"
                      >
                        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Cerrar sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-3.5 py-2 bg-[#12151c] hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-semibold btn-press"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Ingresar / Registrarse</span>
              </Link>
            )}

            {/* Botón Carrito de Compras */}
            <button
              onClick={() => {
                if (!currentUser) {
                  setShowAuthModal(true);
                  return;
                }
                setIsCartOpen(true);
              }}
              className="flex items-center gap-2.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs btn-press"
            >
              <div className="relative flex items-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <span>Pedido ({cartTotalItems})</span>
              <span className="bg-zinc-950/20 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold tabular-nums text-zinc-950">
                Bs. {cartTotalPrice.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BANNER PRINCIPAL ARQUITECTÓNICO / INDUSTRIAL (Impeccable + Taste Skill) */}
      <div className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div
          className="relative rounded-2xl overflow-hidden bg-[#12151c] border border-zinc-800/90 p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          style={{
            backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.07) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Columna Izquierda: Propuesta de valor directa sin adornos IA */}
          <div className="lg:col-span-7 space-y-3 text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-100 tracking-tight leading-[1.15]">
              Suministros técnicos, herramientas y materiales de construcción con stock en tiempo real
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-[62ch]">
              Consulta existencias reales en almacén, accede a precios con descuento para contratistas y reserva tu pedido en línea con QR Simple para retiro directo en mostrador.
            </p>
          </div>

          {/* Columna Derecha: Ficha Técnica Operativa de la Ferretería (Datos Tabulares Reales) */}
          <div className="lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">Ítems en catálogo</span>
              <span className="text-2xl font-mono font-bold text-zinc-100 tabular-nums mt-2">
                {products.length}
              </span>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Sincronizado
              </span>
            </div>

            <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">Líneas técnicas</span>
              <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums mt-2">
                {categories.length}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">
                Mayor y detalle
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">Despacho central</span>
              <span className="text-sm font-bold text-zinc-100 mt-2 leading-snug">
                Av. Beijing y Tadeo Haenke
              </span>
              <span className="text-[10px] text-zinc-500 font-mono mt-1">
                Cochabamba · SIAT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS, PÍLDORAS Y ORDENAMIENTO */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        
        {/* Píldoras de Categorías (Sin scale-105 molesto, usando btn-press y tabular-nums) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap btn-press flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'bg-[#12151c] border border-zinc-800/90 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
            }`}
          >
            <span>Todas</span>
            <span className={`font-mono text-[11px] tabular-nums ${selectedCategory === 'ALL' ? 'text-zinc-900' : 'text-zinc-500'}`}>
              ({products.length})
            </span>
          </button>
          {categories.map(cat => {
            const count = products.filter(p => p.CategoriaID === cat.CategoriaID).length;
            const isSelected = selectedCategory === cat.CategoriaID.toString();
            return (
              <button
                key={cat.CategoriaID}
                onClick={() => setSelectedCategory(cat.CategoriaID.toString())}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap btn-press flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'bg-[#12151c] border border-zinc-800/90 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                }`}
              >
                <span>{cat.Nombre}</span>
                <span className={`font-mono text-[11px] tabular-nums ${isSelected ? 'text-zinc-900' : 'text-zinc-500'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Barra de Controles y Ordenamiento */}
        <div id="catalog-products-section" className="bg-[#12151c] border border-zinc-800/90 rounded-xl px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-4 scroll-mt-24">
          <div className="text-xs text-zinc-400 font-medium">
            Mostrando <span className="font-mono font-bold text-amber-400 tabular-nums">{totalItems > 0 ? startIndex + 1 : 0} - {endIndex}</span> de <span className="font-mono font-bold text-zinc-100 tabular-nums">{totalItems}</span> productos disponibles
            {selectedCategory !== 'ALL' && ` en ${categories.find(c => c.CategoriaID.toString() === selectedCategory)?.Nombre}`}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {/* Selector de cantidad por página */}
            <div className="flex items-center gap-2 text-xs">
              <label className="text-zinc-400 font-medium">Mostrar:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#0c0e12] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-semibold font-mono tabular-nums outline-none cursor-pointer focus:border-amber-500/70 transition-colors duration-160"
              >
                <option value={15}>15 por pág.</option>
                <option value={20}>20 por pág.</option>
                <option value={40}>40 por pág.</option>
                <option value={60}>60 por pág.</option>
                <option value={999999}>Ver todos</option>
              </select>
            </div>

            {/* Filtro por Marca */}
            <div className="flex items-center gap-2 text-xs">
              <label className="text-zinc-400 font-medium">Marca:</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-[#0c0e12] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-semibold outline-none cursor-pointer focus:border-amber-500/70 transition-colors duration-160"
              >
                <option value="ALL">Todas las marcas</option>
                {brands.map(b => (
                  <option key={b.MarcaID} value={b.MarcaID}>{b.Nombre}</option>
                ))}
              </select>
            </div>

            {/* Ordenamiento */}
            <div className="flex items-center gap-2 text-xs">
              <label className="text-zinc-400 font-medium">Ordenar:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-[#0c0e12] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-semibold outline-none cursor-pointer focus:border-amber-500/70 transition-colors duration-160"
              >
                <option value="default">Relevancia</option>
                <option value="price_asc">Precio: menor a mayor</option>
                <option value="price_desc">Precio: mayor a menor</option>
                <option value="name_asc">Nombre: A - Z</option>
                <option value="name_desc">Nombre: Z - A</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. GRID DE TARJETAS DE PRODUCTOS (Con Skeleton Loader en lugar de spinner genérico) */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#12151c] border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col animate-pulse"
              >
                <div className="aspect-square bg-zinc-900/80" />
                <div className="p-4 space-y-3">
                  <div className="h-2.5 w-16 bg-zinc-800 rounded" />
                  <div className="h-4 w-full bg-zinc-800 rounded" />
                  <div className="h-4 w-2/3 bg-zinc-800 rounded" />
                  <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-center">
                    <div className="h-3 w-12 bg-zinc-800 rounded" />
                    <div className="h-5 w-20 bg-zinc-800 rounded" />
                  </div>
                  <div className="h-9 w-full bg-zinc-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-sm font-medium">
            {error}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-16 text-center space-y-4 bg-[#12151c] border border-zinc-800/90 rounded-2xl p-10">
            <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-100">Sin resultados para tu búsqueda</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              No encontramos productos que coincidan con "{searchQuery}" o los filtros activos.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedBrand('ALL'); }}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold rounded-xl text-xs btn-press"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {paginatedProducts.map((p) => {
              const stock = p.Stock || 0;
              const isAvailable = stock > 0;
              const priceVenta = parseFloat(p.PrecioVenta || 0);
              const currentQty = getItemQuantity(p.ProductoID);

              return (
                <article
                  key={p.ProductoID}
                  className="bg-[#12151c] border border-zinc-800/90 hover:border-zinc-700 rounded-2xl overflow-hidden transition-colors duration-180 ease-out-expo flex flex-col group"
                >
                  {/* Contenedor de Imagen con Overlay y Botón QuickView */}
                  <div className="relative aspect-square bg-[#0c0e12] overflow-hidden flex items-center justify-center p-5 border-b border-zinc-800/60">
                    {p.Imagen ? (
                      <img
                        src={p.Imagen}
                        alt={p.Nombre}
                        className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-260 ease-out-expo"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/40 rounded-xl">
                        <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                        </svg>
                        <span className="text-[10px] text-zinc-500 mt-2 font-medium">Sin fotografía</span>
                      </div>
                    )}

                    {/* Badge de Marca */}
                    {p.Marca && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 bg-[#12151c]/90 border border-zinc-800 text-zinc-300 font-semibold text-[10px] rounded-md">
                        {p.Marca.Nombre}
                      </span>
                    )}

                    {/* Badge de Stock con números tabulares reales */}
                    <span
                      className={`absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums ${
                        isAvailable
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isAvailable ? `Stock: ${stock}` : 'Agotado'}
                    </span>

                    {/* Botón Flotante de Vista Rápida (con desplazamiento sutil ease-out-expo) */}
                    <button
                      onClick={() => setQuickViewProduct(p)}
                      className="absolute inset-x-3 bottom-3 py-2 bg-[#14171f]/95 hover:bg-zinc-800 text-zinc-100 font-semibold text-xs rounded-xl border border-zinc-700/80 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-[opacity,transform,background-color] duration-180 ease-out-expo flex items-center justify-center gap-1.5 shadow-lg"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Ficha técnica</span>
                    </button>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500 font-medium">
                        <span className="truncate">{p.Categoria?.Nombre || 'General'}</span>
                        {p.CodigoBarras && (
                          <span className="font-mono tabular-nums text-zinc-500">#{p.CodigoBarras}</span>
                        )}
                      </div>
                      <h3
                        onClick={() => setQuickViewProduct(p)}
                        className="text-sm font-bold text-zinc-100 line-clamp-2 hover:text-amber-400 cursor-pointer transition-colors duration-160 mt-1 leading-snug"
                        title={p.Nombre}
                      >
                        {p.Nombre}
                      </h3>
                    </div>

                    {/* Precio Tabular */}
                    <div className="pt-2.5 border-t border-zinc-800/80">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-zinc-400 font-medium">Precio unitario</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-base font-bold text-amber-400 font-mono tabular-nums">
                            Bs. {priceVenta.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">/ {p.Unidad?.Nombre || 'Pza'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Controles de Cantidad y Botón de Añadir */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between gap-2">
                        {/* Stepper de cantidad */}
                        <div className="flex items-center bg-[#0c0e12] border border-zinc-800 rounded-xl overflow-hidden w-24">
                          <button
                            disabled={!isAvailable || currentQty <= 1}
                            onClick={() => setItemQuantity(p.ProductoID, currentQty - 1, stock)}
                            className="px-2.5 py-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 font-mono font-bold transition-colors duration-160 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={stock}
                            value={currentQty}
                            onChange={(e) => setItemQuantity(p.ProductoID, e.target.value, stock)}
                            className="w-full text-center bg-transparent text-xs text-zinc-100 font-mono font-bold tabular-nums outline-none"
                          />
                          <button
                            disabled={!isAvailable || currentQty >= stock}
                            onClick={() => setItemQuantity(p.ProductoID, currentQty + 1, stock)}
                            className="px-2.5 py-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 font-mono font-bold transition-colors duration-160 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>

                        {/* Botón Añadir */}
                        <button
                          disabled={!isAvailable}
                          onClick={() => addToCart(p)}
                          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 ${
                            isAvailable
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 btn-press'
                              : 'bg-zinc-800/70 text-zinc-500 cursor-not-allowed'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Agregar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* 4.5 PAGINADOR INTERACTIVO DEL CATÁLOGO */}
        {!loading && totalPages > 1 && (
          <div className="bg-[#12151c] border border-zinc-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="text-xs text-zinc-400 font-medium font-mono tabular-nums">
              Página <span className="font-bold text-amber-400">{validCurrentPage}</span> de <span className="font-bold text-zinc-200">{totalPages}</span>
              <span className="text-zinc-500 font-sans ml-2">({totalItems} productos en catálogo)</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Botón Primera Página */}
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="px-2.5 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-xl text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer font-bold text-xs"
                title="Primera página"
              >
                «
              </button>

              {/* Botón Anterior */}
              <button
                type="button"
                onClick={() => handlePageChange(Math.max(validCurrentPage - 1, 1))}
                disabled={validCurrentPage === 1}
                className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-xl text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer text-xs font-semibold"
              >
                Anterior
              </button>

              {/* Botones numéricos de página */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const shouldShow =
                  page === 1 ||
                  page === totalPages ||
                  (page >= validCurrentPage - 1 && page <= validCurrentPage + 1);

                if (!shouldShow) {
                  if (page === 2 || page === totalPages - 1) {
                    return (
                      <span key={page} className="text-zinc-600 font-mono tabular-nums text-xs px-1 select-none">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1.5 rounded-xl font-mono tabular-nums text-xs font-bold transition-colors duration-160 ease-out-expo btn-press cursor-pointer ${
                      validCurrentPage === page
                        ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                        : 'bg-[#0c0e12] border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}

              {/* Botón Siguiente */}
              <button
                type="button"
                onClick={() => handlePageChange(Math.min(validCurrentPage + 1, totalPages))}
                disabled={validCurrentPage === totalPages}
                className="px-3 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-xl text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer text-xs font-semibold"
              >
                Siguiente
              </button>

              {/* Botón Última Página */}
              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="px-2.5 py-1.5 bg-[#0c0e12] border border-zinc-800 rounded-xl text-zinc-300 hover:text-zinc-100 hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-160 ease-out-expo btn-press cursor-pointer font-bold text-xs"
                title="Última página"
              >
                »
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 5. DRAWER / PANEL LATERAL DEL CARRITO DE COMPRAS (Emil Kowalski --ease-drawer curve) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Fondo desenfocado */}
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/75 backdrop-blur-xs animate-fade-in"
          ></div>

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#12151c] border-l border-zinc-800 shadow-2xl flex flex-col justify-between animate-drawer-right">
              
              {/* Header del Carrito */}
              <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">Resumen de Pedido</h3>
                    <p className="text-xs text-zinc-400 font-mono tabular-nums">{cartTotalItems} unidades seleccionadas</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-zinc-400 hover:text-zinc-100 w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center transition-colors duration-160"
                  aria-label="Cerrar carrito"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Lista de Productos en el Carrito */}
              <div className="p-5 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-zinc-200">Tu pedido está vacío</p>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto">Selecciona herramientas o materiales del catálogo para calcular tu presupuesto.</p>
                  </div>
                ) : (
                  cart.map(({ product, quantity }) => {
                    const itemPrice = parseFloat(product.PrecioVenta || 0);
                    const subtotal = itemPrice * quantity;

                    return (
                      <div
                        key={product.ProductoID}
                        className="bg-[#0c0e12] p-3.5 rounded-xl border border-zinc-800/90 flex gap-3.5 items-center"
                      >
                        {/* Miniatura */}
                        {product.Imagen ? (
                          <img
                            src={product.Imagen}
                            alt={product.Nombre}
                            className="w-14 h-14 object-contain bg-zinc-900 p-1 rounded-lg border border-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                            </svg>
                          </div>
                        )}

                        {/* Detalles */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-zinc-100 truncate" title={product.Nombre}>
                            {product.Nombre}
                          </h4>
                          <p className="text-[11px] text-zinc-400 font-mono tabular-nums mt-0.5">
                            Bs. {itemPrice.toFixed(2)} c/u
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            {/* Control de cantidad */}
                            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                              <button
                                onClick={() => updateCartQuantity(product.ProductoID, -1)}
                                className="px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-100 font-mono font-bold transition-colors duration-160"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-mono font-bold tabular-nums text-zinc-100">{quantity}</span>
                              <button
                                disabled={quantity >= (product.Stock || 0)}
                                onClick={() => updateCartQuantity(product.ProductoID, 1)}
                                className="px-2 py-0.5 text-xs text-zinc-400 hover:text-zinc-100 font-mono font-bold transition-colors duration-160 disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>

                            {/* Subtotal del ítem */}
                            <span className="text-xs font-mono font-bold tabular-nums text-amber-400">
                              Bs. {subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => removeFromCart(product.ProductoID)}
                          className="text-zinc-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors duration-160"
                          title="Quitar del pedido"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer del Carrito con Resumen y Checkout */}
              {cart.length > 0 && (
                <div className="p-5 bg-[#0c0e12] border-t border-zinc-800 space-y-4">
                  {/* Beneficio de Lealtad / Banner Informativo */}
                  {currentUser && userDiscountPercent > 0 ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs text-amber-300">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-bold">Nivel {userTierInfo.badge} aplicado</p>
                          <p className="text-[10px] text-amber-300/80">{userDiscountPercent}% de descuento directo</p>
                        </div>
                      </div>
                      <span className="font-mono font-bold tabular-nums text-amber-300">-Bs. {cartLoyaltyDiscount.toFixed(2)}</span>
                    </div>
                  ) : !currentUser ? (
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2.5 text-xs text-zinc-300">
                      <p className="text-[11px] leading-snug">
                        <strong className="text-amber-400">¿Cliente frecuente o contratista?</strong> Ingresa con tu cuenta para aplicar tu tarifa con descuento.
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-1.5 text-xs text-zinc-300">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Subtotal</span>
                      <span className="font-mono font-semibold tabular-nums text-zinc-100">Bs. {cartSubtotal.toFixed(2)}</span>
                    </div>

                    {userDiscountPercent > 0 && (
                      <div className="flex justify-between text-amber-400 font-semibold">
                        <span>Descuento ({userTierInfo.badge} · {userDiscountPercent}%)</span>
                        <span className="font-mono tabular-nums">-Bs. {cartLoyaltyDiscount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm font-bold">
                      <span className="text-zinc-100">Total a Pagar</span>
                      <span className="font-mono tabular-nums text-amber-400">Bs. {cartFinalTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botón Finalizar Compra y Pagar Online */}
                  <button
                    onClick={handleOpenCheckoutModal}
                    className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 btn-press"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span>Proceder al Pago con QR</span>
                  </button>

                  {/* Vaciar Carrito */}
                  <button
                    onClick={clearCart}
                    className="w-full py-1.5 text-zinc-500 hover:text-rose-400 font-medium text-[11px] transition-colors duration-160"
                  >
                    Vaciar pedido
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE VISTA RÁPIDA (QUICK VIEW — animate-modal-in 220ms ease-out-expo) */}
      {quickViewProduct && (
        <div
          onClick={() => setQuickViewProduct(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative animate-modal-in"
          >
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center transition-colors duration-160"
              aria-label="Cerrar vista rápida"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Imagen Grande */}
              <div className="aspect-square bg-[#0c0e12] rounded-xl border border-zinc-800/90 p-5 flex items-center justify-center overflow-hidden">
                {quickViewProduct.Imagen ? (
                  <img
                    src={quickViewProduct.Imagen}
                    alt={quickViewProduct.Nombre}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Información Técnica */}
              <div className="space-y-3.5">
                <div className="flex items-center flex-wrap gap-2">
                  {quickViewProduct.Marca && (
                    <span className="px-2.5 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-bold">
                      {quickViewProduct.Marca.Nombre}
                    </span>
                  )}
                  {quickViewProduct.Categoria && (
                    <span className="px-2.5 py-0.5 bg-zinc-800 text-zinc-300 rounded-md text-[10px] font-semibold">
                      {quickViewProduct.Categoria.Nombre}
                    </span>
                  )}
                  {quickViewProduct.CodigoBarras && (
                    <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
                      SKU: {quickViewProduct.CodigoBarras}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-extrabold text-zinc-100 leading-snug">
                  {quickViewProduct.Nombre}
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                  {quickViewProduct.Descripcion || "Suministro técnico certificado para construcción, mantenimiento y ferretería general."}
                </p>

                <div className="py-3 border-y border-zinc-800/90 flex items-baseline justify-between">
                  <span className="text-xs text-zinc-400 font-medium">Precio unitario</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
                      Bs. {parseFloat(quickViewProduct.PrecioVenta || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-500 font-mono">/ {quickViewProduct.Unidad?.Nombre || 'Pza'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Existencias en almacén:</span>
                  <span
                    className={`font-mono font-bold tabular-nums px-2.5 py-0.5 rounded-md text-[11px] ${
                      (quickViewProduct.Stock || 0) > 0
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {(quickViewProduct.Stock || 0) > 0 ? `${quickViewProduct.Stock} disponibles` : 'Agotado'}
                  </span>
                </div>

                {/* Botón Añadir desde QuickView */}
                <button
                  disabled={(quickViewProduct.Stock || 0) <= 0}
                  onClick={() => {
                    if (!currentUser) {
                      setQuickViewProduct(null);
                      setShowAuthModal(true);
                      return;
                    }
                    addToCart(quickViewProduct, 1);
                    setQuickViewProduct(null);
                  }}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 btn-press"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Agregar al Pedido</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TOAST FLOTANTE DE CONFIRMACIÓN (Emil Kowalski Spatial Consistency) */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#14171f] border border-zinc-700/90 rounded-xl shadow-2xl p-3.5 flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-100 leading-snug">{toastMessage}</p>
          </div>
          <button
            onClick={() => setShowToast(false)}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded-lg transition-colors duration-160 outline-none"
            aria-label="Cerrar notificación"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 8. MODAL DE AUTENTICACIÓN REQUERIDA PARA USAR EL CARRITO */}
      {showAuthModal && (
        <div
          onClick={() => setShowAuthModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-md w-full p-6 sm:p-7 space-y-5 shadow-2xl relative text-center animate-modal-in"
          >
            {/* Botón Cerrar */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center transition-colors duration-160"
              aria-label="Cerrar ventana"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Ícono de Candado */}
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-extrabold text-zinc-100 tracking-tight">
                Ingresa con tu cuenta de cliente
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
                Para armar tu pedido, aplicar <span className="text-amber-400 font-semibold">descuentos por volumen o lealtad</span> y reservar existencias en C&C Ferretería, inicia sesión o regístrate.
              </p>
            </div>

            {/* Beneficios rápidos */}
            <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-3.5 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2.5 text-zinc-300">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Tarifas preferenciales para contratistas (hasta 10% dto.)</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Facturación computarizada automática con tu NIT / C.I.</span>
              </div>
              <div className="flex items-center gap-2.5 text-zinc-300">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>Reserva inmediata de stock para recojo en mostrador</span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-2.5">
              <Link
                to="/login"
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 btn-press"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Iniciar sesión</span>
              </Link>

              <Link
                to="/registro"
                className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 btn-press"
              >
                <span>Crear cuenta de cliente</span>
              </Link>
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 font-medium transition-colors duration-160"
            >
              Seguir consultando el catálogo
            </button>
          </div>
        </div>
      )}

      {/* 8. MODAL DE CHECKOUT ONLINE REAL (FACTURACIÓN, ENTREGA Y PAGO CON QR) */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] flex flex-col animate-modal-in">
            {/* Cabecera del Modal */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-lg font-extrabold text-zinc-100 tracking-tight">
                      Confirmación de Reserva y Pago QR
                    </h3>
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Reserva de stock en vivo
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Tu orden aparta el material en almacén inmediatamente para retiro rápido en mostrador.
                  </p>
                </div>
              </div>
              <button
                onClick={() => !processingOrder && setShowCheckoutModal(false)}
                disabled={processingOrder}
                className="text-zinc-400 hover:text-zinc-100 w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center transition-colors duration-160 disabled:opacity-50"
                aria-label="Cerrar checkout"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido en 2 Columnas */}
            <form onSubmit={handleConfirmOrder} className="flex-1 overflow-y-auto py-4 space-y-5 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-5 custom-scrollbar">
              {/* Columna Izquierda: Datos de Facturación y Entrega (7 cols) */}
              <div className="sm:col-span-7 space-y-4">
                <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 space-y-3.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-100">
                    <span className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[11px] flex items-center justify-center">1</span>
                    <span>Datos de Facturación (SIAT)</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-zinc-400">
                          Nombre o Razón Social <span className="text-rose-400">*</span>
                        </label>
                        {currentUser && checkoutName && (
                          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            <span>Autocompletado</span>
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        value={checkoutName}
                        onChange={(e) => setCheckoutName(e.target.value)}
                        placeholder="Ej. Constructora San Miguel S.R.L."
                        className="w-full bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 transition-colors duration-160 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                          NIT o Cédula de Identidad
                        </label>
                        <input
                          type="text"
                          value={checkoutNit}
                          onChange={(e) => setCheckoutNit(e.target.value)}
                          placeholder="NIT o CI para factura"
                          className="w-full bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 transition-colors duration-160 font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                          Teléfono / Celular
                        </label>
                        <input
                          type="tel"
                          value={checkoutPhone}
                          onChange={(e) => setCheckoutPhone(e.target.value)}
                          placeholder="Ej. 76543210"
                          className="w-full bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/70 transition-colors duration-160 font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modalidad de Entrega: Recojo en Tienda Directamente */}
                <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[11px] flex items-center justify-center">2</span>
                      <span>Punto de Retiro</span>
                    </div>
                    <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      Entrega inmediata · Sin costo
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-zinc-800 bg-[#12151c] text-left flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.75A2.25 2.25 0 0024 18.75V10.5m-18 0V4.5a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 4.5v6" />
                      </svg>
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-zinc-100">Mostrador Central C&C Ferretería</p>
                      <p className="text-[11px] text-zinc-300">
                        Av. Beijing esq. Av. Tadeo Haenke, Cochabamba.
                      </p>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Tus materiales quedan separados a tu nombre. Presenta tu código de reserva o C.I. en caja para retirar tu pedido y tu factura oficial.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Método de Pago Exclusivo con QR y Resumen (5 cols) */}
              <div className="sm:col-span-5 space-y-4">
                <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[11px] flex items-center justify-center">3</span>
                      <span>Pago con QR Simple / Yape</span>
                    </div>
                  </div>

                  {/* Código QR Real de Yape / BCP */}
                  <div className="p-3.5 bg-[#12151c] border border-zinc-800 rounded-xl text-center space-y-2.5">
                    <p className="text-[11px] text-zinc-300">
                      Escanea el código desde tu aplicación bancaria o <strong>Yape Bolivia</strong>:
                    </p>
                    <div className="flex justify-center p-2.5 bg-white rounded-xl mx-auto w-fit border border-zinc-700">
                      <img src="/qr_yape_ferreteria.png" alt="QR Yape C&C Ferretería" className="w-44 h-44 object-contain" />
                    </div>
                    <div className="text-[11px] text-zinc-300 font-mono tabular-nums bg-[#0c0e12] py-2 px-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                      <span className="text-zinc-400">Importe exacto:</span>
                      <strong className="text-amber-400 text-sm font-bold">Bs. {cartFinalTotal.toFixed(2)}</strong>
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-snug">
                      Compatible con Yape, BCP, Banco Unión, BNB, BancoSol, Mercantil Santa Cruz y toda la red QR Simple.
                    </p>
                  </div>
                </div>

                {/* Resumen de Costos */}
                <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal ({cartTotalItems} unid.)</span>
                    <span className="text-zinc-100 font-mono tabular-nums">Bs. {cartSubtotal.toFixed(2)}</span>
                  </div>

                  {userDiscountPercent > 0 && (
                    <div className="flex justify-between text-amber-400 font-semibold">
                      <span>Descuento {userTierInfo.name} ({userDiscountPercent}%)</span>
                      <span className="font-mono tabular-nums">-Bs. {cartLoyaltyDiscount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-zinc-400">
                    <span>Retiro en mostrador</span>
                    <span className="text-emerald-400 font-semibold">Sin cargo</span>
                  </div>

                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-zinc-100">Total a Pagar</span>
                    <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">Bs. {cartFinalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Botón de Confirmación */}
                <button
                  type="submit"
                  disabled={processingOrder}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 btn-press disabled:opacity-50"
                >
                  {processingOrder ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                      <span>Registrando reserva en inventario...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="tabular-nums">Confirmar Reserva (Bs. {cartFinalTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL DE ÉXITO DE COMPRA ONLINE (TICKET PDF + WHATSAPP) */}
      {showSuccessOrderModal && completedOrderData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative text-center animate-modal-in">
            {/* Ícono de Éxito */}
            <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-md inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                Reserva registrada · Pendiente de verificación en caja
              </span>
              <h3 className="text-xl font-extrabold text-zinc-100 tracking-tight">
                Pedido reservado correctamente
              </h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                Tus productos han sido separados en almacén. Presenta tu comprobante QR en mostrador central para retirar tus materiales y tu factura oficial.
              </p>
            </div>

            {/* Tarjeta de Resumen del Pedido */}
            <div className="bg-[#0c0e12] border border-zinc-800/90 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                <span className="text-zinc-400">Código de Reserva</span>
                <span className="font-mono font-bold tabular-nums text-amber-400 text-sm">#{completedOrderData.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Cliente</span>
                <span className="text-zinc-100 font-semibold">{completedOrderData.clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Teléfono</span>
                <span className="text-zinc-300 font-mono tabular-nums">{completedOrderData.telefono || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">NIT / C.I.</span>
                <span className="text-zinc-300 font-mono tabular-nums">{completedOrderData.nit}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Modalidad de Pago</span>
                <span className="text-zinc-200 font-semibold">{completedOrderData.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Punto de Retiro</span>
                <span className="text-zinc-300 text-[11px]">Av. Beijing y Av. Tadeo Haenke</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <span className="text-zinc-200 font-bold">Total Transferido</span>
                <span className="font-mono font-bold tabular-nums text-amber-400 text-base">Bs. {completedOrderData.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Acciones del Comprobante */}
            <div className="space-y-2.5">
              {/* Botón Descargar Ticket PDF */}
              <button
                type="button"
                onClick={handleDownloadTicketPdf}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 btn-press"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Descargar Comprobante de Reserva (PDF)</span>
              </button>

              {/* Botón Notificar por WhatsApp */}
              <button
                type="button"
                onClick={handleNotifyWhatsApp}
                className="w-full py-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold rounded-xl text-xs flex items-center justify-center gap-2 btn-press"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z"/>
                </svg>
                <span>Enviar comprobante por WhatsApp</span>
              </button>
            </div>

            {/* Cerrar y Continuar */}
            <button
              onClick={() => {
                setShowSuccessOrderModal(false);
                setCompletedOrderData(null);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-200 font-medium transition-colors duration-160"
            >
              Volver al catálogo
            </button>
          </div>
        </div>
      )}

      {/* 10. FOOTER DEL PORTAL CLIENTE */}
      <footer className="bg-[#0c0e12] border-t border-zinc-800/80 py-8 mt-12 text-xs text-zinc-500">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-amber-500 text-zinc-950 font-extrabold text-[11px] flex items-center justify-center">
              C&C
            </span>
            <span className="font-bold text-zinc-200">C&C Ferretería — Casa y Construcción</span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-[11px] tabular-nums">© {new Date().getFullYear()}</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Av. Beijing y Av. Tadeo Haenke · Cochabamba, Bolivia
          </div>
        </div>
      </footer>

      {/* 11. WIDGET DE ASISTENTE VIRTUAL IA */}
      <ChatbotWidget hidden={isCartOpen || showCheckoutModal || showSuccessOrderModal || showAuthModal || !!quickViewProduct} />
    </div>
  );
}

export default ClientCatalog;
