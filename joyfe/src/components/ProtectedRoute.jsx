import { Navigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken } from '../utils/auth';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const authenticated = isAuthenticated();
  const user = getUserFromToken();

  // If not authenticated, redirect to login
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // If specific role is required and user doesn't have it, redirect to home
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
