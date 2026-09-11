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
  * Se integró directamente debajo del gráfico de ventas la tarjeta completa de **Alerta de stock del producto** con estructura tabular limpia y organizada en 3 columnas maestras:
    * **Producto:** Nombre comercial, código de barras/SKU y punto indicador de estado (pulso rojo para agotado y ámbar para bajo stock).
    * **Ubicación:** Identificador del almacén `[Almacén Central]` y ubicación física/estante asignado en el establecimiento.
    * **Stock Actual:** Cantidad disponible en tiempo real con unidad de medida (`X UNID (Bajo)` o `Agotado (0 UNID)`) y enlace de acceso directo a la ficha del producto.
  * **Barra de Herramientas y Exportación:** Botones funcionales `Exportar a CSV`, `Exportar a Excel`, `Impresión`, `Visibilidad de columna` y `Exportar a PDF` incluyendo la columna de ubicación.
  * **Paginador y Contador Dinámico:** Indicador en tiempo real `Mostrando 1 a X de X entradas` según el resultado del inventario.
### 63. Módulo Punto de Venta (POS / "Vender") Dedicado y Standalone
* **1. Experiencia Standalone de Alta Productividad ("A Nuestro Modo"):**
  * Se diseñó la vista `/vender` (y alias `/pos`) como una terminal de ventas dedicada en pantalla completa (sin sidebar ni topbar administrativo) para maximizar el área de trabajo y agilizar la atención rápida en caja.
  * Botón de navegación rápida **"Salir del POS"** en la esquina superior izquierda con confirmación si hay productos en el carrito, retornando de inmediato al panel administrativo (`/dashboard`).
* **2. Cabecera Operativa de Caja:**
  * Identificación de sucursal: `Ubicación: CASA Y CONSTRUCCION (SUCURSAL CENTRAL)`.
  * Reloj digital en vivo con fecha y hora exacta.
  * Acceso directo a calculadora auxiliar en modal flotante.
  * Botón para alternar pantalla completa (`Toggle Fullscreen`).
* **3. Columna Izquierda: Ticket Activo y Carrito:**
  * Selector de cliente con buscador y botón `+` para creación rápida de clientes sin salir de la venta.
  * Escáner de código de barras con foco automático, captura por `Enter` y feedback sonoro instantáneo (`beep`).
  * Tabla interactiva de productos con controles de cantidad `+` / `-`, precio unitario, subtotal y botón de eliminación.
  * Modificador ágil de **Descuento aplicado** (`-Bs.`) con ajuste directo.
* **4. Columna Derecha: Catálogo Táctil y Filtros de Productos:**
  * Buscador en tiempo real por nombre, código o SKU.
  * Botones modales interactivos para filtrado rápido por **Categoría** y **Marca**.
  * Cuadrícula de tarjetas de productos con imagen, badge de existencias en tiempo real (`X.XX ud` o `Agotado`), precio unitario y efecto sonoro al hacer clic para añadir.
* **5. Flujo Unificado de Cobro en "Efectivo" y Gestión Opcional de Factura:**
  * **Al pulsar `💵 Efectivo`:**
    * El sistema **registra la venta inmediatamente en memoria y descuenta el stock de productos en tiempo real**, reproduce el sonido de caja y limpia el ticket.
    * Al mismo tiempo, se abre automáticamente el modal **"Datos para Factura"** (exacto al ERP de referencia).
  * **Gestión Flexible dentro del Modal:**
    * **Si el cliente desea Factura:** El vendedor ingresa o revisa la Razón Social y NIT/CI, y presiona **`Facturar`**, lo cual actualiza la venta como Factura Electrónica SIAT con Crédito Fiscal (13% IVA) y abre el ticket térmico listo para imprimir (`🖨 window.print()`).
    * **Si el cliente NO desea Factura:** El vendedor simplemente hace clic en **`Cerrar`** (o `✕`), la ventana se cierra limpiamente y la transacción queda ya registrada sin ningún problema como venta rápida de mostrador (`SIN NOMBRE`).
  * **Modal de Ticket Térmico de 80mm:** Con membrete oficial, desglose de ítems, crédito fiscal, pie de página de ley SIAT e impresión física directa.
* **6. Integración en Sidebar y Enrutamiento:**
  * Conexión directa desde la opción **"Vender"** del menú lateral (`sidebar.jsx`) hacia la ruta `/vender` registrada en `App.jsx`.

### 64. Persistencia Real en Base de Datos de Ventas POS y Atribución por Empleado
* **1. Modelos y Relaciones Sequelize (`Ventas` y `DetalleVentas`):**
  * Se crearon los modelos [`sale.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/sale.js) y [`saleDetail.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/saleDetail.js) mapeados a las tablas existentes `Ventas` y `DetalleVentas` en SQL Server.
  * Relaciones configuradas: `Venta.belongsTo(Empleado)`, `Venta.belongsTo(Cliente)`, `Venta.hasMany(DetalleVenta)`, y `DetalleVenta.belongsTo(Producto)`.
* **2. Transacción Atómica ACID y Descuento Real de Stock FIFO (`sales.js`):**
  * `POST /sales`: Maneja transacciones ACID completas con Sequelize:
    * Registra la cabecera de `Venta` con el `EmpleadoID` del cajero/vendedor que atendió.
    * Registra cada `DetalleVenta` con cantidades y subtotales.
    * Descuenta el stock directamente de la tabla `Lotes` aplicando el método **FIFO** (primeros lotes por vencer / más antiguos).
    * Registra el movimiento en `MovimientosInventario` (Kardex) con tipo `SALIDA_VENTA`, stock anterior, stock nuevo, documento de referencia (`VNT-XXXXX`) y el nombre del empleado responsable en `UsuarioResponsable`.
  * `GET /sales/recent`: Endpoint para consultar las últimas 20 transacciones con detalle de productos, totales y cajero asignado.
* **3. Atribución por Empleado / Cajero en Sesión:**
  * Se vinculó el usuario autenticado desde `cyc_user_session` en `localStorage` con el `EmpleadoID` retornado por el login backend.
  * En la cabecera superior del POS se muestra en vivo el indicador del cajero activo (`👤 Atiende: Nombre del Empleado | ROL`).
  * En el modal de transacciones recientes se visualiza la etiqueta del empleado que realizó cada venta.
* **4. Integración Frontend POS (`POSView.jsx` y `api.js`):**
  * Se agregaron `createSale()` y `getRecentSales()` en `api.js`.
  * Al pulsar `💵 Efectivo`, la venta se envía asíncronamente a la base de datos, descontando permanentemente el inventario de modo que al recargar la página (`F5`) o volver a entrar, las existencias y el historial de ventas se mantienen fieles a la base de datos de SQL Server.

### 65. Rediseño del Modal de Transacciones Recientes (Estilo ERP de Referencia)
* **1. Estructura y Pestañas Superiores (`POSView.jsx`):**
  * Se implementó el modal con las 3 pestañas principales: **`✔ Final`** (con badge del total de ventas activas), **`>_ Cotización`** y **`>_ Borrador`**.
* **2. Formato de Filas y Datos:**
  * Numeración ordinal (`1.`, `2.`, `3.`, ...).
  * Código de venta e indicador de cliente / factura: `14447 ()` para ventas sin factura y `14444 (NOMBRE CLIENTE / EMPRESA)` para ventas facturadas.
  * **Fecha y Hora:** Inclusión de la fecha y hora exacta de realización (`07/09/2026 18:03`) y el cajero responsable.
  * Monto total de la transacción alineado y formateado (`78.00`).
* **3. Cuatro Botones de Acción Estilizados:**
  * **`✏️ Editar`** (Borde Cian): Visualiza el detalle y comprobante de la transacción.
  * **`🖨️ Impresión`** (Borde Cian): Abre inmediatamente el modal con el ticket térmico listo para imprimir (`window.print()`).
  * **`🗑️ Borrar`** (Borde Rojo): Identificador de transacción y estado.
  * **`📄 Facturar`** (Borde Verde): Abre el formulario de datos para factura precargado con la venta seleccionada.
* **4. Sincronización Automática con la Base de Datos:**
  * Al pulsar el botón **"🟣 Transacciones Recientes"** de la barra inferior, se realiza la consulta en tiempo real a `GET /sales/recent` para mostrar las ventas registradas en la base de datos de SQL Server.

