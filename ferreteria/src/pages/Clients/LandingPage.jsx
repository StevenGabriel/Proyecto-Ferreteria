import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, getCategories, getBrands } from '../../services/api';
import { LOYALTY_TIERS } from '../../constants/loyalty';
import ChatbotWidget from '../../components/chatbot/ChatbotWidget';

function LandingPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [quickSearch, setQuickSearch] = useState('');

  // Simulador interactivo de presupuesto y descuento para contratistas/clientes
  const [estimateAmount, setEstimateAmount] = useState(3500);
  const [selectedTierKey, setSelectedTierKey] = useState('Oro');

  // Sesión de usuario activa
  const [currentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cyc_user_session') || localStorage.getItem('cyc_client_session');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  // Carrito guardado para mostrar indicador en la barra superior
  const [cartCount] = useState(() => {
    try {
      const saved = localStorage.getItem('cyc_client_cart');
      if (!saved) return 0;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    let mounted = true;
    const fetchSummary = async () => {
      try {
        setLoadingStats(true);
        const [prodsRes, catsRes, brandsRes] = await Promise.allSettled([
          getProducts(),
          getCategories(),
          getBrands()
        ]);
        if (!mounted) return;
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
        console.error('Error cargando resumen de ferretería:', err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };
    fetchSummary();
    return () => {
      mounted = false;
    };
  }, []);

  // Estado del mostrador según hora de Bolivia (Lun-Vie 08:00-18:30, Sáb 08:00-14:00)
  const getStoreStatus = () => {
    const now = new Date();
    const day = now.getDay(); // 0 Dom, 1-5 Lun-Vie, 6 Sáb
    const minutes = now.getHours() * 60 + now.getMinutes();

    if (day >= 1 && day <= 5 && minutes >= 8 * 60 && minutes <= 18 * 60 + 30) {
      return { open: true, label: 'Mostrador abierto ahora · Cierra 18:30' };
    }
    if (day === 6 && minutes >= 8 * 60 && minutes <= 14 * 60) {
      return { open: true, label: 'Mostrador abierto ahora · Cierra 14:00' };
    }
    return { open: false, label: 'Reservas online activas 24h · Abre 08:00' };
  };

  const storeStatus = getStoreStatus();

  const handleQuickSearchSubmit = (e) => {
    e.preventDefault();
    const trimmed = quickSearch.trim();
    if (trimmed) {
      navigate(`/catalogo?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/catalogo');
    }
  };

  const totalStockUnits = products.reduce((acc, p) => acc + Math.max(0, Number(p.Stock) || 0), 0);
  const featuredProducts = products
    .filter((p) => Number(p.Stock) > 0)
    .slice(0, 4);

  const displayTierKeys = ['Bronce', 'Plata', 'Oro', 'Diamante'];
  const activeTier = LOYALTY_TIERS[selectedTierKey] || LOYALTY_TIERS.Oro || {
    name: 'Oro',
    badge: 'Oro',
    discount: 6
  };
  const savedBolivianos = (estimateAmount * (Number(activeTier.discount) || 0)) / 100;
  const finalBolivianos = estimateAmount - savedBolivianos;

  // Rubros fundacionales basados en el documento del proyecto de grado
  const specialtyLines = [
    {
      title: 'Instalaciones Sanitarias y Pluviales',
      spec: 'Tuberías PVC/PPR, accesorios de presión, llaves de paso, bombas de agua, tanques y drenaje pluvial.',
      query: 'tubo',
      bgImage: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Obra Gruesa y Materiales de Construcción',
      spec: 'Cemento, aditivos estructurales, impermeabilizantes, alambre de amarre, clavos y áridos embolsados.',
      query: 'cemento',
      bgImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Herramientas Eléctricas y Manuales',
      spec: 'Taladros percutores, amoladoras, sierras, discos de corte diamantados, llaves y medición láser.',
      query: 'taladro',
      bgImage: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Instalaciones Eléctricas e Iluminación',
      spec: 'Conductores de cobre, térmicos disyuntores, cajas de distribución, cintas aislantes y paneles LED.',
      query: 'cable',
      bgImage: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Pinturas, Selladores y Acabados (Control FEFO)',
      spec: 'Pinturas látex y anticorrosivas, siliconas estructurales, pegamentos PVC y resinas con lote vigente garantizado.',
      query: 'pintura',
      bgImage: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80'
    },
    {
      title: 'Fijaciones, Tornillería y Cerrajería',
      spec: 'Pernos de expansión, tornillos para drywall y madera, chapas de seguridad, bisagras y anclajes químicos.',
      query: 'tornillo',
      bgImage: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=900&q=80'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0c0e12] text-zinc-100 font-sans flex flex-col selection:bg-amber-500/30 selection:text-amber-100">
      {/* 1. BARRA DE NAVEGACIÓN INSTITUCIONAL */}
      <header className="bg-[#0c0e12]/95 border-b border-zinc-800/90 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* Identidad C&C */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-zinc-950 font-extrabold text-lg tracking-tighter transition-transform duration-160 ease-out-expo group-hover:scale-[1.03] group-active:scale-[0.97]">
              C&C
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-zinc-100 group-hover:text-amber-400 transition-colors duration-160 ease-out-expo block leading-tight">
                C&C Ferretería
              </span>
              <span className="text-[11px] text-zinc-400 font-medium block leading-tight">
                Casa y Construcción · Cochabamba
              </span>
            </div>
          </Link>

          {/* Enlaces de navegación interna */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-zinc-300">
            <a href="#historia" className="hover:text-amber-400 transition-colors duration-150">
              Nuestra Historia
            </a>
            <a href="#especialidades" className="hover:text-amber-400 transition-colors duration-150">
              Rubros y Materiales
            </a>
            <a href="#operacion-digital" className="hover:text-amber-400 transition-colors duration-150">
              Ventajas del Sistema
            </a>
            <a href="#ubicacion" className="hover:text-amber-400 transition-colors duration-150">
              Ubicación y Contacto
            </a>
          </nav>

          {/* Acciones directas */}
          <div className="flex items-center gap-2.5">
            {currentUser ? (
              <Link
                to={
                  ['administrador', 'admin', 'vendedor', 'cajero', 'operador', 'empleado'].includes(
                    (currentUser.Rol || '').toLowerCase()
                  )
                    ? '/dashboard'
                    : '/catalogo'
                }
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-[#12151c] hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold btn-press"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{currentUser.Nombre || 'Mi Cuenta'}</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 bg-[#12151c] hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-xl text-xs font-semibold btn-press"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Ingresar</span>
              </Link>
            )}

            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs btn-press"
            >
              <span>Ver Catálogo de Productos</span>
              {cartCount > 0 && (
                <span className="bg-zinc-950/20 px-1.5 py-0.5 rounded font-mono text-[11px] font-bold tabular-nums">
                  {cartCount}
                </span>
              )}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. PORTADA PRINCIPAL (HERO ARQUITECTÓNICO CON FONDO DE HERRAMIENTAS) */}
      <section className="relative border-b border-zinc-800/80 bg-[#0c0e12] overflow-hidden">
        {/* Imagen de fondo de taller / herramientas ferreteras con mayor visibilidad */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-75 pointer-events-none"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&w=1920&q=80')"
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(12,14,18,0.84) 0%, rgba(12,14,18,0.52) 55%, rgba(12,14,18,0.74) 100%)'
          }}
        />

        <div
          className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start"
        >
          {/* Columna Izquierda: Propuesta de Valor e Identidad */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#12151c] border border-zinc-800 text-xs text-zinc-300">
              <span className={`w-2 h-2 rounded-full ${storeStatus.open ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className="font-mono tabular-nums">{storeStatus.label}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">Zona Sarco, Av. Beijing</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-zinc-100 tracking-tight leading-[1.1]">
              Ferretería creada por ingenieros y arquitectos para abastecer tu obra en un solo lugar.
            </h1>

            <p className="text-zinc-300 text-base sm:text-lg leading-relaxed max-w-[64ch]">
              En <strong>C&amp;C Ferretería — Casa y Construcción</strong> llevamos más de <strong className="font-mono tabular-nums text-amber-400">10 años</strong> proveyendo instalaciones sanitarias, pluviales, material eléctrico, herramientas y suministros de construcción en Cochabamba con precios competitivos y stock sincronizado en tiempo real.
            </p>

            {/* Buscador directo conectado al catálogo */}
            <form onSubmit={handleQuickSearchSubmit} className="max-w-xl pt-1">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="flex-1 flex items-center bg-[#12151c] border border-zinc-800 rounded-xl px-4 py-3 focus-within:border-amber-500/80 transition-colors duration-150">
                  <svg className="w-4 h-4 text-zinc-500 mr-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    placeholder="Buscar cemento, tubería PVC, taladro, cable, pintura..."
                    className="w-full bg-transparent text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl btn-press shrink-0 flex items-center justify-center gap-2"
                >
                  <span>Explorar Catálogo</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </form>

            {/* Cifras operativas reales en vivo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              <div className="bg-[#12151c] border border-zinc-800/90 rounded-xl p-4">
                <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums block">
                  +10 años
                </span>
                <span className="text-xs text-zinc-400 mt-1 block">
                  Trayectoria en Cochabamba
                </span>
              </div>

              <div className="bg-[#12151c] border border-zinc-800/90 rounded-xl p-4">
                <span className="text-2xl font-mono font-bold text-zinc-100 tabular-nums block">
                  {loadingStats ? '...' : products.length}
                </span>
                <span className="text-xs text-zinc-400 mt-1 block">
                  Productos en línea hoy
                </span>
              </div>

              <div className="bg-[#12151c] border border-zinc-800/90 rounded-xl p-4">
                <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums block">
                  {loadingStats ? '...' : totalStockUnits.toLocaleString('es-BO')}
                </span>
                <span className="text-xs text-zinc-400 mt-1 block">
                  Unidades disponibles
                </span>
              </div>

              <div className="bg-[#12151c] border border-zinc-800/90 rounded-xl p-4">
                <span className="text-2xl font-mono font-bold text-zinc-100 tabular-nums block">
                  {loadingStats ? '...' : brands.length || 12}
                </span>
                <span className="text-xs text-zinc-400 mt-1 block">
                  Marcas industriales
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Ficha Institucional y Vista Previa del Almacén en Tiempo Real */}
          <div className="lg:col-span-5 bg-[#12151c] border border-zinc-800 rounded-2xl p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">
                  Ficha Técnica del Establecimiento
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Casa Matriz · Punto de despacho y atención técnica
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 font-mono text-[11px] font-bold text-amber-300 tabular-nums">
                NIT 989530017
              </span>
            </div>

            <dl className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <dt className="text-zinc-400">Nombre Comercial</dt>
                <dd className="text-zinc-100 font-semibold text-right">C&amp;C Ferretería — Casa y Construcción</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <dt className="text-zinc-400">Dirección Central</dt>
                <dd className="text-zinc-200 font-medium text-right">Zona Sarco, Av. Beijing y Av. Tadeo Haenke #1234</dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
                <dt className="text-zinc-400">Teléfono / WhatsApp</dt>
                <dd className="text-amber-400 font-mono font-bold tabular-nums text-right">+591 72271495</dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-zinc-400">Modalidades de Pago</dt>
                <dd className="text-zinc-200 font-medium text-right">QR Simple / Yape, Efectivo y Transferencia</dd>
              </div>
            </dl>

            {/* Muestra en vivo de stock actual */}
            {featuredProducts.length > 0 && (
              <div className="pt-2 border-t border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">Existencias verificadas en almacén</span>
                  <Link to="/catalogo" className="text-amber-400 hover:text-amber-300 font-semibold">
                    Ver todos →
                  </Link>
                </div>
                <div className="space-y-2">
                  {featuredProducts.map((item) => (
                    <Link
                      key={item.ProductoID}
                      to={`/catalogo?q=${encodeURIComponent(item.Nombre)}`}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0c0e12] border border-zinc-800/80 hover:border-amber-500/50 transition-colors duration-150"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{item.Nombre}</p>
                        <p className="text-[11px] font-mono text-zinc-500 tabular-nums">
                          Stock: {item.Stock} unid.
                        </p>
                      </div>
                      <span className="font-mono text-xs font-bold text-amber-400 tabular-nums shrink-0">
                        Bs. {Number(item.PrecioVenta || 0).toFixed(2)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. NUESTRA HISTORIA, MISIÓN Y VISIÓN (BASADO EN EL CASO DE ESTUDIO REAL) */}
      <section id="historia" className="py-16 sm:py-20 border-b border-zinc-800/80 bg-[#12151c]/50 scroll-mt-16">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                Cómo nació Ferretería Casa y Construcción
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Una solución creada desde la experiencia real de dirigir obras civiles y proyectos arquitectónicos en Cochabamba.
              </p>
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-5 space-y-3">
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  “Durante años, al ejecutar obras en la ciudad, encontrar accesorios sanitarios de presión, tuberías pluviales y herramientas confiables significaba perder media jornada recorriendo puestos dispersos en La Cancha o mercados mayoristas. Fundamos <strong>Casa y Construcción</strong> para que el profesional y las familias encuentren todo en un solo punto técnico, con precio justo y respaldo real.”
                </p>
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold text-zinc-200">Dirección General · C&amp;C Ferretería</span>
                  <span className="font-mono tabular-nums">Cochabamba, Bolivia</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
                <h3 className="text-lg font-bold text-zinc-100">
                  De negocio familiar a referente técnico en Zona Sarco
                </h3>
                <p className="text-sm text-zinc-300 leading-relaxed max-w-[68ch]">
                  <strong>Ferretería Casa y Construcción (C&amp;C)</strong> es una empresa familiar cochabambina con más de una década de experiencia en el sector ferretero. Fue impulsada por <strong>arquitectos e ingenieros civiles</strong> que identificaron la necesidad de contar con una comercial especializada donde la calidad técnica de los materiales y la asesoría de obra estén por encima de la improvisación.
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed max-w-[68ch]">
                  Inicialmente enfocada en resolver el abastecimiento de <strong>instalaciones sanitarias, pluviales y construcción general</strong>, la ferretería evolucionó de manera sostenida hasta consolidar un inventario amplio de herramientas eléctricas, insumos de obra gruesa, fijaciones, electricidad y pinturas controladas por lote y fecha de vencimiento.
                </p>
              </div>

              {/* Misión y Visión lado a lado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-[#0c0e12] border border-zinc-800 rounded-2xl p-6 space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">Nuestra Misión</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Proveer materiales de construcción, insumos sanitarios, eléctricos y herramientas de calidad comprobada a contratistas, profesionales y hogares de Cochabamba, garantizando disponibilidad real de stock, precios transparentes y atención ágil sin tiempos de espera.
                  </p>
                </div>

                <div className="bg-[#0c0e12] border border-zinc-800 rounded-2xl p-6 space-y-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-zinc-100">Nuestra Visión</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                    Consolidarnos como la ferretería líder en innovación operativa de la región, integrando control de inventario en tiempo real, pedidos digitales con QR Simple y asistencia técnica inteligente para impulsar el desarrollo constructivo del departamento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. RUBROS Y ESPECIALIDADES TÉCNICAS (CON FONDO GENERAL DE CONSTRUCCIÓN Y ENLACE DIRECTO AL CATÁLOGO) */}
      <section id="especialidades" className="relative overflow-hidden py-16 sm:py-20 border-b border-zinc-800/80 bg-[#0c0e12] scroll-mt-16">
        {/* Segunda imagen de fondo (Obra civil y construcción) cubriendo toda la sección de Especialidades */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60 pointer-events-none"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80')"
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(12,14,18,0.82) 0%, rgba(12,14,18,0.68) 50%, rgba(12,14,18,0.88) 100%)'
          }}
        />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
                Especialidades y Líneas de Abastecimiento
              </h2>
              <p className="text-sm text-zinc-200 max-w-[65ch]">
                Selecciona cualquier área técnica o categoría registrada en nuestro almacén para consultar precios en Bolivianos y existencias al instante.
              </p>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#12151c]/95 hover:bg-zinc-800 text-amber-400 border border-zinc-700 rounded-xl text-xs font-bold btn-press self-start sm:self-auto"
            >
              <span>Abrir catálogo completo ({products.length} ítems)</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>

          {/* Píldoras de Categorías Reales de la Base de Datos */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const count = products.filter((p) => p.CategoriaID === cat.CategoriaID).length;
                return (
                  <Link
                    key={cat.CategoriaID}
                    to={`/catalogo?categoria=${cat.CategoriaID}`}
                    className="px-3.5 py-2 rounded-xl bg-[#12151c]/90 hover:bg-amber-500 hover:text-zinc-950 border border-zinc-700/90 text-xs font-semibold text-zinc-100 transition-colors duration-150 flex items-center gap-2"
                  >
                    <span>{cat.Nombre}</span>
                    <span className="font-mono text-[11px] tabular-nums opacity-75">({count})</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Matriz de las 6 líneas técnicas de la ferretería con imagen de fondo por rubro */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {specialtyLines.map((line) => (
              <div
                key={line.title}
                className="group relative overflow-hidden bg-[#12151c]/90 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-amber-500/50 transition-colors duration-150"
              >
                {/* Imagen de fondo temática del rubro */}
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-55 group-hover:scale-[1.03] transition-[transform,opacity] duration-300 ease-out-expo pointer-events-none"
                  style={{ backgroundImage: `url('${line.bgImage}')` }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(180deg, rgba(18,21,28,0.76) 0%, rgba(12,14,18,0.92) 100%)'
                  }}
                />

                <div className="relative z-10 space-y-2.5">
                  <h3 className="text-base font-bold text-zinc-100">{line.title}</h3>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{line.spec}</p>
                </div>
                <div className="relative z-10 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                  <Link
                    to={`/catalogo?q=${encodeURIComponent(line.query)}`}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1.5"
                  >
                    <span>Consultar productos en tienda</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <span className="text-[11px] font-mono text-zinc-400">Stock real</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SIMULADOR INTERACTIVO PARA CONTRATISTAS Y VENTAJAS DEL SISTEMA WEB */}
      <section id="operacion-digital" className="py-16 sm:py-20 border-b border-zinc-800/80 bg-[#12151c]/50 scroll-mt-16">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Explicación de cómo el sistema resuelve la compra ferretera */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Por qué comprar y cotizar en nuestra plataforma web
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-[62ch]">
              Modernizamos la atención tradicional de mostrador para que maestros constructores, ingenieros y clientes particulares ahorren tiempo y aseguren sus materiales antes de llegar a la tienda:
            </p>

            <div className="space-y-4">
              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-5 space-y-1.5">
                <h3 className="text-sm font-bold text-zinc-100">
                  1. Existencias sincronizadas y control de vencimiento (FEFO)
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Cada producto muestra las unidades reales disponibles en estante. Además, insumos químicos como siliconas, pegamentos PVC, aditivos y pinturas son auditados por lote de caducidad para que nunca recibas material vencido.
                </p>
              </div>

              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-5 space-y-1.5">
                <h3 className="text-sm font-bold text-zinc-100">
                  2. Reserva inmediata con QR Simple y retiro sin filas
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Arma tu pedido desde tu celular o computadora, paga mediante código QR (Yape Bolivia o cualquier banco nacional), descarga tu comprobante digital en PDF y recoge tu material ya preparado en nuestro mostrador de la Av. Beijing.
                </p>
              </div>

              <div className="bg-[#0c0e12] border border-zinc-800 rounded-xl p-5 space-y-1.5">
                <h3 className="text-sm font-bold text-zinc-100">
                  3. Asistente técnico con Inteligencia Artificial las 24 horas
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  ¿Dudas sobre qué calibre de cable usar, qué cemento elegir para una losa o qué impermeabilizante aplicar? Nuestro asistente virtual integrado (esquina inferior derecha) consulta el catálogo real para asesorarte al instante.
                </p>
              </div>
            </div>
          </div>

          {/* Calculadora en vivo del Programa de Fidelización C&C */}
          <div className="lg:col-span-6 bg-[#0c0e12] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5 border-b border-zinc-800 pb-4">
              <h3 className="text-lg font-bold text-zinc-100">
                Programa de Beneficios para Clientes y Contratistas
              </h3>
              <p className="text-xs text-zinc-400">
                Al registrarte como cliente en C&amp;C Ferretería acumulas compras y desbloqueas descuentos automáticos en cada pedido online o en mostrador.
              </p>
            </div>

            {/* Selector de Nivel */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 block">
                Selecciona un nivel de fidelización para simular tu descuento:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {displayTierKeys.map((key) => {
                  const tier = LOYALTY_TIERS[key] || { name: key, discount: 0 };
                  const active = selectedTierKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedTierKey(key)}
                      className={`p-3 rounded-xl border text-left btn-press ${
                        active
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold'
                          : 'bg-[#12151c] text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">{tier.name}</span>
                      <span className={`font-mono text-sm font-extrabold tabular-nums block mt-0.5 ${active ? 'text-zinc-950' : 'text-amber-400'}`}>
                        {tier.discount}% OFF
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Control de monto de obra */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400 font-medium">Presupuesto estimado de materiales:</span>
                <span className="font-mono font-bold text-zinc-100 tabular-nums">
                  Bs. {estimateAmount.toLocaleString('es-BO')}
                </span>
              </div>
              <input
                type="range"
                min={200}
                max={20000}
                step={100}
                value={estimateAmount}
                onChange={(e) => setEstimateAmount(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] font-mono text-zinc-500 tabular-nums">
                <span>Bs. 200</span>
                <span>Bs. 5.000</span>
                <span>Bs. 10.000</span>
                <span>Bs. 20.000</span>
              </div>
            </div>

            {/* Resultado tabular */}
            <div className="bg-[#12151c] border border-zinc-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal en lista de materiales</span>
                <span className="font-mono text-zinc-200 tabular-nums">Bs. {estimateAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-semibold">
                <span>Ahorro directo ({activeTier.badge} · {activeTier.discount}%)</span>
                <span className="font-mono tabular-nums">- Bs. {savedBolivianos.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline">
                <span className="text-sm font-bold text-zinc-100">Total con beneficio C&amp;C</span>
                <span className="text-lg font-mono font-extrabold text-amber-400 tabular-nums">
                  Bs. {finalBolivianos.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                to="/registro"
                className="flex-1 py-2.5 px-4 bg-[#12151c] hover:bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-xl text-xs font-bold text-center btn-press"
              >
                Crear cuenta de cliente gratis
              </Link>
              <Link
                to="/catalogo"
                className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold text-center btn-press"
              >
                Cotizar en el Catálogo ahora
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. UBICACIÓN, HORARIOS Y CONTACTO DIRECTO EN COCHABAMBA */}
      <section id="ubicacion" className="py-16 sm:py-20 bg-[#0c0e12] scroll-mt-16 flex-1">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-5 bg-[#12151c] border border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-extrabold text-zinc-100 tracking-tight">
                  Visítanos en Zona Sarco o haz tu pedido en línea
                </h2>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
                  Nuestro almacén y mostrador central están ubicados en una de las arterias de mayor acceso vehicular para carga de materiales en Cochabamba.
                </p>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3.5 rounded-xl bg-[#0c0e12] border border-zinc-800/90">
                    <span className="text-zinc-400 block">Dirección Física (Casa Matriz)</span>
                    <strong className="text-zinc-100 text-sm block mt-0.5">
                      Av. Beijing y Av. Tadeo Haenke Nro. 1234 · Zona Sarco
                    </strong>
                    <span className="text-zinc-500 text-[11px] block mt-0.5">Cochabamba, Bolivia</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c0e12] border border-zinc-800/90">
                    <span className="text-zinc-400 block">Horarios de Atención en Mostrador</span>
                    <div className="mt-1 space-y-1 font-mono text-zinc-200 tabular-nums">
                      <div className="flex justify-between">
                        <span>Lunes a Viernes:</span>
                        <span className="text-amber-400 font-bold">08:00 – 18:30</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sábados:</span>
                        <span className="text-amber-400 font-bold">08:00 – 14:00</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0c0e12] border border-zinc-800/90 flex items-center justify-between">
                    <div>
                      <span className="text-zinc-400 block">Atención Telefónica y WhatsApp</span>
                      <strong className="font-mono text-sm text-zinc-100 tabular-nums block mt-0.5">
                        +591 72271495
                      </strong>
                    </div>
                    <a
                      href="https://wa.me/59172271495?text=Hola%20C%26C%20Ferreter%C3%ADa,%20quisiera%20consultar%20sobre%20materiales%20de%20construcci%C3%B3n."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold btn-press"
                    >
                      Escribir por WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              <Link
                to="/catalogo"
                className="w-full py-3.5 px-5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 btn-press"
              >
                <span>Ingresar al Catálogo de Productos Ahora</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>

            {/* Mapa interactivo / Esquema de ubicación y acceso rápido */}
            <div className="lg:col-span-7 bg-[#12151c] border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between">
              <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-zinc-100">
                    Punto de Retiro y Despacho de Materiales
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Intersección Av. Beijing y Av. Tadeo Haenke · Estacionamiento para carga rápida
                  </p>
                </div>
                <span className="font-mono text-xs text-amber-400 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-lg tabular-nums self-start sm:self-auto">
                  -17.382589, -66.181966
                </span>
              </div>

              <div className="relative flex-1 min-h-[300px] bg-[#0c0e12]">
                <iframe
                  title="Ubicación C&C Ferretería Casa y Construcción en Cochabamba"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=-66.186966%2C-17.386089%2C-66.176966%2C-17.379089&layer=mapnik&marker=-17.382589418248433%2C-66.1819659699599"
                  className="w-full h-full min-h-[300px] border-0 opacity-90 contrast-125"
                  loading="lazy"
                />
              </div>

              <div className="p-4 bg-[#0c0e12] border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                <span>Retiro inmediato en tienda presentando tu código de reserva online.</span>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=-17.382589418248433,-66.1819659699599"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-semibold"
                >
                  Abrir en Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PIE DE PÁGINA INSTITUCIONAL */}
      <footer className="bg-[#0c0e12] border-t border-zinc-800 py-8 text-xs text-zinc-500">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-md bg-amber-500 text-zinc-950 font-extrabold text-[11px] flex items-center justify-center">
              C&amp;C
            </span>
            <span className="font-bold text-zinc-200">C&amp;C Ferretería — Casa y Construcción</span>
            <span className="text-zinc-600">·</span>
            <span className="font-mono text-[11px] tabular-nums">NIT 989530017</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <Link to="/catalogo" className="text-zinc-300 hover:text-amber-400 font-semibold transition-colors duration-150">
              Catálogo de Productos
            </Link>
            <Link to="/login" className="text-zinc-400 hover:text-zinc-200 transition-colors duration-150">
              Acceso Clientes / Personal
            </Link>
            <span className="font-mono text-[11px] tabular-nums text-zinc-500">
              © {new Date().getFullYear()} Cochabamba
            </span>
          </div>
        </div>
      </footer>

      {/* Widget del Asistente Virtual IA */}
      <ChatbotWidget />
    </div>
  );
}

export default LandingPage;
