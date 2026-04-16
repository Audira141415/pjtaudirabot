import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Shield, 
  Trash2, 
  Plus, 
  Loader2, 
  AlertTriangle, 
  ShieldAlert, 
  Zap, 
  Activity, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Layers, 
  Info, 
  ChevronRight,
  X,
  UserCheck,
  Ban
} from 'lucide-react';
import { toast } from '../components/Toast';

interface ModerationRule {
  id: string;
  type: string;
  pattern: string;
  action: string;
  reason: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ModerationLog {
  id: string;
  action: string;
  reason: string | null;
  content: string | null;
  createdAt: string;
  user?: { name: string; platform: string };
}

export default function ModerationPage() {
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [tab, setTab] = useState<'rules' | 'logs'>('rules');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'WORD_FILTER', pattern: '', action: 'WARN', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (tab === 'rules') {
          const res = await api.getModerationRules();
          setRules(res.data as unknown as ModerationRule[]);
        } else {
          const res = await api.getModerationLogs();
          setLogs(res.data as unknown as ModerationLog[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createModerationRule(form);
      setRules((prev) => [res.data as unknown as ModerationRule, ...prev]);
      setShowForm(false);
      setForm({ type: 'WORD_FILTER', pattern: '', action: 'WARN', reason: '' });
      toast({ type: 'success', title: 'RULE_MANIFESTED', message: 'Shield protocol synchronized.' });
    } catch (err) {
      toast({ type: 'error', title: 'SYNC_FAILURE', message: err instanceof Error ? err.message : 'Failed to establish protocol.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Purge this moderation shield?')) return;
    try {
      await api.deleteModerationRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast({ type: 'info', title: 'SHIELD_PURGED', message: 'Rule removed from registry.' });
    } catch (err) {
      toast({ type: 'error', title: 'COMMAND_FAILURE', message: 'Failed to purge protocol.' });
    }
  };

  const actionColor: Record<string, string> = {
    WARN: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-500/20',
    MUTE: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 border-orange-100 dark:border-orange-500/20',
    BAN: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-100 dark:border-rose-500/20',
    DELETE: 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700',
  };

  if (loading && rules.length === 0 && logs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Engaging Security Subsystems...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-500" />
            <span className="text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.3em]">Sentinel Guard Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-rose-600/30 underline-offset-[12px] decoration-4">Community Moderation</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Enforce conduct protocols, automate content filtering, and maintain community safety indices.</p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-inner">
          <button
            onClick={() => setTab('rules')}
            className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'rules' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Tactical Rules
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'logs' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Incident Logs
          </button>
        </div>
      </div>

      {tab === 'rules' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center px-4">
             <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <h2 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Shield Blueprints</h2>
             </div>
             <button
               onClick={() => setShowForm(!showForm)}
               className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
             >
               {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? 'Abort Manifest' : 'Manifest Rule'}
             </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden shadow-2xl">
               <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/10 blur-[100px]" />
               
               <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Protocol Architecture</label>
                     <select
                       value={form.type}
                       onChange={(e) => setForm({ ...form, type: e.target.value })}
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest shadow-inner outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                     >
                       <option value="WORD_FILTER">Keyword Interceptor</option>
                       <option value="REGEX">Neural Pattern (Regex)</option>
                       <option value="SPAM">Spam Decipher</option>
                       <option value="LINK">Signal Purge (Links)</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Enforcement Action</label>
                     <select
                       value={form.action}
                       onChange={(e) => setForm({ ...form, action: e.target.value })}
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest shadow-inner outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                     >
                       <option value="WARN">Dispatch Warning</option>
                       <option value="MUTE">Silence Node (Mute)</option>
                       <option value="BAN">Purge Entity (Ban)</option>
                       <option value="DELETE">Expunge Content (Delete)</option>
                     </select>
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Neural Pattern Target *</label>
                     <input
                       value={form.pattern}
                       onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                       placeholder="e.g. pattern_alpha_01 or /restricted_logic/i"
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800"
                       required
                     />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Rational Index (Reason)</label>
                     <input
                       value={form.reason}
                       onChange={(e) => setForm({ ...form, reason: e.target.value })}
                       placeholder="Define the logic for this enforcement..."
                       className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 italic"
                     />
                  </div>
               </div>

               <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
                  <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
                  <button type="submit" disabled={submitting} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all flex items-center gap-3">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Create Protocol
                  </button>
               </div>
            </form>
          )}

          <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Arch. Hub</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Neural Pattern</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Tactical Action</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Rational Meta</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Integrity</th>
                  <th className="px-10 py-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
                {rules.length === 0 ? (
                  <tr><td colSpan={6} className="px-10 py-24 text-center grayscale opacity-20">
                    <Shield className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Shield Blueprints Configured</p>
                  </td></tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                      <td className="px-10 py-6">
                         <span className="px-3 py-1 rounded-lg text-[9px] font-black bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800 uppercase tracking-widest">{rule.type}</span>
                      </td>
                      <td className="px-8 py-6">
                        <code className="text-[10px] font-black text-slate-900 dark:text-slate-300 bg-slate-100 dark:bg-slate-900/50 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 max-w-[200px] truncate block italic">"{rule.pattern}"</code>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${actionColor[rule.action] ?? 'bg-slate-100 text-slate-600'}`}>
                          {rule.action}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase italic truncate max-w-[140px]">{rule.reason ?? 'SYSTEM_DEFAULT'}</td>
                      <td className="px-8 py-6">
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${rule.isActive ? 'text-emerald-500 bg-emerald-500' : 'text-slate-300 bg-slate-300 dark:text-slate-800 dark:bg-slate-800'}`} />
                      </td>
                      <td className="px-10 py-6 text-right">
                        <button onClick={() => handleDelete(rule.id)} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:border-rose-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-xl active:scale-95">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 px-4">
              <Activity className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Intercept History</h2>
           </div>

           <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl divide-y divide-slate-50 dark:divide-slate-800/30">
            {logs.length === 0 ? (
              <div className="px-10 py-24 text-center grayscale opacity-20">
                <ShieldAlert className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">No Intercept Logs Detected</p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="px-10 py-8 flex items-start gap-8 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group relative">
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-all shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                   
                   <div className={`p-4 rounded-2xl border transition-all shadow-inner ${actionColor[log.action] ?? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                   </div>

                   <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${actionColor[log.action] ?? 'bg-slate-100 text-slate-600'}`}>{log.action}</span>
                        <div className="flex items-center gap-2">
                           <UserCheck className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                           <span className="text-[11px] font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{log.user?.name ?? 'REDACTED_NODE'}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-700 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800 uppercase tracking-widest">{log.user?.platform || 'COMM_HUB'}</span>
                      </div>
                      
                      {log.reason && <p className="text-sm font-bold text-slate-600 dark:text-slate-400 italic">Rational: "{log.reason}"</p>}
                      {log.content && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                           <p className="text-[10px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-widest mb-1">Offensive Payload:</p>
                           <p className="text-xs font-mono text-slate-400 dark:text-slate-600 truncate italic">"{log.content}"</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 pt-2">
                         <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                            <Clock className="w-3 h-3" /> Temporal Fix: {new Date(log.createdAt).toLocaleString()}
                         </div>
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Safety Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Sentinel Guard Subsystems Balanced</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-rose-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Shield protocols are applied globally to prevent neural contamination.</span>
         </div>
      </div>
    </div>
  );
}
