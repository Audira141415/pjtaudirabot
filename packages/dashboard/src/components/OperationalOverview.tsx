import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Bell, Bot, Clock3, ShieldAlert, ShieldCheck, Ticket, Zap, Activity, Target } from 'lucide-react';
import { PriorityBadge } from '../lib/badge-colors';
import type { SystemHealthData, TicketOverviewData } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

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
      return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
    case 'MAJOR':
    case 'ERROR':
      return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
    case 'MINOR':
    case 'WARNING':
      return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    default:
      return 'bg-slate-100 dark:bg-slate-900/60 text-slate-700 dark:text-slate-500 border border-slate-200 dark:border-white/10';
  }
}


function Metric({ label, value, tone, icon: Icon }: { label: string; value: string | number; tone: string; icon?: any }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className={`rounded-[32px] border-2 p-6 shadow-inner ${tone} dark:bg-black/20 dark:border-white/5 relative overflow-hidden group`}
    >
       {Icon && <Icon className="absolute right-[-10px] bottom-[-10px] w-20 h-20 opacity-[0.03] group-hover:opacity-10 transition-opacity" />}
       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-600 mb-2 font-mono italic">{label}</p>
       <p className="text-4xl font-black tracking-tighter text-slate-950 dark:text-white italic leading-none">{value}</p>
    </motion.div>
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
  const [slaItemsExpanded, setSlaItemsExpanded] = useState(true);
  const sla = slaDashboard as SlaDashboardData | null;
  const activeAlerts = alerts as unknown as AlertItem[];
  const openIncidents = incidents as unknown as IncidentItem[];
  const openEscalations = (escalations as unknown as EscalationItem[]).filter((escalation) => !escalation.resolvedAt);
  const botComponents = (health?.components ?? []).filter((component) => component.name.endsWith('Bot'));
  const readyBots = botComponents.filter((component) => component.meta?.ready).length;

  const topPriorities = [...(ticketOverview?.priorityCounts ?? [])].sort((a, b) => b.value - a.value).slice(0, 3);
  const topCategories = [...(ticketOverview?.categoryCounts ?? [])].sort((a, b) => b.value - a.value).slice(0, 3);
  const urgentSla = [...(sla?.activeTracking ?? [])]
    .sort((a, b) => new Date(a.resolutionDeadline ?? 0).getTime() - new Date(b.resolutionDeadline ?? 0).getTime())
    .slice(0, 3);

  return (
    <section className="space-y-12 relative z-10">
      <div className="flex flex-col gap-6 border-b-8 border-dotted border-slate-200 dark:border-white/5 pb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-8">
           <div className="p-8 glass-ultimate rounded-[40px] text-indigo-500 shadow-2xl relative">
              <div className="absolute inset-0 animate-ping bg-indigo-500 rounded-[40px] opacity-10" />
              <ShieldCheck className="w-12 h-12" />
           </div>
           <div>
              <h2 className="text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-4">
                Operations Center
              </h2>
              <div className="flex items-center gap-6 text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono italic">
                 <div className="w-3 h-3 rounded-full bg-indigo-500" />
                 STRATEGIC_COMMAND_OVERRIDE_ACTIVE
              </div>
           </div>
        </div>
        <div className="flex flex-wrap gap-4">
          {['SLA', 'ALERTS', 'INCIDENTS'].map((label) => (
            <Link 
              key={label}
              to={`/${label.toLowerCase()}`} 
              className="px-8 py-4 glass rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] font-mono italic hover:bg-indigo-600 hover:text-white transition-all shadow-xl active:scale-95"
            >
              RUN {label}_INTERROGATE
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        {/* Left Column: SLA & Backlog (Large Bento) */}
        <article className="lg:col-span-7 glass-card p-10 overflow-hidden relative">
          <div className="absolute right-[-50px] top-[-50px] opacity-[0.02] rotate-12">
             <ShieldAlert className="w-[300px] h-[300px]" />
          </div>
          
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-6">
              <div className="p-6 rounded-[24px] bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">SLA Precision Tracking</h3>
                <p className="text-sm font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mt-1 font-mono italic">Managing {ticketOverview?.openTickets ?? 0} active signals</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest italic border-2 ${
                (sla?.complianceRate ?? 0) > 90 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
              }`}>
                {sla?.complianceRate ?? 100}% Compliance_Rating
              </span>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 relative z-10">
            <Metric label="OPEN_SIGNAL" value={ticketOverview?.openTickets ?? 0} tone="text-indigo-500" icon={Activity} />
            <Metric label="RESP_BREACH" value={sla?.responseBreaches ?? 0} tone="text-amber-500" icon={AlertCircle} />
            <Metric label="RESL_BREACH" value={sla?.resolutionBreaches ?? 0} tone="text-rose-500" icon={ShieldAlert} />
            <Metric label="TOTAL_WATCH" value={sla?.totalTracked ?? 0} tone="text-indigo-500" icon={Target} />
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 relative z-10">
            <div className="space-y-6">
              <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 dark:text-slate-700 flex items-center gap-4 italic font-mono">
                <div className="h-0.5 w-6 bg-indigo-500" /> Priority Mix
              </h4>
              <div className="space-y-3">
                {topPriorities.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-5 rounded-[24px] bg-black/10 dark:bg-slate-950/60 border border-white/5 transition-all hover:bg-indigo-600/10 hover:border-indigo-500/20">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest font-mono italic">{item.name}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono italic">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
               <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 dark:text-slate-700 flex items-center gap-4 italic font-mono">
                <div className="h-0.5 w-6 bg-indigo-500" /> Category Breakdown
              </h4>
              <div className="space-y-3">
                {topCategories.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-5 rounded-[24px] bg-black/10 dark:bg-slate-950/60 border border-white/5 transition-all hover:bg-indigo-600/10 hover:border-indigo-500/20">
                    <span className="text-xs font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest font-mono italic truncate max-w-[120px]">{item.name}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white font-mono italic">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Urgent SLA Items */}
          <div className="mt-12 pt-10 border-t-4 border-dotted border-white/5 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 dark:text-slate-700 flex items-center gap-4 italic font-mono">
                <Clock3 className="w-5 h-5 text-indigo-500" /> Critical_SLA_Dungeons
              </span>
              <button 
                onClick={() => setSlaItemsExpanded(!slaItemsExpanded)}
                className="px-6 py-2 glass rounded-xl text-[10px] font-black uppercase tracking-widest italic"
              >
                {slaItemsExpanded ? 'FOLD_PROTOCOL' : 'EXPAND_VIEW'}
              </button>
            </div>
            
            <AnimatePresence>
              {slaItemsExpanded && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-1 gap-4 overflow-hidden"
                >
                  {urgentSla.map((item) => (
                    <motion.div 
                      key={item.id} 
                      whileHover={{ x: 5 }}
                      className="flex items-center justify-between p-6 rounded-[32px] border-2 border-white/5 bg-black/20 backdrop-blur-3xl transition-all hover:bg-indigo-600/5 hover:border-indigo-500/20 group"
                    >
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col">
                          <span className="font-mono text-lg font-black text-indigo-500 italic tracking-tighter uppercase">{item.ticket?.ticketNumber ?? '-'}</span>
                          <span className="text-sm font-black text-slate-600 dark:text-slate-400 mt-1 uppercase tracking-widest font-mono italic">{item.ticket?.customer ?? 'UNIDENTIFIED_ENTITY'}</span>
                        </div>
                        <PriorityBadge priority={item.ticket?.priority ?? 'MEDIUM'} />
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-black italic tracking-tighter leading-none ${item.responseBreached || item.resolutionBreached ? 'text-rose-500' : 'text-emerald-500 px-4 py-2 bg-emerald-500/10 rounded-xl'}`}>
                          {formatHoursLeft(item.resolutionDeadline).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-700 mt-3 font-black uppercase tracking-widest font-mono italic">{formatDate(item.resolutionDeadline)}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </article>

        {/* Right Column: Alerts & Response (Incidents/Escalations) */}
        <div className="lg:col-span-5 flex flex-col gap-10">
          <article className="glass-card p-10 relative overflow-hidden">
             <div className="premium-glow -right-20 top-0 w-64 h-64 bg-rose-600/10" />
             <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-6">
                <div className="p-6 rounded-[24px] bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-[0_0_30px_rgba(225,29,72,0.2)] relative">
                  <div className="absolute inset-0 animate-ping bg-rose-500 rounded-[24px] opacity-10" />
                  <Bell className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Anomaly Response</h3>
                  <p className="text-sm font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mt-1 font-mono italic">{activeAlerts.length} Neural Disruptions</p>
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-6 relative z-10">
              <div className="rounded-[28px] glass p-6 border-2 border-white/5 transition-all hover:border-rose-500/20">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-600 mb-2 font-mono italic">ACTIVE_INCIDENTS</p>
                <p className="text-5xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{openIncidents.length}</p>
              </div>
              <div className="rounded-[28px] glass p-6 border-2 border-white/5 transition-all hover:border-rose-500/20">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-600 mb-2 font-mono italic">ESCALATIONS</p>
                <p className="text-5xl font-black text-rose-500 italic tracking-tighter leading-none">{openEscalations.length}</p>
              </div>
            </div>

            {/* Signal Feed (Incidents & Alerts Combined) */}
            <div className="mt-10 space-y-4 relative z-10">
               {openIncidents.slice(0, 1).map((incident) => (
                  <motion.div 
                    key={incident.id} 
                    whileHover={{ scale: 1.02 }}
                    className="p-8 rounded-[36px] bg-rose-600/10 border-4 border-rose-500/20 relative overflow-hidden group transition-all"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <ShieldAlert className="w-20 h-20 text-rose-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                       <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full ring-2 ring-rose-500/30 ${severityClass(incident.severity)}`}>
                         ANOMALY: {incident.severity}
                       </span>
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-tight mb-2 uppercase">{incident.title}</p>
                    <p className="text-[11px] font-black text-rose-500/70 uppercase tracking-widest font-mono italic">{incident.description ?? 'ACTIVE_INCIDENT_INTERROGATION_REQUIRED'}</p>
                  </motion.div>
               ))}
               {activeAlerts.slice(0, 1).map((alert) => (
                  <motion.div 
                    key={alert.id} 
                    whileHover={{ scale: 1.02 }}
                    className="p-8 rounded-[36px] bg-amber-600/10 border-4 border-amber-500/20 relative overflow-hidden transition-all group"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                       <Bell className="w-20 h-20 text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between mb-4">
                       <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full ring-2 ring-amber-500/30 bg-amber-500/20 text-amber-500`}>
                         THREAT_SYNC: {alert.severity}
                       </span>
                    </div>
                    <p className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-tight mb-2 uppercase">{alert.title}</p>
                    <p className="text-[11px] font-black text-amber-500/70 uppercase tracking-widest font-mono italic font-mono">{alert.message ?? alert.rule?.name}</p>
                  </motion.div>
               ))}
            </div>
            <button className="mt-10 w-full py-6 rounded-[28px] bg-indigo-600 text-white font-black text-[12px] uppercase tracking-[0.5em] italic transition-all hover:bg-indigo-500 shadow-2xl shadow-indigo-600/40 active:scale-95">
              INITIATE_SIGNAL_MATRIX_DIVE
            </button>
          </article>

          {/* Bot Connectivity detail (Compact) */}
          <article className="glass-card p-10">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-6">
                  <div className="p-6 rounded-[24px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    <Bot className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Nodal Pulse</h3>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mt-1 font-mono italic">Distributed Neural Entities</p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 border-2 border-emerald-500/20 px-6 py-3 rounded-full uppercase tracking-widest italic shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  {readyBots}/{botComponents.length} SYNCED
                </span>
             </div>

             <div className="grid grid-cols-1 gap-6">
                {botComponents.map((component) => (
                  <motion.div 
                    key={component.name} 
                    whileHover={{ x: 5 }}
                    className="p-6 rounded-[32px] glass-ultimate border-2 border-white/5 transition-all hover:border-indigo-500/20 group"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">{component.name}</span>
                      <div className="flex items-center gap-4">
                         <div className={`w-3 h-3 rounded-full ${component.status === 'online' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-rose-500 shadow-[0_0_15px_rgba(225,29,72,0.8)]'}`} />
                         <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-700 tracking-widest font-mono italic">{component.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-10">
                       <div className="flex flex-col">
                         <p className="text-[9px] uppercase font-black text-slate-500 dark:text-slate-700 tracking-widest mb-1 italic">LATENCY</p>
                         <p className="text-xl font-black text-slate-900 dark:text-white font-mono italic leading-none">{component.latency ?? '-'}MS</p>
                       </div>
                       <div className="flex flex-col">
                         <p className="text-[9px] uppercase font-black text-slate-500 dark:text-slate-700 tracking-widest mb-1 italic">READY_STATE</p>
                         <p className={`text-xl font-black italic leading-none ${component.meta?.ready ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {component.meta?.ready ? 'CONNECTED' : 'STALLED'}
                         </p>
                       </div>
                       <Link to="/status" className="ml-auto p-4 rounded-2xl glass hover:text-indigo-500 transition-all active:scale-95">
                          <ArrowUpRight className="w-5 h-5" />
                       </Link>
                    </div>
                  </motion.div>
                ))}
             </div>
          </article>
        </div>
      </div>
    </section>

  );
}
