# Registro de Correcciones del Proyecto

## 07 de Agosto de 2026
Se llevó a cabo una limpieza general del repositorio y una refactorización arquitectónica tanto en el backend como en el frontend para asegurar las buenas prácticas antes de la entrega final:

### 1. Limpieza de Archivos
* Se eliminaron los respaldos temporales (`evidencia/` y `evidencia.rar`) para mantener limpio el repositorio.

### 2. Optimización del Backend
* **Conexión única:** Se eliminó la conexión redundante hecha con `mssql` crudo en `app.js`. Ahora Sequelize administra toda la comunicación.
* **Verificación de Base de Datos:** Se implementó `sequelize.authenticate()` al arrancar para validar la conexión y mostrar logs limpios del servidor en consola.

### 3. Refactorización del Frontend (React + Vite)
* **API Centralizada:** Se configuró [`api.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/services/api.js) con el puerto correcto del backend (`http://localhost:3000`) y funciones dedicadas para productos, marcas, proveedores y ubicaciones.
* **Vistas actualizadas:** Se reemplazó el uso directo de `axios` por el servicio centralizado en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx), [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) y [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx).
* **Rutas Corregidas:** Se solucionó el error de escritura (typo) cambiando `/prodctsView` por `/productsView` en [`App.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/App.jsx) y en los botones de retorno.

### 4. Rediseño Estético - Dashboard del Operador (Tema Oscuro Premium)
* **Panel de Control (Home):** Se transformó la pantalla principal [`Home.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Home/Home.jsx) en un Dashboard de Gestión completo para el operador de la ferretería, imitando la estructura de la captura provista por el usuario.
* **Sidebar Pined:** Se diseñó un menú lateral izquierdo fijo que provee navegación rápida al listado de productos (`/productsView`), al registro de productos (`/productReg`) y al portal de clientes (`/loginClie`).
* **Topbar del Sistema:** Se añadió una barra superior que muestra el estado de conexión de la sucursal, la fecha del sistema, globo con contador de notificaciones (`22`) y el nombre del administrador: **OSCAR EDGAR CLAROS DAVALOS**.
* **Métricas Integradas:** Se implementaron 8 tarjetas informativas mostrando Ventas Totales (`Bs. 2,890.52`), Ventas Netas, Devoluciones, Compras y Gastos.
* **Gráfico SVG Interactivo:** Se programó a mano un gráfico de curvas animadas con degradados bajo la curva para representar las ventas de los últimos 30 días, con tooltips dinámicos flotantes al hacer *hover* sobre los picos de ventas.

### 5. Rediseño Estético - Gestión de Productos (ProductView.jsx)
* **Consistencia del Dashboard:** Se reestructuró la página [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) para heredar el mismo Sidebar de navegación fijo y la Topbar del operador, logrando una interfaz cohesiva en todo el sistema.
* **Buscador Dinámico Local:** Se incorporó un filtro de búsqueda interactivo en tiempo real que permite filtrar al instante los productos por nombre o código de barras sin realizar llamadas extras al servidor.
* **Tabla de Cristal Premium:** Se rediseñó la tabla con bordes delgados de cristal esmerilado y filas reactivas que cambian de color al pasar el cursor.
* **Badges de Stock Reactivos:** Se añadieron píldoras visuales de color (Disponible en verde, Stock Bajo en amarillo, Agotado en rojo) según la cantidad disponible.
* **Acciones Estilizadas:** Se rediseñaron los botones de Editar y Eliminar con bordes finos que reaccionan con transiciones suaves al pasar el ratón.

### 6. Rediseño Estético - Registro de Productos (ProductRegisterForm.jsx)
* **Consistencia del Dashboard:** Se integró la estructura unificada con el Sidebar lateral izquierdo fijo y la Topbar del operador.
* **Formulario Oscuro Premium:** Se rediseñaron todos los campos de texto, áreas de descripción y selectores utilizando fondos de color gris carbón oscuro (`bg-slate-950`), bordes elegantes y efectos de foco en cian brillante.
* **Selectores Integrados:** Se mantuvo la lógica reactiva de carga automática de proveedores, marcas y ubicaciones desde la base de datos de manera transparente.
* **Acciones y Respuestas:** Se estilizó el botón de envío con el gradiente cian a azul y se adaptó la alerta de éxito al diseño oscuro general.

### 7. Rediseño Estético - Edición de Productos (ProductEditForm.jsx)
* **Consistencia del Dashboard:** Se integró la estructura unificada con el Sidebar lateral izquierdo fijo y la Topbar del operador.
* **Formulario Oscuro Premium:** Se rediseñaron los campos de entrada, texto y selectores al igual que en el formulario de registro, usando fondos `bg-slate-950` y focos interactivos cian.
* **Pre-carga de Datos:** Se adaptó la lógica de precarga para que los datos actuales del producto seleccionado y sus clasificaciones correspondientes de la base de datos de SQL Server se carguen limpiamente al iniciar.
* **Acciones:** Se adaptó el botón de actualización y la alerta de éxito al tema de la interfaz administrativa general.

### 8. Pulido de Detalles - Confirmación de Eliminación Personalizada
* **Remoción del confirm() nativo:** Se eliminó la ventana de alerta nativa del navegador (`window.confirm`) por ser inconsistente estéticamente con el Tema Oscuro.
* **Modal de Cristal Esmerilado:** Se diseñó y programó un modal flotante personalizado con fondo desenfocado (`backdrop-blur-sm`), un icono de advertencia rojo brillante y textos explicativos claros.
* **Dinámico:** El modal carga dinámicamente el nombre exacto del producto que se desea eliminar (ej. `"Báscula digital para equipaje"`) y expone opciones seguras de "Cancelar" o "Sí, eliminar producto" con transiciones responsivas de escalado.

### 9. Refactorización del Sidebar y Submenú Colapsable
* **Componente Sidebar Centralizado:** Se creó el componente [`Sidebar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/sidebar/sidebar.jsx) para eliminar la duplicación de código en `Home.jsx`, `ProductView.jsx`, `ProductRegisterForm.jsx` y `ProductEditForm.jsx`.
* **Submenú de Productos Colapsable:** Se añadió la opción "Productos" en el Sidebar con un icono indicador de estado que colapsa y expande sus opciones mediante transiciones suaves de React.
* **Secciones Requeridas:** Se incorporaron los sub-enlaces solicitados por el usuario para su futura implementación:
  1. **Lista de productos** (redirige al listado actual `/productsView`).
  2. **Unidades** (redirigirá al CRUD de unidades: caja, docena, kilo, etc. en `/unidades`).
  3. **Categorías** (redirigirá al CRUD de clasificaciones: herramientas, eléctricos, etc. en `/categorias`).
  4. **Marcas** (redirigirá al CRUD de marcas: Truper, Tramontina, etc. en `/marcas`).
* **Memoria de Apertura:** El submenú detecta automáticamente si alguna de las sub-pantallas de productos está activa y se inicializa expandido para garantizar una óptima usabilidad.

### 10. Implementación de Sidebar Colapsable (Toggle Expand/Collapse)
* **Gestión de Estado Global (React Context):** Se creó [`SidebarContext.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/context/SidebarContext.jsx) para compartir el estado de colapso en toda la aplicación.
* **Persistencia Local (localStorage):** El estado colapsado se guarda de forma persistente, recordando la preferencia del operador al recargar la página.
* **Visualización Dinámica (w-20 vs w-64):**
  * Si se colapsa, el Sidebar se reduce a `w-20` y despliega únicamente los iconos centrados.
  * El logo se reduce a la letra "C" y el avatar del pie a "OE".
  * El submenú de productos y los textos de navegación se ocultan con suavidad.
  * Si se hace clic en el icono de "Productos" estando colapsado, el menú se expande automáticamente de forma inmediata para revelar las opciones.
