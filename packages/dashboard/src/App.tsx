import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/Dashboard';
import UsersPage from './pages/Users';
import BroadcastPage from './pages/Broadcast';
import ModerationPage from './pages/Moderation';
import AuditPage from './pages/Audit';
import WebhooksPage from './pages/Webhooks';
import FlowsPage from './pages/Flows';
import LoginPage from './pages/Login';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="flows" element={<FlowsPage />} />
      </Route>
    </Routes>
  );
}
