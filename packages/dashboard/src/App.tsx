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
import SentimentAnalysisPage from './pages/SentimentAnalysis';
import ScheduledMessagesPage from './pages/ScheduledMessages';
import CampaignManagerPage from './pages/CampaignManager';
import CRMContactsPage from './pages/CRMContacts';
import PaymentManagerPage from './pages/PaymentManager';
import UnifiedInboxPage from './pages/UnifiedInbox';
import AutoModerationPage from './pages/AutoModeration';
import FAQManagerPage from './pages/FAQManager';
import TemplateManagerPage from './pages/TemplateManager';
import ChatbotBuilderPage from './pages/ChatbotBuilder';
import CSATSurveyPage from './pages/CSATSurvey';
import AgentManagementPage from './pages/AgentManagement';
import TagsLabelsPage from './pages/TagsLabels';
import CRMPipelinePage from './pages/CRMPipeline';
import FileManagerPage from './pages/FileManager';
import ApiKeysPageComp from './pages/ApiKeysPage';
import CannedResponsesPage from './pages/CannedResponses';
import AnalyticsChartsPage from './pages/AnalyticsCharts';
import WebhookLogsPage from './pages/WebhookLogs';
import ExportCenterPage from './pages/ExportCenter';
import NotificationRulesPage from './pages/NotificationRules';
import MultiLanguagePage from './pages/MultiLanguage';
import MaintenancePage from './pages/Maintenance';

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
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="groups" element={<GroupManagementPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="sentiment" element={<SentimentAnalysisPage />} />
        <Route path="scheduled-messages" element={<ScheduledMessagesPage />} />
        <Route path="campaigns" element={<CampaignManagerPage />} />
        <Route path="crm" element={<CRMContactsPage />} />
        <Route path="payments" element={<PaymentManagerPage />} />
        <Route path="inbox" element={<UnifiedInboxPage />} />
        <Route path="auto-moderation" element={<AutoModerationPage />} />
        <Route path="faq" element={<FAQManagerPage />} />
        <Route path="templates" element={<TemplateManagerPage />} />
        <Route path="chatbot" element={<ChatbotBuilderPage />} />
        <Route path="csat" element={<CSATSurveyPage />} />
        <Route path="agents" element={<AgentManagementPage />} />
        <Route path="tags" element={<TagsLabelsPage />} />
        <Route path="pipeline" element={<CRMPipelinePage />} />
        <Route path="files" element={<FileManagerPage />} />
        <Route path="api-keys" element={<ApiKeysPageComp />} />
        <Route path="canned-responses" element={<CannedResponsesPage />} />
        <Route path="analytics" element={<AnalyticsChartsPage />} />
        <Route path="webhook-logs" element={<WebhookLogsPage />} />
        <Route path="exports" element={<ExportCenterPage />} />
        <Route path="notification-rules" element={<NotificationRulesPage />} />
        <Route path="language" element={<MultiLanguagePage />} />
      </Route>
    </Routes>
    </>
  );
}
