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
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface Stats {
  [key: string]: unknown;
  totalUsers?: number;
  activeToday?: number;
  message_received?: string;
  command_executed?: string;
  error?: string;
}

const CHART_COLORS = ['#6366f1', '#a855f7', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

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
        scale: 1.02, 
        y: -5,
        transition: { duration: 0.4 }
      }}
      className="group relative glass-card perspective-1000 overflow-hidden"
    >
      {/* Ultimate Border Beam */}
      <div className="border-beam" />
      
      {/* Orbital Glow Field */}
      <div className={`absolute -right-24 -top-24 w-64 h-64 blur-[100px] opacity-10 group-hover:opacity-40 transition-all duration-1000 ${color}`} />
      
      <div className="flex items-start justify-between relative z-10">
        <motion.div 
          whileHover={{ rotate: 180, scale: 1.1 }}
          className={`p-6 rounded-[24px] ${color} bg-opacity-20 dark:bg-opacity-10 border-2 border-white/10 shadow-lg`}
        >
          <Icon className={`w-8 h-8 ${lightIconColor} dark:${darkIconColor}`} />
        </motion.div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-500 mb-3 font-mono italic">
            {label}
          </p>
          <motion.p 
            key={value}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-6xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none"
          >
            {value}
          </motion.p>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between relative z-10 border-t border-white/5 pt-6">
        <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic font-mono">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           HEARTBEAT_SYNC: 0.4ms
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-800 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all" />
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
           <div className="w-24 h-24 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full animate-pulse" />
           </div>
        </div>
        <span className="text-[12px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[1em] animate-pulse italic font-mono">Igniting Master Intelligence Link...</span>
      </div>
    );
  }

  return (
    <div className="relative space-y-16 pb-24">
      {/* Decorative Glows */}
      <div className="premium-glow -left-40 top-0 w-[600px] h-[600px] bg-indigo-600/10" />
      <div className="premium-glow -right-40 bottom-0 w-[600px] h-[600px] bg-purple-600/10" />

      {/* Header Intelligence Cluster */}
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 relative z-10"
      >
        <div className="max-w-4xl">
          <div className="flex items-center gap-6 mb-8">
             <div className="p-4 bg-indigo-600 rounded-[24px] shadow-2xl shadow-indigo-600/40 relative group">
                <div className="absolute inset-0 animate-ping bg-indigo-600 rounded-[24px] opacity-20" />
                <Orbit className="w-10 h-10 text-white animate-spin-slow" />
             </div>
             <div>
                <span className="text-indigo-500 font-black text-[12px] uppercase tracking-[0.5em] font-mono italic flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  CMD_GW: v3.0_ULTRA_PHASE
                </span>
                <h1 className="text-9xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none mt-2">
                  Control Deck
                </h1>
             </div>
           </div>
           <p className="text-slate-500 dark:text-slate-400 text-xl font-medium leading-relaxed border-l-8 border-indigo-600 pl-10 py-2">
             Accessing real-time telemetry interception, neural command diagnostics, and high-fidelity predictive health matrices across distributed N-Nodes.
           </p>
         </div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="flex items-center gap-8 px-14 py-10 glass-ultimate rounded-[48px] shadow-2xl transition-all group relative overflow-hidden"
        >
           <div className={`w-4 h-4 rounded-full ${health?.overallStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.8)]' : 'bg-rose-600 animate-ping shadow-[0_0_30px_rgba(225,29,72,0.8)]'}`} />
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest font-mono italic">MASTER_CORE_STATE</span>
              <span className="text-[18px] font-black text-slate-950 dark:text-white uppercase tracking-[0.3em] font-mono">{health?.overallStatus?.toUpperCase() || 'SYNCHRONIZING...'}</span>
           </div>
           <button onClick={loadHealth} className="ml-8 p-5 glass rounded-2xl hover:text-indigo-500 transition-all hover:rotate-180 duration-700">
              <RefreshCw className={`w-6 h-6 ${healthLoading ? 'animate-spin' : ''}`} />
           </button>
        </motion.div>
      </motion.div>

      {/* Critical Anomaly Flash Banner */}
      <AnimatePresence>
        {downComponents.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0, scale: 0.95 }}
            animate={{ height: "auto", opacity: 1, scale: 1 }}
            exit={{ height: 0, opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden bg-[#ef4444] text-white p-16 rounded-[56px] flex flex-col md:flex-row items-center gap-14 shadow-[0_40px_100px_rgba(239,68,68,0.4)] border-4 border-white/20 group/banner z-10"
          >
             <div className="absolute right-[-80px] top-[-80px] opacity-[0.2] group-hover/banner:scale-125 transition-transform duration-1000">
                <ZapOff className="w-[400px] h-[400px] text-white" />
             </div>
             <div className="p-10 bg-white/20 backdrop-blur-3xl rounded-[32px] border-4 border-white/20 relative">
                <div className="absolute inset-0 animate-ping bg-white rounded-[32px] opacity-20" />
                <AlertTriangle className="w-16 h-16" />
             </div>
             <div className="flex-1 text-center md:text-left relative z-10">
                <h3 className="font-black uppercase text-5xl tracking-tighter italic mb-4 leading-none underline decoration-white/30 underline-offset-8 decoration-4">SIGNAL_LOSS_DETECTED: {downComponents.length} NODES_OFFLINE</h3>
                <p className="text-white/90 text-lg font-black uppercase tracking-[0.4em] font-mono italic">{downComponents.map(c => c.name.toUpperCase()).join(' — ')} REPORTING_INTERNAL_FAILURE.</p>
             </div>
             <button onClick={loadHealth} className="px-20 py-8 bg-white text-rose-600 font-black text-[14px] uppercase tracking-[0.4em] rounded-[32px] hover:bg-slate-100 transition-all shadow-2xl active:scale-95 border-b-8 border-rose-200">FORCE_RE_PROBE</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Grid Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
        <StatCard index={0} icon={MessageSquare} label="INGESTED_SIGNALS" value={messages} color="bg-indigo-600" />
        <StatCard index={1} icon={Zap} label="NEURAL_COMMANDS" value={commands} color="bg-purple-600" />
        <StatCard index={2} icon={Users} label="IDENTITY_REGISTRY" value={stats.totalUsers ?? 0} color="bg-cyan-600" />
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
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card group overflow-hidden"
        >
           <div className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex items-center gap-6">
                 <div className="p-5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/30 group-hover:rotate-12 transition-transform">
                    <TrendingUp className="w-8 h-8" />
                 </div>
                 <div>
                    <h2 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-[0.5em] italic font-mono mb-2">SIGNAL_VOLUME</h2>
                    <div className="h-1 w-20 bg-indigo-500 rounded-full" />
                 </div>
              </div>
              <div className="px-8 py-3 glass rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">UNIT: INGRESS_SIGNAL</div>
           </div>
           <div className="h-96 relative">
              <div className="absolute inset-0 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity" />
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} opacity={0.2} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(2, 6, 23, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '24px', 
                      padding: '20px', 
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 30px 60px rgba(0,0,0,0.6)' 
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalMessages" 
                    stroke="#6366f1" 
                    strokeWidth={6} 
                    fillOpacity={1} 
                    fill="url(#colorMsg)" 
                    animationDuration={3000} 
                    strokeLinecap="round" 
                  />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card group overflow-hidden"
        >
           <div className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex items-center gap-6">
                 <div className="p-5 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-600/30 group-hover:rotate-12 transition-transform">
                    <Clock className="w-8 h-8" />
                 </div>
                 <div>
                    <h2 className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-[0.5em] italic font-mono mb-2">OPS_MATRIX</h2>
                    <div className="h-1 w-20 bg-purple-500 rounded-full" />
                 </div>
              </div>
              <div className="px-8 py-3 glass rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">UNIT: OP_SCALAR</div>
           </div>
           <div className="h-96 relative">
              <div className="absolute inset-0 bg-purple-600/5 blur-[120px] rounded-full pointer-events-none group-hover:opacity-100 opacity-0 transition-opacity" />
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={history}>
                  <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} opacity={0.2} />
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(2, 6, 23, 0.9)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '24px', 
                      padding: '20px',
                      backdropBlur: '12px'
                    }} 
                  />
                  <Bar dataKey="totalCommands" fill="#a855f7" radius={[12, 12, 0, 0]} animationDuration={2000} />
                  <Bar dataKey="totalErrors" fill="#ef4444" radius={[12, 12, 0, 0]} animationDuration={2500} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 relative z-10">
         <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="xl:col-span-8 glass-card">
            <NetworkHealthMap />
         </motion.div>
         <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="xl:col-span-4 glass-card">
            <ShiftHandover />
         </motion.div>
      </div>

      <AIPredictiveInsights />

      {/* Support Intelligence Terminal Footer */}
      <div className="space-y-16 pt-24 border-t-8 border-dotted border-slate-200 dark:border-white/5 relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-12">
          <div className="flex items-center gap-8">
             <div className="p-8 bg-indigo-600 text-white rounded-[40px] shadow-2xl shadow-indigo-600/40 rotate-6 group cursor-pointer hover:rotate-0 transition-all">
                <Ticket className="w-14 h-14" />
             </div>
             <div>
                <h2 className="text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-4">Support Intelligence</h2>
                <div className="flex items-center gap-4 text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono italic">
                   <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                   INCIDENT_INTERROGATION_MATRICES: NODE_CORE_X1
                </div>
             </div>
          </div>
          <div className="flex items-center gap-6 glass rounded-full p-4 shadow-xl">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedDays(days)}
                className={`px-12 py-6 rounded-full text-[12px] font-black uppercase tracking-[0.4em] transition-all font-mono italic ${
                  selectedDays === days 
                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 scale-105 active:scale-95' 
                    : 'text-slate-400 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-white'
                }`}
              >
                {days}D_WINDOW
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           {[
             { label: 'TOTAL_CASE_LOG', value: ticketOverview?.totalTickets ?? 0, icon: Ticket, color: 'text-indigo-500', bg: 'bg-indigo-500', border: 'border-indigo-500/10' },
             { label: 'ACTIVE_THREADS', value: ticketOverview?.openTickets ?? 0, icon: Smartphone, color: 'text-cyan-500', bg: 'bg-cyan-500', border: 'border-cyan-500/10' },
             { label: 'RESOLVED_SINKS', value: ticketOverview?.resolvedTickets ?? 0, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500/10' }
           ].map((item, i) => (
             <motion.div 
                key={i} 
                whileHover={{ y: -10 }}
                className={`glass-card ${item.border} hover:border-current transition-all group`}
              >
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] font-mono italic mb-6">{item.label}</p>
                    <h4 className={`text-7xl font-black italic tracking-tighter ${item.color} leading-none`}>{item.value}</h4>
                  </div>
                  <div className={`p-8 ${item.bg} bg-opacity-10 rounded-[32px] border-2 border-white/10 group-hover:rotate-12 transition-transform`}>
                     <item.icon className="w-10 h-10" />
                  </div>
                </div>
             </motion.div>
           ))}
        </div>

        {/* Distributed Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
           <motion.div 
             initial={{ opacity: 0, x: -30 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="glass-card group overflow-hidden"
           >
              <div className="flex items-center justify-between mb-16">
                 <h3 className="text-[14px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] italic font-mono flex items-center gap-6">
                    <Activity className="w-6 h-6 text-indigo-500 animate-pulse" /> HISTORICAL_TREND
                 </h3>
                 <Sparkles className="w-5 h-5 text-indigo-500/20" />
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ticketOverview?.dailyTrend ?? []}>
                    <CartesianGrid strokeDasharray="6 6" stroke="#1e293b" vertical={false} opacity={0.2} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(2, 6, 23, 0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '24px', 
                        padding: '20px',
                        backdropFilter: 'blur(12px)'
                      }} 
                    />
                    <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={8} dot={false} animationDuration={3000} strokeLinecap="round" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={8} dot={false} animationDuration={3500} strokeLinecap="round" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 30 }}
             whileInView={{ opacity: 1, x: 0 }}
             viewport={{ once: true }}
             className="glass-card group overflow-hidden"
           >
              <div className="flex items-center justify-between mb-16">
                 <h3 className="text-[14px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] italic font-mono flex items-center gap-6">
                    <Target className="w-6 h-6 text-emerald-500" /> PRIORITY_MAP
                 </h3>
                 <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="h-96 relative flex items-center justify-center">
                <div className="absolute inset-x-0 flex flex-col items-center pointer-events-none">
                   <span className="text-[12px] font-black text-slate-400 uppercase tracking-[1em] font-mono mb-2">SCALAR</span>
                   <span className="text-5xl font-black text-slate-900 dark:text-white italic tracking-tighter">100%_OK</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketOverview?.statusCounts ?? []}
                      innerRadius={120}
                      outerRadius={160}
                      paddingAngle={15}
                      dataKey="value"
                      animationDuration={3000}
                    >
                      {(ticketOverview?.statusCounts ?? []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="rgba(0,0,0,0)" />)}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        background: 'rgba(2, 6, 23, 0.9)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '24px', 
                        padding: '20px',
                        backdropFilter: 'blur(12px)'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </motion.div>
        </div>
      </div>

      {/* System Health Matrix */}
      <div className="pt-24 space-y-16 relative z-10 border-t-8 border-dotted border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-10">
             <div className="p-10 glass-ultimate rounded-[40px] text-indigo-500 border-4 border-indigo-500/20 shadow-2xl relative">
                <div className="absolute inset-0 animate-ping bg-indigo-500 rounded-[40px] opacity-10" />
                <Activity className="w-12 h-12" />
             </div>
             <div>
                <h2 className="text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-4">Health Matrix</h2>
                <div className="flex items-center gap-6 text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em] font-mono italic flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-indigo-500" />
                   NODAL_AVAILABILITY_LEDGERS: MASTER_SYNC
                </div>
             </div>
          </div>
          <button onClick={loadHealth} className="p-8 glass rounded-[32px] hover:text-indigo-500 shadow-2xl transition-all group active:scale-95">
             <RefreshCw className={`w-10 h-10 ${healthLoading ? 'animate-spin' : 'group-hover:rotate-180 duration-1000'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
           {(health?.components ?? []).map((comp, i) => (
             <motion.div 
                key={comp.name} 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -15, scale: 1.02 }}
                className={`glass-card border-4 transition-all duration-700 group relative overflow-hidden ${
                  comp.status === 'online' ? 'border-emerald-500/10 hover:border-emerald-500' : 'border-rose-500/20 hover:border-rose-500'
               }`}
             >
                <div className="absolute right-[-30px] top-[-30px] opacity-[0.05] group-hover:opacity-20 transition-opacity">
                   <Target className={`w-40 h-40 ${comp.status === 'online' ? 'text-emerald-500' : 'text-rose-500'}`} />
                </div>
                <div className="flex items-center justify-between mb-12 relative z-10">
                   <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none group-hover:text-indigo-500 transition-colors uppercase">{comp.name}</h4>
                   <div className={`w-6 h-6 rounded-full ${comp.status === 'online' ? 'bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.9)]' : 'bg-rose-500 animate-pulse shadow-[0_0_30px_rgba(225,29,72,0.9)]'}`} />
                </div>
                <div className="flex items-end justify-between relative z-10 mt-14">
                   <div className="text-[14px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.6em] font-mono italic">{comp.status.toUpperCase()}</div>
                   {comp.latency != null && (
                     <div className="flex items-center gap-4 glass px-6 py-4 rounded-2xl shadow-inner">
                        <Zap className="w-5 h-5 text-indigo-500 animate-pulse" />
                        <span className="text-2xl font-black text-slate-950 dark:text-white font-mono tracking-tighter italic">{comp.latency}ms</span>
                     </div>
                   )}
                </div>
                {comp.status !== 'online' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-10 p-8 bg-rose-500/10 border-2 border-rose-500/20 rounded-[32px] text-[12px] font-black text-rose-500 italic leading-relaxed uppercase tracking-[0.2em] font-mono"
                  >
                     ERROR: {comp.details || 'TERMINAL_ANOMALY_DETECTED'}
                  </motion.div>
                )}
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}