### 66. Edición Rápida de Ventas desde Transacciones Recientes (`POSView.jsx`)
* **1. Carga de la Transacción al Ticket Activo:**
  * Al pulsar el botón **`✏️ Editar`** en cualquier venta del modal de Transacciones Recientes:
    * Se cierra el modal automáticamente.
    * Se precargan al ticket izquierdo todos los productos, cantidades, precios unitarios y subtotales de dicha venta.
    * Se selecciona automáticamente el cliente o razón social correspondiente.
* **2. Encabezado de Edición (`Recibo no.: XXXXX`):**
  * En la parte superior del panel de cobro se muestra la insignia destacada: **`Recibo no.: 14444`** junto a un botón para `✕ Cancelar edición`.
### 67. Ajuste Diferencial y Reversión Automática de Inventario en Edición de Ventas
* **1. Reversión y Re-aplicación en Transacción ACID (`PUT /sales/:id`):**
  * Al modificar una venta existente:
    * Se recuperan los detalles originales de la venta y se devuelven las unidades previas a sus respectivos `Lotes` con registro en Kardex (`AJUSTE_INGRESO`).
    * Se recalculan los nuevos totales a partir del ticket modificado.
    * Se descuentan únicamente las nuevas unidades vendidas mediante método FIFO con registro en Kardex (`SALIDA_VENTA`).
  * **Efecto de Inventario Exacto:** Si una venta se reduce de 10 a 5 unidades, el inventario aumenta automáticamente +5 unidades en SQL Server de forma segura e instantánea.
* **2. Sincronización en Tiempo Real (`POSView.jsx` y `api.js`):**
  * Integración con `updateSale(editingSaleId, payload)`.
  * Al completar la modificación con **`💵 Efectivo`**, el catálogo y las transacciones recientes se refrescan automáticamente desde la Base de Datos.

### 68. Impresión Limpia y Directa sin Ventana Flotante Residual en Pantalla (`POSView.jsx`)
* **Optimización del Flujo de Impresión:**
  * Al hacer clic en el botón **`🖨️ Impresión`** desde el modal de *Transacciones Recientes*:
    * Se envían los datos del recibo oficial de "CASA Y CONSTRUCCION" directamente al motor de impresión del navegador (`window.print()`).
    * El elemento `#printable-receipt` permanece oculto en pantalla durante la navegación normal (`hidden print:block`) y se hace visible únicamente ante el diálogo de impresión física (`@media print`).
    * Se eliminó el modal residual que quedaba flotando en la interfaz al terminar o cancelar la impresión, permitiendo regresar directamente a la terminal POS limpia.

### 69. Purga Integral y Limpieza de Código Muerto en Frontend (`src/`)
* **Eliminación de Componentes y Páginas Heredadas/Duplicadas:**
  * Se removieron las vistas obsoletas de autenticación previa (`components/Login/Administrator/`, `components/Login/Clients/`, `components/Login/Products/`, `pages/Admins/LoginAdm.*`, `pages/Admins/RegisterAdm.*`, `pages/Clients/LoginClie.*`).
  * Se eliminaron archivos de prueba y plantillas no utilizadas (`components/DataComponent.jsx`, `components/header/`, `pages/About/`, `App.test.js`, `setupTests.js`, `reportWebVitals.js`, `logo.svg`, `index.js`).
* **Optimización de Rutas en [`App.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/App.jsx):**
  * Se limpiaron todos los imports no utilizados y se normalizó la tabla de enrutamiento del sistema a las vistas maestras oficiales.
* **Resultado:**
  * El árbol de código se redujo de **46 archivos a 25 archivos activos esenciales**, con compilación limpia (`npm run build` con código de salida 0).

### 70. Modal Moderno de Confirmación para Cancelar y Vaciar Ticket POS (`POSView.jsx`)
* **Reemplazo de Diálogo Nativo del Navegador:**
  * Se eliminó el cuadro de alerta nativo del navegador (`window.confirm`) que rompía la estética visual.
  * Se implementó una **tarjeta modal oscura estilizada (`showCancelConfirmModal`)** con:
    * Ícono de papelera/vaciado con resplandor en rojo suave.
    * Título y mensaje claro: *"¿Cancelar ticket de venta? Se quitarán todos los productos cargados en el ticket actual y se reiniciará la operación."*
    * Botón de cancelación seguro: **`No, mantener`** (gris oscuro).
    * Botón de acción principal: **`Sí, vaciar ticket`** (rojo carmesí destacado).
    * Toast informativo instantáneo confirmando el reinicio del ticket.

### 72. Flujo Completo de Cotizaciones y Proformas POS (`POSView.jsx`)
* **1. Emisión de Cotizaciones sin Descuento de Inventario:**
  * Al hacer clic en el botón **`✏️ Cotización`** de la barra inferior:
    * Se emite una proforma con correlativo único (`COT-XXXXX`), fecha, hora, cliente y desglose de productos.
    * **No descuenta stock de Lotes ni altera el inventario físico en BD.**
    * Se vacía el ticket activo y se notifica al cajero con un toast de confirmación.
* **2. Visualización y Gestión en Transacciones Recientes (`>_ Cotización`):**
  * En la pestaña **`>_ Cotización`** se listan todas las cotizaciones emitidas con su código en ámbar, nombre de cliente, fecha, operador y total (`Bs. XX.XX`).
  * **Acciones por Cotización:**
    * **`🛒 Cargar al Ticket`:** Carga todos los ítems y cliente de la cotización al ticket activo en 1 clic para que el vendedor pueda agregar más productos o concretar la venta cobrando con **`💵 Efectivo`**.
    * **`🖨️ Impresión`:** Imprime la proforma física o comprobante de cotización oficial para entregar al cliente.
    * **`🗑️ Borrar`:** Elimina la cotización del historial de proformas.

### 73. Modal de Detalles de Ítem, Modificador de Precio y Tarjetas Informativas (`POSView.jsx`)
* **1. Apertura Rápida desde el Ticket de Venta:**
  * Al hacer clic en cualquier producto cargado en la tabla del ticket (identificado con el badge interactivo `Ver` y cursor pointer), se abre el modal de edición de línea.
* **2. Cajas Informativas de Precios Registrados:**
  * Se diseñaron dos tarjetas destacadas de referencia rápida:
    * 🔹 **Precio CON Factura:** Muestra el precio de venta oficial del catálogo (`Bs. XX.XX`). Al hacer clic, aplica este monto automáticamente al campo editable.
    * 🟢 **Precio SIN Factura:** Muestra el precio sin factura configurado o calculado para venta de mostrador (`Bs. XX.XX`). Al hacer clic, traslada el valor al campo editable.
* **3. Formulario Simplificado y Limpio:**
  * **`Precio unitario (Bs.)`:** Campo numérico libre donde el vendedor puede colocar el precio acordado para la venta.
  * **`Descripción / Observaciones`:** Área de texto para notas (número de serie, IMEI, medidas especiales, etc.).
  * *(Se eliminaron los selectores innecesarios de tipo e importe de descuento para mantener la pantalla rápida y libre de distracciones).*
* **4. Recálculo Automático en el Ticket:**
  * Al guardar los cambios, el ticket actualiza el precio unitario, el subtotal de la fila y el total general de la venta de forma inmediata.

### 74. Ampliación Estética y Optimización Ergonómica del Panel de Ticket POS (`POSView.jsx`)
* **1. Mayor Amplitud del Área de Trabajo:**
  * Se incrementó el ancho del panel izquierdo a `w-[50%]` / `xl:w-[48%]` / `2xl:w-[46%]`, equilibrando perfectamente la terminal de ventas para que el listado de productos sea el protagonista del mostrador.
* **2. Tipografía y Filas Más Espaciosas:**
  * Altura de fila aumentada (`py-3.5`) con fondo alternado interactivo al pasar el cursor.
  * Nombres de productos más visibles y nítidos (`text-sm font-extrabold text-slate-100`).
  * Subtotales destacados en tipografía monoespaciada en negrita (`text-sm font-black text-slate-100`).
* **3. Botonera Táctil de Cantidades (`+` / `-`) Más Cómoda:**
  * Controles de cantidad con botones redondeados y amplios (`w-8 h-8 font-black text-base`), pensados tanto para clics rápidos con ratón como para pantallas táctiles de mostrador.
  * Botón de eliminación estilizado con efecto hover en rojo suave.

### 75. Limpieza de Sesión Inicial y Eliminación de Nombres por Defecto (`Topbar`, `Sidebar`, `Home`)
* **1. Comportamiento de Sesión en el Navegador:**
  * Las sesiones de usuario (`cyc_user_session` y `cyc_client_session`) se almacenan en el `localStorage` del navegador. Si previamente se inició sesión en la máquina, el navegador la preserva hasta que se haga clic en **"Cerrar Sesión"**.
* **2. Eliminación de Textos Quemados (Hardcoded Fallbacks):**
  * Se removieron todos los nombres por defecto ("Oscar Edgar Claros Davalos" o emails quemados) en [`topbar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/topbar/topbar.jsx), [`sidebar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/sidebar/sidebar.jsx) y [`Home.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Home/Home.jsx).
  * Cuando no existe una sesión activa, el catálogo de la tienda muestra limpiamente el botón **`Iniciar Sesión / Registrarse`** para clientes y operadores.

