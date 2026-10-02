import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import MaintenancePage from './pages/MaintenancePage';
import HistoryPage from './pages/HistoryPage';
import EquipmentPage from './pages/EquipmentPage';
import EnvironmentPage from './pages/EnvironmentPage';
import AdminRoute from './components/AdminRoute';

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/environment" element={<EnvironmentPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route element={<AdminRoute />}>
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