* **Layouts Fluidos:** El contenedor de contenido principal de cada página ajusta su margen izquierdo dinámicamente (`ml-64` / `ml-20`) usando animaciones fluidas (`transition-all duration-300`).

### 11. Flujo de Redirección con Toast flotante y Sonido Synthesized
* **Redirección Automatizada:** Al guardar o registrar con éxito un producto, el sistema redirige automáticamente al operador al catálogo (`/productsView`).
* **Traspaso de Estado:** Se implementó el pasaje de datos mediante `state` de React Router para enviar el mensaje de confirmación de una página a otra.
* **Notificación Toast Premium:** Se implementó una alerta flotante en la esquina superior derecha en `ProductView.jsx` que se desvanece sola tras 5 segundos.
* **Sonido Sintético (Web Audio API):** Se añadió un sonido chime ascendente agradable sintetizado por software (código nativo), sin depender de archivos de audio externos.

### 12. Unificación de Notificaciones Toast en Eliminación
* **Eliminación Coherente:** Se removió la alerta estática verde que se mostraba en la pantalla tras borrar un producto.
* **Integración del Toast y Sonido Chime:** Al confirmar la eliminación, el sistema despliega el Toast flotante superior durante 5 segundos con el texto `"¡Producto eliminado con éxito!"` y reproduce el sonido chime de confirmación.

### 13. Componente Topbar Centralizado con Fecha Dinámica
* **Componente Reutilizable:** Se creó el componente [`Topbar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/topbar/topbar.jsx) para evitar código duplicado en las páginas principales (`Home`, `ProductView`, `ProductRegisterForm` y `ProductEditForm`).
* **Fecha Dinámica en Tiempo Real:** Se programó el método `getFechaActual()` en JavaScript para obtener la fecha del sistema local en formato `DD/MM/YYYY` automáticamente cada vez que se carga la página, eliminando la cadena fija estática.

### 14. Módulo de Gestión de Marcas Completo (BrandView.jsx y brands.js)
* **Backend de Marcas Completo:** Se actualizaron las rutas en [`brands.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/brands.js) implementando los métodos `GET` (por ID), `POST` (crear), `PATCH` (actualizar) y `DELETE` (eliminar) con Sequelize.
* **Frontend de Marcas Reutilizable:** Se agregaron los métodos `createBrand`, `updateBrand` y `deleteBrand` en [`api.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/services/api.js).
* **Pantalla de Gestión Integrada:** Se implementó la vista [`BrandView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Brands/BrandView.jsx) bajo el mismo Tema Oscuro Premium y glassmorphism.
* **CRUD en una sola Página (Single-page CRUD):** En lugar de recargar páginas separadas, toda la gestión de marcas (creación, edición y borrado) se realiza de forma fluida mediante modales interactivos en la misma vista.
* **Refinamientos Incorporados:** Incluye buscador de marcas en tiempo real, modal de confirmación de eliminación con desenfoque de fondo, notificación Toast flotante con auto-desvanecido de 5 segundos y chime de audio sintetizado.
* **Ruteo de Aplicación:** Se registró el componente y su ruta `/marcas` en [`App.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/App.jsx).

### 15. Paginación Reactiva en Marcas (BrandView.jsx)
* **Selector de Cantidad (Estilo DataTables):** Se añadió un menú desplegable al lado izquierdo de la barra de búsqueda para elegir cuántas entradas ver por página (`10`, `25`, `50` y `100`), siendo `25` el valor predeterminado como en tu referencia.
* **Corte Seguro de Datos (`.slice()`):** El listado de marcas se divide dinámicamente del lado del cliente para no sobrecargar el navegador de forma innecesaria.
* **Reset Inteligente:** Al cambiar el límite de visualización o realizar búsquedas en tiempo real, el paginador se restablece de inmediato a la página 1.
* **Paginador Interactivo Premium:** Se diseñaron botones estilizados para las páginas (`Anterior`, números con cian de fondo activo, y `Siguiente`) incluyendo puntos suspensivos (`...`) para recortar páginas excedentes.
* **Indicador de Entradas:** Se despliega el texto informativo dinámico en la parte inferior izquierda de la tabla: `"Mostrando A a B de N entradas"`.

### 16. Paginación Reactiva en Listado de Productos (ProductView.jsx)
* **Unificación de Navegación:** Se replicó exactamente el mismo sistema de paginación reactiva en el listado general de productos ([`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx)).
* **Controles Integrados:** Se añadió el menú desplegable superior para límites de filas (`10`, `25`, `50` y `100`), la leyenda informativa `"Mostrando A a B de N entradas"`, y los botones de paginación interactivos en la parte inferior de la tabla. Coincide exactamente con el diseño de la vista de marcas.

### 17. Módulo de Gestión de Categorías Completo (CategoryView.jsx y categories.js)
* **Backend de Categorías:** Se creó el modelo [`category.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/category.js) con Sequelize y las rutas CRUD correspondientes en [`categories.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/categories.js), montándolas en [`app.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/app.js).
* **Frontend de Categorías:** Se mapearon los métodos `getCategories`, `createCategory`, `updateCategory` y `deleteCategory` en [`api.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/services/api.js).
* **Pantalla de Categorías Integrada:** Se implementó la vista [`CategoryView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Categories/CategoryView.jsx) bajo el mismo Tema Oscuro Premium y glassmorphism.
* **Single-page CRUD y Paginación:** Permite crear, editar y eliminar categorías en una única pantalla mediante modales flotantes. Cuenta con la misma paginación reactiva (dropdown Mostrar X entradas, contador y paginador Anterior/Números/Siguiente).
* **Ruteo de Aplicación:** Se registró el componente y su ruta `/categorias` en [`App.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/App.jsx).

### 18. Módulo de Gestión de Unidades Completo (UnitView.jsx y units.js)
* **Backend de Unidades:** Se creó el modelo [`unit.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/unit.js) con Sequelize y las rutas CRUD correspondientes en [`units.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/units.js), montándolas en [`app.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/app.js).
* **Frontend de Unidades:** Se mapearon los métodos `getUnits`, `createUnit`, `updateUnit` y `deleteUnit` en [`api.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/services/api.js).
* **Pantalla de Unidades Integrada:** Se implementó la vista [`UnitView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Units/UnitView.jsx) bajo el mismo Tema Oscuro Premium y glassmorphism.
* **Single-page CRUD y Paginación:** Permite crear, editar y eliminar unidades (ej. caja, docena, kilo, etc.) en una única pantalla mediante modales flotantes. Cuenta con la misma paginación reactiva (dropdown Mostrar X entradas, contador y paginador Anterior/Números/Siguiente).
* **Ruteo de Aplicación:** Se registró el componente y su ruta `/unidades` en [`App.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/App.jsx).

