import { useEffect, useState } from 'react';
import { api, TicketOverviewData } from '../lib/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../lib/badge-colors';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import {
  MessageSquare, Users, Zap, AlertTriangle, TrendingUp, Clock, Ticket,
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

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({});
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([]);
  const [ticketOverview, setTicketOverview] = useState<TicketOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(14);

  const messages = Number(stats.message_received ?? 0);
  const commands = Number(stats.command_executed ?? 0);
  const errors = Number(stats.error ?? 0);

  const loadData = async (days = selectedDays) => {
    const [todayRes, historyRes, ticketRes] = await Promise.all([
      api.getStatsToday(),
      api.getStatsHistory(days),
      api.getTicketOverview(days),
    ]);
    setStats(todayRes.data as Stats);
    setHistory(historyRes.data);
    setTicketOverview(ticketRes.data);
  };

  useEffect(() => {
    async function load() {
      try {
        await loadData(selectedDays);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    }
    load();

    const timer = window.setInterval(() => {
      loadData(selectedDays).catch((err) => console.error('Auto-refresh failed:', err));
    }, 30000);

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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={MessageSquare} label="Messages Today" value={messages} color="bg-brand-500" />
        <StatCard icon={Zap} label="Commands Today" value={commands} color="bg-violet-500" />
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers ?? 0} color="bg-emerald-500" />
        <StatCard icon={AlertTriangle} label="Errors Today" value={errors} color="bg-red-500" />
      </div>

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

      {/* Active Info */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold mb-3">Quick Info</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Active Today</span>
            <p className="font-semibold text-lg">{stats.activeToday ?? 0}</p>
          </div>
          <div>
            <span className="text-gray-500">Platform</span>
            <p className="font-semibold text-lg flex gap-2">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">WhatsApp</span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Telegram</span>
            </p>
          </div>
          <div>
            <span className="text-gray-500">Date</span>
            <p className="font-semibold">{(stats.date as string) ?? new Date().toISOString().split('T')[0]}</p>
          </div>
          <div>
            <span className="text-gray-500">Uptime</span>
            <p className="font-semibold text-green-600">● Online</p>
          </div>
        </div>
      </div>
    </div>
  );
}
