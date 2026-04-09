const API_BASE = '/api/admin';

export interface SystemHealthComponent {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'error';
  latency?: number;
  details?: string;
  lastCheck: string;
}

export interface SystemHealthData {
  overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  components: SystemHealthComponent[];
  metrics: {
    memoryUsedPct: number;
    memoryUsedGB: number;
    memoryTotalGB: number;
    cpuCores: number;
    loadAvg1m: number;
    uptime: number;
    activeSessions: number;
    recentErrors: number;
    openAlerts: number;
  };
  timestamp: string;
}

export interface TicketBreakdownItem {
  name: string;
  value: number;
}

export interface TicketTrendItem {
  date: string;
  created: number;
  resolved: number;
}

export interface RecentTicketItem {
  id: string;
  ticketNumber: string;
  status: string;
  priority: string;
  category: string;
  customer?: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface TicketOverviewData {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  statusCounts: TicketBreakdownItem[];
  priorityCounts: TicketBreakdownItem[];
  categoryCounts: TicketBreakdownItem[];
  dailyTrend: TicketTrendItem[];
  recentTickets: RecentTicketItem[];
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('admin_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Stats
  getStatsToday: () => request<{ data: Record<string, unknown> }>('/stats/today'),
  getStatsHistory: (days = 30) =>
    request<{ data: Array<Record<string, unknown>> }>(`/stats/history?days=${days}`),
  getTicketOverview: (days = 14) =>
    request<{ data: TicketOverviewData }>(`/tickets/overview?days=${days}`),

  // Users
  getUsers: (page = 1, limit = 20, search?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(
      `/users?${params}`
    );
  },
  getUser: (id: string) => request<{ data: Record<string, unknown> }>(`/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Broadcasts
  getBroadcasts: () => request<{ data: Array<Record<string, unknown>> }>('/broadcasts'),
  createBroadcast: (content: string, targetPlatform?: string) =>
    request<{ data: Record<string, unknown> }>('/broadcasts', {
      method: 'POST',
      body: JSON.stringify({ content, targetPlatform }),
    }),

  // Moderation
  getModerationRules: () => request<{ data: Array<Record<string, unknown>> }>('/moderation/rules'),
  createModerationRule: (rule: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/moderation/rules', {
      method: 'POST',
      body: JSON.stringify(rule),
    }),
  deleteModerationRule: (id: string) =>
    request<{ success: boolean }>(`/moderation/rules/${id}`, { method: 'DELETE' }),
  getModerationLogs: (page = 1) =>
    request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(
      `/moderation/logs?page=${page}`
    ),

  // Audit
  getAuditLogs: (page = 1, action?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (action) params.set('action', action);
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(
      `/audit?${params}`
    );
  },

  // Webhooks
  getWebhooks: () => request<{ data: Array<Record<string, unknown>> }>('/webhooks'),
  createWebhook: (webhook: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(webhook),
    }),
  deleteWebhook: (id: string) =>
    request<{ success: boolean }>(`/webhooks/${id}`, { method: 'DELETE' }),

  // Flows
  getFlows: () => request<{ data: Array<Record<string, unknown>> }>('/flows'),
  createFlow: (flow: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/flows', {
      method: 'POST',
      body: JSON.stringify(flow),
    }),
  deleteFlow: (id: string) =>
    request<{ success: boolean }>(`/flows/${id}`, { method: 'DELETE' }),

  // ─── Tickets ──────────────────────────────────────────────
  getTickets: (page = 1, limit = 20, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/tickets?${params}`);
  },
  getTicket: (id: string) => request<{ data: Record<string, unknown> }>(`/tickets/${id}`),
  updateTicket: (id: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ─── SLA Dashboard ───────────────────────────────────────
  getSLADashboard: () => request<{ data: Record<string, unknown> }>('/sla/dashboard'),

  // ─── Escalations ─────────────────────────────────────────
  getEscalations: (page = 1) =>
    request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/escalations?page=${page}`),
  getEscalationRules: () => request<{ data: Array<Record<string, unknown>> }>('/escalation-rules'),
  createEscalationRule: (rule: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/escalation-rules', { method: 'POST', body: JSON.stringify(rule) }),
  deleteEscalationRule: (id: string) =>
    request<{ success: boolean }>(`/escalation-rules/${id}`, { method: 'DELETE' }),

  // ─── Alerts ──────────────────────────────────────────────
  getAlerts: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/alerts?${params}`);
  },
  acknowledgeAlert: (id: string) =>
    request<{ data: Record<string, unknown> }>(`/alerts/${id}/acknowledge`, { method: 'PUT' }),
  resolveAlert: (id: string) =>
    request<{ data: Record<string, unknown> }>(`/alerts/${id}/resolve`, { method: 'PUT' }),
  getAlertRules: () => request<{ data: Array<Record<string, unknown>> }>('/alert-rules'),
  createAlertRule: (rule: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/alert-rules', { method: 'POST', body: JSON.stringify(rule) }),
  deleteAlertRule: (id: string) =>
    request<{ success: boolean }>(`/alert-rules/${id}`, { method: 'DELETE' }),

  // ─── Uptime Monitor ──────────────────────────────────────
  getUptimeTargets: () => request<{ data: Array<Record<string, unknown>> }>('/uptime/targets'),
  createUptimeTarget: (target: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/uptime/targets', { method: 'POST', body: JSON.stringify(target) }),
  deleteUptimeTarget: (id: string) =>
    request<{ success: boolean }>(`/uptime/targets/${id}`, { method: 'DELETE' }),
  getUptimeChecks: (id: string, limit = 100) =>
    request<{ data: Array<Record<string, unknown>> }>(`/uptime/targets/${id}/checks?limit=${limit}`),

  // ─── Network Health ──────────────────────────────────────
  getNetworkBranches: () => request<{ data: Array<Record<string, unknown>> }>('/network/branches'),

  // ─── Server Status ───────────────────────────────────────
  getServerStatus: () => request<{ data: Record<string, unknown> }>('/server/status'),
  getSystemHealth: () => request<{ data: SystemHealthData }>('/system/health'),
  getServerLogs: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/server/logs?${params}`);
  },

  // ─── Shift Handover ──────────────────────────────────────
  getShiftHandovers: (limit = 20) =>
    request<{ data: Array<Record<string, unknown>> }>(`/shift-handovers?limit=${limit}`),
  getCurrentShift: () => request<{ data: Record<string, unknown> }>('/shift-handovers/current'),

  // ─── Tasks ───────────────────────────────────────────────
  getTasks: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/tasks?${params}`);
  },
  updateTask: (id: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ─── Reports ─────────────────────────────────────────────
  getScheduledReports: () => request<{ data: Array<Record<string, unknown>> }>('/reports/scheduled'),
  createScheduledReport: (report: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/reports/scheduled', { method: 'POST', body: JSON.stringify(report) }),
  deleteScheduledReport: (id: string) =>
    request<{ success: boolean }>(`/reports/scheduled/${id}`, { method: 'DELETE' }),

  // ─── Knowledge Base ──────────────────────────────────────
  getKnowledge: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number }; topics?: Array<{ name: string; count: number }> }>(`/knowledge?${params}`);
  },
  createKnowledge: (entry: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/knowledge', { method: 'POST', body: JSON.stringify(entry) }),
  deleteKnowledge: (id: string) =>
    request<{ success: boolean }>(`/knowledge/${id}`, { method: 'DELETE' }),

  // ─── Incidents ───────────────────────────────────────────
  getIncidents: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/incidents?${params}`);
  },
  updateIncident: (id: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ─── Backup ──────────────────────────────────────────────
  getBackups: () => request<{ data: Array<Record<string, unknown>> }>('/backups'),

  // ─── Bulk Operations ─────────────────────────────────────
  getBulkJobs: () => request<{ data: Array<Record<string, unknown>> }>('/bulk-jobs'),

  // ─── Checklists ──────────────────────────────────────────
  getChecklistTemplates: () => request<{ data: Array<Record<string, unknown>> }>('/checklists/templates'),
  createChecklistTemplate: (template: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>('/checklists/templates', { method: 'POST', body: JSON.stringify(template) }),
  deleteChecklistTemplate: (id: string) =>
    request<{ success: boolean }>(`/checklists/templates/${id}`, { method: 'DELETE' }),
  getChecklistItems: (page = 1, date?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (date) params.set('date', date);
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/checklists/items?${params}`);
  },

  // ─── Reminders ───────────────────────────────────────────
  getReminders: (page = 1, delivered?: string) => {
    const params = new URLSearchParams({ page: String(page) });
    if (delivered) params.set('delivered', delivered);
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/reminders?${params}`);
  },
  deleteReminder: (id: string) =>
    request<{ success: boolean }>(`/reminders/${id}`, { method: 'DELETE' }),

  // ─── Groups ──────────────────────────────────────────────
  getGroups: () => request<{ data: Array<Record<string, unknown>> }>('/groups'),
  updateGroup: (id: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // ─── Memory ──────────────────────────────────────────────
  getMemory: (page = 1, filters?: Record<string, string>) => {
    const params = new URLSearchParams({ page: String(page) });
    if (filters) Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    return request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/memory?${params}`);
  },
  deleteMemory: (id: string) =>
    request<{ success: boolean }>(`/memory/${id}`, { method: 'DELETE' }),

  // ─── Settings ────────────────────────────────────────────
  getBotConfigs: () => request<{ data: Array<Record<string, unknown>> }>('/settings/bot-config'),
  updateBotConfig: (platform: string, data: Record<string, unknown>) =>
    request<{ data: Record<string, unknown> }>(`/settings/bot-config/${platform}`, { method: 'PUT', body: JSON.stringify(data) }),
  getActiveSessions: (page = 1) =>
    request<{ data: Array<Record<string, unknown>>; pagination: { total: number } }>(`/settings/sessions?page=${page}`),
};
