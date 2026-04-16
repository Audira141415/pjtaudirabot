import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import Layout from './components/Layout';

// ── Lazy-loaded pages (code-split for faster initial load) ──
const LoginPage = lazy(() => import('./pages/Login'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const UsersPage = lazy(() => import('./pages/Users'));
const BroadcastPage = lazy(() => import('./pages/Broadcast'));
const ModerationPage = lazy(() => import('./pages/Moderation'));
const AuditPage = lazy(() => import('./pages/Audit'));
const WebhooksPage = lazy(() => import('./pages/Webhooks'));
const FlowsPage = lazy(() => import('./pages/Flows'));
const TicketsPage = lazy(() => import('./pages/Tickets'));
const SLAMonitorPage = lazy(() => import('./pages/SLAMonitor'));
const AlertsPage = lazy(() => import('./pages/Alerts'));
const UptimeMonitorPage = lazy(() => import('./pages/UptimeMonitor'));
const NetworkHealthPage = lazy(() => import('./pages/NetworkHealth'));
const ServerStatusPage = lazy(() => import('./pages/ServerStatus'));
const ShiftHandoverPage = lazy(() => import('./pages/ShiftHandover'));
const TaskManagerPage = lazy(() => import('./pages/TaskManager'));
const ReportsPage = lazy(() => import('./pages/Reports'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBase'));
const AIInsightsPage = lazy(() => import('./pages/AIInsights'));
const MemoryBrowserPage = lazy(() => import('./pages/MemoryBrowser'));
const BackupManagerPage = lazy(() => import('./pages/BackupManager'));
const BulkOperationsPage = lazy(() => import('./pages/BulkOperations'));
const ChecklistPage = lazy(() => import('./pages/Checklist'));
const RemindersPage = lazy(() => import('./pages/Reminders'));
const GroupManagementPage = lazy(() => import('./pages/GroupManagement'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const SentimentAnalysisPage = lazy(() => import('./pages/SentimentAnalysis'));
const ScheduledMessagesPage = lazy(() => import('./pages/ScheduledMessages'));
const CampaignManagerPage = lazy(() => import('./pages/CampaignManager'));
const CRMContactsPage = lazy(() => import('./pages/CRMContacts'));
const PaymentManagerPage = lazy(() => import('./pages/PaymentManager'));
const UnifiedInboxPage = lazy(() => import('./pages/UnifiedInbox'));
const AutoModerationPage = lazy(() => import('./pages/AutoModeration'));
const FAQManagerPage = lazy(() => import('./pages/FAQManager'));
const TemplateManagerPage = lazy(() => import('./pages/TemplateManager'));
const ChatbotBuilderPage = lazy(() => import('./pages/ChatbotBuilder'));
const CSATSurveyPage = lazy(() => import('./pages/CSATSurvey'));
const AgentManagementPage = lazy(() => import('./pages/AgentManagement'));
const TagsLabelsPage = lazy(() => import('./pages/TagsLabels'));
const CRMPipelinePage = lazy(() => import('./pages/CRMPipeline'));
const FileManagerPage = lazy(() => import('./pages/FileManager'));
const ApiKeysPageComp = lazy(() => import('./pages/ApiKeysPage'));
const CannedResponsesPage = lazy(() => import('./pages/CannedResponses'));
const AnalyticsChartsPage = lazy(() => import('./pages/AnalyticsCharts'));
const WebhookLogsPage = lazy(() => import('./pages/WebhookLogs'));
const ExportCenterPage = lazy(() => import('./pages/ExportCenter'));
const NotificationRulesPage = lazy(() => import('./pages/NotificationRules'));
const MultiLanguagePage = lazy(() => import('./pages/MultiLanguage'));
const MaintenancePage = lazy(() => import('./pages/Maintenance'));
const AdminHubPage = lazy(() => import('./pages/AdminHub'));
const LiveTerminalPage = lazy(() => import('./pages/LiveTerminal'));
const SLAWeightedCompliancePage = lazy(() => import('./pages/SLAWeightedCompliance'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      gap: '0.75rem',
      color: 'rgba(255,255,255,0.6)',
      fontSize: '0.875rem',
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Loading...
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('admin_token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
    <ToastContainer />
    <Suspense fallback={<PageLoader />}>
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
        <Route path="admin" element={<AdminHubPage />} />
        <Route path="terminal" element={<LiveTerminalPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="broadcast" element={<BroadcastPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="flows" element={<FlowsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="sla" element={<SLAMonitorPage />} />
        <Route path="sla-matrix" element={<SLAWeightedCompliancePage />} />
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
    </Suspense>
    </>
  );
}
