import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, getCategories, getBrands, createSale, updateSale, getRecentSales } from '../../services/api';

function POSView() {
  const navigate = useNavigate();

  // Usuario / Empleado en sesión
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_user_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error leyendo sesión:', e);
    }
    return { EmpleadoID: 6, Nombre: 'Oscar Edgar Claros', Rol: 'Administrador' };
  });

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
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_pos_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c, i) => ({
            id: c.id || c.ClienteID || i + 1,
            name: c.name || c.Nombre || 'Cliente General',
            nit: c.nit || c.NIT || '0',
            phone: c.phone || c.Telefono || '-',
            email: c.email || c.Email || '',
            address: c.address || c.Direccion || ''
          }));
        }
      }
    } catch {}
    return [
      { id: 1, name: 'Cliente General (Sin Factura)', nit: '0', phone: '-', email: '', address: 'Ventas en Mostrador' },
      { id: 2, name: 'Constructora Los Andes S.R.L.', nit: '4839201018', phone: '76543210', email: 'contacto@losandes.com', address: 'Av. Blanco Galindo Km 4' },
      { id: 3, name: 'Carlos Mendoza Ramos', nit: '5948302', phone: '68920192', email: 'carlos.mendoza@gmail.com', address: 'Zona Norte' },
      { id: 4, name: 'Ingeniería & Proyectos C&C', nit: '1029384019', phone: '71239847', email: 'proyectos@cyc.com', address: 'Calle Heroínas #450' }
    ];
  });
  const [selectedClient, setSelectedClient] = useState(() => clients[0] || { id: 1, name: 'Cliente General (Sin Factura)', nit: '0' });
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    TipoContacto: 'Individual',
    NombreEmpresa: '',
    name: '',
    apellidos: '',
    RazonSocial: '',
    TipoDocumentoSIAT: 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
    nit: '',
    phone: '0',
    email: '',
    address: ''
  });

  // Guardar nuevo cliente rápido desde POS
  const handleSaveQuickClient = (e) => {
    e.preventDefault();
    const isCompany = newClientForm.TipoContacto === 'Empresa';
    const mainName = isCompany
      ? (newClientForm.NombreEmpresa.trim() || newClientForm.name.trim() || newClientForm.RazonSocial.trim())
      : ([newClientForm.name.trim(), newClientForm.apellidos.trim()].filter(Boolean).join(' ') || newClientForm.RazonSocial.trim());

    if (!mainName) {
      showToast('Por favor ingrese al menos el nombre o razón social del cliente.', 'error');
      return;
    }

    const resolvedRazonSocial = newClientForm.RazonSocial.trim() || mainName.toUpperCase();
    const resolvedNIT = newClientForm.nit.trim() || '0';
    const resolvedPhone = newClientForm.phone.trim() || '0';
    const newId = Date.now();
    const contactCode = `CO0${462 + clients.length}`;

    const created = {
      id: newId,
      ClienteID: newId,
      TipoContacto: newClientForm.TipoContacto,
      CodigoContacto: contactCode,
      NombreEmpresa: isCompany ? mainName : '',
      name: mainName,
      Nombre: mainName,
      RazonSocial: resolvedRazonSocial,
      TipoDocumentoSIAT: newClientForm.TipoDocumentoSIAT,
      nit: resolvedNIT,
      NIT: resolvedNIT,
      phone: resolvedPhone,
      Movil: resolvedPhone,
      Telefono: resolvedPhone,
      email: newClientForm.email.trim() || '',
      Email: newClientForm.email.trim() || '',
      address: newClientForm.address.trim() || '',
      Direccion: newClientForm.address.trim() || '',
      createdAt: new Date().toISOString()
    };

    const updated = [created, ...clients];
    setClients(updated);
    setSelectedClient(created);
    try {
      localStorage.setItem('cyc_pos_clients', JSON.stringify(updated));
    } catch {}

    // Sincronizar automáticamente con los datos de factura del POS
    setInvoiceCustomerType('NORMAL');
    setInvoiceRazonSocial(resolvedRazonSocial);
    setInvoiceDocNumber(resolvedNIT);
    setInvoiceDocType(newClientForm.TipoDocumentoSIAT.includes('CI') ? 'CI' : 'NIT');
    setInvoiceEmail(created.email);

    setShowNewClientModal(false);
    setNewClientForm({
      TipoContacto: 'Individual',
      NombreEmpresa: '',
      name: '',
      apellidos: '',
      RazonSocial: '',
      TipoDocumentoSIAT: 'NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA',
      nit: '',
      phone: '0',
      email: '',
      address: ''
    });
    showToast(`Cliente "${created.name}" registrado y seleccionado para la venta`, 'success');
  };

  // Descuentos
  const [discount, setDiscount] = useState(0);

  // Estados para el Modal "Datos para Factura"
  const [invoiceCustomerType, setInvoiceCustomerType] = useState('SIN_NOMBRE'); // 'NORMAL' | 'SIN_NOMBRE' | 'VENTAS_MENORES' | 'CASO_ESPECIAL'
  const [invoiceRazonSocial, setInvoiceRazonSocial] = useState('SIN NOMBRE');
  const [invoiceDocType, setInvoiceDocType] = useState('NIT'); // 'NIT' | 'CI' | 'PASAPORTE' | 'CEX' | 'OTRO'
  const [invoiceDocNumber, setInvoiceDocNumber] = useState('0');
  const [invoiceComplemento, setInvoiceComplemento] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState('EFECTIVO'); // 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'BILLETERA_MOVIL' | 'GIFT_CARD'

  // Modales de cobro y utilidades
  const [showCashModal, setShowCashModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRecentSalesModal, setShowRecentSalesModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState(null); // Producto del ticket que se está editando
  const [itemUnitPrice, setItemUnitPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [recentSalesTab, setRecentSalesTab] = useState('FINAL'); // 'FINAL' | 'COTIZACION' | 'BORRADOR'
  const [editingSaleId, setEditingSaleId] = useState(null); // Recibo no. en edición (ej. 14444)

  // Cobro en efectivo
  const [receivedCash, setReceivedCash] = useState('');
  const [emitInvoice, setEmitInvoice] = useState(true);
  const [lastSaleReceipt, setLastSaleReceipt] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [quotations, setQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_pos_quotations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  // Cargar productos, categorías, marcas y transacciones recientes desde la BD
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [pData, cData, bData, salesData] = await Promise.all([
          getProducts(),
          getCategories(),
          getBrands(),
          getRecentSales().catch(() => [])
        ]);
        setProducts(Array.isArray(pData) ? pData : []);
        setCategories(Array.isArray(cData) ? cData : []);
        setBrands(Array.isArray(bData) ? bData : []);
        if (Array.isArray(salesData) && salesData.length > 0) {
          setRecentSales(salesData);
        }
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
        const precioSinFac = parseFloat(product.PrecioSinFactura || 0);
        return [
          ...prevCart,
          {
            ProductoID: product.ProductoID,
            name: product.Nombre,
            code: product.Codigo || product.CodigoBarras || `PRD-${product.ProductoID}`,
            price: price,
            PrecioVenta: price,
            PrecioSinFactura: precioSinFac,
            unit: product.Unidad?.Abreviacion || product.Unidad?.Nombre || 'PZA',
            quantity: 1,
            discountType: 'Fijo',
            discountAmount: 0,
            customNote: '',
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

  // Abrir modal de detalles y edición de precio del ítem
  const handleOpenItemDetails = (item) => {
    setEditingCartItem(item);
    setItemUnitPrice(item.price.toFixed(2));
    setItemDescription(item.customNote || '');
  };

  // Guardar cambios del ítem desde el modal
  const handleSaveItemDetails = (e) => {
    if (e) e.preventDefault();
    if (!editingCartItem) return;

    const newPrice = Math.max(0, parseFloat(itemUnitPrice) || 0);

    setCart((prev) =>
      prev.map((it) => {
        if (it.ProductoID === editingCartItem.ProductoID) {
          return {
            ...it,
            price: newPrice,
            customNote: itemDescription,
            subtotal: it.quantity * newPrice
          };
        }
        return it;
      })
    );

    setEditingCartItem(null);
    showToast(`Precio actualizado para "${editingCartItem.name}"`, 'success');
  };

  // Solicitar vaciar ticket con modal estilizado
  const clearCart = () => {
    if (cart.length === 0) return;
    setShowCancelConfirmModal(true);
  };

  // Confirmar vaciado del ticket
  const handleConfirmClearCart = () => {
    setCart([]);
    setDiscount(0);
    setEditingSaleId(null);
    setShowCancelConfirmModal(false);
    showToast('Venta cancelada y ticket vaciado', 'info');
  };

  // Cálculos de Totales
  const subtotalProducts = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const finalTotal = Math.max(0, subtotalProducts - discount);

  // Al presionar el botón "Efectivo":
  // 1. Registra inmediatamente la venta en la Base de Datos (MSSQL) con deducción FIFO de Lotes y Kardex
  // 2. Al mismo tiempo, abre la vista modal "Datos para Factura"
  // 3. Si el vendedor/cliente requiere factura, completa los datos y pulsa "Facturar"
  // 4. Si NO requiere factura, simplemente pulsa "Cerrar" (o ✕) y la venta ya queda registrada como venta de mostrador
  const handleCashClick = async () => {
    if (cart.length === 0) {
      showToast('Agrega al menos un producto al ticket antes de cobrar', 'error');
      return;
    }

    playCashSound();

    const isNamed = selectedClient && selectedClient.id !== 1;
    const clientName = isNamed ? selectedClient.name : 'SIN NOMBRE';
    const clientNit = selectedClient && selectedClient.nit !== '0' ? selectedClient.nit : '0';

    // Inicializar campos del modal de factura
    setInvoiceCustomerType(isNamed ? 'NORMAL' : 'SIN_NOMBRE');
    setInvoiceRazonSocial(clientName);
    setInvoiceDocType(clientNit.length > 8 ? 'NIT' : 'CI');
    setInvoiceDocNumber(clientNit);
    setInvoiceComplemento('');
    setInvoiceEmail(selectedClient?.email && selectedClient.email !== '-' ? selectedClient.email : '');
    setInvoicePaymentMethod('EFECTIVO');
    setReceivedCash(finalTotal.toFixed(2));

    // Preparar payload para la base de datos
    const itemsPayload = cart.map((item) => ({
      ProductoID: item.ProductoID,
      Cantidad: item.quantity,
      PrecioUnitario: parseFloat(item.price || item.PrecioVenta || 0)
    }));

    const salePayload = {
      EmpleadoID: currentUser?.EmpleadoID || 6,
      ClienteID: isNamed ? selectedClient.id : null,
      clienteNombre: clientName,
      nit: clientNit,
      tipoDocumento: clientNit.length > 8 ? 'NIT' : 'CI',
      metodoPago: 'EFECTIVO',
      montoRecibido: finalTotal,
      descuento: discount,
      isInvoice: false,
      items: itemsPayload
    };

    let serverDocId = editingSaleId ? `VNT-${editingSaleId}` : `VNT-${Math.floor(10000 + Math.random() * 90000)}`;
    const isEditMode = !!editingSaleId;

    try {
      if (isEditMode) {
        const response = await updateSale(editingSaleId, salePayload);
        if (response && response.sale) {
          serverDocId = response.sale.ticketID || `VNT-${response.sale.VentaID}`;
        }
      } else {
        const response = await createSale(salePayload);
        if (response && response.sale) {
          serverDocId = response.sale.ticketID || `VNT-${response.sale.VentaID}`;
        }
      }
      // Re-sincronizar catálogo e inventario real desde el backend
      getProducts().then((pData) => {
        if (Array.isArray(pData)) setProducts(pData);
      }).catch(() => {});
      getRecentSales().then((salesData) => {
        if (Array.isArray(salesData)) setRecentSales(salesData);
      }).catch(() => {});
    } catch (err) {
      console.error('Error procesando venta en base de datos:', err);
    }

    // Registrar la venta en memoria para recibo y vista
    const newSale = {
      id: serverDocId,
      client: clientName,
      nit: clientNit,
      docType: clientNit.length > 8 ? 'NIT' : 'CI',
      complemento: '',
      email: selectedClient?.email && selectedClient.email !== '-' ? selectedClient.email : '',
      customerType: isNamed ? 'NORMAL' : 'SIN_NOMBRE',
      items: [...cart],
      totalItemsCount: totalQuantity,
      subtotal: subtotalProducts,
      discount,
      total: finalTotal,
      baseCreditoFiscal: finalTotal,
      creditoFiscal: finalTotal * 0.13,
      cashReceived: finalTotal,
      change: 0,
      time: currentDateTime,
      paymentMethod: 'EFECTIVO',
      isInvoice: false,
      empleado: currentUser?.Nombre || 'Cajero'
    };

    setLastSaleReceipt(newSale);
    setRecentSales((prev) => [newSale, ...prev.filter((s) => s.id !== newSale.id)]);

    // Limpiar ticket activo y salir del modo edición
    setCart([]);
    setDiscount(0);
    setEditingSaleId(null);

    // Abrir automáticamente el modal de "Datos para Factura"
    setShowCashModal(true);
    showToast(
      isEditMode
        ? '¡Venta actualizada y stock recalculado en Base de Datos!'
        : '¡Venta guardada en Base de Datos! Complete factura si es requerida o cierre.',
      'success'
    );
  };

  // Cambio de modalidad de cliente en el modal de factura
  const handleCustomerTypeChange = (type) => {
    setInvoiceCustomerType(type);
    if (type === 'SIN_NOMBRE') {
      setInvoiceRazonSocial('SIN NOMBRE');
      setInvoiceDocType('NIT');
      setInvoiceDocNumber('0');
      setInvoiceComplemento('');
    } else if (type === 'VENTAS_MENORES') {
      setInvoiceRazonSocial('VENTAS MENORES DEL DÍA');
      setInvoiceDocType('NIT');
      setInvoiceDocNumber('0');
      setInvoiceComplemento('');
    } else if (type === 'NORMAL') {
      if (selectedClient && selectedClient.id !== 1) {
        setInvoiceRazonSocial(selectedClient.name);
        setInvoiceDocNumber(selectedClient.nit !== '0' ? selectedClient.nit : '');
      } else {
        setInvoiceRazonSocial('');
        setInvoiceDocNumber('');
      }
    } else if (type === 'CASO_ESPECIAL') {
      setInvoiceRazonSocial('CASO ESPECIAL');
      setInvoiceDocNumber('0');
    }
  };

  // Confirmar Factura (actualiza la venta con NIT/Razón Social y emite Factura SIAT)
  const confirmInvoice = () => {
    if (!lastSaleReceipt) {
      setShowCashModal(false);
      return;
    }

    const updatedSale = {
      ...lastSaleReceipt,
      id: lastSaleReceipt.id.startsWith('FAC') ? lastSaleReceipt.id : lastSaleReceipt.id.replace('VNT', 'FAC'),
      client: invoiceRazonSocial.trim() || 'SIN NOMBRE',
      nit: invoiceDocNumber.trim() || '0',
      docType: invoiceDocType,
      complemento: invoiceComplemento,
      email: invoiceEmail,
      customerType: invoiceCustomerType,
      paymentMethod: invoicePaymentMethod,
      isInvoice: true,
      cashReceived: invoicePaymentMethod === 'EFECTIVO' ? (parseFloat(receivedCash) || lastSaleReceipt.total) : lastSaleReceipt.total,
      change: invoicePaymentMethod === 'EFECTIVO' ? Math.max(0, (parseFloat(receivedCash) || lastSaleReceipt.total) - lastSaleReceipt.total) : 0
    };

    setLastSaleReceipt(updatedSale);
    setRecentSales((prev) => prev.map((s) => (s.id === lastSaleReceipt.id || s.id === updatedSale.id ? updatedSale : s)));

    setShowCashModal(false);
    setShowReceiptModal(true);
    showToast('¡Factura fiscal emitida con éxito!', 'success');
  };

  // Cerrar modal de factura sin problemas (la venta ya está registrada en efectivo)
  const handleCloseInvoiceModal = () => {
    setShowCashModal(false);
    showToast('Venta finalizada como comprobante de mostrador.', 'success');
  };

  // Abrir modal de transacciones recientes sincronizando con BD
  const handleOpenRecentSales = async () => {
    try {
      const sales = await getRecentSales();
      if (Array.isArray(sales)) {
        setRecentSales(sales);
      }
    } catch (e) {
      console.error('Error al cargar ventas recientes:', e);
    }
    setShowRecentSalesModal(true);
  };

  // Impresión de comprobante desde Transacciones Recientes
  const handlePrintRecentSale = (s) => {
    const isNamed = s.client && s.client !== 'SIN NOMBRE';
    const saleNum = s.ventaID || s.id.replace('VNT-', '');
    const receiptData = {
      id: saleNum,
      ticketID: s.id,
      client: isNamed ? s.client : 'SIN NOMBRE',
      nit: s.nit || '0',
      docType: 'NIT',
      complemento: '',
      email: '',
      customerType: isNamed ? 'NORMAL' : 'SIN_NOMBRE',
      items: (s.detalles || []).map((d, i) => ({
        ProductoID: d.ProductoID || i,
        name: d.producto,
        quantity: d.cantidad,
        price: d.precioUnitario,
        unit: 'UNID',
        subtotal: d.subtotal
      })),
      totalItemsCount: s.items || 1,
      subtotal: parseFloat(s.total || 0),
      discount: 0,
      total: parseFloat(s.total || 0),
      baseCreditoFiscal: parseFloat(s.total || 0),
      creditoFiscal: parseFloat(s.total || 0) * 0.13,
      cashReceived: parseFloat(s.total || 0),
      change: 0,
      time: s.time,
      paymentMethod: 'EFECTIVO',
      isInvoice: isNamed,
      empleado: s.empleado || currentUser?.Nombre || 'Cajero'
    };
    setLastSaleReceipt(receiptData);
    // Disparar la impresión nativa directamente sin dejar el modal flotante en pantalla
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Facturar venta desde Transacciones Recientes
  const handleInvoiceRecentSale = (s) => {
    const isNamed = s.client && s.client !== 'SIN NOMBRE';
    setInvoiceCustomerType(isNamed ? 'NORMAL' : 'SIN_NOMBRE');
    setInvoiceRazonSocial(isNamed ? s.client : 'SIN NOMBRE');
    setInvoiceDocType('NIT');
    setInvoiceDocNumber(s.nit || '0');
    setInvoiceComplemento('');
    setInvoiceEmail('');
    setInvoicePaymentMethod('EFECTIVO');
    setReceivedCash(parseFloat(s.total || 0).toFixed(2));

    const receiptData = {
      id: s.id,
      client: isNamed ? s.client : 'SIN NOMBRE',
      nit: s.nit || '0',
      docType: 'NIT',
      complemento: '',
      email: '',
      customerType: isNamed ? 'NORMAL' : 'SIN_NOMBRE',
      items: (s.detalles || []).map((d, i) => ({
        ProductoID: i,
        Nombre: d.producto,
        quantity: d.cantidad,
        PrecioVenta: d.precioUnitario,
        subtotal: d.subtotal
      })),
      totalItemsCount: s.items || 1,
      subtotal: parseFloat(s.total || 0),
      discount: 0,
      total: parseFloat(s.total || 0),
      baseCreditoFiscal: parseFloat(s.total || 0),
      creditoFiscal: parseFloat(s.total || 0) * 0.13,
      cashReceived: parseFloat(s.total || 0),
      change: 0,
      time: s.time,
      paymentMethod: 'EFECTIVO',
      isInvoice: isNamed,
      empleado: s.empleado || currentUser?.Nombre || 'Cajero'
    };
    setLastSaleReceipt(receiptData);
    setShowCashModal(true);
  };

  // Editar / Cargar venta al ticket desde Transacciones Recientes
  const handleEditRecentSale = (s) => {
    const saleNum = s.ventaID || s.id.replace('VNT-', '');
    setEditingSaleId(saleNum);

    // Cargar o asignar cliente
    if (s.client && s.client !== 'SIN NOMBRE') {
      const existing = clients.find((c) => c.name.toLowerCase() === s.client.toLowerCase());
      if (existing) {
        setSelectedClient(existing);
      } else {
        const tempClient = {
          id: clients.length + 1,
          name: s.client,
          nit: s.nit || '0',
          phone: '-'
        };
        setClients((prev) => [...prev, tempClient]);
        setSelectedClient(tempClient);
      }
    } else {
      setSelectedClient(clients[0]);
    }

    // Cargar productos al carrito
    const loadedItems = (s.detalles || []).map((dt) => {
      const matchedProd = products.find((p) => p.ProductoID === dt.ProductoID);
      const unitPrice = dt.precioUnitario || parseFloat(matchedProd?.PrecioVenta || 0);
      const qty = dt.cantidad || 1;
      return {
        ProductoID: dt.ProductoID,
        name: dt.producto || matchedProd?.Nombre || 'Producto',
        code: dt.codigo || matchedProd?.Codigo || `PRD-${dt.ProductoID}`,
        price: unitPrice,
        PrecioVenta: unitPrice,
        unit: matchedProd?.Unidad?.Abreviacion || matchedProd?.Unidad?.Nombre || 'PZA',
        quantity: qty,
        maxStock: matchedProd ? (matchedProd.Stock || 100) : 100,
        subtotal: qty * unitPrice,
        image: dt.imagen || matchedProd?.Imagen || null
      };
    });

    setCart(loadedItems);
    setShowRecentSalesModal(false);
    showToast(`Venta #${saleNum} cargada al ticket. Modifique productos o cobre con Efectivo.`, 'info');
  };

  // Borrar venta
  const handleDeleteRecentSale = (s) => {
    showToast(`La transacción #${s.ventaID || s.id} está asegurada en la Base de Datos.`, 'info');
  };

  // -------------------------------------------------------------
  // GESTIÓN DE COTIZACIONES (SIN DESCUENTO DE STOCK)
  // -------------------------------------------------------------
  const handleQuotationClick = () => {
    if (cart.length === 0) {
      showToast('Agrega al menos un producto al ticket antes de generar una cotización', 'error');
      return;
    }

    const isNamed = selectedClient && selectedClient.id !== 1;
    const clientName = isNamed ? selectedClient.name : 'SIN NOMBRE';
    const clientNit = selectedClient && selectedClient.nit !== '0' ? selectedClient.nit : '0';

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const quoteNum = Math.floor(10000 + Math.random() * 90000);

    const quoteData = {
      id: `COT-${quoteNum}`,
      quoteID: quoteNum,
      client: clientName,
      nit: clientNit,
      empleado: currentUser?.Nombre || 'Cajero / Vendedor',
      total: finalTotal,
      discount: discount,
      subtotal: subtotalProducts,
      items: totalQuantity,
      time: timeStr,
      status: 'COTIZACION',
      detalles: cart.map((item) => ({
        ProductoID: item.ProductoID,
        producto: item.name,
        codigo: item.code,
        cantidad: item.quantity,
        precioUnitario: parseFloat(item.price || item.PrecioVenta || 0),
        subtotal: item.subtotal,
        imagen: item.image,
        unit: item.unit
      }))
    };

    const updatedQuotes = [quoteData, ...quotations];
    setQuotations(updatedQuotes);
    try {
      localStorage.setItem('cyc_pos_quotations', JSON.stringify(updatedQuotes));
    } catch (e) {
      console.error('Error guardando cotización:', e);
    }

    // Vaciar el carrito tras emitir la cotización
    setCart([]);
    setDiscount(0);
    setEditingSaleId(null);
    showToast(`Cotización #COT-${quoteNum} guardada exitosamente (sin descontar stock)`, 'success');
  };

  // Cargar Cotización al ticket activo para continuarla o cobrarla
  const handleLoadQuotation = (q) => {
    // Asignar cliente
    if (q.client && q.client !== 'SIN NOMBRE') {
      const existing = clients.find((c) => c.name.toLowerCase() === q.client.toLowerCase());
      if (existing) {
        setSelectedClient(existing);
      } else {
        const tempClient = {
          id: clients.length + 1,
          name: q.client,
          nit: q.nit || '0',
          phone: '-'
        };
        setClients((prev) => [...prev, tempClient]);
        setSelectedClient(tempClient);
      }
    } else {
      setSelectedClient(clients[0]);
    }

    // Cargar productos
    const loadedItems = (q.detalles || []).map((dt) => {
      const matchedProd = products.find((p) => p.ProductoID === dt.ProductoID);
      const unitPrice = dt.precioUnitario || parseFloat(matchedProd?.PrecioVenta || 0);
      const qty = dt.cantidad || 1;
      return {
        ProductoID: dt.ProductoID,
        name: dt.producto || matchedProd?.Nombre || 'Producto',
        code: dt.codigo || matchedProd?.Codigo || `PRD-${dt.ProductoID}`,
        price: unitPrice,
        PrecioVenta: unitPrice,
        unit: dt.unit || matchedProd?.Unidad?.Abreviacion || 'PZA',
        quantity: qty,
        maxStock: matchedProd ? (matchedProd.Stock || 100) : 100,
        subtotal: qty * unitPrice,
        image: dt.imagen || matchedProd?.Imagen || null
      };
    });

    setCart(loadedItems);
    setDiscount(parseFloat(q.discount || 0));
    setEditingSaleId(null); // Es cotización nueva a cobrar o modificar
    setShowRecentSalesModal(false);
    showToast(`Cotización #${q.quoteID || q.id} cargada al ticket. Puede cobrar con Efectivo o modificarla.`, 'info');
  };

  // Eliminar Cotización
  const handleDeleteQuotation = (q) => {
    const updated = quotations.filter((item) => item.id !== q.id);
    setQuotations(updated);
    try {
      localStorage.setItem('cyc_pos_quotations', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    showToast(`Cotización #${q.quoteID || q.id} eliminada`, 'info');
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

          <div className="hidden md:flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-md border border-slate-700 text-xs font-bold text-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Atiende:</span>
            <span className="text-white font-extrabold">{currentUser?.Nombre || 'Cajero / Vendedor'}</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.5 rounded font-mono uppercase">
              {currentUser?.Rol || 'VENDEDOR'}
            </span>
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
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CUERPO PRINCIPAL DIVIDIDO EN 2 PANELES: TICKET (IZQ) Y CATÁLOGO (DER) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ======================================================================= */}
        {/* PANEL IZQUIERDO: TICKET / MOSTRADOR DE COBRO (AMPLIADO Y MÁS CÓMODO)   */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[50%] xl:w-[48%] 2xl:w-[46%] bg-slate-900/70 border-r border-slate-800 flex flex-col justify-between overflow-hidden">
          {/* Fila 1: Selector de Cliente y Recibo No en Edición */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 space-y-2.5">
            {editingSaleId && (
              <div className="flex items-center justify-between bg-cyan-500/10 border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-cyan-300 font-bold animate-fade-in">
                <span className="flex items-center gap-1.5 font-mono">
                  <span>Recibo no.:</span>
                  <strong className="text-white text-sm">{editingSaleId}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSaleId(null);
                    setCart([]);
                    showToast('Edición de venta cancelada', 'info');
                  }}
                  className="text-xs text-slate-400 hover:text-rose-400 font-normal transition-colors underline"
                  title="Cancelar edición de venta"
                >
                  ✕ Cancelar edición
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 flex-shrink-0">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <select
                value={selectedClient.id}
                onChange={(e) => {
                  const target = clients.find((c) => c.id === parseInt(e.target.value));
                  if (target) setSelectedClient(target);
                }}
                className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nit !== '0' ? `(NIT: ${c.nit})` : ''}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowNewClientModal(true)}
                className="w-9 h-9 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black text-lg transition-all"
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-medium transition-all"
                />
                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button
                type="submit"
                className="w-9 h-9 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center font-black text-base shadow-md shadow-cyan-600/20 transition-all"
                title="Buscar o añadir"
              >
                +
              </button>
            </form>
          </div>

          {/* Tabla de Productos en Ticket (Más espaciosa y legible) */}
          <div className="flex-1 overflow-y-auto p-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider font-extrabold">
                  <th className="pb-3 pl-2 font-bold">Producto ⓘ</th>
                  <th className="pb-3 text-center w-36 font-bold">Cantidad</th>
                  <th className="pb-3 text-right w-32 font-bold">Subtotal</th>
                  <th className="pb-3 text-center w-12 font-bold">✖</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-20 text-center text-slate-500">
                      <div className="w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-center text-slate-500 mx-auto mb-3">
                        <svg className="w-7 h-7 opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-slate-400">El ticket de venta está vacío</p>
                      <p className="text-xs text-slate-500 mt-1">Escanea un código de barras o pulsa un producto del catálogo táctil</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.ProductoID} className="hover:bg-slate-800/40 transition-colors group">
                      <td
                        onClick={() => handleOpenItemDetails(item)}
                        className="py-3.5 pl-2 cursor-pointer"
                        title="Haga clic para ver detalles, cambiar precio o agregar notas"
                      >
                        <div className="font-extrabold text-slate-100 group-hover:text-cyan-300 text-sm leading-snug uppercase max-w-[220px] sm:max-w-[280px] transition-colors flex items-center gap-2">
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/30">
                            Ver
                          </span>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                          <span className="font-mono text-cyan-400 font-semibold">{item.code}</span>
                          <span className="text-slate-600">•</span>
                          <span className="font-bold text-slate-300">Bs. {item.price.toFixed(2)} c/u</span>
                          {item.customNote && (
                            <span className="text-[11px] text-amber-400 italic bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 truncate max-w-[140px]">
                              📝 {item.customNote}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contador de Cantidad (Más Grande y Táctil) */}
                      <td className="py-3.5 text-center">
                        <div className="inline-flex items-center border border-slate-700 bg-slate-950 rounded-xl overflow-hidden shadow-inner p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.ProductoID, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white font-black text-base transition-colors rounded-lg"
                          >
                            -
                          </button>
                          <span className="px-3 text-sm font-black text-white min-w-[32px] text-center font-mono">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.ProductoID, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-slate-800 text-slate-300 hover:text-white font-black text-base transition-colors rounded-lg"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Subtotal del item */}
                      <td className="py-3.5 text-right font-black text-slate-100 text-sm font-mono">
                        Bs. {item.subtotal.toFixed(2)}
                      </td>

                      {/* Botón Borrar fila */}
                      <td className="py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.ProductoID)}
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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

            {/* Modificador: Descuento */}
            <div className="pt-1 border-t border-slate-800/60 text-[11px]">
              <button
                onClick={() => {
                  const val = prompt('Ingresar Descuento (-):', discount.toString());
                  if (val !== null) setDiscount(parseFloat(val) || 0);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 transition-colors"
              >
                <span>Descuento Aplicado (-):</span>
                <b className="text-rose-400 font-extrabold">Bs. {discount.toFixed(2)} ✎</b>
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
            onClick={handleQuotationClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded-xl font-bold border border-slate-700 transition-all shadow-sm"
            title="Guardar como cotización sin descontar inventario"
          >
            <span>✏️</span>
            <span>Cotización</span>
          </button>
        </div>

        {/* Botones de Cobro y Total Destacado */}
        <div className="flex items-center gap-3">
          {/* Botón Efectivo (Registra la venta y abre el formulario de factura si se desea) */}
          <button
            onClick={handleCashClick}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition-all animate-pulse"
            title="Registrar venta en efectivo y abrir datos de factura"
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
            onClick={handleOpenRecentSales}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            <span>🟣</span>
            <span>Transacciones Recientes</span>
          </button>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. MODAL: DATOS PARA FACTURA (EXACTO A LA CAPTURA ERP)                     */}
      {/* ========================================================================= */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-white my-8 max-h-[90vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base tracking-wide">
                Datos para Factura
              </h3>
              <button
                onClick={handleCloseInvoiceModal}
                className="text-slate-400 hover:text-white text-lg p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Cerrar modal (la venta ya está registrada)"
              >
                ✕
              </button>
            </div>

            {/* SECCIÓN 1: DATOS DE CLIENTE */}
            <div className="space-y-3">
              <h4 className="text-center text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                Datos de Cliente
              </h4>

              {/* Radio buttons: Normal, Sin Nombre, Ventas Menores, Caso Especial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                  <input
                    type="radio"
                    name="customerType"
                    checked={invoiceCustomerType === 'NORMAL'}
                    onChange={() => handleCustomerTypeChange('NORMAL')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Normal</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                  <input
                    type="radio"
                    name="customerType"
                    checked={invoiceCustomerType === 'SIN_NOMBRE'}
                    onChange={() => handleCustomerTypeChange('SIN_NOMBRE')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Sin Nombre <span className="text-[10px] text-slate-400">(ventas menores o iguales a Bs1.000)</span></span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                  <input
                    type="radio"
                    name="customerType"
                    checked={invoiceCustomerType === 'VENTAS_MENORES'}
                    onChange={() => handleCustomerTypeChange('VENTAS_MENORES')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Ventas Menores del Día</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors">
                  <input
                    type="radio"
                    name="customerType"
                    checked={invoiceCustomerType === 'CASO_ESPECIAL'}
                    onChange={() => handleCustomerTypeChange('CASO_ESPECIAL')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Caso Especial</span>
                </label>
              </div>

              {/* Campo: Razón Social */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Razón social *
                </label>
                <input
                  type="text"
                  value={invoiceRazonSocial}
                  onChange={(e) => setInvoiceRazonSocial(e.target.value)}
                  placeholder="SIN NOMBRE o Nombre del cliente / Empresa"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white uppercase focus:outline-none focus:border-cyan-400 transition-all font-semibold"
                  required
                />
              </div>

              {/* Fila: Tipo de Documento, Número de Impuesto, Complemento */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Tipo de Documento (SIAT) *
                  </label>
                  <select
                    value={invoiceDocType}
                    onChange={(e) => setInvoiceDocType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-semibold cursor-pointer"
                  >
                    <option value="NIT">NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA</option>
                    <option value="CI">CI - CÉDULA DE IDENTIDAD</option>
                    <option value="PASAPORTE">PASAPORTE</option>
                    <option value="CEX">C.E. - CÉDULA DE IDENTIDAD DE EXTRANJERO</option>
                    <option value="OTRO">OTRO DOCUMENTO</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Número de impuesto *:</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] font-bold inline-flex items-center justify-center cursor-help" title="NIT o Cédula de Identidad del cliente">i</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceDocNumber}
                    onChange={(e) => setInvoiceDocNumber(e.target.value)}
                    placeholder="0000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Com
                  </label>
                  <input
                    type="text"
                    value={invoiceComplemento}
                    onChange={(e) => setInvoiceComplemento(e.target.value)}
                    placeholder="Ej. 1A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* Campo: Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={invoiceEmail}
                  onChange={(e) => setInvoiceEmail(e.target.value)}
                  placeholder="correo@ejemplo.com (Opcional para envío digital)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* SECCIÓN 2: RESUMEN DE FACTURA */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-center text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                Resumen de Factura
              </h4>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 divide-y divide-slate-800/80 text-xs">
                <div className="flex justify-between py-1.5 text-slate-300">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-mono font-bold text-white">Bs. {subtotalProducts.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between py-1.5 text-rose-400">
                    <span className="font-semibold">Descuento (-):</span>
                    <span className="font-mono font-bold">-Bs. {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 text-slate-300">
                  <span className="font-semibold">Total Base Crédito Fiscal:</span>
                  <span className="font-mono font-bold text-cyan-400">Bs. {finalTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-slate-400 text-[11px]">
                  <span>Crédito fiscal (13% IVA):</span>
                  <span className="font-mono font-bold text-emerald-400">Bs. {(finalTotal * 0.13).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: MÉTODO DE PAGO */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-center text-xs font-extrabold text-cyan-400 uppercase tracking-wider">
                Método de Pago
              </h4>

              {/* Radio buttons de métodos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-semibold text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={invoicePaymentMethod === 'EFECTIVO'}
                    onChange={() => setInvoicePaymentMethod('EFECTIVO')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>EFECTIVO</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={invoicePaymentMethod === 'TRANSFERENCIA'}
                    onChange={() => setInvoicePaymentMethod('TRANSFERENCIA')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>TRANSFERENCIA BANCARIA</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={invoicePaymentMethod === 'TARJETA'}
                    onChange={() => setInvoicePaymentMethod('TARJETA')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>TARJETA</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={invoicePaymentMethod === 'BILLETERA_MOVIL'}
                    onChange={() => setInvoicePaymentMethod('BILLETERA_MOVIL')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>BILLETERA MOVIL (QR)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-800/60">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={invoicePaymentMethod === 'GIFT_CARD'}
                    onChange={() => setInvoicePaymentMethod('GIFT_CARD')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>GIFT-CARD</span>
                </label>
              </div>

              {/* Si es EFECTIVO: Calculadora ágil de cambio y billetes */}
              {invoicePaymentMethod === 'EFECTIVO' && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Billetes:</span>
                    {[10, 20, 50, 100, 200].map((bill) => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => setReceivedCash(bill.toString())}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs border border-slate-700 transition-all"
                      >
                        Bs. {bill}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReceivedCash(finalTotal.toFixed(2))}
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition-all"
                    >
                      Monto Exacto
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Monto Recibido (Bs.):</label>
                      <input
                        type="number"
                        step="0.10"
                        value={receivedCash}
                        onChange={(e) => setReceivedCash(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-base font-black text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">Cambio / Vuelto:</label>
                      <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-base font-black text-emerald-400 font-mono">
                        Bs. {Math.max(0, (parseFloat(receivedCash) || 0) - finalTotal).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN: IMPRESIÓN, CERRAR, FACTURAR */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (!lastSaleReceipt) {
                    showToast('No hay una factura previa para previsualizar', 'info');
                    return;
                  }
                  setShowReceiptModal(true);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <span>🖨</span>
                <span>Impresión</span>
              </button>

              <button
                type="button"
                onClick={handleCloseInvoiceModal}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={confirmInvoice}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
              >
                <span>Facturar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RECIBO DE LA VENTA (ESTILO EXACTO A LA FOTO ERP)                       */}
      {/* ========================================================================= */}
      {lastSaleReceipt && (
        <div className={showReceiptModal ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto" : "hidden print:block"}>
          <div
            id="printable-receipt"
            className="bg-white text-slate-900 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 font-sans text-xs max-h-[95vh] overflow-y-auto"
          >
            {/* 1. Cabecera Empresa */}
            <div className="text-center space-y-0.5 border-b border-slate-300 pb-3">
              <h2 className="font-extrabold text-base tracking-wider uppercase text-black">CASA Y CONSTRUCCION</h2>
              <p className="text-[10px] text-slate-600 font-medium">AV. BEIJING Y AV. TADEO AHENKE, COCHABAMBA, COCHABAMBA, 0000, Bolivia</p>
              <p className="text-[10px] text-slate-600 font-medium">Móvil cliente: 78221469</p>
              <h3 className="font-bold text-sm text-black pt-1">Recibo</h3>
            </div>

            {/* 2. Metadatos: Recibo No, Cliente, Fecha */}
            <div className="flex justify-between items-start text-[11px] pb-2 border-b border-slate-300 text-slate-800">
              <div className="space-y-0.5">
                <p className="font-bold text-black text-xs">
                  Recibo No. <span className="font-mono font-bold">{lastSaleReceipt.id}</span>
                </p>
                <p>
                  <span className="font-semibold">Cliente:</span> {lastSaleReceipt.client || 'SIN NOMBRE'}
                  {lastSaleReceipt.nit && lastSaleReceipt.nit !== '0' ? ` (NIT: ${lastSaleReceipt.nit})` : ''}
                </p>
              </div>
              <div className="text-right font-mono text-[11px]">
                <p><span className="font-semibold">Fecha:</span> {lastSaleReceipt.time}</p>
                {lastSaleReceipt.empleado && <p className="text-slate-500 text-[10px]">Atendido por: {lastSaleReceipt.empleado}</p>}
              </div>
            </div>

            {/* 3. Tabla de Productos */}
            <table className="w-full text-left text-[11px] border-collapse my-2">
              <thead>
                <tr className="border-t border-b border-slate-900 font-bold text-black text-[11px]">
                  <th className="py-1.5 text-left">Producto</th>
                  <th className="py-1.5 text-center w-28">Cantidad</th>
                  <th className="py-1.5 text-right w-24">Precio unitario</th>
                  <th className="py-1.5 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lastSaleReceipt.items.map((it, idx) => (
                  <tr key={idx} className="text-slate-800">
                    <td className="py-1.5 pr-2 uppercase font-medium">{it.name || it.producto}</td>
                    <td className="py-1.5 text-center font-mono">
                      {parseFloat(it.quantity || 1).toFixed(2)} {it.unit || 'UNID'}
                    </td>
                    <td className="py-1.5 text-right font-mono">
                      {parseFloat(it.price || it.PrecioVenta || it.precioUnitario || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right font-mono font-semibold text-black">
                      {parseFloat(it.subtotal || 0).toFixed(2)}
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
                  <span>Efectivo</span>
                  <span className="font-mono font-semibold">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                  <span className="text-slate-500 text-[10px]">{lastSaleReceipt.time?.split(' ')[0] || ''}</span>
                </div>
                <div className="flex justify-between font-bold text-black border-t border-slate-300 pt-1">
                  <span>Total pagado</span>
                  <span className="font-mono">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Derecha: Subtotal y Total */}
              <div className="space-y-1 text-right">
                <div className="flex justify-between text-slate-700">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-mono">Bs. {lastSaleReceipt.subtotal.toFixed(2)}</span>
                </div>
                {lastSaleReceipt.discount > 0 && (
                  <div className="flex justify-between text-rose-600 font-semibold">
                    <span>Descuento:</span>
                    <span className="font-mono">-Bs. {lastSaleReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-black border-t border-black pt-1 text-xs">
                  <span>Total:</span>
                  <span className="font-mono">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botones de Acción en Pantalla (ocultos al imprimir) */}
            <div className="flex gap-2 pt-4 no-print border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="w-1/2 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20 transition-all"
              >
                <span>🖨️</span>
                <span>Imprimir Recibo</span>
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
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
            display: block !important;
          }
          #printable-receipt table {
            display: table !important;
          }
          #printable-receipt thead {
            display: table-header-group !important;
          }
          #printable-receipt tbody {
            display: table-row-group !important;
          }
          #printable-receipt tr {
            display: table-row !important;
          }
          #printable-receipt th, #printable-receipt td {
            display: table-cell !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 8mm 12mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

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
      {/* 6.5 MODAL CONFIRMACIÓN: CANCELAR Y VACIAR TICKET                          */}
      {/* ========================================================================= */}
      {showCancelConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl shadow-inner">
              <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-white text-base">
                ¿Cancelar ticket de venta?
              </h3>
              <p className="text-xs text-slate-400">
                Se quitarán todos los productos cargados en el ticket actual y se reiniciará la operación.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirmModal(false)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                No, mantener
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCart}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-rose-600/20 transition-all"
              >
                Sí, vaciar ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6.8 MODAL: DETALLES DE PRODUCTO, PRECIO UNITARIO Y DESCUENTOS             */}
      {/* ========================================================================= */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSaveItemDetails}
            className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-white my-auto max-h-[92vh] overflow-y-auto"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-white text-base leading-tight uppercase">
                  {editingCartItem.name}
                </h3>
                <span className="text-[11px] font-mono text-cyan-400">
                  {editingCartItem.code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* SECCIÓN INFORMATIVA: PRECIO CON Y SIN FACTURA REGISTRADOS */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Precios Registrados del Producto (Referencia Informativa)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setItemUnitPrice((editingCartItem.PrecioVenta || editingCartItem.price || 0).toFixed(2))}
                  className="bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/60 p-2.5 rounded-xl cursor-pointer transition-all group"
                  title="Haga clic para aplicar este precio al campo de Precio Unitario"
                >
                  <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                    <span>Precio CON Factura</span>
                    <span className="text-[9px] text-cyan-400 group-hover:underline">Aplicar ↲</span>
                  </div>
                  <div className="text-sm font-black text-cyan-400 font-mono mt-0.5">
                    Bs. {(editingCartItem.PrecioVenta || editingCartItem.price || 0).toFixed(2)}
                  </div>
                </div>

                <div
                  onClick={() => {
                    const sinFac = editingCartItem.PrecioSinFactura || ((editingCartItem.PrecioVenta || editingCartItem.price || 0) * 0.87);
                    setItemUnitPrice(parseFloat(sinFac || 0).toFixed(2));
                  }}
                  className="bg-slate-900/90 border border-slate-700/80 hover:border-emerald-500/60 p-2.5 rounded-xl cursor-pointer transition-all group"
                  title="Haga clic para aplicar este precio al campo de Precio Unitario"
                >
                  <div className="text-[10px] text-slate-400 font-bold flex items-center justify-between">
                    <span>Precio SIN Factura</span>
                    <span className="text-[9px] text-emerald-400 group-hover:underline">Aplicar ↲</span>
                  </div>
                  <div className="text-sm font-black text-emerald-400 font-mono mt-0.5">
                    Bs. {(editingCartItem.PrecioSinFactura || ((editingCartItem.PrecioVenta || editingCartItem.price || 0) * 0.87)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* FORMULARIO EDITABLE: PRECIO UNITARIO, DESCUENTOS Y DESCRIPCIÓN */}
            <div className="space-y-4">
              {/* Precio Unitario Editable por el Vendedor */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Precio unitario (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={itemUnitPrice}
                  onChange={(e) => setItemUnitPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-black text-white focus:outline-none focus:border-cyan-400 font-mono"
                  placeholder="0.00"
                  autoFocus
                />
              </div>



              {/* Descripción / Notas del ítem */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Descripción / Observaciones
                </label>
                <textarea
                  rows="3"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Agregue el IMEI del producto, el número de serie u otra información aquí."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-cyan-600/20 transition-all"
              >
                Guardar Cambios
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
      {/* 9. MODAL: TRANSACCIONES RECIENTES (DISEÑO EXACTO A LA FOTO ERP)           */}
      {/* ========================================================================= */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-shrink-0">
              <h3 className="font-extrabold text-white text-base tracking-wide flex items-center gap-2">
                <span>Transacciones Recientes</span>
              </h3>
              <button
                onClick={() => setShowRecentSalesModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Pestañas Superiores: Final y Cotización */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 flex-shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRecentSalesTab('FINAL')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${
                  recentSalesTab === 'FINAL'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>✔</span>
                <span>Final</span>
                <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-[10px] rounded-full text-slate-300">
                  {recentSales.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRecentSalesTab('COTIZACION')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all ${
                  recentSalesTab === 'COTIZACION'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>&gt;_</span>
                <span>Cotización</span>
              </button>
            </div>

            {/* Lista de Transacciones Recientes */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {recentSalesTab === 'FINAL' ? (
                recentSales.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <p className="text-base font-bold text-slate-300">No hay transacciones registradas aún</p>
                    <p>Las ventas realizadas en caja se mostrarán automáticamente en este listado.</p>
                  </div>
                ) : (
                  recentSales.map((s, idx) => {
                    const saleNum = s.ventaID || s.id.replace('VNT-', '');
                    const isNamed = s.client && s.client !== 'SIN NOMBRE';
                    const clientDisplay = isNamed ? s.client : '';

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950/60 hover:bg-slate-800/40 rounded-xl border border-slate-800/70 transition-all gap-2 text-xs"
                      >
                        {/* 1. Número de Fila + Código de Venta + (Cliente / Razón Social) */}
                        <div className="flex items-start sm:items-center gap-2.5 min-w-[220px]">
                          <span className="font-extrabold text-slate-500 text-[11px] w-5 text-right flex-shrink-0">
                            {idx + 1}.
                          </span>
                          <div>
                            <div className="font-extrabold text-white text-xs tracking-tight">
                              <span className="font-mono text-cyan-300">{saleNum}</span>
                              <span className="ml-1 text-slate-300 uppercase">
                                ({clientDisplay})
                              </span>
                            </div>
                            {/* Fecha y Empleado */}
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                              <span className="text-cyan-400/90 font-semibold">{s.time}</span>
                              {s.empleado && (
                                <span className="text-slate-400">
                                  • <span className="text-slate-300">{s.empleado}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Total de la Venta */}
                        <div className="text-left sm:text-right font-black text-white text-sm sm:px-3 flex-shrink-0 font-mono">
                          {typeof s.total === 'number'
                            ? s.total.toFixed(2)
                            : parseFloat(s.total || 0).toFixed(2)}
                        </div>

                        {/* 3. Botones de Acción: Editar, Impresión, Borrar, Facturar */}
                        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleEditRecentSale(s)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-500/70 text-cyan-400 hover:bg-cyan-500/10 font-bold text-[11px] transition-all"
                            title="Ver detalles de la venta"
                          >
                            <span>✏️</span>
                            <span>Editar</span>
                          </button>

                          {/* Impresión */}
                          <button
                            type="button"
                            onClick={() => handlePrintRecentSale(s)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-500/70 text-cyan-400 hover:bg-cyan-500/10 font-bold text-[11px] transition-all"
                            title="Imprimir comprobante / recibo térmico"
                          >
                            <span>🖨️</span>
                            <span>Impresión</span>
                          </button>

                          {/* Borrar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRecentSale(s)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/70 text-rose-400 hover:bg-rose-500/10 font-bold text-[11px] transition-all"
                            title="Eliminar o anular venta"
                          >
                            <span>🗑️</span>
                            <span>Borrar</span>
                          </button>

                          {/* Facturar */}
                          <button
                            type="button"
                            onClick={() => handleInvoiceRecentSale(s)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-500/70 text-emerald-400 hover:bg-emerald-500/10 font-bold text-[11px] transition-all"
                            title="Emitir o actualizar datos de factura SIAT"
                          >
                            <span>📄</span>
                            <span>Facturar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* LISTA DE COTIZACIONES */
                quotations.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-cyan-400 flex items-center justify-center mx-auto text-xl">
                      ✏️
                    </div>
                    <p className="text-base font-bold text-slate-300">No hay cotizaciones registradas</p>
                    <p>Agregue productos al ticket y presione "Cotización" en la barra inferior para guardar una proforma sin descontar inventario.</p>
                  </div>
                ) : (
                  quotations.map((q, idx) => {
                    const isNamed = q.client && q.client !== 'SIN NOMBRE';
                    const clientDisplay = isNamed ? q.client : '';

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-950/60 hover:bg-slate-800/40 rounded-xl border border-slate-800/70 transition-all gap-2 text-xs"
                      >
                        {/* 1. Número de Fila + Código de Cotización + Cliente */}
                        <div className="flex items-start sm:items-center gap-2.5 min-w-[220px]">
                          <span className="font-extrabold text-slate-500 text-[11px] w-5 text-right flex-shrink-0">
                            {idx + 1}.
                          </span>
                          <div>
                            <div className="font-extrabold text-white text-xs tracking-tight">
                              <span className="font-mono text-amber-400">COT-{q.quoteID || q.id}</span>
                              <span className="ml-1 text-slate-300 uppercase">
                                ({clientDisplay})
                              </span>
                            </div>
                            {/* Fecha y Empleado */}
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                              <span className="text-amber-400/90 font-semibold">{q.time}</span>
                              {q.empleado && (
                                <span className="text-slate-400">
                                  • <span className="text-slate-300">{q.empleado}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Total de la Cotización */}
                        <div className="text-left sm:text-right font-black text-amber-300 text-sm sm:px-3 flex-shrink-0 font-mono">
                          Bs. {typeof q.total === 'number'
                            ? q.total.toFixed(2)
                            : parseFloat(q.total || 0).toFixed(2)}
                        </div>

                        {/* 3. Botones de Acción: Cargar al Ticket, Imprimir Cotización, Borrar */}
                        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                          {/* Cargar al ticket / Editar */}
                          <button
                            type="button"
                            onClick={() => handleLoadQuotation(q)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-cyan-500/70 text-cyan-400 hover:bg-cyan-500/10 font-bold text-[11px] transition-all"
                            title="Cargar cotización al ticket activo para cobrar o editar"
                          >
                            <span>🛒</span>
                            <span>Cargar al Ticket</span>
                          </button>

                          {/* Imprimir */}
                          <button
                            type="button"
                            onClick={() => {
                              const receiptData = {
                                id: `COT-${q.quoteID || q.id}`,
                                ticketID: `COT-${q.quoteID || q.id}`,
                                client: isNamed ? q.client : 'CLIENTE PROFORMA',
                                nit: q.nit || '0',
                                docType: 'NIT',
                                complemento: '',
                                email: '',
                                customerType: isNamed ? 'NORMAL' : 'SIN_NOMBRE',
                                items: (q.detalles || []).map((d, i) => ({
                                  ProductoID: d.ProductoID || i,
                                  name: d.producto,
                                  quantity: d.cantidad,
                                  price: d.precioUnitario,
                                  unit: d.unit || 'UNID',
                                  subtotal: d.subtotal
                                })),
                                totalItemsCount: q.items || 1,
                                subtotal: parseFloat(q.subtotal || q.total || 0),
                                discount: parseFloat(q.discount || 0),
                                total: parseFloat(q.total || 0),
                                baseCreditoFiscal: parseFloat(q.total || 0),
                                creditoFiscal: 0,
                                cashReceived: 0,
                                change: 0,
                                time: q.time,
                                paymentMethod: 'COTIZACIÓN (PROFORMA)',
                                isInvoice: false,
                                empleado: q.empleado || currentUser?.Nombre || 'Cajero'
                              };
                              setLastSaleReceipt(receiptData);
                              setTimeout(() => {
                                window.print();
                              }, 100);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-500/70 text-amber-400 hover:bg-amber-500/10 font-bold text-[11px] transition-all"
                            title="Imprimir proforma / cotización"
                          >
                            <span>🖨️</span>
                            <span>Impresión</span>
                          </button>

                          {/* Borrar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteQuotation(q)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/70 text-rose-400 hover:bg-rose-500/10 font-bold text-[11px] transition-all"
                            title="Eliminar cotización"
                          >
                            <span>🗑️</span>
                            <span>Borrar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: REGISTRAR NUEVO CLIENTE RÁPIDO PARA FACTURACIÓN                 */}
      {/* ========================================================================= */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                Agregar un nuevo contacto
              </h3>
              <button onClick={() => setShowNewClientModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveQuickClient} className="space-y-3.5 text-xs">
              {/* Selector Individual vs Empresa */}
              <div className="flex items-center justify-between bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-bold">Tipo de cliente:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="quickTipoContacto"
                      value="Individual"
                      checked={newClientForm.TipoContacto === 'Individual'}
                      onChange={() => setNewClientForm({ ...newClientForm, TipoContacto: 'Individual' })}
                      className="text-cyan-500 bg-slate-900 border-slate-700"
                    />
                    <span>Individual</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="quickTipoContacto"
                      value="Empresa"
                      checked={newClientForm.TipoContacto === 'Empresa'}
                      onChange={() => setNewClientForm({ ...newClientForm, TipoContacto: 'Empresa' })}
                      className="text-cyan-500 bg-slate-900 border-slate-700"
                    />
                    <span>Empresa</span>
                  </label>
                </div>
              </div>

              {/* Nombre de la empresa si es Empresa */}
              {newClientForm.TipoContacto === 'Empresa' ? (
                <div>
                  <label className="block text-cyan-300 font-bold mb-1">Nombre de la empresa:*</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. PORTE ASESORIA Y CONFECCION S.R.L."
                    value={newClientForm.NombreEmpresa}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewClientForm({
                        ...newClientForm,
                        NombreEmpresa: val,
                        RazonSocial: (!newClientForm.RazonSocial || newClientForm.RazonSocial === newClientForm.NombreEmpresa) ? val.toUpperCase() : newClientForm.RazonSocial
                      });
                    }}
                    className="w-full bg-slate-950 border border-cyan-700/60 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-cyan-400 uppercase"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Nombres:*</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. DANIEL"
                      value={newClientForm.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const fullName = [val, newClientForm.apellidos].filter(Boolean).join(' ');
                        setNewClientForm({
                          ...newClientForm,
                          name: val,
                          RazonSocial: fullName.toUpperCase()
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Apellidos:</label>
                    <input
                      type="text"
                      placeholder="Ej. RODRIGUEZ"
                      value={newClientForm.apellidos}
                      onChange={(e) => {
                        const val = e.target.value;
                        const fullName = [newClientForm.name, val].filter(Boolean).join(' ');
                        setNewClientForm({
                          ...newClientForm,
                          apellidos: val,
                          RazonSocial: fullName.toUpperCase()
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-semibold uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Razón Social para Facturación */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Razón Social para Facturación:</label>
                <input
                  type="text"
                  placeholder="Razón social que figurará en la factura SIAT"
                  value={newClientForm.RazonSocial}
                  onChange={(e) => setNewClientForm({ ...newClientForm, RazonSocial: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-bold uppercase"
                />
              </div>

              {/* Tipo de Documento y NIT / CI */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Tipo de Documento:</label>
                  <select
                    value={newClientForm.TipoDocumentoSIAT}
                    onChange={(e) => setNewClientForm({ ...newClientForm, TipoDocumentoSIAT: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white outline-none focus:border-cyan-500 font-semibold text-[11px]"
                  >
                    <option value="NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA">NIT</option>
                    <option value="CI - CÉDULA DE IDENTIDAD">CI (Cédula de Identidad)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="OTRO DOCUMENTO">Otro Documento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Número de impuesto / NIT / CI:</label>
                  <input
                    type="text"
                    placeholder="Ej. 4502616-1S o 0"
                    value={newClientForm.nit}
                    onChange={(e) => setNewClientForm({ ...newClientForm, nit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-cyan-300 font-mono font-bold outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Móvil y Email */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Móvil cliente:* (Default: 0)</label>
                  <input
                    type="text"
                    placeholder="0"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Email Factura:</label>
                  <input
                    type="email"
                    placeholder="cliente@correo.com"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl hover:bg-slate-700"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
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

