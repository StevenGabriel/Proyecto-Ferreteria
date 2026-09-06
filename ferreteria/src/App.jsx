import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home/Home';
import About from './pages/About/About';
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import RegisterAdmins from './pages/Admins/RegisterAdm';
import RegisterClients from './pages/Clients/RegisterClie';
import ClientCatalog from './pages/Clients/ClientCatalog';

import ProductView from './pages/Products/ProductView';
import ProductRegister from './pages/Products/ProductRegisterForm';
import ProductEdit from './pages/Products/ProductEditForm'; // Asegúrate de importar el componente de edición
import BrandView from './pages/Brands/BrandView';
import CategoryView from './pages/Categories/CategoryView';
import UnitView from './pages/Units/UnitView';
import LocationView from './pages/Locations/LocationView';
import WarehouseView from './pages/Warehouses/WarehouseView';


//import Navigation from './components/Navigation'; // Si tienes un componente de navegación
import DataComponent from './components/DataComponent';
import RegisterAdmin from './components/Login/Administrator/RegisterAdmin';
import { SidebarProvider } from './context/SidebarContext';

// Importar otras páginas y componentes según sea necesario

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
            <Route path="/about" element={<About />} />

            {/* Login Universal y Flujo de Recuperación con Token de 10 min */}
            <Route path="/login" element={<Login />} />
            <Route path="/loginAdm" element={<Login />} />
            <Route path="/loginClie" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/recuperar-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/registerAdm" element={<RegisterAdmins />} />
            <Route path="/registerClie" element={<RegisterClients />} />

            <Route path="/productsView" element={<ProductView />} />
            <Route path="/productReg" element={<ProductRegister />} />
            <Route path="/productEdit/:ProductoID" element={<ProductEdit />} />
            <Route path="/marcas" element={<BrandView />} />
            <Route path="/categorias" element={<CategoryView />} />
            <Route path="/unidades" element={<UnitView />} />
            <Route path="/locations" element={<LocationView />} />
            <Route path="/almacenes" element={<WarehouseView />} />

            {/* Otras rutas */}
          </Routes>
        </div>
      </SidebarProvider>
    </Router>
  );
}

export default App;