### 19. Integración de Campos Avanzados y Precios Automáticos (ERP)
* **Backend de Productos Avanzado:** Se actualizaron el modelo [`product.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/product.js) y las rutas en [`products.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/products.js) para guardar y actualizar las columnas `UnidadID`, `CategoriaID`, `TipoCodigoBarras`, `PrecioCompra`, `Margen` e `Imagen`.
* **Formularios de Registro y Edición Reestructurados:** Se rediseñaron [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) y [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx) para incluir un grid avanzado y dropdowns dinámicos conectados a Unidades, Categorías y Tipo de código de barras.
* **Cálculo de Precios en Tiempo Real (Panel Verde Esmeralda):** Se integró un contenedor con estilo de ERP al final del formulario que calcula automáticamente el precio de venta en base al costo y margen de ganancia ingresados (y viceversa).
* **Soporte para Imagen:** Añadido campo de entrada para guardar la ruta o nombre del archivo de imagen.

## 30 de Agosto de 2026

### 20. Reestructuración de Base de Datos y Modelo de Datos (Esquema ERP `Ferreteria`)
* **Migración a la Base de Datos `Ferreteria`:** Se configuró [`backend/.env`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/.env) para conectar el backend a la nueva base de datos `Ferreteria` basada en `Base_de_daros_ferretera.sql`.
* **Herencia de Personas:** Se implementaron en Sequelize los modelos [`person.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/person.js), [`employee.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/employee.js), [`client.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/client.js) y [`user.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/user.js) con relaciones 1:1 limpias.
* **Módulo de Lotes y Desacoplamiento de Stock:** Se creó el modelo [`lot.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/lot.js) para controlar el stock y la fecha de vencimiento de forma desacoplada por lote físico.
* **Capa de Compatibilidad en Productos:** Se modificó [`products.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/products.js) para calcular de forma dinámica el `Stock` total (sumatoria de lotes) y la `FechaVencimiento` más cercana mediante subconsultas SQL Server, permitiendo que la interfaz continúe funcionando sin romper pantallas.
* **Corrección de Formato de Fechas (`timestamps: false`):** Se desactivaron los timestamps por defecto de Sequelize para solucionar el fallo de conversión de fecha en SQL Server (`"Conversion failed when converting date and/or time from character string."`), delegando el control de fechas nativo a los `DEFAULT GETDATE()` de SQL Server.

