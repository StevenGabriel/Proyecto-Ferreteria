--BASE DE DATOS DE LA FERRETERIA
USE HardwareStore
-- Creación de la tabla Productos
CREATE TABLE Productos (
    ProductoID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100),
    Descripcion NVARCHAR(255),
    Precio DECIMAL(10, 2),
    Stock INT,
    ProveedorID INT
);

-- Creación de la tabla Proveedores
CREATE TABLE Proveedores (
    ProveedorID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100),
    Direccion NVARCHAR(255),
    Telefono NVARCHAR(20)
);

-- Creación de la tabla Clientes
CREATE TABLE Clientes (
    ClienteID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100),
    Direccion NVARCHAR(255),
    Telefono NVARCHAR(20),
    Email NVARCHAR(100)
);

-- Creación de la tabla Ventas
CREATE TABLE Ventas (
    VentaID INT PRIMARY KEY IDENTITY(1,1),
    ClienteID INT,
    FechaVenta DATETIME,
    Total DECIMAL(10, 2),
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID)
);

-- Creación de la tabla DetalleVentas
CREATE TABLE DetalleVentas (
    DetalleVentaID INT PRIMARY KEY IDENTITY(1,1),
    VentaID INT,
    ProductoID INT,
    Cantidad INT,
    Precio DECIMAL(10, 2),
    FOREIGN KEY (VentaID) REFERENCES Ventas(VentaID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID)
);

-- Creación de la tabla Empleados
CREATE TABLE Empleados (
    EmpleadoID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100),
    Posicion NVARCHAR(100),
    Salario DECIMAL(10, 2)
);

-- Creación de la tabla CuentasUsuario
CREATE TABLE CuentasUsuario (
    UsuarioID INT PRIMARY KEY IDENTITY(1,1),
    Usuario NVARCHAR(50),
    Contrasena NVARCHAR(50),
    NivelAcceso NVARCHAR(50),
    EmpleadoID INT,
    FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID)
);

-- Relacionando los productos con los proveedores
ALTER TABLE Productos
ADD CONSTRAINT FK_Productos_Proveedores
FOREIGN KEY (ProveedorID) REFERENCES Proveedores(ProveedorID);

-- Cambio para la parte del epleado y su venta
-- Modificación de la tabla Ventas para incluir referencia al empleado
ALTER TABLE Ventas
ADD EmpleadoID INT;

-- Agregar la restricción de clave foránea para EmpleadoID
ALTER TABLE Ventas
ADD CONSTRAINT FK_Ventas_Empleados
FOREIGN KEY (EmpleadoID) REFERENCES Empleados(EmpleadoID);

--Cambio para las cuentas de los clientes
-- Modificación de la tabla Clientes para incluir autenticación
ALTER TABLE Clientes
ADD Username NVARCHAR(50),
    Password NVARCHAR(255), -- Considera almacenar una versión hasheada de la contraseña
    UltimoLogin DATETIME;

-- Añadiendo fechas de vencimiento
-- Agregar columna de Fecha de Vencimiento a la tabla Productos
ALTER TABLE Productos
ADD FechaVencimiento DATE NULL; -- Usamos NULL para indicar que no todos los productos necesitan una fecha de vencimiento

--Añadiendo la tabla de marcas para los productos
-- Creación de la tabla Marcas
CREATE TABLE Marcas (
    MarcaID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100),
    Descripcion NVARCHAR(255)
);
-- Agregar columna MarcaID a la tabla Productos
ALTER TABLE Productos
ADD MarcaID INT;

-- Agregar la restricción de clave foránea
ALTER TABLE Productos
ADD CONSTRAINT FK_Productos_Marcas
FOREIGN KEY (MarcaID) REFERENCES Marcas(MarcaID);

DELETE Marcas

--Para el lector de codigos de barras
-- Agregar columna de Código de Barras a la tabla Productos
ALTER TABLE Productos
ADD CodigoBarras NVARCHAR(50) UNIQUE;


--AGREGANDO ALMACENES MAS UNBICACIONES
CREATE TABLE Almacenes (
    AlmacenID INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(100),
    Direccion NVARCHAR(255),
    Telefono NVARCHAR(20)
);

CREATE TABLE Ubicaciones (
    UbicacionID INT PRIMARY KEY IDENTITY(1,1),
    AlmacenID INT,
    Descripcion NVARCHAR(255),
    FOREIGN KEY (AlmacenID) REFERENCES Almacenes(AlmacenID)
);

-- Agregar columna UbicacionID a la tabla Productos
ALTER TABLE Productos
ADD UbicacionID INT;

-- Agregar la restricción de clave foránea
ALTER TABLE Productos
ADD CONSTRAINT FK_Productos_Ubicaciones
FOREIGN KEY (UbicacionID) REFERENCES Ubicaciones(UbicacionID);

--Borrando salario de empleados
ALTER TABLE Empleados
DROP COLUMN Salario;

