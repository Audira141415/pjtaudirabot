import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Activity, Plus, Trash2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

export default function UptimeMonitorPage() {
  const [targets, setTargets] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: '', checkType: 'PING', intervalSec: 60 });

  const load = async () => {
    try {
      const res = await api.getUptimeTargets();
      setTargets(res.data as any);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.host) return;
    await api.createUptimeTarget({ ...form, port: form.port ? parseInt(form.port) : undefined });
    setShowForm(false);
    setForm({ name: '', host: '', port: '', checkType: 'PING', intervalSec: 60 });
    load();
  };

  const handleDelete = async (id: string) => { if (confirm('Delete this target?')) { await api.deleteUptimeTarget(id); load(); } };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'UP': return <Wifi className="w-5 h-5 text-emerald-500" />;
      case 'DOWN': return <WifiOff className="w-5 h-5 text-red-500" />;
      case 'DEGRADED': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const statusBg = (s: string) => {
    switch (s) {
      case 'UP': return 'border-emerald-200 bg-emerald-50/50';
      case 'DOWN': return 'border-red-200 bg-red-50/50';
      case 'DEGRADED': return 'border-amber-200 bg-amber-50/50';
      default: return 'border-gray-200';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const up = targets.filter((t) => t.status === 'UP').length;
  const down = targets.filter((t) => t.status === 'DOWN').length;
  const degraded = targets.filter((t) => t.status === 'DEGRADED').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Uptime Monitor</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm">
          <Plus className="w-4 h-4" /> Add Target
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4 text-center"><p className="text-3xl font-bold">{targets.length}</p><p className="text-sm text-gray-500">Total</p></div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center"><p className="text-3xl font-bold text-emerald-600">{up}</p><p className="text-sm text-emerald-600">UP</p></div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center"><p className="text-3xl font-bold text-red-600">{down}</p><p className="text-sm text-red-600">DOWN</p></div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center"><p className="text-3xl font-bold text-amber-600">{degraded}</p><p className="text-sm text-amber-600">DEGRADED</p></div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-xl border p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Name (e.g. SW-CORE-JKT01)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Host (IP or hostname)" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Port (optional)" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.checkType} onChange={(e) => setForm({ ...form, checkType: e.target.value })}>
              {['PING', 'TCP', 'HTTP', 'HTTPS'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={handleCreate} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm">Create Target</button>
        </div>
      )}

      {/* Target Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {targets.map((t) => (
          <div key={t.id} className={`rounded-xl border p-4 ${statusBg(t.status)}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(t.status)}
                <div>
                  <h3 className="font-medium">{t.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{t.host}{t.port ? `:${t.port}` : ''}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(t.id)} className="p-1 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4 text-red-400" /></button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xs text-gray-500">Status</p><p className={`text-sm font-bold ${t.status === 'UP' ? 'text-emerald-600' : t.status === 'DOWN' ? 'text-red-600' : 'text-amber-600'}`}>{t.status}</p></div>
              <div><p className="text-xs text-gray-500">Uptime</p><p className="text-sm font-bold">{(t.uptimePercent ?? 0).toFixed(1)}%</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p className="text-sm">{t.checkType}</p></div>
            </div>
            {t.lastCheckAt && <p className="text-xs text-gray-400 mt-2">Last check: {new Date(t.lastCheckAt).toLocaleString()}</p>}
            {t.checks?.[0]?.responseMs && <p className="text-xs text-gray-400">Latency: {Math.round(t.checks[0].responseMs)}ms</p>}
          </div>
        ))}
        {targets.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No uptime targets configured</div>}
      </div>
    </div>
  );
}