### 76. Módulo de Contactos y Replicación del Administrador de Proveedores (`SupplierView.jsx`, `sidebar.jsx`, `backend`)
* **1. Nuevo Menú Desplegable "Contactos" en la Barra Lateral:**
  * Se añadió la sección colapsable **`Contactos`** en [`sidebar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/sidebar/sidebar.jsx) posicionada según el ERP de referencia.
  * Al hacer clic, despliega exclusivamente las dos opciones solicitadas:
    1. **`Proveedores`** (Ruta: `/proveedores`)
    2. **`Clientes`** (Ruta: `/clientes`)
* **2. Replicación Exacta de la Vista de Proveedores ([`SupplierView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Contacts/SupplierView.jsx)):**
  * **Cabecera:** Título `Proveedores` con subtítulo `Administra tus Proveedores` y botón de acción superior derecho **`+ Añadir`**.
  * **Tarjeta de Filtros Colapsable:** Panel con toggle desplegable para filtrar por término de pago y estado de compras adeudadas.
  * **Herramientas de Exportación y Visibilidad:** Botones `Exportar a CSV`, `Exportar a Excel`, `Impresión`, `Visibilidad de columna` (menú flotante para ocultar/mostrar columnas dinámicamente) y `Exportar a PDF`.
  * **DataTable Completa:** Columnas idénticas al sistema ERP de referencia:
    * `Acción` (botón dropdown `Acciones ▾` con opciones: *Ver Detalles*, *Editar*, *Eliminar*).
    * `ID de contacto` (ej. `C00461`), `Nombre de la empresa`, `Nombre`, `Email`, `Razón social`, `Número de impuesto (NIT)`, `Término de pago`, `Saldo de apertura`, `Saldo anticipado`, `Añadido`, `Dirección`, `Móvil cliente`, `Total compra debida`, `Total de devoluciones de compra adeudadas`.
  * **Modales Integrados:** Modales modernos para alta de proveedor (`+ Añadir`), edición rápida (`Editar`), ficha detallada con resumen financiero (`Ver Detalles`) y confirmación de eliminación segura (`Eliminar`).
* **3. Backend y Modelo de Base de Datos:**
  * Se actualizó el modelo [`supplier.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/supplier.js) y las rutas de API en [`suppliers.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/suppliers.js) con soporte completo para CRUD y generación secuencial de códigos de contacto (`C00001`...).
  * Se conectaron las funciones en [`api.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/services/api.js) y se registraron las rutas en [`App.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/App.jsx).

### 77. Control Inteligente de Caducidad y Vencimiento FEFO (`ProductRegisterForm.jsx`, `ProductEditForm.jsx`, `ProductView.jsx`, `backend`)
* **1. Selector de Caducidad en la Ficha del Producto:**
  * En [`ProductRegisterForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductRegisterForm.jsx) y [`ProductEditForm.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductEditForm.jsx) se incorporó la tarjeta **Control de Caducidad y Vencimiento (Lotes FEFO)**.
  * Cuenta con un switch intuitivo: `¿Este producto cuenta con fecha de vencimiento? (Con Caducidad / Sin Caducidad)`.
  * Si está activado, permite configurar los `Días de alerta preventiva previa` (por defecto 30 días para el semáforo).
* **2. Ingreso de Fecha de Caducidad en el Stock de Apertura Multi-fila ([`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx)):**
  * En el modal verde estilo ERP de **Añadir Stock de Apertura**, se agregó la columna **Fecha Caducidad**.
  * Si el producto tiene activada la caducidad, la cabecera se resalta en tono ámbar indicando `VENCE`.
  * Cada fila ingresada guarda su fecha de vencimiento específica por lote en la base de datos para el motor FEFO.
* **3. Persistencia en Base de Datos MSSQL:**
  * Se añadieron los campos `ManejaCaducidad` (BOOLEAN) y `DiasAlertaCaducidad` (INTEGER) en [`product.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/models/product.js) y [`products.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/products.js).
  * Los lotes guardados en [`lots.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/lots.js) persisten su `FechaVencimiento`.

### 78. Simplificación del Módulo de Clientes para Facturación y Retiro de Proveedores (`sidebar.jsx`, `ClientView.jsx`, `POSView.jsx`)
* **1. Retiro de Proveedores y Menú Directo de Clientes en el Sidebar:**
  * Se eliminó el submódulo de Proveedores conforme al alcance del proyecto.
  * En [`sidebar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/sidebar/sidebar.jsx) se reemplazó el desplegable por un acceso directo y limpio **`Clientes`** (`/clientes`).
* **2. Módulo de Gestión de Clientes Enfocado a Facturación SIAT ([`ClientView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Contacts/ClientView.jsx)):**
  * Vista adaptada para almacenar y administrar la información tributaria requerida para la emisión de facturas:
    * `Nombre Completo`, `Razón Social para Factura`, `Número de Identificación Tributaria (NIT / CI)`, `Email de Factura Electrónica`, `Teléfono / Celular` y `Dirección`.
  * Herramientas de exportación (`CSV`, `Excel`, `Impresión`, `Visibilidad de columnas`, `PDF`), búsqueda rápida y paginación.
* **3. Sincronización en Tiempo Real con el Punto de Venta POS ([`POSView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Sales/POSView.jsx)):**
  * Los clientes registrados en `/clientes` se encuentran inmediatamente disponibles en el selector de clientes del mostrador POS.
  * Se habilitó el botón `+` en el encabezado del ticket POS para registrar nuevos clientes rápidamente durante la venta y autoseleccionarlos para la factura.

### 79. Replicación Exacta de Modales de Clientes (Individual vs. Empresa) y Flexibilidad Tributaria SIAT (`ClientView.jsx`, `POSView.jsx`)
* **1. Modal Idéntico al Sistema de Referencia para "Agregar un nuevo contacto" y "Editar contacto":**
  * **Selector de Tipo con Radio Buttons:** Conmutador inmediato entre **`Individual`** y **`Empresa`**.
  * **Campos Específicos por Tipo:**
    * Si se selecciona **`Empresa`**, se despliega el campo prioritario: **`Nombre de la empresa:*`** (ej. *PORTE ASESORIA Y CONFECCION S.R.L.*), el cual sincroniza automáticamente la `Razón social` tributaria.
    * Si se selecciona **`Individual`**, se muestran los campos divididos: `Prefijo:` (*Señor, señora, señorita...*), `Nombres:*`, `Segundo nombre:` y `Apellidos:`.
  * **Campos de Contacto y Configuración:**
    * `ID de contacto:` Generado de forma automática secuencialmente (ej. `CO0462`, `CO0466`, `CO0467`) o editable con placeholder *Dejar vacío para autogenerar*.
    * Se removió el campo innecesario `Grupo de clientes` tanto para individual como para empresa, dejando una fila superior limpia de 3 columnas (`Tipo de Contacto`, `Tipo` e `ID de contacto`).
    * `Móvil cliente:*` con valor numérico por defecto **`0`**.
    * `Número de contacto alternativo:`, `Línea fija:`, `Email:`.
    * `Fecha de nacimiento:` con selector de fecha.
    * `Asignado a:` selector de usuario responsable.
  * **Sección de Facturación SIAT:**
    * `Razón social:` Campo principal para la emisión del documento fiscal.
    * `Tipo de Documento de Identidad (SIAT):` Dropdown con opciones normativas (*NIT - NÚMERO DE IDENTIFICACIÓN TRIBUTARIA*, *CI - CÉDULA DE IDENTIDAD*, *PASAPORTE*, *OTRO DOCUMENTO*).
    * `Número de impuesto / Documento:` Permite alfanuméricos con guiones o complementos (ej. *4502616-1S*, *280376027*, *5948302* o *0*).
  * **Secciones Desplegables / Acordeones:**
    * `Más información ▾` (Dirección, Ciudad).
    * `Agregar personas de contacto ▾` (Contactos secundarios de compras o almacén).
* **2. Validación Flexible Adaptada al Mostrador:**
  * No es obligatorio llenar todos los campos secundarios; para clientes de paso basta con ingresar el Nombre o la Razón Social y el NIT/CI.
  * Si no se especifica móvil o NIT, el sistema asigna por defecto `0` para garantizar compatibilidad con ventas en mostrador y facturación sin nombre.
* **3. Registro Rápido en el POS ([`POSView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Sales/POSView.jsx)):**
  * El modal rápido de clientes `+` en la pantalla de ventas soporta la misma distinción entre `Individual` y `Empresa`, autocompletando de inmediato los datos de facturación en el ticket.

