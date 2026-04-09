import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BarChart3, TrendingUp, Users, MessageSquare, Ticket, DollarSign, Star } from 'lucide-react';

export default function AnalyticsCharts() {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { const r = await api.getAnalyticsOverview(); setData(r.data ?? {}); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const metrics = [
    { label: 'Total Tickets', value: data.tickets ?? 0, icon: Ticket, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'CRM Contacts', value: data.contacts ?? 0, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Deals', value: data.deals ?? 0, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Messages', value: data.messages ?? 0, icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Agents', value: data.agents ?? 0, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'CSAT Avg', value: typeof data.csatAvg === 'number' ? data.csatAvg.toFixed(1) : '0', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  ];

  const dealsByStage = Array.isArray(data.dealsByStage) ? data.dealsByStage : [];
  const maxDeal = Math.max(...dealsByStage.map((d: any) => d._count ?? 0), 1);
  const STAGE_COLOR: Record<string, string> = { LEAD: '#94a3b8', QUALIFIED: '#3b82f6', PROPOSAL: '#8b5cf6', NEGOTIATION: '#f59e0b', WON: '#10b981', LOST: '#ef4444' };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6"><BarChart3 className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Analytics</h1></div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white border rounded-xl p-4 text-center">
            <div className={`w-10 h-10 ${m.bg} rounded-lg flex items-center justify-center mx-auto mb-2`}><m.icon className={`w-5 h-5 ${m.color}`} /></div>
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-bold mb-4">Deal Pipeline by Stage</h3>
          <div className="space-y-3">
            {dealsByStage.map((d: any) => (
              <div key={d.stage} className="flex items-center gap-3">
                <span className="w-24 text-sm font-medium">{d.stage}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div className="h-full rounded-full flex items-center px-2 transition-all" style={{ width: `${(d._count / maxDeal) * 100}%`, backgroundColor: STAGE_COLOR[d.stage] || '#6366f1' }}>
                    <span className="text-xs text-white font-bold">{d._count}</span>
                  </div>
                </div>
                <span className="text-sm text-gray-500 w-28 text-right">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(d._sum?.value || 0)}</span>
              </div>
            ))}
            {dealsByStage.length === 0 && <p className="text-center py-8 text-gray-400">Belum ada data deal</p>}
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-bold mb-4">Quick Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
              <TrendingUp className="w-8 h-8 text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-blue-800">{data.csatTotal ?? 0}</p>
              <p className="text-sm text-blue-600">Total CSAT Responses</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
              <DollarSign className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-2xl font-bold text-emerald-800">{dealsByStage.filter((d: any) => d.stage === 'WON').reduce((s: number, d: any) => s + (d._sum?.value || 0), 0).toLocaleString('id-ID')}</p>
              <p className="text-sm text-emerald-600">Revenue (Won Deals)</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
              <Users className="w-8 h-8 text-purple-500 mb-2" />
              <p className="text-2xl font-bold text-purple-800">{data.contacts ?? 0}</p>
              <p className="text-sm text-purple-600">Total CRM Contacts</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
              <Ticket className="w-8 h-8 text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-amber-800">{data.tickets ?? 0}</p>
              <p className="text-sm text-amber-600">Total Tickets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
