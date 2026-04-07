const API_BASE = '/api/admin';

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
};
