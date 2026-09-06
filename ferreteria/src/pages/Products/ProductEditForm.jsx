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
    Imagen: "",
  });

  const [marcas, setMarcas] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
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

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      alert("Formato de imagen no permitido. Selecciona únicamente fotos JPG, JPEG o PNG.");
      return;
    }

    try {
      const base64Normalized = await normalizeImage(file, 600, 600);
      setProducto((prev) => ({ ...prev, Imagen: base64Normalized }));
      setPendingImageFile({ base64Data: base64Normalized, fileName: file.name.replace(/\.[^/.]+$/, ".jpg") });
    } catch (err) {
      console.error("Error al recortar y normalizar imagen:", err);
      alert("Error al procesar la imagen seleccionada.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    let finalImageUrl = (producto.Imagen && !producto.Imagen.startsWith("data:")) ? producto.Imagen : null;

    if (pendingImageFile) {
      try {
        const res = await uploadImage(pendingImageFile.base64Data, pendingImageFile.fileName);
        finalImageUrl = res.imageUrl;
      } catch (err) {
        console.error("Error al subir la imagen en edición:", err);
        alert("Error al guardar la imagen en el servidor.");
        return;
      }
    }

    const productData = {
      Nombre: producto.Nombre,
      Descripcion: producto.Descripcion ? producto.Descripcion : null,
      Precio: parseFloat(producto.Precio),
      PrecioSinFactura: producto.PrecioSinFactura ? parseFloat(producto.PrecioSinFactura) : null,
      Stock: parseInt(producto.Stock || "0"),
      FechaVencimiento: producto.FechaVencimiento ? producto.FechaVencimiento : null,
      CodigoBarras: producto.CodigoBarras ? producto.CodigoBarras : null,
      MarcaID: parseInt(producto.MarcaID),
      UbicacionID: parseInt(producto.UbicacionID),
      UnidadID: parseInt(producto.UnidadID),
      CategoriaID: parseInt(producto.CategoriaID),
      TipoCodigoBarras: producto.TipoCodigoBarras,
      LoteMinimo: producto.LoteMinimo ? parseInt(producto.LoteMinimo) : 5,
      PrecioCompra: producto.PrecioCompra ? parseFloat(producto.PrecioCompra) : null,
      Margen: producto.Margen ? parseFloat(producto.Margen) : null,
      Imagen: finalImageUrl,
    };

    try {
      await updateProduct(ProductoID, productData);
      navigate("/productsView", { state: { message: "¡Producto actualizado con éxito!" } });
    } catch (error) {
      console.error("Error al actualizar el producto:", error);
      alert("Error al actualizar el producto en la base de datos.");
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen font-sans flex">
      <Sidebar activeItem={activeMenu} />

      <main className={`flex-1 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} min-h-screen bg-slate-950 flex flex-col`}>
        <Topbar />

        <div className="p-6 md:p-8 max-w-[1920px] w-full mx-auto space-y-6 flex-1">
          {/* Encabezado */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Editar Producto
              </h2>
              <p className="text-slate-400 text-sm mt-1">Actualiza la información del producto (ID: {ProductoID}).</p>
            </div>
            <Link
              to="/productsView"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al catálogo
            </Link>
          </div>

          {/* Formulario Principal Estilo ERP */}
          <form onSubmit={handleSubmit} className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl space-y-8">
            {/* Sección 1: Datos Generales */}
            <div className="space-y-6">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-cyan-400 border-b border-slate-800/80 pb-2">
                1. Información General del Producto
              </h3>

              {/* Fila 1: Nombre, SKU/Código de Barras, Tipo Código, Stock Mínimo Alerta */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Nombre del producto <span className="text-cyan-400">*</span>:
                  </label>
                  <input
                    type="text"
                    name="Nombre"
                    value={producto.Nombre}
                    onChange={handleChange}
                    placeholder="Ej. PLACA SIMPLE SCHNEIDER BLANCO"
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    SKU / Código de Barras:
                  </label>
                  <input
                    type="text"
                    name="CodigoBarras"
                    value={producto.CodigoBarras}
                    onChange={handleChange}
                    placeholder="Ej. *54 o 779123456789"
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Tipo de código <span className="text-cyan-400">*</span>:
                  </label>
                  <select
                    name="TipoCodigoBarras"
                    value={producto.TipoCodigoBarras}
                    onChange={handleChange}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm font-medium cursor-pointer"
                  >
                    <option value="Code 128 (C128)" className="bg-slate-900 text-white">Code 128 (C128)</option>
                    <option value="Code 39" className="bg-slate-900 text-white">Code 39</option>
                    <option value="EAN-13" className="bg-slate-900 text-white">EAN-13</option>
                    <option value="EAN-8" className="bg-slate-900 text-white">EAN-8</option>
                    <option value="UPC-A" className="bg-slate-900 text-white">UPC-A</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Stock Mínimo (Alerta):
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="LoteMinimo"
                    value={producto.LoteMinimo}
                    onChange={handleChange}
                    placeholder="Ej. 5"
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-amber-300 font-bold outline-none w-full p-3 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Fila 2: Selectores Agrupados (Unidad, Categoría, Marca, Ubicación) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Unidad <span className="text-cyan-400">*</span>:
                  </label>
                  <select
                    name="UnidadID"
                    value={producto.UnidadID}
                    onChange={handleChange}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Seleccione unidad...</option>
                    {unidades.map((u) => (
                      <option key={u.UnidadID} value={u.UnidadID.toString()} className="bg-slate-900 text-white">
                        {u.Nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Categoría <span className="text-cyan-400">*</span>:
                  </label>
                  <select
                    name="CategoriaID"
                    value={producto.CategoriaID}
                    onChange={handleChange}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Seleccione categoría...</option>
                    {categorias.map((c) => (
                      <option key={c.CategoriaID} value={c.CategoriaID.toString()} className="bg-slate-900 text-white">
                        {c.Nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Marca <span className="text-cyan-400">*</span>:
                  </label>
                  <select
                    name="MarcaID"
                    value={producto.MarcaID}
                    onChange={handleChange}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Seleccione marca...</option>
                    {marcas.map((m) => (
                      <option key={m.MarcaID} value={m.MarcaID.toString()} className="bg-slate-900 text-white">
                        {m.Nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Ubicación en Almacén <span className="text-cyan-400">*</span>:
                  </label>
                  <select
                    name="UbicacionID"
                    value={producto.UbicacionID}
                    onChange={handleChange}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm font-medium cursor-pointer"
                    required
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">Seleccione ubicación...</option>
                    {ubicaciones.map((ub) => (
                      <option key={ub.UbicacionID} value={ub.UbicacionID.toString()} className="bg-slate-900 text-white">
                        {ub.Almacen ? `[${ub.Almacen.Nombre}] - ${ub.Descripcion}` : ub.Descripcion}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fila 3: Descripción */}
              <div>
                <label className="block mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Descripción Corta:
                </label>
                <textarea
                  name="Descripcion"
                  value={producto.Descripcion}
                  onChange={handleChange}
                  placeholder="Detalles adicionales o características del producto..."
                  rows="2"
                  className="bg-slate-950 border border-slate-800/80 rounded-xl focus:border-cyan-500/50 text-slate-200 outline-none w-full p-3 transition-all text-sm resize-none"
                />
              </div>
            </div>

            {/* Sección 2: Panel Inteligente de Precios e Imagen (Barra Verde ERP) */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-cyan-400 border-b border-slate-800/80 pb-2">
                2. Configuración de Precios e Imagen del Producto
              </h3>

              <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/40 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-xl">
                {/* Cabecera Verde ERP */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-white font-extrabold text-xs uppercase tracking-wider grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    <label className="block mb-1.5 text-[10px] font-extrabold text-slate-300 uppercase">
                      Costo (Bs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 6.49"
                      name="PrecioCompra"
                      value={producto.PrecioCompra}
                      onChange={(e) => handlePrecioCompraChange(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white font-bold outline-none focus:border-emerald-500 w-full"
                    />
                  </div>

                  {/* Margen */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-slate-300 uppercase">
                      Margen (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="25"
                      name="Margen"
                      value={producto.Margen}
                      onChange={(e) => handleMargenChange(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500 w-full"
                    />
                  </div>

                  {/* Precio Con Factura */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-cyan-400 uppercase">
                      Venta Con Factura (Bs) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 8.11"
                      name="Precio"
                      value={producto.Precio}
                      onChange={(e) => handlePrecioChange(e.target.value)}
                      className="bg-slate-950 border border-cyan-500/50 rounded-xl px-3 py-2.5 text-sm text-cyan-300 font-extrabold outline-none focus:border-cyan-400 w-full shadow-inner"
                      required
                    />
                  </div>

                  {/* Precio Sin Factura */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-amber-400 uppercase">
                      Sin Factura (Bs.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 7.00"
                      name="PrecioSinFactura"
                      value={producto.PrecioSinFactura}
                      onChange={handleChange}
                      className="bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2.5 text-sm text-amber-300 font-extrabold outline-none focus:border-amber-400 w-full"
                    />
                  </div>

                  {/* Imagen */}
                  <div>
                    <label className="block mb-1.5 text-[10px] font-extrabold text-slate-300 uppercase">
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
                        className="cursor-pointer bg-slate-950 border border-slate-800 hover:border-cyan-500/50 p-2.5 rounded-xl flex items-center justify-between text-xs text-slate-300 transition-all"
                      >
                        <span className="truncate">Elegir foto...</span>
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 font-bold rounded-md text-[10px]">Buscar</span>
                      </label>
                    ) : (
                      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-emerald-500/40">
                        <img src={producto.Imagen} alt="Preview" className="w-7 h-7 rounded-lg object-cover border border-slate-800" />
                        <span className="text-[10px] text-slate-300 truncate flex-1">Foto cargada</span>
                        <button
                          type="button"
                          onClick={() => setProducto((prev) => ({ ...prev, Imagen: "" }))}
                          className="text-rose-400 hover:text-rose-300 p-1 font-bold text-xs"
                          title="Quitar imagen"
                        >
                          ✕
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
                className="w-full text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold rounded-xl text-sm px-5 py-3.5 text-center shadow-lg shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5"
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
