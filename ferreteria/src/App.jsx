import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import RegisterClients from './pages/Clients/RegisterClie';
import ClientCatalog from './pages/Clients/ClientCatalog';
import LandingPage from './pages/Clients/LandingPage';

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
import InvoiceListView from './pages/Sales/InvoiceListView';
import OnlineOrdersView from './pages/Sales/OnlineOrdersView';
import ClientView from './pages/Contacts/ClientView';
import NotFound from './pages/NotFound/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { SidebarProvider } from './context/SidebarContext';

// Roles autorizados para el sistema
const STAFF_ROLES = ['administrador', 'admin', 'vendedor', 'cajero', 'operador', 'empleado'];
const ADMIN_ROLES = ['administrador', 'admin'];

function App() {
  return (
    <Router>
      <SidebarProvider>
        <div className="App">
          <Routes>
            {/* 1. Rutas Públicas de Libre Acceso (Presentación Institucional y Catálogo) */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/inicio" element={<LandingPage />} />
            <Route path="/nosotros" element={<LandingPage />} />
            <Route path="/catalogo" element={<ClientCatalog />} />
            <Route path="/tienda" element={<ClientCatalog />} />
            <Route path="/portalClientes" element={<ClientCatalog />} />

            {/* 2. Login y Autenticación Pública */}
            <Route path="/login" element={<Login />} />
            <Route path="/loginAdm" element={<Login />} />
            <Route path="/loginClie" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/recuperar-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/registerClie" element={<RegisterClients />} />
            <Route path="/registro" element={<RegisterClients />} />

            {/* 3. Rutas Operativas Protegidas (Personal: Administrador + Empleados) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* 4. Rutas Críticas Protegidas (Exclusivo Administrador - RBAC Objetivo 4) */}
            <Route
              path="/usuarios"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/empleados"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/personal"
              element={
                <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            {/* 5. Gestión de Clientes */}
            <Route
              path="/clientes"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ClientView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contactos/clientes"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ClientView />
                </ProtectedRoute>
              }
            />

            {/* 6. Comprobantes de Venta */}
            <Route
              path="/comprobantes"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InvoiceListView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/facturas"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InvoiceListView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/facturacion"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InvoiceListView />
                </ProtectedRoute>
              }
            />

            {/* 7. Control de Inventario, Semáforo de Caducidad y Kardex */}
            <Route
              path="/inventario"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="/kardex"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stock-critico"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <InventoryControl />
                </ProtectedRoute>
              }
            />

            {/* 8. Módulo Punto de Venta POS / Vender */}
            <Route
              path="/vender"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <POSView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pos"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <POSView />
                </ProtectedRoute>
              }
            />

            {/* 9. Módulo de Pedidos Online / Cola de Recojo en Tienda */}
            <Route
              path="/pedidos-online"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <OnlineOrdersView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pedidos"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <OnlineOrdersView />
                </ProtectedRoute>
              }
            />

            {/* 10. Vistas de Catálogo, Configuración de Productos y Almacén */}
            <Route
              path="/productsView"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ProductView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/productReg"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ProductRegister />
                </ProtectedRoute>
              }
            />
            <Route
              path="/productEdit/:ProductoID"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <ProductEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marcas"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <BrandView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/categorias"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <CategoryView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/unidades"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <UnitView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locations"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <LocationView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/almacenes"
              element={
                <ProtectedRoute allowedRoles={STAFF_ROLES}>
                  <WarehouseView />
                </ProtectedRoute>
              }
            />

            {/* 11. Ruta comodín 404 para cualquier URL inexistente */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </SidebarProvider>
    </Router>
  );
}

export default App;
