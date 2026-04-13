import React, { useEffect, useState, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  Activity, Users, MessageSquare, Zap, AlertTriangle, TrendingUp, Clock, 
  RefreshCw, Power, Shield, Bell, LayoutDashboard, Database, HardDrive,
  Menu, X, Globe, Cpu, Loader2, Sparkles, Server
} from 'lucide-react';
import { api } from '../lib/api';
import { toast } from '../components/Toast';
import { notificationStore, getSolution, getGeneralSolution } from '../lib/notification-store';
import OperationalOverview from '../components/OperationalOverview';
import NetworkHealthMap from '../components/NetworkHealthMap';
import ShiftHandover from '../components/ShiftHandover';
import AIPredictiveInsights from '../components/AIPredictiveInsights';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#fbbf24', '#22c55e', '#06b6d4', '#3b82f6'];

interface SystemHealthData {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  components: Array<{
    name: string;
    status: 'online' | 'offline' | 'degraded' | 'error';
    latency?: number;
    details?: string;
    lastCheck: string;
  }>;
  metrics?: {
    uptime: number;
    memoryTotalGB: number;
    memoryUsedGB: number;
    memoryUsedPct: number;
    cpuCores: number;
    loadAvg1m: number;
    activeSessions: number;
    recentErrors: number;
    openAlerts: number;
  };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [ticketOverview, setTicketOverview] = useState<any>(null);
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [messages, setMessages] = useState(0);
  const [commands, setCommands] = useState(0);
  const [errors, setErrors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const prevHealthRef = useRef<SystemHealthData | null>(null);

  const loadData = async () => {
    try {
      const [statsRes, historyRes, ticketRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/stats/history'),
        api.get('/tickets/overview')
      ]);

      setStats(statsRes.data);
      setHistory(historyRes.data);
      setTicketOverview(ticketRes.data);

      const today = historyRes.data[historyRes.data.length - 1] || {};
      setMessages(today.totalMessages || 0);
      setCommands(today.totalCommands || 0);
      setErrors(today.totalErrors || 0);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await api.get('/admin/health');
      checkHealthChanges(res.data);
      setHealth(res.data);
    } catch (err) {
      console.error('Failed to load health data:', err);
    } finally {
      setHealthLoading(false);
    }
  };

  const checkHealthChanges = (newHealth: SystemHealthData) => {
    const prev = prevHealthRef.current;
    if (!prev) {
      prevHealthRef.current = newHealth;
      return;
    }

    newHealth.components.forEach(comp => {
      const prevComp = prev.components.find(c => c.name === comp.name);
      if (prevComp && prevComp.status !== comp.status && comp.status !== 'online') {
        const solution = getSolution(comp.name, comp.status);
        toast({ type: 'error', title: `ALERT: ${comp.name}`, message: `Status changed to ${comp.status.toUpperCase()}`, solution });
      }
    });
    
    prevHealthRef.current = newHealth;
  };