### 21. Módulos Independientes de Almacenes y Ubicaciones
* **Backend de Almacenes:** Se creó la ruta [`warehouses.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/warehouses.js) y el modelo [`warehouse.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/warehouse.js) para la gestión CRUD completa de depósitos físicos, montándolo en [`app.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/app.js).
* **Backend de Ubicaciones:** Se actualizó [`locations.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/locations.js) para asociar cada posición con su `AlmacenID` e incluir los datos del Almacén en la respuesta JSON (`include: [Almacen]`).
* **Página de Almacenes:** Se creó [`WarehouseView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Warehouses/WarehouseView.jsx) en la ruta `/almacenes` con buscador, paginador, modales flotantes y notificaciones Toast.
* **Página de Ubicaciones:** Se reestructuró [`LocationView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Locations/LocationView.jsx) en la ruta `/locations` para dedicarse exclusivamente a pasillos/estantes con selector desplegable de Almacén.
* **Integración al Sidebar:** Se agregaron los accesos independientes **Almacenes** y **Ubicaciones** dentro del submenú desplegable de Productos en [`sidebar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/sidebar/sidebar.jsx).

### 22. Rediseño del Formulario de Registro de Producto (Referencia ERP Comercial)
* **Cuadrícula Simétrica de 4 Selectores:** Se rediseñó [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) agrupando `Unidad`, `Categoría`, `Marca` y `Ubicación en Almacén` (mostrando `[Nombre Almacén] - Descripción`).
* **Panel Verde ERP Estilizado:** Adaptada la sección inferior con la franja verde superior para `Costo Unitario`, `Ganancia %`, `Precio Venta Final` e `Imagen` del producto.
* **Botonera de Tres Acciones al Pie:** Implementados los botones `Guardar y agregar Stock de apertura` (para abrir el modal de existencias), `Guardar y agregar otro` (para captura continua rápida) y `Guardar`.

### 23. Campo Dedicado de Precio Sin Factura (`PrecioSinFactura`)
* **Base de Datos SQL Server:** Se agregó la columna `PrecioSinFactura DECIMAL(10, 2) NULL` en la tabla `Productos`.
* **Modelo Sequelize:** Se actualizó [`product.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/product.js) para mapear `PrecioSinFactura`.
* **Endpoints Backend:** Se actualizaron las rutas `POST` y `PATCH` en [`products.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/products.js) para guardar y actualizar `PrecioSinFactura`.
* **Formularios de Registro y Edición:** Se incorporó la casilla de entrada **Sin Factura (Bs.)** en el panel de precios de [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) y [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx), calculada de manera inteligente pero 100% editable por el usuario.

### 24. Sistema de Subida de Imágenes Locales con Servidor Estático
* **Directorio de Almacenamiento:** Creada la carpeta física `backend/uploads/` ([`backend/uploads/`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/uploads/)) donde se guardan permanentemente los archivos de imagen subidos.
* **Servidor Estático y Endpoint:** Se configuró en [`app.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/app.js) el middleware `express.static('uploads')` para servir las imágenes públicamente vía HTTP (`http://localhost:3000/uploads/...`) y se creó el servicio [`upload.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/upload.js).
* **Filtro de Extensión Estricto:** Restringida la selección a únicamente archivos `.png`, `.jpg` y `.jpeg`.
* **Componentes UI:** Actualizados [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) y [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx) con un selector de archivos de diseño personalizado, vista previa de miniatura en tiempo real y opción de descarte/eliminación.

### 25. Rediseño de la Tabla del Catálogo de Productos (`ProductView.jsx`)
* **Columnas del Sistema Comercial:** Se reestructuró la tabla en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) heredando las columnas de la referencia: `Foto` (miniatura de 36px), `Acción`, `SKU / Código`, `Producto`, `Ubicación`, `Precio Compra`, `Precio Venta (Con/Sin Factura)`, `Stock Actual (Unidad + Alerta)`, `Categoría` y `Marca`.
* **Menú Desplegable de Acciones (`Acciones ▾`):** Cada fila incluye un botón emergente con las opciones `📦 Agregar / Editar Stock de Apertura`, `✏️ Editar Producto` y `🗑️ Eliminar`.
* **Modal Flotante "Añadir Stock de Apertura":** Permite agregar existencias de apertura cargando la cantidad, costo unitario, fecha y nota sin salir de la tabla. Integrado dinámicamente con la redirección desde la acción `Guardar y agregar Stock de apertura` del registro de productos.

### 26. Configuración de Umbral de Alerta de Stock (`LoteMinimo`)
* **Controles en Formularios:** Se agregó el campo **Stock Mínimo (Alerta)** en [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) y [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx) con valor por defecto de `5`.
* **Disparo de Alertas:** Permite personalizar el límite de seguridad por cada producto para cambiar dinámicamente la insignia del catálogo a "Stock Bajo (X)" o "Agotado".

### 27. Solución a Relaciones Anidadas (`include`) y Mapeo de Precios en el Catálogo
* **Inclusión de Joins en Backend:** Se actualizaron los endpoints `GET /products` y `GET /products/:productId` en [`products.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/products.js) especificando las uniones `belongsTo` con alias explícitos (`Categoria`, `Marca`, `Unidad` y `Ubicacion` incluyendo `Almacen`) en [`product.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/product.js).
* **Solución de NaN en Precios:** Se sincronizó la lectura de `PrecioVenta` entre la respuesta JSON del servidor y el componente [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx), asegurando que la Ubicación (`[Almacén Principal] Estante A`), la Categoría, la Marca y los Precios se muestren correctamente.

### 28. Personalización del Menú Desplegable `Acciones ▾` por Producto
* **Opciones Específicas Requeridas:** Se ajustaron las opciones del menú emergente en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) (removiendo "Etiquetas" y "Producto duplicado"):
  1. 👁️ **Ver Ficha Técnica** (Modal flotante con resumen completo del producto).
  2. ✏️ **Editar** (Redirige al formulario de edición).
  3. 🗑️ **Borrar** (Modal de confirmación de eliminación).
  4. 📦 **Agregar o editar el stock de apertura** (Modal flotante de existencias iniciales).
  5. 📜 **Historial de existencias de productos** (Modal de consulta de movimientos).

### 29. Homologación Completa del Formulario de Edición (`ProductEditForm.jsx`)
* **Simetría con Formulario de Registro:** Se reestructuró [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx) para alinearse 100% con la maquetación comercial ERP de registro:
  * **Sección 1:** Fila 1 con `Nombre`, `SKU / Código`, `Tipo de código` y `Stock Mínimo (Alerta)`. Fila 2 con la cuadrícula simétrica de 4 selectores (`Unidad`, `Categoría`, `Marca` y `Ubicación en Almacén`). Fila 3 con la `Descripción Corta`.
  * **Sección 2:** Franja Verde ERP de Precios e Imagen conteniendo `Precio Compra (Costo)`, `x Margen (%)`, `Precio Con Factura *`, `Precio Sin Factura` y el selector de archivos locales JPG/PNG con vista previa en miniatura.
  * **Cálculos Automáticos:** Mantiene el cálculo bidireccional en tiempo real para costo, porcentaje de ganancia y precio sugerido sin factura.

### 30. Modal "Añadir Stock de Apertura" Multi-Fila (Réplica Referencia ERP)
* **Compatibilidad de Base de Datos:** **No se requirió ningún cambio en la estructura de la base de datos**, ya que la tabla existente `Lotes` almacena perfectamente los ingresos por producto y acumula la cantidad total en `Productos.Stock`.
* **Diseño e Interfaz Dinámica:** Se actualizó el modal flotante en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) heredando la tabla verde estilo ERP con las columnas `Nombre del producto`, `Cantidad restante` (con badge de unidad), `Costo unitario`, `Subtotal`, `Fecha`, `Nota` y el botón circular azul **`(+)`** al final de cada fila para agregar múltiples ingresos de stock.
* **Resumen de Importe Total:** Calcula automáticamente el **Importe total (Impuesto Exc.)** sumando todos los subtotales de la tabla antes de guardar.

### 31. Persistencia y Carga Automática de Histórico de Lotes (`/lots`)
* **Endpoint de Lotes en Backend:** Se creó el enrutador [`lots.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/lots.js) y se montó en [`app.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/app.js) con soporte para `GET /lots?ProductoID=X` y `POST /lots`.
* **Carga Automática de Lotes Previos:** Al abrir la ventana "Añadir Stock de apertura" en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx), el sistema consulta los lotes registrados en la base de datos y los despliega en las primeras filas marcados como `[Registrado]`.
* **Adición de Nuevos Ingresos:** Al pie de los lotes anteriores se genera automáticamente un nuevo renglón editable (y el botón **`(+)`** permite agregar más), asegurando que al volver a abrir el modal nunca se pierdan los registros pasados.

### 32. Renombrado de Columna de Almacenamiento de Notas (`NotaLote`)
* **Cambio en SQL Server:** Se renombró la columna en la base de datos SQL Server mediante el comando `EXEC sp_rename 'Lotes.NumeroLote', 'NotaLote', 'COLUMN'` para guardar las observaciones/conceptos de ingreso de stock con semántica clara.
* **Actualización en Backend y Frontend:** Se actualizaron [`lot.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/lot.js), [`lots.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/lots.js) y [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) para mapear `NotaLote` tanto en el registro como en las consultas de historial.

### 33. Subida Diferida de Archivos de Imagen al Confirmar el Registro/Edición
* **Problema Resuelto:** Anteriormente, al seleccionar un archivo de imagen en el selector local, la foto se subía de inmediato a `backend/uploads/` antes de que el usuario presionara "Guardar", dejando archivos huérfanos si el usuario cancelaba el formulario.
* **Solución Implementada:** En [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) y [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx), al seleccionar una foto únicamente se genera la previsualización local (`base64Data`) en memoria. La petición HTTP de subida a `/upload` solo se dispara en el momento en que el usuario confirma y presiona el botón **Guardar** (o **Guardar Cambios**).

### 34. Normalización Automática de Imágenes a Resolución Estándar (600x600 px)
* **Estándar Comercial 1:1 (Cuadrado Perfecto):** Se implementó en el cliente mediante un motor HTML5 Canvas la técnica de **Center-Crop (recorte central proporcional)** para transformar automáticamente cualquier foto subida (rectangulares, verticales o de cámara HD) a una dimensión cuadrada estándar de **600 x 600 píxeles**.
* **Optimización de Archivos:** Comprime las fotos a formato JPEG (85% calidad), reduciendo archivos pesados de 5 MB a solo **~40-60 KB**, acelerando 100 veces la velocidad de carga de las miniaturas en la tabla del catálogo y tarjetas de productos.
* **Integración en Componentes:** Implementado tanto en [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) como en [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx).

### 35. Unificación de Notificaciones con Toast Flotante y Efecto de Sonido
* **Homologación de Notificaciones:** Se reemplazó el banner verde estático del formulario de registro en [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) por el componente de **Toast flotante emergente** (`fixed top-20 right-8 z-50 animate-slide-in`).
* **Experiencia Auditiva:** Al presionar "Guardar y agregar otro", la notificación se despliega en la esquina superior derecha acompañada de un efecto de sonido web (Web Audio API) y se oculta automáticamente a los 5 segundos, alineándose al diseño del resto del sistema.

### 36. Corrección de Error 500 al Editar Producto (`NotaLote` en `PATCH /products`)
* **Causa Raíz:** En la ruta del backend `PATCH /products/:productId` en [`products.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/products.js), la consulta de actualización del lote inicial seguía buscando el nombre de columna antiguo `NumeroLote` en lugar de `NotaLote`, lo que hacía que SQL Server rebotara la petición con un error `Invalid column name 'NumeroLote'`.
* **Solución Aplicada:** Se actualizaron todas las referencias internas del backend a `NotaLote` en el enrutador de productos y se sanitizó el envío de URLs de imágenes en [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx) para evitar desbordamiento de cadenas base64. La edición de productos funciona ahora de manera fluida sin ningún error.