--pedidos
CREATE TABLE Pedidos (
    PedidoID INT PRIMARY KEY IDENTITY(1,1),
    ProveedorID INT,
    FechaLlegada DATE,
    ProductoID INT,
    CantidadPedida INT,
    PrecioCompra DECIMAL(10, 2),
    FOREIGN KEY (ProveedorID) REFERENCES Proveedores(ProveedorID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID)
);

--apellidos en empleados
ALTER TABLE Empleados
ADD PrimerApellido NVARCHAR(100),
    SegundoApellido NVARCHAR(100);

--apellidos en clientes
-- Modificar la tabla Clientes para incluir primer y segundo apellido
ALTER TABLE Clientes
ADD PrimerApellido NVARCHAR(100),
    SegundoApellido NVARCHAR(100);

--apellidos en proveedores
ALTER TABLE Proveedores
ADD PrimerApellido NVARCHAR(100),
    SegundoApellido NVARCHAR(100);


--Agregando nit a clientes
ALTER TABLE Clientes
ADD NIT varchar(20);  -- Asume un tamaño adecuado para el NIT, ajusta según sea necesario
ALTER TABLE Clientes
ADD RazonSocial varchar(20);


-- Creación de la tabla Pedidos
CREATE TABLE PedidosOnline (
    PedidoID INT PRIMARY KEY IDENTITY(1,1),
    ClienteID INT,
    FechaPedido DATETIME,
    EstadoPedido NVARCHAR(50),
    Total DECIMAL(10, 2),
    MetodoPago NVARCHAR(50),
    FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID)
);

-- Creación de la tabla DetallePedidosOnline
CREATE TABLE DetallePedidosOnline (
    DetallePedidoID INT PRIMARY KEY IDENTITY(1,1),
    PedidoID INT,
    ProductoID INT,
    Cantidad INT,
    PrecioUnitario DECIMAL(10, 2),
    FOREIGN KEY (PedidoID) REFERENCES PedidosOnline(PedidoID),
    FOREIGN KEY (ProductoID) REFERENCES Productos(ProductoID)
);

-- tabla cuentas usuario realacion con clientes
ALTER TABLE CuentasUsuario
ADD ClienteID INT;

-- Agrega la restricción de clave foránea para vincular con la tabla Clientes
ALTER TABLE CuentasUsuario
ADD CONSTRAINT FK_CuentasUsuario_Clientes
FOREIGN KEY (ClienteID) REFERENCES Clientes(ClienteID);

--borramos datos de la tabla cliente
ALTER TABLE Clientes
DROP COLUMN Email;

ALTER TABLE Clientes
DROP COLUMN Username;

ALTER TABLE Clientes
DROP COLUMN Password;

--realacion de 1 a 1 clientes a su cuenta
-- Asegurar que ClienteID en CuentasUsuario es único
ALTER TABLE CuentasUsuario
ADD CONSTRAINT UC_CuentasUsuario_ClienteID UNIQUE (ClienteID);

--cambiando tabla de clientes
-- Eliminar columnas innecesarias
ALTER TABLE Clientes
DROP COLUMN Direccion;
ALTER TABLE Clientes
DROP COLUMN RazonSocial;
EXEC sp_rename 'Clientes.NIT', 'Ci_Nit', 'COLUMN';

-- cambio a empleados
ALTER TABLE Empleados
ADD CI NVARCHAR(20),  -- Asume que CI no estaba previamente
   Direccion NVARCHAR(255);  -- Asume que Direccion no estaba previamente
-- Eliminar columnas innecesarias, si existen (como Salario, Posicion, etc.)
ALTER TABLE Empleados
DROP COLUMN Posicion;

ALTER TABLE Empleados
ADD Telefono NVARCHAR(20);  -- Asume que CI no estaba previamente

--renombramos cuentasusuario
-- Renombrar Usuario a Correo
EXEC sp_rename 'CuentasUsuario.Usuario', 'Correo', 'COLUMN';

-- Renombrar NivelAcceso a Rol
EXEC sp_rename 'CuentasUsuario.NivelAcceso', 'Rol', 'COLUMN';


--CAMBIOS 2026
-- 1. Agregar las nuevas columnas a la tabla de Productos
ALTER TABLE Productos ADD UnidadID INT NULL;
ALTER TABLE Productos ADD CategoriaID INT NULL;
ALTER TABLE Productos ADD TipoCodigoBarras VARCHAR(50) NULL;
ALTER TABLE Productos ADD PrecioCompra DECIMAL(10, 2) NULL;
ALTER TABLE Productos ADD Margen DECIMAL(5, 2) NULL;
ALTER TABLE Productos ADD Imagen VARCHAR(255) NULL;

-- 2. Crear las llaves foráneas para mantener la integridad de los datos
-- (Asegúrate de que las tablas 'Unidades' y 'Categorias' ya existan en la DB)
ALTER TABLE Productos
ADD CONSTRAINT FK_Productos_Unidades FOREIGN KEY (UnidadID)
REFERENCES Unidades(UnidadID) ON DELETE SET NULL;

ALTER TABLE Productos
ADD CONSTRAINT FK_Productos_Categorias FOREIGN KEY (CategoriaID)
REFERENCES Categorias(CategoriaID) ON DELETE SET NULL;