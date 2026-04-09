import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ShieldCheck, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

export default function SLAMonitorPage() {
  const [data, setData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getSLADashboard();
        setData(res.data as any);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const compliance = data?.complianceRate ?? 100;
  const complianceColor = compliance >= 95 ? 'text-emerald-600' : compliance >= 80 ? 'text-amber-600' : 'text-red-600';

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">SLA Monitor</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-emerald-500" /><span className="text-sm text-gray-500">Compliance Rate</span></div>
          <p className={`text-3xl font-bold ${complianceColor}`}>{compliance}%</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-5 h-5 text-sky-500" /><span className="text-sm text-gray-500">Total Tracked</span></div>
          <p className="text-3xl font-bold">{data?.totalTracked ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-red-500" /><span className="text-sm text-gray-500">Response Breaches</span></div>
          <p className="text-3xl font-bold text-red-600">{data?.responseBreaches ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-orange-500" /><span className="text-sm text-gray-500">Resolution Breaches</span></div>
          <p className="text-3xl font-bold text-orange-600">{data?.resolutionBreaches ?? 0}</p>
        </div>
      </div>

      {/* Active Tracking */}
      <div className="bg-white rounded-xl border mb-6">
        <div className="px-6 py-4 border-b"><h2 className="font-semibold">Active SLA Tracking</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ticket</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Response Deadline</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Resolution Deadline</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.activeTracking ?? []).map((sla: any) => {
                const now = new Date();
                const resDeadline = new Date(sla.resolutionDeadline);
                const timeLeft = resDeadline.getTime() - now.getTime();
                const hoursLeft = Math.floor(timeLeft / 3600000);
                const isUrgent = hoursLeft < 1;
                const isWarning = hoursLeft < 4;
                return (
                  <tr key={sla.id} className={`${isUrgent ? 'bg-red-50' : isWarning ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs">{sla.ticket?.ticketNumber}</td>
                    <td className="px-4 py-3">{sla.ticket?.customer || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        sla.ticket?.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        sla.ticket?.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{sla.ticket?.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={sla.responseBreached ? 'text-red-600 font-bold' : ''}>{new Date(sla.responseDeadline).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={sla.resolutionBreached ? 'text-red-600 font-bold' : ''}>{resDeadline.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isUrgent ? <span className="text-xs font-bold text-red-600 animate-pulse">⚠ URGENT</span> :
                       isWarning ? <span className="text-xs font-bold text-amber-600">{hoursLeft}h left</span> :
                       <span className="text-xs text-emerald-600">{hoursLeft}h left</span>}
                    </td>
                  </tr>
                );
              })}
              {(data?.activeTracking ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No active SLA tracking</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Breaches */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b"><h2 className="font-semibold text-red-600">Recent Breaches</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Ticket</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Breach Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.recentBreach ?? []).map((b: any) => (
                <tr key={b.id}>
                  <td className="px-4 py-3 font-mono text-xs">{b.ticket?.ticketNumber}</td>
                  <td className="px-4 py-3">{b.ticket?.customer || '-'}</td>
                  <td className="px-4 py-3">
                    {b.responseBreached && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mr-1">Response</span>}
                    {b.resolutionBreached && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Resolution</span>}
                  </td>
                </tr>
              ))}
              {(data?.recentBreach ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No recent breaches</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