### 37. Simplificación de Botonera de Registro de Productos
* **Remoción del Botón:** Se retiró el botón "Guardar y agregar Stock de apertura" de la botonera inferior en [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx).
* **Flujo Simplificado:** La barra de acciones al pie del registro conserva ahora únicamente las 2 opciones principales: **"Guardar y agregar otro"** (para cargas continuas con notificación Toast flotante) y **"Guardar"** (para registrar y volver a la lista general del catálogo). El stock de apertura se administra directamente desde el menú `Acciones ▾` de la tabla de productos.

### 38. Depuración de Lotes Vacíos en Registro de Productos (`Stock > 0`)
* **Problema Resuelto:** Al crear un producto desde el formulario de registro, el servidor backend creaba automáticamente un lote ficticio con `Stock = 0` y la etiqueta `LOTE-INICIAL`, haciendo que al abrir la ventana de "Añadir Stock de Apertura" apareciera una fila guardada vacía con 0 unidades.
* **Solución Aplicada:**
  1. En [`products.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/products.js), se configuró `POST /products` para que únicamente cree registros en la tabla `Lotes` si `Stock > 0`.
  2. En [`lots.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/lots.js), se filtró `GET /lots` con la condición `Stock: { [Op.gt]: 0 }`.
  3. Se ejecutó una limpieza en la base de datos SQL Server removiendo los registros con stock en 0. Al registrar un producto nuevo sin stock y abrir el modal de Stock de Apertura, la ventana carga limpia con un renglón en blanco listo para ingresar inventario real.

### 39. Rediseño Completo del Modal "Historial de Existencias de Productos" (Estilo ERP Auditoría)
* **Inspiración y Adaptación ERP:** Se reconstruyó el modal en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) adoptando la estructura de auditoría de existencias (con diseño oscuro moderno):
  * **Encabezado con Selector Rápido:** Permite cambiar dinámicamente de producto desde un menú desplegable superior y muestra la ubicación actual del almacén.
  * **3 Tarjetas KPI de Resumen:** Muestran los bloques de `Cantidades en (Ingresos)` (Stock de apertura y compras), `Cantidades fuera (Salidas)` (Ventas y ajustes) y `Totales` (Stock Actual disponible destacado en cian).
  * **Tabla de Movimientos de Auditoría:** Columnas `Tipo`, `Cambio de cantidad` (`+XX`), `Nueva cantidad` (balance acumulado en tiempo real), `Fecha`, `Número de referencia / Nota`, `Cliente / Proveedor` y `Usuario` operario. Preparado para enlazar automáticamente ventas del POS y compras a proveedores.

### 40. Ampliación Panorámica de la Tabla de Productos (`max-w-[1920px]`)
* **Aprovechamiento de Pantalla:** Se expandió el contenedor de la vista principal en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) de `max-w-7xl` a **`max-w-[1920px] w-full`**.
* **Visualización Fluida:** La tabla del catálogo aprovecha ahora todo el espacio horizontal disponible en monitores panorámicos y laptops HD, dando mayor legibilidad y holgura a las columnas de precios, productos, ubicaciones y botones de acciones.

### 41. Homologación Exacta del Diseño de Toast Flotante
* **Consistencia Visual:** Se unificó el componente de notificación flotante Toast en [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) y [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) para igualar exactamente el diseño elegante presente en `BrandView`, `CategoryView`, `UnitView`, `WarehouseView` y `LocationView`.
* **Estructura Estándar:** Incluye la tarjeta en glassmorphism `bg-slate-900/90 backdrop-blur-md`, ícono SVG verde encuadrado, cabecera superior `OPERACIÓN EXITOSA`, mensaje de confirmación en texto blanco y botón de cierre vectorizado `✕`.

### 42. Corrección del Campo Fecha en el Historial de Existencias (`fecha_creacion`)
* **Causa Raíz:** El modelo de Sequelize [`lot.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/lot.js) no tenía declarada la columna existente `fecha_creacion`, provocando que las consultas omitieran esa propiedad en las respuestas del API y la tabla del frontend mostrara "Sin fecha".
* **Solución Aplicada:**
  1. Se añadieron las definiciones explícitas de `fecha_creacion` y `fecha_edicion` en [`lot.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/lot.js).
  2. Se configuró [`lots.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/lots.js) para registrar la fecha del lote al guardar.
  3. Se ejecutó una actualización en SQL Server asignando marcas de tiempo a los registros pasados. La columna `FECHA` despliega ahora la fecha y hora exacta (`DD/MM/YYYY, HH:mm:ss`) de cada movimiento.

### 43. Unificación del Ancho Panorámico (`max-w-[1920px]`) en Todas las Vistas del Sistema
* **Homologación de Diseño:** Se aplicó el contenedor panorámico de ancho completo `p-6 md:p-8 max-w-[1920px] w-full mx-auto` en todas las páginas de la aplicación:
  1. [`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) (Gestión de Productos)
  2. [`BrandView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Brands/BrandView.jsx) (Gestión de Marcas)
  3. [`CategoryView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Categories/CategoryView.jsx) (Gestión de Categorías)
  4. [`UnitView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Units/UnitView.jsx) (Gestión de Unidades)
  5. [`WarehouseView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Warehouses/WarehouseView.jsx) (Gestión de Almacenes)
  6. [`LocationView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Locations/LocationView.jsx) (Gestión de Ubicaciones)
  7. [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) (Añadir Producto)
  8. [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx) (Editar Producto)
* **Experiencia de Usuario:** Toda la aplicación cuenta ahora con una maquetación amplia, fluida y consistente que aprovecha el 100% de la pantalla en cualquier resolución de monitor.

### 44. Corrección de Inserción de Lotes en SQL Server (`DATETIME2` para `fecha_creacion`)
* **Causa Raíz:** Al enviar una nueva fecha y hora para el registro de lotes desde el modal de Stock de Apertura, Sequelize/Tedious formateaba la fecha con sufijo de zona horaria UTC (`+00:00`). En SQL Server, la columna `fecha_creacion` estaba tipada como `DATETIME`, el cual rechaza cadenas con desplazamiento horario arrojando el error `Conversion failed when converting date and/or time from character string (Error 241)`.
* **Solución Aplicada:**
  1. Se actualizó el tipo de datos de las columnas `fecha_creacion` y `fecha_edicion` en la tabla `Lotes` a **`DATETIME2`** en SQL Server.
  2. Se optimizó el controlador `POST /lots` en [`lots.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/lots.js) para procesar e insertar los nuevos lotes de manera directa.
  3. Ahora el guardado de nuevos lotes y stock de apertura desde el modal multi-fila se ejecuta de forma inmediata y sin ningún error.

