import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { 
  Check, 
  Eye, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  Activity, 
  Zap, 
  Settings, 
  Layers, 
  Clock, 
  Target, 
  X,
  Code
} from 'lucide-react';

export default function AlertsPage() {
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', alertType: 'CUSTOM', conditions: '{}', cooldownMin: 5 });

  const loadAlerts = useCallback(async () => {
    const filters: any = {};
    if (statusFilter) filters.status = statusFilter;
    const res = await api.getAlerts(page, filters);
    setAlerts(res.data ?? []);
    setTotal(res.pagination?.total ?? 0);
  }, [page, statusFilter]);

  const loadRules = useCallback(async () => {
    const res = await api.getAlertRules();
    setRules(res.data ?? []);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAlerts(), loadRules()]).finally(() => setLoading(false));
  }, [loadAlerts, loadRules]);

  const handleAck = async (id: string) => { await api.acknowledgeAlert(id); loadAlerts(); };
  const handleResolve = async (id: string) => { await api.resolveAlert(id); loadAlerts(); };
  const handleDeleteRule = async (id: string) => { if (confirm('Purge this security rule?')) { await api.deleteAlertRule(id); loadRules(); } };
  const handleCreateRule = async () => {
    try {
      await api.createAlertRule({ ...form, conditions: JSON.parse(form.conditions), actions: [] });
      setShowForm(false);
      setForm({ name: '', description: '', alertType: 'CUSTOM', conditions: '{}', cooldownMin: 5 });
      loadRules();
    } catch (err) { alert(String(err)); }
  };

  const getSeverityStyle = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
      case 'ERROR': return 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-500/20';
      case 'WARNING': return 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20';
      default: return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
    }
  };

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'text-rose-600 dark:text-rose-500 font-black animate-pulse';
      case 'ACKNOWLEDGED': return 'text-amber-600 dark:text-amber-500 font-black italic';
      case 'RESOLVED': return 'text-emerald-600 dark:text-emerald-500 font-black';
      default: return 'text-slate-400 dark:text-slate-500 font-bold';
    }
  };

  if (loading && alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 border-t-rose-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-rose-600/50 dark:text-rose-500/50 uppercase tracking-[0.3em] animate-pulse">Decoding Signals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 font-primary">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-rose-500" />
            <span className="text-rose-500 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.3em]">Threat Detection</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1">Global Alert Grid</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Automated monitoring, notification escalation, and incident response center.</p>
        </div>

        <div className="flex gap-4">
           {(['alerts', 'rules'] as const).map((t) => (
             <button 
                key={t}
                onClick={() => setTab(t)}
                className={`relative px-8 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] transition-all border outline-none active:scale-95 ${
                  tab === t 
                    ? 'bg-rose-600 text-white dark:bg-rose-600/10 border-rose-600 dark:border-rose-500/30 dark:text-rose-500 shadow-xl shadow-rose-600/20' 
                    : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-white dark:hover:border-slate-700'
                }`}
             >
                {t === 'alerts' ? 'Live Feeds' : 'Constraint Rules'}
                <div className={`absolute top-0 right-0 w-2 h-2 rounded-full transform -translate-y-1/2 translate-x-1/2 ${t === 'alerts' && alerts.some(a => a.status === 'ACTIVE') ? 'bg-rose-500 animate-ping shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-transparent'}`} />
             </button>
           ))}
        </div>
      </div>

      {tab === 'alerts' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-4 rounded-[32px] backdrop-blur-xl shadow-sm">
             <div className="flex-1 px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">
                Real-time Signal Stream: <span className="text-slate-900 dark:text-white">{total} detections cached</span>
             </div>
             <div className="flex gap-3">
                <select 
                  className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-300 px-6 py-3 rounded-2xl outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer hover:border-indigo-500 transition-colors"
                  value={statusFilter} 
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Filter Status</option>
                  {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
             </div>
          </div>

          {/* Alert Stream */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {alerts.map((a) => (
              <div 
                key={a.id} 
                className={`group relative bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 p-8 rounded-[40px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-2xl shadow-sm hover:shadow-2xl hover:shadow-rose-600/5 ${
                  a.status === 'ACTIVE' ? 'ring-2 ring-rose-500/10' : ''
                }`}
              >
                {/* Background Glow */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 blur-[60px] opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-40 transition-all ${
                  a.severity === 'CRITICAL' ? 'bg-rose-600' : 'bg-indigo-600'
                }`} />

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getSeverityStyle(a.severity)}`}>
                        {a.severity}
                      </span>
                      <span className={`text-[10px] uppercase tracking-widest ${getStatusStyle(a.status)}`}>
                        {a.status}
                      </span>
                    </div>
                    <div className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest group-hover:text-slate-500 transition-colors">
                      {new Date(a.createdAt).toLocaleTimeString()} · Signal Source ID: {a.id.slice(0, 6)}
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 dark:text-white italic truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors mb-3 uppercase tracking-tight underline decoration-slate-100 dark:decoration-slate-800 decoration-2 underline-offset-8 group-hover:decoration-rose-500/30">
                    {a.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed mb-8 max-w-[80%] line-clamp-2 italic">
                    {a.message}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 group-hover:border-rose-500/20 transition-all shadow-sm">
                          <Target className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-rose-600 dark:group-hover:text-rose-500" />
                       </div>
                       <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-900 dark:group-hover:text-slate-300 transition-colors">Rule: {a.rule?.name || 'Manual Signal'}</span>
                    </div>

                    <div className="flex gap-2">
                       {a.status === 'ACTIVE' && (
                         <button 
                            onClick={() => handleAck(a.id)}
                            className="p-3 bg-slate-50 dark:bg-slate-900 text-amber-600 dark:text-amber-500 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-amber-600 dark:hover:bg-amber-500 hover:text-white transition-all active:scale-90 shadow-lg shadow-amber-500/5 group/btn"
                            title="Acknowledge Intelligence"
                         >
                            <Eye className="w-4 h-4" />
                         </button>
                       )}
                       {a.status !== 'RESOLVED' && (
                         <button 
                            onClick={() => handleResolve(a.id)}
                            className="p-3 bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-500 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white transition-all active:scale-90 shadow-lg shadow-emerald-500/5 group/btn"
                            title="Commit Resolve"
                         >
                            <Check className="w-4 h-4" />
                         </button>
                       )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="col-span-full py-40 text-center bg-white dark:bg-slate-950/20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800 opacity-50 grayscale shadow-inner">
                 <ShieldAlert className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                 <h3 className="text-xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] italic leading-tight">No Anomalies Encountered</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-10 animate-in slide-in-from-right-10 duration-500">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-6 rounded-[32px] backdrop-blur-xl shadow-sm">
            <div className="px-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic flex items-center gap-3">
               <Layers className="w-4 h-4 text-indigo-500" />
               Logic Gate Repository: <span className="text-slate-900 dark:text-white">{rules.length} active monitors</span>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)} 
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl ${
                showForm 
                  ? 'bg-rose-600 text-white shadow-rose-600/20' 
                  : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-500'
              }`}
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm ? 'Abort Rule Entry' : 'Inject Security Rule'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-indigo-500/5 dark:ring-indigo-500/30 shadow-2xl">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
              
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight mb-6 flex items-center gap-3">
                   <Code className="w-5 h-5 text-indigo-500" />
                   New Logical Constraint
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2">Identified Handle</label>
                       <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" placeholder="e.g. HIGH_LATENCY_TRIGGER" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                     </div>
                     <div>
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2">Categorical Context</label>
                       <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer font-bold appearance-none" value={form.alertType} onChange={(e) => setForm({ ...form, alertType: e.target.value })}>
                         {['SLA_VIOLATION', 'KEYWORD', 'THRESHOLD', 'SCHEDULE', 'CUSTOM'].map(t => <option key={t} value={t}>{t}</option>)}
                       </select>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 px-2">Operational Logic (JSON Condition)</label>
                       <textarea className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-xs outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono min-h-[140px] shadow-inner" rows={5} placeholder='{ "latency": { ">": 1000 } }' value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} />
                     </div>
                  </div>
                </div>
              </div>

               <div className="flex justify-end pt-6 border-t border-slate-100 dark:border-slate-800/50">
                  <button onClick={handleCreateRule} className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                     Verify and Inject Rule
                  </button>
               </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {rules.map((r) => (
              <div key={r.id} className="group relative bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-700 backdrop-blur-3xl shadow-sm hover:shadow-2xl hover:shadow-indigo-600/5">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 group-hover:bg-white dark:group-hover:bg-slate-950 transition-all shadow-sm">
                       <Settings className="w-6 h-6 text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:rotate-[360deg] transition-all duration-1000" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white italic group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors uppercase tracking-tight leading-tight">{r.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                         <div className={`w-2 h-2 rounded-full ${r.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`} />
                         <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{r.isActive ? 'Operational' : 'Paused'}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteRule(r.id)} className="p-4 bg-slate-50 dark:bg-slate-950 text-slate-300 hover:bg-rose-600 hover:text-white transition-all border border-slate-100 dark:border-slate-800 hover:border-rose-500 shadow-sm hover:shadow-xl active:scale-90 opacity-20 group-hover:opacity-100">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                   <div className="bg-slate-50 dark:bg-slate-950/50 p-5 rounded-[28px] border border-slate-100 dark:border-slate-800/50 group-hover:border-slate-200 dark:group-hover:border-slate-700 transition-colors shadow-inner">
                      <div className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mb-1 italic">Rule Description</div>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic group-hover:text-slate-900 dark:group-hover:text-slate-300 transition-colors truncate">{r.description || 'Global behavioral monitoring rule'}</p>
                   </div>

                   <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: <Zap className="w-3 h-3" />, label: 'Type', value: r.alertType },
                        { icon: <Clock className="w-3 h-3" />, label: 'Cooldown', value: `${r.cooldownMin}m` },
                        { icon: <Activity className="w-3 h-3" />, label: 'Hits', value: r.triggerCount }
                      ].map((stat, i) => (
                        <div key={i} className="bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-[20px] border border-slate-100 dark:border-slate-800/30 flex flex-col items-center text-center shadow-sm">
                           <div className="text-slate-400 dark:text-slate-600 mb-2">{stat.icon}</div>
                           <div className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">{stat.label}</div>
                           <div className="text-slate-900 dark:text-white text-[10px] font-black uppercase italic tracking-tighter">{stat.value}</div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
