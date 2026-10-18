import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createProduct, getBrands, getLocations, getCategories, getUnits, uploadImage } from "../../services/api";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";

function ProductRegisterForm() {
  const navigate = useNavigate();
  const { isCollapsed } = useSidebar();
  const [ubicaciones, setLocations] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeMenu, setActiveMenu] = useState("productos-lista");

  const [Nombre, setNombre] = useState("");
  const [Descripcion, setDescripcion] = useState("");
  const [Precio, setPrecio] = useState("");
  const [PrecioSinFactura, setPrecioSinFactura] = useState("");
  const [CodigoBarras, setCodigoBarras] = useState("");
  const [MarcaID, setMarcaId] = useState("");
  const [UbicacionID, setUbicacionId] = useState("");
  const [UnidadID, setUnidadId] = useState("");
  const [CategoriaID, setCategoriaId] = useState("");
  const [TipoCodigoBarras, setTipoCodigoBarras] = useState("Code 128 (C128)");
  const [LoteMinimo, setLoteMinimo] = useState("5");
  const [PrecioCompra, setPrecioCompra] = useState("");
  const [Margen, setMargen] = useState("25");
  const [ManejaCaducidad, setManejaCaducidad] = useState(false);
  const [DiasAlertaCaducidad, setDiasAlertaCaducidad] = useState("30");

  // Gestión de Imagen y Archivos
  const [Imagen, setImagen] = useState("");
  const [fileName, setFileName] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Estados para Toast Flotante de Éxito
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Reproductor de sonido sintetizado Web Audio API
  const playSuccessSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5

      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.3);
      osc2.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio no soportado:", e);
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [uData, bData, cData, unData] = await Promise.all([
          getLocations(), getBrands(), getCategories(), getUnits()
        ]);
        setLocations(uData);
        setMarcas(bData);
        setCategorias(cData);
        setUnidades(unData);
      } catch (error) {
        console.error("Error al cargar catalogos para registro:", error);
      }
    };
    cargarDatos();
  }, []);

  // Estado para la imagen pendiente de subida
  const [pendingImageFile, setPendingImageFile] = useState(null);

  // Función para recortar y normalizar imágenes a 600x600px en formato 1:1
  const normalizeImage = (file, targetWidth = 600, targetHeight = 600) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");

          // Cálculo de recorte central (Center-Crop Object-Fit Cover)
          const aspectImg = img.width / img.height;
          const aspectTarget = targetWidth / targetHeight;
          let sx, sy, sWidth, sHeight;

          if (aspectImg > aspectTarget) {
            sHeight = img.height;
            sWidth = img.height * aspectTarget;
            sx = (img.width - sWidth) / 2;
            sy = 0;
          } else {
            sWidth = img.width;
            sHeight = img.width / aspectTarget;
            sx = 0;
            sy = (img.height - sHeight) / 2;
          }

          // Fondo blanco limpio de respaldo
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

          // Convertir a JPEG optimizado a 600x600px
          const base64Normalized = canvas.toDataURL("image/jpeg", 0.85);
          resolve(base64Normalized);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Manejo de la previsualización local normalizada (600x600 px)
  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Formato de imagen no permitido. Selecciona únicamente fotos JPG, JPEG o PNG.");
      return;
    }

    setErrorMessage("");
    try {
      const base64Normalized = await normalizeImage(file, 600, 600);
      setImagePreview(base64Normalized);
      setPendingImageFile({ base64Data: base64Normalized, fileName: file.name.replace(/\.[^/.]+$/, ".jpg") });
      setFileName(file.name);
    } catch (err) {
      console.error("Error al procesar y normalizar imagen:", err);
      setErrorMessage("Error al procesar la imagen seleccionada.");
    }
  };

  const removeImage = () => {
    setImagen("");
    setImagePreview("");
    setFileName("");
    setPendingImageFile(null);
  };

  // Lógica de cálculo inteligente de precios (ERP)
  const handlePrecioCompraChange = (val) => {
    setPrecioCompra(val);
    const cost = parseFloat(val);
    const pct = parseFloat(Margen);
    if (!isNaN(cost) && !isNaN(pct)) {
      const pConFactura = cost * (1 + pct / 100);
      setPrecio(pConFactura.toFixed(2));
      setPrecioSinFactura((pConFactura * 0.87).toFixed(2));
    }
  };

  const handleMargenChange = (val) => {
    setMargen(val);
    const cost = parseFloat(PrecioCompra);
    const pct = parseFloat(val);
    if (!isNaN(cost) && !isNaN(pct)) {
      const pConFactura = cost * (1 + pct / 100);
      setPrecio(pConFactura.toFixed(2));
      setPrecioSinFactura((pConFactura * 0.87).toFixed(2));
    }
  };

  const handlePrecioVentaChange = (val) => {
    setPrecio(val);
    const cost = parseFloat(PrecioCompra);
    const sell = parseFloat(val);
    if (!isNaN(cost) && !isNaN(sell) && cost > 0) {
      setMargen((((sell - cost) / cost) * 100).toFixed(2));
    }
  };

  const resetForm = () => {
    setNombre("");
    setDescripcion("");
    setPrecio("");
    setPrecioSinFactura("");
    setCodigoBarras("");
    setMarcaId("");
    setUbicacionId("");
    setUnidadId("");
    setCategoriaId("");
    setPrecioCompra("");
    setMargen("25");
    setManejaCaducidad(false);
    setDiasAlertaCaducidad("30");
    removeImage();
  };

  const executeSave = async (mode) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!Nombre.trim()) {
      setErrorMessage("El nombre del producto es obligatorio.");
      return;
    }
    if (!UnidadID) {
      setErrorMessage("Debes seleccionar una Unidad de medida.");
      return;
    }
    if (!CategoriaID) {
      setErrorMessage("Debes seleccionar una Categoría.");
      return;
    }
    if (!MarcaID) {
      setErrorMessage("Debes seleccionar una Marca.");
      return;
    }
    if (!UbicacionID) {
      setErrorMessage("Debes seleccionar una Ubicación en Almacén.");
      return;
    }
    if (!Precio || isNaN(parseFloat(Precio))) {
      setErrorMessage("Debes especificar un Precio Con Factura válido.");
      return;
    }

    let finalImageUrl = Imagen ? Imagen : null;

    if (pendingImageFile) {
      try {
        setIsUploading(true);
        const res = await uploadImage(pendingImageFile.base64Data, pendingImageFile.fileName);
        finalImageUrl = res.imageUrl;
        setIsUploading(false);
      } catch (err) {
        console.error("Error al subir la imagen durante el registro:", err);
        setErrorMessage("Error al guardar la imagen en el servidor.");
        setIsUploading(false);
        return;
      }
    }

    const productData = {
      Nombre,
      Descripcion: Descripcion ? Descripcion : null,
      Precio: parseFloat(Precio),
      PrecioSinFactura: PrecioSinFactura ? parseFloat(PrecioSinFactura) : null,
      Stock: 0,
      FechaVencimiento: null,
      CodigoBarras: CodigoBarras ? CodigoBarras : null,
      MarcaID: parseInt(MarcaID),
      UbicacionID: parseInt(UbicacionID),
      UnidadID: parseInt(UnidadID),
      CategoriaID: parseInt(CategoriaID),
      TipoCodigoBarras,
      LoteMinimo: LoteMinimo ? parseInt(LoteMinimo) : 5,
      PrecioCompra: PrecioCompra ? parseFloat(PrecioCompra) : null,
      Margen: Margen ? parseFloat(Margen) : null,
      ManejaCaducidad,
      DiasAlertaCaducidad: DiasAlertaCaducidad ? parseInt(DiasAlertaCaducidad) : 30,
      Imagen: finalImageUrl,
    };

    try {
      const data = await createProduct(productData);
      console.log("Producto creado:", data);

      if (mode === "saveAndStock") {
        navigate("/productsView", {
          state: {
            message: "¡Producto registrado! Abriendo Stock de Apertura...",
            openStockModalFor: data.ProductoID,
            productName: data.Nombre
          }
        });
      } else if (mode === "saveAndAnother") {
        setToastMessage(`¡Producto "${data.Nombre}" registrado con éxito! Puedes ingresar el siguiente.`);
        setShowToast(true);
        playSuccessSound();
        resetForm();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setShowToast(false), 5000);
      } else {
        navigate("/productsView", { state: { message: "¡Producto registrado con éxito!" } });
      }
    } catch (error) {
      console.error("Error al registrar producto:", error);
      setErrorMessage("Error al registrar el producto en la base de datos.");
    }
  };

  return (
    <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex relative">
      {/* Toast Notification flotante en la esquina superior derecha */}
      {showToast && (
        <div className="fixed top-20 right-8 z-50 max-w-sm w-full bg-[#12151c] border border-emerald-500/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3 animate-toast-in">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-emerald-400">Operación Exitosa</h4>
            <p className="text-sm font-semibold text-zinc-100 mt-0.5">{toastMessage}</p>
          </div>
          <button
            onClick={() => setShowToast(false)}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg transition-colors duration-150 btn-press active:scale-[0.97] outline-none"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Sidebar activeItem={activeMenu} />

      <main className={`flex-1 transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-[#0c0e12] flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100" style={{ textWrap: 'balance' }}>
                Añadir Producto
              </h1>
              <p className="text-zinc-400 text-sm mt-1">Registra la ficha técnica y precios de un nuevo ítem del catálogo.</p>
            </div>
            <Link
              to="/productsView"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#12151c] border border-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 font-bold rounded-xl transition-colors duration-150 btn-press active:scale-[0.97] text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Volver a la Lista</span>
            </Link>
          </div>

          {/* Mensaje de Error (si existe) */}
          {errorMessage && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 font-bold rounded-2xl text-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span>
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage("")}
                className="text-red-400 hover:text-zinc-100 p-1 rounded-lg transition-colors duration-150 btn-press active:scale-[0.97] ml-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Formulario Principal */}
          <div className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-6 md:p-8 shadow-xl space-y-8">

            {/* Sección 1: Datos Generales */}
            <div className="space-y-6">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 border-b border-zinc-800/80 pb-2">
                1. Información General del Producto
              </h3>

              {/* Fila 1: Nombre, SKU/Código de Barras, Tipo Código, Stock Mínimo Alerta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Nombre del producto <span className="text-amber-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={Nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="..."
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 placeholder-zinc-600 outline-none w-full p-3 transition-colors duration-150 text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    SKU / Código de Barras:
                  </label>
                  <input
                    type="text"
                    value={CodigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    placeholder="..."
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 placeholder-zinc-600 outline-none w-full p-3 transition-colors duration-150 text-sm font-mono tabular-nums font-medium"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Tipo de código <span className="text-amber-400">*</span>:
                  </label>
                  <select
                    value={TipoCodigoBarras}
                    onChange={(e) => setTipoCodigoBarras(e.target.value)}
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 outline-none w-full p-3 transition-colors duration-150 text-sm font-mono tabular-nums font-medium cursor-pointer"
                  >
                    <option value="Code 128 (C128)" className="bg-[#12151c] text-zinc-100">Code 128 (C128)</option>
                    <option value="Code 39" className="bg-[#12151c] text-zinc-100">Code 39</option>
                    <option value="EAN-13" className="bg-[#12151c] text-zinc-100">EAN-13</option>
                    <option value="EAN-8" className="bg-[#12151c] text-zinc-100">EAN-8</option>
                    <option value="UPC-A" className="bg-[#12151c] text-zinc-100">UPC-A</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Stock Mínimo (Alerta):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={LoteMinimo}
                    onChange={(e) => setLoteMinimo(e.target.value)}
                    placeholder="Ej. 5"
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-amber-400 font-mono tabular-nums font-bold placeholder-zinc-600 outline-none w-full p-3 transition-colors duration-150 text-sm"
                  />
                </div>
              </div>

              {/* Fila 2: Selectores Agrupados (Unidad, Categoría, Marca, Ubicación) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Unidad <span className="text-amber-400">*</span>:
                  </label>
                  <select
                    value={UnidadID}
                    onChange={(e) => setUnidadId(e.target.value)}
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 outline-none w-full p-3 transition-colors duration-150 text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-[#12151c] text-zinc-500">Seleccione unidad...</option>
                    {unidades.map((u) => (
                      <option key={u.UnidadID} value={u.UnidadID.toString()} className="bg-[#12151c] text-zinc-100">
                        {u.Nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Categoría <span className="text-amber-400">*</span>:
                  </label>
                  <select
                    value={CategoriaID}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 outline-none w-full p-3 transition-colors duration-150 text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-[#12151c] text-zinc-500">Seleccione categoría...</option>
                    {categorias.map((c) => (
                      <option key={c.CategoriaID} value={c.CategoriaID.toString()} className="bg-[#12151c] text-zinc-100">
                        {c.Nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Marca <span className="text-amber-400">*</span>:
                  </label>
                  <select
                    value={MarcaID}
                    onChange={(e) => setMarcaId(e.target.value)}
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 outline-none w-full p-3 transition-colors duration-150 text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-[#12151c] text-zinc-500">Seleccione marca...</option>
                    {marcas.map((m) => (
                      <option key={m.MarcaID} value={m.MarcaID.toString()} className="bg-[#12151c] text-zinc-100">
                        {m.Nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Ubicación en Almacén <span className="text-amber-400">*</span>:
                  </label>
                  <select
                    value={UbicacionID}
                    onChange={(e) => setUbicacionId(e.target.value)}
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 outline-none w-full p-3 transition-colors duration-150 text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-[#12151c] text-zinc-500">Seleccione ubicación...</option>
                    {ubicaciones.map((ub) => (
                      <option key={ub.UbicacionID} value={ub.UbicacionID.toString()} className="bg-[#12151c] text-zinc-100">
                        {ub.Almacen ? `[${ub.Almacen.Nombre}] - ${ub.Descripcion}` : ub.Descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Descripción Corta:
                </label>
                <textarea
                  value={Descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles adicionales o características del producto..."
                  rows="2"
                  className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 placeholder-zinc-600 outline-none w-full p-3 transition-colors duration-150 text-sm resize-none"
                />
              </div>

              {/* Control de Caducidad y Vencimiento */}
              <div className="bg-[#0c0e12] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                        Control de Caducidad y Vencimiento
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
                          Lotes FEFO
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Activa esta opción si el producto cuenta con fecha de vencimiento (ej. pinturas, siliconas, pegamentos, masillas, cemento, etc.).
                      </p>
                    </div>
                  </div>

                  {/* Switch / Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ManejaCaducidad}
                      onChange={(e) => setManejaCaducidad(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform after:duration-150 peer-checked:bg-amber-500 transition-colors duration-150"></div>
                    <span className="ml-3 text-xs font-bold text-zinc-300 whitespace-nowrap">
                      {ManejaCaducidad ? "Con Caducidad" : "Sin Caducidad"}
                    </span>
                  </label>
                </div>

                {ManejaCaducidad && (
                  <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-300/90 text-xs flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-semibold">
                        Al activar la caducidad, el sistema solicitará la <strong>Fecha de Vencimiento</strong> de cada lote físico al ingresar <strong>Stock de Apertura</strong> o registrar <strong>Compras</strong>.
                      </p>
                    </div>
                    <div>
                      <label className="block mb-1.5 font-bold text-zinc-400 uppercase tracking-wider text-[11px]">
                        Alerta preventiva previa (Días antes de vencer):
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={DiasAlertaCaducidad}
                          onChange={(e) => setDiasAlertaCaducidad(e.target.value)}
                          className="w-28 px-3 py-2 bg-[#12151c] border border-zinc-800 rounded-xl text-zinc-100 font-mono tabular-nums font-bold text-xs outline-none focus:border-amber-500/60 transition-colors duration-150"
                        />
                        <span className="text-zinc-400 font-semibold">días de anticipación en el semáforo</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sección 2: Panel Inteligente de Precios e Imagen */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-400 border-b border-zinc-800/80 pb-2">
                2. Configuración de Precios e Imagen del Producto
              </h3>

              <div className="bg-[#0c0e12] border border-zinc-800/80 rounded-2xl overflow-hidden">
                {/* Cabecera Técnica estilo ERP */}
                <div className="bg-[#12151c] border-b border-zinc-800/80 px-6 py-3 text-zinc-300 font-extrabold text-xs uppercase tracking-wider grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>Precio Compra (Costo)</div>
                  <div>x Margen (%)</div>
                  <div>Precio Con Factura *</div>
                  <div>Precio Sin Factura</div>
                  <div>Imagen del producto (JPG/PNG)</div>
                </div>

                {/* Cuerpo del Calculador ERP */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  {/* Precio de Compra */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-zinc-400 uppercase">
                      Costo (Bs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={PrecioCompra}
                      onChange={(e) => handlePrecioCompraChange(e.target.value)}
                      className="bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 font-mono tabular-nums font-bold outline-none focus:border-amber-500/60 transition-colors duration-150 w-full"
                    />
                  </div>

                  {/* Margen % */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-zinc-400 uppercase">
                      Ganancia %
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="25.00"
                      value={Margen}
                      onChange={(e) => handleMargenChange(e.target.value)}
                      className="bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-mono tabular-nums font-bold outline-none focus:border-emerald-500/60 transition-colors duration-150 w-full"
                    />
                  </div>

                  {/* Precio Con Factura */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-amber-400 uppercase">
                      Con Factura (Bs.) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={Precio}
                      onChange={(e) => handlePrecioVentaChange(e.target.value)}
                      className="bg-[#12151c] border border-amber-500/40 rounded-xl px-3 py-2.5 text-base text-amber-400 font-mono tabular-nums font-extrabold outline-none focus:border-amber-500 transition-colors duration-150 w-full"
                      required
                    />
                  </div>

                  {/* Precio Sin Factura */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-zinc-300 uppercase">
                      Sin Factura (Bs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={PrecioSinFactura}
                      onChange={(e) => setPrecioSinFactura(e.target.value)}
                      className="bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2.5 text-base text-zinc-200 font-mono tabular-nums font-extrabold outline-none focus:border-amber-500/60 transition-colors duration-150 w-full"
                    />
                  </div>

                  {/* Subida de Imagen con Restricción a JPG/PNG */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-zinc-400 uppercase">
                      Examinar Archivo (JPG/PNG)
                    </label>

                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="fileInputProduct"
                    />

                    {!imagePreview ? (
                      <label
                        htmlFor="fileInputProduct"
                        className="cursor-pointer bg-[#12151c] border border-zinc-800 hover:border-amber-500/50 px-3 py-2.5 rounded-xl flex items-center justify-between text-xs text-zinc-300 transition-colors duration-150"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>{isUploading ? "Subiendo..." : "Elegir foto..."}</span>
                        </span>
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold rounded-md text-[10px]">Buscar</span>
                      </label>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#12151c] p-1.5 rounded-xl border border-emerald-500/40">
                        <img src={imagePreview} alt="Preview" className="w-8 h-8 rounded-lg object-cover border border-zinc-800" />
                        <span className="text-[10px] text-zinc-300 truncate flex-1">{fileName || "Foto cargada"}</span>
                        <button
                          type="button"
                          onClick={removeImage}
                          className="text-red-400 hover:text-red-300 p-1 font-bold text-xs transition-colors duration-150 btn-press active:scale-[0.97]"
                          title="Quitar imagen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Botonera de Guardado al Pie */}
            <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-end gap-4">
              {/* Botón 1: Guardar y agregar otro */}
              <button
                type="button"
                onClick={() => executeSave("saveAndAnother")}
                className="w-full sm:w-auto px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 font-extrabold rounded-xl text-xs tracking-wider uppercase transition-colors duration-150 btn-press active:scale-[0.97]"
              >
                Guardar y agregar otro
              </button>

              {/* Botón 2: Guardar simple */}
              <button
                type="button"
                onClick={() => executeSave("save")}
                className="w-full sm:w-auto px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold rounded-xl shadow-sm text-xs tracking-wider uppercase transition-colors duration-150 btn-press active:scale-[0.97]"
              >
                Guardar
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default ProductRegisterForm;