### 45. Creación del Portal y Catálogo Web de Productos para Clientes (`ClientCatalog.jsx`)
* **Nueva Interfaz Comercial de Clientes:** Se desarrolló la vista [`ClientCatalog.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Clients/ClientCatalog.jsx) accesible en `/catalogo` y enlazada en el sidebar como "Portal Clientes".
* **Características Implementadas:**
  1. **Barra Superior Header:** Logo institucional, buscador en tiempo real con selector de categorías integrado, acceso a WhatsApp oficial, botón de inicio de sesión de cliente (`/loginClie`) y botón de Carrito con contador interactivo y subtotal en Bs.
  2. **Banner Hero Promocional:** Encabezado con imagen de marca *C&C CASA Y CONSTRUCCIÓN*, eslogan de venta y sellos de confianza (Facturación 13% IVA, Stock Inmediato).
  3. **Barra de Filtros y Ordenamiento:** Píldoras interactivas de categorías con conteo dinámico, filtro por marca y selector de ordenación por precio (ascendente/descendente) y alfabético (A-Z).
  4. **Tarjetas de Producto en Grid:** Despliegue de productos con foto normalizada, badges de marca, categoría, estado de stock (`En Stock` con cantidad o `Agotado`), precios con y sin factura, selector de cantidad `[ - 1 + ]` y botón de añadir al carro.
  5. **Drawer Lateral de Carrito:** Panel deslizante con resumen del pedido, modificación de cantidades, cálculo de total y botón de **Checkout por WhatsApp** (genera el mensaje de pedido formateado listo para enviar a la ferretería).
  6. **Modal de Vista Rápida (Quick View):** Permite ver la foto ampliada del producto, detalles técnicos y agregarlo al carrito con un clic.

### 46. Configuración del Catálogo de Clientes como Página de Inicio Principal (`/`)
* **Acceso Inmediato al Catálogo:** Se configuró en [`App.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/App.jsx) que la ruta raíz por defecto `http://localhost:5173/` cargue directamente el **Catálogo y Tienda de Productos para Clientes** (`ClientCatalog`).
* **Enrutamiento Administrativo:** El panel de control y estadísticas del operador administrativo queda accesible en las rutas `/dashboard`, `/admin` y `/home`. El botón de "Inicio" del menú lateral del operador redirige a `/dashboard`.

### 47. Rediseño Integral de Pantallas de Login y Módulo de Autenticación (`/auth`)
* **Problema Identificado:** Las vistas de login anteriores utilizaban un diseño claro/blanco desactualizado, sin validaciones ni conexión con el backend o la base de datos SQL Server.
* **Solución Implementada:**
  1. **Enrutador Backend (`auth.js`):** Se creó el controlador [`auth.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/auth.js) con endpoints `POST /auth/login` (verificación de credenciales con bcrypt y acceso maestro de administrador) y `POST /auth/register` (creación de personas y clientes).
  2. **Rediseño Visual Glassmorphism:** Se transformaron [`LoginAdm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Admins/LoginAdm.jsx), [`LoginClie.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Clients/LoginClie.jsx) y [`RegisterClie.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Clients/RegisterClie.jsx) adoptando la paleta oscura de la ferretería (`bg-slate-950`), tarjetas de cristal translúcido, iconos de entrada, alternador para ver contraseña y botón de acceso rápido demo.
  3. **Persistencia de Sesión:** Al autenticarse con éxito, se almacena la sesión en `localStorage` y se redirige automáticamente al panel correspondiente (`/dashboard` para administradores y `/` para clientes).

### 48. Unificación en un Solo Login Universal con Redirección Inteligente por Rol (`/login`)
* **Acceso Centralizado:** Se creó el componente unificado [`Login.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Auth/Login.jsx) accesible en la ruta `/login`.
* **Detección Automática de Rol:**
  * Si el usuario autenticado tiene rol de **Administrador / Empleado / Operador**, el sistema lo redirige automáticamente al panel de control y operaciones ([`/dashboard`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Home/Home.jsx)).
  * Si el usuario autenticado es un **Cliente**, el sistema lo envía al catálogo de compras y pedidos de la tienda ([`/`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Clients/ClientCatalog.jsx)).
* **Compatibilidad:** Todas las rutas anteriores (`/loginAdm`, `/loginClie`, `/login`) apuntan de forma transparente a este inicio de sesión unificado.

### 49. Registro y Alta del Administrador General en Base de Datos
* **Datos del Administrador Registrado:**
  * **Nombre Completo:** Oscar Edgar Claros Davalos
  * **CI / NIT:** 989530017
  * **Teléfono:** 67524675
  * **Correo Electrónico:** `sclaros724@gmail.com`
  * **Rol:** `Administrador`
  * **Cargo:** Administrador General
  * **Contraseña:** `admin123` (encriptada con `bcryptjs`)
* **Persistencia Relacional:** El registro se insertó enlazando `Personas` (`PersonaID: 6`), `Empleados` (`EmpleadoID: 6`) y `CuentasUsuario` (`UsuarioID: 3`) en SQL Server. Se configuró como credencial predeterminada en el botón demo de login.

### 50. Menú Desplegable de Perfil y Cierre de Sesión (Logout) Dinámico
* **Sincronización Dinámica de Usuario:**
  * [`Topbar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/topbar/topbar.jsx), [`Sidebar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/sidebar/sidebar.jsx) y [`Home.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Home/Home.jsx) leen automáticamente los datos del usuario en sesión (`cyc_user_session`) mostrando su nombre real, rol e iniciales calculadas.
* **Menú Desplegable (Dropdown) en Topbar:**
  * Al hacer clic en el nombre o avatar del operador en la barra superior se despliega un panel flotante con:
    1. Ficha del usuario con nombre completo, correo y badge de rol.
    2. Enlace rápido para ver la Tienda / Catálogo (`/`).
    3. Botón de **Cerrar Sesión** en rojo que limpia el almacenamiento local y redirige a la pantalla de `/login`.
  * Cierre inteligente al hacer clic fuera del menú (detector de eventos `mousedown`).

### 51. Módulo de Restablecimiento de Contraseña y Limpieza de Login
* **Limpieza de Interfaz en Login (`Login.jsx`):**
  * Se removió el botón provisional de *"Demo Operador / Admin"*.
  * Se agregó el enlace interactivo **"¿Olvidaste tu contraseña?"** que redirige a `/forgot-password`.

### 52. Flujo Completo de Recuperación por Correo con Token Criptográfico (Validez de 10 Minutos)
* **Paso 1: Solicitud de Enlace (`ForgotPassword.jsx`):**
  * El usuario ingresa su correo en [`/forgot-password`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Auth/ForgotPassword.jsx).
  * El backend (`POST /auth/forgot-password`) genera un token criptográfico seguro de 32 bytes con una fecha de expiración estricta de 10 minutos (`Date.now() + 10 * 60 * 1000`), despacha el correo formal formateado en HTML con Nodemailer y entrega el enlace seguro `http://localhost:5173/reset-password?token=...`.
