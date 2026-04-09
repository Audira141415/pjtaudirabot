import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import Layout from './components/Layout';
import DashboardPage from './pages/Dashboard';
import UsersPage from './pages/Users';
import BroadcastPage from './pages/Broadcast';
import ModerationPage from './pages/Moderation';
import AuditPage from './pages/Audit';
import WebhooksPage from './pages/Webhooks';
import FlowsPage from './pages/Flows';
import LoginPage from './pages/Login';
import TicketsPage from './pages/Tickets';
import SLAMonitorPage from './pages/SLAMonitor';
import AlertsPage from './pages/Alerts';
import UptimeMonitorPage from './pages/UptimeMonitor';
import NetworkHealthPage from './pages/NetworkHealth';
import ServerStatusPage from './pages/ServerStatus';
import ShiftHandoverPage from './pages/ShiftHandover';
import TaskManagerPage from './pages/TaskManager';
import ReportsPage from './pages/Reports';
import KnowledgeBasePage from './pages/KnowledgeBase';
import AIInsightsPage from './pages/AIInsights';
import MemoryBrowserPage from './pages/MemoryBrowser';
import BackupManagerPage from './pages/BackupManager';
import BulkOperationsPage from './pages/BulkOperations';
import ChecklistPage from './pages/Checklist';
import RemindersPage from './pages/Reminders';
import GroupManagementPage from './pages/GroupManagement';
import SettingsPage from './pages/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <ToastContainer />
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
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="sla" element={<SLAMonitorPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="uptime" element={<UptimeMonitorPage />} />
        <Route path="network" element={<NetworkHealthPage />} />
        <Route path="server" element={<ServerStatusPage />} />
        <Route path="shift" element={<ShiftHandoverPage />} />
        <Route path="tasks" element={<TaskManagerPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="knowledge" element={<KnowledgeBasePage />} />
        <Route path="incidents" element={<AIInsightsPage />} />
        <Route path="memory" element={<MemoryBrowserPage />} />
        <Route path="backups" element={<BackupManagerPage />} />
        <Route path="bulk" element={<BulkOperationsPage />} />
        <Route path="checklist" element={<ChecklistPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="groups" element={<GroupManagementPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
    </>
  );
}