### 80. Visualización Dual de Alertas de Caducidad y Stock (Campanita Topbar + Tabla Dashboard FEFO) (`topbar.jsx`, `Home.jsx`)
* **1. Campanita de Notificaciones Interactiva en el Menú Superior ([`topbar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/topbar/topbar.jsx)):**
  * **Badge Dinámico en Tiempo Real:** Calcula el total de alertas activas (`Vencidos`, `Próximos a Vencer < 30d/60d`, `Agotados` y `Stock Crítico`).
  * **Panel Flotante Desplegable:**
    * Pestañas de filtrado: **`Todas`**, **`⏰ Vencimientos`** y **`📉 Stock Bajo`**.
    * Fichas detalladas con indicador de color (🔴 / 🟠 / 🟡), días restantes, lote específico y stock restante.
    * Botón de actualización inmediata y acceso directo a Kardex e Inventario.
* **2. Tabla Visual de Caducidad de Lotes FEFO en la Página de Inicio ([`Home.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Home/Home.jsx)):**
  * **Ubicación:** Ubicada inmediatamente debajo de la tabla de alertas de existencias.
  * **Columnas:** `Producto` (Nombre, Código, Marca), `Lote #` (`LOTE-X`), `Fecha Caducidad`, `Estado / Semáforo` (🔴 Vencido, 🟠 Crítico &lt; 30d, 🟡 Alerta &lt; 60d, 🟢 Vigente), `Stock Lote` y `Acción` (enlace directo a `Ver en Productos →`).
  * **Filtros y Herramientas:** Selector por estado (*Todos*, *Vencidos*, *Críticos*, *Preventivos*, *Vigentes*), buscador en tiempo real y exportación completa (`CSV`, `Excel`, `Impresión`, `PDF`).

### 81. Redirección de Enlaces de Alertas a "Lista de Productos" (`/productsView`) (`topbar.jsx`, `Home.jsx`)
* **1. Reemplazo de Enlaces Obsoletos de Kardex:**
  * Dado que la vista principal donde se gestiona el catálogo, existencias, lotes y precios es **"Lista de Productos"** ([`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx) en `/productsView`), se redirigieron todos los accesos rápidos:
    * **En la campanita del Topbar ([`topbar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/topbar/topbar.jsx)):** El enlace del pie ahora dice `Ver Lista de Productos & Lotes →` y redirige a `/productsView`. Asimismo, el dropdown de perfil redirige directamente a `Lista de Productos`.
    * **En la tabla del Dashboard ([`Home.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Home/Home.jsx)):** El botón superior del encabezado ahora es `Ver Lista de Productos & Lotes →` (`/productsView`) y en cada fila de la tabla la acción es `Ver en Productos →` (`/productsView`).

### 82. Sistema de Descarte y Marcado de Notificaciones Leídas (`topbar.jsx`)
* **1. Descarte Individual (Botón ✕):**
  * Cada tarjeta de alerta (lote por vencer o producto con stock crítico) cuenta con un botón interactivo `✕` para descartarla de inmediato.
  * Al hacer clic, la notificación se oculta y el contador de la campanita disminuye en tiempo real.
* **2. Acción Masiva "Marcar todas como leídas":**
  * Botón en el encabezado del desplegable (`✓ Marcar todas`) para limpiar todas las alertas activas con un solo clic.
* **3. Persistencia en Almacenamiento Local (`localStorage`):**
  * Las alertas descartadas se almacenan en `cyc_dismissed_notifications` para no volver a molestar al usuario en la misma sesión/dispositivo.
* **4. Estado Vacío Inteligente y Restablecimiento:**
  * Cuando todas las notificaciones han sido descartadas, el panel muestra el mensaje *"¡Todo al día! Has descartado las notificaciones activas"* junto con un enlace interactivo para **`↺ Restablecer alertas descartadas`** si se desea volver a revisarlas.

### 83. Visualización Condicional y Diseño Limpio de "Fecha Caducidad" en Stock de Apertura (`ProductView.jsx`)
* **1. Ocultamiento Automático para Productos No Perecederos:**
  * En el modal de **"Añadir stock de apertura"** ([`ProductView.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Products/ProductView.jsx)), la columna y los campos de entrada de **`Fecha Caducidad`** ahora se renderizan **únicamente** si el producto tiene habilitada la opción de caducidad (`ManejaCaducidad = true`).
  * Para herramientas, materiales o artículos que no vencen (`ManejaCaducidad = false`), la columna se oculta por completo, dejando una tabla más limpia y directa centrada en Cantidad, Costo, Subtotal, Fecha de Ingreso y Nota/Lote.
* **2. Estilo Visual Uniforme en la Tabla Verde:**
  * Se removió el fondo amarillo y el badge de la cabecera, integrando `Fecha Caducidad` con la misma estética verde esmeralda y campos homogéneos que el resto de las columnas (`Fecha Ingreso`, `Cantidad`, etc.).

