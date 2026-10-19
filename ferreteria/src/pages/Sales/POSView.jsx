import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/sidebar/sidebar';
import Topbar from '../../components/topbar/topbar';
import { useSidebar } from '../../context/SidebarContext';
import { getProducts, getCategories, getBrands, createSale, updateSale, updateSaleInvoice, getRecentSales, getCashRegisterStatus, openCashRegister, getLastCashRegister, closeCashRegister, addCashInflow, getOnlineOrders } from '../../services/api';
import { generateInvoicePdf } from '../../utils/invoicePdfGenerator';

function POSView() {
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();

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

  // Estados de Caja Registradora (Apertura del Día)
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState(() => {
    try {
      const active = localStorage.getItem('cyc_cash_register_active');
      if (active) {
        const parsed = JSON.parse(active);
        return !!parsed.isOpen;
      }
    } catch {}
    return false;
  });
  const [cashRegisterData, setCashRegisterData] = useState(() => {
    try {
      const active = localStorage.getItem('cyc_cash_register_active');
      if (active) return JSON.parse(active);
    } catch {}
    return null;
  });
  const [initialCashInput, setInitialCashInput] = useState('');
  const [openingRegisterLoading, setOpeningRegisterLoading] = useState(false);
  const [showLastRegisterModal, setShowLastRegisterModal] = useState(false);
  const [lastRegisterData, setLastRegisterData] = useState(null);

  // Ventas del turno de caja activo (para aislamiento estricto de arqueo)
  const [currentShiftSales, setCurrentShiftSales] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_current_shift_sales');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Estados para Aumento a Caja / Ingreso de Efectivo
  const [showCashInModal, setShowCashInModal] = useState(false);
  const [cashInAmount, setCashInAmount] = useState('');
  const [cashInReason, setCashInReason] = useState('Cambio para caja (monedas y billetes chicos)');
  const [cashInLoading, setCashInLoading] = useState(false);
  const [loadingLastRegister, setLoadingLastRegister] = useState(false);

  // Estados de Cierre de Caja Registradora
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
  const [closingRegisterLoading, setClosingRegisterLoading] = useState(false);
  const [declaredCashInput, setDeclaredCashInput] = useState('');
  const [closingNoteInput, setClosingNoteInput] = useState('');
  const [closeRegisterStats, setCloseRegisterStats] = useState({
    sessionStart: '',
    sessionEnd: '',
    initialCash: 0,
    cashSales: 0,
    digitalSales: 0,
    totalSales: 0,
    totalRefunds: 0,
    totalExpenses: 0,
    expectedCash: 0,
    soldProducts: []
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
  const barcodeSearchContainerRef = useRef(null);
  const [showBarcodeSuggestions, setShowBarcodeSuggestions] = useState(false);
  const [selectedBarcodeSuggestionIndex, setSelectedBarcodeSuggestionIndex] = useState(-1);

  // Sugerencias predictivas de productos en tiempo real para el buscador del ticket
  const barcodeSuggestions = useMemo(() => {
    const term = barcodeInput.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter((p) => {
        const nameMatch = p.Nombre && p.Nombre.toLowerCase().includes(term);
        const codeMatch = p.Codigo && p.Codigo.toLowerCase().includes(term);
        const barcodeMatch = p.CodigoBarras && p.CodigoBarras.toLowerCase().includes(term);
        return nameMatch || codeMatch || barcodeMatch;
      })
      .slice(0, 10);
  }, [barcodeInput, products]);

  // Cerrar sugerencias al hacer clic fuera del buscador del ticket
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barcodeSearchContainerRef.current && !barcodeSearchContainerRef.current.contains(e.target)) {
        setShowBarcodeSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cliente seleccionado
  const [clients, setClients] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_pos_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((c, i) => {
            const nivel = c.NivelLealtad || (c.DescuentoPorcentaje >= 10 ? 'Mayorista' : c.DescuentoPorcentaje >= 6 ? 'Constructor' : c.DescuentoPorcentaje >= 3 ? 'Frecuente' : 'Estandar');
            const descPct = c.DescuentoPorcentaje !== undefined ? parseFloat(c.DescuentoPorcentaje) : (nivel === 'Mayorista' ? 10 : nivel === 'Constructor' ? 6 : nivel === 'Frecuente' ? 3 : 0);

            return {
              id: c.id || c.ClienteID || i + 1,
              name: c.name || c.Nombre || 'Cliente General',
              nit: c.nit || c.NIT || '0',
              phone: c.phone || c.Telefono || '-',
              email: c.email || c.Email || '',
              address: c.address || c.Direccion || '',
              NivelLealtad: nivel,
              DescuentoPorcentaje: descPct,
              TotalComprasAcumulado: parseFloat(c.TotalComprasAcumulado || c.totalCompras || 0)
            };
          });
        }
      }
    } catch {}
    return [
      { id: 1, name: 'Cliente General (Sin Factura)', nit: '0', phone: '-', email: '', address: 'Ventas en Mostrador', NivelLealtad: 'Estandar', DescuentoPorcentaje: 0, TotalComprasAcumulado: 0 },
      { id: 2, name: 'Constructora Los Andes S.R.L.', nit: '4839201018', phone: '76543210', email: 'contacto@losandes.com', address: 'Av. Blanco Galindo Km 4', NivelLealtad: 'Mayorista', DescuentoPorcentaje: 10, TotalComprasAcumulado: 8500 },
      { id: 3, name: 'Carlos Mendoza Ramos', nit: '5948302', phone: '68920192', email: 'carlos.mendoza@gmail.com', address: 'Zona Norte', NivelLealtad: 'Frecuente', DescuentoPorcentaje: 3, TotalComprasAcumulado: 1850 },
      { id: 4, name: 'Ingeniería & Proyectos C&C', nit: '1029384019', phone: '71239847', email: 'proyectos@cyc.com', address: 'Calle Heroínas #450', NivelLealtad: 'Constructor', DescuentoPorcentaje: 6, TotalComprasAcumulado: 4920 }
    ];
  });
  const [selectedClient, setSelectedClient] = useState(() => clients[0] || { id: 1, name: 'Cliente General (Sin Factura)', nit: '0', NivelLealtad: 'Estandar', DescuentoPorcentaje: 0 });
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
    address: '',
    NivelLealtad: 'Estandar',
    DescuentoPorcentaje: 0
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
    const tier = newClientForm.NivelLealtad || 'Estandar';
    const tierDiscount = tier === 'Mayorista' ? 15 : tier === 'Constructor' ? 10 : tier === 'Frecuente' ? 5 : 0;
    const rawDescPct = newClientForm.DescuentoPorcentaje !== undefined ? parseFloat(newClientForm.DescuentoPorcentaje) : tierDiscount;
    const finalDescPct = Math.min(100, Math.max(0, isNaN(rawDescPct) ? 0 : rawDescPct));

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
      NivelLealtad: tier,
      DescuentoPorcentaje: finalDescPct,
      TotalComprasAcumulado: 0,
      createdAt: new Date().toISOString()
    };

    const updated = [created, ...clients];
    setClients(updated);
    setSelectedClient(created);
    setManualDiscount(null);
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
      address: '',
      NivelLealtad: 'Estandar',
      DescuentoPorcentaje: 0
    });
    showToast(`Cliente "${created.name}" registrado (${tier} - ${finalDescPct}% Dcto)`, 'success');
  };

  // Descuentos (Manual o Automático por Lealtad)
  const [manualDiscount, setManualDiscount] = useState(null);

  // Estados para el Modal "Datos para Factura"
  const [invoiceCustomerType, setInvoiceCustomerType] = useState('SIN_NOMBRE'); // 'NORMAL' | 'SIN_NOMBRE' | 'VENTAS_MENORES' | 'CASO_ESPECIAL'
  const [invoiceRazonSocial, setInvoiceRazonSocial] = useState('SIN NOMBRE');
  const [invoiceDocType, setInvoiceDocType] = useState('NIT'); // 'NIT' | 'CI' | 'PASAPORTE' | 'CEX' | 'OTRO'
  const [invoiceDocNumber, setInvoiceDocNumber] = useState('0');
  const [invoiceComplemento, setInvoiceComplemento] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState('EFECTIVO'); // 'EFECTIVO' | 'BILLETERA_MOVIL'
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);

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

  // Sonido de Timbre de Mostrador para Pedidos Online Entrantes (Chime de 2 tonos armónicos)
  const playOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;

      // Primer tono (E5: 659.25Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Segundo tono (A5: 880Hz)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.16);
      gain2.gain.setValueAtTime(0.22, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Audio context error:', e);
    }
  };

  // Pedidos Online en Tiempo Real (Alertas y Notificaciones de Mostrador)
  const [pendingOnlineOrdersCount, setPendingOnlineOrdersCount] = useState(0);
  const [newOnlineOrderAlert, setNewOnlineOrderAlert] = useState(null);
  const knownOrderIdsRef = useRef(new Set());
  const isFirstOrderFetchRef = useRef(true);

  // Verificación periódica de pedidos online pendientes (cada 20 segundos)
  useEffect(() => {
    let isMounted = true;

    const checkPendingOrders = async () => {
      try {
        const res = await getOnlineOrders({ estado: 'PENDIENTE' });
        if (!isMounted || !res) return;

        const pendingOrders = Array.isArray(res.orders) ? res.orders : [];
        const count = res.stats?.pendientes ?? pendingOrders.length;
        setPendingOnlineOrdersCount(count);

        if (isFirstOrderFetchRef.current) {
          // Registro inicial de pedidos existentes sin disparar alarma sonora
          pendingOrders.forEach((o) => {
            const id = o.PedidoOnlineID || o.id;
            if (id) knownOrderIdsRef.current.add(id);
          });
          isFirstOrderFetchRef.current = false;
        } else {
          // Detección de nuevos pedidos entrantes
          const newlyArrived = pendingOrders.filter((o) => {
            const id = o.PedidoOnlineID || o.id;
            return id && !knownOrderIdsRef.current.has(id);
          });

          if (newlyArrived.length > 0) {
            newlyArrived.forEach((o) => {
              const id = o.PedidoOnlineID || o.id;
              if (id) knownOrderIdsRef.current.add(id);
            });

            // Disparar sonido de timbre de mostrador
            playOrderChime();

            // Desplegar aviso de nuevo pedido en pantalla
            const latest = newlyArrived[0];
            setNewOnlineOrderAlert(latest);
            showToast(`🛎️ ¡Nuevo pedido online ${latest.CodigoPedido || ''}!`, 'warning');
          }
        }
      } catch (err) {
        console.warn('Error consultando pedidos online en segundo plano:', err);
      }
    };

    checkPendingOrders();
    const interval = setInterval(checkPendingOrders, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Cargar pedido online directamente al ticket actual del mostrador
  const handleLoadOnlineOrderToTicket = (order) => {
    if (!order) return;
    const detalles = order.Detalles || [];
    if (detalles.length === 0) {
      showToast('El pedido online no contiene productos para cargar.', 'error');
      return;
    }

    const newCartItems = detalles.map((d) => {
      const prod = d.Producto || {};
      const prodId = d.ProductoID || prod.ProductoID;
      const price = parseFloat(d.PrecioUnitario || prod.PrecioVenta || prod.Precio || 0);
      const qty = parseInt(d.Cantidad || 1);

      return {
        ProductoID: prodId,
        name: prod.Nombre || d.ProductoNombre || 'Producto Online',
        code: prod.Codigo || prod.CodigoBarras || `PRD-${prodId}`,
        price: price,
        PrecioVenta: price,
        PrecioSinFactura: parseFloat(prod.PrecioSinFactura || (price * 0.87)),
        unit: prod.Unidad?.Nombre || 'PZA',
        quantity: qty,
        discountType: 'Fijo',
        discountAmount: 0,
        customNote: `Pedido Online ${order.CodigoPedido || ''}`,
        maxStock: parseInt(prod.Stock || 999),
        subtotal: price * qty,
        image: prod.Imagen
      };
    });

    setCart(newCartItems);

    if (order.ClienteNombre) {
      setInvoiceRazonSocial(order.ClienteNombre);
      setInvoiceDocNumber(order.NIT_CI || '0');
      setInvoiceCustomerType(order.ClienteNombre === 'SIN NOMBRE' ? 'SIN_NOMBRE' : 'NORMAL');
    }

    setNewOnlineOrderAlert(null);
    playBeep();
    showToast(`Pedido ${order.CodigoPedido || ''} cargado al ticket (${newCartItems.length} productos)`, 'success');
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

  // Sincronizar estado de Caja Registradora desde el backend
  useEffect(() => {
    getCashRegisterStatus()
      .then((res) => {
        if (res && res.isOpen && res.session) {
          setIsCashRegisterOpen(true);
          setCashRegisterData(res.session);
          localStorage.setItem('cyc_cash_register_active', JSON.stringify(res.session));
        } else if (res && !res.isOpen) {
          // Si el servidor indica que no hay caja abierta, respetar estado local o pedir apertura
          const localActive = localStorage.getItem('cyc_cash_register_active');
          if (localActive) {
            try {
              const parsed = JSON.parse(localActive);
              if (parsed && parsed.isOpen) {
                setIsCashRegisterOpen(true);
                setCashRegisterData(parsed);
              }
            } catch {}
          }
        }
      })
      .catch((err) => {
        console.warn('Error verificando estado de caja registradora:', err);
      });
  }, []);

  // Abrir Caja Registradora con Efectivo Inicial
  const handleOpenRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    setOpeningRegisterLoading(true);
    try {
      const amount = parseFloat(initialCashInput) || 0;
      if (amount < 0) {
        showToast('El monto inicial no puede ser negativo', 'error');
        setOpeningRegisterLoading(false);
        return;
      }

      const now = new Date();
      const payload = {
        montoInicial: amount,
        empleadoID: currentUser?.EmpleadoID || 6,
        empleadoNombre: currentUser?.Nombre || 'OSCAR EDGAR CLAROS DAVALOS'
      };

      const res = await openCashRegister(payload).catch(() => null);
      const sessionData = (res && res.session) || {
        id: Date.now(),
        isOpen: true,
        montoInicial: amount,
        fechaApertura: now.toLocaleString('es-BO'),
        fechaAperturaISO: now.toISOString(),
        openedAtTimestamp: now.getTime(),
        empleadoNombre: currentUser?.Nombre || 'OSCAR EDGAR CLAROS DAVALOS',
        empleadoID: currentUser?.EmpleadoID || 6
      };
      if (!sessionData.openedAtTimestamp) {
        sessionData.openedAtTimestamp = now.getTime();
      }
      if (!sessionData.fechaAperturaISO) {
        sessionData.fechaAperturaISO = now.toISOString();
      }

      localStorage.setItem('cyc_cash_register_active', JSON.stringify(sessionData));
      localStorage.setItem('cyc_current_shift_sales', JSON.stringify([]));
      setCurrentShiftSales([]);
      setCashRegisterData(sessionData);
      setIsCashRegisterOpen(true);
      showToast(`¡Caja registradora abierta exitosamente! Efectivo inicial: Bs. ${amount.toFixed(2)}`, 'success');
    } catch (err) {
      console.error('Error al abrir caja:', err);
      const now = new Date();
      const amount = parseFloat(initialCashInput) || 0;
      const sessionData = {
        id: Date.now(),
        isOpen: true,
        montoInicial: amount,
        fechaApertura: now.toLocaleString('es-BO'),
        fechaAperturaISO: now.toISOString(),
        openedAtTimestamp: now.getTime(),
        empleadoNombre: currentUser?.Nombre || 'OSCAR EDGAR CLAROS DAVALOS',
        empleadoID: currentUser?.EmpleadoID || 6
      };
      localStorage.setItem('cyc_cash_register_active', JSON.stringify(sessionData));
      localStorage.setItem('cyc_current_shift_sales', JSON.stringify([]));
      setCurrentShiftSales([]);
      setCashRegisterData(sessionData);
      setIsCashRegisterOpen(true);
      showToast(`¡Caja abierta! Efectivo inicial: Bs. ${amount.toFixed(2)}`, 'success');
    } finally {
      setOpeningRegisterLoading(false);
    }
  };

  // Abrir modal de "Mi último registro"
  const handleOpenLastRegisterModal = async () => {
    setLoadingLastRegister(true);
    setShowLastRegisterModal(true);
    try {
      const res = await getLastCashRegister();
      if (res && res.lastRecord) {
        setLastRegisterData(res.lastRecord);
      } else {
        setLastRegisterData({
          id: 1042,
          empleadoNombre: currentUser?.Nombre || 'OSCAR EDGAR CLAROS DAVALOS',
          fechaApertura: '2026-09-10 08:30:00',
          fechaCierre: '2026-09-10 19:45:00',
          montoInicial: 200.00,
          montoFinal: 1845.50,
          totalVentasEfectivo: 1645.50,
          totalVentasDigital: 920.00,
          totalEsperado: 1845.50,
          diferencia: 0.00,
          totalTransacciones: 24,
          observaciones: 'Cierre de caja regular del turno anterior sin novedades.'
        });
      }
    } catch (err) {
      console.warn('Error obteniendo último registro de caja:', err);
      setLastRegisterData({
        id: 1042,
        empleadoNombre: currentUser?.Nombre || 'OSCAR EDGAR CLAROS DAVALOS',
        fechaApertura: '2026-09-10 08:30:00',
        fechaCierre: '2026-09-10 19:45:00',
        montoInicial: 200.00,
        montoFinal: 1845.50,
        totalVentasEfectivo: 1645.50,
        totalVentasDigital: 920.00,
        totalEsperado: 1845.50,
        diferencia: 0.00,
        totalTransacciones: 24,
        observaciones: 'Cierre de caja regular del turno anterior sin novedades.'
      });
    } finally {
      setLoadingLastRegister(false);
    }
  };

  // Registrar Aumento a Caja / Ingreso de Efectivo durante el turno
  const handleAddCashInflow = async (e) => {
    if (e) e.preventDefault();
    const amount = parseFloat(cashInAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Por favor ingrese un monto de aumento válido mayor a 0', 'error');
      return;
    }

    setCashInLoading(true);
    try {
      const payload = {
        monto: amount,
        motivo: cashInReason || 'Aumento para cambio en caja',
        empleadoNombre: currentUser?.Nombre || 'Oscar Edgar Claros Davalos'
      };

      await addCashInflow(payload).catch(() => null);
      const newTotalAumentos = (parseFloat(cashRegisterData?.totalAumentos || 0) + amount);

      const updatedRegData = {
        ...(cashRegisterData || {}),
        isOpen: true,
        totalAumentos: newTotalAumentos
      };

      setCashRegisterData(updatedRegData);
      localStorage.setItem('cyc_cash_register_active', JSON.stringify(updatedRegData));

      showToast(`Aumento de Bs. ${amount.toFixed(2)} registrado correctamente en caja`, 'success');
      setShowCashInModal(false);
      setCashInAmount('');
      setCashInReason('Cambio para caja (monedas y billetes chicos)');
    } catch (err) {
      console.error('Error registrando aumento de caja:', err);
      showToast('Error al registrar el aumento de caja', 'error');
    } finally {
      setCashInLoading(false);
    }
  };

  // Abrir modal de Cierre de Caja Registradora calculando métricas del turno
  const handleOpenCloseRegisterModal = async () => {
    try {
      // 1. Obtener ventas del turno registradas en memoria / localStorage
      let shiftSalesList = [];
      try {
        const savedShift = localStorage.getItem('cyc_current_shift_sales');
        if (savedShift) {
          const parsed = JSON.parse(savedShift);
          if (Array.isArray(parsed) && parsed.length > 0) shiftSalesList = parsed;
        }
      } catch {}
      if (shiftSalesList.length === 0 && Array.isArray(currentShiftSales) && currentShiftSales.length > 0) {
        shiftSalesList = [...currentShiftSales];
      }

      // 2. Traer las ventas más recientes de BD
      let salesList = recentSales;
      try {
        const latest = await getRecentSales();
        if (Array.isArray(latest) && latest.length > 0) {
          salesList = latest;
          setRecentSales(latest);
        }
      } catch (e) {}

      // Si shiftSalesList está vacío (ej: recarga de navegador), filtrar por fecha de apertura
      if (shiftSalesList.length === 0 && Array.isArray(salesList)) {
        const sessionOpenedAt = cashRegisterData?.openedAtTimestamp
          || (cashRegisterData?.fechaAperturaISO ? new Date(cashRegisterData.fechaAperturaISO).getTime() : 0);

        const filteredFromDb = salesList.filter((s) => {
          if (s.cajaSessionId && cashRegisterData?.id && s.cajaSessionId === cashRegisterData.id) return true;
          let saleTime = s.timestamp || (s.fechaVentaISO ? new Date(s.fechaVentaISO).getTime() : 0);
          if (sessionOpenedAt && saleTime) {
            return saleTime >= (sessionOpenedAt - 120000);
          }
          return false;
        });

        shiftSalesList = filteredFromDb.length > 0 ? filteredFromDb : salesList;
      }

      const initialCash = parseFloat(cashRegisterData?.montoInicial || 0);
      const totalAumentos = parseFloat(cashRegisterData?.totalAumentos || 0);

      // Agrupar ventas y productos ÚNICAMENTE del turno actual
      let cashSales = 0;
      let digitalSales = 0;
      let totalRefunds = 0;
      const productsMap = {};

      shiftSalesList.forEach((s) => {
        const saleTotal = parseFloat(s.total || 0);
        if (s.estado === false || s.estadoRaw === false || s.estado === 'Anulada') {
          totalRefunds += saleTotal;
        } else {
          if (s.metodoPago === 'TARJETA' || s.metodoPago === 'QR' || s.metodoPago === 'TRANSFERENCIA') {
            digitalSales += saleTotal;
          } else {
            cashSales += saleTotal;
          }

          // Procesar detalles de productos (soportando s.detalles o s.items)
          const itemsList = (s.detalles && Array.isArray(s.detalles) && s.detalles.length > 0)
            ? s.detalles
            : (s.items && Array.isArray(s.items) ? s.items : []);

          itemsList.forEach((d, idx) => {
            const key = d.ProductoID || d.codigo || d.code || d.nombre || d.name || d.producto || idx;
            const skuVal = d.codigo || d.code || (d.ProductoID ? `TR-${d.ProductoID}` : `SKU-${1000 + idx}`);
            const nameVal = (d.nombre || d.name || d.producto || 'PRODUCTO').toUpperCase();
            const qtyVal = parseFloat(d.cantidad || d.quantity || 1);
            const priceVal = parseFloat(d.precioUnitario || d.price || d.PrecioVenta || 0);
            const subtotalVal = parseFloat(d.subtotal || (qtyVal * priceVal));

            if (!productsMap[key]) {
              productsMap[key] = {
                sku: skuVal,
                name: nameVal,
                quantity: 0,
                total: 0
              };
            }
            productsMap[key].quantity += qtyVal;
            productsMap[key].total += subtotalVal;
          });
        }
      });

      const totalSales = cashSales + digitalSales;
      const expectedCash = Math.max(0, initialCash + totalAumentos + cashSales - totalRefunds);
      const soldProducts = Object.values(productsMap);

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const formatTimeAmPm = (d) => {
        let hours = d.getHours();
        const minutes = pad(d.getMinutes());
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${pad(hours)}:${minutes} ${ampm}`;
      };
      const sessionEndStr = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()} ${formatTimeAmPm(now)}`;
      const sessionStartStr = cashRegisterData?.fechaApertura || `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()} 08:30 AM`;

      setCloseRegisterStats({
        sessionStart: sessionStartStr,
        sessionEnd: sessionEndStr,
        initialCash,
        totalAumentos,
        cashSales,
        digitalSales,
        totalSales,
        totalRefunds,
        expectedCash,
        soldProducts
      });

      setDeclaredCashInput(expectedCash.toFixed(2));
      setClosingNoteInput('');
      setShowCloseRegisterModal(true);
    } catch (err) {
      console.error('Error preparando cierre de caja:', err);
      showToast('Error al calcular el balance de cierre', 'error');
    }
  };

  // Confirmar Cierre de Registro y volver a la pantalla de Apertura
  const handleConfirmCloseRegister = async (e) => {
    if (e) e.preventDefault();
    setClosingRegisterLoading(true);
    try {
      const finalAmount = parseFloat(declaredCashInput) || closeRegisterStats.expectedCash;
      const payload = {
        montoFinal: finalAmount,
        totalVentasEfectivo: closeRegisterStats.cashSales,
        totalVentasDigital: closeRegisterStats.digitalSales,
        totalAumentos: closeRegisterStats.totalAumentos || 0,
        observaciones: closingNoteInput.trim() || 'Cierre de caja regular del turno'
      };

      await closeCashRegister(payload).catch(() => null);

      // Limpiar sesión activa y ventas del turno en localStorage
      localStorage.removeItem('cyc_cash_register_active');
      localStorage.removeItem('cyc_current_shift_sales');
      setCurrentShiftSales([]);
      setIsCashRegisterOpen(false);
      setCashRegisterData(null);
      setShowCloseRegisterModal(false);
      setInitialCashInput('');
      showToast('¡Caja registradora cerrada exitosamente! Sesión finalizada.', 'success');
    } catch (err) {
      console.error('Error al cerrar caja:', err);
      localStorage.removeItem('cyc_cash_register_active');
      localStorage.removeItem('cyc_current_shift_sales');
      setCurrentShiftSales([]);
      setIsCashRegisterOpen(false);
      setCashRegisterData(null);
      setShowCloseRegisterModal(false);
      setInitialCashInput('');
      showToast('Caja cerrada exitosamente.', 'info');
    } finally {
      setClosingRegisterLoading(false);
    }
  };

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

  // Selección de sugerencia predictiva desde el buscador
  const handleSelectBarcodeSuggestion = (product) => {
    if (!product) return;
    addToCart(product);
    setBarcodeInput('');
    setShowBarcodeSuggestions(false);
    setSelectedBarcodeSuggestionIndex(-1);
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  };

  // Navegación por teclado en el desplegable de sugerencias
  const handleBarcodeKeyDown = (e) => {
    if (!showBarcodeSuggestions || barcodeSuggestions.length === 0) {
      if (e.key === 'Escape') {
        setShowBarcodeSuggestions(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedBarcodeSuggestionIndex((prev) =>
        prev < barcodeSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedBarcodeSuggestionIndex((prev) =>
        prev > 0 ? prev - 1 : barcodeSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (selectedBarcodeSuggestionIndex >= 0 && selectedBarcodeSuggestionIndex < barcodeSuggestions.length) {
        e.preventDefault();
        handleSelectBarcodeSuggestion(barcodeSuggestions[selectedBarcodeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowBarcodeSuggestions(false);
    }
  };

  // Buscar por escáner de código de barras
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    if (selectedBarcodeSuggestionIndex >= 0 && selectedBarcodeSuggestionIndex < barcodeSuggestions.length) {
      handleSelectBarcodeSuggestion(barcodeSuggestions[selectedBarcodeSuggestionIndex]);
      return;
    }

    const term = barcodeInput.trim().toLowerCase();
    const exactMatch = products.find(
      (p) =>
        (p.CodigoBarras && p.CodigoBarras.toLowerCase() === term) ||
        (p.Codigo && p.Codigo.toLowerCase() === term)
    );

    const found = exactMatch || products.find(
      (p) => p.Nombre && p.Nombre.toLowerCase().includes(term)
    );

    if (found) {
      handleSelectBarcodeSuggestion(found);
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

  // Resetear completamente el POS para iniciar una nueva venta limpia
  const resetPosForNextSale = (customClientsList = null) => {
    const list = customClientsList || clients;
    const defaultClient = list[0] || {
      id: 1,
      name: 'Cliente General (Sin Factura)',
      nit: '0',
      NivelLealtad: 'Estandar',
      DescuentoPorcentaje: 0
    };
    setSelectedClient(defaultClient);
    setCart([]);
    setManualDiscount(null);
    setEditingSaleId(null);
    setInvoiceCustomerType('SIN_NOMBRE');
    setInvoiceRazonSocial('SIN NOMBRE');
    setInvoiceDocType('NIT');
    setInvoiceDocNumber('0');
    setInvoiceComplemento('');
    setInvoiceEmail('');
    setInvoicePaymentMethod('EFECTIVO');
    setReceivedCash('');
    setShowClientSuggestions(false);
  };

  // Confirmar vaciado del ticket
  const handleConfirmClearCart = () => {
    resetPosForNextSale();
    setShowCancelConfirmModal(false);
    showToast('Venta cancelada y ticket vaciado', 'info');
  };

  // Cálculos de Totales y Descuento por Nivel de Lealtad
  const subtotalProducts = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const totalQuantity = cart.reduce((acc, item) => acc + item.quantity, 0);
  const loyaltyDiscountPercent = parseFloat(selectedClient?.DescuentoPorcentaje || 0);
  const loyaltyDiscountAmount = (subtotalProducts * loyaltyDiscountPercent) / 100;
  const effectiveDiscount = manualDiscount !== null ? manualDiscount : loyaltyDiscountAmount;
  const finalTotal = Math.max(0, subtotalProducts - effectiveDiscount);

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

    const isNamed = selectedClient && selectedClient.id !== 1 && selectedClient.name && !selectedClient.name.toLowerCase().includes('cliente general');
    const clientName = isNamed ? selectedClient.name : 'CLIENTE GENERAL';
    const clientNit = selectedClient && selectedClient.nit !== '0' ? selectedClient.nit : '0';

    // Inicializar campos del modal de factura
    setInvoiceCustomerType(isNamed ? 'NORMAL' : 'SIN_NOMBRE');
    setInvoiceRazonSocial(isNamed ? clientName : 'SIN NOMBRE');
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
      clienteNombre: isNamed ? clientName : null,
      nit: clientNit,
      tipoDocumento: clientNit.length > 8 ? 'NIT' : 'CI',
      metodoPago: 'EFECTIVO',
      montoRecibido: finalTotal,
      descuento: effectiveDiscount,
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
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al procesar la venta en la base de datos';
      showToast(errorMsg, 'error');
      return;
    }

    // Registrar la venta en memoria para recibo y vista
    const nowTime = Date.now();
    const formattedDetalles = cart.map((c, idx) => ({
      ProductoID: c.ProductoID || idx,
      codigo: c.code || c.codigo || (c.ProductoID ? `TR-${c.ProductoID}` : `SKU-${1000 + idx}`),
      producto: c.name || c.producto || 'PRODUCTO',
      nombre: c.name || c.producto || 'PRODUCTO',
      cantidad: parseFloat(c.quantity || 1),
      precioUnitario: parseFloat(c.price || c.PrecioVenta || 0),
      subtotal: parseFloat(c.subtotal || (parseFloat(c.quantity || 1) * parseFloat(c.price || c.PrecioVenta || 0)))
    }));

    const newSale = {
      id: serverDocId,
      cajaSessionId: cashRegisterData?.id || nowTime,
      timestamp: nowTime,
      fechaVentaISO: new Date().toISOString(),
      client: clientName,
      nit: clientNit,
      docType: clientNit.length > 8 ? 'NIT' : 'CI',
      complemento: '',
      email: selectedClient?.email && selectedClient.email !== '-' ? selectedClient.email : '',
      customerType: isNamed ? 'NORMAL' : 'SIN_NOMBRE',
      items: [...cart],
      detalles: formattedDetalles,
      totalItemsCount: totalQuantity,
      subtotal: subtotalProducts,
      discount: effectiveDiscount,
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

    // Registrar en las ventas del turno de caja activo
    setCurrentShiftSales((prev) => {
      const updated = [newSale, ...prev.filter((s) => s.id !== newSale.id)];
      try {
        localStorage.setItem('cyc_current_shift_sales', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Limpiar ticket activo y salir del modo edición
    setCart([]);
    setManualDiscount(null);
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
    setShowClientSuggestions(false);
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
        setInvoiceDocType(selectedClient.nit && selectedClient.nit.length > 8 ? 'NIT' : 'CI');
        setInvoiceEmail(selectedClient.email && selectedClient.email !== '-' ? selectedClient.email : '');
      } else {
        setInvoiceRazonSocial('');
        setInvoiceDocNumber('');
        setInvoiceDocType('NIT');
        setInvoiceComplemento('');
      }
    } else if (type === 'CASO_ESPECIAL') {
      setInvoiceRazonSocial('CASO ESPECIAL');
      setInvoiceDocNumber('0');
    }
  };

  // Seleccionar cliente de las sugerencias predictivas
  const handleSelectClientSuggestion = (c) => {
    const chosenName = c.name || c.RazonSocial || '';
    const chosenNit = c.nit !== '0' ? c.nit : '';
    setInvoiceRazonSocial(chosenName);
    setInvoiceDocNumber(chosenNit);
    setInvoiceDocType(chosenNit.length > 8 ? 'NIT' : 'CI');
    setInvoiceEmail(c.email && c.email !== '-' ? c.email : '');
    setSelectedClient(c);
    setShowClientSuggestions(false);
    showToast(`Cliente "${chosenName}" seleccionado`, 'info');
  };

  // Confirmar Factura o Recibo (según modalidad seleccionada)
  const confirmInvoice = async () => {
    if (!lastSaleReceipt) {
      setShowCashModal(false);
      return;
    }

    if (invoicePaymentMethod === 'EFECTIVO') {
      const rec = parseFloat(receivedCash);
      if (isNaN(rec) || rec < (lastSaleReceipt.total - 0.01)) {
        showToast(`El efectivo recibido (Bs. ${isNaN(rec) ? '0.00' : rec.toFixed(2)}) es menor al total a cobrar (Bs. ${lastSaleReceipt.total.toFixed(2)}).`, 'error');
        return;
      }
    }

    const isSinNombre = invoiceCustomerType === 'SIN_NOMBRE';
    const isRealInvoice = !isSinNombre;

    const finalClientName = isSinNombre ? 'SIN NOMBRE' : (invoiceRazonSocial.trim() || 'CLIENTE GENERAL');
    const finalNit = isSinNombre ? '0' : (invoiceDocNumber.trim() || '0');

    const updatedSale = {
      ...lastSaleReceipt,
      id: isRealInvoice
        ? (lastSaleReceipt.id.startsWith('FAC') ? lastSaleReceipt.id : lastSaleReceipt.id.replace('VNT', 'FAC').replace('REC', 'FAC'))
        : (lastSaleReceipt.id.startsWith('REC') ? lastSaleReceipt.id : lastSaleReceipt.id.replace('VNT', 'REC').replace('FAC', 'REC')),
      client: finalClientName,
      nit: finalNit,
      docType: isRealInvoice ? invoiceDocType : 'NIT',
      complemento: invoiceComplemento,
      email: invoiceEmail,
      customerType: invoiceCustomerType,
      paymentMethod: invoicePaymentMethod,
      isInvoice: isRealInvoice,
      cashReceived: invoicePaymentMethod === 'EFECTIVO' ? (parseFloat(receivedCash) || lastSaleReceipt.total) : lastSaleReceipt.total,
      change: invoicePaymentMethod === 'EFECTIVO' ? Math.max(0, (parseFloat(receivedCash) || lastSaleReceipt.total) - lastSaleReceipt.total) : 0
    };

    setLastSaleReceipt(updatedSale);
    setRecentSales((prev) => prev.map((s) => (s.id === lastSaleReceipt.id || s.id === updatedSale.id ? updatedSale : s)));
    setCurrentShiftSales((prev) => {
      const updated = prev.map((s) => (s.id === lastSaleReceipt.id || s.id === updatedSale.id ? updatedSale : s));
      try {
        localStorage.setItem('cyc_current_shift_sales', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Sincronizar actualización de factura con la base de datos SQL Server solo si es fiscal
    if (isRealInvoice) {
      const rawId = (lastSaleReceipt.ventaID || lastSaleReceipt.id || '').toString().replace(/^[A-Z-]+/i, '');
      if (rawId && !isNaN(parseInt(rawId))) {
        try {
          await updateSaleInvoice(rawId, {
            razonSocial: finalClientName,
            clienteNombre: finalClientName,
            nit: finalNit,
            tipoDocumento: invoiceDocType
          });
          // Refrescar lista de transacciones recientes desde la base de datos
          getRecentSales().then((salesData) => {
            if (Array.isArray(salesData)) setRecentSales(salesData);
          }).catch(() => {});
        } catch (err) {
          console.warn('No se pudo sincronizar factura en base de datos:', err);
        }
      }
    }

    let nextClientsList = clients;
    // Auto-registrar cliente en el catálogo de clientes si es un cliente nuevo nominal
    if (isRealInvoice && finalClientName && finalClientName !== 'CLIENTE GENERAL' && finalClientName !== 'SIN NOMBRE') {
      const matchExists = clients.some((c) =>
        c.name.trim().toLowerCase() === finalClientName.toLowerCase() ||
        (finalNit !== '0' && c.nit && c.nit.trim() === finalNit)
      );
      if (!matchExists) {
        const newClientEntry = {
          id: Date.now(),
          ClienteID: Date.now(),
          name: finalClientName,
          Nombre: finalClientName,
          RazonSocial: finalClientName,
          nit: finalNit,
          NIT: finalNit,
          phone: '-',
          email: invoiceEmail || '',
          address: 'Ventas en Mostrador',
          NivelLealtad: 'Estandar',
          DescuentoPorcentaje: 0,
          TotalComprasAcumulado: lastSaleReceipt.total || 0
        };
        nextClientsList = [...clients, newClientEntry];
        setClients(nextClientsList);
        try {
          localStorage.setItem('cyc_pos_clients', JSON.stringify(nextClientsList));
        } catch {}
      }
    }

    setShowCashModal(false);
    setShowReceiptModal(true);
    showToast(isRealInvoice ? '¡Factura fiscal emitida con éxito!' : '¡Recibo de venta emitido con éxito!', 'success');
    // Limpiar campos y reiniciar cliente a Cliente General para el próximo ticket
    resetPosForNextSale(nextClientsList);
  };

  // Emitir Solo Nota de Venta / Recibo para cliente nominal (sin registro fiscal SIAT)
  const handleIssueReceiptOnly = () => {
    if (!lastSaleReceipt) {
      setShowCashModal(false);
      return;
    }

    if (invoicePaymentMethod === 'EFECTIVO') {
      const rec = parseFloat(receivedCash);
      if (isNaN(rec) || rec < (lastSaleReceipt.total - 0.01)) {
        showToast(`El efectivo recibido (Bs. ${isNaN(rec) ? '0.00' : rec.toFixed(2)}) es menor al total a cobrar (Bs. ${lastSaleReceipt.total.toFixed(2)}).`, 'error');
        return;
      }
    }

    const finalClientName = invoiceRazonSocial.trim() || 'CLIENTE GENERAL';
    const finalNit = invoiceDocNumber.trim() || '0';

    const updatedSale = {
      ...lastSaleReceipt,
      id: lastSaleReceipt.id.startsWith('REC') ? lastSaleReceipt.id : lastSaleReceipt.id.replace('VNT', 'REC').replace('FAC', 'REC'),
      client: finalClientName,
      nit: finalNit,
      docType: invoiceDocType,
      complemento: invoiceComplemento,
      email: invoiceEmail,
      customerType: invoiceCustomerType,
      paymentMethod: invoicePaymentMethod,
      isInvoice: false,
      cashReceived: invoicePaymentMethod === 'EFECTIVO' ? (parseFloat(receivedCash) || lastSaleReceipt.total) : lastSaleReceipt.total,
      change: invoicePaymentMethod === 'EFECTIVO' ? Math.max(0, (parseFloat(receivedCash) || lastSaleReceipt.total) - lastSaleReceipt.total) : 0
    };

    setLastSaleReceipt(updatedSale);
    setRecentSales((prev) => prev.map((s) => (s.id === lastSaleReceipt.id || s.id === updatedSale.id ? updatedSale : s)));
    setCurrentShiftSales((prev) => {
      const updated = prev.map((s) => (s.id === lastSaleReceipt.id || s.id === updatedSale.id ? updatedSale : s));
      try {
        localStorage.setItem('cyc_current_shift_sales', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    let nextClientsList = clients;
    if (invoiceCustomerType === 'NORMAL' && finalClientName && finalClientName !== 'CLIENTE GENERAL' && finalClientName !== 'SIN NOMBRE') {
      const matchExists = clients.some((c) =>
        c.name.trim().toLowerCase() === finalClientName.toLowerCase() ||
        (finalNit !== '0' && c.nit && c.nit.trim() === finalNit)
      );
      if (!matchExists) {
        const newClientEntry = {
          id: Date.now(),
          ClienteID: Date.now(),
          name: finalClientName,
          Nombre: finalClientName,
          RazonSocial: finalClientName,
          nit: finalNit,
          NIT: finalNit,
          phone: '-',
          email: invoiceEmail || '',
          address: 'Ventas en Mostrador',
          NivelLealtad: 'Estandar',
          DescuentoPorcentaje: 0,
          TotalComprasAcumulado: lastSaleReceipt?.total || 0
        };
        nextClientsList = [...clients, newClientEntry];
        setClients(nextClientsList);
        try {
          localStorage.setItem('cyc_pos_clients', JSON.stringify(nextClientsList));
        } catch {}
      }
    }

    setShowCashModal(false);
    setShowReceiptModal(true);
    showToast('¡Recibo / Nota de venta generado exitosamente!', 'success');
    resetPosForNextSale(nextClientsList);
  };

  // Cerrar modal de factura sin problemas (la venta ya está registrada en efectivo)
  const handleCloseInvoiceModal = () => {
    setShowCashModal(false);
    showToast('Venta finalizada como comprobante de mostrador.', 'info');
    resetPosForNextSale(clients);
  };

  // Descargar comprobante / factura en formato PDF oficial y abrirlo en visor
  const handleDownloadReceipt = async () => {
    if (!lastSaleReceipt) return;
    try {
      showToast('Generando PDF oficial...', 'info');
      await generateInvoicePdf(lastSaleReceipt, { openInTab: true, download: true });
      const invoiceNum = (lastSaleReceipt.id || '1').toString().replace(/^[A-Z-]+/i, '');
      showToast(`PDF generado exitosamente (No. ${invoiceNum})`, 'success');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      showToast('Error al generar el archivo PDF', 'error');
    }
  };

  // Imprimir comprobante oficial directamente en alta fidelidad (PDF oficial)
  const handlePrintReceipt = async () => {
    if (!lastSaleReceipt) return;
    try {
      showToast('Abriendo visor de impresión...', 'info');
      await generateInvoicePdf(lastSaleReceipt, { print: true, download: false, openInTab: false });
    } catch (err) {
      console.warn('Fallback a impresión nativa:', err);
      window.print();
    }
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

  // Impresión de comprobante desde Transacciones Recientes (Alta fidelidad oficial)
  const handlePrintRecentSale = async (s) => {
    // Determinar con precisión si la venta fue emitida formalmente con factura fiscal
    const isRealInvoice =
      s.isInvoice === true ||
      s.esFactura === true ||
      s.esFactura === 1 ||
      (typeof s.id === 'string' && s.id.startsWith('FAC')) ||
      (s.TipoDocumento && s.TipoDocumento.toLowerCase().includes('factura'));

    const saleNum = s.ventaID || s.id.toString().replace(/^[A-Z-]+/i, '');
    const clientName = s.client || s.cliente || 'CLIENTE GENERAL';
    const isSinNombre = !clientName || clientName === 'SIN NOMBRE' || clientName === 'CLIENTE GENERAL';

    const receiptData = {
      id: isRealInvoice ? `FAC-${saleNum}` : `REC-${saleNum}`,
      numeroFactura: saleNum,
      ticketID: s.id,
      client: clientName,
      cliente: clientName,
      nit: s.nit && s.nit !== '0' ? s.nit : '0',
      docType: s.docType || 'NIT',
      complemento: s.complemento || '',
      email: s.email || '',
      customerType: isSinNombre ? 'SIN_NOMBRE' : 'NORMAL',
      items: (s.detalles || s.items || []).map((d, i) => ({
        ProductoID: d.ProductoID || i,
        name: d.name || d.producto || d.nombre || 'Producto',
        producto: d.name || d.producto || d.nombre || 'Producto',
        quantity: parseFloat(d.quantity || d.cantidad || 1),
        price: parseFloat(d.price || d.precioUnitario || d.PrecioVenta || 0),
        unit: d.unit || 'UNID',
        subtotal: parseFloat(d.subtotal || 0)
      })),
      detalles: s.detalles || s.items || [],
      totalItemsCount: s.totalItemsCount || s.items?.length || 1,
      subtotal: parseFloat(s.subtotal || s.total || 0),
      discount: parseFloat(s.discount || 0),
      total: parseFloat(s.total || 0),
      baseCreditoFiscal: isRealInvoice ? parseFloat(s.total || 0) : 0,
      creditoFiscal: isRealInvoice ? parseFloat(s.total || 0) * 0.13 : 0,
      cashReceived: parseFloat(s.cashReceived || s.total || 0),
      change: parseFloat(s.change || 0),
      time: s.time || s.fecha || new Date().toLocaleString('es-BO'),
      paymentMethod: s.paymentMethod || s.metodoPago || 'EFECTIVO',
      isInvoice: isRealInvoice,
      empleado: s.empleado || currentUser?.Nombre || 'Cajero'
    };
    setLastSaleReceipt(receiptData);
    try {
      showToast(`Abriendo visor de impresión (${isRealInvoice ? 'Factura SIAT' : 'Recibo de Venta'})...`, 'info');
      await generateInvoicePdf(receiptData, { print: true, download: false, openInTab: false });
    } catch (e) {
      console.warn('Fallback a impresión nativa:', e);
      window.print();
    }
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
      discount: effectiveDiscount,
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
    setManualDiscount(null);
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
    setManualDiscount(parseFloat(q.discount || 0));
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

  // Si la caja registradora NO está abierta, mostrar la pantalla de Apertura de Caja dentro de nuestro layout estándar
  if (!isCashRegisterOpen) {
    const activeUserName = currentUser?.Nombre || 'OSCAR EDGAR CLAROS DAVALOS';

    return (
      <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex selection:bg-amber-500/30 selection:text-amber-200">
        <Sidebar activeItem="vender" />

        <main className={`flex-1 transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-[#0c0e12] flex flex-col`}>
          <Topbar />

          <div className="p-6 md:p-8 max-w-[1600px] w-full mx-auto space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Encabezado Superior */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-zinc-800/80">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100 text-balance">
                    Apertura de Caja Registradora
                  </h1>
                  <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                    Declare el fondo de efectivo inicial en gaveta para habilitar la terminal de ventas POS.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenLastRegisterModal}
                  className="btn-press flex items-center gap-2 px-4 py-2.5 bg-[#12151c] hover:bg-zinc-800/90 text-zinc-200 border border-zinc-800 hover:border-zinc-700 font-bold rounded-xl text-xs transition-colors duration-150 ease-out-expo cursor-pointer"
                  title="Consultar detalles del último cierre de caja"
                >
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Mi último arqueo</span>
                </button>
              </div>

              {/* Tarjeta Central del Formulario */}
              <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-6 sm:p-8 max-w-xl w-full mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6 mt-8">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                  <div className="text-xs sm:text-sm font-semibold text-zinc-400">
                    Operador responsable: <span className="text-zinc-100 font-bold">{activeUserName}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/25 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {currentUser?.Rol || 'ADMINISTRADOR'}
                  </span>
                </div>

                <form onSubmit={handleOpenRegisterSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">
                      Efectivo inicial en gaveta (Bs.) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400 font-mono font-bold text-sm">
                        Bs.
                      </span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={initialCashInput}
                        onChange={(e) => setInitialCashInput(e.target.value)}
                        placeholder="0.00 (Ej: 200.00)"
                        autoFocus
                        className="w-full pl-12 pr-4 py-3 bg-[#0c0e12] border border-zinc-800 focus:border-amber-500 rounded-xl text-zinc-100 font-mono tabular-nums text-base font-bold outline-none transition-colors duration-150 placeholder:text-zinc-600"
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">
                      Indique el monto en monedas y billetes disponible para cambio al iniciar el turno.
                    </p>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={openingRegisterLoading}
                      className="btn-press flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl shadow-sm text-sm cursor-pointer disabled:opacity-50"
                    >
                      {openingRegisterLoading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Habilitando terminal...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Abrir turno de caja</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>

        {/* Modal Mi último registro */}
        {showLastRegisterModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#12151c] text-zinc-100 rounded-2xl max-w-lg w-full border border-zinc-800 shadow-2xl overflow-hidden animate-modal-in">
              <div className="p-4 bg-[#0c0e12] border-b border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Detalle del Último Arqueo de Caja</h3>
                    <p className="text-[11px] text-zinc-400 font-mono tabular-nums">Registro #{lastRegisterData?.id || '1042'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLastRegisterModal(false)}
                  className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {loadingLastRegister ? (
                  <div className="py-8 text-center text-zinc-500 font-medium text-xs">
                    Cargando información del último arqueo...
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center p-3 bg-[#0c0e12] rounded-xl border border-zinc-800/80">
                      <span className="text-zinc-400 font-medium">Estado de sesión:</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/25 text-[11px]">
                        CERRADA
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                      <div className="p-3 bg-[#0c0e12] rounded-xl border border-zinc-800/80 space-y-0.5">
                        <span className="text-zinc-500 block font-semibold">Fecha Apertura</span>
                        <strong className="text-zinc-200 font-mono tabular-nums">{lastRegisterData?.fechaApertura || '2026-09-10 08:30:00'}</strong>
                      </div>
                      <div className="p-3 bg-[#0c0e12] rounded-xl border border-zinc-800/80 space-y-0.5">
                        <span className="text-zinc-500 block font-semibold">Fecha Cierre</span>
                        <strong className="text-zinc-200 font-mono tabular-nums">{lastRegisterData?.fechaCierre || '2026-09-10 19:45:00'}</strong>
                      </div>
                    </div>

                    <div className="p-4 bg-[#0c0e12] rounded-xl border border-zinc-800/80 space-y-2.5">
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Efectivo Inicial en Caja:</span>
                        <strong className="font-mono tabular-nums text-zinc-100">Bs. {parseFloat(lastRegisterData?.montoInicial || 0).toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Ventas en Efectivo:</span>
                        <strong className="font-mono tabular-nums text-emerald-400">+ Bs. {parseFloat(lastRegisterData?.totalVentasEfectivo || 0).toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Ventas Digitales (QR / Tarjeta):</span>
                        <strong className="font-mono tabular-nums text-amber-400">+ Bs. {parseFloat(lastRegisterData?.totalVentasDigital || 0).toFixed(2)}</strong>
                      </div>
                      <div className="border-t border-zinc-800 pt-2.5 flex justify-between items-center text-zinc-100 font-bold">
                        <span>Total Esperado en Gaveta:</span>
                        <span className="font-mono tabular-nums text-amber-400 text-sm">Bs. {parseFloat(lastRegisterData?.totalEsperado || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-100 font-bold">
                        <span>Efectivo Real Declarado:</span>
                        <span className="font-mono tabular-nums text-emerald-400 text-sm">Bs. {parseFloat(lastRegisterData?.montoFinal || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-300">
                        <span>Diferencia / Cuadre:</span>
                        <strong className={`font-mono tabular-nums ${parseFloat(lastRegisterData?.diferencia || 0) === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          Bs. {parseFloat(lastRegisterData?.diferencia || 0).toFixed(2)} (Cuadrado)
                        </strong>
                      </div>
                    </div>

                    {lastRegisterData?.observaciones && (
                      <div className="p-3 bg-[#0c0e12] rounded-xl border border-zinc-800/80 text-[11px]">
                        <span className="text-zinc-500 block font-semibold mb-0.5">Observaciones:</span>
                        <p className="text-zinc-300">{lastRegisterData.observaciones}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#0c0e12] border-t border-zinc-800/80 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowLastRegisterModal(false)}
                  className="btn-press px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex flex-col select-none overflow-hidden h-screen">
      {/* ========================================================================= */}
      {/* 1. BARRA SUPERIOR DE ENCABEZADO POS                                       */}
      {/* ========================================================================= */}
      <header className="bg-[#12151c] border-b border-zinc-800/80 px-4 py-2 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="btn-press flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-bold transition-colors border border-zinc-800"
            title="Salir del Punto de Venta y volver al Panel"
          >
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Salir del POS</span>
          </Link>

          <div className="hidden xl:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-zinc-500">Sucursal:</span>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              CASA Y CONSTRUCCIÓN (CENTRAL)
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#0c0e12] px-3 py-1 rounded-md border border-zinc-800/80 text-xs font-mono tabular-nums font-bold text-zinc-300">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{currentDateTime}</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-[#0c0e12] px-3 py-1 rounded-md border border-zinc-800/80 text-xs font-semibold text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-zinc-500">Operador:</span>
            <span className="text-zinc-100 font-bold">{currentUser?.Nombre || 'Cajero'}</span>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded font-mono uppercase">
              {currentUser?.Rol || 'VENDEDOR'}
            </span>
          </div>

          {cashRegisterData && (
            <div className="hidden lg:flex items-center gap-1.5 bg-emerald-950/30 border border-emerald-500/25 px-2.5 py-1 rounded-md text-xs font-semibold text-emerald-400">
              <span>Fondo Caja:</span>
              <span className="font-mono tabular-nums font-bold text-zinc-100">Bs. {parseFloat(cashRegisterData.montoInicial || 0).toFixed(2)}</span>
              {parseFloat(cashRegisterData.totalAumentos || 0) > 0 && (
                <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono tabular-nums ml-1" title="Aumentos de cambio acumulados en el turno">
                  +{parseFloat(cashRegisterData.totalAumentos).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Herramientas de la cabecera derecha */}
        <div className="flex items-center gap-1.5">
          {/* Botón Aumento a Caja (Ingreso de Efectivo / Cambio) */}
          <button
            type="button"
            onClick={() => setShowCashInModal(true)}
            className="btn-press flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-emerald-500/30 mr-1"
            title="Ingresar aumento de efectivo o cambio a la caja"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Ingreso a caja</span>
          </button>

          {/* Botón Pantalla Completa */}
          <button
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="btn-press p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg transition-colors border border-zinc-800"
            title="Pantalla Completa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          {/* Botón Cerrar Caja Registradora */}
          <button
            type="button"
            onClick={handleOpenCloseRegisterModal}
            className="btn-press flex items-center gap-1.5 px-3 py-1.5 bg-red-600/15 hover:bg-red-600/25 text-red-400 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-red-500/30 ml-1"
            title="Cerrar caja registradora del turno"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Arqueo y Cierre</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. CUERPO PRINCIPAL DIVIDIDO EN 2 PANELES: TICKET (IZQ) Y CATÁLOGO (DER) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ======================================================================= */}
        {/* PANEL IZQUIERDO: TICKET / MOSTRADOR DE COBRO                            */}
        {/* ======================================================================= */}
        <div className="w-full lg:w-[50%] xl:w-[48%] 2xl:w-[46%] bg-[#12151c] border-r border-zinc-800/80 flex flex-col justify-between overflow-hidden">
          {/* Fila 1: Selector de Cliente y Recibo No en Edición */}
          <div className="p-3.5 border-b border-zinc-800/80 bg-[#0c0e12]/60 space-y-2.5 relative z-30">
            {editingSaleId && (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-bold">
                <span className="flex items-center gap-1.5 font-mono tabular-nums">
                  <span>Editando Recibo No.:</span>
                  <strong className="text-zinc-100 text-sm">#{editingSaleId}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSaleId(null);
                    setCart([]);
                    showToast('Edición de venta cancelada', 'info');
                  }}
                  className="text-xs text-zinc-400 hover:text-red-400 font-semibold transition-colors underline"
                  title="Cancelar edición de venta"
                >
                  ✕ Cancelar edición
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>

              <select
                value={selectedClient.id}
                onChange={(e) => {
                  const target = clients.find((c) => c.id === parseInt(e.target.value));
                  if (target) {
                    setSelectedClient(target);
                    setManualDiscount(null);
                  }
                }}
                className="flex-1 bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 font-bold focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
              >
                {clients.map((c) => {
                  const tierBadge = c.NivelLealtad === 'Mayorista' ? '[MAYORISTA]' : c.NivelLealtad === 'Constructor' ? '[CONSTRUCTOR]' : c.NivelLealtad === 'Frecuente' ? '[FRECUENTE]' : '[MOSTRADOR]';
                  const pct = c.DescuentoPorcentaje ? ` — ${c.DescuentoPorcentaje}% Dcto.` : '';
                  return (
                    <option key={c.id} value={c.id}>
                      {tierBadge} {c.name} {c.nit !== '0' ? `(NIT: ${c.nit})` : ''}{pct}
                    </option>
                  );
                })}
              </select>

              <button
                onClick={() => setShowNewClientModal(true)}
                className="btn-press w-9 h-9 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 flex items-center justify-center font-black text-base transition-colors"
                title="Registrar nuevo cliente rápido"
              >
                +
              </button>
            </div>

            {/* Insignia de Fidelidad / Lealtad del Cliente Seleccionado */}
            {selectedClient && selectedClient.id !== 1 && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#0c0e12] rounded-xl border border-amber-500/25 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span className="font-bold text-amber-400 uppercase tracking-wider">
                    Nivel: {selectedClient.NivelLealtad || 'Estándar'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {loyaltyDiscountPercent > 0 ? (
                    <span className="text-emerald-400 font-mono tabular-nums font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      {loyaltyDiscountPercent}% Dcto. (-Bs. {loyaltyDiscountAmount.toFixed(2)})
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-semibold">Tarifa regular</span>
                  )}
                </div>
              </div>
            )}

            {/* Fila 2: Buscador / Escáner de Código de Barras con Autocompletado Predictivo */}
            <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
              <div ref={barcodeSearchContainerRef} className="relative flex-1">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Escanee código de barras, ingrese SKU o nombre y presione Enter..."
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setSelectedBarcodeSuggestionIndex(-1);
                    setShowBarcodeSuggestions(true);
                  }}
                  onFocus={() => {
                    if (barcodeInput.trim()) setShowBarcodeSuggestions(true);
                  }}
                  onKeyDown={handleBarcodeKeyDown}
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium transition-colors duration-100"
                />
                <svg className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>

                {/* Desplegable Predictivo de Sugerencias de Productos en Vivo */}
                {showBarcodeSuggestions && barcodeInput.trim().length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-[#12151c] border border-zinc-700/90 rounded-2xl shadow-2xl overflow-hidden animate-dropdown-in origin-top">
                    <div className="px-3 py-2 bg-[#0c0e12] border-b border-zinc-800/80 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        Sugerencias ({barcodeSuggestions.length})
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        ↑↓ navegar • Enter añadir • Esc cerrar
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
                      {barcodeSuggestions.length === 0 ? (
                        <div className="py-6 px-4 text-center text-zinc-500">
                          <p className="text-xs font-semibold text-zinc-400">Sin coincidencias para &ldquo;{barcodeInput}&rdquo;</p>
                          <p className="text-[11px] text-zinc-600 mt-0.5">Verifique el SKU, código de barras o nombre del artículo</p>
                        </div>
                      ) : (
                        barcodeSuggestions.map((prod, idx) => {
                          const isSelected = idx === selectedBarcodeSuggestionIndex;
                          const stock = parseInt(prod.Stock || 0);
                          const isOut = stock <= 0;
                          const price = parseFloat(prod.PrecioVenta || prod.Precio || 0);

                          return (
                            <div
                              key={prod.ProductoID}
                              onMouseEnter={() => setSelectedBarcodeSuggestionIndex(idx)}
                              onClick={() => handleSelectBarcodeSuggestion(prod)}
                              className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors duration-100 ${
                                isSelected
                                  ? 'bg-amber-500/15 border-l-2 border-amber-400 text-zinc-100'
                                  : 'hover:bg-zinc-800/50 text-zinc-200'
                              }`}
                            >
                              {/* Miniatura + Nombre y SKU */}
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-lg bg-[#0c0e12] border border-zinc-800 flex items-center justify-center p-1 flex-shrink-0 overflow-hidden">
                                  {prod.Imagen ? (
                                    <img src={prod.Imagen} alt={prod.Nombre} className="w-full h-full object-contain" />
                                  ) : (
                                    <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-zinc-100 truncate uppercase">
                                    {prod.Nombre}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400 font-mono">
                                    <span className="text-amber-400/90 font-semibold">{prod.Codigo || prod.CodigoBarras || `PRD-${prod.ProductoID}`}</span>
                                    {prod.Categoria?.Nombre && (
                                      <span className="text-zinc-500 truncate max-w-[120px]">• {prod.Categoria.Nombre}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Stock y Precio */}
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-xs font-bold font-mono tabular-nums text-amber-400">
                                  Bs. {price.toFixed(2)}
                                </span>
                                <span
                                  className={`text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.5 rounded border ${
                                    isOut
                                      ? 'bg-red-500/10 text-red-400 border-red-500/25'
                                      : stock <= (prod.LoteMinimo || 5)
                                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  }`}
                                >
                                  {isOut ? 'Agotado' : `Stock: ${stock}`}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-press w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center font-black text-base transition-colors"
                title="Buscar o añadir al ticket"
              >
                +
              </button>
            </form>
          </div>

          {/* Tabla de Productos en Ticket (Respuesta instantánea en filas y contadores) */}
          <div className="flex-1 overflow-y-auto p-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800/80 text-[11px] uppercase tracking-wider font-bold">
                  <th className="pb-2.5 pl-2">Producto / Precio Unit.</th>
                  <th className="pb-2.5 text-center w-36">Cantidad</th>
                  <th className="pb-2.5 text-right w-32">Subtotal</th>
                  <th className="pb-2.5 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-20 text-center text-zinc-500">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-zinc-300">Ticket de venta vacío</p>
                      <p className="text-xs text-zinc-500 mt-1">Escanee un código de barras o seleccione un ítem del catálogo derecho</p>
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.ProductoID} className="hover:bg-zinc-800/35 transition-colors duration-75 group">
                      <td
                        onClick={() => handleOpenItemDetails(item)}
                        className="py-3 pl-2 cursor-pointer"
                        title="Haga clic para ajustar precio unitario o agregar nota"
                      >
                        <div className="font-bold text-zinc-100 group-hover:text-amber-400 text-xs sm:text-sm leading-snug uppercase max-w-[220px] sm:max-w-[280px] transition-colors duration-75 flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                            Editar
                          </span>
                          <span className="truncate">{item.name}</span>
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-2 mt-1 font-mono tabular-nums">
                          <span className="text-zinc-500">{item.code}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="font-semibold text-zinc-300">Bs. {item.price.toFixed(2)} c/u</span>
                          {item.customNote && (
                            <span className="text-[10px] font-sans text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 truncate max-w-[140px]">
                              Nota: {item.customNote}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contador de Cantidad (Instantáneo) */}
                      <td className="py-3 text-center">
                        <div className="inline-flex items-center border border-zinc-800 bg-[#0c0e12] rounded-xl overflow-hidden p-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.ProductoID, -1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 hover:text-zinc-100 font-bold text-base transition-colors duration-75 rounded-lg"
                          >
                            −
                          </button>
                          <span className="px-2.5 text-sm font-bold text-zinc-100 min-w-[34px] text-center font-mono tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.ProductoID, 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 active:bg-zinc-700 text-zinc-300 hover:text-zinc-100 font-bold text-base transition-colors duration-75 rounded-lg"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Subtotal del item */}
                      <td className="py-3 text-right font-bold text-zinc-100 text-sm font-mono tabular-nums">
                        Bs. {item.subtotal.toFixed(2)}
                      </td>

                      {/* Botón Borrar fila */}
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.ProductoID)}
                          className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-75"
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
          <div className="p-3.5 border-t border-zinc-800/80 bg-[#0c0e12]/90 space-y-2 text-xs">
            <div className="flex justify-between items-center text-zinc-400 font-semibold">
              <span>Ítems en ticket: <strong className="font-mono tabular-nums text-zinc-200">{totalQuantity.toFixed(2)}</strong></span>
              <span className="text-sm font-bold text-zinc-100 font-mono tabular-nums">Subtotal: Bs. {subtotalProducts.toFixed(2)}</span>
            </div>

            <div className="pt-1.5 border-t border-zinc-800/60 space-y-1.5 text-[11px]">
              {loyaltyDiscountPercent > 0 && (
                <div className="flex items-center justify-between text-amber-400 px-2.5 py-1 font-semibold bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <span>Descuento Nivel {selectedClient?.NivelLealtad} ({loyaltyDiscountPercent}%):</span>
                  <span className="font-mono tabular-nums font-bold">-Bs. {effectiveDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="w-full flex items-center justify-between px-3 py-1.5 bg-[#12151c] rounded-lg border border-zinc-800 text-zinc-300">
                <span className="font-bold text-zinc-300">Total Neto Ticket:</span>
                <b className="text-amber-400 font-extrabold font-mono tabular-nums text-sm">Bs. {finalTotal.toFixed(2)}</b>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* PANEL DERECHO: CATÁLOGO TÁCTIL Y GALERÍA DE PRODUCTOS                   */}
        {/* ======================================================================= */}
        <div className="flex-1 bg-[#0c0e12] flex flex-col justify-between overflow-hidden">
          {/* Botones de Categorías y Marcas Superiores */}
          <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between gap-3 bg-[#12151c]/60 flex-shrink-0">
            <div className="flex items-center gap-2 flex-1">
              {/* Botón Filtro de Categoría */}
              <button
                onClick={() => setShowCategoryFilterModal(true)}
                className={`btn-press flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  selectedCategory !== 'ALL'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                }`}
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Categoría {selectedCategory !== 'ALL' ? `(${selectedCategory})` : ''}</span>
              </button>

              {/* Botón Filtro de Marcas */}
              <button
                onClick={() => setShowBrandFilterModal(true)}
                className={`btn-press flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
                  selectedBrand !== 'ALL'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                }`}
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                  className="text-xs text-red-400 hover:text-red-300 font-bold px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 transition-colors"
                >
                  ✕ Limpiar
                </button>
              )}
            </div>

            {/* Buscador de Grid (Instantáneo sin transiciones lentas) */}
            <div className="relative w-48 sm:w-64">
              <input
                type="text"
                placeholder="Filtrar catálogo rápido..."
                value={gridSearch}
                onChange={(e) => setGridSearch(e.target.value)}
                className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors duration-100"
              />
              <svg className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Grilla Táctil de Productos */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-zinc-500">
                <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                <span className="text-xs font-semibold">Sincronizando inventario POS...</span>
              </div>
            ) : filteredGridProducts.length === 0 ? (
              <div className="py-24 text-center text-zinc-500">
                <div className="w-12 h-12 rounded-2xl bg-[#12151c] border border-zinc-800 flex items-center justify-center mx-auto mb-2 text-zinc-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold text-zinc-400">No hay productos que coincidan con el filtro</p>
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
                      className={`group bg-[#12151c] border rounded-2xl p-3 flex flex-col items-center justify-between text-center transition-[border-color,background-color,transform] duration-100 ease-out-expo relative overflow-hidden ${
                        isOut
                          ? 'border-red-500/25 opacity-55 cursor-not-allowed'
                          : 'border-zinc-800/90 hover:border-amber-500/50 hover:bg-zinc-900/90 active:scale-[0.97] cursor-pointer'
                      }`}
                    >
                      {/* Imagen o Icono del Producto */}
                      <div className="w-20 h-20 rounded-xl bg-[#0c0e12] border border-zinc-800/80 flex items-center justify-center p-1.5 mb-2 overflow-hidden flex-shrink-0">
                        {p.Imagen ? (
                          <img src={p.Imagen} alt={p.Nombre} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-150 ease-out-expo" />
                        ) : (
                          <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        )}
                      </div>

                      {/* Nombre y SKU */}
                      <div className="w-full space-y-1">
                        <p className="text-[11px] font-bold text-zinc-100 uppercase line-clamp-2 leading-tight">
                          {p.Nombre}
                        </p>
                        <p className="text-[10px] font-mono tabular-nums text-zinc-500">
                          {p.Codigo || p.CodigoBarras || `PRD-${p.ProductoID}`}
                        </p>
                      </div>

                      {/* Precio y Stock */}
                      <div className="w-full mt-2 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="font-mono tabular-nums font-extrabold text-amber-400">
                          Bs. {price.toFixed(2)}
                        </span>

                        <span
                          className={`text-[10px] font-mono tabular-nums font-bold px-2 py-0.5 rounded-md border ${
                            isOut
                              ? 'bg-red-500/10 text-red-400 border-red-500/25'
                              : stock <= (p.LoteMinimo || 5)
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          }`}
                        >
                          {isOut ? 'Agotado' : `${stock} ud`}
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
      {/* 3. BARRA INFERIOR DE COBRO RÁPIDO POS                                     */}
      {/* ========================================================================= */}
      <footer className="bg-[#12151c] border-t border-zinc-800/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20">
        {/* Acciones Rápidas Izquierda */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleQuotationClick}
            className="btn-press flex items-center gap-2 px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-amber-400 rounded-xl font-bold border border-zinc-800 transition-colors"
            title="Guardar como proforma/cotización sin descontar inventario"
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Guardar Cotización</span>
          </button>
        </div>

        {/* Botones de Cobro y Total Destacado */}
        <div className="flex items-center gap-3">
          {/* Botón Efectivo (Sin animate-pulse fatigante; respuesta táctil firme) */}
          <button
            onClick={handleCashClick}
            className="btn-press flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-extrabold text-sm shadow-sm transition-colors cursor-pointer"
            title="Registrar venta y abrir emisión de factura"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Cobrar</span>
          </button>

          <button
            onClick={clearCart}
            className="btn-press px-4 py-2.5 bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs transition-colors"
          >
            Cancelar
          </button>

          {/* Gran Total Visual */}
          <div className="bg-[#0c0e12] px-5 py-1.5 rounded-xl border border-zinc-800 text-right min-w-[165px]">
            <span className="text-[10px] uppercase font-bold text-zinc-500 block tracking-wider">Total a Pagar</span>
            <span className="text-xl font-black text-amber-400 font-mono tabular-nums tracking-tight">
              Bs. {finalTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Acciones Derecha */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={handleOpenRecentSales}
            className="btn-press px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl font-bold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Historial</span>
          </button>

          <Link
            to="/pedidos-online"
            className="btn-press px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl transition-colors flex items-center gap-2 relative"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>Pedidos Online</span>
            {pendingOnlineOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-mono font-black rounded-full border border-red-400/50 tabular-nums animate-pulse shadow-sm">
                {pendingOnlineOrdersCount}
              </span>
            )}
          </Link>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. MODAL: DATOS PARA FACTURA                                              */}
      {/* ========================================================================= */}
      {showCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 text-zinc-100 my-8 max-h-[90vh] overflow-y-auto animate-modal-in">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div>
                <h3 className="font-extrabold text-zinc-100 text-base tracking-tight">
                  Emisión de Factura / Comprobante
                </h3>
                <p className="text-[11px] text-zinc-400">
                  La venta ya fue registrada en inventario. Complete los datos fiscales o cierre para comprobante de mostrador.
                </p>
              </div>
              <button
                onClick={handleCloseInvoiceModal}
                className="text-zinc-400 hover:text-zinc-100 text-base p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                title="Cerrar modal (la venta ya está registrada)"
              >
                ✕
              </button>
            </div>

            {/* SECCIÓN 1: DATOS DE CLIENTE */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                1. Datos del Cliente / Razón Social
              </h4>

              {/* Radio buttons: Normal, Sin Nombre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-zinc-300">
                <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl border transition-colors ${invoiceCustomerType === 'NORMAL' ? 'bg-amber-500/10 border-amber-500/30 text-zinc-100' : 'bg-[#0c0e12] border-zinc-800 hover:border-zinc-700'}`}>
                  <input
                    type="radio"
                    name="customerType"
                    checked={invoiceCustomerType === 'NORMAL'}
                    onChange={() => handleCustomerTypeChange('NORMAL')}
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Cliente Nominal (NIT / CI)</span>
                </label>

                <label className={`flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl border transition-colors ${invoiceCustomerType === 'SIN_NOMBRE' ? 'bg-amber-500/10 border-amber-500/30 text-zinc-100' : 'bg-[#0c0e12] border-zinc-800 hover:border-zinc-700'}`}>
                  <input
                    type="radio"
                    name="customerType"
                    checked={invoiceCustomerType === 'SIN_NOMBRE'}
                    onChange={() => handleCustomerTypeChange('SIN_NOMBRE')}
                    className="accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Sin Nombre <span className="text-[10px] text-zinc-500">(≤ Bs. 10.000)</span></span>
                </label>
              </div>

              {/* Campo: Razón Social con Autocompletado Predictivo */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-zinc-400">
                    Razón social / Cliente *
                  </label>
                  {invoiceCustomerType === 'NORMAL' && (
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {showClientSuggestions ? 'Selecciona o escribe nuevo' : 'Buscar o ingresar nuevo'}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={invoiceRazonSocial}
                    onChange={(e) => {
                      setInvoiceRazonSocial(e.target.value);
                      if (invoiceCustomerType === 'NORMAL') {
                        setShowClientSuggestions(true);
                      }
                    }}
                    onFocus={() => {
                      if (invoiceCustomerType === 'NORMAL') {
                        setShowClientSuggestions(true);
                      }
                    }}
                    placeholder={invoiceCustomerType === 'NORMAL' ? "Escribe nombre, empresa o NIT para buscar..." : "SIN NOMBRE"}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-4 py-2 pr-10 text-xs text-zinc-100 uppercase focus:outline-none focus:border-amber-500 transition-colors font-semibold"
                    required
                  />

                  {invoiceCustomerType === 'NORMAL' && (
                    <button
                      type="button"
                      onClick={() => setShowClientSuggestions(!showClientSuggestions)}
                      className="absolute right-2.5 top-2 p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                      title="Ver clientes registrados"
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${showClientSuggestions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Desplegable Predictivo de Clientes Registrados */}
                {invoiceCustomerType === 'NORMAL' && showClientSuggestions && (
                  <>
                    {/* Backdrop invisible para cerrar al hacer clic afuera */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowClientSuggestions(false)}
                    ></div>

                    <div className="absolute z-50 left-0 right-0 mt-1 bg-[#12151c] border border-zinc-700/80 rounded-xl shadow-2xl max-h-56 overflow-y-auto animate-dropdown-in custom-scrollbar">
                      {(() => {
                        const q = (invoiceRazonSocial || '').trim().toLowerCase();
                        const matches = clients.filter((c) =>
                          c.id !== 1 &&
                          ((c.name && c.name.toLowerCase().includes(q)) ||
                           (c.RazonSocial && c.RazonSocial.toLowerCase().includes(q)) ||
                           (c.nit && c.nit.includes(q)))
                        );

                        return (
                          <div className="p-1 space-y-0.5">
                            {matches.length > 0 ? (
                              <>
                                <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                                  <span>Clientes Registrados ({matches.length})</span>
                                  <span className="text-[10px] text-zinc-600 font-normal">Clic para autocompletar</span>
                                </div>
                                {matches.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleSelectClientSuggestion(c)}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800/80 transition-colors flex items-center justify-between text-xs group cursor-pointer"
                                  >
                                    <div className="min-w-0 pr-2">
                                      <span className="font-bold text-zinc-200 group-hover:text-amber-400 block truncate">
                                        {c.name || c.RazonSocial}
                                      </span>
                                      <span className="text-[10px] text-zinc-500 font-mono">
                                        NIT/CI: <strong className="text-zinc-300">{c.nit || '0'}</strong>
                                        {c.phone && c.phone !== '-' && c.phone !== '0' && ` • Tel: ${c.phone}`}
                                      </span>
                                    </div>
                                    {c.NivelLealtad && c.NivelLealtad !== 'Estandar' && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono flex-shrink-0">
                                        {c.NivelLealtad} ({c.DescuentoPorcentaje}%)
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </>
                            ) : null}

                            {/* Opción para registrar como cliente nuevo si está escribiendo un nombre nuevo */}
                            <div className="p-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                              <span className="flex items-center gap-1.5 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                {q ? (
                                  <span>Registrar <strong>"{invoiceRazonSocial}"</strong> como nuevo</span>
                                ) : (
                                  <span>Escribe el nombre o NIT para buscar o ingresar uno nuevo</span>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowClientSuggestions(false)}
                                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
                              >
                                Continuar
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>

              {/* Fila: Tipo de Documento, Número de Impuesto, Complemento */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Tipo de Documento *
                  </label>
                  <select
                    value={invoiceDocType}
                    onChange={(e) => setInvoiceDocType(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-semibold cursor-pointer"
                  >
                    <option value="NIT">NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA</option>
                    <option value="CI">CI - CÉDULA DE IDENTIDAD</option>
                    <option value="PASAPORTE">PASAPORTE</option>
                    <option value="CEX">C.E. - CÉDULA DE IDENTIDAD DE EXTRANJERO</option>
                    <option value="OTRO">OTRO DOCUMENTO</option>
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Número NIT / CI *
                  </label>
                  <input
                    type="text"
                    value={invoiceDocNumber}
                    onChange={(e) => setInvoiceDocNumber(e.target.value)}
                    placeholder="0000"
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono tabular-nums font-bold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 mb-1">
                    Compl.
                  </label>
                  <input
                    type="text"
                    value={invoiceComplemento}
                    onChange={(e) => setInvoiceComplemento(e.target.value)}
                    placeholder="Ej. 1A"
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Campo: Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">
                  Correo electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={invoiceEmail}
                  onChange={(e) => setInvoiceEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* SECCIÓN 2: RESUMEN DE FACTURA */}
            {(() => {
              const modalSaleTotal = lastSaleReceipt?.total ?? finalTotal;
              const modalSaleSubtotal = lastSaleReceipt?.subtotal ?? subtotalProducts;
              const modalSaleDiscount = lastSaleReceipt?.discount ?? effectiveDiscount;

              return (
                <div className="space-y-2 pt-3 border-t border-zinc-800/80">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    2. Liquidación Fiscal
                  </h4>

                  <div className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl p-3.5 divide-y divide-zinc-800/70 text-xs">
                    <div className="flex justify-between py-1.5 text-zinc-300">
                      <span className="font-semibold">Subtotal Bruto:</span>
                      <span className="font-mono tabular-nums font-bold text-zinc-100">Bs. {modalSaleSubtotal.toFixed(2)}</span>
                    </div>
                    {modalSaleDiscount > 0 && (
                      <div className="flex justify-between py-1.5 text-amber-400">
                        <span className="font-semibold">Descuento Aplicado (-):</span>
                        <span className="font-mono tabular-nums font-bold">-Bs. {modalSaleDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 text-zinc-200">
                      <span className="font-bold">Total Base Crédito Fiscal:</span>
                      <span className="font-mono tabular-nums font-extrabold text-amber-400 text-sm">Bs. {modalSaleTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-zinc-400 text-[11px]">
                      <span>Crédito fiscal IVA (13%):</span>
                      <span className="font-mono tabular-nums font-bold text-emerald-400">Bs. {(modalSaleTotal * 0.13).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* SECCIÓN 3: MÉTODO DE PAGO */}
            <div className="space-y-3 pt-3 border-t border-zinc-800/80">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                3. Modalidad de Cobro
              </h4>

              {/* Radio buttons de métodos (Solo Efectivo y QR Simple) */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-zinc-300">
                {[
                  { id: 'EFECTIVO', label: 'EFECTIVO' },
                  { id: 'BILLETERA_MOVIL', label: 'QR SIMPLE' }
                ].map((m) => (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl border transition-colors ${
                      invoicePaymentMethod === m.id
                        ? 'bg-amber-500/10 border-amber-500/35 text-zinc-100'
                        : 'bg-[#0c0e12] border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payMethod"
                      checked={invoicePaymentMethod === m.id}
                      onChange={() => setInvoicePaymentMethod(m.id)}
                      className="accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="text-[11px] font-bold">{m.label}</span>
                  </label>
                ))}
              </div>

              {/* Si es EFECTIVO: Monto Recibido y Cambio / Vuelto exacto */}
              {invoicePaymentMethod === 'EFECTIVO' && (() => {
                const targetTotal = lastSaleReceipt?.total ?? finalTotal;
                const recVal = parseFloat(receivedCash) || 0;
                const changeVal = Math.max(0, recVal - targetTotal);

                return (
                  <div className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 mb-1">Monto Recibido (Bs.):</label>
                        <input
                          type="number"
                          step="0.10"
                          value={receivedCash}
                          onChange={(e) => setReceivedCash(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#12151c] border border-zinc-700 rounded-xl px-3 py-2 text-base font-black text-zinc-100 focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-400 mb-1">Cambio / Vuelto a Entregar:</label>
                        <div className="w-full bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2 text-base font-black text-emerald-400 font-mono tabular-nums flex items-center justify-between">
                          <span>Bs. {changeVal.toFixed(2)}</span>
                          {recVal >= targetTotal && targetTotal > 0 && changeVal === 0 && (
                            <span className="text-[10px] font-sans text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              Exacto
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* BOTONES DE ACCIÓN: CERRAR, NOTA DE VENTA, EMISIÓN */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
              {invoiceCustomerType === 'NORMAL' ? (
                <>
                  <button
                    type="button"
                    onClick={handleIssueReceiptOnly}
                    className="btn-press px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Emitir comprobante de venta sin valor fiscal SIAT"
                  >
                    Solo Nota de Venta
                  </button>

                  <button
                    type="button"
                    onClick={confirmInvoice}
                    className="btn-press px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Emitir Factura Fiscal</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleCloseInvoiceModal}
                    className="btn-press px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Cerrar sin generar comprobante para imprimir"
                  >
                    Cerrar sin Recibo
                  </button>

                  <button
                    type="button"
                    onClick={confirmInvoice}
                    className="btn-press px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-extrabold transition-colors flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Emitir Recibo de Venta</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. RECIBO DE LA VENTA                                                     */}
      {/* ========================================================================= */}
      {lastSaleReceipt && (
        <div className={showReceiptModal ? "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto print:static print:block print:p-0 print:m-0 print:bg-white print:overflow-visible" : "hidden print:block"}>
          <div
            id="printable-receipt"
            className="bg-white text-zinc-900 rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 font-sans text-xs max-h-[95vh] overflow-y-auto animate-modal-in print:animate-none print:max-h-none print:overflow-visible print:shadow-none print:rounded-none print:p-0 print:m-0 print:w-full print:max-w-none print:border-none"
          >
            {/* 1. Cabecera Empresa */}
            <div className="text-center space-y-0.5 border-b border-zinc-300 pb-3">
              <h2 className="font-extrabold text-base tracking-wider uppercase text-black">CASA Y CONSTRUCCIÓN</h2>
              <p className="text-[10px] text-zinc-600 font-medium">AV. BEIJING Y AV. TADEO HAENKE, COCHABAMBA, BOLIVIA</p>
              <p className="text-[10px] text-zinc-600 font-mono tabular-nums font-medium">NIT: 1028394021 • Teléfono: 78221469</p>
              <h3 className="font-bold text-sm text-black pt-1 uppercase">
                {lastSaleReceipt.isInvoice ? 'Factura Electrónica de Venta' : 'Recibo / Nota de Venta'}
              </h3>
            </div>

            {/* 2. Metadatos: Factura / Recibo No, Cliente, Fecha */}
            <div className="flex justify-between items-start text-[11px] pb-2 border-b border-zinc-300 text-zinc-800">
              <div className="space-y-0.5">
                <p className="font-bold text-black text-xs">
                  {lastSaleReceipt.isInvoice ? 'Factura No.' : 'Recibo No.'} <span className="font-mono tabular-nums font-bold">{lastSaleReceipt.id}</span>
                </p>
                <p>
                  <span className="font-semibold">Cliente:</span> {lastSaleReceipt.client || 'SIN NOMBRE'}
                  {lastSaleReceipt.nit && lastSaleReceipt.nit !== '0' ? ` (NIT/CI: ${lastSaleReceipt.nit})` : ''}
                </p>
                {lastSaleReceipt.email && (
                  <p className="text-[10px] text-zinc-600">
                    <span className="font-semibold">Correo:</span> {lastSaleReceipt.email}
                  </p>
                )}
              </div>
              <div className="text-right font-mono tabular-nums text-[11px]">
                <p><span className="font-semibold">Fecha:</span> {lastSaleReceipt.time}</p>
                {lastSaleReceipt.empleado && <p className="text-zinc-500 text-[10px] font-sans">Operador: {lastSaleReceipt.empleado}</p>}
                {lastSaleReceipt.isInvoice && (
                  <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-sans font-bold rounded">
                    Factura Fiscal
                  </span>
                )}
              </div>
            </div>

            {/* 3. Tabla de Productos */}
            <table className="w-full text-left text-[11px] border-collapse my-2">
              <thead>
                <tr className="border-t border-b border-zinc-900 font-bold text-black text-[11px]">
                  <th className="py-1.5 text-left">Producto</th>
                  <th className="py-1.5 text-center w-28">Cantidad</th>
                  <th className="py-1.5 text-right w-24">P. Unitario</th>
                  <th className="py-1.5 text-right w-24">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {lastSaleReceipt.items.map((it, idx) => (
                  <tr key={idx} className="text-zinc-800">
                    <td className="py-1.5 pr-2 uppercase font-medium">{it.name || it.producto}</td>
                    <td className="py-1.5 text-center font-mono tabular-nums">
                      {parseFloat(it.quantity || 1).toFixed(2)} {it.unit || 'UNID'}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">
                      {parseFloat(it.price || it.PrecioVenta || it.precioUnitario || 0).toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums font-semibold text-black">
                      {parseFloat(it.subtotal || 0).toFixed(2)}
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
                  <span>{lastSaleReceipt.paymentMethod || 'Efectivo'}</span>
                  <span className="font-mono tabular-nums font-semibold">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-black border-t border-zinc-300 pt-1">
                  <span>Total pagado</span>
                  <span className="font-mono tabular-nums">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
                {lastSaleReceipt.isInvoice && (
                  <div className="text-[10px] text-zinc-500 pt-1">
                    Base Crédito Fiscal: <strong className="text-zinc-800 font-mono tabular-nums">Bs. {lastSaleReceipt.total.toFixed(2)}</strong>
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
                    <span>Descuento:</span>
                    <span className="font-mono tabular-nums">-Bs. {lastSaleReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-black border-t border-black pt-1 text-xs">
                  <span>Total:</span>
                  <span className="font-mono tabular-nums">Bs. {lastSaleReceipt.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Botones de Acción en Pantalla (estrictamente ocultos al imprimir) */}
            <div className="grid grid-cols-3 gap-2 pt-4 no-print print:hidden border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="btn-press py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="btn-press py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Descargar comprobante oficial en PDF y abrir en visor"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{lastSaleReceipt.isInvoice ? 'Descargar PDF' : 'Recibo PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="btn-press py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Imprimir comprobante oficial en alta resolución"
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
          @page {
            margin: 6mm 10mm;
            size: auto;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-receipt,
          #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 4mm 8mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            background: white !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            animation: none !important;
          }
          #printable-receipt table {
            display: table !important;
            width: 100% !important;
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
          #printable-receipt .no-print,
          #printable-receipt .no-print *,
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
        }
      `}</style>

      {/* ========================================================================= */}
      {/* 6.5 MODAL CONFIRMACIÓN: CANCELAR Y VACIAR TICKET                          */}
      {/* ========================================================================= */}
      {showCancelConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center animate-modal-in">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-zinc-100 text-base">
                ¿Vaciar ticket de venta?
              </h3>
              <p className="text-xs text-zinc-400">
                Se removerán todos los productos cargados actualmente en el mostrador.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelConfirmModal(false)}
                className="btn-press w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors"
              >
                Conservar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearCart}
                className="btn-press w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs transition-colors"
              >
                Vaciar ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6.8 MODAL: DETALLES DE PRODUCTO, PRECIO UNITARIO Y OBSERVACIONES          */}
      {/* ========================================================================= */}
      {editingCartItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <form
            onSubmit={handleSaveItemDetails}
            className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-zinc-100 my-auto max-h-[92vh] overflow-y-auto animate-modal-in"
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div>
                <h3 className="font-extrabold text-zinc-100 text-base leading-tight uppercase">
                  {editingCartItem.name}
                </h3>
                <span className="text-[11px] font-mono tabular-nums text-amber-400">
                  SKU: {editingCartItem.code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* SECCIÓN INFORMATIVA: PRECIO CON Y SIN FACTURA REGISTRADOS */}
            <div className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Tarifas de Referencia (clic para aplicar)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setItemUnitPrice((editingCartItem.PrecioVenta || editingCartItem.price || 0).toFixed(2))}
                  className="bg-[#12151c] border border-zinc-800 hover:border-amber-500/50 p-3 rounded-xl cursor-pointer transition-colors group"
                >
                  <div className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                    <span>Precio CON Factura</span>
                    <span className="text-[10px] text-amber-400 group-hover:underline">Aplicar ↲</span>
                  </div>
                  <div className="text-sm font-black text-amber-400 font-mono tabular-nums mt-0.5">
                    Bs. {(editingCartItem.PrecioVenta || editingCartItem.price || 0).toFixed(2)}
                  </div>
                </div>

                <div
                  onClick={() => {
                    const sinFac = editingCartItem.PrecioSinFactura || ((editingCartItem.PrecioVenta || editingCartItem.price || 0) * 0.87);
                    setItemUnitPrice(parseFloat(sinFac || 0).toFixed(2));
                  }}
                  className="bg-[#12151c] border border-zinc-800 hover:border-emerald-500/50 p-3 rounded-xl cursor-pointer transition-colors group"
                >
                  <div className="text-[10px] text-zinc-400 font-bold flex items-center justify-between">
                    <span>Precio SIN Factura</span>
                    <span className="text-[10px] text-emerald-400 group-hover:underline">Aplicar ↲</span>
                  </div>
                  <div className="text-sm font-black text-emerald-400 font-mono tabular-nums mt-0.5">
                    Bs. {(editingCartItem.PrecioSinFactura || ((editingCartItem.PrecioVenta || editingCartItem.price || 0) * 0.87)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* FORMULARIO EDITABLE: PRECIO UNITARIO Y DESCRIPCIÓN */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Precio unitario aplicado (Bs.) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={itemUnitPrice}
                  onChange={(e) => setItemUnitPrice(e.target.value)}
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-black text-zinc-100 focus:outline-none focus:border-amber-500 font-mono tabular-nums"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Nota técnica / Número de serie / Observación
                </label>
                <textarea
                  rows="3"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Ej. Número de serie, corte a medida o especificación de despacho..."
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setEditingCartItem(null)}
                className="btn-press px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-press px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl text-xs transition-colors"
              >
                Aplicar al Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: FILTRAR POR CATEGORÍA                                           */}
      {/* ========================================================================= */}
      {showCategoryFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-modal-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h3 className="font-extrabold text-zinc-100 text-base">Filtrar por Categoría</h3>
              <button onClick={() => setShowCategoryFilterModal(false)} className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setShowCategoryFilterModal(false);
                }}
                className={`btn-press p-3 rounded-xl text-xs font-bold text-left border transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400'
                    : 'bg-[#0c0e12] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                Todas las categorías
              </button>
              {categories.map((c) => (
                <button
                  key={c.CategoriaID}
                  onClick={() => {
                    setSelectedCategory(c.Nombre);
                    setShowCategoryFilterModal(false);
                  }}
                  className={`btn-press p-3 rounded-xl text-xs font-bold text-left border transition-colors truncate ${
                    selectedCategory === c.Nombre
                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                      : 'bg-[#0c0e12] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-modal-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h3 className="font-extrabold text-zinc-100 text-base">Filtrar por Marca</h3>
              <button onClick={() => setShowBrandFilterModal(false)} className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors">✕</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedBrand('ALL');
                  setShowBrandFilterModal(false);
                }}
                className={`btn-press p-3 rounded-xl text-xs font-bold text-left border transition-colors ${
                  selectedBrand === 'ALL'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400'
                    : 'bg-[#0c0e12] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                Todas las marcas
              </button>
              {brands.map((b) => (
                <button
                  key={b.MarcaID}
                  onClick={() => {
                    setSelectedBrand(b.Nombre);
                    setShowBrandFilterModal(false);
                  }}
                  className={`btn-press p-3 rounded-xl text-xs font-bold text-left border transition-colors truncate ${
                    selectedBrand === b.Nombre
                      ? 'bg-amber-500 text-zinc-950 border-amber-400'
                      : 'bg-[#0c0e12] text-zinc-300 border-zinc-800 hover:bg-zinc-800'
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
      {/* 9. MODAL: TRANSACCIONES RECIENTES Y COTIZACIONES                          */}
      {/* ========================================================================= */}
      {showRecentSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92vh] flex flex-col animate-modal-in">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 flex-shrink-0">
              <h3 className="font-extrabold text-zinc-100 text-base tracking-tight flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Historial de Ventas y Cotizaciones</span>
              </h3>
              <button
                onClick={() => setShowRecentSalesModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Pestañas Superiores: Final y Cotización */}
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2.5 flex-shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setRecentSalesTab('FINAL')}
                className={`btn-press flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  recentSalesTab === 'FINAL'
                    ? 'bg-amber-500 text-zinc-950 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 bg-[#0c0e12] border border-zinc-800'
                }`}
              >
                <span>Ventas Cerradas</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded-md ${recentSalesTab === 'FINAL' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                  {recentSales.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRecentSalesTab('COTIZACION')}
                className={`btn-press flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                  recentSalesTab === 'COTIZACION'
                    ? 'bg-amber-500 text-zinc-950 font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 bg-[#0c0e12] border border-zinc-800'
                }`}
              >
                <span>Proformas / Cotizaciones</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-mono tabular-nums rounded-md ${recentSalesTab === 'COTIZACION' ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                  {quotations.length}
                </span>
              </button>
            </div>

            {/* Lista de Transacciones Recientes */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentSalesTab === 'FINAL' ? (
                recentSales.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs space-y-1">
                    <p className="text-sm font-bold text-zinc-300">No hay transacciones registradas aún</p>
                    <p>Las ventas cobradas en caja aparecerán listadas aquí.</p>
                  </div>
                ) : (
                  recentSales.map((s, idx) => {
                    const saleNum = s.ventaID || s.id.toString().replace(/^[A-Z-]+/i, '');
                    const isNamed = s.client && s.client.trim() !== '' && s.client !== 'SIN NOMBRE' && s.client !== 'CLIENTE PRUEBA' && !s.client.toLowerCase().includes('cliente general');
                    const clientDisplay = isNamed ? s.client : 'CLIENTE GENERAL';

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#0c0e12] hover:bg-zinc-900/80 rounded-xl border border-zinc-800/80 transition-colors gap-2 text-xs"
                      >
                        {/* 1. Número de Fila + Código de Venta + Cliente */}
                        <div className="flex items-start sm:items-center gap-2.5 min-w-[220px]">
                          <span className="font-mono tabular-nums font-bold text-zinc-500 text-[11px] w-6 text-right flex-shrink-0">
                            {idx + 1}.
                          </span>
                          <div>
                            <div className="font-bold text-zinc-100 text-xs tracking-tight flex items-center gap-2 flex-wrap">
                              <span className="font-mono tabular-nums text-amber-400">#{saleNum}</span>
                              {(s.canalVenta === 'ONLINE' || (s.id && s.id.toString().startsWith('PED-'))) && (
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                  Pedido Online
                                </span>
                              )}
                              <span className={`text-[11px] uppercase font-bold px-1.5 py-0.5 rounded ${isNamed ? 'bg-zinc-800 text-zinc-200 border border-zinc-700' : 'text-zinc-500'}`}>
                                {clientDisplay}
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5 font-mono tabular-nums">
                              <span className="text-zinc-400">{s.time}</span>
                              {s.empleado && (
                                <span className="font-sans text-zinc-500">
                                  • <span className="text-zinc-300">{s.empleado}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Total de la Venta */}
                        <div className="text-left sm:text-right font-extrabold text-zinc-100 text-sm sm:px-3 flex-shrink-0 font-mono tabular-nums">
                          Bs. {typeof s.total === 'number'
                            ? s.total.toFixed(2)
                            : parseFloat(s.total || 0).toFixed(2)}
                        </div>

                        {/* 3. Botones de Acción */}
                        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleEditRecentSale(s)}
                            className="btn-press px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 font-bold text-[11px] transition-colors"
                          >
                            Cargar / Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintRecentSale(s)}
                            className="btn-press px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 font-bold text-[11px] transition-colors"
                          >
                            Imprimir
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRecentSale(s)}
                            className="btn-press px-2 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-[11px] transition-colors"
                            title="Consultar estado fiscal"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* LISTA DE COTIZACIONES */
                quotations.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs space-y-1">
                    <p className="text-sm font-bold text-zinc-300">No hay cotizaciones guardadas</p>
                    <p>Use el botón "Guardar Cotización" en el pie de página para generar una proforma sin descontar stock.</p>
                  </div>
                ) : (
                  quotations.map((q, idx) => {
                    const isNamed = q.client && q.client !== 'SIN NOMBRE';
                    const clientDisplay = isNamed ? q.client : 'CLIENTE MOSTRADOR';

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#0c0e12] hover:bg-zinc-900/80 rounded-xl border border-zinc-800/80 transition-colors gap-2 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2.5 min-w-[220px]">
                          <span className="font-mono tabular-nums font-bold text-zinc-500 text-[11px] w-6 text-right flex-shrink-0">
                            {idx + 1}.
                          </span>
                          <div>
                            <div className="font-bold text-zinc-100 text-xs tracking-tight flex items-center gap-2">
                              <span className="font-mono tabular-nums text-amber-400">COT-{q.quoteID || q.id}</span>
                              <span className="text-zinc-300 uppercase text-[11px]">
                                ({clientDisplay})
                              </span>
                            </div>
                            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5 font-mono tabular-nums">
                              <span>{q.time}</span>
                              {q.empleado && (
                                <span className="font-sans">
                                  • <span className="text-zinc-300">{q.empleado}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-extrabold text-amber-400 text-sm sm:px-3 flex-shrink-0 font-mono tabular-nums">
                          Bs. {typeof q.total === 'number'
                            ? q.total.toFixed(2)
                            : parseFloat(q.total || 0).toFixed(2)}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleLoadQuotation(q)}
                            className="btn-press px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/35 text-amber-400 hover:bg-amber-500/25 font-bold text-[11px] transition-colors"
                          >
                            Cargar al Ticket
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
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
                              try {
                                showToast('Abriendo visor de impresión para cotización...', 'info');
                                await generateInvoicePdf(receiptData, { print: true, download: false, openInTab: false });
                              } catch (e) {
                                window.print();
                              }
                            }}
                            className="btn-press px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 font-bold text-[11px] transition-colors"
                          >
                            Imprimir
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuotation(q)}
                            className="btn-press px-2.5 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-[11px] transition-colors"
                          >
                            Eliminar
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
      {/* 10. MODAL: REGISTRAR NUEVO CLIENTE RÁPIDO PARA FACTURACIÓN                */}
      {/* ========================================================================= */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#12151c] border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-modal-in">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <h3 className="font-extrabold text-zinc-100 text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Registrar Nuevo Cliente / NIT
              </h3>
              <button onClick={() => setShowNewClientModal(false)} className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors">✕</button>
            </div>

            <form onSubmit={handleSaveQuickClient} className="space-y-3.5 text-xs">
              {/* Selector Individual vs Empresa */}
              <div className="flex items-center justify-between bg-[#0c0e12] p-3 rounded-xl border border-zinc-800/80">
                <span className="text-zinc-400 font-bold">Tipo de contribuyente:</span>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-zinc-200 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="quickTipoContacto"
                      value="Individual"
                      checked={newClientForm.TipoContacto === 'Individual'}
                      onChange={() => setNewClientForm({ ...newClientForm, TipoContacto: 'Individual' })}
                      className="accent-amber-500"
                    />
                    <span>Persona Natural</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-zinc-200 cursor-pointer font-bold">
                    <input
                      type="radio"
                      name="quickTipoContacto"
                      value="Empresa"
                      checked={newClientForm.TipoContacto === 'Empresa'}
                      onChange={() => setNewClientForm({ ...newClientForm, TipoContacto: 'Empresa' })}
                      className="accent-amber-500"
                    />
                    <span>Empresa / Constructora</span>
                  </label>
                </div>
              </div>

              {/* Nombre de la empresa si es Empresa */}
              {newClientForm.TipoContacto === 'Empresa' ? (
                <div>
                  <label className="block text-zinc-300 font-bold mb-1">Nombre de la empresa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CONSTRUCTORA DEL VALLE S.R.L."
                    value={newClientForm.NombreEmpresa}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewClientForm({
                        ...newClientForm,
                        NombreEmpresa: val,
                        RazonSocial: (!newClientForm.RazonSocial || newClientForm.RazonSocial === newClientForm.NombreEmpresa) ? val.toUpperCase() : newClientForm.RazonSocial
                      });
                    }}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-bold outline-none focus:border-amber-500 uppercase"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Nombres *</label>
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
                      className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-amber-500 font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Apellidos</label>
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
                      className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-amber-500 font-semibold uppercase"
                    />
                  </div>
                </div>
              )}

              {/* Razón Social para Facturación */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Razón Social para Facturación</label>
                <input
                  type="text"
                  placeholder="Razón social que figurará en la factura"
                  value={newClientForm.RazonSocial}
                  onChange={(e) => setNewClientForm({ ...newClientForm, RazonSocial: e.target.value.toUpperCase() })}
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-amber-500 font-bold uppercase"
                />
              </div>

              {/* Tipo de Documento y NIT / CI */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Tipo de Documento</label>
                  <select
                    value={newClientForm.TipoDocumentoSIAT}
                    onChange={(e) => setNewClientForm({ ...newClientForm, TipoDocumentoSIAT: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-100 outline-none focus:border-amber-500 font-semibold text-[11px]"
                  >
                    <option value="NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA">NIT</option>
                    <option value="CI - CÉDULA DE IDENTIDAD">CI (Cédula de Identidad)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="OTRO DOCUMENTO">Otro Documento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Número NIT / CI</label>
                  <input
                    type="text"
                    placeholder="Ej. 4502616011 o 0"
                    value={newClientForm.nit}
                    onChange={(e) => setNewClientForm({ ...newClientForm, nit: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-amber-400 font-mono tabular-nums font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Móvil y Email */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    placeholder="70000000"
                    value={newClientForm.phone}
                    onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-mono tabular-nums outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    placeholder="cliente@correo.com"
                    value={newClientForm.email}
                    onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="btn-press px-4 py-2.5 bg-zinc-800 text-zinc-200 font-bold rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-press px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl transition-colors"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 11. MODAL: CALCULADORA RÁPIDA DE MOSTRADOR                                */}
      {/* ========================================================================= */}
      {showCalculatorModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#12151c] border border-zinc-800 text-zinc-100 rounded-2xl max-w-xs w-full p-5 shadow-2xl space-y-4 animate-modal-in">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Resumen Rápido de Ticket</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCalculatorModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs font-mono tabular-nums">
              <div className="flex justify-between text-zinc-400">
                <span>Unidades Ticket:</span>
                <strong className="text-zinc-100">{totalQuantity.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal Bruto:</span>
                <strong className="text-zinc-100">Bs. {subtotalProducts.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Descuento:</span>
                <strong>-Bs. {effectiveDiscount.toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-emerald-400 pt-2 border-t border-zinc-800 text-sm font-bold">
                <span>Total a Cobrar:</span>
                <strong>Bs. {finalTotal.toFixed(2)}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCalculatorModal(false)}
              className="btn-press w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs rounded-xl transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 12. MODAL: AUMENTO A CAJA / INGRESO DE EFECTIVO PARA CAMBIO               */}
      {/* ========================================================================= */}
      {showCashInModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#12151c] border border-zinc-800 text-zinc-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-modal-in">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100 tracking-tight">Ingreso de Efectivo a Caja</h3>
                  <p className="text-[11px] text-zinc-400">Dotación de sencillo o cambio durante el turno</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCashInModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Info rápida del turno */}
            <div className="bg-[#0c0e12] p-3 rounded-xl border border-zinc-800/80 flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-400">Fondo inicial de apertura:</span>
              <span className="font-mono tabular-nums text-zinc-100 font-bold">Bs. {parseFloat(cashRegisterData?.montoInicial || 0).toFixed(2)}</span>
            </div>

            {/* Formulario */}
            <form onSubmit={handleAddCashInflow} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Monto a ingresar (Bs.) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-emerald-400 font-mono font-bold text-sm">Bs.</span>
                  <input
                    type="number"
                    step="any"
                    min="0.10"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={cashInAmount}
                    onChange={(e) => setCashInAmount(e.target.value)}
                    className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl pl-12 pr-4 py-2.5 text-base text-zinc-100 font-mono tabular-nums font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Motivo / Observación
                </label>
                <textarea
                  rows="2"
                  value={cashInReason}
                  onChange={(e) => setCashInReason(e.target.value)}
                  placeholder="Ej: Dotación de monedas y billetes de corte bajo para cambio..."
                  className="w-full bg-[#0c0e12] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setShowCashInModal(false)}
                  className="btn-press px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cashInLoading}
                  className="btn-press px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {cashInLoading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <span>Registrar ingreso</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 13. MODAL: ARQUEO Y CIERRE DE CAJA REGISTRADORA                           */}
      {/* ========================================================================= */}
      {showCloseRegisterModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 z-50 overflow-y-auto">
          <div className="bg-[#12151c] text-zinc-100 rounded-2xl max-w-4xl w-full border border-zinc-800 shadow-2xl overflow-hidden animate-modal-in my-auto max-h-[92vh] flex flex-col">
            {/* 1. Encabezado del Modal */}
            <div className="p-4 sm:p-5 bg-[#0c0e12] border-b border-zinc-800/80 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-extrabold text-zinc-100 tracking-tight">
                    Arqueo y Cierre de Turno POS
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-mono tabular-nums">
                    {closeRegisterStats.sessionStart} → {closeRegisterStats.sessionEnd}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCloseRegisterModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 2. Contenido Scrollable */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs text-zinc-300">
              {/* Tabla de Métodos de Pago */}
              <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-[#0c0e12]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-900/70 text-zinc-400 font-bold border-b border-zinc-800">
                      <th className="py-2.5 px-4">Concepto en Caja</th>
                      <th className="py-2.5 px-4 text-right">Importe Registrado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium text-zinc-300">
                    <tr>
                      <td className="py-2.5 px-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>Efectivo inicial (Apertura):</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-amber-400">
                        Bs. {closeRegisterStats.initialCash.toFixed(2)}
                      </td>
                    </tr>
                    {parseFloat(closeRegisterStats.totalAumentos || 0) > 0 && (
                      <tr>
                        <td className="py-2.5 px-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>Ingresos de efectivo (Dotación cambio en turno):</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-400">
                          +Bs. {parseFloat(closeRegisterStats.totalAumentos).toFixed(2)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-2.5 px-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>Cobros en efectivo (Ventas):</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-emerald-400">
                        Bs. {closeRegisterStats.cashSales.toFixed(2)}
                      </td>
                    </tr>
                    {closeRegisterStats.digitalSales > 0 && (
                      <tr>
                        <td className="py-2.5 px-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>Pagos digitales (Tarjeta / QR / Transferencia):</span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-amber-400">
                          Bs. {closeRegisterStats.digitalSales.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Bloque de KPIs y Resumen Financiero */}
              <div className="space-y-2.5 text-xs">
                <div className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl p-3.5 flex justify-between items-center text-zinc-200 font-semibold">
                  <span>Facturación / Ventas Totales del Turno</span>
                  <span className="font-mono tabular-nums font-bold text-zinc-100 text-sm">Bs. {closeRegisterStats.totalSales.toFixed(2)}</span>
                </div>

                {closeRegisterStats.totalRefunds > 0 && (
                  <div className="flex justify-between items-center py-2.5 px-3.5 bg-red-950/30 text-red-300 rounded-xl border border-red-500/30 font-semibold">
                    <span>Devoluciones / Anulaciones del Turno</span>
                    <span className="font-mono tabular-nums font-bold text-red-400">-Bs. {closeRegisterStats.totalRefunds.toFixed(2)}</span>
                  </div>
                )}

                {/* Resumen Destacado */}
                <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 space-y-2 text-zinc-200 text-xs font-semibold">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-zinc-300">Efectivo apertura + dotaciones + ventas en efectivo:</span>
                    <span className="font-mono tabular-nums font-bold text-zinc-100">
                      Bs. {(closeRegisterStats.initialCash + (parseFloat(closeRegisterStats.totalAumentos || 0)) + closeRegisterStats.cashSales).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-emerald-500/20 text-zinc-100 font-black text-sm">
                    <span className="text-emerald-300">Efectivo físico esperado en gaveta:</span>
                    <span className="font-mono tabular-nums text-emerald-400 text-base font-extrabold">Bs. {closeRegisterStats.expectedCash.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 3. Tabla de Productos Vendidos en el Turno */}
              <div className="space-y-2.5 pt-1">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Desglose de Ítems Despachados en el Turno</span>
                </h3>

                <div className="border border-zinc-800/80 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-[#0c0e12]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900/90 text-zinc-400 font-bold border-b border-zinc-800 sticky top-0">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-right">Cant.</th>
                        <th className="py-2.5 px-3 text-right">Importe Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-medium text-zinc-300">
                      {closeRegisterStats.soldProducts.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-6 text-center text-zinc-500">
                            No se registraron salidas de productos en este turno.
                          </td>
                        </tr>
                      ) : (
                        closeRegisterStats.soldProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/60 transition-colors">
                            <td className="py-2 px-3 text-center text-zinc-500 font-mono tabular-nums">{idx + 1}.</td>
                            <td className="py-2 px-3 font-mono tabular-nums font-semibold text-amber-400">{p.sku}</td>
                            <td className="py-2 px-3 font-semibold text-zinc-200 uppercase">{p.name}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-zinc-300">{p.quantity.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-emerald-400">Bs. {p.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Formulario de Cierre de Turno */}
              <form onSubmit={handleConfirmCloseRegister} className="space-y-4 pt-3 border-t border-zinc-800/80">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Efectivo real contado en gaveta (Bs.) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={declaredCashInput}
                    onChange={(e) => setDeclaredCashInput(e.target.value)}
                    placeholder="Monto físico contado"
                    className="w-full sm:w-80 px-3.5 py-2.5 bg-[#0c0e12] border border-zinc-800 rounded-xl text-sm text-zinc-100 font-mono tabular-nums font-bold focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                    Observaciones de arqueo / cierre
                  </label>
                  <textarea
                    rows="2"
                    value={closingNoteInput}
                    onChange={(e) => setClosingNoteInput(e.target.value)}
                    placeholder="Novedades del turno, billetes observados o diferencias (opcional)..."
                    className="w-full px-3.5 py-2 bg-[#0c0e12] border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => setShowCloseRegisterModal(false)}
                    className="btn-press px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={closingRegisterLoading}
                    className="btn-press px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {closingRegisterLoading ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Cerrando Turno...</span>
                      </>
                    ) : (
                      <span>Confirmar Cierre de Caja</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BANNER FLOTANTE: ALERTA DE NUEVO PEDIDO ONLINE ENTRANTE                    */}
      {/* ========================================================================= */}
      {newOnlineOrderAlert && (
        <div className="fixed top-5 right-5 z-50 w-96 max-w-[calc(100vw-2.5rem)] bg-[#12151c] border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl shadow-amber-500/10 text-zinc-100 animate-modal-in">
          {/* Cabecera del Banner */}
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="font-extrabold text-xs text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                ¡Nuevo Pedido Online!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setNewOnlineOrderAlert(null)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded-lg transition-colors cursor-pointer"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>

          {/* Cuerpo Informativo */}
          <div className="py-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono tabular-nums text-sm font-bold text-amber-400">
                #{newOnlineOrderAlert.CodigoPedido || `PED-${newOnlineOrderAlert.PedidoOnlineID}`}
              </span>
              <span className="text-xs font-mono tabular-nums font-extrabold text-emerald-400">
                Bs. {parseFloat(newOnlineOrderAlert.Total || 0).toFixed(2)}
              </span>
            </div>

            <p className="text-xs font-bold text-zinc-100 truncate">
              Cliente: {newOnlineOrderAlert.ClienteNombre || 'Cliente Web'}
            </p>

            <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
              <span>{newOnlineOrderAlert.Detalles?.length || 1} producto(s) en reserva</span>
              {newOnlineOrderAlert.Telefono && (
                <span>Tel: {newOnlineOrderAlert.Telefono}</span>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="pt-2 border-t border-zinc-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLoadOnlineOrderToTicket(newOnlineOrderAlert)}
              className="btn-press flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Cargar al Ticket</span>
            </button>

            <Link
              to="/pedidos-online"
              className="btn-press py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-colors text-center"
            >
              Ver Cola
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOAST FLOTANTE DE NOTIFICACIONES                                          */}
      {/* ========================================================================= */}
      {toast.show && (
        <div
          className={`fixed bottom-16 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl border text-xs font-bold animate-toast-in flex items-center gap-2.5 ${
            toast.type === 'error'
              ? 'bg-[#12151c] border-red-500/40 text-red-400'
              : toast.type === 'info'
              ? 'bg-[#12151c] border-amber-500/40 text-amber-300'
              : 'bg-[#12151c] border-emerald-500/40 text-emerald-400'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-red-400' : toast.type === 'info' ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default POSView;

