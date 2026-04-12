import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, BrainCircuit, Bot, Clock3, Layers3, ShieldAlert, ShieldCheck, Ticket, Zap } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '../lib/badge-colors';
import type { SystemHealthData, TicketOverviewData } from '../lib/api';

interface SlaTrackingItem {
  id: string;
  responseDeadline?: string;
  resolutionDeadline?: string;
  responseBreached?: boolean;
  resolutionBreached?: boolean;
  ticket?: {
    ticketNumber?: string;
    priority?: string;
    customer?: string;
    status?: string;
  };
}

interface SlaDashboardData {
  totalTracked?: number;
  responseBreaches?: number;
  resolutionBreaches?: number;
  complianceRate?: number;
  activeTracking?: SlaTrackingItem[];
  recentBreach?: Array<Record<string, unknown>>;
}

interface AlertItem {
  id: string;
  title?: string;
  message?: string;
  severity?: string;
  status?: string;
  createdAt?: string;
  rule?: { name?: string; alertType?: string };
}

interface IncidentItem {
  id: string;
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  createdAt?: string;
  rootCause?: string;
  solution?: string;
}

interface EscalationItem {
  id: string;
  createdAt?: string;
  resolvedAt?: string | null;
  fromLevel?: string;
  toLevel?: string;
  reason?: string;
  ticket?: {
    ticketNumber?: string;
    customer?: string;
    priority?: string;
    status?: string;
  };
}

interface ClusterItem {
  id: string;
  clusterNumber?: string;
  status?: string;
  severity?: string;
  memberCount?: number;
  impactScore?: number;
  commonCustomer?: string;
  commonService?: string;
  detectedAt?: string;
}

interface OperationalOverviewProps {
  ticketOverview: TicketOverviewData | null;
  slaDashboard: Record<string, unknown> | null;
  alerts: Array<Record<string, unknown>>;
  incidents: Array<Record<string, unknown>>;
  escalations: Array<Record<string, unknown>>;
  openClusters: Array<Record<string, unknown>>;
  health: SystemHealthData | null;
}

