import { useEffect, useState, useRef } from 'react';
import { api, TicketOverviewData, SystemHealthData } from '../lib/api';
import { toast } from '../components/Toast';
import { notificationStore, getSolution, getGeneralSolution } from '../lib/notification-store';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../lib/badge-colors';
import OperationalOverview from '../components/OperationalOverview';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  MessageSquare, Users, Zap, AlertTriangle, TrendingUp, Clock, Ticket,
  Server, RefreshCw, Activity,
  CheckCircle, XCircle, AlertCircle, Loader2, Cpu, HardDrive,
} from 'lucide-react';

interface Stats {
  [key: string]: unknown;
  totalUsers?: number;
  activeToday?: number;
  message_received?: string;
  command_executed?: string;
  error?: string;
}


const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

function StatCard({ icon: Icon, label, value, color, delay = "0ms" }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  delay?: string;
}) {
  return (
    <div 
      className="group relative overflow-hidden bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-200/60 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1"
      style={{ transitionDelay: delay }}
    >
      <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full transition-transform group-hover:scale-110" />
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-2xl ${color} shadow-lg shadow-current/10 transition-transform group-hover:scale-110`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-3xl font-bold mt-1 text-slate-800 tracking-tight">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({});
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [ticketOverview, setTicketOverview] = useState<TicketOverviewData | null>(null);
  const [slaDashboard, setSlaDashboard] = useState<Record<string, unknown> | null>(null);
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [incidents, setIncidents] = useState<Array<Record<string, unknown>>>([]);
  const [escalations, setEscalations] = useState<Array<Record<string, unknown>>>([]);
  const [openClusters, setOpenClusters] = useState<Array<Record<string, unknown>>>([]);
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(14);
  const prevHealthRef = useRef<SystemHealthData | null>(null);

  const messages = Number(stats.message_received ?? 0);
  const commands = Number(stats.command_executed ?? 0);
  const errors = Number(stats.error ?? 0);

  // Derive components that are currently down
  const downComponents = (health?.components ?? []).filter(
    (c) => c.status === 'offline' || c.status === 'error'
  );

  // Request browser notification permission on mount
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
      // First load — notify if anything is already down
      const down = newHealth.components.filter((c) => c.status === 'offline' || c.status === 'error');
      if (down.length > 0) {
        for (const comp of down) {
          const solution = getSolution(comp.name, comp.status);
          toast({ type: 'error', title: `${comp.name} — ${comp.status.toUpperCase()}`, message: comp.details ?? 'Komponen tidak berjalan', solution, duration: 12000 });
          notificationStore.add({ type: 'error', title: `${comp.name} DOWN`, message: comp.details ?? 'Komponen tidak berjalan', solution, component: comp.name });
        }
        sendBrowserNotification('⚠️ AUDIRA System Alert', `${down.map((c) => c.name).join(', ')} sedang DOWN`);
      }
      prevHealthRef.current = newHealth;
      return;
    }

    // Compare each component
    const prevMap = new Map(prev.components.map((c) => [c.name, c.status]));

    for (const comp of newHealth.components) {
      const prevStatus = prevMap.get(comp.name);
      const isDown = comp.status === 'offline' || comp.status === 'error';
      const wasDown = prevStatus === 'offline' || prevStatus === 'error';
      const isDegraded = comp.status === 'degraded';
      const wasDegraded = prevStatus === 'degraded';

      if (isDown && !wasDown) {
        const solution = getSolution(comp.name, comp.status);
        toast({ type: 'error', title: `🔴 ${comp.name} DOWN!`, message: comp.details ?? 'Baru saja offline', solution, duration: 12000 });
        notificationStore.add({ type: 'error', title: `${comp.name} DOWN`, message: comp.details ?? 'Baru saja offline', solution, component: comp.name });
        sendBrowserNotification('🔴 AUDIRA System Down', `${comp.name} baru saja DOWN!\n${solution}`);
        try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1sb3Vtgl9sd3t1gneDe3OAlH2CipOKgoqMioSHjIiHh4WJioeGh4iHh4aJiYeFiImKhYWKioqEh4uJhYaJioeGh4mIhoaIiIeGiIiIhoaIiIeGiImHhoaIiIeGiIiHhoaIiIeGiIiHhoaIiIeGiIiHhoaIiA==').play(); } catch {}
      }

      if (!isDown && wasDown) {
        toast({ type: 'success', title: `✅ ${comp.name} Recovered`, message: 'Kembali online' });
        notificationStore.add({ type: 'success', title: `${comp.name} Recovered`, message: 'Kembali online', component: comp.name });
        sendBrowserNotification('✅ AUDIRA Recovery', `${comp.name} kembali online`);
      }

      if (isDegraded && !wasDegraded && !wasDown) {
        const solution = getSolution(comp.name, comp.status);
        toast({ type: 'warning', title: `⚠️ ${comp.name} Degraded`, message: `Latency: ${comp.latency ?? '?'}ms`, solution });
        notificationStore.add({ type: 'warning', title: `${comp.name} Degraded`, message: `Latency tinggi: ${comp.latency ?? '?'}ms`, solution, component: comp.name });
      }
    }

    // Overall status changes
    if (prev.overallStatus !== newHealth.overallStatus) {
      const solution = getGeneralSolution(newHealth.overallStatus);
      if (newHealth.overallStatus === 'unhealthy') {
        toast({ type: 'error', title: 'System Unhealthy', message: 'Beberapa komponen mengalami masalah!', solution, duration: 12000 });
        notificationStore.add({ type: 'error', title: 'System Unhealthy', message: 'Beberapa komponen bermasalah', solution });
      } else if (newHealth.overallStatus === 'degraded' && prev.overallStatus === 'healthy') {
        toast({ type: 'warning', title: 'Performance Degraded', message: 'Beberapa komponen berjalan lambat', solution });
        notificationStore.add({ type: 'warning', title: 'System Degraded', message: 'Performa menurun', solution });
      } else if (newHealth.overallStatus === 'healthy' && prev.overallStatus !== 'healthy') {
        toast({ type: 'success', title: 'All Systems Go!', message: 'Semua komponen kembali normal' });
        notificationStore.add({ type: 'success', title: 'All Systems Healthy', message: 'Semua komponen normal' });
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
      console.error('Failed to load system health:', err);
      toast({ type: 'error', title: 'Health Check Failed', message: 'Tidak bisa mengecek status system. API mungkin down.', solution: 'Pastikan API server berjalan di port 4000. Coba: pnpm dev:api' });
      notificationStore.add({ type: 'error', title: 'Health Check Failed', message: 'API tidak merespon', solution: 'Pastikan API server berjalan di port 4000. Coba: pnpm dev:api' });
    } finally {
      setHealthLoading(false);
    }
  };

  const loadData = async (days = selectedDays) => {
    const [todayRes, historyRes, ticketRes, slaRes] = await Promise.all([
      api.getStatsToday(),
      api.getStatsHistory(days),
      api.getTicketOverview(days),
      api.getSLADashboard(),
    ]);
    setStats(todayRes.data as Stats);
    setHistory(historyRes.data);
    setTicketOverview(ticketRes.data);
    setSlaDashboard(slaRes.data as Record<string, unknown>);

    const [alertsRes, incidentsRes, escalationsRes, clustersRes] = await Promise.allSettled([
      api.getAlerts(1, { status: 'ACTIVE' }),
      api.getIncidents(1, { status: 'OPEN' }),
      api.getEscalations(1, 100),
      api.getOpenClusters(),
    ]);

    setAlerts(alertsRes.status === 'fulfilled' ? (alertsRes.value.data as Array<Record<string, unknown>>) : []);
    setIncidents(incidentsRes.status === 'fulfilled' ? (incidentsRes.value.data as Array<Record<string, unknown>>) : []);
    setEscalations(escalationsRes.status === 'fulfilled' ? (escalationsRes.value.data as Array<Record<string, unknown>>) : []);
    setOpenClusters(clustersRes.status === 'fulfilled' ? ((clustersRes.value.clusters as Array<Record<string, unknown>>) ?? []) : []);
  };

  useEffect(() => {
    async function load() {
      try {
        await Promise.all([loadData(selectedDays), loadHealth()]);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();

    const timer = window.setInterval(() => {
      loadData(selectedDays).catch((err) => console.error('Auto-refresh failed:', err));
      loadHealth().catch((err) => console.error('Health refresh failed:', err));
    }, 15000);

    return () => window.clearInterval(timer);
  }, [selectedDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Persistent System Down Banner */}
      {downComponents.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-xl flex items-center gap-3 animate-pulse">
          <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700">
              ⚠️ {downComponents.length} Komponen Bermasalah
            </p>
            <p className="text-sm text-red-600">
              {downComponents.map((c) => `${c.name} (${c.status})`).join(' • ')}
              {' — '}Periksa segera!
            </p>
          </div>
          <button onClick={loadHealth} className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
            Re-check
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard icon={MessageSquare} label="Messages Today" value={messages} color="bg-indigo-600" delay="0ms" />
        <StatCard icon={Zap} label="Commands" value={commands} color="bg-violet-600" delay="50ms" />
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers ?? 0} color="bg-emerald-600" delay="100ms" />
        <StatCard icon={AlertTriangle} label="System Errors" value={errors} color="bg-rose-600" delay="150ms" />
      </div>

      <OperationalOverview
        ticketOverview={ticketOverview}
        slaDashboard={slaDashboard}
        alerts={alerts}
        incidents={incidents}
        escalations={escalations}
        openClusters={openClusters}
        health={health}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold">Messages (14 days)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history as Array<{ date: string; totalMessages: number }>}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="totalMessages" stroke="#0ea5e9" fill="#e0f2fe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-400" />
            <h2 className="font-semibold">Commands & Errors (14 days)</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history as Array<{ date: string; totalCommands: number; totalErrors: number }>}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="totalCommands" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalErrors" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Ticket Overview */}
      <div className="mt-8">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">Ticket Analytics</h2>
            <span className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-700">Auto refresh 30s</span>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => setSelectedDays(days)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedDays === days
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'bg-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Ticket} label="Total Tickets" value={ticketOverview?.totalTickets ?? 0} color="bg-sky-600" />
          <StatCard icon={Clock} label="Open Tickets" value={ticketOverview?.openTickets ?? 0} color="bg-amber-500" />
          <StatCard icon={TrendingUp} label="Resolved Tickets" value={ticketOverview?.resolvedTickets ?? 0} color="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Daily Ticket Trend ({selectedDays} days)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ticketOverview?.dailyTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="created" stroke="#0ea5e9" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Ticket by Status</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketOverview?.statusCounts ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={96}
                    label
                  >
                    {(ticketOverview?.statusCounts ?? []).map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Ticket by Priority</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketOverview?.priorityCounts ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Ticket by Category</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ticketOverview?.categoryCounts ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-10} textAnchor="end" height={58} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Recent Tickets</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Ticket</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Priority</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {(ticketOverview?.recentTickets ?? []).map((ticket) => (
                  <tr key={ticket.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-brand-600">{ticket.ticketNumber}</td>
                    <td className="py-2 pr-4 text-sm">{ticket.customer ?? '-'}</td>
                    <td className="py-2 pr-4"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="py-2 pr-4"><CategoryBadge category={ticket.category} /></td>
                    <td className="py-2 pr-4"><StatusBadge status={ticket.status} /></td>
                    <td className="py-2 pr-4 text-sm text-gray-600">{new Date(ticket.createdAt).toLocaleString('id-ID')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* System Status Panel */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold">System Status</h2>
            {health && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                health.overallStatus === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                health.overallStatus === 'degraded' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {health.overallStatus === 'healthy' ? '● All Systems Operational' :
                 health.overallStatus === 'degraded' ? '◐ Partially Degraded' :
                 '○ Issues Detected'}
              </span>
            )}
          </div>
          <button
            onClick={loadHealth}
            disabled={healthLoading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Component Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {(health?.components ?? []).map((comp) => {
            const statusConf: Record<string, { icon: React.ElementType; bg: string; text: string; dot: string }> = {
              online:   { icon: CheckCircle,   bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
              offline:  { icon: XCircle,        bg: 'bg-red-50 border-red-200',         text: 'text-red-700',     dot: 'bg-red-500' },
              degraded: { icon: AlertCircle,    bg: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   dot: 'bg-amber-500' },
              error:    { icon: AlertTriangle,  bg: 'bg-red-50 border-red-200',         text: 'text-red-700',     dot: 'bg-red-500' },
            };
            const sc = statusConf[comp.status] ?? statusConf.offline;
            const Icon = sc.icon;
            return (
              <div key={comp.name} className={`rounded-xl border p-4 ${sc.bg} flex items-start gap-3`}>
                <Icon className={`w-5 h-5 mt-0.5 ${sc.text}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">{comp.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${sc.dot} ${comp.status === 'online' ? 'animate-pulse' : ''}`} />
                      <span className={`text-xs font-bold uppercase ${sc.text}`}>{comp.status}</span>
                    </div>
                  </div>
                  {comp.details && <p className="text-xs text-gray-500 mt-0.5 truncate">{comp.details}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {comp.latency != null && <span>{comp.latency}ms</span>}
                    <span>{new Date(comp.lastCheck).toLocaleTimeString('id-ID')}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {!health && !healthLoading && (
            <div className="col-span-3 text-center py-8 text-gray-400">Click Refresh to load system status</div>
          )}
          {healthLoading && !health && (
            <div className="col-span-3 flex items-center justify-center py-8 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading system status...
            </div>
          )}
        </div>

        {/* Server Metrics Bar */}
        {health?.metrics && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-gray-400" /> Server Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU Cores</p>
                <p className="font-bold text-lg">{health.metrics.cpuCores}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><HardDrive className="w-3 h-3" /> Memory</p>
                <p className="font-bold text-lg">{health.metrics.memoryUsedGB}/{health.metrics.memoryTotalGB} GB</p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${health.metrics.memoryUsedPct > 85 ? 'bg-red-500' : health.metrics.memoryUsedPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(health.metrics.memoryUsedPct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{health.metrics.memoryUsedPct}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Load Avg (1m)</p>
                <p className="font-bold text-lg">{health.metrics.loadAvg1m}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Uptime</p>
                <p className="font-bold text-lg">{Math.floor(health.metrics.uptime / 3600)}h {Math.floor((health.metrics.uptime % 3600) / 60)}m</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Active Sessions</p>
                <p className="font-bold text-lg">{health.metrics.activeSessions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Errors (1h) / Alerts
                </p>
                <p className="font-bold text-lg">
                  <span className={health.metrics.recentErrors > 0 ? 'text-red-600' : 'text-emerald-600'}>{health.metrics.recentErrors}</span>
                  {' / '}
                  <span className={health.metrics.openAlerts > 0 ? 'text-amber-600' : 'text-emerald-600'}>{health.metrics.openAlerts}</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
