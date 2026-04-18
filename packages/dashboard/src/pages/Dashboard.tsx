/**
 * @file Dashboard.tsx
 * @purpose Master Intelligence Dashboard untuk visualisasi real-time telemetry dan stats bot.
 * @caller Dashboard UI (/)
 * @dependencies api.ts (Backend Bridge), framer-motion, lucide-react, recharts
 * @functions loadData, loadHealth, checkHealthChanges, sendBrowserNotification
 * @side_effects Real-time telemetry monitoring, browser push notifications, health alerts.
 */

import { useEffect, useState, useRef } from 'react';
import { api, TicketOverviewData, SystemHealthData } from '../lib/api';
import { toast } from '../components/Toast';
import { getSolution } from '../lib/notification-store';
import OperationalOverview from '../components/OperationalOverview';
import NetworkHealthMap from '../components/NetworkHealthMap';
import ShiftHandover from '../components/ShiftHandover';
import AIPredictiveInsights from '../components/AIPredictiveInsights';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  MessageSquare, Users, Zap, AlertTriangle, TrendingUp, Clock, Ticket,
  RefreshCw, Activity,
  CheckCircle, ShieldCheck, ArrowUpRight, ZapOff,
  Orbit, Layers, Cpu, Fingerprint, Radio, Target, Info, Smartphone, Command, PlusCircle, Monitor,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface Stats {
  [key: string]: unknown;
  totalUsers?: number;
  activeToday?: number;
  message_received?: string;
  command_executed?: string;
  error?: string;
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

function StatCard({ icon: Icon, label, value, color, index }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  index: number;
}) {
  const iconColor = color.replace('bg-', 'text-');
  const lightIconColor = iconColor.includes('600') ? iconColor : `${iconColor}-600`;
  const darkIconColor = iconColor.replace('600', '400');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ 
        scale: 1.05, 
        rotateY: 8, 
        rotateX: -4,
        z: 50,
        transition: { duration: 0.4, ease: "easeOut" }
      }}
      className="group relative bg-white dark:bg-slate-950/40 backdrop-blur-3xl rounded-[48px] border-2 border-slate-100 dark:border-white/5 p-9 shadow-sm dark:shadow-2xl perspective-1000 overflow-hidden"
    >
      {/* Ultimate Border Beam */}
      <div className="border-beam" />
      
      {/* Orbital Glow Field */}
      <div className={`absolute -right-16 -top-16 w-48 h-48 blur-[80px] opacity-10 group-hover:opacity-30 transition-all duration-1000 ${color}`} />
      
      <div className="flex items-start justify-between relative z-10">
        <motion.div 
          whileHover={{ rotate: 360, scale: 1.2 }}
          transition={{ duration: 0.8, ease: "anticipate" }}
          className={`p-6 rounded-[28px] ${color} bg-opacity-10 dark:bg-opacity-10 border-2 border-current/10 shadow-inner`}
        >
          <Icon className={`w-9 h-9 ${lightIconColor} dark:${darkIconColor}`} />
        </motion.div>
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600 mb-3 font-mono italic underline decoration-indigo-500/20 underline-offset-8">
            {label}
          </p>
          <motion.p 
            key={value}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-6xl font-black text-slate-950 dark:text-white italic tracking-tighter leading-none"
          >
            {value}
          </motion.p>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic group-hover:text-indigo-400 transition-colors">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
           TEL_LINK_SYNC: 0.4ms
        </div>
        <ChevronRight className="w-5 h-5 text-slate-200 dark:text-slate-800 group-hover:translate-x-2 group-hover:text-indigo-500 transition-all" />
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({});
  const [history, setHistory] = useState<any[]>([]);
  const [ticketOverview, setTicketOverview] = useState<TicketOverviewData | null>(null);
  const [slaDashboard, setSlaDashboard] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(14);
  const prevHealthRef = useRef<SystemHealthData | null>(null);

  const messages = Number(stats.message_received ?? 0);
  const commands = Number(stats.command_executed ?? 0);
  const errors = Number(stats.error ?? 0);

  const downComponents = (health?.components ?? []).filter(
    (c) => c.status === 'offline' || c.status === 'error'
  );

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const sendBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico', tag: 'system-health' });
    }
  };

  const checkHealthChanges = (newHealth: SystemHealthData) => {
    const prev = prevHealthRef.current;
    if (!prev) {
      const down = newHealth.components.filter((c) => c.status === 'offline' || c.status === 'error');
      if (down.length > 0) {
        for (const comp of down) {
          const solution = getSolution(comp.name, comp.status);
          toast({ type: 'error', title: `CRITICAL: ${comp.name.toUpperCase()} — ${comp.status.toUpperCase()}`, message: comp.details ?? 'Terminal Node Failure', solution, duration: 12000 });
        }
        sendBrowserNotification('⚠️ AUDIRA_SYSTEM_CRITICAL', `${down.map((c) => c.name).join(', ')} is OFFLINE`);
      }
      prevHealthRef.current = newHealth;
      return;
    }

    const prevMap = new Map(prev.components.map((c) => [c.name, c.status]));
    for (const comp of newHealth.components) {
      const prevStatus = prevMap.get(comp.name);
      const isDown = comp.status === 'offline' || comp.status === 'error';
      const wasDown = prevStatus === 'offline' || prevStatus === 'error';
      if (isDown && !wasDown) {
        const solution = getSolution(comp.name, comp.status);
        toast({ type: 'error', title: `🔴 ${comp.name.toUpperCase()} DISCONNECT!`, message: comp.details ?? 'Terminal hardware disconnect', solution, duration: 12000 });
        sendBrowserNotification('🔴 AUDIRA_NODE_LOST', `${comp.name} disconnected!`);
      }
    }
    prevHealthRef.current = newHealth;
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.getSystemHealth();
      setHealth(res.data);
      checkHealthChanges(res.data);
    } catch (err) {
      console.error('Health Protocol Interrupted');
    } finally {
      setHealthLoading(false);
    }
  };

  const loadData = async (days = selectedDays) => {
    try {
      const [todayRes, historyRes, ticketRes, slaRes] = await Promise.all([
        api.getStatsToday(),
        api.getStatsHistory(days),
        api.getTicketOverview(days),
        api.getSLADashboard(),
      ]);
      setStats(todayRes.data as Stats);
      setHistory(historyRes.data);
      setTicketOverview(ticketRes.data);
      setSlaDashboard(slaRes.data);

      const [alertsRes, incidentsRes, escalationsRes] = await Promise.allSettled([
        api.getAlerts(1, { status: 'ACTIVE' }),
        api.getIncidents(1, { status: 'OPEN' }),
        api.getEscalations(1, 100),
      ]);

      setAlerts(alertsRes.status === 'fulfilled' ? (alertsRes.value.data as any[]) : []);
      setIncidents(incidentsRes.status === 'fulfilled' ? (incidentsRes.value.data as any[]) : []);
      setEscalations(escalationsRes.status === 'fulfilled' ? (escalationsRes.value.data as any[]) : []);
    } catch (err) { console.error('Data Interrogation Failure'); }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([loadData(selectedDays), loadHealth()]);
      setLoading(false);
    }
    load();
    const timer = setInterval(() => { loadData(selectedDays); loadHealth(); }, 20000);
    return () => clearInterval(timer);
  }, [selectedDays]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-10">
        <div className="relative">
           <div className="w-20 h-20 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-full animate-pulse" />
           </div>
        </div>
        <span className="text-[12px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[1em] animate-pulse italic font-mono">Igniting Master Intelligence Link...</span>
      </div>
    );
  }

  return (
    <div className="relative space-y-16 pb-20">
      {/* Dynamic Scanline Overlay */}
      <div className="scanline-overlay" />

      {/* Header Intelligence Cluster */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: "circOut" }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-10 relative z-10"
      >
        <div>
          <div className="flex items-center gap-4 mb-3">
             <div className="p-3 bg-indigo-600 rounded-[14px] shadow-2xl shadow-indigo-600/40">
                <Orbit className="w-8 h-8 text-white animate-spin-slow" />
             </div>
             <span className="text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.6em] font-mono italic underline decoration-indigo-500/20 underline-offset-8">CMD_GW: v3.0_ULTRA</span>
           </div>
           <h1 className="text-8xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic mb-2 scale-y-110 origin-left flex items-center gap-6">
             Master Intelligence
             <span className="inline-flex items-center gap-2 px-6 py-2 bg-amber-500 text-white rounded-full text-[14px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-amber-500/40 animate-bounce">
               <span className="relative flex h-3 w-3">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
               </span>
               NEW_DEPLOYMENT
             </span>
           </h1>
           <p className="text-slate-500 dark:text-slate-400 font-medium text-lg mt-8 max-w-2xl leading-relaxed border-l-4 border-indigo-600 pl-8">Accessing real-time telemetry interception, neural command diagnostics, and high-fidelity predictive health matrices across distributed N-Nodes.</p>
         </div>

        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-6 px-12 py-8 bg-white dark:bg-slate-950/60 border-2 border-slate-100 dark:border-white/5 rounded-[40px] backdrop-blur-3xl shadow-2xl transition-all group relative overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className={`w-5 h-5 rounded-full ${health?.overallStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.9)]' : 'bg-rose-600 animate-ping shadow-[0_0_20px_rgba(225,29,72,0.9)]'}`} />
           <div className="flex flex-col">
              <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest font-mono italic">MASTER_CORE_STATE</span>
              <span className="text-[14px] font-black text-slate-950 dark:text-white uppercase tracking-[0.3em] font-mono">{health?.overallStatus?.toUpperCase() || 'SYNCHRONIZING...'}</span>
           </div>
           <button onClick={loadHealth} className="ml-6 p-4 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 rounded-2xl hover:text-indigo-500 hover:scale-110 transition-all active:rotate-180">
              <RefreshCw className={`w-5 h-5 ${healthLoading ? 'animate-spin' : ''}`} />
           </button>
        </motion.div>
      </motion.div>

      {/* Critical Anomaly Flash Banner */}
      <AnimatePresence>
        {downComponents.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.9 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.9 }}
            className="relative overflow-hidden bg-rose-600 text-white p-12 rounded-[64px] flex flex-col md:flex-row items-center gap-12 shadow-2xl shadow-rose-600/40 border-4 border-rose-400/30 group/banner z-10"
          >
             <div className="absolute right-[-60px] top-[-60px] opacity-[0.1] group-hover/banner:scale-150 transition-transform duration-1000">
                <ZapOff className="w-96 h-96 text-white" />
             </div>
             <div className="p-8 bg-white/20 backdrop-blur-3xl rounded-[36px] border-4 border-white/20 animate-pulse">
                <AlertTriangle className="w-14 h-14" />
             </div>
             <div className="flex-1 text-center md:text-left relative z-10">
                <h3 className="font-black uppercase text-4xl tracking-tighter italic mb-3 leading-none underline decoration-white/20 underline-offset-8">SIGNAL_LOSS_DETECTED: {downComponents.length} NODES_OFFLINE</h3>
                <p className="text-white/80 text-base font-black uppercase tracking-[0.3em] font-mono italic">{downComponents.map(c => c.name.toUpperCase()).join(' — ')} REPROTING_INTERNAL_FAILURE.</p>
             </div>
             <button onClick={loadHealth} className="px-16 py-7 bg-white text-rose-600 font-black text-[12px] uppercase tracking-[0.4em] rounded-[32px] hover:scale-105 transition-all shadow-2xl active:scale-95 border-b-8 border-rose-100">FORCE_RE_PROBE</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ultimate Stats Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 relative z-10">
        <StatCard index={0} icon={MessageSquare} label="INGESTED_SIGNALS" value={messages} color="bg-indigo-600" />
        <StatCard index={1} icon={Zap} label="NEURAL_COMMANDS" value={commands} color="bg-violet-600" />
        <StatCard index={2} icon={Users} label="IDENTITY_REGISTRY" value={stats.totalUsers ?? 0} color="bg-sky-600" />
        <StatCard index={3} icon={AlertTriangle} label="LOGICAL_ANOMALIES" value={errors} color="bg-rose-600" />
      </div>

      <OperationalOverview
        ticketOverview={ticketOverview}
        slaDashboard={slaDashboard}
        alerts={alerts}
        incidents={incidents}
        escalations={escalations}
        health={health}
      />

      {/* Visual Intelligence Matrix */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-white/5 p-12 rounded-[64px] backdrop-blur-3xl shadow-2xl hover:border-indigo-500/40 transition-all group overflow-hidden"
        >
           <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                 <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/30 group-hover:rotate-12 transition-transform">
                    <TrendingUp className="w-8 h-8" />
                 </div>
                 <h2 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.6em] italic font-mono underline decoration-indigo-500/20 underline-offset-8">SIGNAL_VOLUME_TELEMETRY</h2>
              </div>
              <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic border border-slate-100 dark:border-white/5">UNIT: INGRESS_SIGNAL</div>
           </div>
           <div className="h-96 relative">
              <div className="absolute inset-0 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity" />
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} opacity={0.4} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', padding: '24px', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }} />
                  <Area type="monotone" dataKey="totalMessages" stroke="#6366f1" strokeWidth={6} fillOpacity={1} fill="url(#colorMsg)" animationDuration={3000} strokeLinecap="round" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-white/5 p-12 rounded-[64px] backdrop-blur-3xl shadow-2xl hover:border-emerald-500/40 transition-all group overflow-hidden"
        >
           <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                 <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/30 group-hover:rotate-12 transition-transform">
                    <Clock className="w-8 h-8" />
                 </div>
                 <h2 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.6em] italic font-mono underline decoration-emerald-500/20 underline-offset-8">CONSTRAINT_DIAGNOSTICS_MATRIX</h2>
              </div>
              <div className="px-6 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic border border-slate-100 dark:border-white/5">UNIT: OP_SCALAR</div>
           </div>
           <div className="h-96 relative">
              <div className="absolute inset-0 bg-emerald-600/5 blur-[120px] rounded-full pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity" />
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} opacity={0.4} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', padding: '24px', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }} />
                  <Bar dataKey="totalCommands" fill="#818cf8" radius={[12, 12, 0, 0]} animationDuration={2000} />
                  <Bar dataKey="totalErrors" fill="#f43f5e" radius={[12, 12, 0, 0]} animationDuration={2500} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 relative z-10">
         <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="xl:col-span-8 bg-white dark:bg-slate-950/20 rounded-[80px] border-4 border-slate-100 dark:border-white/5 p-6 shadow-inner">
            <NetworkHealthMap />
         </motion.div>
         <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="xl:col-span-4 bg-white dark:bg-slate-950/20 rounded-[80px] border-4 border-slate-100 dark:border-white/5 p-6 shadow-inner">
            <ShiftHandover />
         </motion.div>
      </div>

      <AIPredictiveInsights />

      {/* Support Intelligence Terminal Footer */}
      <div className="space-y-12 pt-20 border-t-8 border-dotted border-slate-100 dark:border-slate-800/40 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-6">
             <div className="p-6 bg-indigo-600 text-white rounded-[32px] shadow-2xl shadow-indigo-600/40 rotate-6">
                <Ticket className="w-12 h-12" />
             </div>
             <div>
                <h2 className="text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Support Analytics</h2>
                <div className="flex items-center gap-4 mt-3 text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] font-mono italic">INCIDENT_INTERROGATION_MATRICES: NODE_CORE_X1</div>
             </div>
          </div>
          <div className="flex items-center gap-6 bg-white dark:bg-slate-950/60 p-4 rounded-[40px] border-2 border-slate-100 dark:border-white/5 shadow-2xl">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedDays(days)}
                className={`px-10 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.5em] transition-all font-mono italic ${
                  selectedDays === days ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 scale-110 active:scale-95' : 'text-slate-400 dark:text-slate-700 hover:text-indigo-600 dark:hover:text-white hover:scale-105'
                }`}
              >
                {days}D_WINDOW
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           {[
             { label: 'TOTAL_CASE_LOG', value: ticketOverview?.totalTickets ?? 0, icon: Ticket, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20' },
             { label: 'ACTIVE_THREADS', value: ticketOverview?.openTickets ?? 0, icon: Smartphone, color: 'text-amber-600 dark:text-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
             { label: 'RESOLVED_SINKS', value: ticketOverview?.resolvedTickets ?? 0, icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' }
           ].map((item, i) => (
             <motion.div 
                key={i} 
                whileHover={{ scale: 1.05 }}
                className={`bg-white dark:bg-slate-950/60 ${item.border} border-2 p-12 rounded-[56px] flex items-center justify-between shadow-2xl transition-all backdrop-blur-3xl relative overflow-hidden group`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono italic mb-4">{item.label}</p>
                  <h4 className={`text-6xl font-black italic tracking-tighter ${item.color} leading-none`}>{item.value}</h4>
                </div>
                <div className={`p-6 ${item.bg} rounded-[32px] border-2 border-current/10 group-hover:rotate-12 transition-transform shadow-inner`}>
                   <item.icon className={`w-12 h-12 ${item.color}`} />
                </div>
             </motion.div>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-6">
           <motion.div 
             initial={{ opacity: 0, x: -30 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-white/5 p-12 rounded-[72px] backdrop-blur-3xl shadow-2xl group hover:border-indigo-500/40 transition-all overflow-hidden"
           >
              <h3 className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em] mb-12 italic font-mono flex items-center gap-4">
                 <Activity className="w-5 h-5 text-indigo-500 animate-pulse" /> HISTORICAL_TREND_DIAGNOSTICS
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ticketOverview?.dailyTrend ?? []}>
                    <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} opacity={0.4} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', padding: '24px' }} />
                    <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={6} dot={false} animationDuration={3000} strokeLinecap="round" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={6} dot={false} animationDuration={3500} strokeLinecap="round" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </motion.div>
           <motion.div 
             initial={{ opacity: 0, x: 30 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-white/5 p-12 rounded-[72px] backdrop-blur-3xl shadow-2xl group hover:border-emerald-500/40 transition-all overflow-hidden"
           >
              <h3 className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em] mb-12 italic font-mono flex items-center gap-4">
                 <Target className="w-5 h-5 text-emerald-500" /> PRIORITY_DISTRIBUTION_MAP
              </h3>
              <div className="h-96 relative">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <div className="flex flex-col items-center">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.8em] font-mono">SCALAR</span>
                      <span className="text-4xl font-black text-slate-900 dark:text-white italic">100%_SYNC</span>
                   </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketOverview?.statusCounts ?? []}
                      innerRadius={110}
                      outerRadius={150}
                      paddingAngle={12}
                      dataKey="value"
                      animationDuration={3000}
                    >
                      {(ticketOverview?.statusCounts ?? []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0)" />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '32px', padding: '24px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </motion.div>
        </div>
      </div>

      {/* Persistence Health Matrix Cluster */}
      <div className="pt-20 border-t-8 border-dotted border-slate-100 dark:border-slate-800/40 relative z-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
             <div className="p-6 bg-emerald-500/10 rounded-[32px] border-4 border-emerald-500/20 text-emerald-600 dark:text-emerald-500">
                <Activity className="w-12 h-12" />
             </div>
             <div>
                <h2 className="text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">System Health Matrix</h2>
                <div className="flex items-center gap-4 mt-3 text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono italic underline decoration-emerald-500/20">NODAL_AVAILABILITY_LEDGERS: MASTER_SYNC</div>
             </div>
          </div>
          <button onClick={loadHealth} className="p-7 bg-white dark:bg-slate-950 border-4 border-slate-100 dark:border-white/5 rounded-[32px] hover:bg-slate-50 dark:hover:bg-slate-900 text-indigo-500 shadow-2xl active:scale-95 transition-all group">
             <RefreshCw className={`w-8 h-8 ${healthLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
           {(health?.components ?? []).map((comp, i) => (
             <motion.div 
                key={comp.name} 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -10, scale: 1.05 }}
                className={`bg-white dark:bg-slate-950/60 border-4 p-12 rounded-[64px] backdrop-blur-3xl transition-all duration-700 group relative overflow-hidden shadow-2xl ${
                  comp.status === 'online' ? 'border-emerald-500/10 hover:border-emerald-500/60' : 'border-rose-500/20 hover:border-rose-500/90'
               }`}
             >
                <div className="absolute right-[-20px] top-[-20px] opacity-[0.05] group-hover:opacity-20 transition-opacity">
                   <Target className={`w-32 h-32 ${comp.status === 'online' ? 'text-emerald-500' : 'text-rose-500'}`} />
                </div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                   <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic group-hover:text-indigo-500 transition-colors leading-none">{comp.name}</h4>
                   <div className={`w-5 h-5 rounded-full ${comp.status === 'online' ? 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.9)]' : 'bg-rose-500 animate-pulse shadow-[0_0_25px_rgba(225,29,72,0.9)]'}`} />
                </div>
                <div className="flex items-end justify-between relative z-10 mt-10">
                   <div className="text-[13px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.5em] font-mono italic">{comp.status.toUpperCase()}</div>
                   {comp.latency != null && (
                     <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-white/5">
                        <Zap className="w-4 h-4 text-indigo-500 animate-pulse" />
                        <span className="text-lg font-black text-slate-950 dark:text-white font-mono tracking-tighter">{comp.latency}MS</span>
                     </div>
                   )}
                </div>
                {comp.status !== 'online' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-8 p-6 bg-rose-500/10 border-2 border-rose-500/20 rounded-3xl text-[11px] font-black text-rose-600 dark:text-rose-500 italic leading-relaxed uppercase tracking-[0.2em] font-mono"
                  >
                     ERROR: {comp.details || 'TERMINAL_ANOMALY_IN_COMM_LINK'}
                  </motion.div>
                )}
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}
