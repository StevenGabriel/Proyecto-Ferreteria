import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // Apunta al puerto del backend y no incluye /api redundante
});

// API de Productos
export const getProducts = async () => {
  const response = await api.get('/products');
  return response.data;
};

export const getProduct = async (id) => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await api.post('/products', productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await api.patch(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

export const uploadImage = async (imageBase64, filename) => {
  const response = await api.post('/upload', { imageBase64, filename });
  return response.data;
};

// API de Marcas, Proveedores y Ubicaciones
export const getBrands = async () => {
  const response = await api.get('/brands');
  return response.data;
};

export const createBrand = async (brandData) => {
  const response = await api.post('/brands', brandData);
  return response.data;
};

export const updateBrand = async (id, brandData) => {
  const response = await api.patch(`/brands/${id}`, brandData);
  return response.data;
};

export const deleteBrand = async (id) => {
  const response = await api.delete(`/brands/${id}`);
  return response.data;
};

// API de Categorías
export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};

export const createCategory = async (categoryData) => {
  const response = await api.post('/categories', categoryData);
  return response.data;
};

export const updateCategory = async (id, categoryData) => {
  const response = await api.patch(`/categories/${id}`, categoryData);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};

// API de Unidades
export const getUnits = async () => {
  const response = await api.get('/units');
  return response.data;
};

export const createUnit = async (unitData) => {
  const response = await api.post('/units', unitData);
  return response.data;
};

export const updateUnit = async (id, unitData) => {
  const response = await api.patch(`/units/${id}`, unitData);
  return response.data;
};

export const deleteUnit = async (id) => {
  const response = await api.delete(`/units/${id}`);
  return response.data;
};

export const getSuppliers = async () => {
  const response = await api.get('/suppliers');
  return response.data;
};

export const getLocations = async () => {
  const response = await api.get('/locations');
  return response.data;
};

export const createLocation = async (locationData) => {
  const response = await api.post('/locations', locationData);
  return response.data;
};

export const updateLocation = async (id, locationData) => {
  const response = await api.patch(`/locations/${id}`, locationData);
  return response.data;
};

export const deleteLocation = async (id) => {
  const response = await api.delete(`/locations/${id}`);
  return response.data;
};

// API de Almacenes
export const getWarehouses = async () => {
  const response = await api.get('/warehouses');
  return response.data;
};

export const createWarehouse = async (warehouseData) => {
  const response = await api.post('/warehouses', warehouseData);
  return response.data;
};

export const updateWarehouse = async (id, warehouseData) => {
  const response = await api.patch(`/warehouses/${id}`, warehouseData);
  return response.data;
};

export const deleteWarehouse = async (id) => {
  const response = await api.delete(`/locations/${id}`);
  return response.data;
};

// API de Lotes de Apertura / Existencias
export const getLots = async (productoId) => {
  const response = await api.get(`/lots${productoId ? `?ProductoID=${productoId}` : ''}`);
  return response.data;
};

export const createLots = async (payload) => {
  const response = await api.post('/lots', payload);
  return response.data;
};

// API de Autenticación
export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const requestPasswordReset = async (correo) => {
  const response = await api.post('/auth/forgot-password', { correo });
  return response.data;
};

export const verifyResetToken = async (token) => {
  const response = await api.post('/auth/verify-reset-token', { token });
  return response.data;
};

export const confirmPasswordReset = async (payload) => {
  const response = await api.post('/auth/confirm-reset', payload);
  return response.data;
};

// API de Empleados y Gestión de Usuarios (RBAC)
export const getEmployees = async () => {
  const response = await api.get('/employees');
  return response.data;
};

export const createEmployee = async (payload) => {
  const response = await api.post('/employees', payload);
  return response.data;
};

export const updateEmployee = async (id, payload) => {
  const response = await api.put(`/employees/${id}`, payload);
  return response.data;
};

export const toggleEmployeeStatus = async (id) => {
  const response = await api.patch(`/employees/${id}/status`);
  return response.data;
};

export const resetEmployeePassword = async (id, nuevaContrasena) => {
  const response = await api.patch(`/employees/${id}/reset-password`, { nuevaContrasena });
  return response.data;
};

// API de Control de Inventario, Semáforo de Stock y Caducidad de Lotes (Objetivo 2)
export const getInventorySummary = async () => {
  const response = await api.get('/inventory/summary');
  return response.data;
};

export const getCriticalStock = async (filter = 'ALL', search = '') => {
  const response = await api.get('/inventory/critical-stock', { params: { filter, search } });
  return response.data;
};

export const getExpiringLots = async (filter = 'ALL', search = '') => {
  const response = await api.get('/inventory/expiring-lots', { params: { filter, search } });
  return response.data;
};

export const getKardex = async (params = {}) => {
  const response = await api.get('/inventory/kardex', { params });
  return response.data;
};

export const recordInventoryAdjustment = async (payload) => {
  const response = await api.post('/inventory/adjust', payload);
  return response.data;
};

// API de Ventas y Facturación POS
export const createSale = async (saleData) => {
  const response = await api.post('/sales', saleData);
  return response.data;
};

export const updateSale = async (id, saleData) => {
  const response = await api.put(`/sales/${id}`, saleData);
  return response.data;
};

export const getRecentSales = async () => {
  const response = await api.get('/sales/recent');
  return response.data;
};

export default api;
