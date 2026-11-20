import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Componente Guardián de Rutas Protegidas (RBAC)
 * @param {Array<string>} allowedRoles - Lista de roles permitidos (ej. ['administrador', 'vendedor', 'cajero'])
 * @param {React.ReactNode} children - Componente a renderizar si la autorización es válida
 */
function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();

  // 1. Obtener la sesión activa desde LocalStorage
  let currentUser = null;
  try {
    const raw = localStorage.getItem('cyc_user_session') || localStorage.getItem('cyc_client_session');
    currentUser = raw ? JSON.parse(raw) : null;
  } catch (err) {
    currentUser = null;
  }

  // 2. Si no hay sesión activa, rebotar inmediatamente al Login
  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 3. Normalizar el rol del usuario
  const userRole = (currentUser.Rol || '').toLowerCase().trim();

  // 4. Si la ruta especifica roles permitidos, verificar que el rol del usuario coincida
  if (allowedRoles.length > 0) {
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase().trim());
    const hasPermission = normalizedAllowed.includes(userRole);

    if (!hasPermission) {
      // Si un cliente intenta acceder a módulos administrativos/operativos, redirigir al catálogo
      if (userRole === 'cliente') {
        return <Navigate to="/" replace />;
      }
      // Si un empleado no-admin intenta acceder a una vista exclusiva de administrador (ej. /usuarios)
      return <Navigate to="/home" replace />;
    }
  }

  // 5. Sesión válida y rol autorizado
  return children;
}

export default ProtectedRoute;
