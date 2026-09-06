USE Ferreteria;
-- =============================================
-- TABLAS MAESTRAS Y HERENCIA (PERSONAS)
-- =============================================

CREATE TABLE Personas (
    PersonaID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    PrimerApellido VARCHAR(100) NOT NULL,
    SegundoApellido VARCHAR(100),
    CI_NIT VARCHAR(30),
    Telefono VARCHAR(20),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Empleados (
    EmpleadoID INT PRIMARY KEY, -- Funciona como PK y FK
    Direccion VARCHAR(255),
    Cargo VARCHAR(100),
    CONSTRAINT FK_Empleado_Persona FOREIGN KEY (EmpleadoID) REFERENCES Personas(PersonaID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Clientes (
    ClienteID INT PRIMARY KEY, -- Funciona como PK y FK
    RazonSocial VARCHAR(150),
    -- El NIT puede heredarse de CI_NIT de Persona, pero lo mantenemos si hay variaciones
    CONSTRAINT FK_Cliente_Persona FOREIGN KEY (ClienteID) REFERENCES Personas(PersonaID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE CuentasUsuario (
    UsuarioID INT IDENTITY(1,1) PRIMARY KEY,
    Correo VARCHAR(150) UNIQUE NOT NULL,
    Contrasena VARCHAR(255) NOT NULL,
    Rol VARCHAR(50) NOT NULL,
    EmpleadoID INT NULL,
    ClienteID INT NULL,
    CONSTRAINT FK_Usuario_Empleado FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID),
    CONSTRAINT FK_Usuario_Cliente FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

-- =============================================
-- CATÁLOGOS DE INVENTARIO
-- =============================================

CREATE TABLE Categorias (
    CategoriaID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(255),
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Marcas (
    MarcaID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(255),
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Unidades (
    UnidadID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL, -- Ej. Metros, Litros, Unidades
    Descripcion VARCHAR(255),
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Almacenes (
    AlmacenID INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Direccion VARCHAR(255),
    Telefono VARCHAR(20),
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Ubicaciones (
    UbicacionID INT IDENTITY(1,1) PRIMARY KEY,
    AlmacenID INT NOT NULL,
    Descripcion VARCHAR(255), -- Ej. Pasillo 3, Estante B
    CONSTRAINT FK_Ubicacion_Almacen FOREIGN KEY (AlmacenID) REFERENCES Almacenes(AlmacenID),
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

-- =============================================
-- PRODUCTOS Y LOTES
-- =============================================

CREATE TABLE Productos (
    ProductoID INT IDENTITY(1,1) PRIMARY KEY,
    CodigoBarras VARCHAR(100) UNIQUE,
    TipoCodigoBarras VARCHAR(50),
    Nombre VARCHAR(150) NOT NULL,
    Descripcion TEXT,
    PrecioCompra DECIMAL(10,2),
    PrecioVenta DECIMAL(10,2) NOT NULL,
    Margen DECIMAL(5,2),
    LoteMinimo INT DEFAULT 5,
    Imagen VARCHAR(255),
    CategoriaID INT NOT NULL,
    MarcaID INT NOT NULL,
    UnidadID INT NOT NULL,
    UbicacionID INT NOT NULL,
    CONSTRAINT FK_Producto_Categoria FOREIGN KEY (CategoriaID) REFERENCES Categorias(CategoriaID),
    CONSTRAINT FK_Producto_Marca FOREIGN KEY (MarcaID) REFERENCES Marcas(MarcaID),
    CONSTRAINT FK_Producto_Unidad FOREIGN KEY (UnidadID) REFERENCES Unidades(UnidadID),
    CONSTRAINT FK_Producto_Ubicacion FOREIGN KEY (UbicacionID) REFERENCES Ubicaciones(UbicacionID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Lotes (
    LoteID INT IDENTITY(1,1) PRIMARY KEY,
    ProductoID INT NOT NULL,
    NumeroLote VARCHAR(100),
    Stock INT NOT NULL DEFAULT 0,
    FechaVencimiento DATE,
    CONSTRAINT FK_Lote_Producto FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

-- =============================================
-- VENTAS Y FACTURACIÓN
-- =============================================

CREATE TABLE Ventas (
    VentaID INT IDENTITY(1,1) PRIMARY KEY,
    ClienteID INT NULL, -- Puede ser nulo si es una venta rápida a consumidor final
    EmpleadoID INT NOT NULL,
    FechaVenta DATETIME DEFAULT GETDATE(),
    Total DECIMAL(10,2) NOT NULL,
    CONSTRAINT FK_Venta_Cliente FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID),
    CONSTRAINT FK_Venta_Empleado FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE DetalleVentas (
    DetalleVentaID INT IDENTITY(1,1) PRIMARY KEY,
    VentaID INT NOT NULL,
    ProductoID INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    CONSTRAINT FK_DetalleVenta_Venta FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    CONSTRAINT FK_DetalleVenta_Producto FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Facturas (
    FacturaID INT IDENTITY(1,1) PRIMARY KEY,
    VentaID INT NOT NULL UNIQUE, -- Relación 1 a 1 con la venta
    NumeroFactura INT NOT NULL,
    CUFD VARCHAR(255),
    CUF VARCHAR(255),
    PrecioNeto DECIMAL(10,2),
    Descuento DECIMAL(10,2) DEFAULT 0,
    PrecioTotal DECIMAL(10,2) NOT NULL,
    Leyenda TEXT,
    CONSTRAINT FK_Factura_Venta FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

-- =============================================
-- PEDIDOS ONLINE Y ASISTENCIA (CHATBOT)
-- =============================================

CREATE TABLE PedidosOnline (
    PedidoID INT IDENTITY(1,1) PRIMARY KEY,
    ClienteID INT NOT NULL,
    FechaPedido DATETIME DEFAULT GETDATE(),
    EstadoPedido VARCHAR(50) DEFAULT 'Pendiente', -- Pendiente, Preparando, Listo, Entregado
    Total DECIMAL(10,2) NOT NULL,
    MetodoPago VARCHAR(50),
    CONSTRAINT FK_Pedido_Cliente FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE DetallePedidosOnline (
    DetallePedidoID INT IDENTITY(1,1) PRIMARY KEY,
    PedidoID INT NOT NULL,
    ProductoID INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,
    CONSTRAINT FK_DetallePedido_Pedido FOREIGN KEY (PedidoID) REFERENCES PedidosOnline(PedidoID),
    CONSTRAINT FK_DetallePedido_Producto FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);

CREATE TABLE Historial_Chatbot (
    InteraccionID INT IDENTITY(1,1) PRIMARY KEY,
    ClienteID INT NULL, -- Puede ser nulo si el usuario no inició sesión
    MensajeCliente TEXT NOT NULL,
    RespuestaIA TEXT NOT NULL,
    FechaInteraccion DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Chatbot_Cliente FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID),
    -- Auditoría
    estado BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_edicion DATETIME NULL
);