import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Network, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export default function NetworkHealthPage() {
  const [branches, setBranches] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const res = await api.getNetworkBranches(); setBranches(res.data as any); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const healthColor = (s: string) => {
    switch (s) {
      case 'HEALTHY': return { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600', icon: <Wifi className="w-5 h-5 text-emerald-500" /> };
      case 'DEGRADED': return { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600', icon: <AlertTriangle className="w-5 h-5 text-amber-500" /> };
      case 'WARNING': return { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-600', icon: <AlertTriangle className="w-5 h-5 text-orange-500" /> };
      case 'CRITICAL': return { bg: 'bg-red-50 border-red-200', text: 'text-red-600', icon: <WifiOff className="w-5 h-5 text-red-500" /> };
      default: return { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-600', icon: <Network className="w-5 h-5 text-gray-400" /> };
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Network className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Network Health</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => {
          const c = healthColor(b.healthStatus);
          return (
            <div key={b.id} className={`rounded-xl border p-5 ${c.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {c.icon}
                  <div>
                    <h3 className="font-bold">{b.name}</h3>
                    <p className="text-xs text-gray-500">{b.region} · {b.branchId}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${c.text}`}>{b.healthStatus}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Devices</p>
                  <p className="font-bold">{b.activeDevices}/{b.totalDevices}</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Uptime</p>
                  <p className="font-bold">{(b.uptimePercent ?? 0).toFixed(1)}%</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Latency</p>
                  <p className="font-bold">{Math.round(b.latencyMs ?? 0)}ms</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Jitter</p>
                  <p className="font-bold">{Math.round(b.jitterMs ?? 0)}ms</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Utilization</p>
                  <p className="font-bold">{(b.utilization ?? 0).toFixed(1)}%</p>
                </div>
                <div className="bg-white/60 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-500">Health Score</p>
                  <p className="font-bold">{(b.healthScore ?? 0).toFixed(0)}</p>
                </div>
              </div>
              {(b.criticalIncidents > 0 || b.warningIncidents > 0) && (
                <div className="mt-3 flex gap-2">
                  {b.criticalIncidents > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{b.criticalIncidents} Critical</span>}
                  {b.warningIncidents > 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">{b.warningIncidents} Warning</span>}
                </div>
              )}
            </div>
          );
        })}
        {branches.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No network branches configured</div>}
      </div>
    </div>
  );
}
