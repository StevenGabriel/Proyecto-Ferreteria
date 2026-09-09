import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import RegisterClients from './pages/Clients/RegisterClie';
import ClientCatalog from './pages/Clients/ClientCatalog';

import ProductView from './pages/Products/ProductView';
import ProductRegister from './pages/Products/ProductRegisterForm';
import ProductEdit from './pages/Products/ProductEditForm';
import BrandView from './pages/Brands/BrandView';
import CategoryView from './pages/Categories/CategoryView';
import UnitView from './pages/Units/UnitView';
import LocationView from './pages/Locations/LocationView';
import WarehouseView from './pages/Warehouses/WarehouseView';
import UserManagement from './pages/Users/UserManagement';
import InventoryControl from './pages/Inventory/InventoryControl';
import POSView from './pages/Sales/POSView';
import ClientView from './pages/Contacts/ClientView';
import { SidebarProvider } from './context/SidebarContext';

function App() {
  return (
    <Router>
      <SidebarProvider>
        <div className="App">
          <Routes>
            {/* Ruta Principal: Catálogo y Tienda de Clientes */}
            <Route path="/" element={<ClientCatalog />} />
            <Route path="/catalogo" element={<ClientCatalog />} />
            <Route path="/tienda" element={<ClientCatalog />} />
            <Route path="/portalClientes" element={<ClientCatalog />} />

            {/* Rutas de Administración y Dashboard de Operaciones */}
            <Route path="/dashboard" element={<Home />} />
            <Route path="/admin" element={<Home />} />
            <Route path="/home" element={<Home />} />

            {/* Gestión de Usuarios y Permisos RBAC (Objetivo 4) */}
            <Route path="/usuarios" element={<UserManagement />} />
            <Route path="/empleados" element={<UserManagement />} />
            <Route path="/personal" element={<UserManagement />} />

            {/* Gestión de Clientes para Ventas y Facturación */}
            <Route path="/clientes" element={<ClientView />} />
            <Route path="/contactos/clientes" element={<ClientView />} />

            {/* Control de Inventario, Semáforo de Caducidad y Kardex (Objetivo 2) */}
            <Route path="/inventario" element={<InventoryControl />} />
            <Route path="/kardex" element={<InventoryControl />} />
            <Route path="/stock-critico" element={<InventoryControl />} />

            {/* Módulo Punto de Venta POS / Vender (Dedicado Standalone) */}
            <Route path="/vender" element={<POSView />} />
            <Route path="/pos" element={<POSView />} />

            {/* Login Universal y Flujo de Recuperación con Token de 10 min */}
            <Route path="/login" element={<Login />} />
            <Route path="/loginAdm" element={<Login />} />
            <Route path="/loginClie" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/recuperar-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/registerClie" element={<RegisterClients />} />
            <Route path="/registro" element={<RegisterClients />} />

            {/* Vistas de Configuración de Productos y Almacén */}
            <Route path="/productsView" element={<ProductView />} />
            <Route path="/productReg" element={<ProductRegister />} />
            <Route path="/productEdit/:ProductoID" element={<ProductEdit />} />
            <Route path="/marcas" element={<BrandView />} />
            <Route path="/categorias" element={<CategoryView />} />
            <Route path="/unidades" element={<UnitView />} />
            <Route path="/locations" element={<LocationView />} />
            <Route path="/almacenes" element={<WarehouseView />} />
          </Routes>
        </div>
      </SidebarProvider>
    </Router>
  );
}

export default App;
