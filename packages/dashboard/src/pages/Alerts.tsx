import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Bell, Check, Eye, Plus, Trash2 } from 'lucide-react';

export default function AlertsPage() {
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');
  const [alerts, setAlerts] = useState<Array<Record<string, any>>>([]);
  const [rules, setRules] = useState<Array<Record<string, any>>>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', alertType: 'CUSTOM', conditions: '{}', cooldownMin: 5 });

  const loadAlerts = async () => {
    const filters: Record<string, string> = {};
    if (statusFilter) filters.status = statusFilter;
    const res = await api.getAlerts(page, filters);
    setAlerts(res.data as any);
    setTotal(res.pagination.total);
  };

  const loadRules = async () => {
    const res = await api.getAlertRules();
    setRules(res.data as any);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAlerts(), loadRules()]).finally(() => setLoading(false));
  }, [page, statusFilter]);

  const handleAck = async (id: string) => { await api.acknowledgeAlert(id); loadAlerts(); };
  const handleResolve = async (id: string) => { await api.resolveAlert(id); loadAlerts(); };
  const handleDeleteRule = async (id: string) => { if (confirm('Delete this rule?')) { await api.deleteAlertRule(id); loadRules(); } };
  const handleCreateRule = async () => {
    try {
      await api.createAlertRule({ ...form, conditions: JSON.parse(form.conditions), actions: [] });
      setShowForm(false);
      setForm({ name: '', description: '', alertType: 'CUSTOM', conditions: '{}', cooldownMin: 5 });
      loadRules();
    } catch (err) { alert(String(err)); }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      case 'ERROR': return 'bg-orange-100 text-orange-700';
      case 'WARNING': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'bg-red-100 text-red-700';
      case 'ACKNOWLEDGED': return 'bg-amber-100 text-amber-700';
      case 'RESOLVED': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Alerts & Escalation</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['alerts', 'rules'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-brand-600' : 'text-gray-600'}`}>
            {t === 'alerts' ? `Alerts (${total})` : `Rules (${rules.length})`}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <>
          <div className="flex gap-3 mb-4">
            <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border p-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColor(a.severity)}`}>{a.severity}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(a.status)}`}>{a.status}</span>
                    <span className="text-xs text-gray-400">{a.rule?.name}</span>
                  </div>
                  <h3 className="font-medium">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  {a.status === 'ACTIVE' && (
                    <button onClick={() => handleAck(a.id)} className="p-2 hover:bg-amber-50 rounded" title="Acknowledge"><Eye className="w-4 h-4 text-amber-600" /></button>
                  )}
                  {a.status !== 'RESOLVED' && (
                    <button onClick={() => handleResolve(a.id)} className="p-2 hover:bg-emerald-50 rounded" title="Resolve"><Check className="w-4 h-4 text-emerald-600" /></button>
                  )}
                </div>
              </div>
            ))}
            {alerts.length === 0 && <div className="text-center py-12 text-gray-400">No alerts found</div>}
          </div>
        </>
      )}

      {tab === 'rules' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>
          {showForm && (
            <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Rule name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select className="border rounded-lg px-3 py-2 text-sm" value={form.alertType} onChange={(e) => setForm({ ...form, alertType: e.target.value })}>
                {['SLA_VIOLATION', 'KEYWORD', 'THRESHOLD', 'SCHEDULE', 'CUSTOM'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} placeholder='Conditions JSON' value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} />
              <button onClick={handleCreateRule} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm">Create Rule</button>
            </div>
          )}
          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{r.name}</h3>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{r.alertType}</span>
                    <span className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </div>
                  {r.description && <p className="text-sm text-gray-500 mt-1">{r.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">Cooldown: {r.cooldownMin}min | Triggered: {r.triggerCount}x</p>
                </div>
                <button onClick={() => handleDeleteRule(r.id)} className="p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