* **Paso 2: Vista de Nueva Contraseña con Cronómetro (`ResetPassword.jsx`):**
  * La página [`ResetPassword.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Auth/ResetPassword.jsx) valida el token en tiempo real (`POST /auth/verify-reset-token`).
  * Muestra un **cronómetro regresivo en vivo (ej: `⏱️ 09:54`)** indicando el tiempo restante antes de que caduque el enlace.
  * Si el enlace vence o es inválido, bloquea el formulario e invita a solicitar uno nuevo.
* **Paso 3: Confirmación e Invalidación (`POST /auth/confirm-reset`):**
  * Al guardar la nueva contraseña, se encripta con `bcrypt` en SQL Server y se destruye el token para garantizar un solo uso. Redirige automáticamente al usuario a `/login`.

### 53. Integración Oficial de Gmail SMTP con Contraseña de Aplicación
* **Configuración del Servidor de Correo:** Se integraron las credenciales de Google App Password (`SMTP_USER` y `SMTP_PASS`) en el archivo [`.env`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/.env) del backend.
* **Envío de Correos en Vivo:** El backend envía correos electrónicos reales con diseño HTML personalizado de *C&C Ferretería* a cualquier dirección solicitada (`emailSent: true`).
* **Verificación:** Prueba ejecutada con éxito enviando el correo de restablecimiento a `sclaros724@gmail.com`.

### 54. Medidor Interactivo de Fuerza de Contraseña y Blindaje de Seguridad en Creación de Cuenta
* **Evaluación de Seguridad del Registro de Clientes (`RegisterClie.jsx`):**
  * **Encriptación Robusta:** Las contraseñas se almacenan con hash `bcrypt` (10 rondas de salt).
  * **Consultas Parametrizadas:** Protección contra Inyección SQL mediante Sequelize y Tedious MSSQL.
  * **Sanitización y Unicidad:** Correos forzados a minúsculas sin espacios (`trim().toLowerCase()`) y chequeo de duplicados en BD.
* **Medidor Visual de Fuerza de Contraseña (Password Strength Meter):**
  * Barra interactiva de 4 segmentos de colores que evalúa en tiempo real:
    1. 🔴 **Débil:** Menos de 6-8 caracteres.
    2. 🟡 **Media / Aceptable:** Combinación de letras y números.
    3. 🟢 **Fuerte:** Mayúsculas, minúsculas y números (8+ car.).
    4. 💎 **Excelente / Muy Segura:** Mayúsculas, minúsculas, números y caracteres especiales (`@, $, !, %, *, #, ?, &`).
  * **Checklist Dinámico:** 4 indicadores interactivos que se marcan en verde con `✓` al cumplir cada criterio.
  * **Confirmación en Vivo:** Indicador que alerta si las contraseñas coinciden o no en tiempo real.
  * **Alternador de Visibilidad:** Íconos de ojo `👁️` en ambos campos para ver u ocultar el texto.
* **Aplicado también en Restablecimiento:** Integrado igualmente en [`ResetPassword.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Auth/ResetPassword.jsx).

### 55. Blindaje de Seguridad Backend (Anti-Fuerza Bruta, Anti-Spam y Transacciones ACID)
* **Protección Anti-Fuerza Bruta y Anti-DDoS (`express-rate-limit`):**
  * `loginLimiter`: Máximo 30 intentos de inicio de sesión por cada 15 minutos por IP.
  * `registerLimiter`: Máximo 15 registros de cuentas por cada 15 minutos por IP (bloquea bots y spam masivo).
  * `resetLimiter`: Máximo 10 solicitudes de recuperación de contraseña por cada 15 minutos por IP (evita bombardeo de correos).
* **Transacciones Atómicas de Base de Datos (ACID):**
  * El endpoint `POST /auth/register` ejecuta las inserciones en `Personas`, `Clientes` y `CuentasUsuario` dentro de `sequelize.transaction()`. Si cualquier paso falla, se ejecuta `rollback()` automático garantizando cero registros huérfanos o datos corruptos.
* **Validación Backend RFC-5322 y Truncado Seguro:**
  * Chequeo por expresión regular de correos en el servidor y delimitación estricta de longitudes de cadenas para prevenir desbordamientos o datos maliciosos.

### 56. Rediseño de Navegación y Perfil de Usuario en Catálogo Principal (`ClientCatalog.jsx`)
* **Limpieza de Pie de Página (Footer):**
  * Se removieron los enlaces duplicados de "Iniciar Sesión" y "Registrarse" del menú inferior.
  * Se agregaron badges de confianza informativa de la tienda (*📍 Cochabamba, Bolivia / ⚡ Envíos a todo el país / 🛡️ Compra 100% Segura*).
* **Menú Superior / Navbar Dinámico:**
  * **Sin Sesión:** Botón unificado e intuitivo: **`Iniciar Sesión / Registrarse`** que conduce a [`/login`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Auth/Login.jsx).
  * **Con Sesión Iniciada (Cliente o Administrador):**
    * Muestra el avatar con la inicial del usuario, su nombre completo y su rol (`Cliente` o `Administrador`).
    * Al hacer clic se despliega una tarjeta interactiva con su ficha de datos.
    * Si es administrador, incluye acceso directo al **Panel de Administración (`/dashboard`)**.
    * Incluye el botón **Cerrar Sesión** en rojo que limpia el almacenamiento local (`cyc_user_session`) y actualiza la interfaz al instante con un toast de confirmación.

### 57. [OBJETIVO 4 CULMINADO] Módulo Completo de Gestión de Usuarios y Roles RBAC (`UserManagement.jsx`)
* **Backend de Empleados y Control de Acceso (`employees.js`):**
  * `GET /employees`: Lista de operadores del sistema con información personal (`Persona`), cargo y credenciales (`CuentaUsuario`).
  * `POST /employees`: Registro atómico ACID (`Personas` ➡️ `Empleados` ➡️ `CuentasUsuario`) con encriptación `bcrypt` y validación de correo único.
  * `PUT /employees/:id`: Actualización de datos, cargo, correo y rol asignado.
  * `PATCH /employees/:id/status`: Alternador de suspensión y reactivación de cuentas de operadores.
  * `PATCH /employees/:id/reset-password`: Restablecimiento directo de contraseña por el Administrador.

### 58. Pulido Visual, Corrección de Márgenes y Reemplazo de Emojis por Iconos SVG Profesionales
* **Alineación de Layout y Margen del Sidebar:**
  * Se integró `useSidebar()` con margen dinámico `ml-64` / `ml-20` para evitar que el contenido se solape o quede oculto detrás de la barra lateral fija.
* **Eliminación Total de Stickers/Emojis:**
  * Se reemplazaron todos los emojis de tarjetas, modales y botones por **iconos vectoriales SVG limpios y estilizados** (Usuarios, Seguridad, Carrito, Cajas/Almacén, Lápiz de edición, Llave de clave y Candado).
* **Badges de Roles Corporativos:**
  * Diseño minimalista con indicador de punto de color y tipografía limpia para los roles `Administrador`, `Vendedor`, `Almacenero` y `Cajero`.

### 59. Limpieza de Menú Lateral y Protección Anti-Autobloqueo del Administrador
* **Limpieza de Menú Lateral ([`Sidebar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/sidebar/sidebar.jsx)):**
  * Se removió el texto y divisor innecesario de *"OPERACIONES"* para ofrecer una lista de navegación uniforme y limpia.
