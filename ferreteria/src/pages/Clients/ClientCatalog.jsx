import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, getCategories, getBrands } from '../../services/api';

function ClientCatalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('default');

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
        const [prodsData, catsData, brandsData] = await Promise.all([
          getProducts(),
          getCategories(),
          getBrands()
        ]);
        setProducts(prodsData || []);
        setCategories(catsData || []);
        setBrands(brandsData || []);
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

  const setItemQuantity = (productId, qty) => {
    const validQty = Math.max(1, parseInt(qty) || 1);
    setQuantities(prev => ({ ...prev, [productId]: validQty }));
  };

  // Agregar producto al carrito
  const addToCart = (product, customQty = null) => {
    const qtyToAdd = customQty !== null ? customQty : getItemQuantity(product.ProductoID);
    const availableStock = product.Stock || 0;

    if (availableStock <= 0) {
      alert("Este producto se encuentra actualmente agotado.");
      return;
    }

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.product.ProductoID === product.ProductoID);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newTotal = updated[existingIndex].quantity + qtyToAdd;
        updated[existingIndex].quantity = newTotal;
        return updated;
      } else {
        return [...prevCart, { product, quantity: qtyToAdd }];
      }
    });

    playCartSound();
    setToastMessage(`¡${product.Nombre} (${qtyToAdd} unid) añadido al carrito!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Modificar cantidad dentro del carrito
  const updateCartQuantity = (productId, delta) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.product.ProductoID === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean);
    });
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

  // Cálculo de totales del carrito
  const cartTotalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalPrice = cart.reduce((acc, item) => {
    const price = parseFloat(item.product.PrecioVenta || 0);
    return acc + price * item.quantity;
  }, 0);

  // Enviar pedido por WhatsApp
  const handleWhatsAppCheckout = () => {
    if (cart.length === 0) return;
    let message = `🛒 *HOLA C&C FERRETERÍA, DESEO REALIZAR UN PEDIDO:*\n\n`;
    cart.forEach((item, index) => {
      const subtotal = (parseFloat(item.product.PrecioVenta || 0) * item.quantity).toFixed(2);
      message += `${index + 1}. *${item.product.Nombre}*\n   Cantidad: ${item.quantity} ${item.product.Unidad?.Nombre || 'pza(s)'} x Bs. ${parseFloat(item.product.PrecioVenta).toFixed(2)} = *Bs. ${subtotal}*\n`;
    });
    message += `\n💰 *TOTAL DEL PEDIDO: Bs. ${cartTotalPrice.toFixed(2)}*\n`;
    message += `\n📍 *Por favor confírmenme la disponibilidad y forma de entrega/pago.*`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/59170700000?text=${encoded}`, '_blank');
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      
      {/* 1. BARRA SUPERIOR / HEADER PRINCIPAL */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 shadow-xl">
        {/* Franja superior de anuncio */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white text-[11px] font-bold py-1.5 px-4 text-center tracking-wide flex justify-center items-center gap-2">
          <span>⚡ ¡Precios especiales y cotizaciones inmediatas para obras y construcción!</span>
          <span className="hidden md:inline bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Cochabamba - Bolivia</span>
        </div>

        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Marca */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
                C
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                  C&C Ferretería
                </span>
                <span className="text-[10px] text-cyan-400 font-bold block -mt-1 tracking-wider uppercase">
                  Casa y Construcción
                </span>
              </div>
            </Link>

            {/* Botón Carrito en Mobile */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="md:hidden relative p-2 bg-slate-800 text-cyan-400 rounded-xl border border-slate-700 flex items-center gap-1.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cartTotalItems > 0 && (
                <span className="bg-cyan-500 text-slate-950 font-black text-xs px-1.5 py-0.5 rounded-full">
                  {cartTotalItems}
                </span>
              )}
            </button>
          </div>

          {/* Barra de Búsqueda Central con Selector de Categoría integrado */}
          <div className="w-full md:max-w-2xl flex items-center bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner focus-within:border-cyan-500 transition-colors">
            {/* Dropdown de Categoría integrado */}
            <div className="hidden sm:block border-r border-slate-800 bg-slate-900/60">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-slate-300 text-xs font-bold px-3.5 py-2.5 outline-none cursor-pointer hover:text-white"
              >
                <option value="ALL" className="bg-slate-900 text-white">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat.CategoriaID} value={cat.CategoriaID} className="bg-slate-900 text-white">
                    {cat.Nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Input de Búsqueda */}
            <input
              type="text"
              placeholder="Buscar productos, marcas, herramientas, códigos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
            />

            {/* Botón Buscar / Lupa */}
            <button className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Acciones del Menú Superior: WhatsApp, Login y Carrito */}
          <div className="hidden md:flex items-center gap-3">
            {/* Contacto WhatsApp */}
            <a
              href="https://wa.me/59170700000?text=Hola%20C%26C%20Ferreter%C3%ADa,%20quisiera%20consultar%20sobre%20sus%20productos."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z"/>
              </svg>
              <span>WhatsApp</span>
            </a>

            {/* Iniciar Sesión / Registrarse o Perfil de Usuario Logueado */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/30 rounded-xl transition-all shadow-sm active:scale-95"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                    {currentUser.Nombre ? currentUser.Nombre.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-white max-w-[130px] truncate leading-none">
                      {currentUser.Nombre || currentUser.Correo}
                    </p>
                    <span className="text-[10px] text-cyan-400 font-semibold leading-none">
                      {currentUser.Rol || 'Cliente'}
                    </span>
                  </div>
                  <svg className="w-3.5 h-3.5 text-slate-400 ml-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown flotante del usuario */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in space-y-2">
                    <div className="px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      <p className="text-xs font-bold text-white truncate">{currentUser.Nombre || "Usuario"}</p>
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.Correo}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-[9px] font-extrabold text-cyan-400 uppercase">
                        {currentUser.Rol || "Cliente"}
                      </span>
                    </div>

                    {/* Si es Administrador, acceso directo al Dashboard */}
                    {currentUser.Rol === 'Administrador' && (
                      <Link
                        to="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-300 hover:text-cyan-400 hover:bg-slate-800/60 rounded-xl transition-colors"
                      >
                        <span>⚙️</span>
                        <span>Panel de Administración</span>
                      </Link>
                    )}

                    <div className="pt-1 border-t border-slate-800/80">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                      >
                        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 hover:border-cyan-500/40 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Iniciar Sesión / Registrarse</span>
              </Link>
            )}

            {/* Botón Carrito de Compras */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 text-xs transition-all"
            >
              <div className="relative">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {cartTotalItems > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-rose-500 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                    {cartTotalItems}
                  </span>
                )}
              </div>
              <span>Carro ({cartTotalItems})</span>
              <span className="bg-slate-950/40 px-2 py-0.5 rounded-lg text-[11px] font-mono text-cyan-200">
                Bs. {cartTotalPrice.toFixed(2)}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO BANNER PROMOCIONAL (Inspirado en la imagen) */}
      <div className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 border border-slate-800 shadow-2xl p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Fondo abstracto con resplandor */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Contenido textual del banner */}
          <div className="relative z-10 max-w-xl space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-extrabold tracking-wide uppercase">
              <span>🛠️ Catálogo Oficial para Clientes</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              C&C <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">CASA Y CONSTRUCCIÓN</span>
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Explora nuestro catálogo en línea con existencias en tiempo real, precios de ferretería con factura y haz tus pedidos al instante.
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-emerald-400">✓</span> Stock Inmediato
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-emerald-400">✓</span> Facturación 13% IVA
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-emerald-400">✓</span> Despacho Directo
              </div>
            </div>
          </div>

          {/* Ilustración / Emblema visual */}
          <div className="relative z-10 flex-shrink-0 flex items-center justify-center">
            <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center shadow-2xl group hover:border-cyan-400/50 transition-all">
              <div className="text-5xl sm:text-6xl mb-3 group-hover:scale-110 transition-transform">🏗️</div>
              <div className="text-lg font-black text-white uppercase tracking-wider">C&C Catálogo</div>
              <div className="text-xs text-cyan-400 font-bold mt-1">Venta al Mayor y Detalle</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FILTROS, PÍLDORAS Y ORDENAMIENTO */}
      <main className="max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        
        {/* Píldoras de Categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 scale-105'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todas ({products.length})
          </button>
          {categories.map(cat => {
            const count = products.filter(p => p.CategoriaID === cat.CategoriaID).length;
            return (
              <button
                key={cat.CategoriaID}
                onClick={() => setSelectedCategory(cat.CategoriaID.toString())}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.CategoriaID.toString()
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 scale-105'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat.Nombre} ({count})
              </button>
            );
          })}
        </div>

        {/* Barra de Controles y Ordenamiento */}
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-xs text-slate-400 font-semibold">
            Mostrando <span className="font-extrabold text-white">{sortedProducts.length}</span> productos encontrados
            {selectedCategory !== 'ALL' && ` en ${categories.find(c => c.CategoriaID.toString() === selectedCategory)?.Nombre}`}
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {/* Filtro por Marca */}
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-400 font-bold">Marca:</label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer focus:border-cyan-500"
              >
                <option value="ALL">Todas las marcas</option>
                {brands.map(b => (
                  <option key={b.MarcaID} value={b.MarcaID}>{b.Nombre}</option>
                ))}
              </select>
            </div>

            {/* Ordenamiento */}
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-400 font-bold">Ordenar por:</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold outline-none cursor-pointer focus:border-cyan-500"
              >
                <option value="default">Ordenación predeterminada</option>
                <option value="price_asc">Precio: Menor a Mayor</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
                <option value="name_asc">Nombre: A - Z</option>
                <option value="name_desc">Nombre: Z - A</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. GRID DE TARJETAS DE PRODUCTOS */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-xs font-semibold">Cargando catálogo de productos...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6">
            {error}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-20 text-center space-y-4 bg-slate-900/30 border border-slate-800 rounded-3xl p-10">
            <div className="text-5xl">🔍</div>
            <h3 className="text-lg font-bold text-white">No se encontraron productos</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No hay productos que coincidan con los filtros seleccionados o el término de búsqueda "{searchQuery}".
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedBrand('ALL'); }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {sortedProducts.map((p) => {
              const stock = p.Stock || 0;
              const isAvailable = stock > 0;
              const priceVenta = parseFloat(p.PrecioVenta || 0);
              const priceSinFactura = parseFloat(p.PrecioSinFactura || 0);
              const currentQty = getItemQuantity(p.ProductoID);

              return (
                <div
                  key={p.ProductoID}
                  className="bg-slate-900/60 border border-slate-800/90 hover:border-cyan-500/40 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col group"
                >
                  {/* Contenedor de Imagen con Overlay y Botón QuickView */}
                  <div className="relative aspect-square bg-slate-950 overflow-hidden flex items-center justify-center p-4">
                    {p.Imagen ? (
                      <img
                        src={p.Imagen}
                        alt={p.Nombre}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-slate-900/40 rounded-xl">
                        <svg className="w-12 h-12 opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] text-slate-500 mt-2">Sin imagen</span>
                      </div>
                    )}

                    {/* Badge de Marca */}
                    {p.Marca && (
                      <span className="absolute top-3 left-3 px-2 py-0.5 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-cyan-400 font-extrabold text-[10px] rounded-lg">
                        {p.Marca.Nombre}
                      </span>
                    )}

                    {/* Badge de Stock */}
                    <span
                      className={`absolute top-3 right-3 px-2 py-0.5 rounded-lg text-[10px] font-extrabold backdrop-blur-md ${
                        isAvailable
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isAvailable ? `${stock} ${p.Unidad?.Nombre || 'disp.'}` : 'Agotado'}
                    </span>

                    {/* Botón Flotante de Vista Rápida */}
                    <button
                      onClick={() => setQuickViewProduct(p)}
                      className="absolute inset-x-4 bottom-3 py-2 bg-slate-900/90 hover:bg-cyan-600 text-white font-bold text-xs rounded-xl backdrop-blur-md border border-slate-700 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5 shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Vista Rápida</span>
                    </button>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      {p.Categoria && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                          {p.Categoria.Nombre}
                        </span>
                      )}
                      <h3
                        onClick={() => setQuickViewProduct(p)}
                        className="text-sm font-bold text-white line-clamp-2 hover:text-cyan-400 cursor-pointer transition-colors mt-0.5 leading-snug"
                        title={p.Nombre}
                      >
                        {p.Nombre}
                      </h3>
                    </div>

                    {/* Precios */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-slate-400 font-semibold">Con Factura:</span>
                        <span className="text-base font-black text-emerald-400">
                          Bs. {priceVenta.toFixed(2)}
                        </span>
                      </div>
                      {priceSinFactura > 0 && (
                        <div className="flex items-baseline justify-between text-[10px] text-slate-400 mt-0.5">
                          <span>Sin Factura:</span>
                          <span className="font-semibold text-slate-300">Bs. {priceSinFactura.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Controles de Cantidad y Botón de Añadir */}
                    <div className="pt-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {/* Stepper de cantidad */}
                        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden w-28">
                          <button
                            onClick={() => setItemQuantity(p.ProductoID, currentQty - 1)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={stock}
                            value={currentQty}
                            onChange={(e) => setItemQuantity(p.ProductoID, e.target.value)}
                            className="w-full text-center bg-transparent text-xs text-white font-bold outline-none"
                          />
                          <button
                            onClick={() => setItemQuantity(p.ProductoID, currentQty + 1)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* Botón Añadir */}
                        <button
                          disabled={!isAvailable}
                          onClick={() => addToCart(p)}
                          className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
                            isAvailable
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20 active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Añadir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 5. DRAWER / PANEL LATERAL DEL CARRITO DE COMPRAS */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Fondo desenfocado */}
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
          ></div>

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
              
              {/* Header del Carrito */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                    🛒
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Carrito de Compras</h3>
                    <p className="text-xs text-slate-400">{cartTotalItems} productos seleccionados</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Lista de Productos en el Carrito */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <div className="text-4xl">🛒</div>
                    <p className="text-sm font-bold text-slate-300">Tu carrito está vacío</p>
                    <p className="text-xs text-slate-500">Agrega productos del catálogo para armar tu pedido.</p>
                  </div>
                ) : (
                  cart.map(({ product, quantity }) => {
                    const itemPrice = parseFloat(product.PrecioVenta || 0);
                    const subtotal = itemPrice * quantity;

                    return (
                      <div
                        key={product.ProductoID}
                        className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex gap-3.5 items-center"
                      >
                        {/* Miniatura */}
                        {product.Imagen ? (
                          <img
                            src={product.Imagen}
                            alt={product.Nombre}
                            className="w-14 h-14 object-cover rounded-xl border border-slate-800 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                            📦
                          </div>
                        )}

                        {/* Detalles */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate" title={product.Nombre}>
                            {product.Nombre}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Bs. {itemPrice.toFixed(2)} c/u
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            {/* Control de cantidad */}
                            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                              <button
                                onClick={() => updateCartQuantity(product.ProductoID, -1)}
                                className="px-2 py-0.5 text-xs text-slate-400 hover:text-white font-bold"
                              >
                                -
                              </button>
                              <span className="px-2 text-xs font-bold text-white">{quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(product.ProductoID, 1)}
                                className="px-2 py-0.5 text-xs text-slate-400 hover:text-white font-bold"
                              >
                                +
                              </button>
                            </div>

                            {/* Subtotal del ítem */}
                            <span className="text-xs font-black text-emerald-400">
                              Bs. {subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Botón Eliminar */}
                        <button
                          onClick={() => removeFromCart(product.ProductoID)}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                <div className="p-6 bg-slate-950 border-t border-slate-800 space-y-4">
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="font-semibold text-white">Bs. {cartTotalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Impuestos (13% IVA)</span>
                      <span className="font-semibold text-emerald-400">Incluido</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-black">
                      <span className="text-white">Total a Pagar</span>
                      <span className="text-cyan-400">Bs. {cartTotalPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Botón WhatsApp Checkout */}
                  <button
                    onClick={handleWhatsAppCheckout}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z"/>
                    </svg>
                    <span>Enviar Pedido por WhatsApp</span>
                  </button>

                  {/* Vaciar Carrito */}
                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-slate-500 hover:text-rose-400 font-semibold text-[11px] transition-colors"
                  >
                    Vaciar Carrito
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE VISTA RÁPIDA (QUICK VIEW) */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Imagen Grande */}
              <div className="aspect-square bg-slate-950 rounded-2xl border border-slate-800 p-4 flex items-center justify-center overflow-hidden">
                {quickViewProduct.Imagen ? (
                  <img
                    src={quickViewProduct.Imagen}
                    alt={quickViewProduct.Nombre}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-5xl">📦</span>
                )}
              </div>

              {/* Información */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {quickViewProduct.Marca && (
                    <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-extrabold">
                      {quickViewProduct.Marca.Nombre}
                    </span>
                  )}
                  {quickViewProduct.Categoria && (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold">
                      {quickViewProduct.Categoria.Nombre}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-white leading-snug">
                  {quickViewProduct.Nombre}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3">
                  {quickViewProduct.Descripcion || "Producto de alta calidad para construcción y ferretería en general."}
                </p>

                <div className="py-2 border-y border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Precio con Factura:</div>
                  <div className="text-2xl font-black text-emerald-400">
                    Bs. {parseFloat(quickViewProduct.PrecioVenta || 0).toFixed(2)}
                  </div>
                  {quickViewProduct.PrecioSinFactura > 0 && (
                    <div className="text-xs text-slate-400">
                      Precio Sin Factura: <span className="text-slate-200 font-bold">Bs. {parseFloat(quickViewProduct.PrecioSinFactura).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Stock disponible:</span>
                  <span className="font-extrabold text-white">
                    {quickViewProduct.Stock || 0} {quickViewProduct.Unidad?.Nombre || 'unid'}
                  </span>
                </div>

                {/* Botón Añadir desde QuickView */}
                <button
                  disabled={(quickViewProduct.Stock || 0) <= 0}
                  onClick={() => {
                    addToCart(quickViewProduct, 1);
                    setQuickViewProduct(null);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Añadir al Carrito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TOAST FLOTANTE DE CONFIRMACIÓN */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-slate-900/90 border border-emerald-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3 backdrop-blur-md animate-slide-in">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carrito Actualizado</h4>
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

      {/* 8. FOOTER DEL PORTAL CLIENTE */}
      <footer className="bg-slate-900 border-t border-slate-800/80 py-8 mt-12 text-xs text-slate-500">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">C&C Ferretería</span>
            <span>— Casa y Construcción © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6 text-slate-400 text-[11px]">
            <span>📍 Cochabamba, Bolivia</span>
            <span>⚡ Envíos a todo el país</span>
            <span>🛡️ Compra 100% Segura</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ClientCatalog;