function formatDate(dateValue?: string | null): string {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function friendlyConnectionStatus(status?: string): string {
  switch ((status ?? '').toUpperCase()) {
    case 'CONNECTED':
      return 'Connected';
    case 'DEGRADED':
      return 'Degraded';
    case 'DISCONNECTED':
      return 'Disconnected';
    case 'ERROR':
      return 'Error';
    default:
      return status ?? '-';
  }
}

function formatHoursLeft(dateValue?: string): string {
  if (!dateValue) return '-';
  const hoursLeft = Math.ceil((new Date(dateValue).getTime() - Date.now()) / 3600000);
  if (hoursLeft < 0) return `${Math.abs(hoursLeft)}h overdue`;
  if (hoursLeft === 0) return '<1h left';
  return `${hoursLeft}h left`;
}

function severityClass(severity?: string): string {
  switch ((severity ?? '').toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-700';
    case 'MAJOR':
    case 'ERROR':
      return 'bg-orange-100 text-orange-700';
    case 'MINOR':
    case 'WARNING':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function statusClass(status?: string): string {
  switch ((status ?? '').toUpperCase()) {
    case 'ACTIVE':
    case 'OPEN':
      return 'bg-red-100 text-red-700';
    case 'INVESTIGATING':
    case 'ACKNOWLEDGED':
      return 'bg-amber-100 text-amber-700';
    case 'RESOLVED':
    case 'CLOSED':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  );
}

export default function OperationalOverview({
  ticketOverview,
  slaDashboard,
  alerts,
  incidents,
  escalations,
  openClusters,
  health,
}: OperationalOverviewProps) {
  const [slaItemsExpanded, setSlaItemsExpanded] = useState(true);
  const sla = slaDashboard as SlaDashboardData | null;
  const activeAlerts = alerts as unknown as AlertItem[];
  const openIncidents = incidents as unknown as IncidentItem[];
  const openEscalations = (escalations as unknown as EscalationItem[]).filter((escalation) => !escalation.resolvedAt);
  const clusters = openClusters as unknown as ClusterItem[];
  const botComponents = (health?.components ?? []).filter((component) => component.name.endsWith('Bot'));
  const readyBots = botComponents.filter((component) => component.meta?.ready).length;

  const topPriorities = [...(ticketOverview?.priorityCounts ?? [])].sort((a, b) => b.value - a.value).slice(0, 3);
  const topCategories = [...(ticketOverview?.categoryCounts ?? [])].sort((a, b) => b.value - a.value).slice(0, 3);
  const urgentSla = [...(sla?.activeTracking ?? [])]
    .sort((a, b) => new Date(a.resolutionDeadline ?? 0).getTime() - new Date(b.resolutionDeadline ?? 0).getTime())
    .slice(0, 3);
  const hotClusters = [...clusters].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0)).slice(0, 3);

  return (
    <section className="mt-8 space-y-5 rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50/60 p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            Operational Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">SLA risk, incident pressure, and bot readiness in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/sla" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700">
            <ArrowUpRight className="w-4 h-4" /> SLA Monitor
          </Link>
          <Link to="/alerts" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700">
            <ArrowUpRight className="w-4 h-4" /> Alerts
          </Link>
          <Link to="/incidents" className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700">
            <ArrowUpRight className="w-4 h-4" /> Incidents
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <article className="flex h-full flex-col rounded-3xl border border-amber-100 bg-white p-5 shadow-sm ring-1 ring-amber-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="font-semibold tracking-tight text-slate-900">SLA risk + backlog</h3>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">Tickets open, breached SLA, and queue mix by priority and category.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
              {sla?.complianceRate ?? 100}% compliance
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric label="Open Tickets" value={ticketOverview?.openTickets ?? 0} tone="bg-amber-50/40 text-slate-900 border-amber-100" />
            <Metric label="Response Breaches" value={sla?.responseBreaches ?? 0} tone="bg-amber-50/40 text-slate-900 border-amber-100" />
            <Metric label="Resolution Breaches" value={sla?.resolutionBreaches ?? 0} tone="bg-amber-50/40 text-slate-900 border-amber-100" />
            <Metric label="Tracked SLA" value={sla?.totalTracked ?? 0} tone="bg-amber-50/40 text-slate-900 border-amber-100" />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Zap className="w-4 h-4 text-amber-500" /> Priority queue
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {topPriorities.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <span>{item.name}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
                {topPriorities.length === 0 && <p className="text-sm text-slate-400">No priority data</p>}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Ticket className="w-4 h-4 text-amber-500" /> Category queue
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {topCategories.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <span className="truncate">{item.name}</span>
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
                {topCategories.length === 0 && <p className="text-sm text-slate-400">No category data</p>}
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
              <button
                type="button"
                onClick={() => setSlaItemsExpanded((value) => !value)}
                className="inline-flex items-center gap-2 text-left"
                aria-expanded={slaItemsExpanded}
                aria-controls="urgent-sla-items"
              >
                <Clock3 className="w-4 h-4 text-amber-500" /> Urgent SLA items
              </button>
              <button
                type="button"
                onClick={() => setSlaItemsExpanded((value) => !value)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
              >
                {slaItemsExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <div id="urgent-sla-items" className={`mt-4 space-y-3 ${slaItemsExpanded ? '' : 'hidden'}`}>
              {urgentSla.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-600">{item.ticket?.ticketNumber ?? '-'}</span>
                      <PriorityBadge priority={item.ticket?.priority ?? 'MEDIUM'} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{item.ticket?.customer ?? 'Unknown customer'}</p>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    <p className={item.responseBreached || item.resolutionBreached ? 'font-semibold text-red-600' : 'font-semibold text-emerald-600'}>
                      {formatHoursLeft(item.resolutionDeadline)}
                    </p>
                    <p>{formatDate(item.resolutionDeadline)}</p>
                  </div>
                </div>
              ))}
              {urgentSla.length === 0 && <p className="text-sm text-slate-400">No SLA items pending</p>}
            </div>
          </div>
        </article>

        <article className="flex h-full flex-col rounded-3xl border border-rose-100 bg-white p-5 shadow-sm ring-1 ring-rose-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-rose-500" />
                <h3 className="font-semibold tracking-tight text-slate-900">Active incidents + alerts</h3>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">Signals that need attention right now, including open incidents and unresolved escalations.</p>
            </div>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
              {openClusters.length} active clusters
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Active Alerts" value={activeAlerts.length} tone="bg-rose-50/40 text-slate-900 border-rose-100" />
            <Metric label="Open Incidents" value={openIncidents.length} tone="bg-rose-50/40 text-slate-900 border-rose-100" />
            <Metric label="Open Escalations" value={openEscalations.length} tone="bg-rose-50/40 text-slate-900 border-rose-100" />
            <Metric label="Open Clusters" value={openClusters.length} tone="bg-rose-50/40 text-slate-900 border-rose-100" />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Bell className="w-4 h-4 text-red-500" /> Alerts
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {activeAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${severityClass(alert.severity)}`}>{alert.severity ?? 'INFO'}</span>
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${statusClass(alert.status)}`}>{alert.status ?? 'ACTIVE'}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{alert.title ?? 'Untitled alert'}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{alert.message ?? alert.rule?.name ?? '-'}</p>
                  </div>
                ))}
                {activeAlerts.length === 0 && <p className="text-sm text-slate-400">No active alerts</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <BrainCircuit className="w-4 h-4 text-red-500" /> Incidents
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {openIncidents.slice(0, 3).map((incident) => (
                  <div key={incident.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${severityClass(incident.severity)}`}>{incident.severity ?? 'INFO'}</span>
                      <StatusBadge status={incident.status ?? 'OPEN'} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{incident.title ?? 'Untitled incident'}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{incident.description ?? incident.rootCause ?? incident.solution ?? '-'}</p>
                  </div>
                ))}
                {openIncidents.length === 0 && <p className="text-sm text-slate-400">No open incidents</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Layers3 className="w-4 h-4 text-red-500" /> Clusters & escalations
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {hotClusters.map((cluster) => (
                  <div key={cluster.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-sky-700">{cluster.clusterNumber ?? cluster.id}</span>
                        <span className="text-xs text-slate-500">{cluster.memberCount ?? 0} members</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">{cluster.commonCustomer ?? cluster.commonService ?? 'Active cluster'}</p>
                    <p className="mt-1 text-xs text-slate-500">Score: {(cluster.impactScore ?? 0).toFixed(1)} · {cluster.status ?? 'OPEN'}</p>
                  </div>
                ))}
                {hotClusters.length === 0 && <p className="text-sm text-slate-400">No open clusters</p>}
                <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Open escalations</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-rose-600">{openEscalations.length}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Based on unresolved escalation records</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="flex h-full flex-col rounded-3xl border border-sky-100 bg-white p-5 shadow-sm ring-1 ring-sky-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-sky-600" />
                <h3 className="font-semibold tracking-tight text-slate-900">Bot connectivity detail</h3>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">Telegram and WhatsApp readiness, latency, and reconnect state.</p>
            </div>
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-100">
              {readyBots}/{botComponents.length || 0} ready
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {botComponents.map((component) => {
              const online = component.status === 'online';
              const meta = component.meta;
              return (
                <div key={component.name} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">{component.name}</h4>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{component.details ?? 'No details available'}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${online ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {component.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <p className="text-xs text-slate-500">Latency</p>
                      <p className="mt-1 font-semibold text-slate-900">{component.latency != null ? `${component.latency}ms` : '-'}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <p className="text-xs text-slate-500">Last reconnect</p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {meta?.lastConnectedAt ? formatDate(meta.lastConnectedAt) : 'Belum pernah reconnect'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <p className="text-xs text-slate-500">Connection</p>
                      <p className="mt-1 font-semibold text-slate-900">{friendlyConnectionStatus(meta?.connectionStatus)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                      <p className="text-xs text-slate-500">Readiness</p>
                      <p className={`mt-1 font-semibold ${online ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {meta?.ready ? 'Ready to send/receive' : 'Needs attention'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {botComponents.length === 0 && <p className="text-sm text-slate-400">No bot health data available</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
