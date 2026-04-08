import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { AccessLevelRoute } from './components/AccessLevelRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { EquipmentsPage } from './pages/EquipmentsPage';
import { OrdersPage } from './pages/OrdersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PartsPage } from './pages/PartsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { CargosPage } from './pages/CargosPage';
import { PhotosPage } from './pages/PhotosPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { PublicStatusPage } from './pages/PublicStatusPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/public/os/:id" element={<PublicStatusPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clientes" element={<ClientsPage />} />
          <Route path="/equipamentos" element={<EquipmentsPage />} />
          <Route path="/ordens" element={<OrdersPage />} />
          <Route path="/pagamentos" element={<PaymentsPage />} />
          <Route path="/pecas" element={<PartsPage />} />
          <Route
            path="/funcionarios"
            element={(
              <AccessLevelRoute minLevel={2}>
                <EmployeesPage />
              </AccessLevelRoute>
            )}
          />
          <Route
            path="/cargos"
            element={(
              <AccessLevelRoute minLevel={2}>
                <CargosPage />
              </AccessLevelRoute>
            )}
          />
          <Route path="/fotos" element={<PhotosPage />} />
          <Route
            path="/notificacoes"
            element={(
              <AccessLevelRoute minLevel={2}>
                <NotificationsPage />
              </AccessLevelRoute>
            )}
          />
          <Route
            path="/relatorios"
            element={(
              <AccessLevelRoute minLevel={2}>
                <ReportsPage />
              </AccessLevelRoute>
            )}
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
