import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { token, checking } = useAuth();
  const location = useLocation();
  if (checking) return <div className="screen-message">Checking your session…</div>;
  return token ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
}