  useEffect(() => {
    loadData();
    loadHealth();
    const interval = setInterval(() => {
      loadData();
      loadHealth();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const slaDashboard = {
    weeklyResolved: ticketOverview?.weeklyResolved ?? 0,
    complianceStatusCount: 0,
    averageResolutionTime: ticketOverview?.avgResolutionTime ?? 0,
    totalBreached: ticketOverview?.totalBreached ?? 0,
  };

  const incidents = ticketOverview?.recentTickets?.filter((t: any) => t.category === 'INCIDENT') || [];
  const alerts = ticketOverview?.recentTickets?.filter((t: any) => t.priority === 'CRITICAL' || t.priority === 'HIGH') || [];
  const escalations = ticketOverview?.recentTickets?.filter((t: any) => t.status === 'ESCALATED') || [];

  if (loading) return (
     <div className="min-h-screen bg-[#05070a] flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 mb-6">
           <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
           <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
           <Activity className="absolute inset-0 m-auto w-8 h-8 text-indigo-500 animate-pulse" />
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-xs">Synchronizing Core...</p>
     </div>
  );

  return (
    <div className="min-h-screen font-['Lexend'] bg-[#05070a] text-slate-200">
      {/* Dynamic Glow Orbs */}
      <div className="glow-orb w-[600px] h-[600px] bg-indigo-600/10 top-[-200px] left-[-100px]" />
      <div className="glow-orb w-[400px] h-[400px] bg-purple-600/5 bottom-[0px] right-[-100px]" />

      {/* Modern Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 z-50 bg-[#0d1117]/80 backdrop-blur-2xl border-r border-white/5 transition-all duration-500 ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
         <div className="p-8 flex items-center gap-4 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/40">
               <Shield className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight text-white">AUDIRA <span className="text-indigo-500">NOC</span></h1>}
         </div>

         <nav className="px-4 space-y-2">
            <SidebarLink icon={LayoutDashboard} label="Operations" active={true} collapsed={!isSidebarOpen} />
            <SidebarLink icon={Database} label="Ticketing" active={false} collapsed={!isSidebarOpen} />
            <SidebarLink icon={Server} label="Infrastructure" active={false} collapsed={!isSidebarOpen} />
            <SidebarLink icon={Bell} label="Alerts" active={false} collapsed={!isSidebarOpen} count={alerts.length} />
         </nav>

         <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="absolute bottom-10 left-1/2 -translate-x-1/2 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
         >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
         </button>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-500 p-8 lg:p-12 ${isSidebarOpen ? 'pl-80' : 'pl-32'}`}>
         
         {/* Dynamic Header */}
         <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 animate-bespoke">
            <div>
               <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                  <Sparkles className="w-3 h-3" /> Command Center Official Dashboard
               </div>
               <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tighter">
                  System <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-500">Integrity</span>
               </h2>
               <p className="text-slate-500 mt-2 font-medium">Real-time telemetry and predictive maintenance matrix.</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4">
                  <div className="text-right">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Status</p>
                     <p className={`text-sm font-black uppercase ${health?.overallStatus === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>{health?.overallStatus || 'SCANNING...'}</p>
                  </div>
                  <button onClick={loadHealth} className={`p-2 rounded-xl transition-all ${healthLoading ? 'animate-spin bg-white/10' : 'hover:bg-white/10 text-indigo-400'}`}>
                     <RefreshCw className="w-5 h-5" />
                  </button>
               </div>
            </div>
         </header>

         {/* Bespoke Stat Cards */}
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12 animate-bespoke">
            <BespokeStatCard icon={MessageSquare} label="Traffic Flux" value={messages} unit="MSG" color="indigo" />
            <BespokeStatCard icon={Zap} label="Core Triggers" value={commands} unit="CMD" color="violet" />
            <BespokeStatCard icon={Users} label="Auth Entities" value={stats.totalUsers ?? 0} unit="USR" color="emerald" />
            <BespokeStatCard icon={AlertTriangle} label="Breach Delta" value={errors} unit="ERR" color="rose" />
         </div>

         <div className="space-y-12 animate-bespoke">
            <OperationalOverview
               ticketOverview={ticketOverview}
               slaDashboard={slaDashboard}
               alerts={alerts}
               incidents={incidents}
               escalations={escalations}
               health={health}
            />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
               <div className="xl:col-span-8">
                  <NetworkHealthMap />
               </div>
               <div className="xl:col-span-4 h-full">
                  <ShiftHandover />
               </div>
            </div>

            <AIPredictiveInsights />

            {/* Cinematic Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <BespokeChart title="Regional Traffic Distribution" icon={TrendingUp}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="totalMessages" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorMsg)" />
                  </AreaChart>
               </BespokeChart>

               <BespokeChart title="Efficiency Matrix" icon={Clock}>
                  <BarChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="totalCommands" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
               </BespokeChart>
            </div>
         </div>
      </main>
    </div>
  );
};

const SidebarLink = ({ icon: Icon, label, active, collapsed, count }: any) => (
  <button className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${active ? 'bg-indigo-600/10 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
     <Icon className={`w-6 h-6 ${active ? 'text-indigo-400' : 'group-hover:text-indigo-300'}`} />
     {!collapsed && <span className="font-bold text-sm flex-1 text-left">{label}</span>}
     {!collapsed && count !== undefined && <span className="px-2 py-0.5 rounded-lg bg-rose-500 text-white text-[10px] font-black">{count}</span>}
  </button>
);

const BespokeStatCard = ({ icon: Icon, label, value, unit, color }: any) => {
   const colors: any = {
      indigo: 'shadow-indigo-500/10 text-indigo-400 bg-indigo-500/5 border-indigo-500/10',
      violet: 'shadow-violet-500/10 text-violet-400 bg-violet-500/5 border-violet-500/10',
      emerald: 'shadow-emerald-500/10 text-emerald-400 bg-emerald-500/5 border-emerald-500/10',
      rose: 'shadow-rose-500/10 text-rose-400 bg-rose-500/5 border-rose-500/10',
   };

   return (
      <article className={`relative group p-8 rounded-[32px] border glass-panel glass-card-hover ${colors[color]}`}>
         <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <Icon className="w-24 h-24" />
         </div>
         <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
               <Icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
         </div>
         <div>
            <h4 className="text-4xl font-black text-white tracking-tighter mb-1 select-none">
               {typeof value === 'number' ? value.toLocaleString() : value}
               <span className="text-xs font-black text-slate-600 ml-2 tracking-widest">{unit}</span>
            </h4>
         </div>
      </article>
   );
};

const BespokeChart = ({ title, icon: Icon, children }: any) => (
   <div className="glass-panel rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
         <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/5 text-indigo-400">
               <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">{title}</h3>
         </div>
         <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Export RAW</button>
      </div>
      <div className="h-64 mt-4 -ml-4">
         <ResponsiveContainer width="100%" height="100%">
            {children}
         </ResponsiveContainer>
      </div>
   </div>
);

export default Dashboard;