### 84. Regla de Caducidad: Auto-desaparición a los 7 Días y Botón "Descartar Lote" (`Home.jsx`, `topbar.jsx`)
* **1. Ventana Máxima de 7 Días para Alertas de Lotes Vencidos:**
  * Cuando un lote llega a su fecha límite de caducidad (`🔴 Vencido`), la alerta visual en el Dashboard ([`Home.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/pages/Home/Home.jsx)) y en la Campanita ([`topbar.jsx`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/ferreteria/src/components/topbar/topbar.jsx)) permanece visible por un máximo de **7 días**.
  * Si transcurren más de 7 días desde el vencimiento sin acción, la alerta **desaparece automáticamente** para no acumular registros obsoletos de forma indefinida.
* **2. Botón de Acción "✕ Descartar lote":**
  * En la tabla de vencimientos del Dashboard, cada lote que se encuentra en estado vencido (dentro de los 7 días de gracia) incluye un botón directo **`✕ Descartar lote`** junto al enlace de *Ver en Productos*.
  * Al hacer clic, el lote se descarta de las alertas en tiempo real y se guarda en `cyc_dismissed_expired_lots` (`localStorage`) para que no vuelva a aparecer en pantalla.

### 85. Validación Estricta de Fechas en Stock de Apertura (`ProductView.jsx`)
* **1. Fecha de Ingreso Obligatoria:**
  * El campo `Fecha Ingreso` es estrictamente requerido (`required`) al registrar un nuevo lote.
* **2. Validación de Fecha de Caducidad (No menor a la actual):**
  * Si el producto está configurado con caducidad (`ManejaCaducidad = true`), la `Fecha Caducidad` es un campo **obligatorio**.
  * Se configuró el atributo `min={YYYY-MM-DD}` correspondiente al día actual y una validación de seguridad en `handleSaveStock` para impedir que se ingresen fechas de caducidad pasadas o caducadas.

### 86. Motor Estadístico y Agrupación Histórica de Ventas (Paso 1) (`reports.js`, `app.js`, `api.js`)
* **1. Endpoints de Agrupación Temporal y Análisis de Rendimiento:**
  * Se implementó el router [`reports.js`](file:///c:/Proyeto%20Ferreteria/ferreteriaaa/backend/api/routes/reports.js) en `/reports/sales-performance` y `/reports/product-sales-history/:id`.
  * Soporta agrupaciones periódicas: **`diaria`**, **`semanal`** y **`mensual`**, con filtros por rango de fechas, producto, categoría y marca.
* **2. Métricas y Clasificación ABC (Pareto):**
  * **KPIs Consolidados:** Ingresos totales, costo total de mercancía, ganancia bruta, margen neto (%), total de unidades vendidas y ticket promedio.
  * **Análisis ABC de Productos:** Clasifica automáticamente los productos en **Clase A** (80% de ingresos / alta rotación), **Clase B** (15% de ingresos) y **Clase C** (5% restante) para priorizar compras y reabastecimiento.
  * **Línea Temporal Histórica:** Genera la serie de datos cronológica necesaria para alimentar los modelos predictivos (Promedio Móvil y Suavizado Exponencial).

### 87. Motor Predictivo de Demanda y Modelos Estadísticos (Paso 2) (`reports.js`, `api.js`)
* **1. Algoritmos Predictivos Implementados:**
  * **Promedio Móvil Simple (SMA):** Calcula la media de los últimos \(N\) periodos (ventana móvil configurable de 3 a 30 días) para suavizar fluctuaciones aleatorias.
  * **Promedio Móvil Ponderado (WMA):** Asigna ponderaciones lineales decrecientes priorizando las ventas más recientes.
  * **Suavizado Exponencial Simple (SES - Holt):** Aplica la constante de atenuación \(\alpha \in [0.05, 0.95]\) (\(\hat{Y}_{t+1} = \alpha Y_t + (1-\alpha)\hat{Y}_t\)).
### 88. Panel Visual de Análisis Predictivo y Gráficos en Inicio (Paso 3) (`Home.jsx`, `PredictiveReportsTab.jsx`)
* **1. Conmutador de Pestañas Principales en Inicio:**
  * **`📊 Panel Operativo & Alertas`:** Mantiene intacto el resumen del día, gráfico de ventas de mostrador, alertas de stock mínimo y tabla de lotes FEFO.
  * **`📈 Reportes & Análisis Predictivo`:** Despliega el nuevo módulo completo interactivo de proyección y reabastecimiento.
* **2. Barra de Control y Calibración de Parámetros:**
  * Selección interactiva de algoritmo (**`SES (Holt)`**, **`SMA Móvil`**, **`WMA Ponderado`**).
  * Control deslizante dinámico de **Factor de Suavizado \(\alpha\)** (0.05 a 0.95) y **Ventana Móvil \(N\)** (3 a 21 días).
  * Selector de **Horizonte de Proyección** (7, 15, 30 o 60 días).
* **3. Gráficos Visuales SVG Interactivos:**
  * **Curva de Demanda:** Traza la serie de ventas reales pasadas con sombreado de área conectado a la **línea punteada de proyección futura** con tooltips interactivos de valores.
  * **Distribución Pareto ABC:** Tarjetas analíticas categorizando productos Clase A (80% ventas), Clase B (15%) y Clase C (5%).
### 89. Rediseño con Lenguaje Comercial Amigable y Modo Académico de Fórmulas (`PredictiveReportsTab.jsx`)
* **1. Enfoque Intuitivo para Personas de Mostrador y Negocio:**
  * **Traducción de Algoritmos a Modos de Negocio:**
    * *Suavizado Exponencial (SES)* $\rightarrow$ **Modo Inteligente (Tendencia Reciente)** (aprende rápido de las últimas ventas).
    * *Promedio Móvil Simple (SMA)* $\rightarrow$ **Modo Estable (Promedio)** (ideal para productos con ventas constantes).
    * *Promedio Ponderado (WMA)* $\rightarrow$ **Modo Ponderado (Semanal)** (equilibra semanas anteriores).
  * **Configuración de Sensibilidad Simplificada:**
    * Presets con un solo clic: **Cautelosa** ($\alpha=0.15$), **Normal (Recomendada)** ($\alpha=0.30$) y **Reactiva** ($\alpha=0.60$).
  * **Clasificación Comercial Pareto ABC:**
    * Clase A $\rightarrow$ **Clase A (Productos Estrella - 80% de ventas)**.
    * Clase B $\rightarrow$ **Clase B (Productos Habituales - 15% de ventas)**.
    * Clase C $\rightarrow$ **Clase C (Productos Ocasionales - 5% de ventas)**.
  * **Guía Práctica para Proveedores:**
    * Columnas claras: **"Sugerencia de Pedido"** (unidades requeridas) e **"Inversión estimada (Bs.)"** basada en costo de reposición.
* **2. Desplegable de Fórmulas Matemáticas para Fines Académicos / Defensa:**
  * Botón opcional **`Ver Fundamento Matemático`** tanto en la barra superior como en el modal de diagnóstico individual.
  * Muestra las ecuaciones formales completas:
    * $\hat{Y}_{t+1} = \alpha Y_t + (1-\alpha)\hat{Y}_t$ (SES / Holt).
    * $\text{SMA}_k = \frac{1}{k}\sum_{i=0}^{k-1} Y_{t-i}$.
    * Fórmulas de precisión y error: $\text{MAD} = \frac{1}{n}\sum |Y_t - \hat{Y}_t|$, $\text{MAPE} = \frac{100\%}{n}\sum \left|\frac{Y_t - \hat{Y}_t}{Y_t}\right|$, $\text{RMSE} = \sqrt{\frac{1}{n}\sum (Y_t - \hat{Y}_t)^2}$.

### 91. Compatibilidad de Consultas de Fechas en SQL Server y Activación del Histórico (`reports.js`)
* **1. Corrección de Formato de Fechas para MSSQL (`Conversion failed when converting date`):**
  * SQL Server no admite zonas horarias directas (`+00:00`) en columnas de tipo `DATETIME`.
  * Se implementó `formatSQLDateTime` para estructurar los filtros temporales en formato canónico `'YYYY-MM-DD HH:mm:ss'` en las consultas de `/reports/sales-performance`, `/reports/demand-forecast` y `/reports/product-forecast/:id`.
* **2. Mapeo Seguro de Asociaciones Sequelize:**
  * Se soportó la inclusión `sd.Venta || sd.Ventum` garantizando que los cálculos de series temporales extraigan adecuadamente la fecha de cada transacción.
### 92. Expansión de Ancho Completo en Inicio y Reportes Predictivos (`Home.jsx`)
* **1. Homologación de Espaciado con la Vista de Clientes:**
  * Se sustituyó la restricción de ancho fijo `max-w-7xl` (1280px) por `max-w-[1920px] p-6 md:p-8 w-full mx-auto space-y-6 flex-1`, idéntica a la vista de **Clientes** (`ClientView.jsx`).
  * Con este cambio, tanto el **Panel Operativo** como la pestaña de **Reportes & Análisis Predictivo** (gráficos, tarjetas de métricas y tabla maestra de reabastecimiento) aprovechan todo el ancho de la pantalla reduciendo los márgenes laterales vacíos.

### 93. Limpieza de Cabecera y Enfoque Comercial Minimalista (`PredictiveReportsTab.jsx`)
* **1. Eliminación de Desplegables de Fórmulas Matemáticas:**
  * Se retiró el botón *"Ver Fundamento Matemático"* de la barra superior y del modal de diagnóstico de producto, dejando una interfaz 100% limpia y centrada en lenguaje de negocios para el usuario.
* **2. Botón de Actualización Discreto y Reactividad Automática:**
  * Se simplificó el botón de actualización a un botón discreto y elegante con icono de recarga (`↺ Actualizar`).
  * El sistema ya recalibra automáticamente las proyecciones en tiempo real ante cualquier cambio de método, sensibilidad o periodo sin obligar a presionar botones.



### 94. Panel de Guía de Uso en Reportes & Análisis Predictivo (`PredictiveReportsTab.jsx`)
* **Problema:** Un usuario común sin conocimientos de estadística o análisis no sabía qué significaban los términos SES, SMA, WMA ni cómo interpretar los controles del módulo predictivo.
* **Solución:** Se agregó un panel colapsable **"¿Cómo usar esta sección?"** al inicio de la pestaña `PredictiveReportsTab`, antes de la barra de control principal.
* **Detalles de implementación:**
  * Se reemplazó la variable de estado `showFormulas` (ya sin uso tras la sección 93) por `showGuide` para controlar el accordion.
  * El panel se muestra **siempre visible en su cabecera** (icono info + título + descripción corta + chevron animado), y expande su contenido al hacer clic.
  * Cuando desplegado, el panel explica en lenguaje llano:
    * **¿Qué hace la sección?** → predice agotamiento de stock y cuánto pedir al proveedor.
    * **Métodos de proyección** → tarjetas en 3 columnas para Inteligente (SES), Promedio Estable (SMA) y Ponderado (WMA) con descripción en lenguaje de negocio.
    * **Sensibilidad y Periodo de proyección** → qué controla cada opción en términos prácticos.
    * **Tabla de reabastecimiento** → cómo leer las columnas y el código de colores (rojo/amarillo/verde).
  * Estilo consistente con el resto de la UI: `bg-slate-900/50 border-slate-700/60 rounded-2xl`, texto `text-cyan-400` para etiquetas y `text-slate-300/400` para descripciones.

### 95. Gráfico Ampliado y Comparativa de Precisión en Detalle de Producto (`PredictiveReportsTab.jsx`)
* **1. Mejoras en Gráfico SVG Principal:**
  * Se incrementaron las dimensiones de altura del gráfico a `320px` (`h-80`) para mayor visibilidad y legibilidad.
  * Se optimizaron las etiquetas de picos máximos con protección contra solapamiento en días contiguos.
  * Se resaltaron los indicadores de `HOY` y `Promedio Diario` con tipografías y bordes contrastados.
* **2. Tabla de Evaluación de Precisión y Ajuste de Modelo:**
  * Se integró dentro del modal **"Ver Detalle"** de cada producto una tabla comparativa de los tres métodos evaluados (SES, SMA, WMA) mostrando sus métricas de error retrospectivo: **MAD** (Error diario), **RMSE** (Desviación cuadrática) y **MAPE** (Error porcentual).
  * Se destaca con un badge `★ Menor Error` el método que obtuvo el mejor ajuste matemático para el artículo.
* Build verificado exitosamente.

### 96. Creación de Documento Explicativo de Usuario (`vista_predicciones.md`)
* Se generó un documento completo en Markdown con el manual de usuario y guía operativa de la vista de Reportes y Análisis Predictivo.
* Incluye:
  * Explicación de KPIs principales (Demanda estimada, Presupuesto sugerido, Por agotarse pronto, Rentabilidad).
  * Explicación de métodos de cálculo (SES, SMA, WMA) y sensibilidad (Cautelosa, Normal, Reactiva con ejemplo comercial).
  * Guía de lectura del gráfico SVG interactivo (líneas, tooltips, etiquetas de `Prom: 12 un/día`, `HOY`, picos).
  * Explicación detallada de la tabla de reabastecimiento y semáforo de criticidad de stock.
  * Fundamento de métricas de precisión retrospectiva (MAD, RMSE, MAPE) y diferenciación con matrices de confusión.
* Guardado en la raíz del proyecto como `c:\Proyeto Ferreteria\ferreteriaaa\vista_predicciones.md`.

### 97. Modernización y Conexión de Datos Reales en Panel Operativo (`Home.jsx`)
* **1. Eliminación de Tarjetas Estáticas / Hardcoded:**
  * Se eliminaron las 8 tarjetas con valores inventados (ventas netas negativas, gastos fijos de Bs. 6,000, compras y devoluciones vacías).
* **2. Cuatro KPIs Operativos Conectados a Base de Datos:**
  * **Ventas Totales:** Total facturado real en Bs. de la base de datos con margen de ganancia real.
  * **Transacciones:** Cantidad exacta de tickets cobrados y ticket promedio en Bs.
  * **Alertas de Stock:** Conteo en tiempo real de productos en nivel crítico o menor a su stock mínimo.
  * **Caducidad de Lotes (FEFO):** Conteo de lotes vencidos o próximos a expirar.
* **3. Gráfico de Historial de Ventas 100% Dinámico:**
  * Conectado a la API `getSalesPerformanceReport`, graficando los ingresos diarios reales, fechas dinámicas y tooltips interactivos con monto en Bs., número de tickets y unidades vendidas.
* **4. Preservación de Tablas Operativas Críticas:**
  * Se mantuvieron intactas las tablas de **Alerta de stock del producto** y **Alerta de vencimiento de lotes (FEFO)** con todas sus funciones de exportación (CSV, Excel, Impresión).
* Build verificado exitosamente.

### 98. Alineación Precisa de Fechas y Gráfico Ampliado en Inicio (`Home.jsx`)
* **Problema:** Las fechas del eje X estaban en un contenedor HTML exterior separado (`justify-between`), lo que causaba un desfase visual entre el texto de la fecha y el punto exacto de la curva de ventas.
* **Solución:**
  * Se trasladaron las etiquetas de fechas del eje X **directamente al interior del SVG**, calculando su posición horizontal exactamente con la coordenada `x` de cada punto de venta.
  * Se aumentó el tamaño del gráfico a `1100x320` (`h-80`) para que ocupe todo el ancho disponible y las curvas tengan mayor amplitud y resolución visual.
  * Se optimizaron las líneas de cuadrícula y etiquetas de montos en Bs. (`k` para miles) para un acabado limpio y proporcional.
* Build verificado exitosamente.

### 99. Depuración de Opciones y Corrección de Cambio en Modal de Factura (`POSView.jsx`)
* **1. Corrección del Error en Cálculo de Cambio / Vuelto:**
  * **Causa:** Al presionar "Efectivo", el carrito de compras se vaciaba en memoria (`cart = []`) antes de abrir el modal, haciendo que el subtotal y total dentro del modal evaluaran temporalmente en `Bs. 0.00`. Al ingresar `Bs. 238.00` recibidos, el sistema restaba `238 - 0` calculando un cambio erróneo de `Bs. 238.00`.
  * **Solución:** Se vinculó el resumen de factura y el cálculo de cambio al total del recibo activo (`lastSaleReceipt.total`), asegurando que si la venta es de `Bs. 238.00` y se reciben `Bs. 238.00`, el cambio sea exactamente `Bs. 0.00` (con indicador `Exacto`).
* **2. Limpieza de Opciones No Utilizadas:**
  * Se eliminaron las opciones de radio `Ventas Menores del Día` y `Caso Especial`, dejando únicamente `Normal` y `Sin Nombre (≤ Bs. 10.000)`.
  * Se eliminaron los botones de billetes predefinidos (`Bs. 10`, `Bs. 20`, `Bs. 50`, `Bs. 100`, `Bs. 200`, `Monto Exacto`) dejando un campo de `Monto Recibido (Bs.)` ágil y limpio con cálculo automático del vuelto.
* Build verificado exitosamente.

### 101. Estandarización de Términos: Eliminación del Acrónimo "SIAT" en la Interfaz
* **Motivo:** Debido a que el módulo de facturación opera bajo un flujo interno/simulado, se depuró el término tributario `"SIAT"` en todos los textos visibles al usuario para evitar confusiones operativas.
* **Ajustes Realizados:**
  * **Barra Lateral (`sidebar.jsx`):** Menú renombrado de `Facturación SIAT` a `Facturación`.
  * **Punto de Venta (`POSView.jsx`):**
    * Encabezado de comprobante actualizado a `FACTURA ELECTRÓNICA DE VENTA`.
    * Insignia de estado cambiada de `SIAT En Línea` a `Factura Electrónica`.
    * Selector y formularios ajustados de `Tipo de Documento (SIAT)` a `Tipo de Documento`.
    * Tooltips y marcadores de posición depurados.
  * **Gestión de Clientes (`ClientView.jsx`):**
    * Subtítulo del módulo ajustado a `Administra tus Clientes y datos de Facturación`.
    * Sección de formulario renombrada a `Datos de Facturación` y etiqueta a `Tipo de Documento de Identidad:`.
### 102. Generación y Descarga Oficial en Formato PDF de Facturas y Recibos (`POSView.jsx`, `invoicePdfGenerator.js`)
* **Requerimiento:** Generar directamente un documento en formato **`.pdf`** idéntico al estándar oficial de facturación boliviano (como en el visor de Acrobat/Chrome) al pulsar descargar.
* **Solución Implementada:**
  * **Integración de Librerías:** Se integraron `jspdf`, `jspdf-autotable` y `qrcode`.
  * **Módulo Generador (`src/utils/invoicePdfGenerator.js`):**
    * **Encabezado Comercial:** Casa Matriz, Punto de Venta, Dirección en Cochabamba, Teléfono y NIT.
    * **Datos de Facturación:** Número correlativo de Factura/Recibo, Código Único de Autorización (CUF), Fecha y Hora.
    * **Identificación del Cliente:** Nombre/Razón Social, NIT/CI/CEX y Código de Cliente.
    * **Tabla de Ítems Estandarizada:** `CÓDIGO PRODUCTO/SERVICIO`, `CANTIDAD`, `UNIDAD MEDIDA`, `DESCRIPCIÓN`, `PRECIO UNITARIO`, `DESCUENTO` y `SUBTOTAL`.
    * **Conversión a Literal:** Función `numeroALetras` para importes en texto legal (ej. *VEINTICINCO 00/100 BOLIVIANOS*).
    * **Resumen de Importes:** Subtotal, Descuentos, Total, Monto Gift Card, Monto a Pagar e Importe Base Crédito Fiscal.
    * **Pie de Página Legal y QR:** Leyendas obligatorias de Ley Nº 453 y generación dinámica de Código QR fiscal.
  * **Acción en el POS:** Al hacer clic en **`Descargar Factura (PDF)`** o **`Descargar Recibo (PDF)`**, el sistema:
    1. Guarda y descarga directamente el archivo `.pdf` (`Factura_Nro_XXX_YYYY-MM-DD.pdf`).
    2. Abre instantáneamente el PDF en una nueva pestaña del navegador para visualizarlo en el lector PDF integrado o imprimirlo.
### 103. Corrección en Asignación y Persistencia de Nombres de Clientes en Ventas (`POSView.jsx`, `sales.js`)
* **Problema Identificado:**
  * Al realizar una venta a un cliente con nombre (ej. "Pablo", "Constructora Los Andes"), en la ventana de **Transacciones Recientes** la venta figuraba como `(CLIENTE PRUEBA)` o con paréntesis vacíos `()`.
  * **Causa Raíz:** En la base de datos SQL Server, el registro inicial `ClienteID = 1` tenía como nombre `"CLIENTE PRUEBA"`, y al no persistirse dinámicamente clientes nuevos o no sincronizarse el `ClienteID`/`clienteNombre` en `POST /sales` y `PATCH /sales/:id/invoice`, la consulta `GET /sales/recent` recurría a dicho registro o quedaba vacía.
* **Solución Implementada:**
  * **1. Resolución Dinámica de Clientes en Backend (`resolveOrCreateCliente`):**
    * Si la venta incluye un cliente con nombre o NIT, el servidor busca coincidencias en la tabla `Personas`/`Clientes` o crea automáticamente el registro asociado dentro de la transacción ACID.
### 104. Implementación del Módulo de Facturación (`InvoiceListView.jsx`, `sidebar.jsx`, `sales.js`)
* **Requerimiento:** Crear el módulo de **Facturación** accesible desde el menú lateral con diseño idéntico al sistema de referencia, simplificando las acciones de cada factura estrictamente a: **`Imprimir`** (hoja carta/oficio oficial), **`Imprimir Ticket`** (rollo térmico de 80mm) y **`Anular`**.
* **Solución Implementada:**
  * **1. Vista Principal (`src/pages/Sales/InvoiceListView.jsx`):**
    * **Cabecera y Métricas:** Total Facturado en Bs., Conteo de Facturas Emitidas y Anuladas en tiempo real.
    * **Barra de Filtros y Búsqueda:** Filtro por rango de fechas (`Fecha Inicio` y `Fecha Fin`), buscador por texto (`Número de factura, Cliente, NIT/CI, CUF`) y filtro por estado (`Todas`, `Emitidas`, `Anuladas`).
    * **Diseño de Fila / Tarjeta de Factura:**
      * Visualización de `Venta: 👁️ Ver Detalle`, `ID`, badge de `Factura Nro`, `Cliente`, `Sucursal 0 | Punto Venta 0`, `Fecha emisión`, código `CUF` con botón para copiar, sector, impuesto `13% IVA`, monto total en Bs. e insignia de estado (`Emitida` / `Anulada`).
      * **Botón `Imprimir` (Carta):** Genera e interactúa con el PDF oficial de tamaño Carta/Oficio con QR y formato fiscal boliviano.
      * **Botón `Imprimir Ticket` (Térmico 80mm):** Genera e imprime el ticket adaptado a impresoras de rollo continuo con desglose de ítems, totales, literal y QR.
      * **Botón `Anular`:** Modal de confirmación con selección de motivo de anulación.
  * **2. Modales Interactivos:**
    * Modal `Ver Detalle`: Desglose detallado de ítems, código, descripción, cantidades, precios unitarios y subtotales.
    * Modal `Anular Factura`: Confirma y ejecuta la anulación registrando el motivo.
  * **3. Backend (`backend/api/routes/sales.js`):**
    * `GET /sales/invoices`: Endpoint con filtrado por fechas, texto y estado.
    * `PATCH /sales/:id/anular`: Marca la venta/factura como anulada y revierte automáticamente las existencias al inventario de lotes (Kardex: `AJUSTE_INGRESO`).
  * **4. Navegación y Rutas (`sidebar.jsx`, `App.jsx`):**
    * Vinculado el botón **`Facturación`** del menú lateral hacia las rutas `/facturacion` y `/facturas` con resaltado de estado activo.
* Build verificado exitosamente.

### 105. Corrección de Mapeo de Datos en Factura Formato Carta / Oficio (`invoicePdfGenerator.js`)
* **Problema Identificado:**
  * Al presionar **`Imprimir Ticket`** en el módulo de facturación, los datos del cliente y la lista de productos se visualizaban correctamente.
  * Sin embargo, al presionar **`Imprimir`** (hoja carta oficial), el documento PDF mostraba `"SIN NOMBRE"` en el campo *Nombre/Razón Social* y la tabla de productos aparecía vacía.
  * **Causa Raíz:** En `generateInvoicePdf`, los nombres de propiedades leídos (`receiptData.client`, `receiptData.items`) no coincidían con el esquema de facturas retornado por el backend (`receiptData.cliente`, `receiptData.detalles`).
* **Solución Implementada:**
  * Se compatibilizó `generateInvoicePdf` en `src/utils/invoicePdfGenerator.js`:
    1. **Identificación del Cliente:** Prioriza `receiptData.cliente || receiptData.client || receiptData.razonSocial || receiptData.nombreCliente`.
    2. **Identificación Tributaria (NIT/CI):** Soporta `receiptData.nit || receiptData.documento || receiptData.nitCliente`.
    3. **Tabla de Productos / Ítems:** Soporta indistintamente `receiptData.detalles || receiptData.items || receiptData.productos`, mapeando correctamente `codigo`, `cantidad`/`quantity`, `unidad`/`unit`, `nombre`/`name`/`producto`, `precioUnitario`/`price` y `subtotal`.
    4. **Fechas e Identificadores:** Soporta `fechaEmision`/`time` y `numeroFactura`/`id`.
* **Resultado:** Ahora tanto la impresión en hoja carta (**`Imprimir`**) como la impresión en rollo (**`Imprimir Ticket`**) reflejan con total fidelidad el nombre del cliente, su NIT/CI y todos los ítems adquiridos con sus cantidades y subtotales.

### 106. Implementación de Pantalla de Apertura de Caja Registradora (`POSView.jsx`, `sales.js`, `api.js`)
* **Requerimiento:** Al iniciar el día laboral o ingresar a **Vender / POS**, antes de habilitar las ventas se debe presentar la pantalla de **"Abrir caja registradora"** integrada en el diseño oscuro estándar del sistema (con `Sidebar` y `Topbar`), solicitando el efectivo inicial para luego habilitar el terminal POS completo.
* **Solución Implementada:**
  * **1. Verificación de Estado de Caja Registradora:**
    * Consulta el estado de sesión de caja activa (`GET /sales/cash-register/status` y `localStorage`).
    * Si la caja **no está abierta**, muestra la vista de apertura dentro del layout estándar oscuro con `Sidebar` y `Topbar`.
  * **2. Interfaz de "Abrir caja registradora" (`src/pages/Sales/POSView.jsx`):**
    * **Layout Estándar del Sistema:** Barra superior `Topbar` y menú lateral colapsable `Sidebar` con ítem `Vender` activo.
    * **Título y Subtítulo:** `Abrir caja registradora` - *Ingrese el monto de efectivo inicial para iniciar el turno de ventas POS*.
    * **Tarjeta Central:**
      * Identificación del usuario responsable (`OSCAR EDGAR CLAROS`).
      * Campo con prefijo `Bs.` para **`Efectivo inicial:*`** (`Ingresar cantidad`).
      * Botón principal **`Abrir registro`**: Inicia la sesión de caja y abre de inmediato el terminal de ventas POS.
    * **Botón `Mi último registro`:** Modal con el resumen detallado del arqueo/cierre anterior.
  * **3. Terminal POS con Sesión Activa:**
    * Al abrirse la caja, se carga el terminal POS con su barra de herramientas y el indicador `💵 Caja Inicial: Bs. XXX.XX`.
  * **4. Backend (`backend/api/routes/sales.js`):**
    * Endpoints `GET /sales/cash-register/status`, `POST /sales/cash-register/open`, `GET /sales/cash-register/last`, `POST /sales/cash-register/close`.

### 107. Rediseño del Cierre de Caja Registradora (`POSView.jsx`) y Supresión de Gastos, Créditos y Pagos Externos
* **Requerimiento:** 
  1. Eliminar cualquier referencia a "Gastos" tanto en las tablas como en los cálculos de resumen y fórmulas.
  2. Eliminar los campos innecesarios "Ventas a crédito" y "Pagos externos" de la tarjeta de resumen.
  3. Alinear visualmente el modal de cierre de caja (`Registro actual`) a la línea de diseño oscura, elegante y corporativa del sistema (colores oscuros `slate-900`/`slate-950`, acentos `cyan-400`/`emerald-400`, bordes sutiles y tarjetas integradas).
* **Solución Implementada:**
  * **1. Eliminación de Rubros Innecesarios:**
    * Se removió la columna de "Gastos" de la tabla de métodos de pago.
    * Se eliminó el ítem "Gasto total" del bloque de KPIs.
    * Se eliminaron las filas "Ventas a crédito" y "Pagos externos" de la tarjeta de resumen de cierre.
    * Se actualizó la fórmula visual: `Total = Bs. {Apertura} + Bs. {Ventas} - Bs. {Reembolsos} = Bs. {Efectivo Esperado}`.
    * Se ajustó el cálculo matemático en JavaScript: `expectedCash = Math.max(0, initialCash + cashSales - totalRefunds)`.
  * **2. Adaptación a la Línea Visual del Sistema:**
    * **Fondo y Contenedor:** Modal con fondo `bg-slate-900`, bordes `border-slate-800`, backdrop `backdrop-blur-md` y sombras profundas.
    * **Tablas y Datos:** Tablas integradas con encabezados oscuros `bg-slate-950`, textos en `slate-300`, SKUs en `text-cyan-400`, totales en `text-emerald-400` y tipografía monospace.
    * **Resumen Destacado:** Tarjeta con fondo esmeralda oscuro translúcido `bg-emerald-950/40 border border-emerald-500/30` y texto verde brillante `text-emerald-400` para el efectivo esperado.
    * **Formulario e Inputs:** Campos oscuros `bg-slate-950 border border-slate-700` con focus iluminado en `cyan-400`.
    * **Botones:** Botón primario en `bg-cyan-600 hover:bg-cyan-500` con sombra cyan y botón secundario `bg-slate-800`.

### 108. Implementación del Módulo de "Aumento a Caja" / Ingreso de Efectivo (`POSView.jsx`, `sales.js`, `api.js`)
* **Requerimiento:** Permitir que durante el turno de venta, ante la necesidad de dar cambio (por falta de billetes chicos o monedas), el cajero/administrador pueda registrar un aumento de efectivo en la caja registradora de manera ágil sin interrumpir la operación.
* **Solución Implementada:**
  * **1. Botón e Indicador en Cabecera del POS (`POSView.jsx`):**
    * Se incorporó el botón verde esmeralda **`➕ Aumento a caja`** en la esquina superior derecha del POS (junto a la calculadora y al botón de cerrar caja).
    * El badge de caja inicial (`💵 Caja Inicial`) muestra automáticamente los aumentos acumulados: `Bs. 200.00 (+50.00 aumento)`.
  * **2. Ventana Modal de Ingreso de Efectivo:**
    * Modal oscuro con campo numérico **`Monto a ingresar (Bs.):*`** con prefijo `Bs.` y selector rápido de motivo/observación (`Cambio para caja`).
  * **3. Backend y Persistencia (`sales.js` y `api.js`):**
    * Endpoint `POST /sales/cash-register/cash-in` para registrar cada ingreso con ID, monto, fecha/hora y usuario.
    * Acumulación en la sesión activa y persistencia sincronizada en base de datos y `localStorage`.
  * **4. Impacto Automático en el Arqueo de Cierre de Caja:**
    * En el modal **Cerrar caja (`Registro actual`)**, se agrega la fila **`Aumentos de efectivo (Cambio en turno): +Bs. XX.XX`**.
    * La fórmula y el cálculo del efectivo esperado se actualizan dinámicamente:
      $$\text{Total} = \text{Apertura} + \text{Aumentos} + \text{Venta} - \text{Reembolso} = \text{Efectivo Esperado}$$

### 109. Limpieza de Textos de Pie de Página en Apertura de Caja (`POSView.jsx`)
* **Requerimiento:** Retirar los textos `InvenPro - V6.32 | Copyright © 2026 All rights reserved.` y `Sistema POS C&C` de la parte inferior de la vista de "Abrir caja registradora".
* **Solución Implementada:**
  * Se eliminó el bloque de pie de página innecesario en `POSView.jsx`, dejando la interfaz más limpia, minimalista y despejada.

### 110. Aislamiento Estricto de Ventas y Productos por Turno de Caja Registradora (`POSView.jsx`, `sales.js`)
* **Problema Identificado:**
  * Si se abría y cerraba una caja, y posteriormente ese mismo día se volvía a abrir otra caja, el modal de cierre acumulaba erróneamente todas las ventas históricas/recientes del día en lugar de mostrar **únicamente** las ventas y productos vendidos durante esa sesión de caja en particular.
* **Solución Implementada:**
  * **1. Marcas Temporales e Identificadores de Sesión:**
    * Al abrir la caja registradora (`POST /sales/cash-register/open` y `handleOpenRegisterSubmit`), se registra `openedAtTimestamp` y `fechaAperturaISO`.
    * Cada venta realizada en el POS (`newSale`) vincula el identificador del turno activo `cajaSessionId`, su fecha `fechaVentaISO` y timestamp exacto.
    * El endpoint backend `GET /sales/recent` devuelve `fechaVentaISO` y `timestamp` numérico.
  * **2. Filtrado Estricto en el Arqueo (`handleOpenCloseRegisterModal`):**
    * Se implementó un filtro que compara las transacciones contra el momento de apertura de la sesión activa (`saleTime >= sessionOpenedAt - 15000` o `sale.cajaSessionId === cashRegisterData.id`).
    * Tanto los importes de venta (`cashSales`, `digitalSales`, `totalSales`), los reembolsos, como la tabla de **Detalles de los productos vendidos** ahora consideran exclusivamente las transacciones generadas en el turno actual.

### 111. Corrección en Carga de Productos Vendidos y Persistencia de Turno (`POSView.jsx`)
* **Problema Identificado:**
  * Al realizar ventas en un turno activo y abrir la ventana de Cierre de Caja, la tabla mostraba *"No se registraron ventas de productos en este turno"* y los totales aparecían en 0.00.
  * **Causas Raíz:**
    1. Las ventas generadas en frontend (`newSale`) almacenaban los ítems únicamente bajo la propiedad `items: [...]`, mientras que el algoritmo de arqueo buscaba `s.detalles`, quedando los productos sin procesar.
    2. Existían discrepancias de zona horaria entre timestamps de SQL Server y `Date.now()` en el navegador al comparar fechas en sesiones recién abiertas.
* **Solución Implementada:**
  * **1. Estructura Completa de Detalles:** `newSale` ahora genera la lista normalizada `detalles` (mapeando `ProductoID`, `codigo`, `producto`, `nombre`, `cantidad`, `precioUnitario` y `subtotal`).
  * **2. Estado y Persistencia Dedicada de Turno (`currentShiftSales` / `cyc_current_shift_sales`):**
    * Cada venta realizada en el turno activo se registra directamente en el estado de turno y en `localStorage`.
    * Al abrir la caja se inicializa en `[]` y al cerrarla se purga de inmediato.
  * **3. Agrupación Tolerante y Multi-Esquema:** El algoritmo de cierre ahora procesa tanto `s.detalles` como `s.items`, garantizando que la lista de productos y los totales en efectivo y digitales se calculen con 100% de precisión y fidelidad.

### 112. Filtrado Estricto del Módulo de Facturación (`/facturacion`) y Exclusión de Ventas Mostrador (`sales.js`)
* **Problema Identificado:**
  * Al realizar una venta rápida a `Cliente General` (ticket de mostrador sin emisión de factura), esta aparecía incorrectamente en el listado oficial del módulo de **Facturación** (`/facturacion`).
  * **Causa:** El endpoint backend `GET /sales/invoices` retornaba todas las filas de la tabla `Ventas` (`Venta.findAll()`), asumiendo erróneamente que toda venta era una factura emitida.
* **Solución Implementada:**
  * **1. Registro de Emisión de Facturas (`invoicedSalesSet`):**
    * Se incorporó el control de emisión que registra únicamente las ventas que fueron explícitamente facturadas (`isInvoice: true` o mediante `PATCH /sales/:id/invoice` tras ingresar Razón Social y NIT).
  * **2. Filtrado en `GET /sales/invoices`:**
    * Ahora el listado oficial de facturas excluye las ventas mostrador de `Cliente General` / `Sin Factura` (con NIT 0) y muestra exclusivamente aquellas ventas que cuentan con factura fiscal emitida formalmente con NIT y Razón Social o registro de emisión.






