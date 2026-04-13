import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Bot, Clock3, ShieldAlert, ShieldCheck, Ticket, Zap } from 'lucide-react';
import { PriorityBadge } from '../lib/badge-colors';
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

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Operational Command
          </h2>
          <p className="mt-1 text-slate-500">Real-time oversight of SLA, incident pressure, and system readiness.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['SLA Monitor', 'Alerts', 'Incidents'].map((label) => (
            <Link 
              key={label}
              to={`/${label.toLowerCase().split(' ')[0]}`} 
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5"
            >
              <ArrowUpRight className="w-4 h-4 text-slate-400" /> {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: SLA & Backlog (Large Bento) */}
        <article className="lg:col-span-7 flex flex-col rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">SLA & Backlog Pressure</h3>
                <p className="text-sm text-slate-500">Managing {ticketOverview?.openTickets ?? 0} active tickets</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ring-1 ${
                (sla?.complianceRate ?? 0) > 90 ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100'
              }`}>
                {sla?.complianceRate ?? 100}% Compliance
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Open Tickets" value={ticketOverview?.openTickets ?? 0} tone="bg-slate-50/50 border-slate-100" />
            <Metric label="Response" value={sla?.responseBreaches ?? 0} tone="bg-amber-50/30 border-amber-100/50" />
            <Metric label="Resolution" value={sla?.resolutionBreaches ?? 0} tone="bg-rose-50/30 border-rose-100/50" />
            <Metric label="Tracked" value={sla?.totalTracked ?? 0} tone="bg-slate-50/50 border-slate-100" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Priority Mix
              </h4>
              <div className="space-y-2">
                {topPriorities.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-100">
                    <span className="text-sm font-medium text-slate-600">{item.name}</span>
                    <span className="text-sm font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4 text-sm font-semibold text-slate-700">
               <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Ticket className="w-3.5 h-3.5" /> Category Mix
              </h4>
              <div className="space-y-2">
                {topCategories.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/80 border border-slate-100 transition-colors hover:bg-slate-100">
                    <span className="text-sm font-medium text-slate-600 truncate">{item.name}</span>
                    <span className="text-sm font-bold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Urgent SLA Items */}
          <div className="mt-8 pt-7 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-2">
                <Clock3 className="w-3.5 h-3.5" /> Fast Track (SLA Near Breach)
              </span>
              <button 
                onClick={() => setSlaItemsExpanded(!slaItemsExpanded)}
                className="text-indigo-600 hover:text-indigo-700"
              >
                {slaItemsExpanded ? 'Hide' : 'Show'}
              </button>
            </div>
            {slaItemsExpanded && (
              <div className="grid grid-cols-1 gap-3">
                {urgentSla.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-200">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 underline decoration-indigo-200">{item.ticket?.ticketNumber ?? '-'}</span>
                        <span className="text-sm font-bold text-slate-800 mt-0.5">{item.ticket?.customer ?? 'N/A'}</span>
                      </div>
                      <PriorityBadge priority={item.ticket?.priority ?? 'MEDIUM'} />
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${item.responseBreached || item.resolutionBreached ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatHoursLeft(item.resolutionDeadline)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{formatDate(item.resolutionDeadline)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>

        {/* Right Column: Alerts & Response (Incidents/Escalations) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <article className="flex flex-col rounded-[32px] border border-slate-200 bg-slate-900 p-7 text-white shadow-xl shadow-slate-200/50">
             <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Signal Response</h3>
                  <p className="text-sm text-slate-400">{activeAlerts.length} Attention Required</p>
                </div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 transition-colors hover:bg-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Incidents</p>
                <p className="mt-2 text-3xl font-bold">{openIncidents.length}</p>
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 transition-colors hover:bg-white/10">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Escalations</p>
                <p className="mt-2 text-3xl font-bold text-rose-500">{openEscalations.length}</p>
              </div>
            </div>

            {/* Signal Feed (Incidents & Alerts Combined) */}
            <div className="mt-6 space-y-3">
               {openIncidents.slice(0, 1).map((incident) => (
                  <div key={incident.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden group transition-all hover:bg-white/10">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                    <div className="flex items-center justify-between mb-2">
                       <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${severityClass(incident.severity)}`}>
                         INCIDENT: {incident.severity}
                       </span>
                    </div>
                    <p className="text-sm font-bold text-slate-100">{incident.title}</p>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-1">{incident.description ?? 'Active incident tracking'}</p>
                  </div>
               ))}
               {activeAlerts.slice(0, 1).map((alert) => (
                  <div key={alert.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 relative overflow-hidden transition-all hover:bg-white/10">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                    <div className="flex items-center justify-between mb-2">
                       <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-400`}>
                         ALERT: {alert.severity}
                       </span>
                    </div>
                    <p className="text-sm font-bold text-slate-100">{alert.title}</p>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-1">{alert.message ?? alert.rule?.name}</p>
                  </div>
               ))}
            </div>
            <button className="mt-6 w-full py-3 rounded-2xl bg-indigo-600 font-bold text-sm tracking-wide transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30">
              Open Signal Matrix
            </button>
          </article>

          {/* Bot Connectivity detail (Compact) */}
          <article className="flex-1 rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                    <Bot className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 tracking-tight">Bot Connectivity</h3>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                  {readyBots}/{botComponents.length} Active
                </span>
             </div>

             <div className="space-y-4 text-sm font-semibold text-slate-700">
                {botComponents.map((component) => (
                  <div key={component.name} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-800">{component.name}</span>
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${component.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                         <span className="text-[10px] font-black uppercase text-slate-400">{component.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div>
                         <p className="text-[10px] uppercase font-bold text-slate-400">Latency</p>
                         <p className="font-bold text-slate-700">{component.latency ?? '-'}ms</p>
                       </div>
                       <div>
                         <p className="text-[10px] uppercase font-bold text-slate-400">Status</p>
                         <p className={`font-bold ${component.meta?.ready ? 'text-emerald-600' : 'text-rose-500'}`}>
                           {component.meta?.ready ? 'Ready' : 'Issues'}
                         </p>
                       </div>
                       <Link to="/status" className="ml-auto p-1.5 rounded-lg bg-slate-200/50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                       </Link>
                    </div>
                  </div>
                ))}
             </div>
          </article>
        </div>
      </div>
    </section>

  );
}
