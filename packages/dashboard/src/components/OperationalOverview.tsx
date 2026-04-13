import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpRight, Bell, Bot, Clock3, ShieldAlert, ShieldCheck,
  ChevronDown, ChevronUp, Radio, Target
} from 'lucide-react';
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

interface OperationalOverviewProps {
  ticketOverview: TicketOverviewData | null;
  slaDashboard: Record<string, unknown> | null;
  alerts: Array<Record<string, unknown>>;
  incidents: Array<Record<string, unknown>>;
  escalations: Array<Record<string, unknown>>;
  health: SystemHealthData | null;
}

function formatDate(dateValue?: string | null): string {
  if (!dateValue) return '-';
  return new Date(dateValue).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}

function formatHoursLeft(dateValue?: string): string {
  if (!dateValue) return '-';
  const hoursLeft = Math.ceil((new Date(dateValue).getTime() - Date.now()) / 3600000);
  if (hoursLeft < 0) return `${Math.abs(hoursLeft)}h OVERDUE`;
  if (hoursLeft === 0) return '<1h LEFT';
  return `${hoursLeft}h LEFT`;
}

function severityClass(severity?: string): string {
  switch ((severity ?? '').toUpperCase()) {
    case 'CRITICAL': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    case 'MAJOR': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'WARNING': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
}

function BespokeMetric({ label, value, color }: { label: string, value: any, color: string }) {
   const colors: any = {
      default: 'text-slate-200 border-white/5 bg-white/5',
      indigo: 'text-indigo-400 border-indigo-500/10 bg-indigo-500/5',
      rose: 'text-rose-400 border-rose-500/10 bg-rose-500/5',
      amber: 'text-amber-400 border-amber-500/10 bg-amber-500/5',
   }
   return (
      <div className={`p-6 rounded-[24px] border ${colors[color]}`}>
         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</p>
         <p className="text-3xl font-black tracking-tighter">{value}</p>
      </div>
   );
}

export default function OperationalOverview({
  ticketOverview,
  slaDashboard,
  alerts,
  incidents,
  escalations,
  health,
}: OperationalOverviewProps) {
  const [slaExpanded, setSlaExpanded] = useState(true);
  const sla = slaDashboard as SlaDashboardData | null;
  const activeAlerts = alerts as unknown as AlertItem[];
  const openIncidents = incidents as unknown as IncidentItem[];
  const openEscalations = (escalations as unknown as EscalationItem[]).filter((e) => !e.resolvedAt);
  const botComponents = (health?.components ?? []).filter((c) => c.name.endsWith('Bot'));
  const readyBots = botComponents.filter((c) => c.meta?.ready).length;

  const urgentSla = [...(sla?.activeTracking ?? [])]
    .sort((a, b) => new Date(a.resolutionDeadline ?? 0).getTime() - new Date(b.resolutionDeadline ?? 0).getTime())
    .slice(0, 3);

  return (
    <section className="space-y-8">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
         <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
               <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-white tracking-tight">Operational Command</h3>
               <p className="text-sm text-slate-500">Managing global service integrity and SLA compliance.</p>
            </div>
         </div>
         <div className="flex items-center gap-3">
            <Link to="/tickets" className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all">
               View Live Matrix <ArrowUpRight className="w-4 h-4" />
            </Link>
         </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
         {/* SLA & BACKLOG PANEL */}
         <article className="xl:col-span-8 glass-panel rounded-[40px] p-8 relative overflow-hidden group">
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                     <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <Target className="w-6 h-6" />
                     </div>
                     <div>
                        <h4 className="text-xl font-bold text-white">SLA Pressure Analytics</h4>
                        <p className="text-sm text-slate-500">{ticketOverview?.openTickets ?? 0} active tickets in backlog</p>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="px-4 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
                        {sla?.complianceRate ?? 100}% Compliance
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                  <BespokeMetric label="Backlog" value={ticketOverview?.openTickets ?? 0} color="default" />
                  <BespokeMetric label="Response Breach" value={sla?.responseBreaches ?? 0} color="amber" />
                  <BespokeMetric label="Res. Breach" value={sla?.resolutionBreaches ?? 0} color="rose" />
                  <BespokeMetric label="SLA Tracked" value={sla?.totalTracked ?? 0} color="indigo" />
               </div>

               {/* URGENT SLA LIST */}
               <div className="pt-8 border-t border-white/5">
                  <div className="flex items-center justify-between mb-6">
                     <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                        <Clock3 className="w-4 h-4 text-indigo-400" /> Fast-Track Priority
                     </h5>
                     <button onClick={() => setSlaExpanded(!slaExpanded)} className="text-slate-500 hover:text-white transition-colors">
                        {slaExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                     </button>
                  </div>

                  {slaExpanded && (
                     <div className="space-y-3">
                        {urgentSla.map((item) => (
                           <div key={item.id} className="group/item flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all hover:border-white/10">
                              <div className="flex items-center gap-6">
                                 <div className="flex flex-col">
                                    <span className="font-mono text-[11px] font-black text-indigo-400">{item.ticket?.ticketNumber || 'TKT-PEND'}</span>
                                    <span className="text-sm font-bold text-white truncate max-w-[150px]">{item.ticket?.customer || 'Unknown Entity'}</span>
                                 </div>
                                 <div className="hidden sm:block">
                                    <PriorityBadge priority={item.ticket?.priority || 'MEDIUM'} />
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className={`text-sm font-black tracking-tight ${item.responseBreached || item.resolutionBreached ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {formatHoursLeft(item.resolutionDeadline)}
                                 </p>
                                 <p className="text-[10px] font-bold text-slate-500 mt-1">{formatDate(item.resolutionDeadline)}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         </article>

         {/* SIGNAL FEED & BOTS */}
         <div className="xl:col-span-4 flex flex-col gap-8">
            <article className="glass-panel rounded-[40px] p-8 border-rose-500/10 bg-rose-500/[0.02]">
               <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                     <Bell className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                     <h4 className="text-lg font-bold text-white">Signal Response</h4>
                     <p className="text-xs text-slate-500 uppercase font-black tracking-widest">{activeAlerts.length} High Severity Alerts</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-[24px] bg-white/5 border border-white/10">
                     <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Incidents</p>
                     <p className="text-2xl font-black text-rose-400">{openIncidents.length}</p>
                  </div>
                  <div className="p-4 rounded-[24px] bg-white/5 border border-white/10">
                     <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Escalated</p>
                     <p className="text-2xl font-black text-indigo-400">{openEscalations.length}</p>
                  </div>
               </div>

               <div className="space-y-3">
                  {openIncidents.slice(0, 2).map((inc) => (
                     <div key={inc.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500" />
                        <div className="flex items-center justify-between mb-2">
                           <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${severityClass(inc.severity)}`}>
                             INCIDENT: {inc.severity}
                           </span>
                        </div>
                        <p className="text-xs font-bold text-white line-clamp-1">{inc.title}</p>
                     </div>
                  ))}
               </div>
               
               <button className="mt-6 w-full py-4 rounded-2xl bg-rose-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-rose-500/20 hover:bg-rose-400 transition-all active:scale-95">
                  Launch Signal Matrix
               </button>
            </article>

            <article className="glass-panel rounded-[40px] p-8 flex-1">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                     <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Bot className="w-6 h-6" />
                     </div>
                     <h4 className="font-bold text-white">Entity Connectivity</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black text-emerald-500 uppercase">{readyBots} OK</span>
                  </div>
               </div>

               <div className="space-y-4">
                  {botComponents.slice(0, 2).map((bot) => (
                     <div key={bot.name} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between mb-3">
                           <span className="text-xs font-bold text-white uppercase tracking-tighter">{bot.name}</span>
                           <span className={`text-[10px] font-black px-2 py-0.5 rounded ${bot.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {bot.status}
                           </span>
                        </div>
                        <div className="flex items-center gap-6">
                           <div>
                              <p className="text-[9px] font-black text-slate-500 uppercase">Latency</p>
                              <p className="text-sm font-black text-white">{bot.latency ?? '--'}ms</p>
                           </div>
                           <div>
                              <p className="text-[9px] font-black text-slate-500 uppercase">Readiness</p>
                              <p className={`text-sm font-black ${bot.meta?.ready ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {bot.meta?.ready ? 'OPERATIONAL' : 'ISSUE'}
                              </p>
                           </div>
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