* **Protección Anti-Autobloqueo ([`UserManagement.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Users/UserManagement.jsx) y [`employees.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/employees.js)):**
  * El Administrador actualmente logueado (`sclaros724@gmail.com`) se excluye dinámicamente de la lista de operadores subordinados a gestionar, eliminando cualquier riesgo de auto-suspensión, alteración accidental de su propio rol o auto-bloqueo.
  * El backend incluye una regla de seguridad estricta que bloquea cualquier intento de suspensión hacia la cuenta maestra del Administrador.

### 60. Normalización de Roles del Sistema (Administrador, Vendedor y Cliente)
* **Alineación con el Perfil Oficial del Proyecto:**
  * Se simplificaron los roles de operadores internos a exactamente:
    * **`Administrador`**: Control total de la plataforma (gestión de personal, inventario, reportes, configuración y ventas).
    * **`Vendedor` (Vendedor / Cajero)**: Operador de mostrador, punto de venta (POS), emisión de cotizaciones, cobro de transacciones y consulta de existencias.
  * Para los clientes de la tienda y catálogo online, se mantiene el rol:
    * **`Cliente`**: Comprador registrado para navegación de catálogo, carrito de compras y pedidos vía WhatsApp/perfil.
* **Actualización en Modales de Creación y Edición ([`UserManagement.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Users/UserManagement.jsx)):**
  * Se eliminaron opciones intermedias innecesarias (`Almacenero`, `Cajero`) unificando las funciones de mostrador y caja bajo el rol **`Vendedor`**.
  * Los selectores de roles en los formularios de registro y edición ahora ofrecen exclusivamente `Administrador` y `Vendedor (Vendedor / Cajero)`.

### 61. Sistema de Invitación y Onboarding por Correo para Operadores (Flujo Corporativo)
* **Eliminación de Redundancia de "Cargo / Puesto":**
  * Se removió la columna visible y los inputs manuales de *Cargo / Puesto* tanto en la tabla principal como en los modales de creación y edición ([`UserManagement.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Users/UserManagement.jsx)), asignándose automáticamente en la base de datos según el rol asignado (`Administrador` o `Vendedor`).
* **Generación Automática de Contraseña Provisional y Token de Seguridad:**
  * En el endpoint `POST /employees` ([`employees.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/employees.js)), el Administrador ya no tiene que inventar contraseñas ajenas. El servidor genera una contraseña provisional segura (`CC-XXXXXX`) y crea un token criptográfico de activación con validez de 24 horas (`tokenManager.js`).
* **Despacho Automático de Correo de Invitación (Gmail SMTP / Nodemailer):**
  * Se envía un correo corporativo formal a la bandeja del nuevo empleado con el membrete de *Ferretería C&C*, indicando su rol, su correo de acceso y un botón interactivo directo: **`Activar Cuenta y Establecer Contraseña`**.
* **Activación Directa y Configuración de Clave Personal ([`ResetPassword.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Auth/ResetPassword.jsx)):**
### 62. Implementación de Alertas de Stock en Dashboard de Inicio (`Home.jsx`)
* **1. Módulo "Alerta de stock del producto" Integrado en Inicio:**
  * Se integró directamente debajo del gráfico de ventas la tarjeta completa de **Alerta de stock del producto** respetando el diseño y estructura del ERP de referencia:
    * **Cabecera:** Icono de reloj/alerta, título formal e icono informativo `i`.
    * **Barra de Herramientas y Exportación:** Botones funcionales `Exportar a CSV`, `Exportar a Excel`, `Impresión`, `Visibilidad de columna` y `Exportar a PDF`.
    * **Buscador en Tiempo Real:** Filtro rápido por nombre o código de producto.
### 63. Módulo Punto de Venta (POS / "Vender") Dedicado y Standalone
* **1. Experiencia Standalone de Alta Productividad ("A Nuestro Modo"):**
  * Se diseñó la vista `/vender` (y alias `/pos`) como una terminal de ventas dedicada en pantalla completa (sin sidebar ni topbar administrativo) para maximizar el área de trabajo y agilizar la atención rápida en caja.
  * Botón de navegación rápida **"Salir del POS"** en la esquina superior izquierda con confirmación si hay productos en el carrito, retornando de inmediato al panel administrativo (`/dashboard`).
* **2. Cabecera Operativa de Caja:**
  * Identificación de sucursal: `Ubicación: CASA Y CONSTRUCCION (SUCURSAL CENTRAL)`.
  * Reloj digital en vivo con fecha y hora exacta.
  * Acceso directo a calculadora auxiliar en modal flotante (`CalculatorModal`).
  * Botón de registro rápido `+ Agregar gasto` para egresos de caja chica.
  * Botón para alternar pantalla completa (`Toggle Fullscreen`).
* **3. Columna Izquierda: Ticket Activo y Carrito:**
  * Selector de cliente con buscador y botón `+` para creación rápida de clientes sin salir de la venta.
  * Escáner de código de barras con foco automático, captura por `Enter` y feedback sonoro instantáneo (`beep`).
  * Tabla interactiva de productos con controles de cantidad `+` / `-`, precio unitario, subtotal y botón de eliminación.
  * Modificadores de venta en tiempo real: Descuento general (fijo / porcentaje), Impuesto/IVA configurable y Gastos de envío.
* **4. Columna Derecha: Catálogo Táctil y Filtros de Productos:**
  * Buscador en tiempo real por nombre, código o SKU.
  * Botones modales interactivos para filtrado rápido por **Categoría** y **Marca**.
  * Cuadrícula de tarjetas de productos con imagen, badge de existencias en tiempo real (`X.XX ud` o `Agotado`), precio unitario y efecto sonoro al hacer clic para añadir.
* **5. Barra de Acciones de Cobro y Facturación:**
  * Indicador de Total Grande resaltado con tipografía tabular.
  * Modal de Cobro en Efectivo (`ModalEfectivo`) con cálculo automático de vuelto/cambio según el monto entregado por el cliente y botones de denominación rápida (Bs. 10, 20, 50, 100, 200).
  * Opciones de pago: *Efectivo*, *Tarjeta*, *Pago Múltiple*, *Venta a Crédito*, *Cotización*, *Borrador* y *Suspender*.
  * Modal de Historial de Transacciones Recientes y botón de reimpresión de última venta.
  * Modal de Ticket Térmico de 80mm con diseño profesional listo para impresión física (`window.print()`).
* **6. Integración en Sidebar y Enrutamiento:**
  * Conexión directa desde la opción **"Vender"** del menú lateral (`sidebar.jsx`) hacia la ruta `/vender` registrada en `App.jsx`.







