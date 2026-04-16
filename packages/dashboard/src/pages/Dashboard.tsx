import { useEffect, useState, useRef } from 'react';
import { api, TicketOverviewData, SystemHealthData } from '../lib/api';
import { toast } from '../components/Toast';
import { getSolution } from '../lib/notification-store';
import OperationalOverview from '../components/OperationalOverview';
import NetworkHealthMap from '../components/NetworkHealthMap';
import ShiftHandover from '../components/ShiftHandover';
import AIPredictiveInsights from '../components/AIPredictiveInsights';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  MessageSquare, Users, Zap, AlertTriangle, TrendingUp, Clock, Ticket,
  RefreshCw, Activity,
  CheckCircle, ShieldCheck, ArrowUpRight, ZapOff
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

function StatCard({ icon: Icon, label, value, color, delay = "0ms" }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay?: string;
}) {
  return (
    <div 
      className="group relative overflow-hidden bg-slate-900/50 backdrop-blur-xl rounded-[32px] border border-slate-800/50 p-7 transition-all duration-500 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-600/5"
      style={{ transitionDelay: delay }}
    >
      <div className={`absolute -right-8 -top-8 w-24 h-24 blur-[40px] opacity-10 group-hover:opacity-20 transition-all ${color.replace('bg-', 'bg-')}`} />
      <div className="flex items-start justify-between relative z-10">
        <div className={`p-4 rounded-2xl ${color} bg-opacity-10 border border-current/10 transition-transform group-hover:scale-110 group-hover:rotate-12`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-').replace('-600', '-400')}`} />
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{label}</p>
          <p className="text-3xl font-black text-white italic tracking-tighter">{value}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
         <ArrowUpRight className="w-3 h-3 text-emerald-500" />
         Real-time telemetry active
      </div>
    </div>
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
          toast({ type: 'error', title: `${comp.name} — ${comp.status.toUpperCase()}`, message: comp.details ?? 'Critical Failure', solution, duration: 12000 });
        }
        sendBrowserNotification('⚠️ AUDIRA System Alert', `${down.map((c) => c.name).join(', ')} is DOWN`);
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
        toast({ type: 'error', title: `🔴 ${comp.name} FAILURE!`, message: comp.details ?? 'Terminal disconnect', solution, duration: 12000 });
        sendBrowserNotification('🔴 AUDIRA System Down', `${comp.name} disconnected!`);
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
      console.error('Health Check Failed');
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
    } catch (err) { console.error(err); }
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
      <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse italic">Initializing Neural Link...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Command Center V2.0</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Operational Pulse</h1>
          <p className="text-slate-500 font-medium text-sm mt-3">Advanced telemetry diagnostics and AI-driven predictive insights.</p>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 bg-slate-900/40 border border-slate-800 rounded-[28px] backdrop-blur-xl">
           <div className={`w-3 h-3 rounded-full ${health?.overallStatus === 'healthy' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'bg-rose-600 animate-ping'}`} />
           <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">System: {health?.overallStatus || 'Unknown'}</span>
        </div>
      </div>

      {/* Critical Banner */}
      {downComponents.length > 0 && (
        <div className="relative overflow-hidden bg-rose-600/10 border border-rose-500/20 p-6 rounded-[32px] flex items-center gap-6 animate-in slide-in-from-top-4 duration-500 ring-4 ring-rose-500/5">
           <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-rose-500/10 to-transparent" />
           <div className="p-4 bg-rose-600 rounded-2xl shadow-xl shadow-rose-600/20">
              <ZapOff className="w-6 h-6 text-white" />
           </div>
           <div className="flex-1">
              <h3 className="text-rose-500 font-black uppercase text-xs tracking-widest mb-1">Anomaly Detected — {downComponents.length} Components Offline</h3>
              <p className="text-slate-400 text-sm font-medium">{downComponents.map(c => c.name).join(' • ')} are currently non-responsive.</p>
           </div>
           <button onClick={loadHealth} className="px-8 py-3 bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20 active:scale-95">Re-Probe</button>
        </div>
      )}

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={MessageSquare} label="Ingested Signals" value={messages} color="bg-indigo-600" />
        <StatCard icon={Zap} label="Neural Commands" value={commands} color="bg-violet-600" delay="100ms" />
        <StatCard icon={Users} label="Total Identity" value={stats.totalUsers ?? 0} color="bg-sky-600" delay="200ms" />
        <StatCard icon={AlertTriangle} label="Logical Errors" value={errors} color="bg-rose-600" delay="300ms" />
      </div>

      <OperationalOverview
        ticketOverview={ticketOverview}
        slaDashboard={slaDashboard}
        alerts={alerts}
        incidents={incidents}
        escalations={escalations}
        health={health}
      />

      {/* Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-[40px] backdrop-blur-2xl">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <TrendingUp className="w-5 h-5 text-indigo-400" />
                 <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Signal Volume (14d)</h2>
              </div>
           </div>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={history}>
                 <defs>
                   <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                 <XAxis dataKey="date" hide />
                 <YAxis hide />
                 <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                 <Area type="monotone" dataKey="totalMessages" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMsg)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-[40px] backdrop-blur-2xl">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <Clock className="w-5 h-5 text-emerald-400" />
                 <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Constraint Diagnostics</h2>
              </div>
           </div>
           <div className="h-72">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={history}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                 <XAxis dataKey="date" hide />
                 <YAxis hide />
                 <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                 <Bar dataKey="totalCommands" fill="#818cf8" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="totalErrors" fill="#f43f5e" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 my-8">
         <div className="xl:col-span-8">
            <NetworkHealthMap />
         </div>
         <div className="xl:col-span-4">
            <ShiftHandover />
         </div>
      </div>

      <AIPredictiveInsights />

      {/* Ticket Intelligence */}
      <div className="space-y-6 pt-10 border-t border-slate-800/40">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <Ticket className="w-6 h-6 text-indigo-500" />
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Support Analytics</h2>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedDays(days)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedDays === days ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Case</p>
                <h4 className="text-4xl font-black text-white mt-1">{ticketOverview?.totalTickets ?? 0}</h4>
              </div>
              <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400">
                 <Ticket className="w-8 h-8" />
              </div>
           </div>
           <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Thread</p>
                <h4 className="text-4xl font-black text-amber-500 mt-1">{ticketOverview?.openTickets ?? 0}</h4>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
                 <Clock className="w-8 h-8" />
              </div>
           </div>
           <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolved Sync</p>
                <h4 className="text-4xl font-black text-emerald-500 mt-1">{ticketOverview?.resolvedTickets ?? 0}</h4>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                 <CheckCircle className="w-8 h-8" />
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-[40px]">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 italic">Trend Analysis (Line)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ticketOverview?.dailyTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={4} dot={false} />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={4} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
           </div>
           <div className="bg-slate-950/40 border border-slate-800/60 p-8 rounded-[40px]">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 italic">Priority Distribution</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ticketOverview?.statusCounts ?? []}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {(ticketOverview?.statusCounts ?? []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      </div>

      {/* Health Grid */}
      <div className="pt-10 border-t border-slate-800/40">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <Activity className="w-6 h-6 text-slate-500" />
             <h2 className="text-2xl font-black text-white uppercase italic">System Health Grid</h2>
          </div>
          <button onClick={loadHealth} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all active:scale-95">
             <RefreshCw className={`w-5 h-5 ${healthLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {(health?.components ?? []).map((comp) => (
             <div key={comp.name} className={`bg-slate-950/40 border p-6 rounded-[32px] backdrop-blur-xl transition-all duration-500 group relative overflow-hidden ${
                comp.status === 'online' ? 'border-emerald-500/10 hover:border-emerald-500/30' : 'border-rose-500/20 hover:border-rose-500/50'
             }`}>
                <div className="flex items-center justify-between mb-4">
                   <h4 className="text-sm font-black text-white uppercase tracking-tight">{comp.name}</h4>
                   <div className={`w-2 h-2 rounded-full ${comp.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`} />
                </div>
                <div className="flex items-end justify-between">
                   <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{comp.status}</div>
                   {comp.latency != null && <div className="text-xs font-black text-slate-400 font-mono tracking-tighter">{comp.latency}MS</div>}
                </div>
                {comp.status !== 'online' && (
                  <div className="mt-4 text-[9px] font-bold text-rose-400 italic leading-tight uppercase tracking-wider">{comp.details || 'Anomaly detected in communication.'}</div>
                )}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
