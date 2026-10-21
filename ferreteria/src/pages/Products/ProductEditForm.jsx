import React, { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getProduct, updateProduct, getBrands, getLocations, getCategories, getUnits, uploadImage } from "../../services/api";
import Sidebar from "../../components/sidebar/sidebar";
import Topbar from "../../components/topbar/topbar";
import { useSidebar } from "../../context/SidebarContext";

function ProductEditForm() {
  const { isCollapsed } = useSidebar();
  const { ProductoID } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState({
    Nombre: "",
    Descripcion: "",
    Precio: "",
    PrecioSinFactura: "",
    Stock: "",
    FechaVencimiento: "",
    CodigoBarras: "",
    MarcaID: "",
    UbicacionID: "",
    UnidadID: "",
    CategoriaID: "",
    TipoCodigoBarras: "Code 128 (C128)",
    LoteMinimo: "5",
    PrecioCompra: "",
    Margen: "25",
    ManejaCaducidad: false,
    DiasAlertaCaducidad: "30",
    Imagen: "",
  });

  const [marcas, setMarcas] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeMenu, setActiveMenu] = useState("productos-lista");

  useEffect(() => {
    cargarDatosProducto();
    cargarMarcas();
    cargarUbicaciones();
    cargarCategorias();
    cargarUnidades();
  }, [ProductoID]);

  const cargarDatosProducto = async () => {
    try {
      const data = await getProduct(ProductoID);
      const saneado = {
        Nombre: data.Nombre || "",
        Descripcion: data.Descripcion || "",
        Precio: data.Precio || data.PrecioVenta || "",
        PrecioSinFactura: data.PrecioSinFactura || "",
        Stock: data.Stock || "0",
        FechaVencimiento: data.FechaVencimiento || "",
        CodigoBarras: data.CodigoBarras || "",
        MarcaID: data.MarcaID ? data.MarcaID.toString() : "",
        UbicacionID: data.UbicacionID ? data.UbicacionID.toString() : "",
        UnidadID: data.UnidadID ? data.UnidadID.toString() : "",
        CategoriaID: data.CategoriaID ? data.CategoriaID.toString() : "",
        TipoCodigoBarras: data.TipoCodigoBarras || "Code 128 (C128)",
        LoteMinimo: data.LoteMinimo ? data.LoteMinimo.toString() : "5",
        PrecioCompra: data.PrecioCompra || "",
        Margen: data.Margen || "25",
        ManejaCaducidad: Boolean(data.ManejaCaducidad),
        DiasAlertaCaducidad: data.DiasAlertaCaducidad ? data.DiasAlertaCaducidad.toString() : "30",
        Imagen: data.Imagen || "",
      };
      setProducto(saneado);
    } catch (error) {
      console.error("Error al cargar el producto:", error);
    }
  };

  const cargarMarcas = async () => {
    try {
      const data = await getBrands();
      setMarcas(data);
    } catch (error) {
      console.error("Error al cargar marcas:", error);
    }
  };

  const cargarUbicaciones = async () => {
    try {
      const data = await getLocations();
      setUbicaciones(data);
    } catch (error) {
      console.error("Error al cargar ubicaciones:", error);
    }
  };

  const cargarCategorias = async () => {
    try {
      const data = await getCategories();
      setCategorias(data);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
    }
  };

  const cargarUnidades = async () => {
    try {
      const data = await getUnits();
      setUnidades(data);
    } catch (error) {
      console.error("Error al cargar unidades:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto((prev) => ({ ...prev, [name]: value || "" }));
  };

  // Cálculo bidireccional de precios ERP
  const handlePrecioCompraChange = (val) => {
    const cost = parseFloat(val);
    const pct = parseFloat(producto.Margen);
    setProducto((prev) => {
      const actual = { ...prev, PrecioCompra: val };
      if (!isNaN(cost) && !isNaN(pct)) {
        const sell = (cost * (1 + pct / 100)).toFixed(2);
        actual.Precio = sell;
        actual.PrecioSinFactura = (sell * 0.87).toFixed(2);
      }
      return actual;
    });
  };

  const handleMargenChange = (val) => {
    const cost = parseFloat(producto.PrecioCompra);
    const pct = parseFloat(val);
    setProducto((prev) => {
      const actual = { ...prev, Margen: val };
      if (!isNaN(cost) && !isNaN(pct)) {
        const sell = (cost * (1 + pct / 100)).toFixed(2);
        actual.Precio = sell;
        actual.PrecioSinFactura = (sell * 0.87).toFixed(2);
      }
      return actual;
    });
  };

  const handlePrecioChange = (val) => {
    const cost = parseFloat(producto.PrecioCompra);
    const sell = parseFloat(val);
    setProducto((prev) => {
      const actual = { ...prev, Precio: val };
      if (!isNaN(sell)) {
        actual.PrecioSinFactura = (sell * 0.87).toFixed(2);
        if (!isNaN(cost) && cost > 0) {
          actual.Margen = (((sell - cost) / cost) * 100).toFixed(2);
        }
      }
      return actual;
    });
  };

  // Estado para imagen seleccionada pendiente de subida en edición
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

          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

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

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMessage("");
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage("Formato de imagen no permitido. Selecciona únicamente fotos JPG, JPEG o PNG.");
      return;
    }

    try {
      const base64Normalized = await normalizeImage(file, 600, 600);
      setProducto((prev) => ({ ...prev, Imagen: base64Normalized }));
      setPendingImageFile({ base64Data: base64Normalized, fileName: file.name.replace(/\.[^/.]+$/, ".jpg") });
    } catch (err) {
      console.error("Error al recortar y normalizar imagen:", err);
      setErrorMessage("Error al procesar la imagen seleccionada. Intenta con otra imagen.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!producto.Nombre || !producto.Nombre.trim()) {
      setErrorMessage("El nombre del producto es obligatorio.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!producto.UnidadID || isNaN(parseInt(producto.UnidadID))) {
      setErrorMessage("Debes seleccionar una Unidad de medida válida.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!producto.CategoriaID || isNaN(parseInt(producto.CategoriaID))) {
      setErrorMessage("Debes seleccionar una Categoría válida.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!producto.MarcaID || isNaN(parseInt(producto.MarcaID))) {
      setErrorMessage("Debes seleccionar una Marca válida.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!producto.UbicacionID || isNaN(parseInt(producto.UbicacionID))) {
      setErrorMessage("Debes seleccionar una Ubicación en Almacén válida.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!producto.Precio || isNaN(parseFloat(producto.Precio)) || parseFloat(producto.Precio) <= 0) {
      setErrorMessage("Debes especificar un Precio Con Factura válido y mayor a 0.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (producto.PrecioCompra && (isNaN(parseFloat(producto.PrecioCompra)) || parseFloat(producto.PrecioCompra) < 0)) {
      setErrorMessage("El precio de compra no puede ser un valor negativo.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (producto.Margen && (isNaN(parseFloat(producto.Margen)) || parseFloat(producto.Margen) < 0)) {
      setErrorMessage("El margen de ganancia no puede ser un valor negativo.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (producto.LoteMinimo && (isNaN(parseInt(producto.LoteMinimo)) || parseInt(producto.LoteMinimo) < 1)) {
      setErrorMessage("El stock mínimo de alerta debe ser al menos de 1 unidad.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (producto.ManejaCaducidad && (!producto.DiasAlertaCaducidad || isNaN(parseInt(producto.DiasAlertaCaducidad)) || parseInt(producto.DiasAlertaCaducidad) < 1)) {
      setErrorMessage("Los días de alerta preventiva de caducidad deben ser al menos 1 día.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    let finalImageUrl = (producto.Imagen && !producto.Imagen.startsWith("data:")) ? producto.Imagen : null;

    if (pendingImageFile) {
      try {
        setIsUploading(true);
        const res = await uploadImage(pendingImageFile.base64Data, pendingImageFile.fileName);
        finalImageUrl = res.imageUrl;
        setIsUploading(false);
      } catch (err) {
        console.error("Error al subir la imagen en edición:", err);
        setErrorMessage("Error al guardar la nueva imagen en el servidor.");
        setIsUploading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    const productData = {
      Nombre: producto.Nombre.trim(),
      Descripcion: producto.Descripcion ? producto.Descripcion.trim() : null,
      Precio: parseFloat(producto.Precio),
      PrecioSinFactura: producto.PrecioSinFactura ? parseFloat(producto.PrecioSinFactura) : null,
      Stock: parseInt(producto.Stock || "0"),
      FechaVencimiento: producto.FechaVencimiento ? producto.FechaVencimiento : null,
      CodigoBarras: producto.CodigoBarras ? producto.CodigoBarras.trim() : null,
      MarcaID: parseInt(producto.MarcaID),
      UbicacionID: parseInt(producto.UbicacionID),
      UnidadID: parseInt(producto.UnidadID),
      CategoriaID: parseInt(producto.CategoriaID),
      TipoCodigoBarras: producto.TipoCodigoBarras,
      LoteMinimo: producto.LoteMinimo ? parseInt(producto.LoteMinimo) : 5,
      PrecioCompra: producto.PrecioCompra ? parseFloat(producto.PrecioCompra) : null,
      Margen: producto.Margen ? parseFloat(producto.Margen) : null,
      ManejaCaducidad: Boolean(producto.ManejaCaducidad),
      DiasAlertaCaducidad: producto.DiasAlertaCaducidad ? parseInt(producto.DiasAlertaCaducidad) : 30,
      Imagen: finalImageUrl,
    };

    try {
      await updateProduct(ProductoID, productData);
      navigate("/productsView", { state: { message: "¡Producto actualizado con éxito!" } });
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      const serverMsg = error.response?.data?.message || "Error al actualizar el producto en la base de datos.";
      setErrorMessage(serverMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-[#0c0e12] text-zinc-100 min-h-screen font-sans flex">
      <Sidebar activeItem={activeMenu} />

      <main className={`flex-1 transition-[margin-left] duration-220 ease-out-expo ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-[#0c0e12] flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100" style={{ textWrap: 'balance' }}>
                Editar Producto
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Actualiza la información del producto (ID: <span className="font-mono tabular-nums text-amber-400 font-semibold">{ProductoID}</span>).
              </p>
            </div>
            <Link
              to="/productsView"
              className="px-4 py-2 bg-[#12151c] hover:bg-zinc-800 border border-zinc-800/80 text-zinc-300 hover:text-zinc-100 font-semibold rounded-xl text-xs transition-colors duration-150 btn-press active:scale-[0.97] flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al catálogo
            </Link>
          </div>

          {/* Banner de Validación / Error */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs flex items-center justify-between gap-3 animate-toast-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="font-semibold">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="text-red-400 hover:text-red-300 font-bold ml-auto"
              >
                ✕
              </button>
            </div>
          )}

          {/* Formulario Principal Estilo ERP */}
          <form onSubmit={handleSubmit} className="bg-[#12151c] border border-zinc-800/80 rounded-2xl p-6 md:p-8 shadow-xl space-y-8">
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
                    name="Nombre"
                    value={producto.Nombre}
                    onChange={handleChange}
                    placeholder="Ej. PLACA SIMPLE SCHNEIDER BLANCO"
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
                    name="CodigoBarras"
                    value={producto.CodigoBarras}
                    onChange={handleChange}
                    placeholder="Ej. *54 o 779123456789"
                    className="bg-[#0c0e12] border border-zinc-800/80 rounded-xl focus:border-amber-500/60 text-zinc-100 placeholder-zinc-600 outline-none w-full p-3 transition-colors duration-150 text-sm font-mono tabular-nums font-medium"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Tipo de código <span className="text-amber-400">*</span>:
                  </label>
                  <select
                    name="TipoCodigoBarras"
                    value={producto.TipoCodigoBarras}
                    onChange={handleChange}
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
                    name="LoteMinimo"
                    value={producto.LoteMinimo}
                    onChange={handleChange}
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
                    name="UnidadID"
                    value={producto.UnidadID}
                    onChange={handleChange}
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
                    name="CategoriaID"
                    value={producto.CategoriaID}
                    onChange={handleChange}
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
                    name="MarcaID"
                    value={producto.MarcaID}
                    onChange={handleChange}
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
                    name="UbicacionID"
                    value={producto.UbicacionID}
                    onChange={handleChange}
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

              {/* Fila 3: Descripción */}
              <div>
                <label className="block mb-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Descripción Corta:
                </label>
                <textarea
                  name="Descripcion"
                  value={producto.Descripcion}
                  onChange={handleChange}
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
                          Lotes con Vencimiento
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
                      checked={producto.ManejaCaducidad}
                      onChange={(e) => setProducto(prev => ({ ...prev, ManejaCaducidad: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-transform after:duration-150 peer-checked:bg-amber-500 transition-colors duration-150"></div>
                    <span className="ml-3 text-xs font-bold text-zinc-300 whitespace-nowrap">
                      {producto.ManejaCaducidad ? "Con Caducidad" : "Sin Caducidad"}
                    </span>
                  </label>
                </div>

                {producto.ManejaCaducidad && (
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
                          name="DiasAlertaCaducidad"
                          value={producto.DiasAlertaCaducidad}
                          onChange={handleChange}
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
                  {/* Precio Compra */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-zinc-400 uppercase">
                      Costo (Bs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 6.49"
                      name="PrecioCompra"
                      value={producto.PrecioCompra}
                      onChange={(e) => handlePrecioCompraChange(e.target.value)}
                      className="bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 font-mono tabular-nums font-bold outline-none focus:border-amber-500/60 transition-colors duration-150 w-full"
                    />
                  </div>

                  {/* Margen */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-zinc-400 uppercase">
                      Margen (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="25"
                      name="Margen"
                      value={producto.Margen}
                      onChange={(e) => handleMargenChange(e.target.value)}
                      className="bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-mono tabular-nums font-bold outline-none focus:border-emerald-500/60 transition-colors duration-150 w-full"
                    />
                  </div>

                  {/* Precio Con Factura */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-amber-400 uppercase">
                      Venta Con Factura (Bs) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 8.11"
                      name="Precio"
                      value={producto.Precio}
                      onChange={(e) => handlePrecioChange(e.target.value)}
                      className="bg-[#12151c] border border-amber-500/40 rounded-xl px-3 py-2.5 text-sm text-amber-400 font-mono tabular-nums font-extrabold outline-none focus:border-amber-500 transition-colors duration-150 w-full"
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
                      placeholder="Ej. 7.00"
                      name="PrecioSinFactura"
                      value={producto.PrecioSinFactura}
                      onChange={handleChange}
                      className="bg-[#12151c] border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-200 font-mono tabular-nums font-extrabold outline-none focus:border-amber-500/60 transition-colors duration-150 w-full"
                    />
                  </div>

                  {/* Imagen */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-zinc-400 uppercase">
                      Examinar Archivo
                    </label>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="fileInputProductEdit"
                    />

                    {!producto.Imagen ? (
                      <label
                        htmlFor="fileInputProductEdit"
                        className="cursor-pointer bg-[#12151c] border border-zinc-800 hover:border-amber-500/50 p-2.5 rounded-xl flex items-center justify-between text-xs text-zinc-300 transition-colors duration-150"
                      >
                        <span className="truncate flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Elegir foto...</span>
                        </span>
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/25 text-amber-400 font-bold rounded-md text-[10px]">Buscar</span>
                      </label>
                    ) : (
                      <div className="flex items-center gap-2 bg-[#12151c] p-1.5 rounded-xl border border-emerald-500/40">
                        <img src={producto.Imagen} alt="Preview" className="w-7 h-7 rounded-lg object-cover border border-zinc-800" />
                        <span className="text-[10px] text-zinc-300 truncate flex-1">Foto cargada</span>
                        <button
                          type="button"
                          onClick={() => setProducto((prev) => ({ ...prev, Imagen: "" }))}
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

            {/* Botón de Guardar Cambios */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full text-zinc-950 bg-amber-500 hover:bg-amber-400 font-extrabold rounded-xl text-sm px-5 py-3.5 text-center shadow-sm transition-colors duration-150 btn-press active:scale-[0.97]"
              >
                Guardar Cambios del Producto
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ProductEditForm;
